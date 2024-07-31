import * as mc from "@minecraft/server";

import { secondsToTicks } from "../util.js";

export class StampedeStateMachine
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
        if ( isCorrupted || !player.isSprinting )
        {
            this.swiftnessLevel = -1;
            this.lastActivationTick = currentTick;
            player.removeEffect("speed");
            return;
        }

        if ( this.swiftnessLevel == this.tier )
        {
            player.addEffect("speed", secondsToTicks( 19 ), { showParticles: false, amplifier: this.swiftnessLevel } );
            return;
        }

        if ( currentTick - this.lastActivationTick < secondsToTicks( 4 ) )
        {
            return;
        }

        this.swiftnessLevel += 1;
        this.lastActivationTick = currentTick;

        player.addEffect("speed", secondsToTicks( 19 ), { showParticles: false, amplifier: this.swiftnessLevel } );
    }

    /**
     * @param { mc.Player } player 
     */
    remove( player )
    {
        player.removeEffect("speed");
    }

    /** @type { string } */
    spell;

    /** @type { number } */
    tier;

    lastActivationTick;
    swiftnessLevel = -1;
}