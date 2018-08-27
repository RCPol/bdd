var loopback = require('loopback');
var boot = require('loopback-boot');
var path = require('path');
var mustache = require('mustache');
var fs = require('fs');
var hash = require('object-hash');
var async = require('async');
require('compression');
var app = module.exports = loopback();

app.start = function() {
  app.defineSchemaID = function(base,language, schema, class_, term, state) {    
    schema = (typeof schema == 'undefined')?'':String(schema).trim();
    class_ = (typeof class_ == 'undefined')?'':String(class_).trim();
    term = (typeof term == 'undefined')?'':String(term).trim();
    state = (typeof state == 'undefined' || state == null)?'':String(state).trim();
    if(base && base.trim().length>0 && language && language.trim().length>0 && schema.trim().length>0 && class_.trim().length>0 && term.trim().length>0){
      var id = base.trim().concat(":").concat(language.trim()).concat(":").concat(schema.trim()).concat(":").concat(class_.trim()).concat(":").concat(term.trim());
      if(state.trim().length>0 && class_!="CategoricalDescriptor")
        id = id+":"+state.trim();
      return id;
    }             
    else
      return null;
  }
  app.defineSpecimenID = function(base, language, institutionCode, collectionCode, catalogNumber) {    
    catalogNumber = (typeof catalogNumber == 'undefined')?'':String(catalogNumber).trim();
    collectionCode = (typeof collectionCode == 'undefined')?'':String(collectionCode).trim();
    institutionCode = (typeof institutionCode == 'undefined')?'':String(institutionCode).trim();    
    if(base && base.trim().length>0 && language && language.trim().length>0 && institutionCode.trim().length>0 && collectionCode.trim().length>0 && catalogNumber.trim().length>0){      
      return base.trim().concat(":").concat(language.trim()).concat(":").concat(institutionCode.trim()).concat(":").concat(collectionCode.trim()).concat(":").concat(catalogNumber.trim());
    }      
    else
      return null;
  }
  app.defineSpeciesID = function(language, base, scientificName) {
    scientificName = (typeof scientificName == 'undefined')?'':String(scientificName).trim();
    if(language && language.trim().length>0 && scientificName.trim().length>0 && base)
      return base.trim().concat(":").concat(language.trim()).concat(":").concat(scientificName.trim());
    else
      return null;
  }
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};
// app.use(loopback.compress());
app.use(loopback.static(path.resolve(__dirname, '../client')));

// Aqui (para a chave) vai ter que ser diferente porque a quantidade de parâmetros é variável. Vai ter que usar os parametros do tipo ?parmA=X&paramB=Y
app.get('/', function(req, res) {  
  res.redirect("/eco");
});
app.get('', function(req, res) {  
  res.redirect("/eco");
});
app.get('/eco', function(req, res) {
  var template = fs.readFileSync('./client/index.mustache', 'utf8');
  // var partials = {
  //   item: fs.readFileSync('./client/item_partial.mustache', 'utf8')
  // };
  // var params = {query: req.query};
  var params = {base: "eco"};
  res.send(mustache.render(template, params));
});
app.get('/interaction/:plant', function(req, res) {
  var template = fs.readFileSync('./client/interaction-list.mustache', 'utf8');  
  var params = {base: "eco",plant:req.params.plant};
  res.send(mustache.render(template, params));
});
app.get('/interactions', function(req, res) {
  var template = fs.readFileSync('./client/interaction-all.mustache', 'utf8');  
  var params = {base: "interaction"};
  res.send(mustache.render(template, params));
});
app.get('/taxon', function(req, res) {
  var template = fs.readFileSync('./client/index.mustache', 'utf8');  
  var params = {base: "taxon"};
  res.send(mustache.render(template, params));
});
app.get('/paleo', function(req, res) {
  var template = fs.readFileSync('./client/index.mustache', 'utf8');  
  var params = {base: "paleo"};
  res.send(mustache.render(template, params));
});
app.get('/spore', function(req, res) {
  var template = fs.readFileSync('./client/index.mustache', 'utf8');  
  var params = {base: "spore"};
  res.send(mustache.render(template, params));
});
app.get('/interaction-profile/:pollinator', function(req, res) {
  var template = fs.readFileSync('./client/interaction-profile.mustache', 'utf8');
  var params = {pollinator: req.params.pollinator};
  // console.log("LOG: ",req.params);
  res.send(mustache.render(template, params));
});
app.get('/profile/species/:base/:id', function(req, res) {
  var template = fs.readFileSync('./client/species.mustache', 'utf8');
  var params = {id: req.params.id,base: req.params.base?req.params.base:"eco"};
  // console.log("LOG: ",req.params);
  res.send(mustache.render(template, params));
});

