
var fs = require('fs'),
    path = require('path')

module.exports = function (dir) {
  var result = {}
  fs.readdirSync(dir).forEach(function (entry) {
    var entryPath = path.join(dir, entry)
    if (fs.statSync(entryPath).isDirectory())
      return result[entry.split('.js')[0]] = module.exports(entryPath)
    else
      return result[entry.split('.js')[0]] = require(entryPath)
  })
  return result
}
