import * as mc from '@minecraft/server';

import * as io from './print.js';
import * as spells from './spells/spells.js';

import { ArmorSets } from './sets/sets';
import { itemIsArmor } from './necromancy_table';
import { numberToRomanNumeral, loreIncludes } from './spells/util';
import { RESET } from './spells/spell_constants';

class Command
{
    constructor( func, requiresOp )
    {
        this.cmd = func;
        this.requiresOp = requiresOp;
    }

    /** @type { ( player: mc.Player, args: string[] ) => void } */
    cmd;

    /** @type { boolean } */
    requiresOp;
}

/** @type { Map< string, Command > } */
const customCommands = new Map();

/**
 * Prints the commands that the player can use.
 * If the player is not OP'ed, it will only show
 * the commands that non-op'ed players can use.
 * @param {mc.Player} player 
 * @param {string[]} args 
 */
function help( player, args )
{
    const isOp = player.isOp();

    const commandNames = Array.from( customCommands.entries() )
        .filter( value => isOp || !value[ 1 ].requiresOp )
        .map( value => value[ 0 ] )
        .join('\n');

    io.print("Commands you can use:\n" + commandNames, player );
}

/**
 * Prints the currently active cooldowns on the player
 * @param {mc.Player} player 
 * @param {string[]} args 
 */
function cooldowns( player, args )
{
    if ( args.length > 0 )
    {
        io.print("Too many arguments for 'cooldowns' command", player );
        return;
    }
    
    /** @type {string[]} */
    const cooldowns = player.getTags()
        .filter( (value) => value.startsWith( spells.RESET ) );

    let coolDownMessage = "";

    for ( let i = 0; i < cooldowns.length; ++i )
    {
        if ( i > 0 )
            coolDownMessage += ", ";
        coolDownMessage += cooldowns[ i ].trimEnd() + spells.RESET;
    }

    if ( coolDownMessage.length == 0 )
    {
        coolDownMessage = "You have no active cooldowns";
    }

    io.print( coolDownMessage, player );
}

/**
 * Kills the player
 * @param {mc.Player} player 
 * @param {string[]} args 
 */
function kms( player, args )
{
    player.runCommandAsync('kill @s');
}

/**
 * Spawns an named armor set at the players location
 * @param {mc.Player} player 
 * @param {string[]} args 
 */
function spawnArmorSet( player, args )
{
    if ( args.length != 1 )
    {
        io.print("'armor_sets' command only has one argument", player );
        return;
    }

    const _set = ArmorSets.sets.filter( (val) => val.name.toLowerCase() == args[ 0 ].toLowerCase() );

    if ( _set.length == 0 )
    {
        io.print("Could not find set named '" + args[ 0 ] + "'", player);
        return;
    }

    const set = _set[ 0 ];

    mc.system.run(() =>
    {
        for ( const item of set.items )
        {
            player.dimension.spawnItem( item, player.location );
        }
    });    
}

/**
 * Add or clear spells from the player's main hand item
 * @param {mc.Player} player 
 * @param {string[]} args 
 */
