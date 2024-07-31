import * as spells from './spells.js';
import * as util from './util.js';

import * as mc from '@minecraft/server';

import { createShockwave } from '../shockwave.js';

import { WeaponEvent } from './events.js';
import { print } from '../print.js';
import { StringRef } from '../StringRef.js';

import { isCorrupted, getBaseSpellAndTier } from './util.js';

import { makeReflectable } from './reflectable.js';

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

    static hasEffect( name )
    {
        return this.#effects.has( name );
    }

    /**
     * @param {string} name 
     * @param {WeaponEvent} event 
     * @param {number} spelltier 
     * @param {StringRef} outputString 
     */
    static activateEffect( name, event, spelltier, outputString )
    {
        const effect = WeaponEffects.#effects.get( name );

        if ( effect == null )
            return 0;

        return effect( event, spelltier, outputString );
    }
}

/**
 * @param {WeaponEvent} event 
 * @param {number} spelltier 
 * @param {StringRef} outputString 
 */
function criticalStrike( event, spelltier, outputString )
{
    if ( event.sourceIsCorrupted )
        return 0;

    const rand = Math.random();

    if ( rand < 0.5 )
        return 0;

    outputString.addWithNewLine( spells.CRITICAL_STRIKE );

    const damageAdded = event.damage * spelltier / 10;

    util.applyDamage( event.target, damageAdded, event.source );

    return damageAdded;
}

/**
 * @param {WeaponEvent} event 
 * @param {number} spelltier 
 * @param {StringRef} outputString 
 */
function poison( event, spelltier, outputString )
{
    if ( !event.reflected && event.sourceIsCorrupted )
        return 0;

    if ( !util.coolDownHasFinished( event.source, spells.POISON ) )
        return 0;

    if ( !event.reflected )
        outputString.addWithNewLine( spells.POISON );

    event.target.addEffect("poison", util.secondsToTicks(spelltier), {amplifier: spelltier - 1});

    if ( !event.reflected )
        makeReflectable( event, spells.POISON, spelltier );

    util.startCoolDown( event.source, spells.POISON, 15 );

    return 0;
}

/**
 * @param {WeaponEvent} event 
 * @param {number} spelltier 
 * @param {StringRef} outputString 
 */
function wither( event, spelltier, outputString )
{
    if ( !event.reflected && event.sourceIsCorrupted )
        return 0;

    if ( !util.coolDownHasFinished( event.source, spells.WITHER ) )
        return 0;

    if ( !event.reflected )
        outputString.addWithNewLine( spells.WITHER );

    event.target.addEffect("wither", util.secondsToTicks(spelltier), {amplifier: spelltier - 1});

    if ( !event.reflected )
        makeReflectable( event, spells.WITHER, spelltier );

    util.startCoolDown( event.source, spells.WITHER, 20 );
    return 0;
}

/**
 * @param {WeaponEvent} event 
 * @param {number} spelltier 
 * @param {StringRef} outputString 
 */
function groundPound( event, spelltier, outputString )
{
    if ( event.sourceIsCorrupted )
        return 0;

    const velo = event.source.getVelocity().y * -1;
    if ( velo <= 0 || !util.coolDownHasFinished( event.source, spells.GROUNDPOUND ) )
        return 0;

    const strength_multiplier = util.roundToNearestTenth( Math.sqrt( 1 + velo ) * 2 );
    const radius = Math.log2( ( ( spelltier * velo + spelltier / 1.5 ) * strength_multiplier ) ** 1.5 );
    const strength = spelltier / 2 * strength_multiplier ** 0.6;

    if ( event.source instanceof mc.Player )
    {
        // event.source.sendMessage( `GroundPound multiplier: ${strength_multiplier.toString()}`);
        // event.source.sendMessage( `Groundpound strength: ${strength.toString()}` );
        // event.source.sendMessage( `Groundpound radius: ${radius.toString()}` );
    }

    if ( createShockwave( event.source, event.source.location, strength, radius, strength_multiplier ) )
    {
        outputString.addWithNewLine( spells.GROUNDPOUND );
        util.startCoolDown( event.source, spells.GROUNDPOUND, 10 );
    }
        
    return 0;
}

/**
 * @param {WeaponEvent} event 
 * @param {number} spelltier 
 * @param {StringRef} outputString 
 */
