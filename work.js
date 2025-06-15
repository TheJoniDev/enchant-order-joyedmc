// Global constants
const MAXIMUM_MERGE_LEVELS = 39;
let ID_LIST = {};
let ENCHANTMENT2WEIGHT = [];
let ITEM_NAME;
let WORK_XP = new Map();
let results = {};

// Pre‑fill experience xp lookup up to MAX_LEVEL
for (let lvl = 0; lvl <= MAXIMUM_MERGE_LEVELS; lvl++) {
  WORK_XP.set(
    lvl,
    lvl === 0
      ? 0
      : lvl <= 16
      ? lvl ** 2 + 6 * lvl
      : lvl <= 31
      ? 2.5 * lvl ** 2 - 40.5 * lvl + 360
      : 4.5 * lvl ** 2 - 162.5 * lvl + 2220
  );
}

// Utility to get xp
function xp(level) {
  return WORK_XP.get(level);
}

// Build stable key for memoization
function hashFromItem(item) {
  const ids = [...item.e].sort((a, b) => a - b).join(',');
  return `${item.i}|${ids}|${item.w}`;
}
function memoKey(args) {
  return args[0].map(hashFromItem).sort().join(';');
}

const memoize = func => {
  const cache = {};
  return items => {
    const key = memoKey(arguments);
    if (!cache[key]) cache[key] = func(...arguments);
    return cache[key];
  };
};

// Merge cache to avoid recomputing
const mergeCache = new Map();
function mergeKey(a, b) {
  return `${hashFromItem(a)}+${hashFromItem(b)}`;
}

// Cached cheapest merge for two items
function cheapestItemFrom2(a, b) {
  const key = mergeKey(a, b);
  if (mergeCache.has(key)) return mergeCache.get(key);

  let best;
  try {
    const m1 = new MergeEnchants(a, b);
    const m2 = new MergeEnchants(b, a);
    const aBetter = compareCheapest(m1, m2);
    best = Object.values(aBetter)[0];
  } catch {
    best = new MergeEnchants(a, b);
  }
  mergeCache.set(key, best);
  return best;
}

// Optimized combinations: cap depth
const MAX_DEPTH = 3;
function limitedCombinations(arr, k) {
  if (k > arr.length || k <= 0) return [];
  if (k === 1) return arr.map(x => [x]);
  if (k === arr.length) return [arr];
  if (k > MAX_DEPTH) return limitedCombinations(arr, MAX_DEPTH);
  const res = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const head = [arr[i]];
    for (const tail of limitedCombinations(arr.slice(i + 1), k - 1)) {
      res.push(head.concat(tail));
    }
  }
  return res;
}

// Core merging logic
class item_obj {
  constructor(name, l = 0, e = []) {
    this.i = name;
    this.l = l;
    this.w = 0;
    this.x = 0;
    this.e = [...e];
    this.c = {};
  }
}
class MergeEnchants extends item_obj {
  constructor(L, R) {
    const cost = R.l + 2 ** L.w - 1 + 2 ** R.w - 1;
    if (cost > MAXIMUM_MERGE_LEVELS) throw new Error('too expensive');
    super(L.i, L.l + R.l, L.e.concat(R.e));
    this.w = Math.max(L.w, R.w) + 1;
    this.x = L.x + R.x + xp(cost);
    this.c = { L: L.c, R: R.c, l: cost, w: this.w, v: this.l };
  }
}
function compareCheapest(a, b) {
  const w = a.w, w2 = b.w;
  if (w !== w2) return w < w2 ? { [w]: a } : { [w2]: b };
  if (a.l !== b.l) return a.l < b.l ? { [w]: a } : { [w2]: b };
  return a.x <= b.x ? { [w]: a } : { [w]: b };
}
function cheapestFromList(items) {
  if (items.length === 1) return { [items[0].w]: items[0] };
  if (items.length === 2) {
    const best = cheapestItemFrom2(items[0], items[1]);
    return { [best.w]: best };
  }
  return cheapestN(items, Math.floor(items.length / 2));
}
function cheapestN(arr, maxsub) {
  const result = {};
  const seenWs = new Set();

  for (let sc = 1; sc <= Math.min(maxsub, MAX_DEPTH); sc++) {
    for (const left of limitedCombinations(arr, sc)) {
      const right = arr.filter(x => !left.includes(x));
      const L = cheapestFromList(left);
      const R = cheapestFromList(right);
      for (const wi of Object.keys(L)) {
        for (const wj of Object.keys(R)) {
          const merged = cheapestFromList([L[wi], R[wj]]);
          for (const wk in merged) {
            const it = merged[wk];
            if (!seenWs.has(wk) || compareCheapest(result[wk], it)[wk] === it) {
              result[wk] = it;
              seenWs.add(wk);
            }
          }
        }
      }
    }
  }
  return result;
}

// Worker message handlers unchanged (set_data, process) – omitted for brevity.
// Memoize cheapest function
const cheapestItemsFromList = memoize(cheapestFromList);
