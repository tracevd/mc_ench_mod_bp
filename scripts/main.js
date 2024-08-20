import * as mc from "@minecraft/server"

import * as io from "./print.js"
import * as state from "./world_state.js";

import { activateArmorSpells } from "./spells/ArmorSpells.js";
import { activateWeaponSpells } from "./spells/WeaponSpells.js";
import { activateBowHitBlockSpells, activateBowHitEntitySpells, activateBowReleaseSpells } from "./spells/BowSpells.js";
import { parsePickaxeSpells } from "./spells/PickaxeSpells.js";

import { breakLuckyBlock } from "./lucky_block.js";

mc.system.beforeEvents.watchdogTerminate.subscribe( e =>
{
    e.cancel = true;
    console.warn( e.terminateReason.stackOverflow );
});

mc.world.beforeEvents.worldInitialize.subscribe( e =>
{    
    state.initializeWorld( e.blockComponentRegistry, e.itemComponentRegistry );
});

mc.world.afterEvents.worldInitialize.subscribe( e =>
{
    state.runPlayerUpdateLoop();
});

import { updateHealthDisplay } from "./health_display.js";

mc.world.afterEvents.entityHealthChanged.subscribe( e =>
{
    updateHealthDisplay( e.entity );
});

import { ArmorActivateEvent } from "./spells/events.js";
import { isCorrupted } from './spells/util.js';

mc.world.afterEvents.entityHurt.subscribe( e =>
{
    const cause = e.damageSource.cause;

    if ( cause == mc.EntityDamageCause.thorns || cause == mc.EntityDamageCause.entityExplosion )
        return;

    const wasProjectile = cause == mc.EntityDamageCause.projectile;

    const activation = activateArmorSpells( e.hurtEntity, e.damageSource.damagingEntity, e.damage, wasProjectile );

    // attacks can be evaded (assuming the defending entity has evasion)
    // so, if the evasion works, then the attacking entity doesn't activate
    // any of their spells
    let evaded = false;

    if ( activation != null && activation.evasionEffect != null )
    {
        const event = new ArmorActivateEvent( e.hurtEntity, e.damageSource.damagingEntity, e.damage, isCorrupted( e.damageSource.damagingEntity ), [], wasProjectile );

        activation.evasionEffect( event, activation.evasionLevel, activation.outputString );

        evaded = event.evaded;
    }

    // many weapon effects can be reflected, such that they happen
    // to the attacker in addition to the defending entity, assuming
    // the defending entity as the "reflect" spell on their armor

    /** @type { string[] } */
    let reflectable = [];

    // if they evaded the attack, don't activate spells for the attacker
    if ( !evaded && e.damageSource.damagingEntity != undefined )
    {
        if ( wasProjectile )
        {
            reflectable = activateBowHitEntitySpells( e.damageSource.damagingEntity, e.hurtEntity, e.damage );
        }
        else
        {
            reflectable = activateWeaponSpells( e.damageSource.damagingEntity, e.hurtEntity, e.damage );
        }
    }

    
    if ( !evaded && activation != null && activation.reflectEffect != null )
    {
        const event = new ArmorActivateEvent( e.hurtEntity, e.damageSource.damagingEntity, e.damage, isCorrupted( e.damageSource.damagingEntity ), reflectable, wasProjectile );

        activation.reflectEffect( event, activation.reflectLevel, activation.outputString );
    }

    if ( activation != null && activation.outputString.length > 0 && e.hurtEntity instanceof mc.Player )
    {
        e.hurtEntity.onScreenDisplay.setActionBar( activation.outputString.str );
    }
});

import { tryToRepairUnbreakableGear } from "./util.js";

mc.world.afterEvents.entityHurt.subscribe( e =>
{
    tryToRepairUnbreakableGear( e.hurtEntity );
    if ( e.damageSource.damagingEntity )
    {
        tryToRepairUnbreakableGear( e.damageSource.damagingEntity );
    }
});

mc.world.afterEvents.projectileHitBlock.subscribe( e =>
{
    if ( e.source == null || !e.source.isValid() )
        return;

    activateBowHitBlockSpells( e.source, e.projectile, e.getBlockHit() );
});

mc.world.afterEvents.projectileHitEntity.subscribe( e =>
{
    const hitEntity = e.getEntityHit();

    if ( hitEntity.entity == undefined || e.source == undefined )
        return;

    if ( e.source instanceof mc.Player )
    {
        e.source.playSound("random.orb", { volume: 0.2, pitch: 0.5 });
    };
});

import { setOwner } from "./owner.js";

