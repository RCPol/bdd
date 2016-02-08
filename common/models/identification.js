//var hash = require('object-hash');
var _ = require('underscore');
//var mad = require('mongo-aggregation-debugger')(); //FOR DEBUGGING THE AGGREGATION

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

        /*FOR DEBUGGING THE AGGREGATION
         Identification.find(function(err, id_items){

          mad.log(id_items, [
            { $unwind: '$states'},
            { $unwind: '$states.states'},
            { $project: {
              _id: 0,
              'descriptor': '$states.descriptor',
              'id': '$states.id',
              'state': '$states.states'
            }},
            { $group: {
              _id: { descriptor: '$descriptor', id: '$id', state: '$state'},
              sum: {$sum:1}
            }},
            { $project: {
              _id: 0,
              descriptor: '$_id.descriptor',
              id: '$_id.id',
              state: '$_id.state',
              count: '$sum'
            }},
            { $group: {
              _id: { descriptor: '$descriptor', id: '$id'},
              states: {$push: {state: '$state', count: '$count'}}
            }},
            { $project:{
              _id: 0,
              descriptor: '$_id.descriptor',
              id: '$_id.id',
              states: '$states'
            }}
          ], function(err){
            if(err) throw new Error(err);
          });
        });*/

        IdentificationCollection.aggregate([
          { $match: queryMongo},
          { $unwind: '$states'},
          { $unwind: '$states.states'},
          { $project: {
            _id: 0,
            'descriptor': '$states.descriptor',
            'category': '$states.category',
            'id': '$states.id',
            'state': '$states.states'
          }},
          { $group: {
            _id: { descriptor: '$descriptor', id: '$id', state: '$state', category:"$category"},
            sum: {$sum:1}
          }},
          { $project: {
            _id: 0,
            descriptor: '$_id.descriptor',
            id: '$_id.id',
            state: '$_id.state',
            category: '$_id.category',
            count: '$sum'
          }},
          { $group: {
            _id: { descriptor: '$descriptor',category: '$category', id: '$id'},
            states: {$push: {state: '$state', count: '$count'}}
          }},
          { $project:{
            _id: 0,
            category_name: '$_id.category',
            descriptor_name: '$_id.descriptor',
            descriptor_id: '$_id.id',
            states: '$states'
          }}
        ], function (error, states) {
          if (err) throw new Error(err);
          var results = {eligibleItems: items, eligibleStates: states};
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
            category: species[key].category,
            descriptor: species[key].label,
            id: species[key].id,
            states: []
          };

          console.log(key);
          console.log(species[key]);

          if(species[key].states){
          species[key].states.forEach(function(state){
            entry.states.push(
              state.value //DEBUG
              //state.id
            );
          });
          }

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
       {$or: [{"states.descriptor": "7", "states.states": 76}, {"states.descriptor": "7", "states.states": 67}, {"states.descriptor": "7", "states.states": 30}]},
       {$or: [{"states.descriptor": "9", "states.states": 31}, {"states.descriptor": "9", "states.states": 36}]},
       {$or: [{"states.descriptor": "8", "states.states": 53}]}]}

   for loopback

   query: {and: [
   {or: [{"states.descriptor": "7", "states.states": 76}, {"states.descriptor": "7", "states.states": 67}, {"states.descriptor": "7", "states.states": 30}]},
   {or: [{"states.descriptor": "9", "states.states": 31}, {"states.descriptor": "9", "states.states": 36}]},
   {or: [{"states.descriptor": "8", "states.states": 53}]}]}

   */

  var param_fixed = [];
  //append "states." to each field
  param.forEach(function(elem){
    param_fixed.push({
      "states.descriptor": elem['descriptor'],
      "states.states": elem['state']
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
