/* 
 * Application
 * 
 * Tranposrt Modules: 
 *  -- Dnode
 *  -- Http
 * 
 * Routing Modules: 
 *  -- HttpStatic
 *  -- InterfaceDir
 *  -- Route Matching Interface
 * 
 * Other Modules: 
 *  -- Secure Cookies
 *  -- Cookie/Redis Sessions
 *  -- Jade/EJS Server Template Engine
 *  -- Error Templates
 * 
 * Possible Configurations:
-------------------------------------------------------------
  ✔    Dnode
  ✔            Http
  ✔    Dnode   Http
  ✔    Dnode          InterfaceDir
  ✔            Http   InterfaceDir
  ✔    Dnode   Http   InterfaceDir
  ✔    Dnode   Http   InterfaceDir   HttpStatic
  ✔            Http   InterfaceDir   HttpStatic
  ✔    Dnode   Http                  HttpStatic
  ✔            Http                  HttpStatic
-------------------------------------------------------------
 * 
 * Invalid Configurations:
-------------------------------------------------------------
  x                                  HttpStatic  (invalid)
  x    Dnode                         HttpStatic  (invalid)
  x    Dnode          InterfaceDir   HttpStatic  (invalid)
  x                   InterfaceDir   HttpStatic  (invalid)
  x                   InterfaceDir               (invalid)
-------------------------------------------------------------
 * 
 */

var defaultHeaders = { 
    'Server': [ 'node-application' ], 
    'Content-Type': [ 'charset=utf-8' ], 
    'Set-Cookie': [ 'path=/' ]
  }

var http = require('http')
  , util = require('util')

var Response = require(__dirname + '/response')
  , recursiveRequire = require(__dirname + '/requireRecursive')
  , Router = require(__dirname + '/router')
  , router = new Router.Router()

function Application (opts) {
  var self = this
  opts = opts || {}

  // 
  // Global
  // 
  self.debug = opts.debug || false

  // 
  // Base
  // 
  self.defaultHeaders = defaultHeaders
  self.router = router
  self.useErrorTemplate = opts.useErrorTemplate || {}

  // 
  // Templates
  // 
  self.TemplateEngine = null
  self.useTemplateEngine = opts.useTemplateEngine || false
  if (self.useTemplateEngine) {
    self.useTemplateDir = opts.useTemplateDir || (function () { throw new Error('template directory is required when using a template engine') })()
    self.TemplateEngine = require('templar')
    self.TemplateEngine.loadFolder(self.useTemplateDir)
    self.useTemplateEngineOpts = opts.useTemplateEngineOpts || { 
      engine: require('ejs'), 
      folder: self.useTemplateDir
    }
  }

  // 
  // Cookie Parser
  // 
  self.Cookies = null
  self.useCookieParser = opts.useCookieParser || false
  if (self.useCookieParser) {
    self.useCookieParserKeys = opts.useCookieParserKeys

    self.Keygrip = require('keygrip')
    self.Cookies = require('cookies')

    self.Keygrip = new self.Keygrip(self.useCookieParserKeys)
  }

  // 
  // Sessions
  // 
  self.Session = null
  self.useSession = opts.useSession || false
  if (self.useSession) {
    self.useSessionType = opts.useSessionType || 'redis'
    self.useSessionRedisOpts = opts.useSessionRedisOpts || {}
    switch (self.useSessionType) {
    case 'redis':
      self.Session = require('redsess')
      self.Session.createClient(
        self.useSessionRedisOpts.host, 
        self.useSessionRedisOpts.port, 
        self.useSessionRedisOpts
      )
      break
    default:
      throw new Error('session type not supported yet')
      break
    }
    self.useSessionOpts = opts.useSessionOpts || {}
  }

  // 
  // InterfaceDir
  // 
  self.useInterfaceDir = opts.useInterfaceDir || false
  if (self.useInterfaceDir) {
    self.interface = recursiveRequire(self.useInterfaceDir)
  }

  // 
  // Interface
  // 
  self.interface = self.interface || {}
  opts.interface = opts.interface || {}
  self.interface = extend(self.interface, opts.interface)

  // 
  // Dnode
  // 
  self.Dnode = null
  self.useDnode = opts.useDnode || false
  if (self.useDnode) {
    self.Dnode = require('dnode')
  }

  // 
  // Http
  // 
  self.Http = null
  self.useHttp = opts.useHttp || false
  if (self.useHttp) {
    self.useHttpRoots = opts.useHttpRoots || 'home'
    self.useHttpHeaders = opts.useHttpHeaders || {}
  }

  // 
  // HttpStatic
  // 
  self.HttpStatic = null
  self.useHttpStatic = opts.useHttpStatic || false
  if (self.useHttpStatic) {
    self.useHttpStaticCache = opts.useHttpStaticCache || 3600
    self.useHttpStaticHeaders = opts.useHttpStaticHeaders || {}
    var static = require('node-static')
    self.HttpStatic = new static.Server(opts.useHttpStatic, {
      cache: self.useHttpStaticCache, 
      headers: self.useHttpStaticHeaders 
    })
  }

  if (self.debug) console.warn(JSON.stringify(opts, true, 2))
  return self
}