mc.world.afterEvents.playerSpawn.subscribe( e =>
{
    if ( e.initialSpawn )
    {
        if ( mc.world.getAllPlayers().length == 1 )
        {
            setOwner( e.player );
        }
    }
    else
    {
        state.playerRespawned( e.player );
    }

    updateHealthDisplay( e.player );
});

mc.world.afterEvents.entityDie.subscribe( e =>
{
    if ( e.deadEntity.typeId == "minecraft:player" )
    {
        state.playerDied( e.deadEntity );
    }
});

mc.world.beforeEvents.playerLeave.subscribe( e =>
{
    state.removePlayer( e.player );
});

mc.world.afterEvents.itemReleaseUse.subscribe( e =>
{
    const dimension = e.source.dimension;

    const entities = dimension.getEntities({ type: "minecraft:arrow", closest: 1, location: e.source.location });

    if ( entities.length == 0 )
    {
        return;
    }

    const arrow = entities[ 0 ];

    activateBowReleaseSpells( e.source, e.itemStack, arrow );
});

mc.world.afterEvents.playerBreakBlock.subscribe( e =>
{
    if ( e.itemStackBeforeBreak != null )
    {
        const dur = e.itemStackBeforeBreak.getComponent( mc.ItemComponentTypes.Durability );

        if ( dur != null && dur.damage > 0 )
        {
            dur.damage = 0;
            const equip = e.player.getComponent( mc.EntityComponentTypes.Equippable );
            equip.setEquipment( mc.EquipmentSlot.Mainhand, e.itemStackBeforeBreak );
        }
    }

    io.print( e.brokenBlockPermutation.type.id );

    if ( e.brokenBlockPermutation.type.id != "tench:lucky_block" )
        return;

    breakLuckyBlock( e.player, e.block.location );
});

mc.world.beforeEvents.playerBreakBlock.subscribe( e =>
{
    if ( e.itemStack != null && e.itemStack.typeId.includes('ickaxe') && e.itemStack.getLore().length > 0 )
    {
        e.cancel = parsePickaxeSpells( e.player, e.itemStack, e.block );
    }
})

import { runCommand } from "./commands/commands.js"

/**
 * @param { mc.ChatSendBeforeEvent } e 
 */
function runCommandIfStartsWithDot( e )
{
    if ( !e.message.startsWith('.') )
    {
        return;
    }

    e.cancel = true;

    runCommand( e.sender, e.message ); 
}

mc.world.beforeEvents.chatSend.subscribe( runCommandIfStartsWithDot );

/**
 * @param { mc.EntitySpawnAfterEvent } e 
 */
function increaseHostileMobSpawns( e )
{
    if ( e.cause != mc.EntityInitializationCause.Spawned )
        return;
    if ( !e.entity.matches({ families: ["monster"] }) )
        return;
    if ( e.entity.hasTag( "tench:mob_lock" ) )
        return;

    if ( Math.random() < 0.7 )
        return;

    const newEntity = e.entity.dimension.spawnEntity( e.entity.typeId, e.entity.location );
    newEntity.addTag( "tench:mob_lock" );
}

mc.world.afterEvents.entitySpawn.subscribe( increaseHostileMobSpawns );

// Entity teleporter
mc.world.afterEvents.itemUse.subscribe( e =>
{
    if ( e.itemStack.typeId != "minecraft:stick" || e.itemStack.nameTag == undefined || e.itemStack.nameTag != "teleporter" )
        return;

    const inView = e.source.getEntitiesFromViewDirection();

    if ( inView.length == 0 )
    {
        const blockInView = e.source.getBlockFromViewDirection({ includeLiquidBlocks: false, includePassableBlocks: false, maxDistance: 10 });

        if ( blockInView == null )
            return;

        const entityId = e.source.getDynamicProperty("tench:to_be_tped");

        if ( entityId == null )
            return;

        const entity = mc.world.getEntity( entityId );

        if ( entity == null )
        {
            io.print( "Could not teleport entity", e.source );
            e.source.setDynamicProperty( "tench:to_be_tped", null );
            return;
        }

        let direction = "";

        switch( blockInView.face )
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
        default:
            throw new Error("Unknown direction");
        }

        entity.teleport( blockInView.block[direction]().location, { dimension: e.source.dimension } );

        io.print( "Placing entity: " + entity.typeId );

        e.source.setDynamicProperty( "tench:to_be_tped", null );
        return;
    }

    const entity = inView[ 0 ].entity;

    io.print( "Found entity: " + entity.typeId );

    e.source.setDynamicProperty( "tench:to_be_tped", entity.id );
});
