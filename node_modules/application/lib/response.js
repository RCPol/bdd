
var util = require('util')
  , HttpError = require('error-page')
  , codes = require('http').STATUS_CODES
  , useCookieParser 
  , useErrorTemplate 
  , Keygrip 
  , Cookies 
  , Session 
  , useSession 
  , useSessionOpts 
  , TemplateEngine
  , useTemplateEngine 
  , useTemplateEngineOpts 

function Response (req, res, route) {
  // public methods
  res.sendJSON = sendJSON
  res.sendHTML = sendHTML
  res.sendError = HttpError(req, res, useErrorTemplate)

  if (useCookieParser) {
    req.cookies = res.cookies = new Cookies(req, res, Keygrip)
  }
  if (useSession) {
    req.session = res.session = new Session(req, res, useSessionOpts)
  }
  if (useTemplateEngine) {
    res.template = TemplateEngine(req, res, useTemplateEngineOpts)
  }
  if (!route) {
    return res.sendError(404)
  }

  // private methods
  res._close = _close

  // global setup
  req.res = res
  req.route = route
  req.method = route.params.method
  req.params = route.params
  res.headers = route.headers || {}
  route.fn.call(req)
}

Response.setup = function (options) {
  useCookieParser = options.useCookieParser
  useErrorTemplate = options.useErrorTemplate
  Keygrip = options.Keygrip
  Cookies = options.Cookies
  Session = options.Session
  useSession = options.useSession
  useSessionOpts = options.useSessionOpts
  TemplateEngine = options.TemplateEngine
  useTemplateEngine = options.useTemplateEngine
  useTemplateEngineOpts = options.useTemplateEngineOpts
}

function sendJSON (data) {
  if (typeof data === 'undefined' || typeof data === null) {
    this.sendError(422)
  }
  else {
    this.payload = JSON.stringify(data, null, 2)
    this.headers = headers = { 'Content-Type': 'application/json' }
    this._close.call(this)
  }
}

function sendHTML (data) {
  this.payload = data
  this.headers = headers = { 'Content-Type': 'text/html' }
  this._close.call(this)
}

function _close (headers, cb) {
  if (!this.statusCode) {
    throw new Error('status code should be set')
  }
  if (!this.headers) {
    throw new Error('headers should be set or passed')
  }
  this.writeHead(this.statusCode, this.headers)
  this.write(this.payload)
  this.end()
  if (typeof cb === 'function') {
    cb.call(this, null)
  }
}

function auto () {
  if (err !== null && typeof err !== undefined) {
    console.error(err)
    return res.sendError(err)
  }
  else if (typeof data === 'object') {
    return res.sendJSON(data)
  }
  else if (typeof data === 'string') {
    return res.sendHTML(data)
  }
  else {
    return res.sendError(500)
  }
}

module.exports = Response
