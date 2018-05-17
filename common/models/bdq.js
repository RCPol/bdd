var google = require('googleapis');
var xlsx = require('node-xlsx');
var hash = require('object-hash');
var request = require('request');
var async = require('async');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

const requestImageSize = require('request-image-size');

module.exports = function(Bdq) {

  Bdq.getReportByHash = function(hash, cb) {    
      Bdq.findById(hash, function(err, data){
        if(err) return cb(err,data);
        cb(err,data);
      });            
  }
  Bdq.remoteMethod(     
    'getReportByHash',
    {
      http: {path: '/getReportByHash', verb: 'get'},
          accepts: [    
        {arg: 'hash', type: 'string', required:true}      
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );  

  Bdq.getReportByIdentifier = function(drId, cb) {    
      Bdq.findOne({where:{identifier: drId}, order: 'dataUpdate DESC'}, function(err, data){
        if(err) return cb(err,data);
        cb(err,data);
      });            
  }
  Bdq.remoteMethod(     
    'getReportIdentifier',
    {
      http: {path: '/getReportIdentifier', verb: 'get'},
          accepts: [    
        {arg: 'drId', type: 'string', required:true}      
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );  


  Bdq.recordDataResource = function(hash, type, identifier, resourceLocator, cb) {      
      var dr = {
        id: hash,
        type: type,
        identifier: identifier,
        resourceLocator: resourceLocator,
        dataUpdate: new Date(),
        report: {
          measure: {},
          validation: {},
          amendment: {} 
        }
      }
      Bdq.upsert(dr, function(err, data){
        if(err) return cb(err,data);
        cb(err,"created");
      });            
  }
  Bdq.remoteMethod(     
    'recordDataResource',
    {
      http: {path: '/recordDataResource', verb: 'post'},
          accepts: [    
        {arg: 'hash', type: 'string', required:true}, 
        {arg: 'type', type: 'string', required:true},        
        {arg: 'identifier', type: 'any', required:true},        
        {arg: 'resourceLocator', type: 'object', required:true},
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );  
  Bdq.recordAssertion = function(hash, assertionId, type, dr, specification, mechanism, ie, response, dimension, criterion, enhancement, cb) {    
    console.log("params", hash, assertionId, type, specification, mechanism, ie, response, dimension, criterion, enhancement)
    Bdq.findById(hash, function(err,data){
      if(err) return cb(err,data);
      if(data) {                
        data.updateAttribute("reportUpdate", new Date(), function(err,data){});
        assertion = {
          id: assertionId,
          type: type,                    
          dr: dr,
          specification: specification,
          mechanism: mechanism,
          ie: ie, 
          updated: new Date(),
          response: {
            result: response.result,
            status: response.status,
            comment: response.comment
          }
        }
        if(dimension)
          assertion.dimension = dimension;
        if(criterion)
          assertion.criterion = criterion;
        if(enhancement)
          assertion.enhancement = enhancement;          
        data.updateAttribute("report."+type+"."+assertionId, assertion, function(err,d){
          cb(err,"recorded");
        });
      } else {
        cb("data resource not found", null);
      }
    })
    
    
  }
  Bdq.remoteMethod(     
    'recordAssertion',
    {
      http: {path: '/recordAssertion', verb: 'post'},
          accepts: [    
        {arg: 'hash', type: 'string', required:true},   
        {arg: 'assertionId', type: 'string', required:true},
        {arg: 'type', type: 'string', required:true},
        {arg: 'dr', type: 'any', required:true},
        {arg: 'specification', type: 'any', required:true},
        {arg: 'mechanism', type: 'any', required:true},
        {arg: 'ie', type: 'any', required:true},
        {arg: 'response', type: 'object', required:true},
        {arg: 'dimension', type: 'any', required:false},
        {arg: 'criterion', type: 'any', required:false},
        {arg: 'enhancement', type: 'any', required:false}
      ],
      returns: {arg: 'response', type: 'object'}
    }
  );

  
};
