var xlsx = require('node-xlsx');
var hash = require('object-hash');
var request = require('request');
var async = require('async');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

module.exports = function(Test) {  
  Test.readTable = function(id,cb) {    
    var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
    
    var key = require('key.json');    
    var jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      [SCOPES],
      null
    );
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        console.log(err);
        return;
      }
      var service = google.sheets('v4');
      service.spreadsheets.get({
        auth: jwtClient,
        spreadsheetId: id
        // , range: '6:6'        
      }, function(err, response) {
        if (err) console.log('The API returned an error: ' + err);    
        var sheetId =  response.sheets[0].properties.sheetId;        
        var requests = [
            {
              "updateSpreadsheetProperties": {
                  "properties": {"title": "[pt-BR]amostras-palinoecologia [teste - "+(new Date())+"]"},
                  "fields": "title"
                }
            }
            // ,
            // {
            //   updateCells: {
            //     start: {sheetId: sheetId, rowIndex: 5, columnIndex: 5},
            //     rows: [{
            //       values: [{
            //         // userEnteredValue: {numberValue: 1},
            //         userEnteredFormat: {backgroundColor: {red: 1}}
            //       }, {
            //         // userEnteredValue: {numberValue: 2},
            //         userEnteredFormat: {backgroundColor: {blue: 1}}
            //       }, {
            //         // userEnteredValue: {numberValue: 3},
            //         userEnteredFormat: {backgroundColor: {green: 1}}
            //       }]
            //     }],
            //     fields: 'userEnteredValue,userEnteredFormat.backgroundColor'
            //   }
            // }
          ];
        var batchUpdateRequest = {requests: requests}

        service.spreadsheets.batchUpdate({
          auth: jwtClient,
          spreadsheetId: id,        
          resource: batchUpdateRequest
        }, function(err, response) {
          if(err) 
            console.log(err);
            cb(err,response)        
        });
      });
      
      // Change the name of sheet ID '0' (the default first sheet on every
      // spreadsheet)
      // requests.push({
      //   updateSheetProperties: {
      //     properties: { title: 'New Sheet Name'},
      //     fields: '*'
      //   }
      // });
      // Insert the values 1, 2, 3 into the first row of the spreadsheet with a
      // different background color in each.
      // requests.push({
      //   updateCells: {
      //     start: {sheetId: 'Plan1', rowIndex: 0, columnIndex: 0},
      //     rows: [{
      //       values: [{
      //         userEnteredValue: {numberValue: 1},
      //         userEnteredFormat: {backgroundColor: {red: 1}}
      //       }, {
      //         userEnteredValue: {numberValue: 2},
      //         userEnteredFormat: {backgroundColor: {blue: 1}}
      //       }, {
      //         userEnteredValue: {numberValue: 3},
      //         userEnteredFormat: {backgroundColor: {green: 1}}
      //       }]
      //     }],
      //     fields: 'userEnteredValue,userEnteredFormat.backgroundColor'
      //   }
      // });
      // // Write "=A1+1" into A2 and fill the formula across A2:C5 (so B2 is
      // // "=B1+1", C2 is "=C1+1", A3 is "=A2+1", etc..)
      // requests.push({
      //   repeatCell: {
      //     range: {
      //       sheetId: 'Plan1',
      //       startRowIndex: 1,
      //       endRowIndex: 6,
      //       startColumnIndex: 0,
      //       endColumnIndex: 3
      //     },
      //     cell: {userEnteredValue: {formulaValue: '=A1 + 1'}},
      //     fields: 'userEnteredValue'
      //   }
      // });
      // // Copy the format from A1:C1 and paste it into A2:C5, so the data in
      // // each column has the same background.
      // requests.push({
      //   copyPaste: {
      //     source: {
      //       sheetId: 'Plan1',
      //       startRowIndex: 0,
      //       endRowIndex: 1,
      //       startColumnIndex: 0,
      //       endColumnIndex: 3
      //     },
      //     destination: {
      //       sheetId: 'Plan1',
      //       startRowIndex: 1,
      //       endRowIndex: 6,
      //       startColumnIndex: 0,
      //       endColumnIndex: 3
      //     },
      //     pasteType: 'PASTE_FORMAT'
      //   }
      // });

      

  });
  }
  Test.remoteMethod(
    'readTable',
    {
      http: {path: '/google/readTable', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'string', required:true}        
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );  
};
