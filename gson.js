var GSON = GSON || (function()
{
	var _json ;
	var _pos;
	var _len;

	function peekRegex(regex)
	{
		return XRegExp.exec(_json, regex, _pos, true);
	}

	function eatRegex(regex)
	{
		var match = peekRegex(regex);

		if (!match)
			return false;

		_pos += match[0].length;
		return match[0];
	}

	function peekChar()
	{
		return _json[_pos];
	}

	function eatChar(char)
	{
		if (peekChar() !== char)
			return false;

		return !!(_pos++);
	}

	function skipWhitespace()
	{
		while (true)
		{
			switch (peekChar())
			{
				case ' ': case '\t': case '\r': case '\n':
					++_pos;
					continue;
			}

			break;
		}
	}

	var _strict;
	var _depth;

	var _startObject = /{/;
	var _endObject = /}/;

	var _startArray = /\[/;
	var _endArray = /\]/;

	var _colon = /:/;
	var _comma = /,/;

	var _null = /null/;
	var _boolean = /true|false/;
	var _number = /-?(0|[1-9][0-9]*)(\.[0-9]+)?(e[+-]?[0-9]+)?/i;

	var _stringBoundary = /"/;
	var _stringEscape = /\\/;
	var _controlCharacter = /["\\/bfnrtu]/;
	var _controlUnicode = /[0-9a-f]{4}/i;

	var _lenientSemicolon = /;/;
	var _lenientNonExecutePrefix = /\)]}'\n/;
	var _lenientNaNOrInfinite = /NaN|-?Infinity/;
	var _lenientStringBoundary = /["']/;
	var _lenientControlCharacter = /['"\\/bfnrtu]/;
	var _lenientKeyValueSeparator = /(:)|(=>)|(=)/;
	var _lenientSingleLineComment = /(\/\/|#)[^\n]*\n?/;
	var _lenientBlockComment = /\/\*[\w\W]*\*\//;
	var _lenientStringStart = /[a-z_$]/i;

	function _checkComment()
	{
		var cmt = '/#';

		while (cmt.indexOf(peekChar()) !== -1)
		{
			eatRegex(_lenientSingleLineComment);
			eatRegex(_lenientBlockComment);
			skipWhitespace();
		}
	}

	function _error(str)
	{
		throw new Error('[index ' + _pos + '] ' + str);
	}

	function _parseString()
	{
		skipWhitespace();

		if (!_strict)
			_checkComment();

		var str = '';
		var boundary;

		// "Strings that are unquoted or 'single quoted'."
		if (!_strict)
		{
			if ((boundary = eatRegex(_lenientStringBoundary)) === false)
				boundary = null;
		}
		else
		{
			if ((boundary = eatRegex(_stringBoundary)) === false)
				_error('expected ", got ' + peekChar());
		}

		var stringContainer;

		if (boundary)
			stringContainer = XRegExp.cache('[^' + boundary + '\\\\]*');
		else
			stringContainer = XRegExp.cache('\\w*');

		while (true)
		{
			var grp = eatRegex(stringContainer);

			if (grp !== false)
				str += grp;

			if (boundary === null || eatChar(boundary))
				break;
			else if (eatRegex(_stringEscape))
			{
				var ctrl = eatRegex(!_strict ? _lenientControlCharacter : _controlCharacter);

				if (ctrl === false)
					_error('expected valid control character, got ' + peekChar());

				switch (ctrl)
				{
					case '\'': // not strict (accept single quotes)

					case '"':
					case '\\':
					case '/':
						str += ctrl;
						break;
					case 'b':
						str += '\b';
						break;
					case 'f':
						str += '\f';
						break;
					case 'n':
						str += '\n';
						break;
					case 'r':
						str += '\r';
						break;
					case 't':
						str += '\t';
						break;
					case 'u':
						var hex = eatRegex(_controlUnicode);

						if (hex === false)
							_error('expected valid 4-character hex number, got ' + peekChar());

						str += String.fromCharCode(parseInt(hex, 16));
						break;
				}
			}
			else
				_error('expected " or \\, got ' + peekChar());
		}

		return str;
	}

	function _parseObject()
	{
		skipWhitespace();

		if (!_strict)
			_checkComment();

		if (eatRegex(_startObject) === false)
			_error('expected {, got ' + peekChar());

		var obj = {};

		while (true)
		{
			skipWhitespace();

			if (!_strict)
				_checkComment();

			if (eatRegex(_endObject))
				break;

			var key = _parseString();

			skipWhitespace();

			// "Names and values separated by = or => instead of :."
			if (!_strict)
			{
				if (eatRegex(_lenientKeyValueSeparator) === false)
					_error('expected =, => or :, got ' + peekChar());
			}
			else if (eatRegex(_colon) === false)
				_error('expected :, got ' + peekChar());

			var value = _parseAny();
			obj[key] = value;

			skipWhitespace();

			if (!_strict)
				_checkComment();

			if (eatRegex(_comma))
				continue;
			// "Name/value pairs separated by ; instead of ,."
			else if (!_strict && eatRegex(_lenientSemicolon))
				continue;
			else if (!eatRegex(_endObject))
				_error('expected }, got ' + peekChar());

			break;
		}

		return obj;
	}

	function _parseArray()
	{
		skipWhitespace();

		if (!_strict)
			_checkComment();

		if (eatRegex(_startArray) === false)
			_error('expected [, got ' + peekChar());

		var arr = [];

		while (true)
		{
			// todo: "Unnecessary array separators. These are interpreted as if null was the omitted value."
			skipWhitespace();

			if (!_strict)
				_checkComment();

			if (eatRegex(_endArray))
				break;

			var value = _parseAny();
			arr.push(value);

			skipWhitespace();

			if (!_strict)
				_checkComment();

			if (eatRegex(_comma))
				continue;
			// "Array elements separated by ; instead of ,."
			else if (!_strict && eatRegex(_lenientSemicolon))
				continue;
			else if (!eatRegex(_endArray))
				_error('expected ], got ' + peekChar());

			break;
		}

		return arr;
	}

	function _parseNumber()
	{
		if (!_strict)
			_checkComment();

		var str;

		if ((str = eatRegex(_number)) === false)
		{
			// "Numbers may be NaNs or infinities."
			if (!_strict)
			{
				if ((str = eatRegex(_lenientNaNOrInfinite)) !== false)
					return Number(str);
			}

			_error('expected number, got ' + peekChar());
		}

		return Number(str);
	}

	function _parseBoolean()
	{
		if (!_strict)
			_checkComment();

		var str;

		if ((str = eatRegex(_boolean)) === false)
			_error('expected boolean, got' + peekChar());

		return str === "true";
	}

	function _parseNull()
	{
		if (!_strict)
			_checkComment();

		if (eatRegex(_null) === false)
			_error('expected null, got ' + peekChar());

		return null;
	}

	function _parseAny()
	{
		skipWhitespace();

		if (!_strict)
			_checkComment();

		if (peekRegex(_startObject))
			return _parseObject();
		else if (peekRegex(_startArray))
			return _parseArray();
		else if (peekRegex(_number) || (!_strict && peekRegex(_lenientNaNOrInfinite)))
			return _parseNumber();
		else if (peekRegex(_boolean))
			return _parseBoolean();
		else if (peekRegex(_null))
			return _parseNull();
		else if (peekRegex(_stringBoundary) || (!_strict && (peekRegex(_lenientStringBoundary) || peekRegex(_lenientStringStart))))
			return _parseString();

		_error('expected ANY, got ' + peekChar());
	}

	function _parseObjectOrArray()
	{
		skipWhitespace();

		if (!_strict)
			_checkComment();

		if (peekRegex(_startObject))
			return _parseObject();
		else if (peekRegex(_startArray))
			return _parseArray();

		_error('expected object or array, got ' + peekChar());
	}

	function parse(json, strict)
	{
		if (strict === undefined)
			strict = false;

		_strict = strict;
		_depth = 0;

		_json = json;
		_pos = 0;
		_len = json.length;

		// "Streams that start with the non-execute prefix, ")]}'\n"."
		if (!_strict)
			eatRegex(_lenientNonExecutePrefix);

		// "Top-level values of any type. With strict parsing, the top-level value must be an object or an array."
		if (!_strict)
			return _parseAny();

		// todo: "Streams that include multiple top-level values. With strict parsing, each stream must contain exactly one top-level value."
		return _parseObjectOrArray();
	}

	return {
		parse: parse,
		stringify: JSON.stringify
	};
})();