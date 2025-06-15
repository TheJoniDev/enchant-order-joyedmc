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
    ITEM_NAME = item
    Object.freeze(ITEM_NAME);

    let enchant_objs = []
    enchants.forEach(enchant => {
        let id = ID_LIST[enchant[0]]
        let e_obj = new item_obj('book', enchant[1] * ENCHANTMENT2WEIGHT[id], [id])
        e_obj.c = { I: id, l: e_obj.l, w: e_obj.w }
        enchant_objs.push(e_obj)
    });

    let mostExpensive = enchant_objs.reduce((maxIndex, item, currentIndex, array) => {
        return item.l > array[maxIndex].l ? currentIndex : maxIndex;
    }, 0);

    let id;
    if (ITEM_NAME === 'book') {
        id = enchant_objs[mostExpensive].e[0]
        item = new item_obj(id, enchant_objs[mostExpensive].l)
        item.e.push(id)
        enchant_objs.splice(mostExpensive, 1)
        mostExpensive = enchant_objs.reduce((maxIndex, item, currentIndex, array) => {
            return item.l > array[maxIndex].l ? currentIndex : maxIndex;
        }, 0);
    } else {
        item = new item_obj('item')
    }

    let merged_item = new MergeEnchants(item, enchant_objs[mostExpensive])
    merged_item.c.L = { I: item.i, l: 0, w: 0 }
    enchant_objs.splice(mostExpensive, 1)

    let all_objs = enchant_objs.concat(merged_item)
    let cheapest_items = cheapestItemsFromListHeap(all_objs);

    let cheapest_cost = Infinity;
    let cheapest_key;
    for (const key in cheapest_items) {
        const item = cheapest_items[key];
        let item_cost = (mode === 'levels') ? item.x : item.w;
        if (item_cost < cheapest_cost) {
            cheapest_cost = item_cost;
            cheapest_key = key;
        }
    }
    const cheapest_item = cheapest_items[cheapest_key]

    let instructions = getInstructions(cheapest_item.c);

    let max_levels = instructions.reduce((acc, key) => acc + key[2], 0);
    let max_xp = experience(max_levels)

    postMessage({
        msg: 'complete',
        item_obj: cheapest_item,
        instructions: instructions,
        extra: [max_levels, max_xp],
        enchants: enchants
    });

    results = {}
}

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
    let merge_cost = Number.isInteger(comb.R.v)
        ? comb.R.v + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1
        : comb.R.l + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1;
    let work = Math.max(comb.L.w, comb.R.w) + 1
    instructions.push([comb.L, comb.R, merge_cost, experience(merge_cost), 2 ** work - 1]);
    return instructions;
}

function cheapestItemsFromListHeap(items) {
    const heap = new MinHeap();
    items.forEach(item => heap.insert(item));

    while (heap.size() > 1) {
        const left = heap.extractMin();
        const right = heap.extractMin();

        let merged;
        try {
            const m1 = new MergeEnchants(left, right);
            const m2 = new MergeEnchants(right, left);
            const best = compareCheapest(m1, m2);
            merged = best[Object.keys(best)[0]];
        } catch {
            continue;
        }

        heap.insert(merged);
    }
    const last = heap.peek();
    return { [last.w]: last };
}

class MinHeap {
    constructor() {
        this.heap = [];
    }

    size() {
        return this.heap.length;
    }

    insert(item) {
        this.heap.push(item);
        this.bubbleUp();
    }

    peek() {
        return this.heap[0];
    }

    extractMin() {
        const min = this.heap[0];
        const end = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = end;
            this.bubbleDown();
        }
        return min;
    }

    bubbleUp() {
        let idx = this.heap.length - 1;
        const element = this.heap[idx];

        while (idx > 0) {
            let parentIdx = Math.floor((idx - 1) / 2);
            let parent = this.heap[parentIdx];
            if (compareItemObj(element, parent) >= 0) break;
            this.heap[parentIdx] = element;
            this.heap[idx] = parent;
            idx = parentIdx;
        }
    }

    bubbleDown() {
        let idx = 0;
        const length = this.heap.length;
        const element = this.heap[0];

        while (true) {
            let leftIdx = 2 * idx + 1;
            let rightIdx = 2 * idx + 2;
            let left, right;
            let swap = null;

            if (leftIdx < length) {
                left = this.heap[leftIdx];
                if (compareItemObj(left, element) < 0) swap = leftIdx;
            }

            if (rightIdx < length) {
                right = this.heap[rightIdx];
                if (
                    (swap === null && compareItemObj(right, element) < 0) ||
                    (swap !== null && compareItemObj(right, left) < 0)
                ) {
                    swap = rightIdx;
                }
            }

            if (swap === null) break;
            this.heap[idx] = this.heap[swap];
            this.heap[swap] = element;
            idx = swap;
        }
    }
}

function compareItemObj(a, b) {
    if (a.w !== b.w) return a.w - b.w;
    if (a.l !== b.l) return a.l - b.l;
    return a.x - b.x;
}

class item_obj {
    constructor(name, value = 0, id = []) {
        this.i = name
        this.e = id
        this.c = {}
        this.w = 0
        this.l = value
        this.x = 0
    }
}

class MergeEnchants extends item_obj {
    constructor(left, right) {
        const merge_cost = right.l + 2 ** left.w - 1 + 2 ** right.w - 1
        if (merge_cost > MAXIMUM_MERGE_LEVELS) throw new MergeLevelsTooExpensiveError();
        let new_value = left.l + right.l
        super(left.i, new_value)
        this.e = left.e.concat(right.e)
        this.w = Math.max(left.w, right.w) + 1
        this.x = left.x + right.x + experience(merge_cost)
        this.c = { L: left.c, R: right.c, l: merge_cost, w: this.w, v: this.l }
    }
}

function compareCheapest(item1, item2) {
    let work2item = {};
    if (item1.w === item2.w) {
        if (item1.l === item2.l) {
            work2item[item1.w] = item1.x <= item2.x ? item1 : item2;
        } else {
            work2item[item1.w] = item1.l < item2.l ? item1 : item2;
        }
    } else {
        work2item[item1.w] = item1;
        work2item[item2.w] = item2;
    }
    return work2item;
}

function experience(level) {
    if (level === 0) return 0;
    if (level <= 16) return level ** 2 + 6 * level;
    if (level <= 31) return 2.5 * level ** 2 - 40.5 * level + 360;
    return 4.5 * level ** 2 - 162.5 * level + 2220;
}

class MergeLevelsTooExpensiveError extends Error {
    constructor(message = 'merge levels is above maximum allowed') {
        super(message);
        this.name = 'MergeLevelsTooExpensiveError';
    }
}
