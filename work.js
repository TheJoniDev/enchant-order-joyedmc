let ID_LIST = {};
let ENCHANTMENT2WEIGHT = [];
const MAXIMUM_MERGE_LEVELS = 39;
let ITEM_NAME;

onmessage = event => {
    if (event.data.msg === 'set_data') {
        const { enchants } = event.data.data;

        let id = 0;
        for (let enchant in enchants) {
            const weight = enchants[enchant].weight;
            ID_LIST[enchant] = id;
            ENCHANTMENT2WEIGHT[id] = weight;
            id++;
        }
        Object.freeze(ENCHANTMENT2WEIGHT);
        Object.freeze(ID_LIST);
    }

    if (event.data.msg === 'process') {
        process(event.data.item, event.data.enchants);
    }
};

function process(itemName, enchants) {
    ITEM_NAME = itemName;
    Object.freeze(ITEM_NAME);

    const enchantObjs = enchants.map(([namespace, level]) => {
        const id = ID_LIST[namespace];
        const value = level * ENCHANTMENT2WEIGHT[id];
        const obj = new item_obj('book', value, [id]);
        obj.c = { I: id, l: obj.l, w: obj.w };
        return obj;
    });

    let baseItem;
    if (ITEM_NAME === 'book') {
        let mostExpensive = enchantObjs.reduce((max, cur, idx, arr) => cur.l > arr[max].l ? idx : max, 0);
        const baseEnchant = enchantObjs.splice(mostExpensive, 1)[0];
        const id = baseEnchant.e[0];
        baseItem = new item_obj(id, baseEnchant.l);
        baseItem.e.push(id);
    } else {
        baseItem = new item_obj('item');
    }

    const merged = beamSearchMerge([baseItem, ...enchantObjs], 64, 100000);
    const instructions = getInstructions(merged.c);
    const totalLevels = instructions.reduce((sum, inst) => sum + inst[2], 0);
    const totalXp = experience(totalLevels);

    postMessage({
        msg: 'complete',
        item_obj: merged,
        instructions: instructions,
        extra: [totalLevels, totalXp],
        enchants: enchants
    });
}

function beamSearchMerge(initialItems, beamWidth = 32, maxSteps = 100000) {
    let beam = [initialItems];
    let step = 0;

    while (beam.length > 0 && step < maxSteps) {
        const nextBeam = [];

        for (const items of beam) {
            if (items.length === 1) return items[0];

            for (let i = 0; i < items.length; i++) {
                for (let j = i + 1; j < items.length; j++) {
                    const a = items[i];
                    const b = items[j];
                    try {
                        const merged = new MergeEnchants(a, b);
                        const remaining = items.filter((_, idx) => idx !== i && idx !== j);
                        nextBeam.push([...remaining, merged]);
                    } catch (e) {
                        if (!(e instanceof MergeLevelsTooExpensiveError)) throw e;
                    }
                }
            }
        }

        // Sort by prior work penalty (lowest first)
        nextBeam.sort((a, b) => {
            const aWork = Math.max(...a.map(it => it.w));
            const bWork = Math.max(...b.map(it => it.w));
            return aWork - bWork;
        });

        beam = nextBeam.slice(0, beamWidth);
        step++;
    }

    return beam.length ? beam[0][0] : initialItems[0];
}

function getInstructions(comb) {
    let instructions = [];

    for (const key in comb) {
        if (key === 'L' || key === 'R') {
            if (typeof comb[key].I === 'undefined') {
                const child = getInstructions(comb[key]);
                instructions.push(...child);
            }
            if (Number.isInteger(comb[key].I)) {
                comb[key].I = Object.keys(ID_LIST).find(k => ID_LIST[k] === comb[key].I);
            } else if (!Object.keys(ID_LIST).includes(comb[key].I)) {
                comb[key].I = ITEM_NAME;
            }
        }
    }

    const mergeCost = Number.isInteger(comb.R.v)
        ? comb.R.v + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1
        : comb.R.l + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1;
    const work = Math.max(comb.L.w, comb.R.w) + 1;
    instructions.push([comb.L, comb.R, mergeCost, experience(mergeCost), 2 ** work - 1]);

    return instructions;
}

class item_obj {
    constructor(name, value = 0, ids = []) {
        this.i = name;
        this.e = ids;
        this.c = {};
        this.w = 0;
        this.l = value;
        this.x = 0;
    }
}

class MergeEnchants extends item_obj {
    constructor(left, right) {
        const mergeCost = right.l + 2 ** left.w - 1 + 2 ** right.w - 1;
        if (mergeCost > MAXIMUM_MERGE_LEVELS) {
            throw new MergeLevelsTooExpensiveError();
        }
        const newValue = left.l + right.l;
        super(left.i, newValue);
        this.e = left.e.concat(right.e);
        this.w = Math.max(left.w, right.w) + 1;
        this.x = left.x + right.x + experience(mergeCost);
        this.c = { L: left.c, R: right.c, l: mergeCost, w: this.w, v: this.l };
    }
}

class MergeLevelsTooExpensiveError extends Error {
    constructor(message = 'Merge levels exceed the allowed maximum') {
        super(message);
        this.name = 'MergeLevelsTooExpensiveError';
    }
}

function experience(level) {
    if (level === 0) return 0;
    if (level <= 16) return level ** 2 + 6 * level;
    if (level <= 31) return 2.5 * level ** 2 - 40.5 * level + 360;
    return 4.5 * level ** 2 - 162.5 * level + 2220;
}
