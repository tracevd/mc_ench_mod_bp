import * as mc from "@minecraft/server";

import * as spells from "./spells/spells.js";

/**
 * In the entity's equipment, repairs any gear that has the UNBREAKABLE
 * spell
 * @param {mc.Entity} entity 
 */
export function tryToRepairUnbreakableGear( entity )
{
    const equipment = entity.getComponent("equippable");

    if ( equipment == null )
        return;

    const slots = [ mc.EquipmentSlot.Head, mc.EquipmentSlot.Chest, mc.EquipmentSlot.Legs, mc.EquipmentSlot.Feet, mc.EquipmentSlot.Mainhand, mc.EquipmentSlot.Offhand ];

    for ( const slot of slots )
    {
        const item = equipment.getEquipment( slot );

        if ( item == null || !item.getLore().includes( spells.UNBREAKABLE ) )
            continue;

        const dur = item.getComponent("durability");

        if ( dur == null || dur.damage == 0 )
            continue;

        dur.damage = 0;
        equipment.setEquipment( slot, item );
    }
}