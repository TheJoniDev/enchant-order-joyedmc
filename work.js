let ID_LIST = {};
let ENCHANTMENT2WEIGHT = [];
const MAXIMUM_MERGE_LEVELS = 39;
let ITEM_NAME;
let results = {};

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

    let enchant_objs = enchants.map(([name, level]) => {
        let id = ID_LIST[name];
        let e_obj = new item_obj('book', level * ENCHANTMENT2WEIGHT[id], [id]);
        e_obj.c = { I: id, l: e_obj.l, w: e_obj.w };
        return e_obj;
    });

    let base_item;
    if (ITEM_NAME === 'book') {
        let mostExpensive = enchant_objs.reduce((maxIndex, item, currentIndex, array) => {
            return item.l > array[maxIndex].l ? currentIndex : maxIndex;
        }, 0);
        const id = enchant_objs[mostExpensive].e[0];
        base_item = new item_obj(id, enchant_objs[mostExpensive].l);
        base_item.e.push(id);
        enchant_objs.splice(mostExpensive, 1);
    } else {
        base_item = new item_obj('item');
    }

    enchant_objs.push(base_item);

    const cheapest_item = priorityMergeEnchantments(enchant_objs);
    const instructions = getInstructions(cheapest_item.c);

    let max_levels = instructions.reduce((sum, inst) => sum + inst[2], 0);
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

function getInstructions(comb) {
    let instructions = [];
    let child_instructions;

    for (const key in comb) {
        if (key === 'L' || key === 'R') {
            if (typeof (comb[key].I) === 'undefined') {
                child_instructions = getInstructions(comb[key]);
                child_instructions.forEach(instr => instructions.push(instr));
            }
            let id;
            if (Number.isInteger(comb[key].I)) {
                id = comb[key].I;
                comb[key].I = Object.keys(ID_LIST).find(key => ID_LIST[key] === id);
            } else if (typeof (comb[key].I) === 'string' && !Object.keys(ID_LIST).includes(comb[key].I)) {
                comb[key].I = ITEM_NAME;
            }
        }
    }

    let merge_cost = (Number.isInteger(comb.R.v))
        ? comb.R.v + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1
        : comb.R.l + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1;

    let work = Math.max(comb.L.w, comb.R.w) + 1;
    const single_instruction = [comb.L, comb.R, merge_cost, experience(merge_cost), 2 ** work - 1];
    instructions.push(single_instruction);

    return instructions;
}

// --- Greedy Merge Strategy (Huffman-style) ---
function priorityMergeEnchantments(items) {
    const heap = [...items].sort((a, b) => a.l - b.l);

    while (heap.length > 1) {
        const left = heap.shift();
        const right = heap.shift();

        let merged;
        try {
            merged = new MergeEnchants(left, right);
        } catch (e) {
            if (e instanceof MergeLevelsTooExpensiveError) continue;
            throw e;
        }

        // Insert merged item into sorted heap
        let inserted = false;
        for (let i = 0; i < heap.length; i++) {
            if (merged.l <= heap[i].l) {
                heap.splice(i, 0, merged);
                inserted = true;
                break;
            }
        }
        if (!inserted) heap.push(merged);
    }

    return heap[0];
}

class item_obj {
    constructor(name, value = 0, id = []) {
        this.i = name;   // item type
        this.e = id;     // enchantment IDs
        this.c = {};     // instruction tree
        this.w = 0;      // work penalty
        this.l = value;  // internal value
        this.x = 0;      // experience cost
    }
}

class MergeEnchants extends item_obj {
    constructor(left, right) {
        const merge_cost = right.l + 2 ** left.w - 1 + 2 ** right.w - 1;
        if (merge_cost > MAXIMUM_MERGE_LEVELS) {
            throw new MergeLevelsTooExpensiveError();
        }

        const new_value = left.l + right.l;
        super(left.i, new_value);
        this.e = left.e.concat(right.e);
        this.w = Math.max(left.w, right.w) + 1;
        this.x = left.x + right.x + experience(merge_cost);
        this.c = { L: left.c, R: right.c, l: merge_cost, w: this.w, v: this.l };
    }
}

const experience = level => {
    if (level === 0) return 0;
    if (level <= 16) return level ** 2 + 6 * level;
    if (level <= 31) return 2.5 * level ** 2 - 40.5 * level + 360;
    return 4.5 * level ** 2 - 162.5 * level + 2220;
};

class MergeLevelsTooExpensiveError extends Error {
    constructor(message = 'merge levels is above maximum allowed') {
        super(message);
        this.name = 'MergeLevelsTooExpensiveError';
    }
}