app.get('/profile/specimen/:base/:id', function(req, res) {
  var Specimen = app.models.Specimen;
  var params = {};
  params.id =req.params.id;
  params.language = req.params.id.split(":")[1];
  params.value = {};
  params.base = req.params.id.split(":")[0];
  async.parallel([
    function(callback) {
      siteLabel(params,callback);
    },
    function (callback) {
      profilesLabel(params,callback);
    },
    function(callback) {
      var parsedId = params.id.split(":");      
      collection([parsedId[1],parsedId[2],parsedId[3]].join(":"),params,callback);      
    },
    function specimen(callback) {
      Specimen.findById(params.id,function(err,specimen) {
        try{
          Object.keys(specimen.toJSON()).forEach(function(key) {
            var parsedId = key.split(":");
            if(parsedId.length>1){            
              // console.log("LOG: ",parsedId);
              var domIdLabel = parsedId[2]+":"+parsedId[3]+":"+parsedId[4]+":label";
              var domIdValue = parsedId[2]+":"+parsedId[3]+":"+parsedId[4]+":value";
              if(specimen[key].field)
                params.label[domIdLabel] = specimen[key].field+": ";
              if(specimen[key].value && !specimen[key].states && !specimen[key].months){
                // NORMAL VALUE
                params.value[domIdValue] = specimen[key].value;                            
                // COORDINATES
                if(parsedId[4]=="decimalLatitude" || parsedId[4]=="decimalLongitude")
                  params.value[domIdValue] = specimen[key] && specimen[key].value && Number(specimen[key].value)!="NaN"?Number(specimen[key].value).toFixed(5):""
                // IMAGE
                if(parsedId[3]=="Image"){
                  params.value[domIdValue] = [];
                  specimen[key].images.forEach(function(image){
                   params.value[domIdValue].push({value:image.resized});
                  });
                }
                // REFERENCES
                if(parsedId[3]=="Reference"){
                  params.value[domIdValue] = [];
                  specimen[key].value.split("|").forEach(function(referencia){
                   params.value[domIdValue].push({value:referencia});
                  });
                }
              } else if(specimen[key].states){
                // NORMAL CATEGORICAL DESCRIPTOR
                params.value[domIdValue] = "";
                specimen[key].states.forEach(function(state) {
                  params.value[domIdValue] += state.vocabulary+", ";
                });
                params.value[domIdValue] = params.value[domIdValue].substring(0,params.value[domIdValue].length-2)
  
                // POLLEN SIZE
                if(specimen[key].term=="pollenSize"){
                  if(specimen[key].states.length==1){
                    params.value[domIdValue] = specimen[key].states[0].vocabulary;
                  } else {            
                    var order = ["pollenSizeVerySmall","pollenSizeSmall","pollenSizeMedium","pollenSizeLarge","pollenSizeVeryLarge","pollenSizeGiant"];
                    var lowestIndex = Infinity;
                    var highestIndex = -1;                        
                    var lowestValue = "?";
                    var highestValue = "?";                        
                    specimen[key].states.forEach(function(state) {              
                        var position  = order.indexOf(state.term);
                        if(position < lowestIndex) {
                          lowestIndex = position;
                          lowestValue = state.vocabulary;
                        }
                        if(position > highestIndex) {
                          highestIndex = position;
                          highestValue = state.vocabulary;
                        }
                    });
                    var sep = specimen.language=='en-US'?' to ':' a ';
                    // params.value[domIdValue] = lowestValue+sep+highestValue;
                    if(lowestValue=="?"){
                      // $("#"+base+"-value").html(highestValue);
                      params.value[domIdValue] = highestValue;
                    } else if(highestValue=="?"){
                      // $("#"+base+"-value").html(lowestValue);
                      params.value[domIdValue] = lowestValue;
                    } else {                    
                      // $("#"+base+"-value").html(lowestValue+sep+highestValue);
                      params.value[domIdValue] = lowestValue+sep+highestValue;
                    }
                  } 
                }
                // POLLEN SHAPE
                if(specimen[key].term=="pollenShape"){
                  if(specimen[key].states.length==1){
                    params.value[domIdValue] = specimen[key].states[0].vocabulary;
                  } else {            
                    var order = ["pollenShapePeroblate","pollenShapeOblate","pollenShapeSuboblate","pollenShapeOblateSpheroidal","pollenShapeSpheroidal","pollenShapeProlateSpheroidal","pollenShapeSubprolate", "pollenShapeProlate", "pollenShapePerprolate"];
                    var lowestIndex = Infinity;
                    var highestIndex = -1;                        
                    var lowestValue = "?";
                    var highestValue = "?";                        
                    specimen[key].states.forEach(function(state) {              
                        var position  = order.indexOf(state.term);
                        if(position < lowestIndex) {
                          lowestIndex = position;
                          lowestValue = state.vocabulary;
                        }
                        if(position > highestIndex) {
                          highestIndex = position;
                          highestValue = state.vocabulary;
                        }
                    });
                    var sep = specimen.language=='en-US'?' to ':' a ';
                    // params.value[domIdValue] = lowestValue+sep+highestValue;                  
                    if(lowestValue=="?"){
                      // $("#"+base+"-value").html(highestValue);
                      params.value[domIdValue] = highestValue;
                    } else if(highestValue=="?"){
                      // $("#"+base+"-value").html(lowestValue);
                      params.value[domIdValue] = lowestValue;
                    } else {                    
                      // $("#"+base+"-value").html(lowestValue+sep+highestValue);
                      params.value[domIdValue] = lowestValue+sep+highestValue;
                    }
                  } 
                }
                // FLOWER SIZE
                if(specimen[key].term=="flowerSize"){
                  if(specimen[key].states.length==1){
                    params.value[domIdValue] = specimen[key].states[0].vocabulary;
                  } else {            
                    var order = ["flowerSizeVerySmall","flowerSizeSmall","flowerSizeMedium","flowerSizeLarge","flowerSizeVeryLarge"];
                    var lowestIndex = Infinity;
                    var highestIndex = -1;                        
                    var lowestValue = "?";
                    var highestValue = "?";                        
                    specimen[key].states.forEach(function(state) {              
                        var position  = order.indexOf(state.term);
                        if(position < lowestIndex) {
                          lowestIndex = position;
                          lowestValue = state.vocabulary;
                        }
                        if(position > highestIndex) {
                          highestIndex = position;
                          highestValue = state.vocabulary;
                        }
                    });
                    var sep = specimen.language=='en-US'?' to ':' a ';
                    // params.value[domIdValue] = lowestValue+sep+highestValue;                  
                    if(lowestValue=="?"){
                      // $("#"+base+"-value").html(highestValue);
                      params.value[domIdValue] = highestValue;
                    } else if(highestValue=="?"){
                      // $("#"+base+"-value").html(lowestValue);
                      params.value[domIdValue] = lowestValue;
                    } else {                    
                      // $("#"+base+"-value").html(lowestValue+sep+highestValue);
                      params.value[domIdValue] = lowestValue+sep+highestValue;
                    }
                  } 
                }
              } else if(specimen[key].months){
                params.value[domIdValue] = "";
                specimen[key].months.forEach(function(month) {
                  params.value[domIdValue] += month+", ";
                });
                params.value[domIdValue] = params.value[domIdValue].substring(0,params.value[domIdValue].length-2)
              } else if(specimen[key]["class"] == "NumericalDescriptor"){
                params.value[domIdValue] = params.value[domIdValue].substring(0,params.value[domIdValue].length-2)
              }
            }
          });
          callback();
        } catch (e) {
          console.log("ID:", params.id, e);
          callback();
        }        
      });
    }
  ],function done() {
    var template = fs.readFileSync('./client/specimen.mustache', 'utf8');
    params.base = req.params.base?req.params.base:"eco";    
    res.send(mustache.render(template, params));
  });
});

