var async = require('async');
var hash = require('object-hash');
module.exports = function(Species) {
  Species.fromSpecimens = function(filter,cb) {
    selectScientificNames(filter,function (scientificNames) {
      generateSpecies(scientificNames,function(species) {
        cb(null,species)
      })
    });
  }
  Species.remoteMethod(
    'fromSpecimens',
    {
      http: {path: '/generatesFromSpecimens', verb: 'get'},
      accepts: [
        {arg: 'filter', type: 'array', required:false}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  function generateSpecies(sciName,cb) {
    var Specimen = Species.app.models.Specimen;
    var speciesList = [];
    async.each(sciName, function iterator(name, callback){
      Specimen.find({where:{"dwc:scientificName.value":name}}, function (err,specimens) {
        var species = {};
        specimens.forEach(function (sp) {
        // Object.keys(item).forEach(function(key,index) {
        //   if(key!='__cachedRelations'&&key!='__data'&&key!='__dataSource'&&key!='__strict'&&key!='__persisted'){
        //     if(typeof item[key].value == "string")
        //       species[key] = "String"
        //     else if(typeof item[key].value == "array")
        //       species[key] = "Array"
        //     else
        //       species[key] = "None"
        //   }
        // })
          species = sp;
        });
        species.id = hash.MD5(name);

        speciesList.push(species);
        callback();
      })
    }, function done(){
      cb(speciesList)
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
