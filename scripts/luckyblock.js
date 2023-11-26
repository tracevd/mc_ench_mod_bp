import { Player } from "@minecraft/server"

class Vec3
{
    x = 0;
    y = 0;
    z = 0;
}

function loadDragonsBaneStuff( player, position, rand )
{
    let command = "structure load DragonsBane";
    if ( rand < 0.02 )
    {
        command += 'Armor';
    }
    else if ( rand < 0.09 )
    {
        command += 'Helmet';
    }
    else if ( rand < 0.16 )
    {
        command += 'Chest';
    }
    else if ( rand < 0.23 )
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

function obisidanTrap( player )
{
    const playerPosition = player.location;
    player.runCommandAsync(`structure load ObisidanTrap ${playerPosition.x-1} ${playerPosition.y-1} ${playerPosition.z-1}`);
}

function spawnLoot( player, position )
{
    player.runCommandAsync(`loot spawn ${position.x} ${position.y} ${position.z} loot lucky_block_dummy`);
}

/**
 * @param { Player } player 
 * @param { Vec3 } position 
 * @returns 
 */
export function breakLuckyBlock( player, position )
{
    const rand = Math.random() * 100;

    if ( rand >= 10 )
    {
        spawnLoot( player, position );
        return;
    }

    if ( rand < 0.37 )
    {
        loadDragonsBaneStuff( player, position, rand );
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
        obisidanTrap( player );
    }
    else
    {
        awkwardSheep( player, position );
    }   
}