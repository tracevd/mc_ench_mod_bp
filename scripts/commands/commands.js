import * as mc from '@minecraft/server';

import * as io from '../print.js';
import * as spells from '../spells/spells.js';

import { ItemSets, SetPieces } from '../sets/sets.js';
import { numberToRomanNumeral, loreIncludes } from '../spells/util.js';
import { RESET } from '../spells/spell_constants.js';

class Command
{
    constructor( func, requiresOp, helpMsgs )
    {
        this.cmd = func;
        this.requiresOp = requiresOp;
        this.helpMsg = '\n' + helpMsgs.join('\n');
    }

    /** @type { ( player: mc.Player, args: string[], cmdSource: mc.Player ) => void } */
    cmd;

    /** @type { boolean } */
    requiresOp;

    /** @type { string[] } */
    helpMsg;
}

/** @type { Map< string, Command > } */
const customCommands = new Map();

function getPlayersByName( name )
{
    return mc.world.getAllPlayers().filter( value => value.name.toLowerCase().includes( name ) );
}

/**
 * Prints the commands that the player can use.
 * If the player is not OP'ed, it will only show
 * the commands that non-op'ed players can use.
 * @param { mc.Player } player 
 * @param { string[] } args 
 */
function help( player, args, cmdSource )
{
    const isOp = player.isOp();

    if ( args.length == 0 )
    {
        const commandNames = Array.from( customCommands.entries() )
            .filter( value => isOp || !value[ 1 ].requiresOp )
            .map( value => value[ 0 ] )
            .join('\n');

        io.print("\n", player);
        io.print("Commands you can use:\n" + commandNames, player );
        return;
    }

    const commandName = args.shift();

    const command = customCommands.get( "." + commandName );

    if ( command == null || ( command.requiresOp && !isOp ) )
    {
        io.print("Can't find command named '" + commandName + "'", player);
        return;
    }

    io.print(command.helpMsg, player);
}

/**
 * Prints the currently active cooldowns on the player
 * @param { mc.Player } player 
 * @param { string[] } args
 * @param { mc.Player } cmdSource
 */
function cooldowns( player, args, cmdSource )
{
    if ( args.length > 0 )
    {
        io.print("Too many arguments for 'cooldowns' command", cmdSource );
        return;
    }

    const cooldowns = player.getTags()
        .filter( (value) => value.startsWith( spells.SPELL_COOLDOWN_TAG_PREFIX ) );

    let coolDownMessage = "You have no active cooldowns";

    if ( cooldowns.length > 0 )
    {
        coolDownMessage = "Spells currently on cooldown:\n" + cooldowns[ 0 ].trimEnd().replace( spells.SPELL_COOLDOWN_TAG_PREFIX, "" ) + spells.RESET;
    }

    for ( let i = 1; i < cooldowns.length; ++i )
    {
        coolDownMessage += "\n" + cooldowns[ i ].trimEnd().replace( spells.SPELL_COOLDOWN_TAG_PREFIX, "" ) + spells.RESET;
    }

    io.print( coolDownMessage, cmdSource );
}

/**
 * Kills the player
 * @param { mc.Player } player 
 * @param { string[] } args
 * @param { mc.Player } cmdSource
 */
function kms( player, args, cmdSource )
{
    player.runCommandAsync('kill @s');
}

/**
 * Spawns an named armor set at the players location
 * @param { mc.Player } player 
 * @param { string[] } args
 * @param { mc.Player } cmdSource
 */
