import * as mc from '@minecraft/server';

import * as spells from "./spells.js";
import * as util from "./util.js";
import { ArmorActivateEvent, WeaponEvent } from './events.js';

import { Vector } from '../Vector.js';

import { StringRef } from '../StringRef.js';

import { isCorrupted, getBaseSpellAndTier } from './util.js';

export class ArmorSpells
{
    /** @type { Map< string, (armorActivation) => void > } */
    static #spells = new Map();

    /**
     * @param {string} name 
     * @param {(armorActivation, spellTier, outputString) => void} armorSpell 
     * @param {boolean} isActivatedOnHit 
     */
    static addEffect( name, armorSpell )
    {
        ArmorSpells.#spells.set( name, armorSpell );
    }

    static hasActivateableEffect( name )
    {
        return ArmorSpells.#spells.has( name );
    }

    /**
     * @param {string} name 
     */
    static activateEffect( name, event, spellTier, outputString )
    {
        const effect = ArmorSpells.#spells.get( name );

        if ( effect == null )
            return;

        effect( event, spellTier, outputString );
    }

    static getEffect( name )
    {
        return ArmorSpells.#spells.get( name );
    }
}

// EFFECTS

import { WeaponEffects } from "./WeaponSpells.js";
import { print } from '../print.js';
import { BowEffects } from './BowSpells.js';

/**
 * @param {ArmorActivateEvent} event 
 * @param {number} spellTier 
 * @param {StringRef} outputString 
 */
function reflect( event, spellTier, outputString )
{
    if ( event.source == null )
        return;

    /** @type {string[]} */
    const reflectableSpells = event.reflectableSpells

    if ( reflectableSpells.length == 0 )
    {
        return;
    }

    const rand = Math.ceil( Math.random() * 10 );

    if ( spellTier * 3 < rand )
    {
        return;
    }

    let containsCorruption = false;

    for ( let i = 0; i < reflectableSpells.length; ++i )
    {
        if ( reflectableSpells[ i ].includes( spells.CORRUPTION ) )
        {
            containsCorruption = true;
            break;
        }
    }

    // If the target is corrupted and corruption appears as
    // a reflectable spell, then the target must have just
    // been corrupted in this same attack/defense frame
    
    // Otherwise, skip reflecting
    if ( !containsCorruption && event.targetIsCorrupted )
    {
        return;
    }

    const toReflect = reflectableSpells[ rand % reflectableSpells.length ];

    const indexOfLastSpace = toReflect.lastIndexOf(' ');
    const refSpellTier = Number.parseInt( toReflect.substring( indexOfLastSpace + 1 ) );
    const baseSpell = toReflect.substring( 0, indexOfLastSpace );

    const romanNum = refSpellTier == 0 ? "" : util.numberToRomanNumeral( refSpellTier );

    outputString.addWithNewLine( spells.REFLECT + spells.RESET +  ": " + baseSpell + romanNum )

    const hhEvent = new WeaponEvent( event.source, event.target, event.damage, false, true );

    if ( event.causedByProjectile )
    {
        BowEffects.activateEffect( baseSpell, hhEvent, refSpellTier, outputString );
    }
    else
    {
        WeaponEffects.activateEffect( baseSpell, hhEvent, refSpellTier, outputString );
    }

    
}

/**
 * @param {ArmorActivateEvent} event 
 * @param {number} spellTier 
 * @param {StringRef} outputString 
 */
function lastStand( event, spellTier, outputString )
{
    if ( !util.coolDownHasFinished( event.target, spells.LASTSTAND ) )
    {
        return;
    }

    const health = event.target.getComponent( "health" );

    if ( health.currentValue < 5 )
    {
        outputString.addWithNewLine( spells.LASTSTAND );
        event.target.addEffect("strength", util.secondsToTicks(10), {amplifier: 1, showParticles: true});
        event.target.addEffect("absorption", util.secondsToTicks(10), {amplifier: 4, showParticles: false});
        event.target.addEffect("regeneration", util.secondsToTicks(10), {amplifier: 1, showParticles: false});
        util.startCoolDown( event.target, spells.LASTSTAND, 60 );
    }
}

/**
 * @param {ArmorActivateEvent} event 
 * @param {number} spellTier 
 * @param {StringRef} outputString 
 */
function magmaArmor( event, spellTier, outputString )
{
    if ( event.causedByProjectile || event.source == null || event.targetIsCorrupted )
    {
        return;
    }

    const random = Math.random();

    if ( random > (spellTier / 2) / 10 )
    {
        return;
    }

    const onFire = event.source.getComponent("onfire");

    if ( onFire != null )
    {
        return;
    }

    outputString.addWithNewLine( spells.MAGMA_ARMOR );

    event.source.setOnFire( util.secondsToTicks( spellTier + 1 ), false );

    util.startCoolDown( event.target, spells.MAGMA_ARMOR, 10 );
}

