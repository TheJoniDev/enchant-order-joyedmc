// Enchantment optimizer using lexicographic‑greedy merge

const MAX_MERGE_COST = 39;
let ID_LIST = {};
let ENCHANTMENT_WEIGHTS = [];
let ITEM_NAME;

// Message handler
onmessage = event => {
  const { msg, data } = event.data;
  if (msg === 'set_data') {
    initializeWeights(data.enchants);
  } else if (msg === 'process') {
    const { item, enchants } = data;
    ITEM_NAME = item;
    const result = lexGreedyOptimize(item, enchants);
    postMessage({ msg: 'complete', ...result });
  }
};

// Initialize ID_LIST and ENCHANTMENT_WEIGHTS
function initializeWeights(enchantMap) {
  let id = 0;
  for (const name in enchantMap) {
    ID_LIST[name] = id;
    ENCHANTMENT_WEIGHTS[id] = enchantMap[name].weight;
    id++;
  }
  Object.freeze(ID_LIST);
  Object.freeze(ENCHANTMENT_WEIGHTS);
}

// State object
class State {
  constructor(ids, pwp=0, xp=0) {
    this.ids = new Set(ids);
    this.pwp = pwp;
    this.xp = xp;
  }
}

// Compute XP cost for merging A and B
function mergeCost(A, B) {
  const base = 2; // server‑specific base cost (adjust if needed)
  let totalWeight = 0;
  const all = new Set([...A.ids, ...B.ids]);
  for (const id of all) totalWeight += ENCHANTMENT_WEIGHTS[id];
  return base + totalWeight + Math.max(A.pwp, B.pwp);
}

// Merge two states
function mergeStates(A, B) {
  const cost = mergeCost(A, B);
  if (cost > MAX_MERGE_COST) throw new Error('Too Expensive');
  const newPwp = Math.max(A.pwp, B.pwp) + 1;
  return new State(
    [...A.ids, ...B.ids],
    newPwp,
    A.xp + B.xp + experience(cost)
  );
}

// XP formula
function experience(level) {
  if (level <= 16) return level*level + 6*level;
  if (level <= 31) return 2.5*level*level - 40.5*level + 360;
  return 4.5*level*level - 162.5*level + 2220;
}

// Lexicographic‑greedy merge optimizer
function lexGreedyOptimize(itemName, enchantList) {
  // Initialize pool of States (books)
  let pool = enchantList.map(([name, level]) => {
    const id = ID_LIST[name];
    return new State([id], 0, 0);
  });
  let totalXp = 0;

  // Merge until one super‑book remains
  while (pool.length > 1) {
    let best = null;
    for (let i = 0; i < pool.length; i++) {
      for (let j = i+1; j < pool.length; j++) {
        try {
          const A = pool[i], B = pool[j];
          const pwpNew = Math.max(A.pwp, B.pwp) + 1;
          const cost = mergeCost(A, B);
          const score = [pwpNew, cost];
          if (!best || score[0] < best.score[0] || (score[0]===best.score[0] && score[1]<best.score[1])) {
            best = { i, j, score, cost };
          }
        } catch {}
      }
    }
    const { i, j, cost } = best;
    const A = pool[i], B = pool[j];
    const C = mergeStates(A, B);
    totalXp += experience(cost);
    // Replace two with C
    pool = pool.filter((_, idx) => idx!==i && idx!==j);
    pool.push(C);
  }

  // Final merge with item
  const superBook = pool[0];
  const itemState = new State([], 0, 0);
  const finalCost = mergeCost(superBook, itemState);
  const finalPwp = superBook.pwp + 1;
  totalXp += experience(finalCost);

  return { finalPwp, totalXp };
}