function sets( player, args, cmdSource )
{
    if ( args.length < 1 )
    {
        io.print("Please input a set name", cmdSource );
        return;
    }

    const arg1 = args.shift().toLowerCase();

    if ( arg1 == "piece" )
    {
        if ( args.length != 1 )
        {
            io.print("Expected name of piece!", cmdSource);
            return;
        }

        const name = args.shift().toLowerCase();

        if ( name == "random" )
        {
            mc.system.run(() =>
            {
                SetPieces.getRandom().loadAt( player.location, player.dimension );
                io.print("Loaded piece", cmdSource);
            });
            return;
        }

        const pieces = SetPieces.getPiecesByName( name );

        if ( pieces.length == 0 )
        {
            io.print("No piece had a name including '" + name + "'", cmdSource);
            return;
        }
        if ( pieces.length > 1 )
        {
            io.print("'"+  name + "' matched more than one piece", cmdSource);
            return;
        }

        mc.system.run(() =>
        {
            pieces[ 0 ].loadAt( player.location, player.dimension );
            io.print("Loaded piece", cmdSource);
        });        
        return;
    }

    const sets =  ItemSets.getSetsByName( arg1 );

    if ( sets.length == 0 )
    {
        io.print("Could not find set named '" + arg1 + "'", cmdSource);
        return;
    }

    if ( sets.length > 1 )
    {
        io.print( "Name '" + arg1 + "' matches more than one set", cmdSource );
        return;
    }

    mc.system.run(() =>
    {
        for ( const item of sets[ 0 ].items )
        {
            item.loadAt( player.location, player.dimension );
        }
    });

    io.print("Successfully spawned set", cmdSource);
}

/**
 * Add or clear spells from the player's main hand item
 * @param { mc.Player } player 
 * @param { string[] } args
 * @param { mc.Player } cmdSource
 */
function spellCommand( player, args, cmdSource )
{
    if ( args.length == 0 )
    {
        io.print("Expected arguments", cmdSource);
        return;
    }

    const equip = player.getComponent( mc.EntityComponentTypes.Equippable );

    const mainHand = equip.getEquipment(mc.EquipmentSlot.Mainhand);

    if ( mainHand == null )
    {
        io.print("You must be holding the piece you want to inspect/add spells to", cmdSource);
        return;
    }

    const arg1 = args.shift();

    if ( arg1 == "add" )
    {
        if ( args.length < 2 )
        {
            io.print("Expected spell to add as two arguments: <spell name> <spell tier (number)>", cmdSource);
            return;
        }

        /** @type { string } */
        const spellName = args.shift();
        /** @type { string } */
        const spellTier = args.shift();

        let spellTierNum = 0;

        try
        {
            spellTierNum = Number.parseInt( spellTier );
        }
        catch ( e )
        {
            io.print("Spell tier argument must be convertible to an integer", cmdSource);
            return;
        }

        if ( spellTierNum < 1 || spellTierNum > 10 )
        {
            io.print("Spell tier argument must be in the range 1 through 10.", cmdSource);
            return;
        }

        /**
         * @param { spells.SpellInfo[] } spellArray 
         */
        const tryToApplySpell = ( spellArray ) =>
        {
            const matches = [new spells.SpellInfo(spells.UNBREAKABLE)].concat( spellArray ).filter( (spell) =>
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

                io.print( str, cmdSource );
                return;
            }

            if ( matches.length == 0 )
            {
                io.print("Cannot find armor spell '" + spellName + "'", cmdSource);
                return;
            }

            const spell = matches[ 0 ].name;

            const lore = mainHand.getLore();

            if ( loreIncludes( lore, spell ) )
            {
                io.print("This item already has this spell", cmdSource);
                return;
            }

            lore.push( spell.endsWith(' ') ? spell + numberToRomanNumeral( spellTierNum ) : spell );

            mc.system.run(() =>
            {
                mainHand.setLore( lore );
                equip.setEquipment( mc.EquipmentSlot.Mainhand, mainHand );
                io.print("Added " + lore[ lore.length - 1 ], cmdSource );
            });
        };

        const itemType = getItemType( mainHand );

        if ( itemType == ItemType.ARMOR )
        {
            tryToApplySpell( spells.getAllArmorSpells() );
            return;
        }

        if ( itemType == ItemType.WEAPON || itemType == ItemType.VOID )
        {
            tryToApplySpell( spells.getAllWeaponSpells() );         
            return;
        }

        if ( itemType == ItemType.BOW )
        {
            tryToApplySpell( spells.getAllBowSpells() );
            return;
        }

        if ( itemType == ItemType.PICKAXE )
        {
            tryToApplySpell( spells.getAllPickaxeSpells() );
            return;
        }

        io.print("Unknown item type: " + mainHand.typeId, cmdSource );
    }
    else if ( arg1 == "clear" )
    {
        mc.system.run(() =>
        {
            mainHand.setLore([]);
            equip.setEquipment( mc.EquipmentSlot.Mainhand, mainHand );
            io.print("Cleared item spells", cmdSource);
        });
        return;
    }
    else if ( arg1 == "list" || arg1 == "help" )
    {
        const itemType = getItemType( mainHand );

        if ( itemType == ItemType.ARMOR )
        {
            const armorSpells = spells.getAllArmorSpells().map(e => e.name).join('\n');

            io.print("Choose from the following spells:", cmdSource);
            io.print(armorSpells, cmdSource);
        }
        else if ( itemType == ItemType.WEAPON )
        {
            const weaponSpells = spells.getAllWeaponSpells().map(e => e.name).join('\n');
            io.print("Choose from the following spells:", cmdSource);
            io.print(weaponSpells, cmdSource);
        }
        else if ( itemType == ItemType.BOW )
        {
            const bowSpells = spells.getAllBowSpells().map(e => e.name).join('\n');
            io.print("Choose from the following spells:", cmdSource);
            io.print(bowSpells, cmdSource);
        }
        else if ( itemType == ItemType.PICKAXE )
        {
            const pickSpells = spells.getAllPickaxeSpells().map(e => e.name).join('\n');
            io.print("Choose from the following spells:", cmdSource);
            io.print(pickSpells, cmdSource);
        }
        else {
            io.print("Unrecognized item type", cmdSource);
        }
    }
}

