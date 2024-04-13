import * as mc from "@minecraft/server";
import * as mcui from "@minecraft/server-ui";

import { getBaseSpellAndTier, isCorrupted, loreIncludes, numberToRomanNumeral, romanNumeralToNumber, secondsToTicks } from './spells/util.js';
import * as spells from './spells/spells.js';

import { WeaponEffects, BowEffects, BowReleaseEffects } from "./spells/WeaponSpells.js";

import { ArmorActivateEvent, BowReleaseEvent, BreakBlockEvent, WeaponEvent } from "./spells/Events.js";
import { ArmorSpells, initializeEntity, getEntityArmor, removeEntity } from "./spells/ArmorSpells.js";
import { PickaxeSpells } from "./spells/PickaxeSpells.js";
import { print } from "./util.js";
import { RESET } from "./spells/spell_constants.js";

/**
 * Activates spells on the item in the player's main hand.
 * Effects do not activate if the player is corrupted.
 * 
 * If the there is no item in the main hand, or the item is a bow,
 * this function will do nothing.
 * 
 * @param { mc.Player } player
 * @param { mc.Entity } hitEntity
 * @param { Number } damage
 * @returns { string[] } spells activated that can be reflected
 */
export function parseWeaponSpells( player, hitEntity, damage )
{
    if ( isCorrupted( player ) )
    {
        return [];
    }

    if ( !hitEntity.isValid() )
    {
        mc.world.sendMessage("Invalid entity");
        return [];
    }

    const equip = player.getComponent("equippable");

    if ( equip == null )
    {
        // print( player.typeId + " does not have an equippable component");
        return [];
    }

    const item = equip.getEquipment( mc.EquipmentSlot.Mainhand );

    if ( item == undefined )
        return [];

    if ( item.typeId.endsWith("bow") )
        return [];
    
    /** @type {string[]} */
    const lore = item.getLore();

    if ( lore.length == 0 || lore[ 0 ] == undefined )
    {
        return [];
    }

    let popup_str = [""];

    let extraDamage = 0;

    const event = new WeaponEvent( hitEntity, player, damage, isCorrupted( player ) );

    for ( let i= 0; i < lore.length; ++i )
    {
        const { baseSpell, tier } = getBaseSpellAndTier( lore[ i ] );

        extraDamage += WeaponEffects.activateEffect( baseSpell, event, tier, popup_str );
    }

    if ( popup_str[ 0 ].length > 0 && player instanceof mc.Player )
    {
        player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
    }

    return event.reflectableSpells;
}

/**
 * Activates any bow spells on the bow in the source's main hand
 * that activate on release of a projectile.
 * 
 * If the item is not a bow, this does nothing.
 * 
 * Effects do not activate if the player is corrupted.
 * @param { mc.Entity } source 
 * @param { mc.ItemStack } item
 * @param { mc.Entity } projectile
 */
export function releaseProjectile( source, item, projectile )
{
    if ( !item.typeId.includes("bow") )
        return;

    if ( isCorrupted( source ) )
    {
        return;
    }

    const lore = item.getLore();

    let popup_str = [""];

    const event = new BowReleaseEvent( source, projectile );

    for ( let i = 0; i < lore.length; ++i )
    {
        const { baseSpell, tier } = getBaseSpellAndTier( lore[ i ] );

        const effect = BowReleaseEffects.getEffect( baseSpell );

        if ( effect == null )
            continue;

        effect( event, tier, popup_str );
    }

    if ( popup_str[ 0 ].length > 0 && source instanceof mc.Player )
    {
        source.onScreenDisplay.setActionBar( popup_str[ 0 ] );
    }
}

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

class ArmorActivation
{
    constructor( popup_str, reflectEffect, reflectLevel, evasionEffect, evasionLevel )
    {
        this.popup_str = popup_str;
        this.reflectEffect = reflectEffect;
        this.reflectLevel = reflectLevel;
        this.evasionEffect = evasionEffect;
        this.evasionLevel = evasionLevel;
    }

    /** @type { ((armorActivation: any) => void) | null } */
    reflectEffect;

    /** @type { number } */
    reflectLevel;

    /** @type { ((armorActivation: any) => void) | undefined } */
    evasionEffect;

    /** @type { number } */
    evasionLevel;

    /** @type { string[] } */
    popup_str;
}

/**
 * Parses the defending entity's armor, activating any armor spells
 * that are activated on hit.
 * @param { mc.Player } defendingEntity
 * @param { mc.Entity } attackingEntity
 * @param { number } damage
 * @param { boolean } wasProjectile
 */
