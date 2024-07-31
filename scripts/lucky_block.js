import * as mc from "@minecraft/server"
import * as sets from './sets/sets.js'
import { print } from "./print.js";

function loadDragonSlayerBow( player, blockLocation )
{
    player.runCommandAsync( `structure load tench:DragonSlayerBow ${blockLocation.x} ${blockLocation.y} ${blockLocation.z}`);
}

function loadDragonSlayerHelmet( player, blockLocation )
{
    player.runCommandAsync( `structure load tench:DragonSlayerHelmet ${blockLocation.x} ${blockLocation.y} ${blockLocation.z}`);
}

function loadDragonSlayerChestplate( player, blockLocation )
{
    player.runCommandAsync( `structure load tench:DragonSlayerChest ${blockLocation.x} ${blockLocation.y} ${blockLocation.z}`);
}

function loadDragonSlayerLeggings( player, blockLocation )
{
    player.runCommandAsync( `structure load tench:DragonSlayerLegs ${blockLocation.x} ${blockLocation.y} ${blockLocation.z}`);
}

function loadDragonSlayerBoots( player, blockLocation )
{
    player.runCommandAsync( `structure load tench:DragonSlayerBoots ${blockLocation.x} ${blockLocation.y} ${blockLocation.z}`);
}

function loadDragonSlayerSword( player, blockLocation )
{
    player.runCommandAsync( `structure load tench:DragonSlayerSword ${blockLocation.x} ${blockLocation.y} ${blockLocation.z}`);
}

/**
 * @param {mc.Player} player
 * @param {mc.Vector3} blockLocation
 */
function loadRandomArmorFromSets( player, blockLocation )
{
    print("random set piece");

    let rand = Math.round( Math.random() * 100 );

    const get2RandomPieces = rand > 50;

    const armorSets = sets.ArmorSets.sets;

    for ( let i = 0; i < 1 + get2RandomPieces; ++i )
    {
        const randomSet = armorSets[ rand % armorSets.length ];

        const randomItem = randomSet.items[ rand % randomSet.items.length ];

        player.dimension.spawnItem( randomItem, blockLocation );

        rand = Math.round( Math.random() * 100 );
    }    
}

function explode( player, blockLocation )
{
    const radius = ( Math.random() * 25 + 20 ) / 3;
    player.dimension.createExplosion( blockLocation, radius );
}

function deathPit( player, blockLocation )
{
    player.runCommandAsync('fill ~-1 ~ ~-1 ~1 -63 ~1 air hollow');
}

function awkwardSheep( player, blockLocation )
{
    player.runCommandAsync(`structure load AwkwardSheep ${blockLocation.x} ${blockLocation.y-1} ${blockLocation.z-2}`);
}

function obsidianTrap( player, blockLocation )
{
    const playerPosition = player.location;
    player.runCommandAsync(`structure load ObsidianTrap ${playerPosition.x-1} ${playerPosition.y-1} ${playerPosition.z-1}`);
}

function spawnLoot( player, blockLocation )
{
    player.runCommandAsync(`loot spawn ${blockLocation.x} ${blockLocation.y} ${blockLocation.z} loot lucky_block_dummy`);
}

class BlockBreakEffect
{
    /**
     * @param { ( player: mc.Player, blockLocation: mc.Vector3 ) => void } effect 
     * @param { number } weight 
     */
    constructor( effect, weight )
    {
        this.effect = effect;
        this.weight = weight;
    }

    /** @type { ( player: mc.Player, blockLocation: mc.Vector3 ) => void } */
    effect;

    /** @type { number } */
    weight;
}

const breakEffects = [
    new BlockBreakEffect( loadDragonSlayerBow, 1 ),
    new BlockBreakEffect( loadDragonSlayerHelmet, 1 ),
    new BlockBreakEffect( loadDragonSlayerChestplate, 1 ),
    new BlockBreakEffect( loadDragonSlayerLeggings, 1 ),
    new BlockBreakEffect( loadDragonSlayerBoots, 1 ),
    new BlockBreakEffect( loadDragonSlayerSword, 1 ),
    new BlockBreakEffect( loadRandomArmorFromSets, 55 ),
    new BlockBreakEffect( explode, 50 ),
    new BlockBreakEffect( deathPit, 58 ),
    new BlockBreakEffect( awkwardSheep, 10 ),
    new BlockBreakEffect( obsidianTrap, 43 ),
    new BlockBreakEffect( spawnLoot, 500 ),
];

const totalWeight = breakEffects.reduce( (prev, curr) => {
        prev.weight = prev.weight + curr.weight;
        return prev;
    }, new BlockBreakEffect(null, 0) ).weight;

/**
 * @param { mc.Player } player 
 * @param { mc.Vector3 } position 
 */
export function breakLuckyBlock( player, position )
{
    let random = Math.round( Math.random() * totalWeight - 1 );

    let i = 0;

    for ( ; i < breakEffects.length; ++i )
    {
        random -= breakEffects[ i ].weight;

        if ( random <= 0 )
            break;
    }

    i = Math.min( i, breakEffects.length - 1 );

    breakEffects[ i ].effect( player, position );
}