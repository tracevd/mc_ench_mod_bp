import * as mc from "@minecraft/server";
import { secondsToTicks } from "../util";

export class LeapingStateMachine
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
            player.removeEffect("jump_boost");
        }
        player.addEffect( "jump_boost", secondsToTicks( 15 ), { amplifier: 1, showParticles: false } );
    }

    remove( player )
    {
        player.removeEffect("jump_boost");
    }
    
    /** @type { string } */
    spell;

    /** @type { number } */
    tier;
}