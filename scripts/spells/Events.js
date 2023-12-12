import * as mc from "@minecraft/server"

export class HandheldWeaponEvent
{
    /**
     * @param {mc.Entity} target 
     * @param {mc.Entity} source 
     * @param {number} damage 
     */
    constructor( target, source, damage, sourceIsCorrupted, reflected = false )
    {
        this.target = target;
        this.source = source;
        this.damage = damage;
        this.sourceIsCorrupted = sourceIsCorrupted;
        this.reflected = reflected;
    }

    /** @type { mc.Entity } */
    target;

    /** @type { mc.Entity } */
    source;

    /** @type { number } */
    damage;

    /** @type { boolean } */
    reflected;

    /** @type { boolean } */
    sourceIsCorrupted;
}

export class ArmorActivateEvent
{
    constructor( target, source, damage, sourceIsCorrupted )
    {
        this.target = target;
        this.source = source;
        this.damage = damage;
        this.sourceIsCorrupted = sourceIsCorrupted;
    }

    /** @type { mc.Entity } */
    target;

    /** @type { mc.Entity } */
    source;
    
    /** @type { number } */
    damage;

    /** @type { boolean } */
    sourceIsCorrupted;
}