/**
 * Set the durability of the player's main hand item
 * @param { mc.Player } player 
 * @param { string[] } args
 * @param { mc.Player } cmdSource
 */
function setDurability( player, args, cmdSource )
{
    const equip = player.getComponent( mc.EntityComponentTypes.Equippable );

    const mainHand = equip.getEquipment( mc.EquipmentSlot.Mainhand );

    if ( mainHand == null )
    {
        io.print("Please have the item in your hand that you want to change", cmdSource);
        return;
    }

    const dur = mainHand.getComponent( mc.ItemComponentTypes.Durability );

    if ( dur == null )
    {
        io.print("This item does not have a durability component: " + mainHand.typeId, cmdSource );
        return;
    }

    const durValueStr = args.shift();

    const durValue = Number.parseInt( durValueStr );

    if ( isNaN( durValue ) )
    {
        io.print("Could not convert 'durability value' argument to an integer", cmdSource);
        return;
    }

    if ( durValue < 0 )
    {
        io.print("Please enter a positive durability (or 0)", cmdSource);
        return;
    }

    mc.system.run(() =>
    {
        dur.damage = dur.maxDurability - Math.max( 1, Math.min( durValue, dur.maxDurability-1 ) );
        equip.setEquipment( mc.EquipmentSlot.Mainhand, mainHand );
        io.print("Set item durability", cmdSource);
    });
}

/**
 * Change gamemodes
 * @param { mc.Player } player 
 * @param { string[] } args
 * @param { mc.Player } cmdSource
 */
function gm( player, args, cmdSource )
{
    const gamemode = args.shift();

    if ( gamemode == null )
    {
        io.print("Please provide a gamemode argument (s, c, a, sp)", cmdSource);
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
        io.print("Unknown gamemode", cmdSource);
        return;
    }

    mc.system.run( () => {
        player.setGameMode( gm );
        io.print("Set gamemode to " + gm, cmdSource);
    });
}

/**
 * Nickname yourself
 * @param { mc.Player } player 
 * @param { string[] } args
 * @param { mc.Player } cmdSource
 */
