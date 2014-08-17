lenientjsonjs
=============

A small library for JS containing a GSON lenient-compatible JSON parser and stringifier.
I personally needed this for Minecraft JSON parsing in other languages.

Prerequisites
=============

[XRegExp](xregexp.com) is required, as the parser requires it for sticky RegExp support.

Usage
=============

Plop in GSON.js or GSON.min.js and let the magic carry itself.

Reference
=============

### GSON.parse(json (string), [strict (bool)])

  json: the string to parse  
  strict: whether or not to use strict parsing. Default value is true.  

Parses the requested JSON and returns the parsed object.
Throws Errors if an error occurs during parsing.

If "strict" is disabled, [GSON's "JsonReader" lenient parsing](https://google-gson.googlecode.com/svn/trunk/gson/docs/javadocs/com/google/gson/stream/JsonReader.html#setLenient-boolean-) is enabled.

For reference, this is the current list of supported concepts:
* Streams that start with the non-execute prefix, ")]}'\n".
* Numbers may be NaNs or infinities.
* End of line comments starting with // or # and ending with a newline character.
* C-style comments starting with /* and ending with */. Such comments may not be nested.
* Names that are unquoted or 'single quoted'.
* Strings that are unquoted or 'single quoted'.
* Array elements separated by ; instead of ,.
* Names and values separated by = or => instead of :.
* Name/value pairs separated by ; instead of ,.

These two concepts are NOT supported currently, as personally I did not need them:
* Unnecessary array separators. These are interpreted as if null was the omitted value.
* Streams that include multiple top-level values. With strict parsing, each stream must contain exactly one top-level value.
* Top-level values of any type. With strict parsing, the top-level value must be an object or an array.

### GSON.stringify(obj (any), [options (dictionary OR boolean)])

  obj: object to stringify  
  options: either a property bag of options to use in the stringification process, false, or left out. Default value is undefined. Setting to false enables some very loose leniency (unquoted/single-quoted keys/strings & NaNs/infinites).  
    valid properties:  
      keyPairSeparator (string): the separator string used between key/value pairs. Default is :  
      arraySeparator (string): the separator string used between array elements. Default is ,  
      allowNaNInfinite (bool): whether or not NaNs and Infinites will be stringified as-is. Default is false (outputs nulls).  
      unquotedKeys (bool): whether or not keys in key/value pairs can be unquoted, if possible. Default is false.  
      unquotedStrings (bool): whether or not string values can be unquoted, if possible. Default is false.  
      preferSingleQuotedKeys (bool): whether or not keys in key/value pairs can use the single quote character, if possible. Default is false.  
      preferSingleQuotedStrings (bool): whether or not string values can use the single quote character, if possible. Default is false.  

Returns a string representation of the object passed to it.

License
============

MIT; go nuts and use for whatever purpose. I'd like a linkback, but not required.