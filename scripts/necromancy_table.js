import * as mc from "@minecraft/server";
import * as mcui from "@minecraft/server-ui";

import { numberToRomanNumeral } from './spells/util.js';
import * as spells from './spells/spells.js';

import { print } from "./print.js";
import { RESET } from "./spells/spell_constants.js";

function addSpellToWeapon( player, weapon, spell_tier )
{
    /** @type {string[]} */
    let lore_ = weapon.getLore();

    if ( lore_.length >= 3 )
    {
        return false;
    }

    const lore_to_add = spells.getRandomWeaponSpell( lore_, spell_tier );

    lore_.push( lore_to_add );

    weapon.setLore( lore_ );

    player.getComponent("inventory").container.setItem( player.selectedSlotIndex, weapon );

    return true;
}

function addSpellToArmor( player, armor, spell_tier )
{
    /** @type {string[]} */
    const lore_ = armor.getLore();

    if ( lore_.length >= 1 )
        return false;

    const lore_to_add = spells.getRandomArmorSpell( spell_tier );

    lore_.push( lore_to_add );

    armor.setLore( lore_ );

    player.getComponent("inventory").container.setItem( player.selectedSlotIndex, armor );

    return true;
}

function addSpellToBow( player, bow, spell_tier )
{
    /** @type {string[]} */
    let lore_ = bow.getLore();

    if ( lore_.length > 2 )
        return false;

    const lore_to_add = spells.getRandomBowSpell( lore_, spell_tier );

    lore_.push( lore_to_add );

    bow.setLore( lore_ );

    player.getComponent("inventory").container.setItem( player.selectedSlotIndex, bow );

    return true;
}

function addSpellToPickaxe( player, pick, spell_tier )
{
    /** @type {string[]} */
    let lore_ = pick.getLore();

    if ( lore_.length >= 1 )
        return false;

    const lore_to_add = spells.getRandomPickaxeSpell( lore_, spell_tier );

    lore_.push( lore_to_add );

    pick.setLore( lore_ );

    player.getComponent("inventory").container.setItem( player.selectedSlotIndex, pick );

    return true;
}

function clearLore( player, item )
{
    if ( item.getLore() == undefined || item.getLore().length == 0 )
        return false;
    item.setLore([]);
    player.getComponent("inventory").container.setItem( player.selectedSlotIndex, item );
    return true;
}

function clearLastLore( player, item )
{
    /** @type string[] */
    const lore = item.getLore();

    if ( lore == undefined || lore.length == 0 )
        return false;

    lore.pop();
    item.setLore( lore );

    player.getComponent("inventory").container.setItem( player.selectedSlotIndex, item );
    return true;
}

class ItemType
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
function getItemType( item )
{
    if ( item.typeId.includes("sword")
      || item.typeId.includes("_axe") )
        return ItemType.WEAPON;

    if ( item.typeId.includes("helmet")
      || item.typeId.includes("chestplate")
      || item.typeId.includes("leggings")
      || item.typeId.includes("boots") )
        return ItemType.ARMOR;

    if ( item.typeId.endsWith('bow') )
        return ItemType.BOW;

    if ( item.typeId.includes('ickaxe') )
        return ItemType.PICKAXE;

    if ( item.typeId.includes("book") )
        return ItemType.BOOK;

    return ItemType.VOID;
}

function getMaxSpellCountForItemType( type )
{
    switch ( type )
    {
    case ItemType.WEAPON:  return 3;
    case ItemType.ARMOR:   return 1;
    case ItemType.BOW:     return 3;
    case ItemType.PICKAXE: return 1;
    case ItemType.BOOK:    return 1;
    }

    return 0;
}

function getItemTypeName( type )
{
    switch ( type )
    {
    case ItemType.WEAPON:  return "weapon";
    case ItemType.ARMOR:   return "armor";
    case ItemType.BOW:     return "bow";
    case ItemType.PICKAXE: return "pickaxe";
    case ItemType.BOOK:    return "book";
    }

    return "unknown";
}

