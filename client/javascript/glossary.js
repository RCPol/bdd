function writeSchema(schema, referenceLabel){  
  lang = localStorage.language?localStorage.language:"pt-BR";
  var id= schema.id;
  if (id.split(":")[2] == "State" || id.split(":")[2] == "CategoricalDescriptor" || id.split(":")[2] == "NumericalDescriptor" || id.split(":")[2] == "Category"){
    var html = $('<div class="glossario-s" id="'+id.split(":").join("-")+'"><a target="_blank"><img id="image"></img></a> <h2></h2><h3></h3><p id="description"></p><div id="references" style="color:grey; font-size: 80%;"></div><div id="credits" style="color:grey; font-size: 80%;"></div></div>');    
    $("#content").append(html);    
    $("#" + id.split(":").join("-") +" > a > #image ").hide();
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

    $("#" + id.split(":").join("-")).find("h2").html(name);

    if ((data["class"] == "CategoricalDescriptor" || data["class"] == "NumericalDescriptor") && data.state)
      $("#" + id.split(":").join("-")).find("h3").html(data.category);
    else if (data["class"] == "State")
      $("#" + id.split(":").join("-")).find("h3").html(data.category + ": " + data.field);
    $("#" + id.split(":").join("-") + " > #description").html(description);

    if (data.images && data.images.length > 0){
      $("#" + id.split(":").join("-") + " > a").find('#image').attr("src", data.images[0].resized);
      $("#" + id.split(":").join("-") + " > a").attr("href", data.images[0].original);
      $("#" + id.split(":").join("-") +" > a").find('#image').show();
    }
    // REFERENCES
    if(data.references && data.references.length>0){
      var content = $('<div class="popsreft"></div>');
      // var refLabel = $('<div class="popsreft">'+referenceLabel+':</div>');      
      // $("#" + id.split(":").join("-")).find('#references').append(referenceLabel+':');
      content.append(referenceLabel+':');
      data.references.forEach(function(ref) {        
        content.append('<p><span class="popsrefp">'+ref+'</span></p>');        
      });                  
      var iconRef = $('<img src="/img/ref.png" title="teste" class="popsref">');          
      iconRef.tooltip({
        content: function() {
          return content;
        }
      });
      $("#" + id.split(":").join("-")).find('#references').append(iconRef);
    }    
    // CREDITS
    if(data.credits && data.credits.length>0){
      var contentCred = $('<div class="popsreft"></div>');
      // var credLabel = $('<div class="popsreft">Credits:</div>');      
      // $("#" + id.split(":").join("-")).find('#references').append(referenceLabel+':');
      contentCred.append(creditLabel+':');
      data.credits.forEach(function(credit) {        
        contentCred.append('<p><span class="popsrefp">'+credit+'</span></p>');        
      });                  
      var iconCred = $('<img src="/img/copyr.png" title="teste" class="popsref">');          
      iconCred.tooltip({
        content: function() {
          return contentCred;
        }
      });
      $("#" + id.split(":").join("-")).find('#credits').append(iconCred);
    }  
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
