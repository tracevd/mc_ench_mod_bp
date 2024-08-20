import * as mc from "@minecraft/server";
import * as mcui from "@minecraft/server-ui";

import { numberToRomanNumeral } from './spells/util.js';
import * as spells from './spells/spells.js';

import { print } from "./print.js";
import { RESET } from "./spells/spell_constants.js";

import { getItemType, ItemType } from "./util.js";

/**
 * @param { mc.Player } player 
 * @param { mc.ItemStack } item 
 * @param { string[] } lore 
 */
function refreshHeldItemWithLore( player, item, lore )
{
    item.setLore( lore )

    player.getComponent( mc.EntityComponentTypes.Inventory ).container.setItem( player.selectedSlotIndex, item );
}

function clearLore( player, item )
{
    if ( item.getLore().length == 0 )
        return false;

    refreshHeldItemWithLore( player, item, [] );

    return true;
}

function clearLastLore( player, item )
{
    /** @type string[] */
    const lore = item.getLore();

    if ( lore.length == 0 )
        return false;

    lore.pop();

    refreshHeldItemWithLore( player, item, lore );

    return true;
}

function getMaxSpellCountForItemType( itemType )
{
    switch ( itemType )
    {
    case ItemType.WEAPON:  return 3;
    case ItemType.ARMOR:   return 1;
    case ItemType.BOW:     return 3;
    case ItemType.PICKAXE: return 1;
    case ItemType.BOOK:    return 1;
    }

    return 0;
}

function getItemTypeName( itemType )
{
    switch ( itemType )
    {
    case ItemType.WEAPON:  return "weapon";
    case ItemType.ARMOR:   return "armor";
    case ItemType.BOW:     return "bow";
    case ItemType.PICKAXE: return "pickaxe";
    case ItemType.BOOK:    return "book";
    }

    return "unknown";
}

function getAllSpellsForType( itemType )
{
    switch ( itemType )
    {
    case ItemType.WEAPON:  return spells.getAllWeaponSpells();
    case ItemType.ARMOR:   return spells.getAllArmorSpells();
    case ItemType.BOW:     return spells.getAllBowSpells();
    case ItemType.PICKAXE: return spells.getAllPickaxeSpells();
    }

    throw new Error("Unknown item type");
}

function getRandomSpellForType( itemType, spellTier, alreadyHas = null )
{
    switch ( itemType )
    {
    case ItemType.ARMOR:
        return spells.getRandomArmorSpell( spellTier );
    case ItemType.WEAPON:
        return spells.getRandomWeaponSpell( alreadyHas, spellTier );
    case ItemType.BOW:
        return spells.getRandomBowSpell( alreadyHas, spellTier );
    case ItemType.PICKAXE:
        return spells.getRandomPickaxeSpell( spellTier );
    }

    throw new Error("Unsupported ItemType");
}

/**
 * @param { mc.Player } player
 * @param { mc.ItemStack } item
 * @param { number } itemType
 * @param { number } spellTier
 */
function addSpellToItem( player, item, itemType, spellTier )
{
    const lore = item.getLore();

    if ( lore.length >= getMaxSpellCountForItemType( itemType ) )
        return false;

    lore.push( getRandomSpellForType( itemType, spellTier, lore ) );

    refreshHeldItemWithLore( player, item, lore );

    return true;
}

function removeLevels( player, levels )
{
    player.runCommandAsync("xp -" + levels.toString() + "L @s");
}

const WEAK_SPELL   = 1;
const MINOR_SPELL  = 2;
const NORMAL_SPELL = 3;
const MAJOR_SPELL  = 4;
const MAX_SPELL    = 5;

const defaultRequiredLevels = [
    5,  // weak spellcast
    10, // minor spellcast
    15, // normal spellcast
    20, // major spellcast
    25, // max spellcast
    5,  // clear last spell
    0,  // clear spells
    0   // cast specific spell
];


/**
 * @param { mc.Player } player
 * @param { mc.ItemStack } item
 * @param { number } itemType
 */
