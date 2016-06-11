var loopback = require('loopback');
var boot = require('loopback-boot');
var path = require('path');
var mustache = require('mustache');
var fs = require('fs');
var hash = require('object-hash');

var app = module.exports = loopback();

app.start = function() {
  app.defineSchemaID = function(language, schema, class_, term) {
    schema = (typeof schema == 'undefined')?'':String(schema).trim();
    class_ = (typeof class_ == 'undefined')?'':String(class_).trim();
    term = (typeof term == 'undefined')?'':String(term).trim();
    if(language && language.trim().length>0 && schema.trim().length>0 && class_.trim().length>0 && term.trim().length>0)
      return language.trim().concat(":").concat(schema.trim()).concat(":").concat(class_.trim()).concat(":").concat(term.trim());
    else
      return null;
  }
  app.defineSpecimenID = function(language, institutionCode, collectionCode, catalogNumber) {
    catalogNumber = (typeof catalogNumber == 'undefined')?'':String(catalogNumber).trim();
    collectionCode = (typeof collectionCode == 'undefined')?'':String(collectionCode).trim();
    institutionCode = (typeof institutionCode == 'undefined')?'':String(institutionCode).trim();
    if(language && language.trim().length>0 && institutionCode.trim().length>0 && collectionCode.trim().length>0 && catalogNumber.trim().length>0)
      return language.trim().concat(":").concat(institutionCode.trim()).concat(":").concat(collectionCode.trim()).concat(":").concat(catalogNumber.trim());
    else
      return null;
  }
  app.defineSpeciesID = function(language, scientificName) {
    scientificName = (typeof scientificName == 'undefined')?'':String(scientificName).trim();
    if(language && language.trim().length>0 && scientificName.trim().length>0)
      return language.trim().concat(":").concat(scientificName.trim());
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
app.use(loopback.compress());
app.use(loopback.static(path.resolve(__dirname, '../client')));

// Aqui (para a chave) vai ter que ser diferente porque a quantidade de parâmetros é variável. Vai ter que usar os parametros do tipo ?parmA=X&paramB=Y
app.get('/', function(req, res) {
  var template = fs.readFileSync('./client/index.mustache', 'utf8');
  // var partials = {
  //   item: fs.readFileSync('./client/item_partial.mustache', 'utf8')
  // };
  var params = {query: req.query};
  res.send(mustache.render(template, params));
});

// Repetir para os outros profiles
app.get('/profile/species/:id', function(req, res) {
  var template = fs.readFileSync('./client/species.mustache', 'utf8');
  var params = {id: req.params.id};
  res.send(mustache.render(template, params));
});

app.get('/profile/specimen/:id', function(req, res) {
  var template = fs.readFileSync('./client/specimen.mustache', 'utf8');
  var params = {id: req.params.id};
  res.send(mustache.render(template, params));
});

app.get('/quality/check', function(req, res) {
  var template = fs.readFileSync('./client/quality.mustache', 'utf8');
  var params = {};
  res.send(mustache.render(template, params));
});

app.get('/profile/palinoteca/:id', function(req, res) {
  var template = fs.readFileSync('./client/palinoteca.mustache', 'utf8');
  var params = {id: req.params.id};
  res.send(mustache.render(template, params));
});

app.get('/profile/glossary/:id', function(req, res) {
  var template = fs.readFileSync('./client/glossary.mustache', 'utf8');
  var params = {id: req.params.id};
  res.send(mustache.render(template, params));
});

app.get('/profile/glossary', function(req, res){
  var template = fs.readFileSync('./client/general_glossary.mustache', 'utf8');
  res.send(mustache.render(template));
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
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
