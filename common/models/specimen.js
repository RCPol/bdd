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
    SpecimenCollection.aggregate([
      { $match: queryMongo},
      { $group: {
        _id: '$'+prefix+field+'.value',
        count: {$sum:1}
        }
      }
    ], function (err, states) {          
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
              console.log("Apagado!")
              var data = d.values;  
              var schema = data[0]; //define o schema
              var class_ = data[1]; //define a classe
              var terms = data[2]; //define o termo
              // var category = data[3];
              var label = data[4]; //define o rotulo      
              data =  data.slice(5,data.length); //recebe a quantidade de dados da planilha      
              var response = {}; //resposta de execução
              response.count = 0;      
              var queue = async.queue(function(rec, callback){ //para cada linha lida salve os dados        
                  var line = rec.line;          
                  async.parallel([
                    function(callbackSave) {
                      // console.log("start en-US",line);
                      //para salvar em  inglês
                      saveRecord(base, language,"en-US",line, schema, class_, terms, function() {
                        // console.log("finish en-US");
                        callbackSave();
                      });
                    },
                    function(callbackSave) {
                      // console.log("start pt-BR", line);
                      //para salvar em português
                      saveRecord(base, language,"pt-BR",line, schema, class_, terms, function() {
                        // console.log("finish pt-BR");
                        callbackSave();
                      });
                    },
                    function(callbackSave) {
                      // console.log("start es-ES",line);
                      //para salvar em espanhol
                      saveRecord(base, language,"es-ES",line, schema, class_, terms, function() {
                        // console.log("finish es-ES");
                        callbackSave();
                      });
                    }
                  ],function done() {
                    console.log("COUTING: ",response.count++);
                    callback(); //retorno da função
                  });             
              },3);
              queue.drain(function() {
                //executa o download das image
              // downloadImages(downloadQueue, redownload);
                console.log("Done.");
                for (var key in logs) {
                  console.log(logs[key]);
                }          
              });
              console.log("SIZE: ",data.length);
              data.forEach(function(line) {
                if(line[1] && line[2] && line[3]){          
                  queue.push({line:line});          
                }          
              });
              cb(null, "Loading");
            });
          });
    });







    //substitui a url da imagem
    // url = url.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
    // var name = defineName(url); //define o nome da url
    // if(name==null)
    //   cb("Invalid XLSX file.",null);
    // var path = __dirname +"/../../uploads/"+name+".xlsx"; //define o caminho do arquivo
    // console.log("1",path);
    // saveDataset(name,url,path); //salva os dados
    // //ler o arquivo da planilha
    // var w = fs.createWriteStream(path).on("close",function (argument) {
    //   console.log("Apagando...")
    //   Specimen.destroyAll({base:base},function(err,d){
    //     console.log("Apagado!")
    //     var data = xlsx.parse(path)[0].data; //recebe os dados      
    //     var schema = data[0]; //define o schema
    //     var class_ = data[1]; //define a classe
    //     var terms = data[2]; //define o termo
    //     // var category = data[3];
    //     var label = data[4]; //define o rotulo      
    //     data =  data.slice(5,data.length); //recebe a quantidade de dados da planilha      
    //     var response = {}; //resposta de execução
    //     response.count = 0;      
    //     var queue = async.queue(function(rec, callback){ //para cada linha lida salve os dados        
    //         var line = rec.line;          
    //         async.parallel([
    //           function(callbackSave) {
    //             // console.log("start en-US",line);
    //             //para salvar em  inglês
    //             saveRecord(base, language,"en-US",line, schema, class_, terms, function() {
    //               // console.log("finish en-US");
    //               callbackSave();
    //             });
    //           },
    //           function(callbackSave) {
    //             // console.log("start pt-BR", line);
    //             //para salvar em português
    //             saveRecord(base, language,"pt-BR",line, schema, class_, terms, function() {
    //               // console.log("finish pt-BR");
    //               callbackSave();
    //             });
    //           },
    //           function(callbackSave) {
    //             // console.log("start es-ES",line);
    //             //para salvar em espanhol
    //             saveRecord(base, language,"es-ES",line, schema, class_, terms, function() {
    //               // console.log("finish es-ES");
    //               callbackSave();
    //             });
    //           }
    //         ],function done() {
    //           console.log("COUTING: ",response.count++);
    //           callback(); //retorno da função
    //         });             
    //     },1);
    //     queue.drain(function() {
    //       //executa o download das image
    //     // downloadImages(downloadQueue, redownload);
    //       console.log("Done.");
    //       for (var key in logs) {
    //         console.log(logs[key]);
    //       }          
    //     });
    //     console.log("SIZE: ",data.length);
    //     data.forEach(function(line) {
    //       if(line[1] && line[2] && line[3]){          
    //         queue.push({line:line});          
    //       }          
    //     });
    //     cb(null, "Loading");
    //   });
    // });    
    // request(url).pipe(w);
  };
  function saveRecord(base, originalLanguage,language,line, schema, class_, terms, callback) {
    var Schema = Specimen.app.models.Schema; //usando o schema
    var c = 0;
    var record = {}; //dados as serem gravados no banco    
    record.id = Specimen.app.defineSpecimenID(language,line[1],line[2],line[3]); //definição do id do specimen
    if(record.id){   //se o id existir execute
      //para termo da planilha
      async.each(terms, function(term, callbackCell){
        c++;
        //se existe o termo e a linha existe da amostra
        if(term && toString(line[c]) != ""){
          var schemaId = Specimen.app.defineSchemaID(base, language,schema[c],class_[c],terms[c]); //define o id do esquema          
          record.language = language; //recebe a linguagem
          record.originalLanguage = originalLanguage;  //linguagem original
          record[schemaId] = {value:toString(line[c])}; //recebe o valor da linha que esta sendo lida
          record.base = base;
          if(schemaId){ //se existe id definido no esquema
            Schema.findById(schemaId,function(err,schema) { //busca o id que está no schema
              if(err) //se existe erro na busca
                console.log(err);
              if(schema){ //se existe schema
                var value = toString(record[schema.id].value); //pega o valor do schema
                record[schema.id] = schema;
                // CATEGORICAL DESCRIPTOR
                if(schema["class"]=="CategoricalDescriptor" ){                  
                  record[schema.id].value = value;
                  record[schema.id].states = [];
                  async.each(value.split("|"), function(sValue, callbackState) {
                    var stateValue = titleCase(sValue.trim());
                    if(schema["term"] == "vegetalFormationType" && stateValue == "Cerrado") console.log("stateValue: ",stateValue)
                    // if(language==originalLanguage){
                    // //  SAME LANGUAGE
                    //   if(stateValue.length>0){
                    //     Schema.findOne({where:{base:base,language:originalLanguage,class:"State",field:schema.field,state:stateValue}}, function(err,state) {
                    //       if(state){
                    //         record[schema.id].states.push(state.toJSON());
                    //       }else {
                    //         logs[hash.MD5("STATE NOT FOUND Field: "+schema.field+"State: "+stateValue)] = "STATE NOT FOUND\tField: "+schema.field+"\tState: "+stateValue;
                    //       }
                    //       callbackState();
                    //     });
                    //   } else {
                    //     logs[hash.MD5("EMPTY STATE Field: "+schema.field)] = "STATE NOT FOUND\tField: "+schema.field;
                    //     callbackState();
                    //   }
                    // } else {
                    // DIFFERENT LANGUAGES
                      var schemaIdOriginal = Specimen.app.defineSchemaID(base, originalLanguage,schema.schema,schema["class"],schema.term);
                      if(schema["term"] == "vegetalFormationType" && stateValue == "Cerrado") console.log("schemaIdOriginal: ",schemaIdOriginal)
                      Schema.findById(schemaIdOriginal,function(err,schemaOriginal) { 
                        if(schema["term"] == "vegetalFormationType" && stateValue == "Cerrado") console.log("schemaOriginal: ",schemaOriginal)                       
                        if(schemaOriginal){

                          Schema.findOne({where:{base:base, language:originalLanguage, field:schemaOriginal.field,state:stateValue}}, function(err,state) {                            
                            if(state){                              
                              var id = Schema.app.defineSchemaID(base,language, state.schema, state.class, state.term);
                              if(schema["term"] == "vegetalFormationType" && stateValue == "Cerrado") console.log("id: ",id);
                              Schema.findById(id,function(err,translatedState) {
                                if(schema["term"] == "vegetalFormationType" && stateValue == "Cerrado") console.log("translatedState: ",translatedState)
                                if(translatedState){
                                  record[schema.id].states.push(translatedState.toJSON());
                                } else{
                                  logs[hash.MD5("STATE NOT FOUND "+"Field: "+schema.field+"State: "+stateValue)] = "STATE NOT FOUND\tField: "+schema.field+"\tState: "+stateValue;
                                }
                                callbackState();
                              });
                            } else {
                              logs[hash.MD5("STATE NOT FOUND Field: "+schemaOriginal.field+"State: "+stateValue)] = "STATE NOT FOUND\tField: "+schemaOriginal.field+"\tState: "+stateValue;
                              callbackState();
                            }
                          });
                        } else {
                          console.log("NOT FOUND: ",schemaIdOriginal);
                          callbackState();
                        }
                      });
                    // }
                  },function doneState() {
                    callbackCell();
                  });
                // OTHER FIELDS
                } else {
                record[schema.id].value = value;
                if(value.split("|").length>1){
                  record[schema.id].values = value.split("|").map(function(item) {
                    return item.trim();
                  });                  
                } else {
                  record[schema.id].values = [value];
                }
                // EVENT DATE
                if(schema.term=="eventDate"){
                  var parsedDate = record[schema.id].value.split("-");
                  if(parsedDate.length==3){
                      record[schema.id].day = {value:parsedDate[2].trim()=="00"||parsedDate[0].trim()=="0"?null:parsedDate[0].trim()};
                      record[schema.id].month = {value:parsedDate[1].trim()=="00"||parsedDate[1].trim()=="0"?null:parsedDate[1].trim()};
                      record[schema.id].year = {value:parsedDate[0].trim()=="0000"||parsedDate[2].trim()=="00"?null:parsedDate[2].trim()};
                  } else {
                    record[schema.id].day = {};
                    record[schema.id].month = {};
                    record[schema.id].year = {};
                    logs[hash.MD5("INVALID FORMAT OF DATE Field: "+schema.field+"State: "+record[schema.id].value)] = "INVALID FORMAT OF DATE\tField: "+schema.field+"\tState: "+record[schema.id].value;
                  }
                } else
                  // IMAGE
                  //encontra class image no schema
                  if(schema["class"]=="Image"){ //se encontrar a classe da imagem
                    //recebe um vetor de images
                    record[schema.id].images = [];
                    toString(record[schema.id].value).trim().split("|").forEach(function(img,i){   
                      if(img && img.length>0){
                        var imageId = base+"-"+img.split("?id=")[1];
                        if(typeof imageId == "undefined") imageId = base+"-"+img.split("file/d/")[1];                        

                        var image = {
                          id: imageId,                          
                          original: "https://docs.google.com/uc?id="+imageId.trim(),
                          local: "/images/" + imageId + ".jpeg", //atribui a url onde vai ser salva a imagem
                          resized: "/resized/" + imageId + ".jpeg", //atribui a url onde vai ser salva a imagem
                          thumbnail: "/thumbnails/" + imageId + ".jpeg" //atribui a url onde vai ser salva a imagem
                        }
                        if(imageId)
                          record[schemaId].images.push(image);
                      }
                    });
                  } else
                  // REFERENCE
                  if(schema["class"]=="Reference"){
                    record[schema.id].references = [];
                    record[schema.id].value.split("|").forEach(function (ref) {
                      record[schema.id].references.push(ref.trim());
                    });
                  } else
                  // INTERACTION
                  if(schema["class"]=="Interaction"){
                    record[schema.id].species = [];
                    record[schema.id].value.split("|").forEach(function (sp) {
                      record[schema.id].species.push(sp.trim());
                    });
                  } else
                  // FLOWERING PERIOD
                  if(schema.term=="floweringPeriod"){
                    record[schema.id].months = [];
                    record[schema.id].value.split("|").forEach(function (month) {
                      record[schema.id].months.push(month.trim());
                    });
                  } else
                  // LATITUDE
                  if(schema.term=="decimalLatitude"){
                    var converted = convertDMSCoordinatesToDecimal(record[schema.id].value.toUpperCase().replace("O","W").replace("L","E"));
                    if(converted!=record[schema.id].value){
                      record[schema.id].rawValue = record[schema.id].value;
                      record[schema.id].value = converted;
                    }
                  } else
                  // LONGITUDE
                  if(schema.term=="decimalLongitude"){
                    var converted = convertDMSCoordinatesToDecimal(record[schema.id].value.toUpperCase().replace("O","W").replace("L","E"));
                    if(converted!=record[schema.id].value){
                      record[schema.id].rawValue = record[schema.id].value;
                      record[schema.id].value = converted;
                    }
                  }
                  callbackCell();
              }
            } else {
                callbackCell();
              }
            });
          } else {
            callbackCell();
          }
        } else {
          callbackCell();
        }
      },function done() {
        var Collection = Specimen.app.models.Collection;
        var sID = record.id.split(":");
        var cID = sID[0]+":"+sID[1]+":"+sID[2];   
        console.log(sID);
        console.log(cID);             
        Collection.findById(cID, function(err,collection) {          
          if(err) console.log("ERROR FIND COLLECTION: ",err);          
          record.collection = collection;
          
          Specimen.upsert(record,function (err,instance) {
            if(err){
              console.log("ERROR: ",err);              
              console.log("RECORD: ",record);
            }              
            callback();
          });
        });        
      });
    } else {
      console.log("Cannot define an ID for specimen: ",language,line[1],line[2],line[3]);
      callback();
    }
  }

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
      console.log("imagem existe")   
      resolve();      
    });
  }
  ImageDownloader.prototype.downloadImage = function(img) {
    var self =  this;    
    return new Promise(function(resolve, reject){      
      console.log("imagem nao existe");            
      request(img.original, {encoding: 'binary'}, function(err, response, body){
        if (err){          
            console.log("Error to download "+img.original);                        
            reject({img:img.raw});
        } else {
          console.log("imagem baixada")
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
    return new Promise(function(resolve, reject){
      fs.writeFile("client"+img.local, img.downloadedContent, 'binary', function(err){
        if(err){          
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
        console.log(err)
        if(err.img){                            
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
        console.log("original")
        if(exists){
          console.log("existe")
          return new Promise(function(resolve, reject){      
            resolve();          
          });
        }          
        else return downloadImage().then(self.writeOriginalImage);
      }
      // RESIZED
      var isResizedExists = function(){
        return self.img.checkIfExist(self.img.resizedPath);
      }   
      var transformResizedImage = function() {
        return self.transformImage(self.img, self.img.localPath, self.img.resizedPath, { width: 1500 });
      }   
      var handleResized = function(exists){
        console.log("resized")
        if(exists){
          console.log("existe")
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
        console.log("thumbnail")
        if(exists){
          console.log("existe")
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
