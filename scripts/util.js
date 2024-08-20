import * as mc from "@minecraft/server";

import * as spells from "./spells/spells.js";

/**
 * In the entity's equipment, repairs any gear that has the UNBREAKABLE
 * spell
 * @param { mc.Entity } entity 
 */
export function tryToRepairUnbreakableGear( entity )
{
    const equipment = entity.getComponent( mc.EntityComponentTypes.Equippable );

    if ( equipment == null )
        return;

    const slots = [ mc.EquipmentSlot.Head, mc.EquipmentSlot.Chest, mc.EquipmentSlot.Legs, mc.EquipmentSlot.Feet, mc.EquipmentSlot.Mainhand, mc.EquipmentSlot.Offhand ];

    for ( const slot of slots )
    {
        const item = equipment.getEquipment( slot );

        if ( item == null || !item.getLore().includes( spells.UNBREAKABLE ) )
            continue;

        const dur = item.getComponent( mc.ItemComponentTypes.Durability );

        if ( dur == null || dur.damage == 0 )
            continue;

        dur.damage = 0;
        equipment.setEquipment( slot, item );
    }
}

export class ItemType
{
    static get VOID()    { return 0; }
    static get WEAPON()  { return 1; }
    static get ARMOR()   { return 2; }
    static get BOW()     { return 3; }
    static get PICKAXE() { return 4; }
    static get BOOK()    { return 5; }
}

/**
 * @param { mc.ItemStack } item 
 */
export function isBow( item )
{
    return item.typeId.endsWith("bow");
}

/**
 * @param { mc.ItemStack } item 
 */
export function isWeapon( item )
{
    return item.typeId.includes("sword") || item.typeId.includes("_axe");
}

/**
 * @param { mc.ItemStack } item 
 * @returns 
 */
export function isArmor( item )
{
    return item.typeId.includes("helmet")
    || item.typeId.includes("chestplate")
    || item.typeId.includes("leggings")
    || item.typeId.includes("boots")
    || item.typeId == "minecraft:elytra";
}

/**
 * @param { mc.ItemStack } item 
 */
export function isPickaxe( item )
{
    return item.typeId.includes('ickaxe');
}

/**
 * @param { mc.ItemStack } item 
 */
export function isBook( item )
{
    return item.typeId == "minecraft:book";
}

/**
 * @param { mc.ItemStack | null } item 
 */
export function getItemType( item )
{
    if ( item == null )
        return ItemType.VOID;

    if ( isWeapon( item ) )
        return ItemType.WEAPON;

    if ( isArmor( item ) )
        return ItemType.ARMOR;

    if ( isBow( item ) )
        return ItemType.BOW;

    if ( isPickaxe( item ) )
        return ItemType.PICKAXE;

    if ( isBook( item ) )
        return ItemType.BOOK;

    return ItemType.VOID;
}