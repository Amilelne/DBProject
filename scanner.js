
function ScannerError(message) {
    this.name = "ScannerError"
    this.message = (message || "")
}
ScannerError.prototype = Error.prototype

var scanner = exports.scanner = function() {
    this.pos = 0
    this.buf = null
    this.buflen = 0
    this.online = 0
}

/* Scanning single character */
scanner._isalpha = function(c) {
    return  (c >= 'a' && c <= 'z') ||
            (c >= 'A' && c <= 'Z') || c === '_'
}

scanner._isdigit = function(c) {
    return c >= '0' && c <= '9'
}

scanner._isalphanum = function(c) {
    return  (c >= 'a' && c <= 'z') ||
            (c >= 'A' && c <= 'Z') ||
            (c >= '0' && c <= '9') || c === '_'
}

/* Scanner prototype */
scanner.prototype.input = function(buf) {
    this.pos = 0
    this.buf = buf
    this.buflen = buf.length
    this.online = 1
}

scanner.prototype.token = function() {
    this._skipnontokens()
    if (this.pos >= this.buflen)
        return null

    var c = this.buf.charAt(this.pos)
    var keyword = require('./keywords').tokens[c.toLowerCase()]
    if (keyword !== undefined) return { name: keyword, value: c, pos: this.pos++ }
    if (scanner._isalpha(c)) return this._process_identifier()
    else if (scanner._isdigit(c)) return this._process_number()
    else if (c === "'") return this._process_quote()
    else throw new ScannerError(`Unknown token '${c}' at [${this.online}:${this.pos}]`)
}

/* Processing token */
// Processing number token
scanner.prototype._process_number = function() {
    var endpos = this.pos + 1
    while (endpos < this.buflen && scanner._isdigit(this.buf.charAt(endpos)))
        endpos ++
    var token = {
        name: 'NUMBER',
        value: this.buf.substring(this.pos, endpos),
        pos: this.pos
    }
    this.pos = endpos
    return token
}

// Processing identifier token
scanner.prototype._process_identifier = function() {
    var endpos = this.pos + 1
    while (endpos < this.buflen && scanner._isalphanum(this.buf.charAt(endpos)))
        endpos ++

    var value = this.buf.substring(this.pos, endpos)
    var keyword = require('./keywords').tokens[value.toLowerCase()]
    var token = {}
    if (keyword !== undefined)
        token = {
            name: keyword,
            value: value,
            pos: this.pos++
        }
    else token = {
        name: 'IDENTIFIER',
        value: this.buf.substring(this.pos, endpos),
        pos: this.pos
    }

    this.pos = endpos
    return token
}

// Processing quote string
scanner.prototype._process_quote = function() {
    var end_index = this.buf.indexOf("'", this.pos + 1)
    if (end_index === -1) throw new ScannerError(`Unterminated quote at [${this.online}:${this.pos}]`)
    else {
        var token = {
            name: 'QUOTE',
            value: this.buf.substring(this.pos + 1, end_index),
            pos: this.pos
        }
        this.pos = end_index + 1
        return token
    }
}

scanner.prototype._skipnontokens = function() {
    while (this.pos < this.buflen) {
        var c = this.buf.charAt(this.pos)
        if (c == ' ' || c == '\t' || c == '\r' || c == '\n' ) {
            if (c == '\n') this.online ++
            this.pos ++
        } else break
    }
}

module.exports = scanner;
