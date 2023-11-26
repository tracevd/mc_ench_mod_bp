import { world, system, Player, Entity, ItemStack, EquipmentSlot } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

import { createShockwave } from "./shockwave";

/**
 * @param { String } num 
 */
function romanNumeralToNumber( num )
{
    if ( num == "I" )
        return 1;

    if ( num == "III" )
        return 3;

    if ( num == "V" )
        return 5;

    if ( num == "X" )
        return 10;

    return 1;
}

function numberToRomanNumeral( num )
{
    switch( num )
    {
    case 1:
        return "I";
    case 3:
        return "III";
    case 5:
        return "V";
    case 10:
        return "X";
    }
    return "I";
}

/**
 * @param { string[] } lore_
 * @param { string } item
 */
function filter( lore_, item )
{
    return lore_.filter( element => element.includes( item ) );
}

/**
 * @param { string[] } lore_ 
 * @param { string } item 
 */
function loreIncludes( lore_, item )
{
    return filter( lore_, item ).length > 0;
}

/**
 * @param { string[] } lore_ 
 * @param { string } item 
 */
function getLoreItem( lore_, item )
{
    return filter( lore_, item )[ 0 ];
}

const RESET         = "§r";
const BLACK         = "§0";
const DARK_BLUE     = "§1";
const DARK_GREEN    = "§2";
const DARK_AQUA     = "§3";
const DARK_RED      = "§4";
const DARK_PURPLE   = "§5";
const GOLD          = "§6";
const GREY          = "§7";
const DARK_GREY     = "§8";
const BLUE          = "§9";
const GREEN         = "§a";
const AQUA          = "§b";
const RED           = "§c";
const LIGHT_PURPLE  = "§d";
const YELLOW        = "§e";
const WHITE         = "§f";

// **********************************************
//                  Weapon Spells
// **********************************************

// Damages enemies and scatters them
const GROUNDPOUND       = `${RESET}${GOLD}Ground Pound `;
// Summons lightning on hit
const LIGHTNING         = `${RESET}${YELLOW}Lightning`;
// Explodes on hit
const EXPLODING         = `${RESET}${RED}Exploding`;
// Causes enemies to float in the and take fall damage
const LEVITATING        = `${RESET}${AQUA}Levitating `;
// Adds health to the player
const LIFESTEAL         = `${RESET}${DARK_PURPLE}Lifesteal `;
// Poisons nearby enemies
const POISON            = `${RESET}${GREEN}Poison `;
// Adds absorption for a brief time
const ABSORBING         = `${RESET}${DARK_RED}Absorbing`;
// Withers nearby enemies
const WITHER            = `${RESET}${BLACK}Wither `;
// Damages nearby enemies
const CRITICAL_STRIKE   = `${RESET}${DARK_BLUE}Critical Strike `;
// Slows nearby enemies
const SLOWING           = `${RESET}${GREY}Slowing `;
// Disables some effects
const CORRUPTION        = `${RESET}${LIGHT_PURPLE}Corruption `;

// **********************************************
//                 Armor Spells
// **********************************************

// Chance to remove fire effect
const EXTINGUISH    = `${RESET}${DARK_AQUA}Extinguish `;
// Deal some damage back to enemies when taking damage
const REFLECT       = `${RESET}${DARK_PURPLE}Reflect `;
// When about to die, gain boosts to keep you in the fight
const LASTSTAND     = `${RESET}${GOLD}Last Stand`;
// Chance to remove poison effects
const IMMUNITY      = `${RESET}${DARK_GREEN}Immunity `;
// Gain resistance 1 while wearing
const STEADFAST     = `${RESET}${DARK_GREY}Steadfast`;
// Grants health boost
const RESILIENCE    = `${RESET}${DARK_BLUE}Resilience `;
// Gives jump boost
const LEAPING       = `${RESET}${GREEN}Leaping`;
// Gives jump boost
const STAMPEDE      = `${RESET}${AQUA}Stampede`;
// Slows nearby enemies
const INTIMIDATION  = `${RESET}${RED}Intimidation `;


// **********************************************
//                 Bow Spells
// **********************************************

// Gives target poison when hit
const POISON_BOW    = POISON;
// Gives targer wither when hit
const WITHER_BOW    = WITHER;
// Makes arrows explode on impact
const EXPLODING_BOW = EXPLODING;

const SHARPENED_BOW = `${RESET}${DARK_GREY}Sharpened Arrows `;

