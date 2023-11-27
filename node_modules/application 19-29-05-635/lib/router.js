
var localRoutes = []
  , urlstring = require('url')

/**
 * Convert path to route object
 *
 * A string or RegExp should be passed,
 * will return { re, src, keys} obj
 *
 * @param  {String / RegExp} path
 * @return {Object}
 */
//using 'new' is optional  
var Route = function (path) {
  var src
    , re
    , keys = []
  if (path instanceof RegExp) {
    re = path
    src = path.toString()
  }
  else{
    re = pathToRegExp(path, keys)
    src = path
  }
  return {
     re: re,
     src: path.toString(),
     keys: keys
  }
}

/**
 * Normalize the given path string,
 * returning a regular expression.
 *
 * An empty array should be passed,
 * which will contain the placeholder
 * key names. For example "/user/:id" will
 * then contain ["id"].
 *
 * @param  {String} path
 * @param  {Array} keys
 * @return {RegExp}
 */
var pathToRegExp = function (path, keys) {
  path = path.concat('/?')
    .replace(/\/\(/g, '(?:/')
    .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, function(_, slash, format, key, capture, optional){
      keys.push(key)
      slash = slash || ''
      return (''
        + (optional ? '' : slash)
        + '(?:'
        + (optional ? slash : '')
        + (format || '') + (capture || '([^/]+?)') + ')'
        + (optional || ''))
    })
    .replace(/([\/.])/g, '\\$1')
    .replace(/\*/g, '(.+)')
  return new RegExp('^' + path + '$', 'i')
};

/**
 * Attempt to match the given request to
 * one of the routes. When successful
 * a  {fn, params, splats} obj is returned
 *
 * @param  {Array} routes
 * @param  {String} uri
 * @return {Object}
 */
var match = function (routes, uri, method, req, callback) {
  var captures
    , i = 0
    , query = urlstring.parse(uri, true).query
  for (var len = routes.length; i < len; ++i) {
    var route = routes[i]
      , re = route.re
      , keys = route.keys
      , splats = []
      , params = {}
    // user can override the method only if its a GET
    // if (method === 'get' && query.method) method = query.method
    var u = uri.split('?')[0]
    if (captures = re.exec(u)) {
      for (var j = 1, len = captures.length; j < len; ++j) {
        var key = keys[j-1]
          , val = (typeof captures[j] === 'string') ? decodeURIComponent(captures[j]) : captures[j]
        if (key) {
          params[key] = val
        } else {
          splats.push(val)
        }
      }

      params.method = method.toLowerCase()

      for (var key in query) {
        params[key] = query[key]
      }

      if (method === 'POST') {
        var form = new formidable.IncomingForm()
        form.parse(req, function (err, fields, files) {
          for (var key in fields) {
            params[key] = fields[key]
          }
          callback(null, { params: params, splats: splats, route: route.src, files: files })
        })
      }
      else {
        callback(null, { params: params, splats: splats, route: route.src })
      }
    }
  }

  if (captures === null || typeof captures === 'undefined') {
    callback(null)
  }
}

/**
 * Default "normal" router constructor.
 * accepts path, fn tuples via addRoute
 * returns {fn, params, splats, route}
 *  via match
 *
 * @return {Object}
 */
 
var Router = function () {
  //using 'new' is optional
  return {
    routes: []
  , routeMap : {}
  , addRoute: function (path, fn) {
      if (!path) throw new Error(' route requires a path')
      if (!fn) throw new Error(' route ' + src + ' requires a callback')
      var route = Route(path)
      route.fn = fn
      this.routes.push(route)
      this.routeMap[path] = fn
    }
  , match: function (url, method, req, callback) {
      var self = this
      match(self.routes, url, method, req, function (e, route) {
        if (route) {
          route.fn = self.routeMap[route.route]
        }
        callback(e, route)
      })
    }
  }
}

module.exports = { 
  Route: Route
  , pathToRegExp: pathToRegExp
  , match: match
  , Router: Router 
}
