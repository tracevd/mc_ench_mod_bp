import * as mc from "@minecraft/server"
import * as sets from './sets/sets.js'

function loadDragonSlayerStuff( player, position, rand )
{
    // rand max is .37
    let command = "structure load ench:DragonSlayer";
    if ( rand < 0.06 )
    {
        command += 'Bow';
    }
    else if ( rand < 0.12 )
    {
        command += 'Helmet';
    }
    else if ( rand < 0.18 )
    {
        command += 'Chest';
    }
    else if ( rand < 0.24 )
    {
        command += 'Legs';
    }
    else if ( rand < 0.30 )
    {
        command += 'Boots';
    }
    else
    {
        command += 'Sword';
    }

    player.runCommandAsync( command + ` ${position.x} ${position.y} ${position.z}`);
}

/**
 * @param {mc.Player} player
 * @param {mc.Vector3} blockLocation
 */
function loadRandomArmorFromSets( player, blockLocation )
{
    const rand = Math.round( Math.random() * 100 );

    const armorSets = sets.ArmorSets.sets;

    const randomSet = armorSets[ rand % armorSets.length ];

    const randomItem = randomSet.items[ rand % randomSet.items.length ];

    player.dimension.spawnItem( randomItem, blockLocation );
}

function explode( player, position, rand )
{
    const radius = rand < .3 ? 40 : Math.round( rand * 10 ) % 9 + 5;
    player.dimension.createExplosion( position, radius );
}

function deathPit( player )
{
    player.runCommandAsync('fill ~-1 ~ ~-1 ~1 -63 ~1 air hollow');
}

function awkwardSheep( player, position )
{
    player.runCommandAsync(`structure load AwkwardSheep ${position.x} ${position.y-1} ${position.z-2}`);
}

function obsidianTrap( player )
{
    const playerPosition = player.location;
    player.runCommandAsync(`structure load ObsidianTrap ${playerPosition.x-1} ${playerPosition.y-1} ${playerPosition.z-1}`);
}

function spawnLoot( player, position )
{
    player.runCommandAsync(`loot spawn ${position.x} ${position.y} ${position.z} loot lucky_block_dummy`);
}

/**
 * @param { mc.Player } player 
 * @param { mc.Vector3 } position 
 */
export function breakLuckyBlock( player, position )
{
    const rand = Math.random() * 100;

    if ( rand >= 12 )
    {
        spawnLoot( player, position );
        return;
    }

    if ( rand >= 10 )
    {
        loadRandomArmorFromSets( player, position );
        return;
    }
    if ( rand < 0.37 )
    {
        loadDragonSlayerStuff( player, position, rand );
    }
    else if ( rand < 2.75 )
    {
        explode( player, position, rand );
    }
    else if ( rand < 5.25 )
    {
        deathPit( player );
    }
    else if ( rand < 8 )
    {
        obsidianTrap( player );
    }
    else
    {
        awkwardSheep( player, position );
    }   
}