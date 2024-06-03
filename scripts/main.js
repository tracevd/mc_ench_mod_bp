import * as mc from "@minecraft/server"

import * as util from "./util"

import { showNecromancyTable, itemIsArmor, parseArmorSpells, parseWeaponSpells, parseBowSpells, createArmorChecker, removeArmorChecker, entityDied, entityRespawned, releaseProjectile, parsePickaxeSpells } from "./necromancy_table";

import * as spells from "./spells/spells";

import { RED } from "./spells/spell_constants";

/**
 * Adds a health counter to the player underneath their nametag
 * @param {mc.Entity} entity
 */
function updateHealthDisplay( entity )
{
    if ( !(entity instanceof mc.Player) )
    {
        return;
    }
    
    const health = entity.getComponent("health");

    if ( health == null )
    {
        return;
    }

    const heart = "♥";

    const heartStr = RED + ( Math.ceil( health.currentValue ) / 2 ) + heart + spells.RESET;

    let nameTag = entity.nameTag;

    if ( nameTag.length == 0 || nameTag.length == heartStr.length + 1 )
    {
        nameTag = entity.name;
    }

    const separator = '\n';

    const separatorIdx = nameTag.indexOf( separator );

    const newNameTag = nameTag.substring( 0, separatorIdx == -1 ? undefined : separatorIdx ) + separator + heartStr;

    entity.nameTag = newNameTag;
}

mc.system.beforeEvents.watchdogTerminate.subscribe( e =>
{
    e.cancel = true;
    console.warn( e.terminateReason.stackOverflow );
});

// mc.system.runInterval(() =>
// {
//     const dimension = mc.world.getDimension("minecraft:overworld");
//     const arrows = dimension.getEntities({ type: "minecraft:arrow" });
//     arrows.forEach(arrow => {
//         const nearestPlayers = dimension.getPlayers({ closest: 1, location: arrow.location });
//         if ( nearestPlayers.length > 0 )
//         {
//             const nearestPlayer = nearestPlayers[ 0 ];
//             const playerLocation = nearestPlayer.getHeadLocation();
//             playerLocation.y -= 0.5;
//             const direction = mc.Vector.add( mc.Vector.subtract( playerLocation, arrow.location ).normalized(), new mc.Vector(0, 0.1, 0) );
//             arrow.applyImpulse( mc.Vector.multiply( direction, 0.8 ) );
//         }
//     });
// });

mc.world.afterEvents.entityDie.subscribe( e =>
{
    if ( e.deadEntity == undefined )
        return;

    if ( e.deadEntity )
    {
        entityDied( e.deadEntity );
    }

    if ( !e.deadEntity.typeId.includes('ender_dragon') )
        return;

    try
    {
        const dragonPosition = e.deadEntity.location;

        e.deadEntity.dimension.runCommandAsync(`loot spawn ${dragonPosition.x} ${dragonPosition.y} ${dragonPosition.z} loot dragon_kill`);
    }
    catch ( error )
    {
        util.print( e.deadEntity.typeId );
    }     
});

import { ArmorActivateEvent } from "./spells/Events.js";
import { isCorrupted, roundToNearestTenth } from './spells/util.js';

