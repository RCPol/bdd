var google = require('googleapis');
function test (){
    var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];    
    var key = require('./node_modules/key.json');    
    var id = "1--i87_wNuoy6v2jQJsGxoG1OAnp2alFJFIsUyP12nCs";

    var jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      [SCOPES],
      null
    );
    
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        console.log(err,tokens);
        // cb(err,tokens)
        return;
      }
      var service = google.sheets('v4');
    //   Interaction.destroyAll({dataset:id},function(err,data){
        service.spreadsheets.values.get({
            auth: jwtClient,
            spreadsheetId: id,
            range: 'A:J'        
          }, function(err, rs) {
            if (err){
              console.log('The API returned an error: ' + err);    
              return;          
            }        
            var data = [];
            rs.values.shift();
            rs.values.forEach(function(item){
              var i = {};
              i.dataset = id;
              i.modified = new Date();
              i.collection = item[0];
              i.plant = item[1];
              i.type = item[2];
              i.pollinator = item[3];
              i.percentual = Number(item[4]);
              i.author = item[5];
              i.municipality = item[6];
              i.state = item[7];
              i.region = item[8];
              i.reference = item[9];
              data.push(i);  
            });       
            console.log(rs.values);     
            // Interaction.create(data,function(err,saved){
            //   if (err) {
            //     console.log('The API returned an error: ' + err);    
            //     cb(err,saved);
            //   }            
            //   Interaction.downloadImages(id,function(){
            //     console.log("Images downloaded.");
            //   });
            //   cb(err,saved);
            // });                                 
        });
    //   });
    });
}
test();