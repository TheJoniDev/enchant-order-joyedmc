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

    let enchant_objs = enchants.map(enchant => {
        let id = ID_LIST[enchant[0]];
        let e_obj = new item_obj('book', enchant[1] * ENCHANTMENT2WEIGHT[id], [id]);
        e_obj.c = { I: id, l: e_obj.l, w: e_obj.w };
        return e_obj;
    });

    // Find most expensive enchant
    let mostExpensive = enchant_objs.reduce((maxIndex, item, idx, arr) => item.l > arr[maxIndex].l ? idx : maxIndex, 0);

    let baseItem;
    if (ITEM_NAME === 'book') {
        // Base is the most expensive book
        const baseEnch = enchant_objs[mostExpensive].e[0];
        baseItem = new item_obj(baseEnch, enchant_objs[mostExpensive].l);
        baseItem.e.push(baseEnch);
        enchant_objs.splice(mostExpensive, 1);

        // Find next most expensive for merging
        mostExpensive = enchant_objs.reduce((maxIndex, item, idx, arr) => item.l > arr[maxIndex].l ? idx : maxIndex, 0);
    } else {
        // Base is the actual item (like a sword)
        baseItem = new item_obj('item');
    }

    // Merge most expensive enchant with base item
    let merged_item = new MergeEnchants(baseItem, enchant_objs[mostExpensive]);
    merged_item.c.L = { I: baseItem.i, l: 0, w: 0 }; // Fix base item instruction

    enchant_objs.splice(mostExpensive, 1);

    // Combine the rest of enchants with the merged item
    let all_objs = enchant_objs.concat(merged_item);
    let cheapest_items = cheapestItemsFromList(all_objs);

    // Find overall cheapest
    let cheapest_cost = Infinity;
    let cheapest_key;
    for (const key in cheapest_items) {
        let cost = (mode === 'levels') ? cheapest_items[key].x : cheapest_items[key].w;
        if (cost < cheapest_cost) {
            cheapest_cost = cost;
            cheapest_key = key;
        }
    }
    const cheapest_item = cheapest_items[cheapest_key];

    // If the base was a 'book' and the final item is not the 'item', merge once more with the actual item
    let final_item = cheapest_item;
    if (ITEM_NAME !== 'book' && cheapest_item.i !== 'item') {
        final_item = new MergeEnchants(new item_obj('item'), cheapest_item);
    }

    // Prepare instructions (including final merge with item)
    let instructions = getInstructions(final_item.c);

    // Calculate max levels and XP
    let max_levels = 0;
    instructions.forEach(ins => { max_levels += ins[2]; });
    let max_xp = experience(max_levels);

    postMessage({
        msg: 'complete',
        item_obj: final_item,
        instructions: instructions,
        extra: [max_levels, max_xp],
        enchants: enchants
    });

    results = {};
}

function getInstructions(comb) {
    let instructions = [];

    function recurse(node) {
        if (!node) return;
        if (node.L && node.R) {
            recurse(node.L);
            recurse(node.R);

            let merge_cost;
            if (Number.isInteger(node.R.v)) {
                merge_cost = node.R.v + 2 ** node.L.w - 1 + 2 ** node.R.w - 1;
            } else {
                merge_cost = node.R.l + 2 ** node.L.w - 1 + 2 ** node.R.w - 1;
            }

            let work = Math.max(node.L.w, node.R.w) + 1;
            const instruction = [node.L, node.R, merge_cost, experience(merge_cost), 2 ** work - 1];
            instructions.push(instruction);

            // Fix I references to names
            [node.L, node.R].forEach(side => {
                if (Number.isInteger(side.I)) {
                    side.I = Object.keys(ID_LIST).find(k => ID_LIST[k] === side.I);
                } else if (typeof side.I === 'string' && !Object.keys(ID_LIST).includes(side.I)) {
                    side.I = ITEM_NAME;
                }
            });
        }
    }

    recurse(comb);
    return instructions;
}

function combinations(set, k) {
    if (k > set.length || k <= 0) return [];
    if (k === set.length) return [set];
    if (k === 1) return set.map(el => [el]);

    let combs = [];
    for (let i = 0; i <= set.length - k; i++) {
        let head = set.slice(i, i + 1);
        let tailcombs = combinations(set.slice(i + 1), k - 1);
        tailcombs.forEach(tc => combs.push(head.concat(tc)));
    }
    return combs;
}

function hashFromItem(item_obj) {
    const enchants = [...item_obj.e].sort();
    const item_namespace = item_obj.i[0];
    const work = item_obj.w;
    return [item_namespace, enchants.join(','), work].join('|');
}

function memoizeHashFromArguments(args) {
    let items = args[0];
    return items.map(item => hashFromItem(item)).join(';');
}

