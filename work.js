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
    let val = enchant[1] * ENCHANTMENT2WEIGHT[id];
    let e_obj = new item_obj('book', val, [id]);
    e_obj.c = { I: id, l: e_obj.l, w: e_obj.w };
    return e_obj;
  });

  if (ITEM_NAME === 'book' && enchant_objs.length > 0) {
    let mostExpensiveIdx = enchant_objs.reduce((maxIdx, item, idx, arr) =>
      item.l > arr[maxIdx].l ? idx : maxIdx, 0);
    const baseEnchant = enchant_objs[mostExpensiveIdx];
    item = new item_obj(baseEnchant.e[0], baseEnchant.l);
    item.e.push(baseEnchant.e[0]);
    enchant_objs.splice(mostExpensiveIdx, 1);
  } else {
    item = new item_obj('item');
  }

  if (enchant_objs.length === 0) {
    // No enchants to merge, just output the item itself
    postMergeResult(item, mode, enchants);
    return;
  }

  enchant_objs.unshift(item); // base item at index 0

  const merged = bitmaskDPMerge(enchant_objs);

  postMergeResult(merged, mode, enchants);
}

function postMergeResult(cheapest_item, mode, enchants) {
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

// Bitmask DP merge for speed
function bitmaskDPMerge(items) {
  const n = items.length;
  const dp = new Map();

  // Base case: single items
  for (let i = 0; i < n; i++) {
    let bm = 1 << i;
    dp.set(bm, items[i]);
  }

  // Iterate subsets of size 2..n
  for (let size = 2; size <= n; size++) {
    for (let bm = 1; bm < (1 << n); bm++) {
      if (countBits(bm) !== size) continue;

      let best = null;

      // Enumerate submasks
      for (let sub = (bm - 1) & bm; sub > 0; sub = (sub - 1) & bm) {
        let left = dp.get(sub);
        let right = dp.get(bm ^ sub);
        if (!left || !right) continue;

        try {
          let merged = new MergeEnchants(left, right);
          if (!best) {
            best = merged;
          } else {
            best = compareCheapest(best, merged)[
              best.w <= merged.w ? best.w : merged.w
            ];
          }
        } catch (e) {
          if (!(e instanceof MergeLevelsTooExpensiveError)) throw e;
          // ignore subsets that exceed max merge levels
        }
      }

      if (best) dp.set(bm, best);
    }
  }

  return dp.get((1 << n) - 1);
}

function countBits(x) {
  let count = 0;
  while (x) {
    count += x & 1;
    x >>= 1;
  }
  return count;
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
    this.e = id; // enchant id list
    this.c = {}; // stores instructions
    this.w = 0; // work
    this.l = value; // value, in MergeEnchants merge_cost
    this.x = 0; // total xp
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
