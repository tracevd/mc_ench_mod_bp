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
export function romanNumeralToNumber( num )
{
    if ( num == "I" )
        return 1;

    if ( num == "III" )
        return 3;

    if ( num == "V" )
        return 5;

    if ( num == "X" )
        return 10;

    return 1;
}

export function numberToRomanNumeral( num )
{
    switch( num )
    {
    case 1:
        return "I";
    case 3:
        return "III";
    case 5:
        return "V";
    case 10:
        return "X";
    }
    return "I";
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
 * @param { string[] } lore_ 
 * @param { string } item 
 */
export function loreIncludes( lore_, item )
{
    return filter( lore_, item ).length > 0;
}

/**
 * @param { string[] } lore_ 
 * @param { string } item 
 */
export function getLoreItem( lore_, item )
{
    return filter( lore_, item )[ 0 ];
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
 * @param {string} item 
 * @param {string} type 
 * @returns {number}
 */
export function getSpellTier( item, type )
{
    return romanNumeralToNumber( item.substring( type.length ) );
}

/**
 * @param {string[]} lore 
 * @param {string} type 
 * @returns {number}
 */
export function loreTypeToSpellTier( lore, type )
{
    const item = getLoreItem( lore, type );
    return getSpellTier( item, type );
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
    outputString[ 0 ] = outputString[ 0 ] + effectName + '\n';
}
