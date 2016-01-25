$(document).ready(function(){
  $.post("/api/Identification/identify", {param: []}, function(data){

    /* estados */
    //TODO: Agregador de descritores
    console.log(data.response.eligibleStates);
    data.response.eligibleStates.forEach(function(descritor){
      $.getJSON("/api/Species/findOnw")
    });

    /* itens */
    data.response.eligibleItems.forEach(function(item){
      $("#especiesElegiveis").append("<div class='especies' id = " + item.id + "></div>");
      $("#" + item.id).append("<img src='img/lspm.jpg''>"); //TODO
      $("#" + item.id).append("<div class='nsp'></div>");

      $.getJSON("/api/Species/" + item.id, {}, function(especie){
        $.getJSON("/api/Specimens/" + especie.specimens[0].id, {}, function(especime){
          var nome = especime["dwc:scientificName"].value;
          var autor = especime["dwc:scientificNameAuthorship"].value;
          var familia = especime["dwc:family"].value;
          console.log(nome, autor, familia);
          $("#" + item.id + " > .nsp").append("<p class='nomesp'><i>" + nome + " </i>" + autor + "</p>");
          $("#" + item.id + " > .nsp").append("<p class='famisp'>" + familia + "</p>");
        });
      });
    });

  });
});
