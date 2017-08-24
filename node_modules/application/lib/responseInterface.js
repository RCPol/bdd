
function Response (options) { }

Response.prototype.reply = function () { }
Response.prototype.toJSON = function () { }
Response.prototype.sendJSON = function (data, cb) { }
Response.prototype.sendHTML = function (data, cb) { }
Response.prototype.sendPayload = function () { }
Response.prototype.sendHeaders = function (cb) { cb(null) }
Response.prototype.addHeaders = function (headers, cb) { cb(null) }

module.exports = Response
