var xlsx = require('node-xlsx');
var hash = require('object-hash');
var request = require('request');
var async = require('async');
var fs = require('fs');
module.exports = function(Schema) {
  Schema.inputFromURL = function(url,cb) {
    url = url.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
    var name = defineName(url);
    if(name==null)
      cb("Invalid XLSX file.",null);
    var path = __dirname +"/../../uploads/"+name+".xlsx";
    saveDataset(name,url,path);
    var downloadQueue = [];

    var w = fs.createWriteStream(path).on("close",function (argument) {
      var data = xlsx.parse(path)[0].data;
      var schema = data[0];
      var class_ = data[1];
      var term = data[2];
      var label = data[3];
      data =  data.slice(4,data.length);
      var rs = {};
      rs.count = 0;
      async.each(data, function iterator(line, callback){
        var record = {};
        record.id = line[1];
        record.order = rs.count;
        rs.count ++;
        if(record.id){
          for(var c = 2; c < term.length; c++){
            if(line[c]){
              var field = toString(schema[c])+":"+toString(term[c]);
              var current = {};
              current.schema = toString(schema[c]);
              current.class = toString(class_[c]);
              current.term = toString(term[c]);
              current.label = toString(label[c]);
              current.value = toString(line[c]);
              // REFERENCE
              if(current.term=="bibliographicCitation"){
                current.references = [];
                current.value.split("|").forEach(function (ref) {
                  current.references.push(ref.trim());
                });
              }
              // IMAGE
              if(current.term=="glossaryImage"){
                current.images = [];
                current.value.split("|").forEach(function (image) {
                  current.images.push(image.trim());
                });
              }
              // Check if exist field with the same key
              if(record[field]){
                // Check if the field is the is an Array
                if(Object.prototype.toString.call( record[field] ) === '[object Array]' ){
                    record[field].push(current);
                } else {
                  var old = Object.create(record[field]);
                  record[field] = [];
                  record[field].push(old);
                  record[field].push(current);
                }
              } else {
                record[field] = current;
              }
            }
          }
          Schema.upsert(record,function (err,instance) {
            if(err)
              console.log(err);
            callback();
          });
        }else{
          // adicionar estados
          if (line[5] == "Estado"){
            //record.id= line[3].toLowerCase().split(" ").join("-") + "-" + line[4].toLowerCase().split(" ").join("-");
            for(var c = 2; c < term.length; c++){
              if(line[c]){
                var field = toString(schema[c])+":"+toString(term[c]);
                var current = {};
                current.schema = toString(schema[c]);
                current.class = toString(class_[c]);
                current.term = toString(term[c]);
                current.label = toString(label[c]);
                current.value = toString(line[c]);
                // REFERENCE
                if(current.term=="bibliographicCitation"){
                  current.references = [];
                  current.value.split("|").forEach(function (ref) {
                    current.references.push(ref.trim());
                  });
                }
                // IMAGE
                if(current.term=="glossaryImage"){
                  current.images = [];
                  current.value.split("|").forEach(function (image) {
                    current.images.push(image.trim());
                  });
                }
                // Check if exist field with the same key
                if(record[field]){
                  // Check if the field is the is an Array
                  if(Object.prototype.toString.call( record[field] ) === '[object Array]' ){
                      record[field].push(current);
                  } else {
                    var old = Object.create(record[field]);
                    record[field] = [];
                    record[field].push(old);
                    record[field].push(current);
                  }
                } else {
                  record[field] = current;
                }
              }
            }
            if (!line[2]) {
              line[2] = "";
            }
            if (!line[3]) {
              line[3] = "";
            }
            if (!line[4]) {
              line[4] = "";
            }
            record.id = hash.MD5(line[2].trim().toLowerCase()+":"+line[3].trim().toLowerCase()+":"+line[4].trim().toLowerCase());
            console.log(line[2].trim().toLowerCase()+":"+line[3].trim().toLowerCase()+":"+line[4].trim().toLowerCase()+" "+record.id);
            record.image = line[10];
            record.url = "/images/" + record.id + ".jpeg";
            if (record.image != undefined){
              record.image = record.image.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
              downloadQueue.push({url:record.image, name:record.id});
            }
          }
          Schema.upsert(record, function(err, instance){
            if(err)
              console.log(err);
            rs.count++;
          });
          callback();
        }
      }, function done(){
        downloadImages(downloadQueue);
        cb(null, rs);
      });
    });
    request(url).pipe(w);
  };
  Schema.mainImage = function(id, cb){
    Schema.findById(id, function(err, data){
      if (err) throw new Error(err);
      // check if url exists
      if(data && data.url){
        var url = data.url;
        cb(err, url);
      } else {
        cb("", "");
      }
    });
  };
  Schema.getOrder = function(id, cb){
    Schema.findById(id, function(err, data){
      if (err) throw new Error(err);
      if(data){
        cb(err, data.order);
      } else {
        cb(err, "");
      }
    });
  };
  Schema.remoteMethod(
    'mainImage',
    {
      http: {path: '/mainImage', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'string', required:true}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  Schema.remoteMethod(
    'inputFromURL',
    {
      http: {path: '/xlsx/inputFromURL', verb: 'get'},
      accepts: [
        {arg: 'url', type: 'string', required:true}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  Schema.remoteMethod(
    'getOrder',
    {
      http: {path: '/getOrder', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'string', required: true}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  function toString(arg) {
    return (typeof arg == 'undefined')?'':String(arg).trim();
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
    var Dataset = Schema.app.models.Dataset;
    var dataset = {};
    dataset.id = name;
    dataset.urlSource = url;
    dataset.localSource = path;
    dataset.type = "Glossary";
    Dataset.upsert(dataset,function (err,instance) {
      console.log("Dataset saved: "+instance.id);
    });
  }
  function downloadImages(queue){
    var i = 0;
    var end = queue.length;
    async.whilst(function(){
      return i < end;
    }, function(callback){
      console.log(i + " of " + end);
      var url = queue[i].url;
      var name = queue[i].name;
      var file = __dirname + "/../../client/images/" + name + ".jpeg";
      fs.exists(file, function(exists){
        if (exists) {
          console.log("image alreadly exists");
          i++;
          callback();
        } else {
          console.log("making request to " + url);
          request(url, {encoding: 'binary'}, function(err, response, body){
            if (err) throw new Error(err);
            console.log(response.statusCode);
            fs.writeFile("client/images/"+name+".jpeg", body, 'binary', function(err){
              if (err) throw new Error(err);
              i++;
              callback();
            });
          });
        }
      });
    }, function(err){
        if (err) throw new Error(err);
        console.log("done.");
      });
    }
};
