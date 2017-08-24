var coordinates = {};
function readSpecimen(id,base,cb){

  var lang = localStorage.language?localStorage.language:"pt-BR";
  $.getJSON("/api/Specimens/"+id, function(data){
    console.log(data);
    coordinates.lat = data[lang+":dwc:Location:decimalLatitude"].value;
    coordinates.lng = data[lang+":dwc:Location:decimalLongitude"].value;
    var name = data[lang+":dwc:Taxon:scientificName"].value + " " + data[lang+":dwc:Taxon:scientificNameAuthorship"].value;
    document.title = "RCPol - "+name;
    Object.keys(data).forEach(function(key) {
      var parsedId = key.split(":");
      var schema = parsedId.length==4?parsedId[1]:"";
      var class_ = parsedId.length==4?parsedId[2]:"";
      var term = parsedId.length==4?parsedId[3]:"";
      var base = schema+"-"+class_+"-"+term;    
    // IMAGES
    if(data[lang+':rcpol:Image:plantImage'] && data[lang+':rcpol:Image:plantImage'].images && data[lang+':rcpol:Image:plantImage'].images.length>0)
      data[lang+":rcpol:Image:plantImage"].images.forEach(function(media){
        $("#foto_planta").append("<img src='" +media.resized+"'/>");
        $("#foto_planta img").attr("style", "max-width:500px; max-height:400px;");
      });
    if(data[lang+':rcpol:Image:flowerImage'] && data[lang+':rcpol:Image:flowerImage'].images && data[lang+':rcpol:Image:flowerImage'].images.length>0)
      data[lang+":rcpol:Image:flowerImage"].images.forEach(function(media){
        $("#foto_planta").append("<img src='" +media.resized+"'/>");
        $("#foto_planta img").attr("style", "max-width:500px; max-height:400px;");
      });
    if(data[lang+':rcpol:Image:pollenImage'] && data[lang+':rcpol:Image:pollenImage'].images && data[lang+':rcpol:Image:pollenImage'].images.length>0)
      data[lang+":rcpol:Image:pollenImage"].images.forEach(function(media){
        $("#foto_polen").append("<img src='" +media.resized+"'/>");
      });
    if(data[lang+':rcpol:Image:allPollenImage'] && data[lang+':rcpol:Image:allPollenImage'].images && data[lang+':rcpol:Image:allPollenImage'].images.length>0)
      data[lang+":rcpol:Image:allPollenImage"].images.forEach(function(media){
        $("#foto_polen").append("<img src='" +media.resized+"'/>");
      });
    $(".fotorama").fotorama();

    var bib = data[lang+":rcpol:Reference:pollenBibliographicCitation"];
    if(bib){
      bib = !(Array.isArray(bib))?[bib]:bib;
      bib.forEach(function(citation){
        citation.references.forEach(function(referencia){
         $("#referencias").append('<p>' + referencia + '</p>');
       });
      });
    }
    var bib = data[lang+":rcpol:Reference:flowerBibliographicCitation"];
    if(bib){
      bib = !(Array.isArray(bib))?[bib]:bib;
      bib.forEach(function(citation){
        citation.references.forEach(function(referencia){
         $("#referencias").append('<p>' + referencia + '</p>');
       });
      });
    }
    var codigo_palinoteca = data[lang+":dwc:RecordLevel:collectionCode"].value;
    var codigo_herbario = data[lang+":dwc:RecordLevel:collectionCodeHerbarium"].value;    

    $.getJSON("/api/Specimens/getCollection?code="+codigo_palinoteca, function(res){
      console.log(res);
      var palinoteca = res.response[0];
      if (palinoteca["rcpol:laboratory"]) $("#laboratorio").append("do " + palinoteca["rcpol:laboratory"].value);
      $("#instituicao").append(palinoteca["rcpol:institutionName"].value);
      $("#codigoDaInstituicao").append(palinoteca["rcpol:institutionName"].value+" (").append(palinoteca["dwc:institutionCode"].value+")");
      $("#colecao").append(palinoteca["rcpol:collectionName"].value+" (").append(codigo_palinoteca+")");
      $("#responsavel").append(palinoteca["rcpol:responsable"].value);
      $("#endereco").append(palinoteca["rcpol:address"].value);
      $("#telefone").append(palinoteca["rcpol:telephone"].value);
      $("#email").append(palinoteca["rcpol:email"].value);
      $("#homepage").append(palinoteca["rcpol:homepage"].value);
      $("#homepage_link").attr("href", palinoteca["rcpol:homepage"].value);
      $("#link_palinoteca").attr("href", "/profile/palinoteca/"+base+"/"+palinoteca["id"]);
      if(palinoteca["rcpol:logotipo"].url)
        $("#logo").attr("src", palinoteca["rcpol:logotipo"].url);
      // console.log(palinoteca["rcpol:logotipo"].url);
    });
    
  });
    cb(); 
  });
}
