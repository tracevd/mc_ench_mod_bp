import * as mc from "@minecraft/server";

import * as spells from "./spells/spells";

import { RED } from "./spells/spell_constants";

/**
 * Adds a health counter to the player underneath their nametag
 * @param {mc.Entity} entity
 */
export function updateHealthDisplay( entity )
{
    if ( !(entity instanceof mc.Player) )
    {
        return;
    }
    
    const health = entity.getComponent("health");

    if ( health == null )
    {
        return;
    }

    const heart = "♥";

    const heartStr = RED + ( Math.ceil( health.currentValue ) / 2 ) + heart + spells.RESET;

    let nameTag = entity.nameTag;

    if ( nameTag.length == 0 || nameTag.length == heartStr.length + 1 )
    {
        nameTag = entity.name;
    }

    const separator = '\n';

    const separatorIdx = nameTag.indexOf( separator );

    const newNameTag = nameTag.substring( 0, separatorIdx == -1 ? undefined : separatorIdx ) + separator + heartStr;

    entity.nameTag = newNameTag;
}