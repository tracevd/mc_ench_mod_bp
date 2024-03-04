import { Entity, Player, system } from "@minecraft/server";

import { CORRUPTED_TAG } from "./spells.js";

/**
 * @param {number} seconds 
 */
export function secondsToTicks( seconds )
{
    return seconds * 20;
}

/**
 * @param { String } num 
 */
export function romanNumeralToNumber( numeral )
{
    if ( numeral == "I" )
        return 1;

    if ( numeral == "II" )
        return 2;

    if ( numeral == "III" )
        return 3;

    if ( numeral == "IV" )
        return 4;

    if ( numeral == "V" )
        return 5;

    if ( numeral == "VI" )
        return 6;

    if ( numeral == "VII" )
        return 7;

    if ( numeral == "VIII" )
        return 8;

    if ( numeral == "IX" )
        return 9;

    if ( numeral == "X" )
        return 10;

    return 1;
}

const numerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function numberToRomanNumeral( num )
{
    return numerals[ num - 1 ];
}

/**
 * @param {string} spell 
 */
export function getBaseSpellAndTier( spell )
{
    if ( spell.endsWith('I') || spell.endsWith('V') || spell.endsWith('X') )
    {
        const indexOfSpace = spell.lastIndexOf(' ');
        return { baseSpell: spell.substring( 0, indexOfSpace + 1 ), tier: romanNumeralToNumber( spell.substring( indexOfSpace + 1 ) ) };
    }
    return { baseSpell: spell, tier: 0 };
}

/**
 * @param {string} spell 
 */
export function getBaseSpell( spell )
{
    if ( spell.endsWith('I') || spell.endsWith('V') || spell.endsWith('X') )
    {
        const indexOfSpace = spell.lastIndexOf(' ');
        return spell.substring( 0, indexOfSpace + 1 );
    }
    return spell;
}

/**
 * @param { string[] } lore_
 * @param { string } item
 */
export function filter( lore_, item )
{
    return lore_.filter( element => element.includes( item ) );
}

/**
 * Determines if any item in the lore includes the specified string
 * @param { string[] } lore_ 
 * @param { string } item 
 */
export function loreIncludes( lore_, item )
{
    return filter( lore_, item ).length > 0;
}

/**
 * @param {Player} player 
 * @returns {boolean}
 */
export function isCorrupted( player )
{
    if ( !( player instanceof Player ) )
        return false;

    return player.hasTag( CORRUPTED_TAG );
}

/**
 * @param { Player } player
 * @param { string } type
 * @param { number } seconds
 */
export function startCoolDown( player, type, seconds )
{
    player.addTag( type );
    system.runTimeout( () =>
    {
        if ( player.isValid() )
        {
            player.removeTag( type );
        }
    }, secondsToTicks( seconds ) );
}

/**
 * @param {Player} player 
 * @param {string} type 
 * @returns {boolean}
 */
export function coolDownHasFinished( player, type )
{
    return !( player.hasTag( type ) );
}

/**
 * @param {number} num 
 */
export function roundToNearestTenth( num )
{
    return Math.round( num * 10 ) / 10;
}

/**
 * @param {string[]} outputString 
 * @param {string} effectName 
 */
export function addEffectToOutputString( outputString, effectName )
{
    outputString[ 0 ] = outputString[ 0 ] + effectName.trimEnd() + '\n';
}

/**
 * Apply damage to an entity
 * @param {mc.Entity} entity 
 * @param {number} damage 
 */
export function applyDamage( entity, damage )
{
    const health = entity.getComponent("health");

    health.setCurrentValue( Math.max( 0, health.currentValue - damage ) );
}
