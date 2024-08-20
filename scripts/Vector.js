export class Vector
{
    /** Returns the magnitude of the vector */
    static magnitude( vec )
    {
        return Math.sqrt( vec.x*vec.x + vec.y*vec.y + vec.z*vec.z );
    }

    /** Normalizes the vector */
    static normalize( vec )
    {
        const mag = Vector.magnitude( vec );

        if ( mag == 0 )
            return {
                x: vec.x,
                y: vec.y,
                z: vec.z
            };

        return Vector.divide( vec, mag );
    }

    /** Divides the vector by the number */
    static divide( vec, num )
    {
        if ( num === 0 )
        {
            throw new Error("Divide by 0");
        }

        return {
            x: vec.x / num,
            y: vec.y / num,
            z: vec.z / num
        };
    }

    /** Multiplies the vector by the number */
    static multiply( vec, num )
    {
        return {
            x: vec.x * num,
            y: vec.y * num,
            z: vec.z * num
        };
    }

    /** Subtracts the second vector from the first vector */
    static subtract( vec1, vec2 )
    {
        return {
            x: vec1.x - vec2.x,
            y: vec1.y - vec2.y,
            z: vec1.z - vec2.z
        };
    }

    /** Adds the vectors together */
    static add( vec1, vec2 )
    {
        return {
            x: vec1.x + vec2.x,
            y: vec1.y + vec2.y,
            z: vec1.z + vec2.z
        };
    }

    /** Returns whether the vectors are equal */
    static equal( vec1, vec2 )
    {
        return vec1.x == vec2.x && vec1.y == vec2.y && vec1.z == vec2.z;
    }

    /** Returns the distance between the two vectors */
    static distance( vec1, vec2 )
    {
        return Math.sqrt( ( vec1.x - vec2.x ) ** 2 + ( vec1.y - vec2.y ) ** 2 + ( vec1.z - vec2.z ) ** 2 );
    }
}