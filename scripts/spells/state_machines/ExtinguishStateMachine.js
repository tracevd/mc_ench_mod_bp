import * as mc from "@minecraft/server";

export class ExtinguishStateMachine
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
            return;
        }

        if ( player.getComponent("onfire") != null
          && Math.random() < this.tier / 10 )
        {
            player.extinguishFire();
        }
    }

    remove( player ) {}
    
    /** @type { string } */
    spell;

    /** @type { number } */
    tier;
}