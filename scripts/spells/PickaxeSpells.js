import * as spells from './spells.js';
import * as util from './util.js';

import * as mc from '@minecraft/server';

import { print } from '../util.js';

import { BreakBlockEvent } from './Events.js';

export class PickaxeSpells
{
    /** @type { Map<string, (e:BreakBlockEvent, spellLevel: string, popup_str:string[]) => void> } */
    static #spells = new Map();

    static addSpell( name, func )
    {
        PickaxeSpells.#spells.set( name, func );
    }

    static activateSpell( name, event, spellLevel, popup_str )
    {
        const spellEffect = PickaxeSpells.#spells.get( name );

        if ( spellEffect != null )
        {
            spellEffect( event, spellLevel, popup_str );
        }
    }
}

function locationToString( location )
{
    return `${location.x} ${location.y} ${location.z}`;
}

/**
 * @param {BreakBlockEvent} event 
 * @param {number} spellLevel
 * @param {string[]} popup_str 
 */
function veinMiner( event, spellLevel, popup_str )
{    
    const blockType = event.block.typeId;

    if ( !blockType.includes('_ore') )
    {
        //print(blockType + " is not an ore");
        return;
    }

    event.cancelBlockBreak = true;

    const locationsAlreadySearched = new Set([locationToString( event.block.location )]);
    const blocksToSearchAround = [event.block];
    /** @type {mc.Block[]} */
    const blocksFound = [];

    const spacesAround = ["above", "below", "east", "west", "north", "south"];

    while ( blocksToSearchAround.length > 0 )
    {
        const block = blocksToSearchAround.pop();

        blocksFound.push( block );

        for ( let i = 0; i < spacesAround.length; ++i )
        {
            /** @type {mc.Block | undefined} */
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

    /** @type {mc.ItemStack[]} */
    let finalItems = [];

    let numItems = blocksFound.length;
    
    while ( numItems > 64 )
    {
        finalItems.push( event.block.getItemStack( 64 ) );
        numItems -= 64;
    }
    if ( numItems > 0 )
    {
        finalItems.push( event.block.getItemStack( numItems ) );
    }

    mc.system.run( () =>
    {
        for ( const block of blocksFound )
        {
            block.setType("air");
        }
    });

    mc.system.run( () =>
    {
        for ( let i = 0; i < finalItems.length; ++i )
        {
            event.player.dimension.spawnItem( finalItems[ i ], event.block.location );
        }
    });

    util.addEffectToOutputString( popup_str, spells.VEIN_MINER );
}

PickaxeSpells.addSpell( spells.VEIN_MINER, veinMiner );