function exploding( event, spelltier, outputString )
{
    if ( !event.reflected && event.sourceIsCorrupted )
        return 0;

    if ( !util.coolDownHasFinished( event.source, spells.EXPLODING ) )
        return 0;

    if ( !event.reflected )
        outputString.addWithNewLine( spells.EXPLODING );

    event.target.dimension.createExplosion( event.target.location, 3, { breaksBlocks: false, source: event.source } );
    
    if ( !event.reflected )
        makeReflectable( event, spells.EXPLODING, spelltier );

    util.startCoolDown( event.source, spells.EXPLODING, 15 );
    return 0;
}

/**
 * @param {WeaponEvent} event 
 * @param {number} spelltier 
 * @param {StringRef} outputString 
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

    outputString.addWithNewLine( spells.ABSORBING );

    event.source.addEffect("absorption", util.secondsToTicks(3), {amplifier: 0, showParticles: false});

    util.startCoolDown( event.source, spells.ABSORBING, 3 );
    return 0;
}

/**
 * @param {WeaponEvent} event 
 * @param {number} spelltier 
 * @param {StringRef} outputString 
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

    outputString.addWithNewLine( spells.LIFESTEAL );

    const health = event.source.getComponent("health");
    const multiplier = (spelltier / 16) + 0.2;

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
 * @param {WeaponEvent} event 
 * @param {number} spelltier 
 * @param {StringRef} outputString 
 */
function slowing( event, spelltier, outputString )
{
    if ( !event.reflected && event.sourceIsCorrupted )
        return 0;

    if ( !util.coolDownHasFinished( event.source, spells.SLOWING ) )
        return 0;

    if ( !event.reflected )
        outputString.addWithNewLine( spells.SLOWING );

    const time_ = Math.ceil( spelltier / 2 );
    const time = time_ < 1 ? 1 : time_;

    event.target.addEffect("slowness", util.secondsToTicks( time ), {amplifier: ( spelltier == 5 ? 2 : 1 ), showParticles: false});

    if ( !event.reflected )
        makeReflectable( event, spells.SLOWING, spelltier );

    util.startCoolDown( event.source, spells.SLOWING, 7 );
    return 0;
}

/**
 * @param {WeaponEvent} event 
 * @param {number} spelltier 
 * @param {StringRef} outputString 
 */
export function lightning( event, spelltier, outputString )
{
    if ( !event.reflected && event.sourceIsCorrupted )
        return 0;

    if ( !util.coolDownHasFinished( event.source, spells.LIGHTNING ) )
        return 0;

    if ( !event.reflected )
        outputString.addWithNewLine( spells.LIGHTNING );

    const damage = 6;

    event.target.runCommandAsync("summon lightning_bolt");
    util.applyDamage( event.target, damage, event.source );
    const onFire = event.source.getComponent("onfire");
    mc.system.runTimeout( () =>
    {
        event.source.runCommandAsync("fill ~-3 ~-3 ~-3 ~3 ~3 ~3 air replace fire");
        if ( onFire == null )
        {
            event.source.extinguishFire( false );
        }
    }, 4 );    
    
    if ( !event.reflected )
        makeReflectable( event, spells.LIGHTNING, spelltier );

    util.startCoolDown( event.source, spells.LIGHTNING, 15 );

    return damage;
}

/**
 * @param {WeaponEvent} event 
 * @param {number} spelltier 
 * @param {StringRef} outputString 
 */
export function levitating( event, spelltier, outputString )
{
    if ( !event.reflected && event.sourceIsCorrupted )
        return 0;
    if ( !util.coolDownHasFinished( event.source, spells.LEVITATING ) )
        return 0;

    if ( !event.reflected )
        outputString.addWithNewLine( spells.LEVITATING );

    event.target.addEffect("levitation", util.secondsToTicks(1), {amplifier: spelltier + 3, showParticles: false});

    if ( !event.reflected )
        makeReflectable( event, spells.LEVITATING, spelltier );

    util.startCoolDown( event.source, spells.LEVITATING, 7 );
    return 0;
}

function isCorruptable( entity )
{
    return entity.getComponent("equippable") != null;
}

