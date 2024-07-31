import * as mc from "@minecraft/server";

import { Entity, Player, system } from "@minecraft/server";

import { CORRUPTED_TAG } from "./spells.js";

/**
 * @param {number} seconds 
 */
export function secondsToTicks( seconds )
{
    return seconds * mc.TicksPerSecond;
}

/**
 * @param { String } num 
 */
export function romanNumeralToNumber( numeral )
{
    switch ( numeral )
    {
    case "I":    return 1;
    case "II":   return 2;
    case "III":  return 3;
    case "IV":   return 4;
    case "V":    return 5;
    case "VI":   return 6;
    case "VII":  return 7;
    case "VIII": return 8;
    case "IX":   return 9;
    case "X":    return 10;
    }

    return 1;
}

const numerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function numberToRomanNumeral( num )
{
    if ( num > 10 || num < 1 )
    {
        return 1;
    }
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
 * Returns true if any string in "lore" includes
 * 'spell' as a substring
 * @param { string[] } lore 
 * @param { string } spell 
 * @returns 
 */
export function loreIncludes( lore, spell )
{
    for ( let i = 0; i < lore.length; ++i )
    {
        if ( lore[ i ].includes( spell ) )
            return true;
    }

    return false;
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
    const cooldownTag = "cooldown:" + type
    player.addTag( cooldownTag );
    system.runTimeout( () =>
    {
        if ( player.isValid() )
        {
            player.removeTag( cooldownTag );
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
    return !( player.hasTag( "cooldown:" + type ) );
}

/**
 * @param {number} num 
 */
export function roundToNearestTenth( num )
{
    return Math.round( num * 10 ) / 10;
}

/**
 * Apply damage to an entity
 * @param {mc.Entity} entity 
 * @param {number} damage 
 */
export function applyDamage( entity, damage, sourceOfDamage, isProjectile = false )
{
    const health = entity.getComponent("health");

    health.setCurrentValue( Math.max( 0.01, health.currentValue - damage ) );

    entity.applyDamage(
        0.1,
        {
            cause: isProjectile ? mc.EntityDamageCause.projectile : mc.EntityDamageCause.entityAttack,
            damagingEntity: sourceOfDamage
        }
    )
}
