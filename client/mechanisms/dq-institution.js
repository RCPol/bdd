var Institution = function(){
    this.report = {
        completeness: [],
        accessibility: [],
        uniqueness: []
    };
}
Institution.prototype.uniqueness = function(rs, id) {
    var self = this;        
    var header = rs.response.splice(0,1);
    var individuals = {};
    rs.response.forEach(function(line, index){         
        if(String(line[1] || "").trim().length > 0 &&
              String(line[2] || "").trim().length > 0) {                
                var id = [String(line[0] || "").trim().toUpperCase(), String(line[1] || "").trim().toUpperCase()].join(", ");
                individuals[id] = {
                  count: individuals[id] && individuals[id].count ? individuals[id].count+1:1,
                  rows: individuals[id] && individuals[id].rows ? individuals[id].rows.concat([index+6]):[index+6]
                }
            }        
    });
    
    Object.keys(individuals).map(function(id) {
        if(individuals[id].count>1) {
          var assertion = {
              type: 'amendment',              
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
              response: {result: `Leave only one of the rows ${individuals[id].rows}, which have the same identifier (${id})`}
          };          
          
          self.report.uniqueness.push(assertion);
        }            
      });    
      var finalUniqueness = ((Object.keys(individuals).length/rs.response.length)*100);                       
      finalUniqueness = finalUniqueness === 100? finalUniqueness:finalUniqueness.toFixed(2);      
      self.report.uniqueness.push({
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
      self.report.uniqueness.push({
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
}
Institution.prototype.completeness = function(rs, id) {	
    var self = this;					    
    var completeness = 0;
    var totalCells = 0;    
    var header = rs.response.splice(0,4);
    rs.response.forEach(function(line, index){	
        header[2].forEach(function(coll, i){            
            if(self.isCompleteValue(line[i]) || coll=="instituteName" || coll=="department" || coll=="laboratory" || coll=="homepage") {
                completeness++;  

            } else {
                self.report.completeness.push({
                    type: "amendment",
                    enhancement: "Recommend to provide value for an empty field",
                    dimension:  "Completeness",
                    specification: "If value is not provided, it is recommended to provide value. More details in: http://chaves.rcpol.org.br/mechanisms/dq-institution.js",
                    mechanism: "RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-institution.js",
                    ie: header[3][i],
                    dr: {
                        row: index+5, 
                        value: String(line[i] || "").trim(),
                        drt:  "record"
                    },
                    result: "Provide some value"
                }); 
            }
            totalCells++;            
        });
    });		        
    var finalCompleteness = ((completeness/totalCells)*100)
    // var finalCompleteness = ((completeness/totalCells)*100);
    finalCompleteness = finalCompleteness == 100? finalCompleteness:finalCompleteness.toFixed(2);
    self.report.completeness.push({
        type: "measure",
        dimension: "Completeness",
        specification: `Proportion of values that were provided in the entire sheet. More details in: http://chaves.rcpol.org.br/mechanisms/dq-institution.js`,
        mechanism: `RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-institution.js`,
        ie: "All",
        dr: {
            id: id,
            drt:  "dataset"
        },
        result: finalCompleteness
    }); 
    self.report.completeness.push({
        type: "validation",
        criterion: "Spreadsheet is complete",
        specification: `The entire sheet must be 100% complete. More details in: http://chaves.rcpol.org.br/mechanisms/dq-institution.js`,
        mechanism: `RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-institution.js`,
        ie: "All",
        dr: {
            id: id,
            drt:  "dataset"
        },
        result: finalCompleteness == 100
    }); 					       		
}

Institution.prototype.accessibility = function(rs, id, icb, cb) {	
    var self = this;					    
    var accessibility = 0;
    var totalChecks = 0;    
    var totalUrls = 0;    
    
    rs.response.forEach(function(img, index){        
        if(!img.value)
            console.log(img)
        img.value.split("|").forEach(function(url){            
            totalUrls++;
            url = url.replace("https://drive.google.com/open?id=", "https://docs.google.com/uc?id=").trim()
            $.get("/api/Collections/checkUrl?url="+url,function(rs) {
                if(rs.response == false) {
                    // doble check
                    $.get("/api/Collections/checkUrl?url="+url,function(rs) {
                        if(rs.response == false) {
                            var assertion = {
                                type: "amendment",
                                enhancement: "Recommend to check the address of the image",
                                dimension: "accessibility",
                                specification: "If value is not provided, it is recommended to provide value. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js",
                                mechanism: "RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js",
                                ie: img.header,
                                dr: {
                                    row: img.row,
                                    value: String(img.value).trim(),
                                    drt:  "record"
                                },
                                result: "Check the URL address"
                            };
                            self.report.accessibility.push(assertion);
                            icb(img.row, assertion);
                        } else accessibility++;                       
                    });                    
                } else accessibility++;
                totalChecks++;            
                icb(img.row, null);
                if(totalChecks>=index && totalChecks == totalUrls) {
                    var finalAccessibility = ((accessibility/totalUrls)*100)                        
                    finalAccessibility = finalAccessibility == 100? finalAccessibility:finalAccessibility.toFixed(2);
                    self.report.accessibility.push({
                        type: "measure",
                        dimension: "Accessibility",
                        specification: `Proportion of values that were provided in the entire sheet. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js`,
                        mechanism: `RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js`,
                        ie: "All",
                        dr: {
                            id: id,
                            drt:  "dataset"
                        },
                        result: finalAccessibility
                    }); 
                    self.report.accessibility.push({
                        type: "validation",
                        criterion: "All of the images must be publicly available in Internet",
                        specification: `The entire sheet must be 100% complete. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js`,
                        mechanism: `RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js`,
                        ie: "All",
                        dr: {
                            id: id,
                            drt:  "dataset"
                        },
                        result: finalAccessibility == 100
                    }); 
                    cb();
                }                                            
            });
        });                                               
    });    
    return this;					       		
}


Institution.prototype.isCompleteValue = function(value) {
    return typeof value != "undefined" && String(value).trim().length > 0;
}