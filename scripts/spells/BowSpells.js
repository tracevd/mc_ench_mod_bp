import * as spells from './spells.js';
import * as util from './util.js';

import * as mc from '@minecraft/server';

import { WeaponEvent, BowReleaseEvent, ProjectileHitBlockEvent } from './events.js';
import { print } from '../print.js';

import { Vector } from '../Vector.js'
import { StringRef } from '../StringRef.js';

export class BowEffects
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

    static activateEffect( name, event, spelltier, outputString )
    {
        const effect = BowEffects.getEffect( name );

        if ( effect == null )
            return;
        
        effect( event, spelltier, outputString );
    }

    static getEffect( name )
    {
        return BowEffects.#effects.get( name );
    }
}

/**
 * @param { WeaponEvent } event 
 * @param { number } spelltier 
 * @param { StringRef } outputString 
 */
function sharpenedArrows( event, spellTier, outputString )
{
    if ( event.sourceIsCorrupted )
        return 0;

    const rand = Math.random();

    if ( rand < 0.5 )
        return 0;

    outputString.addWithNewLine( spells.SHARPENED_BOW );

    const damageAdded = spellTier / 10 * event.damage;

    util.applyDamage( event.target, damageAdded, event.source );

    return damageAdded;
}

/**
 * @param { mc.Block } blockToFreeze 
 */
function freezeBlock( blockToFreeze )
{
    if ( blockToFreeze.isAir )
    {
        blockToFreeze.setType("powder_snow");
        return true;
    }
    if ( blockToFreeze.isLiquid )
    {
        if ( blockToFreeze.typeId.includes("water") )
        {
            blockToFreeze.setType("ice");
            return true;
        }
        else if ( blockToFreeze.typeId.includes("lava") )
        {
            blockToFreeze.setType('cobblestone');
            return true;
        }
    }
    return false;
}

/**
 * @param { WeaponEvent } event 
 * @param { number } spelltier 
 * @param { StringRef } outputString 
 */
function freezingEntity( event, spelltier, outputString )
{
    if ( !event.reflected && event.sourceIsCorrupted )
        return 0;

    if ( !util.coolDownHasFinished(event.source, spells.FREEZING ) )
        return 0;

    let blockAtHead = null;

    try
    {
        blockAtHead = event.target.dimension.getBlock( event.target.location );
    }
    catch
    {
        return 0;
    }

    if ( blockAtHead != null && freezeBlock( blockAtHead ) )
    {
        if ( !event.reflected )
            outputString.addWithNewLine( spells.FREEZING );

        if ( !event.reflected )
            makeReflectable( event, spells.FREEZING, spelltier );

        util.startCoolDown( event.source, spells.FREEZING, 12 );
    }

    return 0;
}

import { levitating, lightning, unbreakable } from "./WeaponSpells.js";
import { makeReflectable } from './reflectable.js';

BowEffects.addEffect( spells.SHARPENED_BOW,  sharpenedArrows );
BowEffects.addEffect( spells.LEVITATING_BOW, levitating );
BowEffects.addEffect( spells.LIGHTNING_BOW,  lightning );
BowEffects.addEffect( spells.UNBREAKABLE,    unbreakable );
BowEffects.addEffect( spells.FREEZING,       freezingEntity );

export class BowReleaseEffects
{
    /** @type { Map< string, (event, spelltier, outputString) => void } > */
    static #effects = new Map();

    /**
     * @param {(event, spelltier, outputString) => void} activationFunc 
     */
    static addEffect( name, activationFunc )
    {
        this.#effects.set( name, activationFunc );
    }

    /**
     * @param { string } name 
     */
    static getEffect( name )
    {
        return this.#effects.get( name );
    }
}

/**
 * @param { BowReleaseEvent } event 
 * @param { number } spelltier 
 * @param { StringRef } outputString 
 */
function velocity( event, spellTier, outputString )
{
    if ( event.projectile == null )
    {
        print("Null projectile", event.source);
        return;
    }

    if ( util.isCorrupted( event.source ) )
    {
        return;
    }

    const velocity = event.projectile.getVelocity();

    const normalized = Vector.normalize( velocity );

    event.projectile.applyImpulse( Vector.multiply( normalized, ( spellTier + 1 ) * 1.5 ) );

    outputString.addWithNewLine( spells.VELOCITY );
}

/**
 * @param { BowReleaseEvent } event 
 * @param { number } spelltier 
 * @param { StringRef } outputString 
 */
