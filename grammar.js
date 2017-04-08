const fs = require('fs')

function subclass(child, parent) {
    function ctor() {
        this.constructor = child;
    }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
}

function SyntaxError(message, expected, found, location) {
    this.message = message;
    this.expected = expected;
    this.found = found;
    this.location = location;
    this.name = "SyntaxError";

    if (typeof Error.captureStackTrace === "function") {
        Error.captureStackTrace(this, SyntaxError);
    }
}

subclass(SyntaxError, Error);

SyntaxError.buildMessage = function(expected, found) {
    var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
            return "\"" + literalEscape(expectation.text) + "\"";
        },

        "class": function(expectation) {
            var escapedParts = "",
                i;

            for (i = 0; i < expectation.parts.length; i++) {
                escapedParts += expectation.parts[i] instanceof Array ?
                    classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1]) :
                    classEscape(expectation.parts[i]);
            }

            return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
        },

        any: function(expectation) {
            return "any character";
        },

        end: function(expectation) {
            return "end of input";
        },

        other: function(expectation) {
            return expectation.description;
        }
    };

    function hex(ch) {
        return ch.charCodeAt(0).toString(16).toUpperCase();
    }

    function literalEscape(s) {
        return s
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\0/g, '\\0')
            .replace(/\t/g, '\\t')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/[\x00-\x0F]/g, function(ch) {
                return '\\x0' + hex(ch);
            })
            .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
                return '\\x' + hex(ch);
            });
    }

    function classEscape(s) {
        return s
            .replace(/\\/g, '\\\\')
            .replace(/\]/g, '\\]')
            .replace(/\^/g, '\\^')
            .replace(/-/g, '\\-')
            .replace(/\0/g, '\\0')
            .replace(/\t/g, '\\t')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/;/g,'\\;')
            .replace(/[\x00-\x0F]/g, function(ch) {
                return '\\x0' + hex(ch);
            })
            .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
                return '\\x' + hex(ch);
            });
    }

    function describeExpectation(expectation) {
        return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
    }

    function describeExpected(expected) {
        var descriptions = new Array(expected.length),
            i, j;

        for (i = 0; i < expected.length; i++) {
            descriptions[i] = describeExpectation(expected[i]);
        }

        descriptions.sort();

        if (descriptions.length > 0) {
            for (i = 1, j = 1; i < descriptions.length; i++) {
                if (descriptions[i - 1] !== descriptions[i]) {
                    descriptions[j] = descriptions[i];
                    j++;
                }
            }
            descriptions.length = j;
        }

        switch (descriptions.length) {
            case 1:
                return descriptions[0];

            case 2:
                return descriptions[0] + " or " + descriptions[1];

            default:
                return descriptions.slice(0, -1).join(", ") +
                    ", or " +
                    descriptions[descriptions.length - 1];
        }
    }

    function describeFound(found) {
        return found ? "\"" + literalEscape(found) + "\"" : "end of input";
    }

    return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};

