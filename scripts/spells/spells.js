import { numberToRomanNumeral, getBaseSpellAndTier } from "./util";

import * as constants from "./spell_constants.js";

export const RESET = constants.RESET;

export class SpellInfo
{
    /**
     * @param {string} name 
     * @param {number[]} tiers 
     * @param {number} minimumCastTier 
     */
    constructor( name, tiers )
    {
        this.name = name;
        this.#tiers = tiers;
        this.minimumCastTier = tiers.lastIndexOf( 0 ) + 2;
    }

    static dummy( name )
    {
        return new SpellInfo( name, [] );
    }

    /** @type { string } */
    name;

    /**
     * @type { number }
     * The minimum tier of spellcast (starting from 1) that
     * allows for the spell to be selected. Also supplies the
     * Maximum tier
     */
    minimumCastTier;

    /**
     * @type { number[] | null }
     * Array of numbers representing the effectiveness of the
     * spell.
     * [1, 2, 3, 4, 5] would mean that the spell could have
     * the following tiers: I, II, III, IV, V.
     * [1, 1, 2, 3, 4] would mean that the spell could have
     * the following tiers: I, II, III, IV
     * null would mean that the spell has no tiers (like
     * infinity enchant)
     */
    #tiers;

    /** @type { number } */
    #weight = 1;

    getWeight()
    {
        return this.#weight;
    }

    setWeight( weight )
    {
        this.#weight = weight;
        return this;
    }

    hasTiers()
    {
        return this.#tiers != null;
    }

    getSpellTiers()
    {
        const last1 = this.#tiers.lastIndexOf( 1 );
        return this.#tiers.slice( last1 );
    }

    getCastTierOfSpellTier( spellTier )
    {
        return this.#tiers.indexOf( spellTier ) + 1;
    }

    getSpellTier( castTier )
    {
        return this.#tiers[ castTier - 1 ];
    }
}

/**
 * @param {SpellInfo[]} spellArray 
 */
function getTotalWeight( spellArray )
{
    return spellArray.reduce( (prev, curr) => {
            return prev.setWeight( prev.getWeight() + curr.getWeight() );
        }, SpellInfo.dummy("").setWeight( 0 )  ).getWeight();
}

/**
 * @param {SpellInfo[]} table 
 * @param {string[]} alreadyHas
 * @param {number} castTier 
 */
function getRandomSpell( table, alreadyHas, castTier, totalWeight )
{
    let numTries = 0;
    while ( numTries++ < 10 )
    {
        let random = Math.floor( Math.random() * ( totalWeight ) );

        let i = 0;

        for ( ; i < table.length; ++i )
        {
            random -= table[ i ].getWeight();

            if ( random <= 0 )
                break;
        }

        i = Math.min( i, table.length - 1 );

        const spell = table[ i ];

        const needToReroll = spell.minimumCastTier > castTier
            || alreadyHas.filter( (value) => value.startsWith( spell.name ) ).length > 0;

        if ( needToReroll )
            continue;
        
        return spell.name + ( spell.hasTiers() ? numberToRomanNumeral( spell.getSpellTier( castTier ) ) : "" );
    }
    throw new Error("Could not get random spell for tier " + castTier.toString() );
}

// Makes items unbreakable
export const UNBREAKABLE = `${constants.RESET}${constants.DARK_GREY}Unbreakable`;

// **********************************************
//                  Weapon Spells
// **********************************************

// Damages enemies and scatters them
export const GROUNDPOUND     = `${constants.RESET}${constants.NEUTRAL}Ground Pound `;
// Summons lightning on hit
export const LIGHTNING       = `${constants.RESET}${constants.NEGATIVE}Lightning `;
// Explodes on hit
export const EXPLODING       = `${constants.RESET}${constants.NEGATIVE}Exploding `;
// Causes enemies to float in the and take fall damage
export const LEVITATING      = `${constants.RESET}${constants.NEGATIVE}Levitating `;
// Adds health to the player
export const LIFESTEAL       = `${constants.RESET}${constants.POSITIVE}Lifesteal `;
// Poisons hit entity
export const POISON          = `${constants.RESET}${constants.NEGATIVE}Poison `;
// Adds absorption for a brief time
export const ABSORBING       = `${constants.RESET}${constants.POSITIVE}Absorbing `;
// Withers nearby enemies
export const WITHER          = `${constants.RESET}${constants.NEGATIVE}Wither `;
// Damages nearby enemies
export const CRITICAL_STRIKE = `${constants.RESET}${constants.POSITIVE}Critical Strike `;
// Slows nearby enemies
export const SLOWING         = `${constants.RESET}${constants.NEGATIVE}Slowing `;
// Disables some effects
export const CORRUPTION      = `${constants.RESET}${constants.NEGATIVE}Corruption `;
// Causes bleeding effect
export const LACERATE        = `${constants.RESET}${constants.NEGATIVE}Lacerate `;
// Shuffle's player's hotbar
export const DISORIENT       = `${constants.RESET}${constants.NEGATIVE}Disorient `;

