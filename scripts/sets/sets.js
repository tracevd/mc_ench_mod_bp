import * as mc from '@minecraft/server';

import * as spells from '../spells/spells.js';

export class LoadType
{
    static get Structure() { return 0; }
    static get Generated() { return 1; }
}

export class SetPiece
{
    /**
     * @param { string } name 
     * @param { mc.ItemStack | string } item 
     * @param { LoadType } loadType 
     */
    constructor( name, item, loadType, weight )
    {
        this.#name = name;
        this.#item = item;
        this.#loadType = loadType;
        this.weight = weight;
    }

    /**
     * @param { mc.Vector3 } location 
     * @param { mc.Dimension } dimension 
     */
    loadAt( location, dimension )
    {
        if ( this.#loadType == LoadType.Generated )
        {
            dimension.spawnItem( this.#item, location );
        }
        else if ( this.#loadType == LoadType.Structure )
        {
            dimension.runCommandAsync( "structure load " + this.#item + ` ${location.x} ${location.y} ${location.z}` );
        }
        else
        {
            throw new Error("Unreconized load type");
        }
    }

    get name() { return this.#name; }

    /** @type { string } */
    #name;

    /** @type { mc.ItemStack | string } */
    #item;

    /** @type { number } */
    #loadType;

    /** @type { number } */
    weight;
}

/**
 * @type { () => SetPiece }
 */
let getRandomSetPiece;

export class SetPieces
{
    /** @type { SetPiece[] } */
    static items = [];

    /**
     * Returns all pieces that include the text contained in name
     * @param { string } name 
     */
    static getPiecesByName( name )
    {
        return this.items.filter( e => e.name.toLowerCase().includes( name ) );
    }

    static getRandom()
    {
        return getRandomSetPiece();
    }
}

export class SetItemId
{
    static get Helmet() { return 0; }
    static get Chestplate() { return 1; }
    static get Leggings() { return 2; }
    static get Boots() { return 3; }
    static get Sword() { return 4; }
    static get Bow() { return 5; }
}

export class ItemSet
{
    constructor( name, startIdx, endIdx )
    {
        this.name = name;
        this.#startIdx = startIdx;
        this.#endIdx = endIdx;
    }

    /** @type { string } */
    name;

    #startIdx = 0;
    #endIdx = 0;

    /** @type { SetPiece[] } */
    get items() { return SetPieces.items.slice( this.#startIdx, this.#endIdx ); };

    /**
     * 
     * @param {} slot 
     */
    getPiece( slot )
    {
        if ( slot >= this.#endIdx - this.#startIdx )
            return null;
        return SetPieces.items[ this.#startIdx + slot ];
    }
}

export class ItemSets
{
    /** @type ItemSet[] */
    static sets = [];

    static getSetsByName( name )
    {
        return this.sets.filter( e => e.name.toLowerCase().includes( name ) );
    }
}

/**
 * @param { mc.ItemStack } item 
 * @param { mc.Enchantment[] } enchantments 
 */
function addEnchantments( item, enchantments )
{
    const enchants = item.getComponent( mc.ItemComponentTypes.Enchantable );

    if ( enchants == null )
    {
        throw new Error("No enchantment component!");
    }

    enchants.addEnchantments( enchantments );
}

/**
 * @param { string } type 
 * @param { string } displayname 
 * @param { number } weight
 * @param { mc.Enchantment[] | null } enchants 
 * @param { string[] | null } spells 
 */
function createGeneratedItem( type, displayname, weight, enchants, spells )
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

    const idx = SetPieces.items.push( new SetPiece( displayname, item, LoadType.Generated, weight ) ) - 1;
    return SetPieces.items[ idx ];
}

/**
 * @param { string } name 
 * @param { string } structureName
 * @param { number } weight
 */
function createStructureItem( name, structureName, weight )
{
    const idx = SetPieces.items.push( new SetPiece( name, structureName, LoadType.Structure, weight ) ) - 1;
    return SetPieces.items[ idx ];
}

/**
 * @param { string } name 
 * @param { number } level 
 * @returns { mc.Enchantment }
 */
function createEnchantment( name, level )
{
    return { type: mc.EnchantmentTypes.get( name ), level: level };
}

/**
 * @param { string } name 
 * @param { SetPiece[] } items 
 */
function createSet( name, items )
{
    const startIdx = SetPieces.items.length - items.length;
    ItemSets.sets.push( new ItemSet( name, startIdx, startIdx + items.length ) );
}

createSet( "Soldier", [
    createGeneratedItem("iron_helmet", "Soldier's Helmet", 10,
    [
        createEnchantment("protection", 2),
        createEnchantment("unbreaking", 1)
    ]),
    createGeneratedItem("iron_chestplate", "Soldier's Helmet", 10,
    [
        createEnchantment("protection", 2),
        createEnchantment("unbreaking", 1)
    ]),
    createGeneratedItem("iron_leggings", "Soldier's Leggings", 10,
    [
        createEnchantment("protection", 2),
        createEnchantment("unbreaking", 1)
    ]),
    createGeneratedItem("iron_boots", "Soldier's Boots", 10,
    [
        createEnchantment("protection", 2),
        createEnchantment("unbreaking", 1)
    ]),
    createGeneratedItem("iron_sword", "Soldier's Sword", 10,
    [
        createEnchantment("sharpness", 3),
        createEnchantment("unbreaking", 1)
    ],
    [
        spells.CRITICAL_STRIKE + "II"
    ])
]);

createSet( "Royal Guard",
[
    createGeneratedItem("diamond_helmet", "Royal Guard Helmet", 9,
    [
        createEnchantment("protection", 3),
        createEnchantment("unbreaking", 2)
    ]),
    createGeneratedItem("diamond_chestplate", "Royal Guard Chestplate", 9,
    [
        createEnchantment("protection", 3),
        createEnchantment("thorns", 2),
        createEnchantment("unbreaking", 2)
    ],
    [
        spells.RESILIENCE + "I"
    ]),
    createGeneratedItem("diamond_leggings", "Royal Guard Leggings", 9,
    [
        createEnchantment("protection", 3),
        createEnchantment("unbreaking", 2)
    ],
    [
        spells.IMMUNITY + "II"
    ]),
    createGeneratedItem("diamond_boots", "Royal Guard Boots", 9,
    [
        createEnchantment("protection", 3),
        createEnchantment("unbreaking", 2)
    ]),
    createGeneratedItem("diamond_sword", "Royal Guard Sword", 9,
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
    createGeneratedItem("tench:obsidian_helmet", "King's Helmet", 8,
    [
        createEnchantment("protection", 4),
        createEnchantment("unbreaking", 3)
    ],
    [
        spells.INTIMIDATION + "III"
    ]),
    createGeneratedItem("tench:obsidian_chestplate", "King's Chestplate", 8,
    [
        createEnchantment("protection", 4),
        createEnchantment("thorns", 3),
        createEnchantment("unbreaking", 3)
    ],
    [
        spells.RESILIENCE + "II"
    ]),
    createGeneratedItem("tench:obsidian_leggings", "King's Leggings", 8,
    [
        createEnchantment("protection", 4),
        createEnchantment("thorns", 3),
        createEnchantment("unbreaking", 3)
    ],
    [
        spells.LASTSTAND + "I"
    ]),
    createGeneratedItem("tench:obsidian_boots", "King's Boots", 8,
    [
        createEnchantment("protection", 4),
        createEnchantment("feather_falling", 4),
        createEnchantment("unbreaking", 3)
    ],
    [
        spells.EXTINGUISH + "II"
    ]),
    createGeneratedItem("tench:obsidian_sword", "King's Sword", 8,
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

createSet("Dragon Slayer", [
    createStructureItem("Dragon Slayer Helmet", "tench:DragonSlayerHelmet", 1),
    createStructureItem("Dragon Slayer Chestplate", "tench:DragonSlayerChest", 1),
    createStructureItem("Dragon Slayer Leggings", "tench:DragonSlayerLegs", 1),
    createStructureItem("Dragon Slayer Boots", "tench:DragonSlayerBoots", 1),
    createStructureItem("Dragon Slayer Sword", "tench:DragonSlayerSword", 1),
    createStructureItem("Dragon Slayer Bow", "tench:DragonSlayerBow", 1)
]);

createStructureItem("Pounder", "tench:Pounder", 7);
createStructureItem("The Drill", "tench:TheDrill", 7);
createStructureItem("Brisingr", "tench:Brisingr", 6);
createStructureItem("Dragon Wings", "tench:DragonWings", 4);

createGeneratedItem("tench:obsidian_pickaxe", "Bane of Ores", 14,
[
    createEnchantment("efficiency", 5),
    createEnchantment("fortune", 3),
    createEnchantment("unbreaking", 3),
    createEnchantment("mending", 1)
],
[
    spells.VEIN_MINER + "I",
    spells.UNBREAKABLE
]);

const totalWeight = ( () => {

    let weight = 0;
    for ( let i = 0; i < SetPieces.items.length; ++i )
    {
        weight += SetPieces.items[ i ].weight;
    }
    return weight;
} )();

getRandomSetPiece = () =>
{
    let rand = Math.round( Math.random() * ( totalWeight - 1 ) );

    let i = 0;

    for ( ; i < SetPieces.items.length; ++i )
    {
        rand -= SetPieces.items[ i ].weight;

        if ( rand <= 0 )
            break;
    }

    i = Math.min( i, SetPieces.items.length - 1 );

    return SetPieces.items[ i ];
}