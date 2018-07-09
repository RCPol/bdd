var BDQ = function(){    
    this.specimen = new Specimen();	
    this.printer = new UIPrinter();
}


// BDQ.prototype.getDatasetReports = function(cb) {	
//     $.get("/api/Bdqs/find?type=multi",function(rs) {        
//         if(rs.response){
//             console.log(rs)
//         } else cb(null);
//     });
// }

BDQ.prototype.getDatasetHash = function(id, lang, cb) {	
    $.get("/api/Specimens/getHash?id="+id+"&language="+lang,function(rs) {
        var datasetHash = rs.response;
        cb(datasetHash)        
    });
}

BDQ.prototype.getReportByHash = function(hash, cb) {
    var self = this;  
    $.get("/api/Bdqs/"+hash, function(rs) {
        if(rs){            
            cb(rs);
        } else cb(null);
    }).fail(function(){
        cb(null)
    });
}
BDQ.prototype.getRecordReportByDatasetHash = function(hash, cb) {
    var self = this;  
    $.get("/api/Bdqs?filter=%7B%22where%22%3A%7B%22type%22%3A%22single%22%2C%20%22resourceLocator.datasetHash%22%3A%22"+hash+"%22%7D%7D", function(rs) {
        if(rs){            
            cb(rs);
        } else cb([]);
    }).fail(function(){
        cb([])
    });
}


BDQ.prototype.recordDataResource = function(hash, type, identifier, resourceLocator, cb) {    
    $.post("/api/Bdqs/recordDataResource",{hash:hash, type:type, identifier:identifier, resourceLocator:resourceLocator}).done(
        function(rs) {        
            if(rs.response){                
                cb(rs);
            } else cb(null);
        }).fail(function(err){
            console.log("recordDataResource", err)
        });
}

BDQ.prototype.recordAssertion = function(hash, assertionId, type, dr, specification, mechanism, ie, response, dimension, criterion, enhancement, cb) {
    cb("recorded")
    // $.post("/api/Bdqs/recordAssertion",{hash:hash, assertionId: assertionId, type:type, dr:dr, specification:specification, mechanism:mechanism, ie:ie, response:response, dimension:dimension, criterion:criterion, enhancement:enhancement}).done(
    //     function(rs) {            
    //         cb(rs);
    //     }).fail(function(err){
    //         console.log("err recordAssertion", err)
    //     });
}

