const MAXIMUM_MERGE_LEVELS = 39; const BEAM_WIDTH = 8; let ID_LIST = {}; let ENCHANTMENT2WEIGHT = []; let ITEM_NAME;

onmessage = event => { if (event.data.msg === 'set_data') { const { enchants } = event.data.data;

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
    process(event.data.item, event.data.enchants);
}

};

function process(item, enchants) { ITEM_NAME = item; Object.freeze(ITEM_NAME);

let enchant_objs = enchants.map(enchant => {
    let id = ID_LIST[enchant[0]];
    let e_obj = new item_obj('book', enchant[1] * ENCHANTMENT2WEIGHT[id], [id]);
    e_obj.c = { I: id, l: e_obj.l, w: e_obj.w };
    return e_obj;
});

let mostExpensive = enchant_objs.reduce((maxIndex, item, idx, arr) => item.l > arr[maxIndex].l ? idx : maxIndex, 0);

let id;
if (ITEM_NAME === 'book') {
    id = enchant_objs[mostExpensive].e[0];
    item = new item_obj(id, enchant_objs[mostExpensive].l);
    item.e.push(id);
    enchant_objs.splice(mostExpensive, 1);
    mostExpensive = enchant_objs.reduce((maxIndex, item, idx, arr) => item.l > arr[maxIndex].l ? idx : maxIndex, 0);
} else {
    item = new item_obj('item');
}

enchant_objs.push(item);
let bestItem = beamSearch(enchant_objs, BEAM_WIDTH);

let instructions = getInstructions(bestItem.c);
let max_levels = instructions.reduce((sum, key) => sum + key[2], 0);
let max_xp = experience(max_levels);

postMessage({
    msg: 'complete',
    item_obj: bestItem,
    instructions: instructions,
    extra: [max_levels, max_xp],
    enchants: enchants
});

}

function beamSearch(items, beamWidth) { let queue = [items];

while (queue.length > 1) {
    let nextQueue = [];

    for (let i = 0; i < queue.length; i++) {
        let set = queue[i];
        if (set.length < 2) {
            nextQueue.push(set);
            continue;
        }

        for (let j = 0; j < set.length; j++) {
            for (let k = j + 1; k < set.length; k++) {
                let rest = set.filter((_, idx) => idx !== j && idx !== k);
                let pairs = [new MergeEnchants(set[j], set[k]), new MergeEnchants(set[k], set[j])];
                for (let merged of pairs) {
                    if (merged.l <= MAXIMUM_MERGE_LEVELS) {
                        nextQueue.push(rest.concat([merged]));
                    }
                }
            }
        }
    }

    nextQueue.sort((a, b) => a[a.length - 1].w - b[b.length - 1].w);
    queue = nextQueue.slice(0, beamWidth);
}

return queue[0][0];

}

function getInstructions(comb) { let instructions = []; for (const key of ['L', 'R']) { if (comb[key]) { if (typeof comb[key].I === 'undefined') { instructions.push(...getInstructions(comb[key])); } if (typeof comb[key].I === 'number') { comb[key].I = Object.keys(ID_LIST).find(k => ID_LIST[k] === comb[key].I); } else if (!Object.keys(ID_LIST).includes(comb[key].I)) { comb[key].I = ITEM_NAME; } } } let merge_cost = comb.R.l + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1; let work = Math.max(comb.L.w, comb.R.w) + 1; instructions.push([comb.L, comb.R, merge_cost, experience(merge_cost), 2 ** work - 1]); return instructions; }

class item_obj { constructor(name, value = 0, id = []) { this.i = name; this.e = id; this.c = {}; this.w = 0; this.l = value; this.x = 0; } }

class MergeEnchants extends item_obj { constructor(left, right) { const merge_cost = right.l + 2 ** left.w - 1 + 2 ** right.w - 1; if (merge_cost > MAXIMUM_MERGE_LEVELS) throw new MergeLevelsTooExpensiveError(); let new_value = left.l + right.l; super(left.i, new_value); this.e = left.e.concat(right.e); this.w = Math.max(left.w, right.w) + 1; this.x = left.x + right.x + experience(merge_cost); this.c = { L: left.c, R: right.c, l: merge_cost, w: this.w, v: this.l }; } }

function experience(level) { if (level === 0) return 0; if (level <= 16) return level ** 2 + 6 * level; if (level <= 31) return 2.5 * level ** 2 - 40.5 * level + 360; return 4.5 * level ** 2 - 162.5 * level + 2220; }

class MergeLevelsTooExpensiveError extends Error { constructor(message = 'merge levels is above maximum allowed') { super(message); this.name = 'MergeLevelsTooExpensiveError'; } }
