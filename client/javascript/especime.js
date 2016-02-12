function readSpecimen(id, map){
  $.getJSON("/api/Specimens/"+id, function(specimen){
    var name = specimen["dwc:scientificName"].value + " " + specimen["dwc:scientificNameAuthorship"].value;
    document.title = name;

    $("#nome").append(name);

    //TODO: informações da palinoteca
    //TODO: links para ficha da palinoteca e ficha da especie

    $("#coletor").append(specimen['dwc:recoredBy'].value); //TODO: recorDedBy

    //TODO: numero do coletor
    //TODO: nome do herbario

    $("#numeroDeRegistroNoHerbario").append(specimen["dwc:catalogNumber"].value);

    //TODO: numero do registro na palinoteca

    $("#pais").append(specimen['dwc:country'].value);
    $("#estado").append(specimen['dwc:stateProvince'].value); //TODO: sigla
    $("#municipio").append(specimen['dwc:municipality'].value);
    $("#bioma").append(specimen['rcpol:vegetalFormationType'].value); //TODO: vegetalFormationType = bioma?

    var p = [specimen["dwc:decimalLatitude"].value, specimen["dwc:decimalLongitude"].value];
    $("#latitude").append(p[0]);
    $("#longitude").append(p[1]);
    var marker = L.marker(p, {opacity:0.9}).addTo(map);
    map.setView(p, 17);

    //TODO: informações adicionais

  });
}
