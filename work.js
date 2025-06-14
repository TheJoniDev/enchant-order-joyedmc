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
            ID_LIST[enchant] = id;
            ENCHANTMENT2WEIGHT[id] = enchant_data['weight'];
            id++;
        }
    }

    if (event.data.msg === 'process') {
        process(event.data.item, event.data.enchants, event.data.mode);
    }
};

function process(item, enchants, mode = 'levels') {
    ITEM_NAME = item;

    let enchant_objs = enchants.map(([name, level]) => {
        const id = ID_LIST[name];
        const obj = new item_obj('book', level * ENCHANTMENT2WEIGHT[id], [id]);
        obj.c = { I: id, l: obj.l, w: obj.w };
        return obj;
    });

    if (enchant_objs.length === 0) {
        postMessage({ msg: 'complete', item_obj: null, instructions: [], extra: [0, 0], enchants: enchants });
        return;
    }

    let base;
    if (ITEM_NAME === 'book') {
        base = enchant_objs.pop();
    } else {
        const base_enchant = enchant_objs.pop();
        base = new item_obj('item', base_enchant.l, base_enchant.e);
        base.c = base_enchant.c;
    }

    let items = [base].concat(enchant_objs);
    let result;

    try {
        result = greedyMerge(items);
    } catch (e) {
        postMessage({ msg: 'error', error: 'Failed to compute greedy merge.' });
        return;
    }

    const instructions = getInstructions(result.c);
    const max_levels = instructions.reduce((sum, step) => sum + step[2], 0);

    postMessage({
        msg: 'complete',
        item_obj: result,
        instructions: instructions,
        extra: [max_levels, experience(max_levels)],
        enchants: enchants
    });
}

function greedyMerge(items) {
    items.sort((a, b) => a.l - b.l);
    while (items.length > 1) {
        const left = items.shift();
        const right = items.shift();
        const merged = new MergeEnchants(left, right);
        items.push(merged);
        items.sort((a, b) => a.l - b.l);
    }
    return items[0];
}

function getInstructions(c) {
    let instructions = [];
    for (const key of ['L', 'R']) {
        if (c[key] && typeof c[key].I === 'undefined') {
            instructions = instructions.concat(getInstructions(c[key]));
        }
    }
    if (c.L && c.R) {
        const merge_cost = c.l ?? (c.R.l + 2 ** c.L.w - 1 + 2 ** c.R.w - 1);
        const work = Math.max(c.L.w, c.R.w) + 1;
        const xp = experience(merge_cost);
        instructions.push([c.L, c.R, merge_cost, xp, 2 ** work - 1]);
    }
    return instructions;
}

function experience(level) {
    if (level <= 16) return level ** 2 + 6 * level;
    if (level <= 31) return 2.5 * level ** 2 - 40.5 * level + 360;
    return 4.5 * level ** 2 - 162.5 * level + 2220;
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
        const cost = right.l + 2 ** left.w - 1 + 2 ** right.w - 1;
        if (cost > MAXIMUM_MERGE_LEVELS) throw new Error('Too Expensive');
        super(left.i, left.l + right.l);
        this.e = left.e.concat(right.e);
        this.w = Math.max(left.w, right.w) + 1;
        this.x = left.x + right.x + experience(cost);
        this.c = { L: left.c, R: right.c, l: cost, w: this.w, v: this.l };
    }
}