/**
 * @param {ArmorActivateEvent} event 
 * @param {number} spellTier 
 * @param {StringRef} outputString 
 */
function push( event, spellTier, outputString )
{
    if ( event.causedByProjectile || event.source == null || event.targetIsCorrupted )
    {
        return;
    }

    const direction = Vector.normalize( Vector.subtract( event.source.location, event.target.location ) );

    const impulse = Vector.multiply( direction, 0.3 * spellTier );

    outputString.addWithNewLine( spells.PUSH );

    try
    {
        event.source.applyImpulse( impulse );
    }
    catch ( error )
    {
        event.source.applyKnockback( direction.x, direction.z, 0.3 * spellTier, 0.05 * spellTier );
    }
    
}

/**
 * @param {ArmorActivateEvent} event 
 * @param {number} spellTier 
 * @param {StringRef} outputString 
 */
function evasion( event, spellTier, outputString )
{
    if ( event.source == null || event.targetIsCorrupted )
    {
        return;
    }

    const health = event.target.getComponent("health");

    if ( health == null )
        return;

    const rand = Math.random() * 100;

    if ( spellTier * 5 > rand )
    {
        event.evaded = true;
        outputString.addWithNewLine( spells.EVASION );
        health.setCurrentValue( health.currentValue + event.damage );
    }
}

/**
 * @param {ArmorActivateEvent} event 
 * @param {number} spellTier 
 * @param {StringRef} outputString 
 */
function unbreakable( event, spellTier, outputString )
{
    
}

ArmorSpells.addEffect( spells.REFLECT,     reflect );
ArmorSpells.addEffect( spells.LASTSTAND,   lastStand );
ArmorSpells.addEffect( spells.MAGMA_ARMOR, magmaArmor );
ArmorSpells.addEffect( spells.PUSH,        push );
ArmorSpells.addEffect( spells.EVASION,     evasion );
ArmorSpells.addEffect( spells.UNBREAKABLE, unbreakable );

class ArmorActivation
{
    constructor( outputString, reflectEffect, reflectLevel, evaded )
    {
        this.outputString = outputString;
        this.reflectEffect = reflectEffect;
        this.reflectLevel = reflectLevel;
        this.evaded = evaded;
    }

    /** @type { ((armorActivation: any) => void) | null } */
    reflectEffect;

    /** @type { number } */
    reflectLevel;

    /** @type { boolean } */
    evaded;

    /** @type { StringRef } */
    outputString;
}

class ArmorSpellAndSlot
{
    spell;
    slot;
}

/**
 * @param { mc.Entity } entity 
 */
function getEntityArmorSpells( entity )
{
    const equipment = entity.getComponent("equippable");

    if ( equipment == null )
        return [];

    const slots = [
        mc.EquipmentSlot.Head,
        mc.EquipmentSlot.Chest,
        mc.EquipmentSlot.Legs,
        mc.EquipmentSlot.Feet
    ];

    /** @type { Map< string, ArmorSpellAndSlot > } */
    const spellSet = new Map();

    for ( const slot of slots )
    {
        const armor = equipment.getEquipment( slot );

        if ( armor == null || armor.getLore().length == 0 )
            continue;

        const lore = armor.getLore();
        const baseSpell = util.getBaseSpell( lore[ 0 ] );

        if ( spellSet.has( baseSpell ) )
        {
            continue;
        }

        spellSet.set( baseSpell, { spell: lore[ 0 ], slot: slot } );
    }

    return Array.from( spellSet.values() );
}

/**
 * Parses the defending entity's armor, activating any armor spells
 * that are activated on hit.
 * @param { mc.Player } defendingEntity
 * @param { mc.Entity } attackingEntity
 * @param { number } damage
 * @param { boolean } wasProjectile
 */
export function activateArmorSpells( defendingEntity, attackingEntity, damage, wasProjectile )
{
    const spells_ = getEntityArmorSpells( defendingEntity );

    if ( spells_.length == 0 )
    {
        return null;
    }

    const outputString = new StringRef();

    const event = new ArmorActivateEvent( defendingEntity, attackingEntity, damage, isCorrupted( attackingEntity ), [], wasProjectile );

    let reflect;
    let reflectLevel = 0;

    for ( let i = 0; i < spells_.length; ++i )
    {
        const { baseSpell, tier } = getBaseSpellAndTier( spells_[ i ].spell );

        if ( baseSpell == spells.REFLECT )
        {
            reflect = ArmorSpells.getEffect( spells.REFLECT );
            reflectLevel = tier;
            continue;
        }
        // if ( baseSpell == spells.EVASION )
        // {
        //     evasion = ArmorSpells.getEffect( spells.EVASION );
        //     evasionLevel = tier;
        //     continue;
        // }

        event.equipmentSlot = spells_[ i ].slot;

        ArmorSpells.activateEffect( baseSpell, event, tier, outputString );
    }

    return new ArmorActivation( outputString, reflect, reflectLevel, event.evaded );
}
