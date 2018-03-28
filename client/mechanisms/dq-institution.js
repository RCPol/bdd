var Institution = function(){
    this.report = [];
}
Institution.prototype.completeness = function(rs, id) {	
    var self = this;					    
    var completeness = 0;
    var totalCells = 0;    
    var header = rs.response.splice(0,4);
    rs.response.forEach(function(line, index){	
        header[2].forEach(function(coll, i){
            if(!self.isCompleteValue(line[i])){
                self.report.push({
                    type: "amendment",
                    enhancement: "Recommend to provide value for an empty field",
                    specification: "If value is not provided, it is recommended to provide value. More details in: http://chaves.rcpol.org.br/mechanisms/dq-institution.js",
                    mechanism: "RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-institution.js",
                    ie: header[3][i],
                    dr: {
                        row: index+1, 
                        value: String(line[i] || "").trim(),
                        drt:  "record"
                    },
                    result: "Provide some value"
                });                    										
            } else completeness++;
            totalCells++;            
        });
    });		        
    var finalCompleteness = ((completeness/totalCells)*100)
    // var finalCompleteness = ((completeness/totalCells)*100);
    finalCompleteness = finalCompleteness == 100? finalCompleteness:finalCompleteness.toFixed(2);
    self.report.push({
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
    self.report.push({
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

Institution.prototype.isCompleteValue = function(value) {
    return typeof value != "undefined" && String(value).trim().length > 0;
}