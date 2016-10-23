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
  var logs = {};
  function titleCase(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }
 // var downloadQueue = []; //recebe o vetor com as imagens a serem baixadas
  //função que recebe a planilha
  Specimen.inputFromURL = function(url,language, base, cb) {
    //substitui a url da imagem
    url = url.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
    var name = defineName(url); //define o nome da url
    if(name==null)
    cb("Invalid XLSX file.",null);
    var path = __dirname +"/../../uploads/"+name+".xlsx"; //define o caminho do arquivo
    saveDataset(name,url,path); //salva os dados
    //ler o arquivo da planilha
    var w = fs.createWriteStream(path).on("close",function (argument) {
      var data = xlsx.parse(path)[0].data; //recebe os dados
      var schema = data[0]; //define o schema
      var class_ = data[1]; //define a classe
      var terms = data[2]; //define o termo
      // var category = data[3];
      var label = data[4]; //define o rotulo      
      data =  data.slice(5,data.length); //recebe a quantidade de dados da planilha      
      var response = {}; //resposta de execução
      response.count = 0;

      async.each(data,function(line, callback){ //para cada linha lida salve os dados
        if(line && line.length>0){          
          async.series([
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
        } else {
          callback(); //retorno da função
        }      
      },function() {
        //executa o download das imagens
       // downloadImages(downloadQueue, redownload);
        console.log("Done.");
        for (var key in logs) {
          console.log(logs[key]);
        }

        cb(null, response);
      });        
    });    
    request(url).pipe(w);
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
          var schemaId = Specimen.app.defineSchemaID(language,schema[c],class_[c],terms[c]); //define o id do esquema
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
                if(schema["class"]=="CategoricalDescriptor"){
                  record[schema.id].value = value;
                  record[schema.id].states = [];
                  async.each(value.split("|"), function(sValue, callbackState) {
                    var stateValue = titleCase(sValue.trim());
                    if(language==originalLanguage){
                    //  SAME LANGUAGE
                      if(stateValue.length>0){
                        Schema.findOne({where:{language:originalLanguage,class:"State",field:schema.field,state:stateValue}}, function(err,state) {
                          if(state){
                            record[schema.id].states.push(state.toJSON());
                          }else {
                            logs[hash.MD5("STATE NOT FOUND Field: "+schema.field+"State: "+stateValue)] = "STATE NOT FOUND\tField: "+schema.field+"\tState: "+stateValue;
                          }
                          callbackState();
                        });
                      } else {
                        logs[hash.MD5("EMPTY STATE Field: "+schema.field)] = "STATE NOT FOUND\tField: "+schema.field;
                        callbackState();
                      }
                    } else {
                    // DIFFERENT LANGUAGES
                      var schemaIdOriginal = Specimen.app.defineSchemaID(originalLanguage,schema.schema,schema["class"],schema.term);
                      Schema.findById(schemaIdOriginal,function(err,schemaOriginal) {
                        if(schemaOriginal){
                          Schema.findOne({where:{language:originalLanguage,class:"State",field:schemaOriginal.field,state:stateValue}}, function(err,state) {
                            if(state){
                              Schema.findById(Schema.app.defineSchemaID(language, state.schema, state.class, state.term),function(err,translatedState) {
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
                    }
                  },function doneState() {
                    callbackCell();
                  });
                // OTHER FIELDS
                } else {
                record[schema.id].value = value;
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
                    record[schema.id].value.split("|").forEach(function(img,i){
                        var imageId = schema.id.split(":").slice(1).join(":")+":"+record.id.split(":").slice(1).join(":")+":"+i;
                        var image = {
                          id: imageId,
                          // name: "specimen_" + img.replace("https://drive.google.com/open?id=", ""),
                          original: img.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id="),
                          local: "/images/" + imageId + ".jpeg", //atribui a url onde vai ser salva a imagem
                          resized: "/resized/" + imageId + ".jpeg", //atribui a url onde vai ser salva a imagem
                          thumbnail: "/thumbnails/" + imageId + ".jpeg" //atribui a url onde vai ser salva a imagem
                        }
                        record[schemaId].images.push(image);
                    });

                    //Função antiga
                    // record[schema.id].value.split("|").forEach(function(value){
                    //   recebe o nome da imagem
                    //   record[schema.id].name = schema.category + value.replace("https://drive.google.com/open?id=", "");
                    //   recebe o valor da imagem
                    //   if(typeof value === "string"){
                    //     record[schema.id].url = value.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
                    //   }
                    //    save images
                    //   var image = {url: record[schema.id].url, term:schema.term ,name: record[schema.id].name};
                    //   if(language==originalLanguage){
                    //     downloadQueue.push(image); //recebe as imagens
                    //   }
                    // });

                  }else
                  // REFERENCE
                  if(schema["class"]=="Reference"){
                    record[schema.id].references = [];
                    record[schema.id].value.split("|").forEach(function (ref) {
                      record[schema.id].references.push(ref.trim());
                    });
                  }else
                  // INTERACTION
                  if(schema["class"]=="Interaction"){
                    record[schema.id].species = [];
                    record[schema.id].value.split("|").forEach(function (sp) {
                      record[schema.id].species.push(sp.trim());
                    });
                  }else
                  // FLOWERING PERIOD
                  if(schema.term=="floweringPeriod"){
                    record[schema.id].months = [];
                    record[schema.id].value.split("|").forEach(function (month) {
                      record[schema.id].months.push(month.trim());
                    });
                  }else
                  // LATITUDE
                  if(schema.term=="decimalLatitude"){
                    var converted = convertDMSCoordinatesToDecimal(record[schema.id].value.toUpperCase().replace("O","W").replace("L","E"));
                    if(converted!=record[schema.id].value){
                      record[schema.id].rawValue = record[schema.id].value;
                      record[schema.id].value = converted;
                    }
                  }else
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
        Specimen.upsert(record,function (err,instance) {
          if(err)
            console.log(err);
          callback();
        });
      });
    } else {
      console.log("Cannot define an ID for specimen: ",language,line[1],line[2],line[3]);
      callback();
    }
  }
  Specimen.downloadImages = function (cb) {
    //Schema aqui vai realizar uma consulta no banco de dados pegando os valores chave e valor do registro.
    //Pelo record.image (que vai conter a url de download da image) e record.id (identificador do documento)
    //Onde a imagem vai ser salva na pasta do cliente
    var startTime = new Date();
    Specimen.find({where:{or:[{"pt-BR:rcpol:Image:allPollenImage":{exists:true}},{"pt-BR:rcpol:Image:plantImage":{exists:true}},
    {"pt-BR:rcpol:Image:flowerImage":{exists:true}},{"pt-BR:rcpol:Image:beeImage":{exists:true}},{"pt-BR:rcpol:Image:pollenImage":{exists:true}}]},
    fields:{"pt-BR:rcpol:Image:allPollenImage":true,"pt-BR:rcpol:Image:plantImage":true,
    "pt-BR:rcpol:Image:flowerImage":true, "pt-BR:rcpol:Image:beeImage":true,"pt-BR:rcpol:Image:pollenImage":true}}, function(err,results){    
      
      var i = 0;
      console.time("download");
      var queue = async.queue(function(img,callback) {
        console.log("PROCESSED: ",i++);
        console.timeEnd("download");
        var downloader = new ImageDownloader(); 
        downloader.download(img,callback);
      },5);

      results.forEach(function (result){
        if(result["pt-BR:rcpol:Image:allPollenImage"]){
            result["pt-BR:rcpol:Image:allPollenImage"].images.forEach(function (img){
             queue.push(img);
            });
        }
        if(result["pt-BR:rcpol:Image:flowerImage"]){
            result["pt-BR:rcpol:Image:flowerImage"].images.forEach(function (img){
              queue.push(img);
            });
        }
        if(result["pt-BR:rcpol:Image:plantImage"]){
            result["pt-BR:rcpol:Image:plantImage"].images.forEach(function (img){
              queue.push(img);
            });
        }
        if(result["pt-BR:rcpol:Image:beeImage"]){
            result["pt-BR:rcpol:Image:beeImage"].images.forEach(function (img){
             queue.push(img);
            });
        }
        if(result["pt-BR:rcpol:Image:pollenImage"]){
            result["pt-BR:rcpol:Image:pollenImage"].images.forEach(function (img){
              queue.push(img);
            });
        }
      });            
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

  Specimen.remoteMethod(
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
        {arg: 'url', type: 'string', required:true, description: 'link para tabela de espécimes'},
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