function aimbot( event, spellTier, outputString )
{
    const inSight = event.source.getEntitiesFromViewDirection();

    while ( inSight.length > 0 && inSight[ 0 ].entity.typeId.includes("arrow") )
    {
        inSight.shift();
    }

    if ( inSight.length == 0 || inSight[ 0 ].entity == null )
    {
        return;
    }

    const _targetId = inSight[ 0 ].entity.id;
    const _arrowId  = event.projectile.id;

    const assistStrength = spellTier * 0.15;

    let func;

    let currentTick = mc.system.currentTick;
    const startTick = currentTick - 1;

    func = () => {
        try
        {
            if ( mc.system.currentTick <= currentTick )
            {
                mc.system.run( func );
                return;
            }

            currentTick = mc.system.currentTick;

            const arrow = mc.world.getEntity( _arrowId );

            if ( arrow == null )
            {
                return;
            }

            const target = mc.world.getEntity( _targetId );

            if ( target == null )
            {
                return;
            }

            const direction = Vector.normalize( Vector.subtract( target.getHeadLocation(), arrow.location ) );

            const arrowCurrentDirection = Vector.normalize( arrow.getVelocity() );

            const veloMagnitude = Vector.magnitude( arrow.getVelocity() );

            arrow.applyImpulse(
                Vector.add(
                    Vector.multiply(
                        Vector.subtract(
                            direction,
                            arrowCurrentDirection
                        ),
                        assistStrength / ( currentTick - startTick )
                    ),
                    // counteract gravity
                    { x: 0, y: 0.01 * veloMagnitude, z: 0 }
                )
            );

            if ( arrow == null || !arrow.isValid() || veloMagnitude < 0.1 || target == null || !target.isValid() )
            {
                return;
            }

            mc.system.run( func );
        }
        catch ( e )
        {
            print( e, event.source );
        }
    }

    mc.system.run( func );

    outputString.addWithNewLine( spells.AIMBOT );
}

BowReleaseEffects.addEffect( spells.VELOCITY,    velocity );
BowReleaseEffects.addEffect( spells.AIMBOT,      aimbot );
BowReleaseEffects.addEffect( spells.UNBREAKABLE, unbreakable );

import { isBow } from '../util.js';

/**
 * Parses the bow spells on the bow currently in the player's main hand.
 * Only parses effects that activate on entity hit.
 * @param { mc.Player } player 
 * @param { mc.Entity } hitEntity 
 * @param { number } damage The amount of damage done to the hitEntity
 * @returns { string[] } spells activated that are reflectable
 */
export function activateBowHitEntitySpells( player, hitEntity, damage )
{
    if ( util.isCorrupted( player ) )
    {
        return [];
    }

    if ( !hitEntity.isValid() )
    {
        mc.world.sendMessage("Invalid entity");
        return [];
    }

    const equip = player.getComponent( mc.EntityComponentTypes.Equippable );

    if ( equip == null )
    {
        return [];
    }

    const item = equip.getEquipment( mc.EquipmentSlot.Mainhand );

    if ( item == undefined )
        return [];

    if ( !isBow( item ) )
        return [];
    
    /** @type { string[] } */
    const lore = item.getLore();

    if ( lore.length == 0 || lore[ 0 ] == undefined )
    {
        return [];
    }

    const outputString = new StringRef();

    let extraDamage = 0;

    const event = new WeaponEvent( hitEntity, player, damage, util.isCorrupted( player ) );

    for ( let i = 0; i < lore.length; ++i )
    {
        const { baseSpell, tier } = util.getBaseSpellAndTier( lore[ i ] );

        const effect = BowEffects.getEffect( baseSpell );

        if ( effect == null )
        {
            continue;
        }

        extraDamage += effect( event, tier, outputString );
    }

    if ( outputString.length > 0 && player instanceof mc.Player )
    {
        player.onScreenDisplay.setActionBar( outputString.str );
    }

    return event.reflectableSpells;
}

/**
 * Activates any bow spells on the bow in the source's main hand
 * that activate on release of a projectile.
 * 
 * If the item is not a bow, this does nothing.
 * 
 * Effects do not activate if the player is corrupted.
 * @param { mc.Entity } source 
 * @param { mc.ItemStack } item
 * @param { mc.Entity } projectile
 */
