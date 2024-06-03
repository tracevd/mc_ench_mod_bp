import * as mc from '@minecraft/server';

import * as spells from "./spells.js";
import * as util from "./util.js";
import { ArmorActivateEvent, WeaponEvent } from './Events.js';

import { Vector } from '../Vector.js';

import * as io from "../util.js";

const nonRemoveableTags = new Set( [] );

function clearTags( entity )
{
    mc.system.run( () => {
        if ( entity.isValid() )
        {
            const tags = entity.getTags();
            for ( let i = 0; i < tags.length; ++i )
            {
                if ( nonRemoveableTags.has( tags[ i ] ) )
                    continue;
                entity.removeTag( tags[ i ] );
            }
        }
    });
}

/**
 * @param { mc.Entity } entity 
 */
export function initializeEntity( entity )
{
    if ( entity == null )
    {
        mc.world.sendMessage("Null entity");
        return;
    }

    clearTags( entity );

    const equippable = entity.getComponent("equippable");

    if ( equippable == null )
    {
        return;
    }

    entities.set( entity.id, new EntityArmor( entity ) );
}

export function getEntityArmor( entity )
{
    if ( entity == null )
        return null;

    return entities.get( entity.id );
}

export function removeEntity( entity )
{
    if ( entity == null )
        return;

    const armor = entities.get( entity.id );

    if ( armor != null )
    {
        armor.clear();

        entities.delete( entity.id );
    }

    clearTags( entity );
}

/** @type { Map< string, EntityArmor } > */
const entities = new Map();

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
            throw new Error("Cannot get armor effect: " + name );

        effect( event, spellTier, outputString );
    }

    static getEffect( name )
    {
        return ArmorSpells.#spells.get( name );
    }
}

class ArmorCallBacks
{
    /** @type { Map< string, ArmorCallBack > } */
    static #callBacks = new Map();

    static addCallBack( name, callBack )
    {
        ArmorCallBacks.#callBacks.set( name, callBack );
    }

    static getCreationCallback( name )
    {
        const callback = ArmorCallBacks.#getCallBack( name );

        return callback.create;
    }

    static getDestructionCallback( name )
    {
        const callback = ArmorCallBacks.#getCallBack( name );

        return callback.destroy;
    }

    static hasCallBack( name )
    {
        return ArmorCallBacks.#callBacks.get( name ) != null;
    }

    static hasDestructor( name )
    {
        const callback = ArmorCallBacks.#callBacks.get( name );

        return callback != null && callback.destroy != null;
    }

    static #getCallBack( name )
    {
        const callback = ArmorCallBacks.#callBacks.get( name );

        if ( callback == null )
        {
            throw new Error("Cannot get armor callback: " + name );
        }

        return callback;
    }
}

class ArmorCallBack
{
    constructor( create, destroy = null )
    {
        this.create = create;
        this.destroy = destroy;
    }

    /** @type { (entity, spellTier) => ( number | null ) } */
    create;
    /** @type { null | (entity) => void } */
    destroy;
}

class ArmorSpellAndSlot
{
    spell;
    slot;
}

mc.system.runInterval( () =>
    {
        // const start = Date.now();

        const players = mc.world.getAllPlayers();

        for ( let i = 0; i < players.length; ++i )
        {
            if ( players[ i ].hasTag('dead') )
            {
                continue;
            }

            const armor = entities.get( players[ i ].id );

            const equipment = players[ i ].getComponent('minecraft:equippable');

            if ( equipment == null )
            {
                io.print( entity.typeId + " had a null equipment component" );
                return;
            }

            armor.updateArmorSlot( equipment, mc.EquipmentSlot.Head  );
            armor.updateArmorSlot( equipment, mc.EquipmentSlot.Chest );
            armor.updateArmorSlot( equipment, mc.EquipmentSlot.Legs  );
            armor.updateArmorSlot( equipment, mc.EquipmentSlot.Feet  );
        }

        // const end = Date.now();

        // io.print( ( end - start ) + "ms" );
    },
    util.secondsToTicks( 1 )
);

class EntityArmor
{
    constructor( entity )
    {
        if ( entity == null )
        {
            throw new Error("Null entity");
        }

        this.#entity = entity;
        this.#callbacks = [null, null, null, null];
    }

    /**
     * 
     * @param {mc.EntityEquippableComponent} equipment 
     * @param {mc.EquipmentSlot} slot 
     */
    updateArmorSlot( equipment, slot )
    {
        const item = equipment.getEquipment( slot );

        this.updateArmorSpell( item, slot );

        if ( item != null && item.getLore().includes( spells.UNBREAKABLE ) )
        {
            const durability = item.getComponent("durability");
            durability.damage = 0;
            equipment.setEquipment( slot, item );
        }
    }

