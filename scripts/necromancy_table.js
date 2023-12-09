import { world, system, Player, Entity, ItemStack, EquipmentSlot } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

import * as util from './util.js';
import { coolDownHasFinished, isCorrupted, loreIncludes, loreTypeToSpellTier, numberToRomanNumeral, romanNumeralToNumber, startCoolDown } from './spells/util.js';
import * as spells from './spells/spells.js';

import { WeaponEffects } from "./spells/WeaponSpells.js";

import { ArmorActivateEvent, HandheldWeaponEvent } from "./spells/Events.js";
import { ArmorSpells, initializeEntity, getEntityArmor, removeEntity } from "./spells/ArmorSpells.js";

function displayTimer( start, end )
{
    world.sendMessage( "Elapsed ms: " + ( end - start ).toString() );
}

/**
 * @param {string} spell 
 */
function getBaseSpellAndTier( spell )
{
    if ( spell.endsWith('I') || spell.endsWith('X') || spell.endsWith('V') )
    {
        const indexOfSpace = spell.lastIndexOf(' ');
        return { baseSpell: spell.substring( 0, indexOfSpace + 1 ), tier: romanNumeralToNumber( spell.substring( indexOfSpace + 1 ) ) };
    }
    return { baseSpell: spell, tier: 0 };
}

/**
 * @param { Player } player
 * @param { Entity } hitEntity
 * @param { Number } damage
 */
export function parseWeaponSpells( player, hitEntity, damage )
{
    if ( isCorrupted( player ) )
    {
        if ( player instanceof Player )
        {
            player.onScreenDisplay.setTitle( "You are Corrupted! Cannot use abilities!", { fadeInSeconds: 0.2, staySeconds: 0.4, fadeOutSeconds: 0.2 } );
        }
        return;
    }

    if ( !hitEntity.isValid() )
    {
        world.sendMessage("Invalid entity");
        return;
    }

    const equip = player.getComponent("equippable");

    if ( equip == null )
    {
        //util.print( player.typeId + " does not have an equippable component");
        return;
    }

    const item = equip.getEquipment( EquipmentSlot.Mainhand );

    if ( item == undefined )
        return;

    if ( item.typeId.endsWith("bow") )
        return;
    
    /** @type {string[]} */
    const lore = item.getLore();

    if ( lore == undefined || lore.length == 0 || lore[ 0 ] == undefined )
    {
        return;
    }

    let popup_str = [""];

    let extraDamage = 0;

    for ( let i= 0; i < lore.length; ++i )
    {
        const { baseSpell, tier } = getBaseSpellAndTier( lore[ i ] );

        const event = new HandheldWeaponEvent( hitEntity, player, damage );

        extraDamage += WeaponEffects.activateEffect( baseSpell, event, tier, popup_str );
    }

    util.print( "Damage: " + ( extraDamage + damage ) );

    if ( popup_str[ 0 ].length > 0 && player instanceof Player )
    {
        player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
    }
}

/**
 * @param { Player } player
 * @param { Entity } entity
 * @param { Number } damage
 */
export function parseArmorSpells( defendingEntity, attackingEntity, damage )
{
    if ( isCorrupted( defendingEntity ) )
    {
        return;
    }

    const armorInfo = getEntityArmor( defendingEntity );

    if ( armorInfo == null )
        return;

    const spells_ = armorInfo.getActivateableSpells();

    if ( spells_.length == 0 )
    {
        return;
    }

    const popup_str = [""];

    for ( let i = 0; i < spells_.length; ++i )
    {
        const { baseSpell, tier } = getBaseSpellAndTier( spells_[ i ] );

        const event = new ArmorActivateEvent( defendingEntity, attackingEntity, damage );

        ArmorSpells.activateEffect( baseSpell, event, tier, popup_str );
    }

    if ( popup_str[ 0 ].length > 0 && defendingEntity instanceof Player )
    {
        defendingEntity.onScreenDisplay.setActionBar( popup_str[ 0 ] );
    }
}

function activate_sharpenedArrow( player, hitEntity, lore, popup_str )
{
    if ( !coolDownHasFinished( player, spells.SHARPENED_BOW ) )
        return;

    const spell_tier = loreTypeToSpellTier( lore, spells.SHARPENED_BOW );

    let dmg = spell_tier / 3;
    dmg += 1.5;
    dmg *= 2;
    
    popup_str[ 0 ] = popup_str[ 0 ] + spells.SHARPENED_BOW + '\n';
    hitEntity.applyDamage( dmg );
    startCoolDown( player, spells.SHARPENED_BOW, 7 );
}