/**
 * @param {WeaponEvent} event 
 * @param {number} spelltier 
 * @param {StringRef} outputString 
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
        outputString.addWithNewLine( spells.CORRUPTION );

    util.startCoolDown( event.target, spells.CORRUPTED_TAG, spelltier * 3 );

    if ( event.target instanceof mc.Player )
    {
        event.target.playSound("random.totem", {volume: 0.5});
    }

    if ( !event.reflected )
        makeReflectable( event, spells.CORRUPTION, spelltier );
    
    util.startCoolDown( event.source, spells.CORRUPTION, 25 );
    return 0;
}

/**
 * @param {WeaponEvent} event 
 * @param {number} spelltier 
 * @param {StringRef} outputString 
 */
function lacerate( event, spellTier, outputString )
{
    if ( !event.reflected && event.sourceIsCorrupted )
        return 0;
    if ( !util.coolDownHasFinished( event.source, spells.LACERATE ) )
        return 0;

    const duration = spellTier / 2 + 0.5;
    const ticksPerSecond = 1;

    let id = mc.system.runInterval( () =>
    {
        if ( !event.target.isValid() )
        {
            const temp = id;
            id = null;
            mc.system.clearRun( temp );
            return;
        }

        const health = event.target.getComponent("health");

        if ( health.currentValue < 2 )
        {
            const temp = id;
            id = null;
            mc.system.clearRun( temp );
            return;
        }

        health.setCurrentValue( health.currentValue - 1 );
        event.target.applyDamage( 0.01 );
        event.target.runCommandAsync("particle tench:lacerate ~ ~1 ~");
    }, util.secondsToTicks(1) / ticksPerSecond );

    mc.system.runTimeout( () =>
    {
        if ( id == null )
            return;
        mc.system.clearRun( id );
    }, util.secondsToTicks( duration ) );

    if ( !event.reflected )
        outputString.addWithNewLine( spells.LACERATE );

    if ( !event.reflected )
        makeReflectable( event, spells.LACERATE, spellTier );

    util.startCoolDown( event.source, spells.LACERATE, 10 );

    return 0;
}

/**
 * @param {WeaponEvent} event 
 * @param {number} spelltier 
 * @param {StringRef} outputString 
 */
export function unbreakable( event, spelltier, outputString )
{
    const equip = event.source.getComponent("equippable");

    if ( equip == null )
    {
        print("Null equipment component");
        return;
    }

    const item = equip.getEquipment( mc.EquipmentSlot.Mainhand );

    if ( item == null )
    {
        return;
    }

    const durability = item.getComponent("durability");

    if ( durability == null )
    {
        return;
    }

    if ( durability.damage > 0 )
    {
        mc.system.run(() =>
        {
            durability.damage = 0;
            equip.setEquipment( mc.EquipmentSlot.Mainhand, item );
        });
    }    
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
WeaponEffects.addEffect( spells.LACERATE,        lacerate );
WeaponEffects.addEffect( spells.UNBREAKABLE,     unbreakable );


/**
 * Activates spells on the item in the player's main hand.
 * Effects do not activate if the player is corrupted.
 * 
 * If the there is no item in the main hand, or the item is a bow,
 * this function will do nothing.
 * 
 * @param { mc.Player } player
 * @param { mc.Entity } hitEntity
 * @param { Number } damage
 * @returns { string[] } spells activated that can be reflected
 */
export function activateWeaponSpells( player, hitEntity, damage )
{
    if ( isCorrupted( player ) )
    {
        return [];
    }

    if ( !hitEntity.isValid() )
    {
        mc.world.sendMessage("Invalid entity");
        return [];
    }

    const equip = player.getComponent("equippable");

    if ( equip == null )
    {
        return [];
    }

    const item = equip.getEquipment( mc.EquipmentSlot.Mainhand );

    if ( item == undefined )
        return [];

    if ( item.typeId.endsWith("bow") )
        return [];
    
    /** @type {string[]} */
    const lore = item.getLore();

    if ( lore.length == 0 || lore[ 0 ] == undefined )
    {
        return [];
    }

    const outputString = new StringRef();

    let extraDamage = 0;

    const event = new WeaponEvent( hitEntity, player, damage, isCorrupted( player ) );

    for ( let i= 0; i < lore.length; ++i )
    {
        const { baseSpell, tier } = getBaseSpellAndTier( lore[ i ] );

        extraDamage += WeaponEffects.activateEffect( baseSpell, event, tier, outputString );
    }

    if ( outputString.length > 0 && player instanceof mc.Player )
    {
        player.onScreenDisplay.setActionBar( outputString.str );
    }

    return event.reflectableSpells;
}
