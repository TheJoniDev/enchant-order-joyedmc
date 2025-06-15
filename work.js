let ID_LIST = {};
let ENCHANTMENT2WEIGHT = [];
const MAXIMUM_MERGE_LEVELS = 39;
let ITEM_NAME;

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

// Cache experience values for all levels from 0 to MAXIMUM_MERGE_LEVELS
const experienceCache = new Array(MAXIMUM_MERGE_LEVELS + 1);
for (let lvl = 0; lvl <= MAXIMUM_MERGE_LEVELS; lvl++) {
  if (lvl === 0) experienceCache[lvl] = 0;
  else if (lvl <= 16) experienceCache[lvl] = lvl ** 2 + 6 * lvl;
  else if (lvl <= 31) experienceCache[lvl] = 2.5 * lvl ** 2 - 40.5 * lvl + 360;
  else experienceCache[lvl] = 4.5 * lvl ** 2 - 162.5 * lvl + 2220;
}

const experience = level => experienceCache[level] || 0;

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
    enchants: enchants,
  });
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
        comb[key].I = Object.keys(ID_LIST).find(k => ID_LIST[k] === id);
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

function combinations(set, k) {
  let i, j, combs, head, tailcombs;

  if (k > set.length || k <= 0) return [];
  if (k === set.length) return [set];
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
  const enchants = [...item_obj.e].sort((a, b) => a - b);
  return `${item_obj.i}:${enchants.join(',')}:${item_obj.w}`;
}

function memoizeHashFromArguments(args) {
  let items = args[0];
  let hashes = new Array(items.length);
  items.forEach((item, index) => {
    hashes[index] = hashFromItem(item);
  });
  return hashes.sort().join('|');
}

const memoizeCheapest = func => {
  const cache = {};
  return (...args) => {
    const args_key = memoizeHashFromArguments(args);
    if (!(args_key in cache)) {
      cache[args_key] = func(...args);
    }
    return cache[args_key];
  };
};

const cheapestItemsFromList = memoizeCheapest(items => {
  let work2item = {};
  const item_count = items.length;

  switch (item_count) {
    case 1: {
      const item = items[0];
      const work = item.w;
      work2item[work] = item;
      return work2item;
    }
    case 2: {
      const left_item = items[0],
        right_item = items[1];
      const cheapest_item = cheapestItemFromItems2(left_item, right_item);
      const cheapest_work = cheapest_item.w;
      work2item[cheapest_work] = cheapest_item;
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
  const prior_work = prior_works[0];
  return cheapest_work2item[prior_work];
}

function cheapestItemsFromListN(items, max_subcount) {
  const cheapest_work2item = {};
  const cheapest_prior_works = [];

  for (let subcount = 1; subcount <= max_subcount; subcount++) {
    combinations(items, subcount).forEach(left_item => {
      const right_item = items.filter(item_obj => !left_item.includes(item_obj));

      const left_work2item = cheapestItemsFromList(left_item);
      const right_work2item = cheapestItemsFromList(right_item);
      const new_work2item = cheapestItemsFromDictionaries([left_work2item, right_work2item]);

      for (let work in new_work2item) {
        const new_item = new_work2item[work];
        const prior_work_exists = cheapest_prior_works.includes(work);

        if (prior_work_exists) {
          const cheapest_item = cheapest_work2item[work];
          const new_cheapest_work2item = compareCheapest(cheapest_item, new_item);
          cheapest_work2item[work] = new_cheapest_work2item[work];
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

function cheapestItemsFromDictionaries(work2items) {
  switch (work2items.length) {
    case 1:
      return work2items[0];
    case 2:
      return cheapestItemsFromDictionaries2(work2items[0], work2items[1]);
    default:
      throw new Error('Unexpected number of dictionaries');
  }
}

function cheapestItemsFromDictionaries2(left_work2item, right_work2item) {
  let cheapest_work2item = {};
  const cheapest_prior_works = [];

  for (let left_work in left_work2item) {
    const left_item = left_work2item[left_work];

    for (let right_work in right_work2item) {
      const right_item = right_work2item[right_work];

      let new_work2item;
      try {
        new_work2item = cheapestItemsFromList([left_item, right_item]);
      } catch (error) {
        if (right_item.i === 'item') {
          new_work2item = { [right_item.w]: right_item };
        } else if (left_item.i === 'item') {
          new_work2item = { [left_item.w]: left_item };
        } else {
          throw error;
        }
      }

      for (let new_work in new_work2item) {
        const new_item = new_work2item[new_work];
        const prior_work_exists = cheapest_prior_works.includes(new_work);

        if (prior_work_exists) {
          const cheapest_item = cheapest_work2item[new_work];
          const new_cheapest_work2item = compareCheapest(cheapest_item, new_item);
          cheapest_work2item[new_work] = new_cheapest_work2item[new_work];
        } else {
          cheapest_work2item[new_work] = new_item;
          cheapest_prior_works.push(new_work);
        }
      }
    }
  }
  return cheapest_work2item;
}

function item_obj(i, l, e = [], w = 0) {
  this.i = i;
  this.l = l;
  this.e = e;
  this.w = w;
}

function MergeEnchants(left, right) {
  this.l = left.l + right.l + 2 ** left.w - 1 + 2 ** right.w - 1;
  this.i = left.i;
  this.e = left.e.concat(right.e);
  this.w = Math.max(left.w, right.w) + 1;
  this.x = this.l + experience(this.w);
  this.c = { L: left.c || left, R: right.c || right };
}
