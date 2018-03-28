var readChunk = require('read-chunk'); 
var imageType = require('image-type');  
var xlsx = require('node-xlsx');
var hash = require('object-hash');
var request = require('request');
var async = require('async');
var fs = require('fs');
var qt = require('quickthumb');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

const requestImageSize = require('request-image-size');

module.exports = function(Schema) {  
  Schema.getSpreadsheetData = function(id, language, cb) {            
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
        range: 'glossary.'+language+'!A:K'        
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
  Schema.remoteMethod(     
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

  Schema.checkUrl = function(url, cb) {  
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
  Schema.remoteMethod(     
    'checkUrl',
    {
      http: {path: '/checkUrl', verb: 'get'},
          accepts: [    
        {arg: 'url', type: 'string', required:true}        
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  Schema.getImagesValues = function(id, language, cb) {
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
        range: 'glossary.'+language+'!A:J'        
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
          var header = rs.splice(0,1);
          var images = [];
          rs.forEach(function(line, index){              
                if((line[1] == "CategoricalDescriptor" || line[1] == "State")  && isCompleteValue(line[9])) {                  
                  var img = {
                    header: header[0][9],
                    value: line[9],
                    row: index+2
                  };
                  images.push(img);
                }                                                                     
          });		                  
          cb(null,images);
        });
      });
  }

  Schema.remoteMethod(     
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

  function GoogleSpreadsheetImportDQ() {
    this.DQStatus = {};
  }
  GoogleSpreadsheetImportDQ.prototype.schemaConformity =  function(sheet) {
    var self = this;        
    var reference = ["SCHEMA","CLASS","TERM","Category","Field","State","Definition","Reference","Image","Credit photos"];  
    self.DQStatus.schemaConformity = self.DQStatus.schemaConformity?self.DQStatus.schemaConformity:[];
    for (var i = 0; i < reference.length; i++) {
      if(reference[i].toUpperCase().trim()==sheet.header[i].toUpperCase().trim()){
          self.DQStatus.schemaConformity.push({
            name: "Schema Conformity",
            ie: "Sheet Schema",
            dr:{
              id: sheet.sheetId,
              value: sheet.header[i],              
              rt: "dataset"
            },         
            description: "If all the columns of the sheet match with the defined schema, it is conform to the sheet schema, otherwise, it is not conform to the sheet schema.",
            details: {
              technical: {columnIndex:i},
              language: sheet.language,
              nontechnical: 'The column ['+i+'] "'+sheet.header[i]+'" is equal "'+reference[i]+'"'
            },
            result: "CONFORM"
          });          
      } else {
        self.DQStatus.schemaConformity.push({
          name: "Schema Conformity",
          ie: "Sheet Schema",
          dr:{
            id: sheet.sheetId,
            value: sheet.header[i],
            language: sheet.language,
            rt: "dataset"
          },         
          description: "If all the columns of the sheet match with the defined schema, it is conform to the sheet schema, otherwise, it is not conform to the sheet schema.",
          details: {
            technical: {columnIndex:i},
            language: sheet.language,
            nontechnical: 'The column ['+i+'] "'+sheet.header[i]+'" should be "'+reference[i]+'"'
          },
          result: "NOT CONFORM"
        }); 
      }      
    }        
    return this;   
  }
  Schema.googleSpreadsheetImport = function(id,cb){  
    var spreadsheet  =  new GoogleSpreadsheetImport(id);  
    spreadsheet.authorize();
    spreadsheet.on('authorized',function() {
      async.series(
        [
          function getInfo(cont) {
            spreadsheet.getInfo(cont);
          },
          function getData(cont){
            async.forEach(Object.keys(spreadsheet.info.sheets),function(item,callback) {
              spreadsheet.getData(item,callback);
            },function doneForEach() {
              cont();
            });            
          },
          function getDQAssessment(cont){
            var dq = new GoogleSpreadsheetImportDQ();
            Object.keys(spreadsheet.info.sheets).forEach(function(key) {
              var sheet = spreadsheet.info.sheets[key];      
              dq.schemaConformity(sheet);                      
            });            
            spreadsheet.info.DQStatus = dq.DQStatus;              
            cont();
          },
          function updates(cont) {            
              spreadsheet.updateTitle();
              spreadsheet.DQFeedback();
              // ... other updates
              spreadsheet.commit(cont);                            
          },          
        ],
        function done() {
          cb(null,spreadsheet.info);
        }
      );      
    });
    spreadsheet.on('unauthorized',function() {
      cb("Unauthorized spreadsheet: "+id, id);
    });
  }
  function GoogleSpreadsheetImport(id) {
    EventEmitter.call(this);
    var self = this;
    self.id = id;    
    self.info = {};
    self.data = {};
    self.requests = [];
  }
  util.inherits(GoogleSpreadsheetImport, EventEmitter);

  GoogleSpreadsheetImport.prototype.authorize =  function() {
    var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];   
    var key = require('key.json');
    var self = this;    
    self.auth = new google.auth.JWT(key.client_email,null,key.private_key,[SCOPES],null);    
    self.auth.authorize(function(err,tokens) {
      if(!err && tokens){
        self.service = google.sheets('v4');        
        self.emit("authorized");
      } else {
        self.emit("unauthorized");
      }
    });
    return this;   
  }
  GoogleSpreadsheetImport.prototype.DQFeedback =  function(){
    var self = this; 
    // var action = {
    //   "updateSpreadsheetProperties": {
    //     "properties": {"title": "["+self.info.base+"] "+self.info.title+" [uploaded at "+self.info.uploaded+"]"},
    //     "fields": "title"
    //   }
    // };    
    // self.requests.push(action);    
  }
  GoogleSpreadsheetImport.prototype.getData =  function(lang,cb) {    
    var self = this;       
    self.service.spreadsheets.values.get({
      auth: self.auth,
      spreadsheetId: self.id,
      range: self.info.sheets[lang].title+'!A1:JJ'      
    }, function(err, rs) {
      if (err) {
        self.info.error = 'The API returned an error: ' + err;    
        cb();
        return;          
      }      
      self.data[lang] = { values:rs.values, 
                          header:rs.values[0]
                        };            
      self.info.sheets[lang].rows = self.data[lang].values.length;      
      self.info.sheets[lang].header = self.data[lang].header;      
      cb();
    }); 
  }  
  GoogleSpreadsheetImport.prototype.getInfo =  function(cb) {    
    var self = this;       
    self.service.spreadsheets.get({
      auth: self.auth,
      spreadsheetId: self.id
    }, function(err, rs) {
      if (err) {
        self.info.error = 'The API returned an error: ' + err;    
        cb();
        return;          
      }      
      var currentTitle = rs.properties.title;
      self.info.title = currentTitle.split("]")[1].split("[")[0].trim();        
      self.info.base = currentTitle.split("]")[0].split("[")[1].trim();
      self.info.sheets = {};
      rs.sheets.forEach(function(item) {
        var language = item.properties.title.split(".")[1].trim();        
        self.info.sheets[language] = {};
        self.info.sheets[language].language = language;
        self.info.sheets[language].sheetId = item.properties.sheetId; 
        self.info.sheets[language].title = item.properties.title;                
      });
      self.info.uploaded = new Date();
      cb();
    }); 
  }  
  GoogleSpreadsheetImport.prototype.updateTitle =  function(){
    var self = this; 
    var action = {
      "updateSpreadsheetProperties": {
        "properties": {"title": "["+self.info.base+"] "+self.info.title+" [uploaded at "+self.info.uploaded+"]"},
        "fields": "title"
      }
    };    
    self.requests.push(action);    
  }
  GoogleSpreadsheetImport.prototype.commit = function(cb){    
    var self = this;
    self.service.spreadsheets.get({
      auth: self.auth,
      spreadsheetId: self.id        
    }, function(err, rs) {
      if (err) {
        self.info.error = 'The API returned an error: ' + err;    
        cb();
        return;
      }    
      var batchUpdateRequest = {requests: self.requests}
      self.service.spreadsheets.batchUpdate({
        auth: self.auth,
        spreadsheetId: self.id,        
        resource: batchUpdateRequest
      }, function(err, response) {
        if (err) {
          self.info('The API returned an error: ' + err);    
          cb();
          return;
        } cb();
      });
    }); 
  }
  function titleCase(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }
  Schema.inputFromURL = function(id, language, base, cb) {
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
            range: 'glossary.'+language+'!A:K'        
          }, function(err, rs) {
            if (err){
              console.log('The API returned an error: ' + err);    
              return;          
            }                    
            rs.values.shift();
            Schema.destroyAll({base:base, language:language},function(err,d){     
              var response = {};     
              response.count = 0;
              async.each(rs.values, function iterator(line, callback){            
                //line é o campo da tabela
                var record = {};
                record.id = Schema.app.defineSchemaID(base,language,line[0],line[1],line[2],line[3]);
                record.order = response.count;
                record.base = base;
                if(record.id){
                  response.count++;
                  record.schema = toString(line[0]).trim();
                  record.class = toString(line[1]).trim();
                  record.term = toString(line[2]).trim();
                  if (toString(line[3]).trim().length>0) {
                    record.state = toString(line[3]).trim();
                  }
                  if (toString(line[4]).trim().length>0) {
                    record.category = titleCase(toString(line[4]).trim());
                  }
                  if (toString(line[5]).trim().length>0) {
                    record.field = titleCase(toString(line[5]).trim());
                  }
                  if (toString(line[6]).trim().length>0) {
                    record.vocabulary = titleCase(toString(line[6]).trim());
                  }
                  if (toString(line[7]).trim().length>0) {
                    record.definition = toString(line[7]).trim();
                  }
                  if (toString(line[8]).trim().length>0) {
                    record.references = [];
                    toString(line[8]).trim().split("|").forEach(function (ref) {
                      record.references.push(ref.trim());
                    });
                  }
                  if (toString(line[10]).trim().length>0) {
                    record.credits = [];
                    toString(line[10]).trim().split("|").forEach(function (ref) {
                      record.credits.push(ref.trim());
                    });
                  }                  
                  // if (toString(line[10]).trim().length>0) {
                  //   record.images = [];
                  //   toString(line[10]).trim().split("|").forEach(function (context) {
                  //     record.images.push(context.trim());
                  //   });
                  // }
                  //ler o campo das imagens
                  if (toString(line[9]).trim().length>0) {
                    record.images = [];
                    toString(line[9]).trim().split("|").forEach(function (img,i) {
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
                      if(imageId)
                        record.images.push(image); //coloca as imagens no vetor
                    });
                    // record.image = record.images[0]; // so pega a primeira imagem
                  }
                  // record.url = "/images/" + record.id + ".jpeg"; //atribui a url onde vai ser salva a imagem
                  // if (record.image != undefined){ //se a imagem tiver definida
                  // record.image = record.image.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
                  //downloadQueue.push({url:record.image, name:record.id}); //vetor vai receber a url da imagem e o id
                  // }
                  record.language = language;
                  //save record in database
                  Schema.upsert(record, function(err, instance){
                    if(err){
                      console.log(err);
                    }
                    callback();
                  });
                } else {
                  console.error("record id could not be generated: ".concat(line[0], " ", line[1], " ", line[2]));
                  callback();
                }
              }, function done(){
                //downloadImages(downloadQueue, redownload); //download das imagens
                console.log("Done.");
                cb(null, response);
              });
            });            
      });
    });
  };  

  // Schema.inputFromURL = function(url, language, base, sheetNumber, cb) {
  //   if(language=="en-US" || language=="pt-BR" || language=="es-ES"){
  //     //definição da url
  //     url = url.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
  //     var name = defineName(url); //nome da url
  //     if(name==null)
  //     cb("Invalid XLSX file.",null);
  //     var path = __dirname +"/../../uploads/"+name+".xlsx"; //diretorio da planilha
  //     saveDataset(name,url,path); //salva dados com a url, nome e diretorio da planilha
  //     //var downloadQueue = []; //vetor de imagens

  //     //Passa o diretorio da planilha a ser lida
  //     var w = fs.createWriteStream(path).on("close",function (argument) {
  //       // Delete all
  //       Schema.destroyAll({base:base, language:language},function(err,d){          
  //         var data = xlsx.parse(path)[sheetNumber || 0].data; //recebe os dados de uma planilha
          
  //         var header = data[0]; //primeira linha da planilha
  //         data =  data.slice(1,data.length); //slice = retorna a quantidade de dados
  //         var response = {}; //array de resposta
  //         response.count = 0;
  //         async.each(data, function iterator(line, callback){            
  //           //line é o campo da tabela
  //           var record = {};
  //           record.id = Schema.app.defineSchemaID(base,language,line[0],line[1],line[2]);
  //           record.order = response.count;
  //           record.base = base;
  //           if(record.id){
  //             response.count++;
  //             record.schema = toString(line[0]).trim();
  //             record.class = toString(line[1]).trim();
  //             record.term = toString(line[2]).trim();
  //             if (toString(line[3]).trim().length>0) {
  //               record.category = titleCase(toString(line[3]).trim());
  //             }
  //             if (toString(line[4]).trim().length>0) {
  //               record.field = titleCase(toString(line[4]).trim());
  //             }
  //             if (toString(line[5]).trim().length>0) {
  //               record.state = titleCase(toString(line[5]).trim());
  //             }
  //             if (toString(line[6]).trim().length>0) {
  //               record.definition = toString(line[6]).trim();
  //             }
  //             if (toString(line[7]).trim().length>0) {
  //               record.references = [];
  //               toString(line[7]).trim().split("|").forEach(function (ref) {
  //                 record.references.push(ref.trim());
  //               });
  //             }
  //             if (toString(line[9]).trim().length>0) {
  //               record.credits = [];
  //               toString(line[9]).trim().split("|").forEach(function (ref) {
  //                 record.credits.push(ref.trim());
  //               });
  //             }
  //             //ler o campo das imagens
  //             if (toString(line[8]).trim().length>0) {
  //               record.images = [];
  //               toString(line[8]).trim().split("|").forEach(function (img,i) {
  //                 // var imageId = record.id.split(":").slice(1).join(":")+":"+i;
  //                 var imageId = base+"-"+img.split("?id=")[1];
  //                 var image = {
  //                   id: imageId,
  //                   original: img.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=").trim(),
  //                   local: "/images/" + imageId + ".jpeg", //atribui a url onde vai ser salva a imagem
  //                   resized: "/resized/" + imageId + ".jpeg", //atribui a url onde vai ser salva a imagem
  //                   thumbnail: "/thumbnails/" + imageId + ".jpeg" //atribui a url onde vai ser salva a imagem
  //                 }
  //                 record.images.push(image); //coloca as imagens no vetor
  //               });
  //               // record.image = record.images[0]; // so pega a primeira imagem
  //             }
  //             // record.url = "/images/" + record.id + ".jpeg"; //atribui a url onde vai ser salva a imagem
  //             // if (record.image != undefined){ //se a imagem tiver definida
  //             // record.image = record.image.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
  //             //downloadQueue.push({url:record.image, name:record.id}); //vetor vai receber a url da imagem e o id
  //             // }
  //             record.language = language;
  //             //save record in database
  //             Schema.upsert(record, function(err, instance){
  //               if(err){
  //                 console.log(err);
  //               }
  //               callback();
  //             });
  //           } else {
  //             console.error("record id could not be generated: ".concat(line[0], " ", line[1], " ", line[2]));
  //             callback();
  //           }
  //         }, function done(){
  //           //downloadImages(downloadQueue, redownload); //download das imagens
  //           console.log("Done.");
  //           cb(null, response);
  //         });
  //       });        
  //     });
  //     request(url).pipe(w);
  //   } else {
  //     cb("invalid language",language);
  //   }
  // };  

  //Método by Raquel
  Schema.downloadImages = function (cb) {
    function error (err){cb(err,null)}
    console.log("serviço chamado");
    var manager = new ImageDownloadManager();
    // define query de consulta de imagens
    var query  = manager.defineQuery();    
    // consulta imagens
    manager.getData(query)    
        // define uma fila com todas as imagens
        .then(manager.defineQueue).catch(error)
        // processa todas as imagens da fila
        .then(manager.processQueue).catch(error)
        // término do processo
        .then(function(){cb(null,"done")}).catch(error);   

    
    // Schema.find({where:{images:{exists:true}},fields:{id:true,images:true}}, function(err, results) {
    //   var queue = async.queue(function(img,callback) {
    //     var downloader = new ImageDownloader();        
    //     downloader.download(img,callback);
    //   },5);

    //   results.forEach(function(rec) {
    //     rec.images.forEach(function(img) {
    //       queue.push(img);
    //     });
    //   });
      // var downloader = new ImageDownloader();
      // downloader.download(queue).on("done",
      //   function() {
      //     console.log("Terminou #"+downloader.count+" em "+(new Date().getTime() - startTime.getTime()));
      //     downloader.log.unshift("Tempo total: "+((new Date().getTime() - startTime.getTime())/1000)+"s");                    
      //     console.log(downloader.log);
      //     cb(null, downloader.log);
      //   }
      // );
    // });

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
      data.forEach(function(rec) {
        rec.images.forEach(function(img) {
          queue.push(img);
        });
      });  
      resolve(queue);
    });    
  }      
  ImageDownloadManager.prototype.getData = function(query) {    
    var self = this;
    return new Promise(function(resolve, reject){
      Schema.find(query, function(err,data){
        if(err) reject(err)        
        else{          
          resolve(data);
        }
      });
    });  
  }  
  ImageDownloadManager.prototype.defineQuery = function() {
    var self = this;
    return {where:{images:{exists:true}},fields:{id:true,images:true}}
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
      request(img.original, {encoding: 'binary',  timeout: 10000}, function(err, response, body){
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
  Schema.remoteMethod(
    'downloadImages',
    {
      http: {path: '/downloadImages', verb: 'get'},
      accepts: [
        // {arg:'download'}
        // {arg: 'download', type: 'boolean', required:true, description: 'true para baixar todas as imagens. false para baixar somente imagens novas. default: false', default: true}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );


  //Define a imagem principal para o glossário
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
    'googleSpreadsheetImport',
    {
      http: {path: '/googleSpreadsheet/import', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'string', required:true}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
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
        {arg: 'id', type: 'string', required:true, description: 'id data tabela do glossário'},
        {arg: 'language', type: 'string', required:true, description: 'en-US, pt-BR or es-ES'},
        {arg: 'base', type: 'string', required:true, description: 'eco or taxon'},        
        //  {arg: 'redownload', type: 'boolean', required:false, description: 'true para baixar todas as imagens. false para baixar somente imagens novas. default: false', default: false}
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
};
