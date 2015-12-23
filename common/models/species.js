var async = require('async');
var hash = require('object-hash');
module.exports = function(Species) {
  Species.fromSpecimensAggregation = function(filter,cb) {
    selectScientificNames(filter,function (scientificNames) {
      generateSpecies(scientificNames,function(species) {
        cb(null,species)
      })
    });
  }
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
              } else if(sp[key].class=="NumericalDescriptor"){
                if(species[key]){

                }else{
                  species[key] = sp[key];
                  species[key].states = [];
                  var min = parseFloat(species[key].min.replace(",","."));
                  var max = parseFloat(species[key].max.replace(",","."));
                  if(min < 11 ||  max < 11){
                    species[key].states.push("Muito pequeno");
                  }
                  if((min > 11 && min < 21) ||  (max < 11 && max > 21)){
                    species[key].states.push("Pequeno");
                  }
                  if((min > 21 && min < 31) ||  (max < 21 && max > 31)){
                    species[key].states.push("Médio");
                  }
                  if((min > 31 && min < 41) ||  (max < 31 && max > 41)){
                    species[key].states.push("Grande");
                  }
                  if(min > 41 || max > 41){
                    species[key].states.push("Muito Grande");
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
        })
      })
    }, function done(){
      cb(count)
    })
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