const weaponSpells = [
    new SpellInfo(GROUNDPOUND,      [0, 0, 1, 2, 3]).setWeight( 2 ),
    new SpellInfo(LIGHTNING,        [0, 1, 1, 1, 1]).setWeight( 3 ),
    new SpellInfo(EXPLODING,        [0, 0, 1, 1, 1]).setWeight( 2 ),
    new SpellInfo(LEVITATING,       [1, 2, 3, 4, 5]).setWeight( 5 ),
    new SpellInfo(LIFESTEAL,        [0, 1, 2, 3, 4]).setWeight( 3 ),
    new SpellInfo(POISON,           [1, 2, 3, 4, 5]).setWeight( 3 ),
    new SpellInfo(ABSORBING,        [1, 1, 1, 1, 1]).setWeight( 4 ),
    new SpellInfo(WITHER,           [0, 1, 2, 3, 4]).setWeight( 2 ),
    new SpellInfo(CRITICAL_STRIKE,  [1, 2, 3, 4, 5]).setWeight( 2 ),
    new SpellInfo(SLOWING,          [1, 2, 3, 4, 5]).setWeight( 4 ),
    new SpellInfo(CORRUPTION,       [0, 0, 1, 2, 3]).setWeight( 1 ),
    new SpellInfo(LACERATE,         [1, 2, 3, 4, 5]).setWeight( 2 ),
    new SpellInfo(DISORIENT,        [0, 0, 1, 1, 1]).setWeight( 2 )
];

const totalWeaponSpellWeight = getTotalWeight( weaponSpells );

/**
 * @param {string[]} alreadyHas 
 * @param {number} spellTier 
 * @returns 
 */
export function getRandomWeaponSpell( alreadyHas, spellTier )
{
    return getRandomSpell( weaponSpells, alreadyHas, spellTier, totalWeaponSpellWeight );
}

export function getAllWeaponSpells()
{
    return weaponSpells;
}

// **********************************************
//                 Armor Spells
// **********************************************

// Chance to remove fire effect
export const EXTINGUISH    = `${constants.RESET}${constants.POSITIVE}Extinguish `;
// Reflect weapon abilities back at attacker
export const REFLECT       = `${constants.RESET}${constants.NEUTRAL}Reflect `;
// When about to die, gain boosts to keep you in the fight
export const LASTSTAND     = `${constants.RESET}${constants.POSITIVE}Last Stand `;
// Chance to remove poison effects
export const IMMUNITY      = `${constants.RESET}${constants.POSITIVE}Immunity `;
// Gain resistance 1 while wearing
export const STEADFAST     = `${constants.RESET}${constants.POSITIVE}Steadfast `;
// Grants health boost
export const RESILIENCE    = `${constants.RESET}${constants.POSITIVE}Resilience `;
// Gives jump boost
export const LEAPING       = `${constants.RESET}${constants.POSITIVE}Leaping `;
// Gives jump boost
export const STAMPEDE      = `${constants.RESET}${constants.POSITIVE}Stampede `;
// Slows nearby enemies
export const INTIMIDATION  = `${constants.RESET}${constants.NEGATIVE}Intimidation `;
// Sets enemies that hit you on fire
export const MAGMA_ARMOR   = `${constants.RESET}${constants.NEGATIVE}Magma Armor `;
// Pushes away enemies that hit you
export const PUSH          = `${constants.RESET}${constants.NEUTRAL}Push `;
// Allows you to dodge damage
export const EVASION       = `${constants.RESET}${constants.POSITIVE}Evasion `;
// Gives night vision
export const CLARITY       = `${constants.RESET}${constants.POSITIVE}Clarity `;

