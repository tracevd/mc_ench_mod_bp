export class StringRef
{
    constructor( str = "" )
    {
        this.str = str;
    }

    /** @type { string } */
    str;

    toString() { return this.str; }

    get length() { return this.str.length; }

    addWithNewLine( str )
    {
        this.str = this.str + str.trimEnd() + '\n'
    }
}