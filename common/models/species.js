var async = require('async');
var hash = require('object-hash');
var request = require('request');
module.exports = function(Species) {

  Species.mainImage = function(id,cb) {
    Species.findById(id, function (err, data) {
      if(err) throw new Error(err);
      var url = "";
      console.log(data)
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
  Species.fromSpecimensAggregation = function(base,filter,cb) {
    Species.destroyAll({base:base},function(e,d){
      async.parallel([
        function en(callback) {
          selectScientificNames(base,"en-US",filter,function (scientificNames) {
            generateSpecies(base,"en-US",scientificNames,function(species) {
              callback();
            });
          });
        },
        function pt(callback) {
          selectScientificNames(base,"pt-BR",filter,function (scientificNames) {
            generateSpecies(base,"pt-BR",scientificNames,function(species) {
              callback();
            });
          });
        },
        function es(callback) {
          selectScientificNames(base,"es-ES",filter,function (scientificNames) {
            generateSpecies(base,"es-ES",scientificNames,function(species) {
              callback();
            });
          });
        }
      ],function done() {
        cb(null,"done");
      });
    });    
  };
  Species.remoteMethod(
    'fromSpecimensAggregation',
    {
      http: {path: '/fromSpecimensAggregation', verb: 'get'},
      accepts: [
        {arg: 'base', type: 'string', required:true},
        {arg: 'filter', type: 'array', required:false}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  function generateSpecies(base, language,sciName,cb) {
    var Specimen = Species.app.models.Specimen;
    var count = 0;
    async.each(sciName, function iterator(name, callback){
      var query = {where:{}};
      query.where[base+":"+language+":dwc:Taxon:scientificName.value"] = name;
      query.where.base = base;
      Specimen.find(query, function (err,specimens) {

        var species = {};
        species.specimens = species.specimens?species.specimens:[];
        species.collections = species.collections?species.collections:[];
        species["language"] = language;        
        species[base+":"+language+":dwc:Taxon:family"] = specimens[0][base+":"+language+":dwc:Taxon:family"];
        species.base = base;
        species[base+":"+language+":dwc:Taxon:scientificName"] = specimens[0][base+":"+language+":dwc:Taxon:scientificName"];
        species[base+":"+language+":dwc:Taxon:scientificNameAuthorship"] = specimens[0][base+":"+language+":dwc:Taxon:scientificNameAuthorship"];
        // TODO multiple specimens with different popular names
        species[base+":"+language+":dwc:Taxon:vernacularName"] = specimens[0][base+":"+language+":dwc:Taxon:vernacularName"];
        
        species[base+":"+language+":dwc:Occurrence:establishmentMean"] = specimens[0][base+":"+language+":dwc:Occurrence:establishmentMean"];
        species[base+":"+language+":rcpol:Sample:floweringPeriod"] = specimens[0][base+":"+language+":rcpol:Sample:floweringPeriod"]; //TODO isso é uma caracteristica da especie ou do especime?
        species[base+":"+language+":rcpol:Image:plantImage"] = specimens[0][base+":"+language+":rcpol:Image:plantImage"];
        species[base+":"+language+":rcpol:Image:flowerImage"] = specimens[0][base+":"+language+":rcpol:Image:flowerImage"];
        species[base+":"+language+":rcpol:Image:beeImage"] = specimens[0][base+":"+language+":rcpol:Image:beeImage"];
        species[base+":"+language+":rcpol:Image:pollenImage"] = specimens[0][base+":"+language+":rcpol:Image:pollenImage"];
        species[base+":"+language+":rcpol:Image:allPollenImage"] = specimens[0][base+":"+language+":rcpol:Image:allPollenImage"];
        species[base+":"+language+":rcpol:Image:allSporeImage"] = specimens[0][base+":"+language+":rcpol:Image:allSporeImage"];
        specimens.forEach(function (sp) {
          var specimen = {};
          specimen.id = sp.id;
          specimen.collection = sp.collection;
          species.specimens.push(specimen);          
          Object.keys(sp.toJSON()).forEach(function(key,index) {
            if(key!='collection'){
              if(sp[key].class=="CategoricalDescriptor"){
                if ( species[key] ) {                  
                  species[key].states.concat(sp[key].states);
                } else {
                  species[key] = sp[key];
                }
              } else if(sp[key].class=="Sample" || sp[key].schema=="dwc"){
                if(species[key]){
                  if(species[key].values)                  
                    species[key].values.concat(sp[key].values);
                  else 
                    species[key].states.concat(sp[key].states);
                }else{
                  species[key] = sp[key];
                }
              } else if(sp[key].class=="NumericalDescriptor"){
                if(!species[key]){
                  var values = sp[key].value.split(";");
                  species[key] = sp[key];
                  if(values.length != 4){
                    console.log("problema com valor numerico:");
                    console.log(key);
                    // console.log(species[key]);
                  } else {
                    var min = parseFloat(values[0].trim().slice(4).replace(",","."));
                    var max = parseFloat(values[1].trim().slice(4).replace(",","."));
                    var avg = parseFloat(values[2].trim().slice(4).replace(",","."));
                    var sd = parseFloat(values[2].trim().slice(4).replace(",","."));
                    species[key].numerical = {min: min, max: max, avg:avg, sd:sd};
                  }
                }
              } else if(sp[key].class=="Image"){
                if(species[key]){
                  species[key].images.concat(sp[key].images);
                }else{
                  species[key] = sp[key];
                }
              }
            }
          });
        });
        species.id = Species.app.defineSpeciesID(language,base,name);        
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
  function selectScientificNames(base, language,filter,cb) {
    var Specimen = Species.app.models.Specimen;
    var sp = Specimen.getDataSource().connector.collection(Specimen.modelName);
    sp.aggregate({'$match':{'language': language,base:base}},{
      $group: {
        _id: { value: '$'+base+":"+language+':dwc:Taxon:scientificName.value'}
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
