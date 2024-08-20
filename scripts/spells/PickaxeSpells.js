import * as spells from './spells.js';

import * as mc from '@minecraft/server';

import { print } from '../print.js';
import { StringRef } from '../StringRef.js';

import { BreakBlockEvent } from './events.js';

import { getBaseSpellAndTier } from './util.js';

export class PickaxeSpells
{
    /** @type { Map< string, (e:BreakBlockEvent, spellLevel: string, outputString:string[]) => void > } */
    static #spells = new Map();

    static addSpell( name, func )
    {
        PickaxeSpells.#spells.set( name, func );
    }

    static activateSpell( name, event, spellLevel, outputString )
    {
        const spellEffect = PickaxeSpells.#spells.get( name );

        if ( spellEffect != null )
        {
            spellEffect( event, spellLevel, outputString );
        }
    }
}

const avgOreDropCount = new Map([
    [ "minecraft:redstone_ore", 4.5 ],
    [ "minecraft:lapiz_lazuli_ore", 6.5 ],
    [ "minecraft:copper_ore", 3.5 ],
    [ "minecraft:nether_gold_ore", 5.33 ]
]);

/**
 * @param { string } oreType 
 * @returns 
 */
function getAvgOreDropCount( oreType )
{
    return avgOreDropCount.get( oreType ) || 1;
}

/**
 * @param { number } level 
 */
function fortuneDropMultiplier( level )
{
    const rand = Math.random();
    const chanceForNoExtraDrops = 2 / ( level + 2 );

    if ( rand < chanceForNoExtraDrops )
        return 1;

    return 1 + Math.ceil( level * Math.random() );
}

function getItemDroppedFromOre( blockType, itemHasSilkTouch )
{
    if ( itemHasSilkTouch )
    {
        return blockType;
    }

    if ( blockType.includes("iron") )
    {
        return "minecraft:raw_iron";
    }
    if ( blockType.includes("copper") )
    {
        return "minecraft:raw_copper";
    }
    if ( blockType.includes("gold") )
    {
        return "minecraft:raw_gold";
    }

    return blockType.replace( "_ore", "" ).replace("deepslate_", "").replace("nether_", "");
}

/**
 * @param { string } blockType The type of block being mined
 * @param { string } itemDropped The type of item dropped from the block (see getItemDroppedFromOre)
 * @param { number } itemFortuneLevel The fortune level of the pickaxe
 */
function getNumberOfDropsFromOre( blockType, itemDropped, itemFortuneLevel )
{
    const avgDrops = getAvgOreDropCount( blockType );

    if ( itemDropped == blockType )
    {
        return 1;
    }

    if ( itemFortuneLevel > 0 && itemDropped != "tench:dragonscale" )
    {
        return Math.round( avgDrops * fortuneDropMultiplier( itemFortuneLevel ) );
    }

    return avgDrops;
}

/**
 * @param { mc.Vector3 } location
 */
function locationToString( location )
{
    return `${location.x} ${location.y} ${location.z}`;
}

/**
 * @param { BreakBlockEvent } event 
 * @param { number } spellLevel
 * @param { StringRef } outputString 
 */
function veinMiner( event, spellLevel, outputString )
{    
    const blockType = event.block.typeId;

    print( blockType );

    if ( !blockType.includes('_ore') )
    {
        return;
    }

    event.cancelBlockBreak = true;

    const locationsAlreadySearched = new Set([locationToString( event.block.location )]);
    const blocksToSearchAround = [event.block];
    /** @type { mc.Block[] } */
    const matchingBlocks = [];

    const spacesAround = ["above", "below", "east", "west", "north", "south"];

    while ( blocksToSearchAround.length > 0 )
    {
        const block = blocksToSearchAround.pop();

        matchingBlocks.push( block );

        for ( let i = 0; i < spacesAround.length; ++i )
        {
            /** @type { mc.Block | undefined } */
            const touchingBlock = block[ spacesAround[ i ] ]();

            if ( touchingBlock == null )
            {
                print("Null block");
                continue;
            }

            const loc = locationToString( touchingBlock.location );

            if ( touchingBlock.typeId != blockType )
            {
                if ( !locationsAlreadySearched.has( loc ) )
                {
                    locationsAlreadySearched.add( loc );
                }
                continue;
            }

            if ( locationsAlreadySearched.has( loc ) )
            {
                continue;
            }

            locationsAlreadySearched.add( loc );
            blocksToSearchAround.push( touchingBlock );
        }
    }

    /** @type { mc.ItemStack[] } */
    let finalItems = [];

    let numBlocks = matchingBlocks.length;

    let numItems = 0;
    let itemType = getItemDroppedFromOre( blockType, event.itemHasSilkTouch );

    while ( numBlocks > 0 )
    {
        numItems += getNumberOfDropsFromOre( blockType, itemType, event.itemFortuneLevel );
        --numBlocks;
    }
    
    while ( numItems > 64 )
    {
        finalItems.push( new mc.ItemStack( itemType, 64 ) );
        numItems -= 64;
    }
    if ( numItems > 0 )
    {
        finalItems.push( new mc.ItemStack( itemType, numItems ) );
    }

    mc.system.run( () =>
    {
        for ( let i = 0; i < matchingBlocks.length; ++i )
        {
            matchingBlocks[ i ].setType("air");
        }
    });

    mc.system.run( () =>
    {
        for ( let i = 0; i < finalItems.length; ++i )
        {
            event.player.dimension.spawnItem( finalItems[ i ], event.block.location );
        }
    });

    outputString.addWithNewLine( spells.VEIN_MINER );
}

