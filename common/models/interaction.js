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
var hash = require('object-hash');
var util = require('util');
var readline = require('readline');
var google = require('googleapis');
// var googleAuth = require('google-auth-library');

// var Thumbnail = require('thumbnail');
// var thumbnail = new Thumbnail(__dirname + "/../../client/images", __dirname + "/../../client/thumbnails");
module.exports = function(Interaction) {
  
  Interaction.plants = function(pollinator,region,vegetalForm,cb) {        
    var MongoClient = require('mongodb').MongoClient;    
    // Connection URL 
    
    if(process.env.ENVIRONMENT == "docker")
      var url = 'mongodb://mongo:27017/bdd';
    else 
      var url = 'mongodb://127.0.0.1:27017/bdd';
    var q = {};
    q.pollinator = pollinator;
    if(region!="Brasil"){      
      q.region = region;
    }    
    if(vegetalForm!="Todas"){      
      q.vegetalForm = vegetalForm;
    }    

    // region=="Brasil" || String(region).trim().length==0?{pollinator:pollinator}:{pollinator:pollinator,region:region}
    
    // Use connect method to connect to the Server 
    MongoClient.connect(url, function(err, db) {
      var collection = db.collection('Interaction');
      var q_ = [
          { $match: q},                 
          {
            $group: {
              _id: {
                "plant":"$plant",                
                "state":"$state",
                "municipality":"$municipality",
                "region":"$region"                            
              },                   
              // count: {$sum:1}
              avgQuantity: { $avg: "$percentual" }
            }
          }
        ];
      collection.aggregate(q_).toArray(function(err, docs) {        
        cb(err,docs);
        db.close();
        
      });
    });
  }
    Interaction.pollinators = function(plant,cb) {        
    var MongoClient = require('mongodb').MongoClient;    
    // Connection URL     
    if(process.env.ENVIRONMENT == "docker")
      var url = 'mongodb://mongo:27017/bdd';
    else 
      var url = 'mongodb://127.0.0.1:27017/bdd';
    // Use connect method to connect to the Server 
    MongoClient.connect(url, function(err, db) {
      var collection = db.collection('Interaction');
      var q = [
          { $match: {plant:plant}},                 
          {
            $group: {
              _id: {
                "pollinator":"$pollinator",
                "reference":"$reference",
                "type":"$type"
              },                   
              // count: {$sum:1}
              // avgQuantity: { $avg: "$percentual" }
            }
          }
        ];
      collection.aggregate(q).toArray(function(err, docs) {        
        cb(err,docs);
        db.close();
        
      });
    });    
  }
  Interaction.remoteMethod(
    'pollinators',
    {
      http: {path: '/pollinators', verb: 'get'},
      accepts: [
        {arg: 'plant', type: 'string', required:false, description: 'Plant name'}        
       // {arg: 'redownload', type: 'boolean', required:false, description: 'true para baixar todas as imagens. false para baixar somente imagens novas. default: false', default: false}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  ); 
  Interaction.remoteMethod(
    'plants',
    {
      http: {path: '/plants', verb: 'get'},
      accepts: [
        {arg: 'pollinator', type: 'string', required:true, description: 'Pollinator name'},
        {arg: 'region', type: 'string', required:false, description: 'Region'},
        {arg: 'vegetalForm', type: 'string', required:false, description: 'Vegetal form'}
       // {arg: 'redownload', type: 'boolean', required:false, description: 'true para baixar todas as imagens. false para baixar somente imagens novas. default: false', default: false}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  ); 

  Interaction.inputFromURL = function(id, cb) {
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
      Interaction.destroyAll({dataset:id},function(err,data){
        service.spreadsheets.values.get({
            auth: jwtClient,
            spreadsheetId: id,
            range: 'A:K'        
          }, function(err, rs) {
            if (err){
              console.log('The API returned an error: ' + err);    
              return;          
            }        
            var data = [];
            rs.values.shift();
            rs.values.shift();
            rs.values.shift();
            rs.values.shift();            
            rs.values.forEach(function(line){
              var val = Number(new String(line[4]).replace(",","."));
              console.log(val)
              if(val > 0){
                var i = {};
                i.dataset = id;
                i.modified = new Date();
                i.collection = line[0];
                i.plant = line[1];
                i.type = line[2];
                i.pollinator = line[3];              
                i.percentual = val;
                i.author = line[5];
                i.municipality = line[6];
                i.state = line[7];
                i.region = line[8];
                i.vegetalForm = line[9];
                i.reference = line[10];
                data.push(i); 
              }               
            });            
            Interaction.create(data,function(err,saved){
              if (err) {
                console.log('The API returned an error: ' + err);    
                cb(err,saved);
              }            
              Interaction.downloadImages(id,function(){
                console.log("Images downloaded.");
              });              
              cb(err,saved);
            });                                 
        });
      });
    });
  };
  Interaction.downloadImages = function (id,cb) {
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
        cb(err,tokens)
        return;
      }
      var service = google.sheets('v4');      

      service.spreadsheets.values.get({
          auth: jwtClient,
          spreadsheetId: id,
          range: 'images!A:C'        
        }, function(err, rs) {
          if (err){
            console.log('The API returned an error: ' + err);    
            return;          
          }        
          var data = [];
          rs.values.shift();
          var queue = async.queue(function(img,callback) {
            var downloader = new ImageDownloader(); 
            if(img.length<2) {
              callback();
              return false;
            }
            var imageId = "interaction-"+img[1].split("?id=")[1];
            if(img[1].split("?id=").length==1) 
              imageId = "interaction-"+hash.MD5(img[1]);            
            var image = {
              id: imageId,
              // name: "specimen_" + img.replace("https://drive.google.com/open?id=", ""),
              original: img[1].replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id="),
              local: "/images/" + imageId + ".jpeg", //atribui a url onde vai ser salva a imagem
              resized: "/resized/" + imageId + ".jpeg", //atribui a url onde vai ser salva a imagem
              thumbnail: "/thumbnails/" + imageId + ".jpeg", //atribui a url onde vai ser salva a imagem
              credits: img[2]
            };
            downloader.download(image,function(){});                        
            Interaction.find({where:{pollinator:img[0]}},function(err,data){
              if(err) console.log(err);
              data.forEach(function(item){
                item.image = image;
                item.save(function(err,data){
                  if(err) console.log(err);                  
                });
              });
            });            
            callback();
          },3);
          queue.push(rs.values);
          queue.drain( function() {
            console.log("done");
            cb(err,rs);
          });          
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

  Interaction.remoteMethod(
    'downloadImages',
    {
      http: {path: '/downloadImages', verb: 'get'},
      accepts: [
        // {arg:'download'}
        {arg: 'id', type: 'string', required:true}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
    
  Interaction.remoteMethod(
    'inputFromURL',
    {
      http: {path: '/xlsx/inputFromURL', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'string', required:true, description: 'Google docs ID'}        
       // {arg: 'redownload', type: 'boolean', required:false, description: 'true para baixar todas as imagens. false para baixar somente imagens novas. default: false', default: false}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  function toString(arg) {
    return (typeof arg == 'undefined')?'':String(arg).trim();
  }
};