function parse(input, options) {
    options = options !== void 0 ? options : {};

    var FAILED = {},

        startRuleFunctions = {
            start: parsestart
        },
        startRuleFunction = parsestart,

        c0 = function(statement) {
            return statement;
        },
        c1 = function(create_command) {
            return {
                command: 'create',
                stat: create_command
            }
        },
        c2 = function(insert_command) {
            return {
                command: 'insert',
                stat: insert_command
            }
        },
        c3 = /^[\n\r\u2028\u2029]/,
        c4 = classExpectation(["\n", "\r", "\u2028", "\u2029"], false, false),
        c5 = /^[a-zA-Z]/,
        c6 = classExpectation([
            ["a", "z"],
            ["A", "Z"]
        ], false, false),
        c7 = /^[a-zA-Z0-9]/,
        c8 = classExpectation([
            ["a", "z"],
            ["A", "Z"],
            ["0", "9"]
        ], false, false),
        c9 = function() {
            return text()
        },
        c10 = /^[0-9]/,
        c11 = classExpectation([
            ["0", "9"]
        ], false, false),
        c12 = function() {
            return Number(text())
        },
        c13 = function(int) {
            return int
        },
        c14 = ".",
        c15 = literalExpectation(".", false),
        c16 = "'",
        c17 = literalExpectation("'", false),
        c18 = anyExpectation(),
        c19 = function(string) {
            return string.map(v => v[1]).join('');
        },
        c20 = otherExpectation("Create command"),
        c21 = "CREATE",
        c22 = literalExpectation("CREATE", false),
        c23 = "TABLE",
        c24 = literalExpectation("TABLE", false),
        c25 = function(table, property) {
            return {
                table: table,
                property: property
            };
        },
        c26 = otherExpectation("Create property"),
        c27 = "(",
        c28 = literalExpectation("(", false),
        c29 = ",",
        c30 = literalExpectation(",", false),
        c31 = ")",
        c32 = literalExpectation(")", false),
        c33 = function(list) {
            var a = list[3].map(v => v[2])
            a.unshift(list[1])
            return a
        },
        c34 = function(name, setting) {
            return {
                name: name,
                value: setting.map(v => v[1])
            }
        },
        c35 = "int",
        c36 = literalExpectation("int", false),
        c37 = function() {
            return {
                type: "INT"
            }
        },
        c38 = "PRIMARY KEY",
        c39 = literalExpectation("PRIMARY KEY", false),
        c40 = function() {
            return {
                type: "PRIMARY_KEY"
            }
        },
        c41 = "varchar",
        c42 = literalExpectation("varchar", false),
        c43 = function(num) {
            return {
                type: "VARCHAR",
                value: num
            }
        },
        c44 = otherExpectation("Insert command"),
        c45 = "INSERT",
        c46 = literalExpectation("INSERT", false),
        c47 = "INTO",
        c48 = literalExpectation("INTO", false),
        c49 = "VALUES",
        c50 = literalExpectation("VALUES", false),
        c51 = function(table, label, value) {
            if (label && label.length <= value.length) {
                var values = {}
                for (var i in label)
                    values[label[i]] = value[i]
                return {
                    table: table,
                    values: values
                }
            }

            return {
                table: table,
                values: value
            }
        },
        c52 = otherExpectation("Insert label"),
        c53 = function(iden, iden_sub) {
            var a = iden_sub.map(v => v[2])
            a.unshift(iden)
            return a
        },
        c54 = otherExpectation("Insert value"),
        c55 = function(expr, expr_sub) {
            var a = expr_sub.map(v => v[2])
            a.unshift(expr)
            return a
        },
        c56 = otherExpectation("Insert value list"),
        c57 = function(n) {
            return n
        },
        c58 = otherExpectation("white space"),
        c59 = /^[ \t\n\r]/,
        c60 = classExpectation([" ", "\t", "\n", "\r"], false, false),
        currPos = 0,
        savedPos = 0,
        posDetailsCache = [{
            line: 1,
            column: 1
        }],
        maxFailPos = 0,
        maxFailExpected = [],
        silentFails = 0,

        result;

    if ("startRule" in options) {
        if (!(options.startRule in startRuleFunctions)) {
            throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
        }

        startRuleFunction = startRuleFunctions[options.startRule];
    }

    function text() {
        return input.substring(savedPos, currPos);
    }

    function location() {
        return computeLocation(savedPos, currPos);
    }

    function expected(description, location) {
        location = location !== void 0 ? location : computeLocation(savedPos, currPos)

        throw buildStructuredError(
            [otherExpectation(description)],
            input.substring(savedPos, currPos),
            location
        );
    }

    function error(message, location) {
        location = location !== void 0 ? location : computeLocation(savedPos, currPos)

        throw buildSimpleError(message, location);
    }

    function literalExpectation(text, ignoreCase) {
        return {
            type: "literal",
            text: text,
            ignoreCase: ignoreCase
        };
    }

    function classExpectation(parts, inverted, ignoreCase) {
        return {
            type: "class",
            parts: parts,
            inverted: inverted,
            ignoreCase: ignoreCase
        };
    }

    function anyExpectation() {
        return {
            type: "any"
        };
    }

    function endExpectation() {
        return {
            type: "end"
        };
    }

    function otherExpectation(description) {
        return {
            type: "other",
            description: description
        };
    }

    function computePosDetails(pos) {
        var details = posDetailsCache[pos],
            p;

        if (details) {
            return details;
        } else {
            p = pos - 1;
            while (!posDetailsCache[p]) {
                p--;
            }

            details = posDetailsCache[p];
            details = {
                line: details.line,
                column: details.column
            };

            while (p < pos) {
                if (input.charCodeAt(p) === 10) {
                    details.line++;
                    details.column = 1;
                } else {
                    details.column++;
                }

                p++;
            }

            posDetailsCache[pos] = details;
            return details;
        }
    }

    function computeLocation(startPos, endPos) {
        var startPosDetails = computePosDetails(startPos),
            endPosDetails = computePosDetails(endPos);

        return {
            start: {
                offset: startPos,
                line: startPosDetails.line,
                column: startPosDetails.column
            },
            end: {
                offset: endPos,
                line: endPosDetails.line,
                column: endPosDetails.column
            }
        };
    }

    function fail(expected) {
        if (currPos < maxFailPos) {
            return;
        }

        if (currPos > maxFailPos) {
            maxFailPos = currPos;
            maxFailExpected = [];
        }

        maxFailExpected.push(expected);
    }

    function buildSimpleError(message, location) {
        return new SyntaxError(message, null, null, location);
    }

    function buildStructuredError(expected, found, location) {
        return new SyntaxError(
            SyntaxError.buildMessage(expected, found),
            expected,
            found,
            location
        );
    }

    function parsestart() {
        var s0, s1;

        s0 = currPos;
        s1 = parseStatement();
        if (s1 !== FAILED) {
            savedPos = s0;
            s1 = c0(s1);
        }
        s0 = s1;

        return s0;
    }

    function parseStatement() {
        var s0, s1, s2, s3;

        s0 = currPos;
        s1 = parse_();
        if (s1 !== FAILED) {
            s2 = parseCreateCommand();
            if (s2 !== FAILED) {
                s3 = parse_();
                if (s3 !== FAILED) {
                    savedPos = s0;
                    s1 = c1(s2);
                    s0 = s1;
                } else {
                    currPos = s0;
                    s0 = FAILED;
                }
            } else {
                currPos = s0;
                s0 = FAILED;
            }
        } else {
            currPos = s0;
            s0 = FAILED;
        }
        if (s0 === FAILED) {
            s0 = currPos;
            s1 = parse_();
            if (s1 !== FAILED) {
                s2 = parseInsertCommand();
                if (s2 !== FAILED) {
                    s3 = parse_();
                    if (s3 !== FAILED) {
                        savedPos = s0;
                        s1 = c2(s2);
                        s0 = s1;
                    } else {
                        currPos = s0;
                        s0 = FAILED;
                    }
                } else {
                    currPos = s0;
                    s0 = FAILED;
                }
            } else {
                currPos = s0;
                s0 = FAILED;
            }
        }

        return s0;
    }

    function parseLineTerminator() {
        var s0;

        if (c3.test(input.charAt(currPos))) {
            s0 = input.charAt(currPos);
            currPos++;
        } else {
            s0 = FAILED;
            if (silentFails === 0) {
                fail(c4);
            }
        }

        return s0;
    }

    function parseIdentifier() {
        var s0, s1, s2, s3;

        s0 = currPos;
        s1 = [];
        if (c5.test(input.charAt(currPos))) {
            s2 = input.charAt(currPos);
            currPos++;
        } else {
            s2 = FAILED;
            if (silentFails === 0) {
                fail(c6);
            }
        }
        if (s2 !== FAILED) {
            while (s2 !== FAILED) {
                s1.push(s2);
                if (c5.test(input.charAt(currPos))) {
                    s2 = input.charAt(currPos);
                    currPos++;
                } else {
                    s2 = FAILED;
                    if (silentFails === 0) {
                        fail(c6);
                    }
                }
            }
        } else {
            s1 = FAILED;
        }
        if (s1 !== FAILED) {
            s2 = [];
            if (c7.test(input.charAt(currPos))) {
                s3 = input.charAt(currPos);
                currPos++;
            } else {
                s3 = FAILED;
                if (silentFails === 0) {
                    fail(c8);
                }
            }
            while (s3 !== FAILED) {
                s2.push(s3);
                if (c7.test(input.charAt(currPos))) {
                    s3 = input.charAt(currPos);
                    currPos++;
                } else {
                    s3 = FAILED;
                    if (silentFails === 0) {
                        fail(c8);
                    }
                }
            }
            if (s2 !== FAILED) {
                savedPos = s0;
                s1 = c9();
                s0 = s1;
            } else {
                currPos = s0;
                s0 = FAILED;
            }
        } else {
            currPos = s0;
            s0 = FAILED;
        }

        return s0;
    }

    function parseInteger() {
        var s0, s1, s2;

        s0 = currPos;
        s1 = [];
        if (c10.test(input.charAt(currPos))) {
            s2 = input.charAt(currPos);
            currPos++;
        } else {
            s2 = FAILED;
            if (silentFails === 0) {
                fail(c11);
            }
        }
        if (s2 !== FAILED) {
            while (s2 !== FAILED) {
                s1.push(s2);
                if (c10.test(input.charAt(currPos))) {
                    s2 = input.charAt(currPos);
                    currPos++;
                } else {
                    s2 = FAILED;
                    if (silentFails === 0) {
                        fail(c11);
                    }
                }
            }
        } else {
            s1 = FAILED;
        }
        if (s1 !== FAILED) {
            savedPos = s0;
            s1 = c12();
        }
        s0 = s1;

        return s0;
    }

    function parseExpression() {
        var s0, s1, s2, s3, s4, s5;

        s0 = currPos;
        s1 = parseInteger();
        if (s1 !== FAILED) {
            savedPos = s0;
            s1 = c13(s1);
        }
        s0 = s1;
        if (s0 === FAILED) {
            s0 = currPos;
            s1 = [];
            if (c10.test(input.charAt(currPos))) {
                s2 = input.charAt(currPos);
                currPos++;
            } else {
                s2 = FAILED;
                if (silentFails === 0) {
                    fail(c11);
                }
            }
            while (s2 !== FAILED) {
                s1.push(s2);
                if (c10.test(input.charAt(currPos))) {
                    s2 = input.charAt(currPos);
                    currPos++;
                } else {
                    s2 = FAILED;
                    if (silentFails === 0) {
                        fail(c11);
                    }
                }
            }
            if (s1 !== FAILED) {
                if (input.charCodeAt(currPos) === 46) {
                    s2 = c14;
                    currPos++;
                } else {
                    s2 = FAILED;
                    if (silentFails === 0) {
                        fail(c15);
                    }
                }
                if (s2 !== FAILED) {
                    s3 = [];
                    if (c10.test(input.charAt(currPos))) {
                        s4 = input.charAt(currPos);
                        currPos++;
                    } else {
                        s4 = FAILED;
                        if (silentFails === 0) {
                            fail(c11);
                        }
                    }
                    while (s4 !== FAILED) {
                        s3.push(s4);
                        if (c10.test(input.charAt(currPos))) {
                            s4 = input.charAt(currPos);
                            currPos++;
                        } else {
                            s4 = FAILED;
                            if (silentFails === 0) {
                                fail(c11);
                            }
                        }
                    }
                    if (s3 !== FAILED) {
                        savedPos = s0;
                        s1 = c12();
                        s0 = s1;
                    } else {
                        currPos = s0;
                        s0 = FAILED;
                    }
                } else {
                    currPos = s0;
                    s0 = FAILED;
                }
            } else {
                currPos = s0;
                s0 = FAILED;
            }
            if (s0 === FAILED) {
                s0 = currPos;
                if (input.charCodeAt(currPos) === 39) {
                    s1 = c16;
                    currPos++;
                } else {
                    s1 = FAILED;
                    if (silentFails === 0) {
                        fail(c17);
                    }
                }
                if (s1 !== FAILED) {
                    s2 = [];
                    s3 = currPos;
                    s4 = currPos;
                    silentFails++;
                    if (input.charCodeAt(currPos) === 39) {
                        s5 = c16;
                        currPos++;
                    } else {
                        s5 = FAILED;
                        if (silentFails === 0) {
                            fail(c17);
                        }
                    }
                    silentFails--;
                    if (s5 === FAILED) {
                        s4 = void 0;
                    } else {
                        currPos = s4;
                        s4 = FAILED;
                    }
                    if (s4 !== FAILED) {
                        if (input.length > currPos) {
                            s5 = input.charAt(currPos);
                            currPos++;
                        } else {
                            s5 = FAILED;
                            if (silentFails === 0) {
                                fail(c18);
                            }
                        }
                        if (s5 !== FAILED) {
                            s4 = [s4, s5];
                            s3 = s4;
                        } else {
                            currPos = s3;
                            s3 = FAILED;
                        }
                    } else {
                        currPos = s3;
                        s3 = FAILED;
                    }
                    while (s3 !== FAILED) {
                        s2.push(s3);
                        s3 = currPos;
                        s4 = currPos;
                        silentFails++;
                        if (input.charCodeAt(currPos) === 39) {
                            s5 = c16;
                            currPos++;
                        } else {
                            s5 = FAILED;
                            if (silentFails === 0) {
                                fail(c17);
                            }
                        }
                        silentFails--;
                        if (s5 === FAILED) {
                            s4 = void 0;
                        } else {
                            currPos = s4;
                            s4 = FAILED;
                        }
                        if (s4 !== FAILED) {
                            if (input.length > currPos) {
                                s5 = input.charAt(currPos);
                                currPos++;
                            } else {
                                s5 = FAILED;
                                if (silentFails === 0) {
                                    fail(c18);
                                }
                            }
                            if (s5 !== FAILED) {
                                s4 = [s4, s5];
                                s3 = s4;
                            } else {
                                currPos = s3;
                                s3 = FAILED;
                            }
                        } else {
                            currPos = s3;
                            s3 = FAILED;
                        }
                    }
                    if (s2 !== FAILED) {
                        if (input.charCodeAt(currPos) === 39) {
                            s3 = c16;
                            currPos++;
                        } else {
                            s3 = FAILED;
                            if (silentFails === 0) {
                                fail(c17);
                            }
                        }
                        if (s3 !== FAILED) {
                            savedPos = s0;
                            s1 = c19(s2);
                            s0 = s1;
                        } else {
                            currPos = s0;
                            s0 = FAILED;
                        }
                    } else {
                        currPos = s0;
                        s0 = FAILED;
                    }
                } else {
                    currPos = s0;
                    s0 = FAILED;
                }
            }
        }

        return s0;
    }

    function parseCreateCommand() {
        var s0, s1, s2, s3, s4, s5, s6, s7;

        silentFails++;
        s0 = currPos;
        if (input.substr(currPos, 6).toUpperCase() === c21) {
            s1 = c21;
            currPos += 6;
        } else {
            s1 = FAILED;
            if (silentFails === 0) {
                fail(c22);
            }
        }
        if (s1 !== FAILED) {
            s2 = parse_();
            if (s2 !== FAILED) {
                if (input.substr(currPos, 5).toUpperCase() === c23) {
                    s3 = c23;
                    currPos += 5;
                } else {
                    s3 = FAILED;
                    if (silentFails === 0) {
                        fail(c24);
                    }
                }
                if (s3 !== FAILED) {
                    s4 = parse_();
                    if (s4 !== FAILED) {
                        s5 = parseIdentifier();
                        if (s5 !== FAILED) {
                            s6 = parse_();
                            if (s6 !== FAILED) {
                                s7 = parseCreateProperty();
                                if (s7 === FAILED) {
                                    s7 = null;
                                }
                                if (s7 !== FAILED) {
                                    savedPos = s0;
                                    s1 = c25(s5, s7);
                                    s0 = s1;
                                } else {
                                    currPos = s0;
                                    s0 = FAILED;
                                }
                            } else {
                                currPos = s0;
                                s0 = FAILED;
                            }
                        } else {
                            currPos = s0;
                            s0 = FAILED;
                        }
                    } else {
                        currPos = s0;
                        s0 = FAILED;
                    }
                } else {
                    currPos = s0;
                    s0 = FAILED;
                }
            } else {
                currPos = s0;
                s0 = FAILED;
            }
        } else {
            currPos = s0;
            s0 = FAILED;
        }
        silentFails--;
        if (s0 === FAILED) {
            s1 = FAILED;
            if (silentFails === 0) {
                fail(c20);
            }
        }

        return s0;
    }

    function parseCreateProperty() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;

        silentFails++;
        s0 = currPos;
        if (input.charCodeAt(currPos) === 40) {
            s1 = c27;
            currPos++;
        } else {
            s1 = FAILED;
            if (silentFails === 0) {
                fail(c28);
            }
        }
        if (s1 !== FAILED) {
            s2 = parse_();
            if (s2 !== FAILED) {
                s3 = currPos;
                s4 = parse_();
                if (s4 !== FAILED) {
                    s5 = parsePropertyItem();
                    if (s5 !== FAILED) {
                        s6 = parse_();
                        if (s6 !== FAILED) {
                            s7 = [];
                            s8 = currPos;
                            if (input.charCodeAt(currPos) === 44) {
                                s9 = c29;
                                currPos++;
                            } else {
                                s9 = FAILED;
                                if (silentFails === 0) {
                                    fail(c30);
                                }
                            }
                            if (s9 !== FAILED) {
                                s10 = parse_();
                                if (s10 !== FAILED) {
                                    s11 = parsePropertyItem();
                                    if (s11 !== FAILED) {
                                        s12 = parse_();
                                        if (s12 !== FAILED) {
                                            s9 = [s9, s10, s11, s12];
                                            s8 = s9;
                                        } else {
                                            currPos = s8;
                                            s8 = FAILED;
                                        }
                                    } else {
                                        currPos = s8;
                                        s8 = FAILED;
                                    }
                                } else {
                                    currPos = s8;
                                    s8 = FAILED;
                                }
                            } else {
                                currPos = s8;
                                s8 = FAILED;
                            }
                            while (s8 !== FAILED) {
                                s7.push(s8);
                                s8 = currPos;
                                if (input.charCodeAt(currPos) === 44) {
                                    s9 = c29;
                                    currPos++;
                                } else {
                                    s9 = FAILED;
                                    if (silentFails === 0) {
                                        fail(c30);
                                    }
                                }
                                if (s9 !== FAILED) {
                                    s10 = parse_();
                                    if (s10 !== FAILED) {
                                        s11 = parsePropertyItem();
                                        if (s11 !== FAILED) {
                                            s12 = parse_();
                                            if (s12 !== FAILED) {
                                                s9 = [s9, s10, s11, s12];
                                                s8 = s9;
                                            } else {
                                                currPos = s8;
                                                s8 = FAILED;
                                            }
                                        } else {
                                            currPos = s8;
                                            s8 = FAILED;
                                        }
                                    } else {
                                        currPos = s8;
                                        s8 = FAILED;
                                    }
                                } else {
                                    currPos = s8;
                                    s8 = FAILED;
                                }
                            }
                            if (s7 !== FAILED) {
                                s4 = [s4, s5, s6, s7];
                                s3 = s4;
                            } else {
                                currPos = s3;
                                s3 = FAILED;
                            }
                        } else {
                            currPos = s3;
                            s3 = FAILED;
                        }
                    } else {
                        currPos = s3;
                        s3 = FAILED;
                    }
                } else {
                    currPos = s3;
                    s3 = FAILED;
                }
                if (s3 !== FAILED) {
                    s4 = parse_();
                    if (s4 !== FAILED) {
                        if (input.charCodeAt(currPos) === 41) {
                            s5 = c31;
                            currPos++;
                        } else {
                            s5 = FAILED;
                            if (silentFails === 0) {
                                fail(c32);
                            }
                        }
                        if (s5 !== FAILED) {
                            savedPos = s0;
                            s1 = c33(s3);
                            s0 = s1;
                        } else {
                            currPos = s0;
                            s0 = FAILED;
                        }
                    } else {
                        currPos = s0;
                        s0 = FAILED;
                    }
                } else {
                    currPos = s0;
                    s0 = FAILED;
                }
            } else {
                currPos = s0;
                s0 = FAILED;
            }
        } else {
            currPos = s0;
            s0 = FAILED;
        }
        silentFails--;
        if (s0 === FAILED) {
            s1 = FAILED;
            if (silentFails === 0) {
                fail(c26);
            }
        }

        return s0;
    }

    function parsePropertyItem() {
        var s0, s1, s2, s3, s4, s5, s6;

        s0 = currPos;
        s1 = parseIdentifier();
        if (s1 !== FAILED) {
            s2 = parse_();
            if (s2 !== FAILED) {
                s3 = [];
                s4 = currPos;
                s5 = parse_();
                if (s5 !== FAILED) {
                    s6 = parsePropertyValue();
                    if (s6 !== FAILED) {
                        s5 = [s5, s6];
                        s4 = s5;
                    } else {
                        currPos = s4;
                        s4 = FAILED;
                    }
                } else {
                    currPos = s4;
                    s4 = FAILED;
                }
                if (s4 !== FAILED) {
                    while (s4 !== FAILED) {
                        s3.push(s4);
                        s4 = currPos;
                        s5 = parse_();
                        if (s5 !== FAILED) {
                            s6 = parsePropertyValue();
                            if (s6 !== FAILED) {
                                s5 = [s5, s6];
                                s4 = s5;
                            } else {
                                currPos = s4;
                                s4 = FAILED;
                            }
                        } else {
                            currPos = s4;
                            s4 = FAILED;
                        }
                    }
                } else {
                    s3 = FAILED;
                }
                if (s3 !== FAILED) {
                    savedPos = s0;
                    s1 = c34(s1, s3);
                    s0 = s1;
                } else {
                    currPos = s0;
                    s0 = FAILED;
                }
            } else {
                currPos = s0;
                s0 = FAILED;
            }
        } else {
            currPos = s0;
            s0 = FAILED;
        }

        return s0;
    }

    function parsePropertyValue() {
        var s0, s1, s2, s3, s4, s5, s6, s7;

        s0 = currPos;
        if (input.substr(currPos, 3) === c35) {
            s1 = c35;
            currPos += 3;
        } else {
            s1 = FAILED;
            if (silentFails === 0) {
                fail(c36);
            }
        }
        if (s1 !== FAILED) {
            savedPos = s0;
            s1 = c37();
        }
        s0 = s1;
        if (s0 === FAILED) {
            s0 = currPos;
            if (input.substr(currPos, 11) === c38) {
                s1 = c38;
                currPos += 11;
            } else {
                s1 = FAILED;
                if (silentFails === 0) {
                    fail(c39);
                }
            }
            if (s1 !== FAILED) {
                savedPos = s0;
                s1 = c40();
            }
            s0 = s1;
            if (s0 === FAILED) {
                s0 = currPos;
                if (input.substr(currPos, 7) === c41) {
                    s1 = c41;
                    currPos += 7;
                } else {
                    s1 = FAILED;
                    if (silentFails === 0) {
                        fail(c42);
                    }
                }
                if (s1 !== FAILED) {
                    s2 = parse_();
                    if (s2 !== FAILED) {
                        if (input.charCodeAt(currPos) === 40) {
                            s3 = c27;
                            currPos++;
                        } else {
                            s3 = FAILED;
                            if (silentFails === 0) {
                                fail(c28);
                            }
                        }
                        if (s3 !== FAILED) {
                            s4 = parse_();
                            if (s4 !== FAILED) {
                                s5 = parseInteger();
                                if (s5 !== FAILED) {
                                    s6 = parse_();
                                    if (s6 !== FAILED) {
                                        if (input.charCodeAt(currPos) === 41) {
                                            s7 = c31;
                                            currPos++;
                                        } else {
                                            s7 = FAILED;
                                            if (silentFails === 0) {
                                                fail(c32);
                                            }
                                        }
                                        if (s7 !== FAILED) {
                                            savedPos = s0;
                                            s1 = c43(s5);
                                            s0 = s1;
                                        } else {
                                            currPos = s0;
                                            s0 = FAILED;
                                        }
                                    } else {
                                        currPos = s0;
                                        s0 = FAILED;
                                    }
                                } else {
                                    currPos = s0;
                                    s0 = FAILED;
                                }
                            } else {
                                currPos = s0;
                                s0 = FAILED;
                            }
                        } else {
                            currPos = s0;
                            s0 = FAILED;
                        }
                    } else {
                        currPos = s0;
                        s0 = FAILED;
                    }
                } else {
                    currPos = s0;
                    s0 = FAILED;
                }
            }
        }

        return s0;
    }

    function parseInsertCommand() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;

        silentFails++;
        s0 = currPos;
        if (input.substr(currPos, 6).toUpperCase() === c45) {
            s1 = c45;
            currPos += 6;
        } else {
            s1 = FAILED;
            if (silentFails === 0) {
                fail(c46);
            }
        }
        if (s1 !== FAILED) {
            s2 = parse_();
            if (s2 !== FAILED) {
                if (input.substr(currPos, 4).toUpperCase() === c47) {
                    s3 = c47;
                    currPos += 4;
                } else {
                    s3 = FAILED;
                    if (silentFails === 0) {
                        fail(c48);
                    }
                }
                if (s3 !== FAILED) {
                    s4 = parse_();
                    if (s4 !== FAILED) {
                        s5 = parseIdentifier();
                        if (s5 !== FAILED) {
                            s6 = parse_();
                            if (s6 !== FAILED) {
                                s7 = parseInsertLabel();
                                if (s7 === FAILED) {
                                    s7 = null;
                                }
                                if (s7 !== FAILED) {
                                    s8 = parse_();
                                    if (s8 !== FAILED) {
                                        if (input.substr(currPos, 6).toUpperCase() === c49) {
                                            s9 = c49;
                                            currPos += 6;
                                        } else {
                                            s9 = FAILED;
                                            if (silentFails === 0) {
                                                fail(c50);
                                            }
                                        }
                                        if (s9 !== FAILED) {
                                            s10 = parse_();
                                            if (s10 !== FAILED) {
                                                s11 = parseInsertValue();
                                                if (s11 !== FAILED) {
                                                    savedPos = s0;
                                                    s1 = c51(s5, s7, s11);
                                                    s0 = s1;
                                                } else {
                                                    currPos = s0;
                                                    s0 = FAILED;
                                                }
                                            } else {
                                                currPos = s0;
                                                s0 = FAILED;
                                            }
                                        } else {
                                            currPos = s0;
                                            s0 = FAILED;
                                        }
                                    } else {
                                        currPos = s0;
                                        s0 = FAILED;
                                    }
                                } else {
                                    currPos = s0;
                                    s0 = FAILED;
                                }
                            } else {
                                currPos = s0;
                                s0 = FAILED;
                            }
                        } else {
                            currPos = s0;
                            s0 = FAILED;
                        }
                    } else {
                        currPos = s0;
                        s0 = FAILED;
                    }
                } else {
                    currPos = s0;
                    s0 = FAILED;
                }
            } else {
                currPos = s0;
                s0 = FAILED;
            }
        } else {
            currPos = s0;
            s0 = FAILED;
        }
        silentFails--;
        if (s0 === FAILED) {
            s1 = FAILED;
            if (silentFails === 0) {
                fail(c44);
            }
        }

        return s0;
    }

    function parseInsertLabel() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;

        silentFails++;
        s0 = currPos;
        if (input.charCodeAt(currPos) === 40) {
            s1 = c27;
            currPos++;
        } else {
            s1 = FAILED;
            if (silentFails === 0) {
                fail(c28);
            }
        }
        if (s1 !== FAILED) {
            s2 = parse_();
            if (s2 !== FAILED) {
                s3 = parseIdentifier();
                if (s3 !== FAILED) {
                    s4 = parse_();
                    if (s4 !== FAILED) {
                        s5 = [];
                        s6 = currPos;
                        if (input.charCodeAt(currPos) === 44) {
                            s7 = c29;
                            currPos++;
                        } else {
                            s7 = FAILED;
                            if (silentFails === 0) {
                                fail(c30);
                            }
                        }
                        if (s7 !== FAILED) {
                            s8 = parse_();
                            if (s8 !== FAILED) {
                                s9 = parseIdentifier();
                                if (s9 !== FAILED) {
                                    s10 = parse_();
                                    if (s10 !== FAILED) {
                                        s7 = [s7, s8, s9, s10];
                                        s6 = s7;
                                    } else {
                                        currPos = s6;
                                        s6 = FAILED;
                                    }
                                } else {
                                    currPos = s6;
                                    s6 = FAILED;
                                }
                            } else {
                                currPos = s6;
                                s6 = FAILED;
                            }
                        } else {
                            currPos = s6;
                            s6 = FAILED;
                        }
                        while (s6 !== FAILED) {
                            s5.push(s6);
                            s6 = currPos;
                            if (input.charCodeAt(currPos) === 44) {
                                s7 = c29;
                                currPos++;
                            } else {
                                s7 = FAILED;
                                if (silentFails === 0) {
                                    fail(c30);
                                }
                            }
                            if (s7 !== FAILED) {
                                s8 = parse_();
                                if (s8 !== FAILED) {
                                    s9 = parseIdentifier();
                                    if (s9 !== FAILED) {
                                        s10 = parse_();
                                        if (s10 !== FAILED) {
                                            s7 = [s7, s8, s9, s10];
                                            s6 = s7;
                                        } else {
                                            currPos = s6;
                                            s6 = FAILED;
                                        }
                                    } else {
                                        currPos = s6;
                                        s6 = FAILED;
                                    }
                                } else {
                                    currPos = s6;
                                    s6 = FAILED;
                                }
                            } else {
                                currPos = s6;
                                s6 = FAILED;
                            }
                        }
                        if (s5 !== FAILED) {
                            s6 = parse_();
                            if (s6 !== FAILED) {
                                if (input.charCodeAt(currPos) === 41) {
                                    s7 = c31;
                                    currPos++;
                                } else {
                                    s7 = FAILED;
                                    if (silentFails === 0) {
                                        fail(c32);
                                    }
                                }
                                if (s7 !== FAILED) {
                                    savedPos = s0;
                                    s1 = c53(s3, s5);
                                    s0 = s1;
                                } else {
                                    currPos = s0;
                                    s0 = FAILED;
                                }
                            } else {
                                currPos = s0;
                                s0 = FAILED;
                            }
                        } else {
                            currPos = s0;
                            s0 = FAILED;
                        }
                    } else {
                        currPos = s0;
                        s0 = FAILED;
                    }
                } else {
                    currPos = s0;
                    s0 = FAILED;
                }
            } else {
                currPos = s0;
                s0 = FAILED;
            }
        } else {
            currPos = s0;
            s0 = FAILED;
        }
        silentFails--;
        if (s0 === FAILED) {
            s1 = FAILED;
            if (silentFails === 0) {
                fail(c52);
            }
        }

        return s0;
    }

    function parseInsertValue() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;

        silentFails++;
        s0 = currPos;
        if (input.charCodeAt(currPos) === 40) {
            s1 = c27;
            currPos++;
        } else {
            s1 = FAILED;
            if (silentFails === 0) {
                fail(c28);
            }
        }
        if (s1 !== FAILED) {
            s2 = parse_();
            if (s2 !== FAILED) {
                s3 = parseExpression();
                if (s3 !== FAILED) {
                    s4 = parse_();
                    if (s4 !== FAILED) {
                        s5 = [];
                        s6 = currPos;
                        if (input.charCodeAt(currPos) === 44) {
                            s7 = c29;
                            currPos++;
                        } else {
                            s7 = FAILED;
                            if (silentFails === 0) {
                                fail(c30);
                            }
                        }
                        if (s7 !== FAILED) {
                            s8 = parse_();
                            if (s8 !== FAILED) {
                                s9 = parseExpression();
                                if (s9 !== FAILED) {
                                    s10 = parse_();
                                    if (s10 !== FAILED) {
                                        s7 = [s7, s8, s9, s10];
                                        s6 = s7;
                                    } else {
                                        currPos = s6;
                                        s6 = FAILED;
                                    }
                                } else {
                                    currPos = s6;
                                    s6 = FAILED;
                                }
                            } else {
                                currPos = s6;
                                s6 = FAILED;
                            }
                        } else {
                            currPos = s6;
                            s6 = FAILED;
                        }
                        while (s6 !== FAILED) {
                            s5.push(s6);
                            s6 = currPos;
                            if (input.charCodeAt(currPos) === 44) {
                                s7 = c29;
                                currPos++;
                            } else {
                                s7 = FAILED;
                                if (silentFails === 0) {
                                    fail(c30);
                                }
                            }
                            if (s7 !== FAILED) {
                                s8 = parse_();
                                if (s8 !== FAILED) {
                                    s9 = parseExpression();
                                    if (s9 !== FAILED) {
                                        s10 = parse_();
                                        if (s10 !== FAILED) {
                                            s7 = [s7, s8, s9, s10];
                                            s6 = s7;
                                        } else {
                                            currPos = s6;
                                            s6 = FAILED;
                                        }
                                    } else {
                                        currPos = s6;
                                        s6 = FAILED;
                                    }
                                } else {
                                    currPos = s6;
                                    s6 = FAILED;
                                }
                            } else {
                                currPos = s6;
                                s6 = FAILED;
                            }
                        }
                        if (s5 !== FAILED) {
                            s6 = parse_();
                            if (s6 !== FAILED) {
                                if (input.charCodeAt(currPos) === 41) {
                                    s7 = c31;
                                    currPos++;
                                } else {
                                    s7 = FAILED;
                                    if (silentFails === 0) {
                                        fail(c32);
                                    }
                                }
                                if (s7 !== FAILED) {
                                    savedPos = s0;
                                    s1 = c55(s3, s5);
                                    s0 = s1;
                                } else {
                                    currPos = s0;
                                    s0 = FAILED;
                                }
                            } else {
                                currPos = s0;
                                s0 = FAILED;
                            }
                        } else {
                            currPos = s0;
                            s0 = FAILED;
                        }
                    } else {
                        currPos = s0;
                        s0 = FAILED;
                    }
                } else {
                    currPos = s0;
                    s0 = FAILED;
                }
            } else {
                currPos = s0;
                s0 = FAILED;
            }
        } else {
            currPos = s0;
            s0 = FAILED;
        }
        silentFails--;
        if (s0 === FAILED) {
            s1 = FAILED;
            if (silentFails === 0) {
                fail(c54);
            }
        }

        return s0;
    }

    function parseInsertValueList() {
        var s0, s1;

        silentFails++;
        s0 = currPos;
        s1 = parseInteger();
        if (s1 !== FAILED) {
            savedPos = s0;
            s1 = c57(s1);
        }
        s0 = s1;
        silentFails--;
        if (s0 === FAILED) {
            s1 = FAILED;
            if (silentFails === 0) {
                fail(c56);
            }
        }

        return s0;
    }

    function parse_() {
        var s0, s1;

        silentFails++;
        s0 = [];
        if (c59.test(input.charAt(currPos))) {
            s1 = input.charAt(currPos);
            currPos++;
        } else {
            s1 = FAILED;
            if (silentFails === 0) {
                fail(c60);
            }
        }
        while (s1 !== FAILED) {
            s0.push(s1);
            if (c59.test(input.charAt(currPos))) {
                s1 = input.charAt(currPos);
                currPos++;
            } else {
                s1 = FAILED;
                if (silentFails === 0) {
                    fail(c60);
                }
            }
        }
        silentFails--;
        if (s0 === FAILED) {
            s1 = FAILED;
            if (silentFails === 0) {
                fail(c58);
            }
        }

        return s0;
    }

    result = startRuleFunction();

    if (result !== FAILED && currPos === input.length) {
        return result;
    } else {
        if (result !== FAILED && currPos < input.length) {
            fail(endExpectation());
        }

        throw buildStructuredError(
            maxFailExpected,
            maxFailPos < input.length ? input.charAt(maxFailPos) : null,
            maxFailPos < input.length ?
            computeLocation(maxFailPos, maxFailPos + 1) :
            computeLocation(maxFailPos, maxFailPos)
        );
    }
}
function check_data(json_object) {
    var data = json_object.data.length
    var flag = 1
    for(var chk=0;chk<data;chk++){
        var datapos = json_object.data[chk].values.length - 1
        var dat = json_object.data[chk].values[datapos]
        var datype = typeof(dat)
        if(datype == 'string'&&json_object.data[chk].datatype[0].type == 'INT'){
            console.log('an integer was expected and a string was inserted('+dat+')in attribute '+json_object.data[chk].dataname)
            flag = 0
        }
        else if((datype == 'string'||datype == 'number')&&json_object.data[chk].datatype[0].type == 'VARCHAR'){
            var real_len = dat.toString().length
            var most_len = json_object.data[chk].datatype[0].value
            if(real_len>most_len){
                console.log('the attribute '+json_object.data[chk].dataname+' at most '+most_len+' character(s)')
                flag = 0
            }
        }
        if(json_object.data[chk].datatype.length>1){
            if(json_object.data[chk].datatype[1].type == 'PRIMARY_KEY'){
                var arraylen = json_object.data[chk].values.length-1
                for(var t=0;t<arraylen;t++){
                    if(dat == json_object.data[chk].values[t])
                    {
                        console.log('the priamry key( '+dat+' ) has already benn used and cannot be repeated');
                        flag = 0
                        break
                    }
                }
            }
        }
    }
    if(flag == 1) return true
    else if(flag == 0) return false
}

