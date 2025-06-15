// Optimized Minecraft Enchanting Order Calculator
let ID_LIST = {};
let ENCHANTMENT2WEIGHT = [];
const MAXIMUM_MERGE_LEVELS = 39;
let ITEM_NAME;

onmessage = event => {
    if (event.data.msg === 'set_data') {
        const { enchants } = event.data.data;
        let id = 0;
        for (let enchant in enchants) {
            const weight = enchants[enchant]['weight'];
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
        let e_obj = new item_obj('book', enchant[1] * ENCHANTMENT2WEIGHT[id], [id]);
        e_obj.c = { I: id, l: e_obj.l, w: e_obj.w };
        return e_obj;
    });

    let mostExpensive = enchant_objs.reduce((maxIndex, item, currentIndex, array) =>
        item.l > array[maxIndex].l ? currentIndex : maxIndex, 0);

    let id;
    if (ITEM_NAME === 'book') {
        id = enchant_objs[mostExpensive].e[0];
        item = new item_obj(id, enchant_objs[mostExpensive].l);
        item.e.push(id);
        enchant_objs.splice(mostExpensive, 1);
    } else {
        item = new item_obj('item');
    }

    let merged_item = new MergeEnchants(item, enchant_objs.splice(mostExpensive, 1)[0]);
    merged_item.c.L = { I: item.i, l: 0, w: 0 };

    let final_item = optimalMergeWithHeap([...enchant_objs, merged_item]);
    let instructions = getInstructions(final_item.c);

    let max_levels = instructions.reduce((sum, step) => sum + step[2], 0);
    let max_xp = experience(max_levels);

    postMessage({
        msg: 'complete',
        item_obj: final_item,
        instructions,
        extra: [max_levels, max_xp],
        enchants
    });
}

function getInstructions(comb) {
    let instructions = [];
    for (const key in comb) {
        if (key === 'L' || key === 'R') {
            if (typeof comb[key].I === 'undefined') {
                instructions.push(...getInstructions(comb[key]));
            }
            if (Number.isInteger(comb[key].I)) {
                comb[key].I = Object.keys(ID_LIST).find(k => ID_LIST[k] === comb[key].I);
            } else if (typeof comb[key].I === 'string' && !Object.keys(ID_LIST).includes(comb[key].I)) {
                comb[key].I = ITEM_NAME;
            }
        }
    }
    let merge_cost = Number.isInteger(comb.R.v) ?
        comb.R.v + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1 :
        comb.R.l + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1;
    let work = Math.max(comb.L.w, comb.R.w) + 1;
    instructions.push([comb.L, comb.R, merge_cost, experience(merge_cost), 2 ** work - 1]);
    return instructions;
}

function experience(level) {
    if (level === 0) return 0;
    if (level <= 16) return level ** 2 + 6 * level;
    if (level <= 31) return 2.5 * level ** 2 - 40.5 * level + 360;
    return 4.5 * level ** 2 - 162.5 * level + 2220;
}

class item_obj {
    constructor(name, value = 0, id = []) {
        this.i = name;
        this.e = id;
        this.c = {};
        this.w = 0;
        this.l = value;
        this.x = 0;
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

class MergeLevelsTooExpensiveError extends Error {
    constructor(message = 'merge levels is above maximum allowed') {
        super(message);
        this.name = 'MergeLevelsTooExpensiveError';
    }
}

class MinHeap {
    constructor(compareFn) {
        this.heap = [];
        this.compare = compareFn;
    }

    size() {
        return this.heap.length;
    }

    push(item) {
        this.heap.push(item);
        this._heapifyUp(this.heap.length - 1);
    }

    pop() {
        if (this.size() === 0) return null;
        const top = this.heap[0];
        const bottom = this.heap.pop();
        if (this.size() > 0) {
            this.heap[0] = bottom;
            this._heapifyDown(0);
        }
        return top;
    }

    _heapifyUp(index) {
        let parent = Math.floor((index - 1) / 2);
        while (index > 0 && this.compare(this.heap[index], this.heap[parent]) < 0) {
            [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
            index = parent;
            parent = Math.floor((index - 1) / 2);
        }
    }

    _heapifyDown(index) {
        const length = this.heap.length;
        while (true) {
            let left = 2 * index + 1;
            let right = 2 * index + 2;
            let smallest = index;

            if (left < length && this.compare(this.heap[left], this.heap[smallest]) < 0) {
                smallest = left;
            }
            if (right < length && this.compare(this.heap[right], this.heap[smallest]) < 0) {
                smallest = right;
            }
            if (smallest === index) break;
            [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
            index = smallest;
        }
    }
}

function optimalMergeWithHeap(items) {
    const heap = new MinHeap((a, b) => {
        if (a.w !== b.w) return a.w - b.w;
        if (a.l !== b.l) return a.l - b.l;
        return a.x - b.x;
    });

    items.forEach(item => heap.push(item));

    while (heap.size() > 1) {
        const left = heap.pop();
        const right = heap.pop();

        let merged;
        try {
            merged = new MergeEnchants(left, right);
        } catch (e1) {
            try {
                merged = new MergeEnchants(right, left);
            } catch (e2) {
                return left.w <= right.w ? left : right;
            }
        }

        heap.push(merged);
    }

    return heap.pop();
}
