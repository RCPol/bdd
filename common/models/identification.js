var _ = require('underscore');
var async = require('async');
var google = require('googleapis');
var key = require('rcpol-google-key.json');
const VIEW_ID = 'ga:128522305';

module.exports = function(Identification) {
  Identification.accessCount = function(cb) {    
    var jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, ['https://www.googleapis.com/auth/analytics.readonly'], null);    
    jwtClient.authorize(function(err, tokens) {
      if (err) {
        console.log("Autorize access count: ",err);
        cb('','');   
      } else {
        var analytics = google.analytics('v3');
        var now = new Date();
        var year = now.getFullYear();
        var month = (now.getMonth()+1).toString().length==1?"0"+(now.getMonth()+1):now.getMonth()+1;
        var day = now.getDate().toString().length==1?"0"+now.getDate():now.getDate();                  
        analytics.data.ga.get({
            'auth': jwtClient,
            'ids': VIEW_ID,
            'metrics': 'ga:pageviews',
            'dimensions': 'ga:pagePath',
            'start-date': '2016-08-23',
            'end-date': year+'-'+month+'-'+day,
            'sort': '-ga:pageviews',
            'max-results': 10,        
          }, function (err, response) {
            if (err) {
              console.log("Access count: ",err);
              cb('','');            
            } else {
              // console.log("Count",JSON.stringify(response, null, 4));
              cb(err,response.rows[0][1]);          
            }          
        }); 
      }      
    });
  }   
  Identification.activeUsers = function(cb) {
    var jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, ['https://www.googleapis.com/auth/analytics.readonly'], null);
    jwtClient.authorize(function(err, tokens) {
      if (err) {
        console.log(err);
        cb('','');
      }
      var analytics = google.analytics('v3');      
      analytics.data.realtime.get({
            'auth': jwtClient,
            'ids': VIEW_ID,
            'metrics': 'rt:activeUsers',
            'dimensions': 'rt:medium',              
          }, function (err, response) {
            if (err) {
              console.log('Active Users',err);
              cb('','');
              // return;
            } else {
              cb(err,response.totalsForAllResults['rt:activeUsers']);
            }
            // console.log("LOG: ",response.totalsForAllResults['rt:activeUsers']);            
            // console.log(JSON.stringify(response, null, 4));
        });         
    });
  } 
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
    //{"language":"pt-BR", "states":[{"states.states.id":"pt-BR:rcpol:State:flowerColorPurple"}], "numerical": [{"descriptor_id":"pt-BR:rcpol:NumericalDescriptor:polarAxis", "value":{"min":30, "max":40}}]}

    param.language = typeof param.language != "undefined"?param.language:"pt-BR";
    param.base = param.base;
    param.states = typeof param.states != "undefined"?param.states:[];
    param.numerical = typeof param.numerical != "undefined"?param.numerical:[];

    console.log("received parameters:");
    console.log(param);

    composeQuery(param, function(query, queryMongo){
      queryMongo.base = param.base;
      query.base = param.base;
      // console.log("******** QUERY ********\n",JSON.stringify(queryMongo));
      Identification.find({where: queryMongo, fields: 'id'}, function (err, items) {
        if (err) throw new Error(err);
        var IdentificationCollection = Identification.getDataSource().connector.collection(Identification.modelName);

        IdentificationCollection.aggregate([
          { $match: queryMongo}, // utilizar a query para filtar apenas as espécies que queremos
           // cada espécie tem uma lista de descritores, cada um com uma lista de estados. Montar uma lista unindo todos estes descritores
          /* exemplo:
           {
             id: especie1
             states: [
               {descritor:descritor1.
                estados:[estado1]
               },
               {descritor:descritor2.
                estados:[estado2, estado3]
               }
             ]
           }
           {
             id: especie2
             states: [
               {descritor:descritor1.
                estados:[estado1, estado4]
               },
               {descritor:descritor2.
                estados:[estado2]
               }
             ]
           }
           __________________
           $unwind: '$states'
           __________________

           [
            {id:especie1,
             descritor:descritor1.
             estados:[estado1]
            },
            {id:especie1,
             descritor:descritor2.
             estados:[estado2, estado3]
            }
            {id:especie2,
             descritor:descritor1.
             estados:[estado1, estado4]
            },
            {id:especie2,
             descritor:descritor2.
             estados:[estado2]
            }
           ]
           __________________
           $unwind: '$states.states'
           __________________

           [
               {id: especie1,
                descritor:descritor1.
                estados:estado1
               },
               {id:especie1,
                descritor:descritor2.
                estados:estado2
               },
               {id:especie1,
                descritor:descritor2.
                estados:estado3
               },
               {id:especie2
                descritor:descritor1.
                estados:estado1
               },
               {id:especie2,
                descritor:descritor1.
                estados:estado4
               },
               {id:especie2,
                descritor:descritor2.
                estados:estado2
               }
           ]

           */
          { $unwind: '$states'},
          { $unwind: '$states.states'},
          /*
           para cada elemento da lista, extrair apenas o id do estado
           ________
           $project
           ________

           [
               {
                id:estado1
               },
               {
                id:estado2
               },
               {
                id:estado3
               },
               {
                id:estado1
               },
               {
                id:estado4
               },
               {
                id:estado2
               }
           ]

           e então contar o número de espécies de cada estado

           [
              {estado: estado1, count:2},
              {estado: estado2, count:2},
              {estado: estado3, count:1},
              {estado: estado4, count:1},
           ]
           */
          { $project: {
            _id: 0,
            'state': '$states.states.id'
          }},
          { $group: {
            _id: '$state',
            count: {$sum:1}
          }}
        ], function (error, states) {
          // console.log("****** ELIGIBLE STATES ***** \n: ",states);
          if (err) throw new Error(err);
          var results = {eligibleStates: states, eligibleSpecies: items};
          callback(null, results);
        });
      });
    });
  };
  Identification.remoteMethod(
    'activeUsers',
    {
      http: {verb: 'get'},      
      returns: {arg: 'response', type: 'number'}
    }
  );
  Identification.remoteMethod(
    'accessCount',
    {
      http: {verb: 'get'},      
      returns: {arg: 'response', type: 'number'}
    }
  );
  Identification.remoteMethod(
    'populate',
    {
      http: {verb: 'get'},
      accepts: [{arg: 'filter', type: 'object'}],
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
  // filter = filter?filter:{};
  // filter.base = base;
  Species.find({where: filter}, function(err, all_species){
    if (err) throw new Error(err);

    var list_of_items = [];
    async.eachSeries(all_species, function(species, callback1){
      var identification_item = {};
      identification_item.id = species.id; 
      identification_item.base = species.base; 
      // identification_item.base = base;      
      identification_item["states"] = [];
      async.forEachOfSeries(species, function(item, key, callback2){
        if (species.hasOwnProperty(key) && species[key] && (species[key].class == "CategoricalDescriptor" || species[key].class == "NumericalDescriptor") && species[key].term != "espexi"){
          //TODO: handle pollenShape and espexi
          // we only want entries with classes CategoricalDescriptor or NumericalDescriptor
          // we can have multiple states

          var entry = {
            language: species[key].language,
            base: species.base,
            id: species[key].id,
            order: species[key].order,
            schema: species[key].schema,
            class: species[key].class,
            term: species[key].term,
            category: species[key].category,
            descriptor: species[key].field
          };

          if(species[key].states){
            entry.states = [];
            async.eachSeries(species[key].states, function(state, callback3){
              var entry_state = {value:state.state, order:state.order, id:state.id};
              entry.states.push(entry_state );
              callback3();
            }, function(err){
              if (err) throw new Error(err);
              identification_item["states"].push(entry);
              callback2();
            });
          } else if (species[key].numerical){
            entry.numerical = species[key].numerical;
            identification_item["states"].push(entry);
            callback2();
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
  var base = param.base;;

  var param_grouped_by_descriptor = _.groupBy(categorical_param, function(elem){ return elem["states.states.id"]; });

  if (categorical_param.length == 0 && numerical_param.length == 0) callback({"states.language": lang,"states.base": base}, {"states.language": lang,"states.base": base});

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
                     "numerical.min": {lte: Number(elem.value.min)},
                     "numerical.max": {gte: Number(elem.value.max)}
                    }}});
      queryMongo.$and.push(
        {"states": {"$elemMatch":
                    {"id": elem.descriptor_id,
                     "numerical.min": {$lte: Number(elem.value.min)},
                     "numerical.max": {$gte: Number(elem.value.max)}
                    }}});
    });
    callback(query, queryMongo);
  }
};
