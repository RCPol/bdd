function writeSchema(schema){
  var id= schema.id;
  if (schema["rcpol:type"].value == "Estado"){
    $("article").append('<div class="glossario-m" id="'+id+'"><img id="image"><h2></h2><p id="description"></p><h3 id="ref_title">Refer&ecirc;ncias Bibliogr&aacute;ficas</h3><div class="ref-glossario" id="references"></div></div>');
  } else {
    $("article").append('<div class="glossario-s" id="'+id+'"><img id="image"><h2></h2><p id="description"></p><h3 id="ref_title">Refer&ecirc;ncias Bibliogr&aacute;ficas</h3><div class="ref-glossario" id="references"></div></div>');
  }
  readGlossary(id);
}

function readGlossary(id){
  $.getJSON("/api/Schemas/"+id, function(data){
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

    $("#" + id).find("h2").html(name);
    $("#" + id + " > #description").html(description);
    if(references.length==0){
      $("#" + id + " > #ref_title").hide();
    }else{
      references.forEach(function (item) {
        $("#" + id + " > #references").append("<p>"+item+"</p>");
      });
    }
    //lista de especimes
    var url = "/api/Schemas/mainImage?id="+id;
    $.getJSON(url, function(image){
      if (image.response != ""){
        $("#" + id + " > #image").attr("src", image.response);
      }else{
        $("#" + id +" >  #image").hide();
      }
    });
  });
}

function busca(nothing){
  var key = $("#buscaglossario").val().trim().toLowerCase();
  if (nothing) key = "";
  $("article div").each(function(){
    if ($(this).find("h2").text().toLowerCase().indexOf(key) === -1){
      $(this).fadeOut();
    } else {
      $(this).fadeIn();
    }
  });
}
