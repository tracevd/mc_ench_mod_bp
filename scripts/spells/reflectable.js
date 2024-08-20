import * as mc from "@minecraft/server";

import { WeaponEvent } from "./events";

/**
 * @param { WeaponEvent } event 
 * @param { string } effect 
 */
export function makeReflectable( event, effect, tier )
{
    event.reflectableSpells.push( effect + " " + tier );
}