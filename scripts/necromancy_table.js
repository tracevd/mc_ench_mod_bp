import { world, system, Player, Entity, ItemStack, EquipmentSlot } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

import { createShockwave } from "./shockwave";

import * as util from './util.js';
import { getLoreItem, getSpellTier, coolDownHasFinished, filter, isCorrupted, loreIncludes, loreTypeToSpellTier, numberToRomanNumeral, romanNumeralToNumber, roundToNearestTenth, secondsToTicks, startCoolDown } from './spells/util.js';
import * as spells from './spells/spells.js';

import { WeaponEffect, WeaponEffects } from "./spells/WeaponSpells.js";

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
        util.print( player.typeId + " does not have an equippable component");
        return;
    }

    const item = equip.getEquipment( EquipmentSlot.Mainhand );

    if ( item == undefined )
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

        const effect = WeaponEffects.getEffect( baseSpell );

        extraDamage += effect.activate( { source: player, target: hitEntity, damage: damage }, tier, popup_str );
    }

    util.print( "Damage: " + ( extraDamage + damage ) );

    util.print( popup_str[ 0 ] );

    if ( popup_str[ 0 ].length > 0 )
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

    const armorInfo = entityArmorMap.get( defendingEntity.id );

    if ( armorInfo == null )
        return;

    const spells_ = armorInfo.getNonCallbackSpells();

    if ( spells_.length == 0 )
    {
        util.print("Empty list");
        return;
    }

    if ( loreIncludes( spells_, spells.REFLECT ) && attackingEntity != undefined )
    {
        const spell_tier = loreTypeToSpellTier( spells_, spells.REFLECT );
        const dmg = roundToNearestTenth( damage * 0.1 * ( spell_tier / 3 ) ) + 1;
        world.sendMessage( "Reflected: " + dmg.toString() );
        attackingEntity.applyDamage( dmg );
    }
    if ( loreIncludes( spells_, spells.LASTSTAND ) && coolDownHasFinished( defendingEntity, spells.LASTSTAND ) )
    {
        const health = defendingEntity.getComponent( "health" );
        if ( health.current < 2 )
        {
            defendingEntity.runCommandAsync( "effect @s strength 10 0" );
            defendingEntity.runCommandAsync( "effect @s absorption 10 4 true" );
            defendingEntity.runCommandAsync( "effect @s regeneration 2 0 true" );
            startCoolDown( defendingEntity, spells.LASTSTAND, 180 );
        }
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

    if ( loreIncludes( lore, spells.LEAPING ) )
    {
        player.runCommandAsync( "effect @s jump_boost 9999 1 true" );
        return { ptr, isPtr };
    }
    if ( loreIncludes( lore, spells.STAMPEDE ) )
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
                    }, secondsToTicks( 3 ) );
                }
            }                              
        }, 30 );
        return { ptr: id, isPtr: true };
    }
    if ( loreIncludes( lore, spells.EXTINGUISH ) )
    {
        const spell_tier = loreTypeToSpellTier( lore, spells.EXTINGUISH );
        const id = system.runInterval( () =>
        {
            if ( player.getComponent( "minecraft:onfire" ) == undefined )
                return;
            const rand = Math.random();
            if ( rand < spell_tier / 15 )
            {
                player.extinguishFire( false );
            }
        }, secondsToTicks( 1 ) );

        return { ptr: id, isPtr: true };
    }
    if ( loreIncludes( lore, spells.REFLECT ) )
    {
        return { ptr, isPtr };
    }
    if ( loreIncludes( lore, spells.LASTSTAND ) )
    {
        return { ptr, isPtr };
    }
    if ( loreIncludes( lore, spells.IMMUNITY ) )
    {
        const spell_tier = loreTypeToSpellTier( lore, spells.IMMUNITY );
        const id = system.runInterval( () =>
        {
            
            if ( player.getEffect( 'poison' ) != undefined )
            {
                const rand = Math.random();
                if ( rand < spell_tier / 15 )
                    player.runCommandAsync( "effect @s poison 0" );
            }
        }, secondsToTicks( 1.5 ) );

        return { ptr: id, isPtr: true };
    }
    if ( loreIncludes( lore, spells.STEADFAST ) )
    {
        player.runCommandAsync( "effect @s resistance 9999 0 true" );
        return { ptr, isPtr };
    }
    if ( loreIncludes( lore, spells.RESILIENCE ) )
    {
        const spell_tier = loreTypeToSpellTier( lore, spells.RESILIENCE );
        const amplifier = Math.ceil( spell_tier / 2 ) - 1;
        player.runCommandAsync( "effect @s health_boost 9999 " + amplifier.toString() + " true" );
        player.runCommandAsync( "effect @s regeneration 1 9 true" );
        return { ptr, isPtr };
    }
    if ( loreIncludes( lore, spells.INTIMIDATION ) )
    {
        const spell_tier = loreTypeToSpellTier( lore, spells.INTIMIDATION );
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
        }, secondsToTicks( 10 ) )
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

