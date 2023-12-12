import * as spells from './spells.js';
import * as util from './util.js';

import * as mc from '@minecraft/server';

import { createShockwave } from '../shockwave.js';

import { HandheldWeaponEvent } from './Events.js';

function makeReflectable( entity, effect )
{
    entity.addTag("reflectable~" + effect );
    mc.system.runTimeout( () =>
    {
        if ( entity.isValid() )
        {
            entity.removeTag("reflectable~" + effect );
        }
    }, util.secondsToTicks( 1 ) );
}

export class WeaponEffects
{
    /** @type { Map< string, (event, spelltier, outputString) => number } > */
    static #effects = new Map();

    /**
     * @param {(event, spelltier, outputString) => number} activationFunc 
     */
    static addEffect( name, activationFunc )
    {
        this.#effects.set( name, activationFunc );
    }

    /**
     * @param {string} name 
     * @param {HandheldWeaponEvent} event 
     * @param {number} spelltier 
     * @param {string[]} outputString 
     */
    static activateEffect( name, event, spelltier, outputString )
    {
        const effect = WeaponEffects.#effects.get( name );

        if ( effect == null )
            throw new Error("Cannot get weapon effect: " + name );

        return effect( event, spelltier, outputString );
    }
}

/**
 * @param {HandheldWeaponEvent} event 
 * @param {number} spelltier 
 * @param {string[]} outputString 
 */
function criticalStrike( event, spelltier, outputString )
{
    if ( event.sourceIsCorrupted )
        return 0;

    const rand = Math.random();

    if ( rand < ( spelltier + 15 ) / 50 )
        return 0;

    util.addEffectToOutputString( outputString, spells.CRITICAL_STRIKE );

    const damageAdded = event.damage * 0.3 * spelltier / 7;

    event.target.applyDamage( damageAdded );

    return damageAdded;
}

/**
 * @param {HandheldWeaponEvent} event 
 * @param {number} spelltier 
 * @param {string[]} outputString 
 */
function poison( event, spelltier, outputString )
{
    if ( !event.reflected && event.sourceIsCorrupted )
        return 0;

    if ( !util.coolDownHasFinished( event.source, spells.POISON ) )
        return 0;

    if ( !event.reflected )
        util.addEffectToOutputString( outputString, spells.POISON );

    event.target.runCommandAsync(`effect @s poison ${1+Math.floor(spelltier/3)} ${spelltier == 10 ? 2 : spelltier == 5 ? 1 : 0}`);

    if ( !event.reflected )
        makeReflectable( event.target, spells.POISON );

    util.startCoolDown( event.source, spells.POISON, 15 );
    return 0;
}

/**
 * @param {HandheldWeaponEvent} event 
 * @param {number} spelltier 
 * @param {string[]} outputString 
 */
function wither( event, spelltier, outputString )
{
    if ( !event.reflected && event.sourceIsCorrupted )
        return 0;

    if ( !util.coolDownHasFinished( event.source, spells.WITHER ) )
        return 0;

    if ( !event.reflected )
        util.addEffectToOutputString( outputString, spells.WITHER );

    event.target.runCommandAsync(`effect @s wither ${1+Math.floor(spelltier/3)} ${spelltier == 10 ? 2 : spelltier == 5 ? 1 : 0 }`);

    if ( !event.reflected )
        makeReflectable( event.target, spells.WITHER );

    util.startCoolDown( event.source, spells.WITHER, 20 );
    return 0;
}

/**
 * @param {HandheldWeaponEvent} event 
 * @param {number} spelltier 
 * @param {string[]} outputString 
 */
