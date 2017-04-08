
const Parser = require('./praser');
const util = require('util');
const fs = require('fs');
const JSON = require('JSON');
var buf = new Buffer(1024);
var test = exports.test=function(){};
var sql1 = 'CREATE TABLE Article(' +
    'articleId int PRIMARY KEY,' +
    'title varchar(20),' +
    'author varchar(20),' +
    'view int' +
    ')';
var sql2 = 'CREATE TABLE Comment(' +
    'commentId int PRIMARY KEY,' +
    'author varchar(20),' +
    'content varchar(20),' +
    'articleId int' +
    ')';
var sql3 = 'CREATE TABLE Links('+
    'linkId int PRIMARY KEY'+
    'url text'+
    ')'
var sql4 = "CREATE TABLE Links(linkid int PRIMARY KEY,url varchar(40)"
var result = Parser.parse(sql3);
//var sqls = Parser.parse("CREATE TABLE Course(courseName varchar(20),startingDate date,teacherName varchar(20))");
if(!result){
    return null;
}
else{
    var json_string = JSON.stringify(util.inspect(result,false,null))
    var json_object = JSON.parse(json_string)
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
    else if(result.command == 'insert'){
        console.log(util.inspect(result,false,null))
        var openfile = result.stat.table+'_attr.json'
        var filename = filename + '.json'
        var buf = new Buffer(1024)
        fs.open(filename,'r+',function(err,fd){
            if(err){
                return console.log('please create table first')
            }
            fs.read(fd,buf,0,buf.length,0,function(err,bytes) {
                var json_object = JSON.parse(buf.slice(0, bytes).toString())
                var valu = result.stat.values;

                for (var i = 0; i < valu.length; i++)
                    json_object.data[i].values.push(valu[i])


                for (var num = 0; num < json_object.data.length; num++) {
                        var target = json_object.data[num].dataname
                        json_object.data[num].values.push(valu[target])
                    }

                var data_ok = check_data(json_object)
                if (data_ok) {
                    fs.writeFile(filename, JSON.stringify(json_object), function (err) {
                        if (err)
                            return console.log(err)
                    })
                }

                fs.close(fd,function(err){
                    if(err)
                        console.log(err)
                })
            })
        })
    }
}


function _data_valid(bytes) {
    var colu_attri = buf.slice(0,bytes).toString()
    if(typeof(sqls.stat.column.column_name) == "undefined"){
        var col_value = sqls.stat.column.column_value
        var col_len = col_value.length / 2
        var tbl_col_attr = JSON.parse(colu_attri)
        //console.log(tbl_col_attr)
    }
    else
        console.log("no column name")

}