const memoizeCheapest = func => {
    return (...args) => {
        const args_key = memoizeHashFromArguments(args);
        if (!results[args_key]) {
            results[args_key] = func(...args);
        }
        return results[args_key];
    };
};

const cheapestItemsFromList = memoizeCheapest(items => {
    let work2item = {};
    const item_count = items.length;

    switch (item_count) {
        case 1: {
            const item = items[0];
            work2item[item.w] = item;
            return work2item;
        }
        case 2: {
            const cheapest_item = cheapestItemFromItems2(items[0], items[1]);
            work2item[cheapest_item.w] = cheapest_item;
            return work2item;
        }
        default: {
            return cheapestItemsFromListN(items, Math.floor(item_count / 2));
        }
    }
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
    return cheapest_work2item[prior_works[0]];
}

function cheapestItemsFromListN(items, max_subcount) {
    const cheapest_work2item = {};
    const cheapest_prior_works = [];

    for (let subcount = 1; subcount <= max_subcount; subcount++) {
        combinations(items, subcount).forEach(left_item => {
            const right_item = items.filter(item => !left_item.includes(item));
            const left_work2item = cheapestItemsFromList(left_item);
            const right_work2item = cheapestItemsFromList(right_item);
            const new_work2item = cheapestItemsFromDictionaries([left_work2item, right_work2item]);

            for (let work in new_work2item) {
                const new_item = new_work2item[work];
                if (cheapest_prior_works.includes(work)) {
                    const cheapest_item = cheapest_work2item[work];
                    const new_cheapest = compareCheapest(cheapest_item, new_item);
                    cheapest_work2item[work] = new_cheapest[work];
                } else {
                    cheapest_work2item[work] = new_item;
                    cheapest_prior_works.push(work);
                }
            }
        });
    }
    return cheapest_work2item;
}

function compareCheapest(item1, item2) {
    let work2item = {};

    const work1 = item1.w;
    const work2 = item2.w;

    if (work1 === work2) {
        if (item1.l === item2.l) {
            work2item[work1] = item1.x <= item2.x ? item1 : item2;
        } else {
            work2item[work1] = item1.l < item2.l ? item1 : item2;
        }
    } else {
        work2item[work1] = item1;
        work2item[work2] = item2;
    }
    return work2item;
}

function cheapestItemsFromDictionaries(work2items) {
    if (work2items.length === 1) return work2items[0];
    if (work2items.length === 2) {
        return cheapestItemsFromDictionaries2(work2items[0], work2items[1]);
    }
}

function cheapestItemsFromDictionaries2(left_work2item, right_work2item) {
    let cheapest_work2item = {};
    const cheapest_prior_works = [];

    for (let lw in left_work2item) {
        const left_item = left_work2item[lw];
        for (let rw in right_work2item) {
            const right_item = right_work2item[rw];
            let new_work2item;
            try {
                new_work2item = cheapestItemsFromList([left_item, right_item]);
            } catch (error) {
                if (!(error instanceof MergeLevelsTooExpensiveError)) throw error;
            }
            for (let work in new_work2item) {
                const new_item = new_work2item[work];
                if (cheapest_prior_works.includes(work)) {
                    const cheapest_item = cheapest_work2item[work];
                    const new_cheapest = compareCheapest(cheapest_item, new_item);
                    cheapest_work2item[work] = new_cheapest[work];
                } else {
                    cheapest_work2item[work] = new_item;
                    cheapest_prior_works.push(work);
                }
            }
        }
    }
    return removeExpensiveCandidatesFromDictionary(cheapest_work2item);
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
        this.e = left.e.concat(right.e);
        this.w = Math.max(left.w, right.w) + 1;
        this.x = left.x + right.x + experience(merge_cost);
        this.c = { L: left.c, R: right.c, l: merge_cost, w: this.w, v: this.l };
    }
}

const experience = level => {
    if (level === 0) return 0;
    else if (level <= 16) return level ** 2 + 6 * level;
    else if (level <= 31) return 2.5 * level ** 2 - 40.5 * level + 360;
    else return 4.5 * level ** 2 - 162.5 * level + 2220;
};

function removeExpensiveCandidatesFromDictionary(work2item) {
    const cheapest_work2item = {};
    let cheapest_value = Infinity;

    for (let work in work2item) {
        const item = work2item[work];
        if (item.l < cheapest_value) {
            cheapest_work2item[work] = item;
            cheapest_value = item.l;
        }
    }
    return cheapest_work2item;
}

class MergeLevelsTooExpensiveError extends Error {
    constructor(message = 'merge levels is above maximum allowed') {
        super(message);
        this.name = 'MergeLevelsTooExpensiveError';
    }
}