const scanner = require('./scanner')

function ParserError(message) {
    this.name = "ParserError"
    this.message = (message || "")
}
ParserError.prototype = Error.prototype

var parser = exports.parser = function() {
    this.scanner = null
    this.structure = {}
}

parser.prototype.parse = function(script) {
    this.scanner = new scanner()
    this.scanner.input(script)

    return this._start()
}

// Start module
parser.prototype._start = function() {
    var cr_pos = this.scanner.pos
    // Create command
    var stat = this._create_command()
    if (stat) return { command : 'create', stat : stat }
    return null
    // Insert command
    // this.scanner.pos = cr_pos
    // stat = this._insert_command()
    // if (stat) return stat
    // Throw error
}

// Create command
parser.prototype._create_command = function() {
    var cr_pos = this.scanner.pos
    var create_data = {}
    // Token create
    if (!this.scanner.token().name === "CREATE") return null
    // Create target
    var stat = this._create_target()
    if (!stat) return null // Throw error
    create_data['target'] = stat
    // Create Identifier
    var stat = this.scanner.token()
    if (!stat || stat.name !== "IDENTIFIER") return null // Throw error
    create_data['table'] = stat.value
    // Create Property
    var stat = this._create_property()
    if (!stat) return null // Throw error
    create_data['property'] = stat

    return create_data
}

// Create target
parser.prototype._create_target = function() {
    var cr_pos = this.scanner.pos
    // Token create
    var stat = this.scanner.token()
    if (!stat || stat.name === "TABLE")
        return stat.name.toLowerCase()
    else return null // Throw error
}

// Create property
parser.prototype._create_property = function() {
    var cr_pos = this.scanner.pos
    var property_data = {}
    // Left paren
    var stat = this.scanner.token()
    if (!stat || stat.name !== "L_PAREN") return null // Throw error

    // Property list
    while(1) {
        // Item name
        stat = this.scanner.token()
        if (!stat || stat.name !== "IDENTIFIER") return null // Throw error
        var name = stat.value
        // Property setting
        stat = this._create_property_setting()
        if (!stat) return null // Throw error
        property_data[name] = stat
        // Comma to continue the list
        stat = this.scanner.token()
        if (!stat || stat.name === "R_PAREN") break
    }
    return property_data
}

// Create property setting
parser.prototype._create_property_setting = function() {
    var cr_pos = this.scanner.pos
    var setting_data = []

    while (1) {
        cr_pos = this.scanner.pos
        var stat = this._create_property_value()
        if (stat) setting_data.push(stat)
        else {
            this.scanner.pos = cr_pos
            return setting_data.length ? setting_data : null
        }
    }
}

// Sql value
parser.prototype._create_property_value = function() {
    var cr_pos = this.scanner.pos
    var stat = this.scanner.token()
    // Int
    if (stat && stat.name === "INT") return { "type" : "int" }
    else if (stat && stat.name === "VARCHAR") {
        stat = this.scanner.token()
        var varchar_number = 0
        // Left paren
        if (stat.name !== "L_PAREN") return null // Throw error
        // Number
        stat = this.scanner.token()
        if (stat.name !== "NUMBER") return null // Throw error
        varchar_number = Number(stat.value)
        // Right paren
        stat = this.scanner.token()
        if (stat.name !== "R_PAREN") return null // Throw error
        return {
            "type" : "varchar",
            "value" : varchar_number
        }
    } else if (stat && stat.name === "PRIMARY") {
        stat = this.scanner.token()
        // Token key
        if (stat.name !== "KEY") return null // Throw error
        return {
            "type" : "primary_key"
        }
    }
}

module.exports = {
    parse : function(script) {
        var myParser = new parser()
        return myParser.parse(script)
    }
}


















///