function groundPound( event, spelltier, outputString )
{
    if ( event.sourceIsCorrupted )
        return 0;

    const velo = event.source.getVelocity().y * -1;
    if ( velo <= 0 || !util.coolDownHasFinished( event.source, spells.GROUNDPOUND ) )
        return 0;

    const strength_multiplier = util.roundToNearestTenth( ( 0.9 + velo ) ** 3 );
    const radius = spelltier * velo / 2 + spelltier - spelltier / 7;
    const strength = spelltier * strength_multiplier ** 0.6;

    if ( event.source instanceof mc.Player )
    {
        event.source.sendMessage( `Groundpound strength: ${strength.toString()}` );
        event.source.sendMessage( `Groundpound radius: ${radius.toString()}` );
    }

    if ( createShockwave( event.source, event.source.location, strength, radius, strength_multiplier ) )
    {
        util.addEffectToOutputString( outputString, spells.GROUNDPOUND );
        util.startCoolDown( event.source, spells.GROUNDPOUND, 10 );
    }
        
    return 0;
}

/**
 * @param {HandheldWeaponEvent} event 
 * @param {number} spelltier 
 * @param {string[]} outputString 
 */
function exploding( event, spelltier, outputString )
{
    if ( !event.reflected && event.sourceIsCorrupted )
        return 0;

    if ( !util.coolDownHasFinished( event.source, spells.EXPLODING ) )
        return 0;

    if ( !event.reflected )
        util.addEffectToOutputString( outputString, spells.EXPLODING );

    event.target.dimension.createExplosion( event.target.location, 3, { breaksBlocks: false, source: event.source } );
    
    if ( !event.reflected )
        makeReflectable( event.target, spells.EXPLODING );

    util.startCoolDown( event.source, spells.EXPLODING, 15 );
    return 0;
}

/**
 * @param {HandheldWeaponEvent} event 
 * @param {number} spelltier 
 * @param {string[]} outputString 
 */
function absorbing( event, spelltier, outputString )
{
    if ( event.sourceIsCorrupted )
        return 0;

    if ( !util.coolDownHasFinished( event.source, spells.ABSORBING ) )
        return 0;

    const rand = Math.random();
    if ( rand < 0.5 )
        return 0;

    util.addEffectToOutputString( outputString, spells.ABSORBING );

    event.source.runCommandAsync("effect @s absorption 3 0 true");

    util.startCoolDown( event.source, spells.ABSORBING, 3 );
    return 0;
}

/**
 * @param {HandheldWeaponEvent} event 
 * @param {number} spelltier 
 * @param {string[]} outputString 
 */
function lifesteal( event, spelltier, outputString )
{
    if ( event.sourceIsCorrupted )
        return 0;

    if ( !util.coolDownHasFinished( event.source, spells.LIFESTEAL ) )
        return 0;

    const rand = Math.random();
    if ( rand < 0.5 )
        return 0;

    util.addEffectToOutputString( outputString, spells.LIFESTEAL );

    const health = event.source.getComponent("health");
    const multiplier = (spelltier / 33) + 0.2;

    let health_stolen = event.damage * multiplier;

    if ( isNaN( health_stolen ) )
        health_stolen = 0;
    let current = health.currentValue;
    if ( isNaN( current ) )
        current = 0;

    health.setCurrentValue( current + ( health_stolen > 2 ? 2 : health_stolen ) );
    util.startCoolDown( event.source, spells.LIFESTEAL, 4 );

    return 0;
}

/**
 * @param {HandheldWeaponEvent} event 
 * @param {number} spelltier 
 * @param {string[]} outputString 
 */
function slowing( event, spelltier, outputString )
{
    if ( !event.reflected && event.sourceIsCorrupted )
        return 0;

    if ( !util.coolDownHasFinished( event.source, spells.SLOWING ) )
        return 0;

    if ( !event.reflected )
        util.addEffectToOutputString( outputString, spells.SLOWING );

    const time_ = Math.ceil( spelltier / 4 );
    const time = time_ < 1 ? 1 : time_;
    event.target.runCommandAsync(
        `effect @s slowness ${ time } ${ ( spelltier > 5 ? 2 : 1 ) } true`
    );

    if ( !event.reflected )
        makeReflectable( event.target, spells.SLOWING );

    util.startCoolDown( event.source, spells.SLOWING, 7 );
    return 0;
}

