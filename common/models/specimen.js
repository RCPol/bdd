var xlsx = require('node-xlsx');
var hash = require('object-hash');
var request = require('request');
var async = require('async');
var validator = require('validator');
var fs = require('fs');
module.exports = function(Specimen) {
  Specimen.inputFromURL = function(url,cb) {
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
      var term = data[2];
      var category = data[3];
      var label = data[4];
      data =  data.slice(5,data.length);

      var idIndexes = [1,2,3]; // institutionCode and collectionCode
      var rs = {};
      rs.count = 0;
      async.each(data, function iterator(line, callback){
        var record = {};
        record.id = defineId(line,idIndexes);
        if(record.id){
          rs.count ++;
          for(var c = 1; c < term.length; c++){
            if(line[c]){
              var field = toString(schema[c])+":"+toString(term[c]);
              var current = {};
              current.schema = toString(schema[c]);
              current.term = toString(term[c]);
              current.class = String(class_[c]).trim();
              if(toString(category[c])!="-" && toString(category[c])!=""){
                current.category = toString(category[c]);
              }
              current.label = toString(label[c]);
              current.value = toString(line[c]);
              // IMAGE
              if(current.term=="associatedMedia"){
                current.category = current.category?current.category:"Outro";
                if(typeof current.value === "string"){
                  current.url = current.value.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
                }
              }else
              // REFERENCE
              if(current.term=="bibliographicCitation"){
                current.category = current.category?current.category:"Outro";
                current.references = [];
                current.value.split("|").forEach(function (ref) {
                  current.references.push(ref.trim());
                });
              }else
              // INTERACTION
              if(current.class=="Interaction"){
                current.species = [];
                current.value.split("|").forEach(function (sp) {
                  current.species.push(sp.trim());
                });
              }else
              // FLOWERING PERIOD
              if(current.term=="floweringPeriod"){
                current.months = [];
                current.value.split("|").forEach(function (month) {
                  current.months.push(month.trim());
                });
              }else
              // LATITUDE
              if(current.term=="decimalLatitude"){
                var converted = convertDMSCoordinatesToDecimal(current.value);
                if(converted!=current.value){
                  current.rawValue = current.value;
                  current.value = converted;
                }
              }else
              // LONGITUDE
              if(current.term=="decimalLongitude"){
                var converted = convertDMSCoordinatesToDecimal(current.value);
                if(converted!=current.value){
                  current.rawValue = current.value;
                  current.value = converted;
                }
              }else
              //CAT
              if(current.class=="CategoricalDescriptor"){
                current.category = current.category?current.category:"Outro";
                current.id = hash.MD5(current.schema+":"+current.class+":"+current.term);
                current.states = [];
                current.value.split("|").forEach(function (state_) {
                  var state  = {};
                  state.value = state_.trim();
                  state.id = hash.MD5(current.schema+":"+current.class+":"+current.term+":"+state.value);
                  current.states.push(state);
                });
              }
              //NUM
              else if(current.class=="NumericalDescriptor"){
                current.category = current.category?current.category:"Outro";
                current.id = hash.MD5(current.schema+":"+current.class+":"+current.term);
                if(current.value.toUpperCase().indexOf("VALUE:")>0){
                  current.value = current.value.toUpperCase().split("VALUE:")[1].trim();
                }else{
                  current.value.split(";").forEach(function (item) {
                    if(item.toUpperCase().indexOf("MIN:")!=-1){
                      current.min = item.toUpperCase().split("MIN:")[1].trim();
                    } else if(item.toUpperCase().indexOf("MAX:")!=-1){
                      current.max = item.toUpperCase().split("MAX:")[1].trim();
                    } else if(item.toUpperCase().indexOf("MED:")!=-1){
                      current.mean = item.toUpperCase().split("MED:")[1].trim();
                    } else if(item.toUpperCase().indexOf("DVPAD:")!=-1){
                      current.sd = item.toUpperCase().split("DVPAD:")[1].trim();
                    }
                  });
                }
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
          Specimen.upsert(record,function (err,instance) {
            if(err)
              console.log(err);
            callback();
          });
        }else{
          callback();
        }
      }, function done(){
        cb(null, rs);
      });
    });
    request(url).pipe(w);
  };
  Specimen.cleanDB = function(cb) {
    Specimen.destroyAll(function (err,callback) {
      cb(err,callback)
    });
  }
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
    'inputFromURL',
    {
      http: {path: '/xlsx/inputFromURL', verb: 'get'},
      accepts: [
        {arg: 'url', type: 'string', required:true}
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
      idValue = idValue+":"+ String(line[idIndexes[j]]).trim();
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
    var Dataset = Specimen.app.models.Dataset;
    var dataset = {};
    dataset.id = name;
    dataset.urlSource = url;
    dataset.localSource = path;
    dataset.type = "Specimen";
    Dataset.upsert(dataset,function (err,instance) {
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