module.exports = {
    SyntaxError: SyntaxError,
    parse: parse,
    parseSave: function(script) {
        if (!script) return;
        var result = parse(script);
        var filename = result.stat.table
        if(result.command == 'create'){
            fs.writeFileSync(filename +'_attr.json', JSON.stringify(result, null, '\t'));
            var prop_len = result.stat.property.length;
            var buff = {}
            buff['data'] = []
            for(var i=0;i<prop_len;i++){
                var buff_name = result.stat.property[i].name
                var buff_type = result.stat.property[i].value
                var tmpdata = {}
                tmpdata['dataname'] = buff_name
                tmpdata['datatype'] = buff_type
                tmpdata['values'] = []
                buff['data'].push(tmpdata)
            }
            fs.writeFileSync(filename+'.json',JSON.stringify(buff,null,'\t'));
        }
        else if(result.command == 'insert') {
            var filename = filename + '.json'
            var buf = new Buffer(1024)
            var json_data = fs.readFileSync(filename)
            var json_object = JSON.parse(json_data)
            var valu = result.stat.values
            if (valu.length) {
                for (var i = 0; i < valu.length; i++) {
                    json_object.data[i].values.push(valu[i])
                }
            }
            else {
                for (var num = 0; num < json_object.data.length; num++) {
                    var target = json_object.data[num].dataname
                    json_object.data[num].values.push(valu[target])
                }
            }
            var data_ok = check_data(json_object)
            if (data_ok) {
                fs.writeFileSync(filename, JSON.stringify(json_object, null, '\t'), function (err) {
                    if (err)
                        return console.log(err)
                })
                /*
                 fs.open(filename,'r+',function(err,fd){
                 if(err){
                 return console.log('please create table first')
                 }
                 fs.read(fd,buf,0,buf.length,0,function(err,bytes){
                 var json_object = JSON.parse(buf.slice(0,bytes).toString())
                 var valu = result.stat.values
                 console.log(valu)
                 if(valu.length){
                 for(var i=0;i<valu.length;i++){
                 json_object.data[i].values.push(valu[i])
                 }
                 }
                 else{
                 for(var num=0;num<json_object.data.length;num++){
                 var target = json_object.data[num].dataname
                 json_object.data[num].values.push(valu[target])
                 console.log(valu[target])
                 }
                 }
                 var data_ok = check_data(json_object)
                 if(data_ok){
                 console.log(JSON.stringify(json_object,null,'\t'))
                 fs.writeFile(filename,JSON.stringify(json_object,null,'\t'),function (err) {
                 if(err)
                 return console.log(err)
                 })
                 }
                 fs.close(fd,function(err){
                 if(err)
                 console.log(err)
                 })
                 })
                 })*/
            }
        }
    }
};
