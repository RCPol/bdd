function readGlossary(id){
  $.getJSON("/api/Schemas/"+id, function(data){
    console.log(data);
    var name = "Não disponível";
    if(data["rcpol:type"].value=="Descritor"){
      name = data["rcpol:descriptor"].value;
    } else if(data["rcpol:type"].value=="Categoria"){
      name = data["rcpol:category"].value;
    } else if(data["rcpol:type"].value=="Estado"){
      name = data["rcpol:state"].value;
    }
    var description = "Não disponível";
    if(data["rcpol:definition"])
      description = data["rcpol:definition"].value;

    var references = [];
    if(data["rcpol:bibliographicCitation"])
      references = data["rcpol:bibliographicCitation"].references;

    document.title = "RCPol - " + name;

    $("#label").html(name);
    $("#description").html(description);
    if(references.length==0){
      $("#ref_title").hide();
    }else{
      references.forEach(function (item) {
        $("#references").append("<p>"+item+"</p>");
      });
    }
    //lista de especimes
    var url = "/api/Schemas/mainImage?id="+id;
    $.getJSON(url, function(image){
      if (image.response != ""){
        $("#image").attr("src", image.response);
      }else{
        $("#image").hide();
      }
    });
  });
}
