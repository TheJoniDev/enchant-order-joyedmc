var data = {
    enchants: {
        protection: {
            levelMax: "4",
            weight: "1",
            incompatible: ["blast_protection", "fire_protection", "projectile_protection"],
            items: ["helmet", "chestplate", "leggings", "boots", "turtle_shell"]
        },
        aqua_affinity: {
            levelMax: "1",
            weight: "2",
            incompatible: [],
            items: ["helmet", "turtle_shell"]
        },
        bane_of_arthropods: {
            levelMax: "5",
            weight: "1",
            incompatible: ["smite", "sharpness", "density", "breach"],
            items: ["sword", "axe", "mace"]
        },
        blast_protection: {
            levelMax: "4",
            weight: "2",
            incompatible: ["fire_protection", "protection", "projectile_protection"],
            items: ["helmet", "chestplate", "leggings", "boots", "turtle_shell"]
        },
        channeling: {
            levelMax: "1",
            weight: "4",
            incompatible: ["riptide"],
            items: ["trident"]
        },
        depth_strider: {
            levelMax: "3",
            weight: "2",
            incompatible: ["frost_walker"],
            items: ["boots"]
        },
        efficiency: {
            levelMax: "5",
            weight: "1",
            incompatible: [],
            items: ["pickaxe", "shovel", "axe", "hoe", "shears"]
        },
        feather_falling: {
            levelMax: "4",
            weight: "1",
            incompatible: ["rebound"],
            items: ["boots"]
        },
        fire_aspect: {
            levelMax: "2",
            weight: "2",
            incompatible: [],
            items: ["sword", "mace"]
        },
        fire_protection: {
            levelMax: "4",
            weight: "1",
            incompatible: ["blast_protection", "protection", "projectile_protection"],
            items: ["helmet", "chestplate", "leggings", "boots", "turtle_shell"]
        },
        flame: {
            levelMax: "1",
            weight: "2",
            incompatible: ["bomber", "ender_bow", "ghast"],
            items: ["bow"]
        },
        fortune: {
            levelMax: "3",
            weight: "2",
            incompatible: ["silk_touch"],
            items: ["pickaxe", "shovel", "axe", "hoe"]
        },
        frost_walker: {
            levelMax: "2",
            weight: "2",
            incompatible: ["depth_strider", "flame_walker"],
            items: ["boots"]
        },
        impaling: {
            levelMax: "5",
            weight: "2",
            incompatible: [],
            items: ["trident"]
        },
        infinity: {
            levelMax: "1",
            weight: "4",
            incompatible: ["mending"],
            items: ["bow"]
        },
        knockback: {
            levelMax: "2",
            weight: "1",
            incompatible: [],
            items: ["sword"]
        },
        looting: {
            levelMax: "3",
            weight: "2",
            incompatible: [],
            items: ["sword"]
        },
        loyalty: {
            levelMax: "3",
            weight: "1",
            incompatible: ["riptide"],
            items: ["trident"]
        },
        luck_of_the_sea: {
            levelMax: "3",
            weight: "2",
            incompatible: [],
            items: ["fishing_rod"]
        },
        lure: {
            levelMax: "3",
            weight: "2",
            incompatible: [],
            items: ["fishing_rod"]
        },
        mending: {
            levelMax: "1",
            weight: "2",
            incompatible: ["infinity"],
            items: ["helmet", "chestplate", "leggings", "boots", "pickaxe", "shovel", "axe", "sword", "hoe", "brush", "fishing_rod",
                "bow", "shears", "flint_and_steel", "carrot_on_a_stick", "warped_fungus_on_a_stick", "shield", "elytra", "trident",
                "turtle_shell", "crossbow", "mace"
            ]
        },
        multishot: {
            levelMax: "1",
            weight: "2",
            incompatible: ["piercing"],
            items: ["crossbow"]
        },
        piercing: {
            levelMax: "4",
            weight: "1",
            incompatible: ["multishot"],
            items: ["crossbow"]
        },
        power: {
            levelMax: "5",
            weight: "1",
            incompatible: ["bomber", "ender_bow", "ghast"],
            items: ["bow"]
        },
        projectile_protection: {
            levelMax: "4",
            weight: "1",
            incompatible: ["protection", "blast_protection", "fire_protection"],
            items: ["helmet", "chestplate", "leggings", "boots", "turtle_shell"]
        },
        punch: {
            levelMax: "2",
            weight: "2",
            incompatible: ["bomber", "ender_bow", "ghast"],
            items: ["bow"]
        },
        quick_charge: {
            levelMax: "3",
            weight: "1",
            incompatible: [],
            items: ["crossbow"]
        },
        respiration: {
            levelMax: "3",
            weight: "2",
            incompatible: [],
            items: ["helmet", "turtle_shell"]
        },
        riptide: {
            levelMax: "3",
            weight: "2",
            incompatible: ["channeling", "loyalty"],
            items: ["trident"]
        },
        sharpness: {
            levelMax: "5",
            weight: "1",
            incompatible: ["bane_of_arthropods", "smite"],
            items: ["sword", "axe"]
        },
        silk_touch: {
            levelMax: "1",
            weight: "4",
            incompatible: ["fortune", "smelter"],
            items: ["pickaxe", "shovel", "axe", "hoe"]
        },
        smite: {
            levelMax: "5",
            weight: "1",
            incompatible: ["bane_of_arthropods", "sharpness", "density", "breach"],
            items: ["sword", "axe", "mace"]
        },
        soul_speed: {
            levelMax: "3",
            weight: "4",
            incompatible: [],
            items: ["boots"]
        },
        sweeping: {
            levelMax: "3",
            weight: "2",
            incompatible: [],
            items: ["sword"]
        },
        swift_sneak: {
            levelMax: "3",
            weight: "4",
            incompatible: [],
            items: ["leggings"]
        },
        thorns: {
            levelMax: "3",
            weight: "4",
            incompatible: [],
            items: ["helmet", "chestplate", "leggings", "boots", "turtle_shell"]
        },
        unbreaking: {
            levelMax: "3",
            weight: "1",
            incompatible: [],
            items: ["helmet", "chestplate", "leggings", "boots", "pickaxe", "shovel", "axe", "sword", "hoe", "brush", "fishing_rod",
                "bow", "shears", "flint_and_steel", "carrot_on_a_stick", "warped_fungus_on_a_stick", "shield", "elytra", "trident",
                "turtle_shell", "crossbow", "mace"
            ]
        },
        binding_curse: {
            levelMax: "1",
            weight: "4",
            incompatible: [],
            items: ["helmet", "chestplate", "leggings", "boots", "elytra", "pumpkin", "helmet", "turtle_shell"]
        },
        vanishing_curse: {
            levelMax: "1",
            weight: "4",
            incompatible: ["soulbound"],
            items: ["helmet", "chestplate", "leggings", "boots", "pickaxe", "shovel", "axe", "sword", "hoe", "brush", "fishing_rod",
                "bow", "shears", "flint_and_steel", "carrot_on_a_stick", "warped_fungus_on_a_stick", "shield", "elytra", "pumpkin",
                "helmet", "trident", "turtle_shell", "crossbow", "mace"
            ]
        },
        density: {
            levelMax: "5",
            weight: "1",
            incompatible: ["breach", "smite", "bane_of_arthropods"],
            items: ["mace"]
        },
        breach: {
            levelMax: "4",
            weight: "2",
            incompatible: ["density", "smite", "bane_of_arthropods"],
            items: ["mace"]
        },
        wind_burst: {
            levelMax: "3",
            weight: "2",
            incompatible: [],
            items: ["mace"]
        },
        aquaman: {
            levelMax: "1",
            weight: "1",
            incompatible: [],
            items: ["helmet"]
        },
        auto_reel: {
            levelMax: "1",
            weight: "1",
            incompatible: [],
            items: ["fishing_rod"]
        },
        bane_of_netherspawn: {
            levelMax: "5",
            weight: "10",
            incompatible: [],
            items: ["sword", "axe"]
        },
        blast_mining: {
            levelMax: "5",
            weight: "2",
            incompatible: ["veinminer", "tunnel"],
            items: ["pickaxe", "shovel", "axe", "hoe", "shears"]
        },
        blindness: {
            levelMax: "3",
            weight: "10",
            incompatible: [],
            items: ["sword", "axe"]
        },
        bomber: {
            levelMax: "3",
            weight: "2",
            incompatible: ["withered_arrows", "flare", "confusing_arrows", "explosive_arrows", "punch", "vampiric_arrows", "poisoned_arrows", "darkness_arrows", "hover", "dragonfire_arrows", "electrified_arrows", "power", "flame", "lingering"],
            items: ["bow", "crossbow"]
        },
        bunny_hop: {
            levelMax: "3",
            weight: "2",
            incompatible: [],
            items: ["boots"]
        },
        cold_steel: {
            levelMax: "3",
            weight: "5",
            incompatible: [],
            items: ["chestplate", "elytra"]
        },
        confusing_arrows: {
            levelMax: "3",
            weight: "10",
            incompatible: ["bomber", "ghast", "ender_bow"],
            items: ["bow", "crossbow"]
        },
        confusion: {
            levelMax: "3",
            weight: "10",
            incompatible: [],
            items: ["sword", "axe"]
        },
        cure: {
            levelMax: "5",
            weight: "2",
            incompatible: [],
            items: ["sword", "axe"]
        },
        cutter: {
            levelMax: "5",
            weight: "2",
            incompatible: [],
            items: ["sword", "axe"]
        },
        darkness_arrows: {
            levelMax: "3",
            weight: "10",
            incompatible: ["bomber", "ghast", "ender_bow"],
            items: ["bow", "crossbow"]
        },
        darkness_cloak: {
            levelMax: "3",
            weight: "10",
            incompatible: [],
            items: ["chestplate", "elytra"]
        },
        decapitator: {
            levelMax: "4",
            weight: "2",
            incompatible: [],
            items: ["sword", "axe"]
        },
        double_catch: {
            levelMax: "3",
            weight: "2",
            incompatible: [],
            items: ["fishing_rod"]
        },
        double_strike: {
            levelMax: "4",
            weight: "1",
            incompatible: [],
            items: ["sword", "axe"]
        },
        dragonfire_arrows: {
            levelMax: "3",
            weight: "2",
            incompatible: ["bomber", "ghast", "ender_bow"],
            items: ["bow", "crossbow"]
        },
        electrified_arrows: {
            levelMax: "3",
            weight: "5",
            incompatible: ["bomber", "ghast", "ender_bow"],
            items: ["bow", "crossbow"]
        },
        elemental_protection: {
            levelMax: "5",
            weight: "10",
            incompatible: [],
            items: ["helmet", "chestplate", "leggings", "boots"]
        },
        ender_bow: {
            levelMax: "1",
            weight: "1",
            incompatible: ["withered_arrows", "flare", "confusing_arrows", "explosive_arrows", "punch", "vampiric_arrows", "poisoned_arrows", "darkness_arrows", "hover", "dragonfire_arrows", "electrified_arrows", "power", "flame", "lingering"],
            items: ["bow", "crossbow"]
        },
        exhaust: {
            levelMax: "3",
            weight: "10",
            incompatible: [],
            items: ["sword", "axe"]
        },
        exp_hunter: {
            levelMax: "5",
            weight: "5",
            incompatible: [],
            items: ["sword", "axe"]
        },
        explosive_arrows: {
            levelMax: "3",
            weight: "2",
            incompatible: ["bomber", "ghast", "ender_bow"],
            items: ["bow", "crossbow"]
        },
        fire_shield: {
            levelMax: "3",
            weight: "5",
            incompatible: [],
            items: ["helmet", "chestplate", "leggings", "boots"]
        },
        flame_walker: {
            levelMax: "3",
            weight: "2",
            incompatible: ["frost_walker"],
            items: ["boots"]
        },
        flare: {
            levelMax: "1",
            weight: "2",
            incompatible: ["bomber", "ender_bow", "ghast"],
            items: ["bow", "crossbow"]
        },
        ghast: {
            levelMax: "1",
            weight: "5",
            incompatible: ["withered_arrows", "flare", "confusing_arrows", "explosive_arrows", "punch", "vampiric_arrows", "poisoned_arrows", "darkness_arrows", "hover", "dragonfire_arrows", "electrified_arrows", "power", "flame", "lingering"],
            items: ["bow", "crossbow"]
        },
        hardened: {
            levelMax: "3",
            weight: "5",
            incompatible: [],
            items: ["chestplate", "elytra"]
        },
        haste: {
            levelMax: "3",
            weight: "2",
            incompatible: [],
            items: ["pickaxe", "shovel", "axe", "hoe", "shears"]
        },
        hover: {
            levelMax: "3",
            weight: "10",
            incompatible: ["bomber", "ghast", "ender_bow"],
            items: ["bow", "crossbow"]
        },
        ice_aspect: {
            levelMax: "3",
            weight: "10",
            incompatible: [],
            items: ["sword", "axe"]
        },
        ice_shield: {
            levelMax: "3",
            weight: "10",
            incompatible: [],
            items: ["chestplate", "elytra"]
        },
        infernus: {
            levelMax: "3",
            weight: "10",
            incompatible: [],
            items: ["trident"]
        },
        lingering: {
            levelMax: "3",
            weight: "2",
            incompatible: ["bomber", "ghast", "ender_bow"],
            items: ["bow", "crossbow"]
        },
        lucky_miner: {
            levelMax: "5",
            weight: "10",
            incompatible: [],
            items: ["pickaxe", "shovel", "axe", "hoe", "shears"]
        },
        night_vision: {
            levelMax: "1",
            weight: "1",
            incompatible: [],
            items: ["helmet"]
        },
        nimble: {
            levelMax: "1",
            weight: "5",
            incompatible: [],
            items: ["sword", "axe"]
        },
        paralyze: {
            levelMax: "3",
            weight: "5",
            incompatible: [],
            items: ["sword", "axe"]
        },
        poisoned_arrows: {
            levelMax: "3",
            weight: "10",
            incompatible: ["bomber", "ghast", "ender_bow"],
            items: ["bow", "crossbow"]
        },
        rage: {
            levelMax: "3",
            weight: "2",
            incompatible: [],
            items: ["sword", "axe"]
        },
        rebound: {
            levelMax: "3",
            weight: "2",
            incompatible: ["feather_falling"],
            items: ["boots"]
        },
        regrowth: {
            levelMax: "5",
            weight: "1",
            incompatible: [],
            items: ["chestplate", "elytra"]
        },
        replanter: {
            levelMax: "1",
            weight: "2",
            incompatible: [],
            items: ["pickaxe", "shovel", "axe", "hoe", "shears"]
        },
        restore: {
            levelMax: "5",
            weight: "2",
            incompatible: [],
            items: ["helmet", "chestplate", "leggings", "boots", "pickaxe", "shovel", "axe", "sword", "hoe", "brush", "fishing_rod",
                "bow", "shears", "flint_and_steel", "carrot_on_a_stick", "warped_fungus_on_a_stick", "shield", "elytra", "trident",
                "turtle_shell", "crossbow", "mace"
            ]
        },
        river_master: {
            levelMax: "5",
            weight: "10",
            incompatible: [],
            items: ["fishing_rod"]
        },
        rocket: {
            levelMax: "3",
            weight: "2",
            incompatible: [],
            items: ["sword", "axe"]
        },
        saturation: {
            levelMax: "3",
            weight: "2",
            incompatible: [],
            items: ["helmet"]
        },
        scavenger: {
            levelMax: "4",
            weight: "2",
            incompatible: [],
            items: ["sword", "axe"]
        },
        seasoned_angler: {
            levelMax: "4",
            weight: "5",
            incompatible: [],
            items: ["fishing_rod"]
        },
        self_destruction: {
            levelMax: "3",
            weight: "5",
            incompatible: [],
            items: ["chestplate", "elytra"]
        },
        silk_chest: {
            levelMax: "1",
            weight: "1",
            incompatible: [],
            items: ["pickaxe", "shovel", "axe", "hoe", "shears"]
        },
        smelter: {
            levelMax: "5",
            weight: "5",
            incompatible: ["silk_touch"],
            items: ["pickaxe", "shovel", "axe", "hoe", "shears"]
        },
        sniper: {
            levelMax: "5",
            weight: "5",
            incompatible: [],
            items: ["bow", "crossbow"]
        },
        sonic: {
            levelMax: "3",
            weight: "2",
            incompatible: [],
            items: ["boots"]
        },
        soulbound: {
            levelMax: "1",
            weight: "1",
            incompatible: ["vanishing_curse"],
            items: ["helmet", "chestplate", "leggings", "boots", "pickaxe", "shovel", "axe", "sword", "hoe", "brush", "fishing_rod",
                "bow", "shears", "flint_and_steel", "carrot_on_a_stick", "warped_fungus_on_a_stick", "shield", "elytra", "trident",
                "turtle_shell", "crossbow", "mace"
            ]
        },
        stopping_force: {
            levelMax: "3",
            weight: "5",
            incompatible: [],
            items: ["leggings"]
        },
        surprise: {
            levelMax: "3",
            weight: "5",
            incompatible: [],
            items: ["sword", "axe"]
        },
        survivalist: {
            levelMax: "1",
            weight: "5",
            incompatible: [],
            items: ["fishing_rod"]
        },
        swiper: {
            levelMax: "3",
            weight: "2",
            incompatible: [],
            items: ["sword", "axe"]
        },
        telekinesis: {
            levelMax: "1",
            weight: "1",
            incompatible: [],
            items: ["pickaxe", "shovel", "axe", "hoe", "shears"]
        },
        temper: {
            levelMax: "5",
            weight: "1",
            incompatible: [],
            items: ["sword", "axe"]
        },
        thrifty: {
            levelMax: "3",
            weight: "2",
            incompatible: [],
            items: ["sword", "axe"]
        },
        thunder: {
            levelMax: "5",
            weight: "5",
            incompatible: [],
            items: ["sword", "axe"]
        },
        treasure_hunter: {
            levelMax: "4",
            weight: "2",
            incompatible: [],
            items: ["helmet"]
        },
        tunnel: {
            levelMax: "3",
            weight: "1",
            incompatible: ["blast_mining", "veinminer"],
            items: ["pickaxe", "shovel", "axe", "hoe", "shears"]
        },
        vampire: {
            levelMax: "4",
            weight: "2",
            incompatible: [],
            items: ["sword", "axe"]
        },
        vampiric_arrows: {
            levelMax: "3",
            weight: "2",
            incompatible: ["bomber", "ghast", "ender_bow"],
            items: ["bow", "crossbow"]
        },
        veinminer: {
            levelMax: "3",
            weight: "2",
            incompatible: ["blast_mining", "tunnel"],
            items: ["pickaxe", "shovel", "axe", "hoe", "shears"]
        },
        venom: {
            levelMax: "3",
            weight: "5",
            incompatible: [],
            items: ["sword", "axe"]
        },
        village_defender: {
            levelMax: "5",
            weight: "10",
            incompatible: [],
            items: ["sword", "axe"]
        },
        wither: {
            levelMax: "3",
            weight: "5",
            incompatible: [],
            items: ["sword", "axe"]
        },
        withered_arrows: {
            levelMax: "3",
            weight: "2",
            incompatible: ["bomber", "ghast", "ender_bow"],
            items: ["bow", "crossbow"]
        },
        joyed: {
            levelMax: "3",
            weight: "1",
            incompatible: [],
            items: ["helmet"]
        },
    },
    items: [
        'helmet',
        'chestplate',
        'leggings',
        'boots',
        'turtle_shell',
        'elytra',

        'sword',
        'axe',
        'mace',
        'trident',
        'pickaxe',
        'shovel',
        'hoe',
        'bow',
        'shield',
        'crossbow',
        'brush',

        'fishing_rod',
        'shears',
        'flint_and_steel',
        'carrot_on_a_stick',
        'warped_fungus_on_a_stick',
        'pumpkin',
        'book',
    ]
};
