var tokens = {
    // Create
    "create"    : "CREATE",
    "table"     : "TABLE",

    // Insert
    "insert"    : "INSERT",
    "into"      : "INTO",
    "primary"   : "PRIMARY",
    "key"       : "KEY",
    "values"    : "VALUES",

    //Select
    "select"    : "SELECT",
    "*"          : "ALL",
    "from"      : "FROM",
    "where"     : "WHERE",
    "count"     : "COUNT",
    "<"         : "LESS",
    ">"         : "MORE",
    "="         : "EQUAL",
    "."         : "SUBSET",
    "and"       : "AND",
    "or"        : "OR",
    "as"        : "AS",

    // Symbol
    "("         : "L_PAREN",
    ")"         : "R_PAREN",
    ","         : "COMMA",

    // Value
    "varchar"   : "VARCHAR",
    "int"       : "INT"
}

module.exports = {
    tokens : tokens,
    set: function(keyword, name) { tokens[keyword] = name }
}