// **********************************************
//                 Pick Spells
// **********************************************

const DRILL       = `${RESET}${RED}Drill`;




const CORRUPTED_TAG = '    123';


function isCorrupted( player )
{
    if ( !( player instanceof Player ) )
        return false;

    const type_s = CORRUPTED_TAG.substring( 4, 7 );

    return player.hasTag( type_s );
}

/**
 * @param { Player } player
 * @param { string } type
 * @param { Number } seconds
 */
function startCoolDown( player, type, seconds )
{
    const type_s = type.substring( 4, 7 );
    player.addTag( type_s );
    system.runTimeout( () =>
    {
        player.removeTag( type_s );
    }, seconds * 20 );
}

function coolDownHasFinished( player, type )
{
    const type_s = type.substring( 4, 7 );
    return !( player.hasTag( type_s ) );
}

function getSpellTier( item, type )
{
    return romanNumeralToNumber( item.substring( type.length ) );
}

function loreTypeToSpellTier( lore, type )
{
    const item = getLoreItem( lore, type );
    return getSpellTier( item, type );
}

function roundToNearestTenth( num )
{
    return Math.round( num * 10 ) / 10;
}

function activate_criticalStrike( player, hitEntity, lore, damage, popup_str )
{
    if ( !coolDownHasFinished( player, CRITICAL_STRIKE ) )
        return;

    const rand = Math.random();

    const lore_item = getLoreItem( lore, CRITICAL_STRIKE );
    const spell_tier = getSpellTier( lore_item, CRITICAL_STRIKE );

    if ( rand < ( spell_tier + 15 ) / 50 )
        return;

    popup_str[ 0 ] = popup_str[ 0 ] + lore_item + '\n';

    hitEntity.applyDamage( damage * 0.3 * spell_tier / 7 );
}

function activate_poison( player, hitEntity, lore, popup_str )
{
    if ( !coolDownHasFinished( player, POISON ) )
        return;

    const lore_item = getLoreItem( lore, POISON );
    const spell_tier = getSpellTier( lore_item, POISON );
    popup_str[0] = popup_str[0] + lore_item + '\n';
    hitEntity.runCommandAsync(`effect @s[type=!item,type=!xp_orb] poison ${1+Math.floor(spell_tier/3)} ${spell_tier == 10 ? 2 : spell_tier == 5 ? 1 : 0}`);
    startCoolDown( player, POISON, 15 );
}

function activate_wither( player, hitEntity, lore, popup_str )
{
    if ( !coolDownHasFinished( player, WITHER ) )
        return;

    const lore_item = getLoreItem( lore, WITHER );
    const spell_tier = getSpellTier( lore_item, WITHER );
    popup_str[0] = popup_str[0] + lore_item + '\n';
    hitEntity.runCommandAsync(`effect @s[type=!item,type=!xp_orb] wither ${1+Math.floor(spell_tier/3)} ${spell_tier == 10 ? 2 : spell_tier == 5 ? 1 : 0 }`);
    startCoolDown( player, WITHER, 20 );
}

function activate_groundPound( player, lore, popup_str )
{
    const velo = player.getVelocity().y * -1;
    if ( velo <= 0 || !coolDownHasFinished( player, GROUNDPOUND ) )
        return;

    const lore_item = getLoreItem( lore, GROUNDPOUND );
    const spell_tier = getSpellTier( lore_item, GROUNDPOUND );
    popup_str[0] = popup_str[0] + lore_item + '\n';
    const strength_multiplier = roundToNearestTenth( ( 0.9 + velo ) ** 3 );
    const radius = spell_tier * velo / 2 + spell_tier - spell_tier / 7;
    const strength = spell_tier * strength_multiplier ** 0.5;
    if ( createShockwave( player, player.location, strength, radius, strength_multiplier ) )
        startCoolDown( player, GROUNDPOUND, 10 );
}

function activate_exploding( player, hitEntity, popup_str )
{
    if ( !coolDownHasFinished( player, EXPLODING ) )
        return;

    popup_str[ 0 ] = popup_str[ 0 ] + EXPLODING + '\n';
    hitEntity.dimension.createExplosion( hitEntity.location, 4, { breaksBlocks: false, source: player } );
    startCoolDown( player, EXPLODING, 15 );
}

