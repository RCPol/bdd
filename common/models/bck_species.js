var async = require('async');
var hash = require('object-hash');
var request = require('request');
module.exports = function(Species) {
  Species.mainImage = function(id,cb) {
    Species.findById(id, function (err, data) {
      if(err) throw new Error(err);
      var url = "";
      if(data["dwc:associatedMedia"]){
        // ensure it is an array
        var associatedMedia = data["dwc:associatedMedia"];
        if (!(Array.isArray(associatedMedia))) associatedMedia = [associatedMedia];
        if(associatedMedia.length>0){
          associatedMedia.forEach(function(media){
            if (media.category == "Flor"){
              var url = "/thumbnails/" + media.name + ".jpg";
              cb(err, url);
            }
          });
        } else {
          cb(err, url);
        }
      } else {
        cb(err, url);
      }
    });
  };
  Species.remoteMethod(
    'mainImage',
    {
      http: {path: '/mainImage', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'array', required:true}
      ],
      returns: {arg: 'response', type: 'string'}
    }
  );
  Species.fromSpecimensAggregation = function(filter,cb) {
    selectScientificNames(filter,function (scientificNames) {
      generateSpecies(scientificNames,function(species) {
        cb(null,species);
      });
    });
  };
  Species.remoteMethod(
    'fromSpecimensAggregation',
    {
      http: {path: '/fromSpecimensAggregation', verb: 'get'},
      accepts: [
        {arg: 'filter', type: 'array', required:false}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  function generateSpecies(sciName,cb) {
    var Specimen = Species.app.models.Specimen;
    var count = 0;
    async.each(sciName, function iterator(name, callback){
      Specimen.find({where:{"dwc:scientificName.value":name}}, function (err,specimens) {
        var species = {};
        species.specimens = [];
        species["dwc:family"] = specimens[0]["dwc:family"];
        species["dwc:scientificName"] = specimens[0]["dwc:scientificName"];
        species["dwc:scientificNameAuthorship"] = specimens[0]["dwc:scientificNameAuthorship"];
        species["dwc:establishmentMean"] = specimens[0]["dwc:establishmentMean"];
        species["rcpol:floweringPeriod"] = specimens[0]["rcpol:floweringPeriod"]; //TODO isso é uma caracteristica da especie ou do especime?
        species["dwc:associatedMedia"] = specimens[0]["dwc:associatedMedia"];
        specimens.forEach(function (sp) {
          species.specimens.push({id:sp.id});
          Object.keys(sp).forEach(function(key,index) {
            if(key!='__cachedRelations'&&key!='__data'&&key!='__dataSource'&&key!='__strict'&&key!='__persisted'){
              if(sp[key].class=="CategoricalDescriptor"){
                if(species[key]){
                  species[key].states.concat(sp[key].states);
                }else{
                  species[key] = sp[key];
                }
              } else if(sp[key].class=="NumericalDescriptor" && sp[key].term!="pollenShapePE"){
                if(!species[key]){
                  //if(sp[key].term=="pollenShapePE"){
                  //}else{
                    species[key] = sp[key];
                    species[key].states = [];
                    var min = parseFloat(species[key].min.replace(",","."));
                    var max = parseFloat(species[key].max.replace(",","."));
                    if(min <= 10 ||  max <= 10){
                      var state = {};
                      state.value = "Muito pequeno";
                      state.id = hash.MD5(sp[key].schema+":"+sp[key].class+":"+sp[key].term+":"+state.value);
                      species[key].states.push(state);
                    }
                    if((min >= 10 && min <= 25) ||  (max >= 10 && max <= 25)){
                      var state = {};
                      state.value = "Pequeno";
                      state.id = hash.MD5(sp[key].schema+":"+sp[key].class+":"+sp[key].term+":"+state.value);
                      species[key].states.push(state);
                    }
                    if((min >= 25 && min <= 50) ||  (max >= 25 && max <= 50)){
                      var state = {};
                      state.value = "Médio";
                      state.id = hash.MD5(sp[key].schema+":"+sp[key].class+":"+sp[key].term+":"+state.value);
                      species[key].states.push(state);
                    }
                    if((min >= 50 && min <= 100) ||  (max >= 50 && max <= 100)){
                      var state = {};
                      state.value = "Grande";
                      state.id = hash.MD5(sp[key].schema+":"+sp[key].class+":"+sp[key].term+":"+state.value);
                      species[key].states.push(state);
                    }
                    if((min >= 100 && min <= 200) ||  (max >= 100 && max <= 200)){
                      var state = {};
                      state.value = "Muito Grande";
                      state.id = hash.MD5(sp[key].schema+":"+sp[key].class+":"+sp[key].term+":"+state.value);
                      species[key].states.push(state);
                    }
                    if(min >= 200 || max >= 200){
                      var state = {};
                      state.value = "Gigante";
                      state.id = hash.MD5(sp[key].schema+":"+sp[key].class+":"+sp[key].term+":"+state.value);
                      species[key].states.push(state);
                    }
                }
              } else if(sp[key].class=="NumericalDescriptor" && sp[key].term=="pollenShapePE"){
                if(!species[key]){
                    species[key] = sp[key];
                    species[key].states = [];
                    var min = parseFloat(species[key].min.replace(",","."));
                    var max = parseFloat(species[key].max.replace(",","."));
                    if(min <= 0.5 ||  max <= 0.5){
                      var state = {};
                      state.value = "Peroblato";
                      state.id = hash.MD5(sp[key].schema+":"+sp[key].class+":"+sp[key].term+":"+state.value);
                      species[key].states.push(state);
                    }
                    if((min > 0.5 && min <= 0.74) ||  (max > 0.5 && max <= 0.74)){
                      var state = {};
                      state.value = "Oblato";
                      state.id = hash.MD5(sp[key].schema+":"+sp[key].class+":"+sp[key].term+":"+state.value);
                      species[key].states.push(state);
                    }
                    if((min > 0.74 && min <= 0.87) ||  (max > 0.74 && max <= 0.87)){
                      var state = {};
                      state.value = "Suboblato";
                      state.id = hash.MD5(sp[key].schema+":"+sp[key].class+":"+sp[key].term+":"+state.value);
                      species[key].states.push(state);
                    }
                    if((min > 0.87 && min <= 0.99) ||  (max > 0.87 && max <= 0.99)){
                      var state = {};
                      state.value = "Oblato-esferoidal";
                      state.id = hash.MD5(sp[key].schema+":"+sp[key].class+":"+sp[key].term+":"+state.value);
                      species[key].states.push(state);
                    }
                    if((min > 0.99 && min <= 1) ||  (max > 0.99 && max <= 1)){
                      var state = {};
                      state.value = "Esfeirodal";
                      state.id = hash.MD5(sp[key].schema+":"+sp[key].class+":"+sp[key].term+":"+state.value);
                      species[key].states.push(state);
                    }
                    if((min > 1 && min <= 1.14) ||  (max > 1 && max <= 1.14)){
                      var state = {};
                      state.value = "Prolato-esferoidal";
                      state.id = hash.MD5(sp[key].schema+":"+sp[key].class+":"+sp[key].term+":"+state.value);
                      species[key].states.push(state);
                    }
                    if((min > 1.14 && min <= 1.33) ||  (max > 1.14 && max <= 1.33)){
                      var state = {};
                      state.value = "Subprolato";
                      state.id = hash.MD5(sp[key].schema+":"+sp[key].class+":"+sp[key].term+":"+state.value);
                      species[key].states.push(state);
                    }
                    if((min > 1.33 && min <= 2) ||  (max > 1.33 && max <= 2)){
                      var state = {};
                      state.value = "Prolato";
                      state.id = hash.MD5(sp[key].schema+":"+sp[key].class+":"+sp[key].term+":"+state.value);
                      species[key].states.push(state);
                    }
                    if(min >= 2 || max >= 2){
                      var state = {};
                      state.value = "Perprolato";
                      state.id = hash.MD5(sp[key].schema+":"+sp[key].class+":"+sp[key].term+":"+state.value);
                      species[key].states.push(state);
                    }
                }
              }
            }
          });
        });
        species.id = hash.MD5(name);
        Species.upsert(species,function (err,instance) {
          if(err)
            console.log(err);
          count++;
          callback();
        });
      });
    }, function done(){
      cb(count);
    });
  }
  function selectScientificNames(filter,cb) {
    var Specimen = Species.app.models.Specimen;
    var sp = Specimen.getDataSource().connector.collection(Specimen.modelName);
    sp.aggregate({
      $group: {
        _id: { value: '$dwc:scientificName.value'}
      }
    }, function(err, groupByRecords) {
      if(err) {
        console.log(err,groupByRecords);
      } else {
        cb(groupByRecords.map(function(item) {
          return item._id.value;
        }));
      }
    });
  }
};
