var Specimen = function(){
    this.report = {
        completeness: [],
        accessibility: [],
        conformity: [],
        uniqueness: [],
        consistency: []
    };
}
Specimen.prototype.completeness = function(id, lang, cb) {	
    var self = this;					    
    $.get("/api/Specimens/completeness?id="+id+"&language="+lang,function(rs) {        
        self.report.completeness = rs.response;
        cb()
    });    
    return this;
}
Specimen.prototype.uniqueness = function(id, lang, cb) {	
    var self = this;					    
    $.get("/api/Specimens/uniqueness?id="+id+"&language="+lang,function(rs) {        
        self.report.uniqueness = rs.response;
        cb()
    });    
    return this;
}
Specimen.prototype.consistency = function(id, lang, cb) {	
    var self = this;					    
    $.get("/api/Specimens/consistency?id="+id+"&language="+lang,function(rs) {        
        self.report.consistency = rs.response;
        cb()
    });    
    return this;
}
Specimen.prototype.conformity = function(id, lang, cb) {	
    var self = this;					    
    $.get("/api/Specimens/conformity?id="+id+"&language="+lang,function(rs) {        
        self.report.conformity = rs.response;
        cb()
    });    
    return this;
}

Specimen.prototype.getCache = function(url) {
    if (typeof(Storage) !== "undefined") {
        if(localStorage[url]){            
            var hours = (new Date - new Date(localStorage[url])) / 36e5;            
            return hours<0.5;
        }            
        else {            
            return false;
        } 
            
    } else {        
        return false;
    }
}
Specimen.prototype.setCache = function(url) {
    if (typeof(Storage) !== "undefined") {        
        localStorage[url] = new Date();        
    }
}

Specimen.prototype.accessibility = function(rs, id, icb, cb) {	
    var self = this;					    
    var accessibility = 0;
    var totalChecks = 0;    
    var totalUrls = 0;    
    rs.response.forEach(function(img, index){        			        
        img.value.split("|").forEach(function(url){
            totalUrls++;
            url = url.replace("https://drive.google.com/open?id=", "https://docs.google.com/uc?id=").trim()                
            $.get("/api/Specimens/checkUrl?url="+url,function(rs) {
                if(rs.response == false) {
                    // doble check
                    $.get("/api/Specimens/checkUrl?url="+url,function(rs) {
                        if(rs.response == false) {
                            var assertion = {
                                type: "amendment",
                                hash: img.hash,
                                enhancement: "Recommend to check the address of the image",
                                dimension: "accessibility",                                
                                specification: "If value is not provided, it is recommended to provide value. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js",
                                mechanism: "RCPol Data Quality Tool. More details in: http://chaves.rcpol.org.br/mechanisms/dq-specimens.js",
                                ie: img.header,
                                dr: {
                                    row: img.row+6, 
                                    value: String(img.value).trim(),
                                    drt:  "record"
                                },
                                response: {result: "Check the URL address"}
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
                        response: {result: finalAccessibility}
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
                        response: {result: finalAccessibility == 100}
                    }); 
                    cb();
                }                                            
            });
        });                                               
    });    
    return this;					       		
}

Specimen.prototype.isCompleteValue = function(value) {
    return typeof value != "undefined" && String(value).trim().length > 0;
}