export function parseBowSpells( player, hitEntity )
{
    // if ( isCorrupted( player ) )
    //     return;

    // const inv = player.getComponent("inventory");
    // if ( inv == undefined || inv.container == undefined )
    //     return;
    // const bow = inv.container.getItem( player.selectedSlot );

    // if ( bow == undefined || !bow.typeId.endsWith('bow') )
    //     return;
    
    // const lore = bow.getLore();

    // if ( lore == undefined || lore.length == 0 || lore[ 0 ] == undefined )
    // {
    //     return;
    // }

    // let numOfSpellsHandled = 0;
    // const numOfSpells = lore.length;
    // let popup_str = [""];

    // if ( loreIncludes( lore, spells.EXPLODING ) )
    // {
    //     activate_exploding( player, hitEntity, popup_str );
    //     if ( ++numOfSpellsHandled == numOfSpells )
    //     {
    //         player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
    //         return;
    //     }
    // }
    // if ( loreIncludes( lore, spells.POISON_BOW ) )
    // {
    //     activate_poison( player, hitEntity, lore, popup_str );
    //     if ( ++numOfSpellsHandled == numOfSpells )
    //     {
    //         player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
    //         return;
    //     }
    // }
    // if ( loreIncludes( lore, spells.WITHER_BOW ) )
    // {
    //     activate_wither( player, hitEntity, lore, popup_str );
    //     if ( ++numOfSpellsHandled == numOfSpells )
    //     {
    //         player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
    //         return;
    //     }
    // }
    // if ( loreIncludes( lore, SHARPENED_BOW ) )
    // {
    //     activate_sharpenedArrow( player, hitEntity, lore, popup_str );
    //     player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
    // }
}

export function parsePickaxeSpells( player, pickaxe, blockLocation )
{
    const lore = pickaxe.getLore();

    if ( lore == undefined || lore.length == 0 )
    {
        return;
    }

    if ( loreIncludes( lore, DRILL ) )
    {
        activateDrill( player, pickaxe, blockLocation );
    }
}

function numberToOption( num )
{
    if ( num < 35 )
    {
        if ( num < 10 )
            return 0;
        if ( num < 20 )
            return 1;
        if ( num < 25 )
            return 2;
        return 3;
    }
    if ( num < 75 )
    {
        if ( num < 45 )
            return 4;
        if ( num < 55 )
            return 5;
        if ( num < 65 )
            return 6;
        return 7;
    }
    if ( num < 85 )
        return 8;
    if ( num < 90 )
        return 9;
    return 10;
}

function getWeaponLoreToAdd( lore_, spell_tier )
{
    let lore_to_add = "";
    let numOfTries = 0;

    const spell_tier_str = numberToRomanNumeral( spell_tier );

    while ( lore_to_add == "" && numOfTries++ < 20 )
    {
        const random_number = Math.floor( Math.random() * 100 );

        const option = numberToOption( random_number );

        switch ( option )
        {
        case 0:
        {
            if ( spell_tier < 5 ) continue;
            if ( loreIncludes( lore_, spells.GROUNDPOUND ) ) continue;
            lore_to_add = spells.GROUNDPOUND + spell_tier_str;
            break;
        }
        case 1:
        {
            if ( spell_tier < 10 ) continue;
            if ( loreIncludes( lore_, spells.LIGHTNING ) ) continue;
            lore_to_add = spells.LIGHTNING;
            break;
        }
        case 2:
        {
            if ( spell_tier < 5 ) continue;
            if ( loreIncludes( lore_, spells.EXPLODING ) ) continue;
            lore_to_add = spells.EXPLODING;
            break;
        }
        case 3:
        {
            if ( loreIncludes( lore_, spells.LEVITATING ) ) continue;
            lore_to_add = spells.LEVITATING + spell_tier_str;
            break;
        }
        case 4:
        {
            if ( loreIncludes( lore_, spells.LIFESTEAL ) ) continue;
            lore_to_add = spells.LIFESTEAL + spell_tier_str;
            break;
        }
        case 5:
        {
            if ( loreIncludes( lore_, spells.POISON ) ) continue;
            lore_to_add = spells.POISON + spell_tier_str;
            break;
        }
        case 6:
        {
            if ( spell_tier < 5 ) continue;
            if ( loreIncludes( lore_, spells.ABSORBING ) ) continue;
            lore_to_add = spells.ABSORBING;
            break;
        }
        case 7:
        {
            if ( spell_tier < 5 ) continue;
            if ( loreIncludes( lore_, spells.WITHER ) ) continue;
            lore_to_add = spells.WITHER + spell_tier_str;
            break;
        }
        case 8:
        {
            if ( loreIncludes( lore_, spells.CRITICAL_STRIKE ) ) continue;
            lore_to_add = spells.CRITICAL_STRIKE + spell_tier_str;
            break;
        }
        case 9:
        {
            if ( loreIncludes( lore_, spells.CORRUPTION ) ) continue;
            lore_to_add = spells.CORRUPTION + spell_tier_str;
            break;
        }
        case 9:
        {
            if ( loreIncludes( lore_, spells.SLOWING ) ) continue;
            lore_to_add = spells.SLOWING + spell_tier_str;
            break;
        }
        }
    }
    return lore_to_add;
}

