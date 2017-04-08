const scanner = require('./scanner')

function ParserError(message) {
    this.name = "ParserError"
    this.message = (message || "")
    console.log(this.message);
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
    var operation = this.scanner.token().name
    if(operation == 'CREATE'){
        // Create command
        var stat = this._create_command()
        if (stat) return { command : 'create', stat : stat }
        else
            return ParserError("invalid operation create");
    }
    else if(operation == 'INSERT'){
        // Insert command
        stat = this._insert_command()
        if (stat) return { command : 'insert',stat : stat}
        // Throw error
        return ParserError("invalid operation insert")
    }
    else if(operation == "SELECT"){
        // Select command
        stat = this._select_command()
        if(stat) return {command:'select',stat: stat}
        //Throw error
        return ParserError("invalid operation select")
    }
    else
        return ParserError("invalid operation,NOT CREATE OR INSERT");
}

// Create command
parser.prototype._create_command = function() {
    var cr_pos = this.scanner.pos
    var create_data = {}
    // Token create
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

// select command
parser.prototype._select_command = function() {
    var flag = false
    var cr_pos = this.scanner.pos
    var select_data = {}
    // select target
    var stat = this._select_property()
    if (!stat) return null // Throw error
    select_data['property'] = stat

    // select target
    var stat = this._select_target()
    if (!stat) return null // Throw error
    select_data['target'] = stat

    //select property
    var stat = this.scanner.token()
    if(stat){
        if(stat.name == "IDENTIFIER"){
            var condition = []
            while(1){
                if(flag)
                    stat = this.scanner.token()
                var tableaka = stat.value
                var statname = stat.name
                //OPERATION,SUBSET
                stat = this.scanner.token()
                if(statname == "IDENTIFIER" && stat.name == "SUBSET" ){
                    stat = this.scanner.token()
                    var conpro = {}
                    conpro['TABLE'] = tableaka
                    conpro['COLUMN'] = stat.value
                    //get operation
                    stat = this.scanner.token()
                    if(!stat || (stat.name != "LESS"&&stat.name != "MORE"&&stat.name != "EQUAL"))
                    {
                        var err = "no operation"
                        throw(err)
                    }
                    conpro['OPERATION'] = stat.name
                    //VALUE
                    stat = this.scanner.token()
                    if(!stat){
                        var err = "no operation value"
                        throw(err)
                    }
                    conpro['VALUE'] = stat.value
                    //logic
                    stat = this.scanner.token()
                    if(!stat) {
                        conpro['LOGIC'] = null
                        condition.push(conpro)
                        break
                    }
                    else
                        conpro['LOGIC'] = stat.name
                    condition.push(conpro)
                    flag = true
                }
                else{
                    var conpro = {}
                    conpro['TABLE'] = null
                    conpro['COLUMN'] = tableaka
                    //OPERATION
                    stat = this.scanner.token()
                    conpro['OPERATION'] = stat.name
                    //VALUE
                    stat = this.scanner.token()
                    if(!stat){
                        var err = "no operation value"
                        throw(err)
                    }
                    conpro['VALUE'] = stat.value
                    //logic
                    stat = this.scanner.token()
                    if(!stat) {
                        conpro['LOGIC'] = null
                        condition.push(conpro)
                        break
                    }
                    else{
                        conpro['LOGIC'] = stat.name
                        condition.push(conpro)
                        if(!stat)
                            break
                    }
                    flag = true
                }
            }
            select_data['condition'] = condition
        }
        else
            select_data['condition'] = null
    }


    return select_data
}

// select target
parser.prototype._select_target = function() {
    var cr_pos = this.scanner.pos
    // Token select
    var stat = this.scanner.token()
    var target = []
    while(1){
        var targetvalue = {}
        if(stat.name === "IDENTIFIER"){
            targetvalue['TABLENAME'] = stat.value
        }
        stat = this.scanner.token()
        if(!stat){
            targetvalue['AKA'] = null
            target.push(targetvalue)
            break
        }
        else
        {
            if(stat.name == "AS"){
                stat = this.scanner.token()
                targetvalue['AKA'] = stat.value
                target.push(targetvalue)
                stat = this.scanner.token()
            }
            else{
                targetvalue['AKA'] = null
                target.push(targetvalue)
            }
            if(!stat || stat.name !== "COMMA")
                break
            else
                stat = this.scanner.token()
        }
    }
    return target
}

// select property
parser.prototype._select_property = function() {
    var cr_pos = this.scanner.pos
    var property = []
    var flag = false
    // *,IDENTIFIER or TABLE name
    var stat = this.scanner.token()
    if (!stat || (stat.name !== "ALL" && stat.name != "IDENTIFIER")) return null // Throw error

    if(stat.name == "ALL"){
        var property_data = {}
        property_data['TABLE'] = null
        property_data['COLUMN'] = "ALL"
        property.push(property_data)
        stat = this.scanner.token()
        return property
    }
    else{
        while(1) {
            if(flag)
                stat = this.scanner.token()
            var tableaka = stat.value
            var statname = stat.name
            //COMMA or SUBSET or FROM
            stat = this.scanner.token()
            // Property list
            var property_data = {}
            if (statname == "IDENTIFIER" && stat.name == "COMMA") {
                property_data['TABLE'] = null
                property_data['COLUMN'] = tableaka
                property.push(property_data)
                flag = true
            }
            else if(statname == "IDENTIFIER" && stat.name == "SUBSET") {
                stat = this.scanner.token()
                property_data['TABLE'] = tableaka
                property_data['COLUMN'] = stat.value
                property.push(property_data)
                flag = true
                // Comma to continue the list
                stat = this.scanner.token()
            }
            else if(statname == "IDENTIFIER" && stat.name == "FROM"){
                property_data['TABLE'] = null
                property_data['COLUMN'] = tableaka
                property.push(property_data)
                break
            }
            //FROM to break
            if (!stat || stat.name === "FROM") break
        }
    }
    return property
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

//Insert command
parser.prototype._insert_command = function(){
    var cr_pos = this.scanner.pos
    var insert_data = {}
    //Insert INTO KEY_WORD
    var stat = this.scanner.token()
    if(!stat || stat.name!== "INTO"){
        var err = new Error("No KEY WORD INTO in insert sentence")
        throw(err)
    }
    var stat = this._insert_target()
    insert_data['table'] = stat

    //Insert Property
    var stat = this._insert_property()
    if(!stat){
        var err = new Error("No Property or incorrect Property in insert sentence")
        throw(err)
    }
    insert_data['column'] = stat

    return insert_data
}

//Insert target
parser.prototype._insert_target = function(){
    //Token insert
    var stat = this.scanner.token()
    if(stat.name === "IDENTIFIER"){
        return stat.value
    }
    else{
        var err = new Error("NO INSERT TARGET TABLE NAME")
        throw(err)
    }


}

//INSERT Property
parser.prototype._insert_property = function() {
    var cr_pos = this.scanner.pos
    var property_data = {}
    //Left paren
    var stat = this.scanner.token()
    if (stat.name !== "L_PAREN" && stat.name !== "VALUES") {
        var err = new Error("NO KEY_WORD VALUES OR L_PAREN IN INSERT SENTENCE")
        throw(err)
    }
    else if (stat.name == "VALUES") {
        var stat = this.scanner.token()
        if (!stat || stat.name !== "L_PAREN") {
            var err = new Error("NO KEY_WORD L_PAREN IN INSERT SENTENCE")
            throw(err)
        }
        else {
            var name = "column_value"
            var stat = this._insert_column_value()
            if (!stat) {
                var err = new Error("NO COLUMN VALUE")
                throw(err)
            }
            property_data[name] = stat
        }
    }
    else if (stat.name == "L_PAREN") {
        var stat = this._insert_column_name();
        var name = "column_name"
        if (!stat) {
            var err = new Error("INVALID COLUMN NAME IN INSERT SENTENCE")
            throw(err)
        }
        property_data[name] = stat
        stat = this.scanner.token()
        if (!stat || stat.name !== "VALUES") {
            var err = new Error("NO KEY_WORD VALUS IN INSERT SENTENCE")
            throw(err)
        }
        stat = this.scanner.token()
        if (!stat || stat.name !== "L_PAREN") {
            var err = new Error("NO KEY_WORD L_PAREN IN INSERT SENTENCE")
            throw(err)
        }
        stat = this._insert_column_value()
        var name = "column_value"
        if (!stat) {
            var err = new Error("INVALID COLUMN VALUE IN INSERT SENTENCE")
            throw(err)
        }
        property_data[name] = stat
    }
    return property_data

}
parser.prototype._insert_column_value = function(){
    var cr_pos = this.scanner.pos
    var column_value = []
    while (1) {
        //Item Property
        stat = this.scanner.token()
        if (!stat || stat.name === "R_PAREN") return column_value
        else if (stat.name == "IDENTIFIER" || stat.name == "NUMBER" || stat.name == "QUOTE") {
            column_value.push(stat.name, stat.value)
            //Comma to continue the list
            stat = this.scanner.token()
        }
        else {
            var err = new Error("INVALID VALUES IN INSERT SENTENCE")
            throw(err)
        }
    }
}
parser.prototype._insert_column_name = function () {
    var cr_pos = this.scanner.pos
    var column_name = []
    while (1) {
        stat = this.scanner.token();
        if (!stat || stat.name === "R_PAREN") return column_name
        else if(stat.name === "IDENTIFIER"){
            column_name.push(stat.value)
        }
        else if(stat.name === "COMMA"){
            continue
        }
        else {
            var err = new Error("INVALID COLUMNS NAME")
            throw(err)
        }
    }
}

module.exports = {
    parse : function(script) {
        var myParser = new parser()
        return myParser.parse(script)
    }
}