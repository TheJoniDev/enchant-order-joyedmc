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

    let enchant_objs = [];
    enchants.forEach(enchant => {
        let id = ID_LIST[enchant[0]];
        let e_obj = new item_obj('book', enchant[1] * ENCHANTMENT2WEIGHT[id], [id]);
        e_obj.c = {I: id, l: e_obj.l, w: e_obj.w};
        enchant_objs.push(e_obj);
    });

    // Find most expensive enchant
    let mostExpensive = enchant_objs.reduce((maxIndex, item, currentIndex, array) => {
        return item.l > array[maxIndex].l ? currentIndex : maxIndex;
    }, 0);

    let id;
    if (ITEM_NAME === 'book') {
        id = enchant_objs[mostExpensive].e[0];
        item = new item_obj(id, enchant_objs[mostExpensive].l);
        item.e.push(id);
        enchant_objs.splice(mostExpensive, 1);

        // Find new most expensive enchant
        mostExpensive = enchant_objs.reduce((maxIndex, item, currentIndex, array) => {
            return item.l > array[maxIndex].l ? currentIndex : maxIndex;
        }, 0);
    } else {
        item = new item_obj('item');
    }

    let merged_item = new MergeEnchants(item, enchant_objs[mostExpensive]);
    merged_item.c.L = {I: item.i, l: 0, w: 0};
    enchant_objs.splice(mostExpensive, 1);

    let all_objs = enchant_objs.concat(merged_item);

    // === REPLACE slow brute force with fast greedy Huffman merge ===
    let cheapest_item;
    try {
        cheapest_item = greedyHuffmanMerge(all_objs);
    } catch (e) {
        // Fallback to original if something unexpected happens
        cheapest_item = all_objs[0];
    }

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

// --- GREEDY HUFFMAN MERGE IMPLEMENTATION ---

class MinHeap {
  constructor() {
    this.heap = [];
  }

  _parent(i) { return Math.floor((i - 1) / 2); }
  _left(i) { return 2 * i + 1; }
  _right(i) { return 2 * i + 2; }

  insert(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  _bubbleUp(index) {
    while (index > 0) {
      let parent = this._parent(index);
      if (this.heap[parent].l <= this.heap[index].l) break;
      [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
      index = parent;
    }
  }

  extractMin() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this._bubbleDown(0);
    return min;
  }

  _bubbleDown(index) {
    let left = this._left(index);
    let right = this._right(index);
    let smallest = index;

    if (left < this.heap.length && this.heap[left].l < this.heap[smallest].l) {
      smallest = left;
    }
    if (right < this.heap.length && this.heap[right].l < this.heap[smallest].l) {
      smallest = right;
    }
    if (smallest !== index) {
      [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
      this._bubbleDown(smallest);
    }
  }

  size() {
    return this.heap.length;
  }
}

function greedyHuffmanMerge(items) {
  const heap = new MinHeap();

  // Insert all items into the heap
  for (const item of items) {
    heap.insert(item);
  }

  while (heap.size() > 1) {
    const left = heap.extractMin();
    const right = heap.extractMin();

    let merged;
    try {
      merged = new MergeEnchants(left, right);
    } catch (e) {
      if (e.name === 'MergeLevelsTooExpensiveError') {
        // Put both back and stop to avoid infinite loop if too expensive
        heap.insert(left);
        heap.insert(right);
        break;
      } else {
        throw e;
      }
    }

    heap.insert(merged);
  }

  return heap.extractMin();
}

// --- REST OF YOUR ORIGINAL FUNCTIONS AND CLASSES ---

function getInstructions(comb) {
    let instructions = [];
    let child_instructions;
    for (const key in comb) {
        if (key === 'L' || key === 'R') {
            if (typeof (comb[key].I) === 'undefined') {
                child_instructions = getInstructions(comb[key])
                child_instructions.forEach(single_instruction => {
                    instructions.push(single_instruction);
                })
            }
            let id;
            if (Number.isInteger(comb[key].I)) {
                id = comb[key].I
                comb[key].I = Object.keys(ID_LIST).find(key => ID_LIST[key] === id);
            } else if (typeof (comb[key].I) === 'string' && !Object.keys(ID_LIST).includes(comb[key].I)) {
                comb[key].I = ITEM_NAME
            }
        }
    }
    let merge_cost;
    if (Number.isInteger(comb.R.v)) {
        merge_cost = comb.R.v + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1
    } else {
        merge_cost = comb.R.l + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1
    }
    let work = Math.max(comb.L.w, comb.R.w) + 1
    const single_instruction = [comb.L, comb.R, merge_cost, experience(merge_cost), 2 ** work - 1];
    instructions.push(single_instruction);
    return instructions;
}

class item_obj {
    constructor(name, value = 0, id = []) {
        this.i = name // item namespace: 'book' or 'item'
        this.e = id // enchant id
        this.c = {} // stores instructions
        this.w = 0 // work
        this.l = value // value, in MergeEnchants merge_cost
        this.x = 0 // total xp
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
        this.c = {L: left.c, R: right.c, l: merge_cost, w: this.w, v: this.l};
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
}

class MergeLevelsTooExpensiveError extends Error {
    constructor(message = 'merge levels is above maximum allowed') {
        super(message);
        this.name = 'MergeLevelsTooExpensiveError';
    }
}