app.get('/admin/data-quality', function(req, res) {
  var template = fs.readFileSync('./client/data-quality.mustache', 'utf8');
  var params = {base: "eco"};

  res.send(mustache.render(template, params));
});

app.get('/admin', function(req, res) {
  // var template = fs.readFileSync('./client/admin.mustache', 'utf8');
  var template = fs.readFileSync('./client/data-quality.mustache', 'utf8');
  var params = {base: "eco"};

  res.send(mustache.render(template, params));
});

app.get('/profile/palinoteca/:base/:id', function(req, res) {
  var params = {base: req.params.base?req.params.base:"eco"};
  params.id =req.params.id;
  params.language = req.params.id.split(":")[0];
  params.value = {};
  async.parallel([
    function(callback) {
      siteLabel(params,callback);
    },
    function (callback) {
      profilesLabel(params,callback);
    },
    function(callback) {
      collection(params.id,params,callback);
    },
    function(callback) {
      profilesDwc(params,callback);
    },
  ],function done() {
    var template = fs.readFileSync('./client/palinoteca.mustache', 'utf8');
    res.send(mustache.render(template, params));
  });
});
function collection(id, params, callback) {
  params.value = params.value?params.value:{};
  var Collection = app.models.Collection;  
  Collection.findById(id,function(err,collection) {
    Object.keys(collection.toJSON()).forEach(function(key) {
      var parsedId = key.split(":");
      if(parsedId.length){
        var domIdLabel = parsedId[2]+":"+parsedId[3]+":"+parsedId[4]+":label";
        var domIdValue = parsedId[2]+":"+parsedId[3]+":"+parsedId[4]+":value";        
        if(collection[key].field && collection[key].value)
          params.label[domIdLabel] = collection[key].field;
        if(collection[key].value){
          params.value[domIdValue] = collection[key].value;
          if(parsedId[3]=="Image"){
            if(collection[key].value && collection[key].value.length>0)
              params.value[domIdValue] = collection[key].value.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
            else
              params.value[domIdValue] = "/img/lspm.jpg";
          }
        }
      }
    });
    callback();
  });
}
function siteLabel(params,callback) {
  params.label = params.label?params.label:{};
  var Schema = app.models.Schema;
  Schema.find({where:{"class":"SiteLabel",language:params.language}},function(err,siteLabel) {
    siteLabel.forEach(function(item) {      
      var parsedId = item.id.split(":");
      var domId = parsedId[2]+":"+parsedId[3]+":"+parsedId[4];      
      if(domId=="rcpol:SiteLabel:citation"){
        var field = item.field;
        var formattedDate = "";
        var date = new Date();
        var day = date.getDate();
        var monthIndex = date.getMonth();
        var year = date.getFullYear();
        if(parsedId[1]=="en-US"){
          formattedDate = monthIndex+"/"+day+"/"+year;
        } else formattedDate = day+"/"+monthIndex+"/"+year;
        field = field+" "+formattedDate;
        params.label[domId] = field;
      } else params.label[domId] = item.field;
    });
    callback();
  });
}
function profilesDwc(params,callback) {
  params.label = params.label?params.label:{};
  var Schema = app.models.Schema;
  Schema.find({where:{"schema":"dwc",language:params.language}},function(err,profilesLabel) {
    profilesLabel.forEach(function(item) {
      var parsedId = item.id.split(":");
      var domId = parsedId[2]+":"+parsedId[3]+":"+parsedId[4]
      params.label[domId] = item.field;          
    });
    callback();
  });
}
function profilesLabel(params,callback) {
  params.label = params.label?params.label:{};
  var Schema = app.models.Schema;  
  Schema.find({where:{"class":"ProfilesLabel",language:params.language, base:params.base}},function(err,profilesLabel) {
    profilesLabel.forEach(function(item) {
      var parsedId = item.id.split(":");
      var domId = parsedId[2]+":"+parsedId[3]+":"+parsedId[4];      
      params.label[domId] = item.field;
      // console.log(item);
      // console.log(params.label[domId]);
    });
    callback();
  });
}
app.get('/profile/glossary/individual/:base/:id', function(req, res) {
  var template = fs.readFileSync('./client/glossary.mustache', 'utf8');
  var Schema = app.models.Schema;
  Schema.findById(req.params.id,function(err,schema) {
    if(typeof schema.images != "undefined" && schema.images.length>0){
      schema.image = schema.images[0].resized;
    } else {
      schema.image = false;
    }
    if(schema.class == "State"){
      schema.subtitle = schema.category+" : "+schema.field;
    } else{
      schema.subtitle = schema.category;
    }
    if(schema.references && schema.references.length>0){
      Schema.findById(req.params.id.split(":")[0]+":rcpol:ProfilesLabel:profilesBibliographicReferences",function(err,label) {      
        if(label)
        schema.referenceLabel = label.field;
        schema.references = schema.references.map(function(item) {
          return {ref:item};
        });
        schema.base = req.params.base?req.params.base:"eco";
        res.send(mustache.render(template, schema));
      });
    } else {
      schema.references = false;
      schema.base = req.params.base?req.params.base:"eco";
      res.send(mustache.render(template, schema));   
    }            
  });
});

app.get('/profile/glossary/:base/:lang*?', function(req, res){
  var template = fs.readFileSync('./client/general_glossary.mustache', 'utf8');
  var params = {lang: req.params.lang, base: req.params.base?req.params.base:"eco"};  
  res.send(mustache.render(template, params));
});

app.get('/profile/glossary/:base', function(req, res){
  var template = fs.readFileSync('./client/general_glossary.mustache', 'utf8');
  var params = {base:req.params.base?req.params.base:"eco"};
  res.send(mustache.render(template, params));
});

var ds = loopback.createDataSource({
    connector: require('loopback-component-storage'),
    provider: 'filesystem',
    root: __dirname+'/../storage'
});

var container = ds.createModel('storage');
app.model(container);

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  // if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
