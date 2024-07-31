import * as mc from "@minecraft/server";

/** @type { mc.Player } */
let owner = null;
let alreadySet = false;

/**
 * @param { mc.Player } player 
 */
export function setOwner( player )
{
    if ( alreadySet )
        throw new Error("Owner has already been set!");

    alreadySet = true;
    owner = player;
}

export function getOwner()
{
    return owner;
}