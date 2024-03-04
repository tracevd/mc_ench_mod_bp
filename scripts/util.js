import * as mc from "@minecraft/server"

export function print( msg, to = mc.world )
{
    to.sendMessage( msg + '' );
}

export function printObjectFields( obj )
{
    for ( const field in obj )
    {
        print( field );
    }
}