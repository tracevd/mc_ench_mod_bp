import * as mc from "@minecraft/server"

export class HandheldWeaponEvent
{
    /**
     * @param {mc.Entity} target 
     * @param {mc.Entity} source 
     * @param {number} damage 
     */
    constructor( target, source, damage )
    {
        this.target = target;
        this.source = source;
        this.damage = damage;
    }

    /** @type { mc.Entity } */
    target;

    /** @type { mc.Entity } */
    source;

    /** @type { number } */
    damage;
}

export class ArmorActivateEvent
{
    constructor( target, source, damage )
    {
        this.target = target;
        this.source = source;
        this.damage = damage;
    }

    /** @type { mc.Entity } */
    target;

    /** @type { mc.Entity } */
    source;
    
    /** @type { number } */
    damage;
}
