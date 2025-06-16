// Greedy/Huffman Merge-Algorithmus für enchant-order

let ID_LIST = {};
let ENCHANTMENT2WEIGHT = [];
const MAXIMUM_MERGE_LEVELS = 39;
let ITEM_NAME;

// Priority Queue (Min-Heap) für Merge-Pattern
class MinHeap {
    constructor() {
        this.heap = [];
    }
    push(obj) {
        this.heap.push(obj);
        this.bubbleUp(this.heap.length - 1);
    }
    pop() {
        if (this.heap.length === 1) return this.heap.pop();
        const top = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.bubbleDown(0);
        return top;
    }
    size() {
        return this.heap.length;
    }
    bubbleUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.heap[i].l < this.heap[parent].l) {
                [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
                i = parent;
            } else break;
        }
    }
    bubbleDown(i) {
        const n = this.heap.length;
        while (true) {
            let left = 2 * i + 1, right = 2 * i + 2, smallest = i;
            if (left < n && this.heap[left].l < this.heap[smallest].l) smallest = left;
            if (right < n && this.heap[right].l < this.heap[smallest].l) smallest = right;
            if (smallest === i) break;
            [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
            i = smallest;
        }
    }
}

// Item-Objekt wie im Original
class item_obj {
    constructor(name, value = 0, id = []) {
        this.i = name;
        this.e = id;
        this.c = {}; // Kombinationsbaum für Anweisungen
        this.w = 0; // work penalty
        this.l = value; // "value", für Heap-Sortierung das Level-Äquivalent
        this.x = 0; // total xp
    }
}

class MergeEnchants extends item_obj {
    constructor(left, right) {
        // Minecraft-Merge-Formel
        const merge_cost = right.l + 2 ** left.w - 1 + 2 ** right.w - 1;
        if (merge_cost > MAXIMUM_MERGE_LEVELS) {
            throw new Error('Merge levels too high');
        }
        let new_value = left.l + right.l;
        super(left.i, new_value);
        this.e = left.e.concat(right.e);
        this.w = Math.max(left.w, right.w) + 1;
        this.x = left.x + right.x + experience(merge_cost);
        this.c = {
            L: left.c,
            R: right.c,
            l: merge_cost,
            w: this.w,
            v: this.l
        };
    }
}

// XP-Berechnung wie im Original
const experience = level => {
    if (level === 0) return 0;
    if (level <= 16) return level ** 2 + 6 * level;
    if (level <= 31) return 2.5 * level ** 2 - 40.5 * level + 360;
    return 4.5 * level ** 2 - 162.5 * level + 2220;
};

// "Instructions"-Erzeugung bleibt wie gehabt
function getInstructions(comb) {
    let instructions = [];
    let child_instructions;
    for (const key in comb) {
        if (key === 'L' || key === 'R') {
            if (typeof (comb[key].I) === 'undefined') {
                child_instructions = getInstructions(comb[key]);
                child_instructions.forEach(single_instruction => instructions.push(single_instruction));
            }
        }
    }
    let merge_cost = comb.R.l + 2 ** comb.L.w - 1 + 2 ** comb.R.w - 1;
    let work = Math.max(comb.L.w, comb.R.w) + 1;
    const single_instruction = [comb.L, comb.R, merge_cost, experience(merge_cost), 2 ** work - 1];
    instructions.push(single_instruction);
    return instructions;
}

// --- Hauptverarbeitung ---

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

    // Alle Enchant-Objekte erstellen
    let enchant_objs = [];
    enchants.forEach(enchant => {
        let id = ID_LIST[enchant[0]];
        let e_obj = new item_obj('book', enchant[1] * ENCHANTMENT2WEIGHT[id], [id]);
        e_obj.c = { I: id, l: e_obj.l, w: e_obj.w };
        enchant_objs.push(e_obj);
    });

    // Greedy Huffman-Merge
    let heap = new MinHeap();
    enchant_objs.forEach(obj => heap.push(obj));
    let merge_steps = [];

    // Merge-Tree-Bau
    while (heap.size() > 1) {
        let left = heap.pop();
        let right = heap.pop();
        let merged = new MergeEnchants(left, right);
        heap.push(merged);
        merge_steps.push(merged);
    }

    let final_item = heap.pop();

    // Anweisungen extrahieren wie im Original
    let instructions = getInstructions(final_item.c);
    let max_levels = 0;
    instructions.forEach(key => { max_levels += key[2]; });
    let max_xp = experience(max_levels);

    postMessage({
        msg: 'complete',
        item_obj: final_item,
        instructions: instructions,
        extra: [max_levels, max_xp],
        enchants: enchants
    });
}