export function parseArmorSpells( defendingEntity, attackingEntity, damage, wasProjectile )
{
    const armorInfo = getEntityArmor( defendingEntity );

    if ( armorInfo == null )
        return null;

    const spells_ = armorInfo.getActivateableSpells();

    if ( spells_.length == 0 )
    {
        return null;
    }

    const popup_str = [""];

    const event = new ArmorActivateEvent( defendingEntity, attackingEntity, damage, isCorrupted( attackingEntity ), [], wasProjectile );

    let reflect;
    let reflectLevel = 0;
    let evasion;
    let evasionLevel = 0;

    for ( let i = 0; i < spells_.length; ++i )
    {
        const { baseSpell, tier } = getBaseSpellAndTier( spells_[ i ].spell );

        if ( baseSpell == spells.REFLECT )
        {
            reflect = ArmorSpells.getEffect( spells.REFLECT );
            reflectLevel = tier;
            continue;
        }
        if ( baseSpell == spells.EVASION )
        {
            evasion = ArmorSpells.getEffect( spells.EVASION );
            evasionLevel = tier;
            continue;
        }

        event.equipmentSlot = spells_[ i ].slot;

        ArmorSpells.activateEffect( baseSpell, event, tier, popup_str );
    }

    return new ArmorActivation( popup_str, reflect, reflectLevel, evasion, evasionLevel );
}

/**
 * Parses the bow spells on the bow currently in the player's main hand.
 * Only parses effects that activate on entity hit.
 * @param {mc.Player} player 
 * @param {mc.Entity} hitEntity 
 * @param {number} damage The amount of damage done to the hitEntity
 * @returns { string[] } spells activated that are reflectable
 */
export function parseBowSpells( player, hitEntity, damage )
{
    if ( isCorrupted( player ) )
    {
        return [];
    }

    if ( !hitEntity.isValid() )
    {
        mc.world.sendMessage("Invalid entity");
        return [];
    }

    const equip = player.getComponent("equippable");

    if ( equip == null )
    {
        //util.print( player.typeId + " does not have an equippable component");
        return [];
    }

    const item = equip.getEquipment( mc.EquipmentSlot.Mainhand );

    if ( item == undefined )
        return [];

    if ( !item.typeId.endsWith("bow") )
        return [];
    
    /** @type {string[]} */
    const lore = item.getLore();

    if ( lore.length == 0 || lore[ 0 ] == undefined )
    {
        return [];
    }

    let popup_str = [""];

    let extraDamage = 0;

    const event = new WeaponEvent( hitEntity, player, damage, isCorrupted( player ) );

    for ( let i = 0; i < lore.length; ++i )
    {
        const { baseSpell, tier } = getBaseSpellAndTier( lore[ i ] );

        const effect = BowEffects.getEffect( baseSpell );

        if ( effect == null )
        {
            continue;
        }

        extraDamage += effect( event, tier, popup_str );
    }

    if ( popup_str[ 0 ].length > 0 && player instanceof mc.Player )
    {
        player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
    }

    return event.reflectableSpells;
}

/**
 * @param {mc.Player} player 
 * @param {mc.ItemStack} pickaxe 
 * @param {mc.Block} block 
 * @returns 
 */
export function parsePickaxeSpells( player, pickaxe, block )
{
    const lore = pickaxe.getLore();

    if ( lore.length == 0 )
    {
        return false;
    }

    let popup_str = [""];

    const event = new BreakBlockEvent( player, pickaxe, block );

    for ( let i = 0; i < lore.length; ++i )
    {
        const { baseSpell, tier } = getBaseSpellAndTier( lore[ i ] );

        PickaxeSpells.activateSpell( baseSpell, event, tier, popup_str );
    }

    if ( popup_str[ 0 ].length > 0 )
    {
        mc.system.run( () => {
            player.onScreenDisplay.setActionBar( popup_str[ 0 ] );
        });
    }

    return event.cancelBlockBreak;
}

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

    player.getComponent("inventory").container.setItem( player.selectedSlot, weapon );

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

    player.getComponent("inventory").container.setItem( player.selectedSlot, armor );

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

    player.getComponent("inventory").container.setItem( player.selectedSlot, bow );

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

    player.getComponent("inventory").container.setItem( player.selectedSlot, pick );

    return true;
}

