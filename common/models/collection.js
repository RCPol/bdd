var xlsx = require('node-xlsx');
var hash = require('object-hash');
var request = require('request');
var async = require('async');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

module.exports = function(Collection) {
  var log = {};
  var downloadQueue = [];
  function CollectionHelper() {
    EventEmitter.call(this);
    this.id = "";
    this.log = {};
  }
  util.inherits(CollectionHelper, EventEmitter);
  CollectionHelper.prototype.defineId = function(language, institutionCode, collectionCode) {
    this.id = language+":"+institutionCode+":"+collectionCode;
    return this;
  };
  CollectionHelper.prototype.defineSchema = function(schema) {
    this.schema = schema;
    return this;
  };
  CollectionHelper.prototype.defineClass = function(class_) {
    this.class_ = class_;
    return this;
  };
  CollectionHelper.prototype.defineTerm = function(term) {
    this.term = term;
    return this;
  };
  CollectionHelper.prototype.defineLabel = function(label) {
    this.label = label;
    return this;
  };
  CollectionHelper.prototype.defineOriginalLanguage = function(originalLanguage) {
    this.originalLanguage = originalLanguage;
    return this;
  };
  CollectionHelper.prototype.defineLanguage = function(language) {
    this.language = language;
    return this;
  };
  CollectionHelper.prototype.defineLine = function(line) {
    this.line = line;
    return this;
  };
  CollectionHelper.prototype.mapping = function() {
    this.record = {};
    var self = this;
    var Schema = Collection.app.models.Schema;
    var c = 0;
    if(self.id.length==0){
      // console.log(self);
      return this;
    }
    self.record.id = self.id;
    self.record.language = self.language;
    self.record.originalLanguage = self.originalLanguage;
    // console.log("language: ",self.language);
    // console.log("Schema: ",self.schema);
    // console.log("Class: ",self.class_);
    // console.log("Term: ",self.term.length,self.term);
    async.each(self.term, function(term, callbackCell){
      if(term!="TERM"){
        c++;
        if(term && toString(self.line[c]).length != 0){
          var schemaId = Collection.app.defineSchemaID(self.language,self.schema[c],self.class_[c],self.term[c]);
          // console.log("ID "+c+": ", schemaId);
          self.record[schemaId] = {value:toString(self.line[c])};
          Schema.findById(schemaId,function(err,schema) {
            if(err){
              console.log("ERROR "+c+": ", schemaId);
              callbackCell();
            } else if(schema){
              var aux = self.record[schema.id].value;
              self.record[schema.id] = schema;
              self.record[schema.id].value = aux;
              // IMAGE
              if(self.schema["class"]=="Image"){
                self.record[schema.id].value.split("|").forEach(function(value){
                  self.record[schema.id].name = "logotipo" + value.replace("https://drive.google.com/open?id=", "");
                  if(typeof value === "string"){
                    self.record[schema.id].url = value.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
                  }
                  var image = {url: record[schema.id].url, term:schema.term ,name: record[schema.id].name};
                  if(self.language==self.originalLanguage){
                    downloadQueue.push(image);
                  }
                });
              }
              callbackCell();
            } else {
              log["STATE_NOT_FOUND:"+schemaId] = "STATE_NOT_FOUND: "+schemaId;
              callbackCell();
            }
          });
        } else {
          callbackCell();
        }
      } else {
        callbackCell();
      }
    }, function() {
      return self.emit("done");
    });
    return this;
  };
  CollectionHelper.prototype.saveRecord = function() {
    var self = this;
    Collection.upsert(self.record,function (err,instance) {
      if(err)
        return self.emit("error",err);
      else
        return self.emit("success");
    });
    return this;
  };

  Collection.inputFromURL = function(url,language,cb) {
    url = url.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id="); // input will always be this way with "open"? Yes, if it comes from GoogleDocs. If it comes from other source no changes (replace) will be done (of course, if there isn't "open" in the URL).
    var name = defineName(url);
    if(name==null)
      cb("Invalid XLSX file.",null);

    var path = __dirname +"/../../uploads/"+name+".xlsx";
    saveDataset(name,url,path);

    var w = fs.createWriteStream(path).on("close",function (argument) {
      var data = xlsx.parse(path)[0].data;
      var dataOnly =  data.slice(4,data.length);

      var rs = {};
      rs.count = 0;
      async.each(dataOnly, function iterator(line, callback){
        rs.count ++;
        async.parallel([
          function(callbackSave) {
            var helper = new CollectionHelper();
            helper.defineSchema(data[0])
                  .defineClass(data[1])
                  .defineTerm(data[2])
                  .defineOriginalLanguage(language)
                  .defineLanguage("en-US")
                  .defineLine(line)
                  .defineId("en-US",line[1],line[2])
                  .mapping().on("done",function() {
                    helper.saveRecord()
                          .on("success",function() {
                            callbackSave();
                          })
                          .on("error",function(err) {
                            console.log("ID: ",helper.id);
                            console.log(err);
                            callbackSave();
                          });
                  });
          },
          function(callbackSave) {
            var helper = new CollectionHelper();
            helper.defineSchema(data[0])
                  .defineClass(data[1])
                  .defineTerm(data[2])
                  .defineOriginalLanguage(language)
                  .defineLanguage("pt-BR")
                  .defineLine(line)
                  .defineId("pt-BR",line[1],line[2])
                  .mapping().on("done",function() {
                    helper.saveRecord()
                          .on("success",function() {
                            callbackSave();
                          })
                          .on("error",function(err) {
                            console.log("ID: ",helper.id);
                            console.log(err);
                            callbackSave();
                          });
                  });
          },
          function(callbackSave) {
            var helper = new CollectionHelper();
            helper.defineSchema(data[0])
                  .defineClass(data[1])
                  .defineTerm(data[2])
                  .defineOriginalLanguage(language)
                  .defineLanguage("es-ES")
                  .defineLine(line)
                  .defineId("es-ES",line[1],line[2])
                  .mapping().on("done",function() {
                    helper.saveRecord()
                          .on("success",function() {
                            callbackSave();
                          })
                          .on("error",function(err) {
                            console.log("ID: ",helper.id);
                            console.log(err);
                            callbackSave();
                          });
                  });
          }
        ],function done() {
          callback();
        });
      }, function done(){
        console.log(log);
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
        {arg: 'url', type: 'string', required:true},
        {arg: 'language', type:'string', required:true, description:'en-US, pt-BR or es-ES'}
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
