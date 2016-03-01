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
    //param = ['schema:term:state'];

    //TODO: validate query

    console.log("received parameters:");
    console.log(param);

    composeQuery(param, function(query, queryMongo){
      console.log(JSON.stringify(query));
      Identification.find({where: query, fields: 'id'}, function (err, items) {
        console.log(items.length);
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
            'term': '$states.term',
            'state': '$states.states'
          }},
          { $group: {
            _id: { descriptor: '$descriptor', id: '$id', state: '$state', category:"$category", term:"$term"},
            sum: {$sum:1}
          }},
          { $project: {
            _id: 0,
            descriptor: '$_id.descriptor',
            id: '$_id.id',
            state: '$_id.state',
            category: '$_id.category',
            term: '$_id.term',
            count: '$sum'
          }},
          { $group: {
            _id: { descriptor: '$descriptor',category: '$category', id: '$id', term:'$term'},
            states: {$push: {state: '$state', count: '$count'}}
          }},
          { $project:{
            _id: 0,
            category_name: '$_id.category',
            descriptor_name: '$_id.descriptor',
            descriptor_id: '$_id.id',
            descriptor_term: '$_id.term',
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
      http: {verb: 'get'},
      accepts: {arg: 'filter', type: 'object'},
      returns: {arg: 'response', type: 'number'}
    }
  );

  Identification.remoteMethod(
    'identify',
    {
      http: {verb:'get'},
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
            term: species[key].term,
            states: []
          };

          console.log(key);
          console.log(species[key]);

          var prefix = species[key].schema + ":" + species[key].term + ":";
          if(species[key].states){
            species[key].states.forEach(function(state){
              entry.states.push(
                prefix + state.value
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
   param: ["schema:term1:state1", "schema:term1:state2", "schema:term2:state3"]

   for mongoDB

   query: {$and :[
        {$or: [{"states.descritor": "term1", "states.states": "schema:term1:state1"}, {"states.descritor": "term1", "states.states": "schema:term1:state2"}]},
        {$or: [{"states.descritor": "term2", "states.states": "schema:term2:state3"}]}
   ]}

   for loopback

   query: {and :[
        {or: [{"states.descritor": "term1", "states.states": "schema:term1:state1"}, {"states.descritor": "term1", "states.states": "schema:term1:state2"}]},
        {or: [{"states.descritor": "term2", "states.states": "schema:term2:state3"}]}
   ]}

   */

  var param_fixed = [];
  //append "states." to each field
  param.forEach(function(elem){
    param_fixed.push({
      "states.term": elem.split(":")[1],
      "states.states": elem
    });
  });
  param = param_fixed;

  var param_grouped_by_descriptor = _.groupBy(param, function(elem){ return elem["states.term"]; });

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