function castSpecificSpell( player, item, itemType )
{
    if ( itemType == ItemType.BOOK )
    {
        print("Cannot select specific spell for a book", player);
        return;
    }

    const infos = getAllSpellsForType( itemType );

    const chooseSpell = new mcui.ModalFormData()
        .title("Cast Specific Spell")
        .dropdown("Choose a Spell", infos.map( info => info.name ) );

    chooseSpell.show( player ).then( res =>
    {
        if ( res.canceled || res.formValues == undefined )
            return;

        /** @type spells.SpellInfo */
        const selectedInfo = infos[ res.formValues[ 0 ] ];

        const lore = item.getLore();

        for ( let i = 0; i < lore.length; ++i )
        {
            if ( lore[ i ].startsWith( selectedInfo.name ) )
            {
                print("This item already has the spell" + selectedInfo + spells.RESET + " on it!", player);
                return;
            }
        }

        /** @type number[] */
        const specificSpellRequiredLevels = [];
        /** @type string[] */
        const levelDisplayStrings = [];

        const spellTiers = selectedInfo.getSpellTiers();

        for ( let i = 0; i < spellTiers.length; ++i )
        {
            let specificSpellRequiredLevel = 0;

            if ( selectedInfo.hasTiers() )
            {
                specificSpellRequiredLevel = defaultRequiredLevels[ selectedInfo.getCastTierOfSpellTier( i + 1 ) - 1 ];
            }
            else
            {
                specificSpellRequiredLevel = defaultRequiredLevels[ selectedInfo.minimumCastTier - 1 ];
            }

            specificSpellRequiredLevel = Math.ceil( Math.round( specificSpellRequiredLevel * 1.5 ) / 5 ) * 5;

            specificSpellRequiredLevels.push( specificSpellRequiredLevel );
            levelDisplayStrings.push( "Spell Tier " + numberToRomanNumeral( spellTiers[ i ] ) + " (§2§l" + specificSpellRequiredLevel.toString() + " levels" + RESET + ")" );
        }

        const levelSelection = new mcui.ModalFormData()
            .title("Select Spell Cast Tier")
            .dropdown("Spell Tier", levelDisplayStrings );

        levelSelection.show( player ).then( resp =>
        {
            if ( resp.canceled || resp.formValues == null )
                return;

            /** @type number */
            const spellLevel = resp.formValues[ 0 ] + 1;

            const specificSpellRequiredLevel = specificSpellRequiredLevels[ spellLevel - 1 ];

            if ( player.level < specificSpellRequiredLevel )
            {
                print("You do not have enough levels! (need " + specificSpellRequiredLevel.toString() + ")", player);
                return;
            }

            lore.push( selectedInfo.hasTiers() ? selectedInfo.name + numberToRomanNumeral( spellLevel ) : selectedInfo.name );
            refreshHeldItemWithLore( player, item, lore );
            removeLevels( player, specificSpellRequiredLevel );
        });
    });
}

/**
 * @param { mc.Player } player
 * @param { mc.Block } block
 */
function getBookshelfCount( player, block )
{
    const directions = [
        "east",
        "west",
        "north",
        "south"
    ];

    const perpendicularDirections = [
        "south",
        "south",
        "east",
        "east"
    ];

    let bookshelfCount = 0;

    for ( let i = 0; i < directions.length; ++i )
    {
        /** @type mc.Block */
        const blockInDirection = block[ directions[ i ] ]( 2 );

        /** @type mc.Block */
        const blockStart = blockInDirection[ perpendicularDirections[ i ] ]( -1 );
        /** @type mc.Block */
        const blockEnd   = blockInDirection[ perpendicularDirections[ i ] ]( 1 ).above();

        let it = blockStart;

        while ( it.x <= blockEnd.x && it.z <= blockEnd.z )
        {
            if ( it.typeId == "minecraft:bookshelf" )
                ++bookshelfCount;

            if ( it.x == blockEnd.x && it.z == blockEnd.z && it.y < blockEnd.y )
            {
                it = blockStart.above();
            }
            else
            {
                it = it[ perpendicularDirections[ i ] ]( 1 );
            }
        }
    }

    return bookshelfCount;
}

function bookshelfCountToSpellTier( bookshelfCount )
{
    if ( bookshelfCount < 4 )
    {
        return WEAK_SPELL;
    }
    if ( bookshelfCount < 8 )
    {
        return MINOR_SPELL;
    }
    if ( bookshelfCount < 12 )
    {
        return NORMAL_SPELL;
    }
    if ( bookshelfCount < 18 )
    {
        return MAJOR_SPELL;
    }
    return MAX_SPELL;
}

