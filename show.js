const fs = require('fs');
const JSON = require('JSON');
const util = require('util');

module.exports = function (filename,result) {
    var data = fs.readFileSync(filename)
    var json_object = JSON.parse(data)
    var column_len = result.stat.property.length

    for(var i=0;i<json_object.data.length;i++){
        var str = json_object.data[i].dataname
        for(var k=0;k<column_len;k++){
            if(result.stat.property[k].COLUMN == "ALL"){
                console.log("here")
                console.log(str,result.stat.property[k].COLUMN)
                if(str.length<12){
                    var num_space = 12 - json_object.data[i].dataname.length;
                    util.print(json_object.data[i].dataname+'\t')
                    for(var k=0;k<num_space;k++)
                        util.print(' ')
                }
            }
            else
            {
                console.log(str,result.stat.property[k].COLUMN)
                if(result.stat.property[k].COLUMN == str){
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
        for(i=0;i<json_object.data.length;i++){
            var str = json_object.data[i].values[j]
            if(str.toString().length<12)
                num_space = 12 - str.toString().length
            else
                num_space = 0
            util.print(json_object.data[i].values[j]+'\t')
            for(k=0;k<num_space;k++)
                util.print(' ')

        }
        console.log('\n')
    }

}


