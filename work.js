let ID_LIST = {};
let ENCHANTMENT2WEIGHT = [];
const MAXIMUM_MERGE_LEVELS = 39;
let ITEM_NAME;

onmessage = event => {
    if (event.data.msg === 'set_data') {
        const { enchants } = event.data.data;
        let id = 0;
        for (let enchant in enchants) {
            ID_LIST[enchant] = id;
            ENCHANTMENT2WEIGHT[id] = enchants[enchant].weight;
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
        let id = ID_LIST[name];
        let val = level * ENCHANTMENT2WEIGHT[id];
        let e = new item_obj('book', val, [id]);
        e.c = { I: id, l: e.l, w: e.w };
        return e;
    });

    let base_item = ITEM_NAME === 'book' && enchant_objs.length > 0
        ? pickMostExpensiveBook(enchant_objs)
        : new item_obj('item');

    // If there's only one object, we're done
    if (enchant_objs.length + (ITEM_NAME === 'book') <= 1) {
        const single = enchant_objs[0] || base_item;
        postMessage({
            msg: 'complete',
            item_obj: single,
            instructions: [],
            extra: [0, 0],
            enchants
        });
        return;
    }

    if (ITEM_NAME !== 'book') enchant_objs.push(base_item);

    const cheapest = priorityMergeEnchantments(enchant_objs);
    const instructions = getInstructions(cheapest.c);

    let totalLevels = instructions.reduce((s, inst) => s + inst[2], 0);
    let xp = experience(totalLevels);

    postMessage({
        msg: 'complete',
        item_obj: cheapest,
        instructions,
        extra: [totalLevels, xp],
        enchants
    });
}

function pickMostExpensiveBook(arr) {
    let maxIdx = 0;
    arr.forEach((e, i) => { if (e.l > arr[maxIdx].l) maxIdx = i; });
    let e = arr.splice(maxIdx, 1)[0];
    let base = new item_obj(e.e[0], e.l, [e.e[0]]);
    base.c = { I: e.e[0], l: base.l, w: base.w };
    return base;
}

function priorityMergeEnchantments(items) {
    let heap = [...items].sort((a, b) => a.l - b.l);

    while (heap.length > 1) {
        const left = heap.shift();
        const right = heap.shift();

        try {
            let merged = new MergeEnchants(left, right);
            // binary insertion to keep sorted
            let idx = heap.findIndex(x => merged.l < x.l);
            if (~idx) heap.splice(idx, 0, merged);
            else heap.push(merged);
        } catch (e) {
            if (e instanceof MergeLevelsTooExpensiveError) continue;
            throw e;
        }
    }

    return heap[0];
}

function getInstructions(comb) {
    if (!comb.L || !comb.R) return [];
    let res = [...getInstructions(comb.L), ...getInstructions(comb.R)];
    let L = comb.L, R = comb.R;
    let mergeCost = (Number.isInteger(R.v) ? R.v : R.l)
        + 2 ** L.w - 1 + 2 ** R.w - 1;
    let work = Math.max(L.w, R.w) + 1;
    res.push([L, R, mergeCost, experience(mergeCost), 2 ** work - 1]);
    return res;
}

class item_obj {
    constructor(i, l=0, e=[]) {
        this.i = i; this.l = l; this.e = e;
        this.c = {}; this.w = 0; this.x = 0;
    }
}

class MergeEnchants extends item_obj {
    constructor(L, R) {
        let mc = R.l + 2 ** L.w - 1 + 2 ** R.w - 1;
        if (mc > MAXIMUM_MERGE_LEVELS) throw new MergeLevelsTooExpensiveError();
        super(L.i, L.l + R.l, L.e.concat(R.e));
        this.w = Math.max(L.w, R.w) + 1;
        this.x = L.x + R.x + experience(mc);
        this.c = { L: L.c, R: R.c, l: mc, w: this.w, v: (L.l + R.l) };
    }
}

const experience = lvl => {
    if (lvl === 0) return 0;
    if (lvl <= 16) return lvl**2 + 6*lvl;
    if (lvl <= 31) return 2.5*lvl**2 - 40.5*lvl + 360;
    return 4.5*lvl**2 - 162.5*lvl + 2220;
};

class MergeLevelsTooExpensiveError extends Error {}