class EntityArmor
{
    static deadTag = "dead";

    constructor( entity )
    {
        if ( entity == null )
        {
            return;
        }

        this.#entity = entity;
        this.#callbacks = [null, null, null, null];

        this.#entityCallBack = system.runInterval( () => {
            if ( this.#entity.hasTag( EntityArmor.deadTag ) )
            {
                util.print("entity is dead!");
                return;
            }

            const equipment = this.#entity.getComponent('minecraft:equippable');

            if ( equipment == null )
            {
                util.print( entity.typeId + " had a null equipment component" );
            }

            this.#updateArmorSlot( equipment, EquipmentSlot.Head );
            this.#updateArmorSlot( equipment, EquipmentSlot.Chest );
            this.#updateArmorSlot( equipment, EquipmentSlot.Legs );
            this.#updateArmorSlot( equipment, EquipmentSlot.Feet );
                     
        }, secondsToTicks( 5 ) );
    }

    #updateArmorSlot( equipment, slot )
    {
        const item = equipment.getEquipment( slot );
        // const item = containerSlot.getItem();
        this.updateArmorSpell( item, slot );
    }

    /**
     * Returns all spells on a player's armor
     * @returns { string[] }
     */
    getAllSpells()
    {
        const ret = [];
        for ( const val in this.#armorSpells )
        {
            if ( val.length > 0 )
            {
                ret.push( val );
            }
        }
        return ret;
    }

    /**
     * Return all spells that do not have a callback function
     * @returns { string[] }
     */
    getNonCallbackSpells()
    {
        const ret = [];
        for ( let i = 0; i < 4; ++i )
        {
            if ( this.#callbacks[ i ] != null && this.#armorSpells[ i ] != "" )
            {
                ret.push( this.#armorSpells[ i ] );
            }
        }
        return ret;
    }

    /**
     * Set a given armor slot's spell
     * @param {ItemStack} armor
     * @param {string} slot 
     */
    updateArmorSpell( armor, slot )
    {
        const index = EntityArmor.#slotToIndex( slot );

        const lore = armor == null ? "" : armor.getLore()[ 0 ];

        if ( armor != null && this.#armorSpells[ index ] == lore )
            return;

        this.#removeSpellAt( index );

        if ( armor != null && lore != null )
        {
            this.#addSpellAt( index, armor );
        }
    }

    /**
     * Clear a player's armor effects
     */
    clear()
    {
        for ( let i = 0;i < this.#callbacks.length; ++i )
        {
            if ( this.#callbacks[ i ] == null )
                continue;

            system.clearRun( this.#callbacks[ i ] );
        }

        system.run( () => {
            this.#entity.removeTag( EntityArmor.deadTag );
        })
        
        system.clearRun( this.#entityCallBack );
    }

    entityDied()
    {
        this.#entity.addTag( EntityArmor.deadTag );
    }

    entityRespawned()
    {
        this.#entity.removeTag( EntityArmor.deadTag );
    }

    /**
     * @param {number} index 
     */
    #removeSpellAt( index )
    {
        if ( this.#armorSpells[ index ] == "" )
        {
            return;
        }

        if ( this.#callbacks[ index ] != null )
        {
            system.clearRun( this.#callbacks[ index ] );
            this.#callbacks[ index ] = null;
            this.#armorSpells[ index ] = "";
            return;
        }

        const spell = this.#armorSpells[ index ];
        this.#armorSpells[ index ] = "";

        if ( spell.includes( spells.STEADFAST ) )
        {
            this.#entity.runCommandAsync("effect @s resistance 0");
            return;
        }
        if ( spell.includes( spells.LEAPING ) )
        {
            this.#entity.runCommandAsync("effect @s jump_boost 0");
            return;
        }
        if ( spell.includes( spells.RESILIENCE ) )
        {
            this.#entity.runCommandAsync("effect @s health_boost 0");
        }
    }

    /**
     * @param {string} spell 
     * @param {number} ignoreIndex 
     */
    #alreadyHasSpell( spell, ignoreIndex = -1 )
    {
        for ( let i = 0; i < this.#armorSpells.length; ++i )
        {
            if ( i == ignoreIndex )
                continue;

            if ( this.#armorSpells[ i ].substring( 0, 10 ) == spell.substring( 0, 10 ) )
            {
                util.print("Already has spell: " + spell );
                return true;
            }
        }
        return false;
    }

    /**
     * @param {number} index 
     * @param {ItemStack} armor 
     */
    #addSpellAt( index, armor )
    {
        const lore = armor.getLore()[ 0 ];

        if ( this.#alreadyHasSpell( lore ) )
            return;

        const { ptr, isPtr } = addArmorEffect( this.#entity, armor );

        if ( isPtr )
        {
            this.#callbacks[ index ] = ptr;
        }

        this.#armorSpells[ index ] = armor.getLore()[ 0 ];
    }

    static #slotToIndex( slot )
    {
        switch ( slot )
        {
        case EquipmentSlot.Head:
            return 0;
        case EquipmentSlot.Chest:
            return 1;
        case EquipmentSlot.Legs:
            return 2;
        case EquipmentSlot.Feet:
            return 3;
        default:
            throw new Error("Unknown equipment slot!");
        }
    }

    #armorSpells = ["", "", "", ""];
    #callbacks = [0, 0, 0, null];
    #entity;
    #entityCallBack = 0;
}

/** @type { Map< string, EntityArmor > } */
const entityArmorMap = new Map();

const nonRemoveableTags = new Set( [ EntityArmor.deadTag ] );

function clearTags( entity )
{
    system.run( () => {
        const tags = entity.getTags();
        for ( let i = 0; i < tags.length; ++i )
        {
            if ( nonRemoveableTags.has( tags[ i ] ) )
                continue;
            entity.removeTag( tags[ i ] );
        }
    });
}

export function createArmorChecker( entity )
{
    if ( entity == null )
        world.sendMessage("Null player");

    clearTags( entity );

    const equippable = entity.getComponent("equippable");

    if ( equippable == null )
    {
        return;
    }

    util.print( entity.id );

    entityArmorMap.set( entity.id, new EntityArmor( entity ) );
}

export function entityDied( entity )
{
    if ( entity == null )
        return;

    const info = entityArmorMap.get( entity.id );

    if ( info == null )
    {
        return;
    }

    info.entityDied();
}

export function entityRespawned( entity )
{
    if ( entity == null )
        return;

    const info = entityArmorMap.get( entity.id );

    if ( info == null )
    {
        return;
    }

    info.entityRespawned();
}

export function removeArmorChecker( entity )
{
    const info = entityArmorMap.get( entity.id );

    if ( info == null )
    {
        clearTags( entity );
        return;
    }

    info.clear();

    entityArmorMap.delete( entity.id );

    util.print("Clearing tags");
    clearTags( entity );
}
