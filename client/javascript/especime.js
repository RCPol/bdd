function readSpecimen(id, cb){
  $.getJSON("/api/Specimens/"+id, function(specimen){
    specimenDb = specimen;
    var name = specimenDb["dwc:scientificName"].value + " " + specimenDb["dwc:scientificNameAuthorship"].value;
    document.title = "RCPol - "+name;

    $("#nome").append(name);

    //dados da palinoteca
    var codigo_palinoteca;
    var codigo_herbario;
    var collectionCode = specimenDb["dwc:collectionCode"];
    if (!(Array.isArray(collectionCode))) collectionCode = [collectionCode]; // se houver apenas um valor
    collectionCode.forEach(function(c_code){
      if (c_code.label == "Sigla da Palinoteca")
        codigo_palinoteca = c_code.value;
      else if (c_code.label == "Sigla do Herbário")
        codigo_herbario = c_code.value;
    });

    $.getJSON("/api/Specimens/getCollection?code="+codigo_palinoteca, function(res){
      var palinoteca = res.response[0];
      $("#laboratorio").append(palinoteca["rcpol:laboratory"].value);
      $("#instituicao").append(palinoteca["rcpol:institutionName"].value);
      $("#codigoDaInstituicao").append(palinoteca["dwc:institutionCode"].value);
      $("#colecao").append(codigo_palinoteca);
      $("#responsavel").append(palinoteca["rcpol:responsable"].value);
      $("#endereco").append(palinoteca["rcpol:address"].value);
      $("#telefone").append(palinoteca["rcpol:telephone"].value);
      $("#email").append(palinoteca["rcpol:email"].value);
      $("#homepage").append(palinoteca["rcpol:homepage"].value);
      $("#homepage_link").attr("href", palinoteca["rcpol:homepage"].value);
      $("#link_palinoteca").attr("href", "/profile/palinoteca/"+palinoteca["id"]);
    });

    //TODO: link especie

    $("#coletor").append(specimenDb['dwc:recordedBy'].value);

    $("#herbario").append(codigo_herbario);

    var num_palinoteca, num_herbario;
    var catalogNumber = specimenDb['dwc:catalogNumber'];
    if (!(Array.isArray(catalogNumber))) catalogNumber = [catalogNumber]; // se houver apenas um valor
    catalogNumber.forEach(function(c_number){
      if (c_number.label == "Número de Catálogo da Palinoteca")
        num_palinoteca = c_number.value;
      else if (c_number.label == "Número de Catálogo do Herbário")
        num_herbario = c_number.value;
    });

    $("#numeroDeRegistroNoHerbario").append(num_herbario);
    $("#numeroDeRegistroNaPalinoteca").append(num_palinoteca);

    $("#pais").append(specimenDb['dwc:country'].value);
    $("#estado").append(specimenDb['dwc:stateProvince'].value);
    $("#municipio").append(specimenDb['dwc:municipality'].value);
    $("#bioma").append(specimenDb['rcpol:vegetalFormationType'].value); //TODO: vegetalFormationType = bioma?

    //TODO: informações adicionais

    // Galeria de Imagens
    var associatedMedia = specimenDb['dwc:associatedMedia'];
    if (!(Array.isArray(associatedMedia))) associatedMedia = [associatedMedia];
    specimenDb['dwc:associatedMedia'].forEach(function(media_object){
      $("#galeria_fotos").append("<img src=" + media_object.url + ">");
    });

    cb();
  });
}
