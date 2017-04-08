
module.exports = function (stt) {
    var matc = 0;
    for(var i=0;i<stt.length;i++){
        if(stt[i].name == 'L_PAREN'){
            matc += 1;
        }
        else if(stt[i].name == 'R_PAREN'){
            matc -= 1;
        }
    }
    if(matc == 0){
        var err = new Error('left_paren and right_paren don\'t match');
        throw err;
    }
};
