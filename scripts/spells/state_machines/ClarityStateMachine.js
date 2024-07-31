import * as mc from "@minecraft/server";
import { secondsToTicks } from "../util";

export class ClarityStateMachine
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
        if ( isCorrupted )
        {
            player.removeEffect("night_vision");
        }
        player.addEffect( "night_vision", secondsToTicks( 15 ), { amplifier: 0, showParticles: false } );
    }

    remove( player )
    {
        player.removeEffect("night_vision");
    }
    
    /** @type { string } */
    spell;

    /** @type { number } */
    tier;
}