    /**
     * Returns all spells on a player's armor
     * @returns { string[] }
     */
    getAllSpells()
    {
        const ret = [];
        for ( const val in this.#armorSpells )
        {
            if ( val.length > 0 )
            {
                ret.push( val );
            }
        }
        return ret;
    }

    /**
     * Return all spells that have an activation function
     * rather than a callback
     * @returns { ArmorSpellAndSlot[] }
     */
    getActivateableSpells()
    {
        const ret = [];
        for ( let i = 0; i < this.#armorSpells.length; ++i )
        {
            const spell = this.#armorSpells[ i ];

            if ( spell != "" && ArmorSpells.hasActivateableEffect( util.getBaseSpell( spell ) ) )
            {
                ret.push( { spell: spell, slot: EntityArmor.#indexToSlot( i ) } );
            }
        }
        return ret;
    }

    /**
     * Set a given armor slot's spell
     * @param {mc.ItemStack | null} armor
     * @param {string} slot 
     */
    updateArmorSpell( armor, slot )
    {
        const index = EntityArmor.#slotToIndex( slot );

        const lore = armor == null ? "" : armor.getLore()[ 0 ];

        if ( armor != null && this.#armorSpells[ index ] == lore )
            return;

        this.#removeSpellAt( index );

        if ( armor != null && lore != null )
        {
            this.#addSpellAt( index, armor );
        }
    }

    /**
     * Clear a player's armor effects
     */
    clear()
    {
        for ( let i = 0; i < this.#armorSpells.length; ++i )
        {
            this.#removeSpellAt( i );
        }

        mc.system.run( () => {
            if ( this.#entity.isValid() )
                this.#entity.removeTag( "dead" );
        });
        
        // mc.system.clearRun( this.#entityCallBack );
    }

    entityDied()
    {
        this.#entity.addTag( "dead" );

        for ( let i = 0; i < this.#armorSpells.length; ++i )
        {
            this.#removeSpellAt( i );
        }
    }

    entityRespawned()
    {
        this.#entity.removeTag( "dead" );
    }

    /**
     * @param {number} index 
     */
    #removeSpellAt( index )
    {
        if ( this.#armorSpells[ index ] == "" )
        {
            return;
        }

        if ( this.#callbacks[ index ] != null )
        {
            mc.system.clearRun( this.#callbacks[ index ] );
            this.#callbacks[ index ] = null;
        }

        const baseSpell = util.getBaseSpell( this.#armorSpells[ index ] );

        if ( ArmorCallBacks.hasDestructor( baseSpell ) )
        {
            const destructor = ArmorCallBacks.getDestructionCallback( baseSpell );
            destructor( this.#entity );
        }

        this.#armorSpells[ index ] = "";
    }

    /**
     * @param {string} spell 
     * @param {number} ignoreIndex 
     */
    #alreadyHasSpell( spell, ignoreIndex = -1 )
    {
        if ( spell == spells.UNBREAKABLE )
            return false;

        for ( let i = 0; i < this.#armorSpells.length; ++i )
        {
            if ( i == ignoreIndex )
                continue;

            if ( util.getBaseSpell( this.#armorSpells[ i ] ) == util.getBaseSpell( spell ) )
            {
                io.print("Already has spell: " + spell );
                return true;
            }
        }
        return false;
    }

    /**
     * @param {number} index 
     * @param {ItemStack} armor 
     */
    #addSpellAt( index, armor )
    {
        const lore = armor.getLore()[ 0 ];

        if ( this.#alreadyHasSpell( lore ) )
            return;

        const { baseSpell, tier } = util.getBaseSpellAndTier( lore );

        if ( ArmorCallBacks.hasCallBack( baseSpell ) )
        {
            const callback = ArmorCallBacks.getCreationCallback( baseSpell );

            const ptr = callback( this.#entity, tier );

            this.#callbacks[ index ] = ptr;
        }
        
        this.#armorSpells[ index ] = lore;
    }

    static #slotToIndex( slot )
    {
        switch ( slot )
        {
        case mc.EquipmentSlot.Head:
            return 0;
        case mc.EquipmentSlot.Chest:
            return 1;
        case mc.EquipmentSlot.Legs:
            return 2;
        case mc.EquipmentSlot.Feet:
            return 3;
        default:
            throw new Error("Unknown equipment slot!");
        }
    }

    static #indexToSlot( index )
    {
        switch ( index )
        {
        case 0:
            return mc.EquipmentSlot.Head;
        case 1:
            return mc.EquipmentSlot.Chest;
        case 2:
            return mc.EquipmentSlot.Legs;
        case 3:
            return mc.EquipmentSlot.Feet;
        default:
            throw new Error("Invalid index to convert to equipment slot!");
        }
    }

    /** @type { string[] } */
    #armorSpells = ["", "", "", ""];
    /** @type { ( null | number )[] } */
    #callbacks = [null, null, null, null];
    /** @type { mc.Entity } */
    #entity;
}

// EFFECTS

import * as we from "./WeaponSpells.js";

/**
 * @param {ArmorActivateEvent} event 
 * @param {number} spellTier 
 * @param {string[]} outputString 
 */
function reflect( event, spellTier, outputString )
{
    if ( event.source == null )
        return;

    /** @type {string[]} */
    const reflectableSpells = event.reflectableSpells

    if ( reflectableSpells.length == 0 )
    {
        // io.print("Nothing to reflect", event.target);
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

    util.addEffectToOutputString( outputString, spells.REFLECT + spells.RESET +  ": " + baseSpell + romanNum );

    const hhEvent = new WeaponEvent( event.source, event.target, event.damage, false, true );

    we.WeaponEffects.activateEffect( baseSpell, hhEvent, refSpellTier, outputString );
}

/**
 * @param {ArmorActivateEvent} event 
 * @param {number} spellTier 
 * @param {string[]} outputString 
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
        // io.print("Activated last stand", event.target);
        util.addEffectToOutputString( outputString, spells.LASTSTAND );
        event.target.addEffect("strength", util.secondsToTicks(10), {amplifier: 1, showParticles: true});
        event.target.addEffect("absorption", util.secondsToTicks(10), {amplifier: 4, showParticles: false});
        event.target.addEffect("regeneration", util.secondsToTicks(10), {amplifier: 1, showParticles: false});
        util.startCoolDown( event.target, spells.LASTSTAND, 60 );
    }
}

/**
 * @param {ArmorActivateEvent} event 
 * @param {number} spellTier 
 * @param {string[]} outputString 
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

    util.addEffectToOutputString( outputString, spells.MAGMA_ARMOR );

    event.source.setOnFire( util.secondsToTicks( spellTier + 1 ), false );

    util.startCoolDown( event.target, spells.MAGMA_ARMOR, 10 );
}

/**
 * @param {ArmorActivateEvent} event 
 * @param {number} spellTier 
 * @param {string[]} outputString 
 */
function push( event, spellTier, outputString )
{
    if ( event.causedByProjectile || event.source == null || event.targetIsCorrupted )
    {
        return;
    }

    const direction = Vector.normalize( Vector.subtract( event.source.location, event.target.location ) );

    const impulse = direction.multiply( 0.3 * spellTier );

    util.addEffectToOutputString( outputString, spells.PUSH );

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
 * @param {string[]} outputString 
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
        util.addEffectToOutputString( outputString, spells.EVASION );
        health.setCurrentValue( health.currentValue + event.damage );
    }
}

/**
 * @param {ArmorActivateEvent} event 
 * @param {number} spellTier 
 * @param {string[]} outputString 
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

// CALLBACKS

function createImmunity( entity, spellTier )
{
    return mc.system.runInterval( () =>
    {
        if ( util.isCorrupted( entity ) )
        {
            return;
        }

        if ( entity.getEffect( 'poison' ) != undefined )
        {
            const rand = Math.random();
            if ( rand < spellTier / 7 )
                entity.removeEffect("poison");
        }
    }, util.secondsToTicks( 1.5 ) );
}

function createExtinguish( entity, spellTier )
{
    return mc.system.runInterval( () =>
    {
        if ( util.isCorrupted( entity ) )
        {
            return;
        }

        if ( entity.getComponent( "minecraft:onfire" ) == undefined )
        {
            return;
        }

        const rand = Math.random();

        if ( rand < spellTier / 8 )
        {
            entity.extinguishFire( false );
        }
    }, util.secondsToTicks( 1 ) );
}

function createIntimidation( entity, spellTier )
{
    const range = ( spellTier + 7 ) / 2;
    
    return mc.system.runInterval( () =>
    {
        if ( util.isCorrupted( entity ) )
        {
            return;
        }

        const entities = entity.dimension.getEntities({ location: entity.location, maxDistance: range, excludeFamilies: ["inanimate"], excludeTypes: ["item"] });

        for ( let i = 0; i < entities.length; ++i )
        {
            if ( entities[ i ].id == entity.id )
                continue;

            entities[ i ].addEffect("mining_fatigue", util.secondsToTicks(spellTier), {amplifier: 2});
            entities[ i ].addEffect("nausea", util.secondsToTicks(spellTier), {amplifier: spellTier - 1});
            entities[ i ].addEffect("slowness", util.secondsToTicks(spellTier), {amplifier: 0});
        }
    }, util.secondsToTicks( 10 ) )
}

function createSteadfast( entity, spellTier )
{
    entity.addEffect("resistance", util.secondsToTicks(9999), {amplifier: 0, showParticles: false});
    return null;
}
function destroySteadfast( entity )
{
    mc.system.run(() =>
    {
        if ( entity.isValid() )
        {
            entity.removeEffect("resistance");
        }
    });
}

function createResilience( entity, spellTier )
{
    const amplifier = spellTier - 1;
    entity.addEffect("health_boost", util.secondsToTicks(9999), { amplifier: amplifier, showParticles: false });
    entity.addEffect("regeneration", util.secondsToTicks(1), { amplifier: 9, showParticles: false });
    return null;
}
function destroyResilience( entity )
{
    mc.system.run(() =>
    {
        if ( entity.isValid() )
        {
            entity.removeEffect("health_boost");
        }
    });
}

function createLeaping( entity, spellTier )
{
    entity.addEffect("jump_boost", util.secondsToTicks(9999), { amplifier: 1, showParticles: false });
    return null;
}
function destroyLeaping( entity )
{
    
    mc.system.run(() =>
    {
        if ( entity.isValid() )
        {
            entity.removeEffect("jump_boost");
        }
    });
}

/**
 * @param {mc.Entity} entity 
 * @param {number} spellTier 
 */
function createStampede( entity, spellTier )
{
    entity.setDynamicProperty("stampLevel", -1);

    const maxSpeed = spellTier;

    return mc.system.runInterval( () =>
    {
        /** @type number|null */
        const speedLevel = entity.getDynamicProperty("stampLevel");

        if ( speedLevel == undefined )
        {
            throw new Error("Stampede dynamic property error");
        }

        if ( util.isCorrupted( entity ) )
        {
            if ( speedLevel >= 0 )
            {
                entity.setDynamicProperty("stampLevel", -1);
                entity.removeEffect("speed");
            }
            return;
        }

        if ( entity.hasTag('stampcooldown') )
        {
            return;
        }

        if ( !entity.isSprinting )
        {
            entity.setDynamicProperty("stampLevel", -1);
            entity.removeEffect("speed");

            return;
        }

        if ( speedLevel > -1 )
        {
            entity.addEffect("speed", util.secondsToTicks(10), { amplifier: speedLevel, showParticles: false });
        }

        if ( speedLevel < maxSpeed && !entity.hasTag( "stampcooldown" ) )
        {
            entity.addTag( "stampcooldown" );
            mc.system.runTimeout( () =>
            {
                if ( !entity.isSprinting )
                {
                    entity.removeTag("stampcooldown");
                    entity.setDynamicProperty("stampLevel", -1);
                    entity.removeEffect("speed");
                    return;
                }
                entity.setDynamicProperty("stampLevel", speedLevel + 1 );
                entity.addEffect("speed", util.secondsToTicks(10), { amplifier: speedLevel + 1, showParticles: false });
                entity.removeTag( "stampcooldown" );
            }, util.secondsToTicks( 3 ) );
        }                           
    }, 30 );
}
/**
 * @param {mc.Entity} entity 
 */
function destroyStampede( entity )
{    
    mc.system.run(() =>
    {
        if ( entity.isValid() )
        {
            entity.removeEffect("speed");
            entity.removeTag("stampcooldown");
        }
    });
}

/**
 * @param {mc.Entity} entity 
 */
function createClarity( entity )
{
    mc.system.run( () =>
    {
        entity.addEffect("night_vision", util.secondsToTicks(9999), {showParticles: false} );
    });
}
/**
 * @param {mc.Entity} entity 
 */
function destroyClarity( entity )
{
    mc.system.run( () =>
    {
        entity.removeEffect('night_vision');
    });
}

ArmorCallBacks.addCallBack( spells.IMMUNITY, new ArmorCallBack( createImmunity ) );
ArmorCallBacks.addCallBack( spells.EXTINGUISH, new ArmorCallBack( createExtinguish ) );
ArmorCallBacks.addCallBack( spells.INTIMIDATION, new ArmorCallBack( createIntimidation ) );
ArmorCallBacks.addCallBack( spells.STEADFAST, new ArmorCallBack( createSteadfast, destroySteadfast ) );
ArmorCallBacks.addCallBack( spells.RESILIENCE, new ArmorCallBack( createResilience, destroyResilience ) );
ArmorCallBacks.addCallBack( spells.LEAPING, new ArmorCallBack( createLeaping, destroyLeaping ) );
ArmorCallBacks.addCallBack( spells.STAMPEDE, new ArmorCallBack( createStampede , destroyStampede ) );
ArmorCallBacks.addCallBack( spells.CLARITY, new ArmorCallBack( createClarity, destroyClarity ) );
