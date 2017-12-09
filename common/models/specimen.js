var google = require('googleapis');
var readChunk = require('read-chunk'); 
var imageType = require('image-type');  
var xlsx = require('node-xlsx');
var hash = require('object-hash');
var request = require('request');
var async = require('async');
var validator = require('validator');
var fs = require('fs');
var qt = require('quickthumb');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
// var Thumbnail = require('thumbnail');
// var thumbnail = new Thumbnail(__dirname + "/../../client/images", __dirname + "/../../client/thumbnails");
module.exports = function(Specimen) {

  Specimen.aggregationByField = function(prefix, base, lang, field, cb) {            
    var queryMongo = { 'language':lang, base:base }        
    var SpecimenCollection = Specimen.getDataSource().connector.collection(Specimen.modelName);
    Specimen.getDataSource().connector.safe = false;     
    console.log(JSON.stringify([
      { $match: queryMongo},
      { $group: {
        _id: '$'+prefix+field+'.value',
        count: {$sum:1}
        }
      }
    ]));    
    SpecimenCollection.aggregate([
      { $match: queryMongo},
      { $group: {
        _id: '$'+prefix+field+'.value',
        count: {$sum:1}
        }
      }
    ], function (err, states) { 
      console.log("ESTADO/ERROR",err,states)         
      // var results = {values: states};
      console.log("ERROR: ",err);
      var results = {values: []};
      console.log("STATES: ",states);
      states.forEach(function(item) {        
        if(item._id){
          item._id.split('|').forEach(function(subItem) {
            subItem = subItem.trim();
            var nil = true;  
            results.values.forEach(function(rs) {
              if(rs._id==subItem){
                nil = false;
                return false;
              }
            });
            if(nil)
              results.values.push({_id:subItem,count:0})        
          });       
        } 
      });
      console.log("RESULTS: ",results);
      cb(null, results);      
    });   
  }

  Specimen.remoteMethod(     
    'aggregationByField',
    {
      http: {path: '/aggregationByField', verb: 'get'},
          accepts: [    
        {arg: 'prefix', type: 'string', required:false},
        {arg: 'base', type: 'string', required:true},
        {arg: 'lang', type: 'string', required:true},
        {arg: 'field', type: 'string', required:true}        
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );

  var logs = {};
  function titleCase(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }
  
  function SpecimenHandler(base, originalLanguage, table) {
    this.count = 0;
    this.base = base;
    this.originalLanguage = originalLanguage;
    this.table = table;
  }
  SpecimenHandler.prototype.setSchemas = function(){
    var self = this;
    self.schemas = self.table[0];    
    return this;
  }
  SpecimenHandler.prototype.setClasses = function(){
    var self = this;
    self.classes = self.table[1];    
    return this;
  }
  SpecimenHandler.prototype.setTerms = function(){
    var self = this;
    self.terms = self.table[2];    
    return this;
  }
  SpecimenHandler.prototype.setData = function(){
    var self = this;
    self.data = self.table.slice(5,self.table.length);
    return this;
  }
  SpecimenHandler.prototype.processData = function(){
    var self = this;
    console.log("2 - PROCESSING DATA!");
    return new Promise(function(resolve, reject){  
      function processLine(line,callback){
        // console.log("3 - PUSHING LINE!");
        self.processLine(line.line,callback);
      }    
      var queue = async.queue(processLine,3);
      queue.drain = function() {        
        resolve();
      };
      self.data.forEach(function(line) {
        if(line[1] && line[2] && line[3]){          
          queue.push({line:line});          
        }          
      });
    });
  }
  function SpecimenRecord(base, language, originalLanguage, line){
    this.base = base;
    this.language = language;    
    this.originalLanguage = originalLanguage;    
    this.line = line;    
    this.record = {};
  }
  SpecimenRecord.prototype.defineId = function(){
    var self = this;    
    self.id = Specimen.app.defineSpecimenID(self.base, self.language,self.line[1],self.line[2],self.line[3]); //definição do id do specimen
    self.record.id = self.id;    
    return self.id;
  }
  SpecimenRecord.prototype.processField = function(term, index, callback){
    var self = this;    
    // console.log("7 - PROCESS FIELD!");
    var Schema = Specimen.app.models.Schema;
    var base = self.base;
    var language = self.language;
    var originalLanguage = self.originalLanguage;
    var value = toString(self.line[index]).trim();
    var schema = self.schemas[index];
    var class_ = self.classes[index];    
    // Process only if there is value
    if(term && value != ""){      
      var fieldId = Specimen.app.defineSchemaID(self.base, self.language, schema, class_, term, null); //define o id do esquema                      
      if(fieldId){ //se existe id definido no esquema
        Schema.findById(fieldId,function(err,field) { //busca o id que está no schema
          if(err){ //se existe erro na busca
            console.log(err);
            callback();
          } else if(field){ //se existe schema
            self.record.base = base;
            self.record.language = language; //recebe a linguagem      
            self.record[fieldId] = field;
            self.record[fieldId].value = value;
            self.record[fieldId].values = value.split("|").map(function(item) {
              return item.trim();
            });
            function processStates(cb){
              var statesValues = value.split("|");
              self.record[fieldId].states = [];
              async.each(statesValues, function(stateVal, callbackState) {
                var stateValue = titleCase(stateVal.trim());                                                                                                       
                // RETRIEVE THE ORIGINAL STATE                    
                Schema.findOne({ where:{ base:self.base, language:self.originalLanguage, term:term, vocabulary:stateValue}}, function(err,originalState) {
                  if(err) console.log(err)
                  if(originalState){
                    // NAO PRECISA DE TRADUÇÃO
                    if(self.originalLanguage == self.language){                      
                      self.record[fieldId].states.push(originalState.toJSON());
                      callbackState();
                    } else {
                      // RETRIEVE THE TRANSLATED STATE                      
                      var translatedStateId = Schema.app.defineSchemaID(self.base,self.language, schema, "State", originalState.term, originalState.state);                      
                      Schema.findById(translatedStateId,function(err,translatedState) {                      
                        if(translatedState){
                          self.record[fieldId].states.push(translatedState.toJSON());
                        } else{
                          console.log("ERR-001", translatedStateId)
                        }
                        callbackState();
                      });
                    }                    
                  } else {                    
                    callbackState();
                  }
                });                                    
              },function doneState() {                                
                cb()
              });
            }
            function processRegularFields(){
              var Collection = Specimen.app.models.Collection;
              var sID = self.record.id.split(":");
              var cID = sID[1]+":"+sID[2]+":"+sID[3];                        
              Collection.findById(cID, function(err,collection) {                
                if(err) console.log("ERROR FIND COLLECTION: ",err);          
                if(collection) {                  
                  self.record.collection = collection.toJSON();                                    
                } else console.log("ERR-002")
                callback();              
              });
              // EVENT DATE
              if(field.term=="eventDate"){
                var parsedDate = value.split("-");
                if(parsedDate.length==3){
                    self.record[fieldId].day = {value:parsedDate[2].trim()=="00"||parsedDate[0].trim()=="0"?null:parsedDate[0].trim()};
                    self.record[fieldId].month = {value:parsedDate[1].trim()=="00"||parsedDate[1].trim()=="0"?null:parsedDate[1].trim()};
                    self.record[fieldId].year = {value:parsedDate[0].trim()=="0000"||parsedDate[2].trim()=="00"?null:parsedDate[2].trim()};
                } else {
                  // TODO: Lógica para pegar valores parcialmente completos
                  self.record[fieldId].day = {};
                  self.record[fieldId].month = {};
                  self.record[fieldId].year = {};                
                }
              // IMAGE
              } else if(field["class"]=="Image"){
                  self.record[fieldId].images = [];
                  toString(self.record[fieldId].value).trim().split("|").forEach(function(img,i){   
                    if(img && img.length>0){
                      var imageId = base+"-"+img.split("?id=")[1];
                      if(typeof img.split("?id=")[1] == "undefined") imageId = base+"-"+img.split("file/d/")[1];  
                      var googleImageId = imageId.trim().split("-");
                      googleImageId.shift();                      
                      var image = {
                        id: imageId,                          
                        original: "https://docs.google.com/uc?id="+googleImageId.join("-"),
                        local: "/images/" + imageId + ".jpeg", //atribui a url onde vai ser salva a imagem
                        resized: "/resized/" + imageId + ".jpeg", //atribui a url onde vai ser salva a imagem
                        thumbnail: "/thumbnails/" + imageId + ".jpeg" //atribui a url onde vai ser salva a imagem
                      }
                      if(imageId) self.record[fieldId].images.push(image);
                    }
                  });
              // REFERENCE
              } else if(field["class"]=="Reference"){
                  self.record[fieldId].references = [];
                  self.record[fieldId].value.split("|").forEach(function (ref) {
                    self.record[fieldId].references.push(ref.trim());
                  });
              // INTERACTION
              } else if(field["class"]=="Interaction"){
                  self.record[fieldId].species = [];
                  self.record[fieldId].value.split("|").forEach(function (sp) {
                    self.record[fieldId].species.push(sp.trim());
                  });
              // FLOWERING PERIOD
              } else if(field.term=="floweringPeriod"){
                  self.record[fieldId].months = [];
                  self.record[fieldId].value.split("|").forEach(function (month) {
                    self.record[fieldId].months.push(month.trim());
                  });
              // LATITUDE
              } else if(field.term=="decimalLatitude"){
                  var converted = convertDMSCoordinatesToDecimal(self.record[fieldId].value.toUpperCase().replace("O","W").replace("L","E"));
                  if(converted!=self.record[fieldId].value){
                    self.record[fieldId].rawValue = self.record[fieldId].value;
                    self.record[fieldId].value = converted;
                  }
              // LONGITUDE
              } else if(field.term=="decimalLongitude"){                            
                  var converted = convertDMSCoordinatesToDecimal(self.record[fieldId].value.toUpperCase().replace("O","W").replace("L","E"));
                  if(converted!=self.record[fieldId].value){
                    self.record[fieldId].rawValue = self.record[fieldId].value;
                    self.record[fieldId].value = converted;
                  }
              }              
            }
            // CATEGORICAL DESCRIPTOR
            if(field["class"]=="CategoricalDescriptor" ){
              processStates(function(){
                processRegularFields();
              })              
            } else {
              processRegularFields();
            }                       
          } else {
            // console.log("field does not exist")
            callback();
          }        
        });
      } else {
        callback();
      }
    } else {
      callback();
    }
  }
  SpecimenRecord.prototype.processRecord = function(){
    var self = this;
    // console.log("6 - PROCESS RECORD!");
    return new Promise(function(resolve, reject){
      function processField(term, index, callback){        
        self.processField(term, index, callback);
      }
      async.forEachOf(self.terms, processField, 
        function done(){
          // console.log("7 - FIELDS PROCESSED!");
          resolve();          
      });      
    });
  }
  SpecimenRecord.prototype.save = function(){
    // console.log("9 - SAVE!");
    var self = this;
    return new Promise(function(resolve, reject){
      Specimen.upsert(self.record,function(err,data){
        if(err) reject(err);
        else resolve();
      });
    });
  }
  SpecimenHandler.prototype.saveRecord = function(language,line){
    // console.log("4 - SAVE RECORD!");
    var self = this;
    return new Promise(function(resolve, reject){
      var Schema = Specimen.app.models.Schema;      
      var record = new SpecimenRecord(self.base,language,self.originalLanguage,line);
      record.schemas = self.schemas;
      record.classes = self.classes;
      record.terms = self.terms;
      record.base = self.base;
      if(record.defineId()){
        // console.log("5 - ID DEFINED!");
        record.processRecord().then(function(){
          // console.log("8 - SAVING")
          record.save().then(function(){
            // console.log("10 - SAVED!");
            resolve();
          }).catch(function(e){reject(e)});
        }).catch(function(e){reject(e)});        
      } else {
        reject("ID could not be defined");
      }          
    });
  }
  SpecimenHandler.prototype.processLine = function(line,callback){
    var self = this;    
    Promise.all([
      new Promise(function(resolve, reject){
        self.saveRecord("en-US",line).then(function(){resolve()}).catch(function(e){reject(e)})
      }),
      new Promise(function(resolve, reject){
        self.saveRecord("pt-BR",line).then(function(){resolve()}).catch(function(e){reject(e)})
      }),
      new Promise(function(resolve, reject){
        self.saveRecord("es-ES",line).then(function(){resolve()}).catch(function(e){reject(e)})
      })
    ]).then(function() {
      console.log(self.count++);
      // console.log("11 - LINE PROCESSED!");
        callback();
      })
      .catch(function(error){
        console.log("ERR-003", error)
        callback();
      });    
  }  
  
 // var downloadQueue = []; //recebe o vetor com as imagens a serem baixadas
  //função que recebe a planilha
  Specimen.inputFromURL = function(id,language, base, cb) {
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
            range: 'specimen.'+language+'!A:BU'        
          }, function(err, d) {
            if (err){
              console.log('The API returned an error: ' + err);    
              cb('The API returned an error: ' + err,null)
              return;          
            }                   
            Specimen.destroyAll({base:base},function(err,d_){
              console.log("1 - Apagado!");
              var start = new Date();
              var data = d.values;
              var handler = new SpecimenHandler(base, language, data);
              handler.setSchemas().setClasses().setTerms().setData();
              handler.processData()
                .then(function(){
                  var speciesTime = new Date();
                  console.log("TERMINADO SPECIMEN",speciesTime-start);
                  var Species = Specimen.app.models.Species;                  
                  Species.fromSpecimensAggregation(base, {}, function(err,data){
                    console.log("TERMINADO SPECIES",new Date()-speciesTime);
                    console.log("TERMINADO",new Date()-start);
                    cb(null,new Date()-start);
                  });                  
                })
                .catch(function(error){
                  console.log("processData error", error);
                  cb(error,null);
                });              
            });
          });
    });
  };  

  Specimen.downloadImages = function (base,cb) {
    function error (err){cb(err,null)}
    console.log("serviço chamado");
    var manager = new ImageDownloadManager();
    // define query de consulta de imagens
    var query  = manager.defineQuery(base);    
    // consulta imagens
    manager.getData(query,base)    
        // define uma fila com todas as imagens
        .then(manager.defineQueue).catch(error)
        // processa todas as imagens da fila
        .then(manager.processQueue).catch(error)
        // término do processo
        .then(function(){cb(null,"done")}).catch(error);    
  };
  function ImageDownloadManager() {}  
  ImageDownloadManager.prototype.processQueue = function(queue) {
    var self = this;
    console.log("processando fila")
    return new Promise(function(resolve, reject){
      var processing;
      var processImage = function (img,cb){        
        var downloader = new ImageDownloader();         
        downloader.download(img).then(function(){
          console.log("download realizado com sucesso");
          cb();
        }).catch(function(error){
          console.log("erro ao fazer download de imagem");          
          if(error.img) {
            console.log("adicionou imagem no final da fila")
            processing.push(img);
          }
          cb();
        });
      }
      processing = async.queue(processImage,5);      
      processing.push(queue);
      processing.drain = function() {
        resolve()        
      };
    });    
  }  
  ImageDownloadManager.prototype.defineQueue = function(data) {
    var self = this;
    console.log("definindo fila")
    return new Promise(function(resolve, reject){
      var queue = [];
      var result = data.result;
      var base = data.base;
      result.forEach(function (result){
        if(result[base+":pt-BR:rcpol:Image:allPollenImage"]){
            result[base+":pt-BR:rcpol:Image:allPollenImage"].images.forEach(function (img){
             queue.push(img);
            });
        }
        if(result[base+":pt-BR:rcpol:Image:flowerImage"]){
            result[base+":pt-BR:rcpol:Image:flowerImage"].images.forEach(function (img){
              queue.push(img);
            });
        }
        if(result[base+":pt-BR:rcpol:Image:plantImage"]){
            result[base+":pt-BR:rcpol:Image:plantImage"].images.forEach(function (img){
              queue.push(img);
            });
        }
        if(result[base+":pt-BR:rcpol:Image:beeImage"]){
            result[base+":pt-BR:rcpol:Image:beeImage"].images.forEach(function (img){
             queue.push(img);
            });
        }
        if(result[base+":pt-BR:rcpol:Image:pollenImage"]){
            result[base+":pt-BR:rcpol:Image:pollenImage"].images.forEach(function (img){
              queue.push(img);
            });
        }
      });      
      resolve(queue);
    });    
  }      
  ImageDownloadManager.prototype.getData = function(query,base) {
    var self = this;
    return new Promise(function(resolve, reject){
      Specimen.find(query, function(err,result){
        if(err) reject(err)        
        else{
          var data = {result:result, base: base}
          resolve(data);
        }
      });
    });  
  }  
  ImageDownloadManager.prototype.defineQuery = function(base) {
    var self = this;
    var query = {
      where:{
        or:[
        ]
      },
      fields:{}
    };
    console.log("define filtro para pegar apenas imagens que tenham pelo menos uma imagem")
    var allPollen =  {};
    allPollen[base+":pt-BR:rcpol:Image:allPollenImage"] = {exists:true};
    var plant =  {};
    plant[base+":pt-BR:rcpol:Image:plantImage"] = {exists:true};
    var flower =  {};
    flower[base+":pt-BR:rcpol:Image:flowerImage"] = {exists:true};
    var bee =  {};
    bee[base+":pt-BR:rcpol:Image:beeImage"] = {exists:true};
    var pollen =  {};
    pollen[base+":pt-BR:rcpol:Image:pollenImage"] = {exists:true};
    query.where.or.push(allPollen);
    query.where.or.push(plant);
    query.where.or.push(flower);
    query.where.or.push(bee);
    query.where.or.push(pollen);    
    console.log("traz apenas os campos de imagens")
    query.fields[base+":pt-BR:rcpol:Image:allPollenImage"] = true;
    query.fields[base+":pt-BR:rcpol:Image:plantImage"] = true;
    query.fields[base+":pt-BR:rcpol:Image:flowerImage"] = true; 
    query.fields[base+":pt-BR:rcpol:Image:beeImage"] = true;
    query.fields[base+":pt-BR:rcpol:Image:pollenImage"] = true; 
    return query;
  }
  function ImageDownloader() {}    
  ImageDownloader.prototype.imageExists = function() {
    var self =  this;
    return new Promise(function(resolve, reject){   
      // console.log("imagem existe")   
      resolve();      
    });
  }
  ImageDownloader.prototype.downloadImage = function(img) {
    var self =  this;    
    return new Promise(function(resolve, reject){      
      // console.log("imagem nao existe");            
      request(img.original, {encoding: 'binary', timeout: 10000}, function(err, response, body){
        if (err){          
            console.log("Error to download "+img.original);                        
            reject({img:img.raw});
        } else {
          // console.log("imagem baixada");          
          img.downloadedContent = body;
          resolve(img);          
        }
      });
    });
  }
  ImageDownloader.prototype.transformImage = function(img, source, target, size) {
    var self =  this;    
    return new Promise(function(resolve, reject){             
      var param = { src: source, dst: target, width: size.width}
      if(size.height) param.height = size.height;
      qt.convert(param, function(err, filename) {
        if(err){
          reject({img: img.raw})          
        } else {        
          resolve(img);
        }
      });
    });
  }
  ImageDownloader.prototype.writeOriginalImage = function(img) {
    var self =  this;
    // console.log("writeOriginalImage")
    return new Promise(function(resolve, reject){
      fs.writeFile("client"+img.local, img.downloadedContent, 'binary', function(err){
        if(err){
          console.log("erro para gravar", err);
          reject({img:img.raw});
        } else {
          resolve(img);
        }
      });
    });
  }
  ImageDownloader.prototype.download = function(img) {    
    var self = this;        
    return new Promise(function(resolve, reject){      
      var error = function(err){           
        if(err.img){               
          console.log(err.img.original)             
          fs.unlink(__dirname + "/../../client"+err.img.local,function(err_){            
            if(err_) console.log("original não apagado");
            else console.log('original file deleted successfully');                
            reject(err);
          });
          fs.unlink(__dirname + "/../../client"+err.img.resized,function(err_){            
            if(err_) console.log("resized não apagado");
            else console.log('resized file deleted successfully');                            
          });
          fs.unlink(__dirname + "/../../client"+err.img.thumbnail,function(err_){            
            if(err_) console.log("thumbnail não apagado");
            else console.log('thumbnail file deleted successfully');                            
          });
        }
        
      }
      var done = function(){
        resolve();
      }
      // cria um modelo manipulação da imagem
      self.img = new Image(img);
      
      // ORIGINAL
      var isOriginalExists = function(){
        return self.img.checkIfExist(self.img.localPath);
      }      
      var downloadImage = function() {        
        return self.downloadImage(self.img);        
      }      
      var handleOriginal = function(exists){
        // console.log("original")
        if(exists){
          // console.log("existe")
          return new Promise(function(resolve, reject){      
            resolve();          
          });
        }          
        else return downloadImage().then(self.writeOriginalImage).catch(function(err){console.log("err em downloadImage",err)});
      }
      // RESIZED
      var isResizedExists = function(){
        return self.img.checkIfExist(self.img.resizedPath);
      }   
      var transformResizedImage = function() {
        return self.transformImage(self.img, self.img.localPath, self.img.resizedPath, { width: 1500 });
      }   
      var handleResized = function(exists){
        // console.log("resized")
        if(exists){
          // console.log("existe")
          return new Promise(function(resolve, reject){      
            resolve();
          });
        } else return transformResizedImage();  
      }
      // THUMBNAIL
      var isThumbnailExists = function(){
        return self.img.checkIfExist(self.img.thumbnailPath);
      }
      var transformThumbnailImage = function() {
        return self.transformImage(self.img, self.img.resizedPath, self.img.thumbnailPath, { width: 100, height: 100 });
      }
      var handleThumbnail = function(exists) {
        // console.log("thumbnail")
        if(exists){
          // console.log("existe")
          return new Promise(function(resolve, reject){      
            resolve();          
          });
        } else return transformThumbnailImage();          
      }      

      isOriginalExists()
        .then(handleOriginal).catch(error)        
        .then(isResizedExists).catch(error)
        .then(handleResized).catch(error)  
        .then(isThumbnailExists).catch(error)      
        .then(handleThumbnail).catch(error)
        .then(done).catch(error);          
    });    
  };
  function Image(img) {            
    this.raw = img;    
    this.original = img.original;
    this.local = img.local;
    this.resized = img.resized;
    this.thumbnail = img.thumbnail;
    this.localPath = __dirname + "/../../client"+this.local;
    this.thumbnailPath = __dirname + "/../../client"+this.thumbnail;
    this.resizedPath = __dirname + "/../../client"+this.resized;
  }  

  Image.prototype.checkIfExist = function(path) {
    var self = this;
    return new Promise(function(resolve, reject){
      fs.exists(path, function(exists){
        resolve(exists);        
      });
    });
  }
  Specimen.remoteMethod(
    'downloadImages',
    {
      http: {path: '/downloadImages', verb: 'get'},
      accepts: [
        // {arg:'download'}
        {arg: 'base', type: 'string', required:true}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  Specimen.cleanDB = function(cb) {
    Specimen.destroyAll(function (err,callback) {
      cb(err,callback);
    });
  };
  Specimen.getCollection = function(code, cb) {
    Specimen.getApp(function(err, app){
      if (err) throw new Error(err);
      var Collection = app.models.Collection;
      var filter = {"dwc\:collectionCode.value": code};
      Collection.find({where: filter}, function(err, collection){
        if (err) throw new Error(err);
        cb(null, collection);
      });
    });
  };
  Specimen.remoteMethod(
    'cleanDB',
    {
      http: {path: '/clean', verb: 'get'},
      accepts: [
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  Specimen.remoteMethod(
    'getCollection',
    {
      http: {path: '/getCollection', verb: 'get'},
      accepts: [
        {arg: 'code', type: 'string', required:true}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  Specimen.remoteMethod(
    'inputFromURL',
    {
      http: {path: '/xlsx/inputFromURL', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'string', required:true, description: 'link para tabela de espécimes'},
        {arg: 'language', type: 'string', required:true, description: 'en-US, pt-BR ou es-ES'},
        {arg: 'base', type: 'string', required:true, description: 'eco ou taxon'}
       // {arg: 'redownload', type: 'boolean', required:false, description: 'true para baixar todas as imagens. false para baixar somente imagens novas. default: false', default: false}
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
      /*if(toString(line[idIndexes[j]])=='')
      return null;*/
      idValue = idValue+":"+ String(line[idIndexes[j]]).trim();
    };
    if (idValue == ":::")
      return null;
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
    var Dataset = Specimen.app.models.Dataset;
    var dataset = {};
    dataset.id = name;
    dataset.urlSource = url;
    dataset.localSource = path;
    dataset.type = "Specimen";
    Dataset.upsert(dataset,function (err,instance) {
      if (err) throw new Error(err);
      //console.log("Dataset saved: "+instance.id);
    });
  }
  function convertDMSCoordinatesToDecimal(str) {
    if(str==""){
      return "";
    }
    var parsed = DMSCoordinateParser(str);;
    if ((parsed.direction == "S" ||
    parsed.direction == "W" ||
    parsed.direction == "N" ||
    parsed.direction == "E") &&
    isNumeric(parsed.degrees) &&
    isNumeric(parsed.minutes) &&
    isNumeric(parsed.seconds)) {
      return parsedDMSCoordinateToDecimal(parsed.degrees, parsed.minutes, parsed.seconds, parsed.direction);
    }else{
      return str;
    }
  };
  function parsedDMSCoordinateToDecimal (degrees, minutes, seconds, direction) {
    var dd = parseFloat(degrees) + parseFloat(minutes)/60 + parseFloat(seconds)/(60*60);
    if (direction == "S" || direction == "W") {
      dd = dd * -1;
    } // Don't do anything for N or E
    return dd;
  }
  function DMSCoordinateParser (coordinate){
    var r = {};
    r.degrees = "";
    r.minutes = "";
    r.seconds = "";
    var directionPosition = coordinate.toUpperCase().search(/S|W|N|E/);

    r.direction = coordinate.substring(directionPosition,directionPosition+1);
    var i = 0;
    var d = 0;
    while(d<3){
      var s = coordinate.substring(i,coordinate.length).search(/[0-9]|\./);
      if(s==0){
        //Number
        r.degrees += d==0? coordinate.substring(i,i+1):"";
        r.minutes += d==1? coordinate.substring(i,i+1):"";
        r.seconds += d==2? coordinate.substring(i,i+1):"";
        i++;
      }else{
        // Non-Number
        i++;
        d++;
      }
    }
    return r;
  }
  function isNumeric (str){
    return validator.isFloat(str);
  };
};