function clearLore( player, item )
{
    if ( item.getLore() == undefined || item.getLore().length == 0 )
        return false;
    item.setLore([]);
    player.getComponent("inventory").container.setItem( player.selectedSlot, item );
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

    player.getComponent("inventory").container.setItem( player.selectedSlot, item );
    return true;
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

        const required_levels = [5, 10, 15, 20, 25, 5, 0, 0];

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

        const isWeapon = item.typeId.includes("sword") || item.typeId.includes("_axe");
        const isArmor  = item.typeId.includes("helmet") || item.typeId.includes("chestplate") || item.typeId.includes("leggings") || item.typeId.includes("boots");
        const isBook   = item.typeId.includes("book");
        const isBow    = item.typeId.endsWith('bow');
        const isPick   = item.typeId.includes('ickaxe');

        if ( selection != REMOVE_LAST && selection != REMOVE_LORE )
        {
            if ( isArmor && item.getLore().length >= 1 )
            {
                print("Cannot add more than 1 spell to a piece of armor!", player);
                return;
            }
            else if ( ( isWeapon || isBow ) && item.getLore().length >= 3 )
            {
                print("Cannot add more than 3 spells to a weapon!", player);
                return;
            }
            else if ( isPick && item.getLore().length >= 1 )
            {
                print("Cannot add more than 1 spell to a pickaxe!", player);
                return;
            }
        }

        if ( selection == SPECIFIC )
        {
            if ( isBook )
            {
                print("Cannot select specific spell for a book", player);
                return;
            }
            const infos = isWeapon ? spells.getAllWeaponSpells()
                        : isArmor ? spells.getAllArmorSpells()
                        : isPick ? spells.getAllPickaxeSpells()
                        : spells.getAllBowSpells();

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
                        print("This item already has this spell on it!");
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
                        print("You do not have enough levels (need " + required_level.toString() + ")", player);
                        return;
                    }

                    const finalSpell = selectedInfo.hasTiers() ? selectedInfo.name + numberToRomanNumeral( spellLevel ) : selectedInfo.name;

                    lore.push( finalSpell );

                    item.setLore( lore );

                    print(required_level, player);

                    player.getComponent("inventory").container.setItem( player.selectedSlot, item );
                    player.runCommandAsync("xp -" + required_level.toString() + "L @s");
                });
            });

            return;
        }

        if ( isWeapon )
        {
            if ( selection == REMOVE_LORE ) 
            {
                clearLore( player, item );
                return;
            }
            else if ( selection == REMOVE_LAST && !clearLastLore( player, item ) ) return;
            
            else if ( selection < REMOVE_LAST && !addSpellToWeapon( player, item, spell_tier ) ) return;

            player.runCommandAsync("xp -" + required_level.toString() + "L @s");
        }
        else if ( isArmor )
        {
            if ( selection == REMOVE_LORE ) 
            {
                clearLore( player, item );
                return;
            }
            else if ( selection == REMOVE_LAST && !clearLastLore( player, item ) ) return;

            else if ( selection < REMOVE_LAST && !addSpellToArmor( player, item, spell_tier ) ) return;

            player.runCommandAsync("xp -" + required_level.toString() + "L @s");
        }
        else if ( isBook )
        {
            if ( selection == REMOVE_LORE )
            {
                player.getComponent("inventory").container.setItem( player.selectedSlot, new mc.ItemStack( "book", 1 ) );
            }
            else if ( selection == REMOVE_LAST && !clearLastLore( player, item ) ) return;
            else
            {
                const convertTierToBookTier = ['I', 'I', 'II', 'V', 'X'];
                player.runCommandAsync("clear @s book 0 1");
                player.runCommandAsync("function tier" + convertTierToBookTier[ spell_tier - 1 ] );
            }
            
            player.runCommandAsync("xp -" + required_level.toString() + "L @s");
        }
        else if ( isBow )
        {
            if ( selection === REMOVE_LORE )
            {
                clearLore( player, item );
                return;
            }
            else if ( selection == REMOVE_LAST && !clearLastLore( player, item ) ) return;
            else if ( selection < REMOVE_LAST && !addSpellToBow( player, item, spell_tier ) ) return;

            player.runCommandAsync("xp -" + required_level.toString() + "L @s");
        }
        else if ( isPick )
        {
            if ( selection === REMOVE_LORE )
            {
                clearLore( player, item );
                return;
            }
            else if ( selection == REMOVE_LAST && !clearLastLore( player, item ) ) return;
            else if ( selection < REMOVE_LAST && !addSpellToPickaxe( player, item, spell_tier ) ) return;

            player.runCommandAsync("xp -" + required_level.toString() + "L @s");
        }
    })
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