function getAllSpellsForType( type )
{
    switch ( type )
    {
    case ItemType.WEAPON:  return spells.getAllWeaponSpells();
    case ItemType.ARMOR:   return spells.getAllArmorSpells();
    case ItemType.BOW:     return spells.getAllBowSpells();
    case ItemType.PICKAXE: return spells.getAllPickaxeSpells();
    }

    throw new Error("Unknown item type");
}

function removeLevels( player, levels )
{
    player.runCommandAsync("xp -" + levels.toString() + "L @s");
}

/**
 * @param { mc.Player } player 
 * @param { mc.ItemStack } item
 */
export function showNecromancyTable( player, item )
{
    if ( player.hasTag("in_nec_menu") )
        return;

    player.addTag("in_nec_menu");

    const form = new mcui.ActionFormData()
        .title("Necromancy Table")
        .body("Choose an spell level to apply.\nYou can apply 3 spells on a weapon and 1 spell per piece of armor")
        .button("Weak Spellcast:\n§2§l5 Levels")
        .button("Minor Spellcast:\n§2§l10 Levels")
        .button("Normal Spellcast:\n§2§l15 Levels")
        .button("Major Spellcast:\n§2§l20 Levels")
        .button("Max Spellcast:\n§2§l25 Levels")
        .button("Clear Last Spell:\n§2§l5 Levels")
        .button("Clear Spell(s)")
        .button("Cast Specific Spell");

    form.show( player ).then( response =>
    {
        player.removeTag( "in_nec_menu" );

        if ( response.cancelled || response.selection == undefined )
            return;

        if ( item == undefined )
            return;

        /** @type number */
        const selection = response.selection + 1;

        const required_levels = [ 5, 10, 15, 20, 25, 5, 0, 0 ];

        const required_level = required_levels[ selection - 1 ];

        if ( player.level < required_level )
        {
            player.sendMessage("You do not have enough levels!");
            return;
        }

        const spell_tier = selection;

        const REMOVE_LAST = 6;
        const REMOVE_LORE = 7;
        const SPECIFIC    = 8;

        const itemType = getItemType( item );

        if ( itemType == ItemType.VOID )
        {
            print("This item can't be used!", player);
            return;
        }

        if ( selection != REMOVE_LAST && selection != REMOVE_LORE )
        {
            const maxSpellCount = getMaxSpellCountForItemType( itemType );

            if ( item.getLore().length >= maxSpellCount )
            {
                print("Cannot add more than " + maxSpellCount + " spell(s) to an item of type: " + getItemTypeName( itemType ), player );
                return;
            }
        }

        if ( selection == SPECIFIC )
        {
            if ( itemType == ItemType.BOOK )
            {
                print("Cannot select specific spell for a book", player);
                return;
            }

            const infos = getAllSpellsForType( itemType );

            const spellNames = infos.map( info => info.name );

            const chooseSpell = new mcui.ModalFormData()
                .title("Cast Specific Spell")
                .dropdown("Choose a Spell", spellNames);

            chooseSpell.show( player ).then( res => {

                if ( res.canceled || res.formValues == null )
                    return;

                const values = res.formValues;

                /** @type number */
                const indexOfSpell = values[ 0 ];

                const selectedInfo = infos[ indexOfSpell ];

                const lore = item.getLore();

                for ( let i = 0; i < lore.length; ++i )
                {
                    if ( lore[ i ].startsWith( selectedInfo.name ) )
                    {
                        print("This item already has this spell on it!", player);
                        return;
                    }
                }

                const levels = selectedInfo.hasTiers() ? selectedInfo.getSpellTiers() : [ 1 ];

                for ( let i = 0; i < levels.length; ++i )
                {
                    let required_level = 0;

                    if ( selectedInfo.hasTiers() )
                    {
                        required_level = required_levels[ selectedInfo.getCastTierOfSpellTier( i + 1 ) - 1 ];
                    }
                    else
                    {
                        required_level = required_levels[ selectedInfo.minimumCastTier - 1 ];
                    }

                    required_level = Math.round( required_level * 1.5 );

                    required_level = Math.ceil( required_level / 5 ) * 5;

                    levels[ i ] = "Spell Tier " + numberToRomanNumeral( levels[ i ] ) + " (§2§l" + required_level.toString() + " levels" + RESET + ")";
                }

                const levelSelection = new mcui.ModalFormData()
                    .title("Select Spell Cast Tier")
                    .dropdown("Spell Tier", levels );

                levelSelection.show( player ).then( resp =>
                {
                    if ( resp.canceled || resp.formValues == null )
                        return;

                    /** @type number */
                    const spellLevel = resp.formValues[ 0 ] + 1;

                    let required_level = 0;

                    if ( selectedInfo.hasTiers() )
                    {
                        required_level = required_levels[ selectedInfo.getCastTierOfSpellTier( spellLevel ) - 1 ];
                    }
                    else
                    {
                        required_level = required_levels[ selectedInfo.minimumCastTier - 1 ];
                    }

                    required_level = Math.round( required_level * 1.5 );

                    required_level = Math.ceil( required_level / 5 ) * 5;

                    if ( player.level < required_level )
                    {
                        print("You do not have enough levels! (need " + required_level.toString() + ")", player);
                        return;
                    }

                    const finalSpell = selectedInfo.hasTiers() ? selectedInfo.name + numberToRomanNumeral( spellLevel ) : selectedInfo.name;

                    lore.push( finalSpell );

                    item.setLore( lore );

                    player.getComponent("inventory").container.setItem( player.selectedSlotIndex, item );
                    removeLevels( player, required_level );
                });
            });

            return;
        }

        switch ( itemType )
        {
        case ItemType.WEAPON:
        {
            if ( selection == REMOVE_LORE ) 
            {
                clearLore( player, item );
                return;
            }
            else if ( selection == REMOVE_LAST && !clearLastLore( player, item ) ) return;
            
            else if ( selection < REMOVE_LAST && !addSpellToWeapon( player, item, spell_tier ) ) return;

            removeLevels( player, required_level );
            return;
        }
        case ItemType.ARMOR:
        {
            if ( selection == REMOVE_LORE )
            {
                clearLore( player, item );
                return;
            }
            else if ( selection == REMOVE_LAST && !clearLastLore( player, item ) ) return;

            else if ( selection < REMOVE_LAST && !addSpellToArmor( player, item, spell_tier ) ) return;

            removeLevels( player, required_level );
            return;
        }
        case ItemType.BOW:
        {
            if ( selection === REMOVE_LORE )
            {
                clearLore( player, item );
                return;
            }
            else if ( selection == REMOVE_LAST && !clearLastLore( player, item ) ) return;
            else if ( selection < REMOVE_LAST && !addSpellToBow( player, item, spell_tier ) ) return;

            removeLevels( player, required_level );
            return;
        }
        case ItemType.PICKAXE:
        {
            if ( selection === REMOVE_LORE )
            {
                clearLore( player, item );
                return;
            }
            else if ( selection == REMOVE_LAST && !clearLastLore( player, item ) ) return;
            else if ( selection < REMOVE_LAST && !addSpellToPickaxe( player, item, spell_tier ) ) return;

            removeLevels( player, required_level );
            return;
        }
        case ItemType.BOOK:
        {
            if ( selection == REMOVE_LORE )
            {
                player.getComponent("inventory").container.setItem( player.selectedSlotIndex, new mc.ItemStack( "book", 1 ) );
            }
            else if ( selection == REMOVE_LAST && !clearLastLore( player, item ) ) return;
            else
            {
                const convertTierToBookTier = ['I', 'I', 'II', 'V', 'X'];
                player.runCommandAsync("clear @s book 0 1");
                player.runCommandAsync("function tier" + convertTierToBookTier[ spell_tier - 1 ] );
            }
            
            removeLevels( player, required_level );
            return;
        }
        }
    });
}

/**
 * @param {mc.ItemStack} item 
 * @returns 
 */
export function itemIsArmor( item )
{
    const type = item.typeId;
    return type.includes( "chestp" ) || type.includes( "helm" ) || type.includes( "legg" ) || type.includes( "boots" );
}

export function itemIsNotArmor( item )
{
    return !itemIsArmor( item );
}
