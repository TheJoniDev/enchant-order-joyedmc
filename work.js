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


// --- MinHeap for merging ---
class MinHeap {
    constructor() {
        this.heap = [];
    }
    push(item) {
        this.heap.push(item);
        this.bubbleUp(this.heap.length - 1);
    }
    pop() {
        if (this.heap.length === 0) return null;
        const top = this.heap[0];
        const end = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = end;
            this.bubbleDown(0);
        }
        return top;
    }
    size() {
        return this.heap.length;
    }
    bubbleUp(index) {
        const element = this.heap[index];
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            const parent = this.heap[parentIndex];
            if (element.w >= parent.w) break;
            this.heap[parentIndex] = element;
            this.heap[index] = parent;
            index = parentIndex;
        }
    }
    bubbleDown(index) {
        const length = this.heap.length;
        const element = this.heap[index];
        while (true) {
            let leftIdx = 2 * index + 1;
            let rightIdx = 2 * index + 2;
            let swap = null;

            if (leftIdx < length && this.heap[leftIdx].w < element.w) {
                swap = leftIdx;
            }
            if (rightIdx < length) {
                if ((swap === null && this.heap[rightIdx].w < element.w) ||
                    (swap !== null && this.heap[rightIdx].w < this.heap[leftIdx].w)) {
                    swap = rightIdx;
                }
            }
            if (swap === null) break;
            this.heap[index] = this.heap[swap];
            this.heap[swap] = element;
            index = swap;
        }
    }
}
// --- end MinHeap ---


function process(item, enchants, mode = 'levels') {
    ITEM_NAME = item;
    Object.freeze(ITEM_NAME);

    // Create item objects for each enchantment
    let enchant_objs = enchants.map(enchant => {
        let id = ID_LIST[enchant[0]];
        let value = enchant[1] * ENCHANTMENT2WEIGHT[id];
        let obj = new item_obj('book', value, [id]);
        obj.c = { I: id, l: obj.l, w: obj.w };
        return obj;
    });

    // Determine base item if book
    let baseItem;
    if (ITEM_NAME === 'book') {
        enchant_objs.sort((a, b) => b.l - a.l);
        let base = enchant_objs.shift();
        baseItem = new item_obj(base.e[0], base.l, [...base.e]);
        baseItem.e.push(base.e[0]);
    } else {
        baseItem = new item_obj('item');
    }

    // Use MinHeap to merge all enchantments greedily
    let heap = new MinHeap();
    heap.push(baseItem);
    enchant_objs.forEach(obj => heap.push(obj));

    while (heap.size() > 1) {
        let left = heap.pop();
        let right = heap.pop();

        try {
            let merged = new MergeEnchants(left, right);
            heap.push(merged);
        } catch (e) {
            if (e instanceof MergeLevelsTooExpensiveError) {
                // Optional: handle expensive merges differently here
                throw e;
            } else {
                throw e;
            }
        }
    }

    let cheapest_item = heap.pop();

    let instructions = getInstructions(cheapest_item.c);

    let max_levels = instructions.reduce((sum, inst) => sum + inst[2], 0);
    let max_xp = experience(max_levels);

    postMessage({
        msg: 'complete',
        item_obj: cheapest_item,
        instructions,
        extra: [max_levels, max_xp],
        enchants,
    });

    results = {};
}


// --- Your original getInstructions function ---
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


// --- Classes and supporting functions, unchanged ---

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
    // In MergeEnchants c.v: value and c.l: merge_cost (both for instructions), (this.l: value)
    constructor(left, right) {
        const merge_cost = right.l + 2 ** left.w - 1 + 2 ** right.w - 1
        if (merge_cost > MAXIMUM_MERGE_LEVELS) {
            throw new MergeLevelsTooExpensiveError();
        }
        let new_value = left.l + right.l
        super(left.i, new_value)
        this.e = left.e.concat(right.e) // list of enchants
        this.w = Math.max(left.w, right.w) + 1 // new work
        this.x = left.x + right.x + experience(merge_cost) // total xp
        this.c = {L: left.c, R: right.c, l: merge_cost, w: this.w, v: this.l} // instructions
    }
}

const experience = level => {
    if (level === 0) {
        return 0;
    } else if (level <= 16) {
        return level ** 2 + 6 * level
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
