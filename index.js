
var fs = require('fs');
var tables = require('./tables');
var columns = require('./columns');
var officegen = require('officegen');
var myScanner = new Scanner();
const match1 = require('./Error');
const Scanner = require('./scanner');
myScanner.input('CREATE TABLE(Student name,age,studentid,gender) VALUES (\'Ai Toshiko\',21,12,\'F\')');


var stt = [];
while(myScanner.pos< myScanner.buflen){
        try{
                stt.push(myScanner.token());
        } catch(e){
                console.log('Errors in your SQL:'+e);
                break;
        }
}
var mymatch = new match1();
mymatch(stt);
console.log(stt);
var len = stt.length;
if(stt[0].name == 'CREATE')
{
    var tbl = new tables();
    tbl.name = stt[3].value;
    //match the lefe paren and the right paren,if left paren appears,+1,contrary,-1;R_pos records the position of right paren
    var match = 0;
    var R_pos = 0;
    //count the number of comma and specify the position of comma
    var comma_num = 0;
    var comma_pos = [];
    for (var i = 0; i < len; i++) {
        if (stt[i].name == 'COMMA') {
            ++comma_num;
            comma_pos.push(i);
        }
        if (stt[i].name == 'L_PAREN')
            match += 1;
        if (stt[i].name == 'R_PAREN') {
            match -= 1;
            R_pos = i;
        }
    }
    comma_pos.push(R_pos);
    //if left_paren and right_paren don't match,throw error
    if (match != 0) {
        var err = new Error('left_paren and right_paren don\'t match');
        throw err;
    }

    //create a new excel documnet
    var xlsx = officegen('xlsx');
    xlsx.name = stt[2].value;
    //create a new sheet
    var sheet = xlsx.makeNewSheet();
    sheet.data[10] = [];
    sheet.setCell('A1', 'ID');
    sheet.setCell('B1', 'NAME');
    sheet.setCell('C1', 'DATATYPE');
    sheet.setCell('D1', 'SIZE');
    sheet.setCell('E1', 'KEY');
    //parser
    var parser = 4;
    var comma_cnt = 0;
    //loop until the tail of sql sentence
    while (parser < len - 1) {
        var col = new columns();
        while (parser < comma_pos[comma_cnt]) {
            var dis = comma_pos[comma_cnt] - parser;
            col.name = stt[parser].value;
            col.datatype = stt[parser + 1].value;
            col.key = false;
            col.size = 40;
            if (dis == 4 && stt[parser + 2].name == 'PRIMARY' && stt[parser + 3].name == 'KEY') {
                col.key = true;
            }
            if (dis == 5 && stt[parser + 1].name == 'VARCHAR' && stt[parser + 2].name == 'L_PAREN') {
                col.size = stt[parser + 3].value;
            }
            if (dis == 7 && stt[parser + 1].name == 'VARCHAR') {
                col.size = stt[parser + 3].value;
                col.key = true;
            }
            parser = comma_pos[comma_cnt] + 1;
        }
        console.log(col.name, col.datatype, col.size, col.key);
        ++comma_cnt;

        var place = comma_cnt + 1;
        sheet.setCell("A" + place.toString(), comma_cnt);
        sheet.setCell("B" + place.toString(), col.name.toString());
        sheet.setCell("C" + place.toString(), col.datatype.toString());
        sheet.setCell("D" + place.toString(), col.size.toString());
        sheet.setCell("E" + place.toString(), col.key.toString());
    }
    //save as a new file
    var output = fs.createWriteStream(stt[2].value + '.xlsx');
    xlsx.generate(output);

    console.log(comma_num);
    console.log(comma_pos);
}

/*
if(stt[0].name == 'INSERT'){
    var table_name = stt[2].value;
    //parse the sentence
    if(stt[3].value == '(')
    {
        var attri = [];
        var ins = 4;
        while(stt[ins].value != ')'){
            attri.push(stt[ins].value);
            ins = ins + 2;
        }
    }
    console.log(attri);
}*/