Application.prototype.addInterface = function (obj) {
  var self = this
  if (typeof obj !== 'object' && typeof obj !== 'function') {
    throw new Error('addInterface takes an object or function')
  }
  for (var key in obj) {
    self.interface[key] = obj[key]
  }
  return self
}

Application.prototype.makeHttpRoutes = function (object, parent) {
  var self = this
  parent = parent || ''
  Object.keys(object).forEach(function (sub) {
    var pre = '', path = sub
    if (!sub.length && !parent.length) pre = '/'
    if (sub.length) pre += '/'
    if (sub === self.useHttpRoots) {
      pre = ''; path = '';
    }
    if (!parent.length && !pre.length && !path.length) pre = '/'
    if (typeof object[sub] === 'function') {
      self.router.addRoute(parent + pre + path, self.makeHttpRoute(object[sub]) )
    }
    if (typeof object[sub] === 'object' || typeof object[sub] === 'function') {
      self.makeHttpRoutes(object[sub], parent + pre + sub)
    }
  })
}

Application.prototype.makeHttpRoute = function (fn) {
  var app = this
  return function () {
    var req = this
    fn.call(app.interface, req, req.res) 
  }
}

Application.prototype.makeRpcRoutes = function (object, remote) {
  var self = this
  Object.keys(object).forEach(function (sub) {
    if (typeof object[sub] === 'function') {
      object[sub] = self.makeRpcRoute(object[sub], remote)
    }
    if (typeof object[sub] === 'object' || typeof object[sub] === 'function') {
      self.makeRpcRoutes(object[sub], remote)
    }
  })
}

Application.prototype.makeRpcRoute = function (fn, remote) {
  var app = this
  return function (req, res) {
    fn.call(app.interface, req, res, remote)
  }
}

Application.prototype.serveStatic = function (req, res, cb) {
  var self = this
  req.on('end', function () {
    return self.HttpStatic.serve(req, res, function (err) {
      if (err) cb(err)
    })
  })
}

Application.prototype.listen = function (listen) {
  var self = this
  self.makeHttpRoutes(clone(self.interface))
  if (self.debug) console.warn('http', self.router.routeMap)
  if (self.useHttp) {
    self.Http = http.createServer(server)
    self.Http.listen(listen)
  }

  if (self.useDnode) {
    self.Dnode = self.Dnode(function (remote, conn) { 
      var dnodeApi = this
      var rpcObj = clone(self.interface)
      self.makeRpcRoutes(rpcObj, remote)
      extend(dnodeApi, rpcObj)
      conn.on('ready', function () { 
        if (self.debug) console.log('dnode', conn.id)
      })
    })
    self.Dnode.listen( self.Http || listen )
  }

  // 
  // user defined options
  // 
  Response.setup({
      useCookieParser: self.useCookieParser
    , useErrorTemplate: self.useErrorTemplate
    , Keygrip: self.Keygrip
    , Cookies: self.Cookies
    , Session: self.Session
    , useSession: self.useSession
    , useSessionOpts: self.useSessionOpts
    , TemplateEngine: self.TemplateEngine
    , useTemplateEngine: self.useTemplateEngine
    , useTemplateEngineOpts: self.useTemplateEngineOpts
  })

  function server (req, res) {

    // 
    // global response setup
    // 

    if (req.method == 'OPTIONS') {
      res.writeHead(200, {})
      return res.end()
    }
    if (res.socket && res.socket.setNoDelay) {
      res.socket.setNoDelay()
    }

    // return res.end()
    // 700 req/s slow down after this breakpoint

    self.router.match(req.url, req.method, req, function (err, route) {
      if (!route && self.useHttpStatic) {
        self.serveStatic(req, res, function (err) {
          if (err) {
            res.sendError(err.status, err)
          }
        })
      }
      else {
        Response(req, res, route)
      }
    })
  }

  console.warn(!!self.useCookieParser,   'useCookieParser')
  console.warn(!!self.useTemplateEngine, 'useTemplateEngine')
  console.warn(!!self.useSession,        'useSession')
  console.warn(!!self.useInterfaceDir,   'useInterfaceDir')
  console.warn(!!self.useDnode,          'useDnode')
  console.warn(!!self.useHttp,           'useHttp')
  console.warn(!!self.useHttpStatic,     'useHttpStatic')
  console.warn(Object.keys(require.cache).length + ' modules loaded')
  console.warn('listening on', listen)

}

function bind (fn, scope) {
  return function () {
    return fn.apply(scope, arguments)
  }
}

function clone (obj) {
  return extend({}, obj)
}

function extend (dest, source) {
  Object.keys(source).forEach(function (key) {
    if (util.isArray(source[key])) {
      dest[key] = dest[key] || []
      dest[key] = dest[key].concat(source[key])
    }
    else if (typeof source[key] == 'object') {
      dest[key] = dest[key] || {}
      dest[key] = extend(dest[key], source[key])
    }
    else {
      dest[key] = source[key]
    }
  })
  return dest
}

module.exports = Application
