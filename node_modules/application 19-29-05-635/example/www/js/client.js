var api, server

;(function (window, undefined) {

  var response = { 
    sendJSON: function (data) { 
      console.log('sendJSON', data)
    },
    sendHTML: function (data) { 
      console.log('sendHTML', data)
    },
    sendError: function (error) { 
      console.log('sendError', error)
    },
    template: function (str, data) { 
      console.log('template', str, data)
    }
  }

  window.onload = function () {
    DNode(function (remote, conn) {
      server = conn
      server.on('ready', function () {
        api = remote.api
        api.user({ method: 'get', params: { id: 1 } }, response)
        api.user({ method: 'put', params: {} }, response)
        api.user({ method: 'post', params: {} }, response)
        api.user({ method: 'delete', params: {} }, response)
      })
    }).connect()

    function Html (id, str) {
      document.getElementById(id).innerHTML = str
    }

  }
})(window, undefined);
