import * as mc from "@minecraft/server";

import * as spells from "./spells/spells.js";
import * as io from './print.js';
import * as util from "./spells/util.js";

import { showNecromancyTable } from "./necromancy_table.js";

/**
 * @param { mc.BlockComponentRegistry } blockComponentRegistry 
 * @param { mc.ItemComponentRegistry }  itemComponentRegistry 
 */
export function initializeWorld( blockComponentRegistry, itemComponentRegistry )
{
    blockComponentRegistry.registerCustomComponent("tench:necromancy_table",
    {
        onPlayerInteract: e =>
        {
            if ( !e.player )
                return;

            const equipment = e.player.getComponent("equippable");

            if ( !equipment )
            {
                io.print( "No equipment", e.player );
                return;
            }

            const item = equipment.getEquipment( mc.EquipmentSlot.Mainhand );

            if ( !item )
            {
                io.print("Please have an item in your hand!", e.player );
                return;
            }

            showNecromancyTable( e.player, item );
        }
    });
}

const nonRemoveableTags = new Set( [] );

function clearTags( entity )
{
    mc.system.run( () => {
        if ( entity.isValid() )
        {
            const tags = entity.getTags();
            for ( let i = 0; i < tags.length; ++i )
            {
                if ( nonRemoveableTags.has( tags[ i ] ) )
                    continue;
                entity.removeTag( tags[ i ] );
            }
        }
    });
}

import { ArmorStateMachine } from "./spells/ArmorStateMachine.js";

/** @type { Map< string, ArmorStateMachine > } */
const armorEffects = new Map();

const armorSlots = [
    mc.EquipmentSlot.Head,
    mc.EquipmentSlot.Chest,
    mc.EquipmentSlot.Legs,
    mc.EquipmentSlot.Feet
];

function getEntityArmorKey( entity, armorSlot )
{
    return `${entity.id}_${armorSlot}`;
}

/**
 * @param { mc.Entity } entity
 */
export function removeEntity( entity )
{
    if ( entity == null )
        return;

    mc.system.run( () =>
    {
        for ( let i = 0; i < armorSlots.length; ++i )
        {
            const key = getEntityArmorKey( entity, armorSlots[ i ] );
            const effect = armorEffects.get( key );
    
            if ( effect != null )
            {
                try
                {
                    effect.remove( entity );
                }
                catch ( e )
                {
                    io.print( e.toString() );
                }
                
                armorEffects.delete( key );
            }
        }
    });

    clearTags( entity );
}

/**
 * @param { mc.Entity } entity
 */
export function entityDied( entity )
{
    if ( entity == null )
        return;

    entity.addTag( "tench_dead" );
}

/**
 * @param { mc.Entity } entity
 */
export function entityRespawned( entity )
{
    if ( entity == null )
        return;

    entity.removeTag("tench_dead");
}

/**
 * @param { mc.Entity } entity
 * @param { number } currentTick
 * @param { boolean } isCorrupted
 */
