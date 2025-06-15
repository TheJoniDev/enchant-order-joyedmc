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

    // Finds the most expensive enchant
    let mostExpensive = enchant_objs.reduce((maxIndex, item, currentIndex, array) => {
        return item.l > array[maxIndex].l ? currentIndex : maxIndex;
    }, 0);

    let id;
    if (ITEM_NAME === 'book') {
        id = enchant_objs[mostExpensive].e[0];
        item = new item_obj(id, enchant_objs[mostExpensive].l);
        item.e.push(id);
        enchant_objs.splice(mostExpensive, 1);

        mostExpensive = enchant_objs.reduce((maxIndex, item, currentIndex, array) => {
            return item.l > array[maxIndex].l ? currentIndex : maxIndex;
        }, 0);
    } else {
        item = new item_obj('item');
    }
    let merged_item = new MergeEnchants(item, enchant_objs[mostExpensive]);
    merged_item.c.L = { I: item.i, l: 0, w: 0 };
    enchant_objs.splice(mostExpensive, 1);

    let all_objs = enchant_objs.concat(merged_item);

    let cheapest_items = cheapestItemsFromList(all_objs);

    let cheapest_cost = Infinity;
    let cheapest_key;
    for (const key in cheapest_items) {
        const item = cheapest_items[key];
        let item_cost;

        if (mode === 'levels') {
            item_cost = item.x;
        } else {
            item_cost = item.w;
        }
        if (item_cost < cheapest_cost) {
            cheapest_cost = item_cost;
            cheapest_key = key;
        }
    }
    const cheapest_item = cheapest_items[cheapest_key];

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

function getInstructions(comb) {
    let instructions = [];
    let child_instructions;
    for (const key in comb) {
        if (key === 'L' || key === 'R') {
            if (typeof comb[key].I === 'undefined') {
                child_instructions = getInstructions(comb[key]);
                child_instructions.forEach(single_instruction => {
                    instructions.push(single_instruction);
                });
            }
            let id;
            if (Number.isInteger(comb[key].I)) {
                id = comb[key].I;
                comb[key].I = Object.keys(ID_LIST).find(key => ID_LIST[key] === id);
            } else if (typeof comb[key].I === 'string' && !Object.keys(ID_LIST).includes(comb[key].I)) {
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

function hashFromItem(item_obj) {
    const enchants = item_obj.e;
    const sorted_ids = enchants.slice().sort();
    const item_namespace = item_obj.i[0];
    const work = item_obj.w;
    return [item_namespace, sorted_ids.join(','), work].join('|');
}

function memoizeHashFromArguments(arguments) {
    let items = arguments[0];
    let hashes = new Array(items.length);

    items.forEach((item, index) => {
        hashes[index] = hashFromItem(item);
    });
    return hashes.join(';');
}

const memoizeCheapest = func => {
    return (...arguments) => {
        const args_key = memoizeHashFromArguments(arguments);
        if (!results[args_key]) {
            results[args_key] = func(...arguments);
        }
        return results[args_key];
    };
};

// === GREEDY MERGE REPLACING BRUTE FORCE ===
function greedyMergeItems(items) {
    let workItems = items.slice();

    if (workItems.length === 1) {
        return { [workItems[0].w]: workItems[0] };
    }

    while (workItems.length > 1) {
        let minCost = Infinity;
        let minPair = [0, 1];
        let minMergedItem = null;

        for (let i = 0; i < workItems.length; i++) {
            for (let j = i + 1; j < workItems.length; j++) {
                let merged;
                try {
                    merged = cheapestItemFromItems2(workItems[i], workItems[j]);
                } catch (e) {
                    if (!(e instanceof MergeLevelsTooExpensiveError)) throw e;
                    continue;
                }
                if (merged.l < minCost) {
                    minCost = merged.l;
                    minPair = [i, j];
                    minMergedItem = merged;
                }
            }
        }

        const [i, j] = minPair;
        if (i > j) {
            workItems.splice(i, 1);
            workItems.splice(j, 1);
        } else {
            workItems.splice(j, 1);
            workItems.splice(i, 1);
        }
        workItems.push(minMergedItem);
    }

    const finalItem = workItems[0];
    return { [finalItem.w]: finalItem };
}

const cheapestItemsFromList = memoizeCheapest(items => {
    return greedyMergeItems(items);
});

function cheapestItemFromItems2(left_item, right_item) {
    if (right_item.i === 'item') {
        return new MergeEnchants(right_item, left_item);
    } else if (left_item.i === 'item') {
        return new MergeEnchants(left_item, right_item);
    }

    let normal_item_obj;
    try {
        normal_item_obj = new MergeEnchants(left_item, right_item);
    } catch {
        return new MergeEnchants(right_item, left_item);
    }

    let reversed_item_obj;
    try {
        reversed_item_obj = new MergeEnchants(right_item, left_item);
    } catch {
        return normal_item_obj;
    }

    const cheapest_work2item = compareCheapest(normal_item_obj, reversed_item_obj);
    const prior_works = Object.keys(cheapest_work2item);
    const prior_work = prior_works[0];
    return cheapest_work2item[prior_work];
}

function compareCheapest(item1, item2) {
    let work2item = {};

    const work1 = item1.w;
    const work2 = item2.w;

    if (work1 === work2) {
        const value1 = item1.l,
            value2 = item2.l;
        if (value1 === value2) {
            const min_xp_cost1 = item1.x,
                min_xp_cost2 = item2.x;
            if (min_xp_cost1 <= min_xp_cost2) {
                work2item[work1] = item1;
            } else {
                work2item[work2] = item2;
            }
        } else if (value1 < value2) {
            work2item[work1] = item1;
        } else {
            work2item[work2] = item2;
        }
    } else {
        work2item[work1] = item1;
        work2item[work2] = item2;
    }

    return work2item;
}

class item_obj {
    constructor(name, value = 0, id = []) {
        this.i = name; // item namespace: 'book' or 'item'
        this.e = id; // enchant id
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
        this.c = { L: left.c, R: right.c, l: merge_cost, w: this.w, v: this.l }; // instructions
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
