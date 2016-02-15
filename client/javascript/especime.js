function readSpecimen(id, cb){
  $.getJSON("/api/Specimens/"+id, function(specimen){
    specimenDb = specimen;
    var name = specimenDb["dwc:scientificName"].value + " " + specimenDb["dwc:scientificNameAuthorship"].value;
    document.title = "RCPol - "+name;

    $("#nome").append(name);

    //TODO: informações da palinoteca
    //TODO: links para ficha da palinoteca e ficha da especie

    $("#coletor").append(specimenDb['dwc:recoredBy'].value); //TODO: recorDedBy

    //TODO: numero do coletor
    //TODO: nome do herbario

    $("#numeroDeRegistroNoHerbario").append(specimenDb["dwc:catalogNumber"].value);

    //TODO: numero do registro na palinoteca

    $("#pais").append(specimenDb['dwc:country'].value);
    $("#estado").append(specimenDb['dwc:stateProvince'].value); //TODO: sigla
    $("#municipio").append(specimenDb['dwc:municipality'].value);
    $("#bioma").append(specimenDb['rcpol:vegetalFormationType'].value); //TODO: vegetalFormationType = bioma?

    cb();
    //TODO: informações adicionais
  });
}
