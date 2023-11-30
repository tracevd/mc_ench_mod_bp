import * as spells from './spells.js';
import * as util from './util.js';

import { Player, Entity } from '@minecraft/server';

import { createShockwave } from '../shockwave.js';

export class WeaponEffects
{
    /** @type Map< string, WeaponEffect > */
    static #effects = new Map();

    /**
     * @param {WeaponEffect} effect 
     */
    static addEffect( effect )
    {
        this.#effects.set( effect.name, effect );
    }

    /**
     * @param {string} name 
     */
    static getEffect( name )
    {
        const effect = this.#effects.get( name );
        if ( effect == null )
            throw new Error("Cannot get weapon effect: name");
        return effect;
    }
}

export class WeaponEffect
{
    /**
     * @param {string} name 
     * @param {(event, spelltier, popup_str) => number} activation 
     */
    constructor( name, activation )
    {
        this.name = name;
        this.#activation = activation;
    }

    /**
     * @returns Extra damage done to target
     */
    activate( entityHurt, spelltier, popup_str )
    {
        return this.#activation( entityHurt, spelltier, popup_str );
    }

    /** @type {string} */
    name;
    /**  */
    #activation;
}

WeaponEffects.addEffect( new WeaponEffect(spells.CRITICAL_STRIKE,
    (event, spelltier, popup_str) =>
    {
        const rand = Math.random();

        if ( rand < ( spelltier + 15 ) / 50 )
            return 0;

        popup_str[ 0 ] = popup_str[ 0 ] + spells.CRITICAL_STRIKE + '\n';

        const damageAdded = event.damage * 0.3 * spelltier / 7;

        event.target.applyDamage( damageAdded );

        return damageAdded;
    }
) );

WeaponEffects.addEffect( new WeaponEffect(spells.POISON,
    (event, spelltier, popup_str) =>
    {
        if ( !util.coolDownHasFinished( event.source, spells.POISON ) )
            return 0;

        popup_str[0] = popup_str[0] + spells.POISON + '\n';

        event.target.runCommandAsync(`effect @s[type=!item,type=!xp_orb] poison ${1+Math.floor(spelltier/3)} ${spelltier == 10 ? 2 : spelltier == 5 ? 1 : 0}`);
        util.startCoolDown( event.source, spells.POISON, 15 );
        return 0;
    }
));

WeaponEffects.addEffect( new WeaponEffect(spells.WITHER,
    (event, spelltier, popup_str) =>
    {
        if ( !util.coolDownHasFinished( event.source, spells.WITHER ) )
            return 0;

        popup_str[0] = popup_str[0] + spells.WITHER + '\n';

        event.target.runCommandAsync(`effect @s[type=!item,type=!xp_orb] wither ${1+Math.floor(spelltier/3)} ${spelltier == 10 ? 2 : spelltier == 5 ? 1 : 0 }`);
        util.startCoolDown( event.source, spells.WITHER, 20 );
        return 0;
    }
));

WeaponEffects.addEffect( new WeaponEffect(spells.GROUNDPOUND,
    (event, spelltier, popup_str) =>
    {
        const velo = event.source.getVelocity().y * -1;
        if ( velo <= 0 || !util.coolDownHasFinished( event.source, spells.GROUNDPOUND ) )
            return 0;

        popup_str[0] = popup_str[0] + spells.GROUNDPOUND + '\n';

        const strength_multiplier = util.roundToNearestTenth( ( 0.9 + velo ) ** 3 );
        const radius = spelltier * velo / 2 + spelltier - spelltier / 7;
        const strength = spelltier * strength_multiplier ** 0.6;

        if ( event.source instanceof Player )
        {
            event.source.sendMessage( `Groundpound strength: ${strength.toString()}` );
            event.source.sendMessage( `Groundpound radius: ${radius.toString()}` );
        }

        if ( createShockwave( event.source, event.source.location, strength, radius, strength_multiplier ) )
            util.startCoolDown( event.source, spells.GROUNDPOUND, 10 );
        return 0;
    }
));

WeaponEffects.addEffect( new WeaponEffect(spells.EXPLODING,
    (event, spelltier, popup_str) =>
    {
        if ( !util.coolDownHasFinished( event.source, spells.EXPLODING ) )
            return 0;

        popup_str[ 0 ] = popup_str[ 0 ] + spells.EXPLODING + '\n';

        event.target.dimension.createExplosion( event.target.location, 3, { breaksBlocks: false, source: event.source } );
        util.startCoolDown( event.source, spells.EXPLODING, 15 );
        return 0;
    }
));

