
var users = [ 
    { id: 1, name: 'root' }
  , { id: 2, name: 'Tom' } 
]

module.exports = function (req, res) {
  switch(req.method) {
    case 'get':
      var id = req.params.id || 0
      res.sendJSON(users[id])
      break
    case 'put':
      res.sendJSON({ response: 'user updated' })
      break
    case 'post':
      res.sendJSON({ response: 'user created' })
      break
    case 'delete':
      res.sendJSON({ response: 'user deleted' })
      break
    default:
      res.sendError(new Error('Method not recognized.'))
  }
}
