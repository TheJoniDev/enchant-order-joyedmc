// Constants (fill in based on your actual definitions)
const ID_LIST = {/* e.g., 'Sharpness': 0 */};
const ENCHANTMENT2WEIGHT = {/* e.g., 0: 2 */};
const MergeLevelsTooExpensiveError = class extends Error {};

// Classes (fill in based on your actual implementation)
class item_obj {
    constructor(type, w, e) {
        this.i = [type];
        this.w = w;
        this.e = e;
        this.l = 0;
        this.x = 0;
    }
}

class MergeEnchants {
    constructor(itemA, itemB) {
        // Implement your real merging logic here
        // Throw MergeLevelsTooExpensiveError if invalid
        this.i = ['merge'];
        this.e = [...new Set([...itemA.e, ...itemB.e])];
        this.w = itemA.w + itemB.w + 1; // Simplified work
        this.l = itemA.l + itemB.l + 1;
        this.x = itemA.x + itemB.x + 1;
        this.c = { L: [itemA.c, itemB.c], l: this.l, w: this.w };
    }
}

function experience(levels) {
    // Dummy XP function; replace with actual XP calculation logic
    return levels * 10;
}

function getInstructions(merge_tree) {
    // Replace with logic to generate instructions from merge tree
    return [];
}

function selectBetter(a, b) {
    if (!a) return b;
    if (b.w < a.w) return b;
    if (b.w === a.w && b.l < a.l) return b;
    if (b.w === a.w && b.l === a.l && b.x < a.x) return b;
    return a;
}

function hashFromItem(item_obj) {
    const sorted_ids = [...item_obj.e].sort();
    return [item_obj.i[0], sorted_ids, item_obj.w];
}

function process(itemName, enchants, mode = 'levels') {
    ITEM_NAME = itemName;
    Object.freeze(ITEM_NAME);

    let enchantObjs = enchants.map(([name, level], idx) => {
        const id = ID_LIST[name];
        const weight = ENCHANTMENT2WEIGHT[id];
        const obj = new item_obj('book', level * weight, [id]);
        obj.index = idx;
        obj.mask = 1 << idx;
        obj.c = { I: id, l: obj.l, w: obj.w };
        return obj;
    });

    const n = enchantObjs.length;
    const dp = new Array(1 << n);
    for (let i = 0; i < (1 << n); i++) dp[i] = null;

    for (let i = 0; i < n; i++) {
        const obj = enchantObjs[i];
        dp[1 << i] = obj;
    }

    for (let mask = 1; mask < (1 << n); mask++) {
        for (let sub = mask; sub; sub = (sub - 1) & mask) {
            if (sub === mask) continue;
            const rest = mask ^ sub;
            if (!dp[sub] || !dp[rest]) continue;

            try {
                const merged1 = new MergeEnchants(dp[sub], dp[rest]);
                dp[mask] = selectBetter(dp[mask], merged1);
            } catch (e) {
                if (!(e instanceof MergeLevelsTooExpensiveError)) throw e;
            }

            try {
                const merged2 = new MergeEnchants(dp[rest], dp[sub]);
                dp[mask] = selectBetter(dp[mask], merged2);
            } catch (e) {
                if (!(e instanceof MergeLevelsTooExpensiveError)) throw e;
            }
        }
    }

    const final_mask = (1 << n) - 1;
    const best_result = dp[final_mask];

    let instructions = getInstructions(best_result.c);
    let max_levels = instructions.reduce((sum, instr) => sum + instr[2], 0);
    let max_xp = experience(max_levels);

    postMessage({
        msg: 'complete',
        item_obj: best_result,
        instructions: instructions,
        extra: [max_levels, max_xp],
        enchants: enchants
    });
}