function spellCommand( player, args )
{
    if ( args.length == 0 )
    {
        io.print("Expected arguments", player);
        return;
    }

    const equip = player.getComponent("equippable");

    const mainHand = equip.getEquipment(mc.EquipmentSlot.Mainhand);

    if ( mainHand == null )
    {
        io.print("Must be holding the piece you want to inspect/add", player);
        return;
    }

    const arg1 = args.shift();

    if ( arg1 == "add" )
    {
        if ( args.length < 2 )
        {
            io.print("Expected spell to add as two arguments: <spell name> <spell tier (number)>", player);
            return;
        }

        /** @type {string} */
        const spellName = args.shift();
        /** @type {string} */
        const spellTier = args.shift();

        let spellTierNum = 0;

        try
        {
            spellTierNum = Number.parseInt( spellTier );
        }
        catch ( e )
        {
            io.print("Spell tier argument must be convertible to an integer", player);
            return;
        }

        if ( spellTierNum < 1 || spellTierNum > 10 )
        {
            io.print("Spell tier argument must be in the range 1 through 10", player);
            return;
        }

        /**
         * @param {spells.SpellInfo[]} spellArray 
         */
        const tryToApplySpell = ( spellArray ) =>
        {
            const matches = [spells.SpellInfo.dummy(spells.UNBREAKABLE)].concat( spellArray ).filter( (spell) =>
                spell.name.toLowerCase().includes( spellName.toLowerCase() )
            );

            if ( matches.length > 1 )
            {
                let str = "'" + spellName + "' is ambiguous, could be " + matches[ 0 ].name.trimEnd();

                let i = 1;

                while ( i < matches.length && i < 3 )
                {
                    str += RESET + ", " + matches[ i ].name.trimEnd();
                    ++i;
                }

                if ( i < matches.length )
                {
                    str += RESET + ", ...";
                }

                io.print( str, player );
                return;
            }

            if ( matches.length == 0 )
            {
                io.print("Cannot find armor spell '" + spellName + "'", player);
                return;
            }

            const spell = matches[ 0 ].name;

            const lore = mainHand.getLore();

            if ( loreIncludes( lore, spell ) )
            {
                io.print("This item already has this spell");
                return;
            }

            lore.push( spell.endsWith(' ') ? spell + numberToRomanNumeral( spellTierNum ) : spell );

            mc.system.run(() =>
            {
                mainHand.setLore( lore );
                equip.setEquipment( mc.EquipmentSlot.Mainhand, mainHand );
                io.print("Added " + lore[ lore.length - 1 ], player );
            });
        };

        const isArmor = itemIsArmor( mainHand );

        if ( isArmor )
        {
            tryToApplySpell( spells.getAllArmorSpells() );
            return;
        }

        if ( mainHand.typeId.includes("sword") || mainHand.typeId.includes("_axe") )
        {
            tryToApplySpell( spells.getAllWeaponSpells() );         
            return;
        }

        if ( mainHand.typeId.includes('bow') && !mainHand.typeId.includes('bowl') )
        {
            tryToApplySpell( spells.getAllBowSpells() );
            return;
        }

        if ( mainHand.typeId.includes('ickaxe') )
        {
            tryToApplySpell( spells.getAllPickaxeSpells() );
            return;
        }

        io.print("Unknown item type: " + mainHand.typeId, player );
    }
    else if ( arg1 == "clear" )
    {
        mc.system.run(() =>
        {
            mainHand.setLore([]);
            equip.setEquipment( mc.EquipmentSlot.Mainhand, mainHand );
        });
        return;
    }
    else if ( arg1 == "list" || arg1 == "help" )
    {
        if ( itemIsArmor( mainHand ) )
        {
            const armorSpells = spells.getAllArmorSpells().map((e) => e.name).join('\n');

            io.print("Choose from the following spells:", player);
            io.print(armorSpells, player);
        }
        else if ( mainHand.typeId.includes("sword") || mainHand.typeId.includes("_axe") )
        {
            const weaponSpells = spells.getAllWeaponSpells().map((e) => e.name).join('\n');
            io.print("Choose from the following spells:", player);
            io.print(weaponSpells, player);
        }
        else if ( mainHand.typeId.includes('bow') && !mainHand.typeId.includes('bowl') )
        {
            const bowSpells = spells.getAllBowSpells().map((e) => e.name).join('\n');
            io.print("Choose from the following spells:", player);
            io.print(bowSpells, player);
        }
        else if ( mainHand.typeId.includes('ickaxe') )
        {
            const pickSpells = spells.getAllPickaxeSpells().map(e => e.name).join('\n');
            io.print("Choose from the following spells:", player);
            io.print(pickSpells, player);
        }
        else {
            io.print("Unrecognized item type", player);
        }
    }
}

/**
 * Set the durability of the player's main hand item
 * @param {mc.Player} player 
 * @param {string[]} args 
 */
function setDurability( player, args )
{
    const equip = player.getComponent("equippable");

    const mainHand = equip.getEquipment( mc.EquipmentSlot.Mainhand );

    if ( mainHand == null )
    {
        io.print("Please have the item in your hand that you want to change", player);
        return;
    }

    const dur = mainHand.getComponent("durability");

    if ( dur == null )
    {
        io.print("This item does not have a durability component: " + mainHand.typeId, player );
        return;
    }

    const durValueStr = args.shift();

    let durValue = 0;

    try
    {
        durValue = Number.parseInt( durValueStr );
    }
    catch ( e )
    {
        io.print("Could not convert durability value argument to an integer", player);
        return;
    }

    if ( durValue < 0 )
    {
        io.print("Please enter a positive durability (or 0)", player);
        return;
    }

    mc.system.run(() =>
    {
        dur.damage = Math.max( dur.maxDurability - durValue, 0 );
        equip.setEquipment( mc.EquipmentSlot.Mainhand, mainHand );
    });
}

/**
 * Change gamemodes
 * @param {mc.Player} player 
 * @param {string[]} args 
 */
function gm( player, args )
{
    const gamemode = args.shift();

    if ( gamemode == null )
    {
        io.print("Please provide a gamemode argument (s, c, a, sp)", player);
        return;
    }

    /** @type { mc.GameMode } */
    let gm;

    switch ( gamemode.toLowerCase().trim() )
    {
    case 's':
    case 'survival':
        gm = mc.GameMode.survival;
        break;
    case 'c':
    case 'creative':
        gm = mc.GameMode.creative;
        break;
    case 'a':
    case 'adventure':
        gm = mc.GameMode.adventure;
        break;
    case 'sp':
    case 'spectator':
        gm = mc.GameMode.spectator;
        break;
    default:
        io.print("Unknown gamemode", player);
        return;
    }

    let target = args.shift();

    if ( target != null )
    {
        target = target.trim().toLowerCase();

        if ( target == "@a" || target == "@e" )
        {
            const players = mc.world.getAllPlayers();

            mc.system.run(() =>
            {
                for ( let i = 0; i < players.length; ++i )
                {
                    players[ i ].setGameMode( gm );
                }
            });
        }

        if ( target != "@s" && target != "@p" )
        {
            const players = mc.world.getAllPlayers().filter( value => value.name.toLowerCase().includes( target ) );

            if ( players.length == 0 )
            {
                io.print("Name did not match any players", player);
                return;
            }
            if ( players.length > 1 )
            {
                io.print("Name matched more than one player", player);
                return;
            }

            mc.system.run(() => players[ 0 ].setGameMode( gm ) );
            return;
        }
    }

    mc.system.run( () => player.setGameMode( gm ) );
}

