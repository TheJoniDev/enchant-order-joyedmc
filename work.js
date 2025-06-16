// Optimized enchant merging code with prioritization: // 1. Least prior work penalty // 2. Least total XP cost

const MAXIMUM_MERGE_LEVELS = 39; let ID_LIST = {}; let ENCHANTMENT2WEIGHT = []; let ITEM_NAME;

onmessage = event => { if (event.data.msg === 'set_data') { const { enchants } = event.data.data; let id = 0; for (let enchant in enchants) { const enchant_data = enchants[enchant]; const weight = enchant_data['weight']; ID_LIST[enchant] = id; ENCHANTMENT2WEIGHT[id] = weight; id++; } Object.freeze(ENCHANTMENT2WEIGHT); Object.freeze(ID_LIST); } if (event.data.msg === 'process') { process(event.data.item, event.data.enchants); } };

function process(item, enchants) { ITEM_NAME = item; Object.freeze(ITEM_NAME);

let enchant_objs = enchants.map(enchant => {
    let id = ID_LIST[enchant[0]];
    let e_obj = new item_obj('book', enchant[1] * ENCHANTMENT2WEIGHT[id], [id]);
    e_obj.c = { I: id, l: e_obj.l, w: e_obj.w };
    return e_obj;
});

let final_item = optimizeMerges(enchant_objs);
let instructions = getInstructions(final_item.c);

let max_levels = instructions.reduce((acc, step) => acc + step[2], 0);
let max_xp = experience(max_levels);

postMessage({
    msg: 'complete',
    item_obj: final_item,
    instructions: instructions,
    extra: [max_levels, max_xp],
    enchants: enchants
});

}

function optimizeMerges(items) { const n = items.length; const dp = new Map();

for (let i = 0; i < n; i++) {
    const mask = 1 << i;
    dp.set(mask, [items[i]]);
}

for (let size = 2; size <= n; size++) {
    for (let mask = 1; mask < (1 << n); mask++) {
        if (countBits(mask) !== size) continue;
        const candidates = [];
        for (let sub = (mask - 1) & mask; sub; sub = (sub - 1) & mask) {
            const complement = mask ^ sub;
            const lefts = dp.get(sub) || [];
            const rights = dp.get(complement) || [];
            for (const left of lefts) {
                for (const right of rights) {
                    try {
                        candidates.push(new MergeEnchants(left, right));
                    } catch {}
                }
            }
        }
        if (candidates.length) dp.set(mask, filterBest(candidates));
    }
}
return dp.get((1 << n) - 1)?.[0];

}

function countBits(x) { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; }

function filterBest(items) { let best = []; let minW = Infinity, minX = Infinity; for (const item of items) { if (item.w < minW || (item.w === minW && item.x < minX)) { best = [item]; minW = item.w; minX = item.x; } else if (item.w === minW && item.x === minX) { best.push(item); } } return best; }

function getInstructions(comb) { let instructions = []; for (const key of ['L', 'R']) { if (comb[key]) { if (typeof comb[key].I === 'undefined') { instructions.push(...getInstructions(comb[key])); } if (Number.isInteger(comb[key].I)) { comb[key].I = Object.keys(ID_LIST).find(k => ID_LIST[k] === comb[key].I); } else if (!Object.keys(ID_LIST).includes(comb[key].I)) { comb[key].I = ITEM_NAME; } } } let cost = Number.isInteger(comb.R.v) ? comb.R.v + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1 : comb.R.l + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1; let work = Math.max(comb.L.w, comb.R.w) + 1; instructions.push([comb.L, comb.R, cost, experience(cost), 2 ** work - 1]); return instructions; }

class item_obj { constructor(name, value = 0, id = []) { this.i = name; this.e = id; this.c = {}; this.w = 0; this.l = value; this.x = 0; } }

class MergeEnchants extends item_obj { constructor(left, right) { const merge_cost = right.l + 2 ** left.w - 1 + 2 ** right.w - 1; if (merge_cost > MAXIMUM_MERGE_LEVELS) throw new MergeLevelsTooExpensiveError(); super(left.i, left.l + right.l); this.e = left.e.concat(right.e); this.w = Math.max(left.w, right.w) + 1; this.x = left.x + right.x + experience(merge_cost); this.c = { L: left.c, R: right.c, l: merge_cost, w: this.w, v: this.l }; } }

const experience = level => { if (level <= 16) return level ** 2 + 6 * level; if (level <= 31) return 2.5 * level ** 2 - 40.5 * level + 360; return 4.5 * level ** 2 - 162.5 * level + 2220; };

class MergeLevelsTooExpensiveError extends Error { constructor(msg = 'merge levels above max allowed') { super(msg); this.name = 'MergeLevelsTooExpensiveError'; } }

