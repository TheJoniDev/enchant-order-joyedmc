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
    let enchant_objs = [];
    enchants.forEach(enchant => {
        let id = ID_LIST[enchant[0]];
        let e_obj = new item_obj('book', enchant[1] * ENCHANTMENT2WEIGHT[id], [id]);
        e_obj.c = { I: id, l: e_obj.l, w: e_obj.w };
        enchant_objs.push(e_obj);
    });

    let baseItem = new item_obj(ITEM_NAME);
    let allItems = [...enchant_objs, baseItem];

    let merged_item = greedyOptimalMerge(allItems);
    merged_item.i = ITEM_NAME;

    let instructions = getInstructions(merged_item.c);
    let max_levels = instructions.reduce((sum, step) => sum + step[2], 0);
    let max_xp = experience(max_levels);

    postMessage({
        msg: 'complete',
        item_obj: merged_item,
        instructions: instructions,
        extra: [max_levels, max_xp],
        enchants: enchants
    });

    results = {};
}

function greedyOptimalMerge(items) {
    let working = [...items];
    while (working.length > 1) {
        let minCost = Infinity;
        let bestPair = null;
        let bestResult = null;

        for (let i = 0; i < working.length; i++) {
            for (let j = i + 1; j < working.length; j++) {
                try {
                    let merged = new MergeEnchants(working[i], working[j]);
                    if (merged.x < minCost) {
                        minCost = merged.x;
                        bestPair = [i, j];
                        bestResult = merged;
                    }
                } catch (_) {}
                try {
                    let merged = new MergeEnchants(working[j], working[i]);
                    if (merged.x < minCost) {
                        minCost = merged.x;
                        bestPair = [j, i];
                        bestResult = merged;
                    }
                } catch (_) {}
            }
        }

        if (!bestPair) break;

        working.splice(bestPair[1], 1);
        working.splice(bestPair[0], 1);
        working.push(bestResult);
    }

    return working[0];
}

function getInstructions(comb) {
    let instructions = [];
    let child_instructions;
    for (const key in comb) {
        if (key === 'L' || key === 'R') {
            if (typeof (comb[key].I) === 'undefined') {
                child_instructions = getInstructions(comb[key]);
                child_instructions.forEach(single_instruction => {
                    instructions.push(single_instruction);
                });
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
    let merge_cost;
    if (Number.isInteger(comb.R.v)) {
        merge_cost = comb.R.v + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1;
    } else {
        merge_cost = comb.R.l + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1;
    }
    let work = Math.max(comb.L.w, comb.R.w) + 1;
    const single_instruction = [comb.L, comb.R, merge_cost, experience(merge_cost), 2 ** work - 1];
    instructions.push(single_instruction);
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
        if (merge_cost > MAXIMUM_MERGE_LEVELS) {
            throw new MergeLevelsTooExpensiveError();
        }
        let new_value = left.l + right.l;
        super(left.i, new_value);
        this.e = [...new Set([...left.e, ...right.e])];
        this.w = Math.max(left.w, right.w) + 1;
        this.x = left.x + right.x + experience(merge_cost);
        this.c = { L: left.c, R: right.c, l: merge_cost, w: this.w, v: this.l };
    }
}

const experience = level => {
    if (level === 0) {
        return 0;
    } else if (level <= 16) {
        return level ** 2 + 6 * level;
    } else if (level <= 31) {
        return 2.5 * level ** 2 - 40.5 * level + 360;
    } else {
        return 4.5 * level ** 2 - 162.5 * level + 2220;
    }
};

class MergeLevelsTooExpensiveError extends Error {
    constructor(message = 'merge levels is above maximum allowed') {
        super(message);
        this.name = 'MergeLevelsTooExpensiveError';
    }
}