function enchantWeapon( player, weapon, spell_tier )
{
    let lore_ = weapon.getLore();

    if ( lore_ == undefined || lore_.length >= 3 )
    {
        return false;
    }

    const lore_to_add = getWeaponLoreToAdd( lore_, spell_tier );

    lore_.push( lore_to_add );

    weapon.setLore( lore_ );

    player.getComponent("inventory").container.setItem( player.selectedSlot, weapon );

    return true;
}

/**
 * @param { string[] } lore_ 
 * @param { number } spell_tier 
 * @returns 
 */
function getArmorLoreToAdd( spell_tier )
{
    let numOfTries = 0;

    const spell_tier_str = numberToRomanNumeral( spell_tier );

    while ( numOfTries++ < 10 )
    {
        const random_number = Math.floor( Math.random() * 100 );

        if ( random_number < 50 )
        {
            if ( random_number <  25 )
            {
                if ( random_number < 12.5 )
                {
                    return spells.STAMPEDE;
                }
                else
                {
                    return spells.EXTINGUISH + spell_tier_str;
                }
            }
            else // 25 - 50
            {
                if ( random_number < 35 )
                {
                    if ( spell_tier < 5 )
                        continue;
                    return spells.LEAPING;
                }
                else
                {
                    if ( spell_tier < 10 )
                            continue;
                    if ( random_number < 42.5 )
                    {
                        return spells.INTIMIDATION + spell_tier_str;
                    }
                    else
                    {
                        return spells.LASTSTAND;
                    }
                }
            } 
        }
        else // 50 - 100
        {
            if ( random_number < 75 )
            {
                if ( random_number < 62.5 )
                {
                    return spells.REFLECT + spell_tier_str;
                }
                else
                {
                    return spells.IMMUNITY + spell_tier_str;
                }
            }
            else // 75 - 100
            {
                if ( random_number < 87.5 )
                {
                    if ( spell_tier < 5 )
                        continue;
                    return spells.STEADFAST;
                }
                else
                {
                    return spells.RESILIENCE + spell_tier_str;
                }
            }
        }
    }
    return "";
}

function enchantArmor( player, armor, spell_tier )
{
    const lore_ = armor.getLore();

    if ( lore_ == undefined || lore_.length >= 1 )
        return false;

    const lore_to_add = getArmorLoreToAdd( spell_tier );

    lore_.push( lore_to_add );

    armor.setLore( lore_ );

    player.getComponent("inventory").container.setItem( player.selectedSlot, armor );

    return true;
}

function getBowLoreToAdd( lore_, spell_tier )
{
    let numOfTries = 0;

    const spell_tier_str = numberToRomanNumeral( spell_tier );

    while ( numOfTries++ < 10 )
    {
        const random_number = Math.floor( Math.random() * 100 );

        if ( random_number < 40 )
        {
            if ( random_number < 25 )
            {
                if ( loreIncludes( lore_, spells.POISON_BOW ) )
                    continue;
                return spells.POISON_BOW + spell_tier_str;
            }
            else
            {
                if ( loreIncludes( lore_, spells.WITHER_BOW ) )
                    continue;
                return spells.WITHER_BOW + spell_tier_str;
            }
        }
        else
        {
            if ( random_number > 70 )
            {
                if ( loreIncludes( lore_, spells.SHARPENED_BOW ) )
                    continue;
                return spells.SHARPENED_BOW + spell_tier_str;
            }
            else
            {
                if ( loreIncludes( lore_, spells.EXPLODING_BOW ) )
                    continue;
                return spells.EXPLODING_BOW;
            }
        }
    }
    return "";
}

function enchantBow( player, bow, spell_tier )
{
    let lore_ = bow.getLore();

    if ( lore_ == undefined || lore_.length > 2 )
        return false;

    const lore_to_add = getBowLoreToAdd( lore_, spell_tier );

    lore_.push( lore_to_add );

    bow.setLore( lore_ );

    player.getComponent("inventory").container.setItem( player.selectedSlot, bow );

    return true;
}

function getPickaxeLoreToAdd( lore_, spell_tier )
{
    let numOfTries = 0;

    const spell_tier_str = numberToRomanNumeral( spell_tier );

    while ( numOfTries++ < 10 )
    {
        const random_number = Math.floor( Math.random() * 100 );

        if ( loreIncludes( lore_, spells.DRILL ) )
            continue;
        return spells.DRILL;
    }
    return "";
}