function updateEntity( entity, currentTick, isCorrupted )
{
    const equipment = entity.getComponent("equippable");

    const armor = [
        equipment.getEquipment( mc.EquipmentSlot.Head ),
        equipment.getEquipment( mc.EquipmentSlot.Chest ),
        equipment.getEquipment( mc.EquipmentSlot.Legs ),
        equipment.getEquipment( mc.EquipmentSlot.Feet )
    ];

    const effects = [
        armorEffects.get( getEntityArmorKey( entity, mc.EquipmentSlot.Head ) ),
        armorEffects.get( getEntityArmorKey( entity, mc.EquipmentSlot.Chest ) ),
        armorEffects.get( getEntityArmorKey( entity, mc.EquipmentSlot.Legs ) ),
        armorEffects.get( getEntityArmorKey( entity, mc.EquipmentSlot.Feet ) )
    ];

    // remove spells that aren't used anymore or are different
    for ( let i = 0; i < armor.length; ++i )
    {
        if (
            effects[ i ] != null
            &&
            (
                // no more spell
                ( armor[ i ] == null || armor[ i ].getLore().length == 0 )
                ||
                // different spell
                ( util.getBaseSpell( armor[ i ].getLore()[ 0 ] ) != util.getBaseSpell( effects[ i ].spell ) )
            )
        )
        {
            try
            {
                effects[ i ].remove( entity );
            }
            catch ( e )
            {
                io.print( e.toString() );
            }
            
            effects[ i ] = null;
            armorEffects.delete( getEntityArmorKey( entity, armorSlots[ i ] ) );
        }
    }

    const currentSpells = armor.map( ( value ) => {
        if ( value == null )
            return null;
        const lore = value.getLore();
        if ( lore.length == 0 )
            return null;
        return lore[ 0 ];
    });

    /** @type { Map< string, number > } */
    const spellCount = new Map();

    // make sure there are no duplicates
    for ( let i = 0; i < currentSpells.length; ++i )
    {
        if ( currentSpells[ i ] == null )
            continue;

        const spell = util.getBaseSpell( currentSpells[ i ] );

        if ( spellCount.has( spell ) )
        {
            spellCount.set( spell, spellCount.get( spell ) + 1 );
        }
        else
        {
            spellCount.set( spell, 1 );
        }
    }

    for ( const pair of spellCount )
    {
        if ( pair[ 1 ] == 1 )
            continue;
        
        io.print( "Found " + pair[ 1 ] + " occurrences of '" + pair[ 0 ].trimEnd() + spells.RESET + "'", entity );
        io.print( "Continuous effect spells that have more than one occurrence are ignored", entity );
    }

    // update or create all machines
    for ( let i = 0; i < effects.length; ++i )
    {
        // update current effects
        if ( effects[ i ] != null )
        {
            if ( spellCount.get( util.getBaseSpell( effects[ i ].spell ) ) > 1 )
            {
                continue;
            }

            effects[ i ].update( entity, currentTick, isCorrupted );
            continue;
        }

        // make new effects
        if ( currentSpells[ i ] != null )
        {
            const { baseSpell, tier } = util.getBaseSpellAndTier( currentSpells[ i ] );

            if ( spellCount.get( baseSpell ) > 1 )
            {
                continue;
            }

            const stateMachine = ArmorStateMachine.create( baseSpell, tier, currentTick );

            if ( stateMachine == null )
            {
                continue;
            }

            armorEffects.set( getEntityArmorKey( entity, armorSlots[ i ] ), stateMachine );
        }
    }

    /// not currently working on console
    // if ( entity instanceof mc.Player )
    // {
    //     const cooldowns = entity.getTags()
    //         .filter((e) => e.startsWith("cooldown:"))
    //         .map(e => e.replace("cooldown:", ""))
    //         .join('\n');

    //     let message = "";

    //     if ( isCorrupted )
    //     {
    //         message += "You are corrupted!\n";
    //     }
    //     if ( cooldowns.length > 0 )
    //     {
    //         message += cooldowns;
    //     }
    //     entity.onScreenDisplay.setTitle("tench:spell_cooldowns" + message);
    // }
}

/**
 * @param { mc.Player } player
 */
export function isDead( player )
{
    return player.hasTag("tench_dead");
}

export function runPlayerUpdateLoop()
{
    mc.system.runInterval( () =>
        {
            // const start = Date.now();
    
            const players = mc.world.getAllPlayers();
    
            for ( let i = 0; i < players.length; ++i )
            {
                if ( isDead( players[ i ] ) )
                {
                    continue;
                }

                updateEntity( players[ i ], mc.system.currentTick, util.isCorrupted( players[ i ] ) );
            }
    
            // const end = Date.now();
            // io.print( ( end - start ) + "ms" );
        },
        util.secondsToTicks( 1 )
    );
}
