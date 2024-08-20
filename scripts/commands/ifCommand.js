import * as mc from "@minecraft/server";
import * as io from "../print.js";

class Operator
{
    static get void() { return 0; }
    static get equals() { return 1; }
    static get notEquals() { return 2; }
    static get lessThan() { return 3; }
    static get greaterThan() { return 4; }
    static get lessThanOrEqualTo() { return 5; }
    static get greaterThanOrEqualTo() { return 6; }
    static get includes() { return 7; }
    static get has() { return 8; }
}

/** @type { Map< string, (player: mc.Player, operator: number, value: string ) => bool > } */
const variableCheckers = new Map([
    ["name", (player, operator, value) => {
        switch( operator )
        {
        case Operator.equals:
            return player.name.toLowerCase() == value;
        case Operator.notEquals:
            return player.name.toLowerCase() != value;
        case Operator.includes:
            return player.name.toLowerCase().includes( value );
        }
        return false;
    }],
    ["level", (player, operator, value) => {
        const levels = Number.parseInt( value );
        if ( isNaN( levels ) )
            return false;

        switch ( operator )
        {
        case Operator.equals:
            return player.level == levels;
        case Operator.notEquals:
            return player.level != levels;
        case Operator.lessThan:
            return player.level < levels;
        case Operator.greaterThan:
            return player.level > levels;
        case Operator.lessThanOrEqualTo:
            return player.level <= levels;
        case Operator.greaterThanOrEqualTo:
            return player.level >= levels;
        }
        return false;
    }],
    ["equipment", (player, operator, value) => {
        if ( operator != Operator.includes )
            return false;

        const slots = [ mc.EquipmentSlot.Head, mc.EquipmentSlot.Chest, mc.EquipmentSlot.Legs, mc.EquipmentSlot.Feet, mc.EquipmentSlot.Mainhand ];

        const equipment = player.getComponent( mc.EntityComponentTypes.Equippable );

        if ( equipment == null )
            return false;

        for ( let i = 0; i < slots.length; ++i )
        {
            const e = equipment.getEquipment( slots[ i ] );

            if ( e == null )
                continue;

            if ( e.typeId.toLowerCase().includes( value ) )
                return true;
        }

        return false;
    }],
    ["isop", (player, operator, value) => {
        let realValue = false;

        if ( value == "true" || value == "t" )
        {
            realValue = true;
        }
        else if ( value == "false" || value == "f" )
        {
            realValue = false;
        }
        else
        {
            return false;
        }

        switch ( operator )
        {
        case Operator.equals:
            return player.isOp() == realValue;
        case Operator.notEquals:
            return player.isOp() != realValue;
        }

        return false;
    }],
    ["inventory", (player, operator, value) => {
        if ( operator != Operator.includes && operator != Operator.has )
            return false;

        const inv = player.getComponent( mc.EntityComponentTypes.Inventory ).container;

        for ( let i = 0; i < inv.size; ++i )
        {
            const item = inv.getItem( i );

            if ( item == null )
                continue;

            if ( item.typeId.includes( value ) )
                return true;
        }

        return false;
    }]
]);

const operatorStringToOperatorNum = new Map([
    ["==", Operator.equals],
    ["!=", Operator.notEquals],
    ["<", Operator.lessThan],
    [">", Operator.greaterThan],
    ["<=", Operator.lessThanOrEqualTo],
    [">=", Operator.greaterThanOrEqualTo],
    ["includes", Operator.includes],
    ["has", Operator.has]
]);

function operatorStringToOperator( operator )
{
    return operatorStringToOperatorNum.get( operator ) || Operator.void;
}

/**
 * @param { mc.Player } player 
 * @param { string[] } args
 * @param { mc.Player } cmdSource
 */
export function ifCommand( player, args, cmdSource )
{
    if ( args.length == 0 )
    {
        io.print("Expected condition to check!", cmdSource);
        return null;
    }

    if ( args.length == 1 )
    {
        const arg = args[ 0 ].toLowerCase();

        if ( arg == "variables" )
        {
            io.print("Variables you can use:\n", cmdSource);
            io.print( Array.from( variableCheckers.keys() ).join("\n"), cmdSource );
            return;
        }
        if ( arg == "operators" )
        {
            io.print("Operators you can use (not all operators are supported by all variables):", cmdSource);
            io.print( Array.from( operatorStringToOperatorNum.keys() ).join("\n"), cmdSource );
            return;
        }
    }

    if ( args.length <= 3 )
    {
        io.print("Expected variable to check, operator, value, and command to run", cmdSource);
        return null;
    }

    const operators = [];
    const values = [];
    const checkers = [];

    let hasOr = false;

    do
    {
        const variable = args.shift().toLowerCase();
        const operator = args.shift().toLowerCase();
        const value = args.shift().toLowerCase();

        if ( args.length == 0 )
        {
            io.print("Expected '||' or command name", cmdSource);
            return null;
        }

        const commandNameOrOR = args[ 0 ].toLowerCase();

        if ( commandNameOrOR == "||" )
        {
            args.shift();
            hasOr = true;
        }
        else
        {
            hasOr = false;
        }

        const checker = variableCheckers.get( variable );

        if ( checker == null )
        {
            io.print("Unknown variable: '" + variable + "'", cmdSource );
            return null;
        }

        const operatorNum = operatorStringToOperator( operator );

        if ( operatorNum == Operator.void )
        {
            io.print("Unknown operator: " + operator, cmdSource);
            return null;
        }

        operators.push( operatorNum );
        values.push( value );
        checkers.push( checker );
    }
    while ( hasOr && args.length > 3 );

    if ( hasOr )
    {
        io.print("Incorrect syntax, unexpected '||'", cmdSource);
        return null;
    }

    if ( args.length == 0 )
    {
        io.print("Expected a command to conditionally run!", cmdSource);
        return null;
    }

    /** @type { string } */
    const commandName = args.shift();

    let anyCheckerPasses = false;

    for ( let i = 0; i < values.length; ++i )
    {
        if ( checkers[ i ]( player, operators[ i ], values[ i ] ) )
        {
            anyCheckerPasses = true;
            break;
        }
    }

    if ( anyCheckerPasses )
    {
        return commandName;
    }

    return null;
}