function spellTierString( spellTier )
{
    switch ( spellTier )
    {
    case WEAK_SPELL:
        return "Weak";
    case MINOR_SPELL:
        return "Minor";
    case NORMAL_SPELL:
        return "Normal";
    case MAJOR_SPELL:
        return "Major";
    case MAX_SPELL:
        return "Max";
    }

    return "Uh Oh";
}

/**
 * @param { mc.Player } player 
 * @param { mc.ItemStack } item
 * @param { mc.Block } block
 */
export function showNecromancyTable( player, item, block )
{
    if ( player.hasTag("tench:in_nec_menu") )
        return;

    const bookSpellTier = bookshelfCountToSpellTier( getBookshelfCount( player, block ) );

    print("Spell Tier: " + bookSpellTier );

    player.addTag("tench:in_nec_menu");

    const form = new mcui.ActionFormData()
        .title("Necromancy Table")
        .body("Choose an spell level to apply.\nYou can have 3 spells on a weapon, 1 spell per piece of armor, and 1 spell per pickaxe")
        .button("Weak Spell:\n§2§l5 Levels", "textures/items/iron_ingot");

    const textures = [
        "textures/items/diamond",
        "textures/items/netherite_ingot",
        "textures/items/obsidian_ingot",
        "textures/items/dragonscale"
    ]

    for ( let i = 2; i <= bookSpellTier; ++i )
    {
        form.button( spellTierString( i ) + " Spell\n§2§l" + defaultRequiredLevels[ i - 1 ] + " Levels", textures[ i - 2 ] );
    }

        // .button("Minor Spell:\n§2§l10 Levels", "textures/items/iron_ingot")
        // .button("Normal Spell:\n§2§l15 Levels", "textures/items/diamond")
        // .button("Major Spell:\n§2§l20 Levels", "textures/items/obsidian_ingot")
        // .button("Max Spell:\n§2§l25 Levels", "textures/items/dragonscale")
    
    form.button("Clear Last Spell:\n§2§l5 Levels")
    .button("Clear Spell(s)")

    const canCastSpecificSpell = bookSpellTier == MAX_SPELL;

    if ( canCastSpecificSpell )
        form.button("Cast Specific Spell");

    form.show( player ).then( response =>
    {
        player.removeTag( "tench:in_nec_menu" );

        if ( response.cancelled || response.selection == undefined || item == undefined )
            return;

        const requiredLevels = defaultRequiredLevels.slice( 0, bookSpellTier )
            .concat( defaultRequiredLevels.slice( MAX_SPELL, defaultRequiredLevels.length - ( bookSpellTier == MAX_SPELL ? 0 : 1 ) ) );

        /** @type number */
        const selection = response.selection + 1;

        const itemType = getItemType( item );

        if ( itemType == ItemType.VOID )
        {
            print("This item can't be used!", player);
            return;
        }

        const CLEAR_LAST = requiredLevels.length - 3 + canCastSpecificSpell;
        const CLEAR_LORE = CLEAR_LAST + 1; // 7;
        const SPECIFIC = CLEAR_LORE + 1;

        if ( selection != CLEAR_LAST && selection != CLEAR_LORE )
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
            print( "Can cast specific: " + canCastSpecificSpell );
            castSpecificSpell( player, item, itemType );
            return;
        }

        const requiredLevel = requiredLevels[ selection - 1 ];

        if ( player.level < requiredLevel )
        {
            player.sendMessage("You do not have enough levels! (Need " + requiredLevel + ")");
            return;
        }

        const spellTier = selection;

        if ( itemType == ItemType.BOOK )
        {
            if ( selection == CLEAR_LORE )
            {
                player.getComponent( mc.EntityComponentTypes.Inventory ).container
                    .setItem( player.selectedSlotIndex, new mc.ItemStack( "book", 1 ) );
                return;
            }
            if ( selection == CLEAR_LAST && !clearLastLore( player, item ) )
                return;

            const convertTierToBookTier = ['I', 'I', 'II', 'V', 'X'];
            player.runCommandAsync("clear @s book 0 1");
            player.runCommandAsync("function tier" + convertTierToBookTier[ spellTier - 1 ] );
            
            removeLevels( player, requiredLevel );
            return;
        }

        if ( selection == CLEAR_LORE )
        {
            clearLore( player, item );
            return;
        }
        if ( selection == CLEAR_LAST && !clearLastLore( player, item ) )
            return;
        if ( selection < CLEAR_LAST && !addSpellToItem( player, item, itemType, spellTier ) )
            return;

        removeLevels( player, requiredLevel );
    });
}
