//var hash = require('object-hash');
var _ = require('underscore');

module.exports = function(Identification) {
  Identification.populate = function(filter, callback){
    Identification.getApp(function(err, app){
      if (err) throw new Error(err);
      var Species = app.models.Species;
      var BDD = app.dataSources.BDD;
      getIdentificationItems(filter, Identification, Species, BDD, callback);
    });
  };

  Identification.identify = function(param, callback) {
    //examples
    //param = [{"descriptor":"7", "state":76}, {"descriptor": "7", "state": 67}, {"descriptor": "7", "state": 30}, {"descriptor": "9", "state": 31}, {"descriptor": "9", "state": 36}, {"descriptor": "8", "state": 53}];

    //TODO: validate query

    console.log("received parameters:");
    console.log(param);

    composeQuery(param, function(query, queryMongo){
      Identification.find({where: query, fields: 'id'}, function (err, items) {
        if (err) throw new Error(err);
        var IdentificationCollection = Identification.getDataSource().connector.collection(Identification.modelName);

        IdentificationCollection.aggregate([
          { $match: queryMongo},
          { $unwind: '$states'},
          { $unwind: '$states.states'},
          { $project: {
            _id: 0,
            'descriptor': '$states.descriptor',
            //'state': '$states.state'
            'state': '$states.states'
          }},
          { $group: {
            _id: { descriptor: '$descriptor', state: '$state'},
            sum: {$sum:1}
          }},
          { $project: {
            _id: 0,
            descriptor: '$_id.descriptor',
            state: '$_id.state',
            count: '$sum'
          }},
          { $group: {
            _id: '$descriptor',
            states: {$push: {state: '$state', count: '$count'}}
          }},
          { $project:{
            //_id: 0,
            descriptor: '$_id.descriptor',
            states: '$states'
          }}
        ], function (error, states) {
          if (err) throw new Error(err);
          var results = {eligibleItems: items, eligibleStates: states};
          //console.log(results);
          callback(null, results);
        });
      });
    });
  };

  Identification.remoteMethod(
    'populate',
    {
      accepts: {arg: 'filter', type: 'object'},
      returns: {arg: 'response', type: 'number'}
    }
  );

  Identification.remoteMethod(
    'identify',
    {
      accepts: {arg: 'param', type: 'array'},
      returns: {arg: 'response', type: 'object'}
    }
  );
};

function getIdentificationItems(filter, Identification, Species, mongoDs, callback){
  Species.find({where: filter}, function(err, all_species){
    if (err) throw new Error(err);

    var list_of_items = [];
    all_species.forEach(function(species){
      var identification_item = {};

      identification_item.id = species.id;
      identification_item["states"] = [];
      Object.keys(species).forEach(function(key){
        if (species.hasOwnProperty(key) && key.indexOf("rcpol") != -1){
          // we only want "rcpol"'s descriptors
          // we can have multiple states

          var entry = {
            //descriptor: "rcpol:" + species[key].term, //DEBUG
            descriptor: species[key].id,
            states: []
          };

          species[key].states.forEach(function(state){
            entry.states.push(
              //"rcpol:" + species[key].term + ":" + state.value //DEBUG
              state.id
            );
          });

          identification_item["states"].push(entry);
        }
      });
      list_of_items.push(identification_item);
    });

    mongoDs.automigrate('Identification', function(err){
      if (err) throw new Error(err);
      Identification.upsert(list_of_items, function(err, results){
        if (err) throw new Error(err);
        callback(null, list_of_items.length);
      });
    });
  });
};

function composeQuery(param, callback){
  /*
   param: [{"descriptor":"7", "state":76}, {"descriptor": "7", "state": 67}, {"descriptor": "7", "state": 30}, {"descriptor": "9", "state": 31}, {"descriptor": "9", "state": 36}, {"descriptor": "8", "state": 53}]

   for mongoDB

   query: {$and: [
       {$or: [{"states.descriptor": "7", "states.state": 76}, {"states.descriptor": "7", "states.state": 67}, {"states.descriptor": "7", "states.state": 30}]},
       {$or: [{"states.descriptor": "9", "states.state": 31}, {"states.descriptor": "9", "states.state": 36}]},
       {$or: [{"states.descriptor": "8", "states.state": 53}]}]}

   for loopback

   query: {and: [
   {or: [{"states.descriptor": "7", "states.state": 76}, {"states.descriptor": "7", "states.state": 67}, {"states.descriptor": "7", "states.state": 30}]},
   {or: [{"states.descriptor": "9", "states.state": 31}, {"states.descriptor": "9", "states.state": 36}]},
   {or: [{"states.descriptor": "8", "states.state": 53}]}]}

   */

  var param_fixed = [];
  //append "states." to each field
  param.forEach(function(elem){
    param_fixed.push({
      "states.descriptor": elem['descriptor'],
      "states.state": elem['state']
    });
  });
  param = param_fixed;

  var param_grouped_by_descriptor = _.groupBy(param, function(elem){ return elem["states.descriptor"]; });

  if (param.length == 0) callback({}, {});
  else {
    var query = {and: []};
    var queryMongo = {$and: []};
    Object.keys(param_grouped_by_descriptor).forEach(function(descriptor){
      query.and.push({or: param_grouped_by_descriptor[descriptor]});
      queryMongo.$and.push({$or: param_grouped_by_descriptor[descriptor]});
    });

    callback(query, queryMongo);
  }
};