function enchantPickaxe( player, pickaxe, spell_tier )
{
    let lore = pickaxe.getLore();

    if ( lore == undefined || lore.length > 1 )
    {
        return false;
    }

    const loreToAdd = getPickaxeLoreToAdd( lore, spell_tier );

    lore.push( loreToAdd );

    pickaxe.setLore( lore );

    player.getComponent("inventory").container.setItem( player.selectedSlot, pickaxe );

    return true;
}

function clearLore( player, item )
{
    if ( item.getLore() == undefined && item.getLore().length == 0 )
        return false;
    item.setLore([]);
    player.getComponent("inventory").container.setItem( player.selectedSlot, item );
    return true;
}

/**
 * @param { Player } player 
 * @param { ItemStack } item
 */
export function showNecromancyTable( player, item )
{
    if ( player.hasTag("in_nec_menu") )
        return;

    player.addTag("in_nec_menu");

    const form = new ActionFormData()
        .title("Necromancy Table")
        .body("Choose an spell level to apply.\nYou can apply 3 spells on a weapon and 1 spell per piece of armor")
        .button("Tier I Spellbind:\n§2§l5 Levels")
        .button("Tier III Spellbind:\n§2§l10 Levels")
        .button("Tier V Spellbind:\n§2§l25 Levels")
        .button("Tier X Spellbind:\n§2§l40 Levels")
        .button("Clear Spells");
    form.show( player ).then( response =>
    {
        player.removeTag( "in_nec_menu" );

        if ( response.cancelled || response.selection == undefined )
            return;

        if ( item == undefined )
            return;

        const selection = response.selection + 1;

        const required_level =
            selection == 5?
            0 :
            selection == 4?
            40 :
            selection == 3?
            25 :
            selection == 2?
            10 : 5;

        if ( player.level < required_level )
        {
            player.sendMessage("You do not have enough levels!");
            return;
        }

        const enchant_tier =
            selection == 4?
            10 :
            selection == 3?
            5 :
            selection == 2?
            3 : 1;

        const REMOVE_LORE = 5;

        if( item.typeId.includes("sword") || item.typeId.includes(" axe") )
        {
            if ( selection == REMOVE_LORE ) 
            {
                clearLore( player, item );
                return;
            }
            
            else if ( !enchantWeapon( player, item, enchant_tier ) ) return;

            player.runCommandAsync("xp -" + required_level.toString() + "L @p");
        }
        else if ( item.typeId.includes("helmet") || item.typeId.includes("chestplate") || item.typeId.includes("leggings") || item.typeId.includes("boots") )
        {
            if ( selection == REMOVE_LORE ) 
            {
                clearLore( player, item );
                return;
            }
            
            else if ( !enchantArmor( player, item, enchant_tier ) ) return;

            player.runCommandAsync("xp -" + required_level.toString() + "L @p");
        }
        else if ( item.typeId.includes("book") )
        {
            if ( selection == REMOVE_LORE )
            {
                player.getComponent("inventory").container.setItem( player.selectedSlot, new ItemStack( "book", 1 ) );
            }
            else
            {
                player.runCommandAsync("clear @s book 0 1");
                player.runCommandAsync("function tier" + numberToRomanNumeral( enchant_tier ) );
            }
            
            player.runCommandAsync("xp -" + required_level.toString() + "L @p");
        }
        else if ( item.typeId.endsWith('bow') )
        {
            if ( selection === REMOVE_LORE )
            {
                clearLore( player, item );
                return;
            }
            else if ( !enchantBow( player, item, enchant_tier ) ) return;

            player.runCommandAsync("xp -" + required_level.toString() + "L @p");
        }
        // else if ( item.typeId.endsWith('ickaxe') )
        // {
        //     if ( selection == REMOVE_LORE )
        //     {
        //         clearLore( player, item );
        //         return;
        //     }
        //     else if ( !enchantPickaxe( player, item, enchant_tier ) ) return;

        //     player.runCommandAsync("xp -" + required_level.toString() + "L @p");
        // }
    })
}

export function itemIsArmor( item )
{
    const type = item.typeId;
    return type.includes( "chestp" ) || type.includes( "helm" ) || type.includes( "legg" ) || type.includes( "boots" );
}

export function itemIsNotArmor( item )
{
    return !itemIsArmor( item );
}

export function createArmorChecker( entity )
{
    initializeEntity( entity );
}

export function entityDied( entity )
{
    if ( entity == null )
        return;

    const armor = getEntityArmor( entity );

    if ( armor == null )
    {
        return;
    }

    armor.entityDied();
}

export function entityRespawned( entity )
{
    if ( entity == null )
        return;

    const armor = getEntityArmor( entity );

    if ( armor == null )
    {
        return;
    }

    armor.entityRespawned();
}

export function removeArmorChecker( entity )
{
    removeEntity( entity );
}
