
module.exports = columns;

function columns(name,datatype,size,key) {
    this.name=name;
    this.datatype=datatype;
    this.size=+size;
    if(key!=undefined)
        this.key=true;
    else
        this.key=false;
}