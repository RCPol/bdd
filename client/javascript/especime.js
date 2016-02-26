function readSpecimen(id, cb){
  $.getJSON("/api/Specimens/"+id, function(specimen){
    specimenDb = specimen;
    var name = specimenDb["dwc:scientificName"].value + " " + specimenDb["dwc:scientificNameAuthorship"].value;
    document.title = "RCPol - "+name;

    $("#nome").append(name);

    //dados da palinoteca
    var codigo = "";
    specimenDb["dwc:collectionCode"].forEach(function(c_code){
      if (c_code.label == "Sigla da Palinoteca")
        codigo = c_code.value;
    });
    $.getJSON("/api/Specimens/getCollection?code="+codigo, function(res){
      var palinoteca = res.response[0];
      $("#laboratorio").append(palinoteca["rcpol:laboratory"].value);
      $("#instituicao").append(palinoteca["rcpol:institutionName"].value);
      $("#codigoDaInstituicao").append(palinoteca["dwc:institutionCode"].value);
      $("#colecao").append(codigo);
      $("#responsavel").append(palinoteca["rcpol:responsable"].value);
      $("#endereco").append(palinoteca["rcpol:address"].value);
      $("#telefone").append(palinoteca["rcpol:telephone"].value);
      $("#email").append(palinoteca["rcpol:email"].value);
      $("#homepage").append(palinoteca["rcpol:homepage"].value);
      $("#homepage_link").attr("href", palinoteca["rcpol:homepage"].value);
      $("#link_palinoteca").attr("href", "/profile/palinoteca/"+palinoteca["id"]);
    });

    //TODO: link especie

    $("#coletor").append(specimenDb['dwc:recordedBy'].value); //TODO: recorDedBy

    //TODO: numero do coletor
    //TODO: nome do herbario

    $("#numeroDeRegistroNoHerbario").append(specimenDb["dwc:catalogNumber"].value);

    //TODO: numero do registro na palinoteca

    $("#pais").append(specimenDb['dwc:country'].value);
    $("#estado").append(specimenDb['dwc:stateProvince'].value); //TODO: sigla
    $("#municipio").append(specimenDb['dwc:municipality'].value);
    $("#bioma").append(specimenDb['rcpol:vegetalFormationType'].value); //TODO: vegetalFormationType = bioma?

    //TODO: informações adicionais

    // Galeria de Imagens
    specimenDb['dwc:associatedMedia'].forEach(function(media_object){
      $("#galeria_fotos").append("<img src=" + media_object.url + ">");
    });

    cb();
  });
}
