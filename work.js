// Refactored: Optimized enchant merge calculation with better memoization, pruning, and reduced combinations

let ID_LIST = {};
let ENCHANTMENT2WEIGHT = [];
const MAXIMUM_MERGE_LEVELS = 39;
let ITEM_NAME;
let results = {};
const MERGE_CACHE = new Set();

onmessage = event => {
    if (event.data.msg === 'set_data') {
        const { enchants } = event.data.data;
        let id = 0;
        for (let enchant in enchants) {
            const weight = enchants[enchant]['weight'];
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

    // Sort enchantments by value descending
    enchants.sort((a, b) => (b[1] * ENCHANTMENT2WEIGHT[ID_LIST[b[0]]]) - (a[1] * ENCHANTMENT2WEIGHT[ID_LIST[a[0]]]));

    let enchant_objs = enchants.map(([enchant, level]) => {
        const id = ID_LIST[enchant];
        const obj = new item_obj('book', level * ENCHANTMENT2WEIGHT[id], [id]);
        obj.c = { I: id, l: obj.l, w: obj.w };
        return obj;
    });

    let base;
    if (ITEM_NAME === 'book') {
        const mostExpensive = enchant_objs.shift();
        base = new item_obj(mostExpensive.e[0], mostExpensive.l);
        base.e.push(mostExpensive.e[0]);
    } else {
        base = new item_obj('item');
    }

    const merged_base = new MergeEnchants(base, enchant_objs.shift());
    merged_base.c.L = { I: base.i, l: 0, w: 0 };
    enchant_objs.push(merged_base);

    const cheapest_items = cheapestItemsFromList(enchant_objs);
    let cheapest_item = Object.values(cheapest_items).reduce((best, item) => {
        const cost = mode === 'levels' ? item.x : item.w;
        const bestCost = mode === 'levels' ? best.x : best.w;
        return cost < bestCost ? item : best;
    });

    const instructions = getInstructions(cheapest_item.c);
    const max_levels = instructions.reduce((sum, step) => sum + step[2], 0);
    const max_xp = experience(max_levels);

    postMessage({
        msg: 'complete',
        item_obj: cheapest_item,
        instructions,
        extra: [max_levels, max_xp],
        enchants
    });
    results = {};
    MERGE_CACHE.clear();
}

function getInstructions(comb) {
    const instructions = [];
    for (const side of ['L', 'R']) {
        if (comb[side] && typeof comb[side].I === 'undefined') {
            instructions.push(...getInstructions(comb[side]));
        }
        if (typeof comb[side].I === 'number') {
            comb[side].I = Object.keys(ID_LIST).find(key => ID_LIST[key] === comb[side].I);
        } else if (typeof comb[side].I === 'string' && !ID_LIST[comb[side].I]) {
            comb[side].I = ITEM_NAME;
        }
    }
    const merge_cost = comb.R.v + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1;
    const work = Math.max(comb.L.w, comb.R.w) + 1;
    instructions.push([comb.L, comb.R, merge_cost, experience(merge_cost), 2 ** work - 1]);
    return instructions;
}

function hashFromItem(item_obj) {
    return JSON.stringify({
        i: item_obj.i,
        e: [...item_obj.e].sort((a, b) => a - b),
        w: item_obj.w,
        l: item_obj.l
    });
}

const memoizeCheapest = func => (...args) => {
    const key = JSON.stringify(args.map(hashFromItem));
    if (!results[key]) results[key] = func(...args);
    return results[key];
};

const cheapestItemsFromList = memoizeCheapest(items => {
    if (items.length === 1) return { [items[0].w]: items[0] };
    if (items.length === 2) return { [mergeKey(items[0], items[1])]: cheapestItemFromItems2(items[0], items[1]) };

    return cheapestItemsFromListN(items);
});

function mergeKey(item1, item2) {
    return [...item1.e, ...item2.e].sort((a, b) => a - b).join(',');
}

function cheapestItemsFromListN(items) {
    const result = {};
    const seen = new Set();
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            const key = mergeKey(items[i], items[j]);
            if (MERGE_CACHE.has(key)) continue;
            MERGE_CACHE.add(key);
            const merged = cheapestItemFromItems2(items[i], items[j]);
            if (!merged) continue;
            const rest = items.filter((_, idx) => idx !== i && idx !== j);
            rest.push(merged);
            const best = cheapestItemsFromList(rest);
            Object.entries(best).forEach(([w, item]) => {
                if (!result[w] || result[w].x > item.x) {
                    result[w] = item;
                }
            });
        }
    }
    return result;
}

function cheapestItemFromItems2(left, right) {
    try {
        const merged1 = new MergeEnchants(left, right);
        const merged2 = new MergeEnchants(right, left);
        return merged1.x <= merged2.x ? merged1 : merged2;
    } catch {
        try { return new MergeEnchants(right, left); } catch { return null; }
    }
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
        super(left.i, left.l + right.l);
        this.e = [...left.e, ...right.e];
        this.w = Math.max(left.w, right.w) + 1;
        this.x = left.x + right.x + experience(merge_cost);
        this.c = { L: left.c, R: right.c, l: merge_cost, w: this.w, v: this.l };
    }
}

class MergeLevelsTooExpensiveError extends Error {
    constructor(msg = 'merge levels is above maximum allowed') {
        super(msg);
        this.name = 'MergeLevelsTooExpensiveError';
    }
}

function experience(level) {
    if (level <= 16) return level ** 2 + 6 * level;
    if (level <= 31) return 2.5 * level ** 2 - 40.5 * level + 360;
    return 4.5 * level ** 2 - 162.5 * level + 2220;
}
