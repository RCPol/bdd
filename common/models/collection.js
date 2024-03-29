var google = require('googleapis');
var xlsx = require('node-xlsx');
var hash = require('object-hash');
var request = require('request');
var async = require('async');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

const requestImageSize = require('request-image-size');


module.exports = function(Collection) {

  Collection.getSpreadsheetData = function(id, language, cb) {            
    var key = require('key.json');    
    var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];        
    var jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      [SCOPES],
      null
    );    
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        console.log(err.errorDescription,err.error_description,tokens);
        cb(err,tokens)
        return;
      }          
      var service = google.sheets('v4');      
      service.spreadsheets.values.get({
        auth: jwtClient,
        spreadsheetId: id,
        range: 'institution.'+language+'!B:P'
      }, function(err, d) {
          if (err){
            console.log('The API returned an error: ' + err);    
            cb('The API returned an error: ' + err,null)
            return;          
          }
          cb(null,d.values);
        });
      });
  }
  Collection.remoteMethod(     
    'getSpreadsheetData',
    {
      http: {path: '/getSpreadsheetData', verb: 'get'},
          accepts: [    
        {arg: 'id', type: 'string', required:true},   
        {arg: 'language', type: 'string', required:true},                
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );

  Collection.checkUrl = function(url, cb) {  
    try{
      if(url.indexOf("http")==-1){
        cb(null, false)
        return false;
      }
      requestImageSize(url)
      .then(size => {                
        cb(null, size)
      }).catch(err => {                
        cb(null, false)
      });      
    } catch(e){      
      cb(e, false)
    }           
  }
  Collection.remoteMethod(     
    'checkUrl',
    {
      http: {path: '/checkUrl', verb: 'get'},
          accepts: [    
        {arg: 'url', type: 'string', required:true}        
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  Collection.getImagesValues = function(id, language, cb) {
    var key = require('key.json');    
    var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];        
    var jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      [SCOPES],
      null
    );    
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        console.log(err.errorDescription,err.error_description,tokens);
        cb(err,tokens)
        return;
      }          
      var service = google.sheets('v4');      
      service.spreadsheets.values.get({
        auth: jwtClient,
        spreadsheetId: id,
        range: 'institution.'+language+'!Q:Q'        
      }, function(err, d) {
          if (err){
            console.log('The API returned an error: ' + err);    
            cb('The API returned an error: ' + err,null)
            return;          
          }
          var isCompleteValue = function(value) {
            return typeof value != "undefined" && String(value).trim().length > 0;
          }
          var rs = d.values;          
          var header = rs.splice(0,4);
          var images = [];
          rs.forEach(function(line, index){               
                if(isCompleteValue(line[0])) {                  
                  var img = {
                    header: header[3][0],
                    value: line[0],
                    row: index+2
                  };
                  images.push(img);
                }                                                                     
          });		                  
          cb(null,images);
        });
      });
  }

  Collection.remoteMethod(     
    'getImagesValues',
    {
      http: {path: '/getImagesValues', verb: 'get'},
          accepts: [    
        {arg: 'id', type: 'string', required:true},   
        {arg: 'language', type: 'string', required:true},                
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );  


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
  CollectionHelper.prototype.defineBase = function(base) {
    this.base = base;
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
    self.record.base = self.base;
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
          var schemaId = Collection.app.defineSchemaID(self.base,self.language,self.schema[c],self.class_[c],self.term[c]);                    
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

  Collection.inputFromURL = function(id,language,base,cb) {
    Collection.destroyAll({base:base},function(err,d_){    
      var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];    
      var key = require('key.json');    
      var jwtClient = new google.auth.JWT(
        key.client_email,
        null,
        key.private_key,
        [SCOPES],
        null
      );    
      jwtClient.authorize(function (err, tokens) {
        if (err) {
          console.log(err.errorDescription,err.error_description,tokens);
          cb(err,tokens)
          return;
        }
        var service = google.sheets('v4');
        service.spreadsheets.values.get({
              auth: jwtClient,
              spreadsheetId: id,
              range: 'institution.'+language+'!A:Q'        
            }, function(err, d) {
              if (err){
                console.log('The API returned an error: ' + err);    
                cb('The API returned an error: ' + err,null)
                return;          
              }       
              var data = d.values;       
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
                          .defineBase(base)
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
                          .defineBase(base)
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
                          .defineBase(base)
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
      });
    });



    // url = url.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id="); // input will always be this way with "open"? Yes, if it comes from GoogleDocs. If it comes from other source no changes (replace) will be done (of course, if there isn't "open" in the URL).
    // var name = defineName(url);
    // if(name==null)
    //   cb("Invalid XLSX file.",null);

    // var path = __dirname +"/../../uploads/"+name+".xlsx";
    // saveDataset(name,url,path);

    // var w = fs.createWriteStream(path).on("close",function (argument) {
    //   var data = xlsx.parse(path)[sheetIndex].data;
    //   var dataOnly =  data.slice(4,data.length);

    //   var rs = {};
    //   rs.count = 0;
    //   async.each(dataOnly, function iterator(line, callback){
    //     rs.count ++;
    //     async.parallel([
    //       function(callbackSave) {
    //         var helper = new CollectionHelper();
    //         helper.defineSchema(data[0])
    //               .defineClass(data[1])
    //               .defineTerm(data[2])
    //               .defineBase(base)
    //               .defineOriginalLanguage(language)
    //               .defineLanguage("en-US")
    //               .defineLine(line)
    //               .defineId("en-US",line[1],line[2])
    //               .mapping().on("done",function() {
    //                 helper.saveRecord()
    //                       .on("success",function() {
    //                         callbackSave();
    //                       })
    //                       .on("error",function(err) {
    //                         console.log("ID: ",helper.id);
    //                         console.log(err);
    //                         callbackSave();
    //                       });
    //               });
    //       },
    //       function(callbackSave) {
    //         var helper = new CollectionHelper();
    //         helper.defineSchema(data[0])
    //               .defineClass(data[1])
    //               .defineTerm(data[2])
    //               .defineBase(base)
    //               .defineOriginalLanguage(language)
    //               .defineLanguage("pt-BR")
    //               .defineLine(line)
    //               .defineId("pt-BR",line[1],line[2])
    //               .mapping().on("done",function() {
    //                 helper.saveRecord()
    //                       .on("success",function() {
    //                         callbackSave();
    //                       })
    //                       .on("error",function(err) {
    //                         console.log("ID: ",helper.id);
    //                         console.log(err);
    //                         callbackSave();
    //                       });
    //               });
    //       },
    //       function(callbackSave) {
    //         var helper = new CollectionHelper();
    //         helper.defineSchema(data[0])
    //               .defineClass(data[1])
    //               .defineTerm(data[2])
    //               .defineBase(base)
    //               .defineOriginalLanguage(language)
    //               .defineLanguage("es-ES")
    //               .defineLine(line)
    //               .defineId("es-ES",line[1],line[2])
    //               .mapping().on("done",function() {
    //                 helper.saveRecord()
    //                       .on("success",function() {
    //                         callbackSave();
    //                       })
    //                       .on("error",function(err) {
    //                         console.log("ID: ",helper.id);
    //                         console.log(err);
    //                         callbackSave();
    //                       });
    //               });
    //       }
    //     ],function done() {
    //       callback();
    //     });
    //   }, function done(){
    //     console.log(log);
    //     cb(null, rs);
    //   });
    // });
    // request(url).pipe(w);
  };
  Collection.remoteMethod(
    'inputFromURL',
    {
      http: {path: '/xlsx/inputFromURL', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'string', required:true},
        {arg: 'language', type:'string', required:true, description:'en-US, pt-BR or es-ES'},
        {arg: 'base', type: 'string', required:true}        
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
