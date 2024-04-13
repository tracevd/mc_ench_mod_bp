import * as mc from "@minecraft/server"

export class WeaponEvent
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

    /** @type { mc.Entity } The entity being attacked */
    target;

    /** @type { mc.Entity } The entity attacking the target */
    source;

    /** @type { number } */
    damage;

    /** @type { boolean } */
    reflected;

    /** @type { boolean } */
    sourceIsCorrupted;

    /** @type { string[] } */
    reflectableSpells = [];
}

export class ArmorActivateEvent
{
    constructor( target, source, damage, targetIsCorrupted, reflectableSpells, causedByProjectile )
    {
        this.target = target;
        this.source = source;
        this.damage = damage;
        this.targetIsCorrupted = targetIsCorrupted;
        this.reflectableSpells = reflectableSpells;
        this.causedByProjectile = causedByProjectile;
    }

    /** @type { mc.Entity } The entity being attacked */
    target;

    /** @type { mc.Entity } The entity attacking the target */
    source;
    
    /** @type { number } */
    damage;

    /** @type { mc.EquipmentSlot } */
    equipmentSlot;

    /** @type { boolean } */
    targetIsCorrupted;

    /** @type { string[] } */
    reflectableSpells;

    /** @type { boolean } */
    causedByProjectile;

    /** @type { boolean } */
    evaded = false;
}

export class BowReleaseEvent
{
    constructor( source, projectile )
    {
        this.source = source;
        this.projectile = projectile;
    }

    /** @type { mc.Entity } */
    source;

    /** @type { mc.Entity } */
    projectile;
}