const excavateBlocks = new Map([
    ["minecraft:overworld", new Set([ "minecraft:stone", "minecraft:cobblestone", "minecraft:deepslate", "minecraft:cobbled_deepslate", "minecraft:dirt", "minecraft:gravel", "minecraft:tuff" ])],
    ["minecraft:nether", new Set(["minecraft:netherrack", "minecraft:blackstone"])],
    ["minecraft:the_end", new Set(["minecraft:end_stone"])]
]);

/**
 * @param { BreakBlockEvent } event 
 * @param { number } spellLevel
 * @param { StringRef } outputString 
 */
function excavate( event, spellLevel, outputString )
{
    const blocksToReplaceWithAir = excavateBlocks.get( event.player.dimension.id );

    if ( blocksToReplaceWithAir == null )
    {
        print( "Excavate does not work for the dimension: " + event.player.dimension.id, event.player );
        return;
    }

    if ( !blocksToReplaceWithAir.has( event.block.typeId ) )
    {
        return;
    }

    const viewDirection = event.player.getViewDirection();

    const X_AXIS = "x";
    const Z_AXIS = "z";

    let axis = null;

    if ( Math.abs( viewDirection.x ) < Math.abs( viewDirection.z ) )
    {
        axis = Z_AXIS;
    }
    else
    {
        axis = X_AXIS;
    }

    /** @type string */
    let direction = null;

    if ( event.player.location[ axis ] - event.block.location[ axis ] > 0 )
    {
        if ( axis == "x" )
        {
            direction = "west";
        }
        else
        {
            direction = "north";
        }
    }
    else
    {
        if ( axis == "x" )
        {
            direction = "east";
        }
        else
        {
            direction = "south";
        }
    }

    let nearCorner = null;
    let farCorner  = null;

    switch ( direction )
    {
    case "north":
    case "south":
        nearCorner = event.block.above( spellLevel ).east( spellLevel );
        farCorner  = event.block.below().west( spellLevel )[ direction ]( spellLevel * 5 );
        break;
    case "east":
    case "west":
        nearCorner = event.block.above( spellLevel ).north( spellLevel );
        farCorner  = event.block.below().south( spellLevel )[ direction ]( spellLevel * 5 );
        break;
    }

    const minX = Math.min( nearCorner.x, farCorner.x );
    const maxX = Math.max( nearCorner.x, farCorner.x );

    const minY = Math.min( nearCorner.y, farCorner.y );
    const maxY = Math.max( nearCorner.y, farCorner.y );
    
    const minZ = Math.min( nearCorner.z, farCorner.z );
    const maxZ = Math.max( nearCorner.z, farCorner.z );

    mc.system.run( () =>
    {
        for ( let x = minX; x <= maxX; ++x )
        {
            for ( let y = minY; y <= maxY; ++y )
            {
                for ( let z = minZ; z <= maxZ; ++z )
                {
                    const block = event.player.dimension.getBlock( { x, y, z } );

                    if ( blocksToReplaceWithAir.has( block.typeId ) )
                    {
                        block.setType("air");
                    }
                }
            }
        }
    });
    
    event.cancelBlockBreak = true;

    outputString.addWithNewLine( spells.EXCAVATE );
}

PickaxeSpells.addSpell( spells.VEIN_MINER, veinMiner );
PickaxeSpells.addSpell( spells.EXCAVATE,   excavate );

/**
 * @param { mc.Player } player 
 * @param { mc.ItemStack } pickaxe 
 * @param { mc.Block } block 
 * @returns Whether the event should be cancelled
 */
export function parsePickaxeSpells( player, pickaxe, block )
{
    const lore = pickaxe.getLore();

    if ( lore.length == 0 )
    {
        return false;
    }

    const outputString = new StringRef();

    const event = new BreakBlockEvent( player, pickaxe, block );

    for ( let i = 0; i < lore.length; ++i )
    {
        const { baseSpell, tier } = getBaseSpellAndTier( lore[ i ] );

        PickaxeSpells.activateSpell( baseSpell, event, tier, outputString );
    }

    if ( outputString.length > 0 )
    {
        mc.system.run( () => {
            player.onScreenDisplay.setActionBar( outputString.str );
        });
    }

    return event.cancelBlockBreak;
}