function activate_absorbing( player, popup_str )
{
    if ( !coolDownHasFinished( player, ABSORBING ) )
        return;

    startCoolDown( player, ABSORBING, 2 );

    const rand = Math.random();
    if ( rand < 0.5 )
        return;

    popup_str[ 0 ] = popup_str[ 0 ] + ABSORBING + '\n';
    player.runCommandAsync("effect @s absorption 2 0 true");
}

function activate_lifesteal( player, lore, damage, popup_str )
{
    if ( !coolDownHasFinished( player, LIFESTEAL ) )
        return;

    startCoolDown( player, LIFESTEAL, 4 );

    const rand = Math.random();
    if ( rand < 0.5 )
        return;
    const lore_item = getLoreItem( lore, LIFESTEAL );
    const spell_tier = getSpellTier( lore_item, LIFESTEAL );
    popup_str[ 0 ] = popup_str[ 0 ] + lore_item + '\n';
    const health = player.getComponent("health");
    const multiplier = (spell_tier / 33) + 0.2;
    let health_stolen = damage * multiplier;
    if ( isNaN( health_stolen ) )
        health_stolen = 0;
    let current = health.currentValue;
    if ( isNaN( current ) )
        current = 0;
    health.setCurrentValue( current + ( health_stolen > 2 ? 2 : health_stolen ) );
}

function activate_slowing( player, hitEntity, lore, popup_str )
{
    if ( !coolDownHasFinished( player, SLOWING ) )
        return;

    const lore_item = getLoreItem( lore, SLOWING );
    const spell_tier = getSpellTier( lore_item, SLOWING );
    popup_str[ 0 ] = popup_str[ 0 ] + lore_item + '\n';
    const time_ = Math.ceil( spell_tier / 4 );
    const time = time_ < 1 ? 1 : time_;
    hitEntity.runCommandAsync(
        `effect @s[type=!item,type=!xp_orb] slowness ${ time } ${ ( spell_tier > 5 ? 2 : 1 ) } true`
    )
    startCoolDown( player, SLOWING, 5 );
}

function activate_lightning( player, hitEntity, popup_str )
{
    if ( !coolDownHasFinished( player, LIGHTNING ) )
        return;
    
    popup_str[ 0 ] = popup_str[ 0 ] + LIGHTNING + '\n';
    hitEntity.applyDamage( 10 );
    hitEntity.runCommandAsync("summon lightning_bolt");
    startCoolDown( player, LIGHTNING, 7 );
}

function activate_levitating( player, hitEntity, lore, popup_str )
{
    if ( !coolDownHasFinished( player, LEVITATING ) )
        return;

    const lore_item = getLoreItem( lore, LEVITATING );
    const spell_tier = getSpellTier( lore_item, LEVITATING );
    popup_str[0] = popup_str[0] + lore_item + '\n';
    hitEntity.runCommandAsync(`effect @s[type=!item,type=!xp_orb] levitation 1 ${(spell_tier)+3} true`);
    startCoolDown( player, LEVITATING, 7 );
}

function activate_corruption( player, hitEntity, lore, popup_str )
{
    if ( !( hitEntity instanceof Player ) || isCorrupted( hitEntity ) )
        return;
    if ( !coolDownHasFinished( player, CORRUPTION ) )
        return;

    const lore_item = getLoreItem( lore, CORRUPTION );
    const spell_tier = getSpellTier( lore_item, CORRUPTION );
    popup_str[ 0 ] = popup_str[ 0 ] + lore_item + '\n';
    startCoolDown( hitEntity, CORRUPTED_TAG, ( spell_tier == 10 ? 8 : ( spell_tier + 7 ) / 2 ) );
    hitEntity.onScreenDisplay.setTitle( RESET + LIGHT_PURPLE + "Corrupted", { fadeInSeconds: 0.2, staySeconds: 0.4, fadeOutSeconds: 0.2 } );
    
    startCoolDown( player, CORRUPTION, 25 );
}

