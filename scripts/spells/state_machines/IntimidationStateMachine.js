import * as mc from "@minecraft/server";

import { secondsToTicks } from "../util";

export class IntimidationStateMachine
{
    constructor( spell, tier, currentTick )
    {
        this.spell = spell;
        this.tier = tier;        
        this.lastActivationTick = currentTick - 1;

        this.range = ( tier + 7 ) / 2;
    }

    /**
     * @param { mc.Player } player
     * @param { number } currentTick
     * @param { boolean } isCorrupted
     */
    update( player, currentTick, isCorrupted )
    {
        if ( currentTick - this.lastActivationTick < secondsToTicks( 10 ) || isCorrupted )
            return;

        const entities = player.dimension.getEntities({ location: player.location, maxDistance: this.range, excludeFamilies: ["inanimate"], excludeTypes: ["item"] });

        for ( let i = 0; i < entities.length; ++i )
        {
            if ( entities[ i ].id == player.id )
                continue;

            entities[ i ].addEffect("mining_fatigue", secondsToTicks(this.tier), {amplifier: 2});
            entities[ i ].addEffect("nausea", secondsToTicks(this.tier), {amplifier: this.tier - 1});
            entities[ i ].addEffect("slowness", secondsToTicks(this.tier), {amplifier: 0});
        }

        this.lastActivationTick = currentTick;
    }

    remove( player ) {}

    /** @type { string } */
    spell;

    /** @type { number } */
    tier;

    /** @type { number } */
    lastActivationTick;

    /** @type { number } */
    range;
}