function readPalinoteca(id){
  $.getJSON("/api/Collections/"+id, function(data){
    var name = data["rcpol:collectionName"].value + " da " + data["rcpol:institutionName"].value;
    document.title = "RCPol - " + name;

    $("#nomeDaPalinoteca").append(name);
    $("#nomeDaInstituicao").append(data["rcpol:institutionName"].value);
    $("#codigoDaInstituicao").append(data["dwc:institutionCode"].value);
    if(data["rcpol:instituteName"])
      $("#nomeDoInstituto").append(data["rcpol:instituteName"].value);
    $("#nomeDoDepartamento").append(data["rcpol:departament"].value);
    if (data["rcpol:laboratory"]) $("#nomeDoLaboratorio").append(data["rcpol:laboratory"].value);
    $("#palinoteca").append(data["rcpol:collectionName"].value);
    $("#siglaDaPalinoteca").append(data["dwc:collectionCode"].value);
    $("#responsavel").append(data["rcpol:responsable"].value);
    $("#endereco").append(data["rcpol:address"].value);
    $("#telefone").append(data["rcpol:telephone"].value);
    $("#email").append(data["rcpol:email"].value);
    $("#homepage_link").attr("href", data["rcpol:homepage"].value);
    $("#homepage").append(data["rcpol:homepage"].value);
    $("#logo").attr("src", data["rcpol:logotipo"].url);

    //lista de especimes
    var url = "/api/Specimens?filter[fields][id]=true&filter[fields][dwc:scientificName]=true&filter[fields][dwc:scientificNameAuthorship]=true&filter[fields][dwc:recordedBy]=true&filter[fields][dwc:municipality]=true&filter[fields][dwc:stateProvince]=true&filter[where][and][0][dwc:institutionCode.value]="+data["dwc:institutionCode"].value+"&filter[where][and][1][dwc:collectionCode.value]="+data["dwc:collectionCode"].value;
    $.getJSON(url, function(especimes){
      especimes.forEach(function(especime, id){
        w2ui['grid'].add({recid: id, species: especime["dwc:scientificName"].value + " " + especime["dwc:scientificNameAuthorship"].value, palinoteca: name, tipo: especime["dwc:recordedBy"].value, cidade: especime["dwc:municipality"].value + " - " + especime["dwc:stateProvince"].value, specimen_id: especime.id});
      });
    });
  });
}