function displayTimer( start, end )
{
    world.sendMessage( "Elapsed ms: " + ( end - start ).toString() );
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
        player.onScreenDisplay.setTitle( "You are Corrupted! Cannot use abilities!", { fadeInSeconds: 0.2, staySeconds: 0.4, fadeOutSeconds: 0.2 } );
        return;
    }

    if ( !hitEntity.isValid() )
    {
        world.sendMessage("Invalid entity");
        return;
    }

    const inv = player.getComponent("inventory");
    const item = inv.container.getItem( player.selectedSlot );

    if ( item == undefined )
        return;
    
    const lore = item.getLore();

    if ( lore == undefined || lore.length == 0 || lore[ 0 ] == undefined )
    {
        return;
    }

    let numOfSpellsHandled = 0;
    const numOfSpells = lore.length;
    let popup_str = [""];

    if ( loreIncludes( lore, EXPLODING ) )
    {
        activate_exploding( player, hitEntity, popup_str );
        if ( ++numOfSpellsHandled == numOfSpells )
        {
            player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
            return;
        }
    }
    if ( loreIncludes( lore, CRITICAL_STRIKE ) )
    {
        activate_criticalStrike( player, hitEntity, lore, damage, popup_str );
        if ( ++numOfSpellsHandled == numOfSpells )
        {
            player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
            return;
        }
    }
    if ( loreIncludes( lore, POISON ) )
    {
        activate_poison( player, hitEntity, lore, popup_str );
        if ( ++numOfSpellsHandled == numOfSpells )
        {
            player.onScreenDisplay.setActionBar( popup_str[0] );
            return;
        }
    }
    if ( loreIncludes( lore, WITHER ) )
    {
        activate_wither( player, hitEntity, lore, popup_str );
        if ( ++numOfSpellsHandled == numOfSpells )
        {
            player.onScreenDisplay.setActionBar( popup_str[0] );
            return;
        }
    }
    if ( loreIncludes( lore, GROUNDPOUND ) )
    {
        activate_groundPound( player, lore, popup_str );
        if ( ++numOfSpellsHandled == numOfSpells )
        {
            player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
            return;
        }
    }
    if ( loreIncludes( lore, ABSORBING ) )
    {
        activate_absorbing( player, popup_str );
        if ( ++numOfSpellsHandled == numOfSpells )
        {
            player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
            return;
        }
    }
    if ( loreIncludes( lore, LIFESTEAL ) )
    {
        activate_lifesteal( player, lore, damage, popup_str );
        if ( ++numOfSpellsHandled == numOfSpells )
        {
            player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
            return;
        }
    }
    if ( loreIncludes( lore, SLOWING )  )
    {
        activate_slowing( player, hitEntity, lore, popup_str );
        if ( ++numOfSpellsHandled == numOfSpells )
        {
            player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
            return;
        }
    }
    if ( loreIncludes( lore, LIGHTNING ) )
    {
        activate_lightning( player, hitEntity, popup_str );
        if ( ++numOfSpellsHandled == numOfSpells )
        {
            player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
            return;
        }
    }
    if ( loreIncludes( lore, CORRUPTION ) )
    {
        activate_corruption( player, hitEntity, lore, popup_str );
        if ( ++numOfSpellsHandled == numOfSpells )
        {
            player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
            return;
        }
    }
    if ( loreIncludes( lore, LEVITATING ) )
    {
        activate_levitating( player, hitEntity, lore, popup_str );
        player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
    }
}

/**
 * @param { Player } player
 * @param { Entity } entity
 * @param { Number } damage
 */
export function parseArmorSpells( player, entity, damage )
{
    if ( isCorrupted( player ) )
    {
        return;
    }

    const tags = player.getTags();

    if ( loreIncludes( tags, REFLECT ) && entity != undefined )
    {
        const spell_tier = loreTypeToSpellTier( tags, REFLECT );
        const dmg = roundToNearestTenth( damage * 0.1 * ( spell_tier / 3 ) ) + 1;
        world.sendMessage( "Reflected: " + dmg.toString() );
        entity.applyDamage( dmg );
    }
    if ( loreIncludes( tags, LASTSTAND ) && coolDownHasFinished( player, LASTSTAND ) )
    {
        const health = player.getComponent( "health" );
        if ( health.current < 2 )
        {
            player.runCommandAsync( "effect @s strength 10 0" );
            player.runCommandAsync( "effect @s absorption 10 4 true" );
            player.runCommandAsync( "effect @s regeneration 2 0 true" );
            startCoolDown( player, LASTSTAND, 180 );
        }
    }
}

function activate_sharpenedArrow( player, hitEntity, lore, popup_str )
{
    if ( !coolDownHasFinished( player, SHARPENED_BOW ) )
        return;

    const spell_tier = loreTypeToSpellTier( lore, SHARPENED_BOW );

    let dmg = spell_tier / 3;
    dmg += 1.5;
    dmg *= 2;
    
    popup_str[ 0 ] = popup_str[ 0 ] + SHARPENED_BOW + '\n';
    hitEntity.applyDamage( dmg );
    startCoolDown( player, SHARPENED_BOW, 7 );
}