/**
 * Nickname yourself
 * @param {mc.Player} player 
 * @param {string[]} args 
 */
function nick( player, args )
{
    const nickname = args.shift();

    if ( nickname == null || nickname.length == 0 )
    {
        io.print("Please enter a nickname", player);
        return;
    }

    mc.system.run(() =>
    {
        const separatorIdx = player.nameTag.lastIndexOf('\n');
        player.nameTag = nickname + player.nameTag.substring( separatorIdx );
    });
}

/**
 * Duplicate currently held item
 * @param {mc.Player} player 
 * @param {string[]} args 
 */
function duplicate( player, args )
{
    const equip = player.getComponent("equippable");

    const arg1 = args.shift();

    if ( arg1 == "equipment" )
    {
        const slots = [mc.EquipmentSlot.Head, mc.EquipmentSlot.Chest, mc.EquipmentSlot.Legs, mc.EquipmentSlot.Feet, mc.EquipmentSlot.Mainhand];

        const items = [];

        for ( let i = 0; i < slots.length; ++i )
        {
            const item = equip.getEquipment( slots[ i ] );

            if ( item != null )
            {
                items.push( item );
            }
        }

        if ( items.length == 0 )
        {
            io.print("No equipment to duplicate", player);
            return;
        }

        const inv = player.getComponent("inventory");

        mc.system.run(() =>
        {
            for ( let i = 0; i < items.length; ++i )
            {
                if ( inv.container.emptySlotsCount > 0 )
                {
                    inv.container.addItem( items[ i ] );
                }
                else
                {
                    player.dimension.spawnItem( items[ i ], player.location );
                }                
            }
            io.print("Successfully duplicated equipment", player);
        });
        return;
    }

    const mainHand = equip.getEquipment( mc.EquipmentSlot.Mainhand );

    if ( mainHand == null )
    {
        io.print("Please hold the item you would like to duplicate in your main hand", player);
        return;
    }

    const inv = player.getComponent("inventory");

    mc.system.run(() =>
    {
        if ( inv.container.emptySlotsCount > 0 )
        {
            inv.container.addItem( mainHand );
        }
        else
        {
            player.dimension.spawnItem( mainHand, player.location );
        }
        io.print("Successfully duplicated item", player);
    });
}

customCommands.set( ".help", new Command( help, false ) );
customCommands.set( ".cooldowns", new Command( cooldowns, false ) );
customCommands.set( ".kms", new Command( kms, false ) );
customCommands.set( ".sets", new Command( spawnArmorSet, true ) );
customCommands.set( ".spells", new Command( spellCommand, true ) );
customCommands.set( ".durability", new Command( setDurability, true ) );
customCommands.set( ".gm", new Command( gm, true ) );
customCommands.set( ".nick", new Command( nick, false ) );
customCommands.set( ".dupe", new Command( duplicate, true ) );

/**
 * @param {string} str 
 * @returns {string[]}
 */
function parseArguments( str )
{
    let parts = [];

    let i = 0;

    while ( i < str.length )
    {
        if ( str[ i ] == '"' )
        {
            const nextQuoteIndex = str.indexOf( '"', i + 1 );

            if ( nextQuoteIndex == -1 )
            {
                io.print("Please close quoted arguments", player);
                return [];
            }

            parts.push( str.substring( i + 1, nextQuoteIndex ) );
            i = nextQuoteIndex + 1;

            if ( i < str.length && str[ i ] != ' ' )
            {
                io.print("Be sure that arguments are separated by spaces", player);
                return [];
            }
            
            ++i;
            continue;
        }

        const nextSpaceIndex = str.indexOf( ' ', i );

        if ( nextSpaceIndex == i )
        {
            io.print("Please only separate arguments by one space", player);
            return [];
        }

        if ( nextSpaceIndex == -1 )
        {
            parts.push( str.substring( i ) );
            i = str.length;
        }
        else
        {
            parts.push( str.substring( i, nextSpaceIndex ) );
            i = nextSpaceIndex + 1;
        }
    }

    return parts;
}

/**
 * @param {mc.Player} player
 * @param {string} commandStr
 */
export function runCommand( player, commandStr )
{
    const parts = parseArguments( commandStr.trim() );

    if ( parts.length == 0 )
    {
        return;
    }

    const command = customCommands.get( parts[ 0 ] );

    if ( command == null )
    {
        io.print( "Could not find specified command: " + parts[ 0 ], player );
        return;
    }

    if ( command.requiresOp && !player.isOp() )
    {
        io.print("You do not have permission to use this command", player);
        return;
    }

    command.cmd( player, parts.slice( 1 ) );
}