const armorSpells = [
    new SpellInfo(EXTINGUISH,   [1, 2, 3, 4, 5]).setWeight( 4 ),
    new SpellInfo(REFLECT,      [0, 0, 1, 2, 3]).setWeight( 1 ),
    new SpellInfo(LASTSTAND,    [0, 0, 1, 1, 1]).setWeight( 3 ),
    new SpellInfo(IMMUNITY,     [1, 2, 3, 4, 5]).setWeight( 4 ),
    new SpellInfo(STEADFAST,    [0, 1, 1, 1, 1]).setWeight( 3 ),
    new SpellInfo(RESILIENCE,   [0, 0, 1, 2, 3]).setWeight( 1 ),
    new SpellInfo(LEAPING,      [1, 1, 1, 1, 1]).setWeight( 4 ),
    new SpellInfo(STAMPEDE,     [0, 0, 1, 1, 1]).setWeight( 2 ),
    new SpellInfo(INTIMIDATION, [1, 2, 3, 4, 5]).setWeight( 2 ),
    new SpellInfo(MAGMA_ARMOR,  [1, 2, 3, 4, 5]).setWeight( 4 ),
    new SpellInfo(PUSH,         [1, 2, 3, 4, 5]).setWeight( 3 ),
    new SpellInfo(EVASION,      [0, 1, 2, 3, 4]).setWeight( 2 ),
    new SpellInfo(CLARITY,      [1, 1, 1, 1, 1]).setWeight( 3 )
];

const totalArmorSpellWeight = getTotalWeight( armorSpells );

/**
 * @param {string[]} alreadyHas 
 * @param {number} spellTier 
 */
export function getRandomArmorSpell( spellTier )
{
    return getRandomSpell( armorSpells, [], spellTier, totalArmorSpellWeight );
}

export function getAllArmorSpells()
{
    return armorSpells;
}

// **********************************************
//                 Bow Spells
// **********************************************

// Add extra damage on arrow hits
export const SHARPENED_BOW   = `${constants.RESET}${constants.POSITIVE}Sharpened Arrows `;
// Gives target levitating
export const LEVITATING_BOW  = LEVITATING;
// Retrieves arrows that miss
export const MAGNETIC_ARROWS = `${constants.RESET}${constants.NEUTRAL}Magnetic Arrows `;
// Creates lightning when hitting arrows
export const LIGHTNING_BOW   = LIGHTNING;
// Makes arrows faster
export const VELOCITY        = `${constants.RESET}${constants.NEUTRAL}Velocity `;
// gives arrows aimbot
export const AIMBOT          = `${constants.RESET}${constants.POSITIVE}Aimbot `;
// Spawns powdered snow where the arrow hits
export const FREEZING        = `${constants.RESET}${constants.NEGATIVE}Freezing `;

const bowSpells = [
    new SpellInfo(SHARPENED_BOW,    [1, 2, 3, 4, 5]).setWeight( 2 ),
    new SpellInfo(LEVITATING_BOW,   [1, 2, 3, 4, 5]).setWeight( 5 ),
    new SpellInfo(MAGNETIC_ARROWS,  [1, 1, 1, 1, 1]).setWeight( 4 ),
    new SpellInfo(LIGHTNING_BOW,    [0, 1, 1, 1, 1]).setWeight( 2 ),
    new SpellInfo(VELOCITY,         [0, 1, 2, 3, 4]).setWeight( 3 ),
    new SpellInfo(AIMBOT,           [0, 0, 1, 2, 3]).setWeight( 1 ),
    new SpellInfo(FREEZING,         [0, 0, 1, 1, 1]).setWeight( 2 )
];

const totalBowSpellWeight = getTotalWeight( bowSpells );

/**
 * @param {string[]} alreadyHas 
 * @param {number} spellTier 
 */
export function getRandomBowSpell( alreadyHas, spellTier )
{
    return getRandomSpell( bowSpells, alreadyHas, spellTier, totalBowSpellWeight );
}

export function getAllBowSpells()
{
    return bowSpells;
}

// **********************************************
//                 Pick Spells
// **********************************************

// Mines all ores in a given vein
export const VEIN_MINER = `${constants.RESET}${constants.POSITIVE}Vein Miner `;

// Removes stone in the direction you're facing when mining
export const EXCAVATE   = `${constants.RESET}${constants.POSITIVE}Excavate `;

const pickaxeSpells = [
    new SpellInfo( VEIN_MINER, [1, 1, 1, 1, 1] ).setWeight( 2 ),
    new SpellInfo( EXCAVATE,   [0, 1, 1, 2, 3] ).setWeight( 1 ),
]

const totalPickaxeSpellWeight = getTotalWeight( pickaxeSpells );

/**
 * @param {string[]} alreadyHas 
 * @param {number} spellTier 
 */
export function getRandomPickaxeSpell( alreadyHas, spellTier )
{
    return getRandomSpell( pickaxeSpells, alreadyHas, spellTier, totalPickaxeSpellWeight );
}

export function getAllPickaxeSpells()
{
    return pickaxeSpells;
}

export const CORRUPTED_TAG = 'corrupted';
