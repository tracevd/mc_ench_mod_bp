import * as mc from "@minecraft/server";
import { secondsToTicks } from "../util";

export class SteadfastStateMachine
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
            player.removeEffect("resistance");
            return;
        }

        player.addEffect("resistance", secondsToTicks( 15 ), { showParticles: false, amplifier: 0 } );
    }

    remove( player )
    {
        player.removeEffect("resistance");
    }
    
    /** @type { string } */
    spell;

    /** @type { number } */
    tier;
}