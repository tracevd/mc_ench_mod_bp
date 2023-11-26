import { Player } from "@minecraft/server";

class Vector
{
    x = 0;
    y = 0;
    z = 0;
}

/**
 * @param { Vector } vector
 */
function magnitude( vector )
{
    return Math.sqrt( vector.x ** 2 + vector.y ** 2 + vector.z ** 2 );
}

function roundNumberToNearestTenth( num )
{
    return Math.round( num * 10 ) / 10;
}

function subtractAndExponentiate( pointA, pointB )
{
    return ( pointA - pointB ) ** 2;
}

/**
 * @param { Vector } posA
 * @param { Vector } posB
 */
export function calculateDistance( posA, posB )
{
    const x = subtractAndExponentiate( posA.x, posB.x );
    const y = subtractAndExponentiate( posA.y, posB.y );
    const z = subtractAndExponentiate( posA.z, posB.z );
    return Math.sqrt( x + y + z );
}

/**
 * @param { Vector } entityPosition
 * @param { Vector } pusherPosition
 * @param { number } forceMagnitude
 */
export function calculateKnockbackVector( entityPosition, pusherPosition, forceMagnitude )
{
    const direction =
    {
        x: entityPosition.x - pusherPosition.x,
        y: entityPosition.y - pusherPosition.y,
        z: entityPosition.z - pusherPosition.z
    };
  
    const distance = magnitude( direction );
  
    // Normalize the direction vector so it has a magnitude of 1
    direction.x /= distance;
    direction.y /= distance;
    direction.z /= distance;
  
    // Scale the direction vector by the force magnitude to get the final knockback vector

    direction.x *= forceMagnitude;
    direction.y *= forceMagnitude;
    direction.z *= forceMagnitude;
  
    return direction;
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

    if ( entities.length  < 2 )
        return false;

    // Loop through all nearby entities (not items though)
    for ( let i = 0; i < entities.length; i++ )
    {
        const entity = entities[ i ];

        const distance = calculateDistance( entity.location, spawnPos );
        // Calculate damage
        const kbIntensity = ( 19 - distance ) * multiplier / 1.5;
        const kbVector = calculateKnockbackVector( entity.location, spawnPos, kbIntensity/2 );

        // Apply damage and knockback
        const damage = roundNumberToNearestTenth( multiplier * ( 0.00025 + ( strength - 1 ) / 600 ) * ( ( distance - 20 ) ** 2 ) + 1.5 );
        entity.applyDamage( damage );

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