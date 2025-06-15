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
    enchants.forEach(enchant => { // Creates objects of enchants
        let id = ID_LIST[enchant[0]];
        let e_obj = new item_obj('book', enchant[1] * ENCHANTMENT2WEIGHT[id], [id]);
        e_obj.c = {I: id, l: e_obj.l, w: e_obj.w};
        enchant_objs.push(e_obj);
    });

    // Finds the most expensive enchant
    let mostExpensive = enchant_objs.reduce((maxIndex, item, currentIndex, array) => {
        return item.l > array[maxIndex].l ? currentIndex : maxIndex;
    }, 0);

    let id;
    if (ITEM_NAME === 'book') {
        id = enchant_objs[mostExpensive].e[0];
        item = new item_obj(id, enchant_objs[mostExpensive].l); // Makes the most expensive book the base
        item.e.push(id);
        enchant_objs.splice(mostExpensive, 1);
        // Finds a new most expensive enchant
        mostExpensive = enchant_objs.reduce((maxIndex, item, currentIndex, array) => {
            return item.l > array[maxIndex].l ? currentIndex : maxIndex;
        }, 0);
    } else {
        item = new item_obj('item');
    }
    let merged_item = new MergeEnchants(item, enchant_objs[mostExpensive]); // Merges the most expensive enchant with the item
    merged_item.c.L = {I: item.i, l: 0, w: 0};
    enchant_objs.splice(mostExpensive, 1);

    let all_objs = enchant_objs.concat(merged_item);

    // Use the greedy Huffman-style merge here
    let cheapest_item = greedyHuffmanMerge(all_objs);

    let instructions = getInstructions(cheapest_item.c);

    let max_levels = 0;
    instructions.forEach(key => {
        max_levels += key[2];
    });
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

function greedyHuffmanMerge(enchant_objs) {
    const heap = [...enchant_objs];
    heap.sort((a, b) => a.l - b.l); // Sort by enchantment "value"

    while (heap.length > 1) {
        const left = heap.shift();
        const right = heap.shift();

        try {
            const merged = new MergeEnchants(left, right);

            // Binary insert merged back into the sorted heap
            let inserted = false;
            for (let i = 0; i < heap.length; i++) {
                if (merged.l < heap[i].l) {
                    heap.splice(i, 0, merged);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) heap.push(merged);
        } catch (e) {
            if (e instanceof MergeLevelsTooExpensiveError) {
                // Try the reverse order
                try {
                    const merged = new MergeEnchants(right, left);
                    let inserted = false;
                    for (let i = 0; i < heap.length; i++) {
                        if (merged.l < heap[i].l) {
                            heap.splice(i, 0, merged);
                            inserted = true;
                            break;
                        }
                    }
                    if (!inserted) heap.push(merged);
                } catch {
                    throw new MergeLevelsTooExpensiveError(); // Re-throw if both fail
                }
            } else {
                throw e; // Unknown error
            }
        }
    }

    return heap[0]; // Final merged item
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
        this.i = name; // item namespace: 'book' or 'item'
        this.e = id; // enchant id list
        this.c = {}; // stores instructions
        this.w = 0; // work
        this.l = value; // value, in MergeEnchants merge_cost
        this.x = 0; // total xp
    }
}

class MergeEnchants extends item_obj {
    // In MergeEnchants c.v: value and c.l: merge_cost (both for instructions), (this.l: value)
    constructor(left, right) {
        const merge_cost = right.l + 2 ** left.w - 1 + 2 ** right.w - 1;
        if (merge_cost > MAXIMUM_MERGE_LEVELS) {
            throw new MergeLevelsTooExpensiveError();
        }
        let new_value = left.l + right.l;
        super(left.i, new_value);
        this.e = left.e.concat(right.e); // list of enchants
        this.w = Math.max(left.w, right.w) + 1; // new work
        this.x = left.x + right.x + experience(merge_cost); // total xp
        this.c = {L: left.c, R: right.c, l: merge_cost, w: this.w, v: this.l}; // instructions
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
