import * as mc from '@minecraft/server';

import * as spells from '../spells/spells.js';


export const HelmetId     = 0;
export const ChestplateId = 1;
export const LeggingsId   = 2;
export const BootsId      = 3;
export const SwordId      = 4;

export class ArmorSet
{
    constructor( name, items )
    {
        this.name = name;
        this.items = items;
    }

    /** @type {string} */
    name;
    /** @type {ItemStack[]} */
    items = [];
}

export class ArmorSets
{
    /** @type ArmorSet[] */
    static sets = [];
}

/**
 * @param {mc.ItemStack} item 
 * @param {mc.Enchantment[]} enchantments 
 */
function addEnchantments( item, enchantments )
{
    const enchants = item.getComponent("enchantable");

    enchants.addEnchantments( enchantments );
}

/**
 * @param {string} type 
 * @param {string} displayname 
 * @param {mc.Enchantment[] | null} enchants 
 * @param {string[] | null} spells 
 */
function createItem( type, displayname, enchants, spells )
{
    const item = new mc.ItemStack( type );

    item.nameTag = displayname;

    if ( enchants != null )
    {
        addEnchantments( item, enchants );
    }

    if ( spells != null )
    {
        item.setLore( spells );
    }

    return item;
}

/**
 * @param {string} name 
 * @param {number} level 
 * @returns {mc.Enchantment}
 */
function createEnchantment( name, level )
{
    return { type: mc.EnchantmentTypes.get( name ), level: level };
}

function createSet( name, items )
{
    ArmorSets.sets.push( new ArmorSet( name, items ) );
}

createSet( "Soldier", [
    createItem("iron_helmet", "Soldier's Helmet",
    [
        createEnchantment("protection", 2),
        createEnchantment("unbreaking", 1)
    ]),
    createItem("iron_chestplate", "Soldier's Helmet",
    [
        createEnchantment("protection", 2),
        createEnchantment("unbreaking", 1)
    ]),
    createItem("iron_leggings", "Soldier's Leggings",
    [
        createEnchantment("protection", 2),
        createEnchantment("unbreaking", 1)
    ]),
    createItem("iron_boots", "Soldier's Boots",
    [
        createEnchantment("protection", 2),
        createEnchantment("unbreaking", 1)
    ]),
    createItem("iron_sword", "Soldier's Sword",
    [
        createEnchantment("sharpness", 3),
        createEnchantment("unbreaking", 1)
    ],
    [
        spells.CRITICAL_STRIKE + "II"
    ])
]);

createSet( "King's Guard",
[
    createItem("diamond_helmet", "King's Guard Helmet",
    [
        createEnchantment("protection", 3),
        createEnchantment("unbreaking", 2)
    ]),
    createItem("diamond_chestplate", "King's Guard Chestplate",
    [
        createEnchantment("protection", 3),
        createEnchantment("thorns", 2),
        createEnchantment("unbreaking", 2)
    ],
    [
        spells.RESILIENCE + "I"
    ]),
    createItem("diamond_leggings", "King's Guard Leggings",
    [
        createEnchantment("protection", 3),
        createEnchantment("unbreaking", 2)
    ],
    [
        spells.IMMUNITY + "II"
    ]),
    createItem("diamond_boots", "King's Guard Boots",
    [
        createEnchantment("protection", 3),
        createEnchantment("unbreaking", 2)
    ]),
    createItem("diamond_sword", "King's Guard Sword",
    [
        createEnchantment("sharpness", 4),
        createEnchantment("knockback", 1),
        createEnchantment("unbreaking", 2)
    ],
    [
        spells.CRITICAL_STRIKE + "III",
        spells.LACERATE + "I"
    ])
]);

createSet( "King",
[
    createItem("tench:obsidian_helmet", "King's Helmet",
    [
        createEnchantment("protection", 4),
        createEnchantment("unbreaking", 3)
    ],
    [
        spells.INTIMIDATION + "III"
    ]),
    createItem("tench:obsidian_chestplate", "King's Chestplate",
    [
        createEnchantment("protection", 4),
        createEnchantment("thorns", 3),
        createEnchantment("unbreaking", 3)
    ],
    [
        spells.RESILIENCE + "II"
    ]),
    createItem("tench:obsidian_leggings", "King's Leggings",
    [
        createEnchantment("protection", 4),
        createEnchantment("thorns", 3),
        createEnchantment("unbreaking", 3)
    ],
    [
        spells.LASTSTAND + "I"
    ]),
    createItem("tench:obsidian_boots", "King's Boots",
    [
        createEnchantment("protection", 4),
        createEnchantment("feather_falling", 4),
        createEnchantment("unbreaking", 3)
    ],
    [
        spells.EXTINGUISH + "II"
    ]),
    createItem("tench:obsidian_sword", "King's Sword",
    [
        createEnchantment("sharpness", 5),
        createEnchantment("fire_aspect", 2),
        createEnchantment("knockback", 2),
        createEnchantment("unbreaking", 3)
    ],
    [
        spells.CRITICAL_STRIKE + "IV",
        spells.LACERATE + "III",
        spells.LIFESTEAL + "II"
    ])
]);