mc.world.afterEvents.entityHurt.subscribe( e =>
{
    const cause = e.damageSource.cause;

    if ( cause == mc.EntityDamageCause.thorns || cause == mc.EntityDamageCause.entityExplosion )
        return;

    const wasProjectile = cause == mc.EntityDamageCause.projectile;

    let activation = null;
    
    if ( e.hurtEntity != undefined )
    {
        activation = parseArmorSpells( e.hurtEntity, e.damageSource.damagingEntity, e.damage, wasProjectile );
    }

    let evaded = false;

    if ( activation != null )
    {
        if ( activation.evasionEffect != null )
        {
            const event = new ArmorActivateEvent( e.hurtEntity, e.damageSource.damagingEntity, e.damage, isCorrupted( e.damageSource.damagingEntity ), [], wasProjectile );

            activation.evasionEffect( event, activation.evasionLevel, activation.popup_str );

            evaded = event.evaded;
        }
    }

    let reflectable = [];

    if ( !evaded && e.damageSource.damagingEntity != undefined )
    {
        if ( wasProjectile )
        {
            reflectable = parseBowSpells( e.damageSource.damagingEntity, e.hurtEntity, e.damage );
        }
        else
        {
            reflectable = parseWeaponSpells( e.damageSource.damagingEntity, e.hurtEntity, e.damage );
        }
    }

    if ( !evaded && activation != null )
    {
        if ( activation.reflectEffect != null )
        {
            const event = new ArmorActivateEvent( e.hurtEntity, e.damageSource.damagingEntity, e.damage, isCorrupted( e.damageSource.damagingEntity ), reflectable, wasProjectile );

            activation.reflectEffect( event, activation.reflectLevel, activation.popup_str );
        }
    }

    if ( activation != null && activation.popup_str[ 0 ].length > 0 && e.hurtEntity instanceof mc.Player )
    {
        e.hurtEntity.onScreenDisplay.setActionBar( activation.popup_str[ 0 ] );
    }

    updateHealthDisplay( e.hurtEntity );
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

import { calculateDistance } from "./shockwave";

mc.world.beforeEvents.itemUseOn.subscribe( e =>
{
    if ( !( e.source instanceof mc.Player ) )
        return;

    if ( calculateDistance( e.source.location, e.block.location ) > 20 )
        return;

    const block = e.block;
    const isNecTable = block.typeId == "ench:necromancy_table";

    if ( isNecTable && e.itemStack != undefined )
    {
        e.cancel = true;
        mc.system.run(() =>
        {
            showNecromancyTable( e.source, e.itemStack );
        });
    }
});

mc.world.beforeEvents.itemUse.subscribe( e =>
{
    const item = e.itemStack;

    const block = e.source.getBlockFromViewDirection();

    if ( block == undefined || block.block == undefined )
        return;

    if ( calculateDistance( e.source.location, block.block.location ) > 20 )
        return;

    if ( block.block.typeId.includes("ench:necro") && ( itemIsArmor( item ) || item.typeId == "minecraft:bow" ) )
    {
        e.cancel = true;
        return;
    }
    
});

mc.world.afterEvents.entityHealthChanged.subscribe( e =>
{
    updateHealthDisplay( e.entity );
});

mc.world.afterEvents.playerSpawn.subscribe( e =>
{
    if ( e.initialSpawn )
    {
        createArmorChecker( e.player );
    }
    else
    {
        entityRespawned( e.player );
    }

    updateHealthDisplay( e.player );
});

mc.world.beforeEvents.playerLeave.subscribe( e =>
{
    removeArmorChecker( e.player );
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

    releaseProjectile( e.source, e.itemStack, arrow );
});

mc.world.afterEvents.projectileHitBlock.subscribe( e =>
{
    if ( e.source == null || !e.source.isValid() )
        return;

    const equip = e.source.getComponent("minecraft:equippable");

    if ( equip == null )
        return;

    const mainhand = equip.getEquipment( mc.EquipmentSlot.Mainhand );

    if ( mainhand == null )
    {
        return;
    }

    if ( !mainhand.typeId.includes('bow') )
        return;

    const magnetic = mainhand.getLore().filter( v => v.includes( spells.MAGNETIC_ARROWS ) );

    if ( magnetic.length == 0 )
        return;

    const enchComp = mainhand.getComponent("enchantments");

    if ( enchComp != null && enchComp.enchantments.hasEnchantment('infinity') )
    {
        return;
    }

    e.projectile.remove();

    const inv = e.source.getComponent("minecraft:inventory");

    inv.container.addItem( new mc.ItemStack("minecraft:arrow", 1 ) );
});

import { breakLuckyBlock } from "./luckyblock";

mc.world.afterEvents.playerBreakBlock.subscribe( e =>
{
    if ( e.itemStackBeforeBreak != null )
    {
        const dur = e.itemStackBeforeBreak.getComponent("durability");

        if ( dur != null )
        {
            if ( dur.damage > 0 )
            {
                dur.damage = 0;
                const equip = e.player.getComponent("equippable");
                equip.setEquipment( mc.EquipmentSlot.Mainhand, e.itemStackBeforeBreak );
            }
        }
    }

    if ( !e.brokenBlockPermutation.type.id.includes('lucky') )
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

import { runCommand } from "./commands";

mc.world.beforeEvents.chatSend.subscribe( e =>
{
    const message = e.message;

    if ( !message.startsWith('.') )
    {
        return;
    }

    e.cancel = true;

    runCommand( e.sender, e.message ); 
});
