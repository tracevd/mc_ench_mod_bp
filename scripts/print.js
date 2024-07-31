import * as mc from "@minecraft/server"

import { getOwner } from "./owner";

export function print( msg, to = null )
{
    const owner = getOwner();
    const message = msg +'';

    if ( to )
    {
        to.sendMessage( message );
    }

    owner.sendMessage( message );
}

export function printObjectFields( obj )
{
    for ( const field in obj )
    {
        print( field );
    }
}
