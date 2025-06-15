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
    ITEM_NAME = item
    Object.freeze(ITEM_NAME);

    let enchant_objs = []
    enchants.forEach(enchant => { // Creates objects of enchants
        let id = ID_LIST[enchant[0]]
        let e_obj = new item_obj('book', enchant[1] * ENCHANTMENT2WEIGHT[id], [id])
        e_obj.c = {I: id, l: e_obj.l, w: e_obj.w}
        enchant_objs.push(e_obj)
    });
    // Finds the most expensive enchant
    let mostExpensive = enchant_objs.reduce((maxIndex, item, currentIndex, array) => {
        return item.l > array[maxIndex].l ? currentIndex : maxIndex;
    }, 0);

    let id;
    if (ITEM_NAME === 'book') {
        id = enchant_objs[mostExpensive].e[0]
        item = new item_obj(id, enchant_objs[mostExpensive].l) // Makes the most expensive book the base
        item.e.push(id)
        enchant_objs.splice(mostExpensive, 1)
        // Finds a new most expensive enchant
        mostExpensive = enchant_objs.reduce((maxIndex, item, currentIndex, array) => {
            return item.l > array[maxIndex].l ? currentIndex : maxIndex;
        }, 0);
    } else {
        item = new item_obj('item')
    }
    let merged_item = new MergeEnchants(item, enchant_objs[mostExpensive]) // Merges the most expensive enchant with the item
    merged_item.c.L = {I: item.i, l: 0, w: 0}
    enchant_objs.splice(mostExpensive, 1)

    let all_objs = enchant_objs.concat(merged_item);

    // ======= REPLACED THE SLOW FUNCTION WITH GREEDY MERGE =======
    const cheapest_item = greedyMergeItems(all_objs);

    let instructions = getInstructions(cheapest_item.c);

    let max_levels = 0
    instructions.forEach(key => {
        max_levels += key[2]
    });
    let max_xp = experience(max_levels)

    postMessage({
        msg: 'complete',
        item_obj: cheapest_item,
        instructions: instructions,
        extra: [max_levels, max_xp],
        enchants: enchants
    });

    results = {}
}

function greedyMergeItems(items) {
    const pq = [...items];
    pq.sort((a, b) => a.l - b.l); // Sort by enchantment value

    while (pq.length > 1) {
        const left = pq.shift();
        const right = pq.shift();

        let merged;
        try {
            merged = new MergeEnchants(left, right);
        } catch (e) {
            if (e instanceof MergeLevelsTooExpensiveError) {
                // Try reverse order if merge cost exceeds max
                try {
                    merged = new MergeEnchants(right, left);
                } catch (e2) {
                    throw new Error('Both merge orders too expensive.');
                }
            } else {
                throw e;
            }
        }

        // Insert merged item and keep the queue sorted
        pq.push(merged);
        pq.sort((a, b) => a.l - b.l); // For better performance, replace this with a heap if needed
    }

    return pq[0];
}

function getInstructions(comb) {
    let instructions = [];
    let child_instructions;
    for (const key in comb) {
        if (key === 'L' || key === 'R') {
            if (typeof (comb[key].I) === 'undefined') {
                child_instructions = getInstructions(comb[key])
                child_instructions.forEach(single_instruction => {
                    instructions.push(single_instruction);
                })
            }
            let id;
            if (Number.isInteger(comb[key].I)) {
                id = comb[key].I
                comb[key].I = Object.keys(ID_LIST).find(key => ID_LIST[key] === id);
            } else if (typeof (comb[key].I) === 'string' && !Object.keys(ID_LIST).includes(comb[key].I)) {
                comb[key].I = ITEM_NAME
            }
        }
    }
    let merge_cost;
    if (Number.isInteger(comb.R.v)) {
        merge_cost = comb.R.v + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1
    } else {
        merge_cost = comb.R.l + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1
    }
    let work = Math.max(comb.L.w, comb.R.w) + 1
    const single_instruction = [comb.L, comb.R, merge_cost, experience(merge_cost), 2 ** work - 1];
    instructions.push(single_instruction);
    return instructions;
}

function combinations(set, k) {
    let i, j, combs, head, tailcombs;

    if (k > set.length || k <= 0) {
        return [];
    }

    if (k === set.length) {
        return [set];
    }

    if (k === 1) {
        combs = [];
        for (i = 0; i < set.length; i++) {
            combs.push([set[i]]);
        }
        return combs;
    }

    combs = [];
    for (i = 0; i < set.length - k + 1; i++) {
        head = set.slice(i, i + 1);
        tailcombs = combinations(set.slice(i + 1), k - 1);
        for (j = 0; j < tailcombs.length; j++) {
            combs.push(head.concat(tailcombs[j]));
        }
    }
    return combs;
}

function hashFromItem(item_obj) {
    const enchants = item_obj.e;
    const sorted_ids = enchants.sort();
    const item_namespace = item_obj.i[0];
    const work = item_obj.w;
    return [item_namespace, sorted_ids, work];
}

function memoizeHashFromArguments(arguments) {
    let items = arguments[0];
    let hashes = new Array(items.length);

    items.forEach((item, index) => {
        hashes[index] = hashFromItem(item);
    });
    return hashes;
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

class item_obj {
    constructor(name, value = 0, id = []) {
        this.i = name // item namespace: 'book' or 'item'
        this.e = id // enchant id
        this.c = {} // stores instructions
        this.w = 0 // work
        this.l = value // value, in MergeEnchants merge_cost
        this.x = 0 // total xp
    }
}

class MergeEnchants extends item_obj {
    constructor(left, right) {
        const merge_cost = right.l + 2 ** left.w - 1 + 2 ** right.w - 1
        if (merge_cost > MAXIMUM_MERGE_LEVELS) {
            throw new MergeLevelsTooExpensiveError();
        }
        let new_value = left.l + right.l
        super(left.i, new_value)
        this.e = left.e.concat(right.e) // list of enchants
        this.w = Math.max(left.w, right.w) + 1 // new work
        this.x = left.x + right.x + experience(merge_cost) // total xp
        this.c = {L: left.c, R: right.c, l: merge_cost, w: this.w, v: this.l} // instructions
    }
}

const experience = level => {
    if (level === 0) {
        return 0;
    } else if (level <= 16) {
        return level ** 2 + 6 * level
    } else if (level <= 31) {
        return 2.5 * level ** 2 - 40.5 * level + 360;
    } else {
        return 4.5 * level ** 2 - 162.5 * level + 2220;
    }
}

class MergeLevelsTooExpensiveError extends Error {
    constructor(message = 'merge levels is above maximum allowed') {
        super(message);
        this.name = 'MergeLevelsTooExpensiveError';
    }
}
