function readPalinoteca(id){
  $.getJSON("/api/Collections/"+id, function(data){
    var name = data["rcpol:collectionName"].value + " da " + data["rcpol:institutionName"].value;
    document.title = "RCPol - " + name;

    console.log(data);

    $("#nomeDaPalinoteca").append(name);
    $("#nomeDaInstituicao").append(data["rcpol:institutionName"].value);
    $("#codigoDaInstituicao").append(data["dwc:institutionCode"].value);
    $("#nomeDoInstituto").append(data["rcpol:instituteName"].value);
    $("#nomeDoDepartamento").append(data["rcpol:departament"].value);
    $("#nomeDoLaboratorio").append(data["rcpol:laboratory"].value);
    $("#palinoteca").append(data["rcpol:collectionName"].value);
    $("#siglaDaPalinoteca").append(data["dwc:collectionCode"].value);
    $("#responsavel").append(data["rcpol:responsable"].value);
    $("#endereco").append(data["rcpol:address"].value);
    $("#telefone").append(data["rcpol:telephone"].value);
    $("#email").append(data["rcpol:email"].value);
    $("#homepage_link").attr("href", data["rcpol:homepage"].value);
    $("#homepage").append(data["rcpol:homepage"].value);
  });
}
