import { EntityDamageCause, Player } from "@minecraft/server";
import { print } from "./print";

import { Vector } from "./Vector.js";

export function calculateKnockbackVector( entityPosition, pusherPosition, forceMagnitude )
{
    const direction = Vector.normalize({
        x: entityPosition.x - pusherPosition.x,
        y: entityPosition.y - pusherPosition.y,
        z: entityPosition.z - pusherPosition.z
    });
  
    // Scale the direction vector by the force magnitude to get the final knockback vector  
    return Vector.multiply( direction, forceMagnitude );
}

/**
 * @param { Player } player
 * @param { Vector } spawnPos
 * @param { number } strength
 * @param { number } range
 */
export function createShockwave( player, spawnPos, strength, range, multiplier )
{
    // Create the needed variables for kb and pos
    const dimension = player.dimension;
    const entities = dimension.getEntities({ location: spawnPos, maxDistance: range, excludeNames: [player.name], excludeFamilies: ["inanimate"], excludeTypes: ["item"], excludeTags: ["anti_shockwave"] });

    // Loop through all nearby entities
    for ( let i = 0; i < entities.length; ++i )
    {
        const entity = entities[ i ];

        const distance = Vector.distance( entity.location, spawnPos );
        // Calculate damage
        const kbIntensity = ( 19 - distance ) * multiplier / 1.5;
        const kbVector = calculateKnockbackVector( entity.location, spawnPos, kbIntensity/2 );

        // Apply damage and knockback
        const damage = multiplier * strength * ( range / ( range + distance * distance ) );
        
        entity.applyDamage( damage, { cause: EntityDamageCause.entityAttack, damagingEntity: player } );

        try
        {
            entity.applyKnockback( kbVector.x, kbVector.z, kbIntensity/4, kbIntensity/20 );
        }
        catch ( error )
        {
            entity.applyImpulse( calculateKnockbackVector( entity.location, spawnPos, 2 ) );
        }
    }

    return true;
}