function readSpecimens(lang,institutionCode, collectionCode){
    //lista de especimes
    var getChunk = function(skip) {
      var url = "/api/Specimens?filter[fields][id]=true&"
                    +"filter[fields]["+lang+":dwc:Taxon:scientificName]=true&"
                    +"filter[fields]["+lang+":dwc:Taxon:scientificNameAuthorship]=true&"
                    +"filter[fields]["+lang+":dwc:Occurrence:recordedBy]=true&"
                    +"filter[fields]["+lang+":dwc:Location:municipality]=true&"
                    +"filter[fields]["+lang+":dwc:Location:stateProvince]=true"
                    +"&filter[where][and][0]["+lang+":dwc:RecordLevel:institutionCode.value]="+institutionCode
                    +"&filter[where][and][1]["+lang+":dwc:RecordLevel:collectionCode.value]="+collectionCode
                    +"&filter[limit]="+chunkSize
                    +"&filter[skip]="+skip;
      $.getJSON(url, function(especimes){        
        if(especimes.length>0) getChunk(skip+chunkSize)
        especimes.forEach(function(especime, id){
          w2ui['grid'].add({recid: id, species: especime[lang+":dwc:Taxon:scientificName"].value + " " + especime[lang+":dwc:Taxon:scientificNameAuthorship"].value, tipo: especime[lang+":dwc:Occurrence:recordedBy"].value, cidade: especime[lang+":dwc:Location:municipality"].value + " - " + especime[lang+":dwc:Location:stateProvince"].value, specimen_id: especime.id});
        });
      });
    }
    var chunkSize = 10;
    getChunk(0);
}
