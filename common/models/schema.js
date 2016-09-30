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

module.exports = function(Schema) {
  function titleCase(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }
  Schema.inputFromURL = function(url, language, sheetNumber, cb) {
    if(language=="en-US" || language=="pt-BR" || language=="es-ES"){
      //definição da url
      url = url.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
      var name = defineName(url); //nome da url
      if(name==null)
      cb("Invalid XLSX file.",null);
      var path = __dirname +"/../../uploads/"+name+".xlsx"; //diretorio da planilha
      saveDataset(name,url,path); //salva dados com a url, nome e diretorio da planilha
      //var downloadQueue = []; //vetor de imagens

      //Passa o diretorio da planilha a ser lida
      var w = fs.createWriteStream(path).on("close",function (argument) {
        var data = xlsx.parse(path)[sheetNumber || 0].data; //recebe os dados de uma planilha
        var header = data[0]; //primeira linha da planilha
        data =  data.slice(1,data.length); //slice = retorna a quantidade de dados
        var response = {}; //array de resposta
        response.count = 0;
        async.each(data, function iterator(line, callback){
          //line é o campo da tabela
          var record = {};
          record.id = Schema.app.defineSchemaID(language,line[0],line[1],line[2]);
          record.order = response.count;
          if(record.id){
            response.count++;
            record.schema = toString(line[0]).trim();
            record.class = toString(line[1]).trim();
            record.term = toString(line[2]).trim();
            if (toString(line[3]).trim().length>0) {
              record.category = titleCase(toString(line[3]).trim());
            }
            if (toString(line[4]).trim().length>0) {
              record.field = titleCase(toString(line[4]).trim());
            }
            if (toString(line[5]).trim().length>0) {
              record.state = titleCase(toString(line[5]).trim());
            }
            if (toString(line[6]).trim().length>0) {
              record.definition = toString(line[6]).trim();
            }
            if (toString(line[7]).trim().length>0) {
              record.references = [];
              toString(line[7]).trim().split("|").forEach(function (ref) {
                record.references.push(ref.trim());
              });
            }
            if (toString(line[9]).trim().length>0) {
              record.credits = [];
              toString(line[9]).trim().split("|").forEach(function (ref) {
                record.credits.push(ref.trim());
              });
            }
            //ler o campo das imagens
            if (toString(line[8]).trim().length>0) {
              record.images = [];
              toString(line[8]).trim().split("|").forEach(function (img,i) {
                var imageId = record.id.split(":").slice(1).join(":")+":"+i;
                var image = {
                  id: imageId,
                  original: img.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=").trim(),
                  local: "/images/" + imageId + ".jpeg", //atribui a url onde vai ser salva a imagem
                  resized: "/resized/" + imageId + ".jpeg", //atribui a url onde vai ser salva a imagem
                  thumbnail: "/thumbnails/" + imageId + ".jpeg" //atribui a url onde vai ser salva a imagem
                }
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
      request(url).pipe(w);
    } else {
      cb("invalid language",language);
    }
  };
  // Schema.inputFromURL = function(url, language, sheetNumber, redownload, cb) {
  //   if(language=="en-US" || language=="pt-BR" || language=="es-ES"){
  //     url = url.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
  //     var name = defineName(url);
  //     if(name==null)
  //       cb("Invalid XLSX file.",null);
  //     var path = __dirname +"/../../uploads/"+name+".xlsx";
  //     saveDataset(name,url,path);
  //     var downloadQueue = [];
  //
  //     var w = fs.createWriteStream(path).on("close",function (argument) {
  //       var data = xlsx.parse(path)[sheetNumber || 0].data;
  //       var schema = data[0];
  //       var class_ = data[1];
  //       var term = data[2];
  //       var label = data[3];
  //       data =  data.slice(4,data.length);
  //       var rs = {};
  //       rs.count = 0;
  //       async.each(data, function iterator(line, callback){
  //         var record = {};
  //         record.id = line[1] && line[1].trim().length>0?line[1].trim():null;
  //         record.order = rs.count;
  //         // rs.count ++;
  //         if(record.id){
  //           rs.count++;
  //           // If State is empty
  //           if (line[4] && line[4].trim().length==0){
  //             for(var c = 2; c < term.length; c++){
  //               if(line[c]){
  //                 var field = toString(schema[c])+":"+toString(term[c]);
  //                 var current = {};
  //                 current.schema = toString(schema[c]);
  //                 current.class = toString(class_[c]);
  //                 current.term = toString(term[c]);
  //                 current.label = toString(label[c]);
  //                 current.value = toString(line[c]);
  //                 // REFERENCE
  //                 if(current.class=="Reference"){
  //                   current.references = [];
  //                   current.value.split("|").forEach(function (ref) {
  //                     current.references.push(ref.trim());
  //                   });
  //                 }
  //                 // IMAGE
  //                 if(current.class=="Image"){
  //                   current.images = [];
  //                   current.value.split("|").forEach(function (image) {
  //                     current.images.push(image.trim());
  //                   });
  //                 }
  //                 // Check if exist field with the same key
  //                 if(record[field]){
  //                   // Check if the field is the is an Array
  //                   if(Object.prototype.toString.call( record[field] ) === '[object Array]' ){
  //                       record[field].push(current);
  //                   } else {
  //                     var old = Object.create(record[field]);
  //                     record[field] = [];
  //                     record[field].push(old);
  //                     record[field].push(current);
  //                   }
  //                 } else {
  //                   record[field] = current;
  //                 }
  //               }
  //             }
  //             Schema.upsert(record,function (err,instance) {
  //               if(err)
  //                 console.log(err);
  //               callback();
  //             });
  //           } else {
  //           // adicionar estados
  //             for(var c = 2; c < term.length; c++){
  //               if(line[c]){
  //                 var field = toString(schema[c])+":"+toString(term[c]);
  //                 var current = {};
  //                 current.schema = toString(schema[c]);
  //                 current.class = toString(class_[c]);
  //                 current.term = toString(term[c]);
  //                 current.label = toString(label[c]);
  //                 current.value = toString(line[c]);
  //                 // REFERENCE
  //                 if(current.class=="Reference"){
  //                   current.references = [];
  //                   current.value.split("|").forEach(function (ref) {
  //                     current.references.push(ref.trim());
  //                   });
  //                 }
  //                 // IMAGE
  //                 if(current.class=="Image"){
  //                   current.images = [];
  //                   current.value.split("|").forEach(function (image) {
  //                     current.images.push(image.trim());
  //                   });
  //                 }
  //                 // Check if exist field with the same key
  //                 if(record[field]){
  //                   // Check if the field is the is an Array
  //                   if(Object.prototype.toString.call( record[field] ) === '[object Array]' ){
  //                       record[field].push(current);
  //                   } else {
  //                     var old = Object.create(record[field]);
  //                     record[field] = [];
  //                     record[field].push(old);
  //                     record[field].push(current);
  //                   }
  //                 } else {
  //                   record[field] = current;
  //                 }
  //               }
  //             }
  //             if (!line[2]) {
  //               line[2] = "";
  //             }
  //             if (!line[3]) {
  //               line[3] = "";
  //             }
  //             if (!line[4]) {
  //               line[4] = "";
  //             }
  //             // record.id = hash.MD5(line[2].trim().toLowerCase()+":"+line[3].trim().toLowerCase()+":"+line[4].trim().toLowerCase());
  //             // console.log(line[2].trim().toLowerCase()+":"+line[3].trim().toLowerCase()+":"+line[4].trim().toLowerCase()+" "+record.id);
  //             record.image = line[7];
  //             record.url = "/images/" + record.id + ".jpeg";
  //             if (record.image != undefined){
  //               record.image = record.image.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
  //               downloadQueue.push({url:record.image, name:record.id});
  //             }
  //           }
  //           Schema.findById(record.id, function(err, instance){
  //             if(err){
  //                 console.log(err);
  //             }
  //             if(instance){
  //               instance[language] = record;
  //               delete instance[language].id;
  //               instance.save(function(e,d) {
  //                 callback();
  //               });
  //             } else {
  //               var multiLangRecord = {};
  //               multiLangRecord.id = record.id;
  //               multiLangRecord[language] = record;
  //               delete multiLangRecord[language].id    ;
  //               Schema.create(multiLangRecord, function(err,ok) {
  //                 callback();
  //               });
  //             }
  //           });
  //         } else {
  //           callback();
  //         }
  //       }, function done(){
  //         downloadImages(downloadQueue, redownload);
  //         cb(null, rs);
  //       });
  //     });
  //     request(url).pipe(w);
  //   } else {
  //     cb("invalid language",language)
  //   }
  // };


  //Método by Raquel
  Schema.downloadImages = function (cb) {
    //Schema aqui vai realizar uma consulta no banco de dados pegando os valores chave e valor do registro.
    //Pelo record.image (que vai conter a url de download da image) e record.id (identificador do documento)
    //Onde a imagem vai ser salva na pasta do cliente
    var startTime = new Date();
    Schema.find({where:{images:{exists:true}},fields:{id:true,images:true}}, function(err, results) {
      var queue = async.queue(function(img,callback) {
        var downloader = new ImageDownloader();        
        downloader.download(img,callback);
      },5);

      results.forEach(function(rec) {
        rec.images.forEach(function(img) {
          queue.push(img);
        });
      });
      // var downloader = new ImageDownloader();
      // downloader.download(queue).on("done",
      //   function() {
      //     console.log("Terminou #"+downloader.count+" em "+(new Date().getTime() - startTime.getTime()));
      //     downloader.log.unshift("Tempo total: "+((new Date().getTime() - startTime.getTime())/1000)+"s");                    
      //     console.log(downloader.log);
      //     cb(null, downloader.log);
      //   }
      // );
    });

  };
  function ImageDownloader() {
    EventEmitter.call(this);
    this.log = [];
    this.count = 0;    
    this.requestErrorCount = 0;
  }
  util.inherits(ImageDownloader, EventEmitter);
  ImageDownloader.prototype.download = function(img,callback) {    
    var self = this;    
    var image = new Image(img);     
    image.checkIfExist(image.localPath,function(exists) {      
      if(exists) image.emit("exists"); 
      else image.emit("doesNotExist");
    });
    image.on("exists", function() {
        console.log("Existe original "+image.local);        
        self.count++;        
        image.checkIfExist(image.thumbnailPath,function(exists) {
          if(exists){      
            console.log("Existe thumbnail "+image.thumbnailPath);              
            image.checkIfExist(image.resizedPath,function(exists) {
              if(exists) {
                console.log("Existe resized "+image.thumbnailPath); 
                callback();                 
              }
              else image.emit("localFileWrote");
            });
          } else {
            image.emit("localFileWrote");
          }
        });            
      })
    .on("doesNotExist",image.requestFromURL)
    .on("endDownload", function() {
          image.writeLocalFile();
          self.count++;            
      })
    .on("localFileWrote",
      function() {        
        image.convertResized().on("resizedFileWrote",function() {
          image.convertThumbnail().on("thumbnailFileWrote",function() {
            callback();
          });          
        });        
        // self.log = self.log.concat(image.log)
      })
    .on("writeError",function() {
      callback();
    });
    return this;
  };
  function Image(img) {    
    EventEmitter.call(this);
    this.log = [];
    this.count = 0;
    this.img = img;
    this.requestErrorCount = 0;
    this.writeLocalErrorCount = 0;
    this.writeResizedErrorCount = 0;
    this.writeThumbnailErrorCount = 0;
    this.original = img.original;
    this.local = img.local;
    this.resized = img.resized;
    this.thumbnail = img.thumbnail;
    this.localPath = __dirname + "/../../client"+this.local;
    this.thumbnailPath = __dirname + "/../../client"+this.thumbnail;
    this.resizedPath = __dirname + "/../../client"+this.resized;
  }
  util.inherits(Image, EventEmitter);
  Image.prototype.checkIfExist = function(path,cb) {
    var self = this;
    fs.exists(path, function(exists){
      cb(exists);        
    });
    // return this;
  };
  Image.prototype.requestFromURL = function() {
    var self = this;
    request(self.original, {encoding: 'binary'}, function(err, response, body){
      if (err){
        if (self.requestErrorCount==10) {
          console.log("Error to download "+self.original);
          self.requestErrorCount == 0;
          self.log.push("Error no download de "+self.original);
          return self.emit("endDownload");
        } else {
          self.requestErrorCount++;
          self.requestFromURL();
        }
      } else {
        self.downloadedContent = body;
        return self.emit("endDownload");
      }
    });
    return this;
  }
  Image.prototype.writeLocalFile = function() {    
    var self = this;
    fs.writeFile("client"+self.local, self.downloadedContent, 'binary', function(err){
        if(err){
          if(self.writeLocalErrorCount==10){
            console.log("******** Local: "+self.local);
            console.log('Ops, um erro ocorreu!');
            console.log("URL: ",self.original);
            console.log("********");
            self.log.push("Write Local File: "+self.local+"   URL: "+self.original);
            self.writeLocalErrorCount = 0;
          } else {
            self.writeLocalErrorCount++
            self.writeLocalFile();
          }
        } else {
          var buffer = readChunk.sync("client"+self.local, 0, 120);  
          //Checar se a imagem salva é um arquivo jpeg, caso não seja requisitar o endereço da imagem novamente
          if (imageType(buffer)==null){
            if(self.writeLocalErrorCount==10){              
              console.log("******** Local: "+self.local);
              console.log('Ops, um erro ocorreu!');
              console.log("URL: ",self.original);
              console.log("********");
              self.log.push("Write Local File: "+self.local+"   URL: "+self.original);
              self.writeLocalErrorCount = 0;
              self.emit("writeError");
            } else {
              self.writeLocalErrorCount++
              self.writeLocalFile();
            }
          }else{            
            self.emit("localFileWrote");
          }  
        }
    });
    return this;
  }
  Image.prototype.convertResized = function() {
    var self = this;
    qt.convert({src:self.localPath, dst: self.resizedPath, width:1500}, function(err, filename){
      if(err){
        if(self.writeResizedErrorCount==3){
          console.log("******** RESIZED: "+self.resized);
          console.log('Ops, um erro ocorreu!');
          console.log("******** Local: "+self.local);
          console.log("URL: ",self.original);
          console.log("********");
          self.log.push("Write Resized File: "+self.resized+"   Local: "+self.local+"   URL: "+self.original);
          self.writeResizedErrorCount = 0;
          self.emit("writeError");
        } else {
          self.writeResizedErrorCount++
          self.convertResized();
        }
      } else {        
        self.emit("resizedFileWrote");
      }
    });
    return this;
  }
  Image.prototype.convertThumbnail = function() {
    var self = this;
    qt.convert({src:self.resizedPath, dst: self.thumbnailPath, width:100, height:100}, function(err, filename){
      if(err){
        if(self.writeThumbnailErrorCount==3){
          console.log("******** THUMBNAIL: "+self.thumbnail);
          console.log('Ops, um erro ocorreu!');
          console.log("******** Local: "+self.local);
          console.log("URL: ",self.original);
          console.log("********");
          self.log.push("Write Thumbnail File: "+self.thumbnail+"   Local: "+self.local+"   URL: "+self.original);
          self.writeThumbnailErrorCount = 0;
          self.emit("writeError");
        } else {
          self.writeThumbnailErrorCount++
          self.convertThumbnail();
        }
      } else {        
        self.emit("thumbnailFileWrote");
      }
    });
    return this;
  }
  // write local file
  // fs.writeFile("client"+local, body, 'binary', function(err){
  //   try{
  //     console.log("Escrevendo o arquivo...");
  //     if(err){
  //       console.log("******** ORIGINAL: "+local);
  //       console.log('Ops, um erro ocorreu!');
  //       console.log("URL: ",original);
  //       console.log("********");
  //       callback();
  //       i++;
  //
  //     }else{
  //       callback();
  //     }
  //   }catch(err){
  //     if(err) throw new Error(err);
  //   }
  // });
  // function downloadImage(queue){
  //   var i = 0;
  //   var end = queue.length;
  //   var erro = [];
  //   var count = 0;
  //   var countErr = 0;
  //   async.whilst(function(){
  //     return i < end;
  //   }, function(callback){
  //     var local = queue[i].local; //local da imagem salva
  //     var original = queue[i].original; //url original da imagem
  //     var resized = queue[i].resized; //local da imagem salva
  //     var thumbnail = queue[i].thumbnail; //local da imagem salva
  //     var file = __dirname + "/../../client"+local; //arquivo da imagem salva
  //     var file2 = __dirname + "/../../client"+thumbnail;
  //     console.log(i + " of "+end+" images");
  //     fs.exists(file, function(exists){
  //       // check if exist localy
  //       if (exists) {
  //         fs.exists(file2, function(exists){
  //           if(exists){
  //             console.log("image alreadly exists");
  //             i++;
  //             callback();
  //           }else{
  //             fs.unlink(file);
  //             callback();
  //           }
  //         });
  //       } else {
  //         console.log("making request to " + original);
  //         async.series([
  //           // Dowload da internet a partir e orginial gravando em local
  //           function fileRequest(callback){
  //             if(count < 3){ // Q: Porque isso?
  //               requestFile(original,local,callback);
  //             }
  //           },
  //           // Depois de ter gravado o original no local,
  //           function test(callback){
  //             var readChunk = require('read-chunk'); // npm install read-chunk
  //             var imageType = require('image-type');
  //             var buffer = readChunk.sync(__dirname + "/../../client"+local, 0, 120);
  //
  //             console.log(imageType(buffer));
  //             //Checar se a imagem salva é um arquivo jpeg, caso não seja requisitar o endereço da imagem novamente
  //             if (imageType(buffer)==null){
  //               console.log("Arquivo inválido");
  //               count++;
  //               if(count == 3){
  //                 erro[countErr] = "Ocorreu um erro na URL: " + original;
  //                 countErr++;
  //                 count = 0;
  //                 i++;
  //               }
  //               callback();
  //             }else{
  //               console.log("Arquivo válido");
  //               async.parallel([
  //                 function resizedConverting(callback) {
  //                   // write resized
  //                   convertResized(local,resized,callback);
  //                 },
  //                 function thumbnailConverting(callback) {
  //                   // write thumbnail
  //                   convertThumbnail(local,thumbnail,callback);
  //                 },
  //               ],function done() {
  //                 i++;
  //                 count = 0;
  //                 callback();
  //               });
  //             }
  //           }
  //         ],function done(){
  //           callback();
  //         });
  //       }
  //
  //     });
  //   }, function(err){
  //     if (err) throw new Error(err);
  //     for(var t=0;t < countErr;t++){
  //       console.log(erro[t]);
  //     }
  //     console.log("done.");
  //   });
  // }
  //
  // //faz requisição de arquivo para download
  // function requestFile(original,local,callback){
  //   request(original, {encoding: 'binary'}, function(err, response, body){
  //     if (err) throw new Error(err);
  //     // write local file
  //     fs.writeFile("client"+local, body, 'binary', function(err){
  //       try{
  //         console.log("Escrevendo o arquivo...");
  //         if(err){
  //           console.log("******** ORIGINAL: "+local);
  //           console.log('Ops, um erro ocorreu!');
  //           console.log("URL: ",original);
  //           console.log("********");
  //           callback();
  //           i++;
  //
  //         }else{
  //           callback();
  //         }
  //
  //       }catch(err){
  //         if(err) throw new Error(err);
  //       }
  //     });
  //
  //   });
  //
  // }
  //
  // function convertResized(local,resized,callback) {
  //   qt.convert({src:__dirname + "/../../client"+local, dst: __dirname + "/../../client"+resized, width:1500}, function(err, filename){
  //     if(err){
  //       console.log("******** RESIZED ERROR: "+local+" >> Trying again...");
  //       // try again
  //       convertResized(local,resized,callback);
  //     } else {
  //       console.log("Converting to resized: OK");
  //       callback();
  //     }
  //   });
  // }
  // function convertThumbnail(local,thumbnail,callback) {
  //   qt.convert({src:__dirname + "/../../client"+local, dst: __dirname + "/../../client"+thumbnail, width:100, height:100}, function(err, filename){
  //     if(err){
  //       console.log("******** THUMBNAIL ERROR: "+local+" >> Trying again...");
  //       console.log(err);
  //       // try again
  //       convertThumbnail(local,thumbnail,callback);
  //     } else {
  //       console.log("Converting to thumbnail: OK");
  //       callback();
  //     }
  //   });
  // }
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
        {arg: 'url', type: 'string', required:true, description: 'link para tabela do glossário'},
        {arg: 'language', type: 'string', required:true, description: 'en-US, pt-BR or es-ES'},
        {arg: 'sheetNumber', type: 'number', required:false, description: 'Sheet number. Default: 0'},
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