export function activateBowReleaseSpells( source, item, projectile )
{
    if ( !item.typeId.includes("bow") )
        return;

    if ( util.isCorrupted( source ) )
    {
        return;
    }

    const lore = item.getLore();

    const outputString = new StringRef();

    const event = new BowReleaseEvent( source, projectile );

    for ( let i = 0; i < lore.length; ++i )
    {
        const { baseSpell, tier } = util.getBaseSpellAndTier( lore[ i ] );

        const effect = BowReleaseEffects.getEffect( baseSpell );

        if ( effect == null )
            continue;

        effect( event, tier, outputString );
    }

    if ( outputString.length > 0 && source instanceof mc.Player )
    {
        source.onScreenDisplay.setActionBar( outputString.str );
    }
}

export class ArrowHitBlockEffects
{
    /** @type { Map< string, ( player, hitBlock, spellTier, outputString ) => void } > */
    static #effects = new Map();

    /**
     * @param { ( player, hitBlock, spellTier, outputString ) => void } activationFunc 
     */
    static addEffect( name, activationFunc )
    {
        this.#effects.set( name, activationFunc );
    }

    /**
     * @param { string } name 
     */
    static getEffect( name )
    {
        return this.#effects.get( name );
    }
}

/**
 * @param { ProjectileHitBlockEvent } event
 * @param { number } spellTier
 * @param { StringRef } outputString
 */
function magneticArrows( event, spellTier, outputString )
{
    const item = event.player.getComponent( mc.EntityComponentTypes.Equippable ).getEquipment( mc.EquipmentSlot.Mainhand );
    const enchantments = item.getComponent( mc.ItemComponentTypes.Enchantable );

    if ( enchantments != null && enchantments.hasEnchantment('infinity') )
    {
        return;
    }

    event.projectile.remove();

    const inv = event.player.getComponent( mc.EntityComponentTypes.Inventory );

    if ( inv.container )
    {
        inv.container.addItem( new mc.ItemStack("minecraft:arrow", 1 ) );
    }    
}

/**
 * @param { ProjectileHitBlockEvent } event
 * @param { number } spellTier
 * @param { StringRef } outputString
 */
function freezingBlock( event, spellTier, outputString )
{
    if ( util.isCorrupted( event.player ) )
        return;
    if ( !util.coolDownHasFinished( event.player, spells.FREEZING ) )
        return;

    let direction = "";

    switch ( event.blockHit.face )
    {
    case mc.Direction.Down:
        direction = "below";
        break;
    case mc.Direction.East:
        direction = "east";
        break;
    case mc.Direction.North:
        direction = "north";
        break;
    case mc.Direction.South:
        direction = "south";
        break;
    case mc.Direction.Up:
        direction = "above";
        break;
    case mc.Direction.West:
        direction = "west";
        break;
    }

    /** @type { mc.Block | undefined } */
    const blockToFreeze = event.blockHit.block[direction]();

    if ( blockToFreeze != null && freezeBlock( blockToFreeze ) )
    {
        outputString.addWithNewLine( spells.FREEZING );
        util.startCoolDown( event.player, spells.FREEZING, 5 );
    }
}

ArrowHitBlockEffects.addEffect( spells.MAGNETIC_ARROWS, magneticArrows );
ArrowHitBlockEffects.addEffect( spells.FREEZING,        freezingBlock );

/**
 * Parses the bow spells on the bow currently in the player's main hand.
 * Only parses effects that activate on block hit.
 * @param { mc.Player } player
 * @param { mc.BlockHitInformation } hitBlock
 */
export function activateBowHitBlockSpells( player, projectile, hitBlock )
{
    if ( util.isCorrupted( player ) )
    {
        return;
    }

    const equip = player.getComponent( mc.EntityComponentTypes.Equippable );

    if ( equip == null )
    {
        return;
    }

    const item = equip.getEquipment( mc.EquipmentSlot.Mainhand );

    if ( item == undefined )
        return;

    if ( !item.typeId.endsWith("bow") )
        return;
    
    const lore = item.getLore();

    if ( lore.length == 0 || lore[ 0 ] == undefined )
    {
        return;
    }

    const outputString = new StringRef();

    const event = new ProjectileHitBlockEvent( player, projectile, hitBlock );

    for ( let i = 0; i < lore.length; ++i )
    {
        const { baseSpell, tier } = util.getBaseSpellAndTier( lore[ i ] );

        const effect = ArrowHitBlockEffects.getEffect( baseSpell );

        if ( effect == null )
        {
            continue;
        }

        effect( event, tier, outputString );
    }

    if ( outputString.length > 0 && player instanceof mc.Player )
    {
        player.onScreenDisplay.setActionBar( outputString.str );
    }
}