/**
 * @param {HandheldWeaponEvent} event 
 * @param {number} spelltier 
 * @param {string[]} outputString 
 */
function lightning( event, spelltier, outputString )
{
    if ( !event.reflected && event.sourceIsCorrupted )
        return 0;

    if ( !util.coolDownHasFinished( event.source, spells.LIGHTNING ) )
        return 0;

    if ( !event.reflected )
        util.addEffectToOutputString( outputString, spells.LIGHTNING );

    event.target.applyDamage( 10 );
    event.target.runCommandAsync("summon lightning_bolt");
    
    if ( !event.reflected )
        makeReflectable( event.target, spells.LIGHTNING );

    util.startCoolDown( event.source, spells.LIGHTNING, 7 );

    return 10;
}

/**
 * @param {HandheldWeaponEvent} event 
 * @param {number} spelltier 
 * @param {string[]} outputString 
 */
function levitating( event, spelltier, outputString )
{
    if ( !event.reflected && event.sourceIsCorrupted )
        return 0;
    if ( !util.coolDownHasFinished( event.source, spells.LEVITATING ) )
        return 0;

    if ( !event.reflected )
        util.addEffectToOutputString( outputString, spells.LEVITATING );

    event.target.runCommandAsync(`effect @s levitation 1 ${(spelltier)+3} true`);

    if ( !event.reflected )
        makeReflectable( event.target, spells.LEVITATING );

    util.startCoolDown( event.source, spells.LEVITATING, 7 );
    return 0;
}

function isCorruptable( entity )
{
    return entity.getComponent("equippable") != null;
}

/**
 * @param {HandheldWeaponEvent} event 
 * @param {number} spelltier 
 * @param {string[]} outputString 
 */
function corruption( event, spelltier, outputString )
{
    if ( !event.reflected && event.sourceIsCorrupted )
        return 0;
    if ( !util.coolDownHasFinished( event.source, spells.CORRUPTION ) )
        return 0;
    if ( !isCorruptable( event.target ) )
        return 0;

    if ( !event.reflected )
        util.addEffectToOutputString( outputString, spells.CORRUPTION );

    util.startCoolDown( event.target, spells.CORRUPTED_TAG, ( spelltier == 10 ? 8 : ( spelltier + 7 ) / 2 ) );

    if ( event.target instanceof mc.Player )
    {
        event.target.onScreenDisplay.setTitle( "You have been " + spells.RESET + spells.LIGHT_PURPLE + "Corrupted", { fadeInDuration: util.secondsToTicks( 0.2 ), stayDuration: util.secondsToTicks( 0.5 ), fadeOutDuration: util.secondsToTicks( 0.2 ) } );
    }

    if ( !event.reflected )
        makeReflectable( event.target, spells.CORRUPTION );
    
    util.startCoolDown( event.source, spells.CORRUPTION, 25 );
    return 0;
}

WeaponEffects.addEffect( spells.CRITICAL_STRIKE, criticalStrike );
WeaponEffects.addEffect( spells.POISON,          poison );
WeaponEffects.addEffect( spells.WITHER,          wither );
WeaponEffects.addEffect( spells.GROUNDPOUND,     groundPound );
WeaponEffects.addEffect( spells.EXPLODING,       exploding );
WeaponEffects.addEffect( spells.ABSORBING,       absorbing );
WeaponEffects.addEffect( spells.LIFESTEAL,       lifesteal );
WeaponEffects.addEffect( spells.SLOWING,         slowing );
WeaponEffects.addEffect( spells.LIGHTNING,       lightning );
WeaponEffects.addEffect( spells.LEVITATING,      levitating );
WeaponEffects.addEffect( spells.CORRUPTION,      corruption );