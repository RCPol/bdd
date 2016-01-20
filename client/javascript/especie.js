$(document).ready(function(){
  $.getJSON("/api/Species/03d2e1d25d805f51bd65ea02012e14a7", {}, function(data){
    $.getJSON("/api/Specimens/" + data.specimens[0].id, {}, function(specimen){
      // titulo
      document.title = specimen["dwc:scientificName"].value + " " + specimen["dwc:scientificNameAuthorship"].value;

      // nome da espécie
      $("#nomeDaEspecie").append(document.title);

      //TODO: iterar nas propriedades de "data"
      $("#habito").append(data["rcpol:habit"].value); //TODO: do for each state
      $("#origem").append(specimen["dwc:establishmentMean"].value);
      $("#periodoDeFloracao").append(specimen["rcpol:floweringPeriod"].value); //TODO

      // caracteristicas da flor

    });
  });
});
