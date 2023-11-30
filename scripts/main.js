import * as mc from "@minecraft/server"

import * as util from "./util"

import { showNecromancyTable, itemIsNotArmor, itemIsArmor, parseArmorSpells, parseWeaponSpells, parseBowSpells, parsePickaxeSpells, createArmorChecker, removeArmorChecker, entityDied, entityRespawned } from "./necromancy_table"

mc.system.beforeEvents.watchdogTerminate.subscribe( e =>
{
    e.cancel = true;
    console.warn( e.terminateReason.stackOverflow );
});

mc.world.afterEvents.entityDie.subscribe( e =>
{
    if ( e.deadEntity == undefined )
        return;

    if ( e.deadEntity )
    {
        entityDied( e.deadEntity );
    }

    if ( !e.deadEntity.typeId.includes('dragon') )
        return;

    const position = e.deadEntity.location;
    e.deadEntity.dimension.runCommandAsync(`loot spawn ${position.x} ${position.y} ${position.z} loot dragon_kill`);
});

mc.world.afterEvents.entityHurt.subscribe( e =>
{
    if ( e.damageSource.cause == "thorns" || e.damageSource.cause == "entityExplosion" )
        return;
    
    if ( e.damageSource.damagingEntity != undefined )
    {
        parseWeaponSpells( e.damageSource.damagingEntity, e.hurtEntity, e.damage );
    }
    if ( e.hurtEntity != undefined && e.hurtEntity instanceof mc.Entity )
    {
        parseArmorSpells( e.hurtEntity, e.damageSource.damagingEntity, e.damage );
    }
});

mc.world.afterEvents.projectileHitEntity.subscribe( e =>
{
    if ( e.getEntityHit() == undefined || e.source == undefined )
        return;

    if ( e.getEntityHit().entity instanceof mc.Entity
            && e.source instanceof mc.Player )
    {
        const soundOption = { volume: 0.2, pitch: 0.5, };
        e.source.playSound("random.orb", soundOption);
    };

    parseBowSpells( e.source, e.getEntityHit().entity );
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
        mc.system.run( () =>
        {
            showNecromancyTable( e.source, e.itemStack );
        } );
    }
});

mc.world.beforeEvents.itemUse.subscribe( e =>
{
    const item = e.itemStack;

    if ( item != undefined && item.typeId == "minecraft:experience_bottle" )
    {
        const inv = e.source.getComponent("inventory");
        const carpet = inv.container.getItem( 0 );
        const feather = inv.container.getItem( 1 );

        if ( carpet == undefined || feather == undefined )
            return;

        if ( carpet.typeId != "minecraft:white_carpet" || feather.typeId != "minecraft:feather" )
            return;

        e.source.runCommandAsync( "xp 50L" );
        return;
    }

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

mc.world.afterEvents.itemUse.subscribe( e =>
{
    if ( !( e.source instanceof mc.Player ) || itemIsNotArmor( e.itemStack ) )
        return;

    const item = e.itemStack;
    const player = e.source;

    equipArmorWithLore( player, item );
});

mc.world.afterEvents.playerSpawn.subscribe( e =>
{
    if ( e.initialSpawn )
    {
        createArmorChecker( e.player );
    }
    else
    {
        util.print("hello");
        entityRespawned( e.player );
    }
});

mc.world.beforeEvents.playerLeave.subscribe( e =>
{
    removeArmorChecker( e.player );
});

import { breakLuckyBlock } from "./luckyblock";

mc.world.afterEvents.playerBreakBlock.subscribe( e =>
{
    if ( e.itemStackBeforeBreak != null && e.itemStackBeforeBreak.typeId.includes('ickaxe') )
    {
        //parsePickaxeSpells( player, e.itemStackBeforeBreak, e.block.location );
    }

    if ( !e.brokenBlockPermutation.type.id.includes('lucky') )
        return;

    breakLuckyBlock( e.player, e.block.location );
});
