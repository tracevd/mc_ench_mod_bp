import * as mc from '@minecraft/server';

import * as spells from "./spells.js";
import * as util from "./util.js";
import { ArmorActivateEvent } from './Events.js';

import * as io from "../util.js";

const nonRemoveableTags = new Set( [ "dead" ] );

function clearTags( entity )
{
    mc.system.run( () => {
        const tags = entity.getTags();
        for ( let i = 0; i < tags.length; ++i )
        {
            if ( nonRemoveableTags.has( tags[ i ] ) )
                continue;
            entity.removeTag( tags[ i ] );
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
    }

    clearTags( entity );

    const equippable = entity.getComponent("equippable");

    if ( equippable == null )
    {
        return;
    }

    io.print( entity.id );

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

    io.print("Clearing tags");
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

/**
 * @param {string} spell 
 */
function getBaseSpellAndTier( spell )
{
    if ( spell.endsWith('I') || spell.endsWith('X') || spell.endsWith('V') )
    {
        const indexOfSpace = spell.lastIndexOf(' ');
        return { baseSpell: spell.substring( 0, indexOfSpace + 1 ), tier: util.romanNumeralToNumber( spell.substring( indexOfSpace + 1 ) ) };
    }
    return { baseSpell: spell, tier: 0 };
}

class EntityArmor
{
    constructor( entity )
    {
        if ( entity == null )
        {
            return;
        }

        this.#entity = entity;
        this.#callbacks = [null, null, null, null];

        this.#entityCallBack = mc.system.runInterval( () => {
            if ( this.#entity.hasTag( "dead" ) )
            {
                io.print("entity is dead!");
                return;
            }

            const equipment = this.#entity.getComponent('minecraft:equippable');

            if ( equipment == null )
            {
                io.print( entity.typeId + " had a null equipment component" );
            }

            this.#updateArmorSlot( equipment, mc.EquipmentSlot.Head );
            this.#updateArmorSlot( equipment, mc.EquipmentSlot.Chest );
            this.#updateArmorSlot( equipment, mc.EquipmentSlot.Legs );
            this.#updateArmorSlot( equipment, mc.EquipmentSlot.Feet );
                     
        }, util.secondsToTicks( 5 ) );
    }

    #updateArmorSlot( equipment, slot )
    {
        const item = equipment.getEquipment( slot );
        // const item = containerSlot.getItem();
        this.updateArmorSpell( item, slot );
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
     * @returns { string[] }
     */
    getActivateableSpells()
    {
        const ret = [];
        for ( let i = 0; i < this.#armorSpells.length; ++i )
        {
            const spell = this.#armorSpells[ i ];

            if ( spell != "" && ArmorSpells.hasActivateableEffect( getBaseSpellAndTier( spell ).baseSpell ) )
            {
                ret.push( spell );
            }
        }
        return ret;
    }

    /**
     * Set a given armor slot's spell
     * @param {ItemStack} armor
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
        for ( let i = 0; i < this.#callbacks.length; ++i )
        {
            if ( this.#callbacks[ i ] == null )
                continue;

            mc.system.clearRun( this.#callbacks[ i ] );
        }

        for ( let i = 0; i < this.#armorSpells.length; ++i )
        {
            if ( this.#armorSpells[ i ] == "" )
                continue;

            const { baseSpell } = getBaseSpellAndTier( this.#armorSpells[ i ] );

            if ( ArmorCallBacks.hasDestructor( baseSpell ) )
            {
                const destructor = ArmorCallBacks.getDestructionCallback( baseSpell );

                destructor( this.#entity );
            }
        }

        mc.system.run( () => {
            this.#entity.removeTag( EntityArmor.deadTag );
        })
        
        mc.system.clearRun( this.#entityCallBack );
    }

    entityDied()
    {
        this.#entity.addTag( EntityArmor.deadTag );
    }

    entityRespawned()
    {
        this.#entity.removeTag( EntityArmor.deadTag );
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

        const { baseSpell, tier } = getBaseSpellAndTier( this.#armorSpells[ index ] );

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
        for ( let i = 0; i < this.#armorSpells.length; ++i )
        {
            if ( i == ignoreIndex )
                continue;

            if ( this.#armorSpells[ i ].substring( 0, 10 ) == spell.substring( 0, 10 ) )
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

        const { baseSpell, tier } = getBaseSpellAndTier( lore );

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

    /** @type { string[] } */
    #armorSpells = ["", "", "", ""];
    /** @type { ( null | number )[] } */
    #callbacks = [null, null, null, null];
    /** @type { mc.Entity } */
    #entity;
    #entityCallBack = 0;
}

// EFFECTS

/**
 * @param {ArmorActivateEvent} event 
 * @param {number} spellTier 
 * @param {string[]} outputString 
 */
function reflect( event, spellTier, outputString )
{
    if ( event.source == null )
        return;

    const rand = Math.ceil( Math.random() * 100 );

    if ( spellTier * 7 < rand )
    {
        return;
    }

    util.addEffectToOutputString( outputString, spells.REFLECT );

    const dmg = util.roundToNearestTenth( event.damage * ( spellTier * 5 / 100 ) );

    io.print("Reflected: " + dmg.toString() );

    event.source.applyDamage( dmg );
}

/**
 * @param {ArmorActivateEvent} event 
 * @param {number} spellTier 
 * @param {string[]} outputString 
 */
function lastStand( event, spellTier, outputString )
{
    if ( !util.coolDownHasFinished( defendingEntity, spells.LASTSTAND ) )
    {
        return;
    }

    const health = event.target.getComponent( "health" );

    if ( health.current < 2.5 )
    {
        util.addEffectToOutputString( outputString, spells.LASTSTAND );
        event.target.runCommandAsync( "effect @s strength 10 0" );
        event.target.runCommandAsync( "effect @s absorption 10 4 true" );
        event.target.runCommandAsync( "effect @s regeneration 2 0 true" );
        startCoolDown( event.target, spells.LASTSTAND, 120 );
    }
}

ArmorSpells.addEffect( spells.REFLECT, reflect );
ArmorSpells.addEffect( spells.LASTSTAND, lastStand );

// CALLBACKS

function createImmunity( entity, spellTier )
{
    return mc.system.runInterval( () =>
    {
        if ( entity.getEffect( 'poison' ) != undefined )
        {
            const rand = Math.random();
            if ( rand < spellTier / 15 )
                entity.runCommandAsync( "effect @s poison 0" );
        }
    }, util.secondsToTicks( 1.5 ) );
}

function createExtinguish( entity, spellTier )
{
    return mc.system.runInterval( () =>
    {
        if ( entity.getComponent( "minecraft:onfire" ) == undefined )
            return;
        const rand = Math.random();
        if ( rand < spellTier / 15 )
        {
            entity.extinguishFire( false );
        }
    }, util.secondsToTicks( 1 ) );
}

function createIntimidation( entity, spellTier )
{
    const range = Math.floor( spellTier / 3 ) + 3;
    const dimension = entity.dimension;
    return mc.system.runInterval( () =>
    {
        const entities = dimension.getEntities({ location: entity.location, maxDistance: range, excludeFamilies: ["inanimate"], excludeTypes: ["item"] });
        for ( let i = 0; i < entities.length; ++i )
        {
            if ( entities[ i ].id == entity.id )
                continue;

            entities[ i ].runCommandAsync( `effect @s weakness ${ Math.ceil( spellTier / 2 ) } ${ Math.floor( spellTier / 3 ) }` );
            entities[ i ].runCommandAsync( `effect @s nausea ${ Math.ceil( spellTier / 2 ) } ${ Math.floor( spellTier / 3 ) }`);
            entities[ i ].runCommandAsync( `effect @s slowness ${ Math.ceil( spellTier / 2 ) } 0`);
        }
    }, util.secondsToTicks( 10 ) )
}

function createSteadfast( entity, spellTier )
{
    entity.runCommandAsync( "effect @s resistance 9999 0 true" );
    return null;
}
function destroySteadfast( entity )
{
    entity.runCommandAsync( "effect @s resistance 0" );
}

function createResilience( entity, spellTier )
{
    const amplifier = Math.ceil( spellTier / 2 ) - 1;
    entity.runCommandAsync( "effect @s health_boost 9999 " + amplifier.toString() + " true" );
    entity.runCommandAsync( "effect @s regeneration 1 9 true" );
    return null;
}
function destroyResilience( entity )
{
    entity.runCommandAsync( "effect @s health_boost 0" );
}

function createLeaping( entity, spellTier )
{
    entity.runCommandAsync( "effect @s jump_boost 9999 1 true" );
    return null;
}
function destroyLeaping( entity )
{
    entity.runCommandAsync( "effect @s jump_boost 0" );
}

function createStampede( entity, spellTier )
{
    let lastSwiftness = 0;

    return mc.system.runInterval( () =>
    {
        const velocity = entity.getVelocity();
        if ( entity.isSprinting == false || ( Math.abs( velocity.x ) < 0.19 && Math.abs( velocity.z ) < 0.19 ) )
        {
            lastSwiftness = -1;
            entity.runCommandAsync( "effect @s speed 0" );
        }
        else
        {
            if ( lastSwiftness >= 0 )
                entity.runCommandAsync( "effect @s speed 10 " + lastSwiftness + " true" );
            if ( lastSwiftness < 2 && !entity.hasTag( "stampcooldown" ) )
            {
                entity.addTag( "stampcooldown" );
                mc.system.runTimeout( () =>
                {
                    entity.removeTag( "stampcooldown" );
                    ++lastSwiftness;
                }, util.secondsToTicks( 3 ) );
            }
        }                              
    }, 30 );
}
function destroyStampede( entity )
{
    entity.runCommandAsync("effect @s speed 0");
    entity.removeTag("stampcooldown");
}

ArmorCallBacks.addCallBack( spells.IMMUNITY, new ArmorCallBack( createImmunity ) );
ArmorCallBacks.addCallBack( spells.EXTINGUISH, new ArmorCallBack( createExtinguish ) );
ArmorCallBacks.addCallBack( spells.INTIMIDATION, new ArmorCallBack( createIntimidation ) );
ArmorCallBacks.addCallBack( spells.STEADFAST, new ArmorCallBack( createSteadfast, destroySteadfast ) );
ArmorCallBacks.addCallBack( spells.RESILIENCE, new ArmorCallBack( createResilience, destroyResilience ) );
ArmorCallBacks.addCallBack( spells.LEAPING, new ArmorCallBack( createLeaping, destroyLeaping ) );
ArmorCallBacks.addCallBack( spells.STAMPEDE, new ArmorCallBack( createStampede ) );
