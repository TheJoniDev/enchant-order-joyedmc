// Core constants and globals
let ID_LIST = {};
let ENCHANTMENT2WEIGHT = [];
const MAXIMUM_MERGE_LEVELS = 39;
let ITEM_NAME;
let results = {};

// Web worker message handling
onmessage = event => {
    if (event.data.msg === 'set_data') {
        const { enchants } = event.data.data;

        let id = 0;
        for (let enchant in enchants) {
            const enchant_data = enchants[enchant];
            const weight = enchant_data['weight'];
            ID_LIST[enchant] = id;
            ENCHANTMENT2WEIGHT[id] = weight;
            id++;
        }
        Object.freeze(ENCHANTMENT2WEIGHT);
        Object.freeze(ID_LIST);
    }
    if (event.data.msg === 'process') {
        process(event.data.item, event.data.enchants, event.data.mode);
    }
};

function process(item, enchants, mode = 'levels') {
    ITEM_NAME = item;
    Object.freeze(ITEM_NAME);

    let enchant_objs = [];
    enchants.forEach(enchant => {
        let id = ID_LIST[enchant[0]];
        let e_obj = new item_obj('book', enchant[1] * ENCHANTMENT2WEIGHT[id], [id]);
        e_obj.c = { I: id, l: e_obj.l, w: e_obj.w };
        enchant_objs.push(e_obj);
    });

    // Handle base item
    let mostExpensive = enchant_objs.reduce((maxIndex, item, i, arr) => item.l > arr[maxIndex].l ? i : maxIndex, 0);
    if (ITEM_NAME === 'book') {
        const id = enchant_objs[mostExpensive].e[0];
        item = new item_obj(id, enchant_objs[mostExpensive].l);
        item.e.push(id);
        enchant_objs.splice(mostExpensive, 1);
    } else {
        item = new item_obj('item');
    }

    let base_merge = new MergeEnchants(item, enchant_objs[mostExpensive]);
    base_merge.c.L = { I: item.i, l: 0, w: 0 };
    enchant_objs.splice(mostExpensive, 1);

    let all_objs = enchant_objs.concat(base_merge);
    let cheapest_item = optimalMerge(all_objs);

    let instructions = getInstructions(cheapest_item.c);
    let max_levels = instructions.reduce((sum, instr) => sum + instr[2], 0);
    let max_xp = experience(max_levels);

    postMessage({
        msg: 'complete',
        item_obj: cheapest_item,
        instructions: instructions,
        extra: [max_levels, max_xp],
        enchants: enchants
    });

    results = {};
}

function optimalMerge(items) {
    let heap = [...items];
    heap.sort((a, b) => a.l - b.l);

    while (heap.length > 1) {
        let merged = null;
        for (let i = 0; i < heap.length; i++) {
            for (let j = i + 1; j < heap.length; j++) {
                try {
                    merged = new MergeEnchants(heap[i], heap[j]);
                    heap.splice(j, 1);
                    heap.splice(i, 1);
                    i = heap.length; // break outer
                    break;
                } catch (e) {
                    if (!(e instanceof MergeLevelsTooExpensiveError)) throw e;
                    try {
                        merged = new MergeEnchants(heap[j], heap[i]);
                        heap.splice(j, 1);
                        heap.splice(i, 1);
                        i = heap.length;
                        break;
                    } catch (e2) {
                        if (!(e2 instanceof MergeLevelsTooExpensiveError)) throw e2;
                    }
                }
            }
        }
        if (!merged) throw new Error("Unable to merge further due to level cap");
        let insertIndex = heap.findIndex(e => e.l > merged.l);
        if (insertIndex === -1) heap.push(merged);
        else heap.splice(insertIndex, 0, merged);
    }

    return heap[0];
}

function getInstructions(comb) {
    let instructions = [];
    for (const key in comb) {
        if (key === 'L' || key === 'R') {
            if (typeof (comb[key].I) === 'undefined') {
                getInstructions(comb[key]).forEach(i => instructions.push(i));
            }
            if (Number.isInteger(comb[key].I)) {
                comb[key].I = Object.keys(ID_LIST).find(k => ID_LIST[k] === comb[key].I);
            } else if (!Object.keys(ID_LIST).includes(comb[key].I)) {
                comb[key].I = ITEM_NAME;
            }
        }
    }
    const merge_cost = (Number.isInteger(comb.R.v) ? comb.R.v : comb.R.l) + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1;
    const work = Math.max(comb.L.w, comb.R.w) + 1;
    instructions.push([comb.L, comb.R, merge_cost, experience(merge_cost), 2 ** work - 1]);
    return instructions;
}

class item_obj {
    constructor(name, value = 0, id = []) {
        this.i = name;
        this.e = id;
        this.c = {};
        this.w = 0;
        this.l = value;
        this.x = 0;
    }
}

class MergeEnchants extends item_obj {
    constructor(left, right) {
        const merge_cost = right.l + 2 ** left.w - 1 + 2 ** right.w - 1;
        if (merge_cost > MAXIMUM_MERGE_LEVELS) throw new MergeLevelsTooExpensiveError();
        let new_value = left.l + right.l;
        super(left.i, new_value);
        this.e = left.e.concat(right.e);
        this.w = Math.max(left.w, right.w) + 1;
        this.x = left.x + right.x + experience(merge_cost);
        this.c = { L: left.c, R: right.c, l: merge_cost, w: this.w, v: this.l };
    }
}

function experience(level) {
    if (level === 0) return 0;
    if (level <= 16) return level ** 2 + 6 * level;
    if (level <= 31) return 2.5 * level ** 2 - 40.5 * level + 360;
    return 4.5 * level ** 2 - 162.5 * level + 2220;
}

class MergeLevelsTooExpensiveError extends Error {
    constructor(msg = 'merge levels is above maximum allowed') {
        super(msg);
        this.name = 'MergeLevelsTooExpensiveError';
    }
}