WeaponEffects.addEffect( new WeaponEffect(spells.ABSORBING,
    (event, spelltier, popup_str) =>
    {
        if ( !util.coolDownHasFinished( event.source, spells.ABSORBING ) )
            return 0;

        const rand = Math.random();
        if ( rand < 0.5 )
            return 0;

        popup_str[ 0 ] = popup_str[ 0 ] + spells.ABSORBING + '\n';

        event.source.runCommandAsync("effect @s absorption 3 0 true");

        util.startCoolDown( event.source, spells.ABSORBING, 3 );
        return 0;
    }
));

WeaponEffects.addEffect( new WeaponEffect(spells.LIFESTEAL,
    (event, spelltier, popup_str) =>
    {
        if ( !util.coolDownHasFinished( event.source, spells.LIFESTEAL ) )
            return 0;

        const rand = Math.random();
        if ( rand < 0.5 )
            return 0;

        popup_str[ 0 ] = popup_str[ 0 ] + spells.LIFESTEAL + '\n';

        const health = event.source.getComponent("health");
        const multiplier = (spelltier / 33) + 0.2;

        let health_stolen = event.damage * multiplier;

        if ( isNaN( health_stolen ) )
            health_stolen = 0;
        let current = health.currentValue;
        if ( isNaN( current ) )
            current = 0;

        health.setCurrentValue( current + ( health_stolen > 2 ? 2 : health_stolen ) );
        util.startCoolDown( event.source, spells.LIFESTEAL, 4 );

        return 0;
    }
));

WeaponEffects.addEffect( new WeaponEffect(spells.SLOWING,
    (event, spelltier, popup_str) =>
    {
        if ( !util.coolDownHasFinished( event.source, spells.SLOWING ) )
            return 0;

        popup_str[ 0 ] = popup_str[ 0 ] + spells.SLOWING + '\n';

        const time_ = Math.ceil( spelltier / 4 );
        const time = time_ < 1 ? 1 : time_;
        event.target.runCommandAsync(
            `effect @s[type=!item,type=!xp_orb] slowness ${ time } ${ ( spelltier > 5 ? 2 : 1 ) } true`
        )
        util.startCoolDown( event.source, spells.SLOWING, 7 );
        return 0;
    }
));

WeaponEffects.addEffect( new WeaponEffect(spells.LIGHTNING,
    (event, spelltier, popup_str) =>
    {
        if ( !util.coolDownHasFinished( event.source, spells.LIGHTNING ) )
            return 0;
    
        popup_str[ 0 ] = popup_str[ 0 ] + spells.LIGHTNING + '\n';

        event.target.applyDamage( 10 );
        event.target.runCommandAsync("summon lightning_bolt");
        util.startCoolDown( event.source, spells.LIGHTNING, 7 );
        return 10;
    }
));

WeaponEffects.addEffect( new WeaponEffect(spells.LEVITATING,
    (event, spelltier, popup_str) =>
    {
        if ( !util.coolDownHasFinished( event.source, spells.LEVITATING ) )
            return 0;

        popup_str[0] = popup_str[0] + spells.LEVITATING + '\n';

        event.target.runCommandAsync(`effect @s[type=!item,type=!xp_orb] levitation 1 ${(spelltier)+3} true`);
        util.startCoolDown( event.source, spells.LEVITATING, 7 );
        return 0;
    }
));

WeaponEffects.addEffect( new WeaponEffect(spells.CORRUPTION,
    (event, spelltier, popup_str) =>
    {
        if ( util.isCorrupted( event.target ) )
            return 0;
        if ( !util.coolDownHasFinished( event.source, spells.CORRUPTION ) )
            return 0;

        popup_str[ 0 ] = popup_str[ 0 ] + spells.CORRUPTION + '\n';

        util.startCoolDown( event.target, spells.CORRUPTED_TAG, ( spelltier == 10 ? 8 : ( spelltier + 7 ) / 2 ) );

        if ( event.target instanceof Player )
        {
            event.target.onScreenDisplay.setTitle( "You have been " + spells.RESET + spells.LIGHT_PURPLE + "Corrupted", { fadeInSeconds: 0.2, staySeconds: 0.4, fadeOutSeconds: 0.2 } );
        }
        
        util.startCoolDown( event.source, spells.CORRUPTION, 25 );
        return 0;
    }
));