BDQ.prototype.generateSpecimenReport = function(id, lang) {
    var self = this;
    self.specimenProcess = 0;
    self.createdRecords = {};    
    self.specimen.conformity(id, lang, function(){
        self.specimen.report.conformity.forEach(function(assertion, i){
            if(assertion && assertion.dr.drt == "record" && assertion.type == "amendment"){
                if(!self.createdRecords[assertion.hash]) {                    
                    self.createdRecords[assertion.hash] = true;
                    self.recordDataResource(assertion.hash, "single", "row: "+assertion.dr.row, {row:assertion.dr.row, datasetHash: self.specimenDatasetHash}, function(rs){
                        self.recordAssertion(assertion.hash, "CONFORM_SPECIMEN_RECORD_"+assertion.ie, "amendment", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, assertion.dimension, null, assertion.enhancement, function(rs){
                            console.log("recorded conformity measure", rs)                    
                        });
                    });
                } else {
                    self.recordAssertion(assertion.hash, "CONFORM_SPECIMEN_RECORD_"+assertion.ie, "amendment", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, assertion.dimension, null, assertion.enhancement, function(rs){
                        console.log("recorded conformity measure", rs)                    
                    });
                }
                self.printer.specimenAmendment(assertion, "specimen", "conformity",i);                            
            } else if(assertion.dr.drt == "dataset" && assertion.dimension == "Conformity") {
                    self.printer.specimenMeasure(assertion, "specimen", "conformity");
                    self.recordAssertion(self.specimenDatasetHash, "CONFORMITY_SPECIMEN_DATASET", "measure", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, assertion.dimension, null, null, function(rs){
                        console.log("recorded conformity measure", rs)                    
                    });
            } else if(assertion.dr.drt == "dataset" && assertion.criterion == "Spreadsheet is conform") {
                self.printer.specimenValidation(assertion, "specimen", "conformity");                
                self.specimenProcess++;								
                if(self.specimenProcess == 5) {
                    M.toast({html: 'DQ report is ready: Specimen'});
                    $("#updateReportSpecimen").hide();
                }
                
                self.recordAssertion(self.specimenDatasetHash, "IS_CONFORM_SPECIMEN_DATASET", "validation", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, null, assertion.criterion, null, function(rs){
                    console.log("recorded conformity criterion", rs)                    
                });
            }
        });
    });
    self.specimen.completeness(id, lang, function(){
        self.specimen.report.completeness.forEach(function(assertion, i){											
            if(assertion && assertion.dr.drt == "record" && assertion.type == "amendment"){                
                if(!self.createdRecords[assertion.hash]) {                    
                    self.createdRecords[assertion.hash] = true;
                    self.recordDataResource(assertion.hash, "single", "row: "+assertion.dr.row, {row:assertion.dr.row, datasetHash: self.specimenDatasetHash}, function(rs){
                        self.recordAssertion(assertion.hash, "COMPLETE_SPECIMEN_RECORD_"+assertion.ie, "amendment", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, assertion.dimension, null, assertion.enhancement, function(rs){
                            // console.log("recorded conformity criterion", rs)                    
                        });
                    });
                } else {
                    self.recordAssertion(assertion.hash, "COMPLETE_SPECIMEN_RECORD_"+assertion.ie, "amendment", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, assertion.dimension, null, assertion.enhancement, function(rs){
                        // console.log("recorded conformity criterion", rs)                    
                    });
                }
                self.printer.specimenAmendment(assertion, "specimen", "completeness",i);                            
        } else if(assertion.dr.drt == "dataset" && assertion.dimension == "Completeness") {
                self.printer.specimenMeasure(assertion, "specimen", "completeness");
                self.recordAssertion(self.specimenDatasetHash, "COMPLETENESS_SPECIMEN_DATASET", "measure", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, assertion.dimension, null, null, function(rs){
                    console.log("recorded completeness measure")                    
                });
            } else if(assertion.dr.drt == "dataset" && assertion.criterion == "Spreadsheet is complete") {								
                self.printer.specimenValidation(assertion, "specimen", "completeness");
                self.specimenProcess++;								
                if(self.specimenProcess == 5) {
                    M.toast({html: 'DQ report is ready: Specimen'});
                    $("#updateReportSpecimen").hide();
                }
                
                
                self.recordAssertion(self.specimenDatasetHash, "IS_COMPLETE_SPECIMEN_DATASET", "validation", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, null, assertion.criterion, null, function(rs){
                    console.log("recorded complete criterion")                    
                });
            }
        });
    });   
    self.specimen.uniqueness(id, lang, function(){
        self.specimen.report.uniqueness.forEach(function(assertion, i){											
            if(assertion && assertion.dr.drt == "record" && assertion.type == "amendment"){                
                if(!self.createdRecords[assertion.hash]) {                    
                    self.createdRecords[assertion.hash] = true;
                    self.recordDataResource(assertion.hash, "single", "row: "+assertion.dr.row, {row:assertion.dr.row, datasetHash: self.specimenDatasetHash}, function(rs){
                        self.recordAssertion(assertion.hash, "UNIQUE_SPECIMEN_RECORD_"+assertion.ie, "amendment", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, assertion.dimension, null, assertion.enhancement, function(rs){
                            console.log("recorded uniqueness criterion", rs)                    
                        });
                    });
                } else {
                    self.recordAssertion(assertion.hash, "UNIQUE_SPECIMEN_RECORD_"+assertion.ie, "amendment", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, assertion.dimension, null, assertion.enhancement, function(rs){
                        console.log("recorded uniqueness criterion", rs)                    
                    });
                }
                self.printer.specimenAmendment(assertion, "specimen", "uniqueness",i);                            
        } else if(assertion.dr.drt == "dataset" && assertion.dimension == "Uniqueness") {
                self.printer.specimenMeasure(assertion, "specimen", "uniqueness");
                self.recordAssertion(self.specimenDatasetHash, "UNIQUENESS_SPECIMEN_DATASET", "measure", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, assertion.dimension, null, null, function(rs){
                    console.log("recorded uniqueness measure")                    
                });
            } else if(assertion.dr.drt == "dataset" && assertion.criterion == "Spreadsheet has unique records") {								
                self.printer.specimenValidation(assertion, "specimen", "uniqueness");
                self.specimenProcess++;								
                if(self.specimenProcess == 5) {
                    M.toast({html: 'DQ report is ready: Specimen'});
                    $("#updateReportSpecimen").hide();
                }
                
                
                self.recordAssertion(self.specimenDatasetHash, "IS_UNIQUE_SPECIMEN_DATASET", "validation", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, null, assertion.criterion, null, function(rs){
                    console.log("recorded unique criterion")                    
                });
            }
        });
    }); 
    self.specimen.consistency(id, lang, function(){
        self.specimen.report.consistency.forEach(function(assertion, i){											
            if(assertion && assertion.dr.drt == "record" && assertion.type == "amendment"){                
                if(!self.createdRecords[assertion.hash]) {                    
                    self.createdRecords[assertion.hash] = true;
                    self.recordDataResource(assertion.hash, "single", "row: "+assertion.dr.row, {row:assertion.dr.row, datasetHash: self.specimenDatasetHash}, function(rs){
                        self.recordAssertion(assertion.hash, "CONSISTENT_SPECIMEN_RECORD_"+assertion.ie, "amendment", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, assertion.dimension, null, assertion.enhancement, function(rs){
                            console.log("recorded consistency criterion", rs)                    
                        });
                    });
                } else {
                    self.recordAssertion(assertion.hash, "CONSISTENT_SPECIMEN_RECORD_"+assertion.ie, "amendment", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, assertion.dimension, null, assertion.enhancement, function(rs){
                        console.log("recorded consistency criterion", rs)                    
                    });
                }
                self.printer.specimenAmendment(assertion, "specimen", "consistency",i);                            
        } else if(assertion.dr.drt == "dataset" && assertion.dimension == "Consistency") {
                console.log(assertion)
                self.printer.specimenMeasure(assertion, "specimen", "consistency");
                self.recordAssertion(self.specimenDatasetHash, "CONSISTENCY_SPECIMEN_DATASET", "measure", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, assertion.dimension, null, null, function(rs){
                    console.log("recorded consistency measure")                    
                });
            } else if(assertion.dr.drt == "dataset" && assertion.criterion == "Spreadsheet has consistent records") {								
                self.printer.specimenValidation(assertion, "specimen", "consistency");
                self.specimenProcess++;								
                if(self.specimenProcess == 5) {
                    M.toast({html: 'DQ report is ready: Specimen'});
                    $("#updateReportSpecimen").hide();
                }
                
                
                self.recordAssertion(self.specimenDatasetHash, "IS_CONSISTENT_SPECIMEN_DATASET", "validation", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, null, assertion.criterion, null, function(rs){
                    console.log("recorded consistent criterion")                    
                });
            }
        });
    }); 

    $.get("/api/Specimens/getImagesValues?id="+id+"&language="+lang, function(rs) {						
        self.specimen.accessibility(rs, id, function individualCb(i, assertion){
            if($("#accessibility-specimen").html() == "loading..." || Number($("#accessibility-specimen").html().split(" ")[0])<i)
                $("#accessibility-specimen").html(`${i} records assessed`);								
            if(assertion && assertion.dr.drt == "record" && assertion.type == "amendment"){
                    if(!self.createdRecords[assertion.hash]) {                    
                        self.createdRecords[assertion.hash] = true;
                        self.recordDataResource(assertion.hash, "single", "row: "+assertion.dr.row, {row:assertion.dr.row, datasetHash: self.specimenDatasetHash}, function(rs){
                            self.recordAssertion(assertion.hash, "ACCESSIBLE_SPECIMEN_RECORD_"+assertion.ie, "amendment", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, assertion.dimension, null, assertion.enhancement, function(rs){
                                // console.log("recorded conformity criterion", rs)                    
                            });
                        });
                    } else {
                        self.recordAssertion(assertion.hash, "ACCESSIBLE_SPECIMEN_RECORD_"+assertion.ie, "amendment", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, assertion.dimension, null, assertion.enhancement, function(rs){
                            // console.log("recorded conformity criterion", rs)                    
                        });
                    }
                    self.printer.specimenAmendment(assertion, "specimen", "accessibility",i); 
                }
        }, function finalCb(){
            self.specimen.report.accessibility.forEach(function(assertion, i){											
                if(assertion.dr.drt == "dataset" && assertion.dimension == "Accessibility") {                                       
                    self.printer.specimenMeasure(assertion, "specimen", "accessibility");                
                    self.recordAssertion(self.specimenDatasetHash, "ACCESSIBILITY_SPECIMEN_DATASET", "measure", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, assertion.dimension, null, null, function(rs){
                        console.log("recorded access measure")                    
                    });

                } else if(assertion.dr.drt == "dataset" && assertion.criterion == "All of the images must be publicly available in Internet") {								                    
                    self.printer.specimenValidation(assertion, "specimen", "accessibility");
                    self.specimenProcess++;								
                if(self.specimenProcess == 5) {
                    M.toast({html: 'DQ report is ready: Specimen'});
                    $("#updateReportSpecimen").hide();
                }
                
                    
                    self.recordAssertion(self.specimenDatasetHash, "IS_ACCESSIBLE_SPECIMEN_DATASET", "validation", assertion.dr, assertion.specification, assertion.mechanism, assertion.ie, assertion.response, null, assertion.criterion, null, function(rs){
                        console.log("recorded access criterion")                    
                    });
                }
            });
        });	
    });	
}