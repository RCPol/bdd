// var cluster = require('cluster');
// var numCPUs = require('os').cpus().length;

// if (cluster.isMaster) {
//   // Fork workers.
//   for (var i = 0; i < numCPUs; i++) {
//     cluster.fork();
//   }

//   cluster.on('exit', function(worker) {
//     console.log('worker ' + worker.pid + ' died');
//   });
// } else {

  var Application = require('../')
    , app 

  app = new Application({

    // Global
    "debug": true,
    "interface": {},

    // InterfaceDir
    "useInterfaceDir": __dirname + "/routes",

    // Http
    "useHttp": true,
    "useHttpRoots": "index",
    "useHttpHeaders": {
      "Server": "interface example"
    },

    // Dnode
    "useDnode": true,

    // Templates
    "useTemplateEngine": true, 
    "useTemplateDir": __dirname + "/www/ejs",
    "useTemplateEngineOpts": { 
      "engine": require('ejs'), 
      "folder": __dirname + "/www/ejs"
    },

    // Error Templates
    "useErrorTemplate": {
      "5xx": "5xx.ejs",
      "400": "that was bad",
      "4xx": "4xx.ejs",
      "*": "error.ejs",
      "debug": false 
    },

    // Cookie Parser
    "useCookieParser": true,
    "useCookieParserKeys": [
      "some secret keys here"
    ],

    // Sessions
    "useSession": true,
    "useSessionType": "redis",
    "useSessionRedisOpts": {
      "host": "127.0.0.1",
      "port": 6379,
      "auth": "",
      "socket_nodelay": false
    },
    "useSessionOpts": {
      "expire": false,
      "cookieName": "s"
    },

    // HttpStatic
    "useHttpStatic": __dirname + "/www",
    "useHttpStaticCache": 7200,
    "useHttpStaticHeaders": {
      "Server": "static example",
      "Cache-Control": "max-age=7200"
    }

  })

  app.listen(3000)

// }