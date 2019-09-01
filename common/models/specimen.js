var google = require('googleapis');
var readChunk = require('read-chunk'); 
var imageType = require('image-type');  
var xlsx = require('node-xlsx');
var hash = require('object-hash');
var request = require('request');
var async = require('async');
var validator = require('validator');
var fs = require('fs');
var qt = require('quickthumb');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var nodemailer = require('nodemailer');

const requestImageSize = require('request-image-size');
// var admin = require('firebase-admin');
var serviceAccount = require("key.json");
// var Thumbnail = require('thumbnail');
// var thumbnail = new Thumbnail(__dirname + "/../../client/images", __dirname + "/../../client/thumbnails");
module.exports = function(Specimen) {
  Specimen.sendEmail = (data, cb) => {
        
    const subject = `RPCPol ${data.page} report`
    const text = `
${data.user.name} has reported a problem with ${data.page} ${data.url}.

Category: ${data.category}
Environment: ${data.env}
Date: ${data.timestamp}
Email: ${data.user.email}
Message: 

${data.msg}
`    
    console.log(`[${new Date().toISOString()}] Email: `, process.env.SUPORTE_MAIL);
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'suporte.rcpol@gmail.com',
        pass: process.env.SUPORTE_MAIL
      }
    });
  
    var mailOptions = {
      from: 'suporte.rcpol@gmail.com',
      to: process.env.SUPORTE_MAIL_TO || 'suporte.rcpol@gmail.com',
      subject,
      text
    };
  
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
    return cb(null, "sent")
  }
  Specimen.remoteMethod(
    'sendEmail',
    {
      http: {path: '/report', verb: 'post'},
      accepts: [
        {arg: 'data', type: 'object', http:{source: 'body'}}
      ],
      returns: {arg: 'response', type: 'string'}
    }
  );
  Specimen.consistency = function(req, id, language, cb) {
    var report = [];
    req.setTimeout(0);
    var key = require('key.json');
    var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];        
    var jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      [SCOPES],
      null
    );    
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        console.log(err.errorDescription,err.error_description,tokens);
        cb(err,tokens)
        return;
      }          
      var service = google.sheets('v4');
      service.spreadsheets.values.get({
        auth: jwtClient,
        spreadsheetId: id,
        range: 'glossary.'+language+'!A:K'
      }, function(err, rs) {
          if (err){
            console.log('The API returned an error: ' + err);    
            cb('The API returned an error: ' + err,null)
            return;          
          }
          var validValues = {}
          rs.values.shift();
          async.each(rs.values, function iterator(line, callback){                                                
            var schema = toString(line[0]).trim().toUpperCase();
            var class_ = toString(line[1]).trim().toUpperCase();
            var term = toString(line[2]).trim().toUpperCase();              
            var vocabulary = toString(line[6]).trim().toUpperCase();
            if (schema.length>0 && class_.length>0 && term.length>0 && vocabulary.length>0 && class_ == "STATE") {              
              validValues[`${schema}-${term}`] = validValues[`${schema}-${term}`]?validValues[`${schema}-${term}`]:{}
              validValues[`${schema}-${term}`][vocabulary] = true;
            }                        
          });

          service.spreadsheets.values.get({
            auth: jwtClient,
            spreadsheetId: id,
            range: 'specimen.'+language+'!A:BU'        
          }, function(err, d) {
            if (err){
              console.log('The API returned an error: ' + err);    
              cb('The API returned an error: ' + err,null)
              return;          
            }           
            var totalValues = 0;
            var totalValidValues = 0;                                                      
            var data = d.values;
            var handler = new SpecimenHandler(null, language, data);                          
            handler.setSchemas().setClasses().setTerms().setData();            
            delete handler.table;
            var result = {};            
            handler.terms.forEach(function(item, i){              
              var schema = toString(handler.schemas[i]).trim().toUpperCase();
              var class_ = toString(handler.classes[i]).trim().toUpperCase();
              var term = toString(item).trim().toUpperCase();
              var column = `${schema}-${term}`;                  
              if (schema.length>0 && class_.length>0 && term.length>0 && validValues[column] && class_=="CategoricalDescriptor".toUpperCase()) {           
                result[column] = {};
                handler.data.forEach(function(line, index){
                  line[i].split("|").forEach(function(value){
                    totalValues++;
                    if(!validValues[column][toString(value).trim().toUpperCase()] && toString(value).trim().length>0){                      
                      result[column][index] = value;
                      var assertion = {
                          type: 'amendment',
                          hash: hash(line),
                          dimension: 'Consistency',
                          enhancement: `Recommend to use a value defined in the glossary`,
                          specification: '[TO DO]',
                          mechanism: 'RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js',
                          ie: item,
                          dr: {
                              row: index+6, 
                              value: value,
                              drt:  'record'
                          },
                          response: {result: `The value "${value.trim().toUpperCase()}" was not found in the field "${item}" of the glossary. Change this value or add it in the glossary.`}
                      };
                      report.push(assertion);
                    } else {
                      totalValidValues++;
                    }
                  });                  
                });                
              }              
            });
            var consistency = (totalValidValues/totalValues)*100;
            consistency = consistency === 100? consistency:consistency.toFixed(2);            
            report.push({
                type: 'measure',              
                dimension: 'Consistency',
                specification: `[TO DO]`,
                mechanism: `RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js`,
                ie: 'All',
                dr: {
                    id: id,
                    drt:  'dataset'
                },
                response: {result: consistency}
            }); 
            report.push({
                type: 'validation',              
                criterion: 'Spreadsheet has consistent records',
                specification: `[TO DO]`,
                mechanism: `RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js`,
                ie: 'All',
                dr: {
                    id: id,
                    drt:  'dataset'
                },
                response: {result: consistency == 100}
            });
            cb(null,report);                        
          });          
        });
      });
  }
  Specimen.remoteMethod(     
    'consistency',
    {
      http: {path: '/consistency', verb: 'get'},
          accepts: [    
        { arg: "req", type: "object", http: { source: "req" } },
        {arg: 'id', type: 'string', required:true},   
        {arg: 'language', type: 'string', required:true},                
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );

  Specimen.uniqueness = function(id, language, cb) {
    var key = require('key.json');
    var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];        
    var jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      [SCOPES],
      null
    );    
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        console.log(err.errorDescription,err.error_description,tokens);
        cb(err,tokens)
        return;
      }          
      var service = google.sheets('v4');
      service.spreadsheets.values.get({
        auth: jwtClient,
        spreadsheetId: id,
        range: 'specimen.'+language+'!B:D'        
      }, function(err, d) {
          if (err){
            console.log('The API returned an error: ' + err);    
            cb('The API returned an error: ' + err,null)
            return;          
          }          
          var rs = d.values;
          var completeness = 0;
          var totalCells = 0;    
          var header = rs.splice(0,5);
          var report = [];
          var individuals = {};
          
          rs.forEach(function(line, index){
            if(String(line[0] || "").trim().length > 0 &&
              String(line[1] || "").trim().length > 0 &&
              String(line[2] || "").trim().length > 0) {                
                var id = [String(line[0] || "").trim().toUpperCase(), String(line[1] || "").trim().toUpperCase(), String(line[2] || "").trim().toUpperCase()].join(", ");
                individuals[id] = {
                  count: individuals[id] && individuals[id].count ? individuals[id].count+1:1,
                  rows: individuals[id] && individuals[id].rows ? individuals[id].rows.concat([index+6]):[index+6]
                }
            }
          });
          Object.keys(individuals).map(function(id){
            if(individuals[id].count>1) {
              var assertion = {
                  type: 'amendment',
                  hash: hash(individuals[id]),
                  dimension: 'Uniqueness',
                  enhancement: 'Recommend to remove duplicated records',
                  specification: '[TO DO]',
                  mechanism: 'RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js',
                  ie: "Unique identifier",
                  dr: {
                      row: individuals[id].rows, 
                      value: id,
                      drt:  'record'
                  },
                  response: {result: `Rows ${individuals[id].rows} have the same identifier (${id})`}
              };
              report.push(assertion);
            }            
          });
          var finalUniqueness = ((Object.keys(individuals).length/rs.length)*100);         
          finalUniqueness = finalUniqueness === 100? finalUniqueness:finalUniqueness.toFixed(2);
          report.push({
              type: 'measure',              
              dimension: 'Uniqueness',
              specification: `[TO DO]`,
              mechanism: `RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js`,
              ie: 'Unique identifier',
              dr: {
                  id: id,
                  drt:  'dataset'
              },
              response: {result: finalUniqueness}
          }); 
          report.push({
              type: 'validation',              
              criterion: 'Spreadsheet has unique records',
              specification: `[TO DO]`,
              mechanism: `RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js`,
              ie: 'Unique identifier',
              dr: {
                  id: id,
                  drt:  'dataset'
              },
              response: {result: finalUniqueness == 100}
          });
          cb(null,report);
        });
      });
  }
  Specimen.remoteMethod(     
    'uniqueness',
    {
      http: {path: '/uniqueness', verb: 'get'},
          accepts: [    
        {arg: 'id', type: 'string', required:true},   
        {arg: 'language', type: 'string', required:true},                
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );

  Specimen.checkUrl = function(url, cb) {  
    try{
      if(url.indexOf("http")==-1){
        cb(null, false)
        return false;
      }
      requestImageSize(url)
      .then(size => {                
        cb(null, size)
      }).catch(err => {                
        cb(null, false)
      });
      // request(url, function(err, response, body){ 

      //   if (err){          
      //       cb(err, false)
      //   } else {  
      //     var buffer = new Buffer(body, 'base64');          
      //     cb(null, true)
      //   }
      // });
    } catch(e){      
      cb(e, false)
    }           
  }
  Specimen.remoteMethod(     
    'checkUrl',
    {
      http: {path: '/checkUrl', verb: 'get'},
          accepts: [    
        {arg: 'url', type: 'string', required:true}        
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  Specimen.getSpreadsheetInfo = function(id, cb) {            
    var key = require('key.json');    
    var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];        
    var jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      [SCOPES],
      null
    );    
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        console.log(err.errorDescription,err.error_description,tokens);
        cb(err,tokens)
        return;
      }          
      var service = google.sheets('v4');
      service.spreadsheets.get({
            auth: jwtClient,
            spreadsheetId: id,            
          }, function(err, d) {
            if (err){
              console.log('The API returned an error: ' + err);    
              cb('The API returned an error: ' + err,null)
              return;          
            }
            cb(null,d);
          });
        });
      //   service.spreadsheets.values.get({
      //     auth: jwtClient,
      //     spreadsheetId: id,
      //     range: 'specimen.pt-BR!A:BU'        
      //   }, function(err, d) {
      //     if (err){
      //       console.log('The API returned an error: ' + err);    
      //       cb('The API returned an error: ' + err,null)
      //       return;          
      //     }
      //     cb(null,d.values);
      //   });
      // });
  }
  Specimen.getImagesValues = function(id, language, cb) {
    var key = require('key.json');    
    var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];        
    var jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      [SCOPES],
      null
    );    
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        console.log(err.errorDescription,err.error_description,tokens);
        cb(err,tokens)
        return;
      }          
      var service = google.sheets('v4');      
      service.spreadsheets.values.get({
        auth: jwtClient,
        spreadsheetId: id,
        range: 'specimen.'+language+'!B:DD'        
      }, function(err, d) {
          if (err){
            console.log('The API returned an error: ' + err);    
            cb('The API returned an error: ' + err,null)
            return;          
          }
          var isCompleteValue = function(value) {
            return typeof value != "undefined" && String(value).trim().length > 0;
          }
          var rs = d.values;          
          var header = rs.splice(0,5);
          var images = [];
          rs.forEach(function(line, index){
              header[1].forEach(function(col, i){ 
                if(col == "Image" && String(line[i] || "").trim().length>0 ) {
                  var img = {
                    hash: hash(line),
                    header: header[4][i],
                    value: line[i],
                    row: index
                  };
                  images.push(img);
                }                                             
              });              
          });		                  
          cb(null,images);
        });
      });
  }
  Specimen.getHash = function(id, language, cb) {
    var key = require('key.json');    
    var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];        
    var jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      [SCOPES],
      null
    );    
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        console.log(err.errorDescription,err.error_description,tokens);
        cb(err,tokens)
        return;
      }          
      var service = google.sheets('v4');      
      service.spreadsheets.values.get({
        auth: jwtClient,
        spreadsheetId: id,
        range: 'specimen.'+language+'!B:DD'        
      }, function(err, d) {
          if (err){
            console.log('The API returned an error: ' + err);    
            cb('The API returned an error: ' + err,null)
            return;          
          }                    
          cb(null,hash(d.values));
        });
      });
  }
  Specimen.remoteMethod(     
    'getHash',
    {
      http: {path: '/getHash', verb: 'get'},
          accepts: [    
            {arg: 'id', type: 'string', required:true},   
            {arg: 'language', type: 'string', required:true},                
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  Specimen.conformity = function(id, language, cb) {
    var key = require('key.json');    
    var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];        
    var jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      [SCOPES],
      null
    );    
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        console.log(err.errorDescription,err.error_description,tokens);
        cb(err,tokens)
        return;
      }          
      var service = google.sheets('v4');      
      service.spreadsheets.values.get({
        auth: jwtClient,
        spreadsheetId: id,
        range: 'specimen.'+language+'!B:DD'        
      }, function(err, d) {
          if (err){
            console.log('The API returned an error: ' + err);    
            cb('The API returned an error: ' + err,null)
            return;          
          }
          var isCompleteValue = function(value) {
            return typeof value !== 'undefined' && String(value).trim().length > 0;
          }
          var rs = d.values;
          var conformity = 0;
          var totalCells = 0;    
          var header = rs.splice(0,5);
          var report = [];
          rs.forEach(function(line, index){
              header[2].forEach(function(col, i){
                      if(isCompleteValue(line[i])){                          
                          if(col === 'decimalLatitude') {  
                            var n = Number(line[i])                            
                            if ( isNaN(n) ) {
                              var gms = String(line[i]);
                              var numberPattern = /\d+/g;
                              var letterPattern = /[WwOoNnSsLlEe]/g;  
                              var parser = gms.match(numberPattern);
                              var decimal = false;                              
                              if( parser && parser.length >= 3 ) {              
                                var g = Number(parser[0]);
                                var m = Number(parser[1]);
                                var s = Number(parser[2]+(parser.length > 3?(parser[3]/1000):0));
                                var sig = String(gms.match(letterPattern)).toUpperCase()=="W" || String(gms.match(letterPattern)).toUpperCase()=="O" || String(gms.match(letterPattern)).toUpperCase()=="S"?-1:1;
                                decimal = sig*(g + ((m / 60) + (s / 3600))).toFixed(4);                                
                              }                              
                              if(decimal){
                                var assertion = {
                                  type: 'amendment',
                                  hash: hash(line),
                                  dimension: 'Conformity',
                                  enhancement: 'Recommend to transform from DMS format to decimal format',
                                  specification: 'More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js',
                                  mechanism: 'RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js',
                                  ie: header[4][i],
                                  dr: {
                                      row: index+6, 
                                      value: String(line[i]).trim(),
                                      drt:  'record'
                                  },
                                  response: {result: 'Change from "'+gms+'" (DMS format) to "'+decimal+'" (decimal format)'}
                                };
                                report.push(assertion); 
                              }                                
                            } else if (n >= -90 && n <= 90) {
                              conformity++;
                            } else {
                              var assertion = {
                                  type: 'amendment',
                                  hash: hash(line),
                                  dimension: 'Conformity',
                                  enhancement: 'Recommend to provide value in the range of decimal latitude',
                                  specification: 'If value is not provided, it is recommended to provide value. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js',
                                  mechanism: 'RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js',
                                  ie: header[4][i],
                                  dr: {
                                      row: index+6, 
                                      value: String(line[i]).trim(),
                                      drt:  'record'
                                  },
                                  response: {result: 'Modify latitude to a numeric value between -90 and 90'}
                              };
                              report.push(assertion); 
                          }                                           
                          totalCells++;
                        } else if(col === 'decimalLongitude') {  
                          var n = Number(line[i])                            
                          if ( isNaN(n) ) {
                            var gms = String(line[i]);
                            var numberPattern = /\d+/g;
                            var letterPattern = /[WwOoNnSsLlEe]/g;  
                            var parser = gms.match(numberPattern);
                            var decimal = false;                              
                            if( parser && parser.length >= 3 ) {              
                              var g = Number(parser[0]);
                              var m = Number(parser[1]);
                              var s = Number(parser[2]+(parser.length > 3?(parser[3]/1000):0));
                              var sig = String(gms.match(letterPattern)).toUpperCase()=="W" || String(gms.match(letterPattern)).toUpperCase()=="O" || String(gms.match(letterPattern)).toUpperCase()=="S"?-1:1;
                              decimal = sig*(g + ((m / 60) + (s / 3600))).toFixed(4);                                
                            }                            
                            if(decimal){
                              var assertion = {
                                type: 'amendment',
                                hash: hash(line),
                                dimension: 'Conformity',
                                enhancement: 'Recommend to transform from DMS format to decimal format',
                                specification: 'More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js',
                                mechanism: 'RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js',
                                ie: header[4][i],
                                dr: {
                                    row: index+6, 
                                    value: String(line[i]).trim(),
                                    drt:  'record'
                                },
                                response: {result: 'Change from "'+gms+'" (DMS format) to "'+decimal+'" (decimal format)'}
                              };
                              report.push(assertion); 
                            }                              
                          } else if (n >= -90 && n <= 90) {
                            conformity++;
                          } else {
                            var assertion = {
                                type: 'amendment',
                                hash: hash(line),
                                dimension: 'Conformity',
                                enhancement: 'Recommend to provide value in the range of decimal longitude',
                                specification: 'If value is not provided, it is recommended to provide value. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js',
                                mechanism: 'RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js',
                                ie: header[4][i],
                                dr: {
                                    row: index+6, 
                                    value: String(line[i]).trim(),
                                    drt:  'record'
                                },
                                response: {result: 'Modify longitude to a numeric value between -180 and 180'}
                            };
                            report.push(assertion); 
                        }                                           
                        totalCells++;
                      } else if(col === 'eventDate') {
                        var parsedDate = String(line[i]).split("-");
                        if(parsedDate.length==3){
                          if(
                            Number(parsedDate[0].trim())>=0 && Number(parsedDate[0].trim())<2100 &&
                            parsedDate[0].trim().length == 4 && 
                            Number(parsedDate[1].trim())>=0 && Number(parsedDate[1].trim())<=12 &&
                            parsedDate[1].trim().length == 2 &&
                            Number(parsedDate[2].trim())>=0 && Number(parsedDate[2].trim())<=31 &&
                            parsedDate[2].trim().length == 2
                          ){
                            conformity++;
                          }                          
                          else {
                            var assertion = {
                              type: 'amendment',
                                hash: hash(line),
                                dimension: 'Conformity',
                                enhancement: 'Recommend to change the date value to the ISO 8601 format',
                                specification: 'If value is not provided, it is recommended to provide value. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js',
                                mechanism: 'RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js',
                                ie: header[4][i],
                                dr: {
                                    row: index+6, 
                                    value: String(line[i]).trim(),
                                    drt:  'record'
                                },
                                response: {result: 'Modify date value to ISO 8601 format: YYYY-MM-DD (e.g.: 2001-03-22)'}
                            };
                            report.push(assertion); 
                          }
                        } else {
                          var assertion = {
                              type: 'amendment',
                              hash: hash(line),
                              dimension: 'Conformity',
                              enhancement: 'Recommend to change the date value to the ISO 8601 format',
                              specification: 'If value is not provided, it is recommended to provide value. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js',
                              mechanism: 'RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js',
                              ie: header[4][i],
                              dr: {
                                  row: index+6, 
                                  value: String(line[i]).trim(),
                                  drt:  'record'
                              },
                              response: {result: 'Modify date value to ISO 8601 format: YYYY-MM-DD (e.g.: 2001-03-22)'}
                          };
                          report.push(assertion); 
                      }                                           
                      totalCells++;
                    } 
                      }
              });              
          });		        
          var finalConformity = ((conformity/totalCells)*100);         
          finalConformity = finalConformity === 100? finalConformity:finalConformity.toFixed(2);
          report.push({
              type: 'measure',
              dimension: 'Conformity',
              specification: `Proportion of latitude that are conformity in the entire sheet. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js`,
              mechanism: `RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js`,
              ie: 'All',
              dr: {
                  id: id,
                  drt:  'dataset'
              },
              response: {result: finalConformity}
          }); 
          report.push({
              type: 'validation',
              criterion: 'Spreadsheet is conform',
              specification: `The entire sheet must be 100% conform. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js`,
              mechanism: `RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js`,
              ie: 'All',
              dr: {
                  id: id,
                  drt:  'dataset'
              },
              response: {result: finalConformity == 100}
          });
          cb(null,report);
        });
      });
  }
  Specimen.remoteMethod(     
    'conformity',
    {
      http: {path: '/conformity', verb: 'get'},
          accepts: [    
        {arg: 'id', type: 'string', required:true},   
        {arg: 'language', type: 'string', required:true},                
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  Specimen.completeness = function(id, language, cb) {
    var key = require('key.json');    
    var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];        
    var jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      [SCOPES],
      null
    );    
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        console.log(err.errorDescription,err.error_description,tokens);
        cb(err,tokens)
        return;
      }          
      var service = google.sheets('v4');      
      service.spreadsheets.values.get({
        auth: jwtClient,
        spreadsheetId: id,
        range: 'specimen.'+language+'!B:DD'        
      }, function(err, d) {
          if (err){
            console.log('The API returned an error: ' + err);    
            cb('The API returned an error: ' + err,null)
            return;          
          }
          var isCompleteValue = function(value) {
            return typeof value !== 'undefined' && String(value).trim().length > 0;
          }
          var rs = d.values;
          var completeness = 0;
          var totalCells = 0;    
          var header = rs.splice(0,5);
          var report = [];
          rs.forEach(function(line, index){
              header[2].forEach(function(col, i){            
                      if(!isCompleteValue(line[i])){                          
                          // Exceptions

                          if(col === 'beeImage' || 
                              col === 'pollenImage' ||
                              col === 'pollenShapePE' ||                              
                              col === 'espexi' ||
                              col === 'beePlantTrophicInteraction' ||
                              col === 'vernacularName' || 
                              col === 'pollenBibliographicCitation' ||   
                              col === 'palynomorphSpecialInformation' ||   
                              

                              // spore
                              col === 'sporeBibliographicCitation' ||   
                              col === 'sporeAdditionalInformation' ||   
                              col === 'sporeSpecialInformation' ||   
                              col === 'largerSporeDiameter' ||   
                              col === 'sporeDiameter' ||   
                              col === 'smallerSporeDiameter' ||   
                              col === 'perineOrnamentation' ||   
                              col === 'sporePerispore' ||   
                              col === 'polarAxis' ||   
                              col === 'equatorialAxis' ||   
                              col === 'sporeSize' ||   
                              col === 'sporeLaesura' ||   
                              
                              // taxon
                              col === 'pollenAmbit' ||   
                              col === 'largerPollenDiameter' ||   
                              col === 'smallerPollenDiameter' ||   
                              col === 'pollenDiameter' ||   
                              col === 'pollenPolarity' ||   
                              col === 'pollenSymmetry' ||                                 

                              // paleo
                              (col === 'pollenShape' && header[3][i].trim() === 'Palynomorph')||   
                              (col === 'numberOfApertures' && header[3][i].trim() === 'Palynomorph')||   
                              // (col === 'pollenPolarity' && header[3][i].trim() === 'Palynomorph')||   
                              (col === 'pollenAmbit' && header[3][i].trim() === 'Palynomorph')||   
                              // (col === 'pollenSymmetry' && header[3][i].trim() === 'Palynomorph')||   
                              (col === 'poreFeature' && header[3][i].trim() === 'Palynomorph')||   
                              (col === 'colpeFeature' && header[3][i].trim() === 'Palynomorph')||   
                              (col === 'palynomorphSpecialInformation' && header[3][i].trim() === 'Palynomorph')||   
                              (col === 'pollenAperture' && header[3][i].trim() === 'Palynomorph')||   
                              (col === 'pollenBibliographicCitation' && header[3][i].trim() === 'Palynomorph')||   
                              (col === 'palynomorphAdditionalInformation' && header[3][i].trim() === 'Palynomorph')||   
                              (col === 'exineOrnamentation' && header[3][i].trim() === 'Palynomorph')||   

                              // (col === 'largerPollenDiameter' && header[3][i].trim() === 'Palynomorph')||   
                              // (col === 'smallerPollenDiameter' && header[3][i].trim() === 'Palynomorph')||   
                              (col === 'equatorialAxis' && header[3][i].trim() === 'Palynomorph')||   
                              (col === 'polarAxis' && header[3][i].trim() === 'Palynomorph')||   
                              // (col === 'pollenDiameter' && header[3][i].trim() === 'Palynomorph')||                                
                              
                              // Quando “Tipo de abertura do pólen” for “Inaperturado” a coluna “Número de aberturas” fica vazia
                              (col === 'numberOfApertures' && String(line[header[2].indexOf("pollenAperture")]).trim().toUpperCase() === 'Inaperturado'.toUpperCase() || String(line[header[2].indexOf("pollenAperture")]).trim().toUpperCase() === 'Inaperturate'.toUpperCase()) ||

                              // Quando “Forma do pólen” for somente esferoidal deve-se estar preenchido “Tamanho do diâmetro” e os outros tamanhos podem estar vazios
                              (col === 'smallerPollenDiameter' && String(line[header[2].indexOf("pollenShape")]).trim().toUpperCase() === 'Esferoidal'.toUpperCase() || String(line[header[2].indexOf("pollenShape")]).trim().toUpperCase() === 'Spheroidal'.toUpperCase()) ||
                              (col === 'largerPollenDiameter' && String(line[header[2].indexOf("pollenShape")]).trim().toUpperCase() === 'Esferoidal'.toUpperCase() || String(line[header[2].indexOf("pollenShape")]).trim().toUpperCase() === 'Spheroidal'.toUpperCase()) ||

                              // Quando “Unidade de dispersão do pólen” for “Tétrade” ou “ Políade” podem estar vazias as colunas de “Simetria do pólen”, “Polaridade do pólen”, “Tipo de abertura do pólen”, “Característica do colpo”, “Característica do poro”, “Número de aberturas”
                              (col === 'pollenSymmetry' && String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Tétrade'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Tetrad'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Políade'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Polyad'.toUpperCase()) ||                              
                              (col === 'pollenPolarity' && String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Tétrade'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Tetrad'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Políade'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Polyad'.toUpperCase()) ||                              
                              (col === 'pollenAperture' && String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Tétrade'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Tetrad'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Políade'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Polyad'.toUpperCase()) ||                              
                              (col === 'colpeFeature' && String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Tétrade'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Tetrad'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Políade'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Polyad'.toUpperCase()) ||                              
                              (col === 'poreFeature' && String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Tétrade'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Tetrad'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Políade'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Polyad'.toUpperCase()) ||                              
                              (col === 'numberOfApertures' && String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Tétrade'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Tetrad'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Políade'.toUpperCase() || String(line[header[2].indexOf("pollenDispersalUnit")]).trim().toUpperCase() === 'Polyad'.toUpperCase()) ||                              

                              // Quando “Tipo de abertura do pólen” for “Sulco” pode ficar vazio em “Tamanho do eixo equatorial” e “Tamanho do diâmetro”
                              (col === 'equatorialAxis' && String(line[header[2].indexOf("pollenAperture")]).trim().toUpperCase() === 'Sulco'.toUpperCase() || String(line[header[2].indexOf("pollenAperture")]).trim().toUpperCase() === 'Sulcus'.toUpperCase()) ||
                              (col === 'pollenDiameter' && String(line[header[2].indexOf("pollenAperture")]).trim().toUpperCase() === 'Sulco'.toUpperCase() || String(line[header[2].indexOf("pollenAperture")]).trim().toUpperCase() === 'Sulcus'.toUpperCase()) ||

                              // quando preenchido “Tamanho do diâmetro menor” e “Tamanho do diâmetro maior” os outros campos podem ficar vazios.
                              (col === 'pollenDiameter' && String(line[header[2].indexOf("smallerPollenDiameter")] || "").trim().length > 0 && String(line[header[2].indexOf("largerPollenDiameter")] || "").trim().length > 0) ||

                              //Quando preenchido “Tamanho do eixo polar” e “Tamanho do eixo equatorial” podem ser vazios os campos de “Tamanho do diâmetro menor”, “Tamanho do diâmetro” e “Tamanho do diâmetro maior”
                              (col === 'smallerPollenDiameter' && String(line[header[2].indexOf("polarAxis")] || "").trim().length > 0 && String(line[header[2].indexOf("equatorialAxis")] || "").trim().length > 0) ||
                              (col === 'pollenDiameter' && String(line[header[2].indexOf("polarAxis")] || "").trim().length > 0 && String(line[header[2].indexOf("equatorialAxis")] || "").trim().length > 0) ||
                              (col === 'largerPollenDiameter' && String(line[header[2].indexOf("polarAxis")] || "").trim().length > 0 && String(line[header[2].indexOf("equatorialAxis")] || "").trim().length > 0) 
                            ) {
                            completeness++;
                          } else {
                            var assertion = {
                                type: 'amendment',
                                hash: hash(line),
                                dimension: 'Completeness',
                                enhancement: 'Recommend to provide value for an empty field',
                                specification: 'If value is not provided, it is recommended to provide value. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js',
                                mechanism: 'RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js',
                                ie: header[4][i],
                                dr: {
                                    row: index+6, 
                                    value: String(line[i]).trim(),
                                    drt:  'record'
                                },
                                response: {result: 'Provide some value'}
                            };
                            report.push(assertion); 
                          }                     
                      } else completeness++;
                      totalCells++;                         
              });              
          });		        
          var finalCompleteness = ((completeness/totalCells)*100);         
          finalCompleteness = finalCompleteness === 100? finalCompleteness:finalCompleteness.toFixed(2);
          report.push({
              type: 'measure',
              dimension: 'Completeness',
              specification: `Proportion of values that were provided in the entire sheet. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js`,
              mechanism: `RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js`,
              ie: 'All',
              dr: {
                  id: id,
                  drt:  'dataset'
              },
              response: {result: finalCompleteness}
          }); 
          report.push({
              type: 'validation',
              criterion: 'Spreadsheet is complete',
              specification: `The entire sheet must be 100% complete. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js`,
              mechanism: `RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js`,
              ie: 'All',
              dr: {
                  id: id,
                  drt:  'dataset'
              },
              response: {result: finalCompleteness == 100}
          });
          cb(null,report);
        });
      });
  }
  Specimen.aggregationByField = function(prefix, base, lang, field, cb) {            
    var queryMongo = { 'language':lang, base:base };        
    var SpecimenCollection = Specimen.getDataSource().connector.collection(Specimen.modelName);
    Specimen.getDataSource().connector.safe = false;     
    console.log(JSON.stringify([
      { $match: queryMongo},
      { $group: {
        _id: '$'+prefix+field+'.value',
        count: {$sum:1}
        }
      }
    ]));    
    SpecimenCollection.aggregate([
      { $match: queryMongo},
      { $group: {
        _id: '$'+prefix+field+'.value',
        count: {$sum:1}
        }
      }
    ], function (err, states) { 
      // console.log("ESTADO/ERROR",err,states)         
      // var results = {values: states};
      // console.log("ERROR: ",err);
      var results = {values: []};
      // console.log("STATES: ",states);
      states.forEach(function(item) {        
        if(item._id){
          item._id.split('|').forEach(function(subItem) {
            subItem = subItem.trim();
            var nil = true;  
            results.values.forEach(function(rs) {
              if(rs._id==subItem){
                nil = false;
                return false;
              }
            });
            if(nil)
              results.values.push({_id:subItem,count:0})        
          });       
        } 
      });
      // console.log("RESULTS: ",results);
      cb(null, results);      
    });   
  }
  
  Specimen.remoteMethod(     
    'completeness',
    {
      http: {path: '/completeness', verb: 'get'},
          accepts: [    
        {arg: 'id', type: 'string', required:true},   
        {arg: 'language', type: 'string', required:true},                
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  Specimen.remoteMethod(     
    'getImagesValues',
    {
      http: {path: '/getImagesValues', verb: 'get'},
          accepts: [    
        {arg: 'id', type: 'string', required:true},   
        {arg: 'language', type: 'string', required:true},                
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );  
  Specimen.remoteMethod(     
    'getSpreadsheetInfo',
    {
      http: {path: '/getSpreadsheetInfo', verb: 'get'},
          accepts: [    
        {arg: 'id', type: 'string', required:true},                
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );

  Specimen.remoteMethod(     
    'aggregationByField',
    {
      http: {path: '/aggregationByField', verb: 'get'},
          accepts: [    
        {arg: 'prefix', type: 'string', required:false},
        {arg: 'base', type: 'string', required:true},
        {arg: 'lang', type: 'string', required:true},
        {arg: 'field', type: 'string', required:true}        
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );

  var logs = {};
  function titleCase(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }
  
  function SpecimenHandler(base, originalLanguage, table) {
    this.count = 0;
    this.base = base;
    this.originalLanguage = originalLanguage;
    this.table = table;
  }
  SpecimenHandler.prototype.setSchemas = function(){
    var self = this;
    self.schemas = self.table[0];    
    return this;
  }
  SpecimenHandler.prototype.setClasses = function(){
    var self = this;
    self.classes = self.table[1];    
    return this;
  }
  SpecimenHandler.prototype.setTerms = function(){
    var self = this;
    self.terms = self.table[2];    
    return this;
  }
  SpecimenHandler.prototype.setData = function(){
    var self = this;
    self.data = self.table.slice(5,self.table.length);
    // self.db.collection('monitoring').doc(self.base).set({
    //   startProcess: new Date(),
    //   totalSpecimens: self.data.length,                  
    // },{merge: true});

    return this;
  }
  SpecimenHandler.prototype.processData = function(){
    var self = this;
    // var i = 0;
    console.log("2 - PROCESSING DATA!");
    return new Promise(function(resolve, reject){  
      function processLine(line,callback){
        // console.log("3 - PUSHING LINE!");
        self.processLine(line.line,callback);
        // i++;
        // self.db.collection('monitoring').doc(self.base).set({          
        //   totalProcessedSpecimens: i,                  
        // },{merge: true});
      }    
      var queue = async.queue(processLine,3);
      queue.drain = function() {        
        resolve();
      };
      self.data.forEach(function(line) {
        if(line[1] && line[2] && line[3]){          
          queue.push({line:line});          
        }          
      });
    });
  }
  function SpecimenRecord(base, language, originalLanguage, line){
    this.base = base;
    this.language = language;    
    this.originalLanguage = originalLanguage;    
    this.line = line;    
    this.record = {};
  }
  SpecimenRecord.prototype.defineId = function(){
    var self = this;        
    self.id = Specimen.app.defineSpecimenID(self.base, self.language,self.line[1],self.line[2],self.line[3]); //definição do id do specimen
    self.record.id = self.id;    
    return self.id;
  }
  SpecimenRecord.prototype.processField = function(term, index, callback){
    var self = this;    
    // console.log("7 - PROCESS FIELD!");
    var Schema = Specimen.app.models.Schema;
    var base = self.base;
    var language = self.language;
    var originalLanguage = self.originalLanguage;
    var value = toString(self.line[index]).trim();
    var schema = self.schemas[index];
    var class_ = self.classes[index];    
    // Process only if there is value
    if(term && value != ""){      
      var fieldId = Specimen.app.defineSchemaID(self.base, self.language, schema, class_, term, null); //define o id do esquema                      
      if(fieldId){ //se existe id definido no esquema
        Schema.findById(fieldId,function(err,field) { //busca o id que está no schema
          if(err){ //se existe erro na busca
            console.log(err);
            callback();
          } else if(field){ //se existe schema
            self.record.base = base;
            self.record.language = language; //recebe a linguagem      
            self.record[fieldId] = field;
            self.record[fieldId].value = value;
            self.record[fieldId].values = value.split("|").map(function(item) {
              return item.trim();
            });
            function processStates(cb){
              if(String(value).trim().length == 0) {
                // self.db.collection('monitoring').doc(self.base).collection("errors").doc("state:"+self.base+":"+self.originalLanguage+":"+term+":"+index).set({
                //       type: "state",
                //       target: self.base+":"+self.originalLanguage+":"+term+":"+index,
                //       message: "State is not complete",
                //       timestamp: new Date()
                // });                 
                callbackState();
                return false;
              }

              var statesValues = value.split("|");
              self.record[fieldId].states = [];
              async.each(statesValues, function(stateVal, callbackState) {
                var stateValue = titleCase(stateVal.trim());                                                                                                       
                // RETRIEVE THE ORIGINAL STATE                    
                Schema.findOne({ where:{ base:self.base, language:self.originalLanguage, term:term, vocabulary:stateValue}}, function(err,originalState) {
                  if(err) console.log(err)
                  if(originalState){
                    // NAO PRECISA DE TRADUÇÃO
                    if(self.originalLanguage == self.language){                      
                      self.record[fieldId].states.push(originalState.toJSON());
                      callbackState();
                    } else {
                      // RETRIEVE THE TRANSLATED STATE                      
                      var translatedStateId = Schema.app.defineSchemaID(self.base,self.language, schema, "State", originalState.term, originalState.state);                      
                      Schema.findById(translatedStateId,function(err,translatedState) {                      
                        if(translatedState){
                          self.record[fieldId].states.push(translatedState.toJSON());
                        } else {
                          console.log(`[${new Date().toISOString()}] ERROR: not translated state for id `,translatedStateId)
                          // self.db.collection('monitoring').doc(self.base).collection("errors").doc("state:"+translatedStateId).set({
                          //   type: "state",
                          //   target: translatedStateId,
                          //   message: "State not found in the glossary",
                          //   timestamp: new Date()
                          // });
                        }
                        callbackState();
                      });
                    }                    
                  } else {   
                    // self.db.collection('monitoring').doc(self.base).collection("errors").doc("state:"+self.base+":"+self.originalLanguage+":"+term+":"+stateValue).set({
                    //   type: "state",
                    //   target: self.base+":"+self.originalLanguage+":"+term+":"+stateValue,
                    //   message: "State not found in the glossary",
                    //   timestamp: new Date()
                    // });                 
                    callbackState();
                  }
                });                                    
              },function doneState() {                                
                cb()
              });
            }
            function processRegularFields(){
              var Collection = Specimen.app.models.Collection;
              var sID = self.record.id.split(":");              
              var cID = sID[1]+":"+sID[2]+":"+sID[3];                        
              Collection.findById(cID, function(err,collection) {                
                if(err) console.log("ERROR FIND COLLECTION: ",err);          
                if(collection) {
                  
                  self.record.collection = collection.toJSON();                                    
                } else {         
                  console.log(`[${new Date().toISOString()}] ERROR TO RETRIVE COLLECTION`, cID)         
                  // self.db.collection('monitoring').doc(self.base).collection("errors").doc("field:"+cID).set({
                  //   type: "collection",
                  //   target: cID,
                  //   message: "Collection not found in the insitutions sheet",
                  //   timestamp: new Date()
                  // });
                }
                callback();              
              });
              // EVENT DATE
              if(field.term=="eventDate"){
                var parsedDate = value.split("-");
                if(parsedDate.length==3){
                    self.record[fieldId].day = {value:parsedDate[2].trim()=="00"||parsedDate[0].trim()=="0"?null:parsedDate[0].trim()};
                    self.record[fieldId].month = {value:parsedDate[1].trim()=="00"||parsedDate[1].trim()=="0"?null:parsedDate[1].trim()};
                    self.record[fieldId].year = {value:parsedDate[0].trim()=="0000"||parsedDate[2].trim()=="00"?null:parsedDate[2].trim()};
                } else {
                  // TODO: Lógica para pegar valores parcialmente completos
                  self.record[fieldId].day = {};
                  self.record[fieldId].month = {};
                  self.record[fieldId].year = {};                
                }
              // IMAGE
              } else if(field["class"]=="Image"){
                  self.record[fieldId].images = [];
                  toString(self.record[fieldId].value).trim().split("|").forEach(function(img,i){   
                    if(img && img.length>0){
                      var imageId = base+"-"+img.split("?id=")[1];
                      if(typeof img.split("?id=")[1] == "undefined") imageId = base+"-"+img.split("file/d/")[1];  
                      var googleImageId = imageId.trim().split("-");
                      googleImageId.shift();                      
                      var image = {
                        id: imageId,                          
                        original: "https://docs.google.com/uc?id="+googleImageId.join("-"),
                        local: "/images/" + imageId + ".jpeg", //atribui a url onde vai ser salva a imagem
                        resized: "/resized/" + imageId + ".jpeg", //atribui a url onde vai ser salva a imagem
                        thumbnail: "/thumbnails/" + imageId + ".jpeg" //atribui a url onde vai ser salva a imagem
                      }
                      if(imageId) self.record[fieldId].images.push(image);
                    }
                  });
              // REFERENCE
              } else if(field["class"]=="Reference"){
                  self.record[fieldId].references = [];
                  self.record[fieldId].value.split("|").forEach(function (ref) {
                    self.record[fieldId].references.push(ref.trim());
                  });
              // INTERACTION
              } else if(field["class"]=="Interaction"){
                  self.record[fieldId].species = [];
                  self.record[fieldId].value.split("|").forEach(function (sp) {
                    self.record[fieldId].species.push(sp.trim());
                  });
              // FLOWERING PERIOD
              } else if(field.term=="floweringPeriod"){
                  self.record[fieldId].months = [];
                  self.record[fieldId].value.split("|").forEach(function (month) {
                    self.record[fieldId].months.push(month.trim());
                  });
              // LATITUDE
              } else if(field.term=="decimalLatitude"){
                  var converted = convertDMSCoordinatesToDecimal(self.record[fieldId].value.toUpperCase().replace("O","W").replace("L","E"));
                  if(converted!=self.record[fieldId].value){
                    self.record[fieldId].rawValue = self.record[fieldId].value;
                    self.record[fieldId].value = converted;
                  }
              // LONGITUDE
              } else if(field.term=="decimalLongitude"){                            
                  var converted = convertDMSCoordinatesToDecimal(self.record[fieldId].value.toUpperCase().replace("O","W").replace("L","E"));
                  if(converted!=self.record[fieldId].value){
                    self.record[fieldId].rawValue = self.record[fieldId].value;
                    self.record[fieldId].value = converted;
                  }
              }              
            }
            // CATEGORICAL DESCRIPTOR
            if(field["class"]=="CategoricalDescriptor" ){
              processStates(function(){
                processRegularFields();
              })              
            } else {
              processRegularFields();
            }                       
          } else {
            console.log("field does not exist")
            console.log(`[${new Date().toISOString()}] `,{fieldId})
            // self.db.collection('monitoring').doc(self.base).collection("errors").doc("field:"+fieldId).set({
            //   type: "field",
            //   target: fieldId,
            //   message: "Field not found in the glossary",
            //   timestamp: new Date()
            // });
            callback();
          }        
        });
      } else {
        callback();
      }
    } else {
      callback();
    }
  }
  SpecimenRecord.prototype.processRecord = function(){
    var self = this;
    // console.log("6 - PROCESS RECORD!");
    return new Promise(function(resolve, reject){
      function processField(term, index, callback){        
        self.processField(term, index, callback);
      }
      async.forEachOf(self.terms, processField, 
        function done(){
          // console.log("7 - FIELDS PROCESSED!");
          resolve();          
      });      
    });
  }
  SpecimenRecord.prototype.save = function(){
    // console.log("9 - SAVE!");
    var self = this;
    return new Promise(function(resolve, reject){
      Specimen.upsert(self.record,function(err,data){
        if(err) reject(err);
        else resolve();
      });
    });
  }  
  SpecimenHandler.prototype.saveRecord = function(language,line){
    // console.log("4 - SAVE RECORD!");
    var self = this;
    return new Promise(function(resolve, reject){
      var Schema = Specimen.app.models.Schema;      
      var record = new SpecimenRecord(self.base,language,self.originalLanguage,line);
      // record.db = self.db;
      record.schemas = self.schemas;
      record.classes = self.classes;
      record.terms = self.terms;
      record.base = self.base;
      if(record.defineId()){
        // console.log("5 - ID DEFINED!");
        record.processRecord().then(function(){
          // console.log("8 - SAVING")
          record.save().then(function(){
            // console.log("10 - SAVED!");
            resolve();
          }).catch(function(e){reject(e)});
        }).catch(function(e){reject(e)});        
      } else {
        reject("ID could not be defined");
      }          
    });
  }
  SpecimenHandler.prototype.processLine = function(line,callback){
    var self = this;    
    Promise.all([
      new Promise(function(resolve, reject){
        self.saveRecord("en-US",line).then(function(){resolve()}).catch(function(e){reject(e)})
      }),
      new Promise(function(resolve, reject){
        self.saveRecord("pt-BR",line).then(function(){resolve()}).catch(function(e){reject(e)})
      }),
      new Promise(function(resolve, reject){
        self.saveRecord("es-ES",line).then(function(){resolve()}).catch(function(e){reject(e)})
      })
    ]).then(function() {
      console.log(self.count++);
      // console.log("11 - LINE PROCESSED!");
        callback();
      })
      .catch(function(error){
        console.log("ERR-003", error)
        callback();
      });    
  }
  
 // var downloadQueue = []; //recebe o vetor com as imagens a serem baixadas
  //função que recebe a planilha
  Specimen.inputFromURL = function(req,id,language, base, cb) {
    req.setTimeout(0);
    var key = require('key.json');
    
    var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];        
    var jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      [SCOPES],
      null
    );
    
    
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        console.log(err.errorDescription,err.error_description,tokens);
        cb(err,tokens)
        return;
      }      
    //   key.private_key_id = "AIzaSyBSZPz37axCH9r50s7TdrgGdTi0Tt32Vtc"
    //   if(!admin.apps.length)
    //     admin.initializeApp({
    //       credential: admin.credential.cert(key)
    //     });    
    //   var db = admin.firestore();
       
      var service = google.sheets('v4');
      service.spreadsheets.values.get({
            auth: jwtClient,
            spreadsheetId: id,
            range: 'specimen.'+language+'!A:BU'        
          }, function(err, d) {
            if (err){
              console.log('The API returned an error: ' + err);    
              cb('The API returned an error: ' + err,null)
              return;          
            }                   
            Specimen.destroyAll({base:base},function(err,d_){
              console.log("1 - Apagado!");
              var start = new Date();
              var data = d.values;
              var handler = new SpecimenHandler(base, language, data);              
              // handler.db = db;
              handler.setSchemas().setClasses().setTerms().setData();                                          
              handler.processData()
                .then(function(){
                  var speciesTime = new Date();
                  console.log("TERMINADO SPECIMEN",speciesTime-start);
                  var Species = Specimen.app.models.Species;                  
                  Species.fromSpecimensAggregation(base, {}, function(err,data){
                    console.log("TERMINADO SPECIES",new Date()-speciesTime);
                    console.log("TERMINADO",new Date()-start);
                    cb(null,new Date()-start);
                  });                  
                })
                .catch(function(error){
                  console.log("processData error", error);
                  cb(error,null);
                });              
            });
          });
    });
  };  

  Specimen.downloadImages = function (req, base,cb) {
    req.setTimeout(0)
    function error (err){cb(err,null)}
    console.log("serviço chamado");
    var manager = new ImageDownloadManager();
    // define query de consulta de imagens
    var query  = manager.defineQuery(base);    
    // consulta imagens
    manager.getData(query,base)    
        // define uma fila com todas as imagens
        .then(manager.defineQueue).catch(error)
        // processa todas as imagens da fila
        .then(manager.processQueue).catch(error)
        // término do processo
        .then(function(){cb(null,"done")}).catch(error);    
  };
  function ImageDownloadManager() {}  
  ImageDownloadManager.prototype.processQueue = function(queue) {
    var self = this;
    console.log("processando fila")
    return new Promise(function(resolve, reject){
      var i = 0
      var processing;
      var processImage = function (img,cb){        
        var downloader = new ImageDownloader();         
        downloader.download(img).then(function(){
          console.log("download realizado com sucesso");
          cb();
        }).catch(function(error){
          console.log("erro ao fazer download de imagem");          
          if(error.img) {
            console.log("adicionou imagem no final da fila")
            if(i++ < 200)
              processing.push(img);
          }
          cb();
        });
      }
      processing = async.queue(processImage,1);      
      processing.push(queue);
      processing.drain = function() {
        resolve()        
      };
    });    
  }  
  ImageDownloadManager.prototype.defineQueue = function(data) {
    var self = this;
    console.log("definindo fila")
    return new Promise(function(resolve, reject){
      var queue = [];
      var result = data.result;
      var base = data.base;
      result.forEach(function (result){
        if(result[base+":pt-BR:rcpol:Image:allPollenImage"]){
            result[base+":pt-BR:rcpol:Image:allPollenImage"].images.forEach(function (img){
             queue.push(img);
            });
        }
        if(result[base+":pt-BR:rcpol:Image:allSporeImage"]){
          result[base+":pt-BR:rcpol:Image:allSporeImage"].images.forEach(function (img){
           queue.push(img);
          });
      }
        if(result[base+":pt-BR:rcpol:Image:flowerImage"]){
            result[base+":pt-BR:rcpol:Image:flowerImage"].images.forEach(function (img){
              queue.push(img);
            });
        }
        if(result[base+":pt-BR:rcpol:Image:plantImage"]){
            result[base+":pt-BR:rcpol:Image:plantImage"].images.forEach(function (img){
              queue.push(img);
            });
        }
        if(result[base+":pt-BR:rcpol:Image:beeImage"]){
            result[base+":pt-BR:rcpol:Image:beeImage"].images.forEach(function (img){
             queue.push(img);
            });
        }
        if(result[base+":pt-BR:rcpol:Image:pollenImage"]){
            result[base+":pt-BR:rcpol:Image:pollenImage"].images.forEach(function (img){
              queue.push(img);
            });
        }
      });      
      resolve(queue);
    });    
  }      
  ImageDownloadManager.prototype.getData = function(query,base) {
    var self = this;
    return new Promise(function(resolve, reject){
      console.log("query",query)
      Specimen.find(query, function(err,result){
        if(err) reject(err)        
        else{
          var data = {response: {result:result, base: base}}
          
          resolve(data.response);
        }
      });
    });  
  }  
  ImageDownloadManager.prototype.defineQuery = function(base) {
    var self = this;
    var query = {
      where:{
        or:[
        ]
      },
      fields:{}
    };
    console.log("define filtro para pegar apenas imagens que tenham pelo menos uma imagem")
    var allPollen =  {};    
    allPollen[base+":pt-BR:rcpol:Image:allPollenImage"] = {exists:true};
    var plant =  {};
    plant[base+":pt-BR:rcpol:Image:plantImage"] = {exists:true};
    var flower =  {};
    flower[base+":pt-BR:rcpol:Image:flowerImage"] = {exists:true};
    var bee =  {};
    bee[base+":pt-BR:rcpol:Image:beeImage"] = {exists:true};
    var pollen =  {};
    pollen[base+":pt-BR:rcpol:Image:pollenImage"] = {exists:true};

    var allSporeImage =  {};    
    allSporeImage[base+":pt-BR:rcpol:Image:allSporeImage"] = {exists:true};
    

    query.where.or.push(allPollen);
    query.where.or.push(allSporeImage);
    query.where.or.push(plant);
    query.where.or.push(flower);
    query.where.or.push(bee);
    query.where.or.push(pollen);    
    console.log("traz apenas os campos de imagens")
    query.fields[base+":pt-BR:rcpol:Image:allPollenImage"] = true;
    query.fields[base+":pt-BR:rcpol:Image:allSporeImage"] = true;
    query.fields[base+":pt-BR:rcpol:Image:plantImage"] = true;
    query.fields[base+":pt-BR:rcpol:Image:flowerImage"] = true; 
    query.fields[base+":pt-BR:rcpol:Image:beeImage"] = true;
    query.fields[base+":pt-BR:rcpol:Image:pollenImage"] = true; 
    return query;
  }
  function ImageDownloader() {}    
  ImageDownloader.prototype.imageExists = function() {
    var self =  this;
    return new Promise(function(resolve, reject){   
      // console.log("imagem existe")   
      resolve();      
    });
  }
  ImageDownloader.prototype.downloadImage = function(img) {
    var self =  this;    
    return new Promise(function(resolve, reject){      
      console.log("imagem nao existe",img.original);  
      try{
        request(img.original, {encoding: 'binary'}, function(err, response, body){          
          if (err){          
              console.log("Error to download "+img.original);                        
              reject({img:img.raw});
          } else {
            // console.log("imagem baixada");          
            img.downloadedContent = body;
            resolve(img);          
          }
        });
      } catch(e){
        console.log("ERROR: ", e)
      }               
    });
  }
  ImageDownloader.prototype.transformImage = function(img, source, target, size) {
    var self =  this;    
    return new Promise(function(resolve, reject){             
      var param = { src: source, dst: target, width: size.width}
      if(size.height) param.height = size.height;
      qt.convert(param, function(err, filename) {
        if(err){
          reject({img: img.raw})          
        } else {        
          resolve(img);
        }
      });
    });
  }
  ImageDownloader.prototype.writeOriginalImage = function(img) {
    var self =  this;
    // console.log("writeOriginalImage")
    return new Promise(function(resolve, reject){
      fs.writeFile(__dirname + "/../../client"+img.local, img.downloadedContent, 'binary', function(err){
        if(err){
          console.log("erro para gravar", err);
          reject({img:img.raw});
        } else {
          resolve(img);
        }
      });
    });
  }
  ImageDownloader.prototype.download = function(img) {    
    var self = this;        
    return new Promise(function(resolve, reject){      
      var error = function(err){           
        if(err.img){               
          console.log(err.img.original)
          fs.unlink(__dirname + "/../../client"+err.img.local,function(err_){            
            if(err_) console.log("original não apagado");
            else console.log('original file deleted successfully');                
            reject(err);
          });
          fs.unlink(__dirname + "/../../client"+err.img.resized,function(err_){            
            if(err_) console.log("resized não apagado");
            else console.log('resized file deleted successfully');                            
          });
          fs.unlink(__dirname + "/../../client"+err.img.thumbnail,function(err_){            
            if(err_) console.log("thumbnail não apagado");
            else console.log('thumbnail file deleted successfully');                            
          });
        }
        
      }
      var done = function(){
        resolve();
      }
      // cria um modelo manipulação da imagem
      self.img = new Image(img);
      
      // ORIGINAL
      var isOriginalExists = function(){
        return self.img.checkIfExist(self.img.localPath);
      }      
      var downloadImage = function() {        
        return self.downloadImage(self.img);        
      }      
      var handleOriginal = function(exists){
        // console.log("original")
        if(exists){
          // console.log("existe")
          return new Promise(function(resolve, reject){      
            resolve();          
          });
        }          
        else return downloadImage().then(self.writeOriginalImage).catch(function(err){console.log("err em downloadImage",err)});
      }
      // RESIZED
      var isResizedExists = function(){
        return self.img.checkIfExist(self.img.resizedPath);
      }   
      var transformResizedImage = function() {
        return self.transformImage(self.img, self.img.localPath, self.img.resizedPath, { width: 1500 });
      }   
      var handleResized = function(exists){
        // console.log("resized")
        if(exists){
          // console.log("existe")
          return new Promise(function(resolve, reject){      
            resolve();
          });
        } else return transformResizedImage();  
      }
      // THUMBNAIL
      var isThumbnailExists = function(){
        return self.img.checkIfExist(self.img.thumbnailPath);
      }
      var transformThumbnailImage = function() {
        return self.transformImage(self.img, self.img.resizedPath, self.img.thumbnailPath, { width: 100, height: 100 });
      }
      var handleThumbnail = function(exists) {
        // console.log("thumbnail")
        if(exists){
          // console.log("existe")
          return new Promise(function(resolve, reject){      
            resolve();          
          });
        } else return transformThumbnailImage();          
      }      

      isOriginalExists()
        .then(handleOriginal).catch(error)        
        .then(isResizedExists).catch(error)
        .then(handleResized).catch(error)  
        .then(isThumbnailExists).catch(error)      
        .then(handleThumbnail).catch(error)
        .then(done).catch(error);          
    });    
  };
  function Image(img) {            
    this.raw = img;    
    this.original = img.original;
    this.local = img.local;
    this.resized = img.resized;
    this.thumbnail = img.thumbnail;
    this.localPath = __dirname + "/../../client"+this.local;
    this.thumbnailPath = __dirname + "/../../client"+this.thumbnail;
    this.resizedPath = __dirname + "/../../client"+this.resized;
  }  

  Image.prototype.checkIfExist = function(path) {
    var self = this;
    return new Promise(function(resolve, reject){
      try{                
        fs.exists(path, function(exists){
          resolve(exists);        
        });
      } catch(e){
        console.log("erroooooooooo",e)
      }      
    });
  }
  Specimen.remoteMethod(
    'downloadImages',
    {
      http: {path: '/downloadImages', verb: 'get'},
      accepts: [
        { arg: "req", type: "object", http: { source: "req" } },
        // {arg:'download'}
        {arg: 'base', type: 'string', required:true}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  Specimen.cleanDB = function(cb) {
    Specimen.destroyAll(function (err,callback) {
      cb(err,callback);
    });
  };
  Specimen.getCollection = function(code, cb) {
    Specimen.getApp(function(err, app){
      if (err) throw new Error(err);
      var Collection = app.models.Collection;
      var filter = {"dwc\:collectionCode.value": code};
      Collection.find({where: filter}, function(err, collection){
        if (err) throw new Error(err);
        cb(null, collection);
      });
    });
  };
  Specimen.remoteMethod(
    'cleanDB',
    {
      http: {path: '/clean', verb: 'get'},
      accepts: [
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  Specimen.remoteMethod(
    'getCollection',
    {
      http: {path: '/getCollection', verb: 'get'},
      accepts: [
        {arg: 'code', type: 'string', required:true}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  Specimen.remoteMethod(
    'inputFromURL',
    {
      http: {path: '/xlsx/inputFromURL', verb: 'get'},
      accepts: [
        { arg: "req", type: "object", http: { source: "req" } },
        {arg: 'id', type: 'string', required:true, description: 'link para tabela de espécimes'},
        {arg: 'language', type: 'string', required:true, description: 'en-US, pt-BR ou es-ES'},
        {arg: 'base', type: 'string', required:true, description: 'eco ou taxon'}
       // {arg: 'redownload', type: 'boolean', required:false, description: 'true para baixar todas as imagens. false para baixar somente imagens novas. default: false', default: false}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );
  function toString(arg) {
    return (typeof arg == 'undefined')?'':String(arg).trim();
  }
  function defineId(line,idIndexes) {
    var idValue = '';
    for(var j = 0; j < idIndexes.length; j++){
      /*if(toString(line[idIndexes[j]])=='')
      return null;*/
      idValue = idValue+":"+ String(line[idIndexes[j]]).trim();
    };
    if (idValue == ":::")
      return null;
    return hash.MD5(idValue);
  }
  function defineName(url) {
    if(url.indexOf("?id=")!=-1)
    var name = url.split("?id=")[1];
    else if(url.indexOf(".xls")!=-1)
    name = hash.MD5(url);
    else return null;
    return name;
  }
  function saveDataset(name,url,path) {
    var Dataset = Specimen.app.models.Dataset;
    var dataset = {};
    dataset.id = name;
    dataset.urlSource = url;
    dataset.localSource = path;
    dataset.type = "Specimen";
    Dataset.upsert(dataset,function (err,instance) {
      if (err) throw new Error(err);
      //console.log("Dataset saved: "+instance.id);
    });
  }
  function convertDMSCoordinatesToDecimal(str) {
    if(str==""){
      return "";
    }
    var parsed = DMSCoordinateParser(str);;
    if ((parsed.direction == "S" ||
    parsed.direction == "W" ||
    parsed.direction == "N" ||
    parsed.direction == "E") &&
    isNumeric(parsed.degrees) &&
    isNumeric(parsed.minutes) &&
    isNumeric(parsed.seconds)) {
      return parsedDMSCoordinateToDecimal(parsed.degrees, parsed.minutes, parsed.seconds, parsed.direction);
    }else{
      return str;
    }
  };
  function parsedDMSCoordinateToDecimal (degrees, minutes, seconds, direction) {
    var dd = parseFloat(degrees) + parseFloat(minutes)/60 + parseFloat(seconds)/(60*60);
    if (direction == "S" || direction == "W") {
      dd = dd * -1;
    } // Don't do anything for N or E
    return dd;
  }
  function DMSCoordinateParser (coordinate){
    var r = {};
    r.degrees = "";
    r.minutes = "";
    r.seconds = "";
    var directionPosition = coordinate.toUpperCase().search(/S|W|N|E/);

    r.direction = coordinate.substring(directionPosition,directionPosition+1);
    var i = 0;
    var d = 0;
    while(d<3){
      var s = coordinate.substring(i,coordinate.length).search(/[0-9]|\./);
      if(s==0){
        //Number
        r.degrees += d==0? coordinate.substring(i,i+1):"";
        r.minutes += d==1? coordinate.substring(i,i+1):"";
        r.seconds += d==2? coordinate.substring(i,i+1):"";
        i++;
      }else{
        // Non-Number
        i++;
        d++;
      }
    }
    return r;
  }
  function isNumeric (str){
    return validator.isFloat(str);
  };
};
