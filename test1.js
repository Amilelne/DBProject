/**
 * Created by liliz on 2017/3/11.
 */
const parser = require('./grammar')
const Parser = require('./praser');
const util = require('util')
const JSON = require('JSON')
const fs = require('fs')

function start(result) {
    var TABLE = {}
    var stat = _mergetable(result)
    TABLE['TABLES'] = stat
    console.log(util.inspect(TABLE, false, null))
    if(result.stat.condition){
        where_clause(result,TABLE)
    }
    console.log(util.inspect(TABLE, false, null))
    //where_clause(result,TABLE)
}
function where_clause(result,TABLE) {
    var select_row = []
    var condition = result.stat.condition
    var cond_len = condition.length
    if(cond_len == 1){
        var OPER = condition[0].OPERATION
        if(OPER == "EQUAL"){
            if(condition[0].TABLE == TABLE.TABLES[0].TABLE ||condition[0].TABLE == TABLE.TABLES[0].AKA ){
                for(var i=0;i<TABLE.TABLES[0].COLUMN.length;i++){
                    if(TABLE.TABLES[0].COLUMN[i].COLUMN_NAME == condition[0].COLUMN){
                        for(var j=0;j<TABLE.TABLES[0].COLUMN[i].COLUMN_VALUE.length;j++){
                            if(condition[0].VALUE == TABLE.TABLES[0].COLUMN[i].COLUMN_VALUE[j]){
                                select_row.push(j)
                            }
                        }
                    }
                }
            }
            else{
                for(var i=0;i<TABLE.TABLES[1].COLUMN.length;i++){
                    if(TABLE.TABLES[1].COLUMN[i].COLUMN_NAME == condition[0].COLUMN){
                        for(var j=0;j<TABLE.TABLES[1].COLUMN[i].COLUMN_VALUE.length;j++){
                            if(condition[0].VALUE == TABLE.TABLES[1].COLUMN[i].COLUMN_VALUE[j]){
                                select_row.push(j)
                            }
                        }
                    }
                }
            }
        }
        else if(OPER == "MORE"){
            if(condition[0].TABLE == TABLE.TABLES[0].TABLE ||condition[0].TABLE == TABLE.TABLES[0].AKA ){
                for(var i=0;i<TABLE.TABLES[0].COLUMN.length;i++){
                    if(TABLE.TABLES[0].COLUMN[i].COLUMN_NAME == condition[0].COLUMN){
                        for(var j=0;j<TABLE.TABLES[0].COLUMN[i].COLUMN_VALUE.length;j++){
                            if(condition[0].VALUE < TABLE.TABLES[0].COLUMN[i].COLUMN_VALUE[j]){
                                select_row.push(j)
                            }
                        }
                    }
                }
            }
            else{
                for(var i=0;i<TABLE.TABLES[1].COLUMN.length;i++){
                    if(TABLE.TABLES[1].COLUMN[i].COLUMN_NAME == condition[0].COLUMN){
                        for(var j=0;j<TABLE.TABLES[1].COLUMN[i].COLUMN_VALUE.length;j++){
                            if(condition[0].VALUE < TABLE.TABLES[1].COLUMN[i].COLUMN_VALUE[j]){
                                select_row.push(j)
                            }
                        }
                    }
                }
            }
        }
        else if(OPER == "LESS"){
            if(condition[0].TABLE == TABLE.TABLES[0].TABLE ||condition[0].TABLE == TABLE.TABLES[0].AKA ){
                for(var i=0;i<TABLE.TABLES[0].COLUMN.length;i++){
                    if(TABLE.TABLES[0].COLUMN[i].COLUMN_NAME == condition[0].COLUMN){
                        for(var j=0;j<TABLE.TABLES[0].COLUMN[i].COLUMN_VALUE.length;j++){
                            if(condition[0].VALUE > TABLE.TABLES[0].COLUMN[i].COLUMN_VALUE[j]){
                                select_row.push(j)
                            }
                        }
                    }
                }
            }
            else{
                for(var i=0;i<TABLE.TABLES[1].COLUMN.length;i++){
                    if(TABLE.TABLES[1].COLUMN[i].COLUMN_NAME == condition[0].COLUMN){
                        for(var j=0;j<TABLE.TABLES[1].COLUMN[i].COLUMN_VALUE.length;j++){
                            if(condition[0].VALUE > TABLE.TABLES[1].COLUMN[i].COLUMN_VALUE[j]){
                                select_row.push(j)
                            }
                        }
                    }
                }
            }
        }
    }
    else if(cond_len == 2){

    }
    choose_data_where(select_row,TABLE)
}
function choose_data_where(select_row,TABLE) {
    var column = TABLE.TABLES[0].COLUMN
    var column_len = TABLE.TABLES[0].COLUMN.length
    console.log(column_len)
    for(var i=0;i<column_len;i++){
        var colu_value = []
        for(var j=0;j<select_row.length;j++){
            colu_value.push(column[i].COLUMN_VALUE[j])
        }
        column[i].COLUMN_VALUE = colu_value
    }
    console.log(util.inspect(TABLE, false, null))
}
function _mergetable(result){
    var BIG_TABLE = []
    var target = result.stat.target
    for(var i=0;i<target.length;i++){
        var TABLE_DATA = {}
        TABLE_DATA['TABLE'] = target[i].TABLENAME
        TABLE_DATA['AKA'] = target[i].AKA
        var stat = _columndata(result,i)
        TABLE_DATA['COLUMN'] = stat
        BIG_TABLE.push(TABLE_DATA)
    }
    return BIG_TABLE
}
function _columndata(result,target_num){
    var COLUMN = []
    var i = target_num
    var filename = result.stat.target[i].TABLENAME
    filename = filename + '.json'
    var json_data = fs.readFileSync(filename)
    var json_object = JSON.parse(json_data)
    var column_len = json_object.data.length
    for(var j=0;j<column_len;j++){
        var COLUMN_DATA = {}
        COLUMN_DATA['COLUMN_NAME'] = json_object.data[j].dataname
        COLUMN_DATA['COLUMN_VALUE'] = json_object.data[j].values
        COLUMN.push(COLUMN_DATA)
    }
   return COLUMN
}
function show(filename,result) {
    var json_data = fs.readFileSync(filename)
    var json_object = JSON.parse(json_data)
    var column_len = result.stat.property.length
    var column_data = []
    for(var i=0;i<json_object.data.length;i++){
        var str = json_object.data[i].dataname
        for(var k=0;k<column_len;k++){
            if(result.stat.property[k].COLUMN == "ALL"){
                column_data.push(i)
                if(str.length<12){
                    var num_space = 12 - json_object.data[i].dataname.length;
                    util.print(json_object.data[i].dataname+'\t')
                    for(var k=0;k<num_space;k++)
                        util.print(' ')
                }
            }
            else
            {
                if(result.stat.property[k].COLUMN == str){
                    column_data.push(i)
                    if(str.length<12){
                        var num_space = 12 - json_object.data[i].dataname.length;
                        util.print(json_object.data[i].dataname+'\t')
                        for(var k=0;k<num_space;k++)
                            util.print(' ')
                    }
                }
            }
        }
    }
    console.log('\n')
    for(var j = 0;j<json_object.data[0].values.length;j++){
        for(i=0;i<column_data.length;i++){
            var t = column_data[i]
            var str = json_object.data[t].values[j]
            if(str.toString().length<12)
                num_space = 12 - str.toString().length
            else
                num_space = 0
            util.print(json_object.data[t].values[j]+'\t')
            for(k=0;k<num_space;k++)
                util.print(' ')

        }
        console.log('\n')
    }

    }
var data = fs.readFileSync("test.sql")
var command = data.toString()
var co = command.split(";")
for(var i=0;i<co.length-1;i++){
    var sql = co[i].toString()
    var result = Parser.parse(sql)
    //console.log(util.inspect(result, false, null))
    if(result.command == "create" || result.command == "insert")
        parser.parseSave(sql)
    else if(result.command == "select"){
        var filename = result.stat.target[0].TABLENAME
        filename = filename + '.json'
        console.log(util.inspect(result, false, null))
        //show(filename,result)
        start(result)
    }
}