function nick( player, args, cmdSource )
{
    let nickname = args.shift();

    if ( nickname == null || nickname.length == 0 )
    {
        io.print("Please enter a nickname", cmdSource);
        return;
    }

    if ( nickname == "clear" )
    {
        nickname = player.name;
    }

    mc.system.run(() =>
    {
        const separatorIdx = player.nameTag.lastIndexOf('\n');
        player.nameTag = nickname + player.nameTag.substring( separatorIdx );
        io.print("Set name to " + nickname, cmdSource);
    });
}

/**
 * Duplicate currently held item
 * @param { mc.Player } player 
 * @param { string[] } args
 * @param { mc.Player } cmdSource
 */
function duplicate( player, args, cmdSource )
{
    const equip = player.getComponent( mc.EntityComponentTypes.Equippable );

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
            io.print("No equipment to duplicate", cmdSource);
            return;
        }

        const inv = player.getComponent( mc.EntityComponentTypes.Inventory );

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
            io.print("Successfully duplicated equipment", cmdSource);
        });
        return;
    }

    const mainHand = equip.getEquipment( mc.EquipmentSlot.Mainhand );

    if ( mainHand == null )
    {
        io.print("Please hold the item you would like to duplicate in your main hand", cmdSource);
        return;
    }

    const inv = player.getComponent( mc.EntityComponentTypes.Inventory );

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
        io.print("Successfully duplicated item", cmdSource);
    });
}

/**
 * Run a command as another player
 * @param { mc.Player } player 
 * @param { string[] } args
 * @param { mc.Player } cmdSource
 */
function as( player, args, cmdSource )
{
    if ( args.length == 0 )
    {
        io.print("Requires a selector or player name", cmdSource );
        return;
    }

    if ( args.length == 1 )
    {
        io.print("Requires a selector or player name and a function to run", cmdSource );
        return;
    }

    const nameOrSelector = args.shift();
    const commandName = "." + args.shift();
    const command = customCommands.get( commandName );

    if ( command == null )
    {
        io.print( "Could not fund command: " + commandName, cmdSource );
        return;
    }

    if ( nameOrSelector == "@a" || nameOrSelector == "@e" )
    {
        const players = mc.world.getAllPlayers();

        for ( let i = 0; i < players.length; ++i )
        {
            command.cmd( players[ i ], args );
        }

        io.print("Ran command for selected player(s)", cmdSource);
        return;
    }
    if ( nameOrSelector == "@s" || nameOrSelector == "@p" )
    {
        command.cmd( player, args );
        io.print("Ran command for selected player(s)", cmdSource);
        return;
    }

    const players = getPlayersByName( nameOrSelector );

    if ( players.length == 0 )
    {
        io.print("No players names contained: " + nameOrSelector, cmdSource);
        return;
    }
    if ( players.length > 1 )
    {
        io.print(nameOrSelector + " is ambiguous, more than one player matches", cmdSource);
        return;
    }

    command.cmd( players[ 0 ], args );

    io.print("Ran command for selected player(s)", cmdSource);
}

import { ifCommand } from './ifCommand.js';

/**
 * Run a command based on a condition
 * @param { mc.Player } player 
 * @param { string[] } args
 * @param { mc.Player } cmdSource
 */
function ifCommandWrapper( player, args, cmdSource )
{
    const cmdName = ifCommand( player, args, cmdSource );

    if ( cmdName == null )
    {
        return;
    }

    const cmd = customCommands.get( "." + cmdName );

    if ( cmd == null )
    {
        io.print("Could not find command named: " + cmdName, cmdSource);
        return;
    }

    cmd.cmd( player, args, cmdSource );
}

/**
 * Clear all items on the ground
 * @param { mc.Player } player 
 * @param { string[] } args
 * @param { mc.Player } cmdSource
 */
function clearGroundItems( player, args, cmdSource )
{
    player.runCommandAsync("kill @e[type=item]").then( e => {
        io.print( "Removed " + e.successCount + " items from the ground", cmdSource );
    });
}

