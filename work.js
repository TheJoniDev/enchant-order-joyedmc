let ID_LIST = {};
let ENCHANTMENT2WEIGHT = [];
const MAXIMUM_MERGE_LEVELS = 39;
let ITEM_NAME;

onmessage = event => {
    if (event.data.msg === 'set_data') {
        const { enchants } = event.data.data;

        let id = 0;
        for (let enchant in enchants) {
            const weight = enchants[enchant].weight;
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

function process(itemName, enchants, mode = 'levels') {
    ITEM_NAME = itemName;
    Object.freeze(ITEM_NAME);

    const enchantObjs = enchants.map(([namespace, level]) => {
        const id = ID_LIST[namespace];
        const value = level * ENCHANTMENT2WEIGHT[id];
        const obj = new item_obj('book', value, [id]);
        obj.c = { I: id, l: obj.l, w: obj.w };
        return obj;
    });

    let baseItem;
    if (ITEM_NAME === 'book') {
        // Use most expensive book as the base
        let mostExpensive = enchantObjs.reduce((max, cur, idx, arr) => cur.l > arr[max].l ? idx : max, 0);
        const baseEnchant = enchantObjs.splice(mostExpensive, 1)[0];
        const id = baseEnchant.e[0];
        baseItem = new item_obj(id, baseEnchant.l);
        baseItem.e.push(id);
    } else {
        baseItem = new item_obj('item');
    }

    // Merge the base item with the most expensive remaining enchant
    let heap = new MinHeap(mode);
    enchantObjs.forEach(obj => heap.push(obj));
    if (heap.size() > 0) {
        let mostExpensive = heap.pop();
        const merged = new MergeEnchants(baseItem, mostExpensive);
        merged.c.L = { I: baseItem.i, l: 0, w: 0 };
        heap.push(merged);
    } else {
        heap.push(baseItem);
    }

    while (heap.size() > 1) {
        const a = heap.pop();
        const b = heap.pop();
        try {
            const merged = new MergeEnchants(a, b);
            heap.push(merged);
        } catch (e) {
            if (!(e instanceof MergeLevelsTooExpensiveError)) throw e;
            // fallback: skip merging
            heap.push(a);
            heap.push(b);
            break;
        }
    }

    const result = heap.pop();
    const instructions = getInstructions(result.c);

    const totalLevels = instructions.reduce((sum, inst) => sum + inst[2], 0);
    const totalXp = experience(totalLevels);

    postMessage({
        msg: 'complete',
        item_obj: result,
        instructions: instructions,
        extra: [totalLevels, totalXp],
        enchants: enchants
    });
}

// Priority queue implementation
class MinHeap {
    constructor(mode = "levels") {
        this.mode = mode;
        this.heap = [];
    }

    _compare(a, b) {
        const key = this.mode === "prior_work" ? "w" : "l";
        return a[key] - b[key];
    }

    push(item) {
        this.heap.push(item);
        this._bubbleUp(this.heap.length - 1);
    }

    pop() {
        const top = this.heap[0];
        const end = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = end;
            this._sinkDown(0);
        }
        return top;
    }

    size() {
        return this.heap.length;
    }

    _bubbleUp(n) {
        const item = this.heap[n];
        while (n > 0) {
            const parentN = Math.floor((n - 1) / 2);
            const parent = this.heap[parentN];
            if (this._compare(item, parent) >= 0) break;
            this.heap[n] = parent;
            n = parentN;
        }
        this.heap[n] = item;
    }

    _sinkDown(n) {
        const length = this.heap.length;
        const item = this.heap[n];
        while (true) {
            let left = 2 * n + 1;
            let right = 2 * n + 2;
            let smallest = n;

            if (left < length && this._compare(this.heap[left], this.heap[smallest]) < 0) {
                smallest = left;
            }
            if (right < length && this._compare(this.heap[right], this.heap[smallest]) < 0) {
                smallest = right;
            }
            if (smallest === n) break;

            this.heap[n] = this.heap[smallest];
            n = smallest;
        }
        this.heap[n] = item;
    }
}

function getInstructions(comb) {
    let instructions = [];

    for (const key in comb) {
        if (key === 'L' || key === 'R') {
            if (typeof comb[key].I === 'undefined') {
                const childInstructions = getInstructions(comb[key]);
                instructions.push(...childInstructions);
            }

            if (Number.isInteger(comb[key].I)) {
                comb[key].I = Object.keys(ID_LIST).find(k => ID_LIST[k] === comb[key].I);
            } else if (!Object.keys(ID_LIST).includes(comb[key].I)) {
                comb[key].I = ITEM_NAME;
            }
        }
    }

    const mergeCost = Number.isInteger(comb.R.v)
        ? comb.R.v + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1
        : comb.R.l + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1;
    const work = Math.max(comb.L.w, comb.R.w) + 1;
    instructions.push([comb.L, comb.R, mergeCost, experience(mergeCost), 2 ** work - 1]);

    return instructions;
}

class item_obj {
    constructor(name, value = 0, ids = []) {
        this.i = name; // item namespace
        this.e = ids;  // enchant IDs
        this.c = {};   // instructions
        this.w = 0;    // prior work
        this.l = value; // merge "cost"
        this.x = 0;    // total XP
    }
}

class MergeEnchants extends item_obj {
    constructor(left, right) {
        const mergeCost = right.l + 2 ** left.w - 1 + 2 ** right.w - 1;
        if (mergeCost > MAXIMUM_MERGE_LEVELS) {
            throw new MergeLevelsTooExpensiveError();
        }

        const newValue = left.l + right.l;
        super(left.i, newValue);

        this.e = left.e.concat(right.e);
        this.w = Math.max(left.w, right.w) + 1;
        this.x = left.x + right.x + experience(mergeCost);
        this.c = { L: left.c, R: right.c, l: mergeCost, w: this.w, v: this.l };
    }
}

class MergeLevelsTooExpensiveError extends Error {
    constructor(message = 'Merge levels exceed the allowed maximum') {
        super(message);
        this.name = 'MergeLevelsTooExpensiveError';
    }
}

function experience(level) {
    if (level === 0) return 0;
    if (level <= 16) return level ** 2 + 6 * level;
    if (level <= 31) return 2.5 * level ** 2 - 40.5 * level + 360;
    return 4.5 * level ** 2 - 162.5 * level + 2220;
}
