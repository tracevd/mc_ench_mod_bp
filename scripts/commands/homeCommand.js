import * as mc from "@minecraft/server";
import * as io from "../print.js";

const HOME_PREFIX = "tench:home_";
const HOME_COUNT = "tench:homecount";

/** 
 * @param { mc.Player } player 
 * @param { string | null } homeName 
 * @returns 
 */
function makeHomePropertyName( homeName )
{
    return HOME_PREFIX + ( homeName ? homeName : "default" );
}

/**
 * @param { mc.Player } player
 * @param { string | null } homeName
 * @returns { mc.Vector3 | null }
 */
function getHomeLocation( player, homeName )
{
    return player.getDynamicProperty( makeHomePropertyName( homeName ) );
}

/**
 * @param { mc.Player } player 
 */
function incrementHomeCount( player )
{
    const homeCount = player.getDynamicProperty( HOME_COUNT );

    if ( homeCount == null )
    {
        player.setDynamicProperty( HOME_COUNT, 1 );
    }
    else
    {
        player.setDynamicProperty( HOME_COUNT, homeCount + 1 );
    }
}

/**
 * @param { mc.Player } player 
 */
function decrementHomeCount( player )
{
    const homeCount = player.getDynamicProperty( HOME_COUNT );

    if ( homeCount != null )
    {
        if ( homeCount == 1 )
        {
            player.setDynamicProperty( HOME_COUNT );
        }
        else
        {
            player.setDynamicProperty( HOME_COUNT, homeCount - 1 );
        }
    }
}

/** 
 * @param { mc.Player } player
 * @returns { number }
 */
function getHomeCount( player )
{
    return player.getDynamicProperty( HOME_COUNT ) || 0;
}

/**
 * @param { mc.Player } player 
 * @param { string | null } homeName 
 */
export function setHome( player, homeName, cmdSource )
{
    if ( player.dimension.id != "minecraft:overworld" )
    {
        io.print("You can only set homes in the overworld", cmdSource);
        return;
    }

    if ( getHomeCount( player ) >= 3 )
    {
        io.print("You can only have 3 homes", cmdSource);
        return;
    }

    player.setDynamicProperty( makeHomePropertyName( homeName ), player.location );

    incrementHomeCount( player );

    if ( homeName && homeName != "default" )
        io.print( "Set home with name: " + homeName, cmdSource );
    else
        io.print( "Set default home", cmdSource );
}

/**
 * @param { mc.Player } player 
 * @param { string | null } homeName 
 * @param { mc.Player } cmdSource 
 * @returns 
 */
export function tpToHome( player, homeName, cmdSource )
{
    const homeLoc = getHomeLocation( player, homeName );

    if ( homeLoc == null )
    {
        if ( homeName )
            io.print("You don't have a home with the name '" + homeName + "'", cmdSource);
        else
            io.print("You don't have a default home", cmdSource);
        return;
    }

    mc.system.run( () =>
    {
        player.teleport( homeLoc, { dimension: mc.world.getDimension("minecraft:overworld") } );
        io.print("Teleported to home", cmdSource);
    });
}

/**
 * @param { mc.Player } player
 * @param { mc.Player } cmdSource
 */
export function listHomes( player, cmdSource )
{
    const numHomes = getHomeCount( player );

    if ( numHomes == 0 )
    {
        io.print("You have no homes", cmdSource);
        return;
    }

    const homes = player.getDynamicPropertyIds()
        .filter( e => e.startsWith( HOME_PREFIX ) )
        .map( e => e.substring( HOME_PREFIX.length ) );

    io.print("Your homes are:\n" + homes.join('\n'), cmdSource);
}

/**
 * @param { mc.Player } player
 * @param { string | null } homeName 
 * @param { mc.Player } cmdSource
 */
export function removeHome( player, homeName, cmdSource )
{
    const numHomes = getHomeCount( player );

    if ( numHomes == 0 )
    {
        io.print("You have no homes", cmdSource);
        return;
    }

    const home = player.getDynamicProperty( makeHomePropertyName( homeName ) );

    if ( home == null )
    {
        if ( homeName )
            io.print("You don't have a home with the name: " + homeName, cmdSource );
        else
            io.print("You don't have a default home", cmdSource);
        return;
    }

    player.setDynamicProperty( makeHomePropertyName( homeName ) );
    decrementHomeCount( player );

    io.print("Removed home: " + ( homeName || "default" ), cmdSource );
}

/**
 * @param { mc.Player } player 
 * @param { mc.Player } cmdSource 
 */
export function clearHomes( player, cmdSource )
{
    const homes = player.getDynamicPropertyIds()
        .filter( e => e.startsWith( HOME_PREFIX ) );

    for ( let i = 0; i < homes.length; ++i )
    {
        player.setDynamicProperty( homes[ i ] );
    }

    player.setDynamicProperty( HOME_COUNT );

    io.print("Cleared " + homes.length + " homes", cmdSource);
}