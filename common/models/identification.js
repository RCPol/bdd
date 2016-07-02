var _ = require('underscore');
var async = require('async');

module.exports = function(Identification) {
  Identification.populate = function(filter, callback){
    Identification.getApp(function(err, app){
      if (err) throw new Error(err);
      var Species = app.models.Species;
      var Schema = app.models.Schema;
      var BDD = app.dataSources.BDD;
      getIdentificationItems(filter, Identification, Species, Schema, BDD, callback);
    });
  };

  Identification.identify = function(param, callback) {
    //TODO: validate query
    //examples
    //{language:pt-BR, states:[{states.states.id:pt-BR:rcpol:State:flowerColorPurple}], numerical: []}
    //{"language":"pt-BR", "states":[{"states.states.id":"pt-BR:rcpol:State:flowerColorPurple"}], "numerical": [{"descriptor_id":"pt-BR:rcpol:NumericalDescriptor:polarAxis", "value":"5.0"}]}


    console.log("received parameters:");
    console.log(param);

    composeQuery(param, function(query, queryMongo){
      console.log(JSON.stringify(queryMongo));
      Identification.find({where: queryMongo, fields: 'id'}, function (err, items) {
        if (err) throw new Error(err);
        var IdentificationCollection = Identification.getDataSource().connector.collection(Identification.modelName);

        IdentificationCollection.aggregate([
          { $match: queryMongo},
          { $unwind: '$states'},
          { $unwind: '$states.states'},
          { $project: {
            _id: 0,
            'schema': '$states.schema',
            'class': '$states.class',
            'descriptor': '$states.descriptor',
            'category': '$states.category',
            'id': '$states.id',
            'term': '$states.term',
            'order': '$states.order',
            'state': '$states.states'
          }},
          { $group: {
            _id: { schema: '$schema', class: '$class', descriptor: '$descriptor', id: '$id', state: '$state', category:"$category", term:"$term", order:'$order'},
            sum: {$sum:1}
          }},
          { $project: {
            _id: 0,
            schema: '$_id.schema',
            class: '$_id.class',
            descriptor: '$_id.descriptor',
            id: '$_id.id',
            state: '$_id.state',
            category: '$_id.category',
            term: '$_id.term',
            order: '$_id.order',
            count: '$sum'
          }},
          { $group: {
            _id: { schema: '$schema', class: '$class', descriptor: '$descriptor',category: '$category', id: '$id', term:'$term', order:'$order'},
            states: {$push: {state: '$state', count: '$count'}}
          }},
          { $project:{
            _id: 0,
            schema: '$_id.schema',
            class: '$_id.class',
            category_name: '$_id.category',
            descriptor_name: '$_id.descriptor',
            descriptor_id: '$_id.id',
            descriptor_term: '$_id.term',
            order: '$_id.order',
            states: '$states'
          }}
        ], function (error, states) {
          if (err) throw new Error(err);
          var ordered_states = _.sortBy(states, 'order');
          var results = {eligibleItems: items, eligibleStates: ordered_states};
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
      accepts: {arg: 'param', type: 'object'},
      returns: {arg: 'response', type: 'object'}
    }
  );
};

function getIdentificationItems(filter, Identification, Species, Schema, mongoDs, callback){
  Species.find({where: filter}, function(err, all_species){
    if (err) throw new Error(err);

    var list_of_items = [];
    async.eachSeries(all_species, function(species, callback1){
      var identification_item = {};
      identification_item.id = species.id;
      identification_item["states"] = [];
      async.forEachOfSeries(species, function(item, key, callback2){
        if (species.hasOwnProperty(key) && species[key] && species[key].term != "pollenShape" && (species[key].class == "CategoricalDescriptor" || species[key].class == "NumericalDescriptor") && species[key].term != "espexi"){
          //TODO: handle pollenShape and espexi
          // we only want entries with classes CategoricalDescriptor or NumericalDescriptor
          // we can have multiple states

          var entry = {
            language: species[key].language,
            id: species[key].id,
            order: species[key].order,
            schema: species[key].schema,
            class: species[key].class,
            term: species[key].term,
            category: species[key].category,
            descriptor: species[key].field,
            states: []
          };

          if(species[key].states){
            async.eachSeries(species[key].states, function(state, callback3){
              var entry_state = {value:state.state, order:state.order, id:state.id};
              if (state.numerical)
                entry_state.numerical = state.numerical;
              entry.states.push(entry_state );
              callback3();
            }, function(err){
              if (err) throw new Error(err);
              identification_item["states"].push(entry);
              callback2();
            });
          } else {
            identification_item["states"].push(entry);
            callback2();
          }

        } else callback2();
      }, function(err){
        if (err) throw new Error(err);
        list_of_items.push(identification_item);
        callback1();
      });
    }, function(err) {
      if (err) throw new Error(err);
      mongoDs.automigrate('Identification', function(err){
        if (err) throw new Error(err);
        Identification.upsert(list_of_items, function(err, results){
          if (err) throw new Error(err);
          callback(null, list_of_items.length);
        });
      });

    });

  });
};

function composeQuery(param, callback){
  var categorical_param = param.states;
  var numerical_param = param.numerical;
  var lang = param.language;;

  var param_grouped_by_descriptor = _.groupBy(categorical_param, function(elem){ return elem["states.states.id"]; });

  if (categorical_param.length == 0 && numerical_param.length == 0) callback({"states.language": lang}, {"states.language": lang});

  else {
    var query = {and: []};
    var queryMongo = {$and: []};
    Object.keys(param_grouped_by_descriptor).forEach(function(descriptor){
      query.and.push({or: param_grouped_by_descriptor[descriptor]});
      queryMongo.$and.push({$or: param_grouped_by_descriptor[descriptor]});
    });
    // numerical descriptors:
    numerical_param.forEach(function(elem){
      query.and.push(
        {"states": {"elemMatch":
                    {"id": elem.descriptor_id,
                     "states.numerical.min": {lt: elem.value},
                     "states.numerical.max": {gt: elem.value}
                    }}});
      queryMongo.$and.push(
        {"states": {"$elemMatch":
                    {"id": elem.descriptor_id,
                     "states.numerical.min": {$lt: elem.value},
                     "states.numerical.max": {$gt: elem.value}
                    }}});
    });
    callback(query, queryMongo);
  }
};