/**
 * Kill all mobs
 * @param { mc.Player } player 
 * @param { string[] } args
 * @param { mc.Player } cmdSource
 */
function butcher( player, args, cmdSource )
{
    player.runCommandAsync("kill @e[family=monster]").then( e =>
    {
        io.print("Killed " + e.successCount + " mobs", cmdSource);
    });
}

import * as text from "../spells/spell_constants.js";

/**
 * Names the players currently held item
 * @param { mc.Player } player 
 * @param { string[] } args
 * @param { mc.Player } cmdSource
 */
function nameItem( player, args, cmdSource )
{
    if ( args.length == 0 )
    {
        io.print("Expected name to give item", cmdSource);
        return;
    }

    if ( args.length > 1 )
    {
        io.print("Too many arguments", cmdSource);
        return;
    }

    let name = args.shift();

    if ( name.length == 0 )
    {
        io.print("Please have a name of at least one character", cmdSource );
        return;
    }

    const equipment = player.getComponent( mc.EntityComponentTypes.Equippable );

    const heldItem = equipment.getEquipment( mc.EquipmentSlot.Mainhand );

    if ( heldItem == null )
    {
        io.print("You must be holding the item you want to name!", cmdSource);
        return;
    }

    let color = "";

    if ( name.startsWith("{") )
    {
        const endIndex = name.indexOf("}");

        if ( endIndex != -1 )
        {
            const colorSelector = name.substring( 1, endIndex ).toLowerCase();

            switch ( colorSelector )
            {
            case "red":
                color = text.RED;
                break;
            case "blue":
                color = text.BLUE;
                break;
            case "green":
                color = text.GREEN;
                break;
            case "yellow":
                color = text.YELLOW;
                break;
            case "purple":
                color = text.DARK_PURPLE;
                break;
            case "orange":
                color = text.GOLD_1;
                break;
            case "grey":
            case "gray":
                color = text.GREY;
                break;
            case "black":
                color = text.BLACK;
                break;
            case "white":
                color = text.WHITE;
                break;
            case "aqua":
                color = text.AQUA;
                break;
            default:
                io.print("Unknown color selector: " + colorSelector, cmdSource );
                return;
            }

            name = name.substring( endIndex + 1 );
        }
    }

    const finalName = color + name;

    io.print("Setting item name to: " + finalName, cmdSource);

    mc.system.run( () =>
    {
        heldItem.nameTag = finalName;
        equipment.setEquipment( mc.EquipmentSlot.Mainhand, heldItem );
    });    
}

import { setHome, tpToHome, listHomes, removeHome, clearHomes } from './homeCommand.js';
import { getItemType, ItemType } from '../util.js';

/**
 * Sets the players home using DynamicProperties
 * @param { mc.Player } player 
 * @param { string[] } args
 * @param { mc.Player } cmdSource
 */
function homeWrapper( player, args, cmdSource )
{
    if ( args.length == 0 )
    {
        tpToHome( player, null, cmdSource );
        return;
    }

    const arg1 = args.shift();

    if ( arg1 == "set" )
    {
        if ( args.length > 1 )
        {
            io.print("Too mane arguments, expected only an optional home name for 'set'", cmdSource);
            return;
        }
        setHome( player, args.shift(), cmdSource );
        return;
    }
    if ( arg1 == "remove" )
    {
        if ( args.length > 1 )
        {
            io.print("Too mane arguments, expected only an optional home name for 'remove'", cmdSource);
            return;
        }
        removeHome( player, args.shift(), cmdSource );
        return;
    }
    if ( arg1 == "list" )
    {
        if ( args.length > 0 )
        {
            io.print("Too many arguments, no extra arguments expected for 'list'", cmdSource);
            return;
        }
        listHomes( player, cmdSource );
        return;
    }
    if ( arg1 == "clear" )
    {
        if ( args.length > 0 )
        {
            io.print("Too many arguments, no extra arguments expected for 'clear'", cmdSource);
            return;
        }
        clearHomes( player, cmdSource );
        return;
    }

    tpToHome( player, arg1, cmdSource );
}

