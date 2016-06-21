var xlsx = require('node-xlsx');
var hash = require('object-hash');
var request = require('request');
var async = require('async');
var validator = require('validator');
var fs = require('fs');
var qt = require('quickthumb');
var Thumbnail = require('thumbnail');
var thumbnail = new Thumbnail(__dirname + "/../../client/images", __dirname + "/../../client/thumbnails");
module.exports = function(Specimen) {
  var logs = {};
  function titleCase(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }
  var downloadQueue = [];
  Specimen.inputFromURL = function(url,language, redownload, cb) {
    url = url.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
    var name = defineName(url);
    if(name==null)
    cb("Invalid XLSX file.",null);
    var path = __dirname +"/../../uploads/"+name+".xlsx";
    saveDataset(name,url,path);

    var w = fs.createWriteStream(path).on("close",function (argument) {
      var data = xlsx.parse(path)[0].data;
      var schema = data[0];
      var class_ = data[1];
      var terms = data[2];
      // var category = data[3];
      var label = data[4];
      data =  data.slice(5,data.length);
      var rs = {};
      rs.count = 0;
      async.each(data, function iterator(line, callback){
        rs.count ++;
        async.parallel([
          function(callbackSave) {
            saveRecord(language,"en-US",line, schema, class_, terms, function() {
              callbackSave();
            });
          },
          function(callbackSave) {
            saveRecord(language,"pt-BR",line, schema, class_, terms, function() {
              callbackSave();
            });
          },
          function(callbackSave) {
            saveRecord(language,"es-ES",line, schema, class_, terms, function() {
              callbackSave();
            });
          }
        ],function done() {
          callback();
        });
      }, function done(){
        // downloadImages(downloadQueue, redownload);
        console.log("Done.");
        for (var key in logs) {
          console.log(logs[key]);
        }

        cb(null, rs);
      });
    });
    request(url).pipe(w);
  };
  function saveRecord(originalLanguage,language,line, schema, class_, terms, callback) {
    var Schema = Specimen.app.models.Schema;
    var c = 0;
    var record = {};
    record.id = Specimen.app.defineSpecimenID(language,line[1],line[2],line[3]);
    if(record.id){
      // rs.count ++;
      async.each(terms, function(term, callbackCell){
        c++;
        if(term){
          var schemaId = Specimen.app.defineSchemaID(language,schema[c],class_[c],terms[c]);
          record.language = language;
          record.originalLanguage = originalLanguage;
          record[schemaId] = {value:toString(line[c])};
          if(schemaId){
            Schema.findById(schemaId,function(err,schema) {
              if(err)
                console.log(err);
              if(schema){
                var value = toString(record[schema.id].value);
                record[schema.id] = schema;
                // CATEGORICAL DESCRIPTOR
                if(schema.class=="CategoricalDescriptor"){
                  record[schema.id].value = value;
                  record[schema.id].states = [];
                  async.each(value.split("|"), function(sValue, callbackState) {
                    var stateValue = titleCase(sValue.trim());
                    if(language==originalLanguage){
                      if(stateValue.length>0 && stateValue.charAt(0).toLowerCase()==stateValue.charAt(0))
                        console.log("BEFORE: ",stateValue);
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
                      var schemaIdOriginal = Specimen.app.defineSchemaID(originalLanguage,schema.schema,schema.class,schema.term);
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
                                });
                            } else {
                              logs[hash.MD5("STATE NOT FOUND Field: "+schemaOriginal.field+"State: "+stateValue)] = "STATE NOT FOUND\tField: "+schemaOriginal.field+"\tState: "+stateValue;
                            }
                            callbackState();
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
                  if(schema.class=="Image"){
                    record[schema.id].value.split("|").forEach(function(value){
                      record[schema.id].name = schema.category + value.replace("https://drive.google.com/open?id=", "");
                      if(typeof value === "string"){
                        record[schema.id].url = value.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
                      }
                      // save images
                      var image = {url: record[schema.id].url, name: record[schema.id].name};
                      downloadQueue.push(image);
                    });
                  }else
                  // REFERENCE
                  if(schema.class=="Reference"){
                    record[schema.id].references = [];
                    record[schema.id].value.split("|").forEach(function (ref) {
                      record[schema.id].references.push(ref.trim());
                    });
                  }else
                  // INTERACTION
                  if(schema.class=="Interaction"){
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

  // Specimen.inputFromURL = function(url,language,redownload, cb) {
  //   url = url.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
  //   var name = defineName(url);
  //   if(name==null)
  //   cb("Invalid XLSX file.",null);
  //   var path = __dirname +"/../../uploads/"+name+".xlsx";
  //   saveDataset(name,url,path);
  //   var downloadQueue = [];
  //
  //   var w = fs.createWriteStream(path).on("close",function (argument) {
  //     var data = xlsx.parse(path)[0].data;
  //     var schema = data[0];
  //     var class_ = data[1];
  //     var term = data[2];
  //     var category = data[3];
  //     var label = data[4];
  //     data =  data.slice(5,data.length);
  //
  //     var idIndexes = [1,2,3]; // institutionCode and collectionCode
  //     var rs = {};
  //     rs.count = 0;
  //     async.each(data, function iterator(line, callback){
  //       var record = {};
  //       record.id = defineId(line,idIndexes);
  //       if(record.id){
  //         rs.count ++;
  //         for(var c = 1; c < term.length; c++){
  //           if(line[c]){
  //             var field = toString(schema[c])+":"+toString(term[c]);
  //             var current = {};
  //             current.schema = toString(schema[c]);
  //             current.term = toString(term[c]);
  //             current.class = String(class_[c]).trim();
  //             if(toString(category[c])!="-" && toString(category[c])!=""){
  //               current.category = toString(category[c]);
  //             }
  //             current.label = toString(label[c]);
  //             current.value = toString(line[c]);
  //             // EVENT DATE
  //             if(current.term=="eventDate"){
  //               // current.category = current.category?current.category:"Outro";
  //               var parsedDate = current.value.split("/");
  //               if(parsedDate.length==3){
  //                   current.day = {value:parsedDate[0].trim()=="00"||parsedDate[0].trim()=="0"?null:parsedDate[0].trim()};
  //                   current.month = {value:parsedDate[1].trim()=="00"||parsedDate[1].trim()=="0"?null:parsedDate[1].trim()};
  //                   current.year = {value:parsedDate[2].trim()=="0000"||parsedDate[2].trim()=="00"?null:parsedDate[2].trim()};
  //               } else{
  //                 current.day = {};
  //                 current.month = {};
  //                 current.year = {};
  //               }
  //             } else
  //             // IMAGE
  //             if(current.term=="associatedMedia"){
  //               current.category = current.category?current.category:"Outro";
  //               current.value.split("|").forEach(function(value){
  //                 current.name = current.category + value.replace("https://drive.google.com/open?id=", "");
  //                 if(typeof value === "string"){
  //                   current.url = value.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
  //                 }
  //                 // save images
  //                 var image = {url: current.url, name: current.name};
  //                 downloadQueue.push(image);
  //               });
  //             }else
  //             // REFERENCE
  //             if(current.term=="bibliographicCitation"){
  //               current.category = current.category?current.category:"Outro";
  //               current.references = [];
  //               current.value.split("|").forEach(function (ref) {
  //                 current.references.push(ref.trim());
  //               });
  //             }else
  //             // INTERACTION
  //             if(current.class=="Interaction"){
  //               current.species = [];
  //               current.value.split("|").forEach(function (sp) {
  //                 current.species.push(sp.trim());
  //               });
  //             }else
  //             // FLOWERING PERIOD
  //             if(current.term=="floweringPeriod"){
  //               current.months = [];
  //               current.value.split("|").forEach(function (month) {
  //                 current.months.push(month.trim());
  //               });
  //             }else
  //             // LATITUDE
  //             if(current.term=="decimalLatitude"){
  //               var converted = convertDMSCoordinatesToDecimal(current.value.toUpperCase().replace("O","W").replace("L","E"));
  //               if(converted!=current.value){
  //                 current.rawValue = current.value;
  //                 current.value = converted;
  //               }
  //             }else
  //             // LONGITUDE
  //             if(current.term=="decimalLongitude"){
  //               var converted = convertDMSCoordinatesToDecimal(current.value.toUpperCase().replace("O","W").replace("L","E"));
  //               if(converted!=current.value){
  //                 current.rawValue = current.value;
  //                 current.value = converted;
  //               }
  //             }else
  //             //CAT
  //             if(current.class=="CategoricalDescriptor"){
  //               current.category = current.category?current.category:"Outro";
  //               current.id = hash.MD5(current.schema+":"+current.class+":"+current.term);
  //               current.states = [];
  //               current.value.split("|").forEach(function (state_) {
  //                 var state  = {};
  //                 state.value = state_.trim();
  //                 console.log(current.category+":"+current.label+":"+state.value);
  //                 state.id = hash.MD5(current.category.trim().toLowerCase()+":"+current.label.trim().toLowerCase()+":"+state.value.trim().toLowerCase());
  //                 //state.id = hash.MD5(current.schema+":"+current.class+":"+current.term+":"+state.value);
  //                 current.states.push(state);
  //               });
  //             }
  //             //NUM
  //             else if(current.class=="NumericalDescriptor"){
  //               current.category = current.category?current.category:"Outro";
  //               current.id = hash.MD5(current.schema+":"+current.class+":"+current.term);
  //               if(current.value.toUpperCase().indexOf("VALUE:")>0){
  //                 current.value = current.value.toUpperCase().split("VALUE:")[1].trim();
  //               }else{
  //                 current.value.split(";").forEach(function (item) {
  //                   if(item.toUpperCase().indexOf("MIN:")!=-1){
  //                     current.min = item.toUpperCase().split("MIN:")[1].trim();
  //                   } else if(item.toUpperCase().indexOf("MAX:")!=-1){
  //                     current.max = item.toUpperCase().split("MAX:")[1].trim();
  //                   } else if(item.toUpperCase().indexOf("MED:")!=-1){
  //                     current.mean = item.toUpperCase().split("MED:")[1].trim();
  //                   } else if(item.toUpperCase().indexOf("DVPAD:")!=-1){
  //                     current.sd = item.toUpperCase().split("DVPAD:")[1].trim();
  //                   }
  //                 });
  //               }
  //             }
  //             // Check if exist field with the same key
  //             if(record[field]){
  //               // Check if the field is the is an Array
  //               if(Object.prototype.toString.call( record[field] ) === '[object Array]' ){
  //                   record[field].push(current);
  //               } else {
  //                 var old = Object.create(record[field]);
  //                 record[field] = [];
  //                 record[field].push(old);
  //                 record[field].push(current);
  //               }
  //             } else {
  //               record[field] = current;
  //             }
  //           }
  //         }
  //         Specimen.upsert(record,function (err,instance) {
  //           if(err)
  //             console.log(err);
  //           callback();
  //         });
  //       }else{
  //         console.log("can't find id");
  //         callback();
  //       }
  //     }, function done(){
  //       downloadImages(downloadQueue, redownload);
  //       cb(null, rs);
  //     });
  //   });
  //   request(url).pipe(w);
  // };
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
        {arg: 'language', type: 'string', required:true, description: 'en-US, pt-BR or es-ES'},
        {arg: 'redownload', type: 'boolean', required:false, description: 'true para baixar todas as imagens. false para baixar somente imagens novas. default: false', default: false}
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
  function downloadImages(queue, redownload){
    var i = 0;
    var end = queue.length;
    async.whilst(function(){
      return i < end;
    }, function(callback){
      console.log(i + " of " + end);
      var url = queue[i].url;
      var name = queue[i].name;
      var file = __dirname + "/../../client/resized_images/"+name+".jpg";
      fs.exists(file, function(exists){
        if (exists & !redownload) {
          console.log("image alreadly exists");
          i++;
          callback();
        } else {
          console.log("making request to "+url);
          request(url, {encoding: 'binary'} ,function(err, response, body){
            if (err) throw new Error(err);
            console.log(response.statusCode);
            fs.writeFile("client/images/"+name+".jpg", body, 'binary', function(err){
              if(err) throw new Error(err);
              // salvar imagem
              qt.convert({src:__dirname + "/../../client/images/"+name+".jpg", dst: __dirname + "/../../client/resized_images/" + name + ".jpg", width:1500}, function(err, filename){
                if (err) throw new Error(err);
                i++;
                // se é flor, salvar thumbnail tambem
                if (name.substring(0,4) == 'Flor'){
                  qt.convert({src:__dirname + "/../../client/images/"+name+".jpg", dst: __dirname + "/../../client/thumbnails/" + name + ".jpg", width:100, height:100}, function(err, filename){
                    if (err) throw new Error(err);
                    console.log("converted to thumbnail");
                    callback();
                  });
                } else
                  callback();
              });
            });
          });
        }
      });
    }, function(err){
      if(err) throw new Error(err);
      console.log("done.");
    });
  };
};
