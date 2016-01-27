$(document).ready(function(){
  $.post("/api/Identification/identify", {param: []}, function(data){
    $.getJSON("/api/Species/", data.response.eligibleItems, function(especies){

      /* especies */
      especies.forEach(function(especie){
        $("#especiesElegiveis").append("<div class='especies' id = " + especie.id + "></div>");
        $("#" + especie.id).append("<img src='img/lspm.jpg'>"); //TODO
        $("#" + especie.id).append("<div class='nsp'></div>");

        $.getJSON("/api/Specimens/" + especie.specimens[0].id, {}, function(especime){
          var nome = especime['dwc:scientificName'].value;
          var autor = especime['dwc:scientificNameAuthorship'].value;
          var familia = especime['dwc:family'].value;

          $("#" + especie.id + " > .nsp").append("<a href='/profile/species/'" + especie.id + "'><p class='nomesp'><i>" + nome + " </i>" + autor + "</p></a>");
          $("#" + especie.id + " > .nsp").append("<p class='famisp'>" + familia + "</p>");
        });
      });

      /* estados */
      //TODO: Agregador de descritores
      data.response.eligibleStates.forEach(function(descritor){
        //TODO: usar ids para consultar Schema
        $(".descritor").append("<h3>" + descritor.descriptor_name + "</h3>");
        $(".descritor").append("<ul class='valoresi'></ul>");

        descritor.states.forEach(function(estado){
          $(".descritor ul").last().append("<li class='vimagens'><p><!-- Imagem representante do valor fixo --><img src='/img/lspm.jpg' class='vimg'><!-- Link e icone para o glossário --><a href='#' target='_blank'><img src='/img/glo.png' class='vglos'></a>" + estado.state + " - " + estado.count + "</p></li>");
         });

      });
      createAccordion();
    });
  });

});