export function parseBowSpells( player, hitEntity )
{
    if ( isCorrupted( player ) )
        return;

    const inv = player.getComponent("inventory");
    if ( inv == undefined || inv.container == undefined )
        return;
    const bow = inv.container.getItem( player.selectedSlot );

    if ( bow == undefined || !bow.typeId.endsWith('bow') )
        return;
    
    const lore = bow.getLore();

    if ( lore == undefined || lore.length == 0 || lore[ 0 ] == undefined )
    {
        return;
    }

    let numOfSpellsHandled = 0;
    const numOfSpells = lore.length;
    let popup_str = [""];

    if ( loreIncludes( lore, EXPLODING ) )
    {
        activate_exploding( player, hitEntity, popup_str );
        if ( ++numOfSpellsHandled == numOfSpells )
        {
            player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
            return;
        }
    }
    if ( loreIncludes( lore, POISON_BOW ) )
    {
        activate_poison( player, hitEntity, lore, popup_str );
        if ( ++numOfSpellsHandled == numOfSpells )
        {
            player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
            return;
        }
    }
    if ( loreIncludes( lore, WITHER_BOW ) )
    {
        activate_wither( player, hitEntity, lore, popup_str );
        if ( ++numOfSpellsHandled == numOfSpells )
        {
            player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
            return;
        }
    }
    if ( loreIncludes( lore, SHARPENED_BOW ) )
    {
        activate_sharpenedArrow( player, hitEntity, lore, popup_str );
        player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
    }
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
            if ( loreIncludes( lore_, GROUNDPOUND ) ) continue;
            lore_to_add = GROUNDPOUND + spell_tier_str;
            break;
        }
        case 1:
        {
            if ( spell_tier < 10 ) continue;
            if ( loreIncludes( lore_, LIGHTNING ) ) continue;
            lore_to_add = LIGHTNING;
            break;
        }
        case 2:
        {
            if ( spell_tier < 5 ) continue;
            if ( loreIncludes( lore_, EXPLODING ) ) continue;
            lore_to_add = EXPLODING;
            break;
        }
        case 3:
        {
            if ( loreIncludes( lore_, LEVITATING ) ) continue;
            lore_to_add = LEVITATING + spell_tier_str;
            break;
        }
        case 4:
        {
            if ( loreIncludes( lore_, LIFESTEAL ) ) continue;
            lore_to_add = LIFESTEAL + spell_tier_str;
            break;
        }
        case 5:
        {
            if ( loreIncludes( lore_, POISON ) ) continue;
            lore_to_add = POISON + spell_tier_str;
            break;
        }
        case 6:
        {
            if ( spell_tier < 5 ) continue;
            if ( loreIncludes( lore_, ABSORBING ) ) continue;
            lore_to_add = ABSORBING;
            break;
        }
        case 7:
        {
            if ( spell_tier < 5 ) continue;
            if ( loreIncludes( lore_, WITHER ) ) continue;
            lore_to_add = WITHER + spell_tier_str;
            break;
        }
        case 8:
        {
            if ( loreIncludes( lore_, CRITICAL_STRIKE ) ) continue;
            lore_to_add = CRITICAL_STRIKE + spell_tier_str;
            break;
        }
        case 9:
        {
            if ( loreIncludes( lore_, CORRUPTION ) ) continue;
            lore_to_add = CORRUPTION + spell_tier_str;
            break;
        }
        case 9:
        {
            if ( loreIncludes( lore_, SLOWING ) ) continue;
            lore_to_add = SLOWING + spell_tier_str;
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
                    return STAMPEDE;
                }
                else
                {
                    return EXTINGUISH + spell_tier_str;
                }
            }
            else // 25 - 50
            {
                if ( random_number < 35 )
                {
                    if ( spell_tier < 5 )
                        continue;
                    return LEAPING;
                }
                else
                {
                    if ( spell_tier < 10 )
                            continue;
                    if ( random_number < 42.5 )
                    {
                        return INTIMIDATION + spell_tier_str;
                    }
                    else
                    {
                        return LASTSTAND;
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
                    return REFLECT + spell_tier_str;
                }
                else
                {
                    return IMMUNITY + spell_tier_str;
                }
            }
            else // 75 - 100
            {
                if ( random_number < 87.5 )
                {
                    if ( spell_tier < 5 )
                        continue;
                    return STEADFAST;
                }
                else
                {
                    return RESILIENCE + spell_tier_str;
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
                if ( loreIncludes( lore_, POISON_BOW ) )
                    continue;
                return POISON_BOW + spell_tier_str;
            }
            else
            {
                if ( loreIncludes( lore_, WITHER_BOW ) )
                    continue;
                return WITHER_BOW + spell_tier_str;
            }
        }
        else
        {
            if ( random_number > 70 )
            {
                if ( loreIncludes( lore_, SHARPENED_BOW ) )
                    continue;
                return SHARPENED_BOW + spell_tier_str;
            }
            else
            {
                if ( loreIncludes( lore_, EXPLODING_BOW ) )
                    continue;
                return EXPLODING_BOW;
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

        if ( loreIncludes( lore_, DRILL ) )
            continue;
        return DRILL;
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

/**
 * @param { Player } player 
 * @param { ItemStack } armor 
 * @returns 
 */
function addArmorEffect( player, armor )
{
    const lore = armor.getLore();

    const ptr = 0;
    const isPtr = false;

    if ( lore == undefined || lore[ 0 ] == undefined )
        return { ptr, isPtr };
    
    const effect = lore[ 0 ];

    if ( loreIncludes( lore, LEAPING ) )
    {
        player.runCommandAsync( "effect @s jump_boost 9999 1 true" );
        return { ptr, isPtr };
    }
    if ( loreIncludes( lore, STAMPEDE ) )
    {
        let lastSwiftness = -1;
        const id = system.runInterval( () =>
        {
            const velocity = player.getVelocity();
            if ( player.isSprinting == false || ( Math.abs( velocity.x ) < 0.19 && Math.abs( velocity.z ) < 0.19 ) )
            {
                lastSwiftness = -1;
                player.runCommandAsync( "effect @s speed 0" );
            }
            else
            {
                if ( lastSwiftness >= 0 )
                    player.runCommandAsync( "effect @s speed 10 " + lastSwiftness + " true" );
                if ( lastSwiftness < 2 && !player.hasTag( "stampcooldown" ) )
                {
                    player.addTag( "stampcooldown" );
                    system.runTimeout( () =>
                    {
                        player.removeTag( "stampcooldown" );
                        ++lastSwiftness;
                    }, 20 * 3 );
                }
            }                              
        }, 30 );
        return { ptr: id, isPtr: true };
    }
    if ( loreIncludes( lore, EXTINGUISH ) )
    {
        const spell_tier = loreTypeToSpellTier( lore, EXTINGUISH );
        const id = system.runInterval( () =>
        {
            if ( player.getComponent( "minecraft:onfire" ) == undefined )
                return;
            const rand = Math.random();
            if ( rand < spell_tier / 15 )
            {
                player.extinguishFire( false );
            }
        }, 50 );

        return { ptr: id, isPtr: true };
    }
    if ( loreIncludes( lore, REFLECT ) )
    {
        player.addTag( effect );
        return { ptr, isPtr };
    }
    if ( loreIncludes( lore, LASTSTAND ) )
    {
        player.addTag( effect );
        return { ptr, isPtr };
    }
    if ( loreIncludes( lore, IMMUNITY ) )
    {
        const spell_tier = loreTypeToSpellTier( lore, IMMUNITY );
        const id = system.runInterval( () =>
        {
            
            if ( player.getEffect( 'poison' ) != undefined )
            {
                const rand = Math.random();
                if ( rand < spell_tier / 15 )
                    player.runCommandAsync( "effect @s poison 0" );
            }
        }, 32 );

        return { ptr: id, isPtr: true };
    }
    if ( loreIncludes( lore, STEADFAST ) )
    {
        player.runCommandAsync( "effect @s resistance 9999 0 true" );
        return { ptr, isPtr };
    }
    if ( loreIncludes( lore, RESILIENCE ) )
    {
        const spell_tier = loreTypeToSpellTier( lore, RESILIENCE );
        const amplifier = Math.ceil( spell_tier / 2 ) - 1;
        player.runCommandAsync( "effect @s health_boost 9999 " + amplifier.toString() + " true" );
        player.runCommandAsync( "effect @s regeneration 1 9 true" );
        return { ptr, isPtr };
    }
    if ( loreIncludes( lore, INTIMIDATION ) )
    {
        const spell_tier = loreTypeToSpellTier( lore, INTIMIDATION );
        const range = Math.floor( spell_tier / 3 ) + 3;
        const dimension = player.dimension;
        const id = system.runInterval( () =>
        {
            const entities = dimension.getEntities({ location: player.location, maxDistance: range, excludeNames: [player.name], excludeFamilies: ["inanimate"], excludeTypes: ["item"] });
            for ( let i = 0; i < entities.length; ++i )
            {
                entities[ i ].runCommandAsync( `effect @s weakness ${ Math.ceil( spell_tier / 2 ) } ${ Math.floor( spell_tier / 3 ) }` );
                entities[ i ].runCommandAsync( `effect @s nausea ${ Math.ceil( spell_tier / 2 ) } ${ Math.floor( spell_tier / 3 ) }`);
                entities[ i ].runCommandAsync( `effect @s slowness ${ Math.ceil( spell_tier / 2 ) } 0`);
            }
        }, 10 * 20 )
        return { ptr: id, isPtr: true };
    }
    return { ptr, isPtr };
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

const HELMET_SLOT  = 0;
const CHEST_SLOT   = 1;
const LEGGING_SLOT = 2;
const BOOT_SLOT    = 3;

function getArmorSlot( armor )
{
    const type = armor.typeId;
    if ( type.includes("helm") )
        return HELMET_SLOT;
    if ( type.includes("boot") )
        return BOOT_SLOT;
    if ( type.includes("legg") )
        return LEGGING_SLOT;
    return CHEST_SLOT;
}

const interval_function_map =
new Map(
[
    [ "", [ 0 ] ] 
]);
interval_function_map.clear();

const player_armor_count =
new Map(
[
    [ "", 0 ] 
]);
player_armor_count.clear();

function clearAllPlayerCallBacks( player )
{
    const func_ptrs = interval_function_map.get( player.name );

    if ( func_ptrs == undefined )
        return;

    for ( let i = 0; i < func_ptrs.length; i++ )
        system.clearRun( func_ptrs[ i ] );
}

export function reset( player )
{
    player_armor_count.set( player.name, 0 );

    clearAllPlayerCallBacks( player );

    interval_function_map.set( player.name, [] );

    const tags = player.getTags();

    system.run( () => {
        tags.forEach( tag => player.removeTag( tag ) );
    });

    player.runCommandAsync( "effect @s clear" );
    player.sendMessage( "You have been reset" );
}

/**
 * 
 * @param { Player } player 
 * @param { Number } slot 
 */
function playerHasArmorInSlot( player, slot )
{
    const armor_slots = player_armor_count.get( player.name );
    switch ( slot )
    {
    case HELMET_SLOT:  return ( armor_slots & 0b0001 ) != 0;
    case CHEST_SLOT:   return ( armor_slots & 0b0010 ) != 0;
    case LEGGING_SLOT: return ( armor_slots & 0b0100 ) != 0;
    case BOOT_SLOT:    return ( armor_slots & 0b1000 ) != 0;
    }
    return false;
}

/**
 * 
 * @param { Player } player 
 * @param { Number } slot 
 */
function addArmorInSlotFlag( player, slot )
{
    switch ( slot )
    {
    case HELMET_SLOT:  player_armor_count.set( player.name, player_armor_count.get( player.name ) | 0b0001 );  break;
    case CHEST_SLOT:   player_armor_count.set( player.name, player_armor_count.get( player.name ) | 0b0010 );  break;
    case LEGGING_SLOT: player_armor_count.set( player.name, player_armor_count.get( player.name ) | 0b0100 );  break;
    case BOOT_SLOT:    player_armor_count.set( player.name, player_armor_count.get( player.name ) | 0b1000 );  break;
    }
}

export function equipArmorWithLore( player, item )
{
    system.runTimeout( () =>
    {
        const hand_item = player.getComponent("inventory").container.getItem( player.selectedSlot );

        const armorSlot = getArmorSlot( item );

        const armor_previously_equipped_in_slot = hand_item != undefined || playerHasArmorInSlot( player, armorSlot );

        if ( armor_previously_equipped_in_slot )
        {
            reset( player );
        }

        addArmorInSlotFlag( player, armorSlot );

        const { ptr, isPtr } = addArmorEffect( player, item );

        if ( isPtr )
        {
            const funcs = interval_function_map.get( player.name );
            funcs.push( ptr );
        }
    }, 1 );
}