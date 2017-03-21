function readSpecimens(lang,base,institutionCode, collectionCode){
    //lista de especimes
    var scope = base+":"+lang;
    var getChunk = function(skip) {
      var url = "/api/Specimens?filter[fields][id]=true&"
                    +"filter[fields]["+scope+":dwc:RecordLevel:catalogNumber]=true&"
                    +"filter[fields]["+scope+":dwc:Taxon:scientificName]=true&"
                    +"filter[fields]["+scope+":dwc:Taxon:scientificNameAuthorship]=true&"
                    +"filter[fields]["+scope+":dwc:Occurrence:recordedBy]=true&"
                    +"filter[fields]["+scope+":dwc:Location:municipality]=true&"
                    +"filter[fields]["+scope+":dwc:Location:stateProvince]=true"
                    +"&filter[where][and][0]["+scope+":dwc:RecordLevel:institutionCode.value]="+institutionCode
                    +"&filter[where][and][1]["+scope+":dwc:RecordLevel:collectionCode.value]="+collectionCode
                    +"&filter[limit]="+chunkSize
                    +"&filter[skip]="+skip;
      $.getJSON(url, function(especimes){        
        if(especimes.length>0) getChunk(skip+chunkSize)
        especimes.forEach(function(especime, id){
          w2ui['grid'].add({
            recid: especime[scope+":dwc:RecordLevel:catalogNumber"].value, 
            species: especime[scope+":dwc:Taxon:scientificName"].value + " " + especime[scope+":dwc:Taxon:scientificNameAuthorship"].value, 
            // tipo: especime[scope+":dwc:Occurrence:recordedBy"].value, 
            cidade: especime[scope+":dwc:Location:municipality"].value + " - " + especime[scope+":dwc:Location:stateProvince"].value, 
            specimen_id: especime.id});
        });
      });
    }
    var chunkSize = 10;
    getChunk(0);
}