customCommands.set( ".help", new Command( help, false,
    [
        "Lists the commands you can use, or offers help for specific commands.",
        "Usage: '.help'",
        "Or: '.help <command>'"
    ]
));
customCommands.set( ".cooldowns", new Command( cooldowns, false,
    [
        "Displays all spells currently on cooldown.",
        "Usage: '.cooldowns'"
    ]
));
customCommands.set( ".kms", new Command( kms, false,
    [
        "Kills you.",
        "Usage: '.kms'"
    ]
));
customCommands.set( ".sets", new Command( sets, true,
    [
        "Spawn full sets or items from sets.",
        "Usage: '.sets <name>'",
        "Or: '.sets piece <name>'",
        "Or: '.sets piece random'"
    ]
));
customCommands.set( ".spells", new Command( spellCommand, true,
    [
        "Edit spells for the current held item.",
        "Usage: '.spells help' - Lists spells that can be added to the item",
        "Or: '.spells add <spell>'",
        "Or: '.spells remove <spell>'",
        "Or: '.spells clear'"
    ]
));
customCommands.set( ".durability", new Command( setDurability, true,
    [
        "Set the durability for the current held item.",
        "Usage: '.durability <value>'"
    ]
));
customCommands.set( ".gm", new Command( gm, true, 
    [
        "Set your gamemode.",
        "Usage: '.gm <gamemode>'"
    ]
));
customCommands.set( ".nick", new Command( nick, false, 
    [
        "Give yourself a nickname.",
        "Usage: '.nick <name>'",
        "Or: '.nick clear'"
    ]
));
customCommands.set( ".dupe", new Command( duplicate, true, 
    [
        "Duplicate your current held item or all of your equipment.",
        "Usage: '.dupe'",
        "Or: '.dupe equipment'"
    ]
));
customCommands.set( ".as", new Command( as, true,
    [
        "Run a command as a player or selection of players.",
        "Usage: '.as <name> <command> <args...>'",
        "Or: '.as <selector> <command> <args...>'"
    ]
));
customCommands.set( ".if", new Command( ifCommandWrapper, true,
    [
        "Run a command conditionally on yourself. (Mostly to be used in combination with 'as')",
        "Usage: '.if <variable> <operator> <value> <command> <args...>'",
        "Or: '.if <variable> <operator> <value> || <variable> <operator> <value> <command> <args...>'",
        "Or: '.if variables'",
        "Or: '.if operators'"
    ]
));
customCommands.set( ".clearitems", new Command( clearGroundItems, true,
    [
        "Clears items from the ground.",
        "Usage: '.clearitems'"
    ]
));
customCommands.set( ".butcher", new Command( butcher, true,
    [
        "Kills all hostile mobs.",
        "Usage: '.butcher'"
    ]
));
customCommands.set( ".nameitem", new Command( nameItem, false,
    [
        "Names the current held item.",
        "Usage: '.nameitem <name>'",
        "<name> may take the form '{<color>}<name>' to give the name a color.",
        "For example: '.nameitem {Red}my_name'"
    ]
));
customCommands.set( ".home", new Command( homeWrapper, false,
    [
        "Edits/teleports you to your home(s).",
        "Usage: '.home set <name?>'",
        "Or: '.home <name?>'",
        "Or: '.home list'",
        "Or: '.home remove <name?>'"
    ]
));


/**
 * @param { mc.Player } player
 * @param { string } str 
 * @returns { string[] }
 */
function parseArguments( player, str )
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
 * @param { mc.Player } player
 * @param { string } commandStr
 */
export function runCommand( player, commandStr )
{
    const parts = parseArguments( player, commandStr.trim() );

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

    command.cmd( player, parts.slice( 1 ), player );
}