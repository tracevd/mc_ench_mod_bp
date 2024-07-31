import * as mc from "@minecraft/server";
import { secondsToTicks } from "../util";

export class ResilienceStateMachine
{
    constructor( spell, tier, currentTick )
    {
        this.spell = spell;
        this.tier = tier;        
        this.lastActivationTick = currentTick - 1;
    }

    /**
     * @param { mc.Player } player
     * @param { number } currentTick
     * @param { boolean } isCorrupted
     */
    update( player, currentTick, isCorrupted )
    {
        player.addEffect( "health_boost", secondsToTicks( 15 ), { amplifier: this.tier - 1, showParticles: false } );
    }

    remove( player )
    {
        player.removeEffect("health_boost");
    }
    
    /** @type { string } */
    spell;

    /** @type { number } */
    tier;
}