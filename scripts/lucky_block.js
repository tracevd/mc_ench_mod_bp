import * as mc from "@minecraft/server"
import * as sets from './sets/sets.js'
import { print } from "./print.js";

/**
 * @param { mc.Player } player
 * @param { mc.Vector3 } blockLocation
 */
function loadRandomItemFromSets( player, blockLocation )
{
    print("random set piece");

    sets.SetPieces.getRandom().loadAt( blockLocation, player.dimension );

    if ( Math.random() > 0.5 )
    {
        sets.SetPieces.getRandom().loadAt( blockLocation, player.dimension );
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
    new BlockBreakEffect( loadRandomItemFromSets, 105 ),
    new BlockBreakEffect( explode, 50 ),
    new BlockBreakEffect( deathPit, 58 ),
    new BlockBreakEffect( awkwardSheep, 10 ),
    new BlockBreakEffect( obsidianTrap, 43 ),
    new BlockBreakEffect( spawnLoot, 500 ),
];

const totalWeight = ( () => {
    let weight = 0;
    for ( let i = 0; i < breakEffects.length; ++i )
    {
        weight += breakEffects[ i ].weight;
    }
    return weight;
} )();

/**
 * @param { mc.Player } player 
 * @param { mc.Vector3 } position 
 */
export function breakLuckyBlock( player, position )
{
    let random = Math.round( Math.random() * ( totalWeight - 1 ) );

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