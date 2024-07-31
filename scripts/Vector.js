export class Vector
{
    /** Returns the magnitude of the vector */
    static magnitude( vec )
    {
        return Math.sqrt( vec.x*vec.x + vec.y*vec.y + vec.z*vec.z );
    }

    /** Normalizes the vector. Returns the normalized vector as an optional output */
    static normalize( vec )
    {
        const mag = Vector.magnitude( vec );

        if ( mag == 0 )
            return vec;

        return Vector.divide( vec, mag );
    }

    /** Divides the vector by the number. Returns the vector as an optional output */
    static divide( vec, num )
    {
        if ( num === 0 )
        {
            throw new Error("Divide by 0");
        }

        vec.x /= num;
        vec.y /= num;
        vec.z /= num;

        return vec;
    }

    /** Multiplies the vector by the number. Returns the vector as an optional output */
    static multiply( vec, factor )
    {
        vec.x *= factor;
        vec.y *= factor;
        vec.z *= factor;

        return vec;
    }

    /** Subtracts the second vector from the first vector. Returns the first vector as an optional output */
    static subtract( vec1, vec2 )
    {
        vec1.x -= vec2.x;
        vec1.y -= vec2.y;
        vec1.z -= vec2.z;

        return vec1;
    }

    /** Adds the vectors together. Returns the first vector as an optional output */
    static add( vec1, vec2 )
    {
        vec1.x += vec2.x;
        vec1.y += vec2.y;
        vec1.z += vec2.z;

        return vec1;
    }

    static equal( vec1, vec2 )
    {
        return vec1.x == vec2.x && vec1.y == vec2.y && vec1.z == vec2.z;
    }

    static distance( vec1, vec2 )
    {
        return Math.sqrt( ( vec1.x - vec2.x ) ** 2 + ( vec1.y - vec2.y ) ** 2 + ( vec1.z - vec2.z ) ** 2 );
    }
}