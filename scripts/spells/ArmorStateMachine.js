import * as spells from "./spells.js";

export class ArmorStateMachine
{
    update( player, currentTick, isCorrupted ) {}

    remove( player ) {}

    static create( baseSpell, spellTier, currentTick )
    {
        const generator = ArmorStateMachine.#machines.get( baseSpell );

        if ( generator == null )
            return null;

        return generator( baseSpell, spellTier, currentTick );
    }

    static hasMachine( baseSpell )
    {
        return ArmorStateMachine.#machines.has( baseSpell );
    }

    /**
     * @param { string } baseSpell
     * @param { ( spell: string, tier: number, currentTick: number ) => ArmorStateMachine } generator 
     */
    static registerMachine( baseSpell, generator )
    {
        if ( ArmorStateMachine.hasMachine( baseSpell ) )
        {
            throw new Error("There is already a machine registered with the spell: " + baseSpell );
        }

        ArmorStateMachine.#machines.set( baseSpell, generator );
    }

    /** @type { Map< string, ( spell: string, tier: number, currentTick: number ) => ArmorStateMachine > } */
    static #machines = new Map();
}

import { IntimidationStateMachine } from "./state_machines/IntimidationStateMachine.js";
ArmorStateMachine.registerMachine( spells.INTIMIDATION, ( spell, tier, currentTick ) => { return new IntimidationStateMachine( spell, tier, currentTick ) } );

import { StampedeStateMachine } from "./state_machines/StampedeStateMachine.js";
ArmorStateMachine.registerMachine( spells.STAMPEDE, ( spell, tier, currentTick ) => { return new StampedeStateMachine( spell, tier, currentTick ) } );

import { SteadfastStateMachine } from "./state_machines/SteadfastStateMachine.js";
ArmorStateMachine.registerMachine( spells.STEADFAST, ( spell, tier, currentTick ) => { return new SteadfastStateMachine( spell, tier, currentTick ) } );

import { ImmunityStateMachine } from "./state_machines/ImmunityStateMachine.js";
ArmorStateMachine.registerMachine( spells.IMMUNITY, ( spell, tier, currentTick ) => { return new ImmunityStateMachine( spell, tier, currentTick ) } );

import { ExtinguishStateMachine } from "./state_machines/ExtinguishStateMachine.js";
ArmorStateMachine.registerMachine( spells.EXTINGUISH, ( spell, tier, currentTick ) => { return new ExtinguishStateMachine( spell, tier, currentTick ) } );

import { ResilienceStateMachine } from "./state_machines/ResilienceStateMachine.js";
ArmorStateMachine.registerMachine( spells.RESILIENCE, ( spell, tier, currentTick ) => { return new ResilienceStateMachine( spell, tier, currentTick ) } );

import { LeapingStateMachine } from "./state_machines/LeapingStateMachine.js";
ArmorStateMachine.registerMachine( spells.LEAPING, ( spell, tier, currentTick ) => { return new LeapingStateMachine( spell, tier, currentTick ) } );

import { ClarityStateMachine } from "./state_machines/ClarityStateMachine.js";
ArmorStateMachine.registerMachine( spells.CLARITY, ( spell, tier, currentTick ) => { return new ClarityStateMachine( spell, tier, currentTick ) } );