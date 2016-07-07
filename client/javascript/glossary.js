var lang = "pt-BR";
function writeSchema(schema){
  lang = localStorage.language?localStorage.language:"pt-BR";
  var id= schema.id;
  if (id.split(":")[2] == "State" || id.split(":")[2] == "CategoricalDescriptor" || id.split(":")[2] == "NumericalDescriptor" || id.split(":")[2] == "Category"){
    $("article").append('<div class="glossario-s" id="'+id.split(":").join("-")+'"><img id="image"><h2></h2><h3></h3><p id="description"></p><div class="ref-glossario" id="references"></div></div>');
    // $("article").append('<div class="glossario-s" id="'+id+'"><img id="image"><h2></h2><h3></h3><p id="description"></p><h3 id="ref_title">Refer&ecirc;ncias Bibliogr&aacute;ficas</h3><div class="ref-glossario" id="references"></div></div>');
  // } else {
    // $("article").append('<div class="glossario-s" id="'+id+'"><img id="image"><h2></h2><h3></h3><p id="description"></p><h3 id="ref_title">Refer&ecirc;ncias Bibliogr&aacute;ficas</h3><div class="ref-glossario" id="references"></div></div>');
    readGlossary(id);
  }
}

function readGlossary(id){
  $.getJSON("/api/Schemas/"+id, function(data){
    var name = "Não disponível";
    if(data["class"]=="CategoricalDescriptor" || data["class"]=="NumericalDescriptor"){
      name = data.field;
    } else if(data["class"]=="Category"){
      name = data.category;
    } else if(data["class"]=="State"){
      name = data.state;
    }
    var description = "Não disponível";
    if(data.definition)
      description = data.definition;

    // var references = data.references;
    // if(data["rcpol:bibliographicCitation"])
      // references = data["rcpol:bibliographicCitation"].references;

    $("#" + id.split(":").join("-")).find("h2").html(name);
    if ((data["class"] == "CategoricalDescriptor" || data["class"] == "NumericalDescriptor") && data.state)
      $("#" + id.split(":").join("-")).find("h3").html(data.category + ": " + data.field);
    else if (data["class"] == "CategoricalDescriptor" || data["class"] == "NumericalDescriptor")
      $("#" + id.split(":").join("-")).find("h3").html(data.category);
    $("#" + id.split(":").join("-") + " > #description").html(description);

    // if(references.length==0){
    //   $("#" + id.split(":").join("-") + " > #ref_title").hide();
    // }else{
    //   references.forEach(function (item) {
    //     $("#" + id.split(":").join("-") + " > #references").append("<p>"+item+"</p>");
    //   });
    // }

  //   //lista de especimes
    var url = "/api/Schemas/mainImage?id="+id;
    $.getJSON(url, function(image){
      if (image.response != ""){
        $("#" + id.split(":").join("-") + " > #image").attr("src", image.response);
      }else{
        $("#" + id.split(":").join("-") +" >  #image").hide();
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
