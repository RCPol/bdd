var xlsx = require('node-xlsx');
var hash = require('object-hash');
var request = require('request');
var async = require('async');
var fs = require('fs');

module.exports = function(Collection) {
  Collection.inputFromURL = function(url,cb) {
    url = url.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id="); // input will always be this way with "open"? Yes, if it comes from GoogleDocs. If it comes from other source no changes (replace) will be done (of course, if there isn't "open" in the URL).
    var name = defineName(url);
    if(name==null)
      cb("Invalid XLSX file.",null);

    var path = __dirname +"/../../uploads/"+name+".xlsx";
    saveDataset(name,url,path);

    var w = fs.createWriteStream(path).on("close",function (argument) {
      var data = xlsx.parse(path)[0].data;
      var schema = data[0];
      var class_ = data[1];
      var term = data[2];
      var label = data[3];
      data =  data.slice(4,data.length);

      var idIndexes = [1,2]; // institutionCode and collectionCode
      var rs = {};
      rs.count = 0;
      async.each(data, function iterator(line, callback){
        var record = {};
        record.id = defineId(line,idIndexes);
        if(record.id){
          rs.count ++;
          for(var c = 1; c < term.length; c++){
            if(line[c]){
              var field = toString(schema[c])+":"+toString(term[c]);
              record[field] = {};
              record[field].schema = toString(schema[c]);
              record[field].class = toString(class_[c]);
              record[field].term = toString(term[c]);
              record[field].label = toString(label[c]);
              record[field].value = toString(line[c]);
              //Logo
              if(field=="rcpol:logotipo"){
                record[field].category = "Logotipo";
                if(typeof record[field].value === "string"){
                    record[field].url = record[field].value.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
                }
              }
            }
          }
          Collection.upsert(record,function (err,instance) {
            if(err)
              console.log(err);
            callback();
          });
        }else{
          callback();
        }
      }, function done(){
        cb(null, rs);
      });
    });
    request(url).pipe(w);
  };
  Collection.remoteMethod(
    'inputFromURL',
    {
      http: {path: '/xlsx/inputFromURL', verb: 'get'},
      accepts: [
        {arg: 'url', type: 'string', required:true}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  function toString(arg) {
    return (typeof arg == 'undefined')?'':String(arg).trim();
  }
  function defineId(line,idIndexes) {
    var idValue = '';
    for(var j = 0; j < idIndexes.length; j++){
      if(toString(line[idIndexes[j]])=='')
        return null;
      idValue = idValue+":"+ toString(line[idIndexes[j]]);
    };
    return hash.MD5(idValue);
  }
  function defineName(url) {
    if(url.indexOf("?id=")!=-1)
      var name = url.split("?id=")[1];
    else if(url.indexOf(".xls")!=-1)
      name = hash.MD5(url);
    else return null;
    return name;
  }
  function saveDataset(name,url,path) {
    var Dataset = Collection.app.models.Dataset;
    var dataset = {};
    dataset.id = name;
    dataset.urlSource = url;
    dataset.localSource = path;
    dataset.type = "Collection";
    Dataset.upsert(dataset,function (err,instance) {
      console.log("Dataset saved: "+instance.id);
    });
  }
};
