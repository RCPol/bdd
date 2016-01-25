var loopback = require('loopback');
var boot = require('loopback-boot');
var path = require("path");

var app = module.exports = loopback();

app.get('/profile/especies', function(req, res){
  var file = path.resolve(__dirname, "../client/ficha_especie.html");
  res.sendFile(file);
});

app.get('/profile/especimes', function(req, res){
  var file = path.resolve(__dirname, "../client/ficha_especime.html");
  res.sendFile(file);
});

app.get('/profile/palinotecas', function(req, res){
  var file = path.resolve(__dirname, "../client/ficha_palinoteca.html");
  res.sendFile(file);
});

app.get('/profile/chave', function(req, res){
  var file = path.resolve(__dirname, "../client/chave.html");
  res.sendFile(file);
});

app.start = function() {
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

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
