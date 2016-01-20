$(document).ready(function(){
  //$.getJSON("/api/Species/89ce2d9a768ac2605cc1d82df590dd54", {}, function(data){
  $.getJSON("/api/Species/16e63286e2bc9d76a5ea2718a5109a43", {}, function(data){
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
      $("#sindromeDePolinizacao").append(data["rcpol:pollinationSyndrome"].value);
      $("#unidadeDeAtracao").append(data["rcpol:attractionUnit"].value);
      $("#sexualidade").append(data["rcpol:flowerSexuality"].value);
      $("#tamanhoDaFlor").append(data["rcpol:flowerSize"].value);
      $("#forma").append(data["rcpol:flowerForm"].value);
      $("#simetria").append(data["rcpol:flowerSymmetry"].value);
      $("#corDaFlor").append(data["rcpol:flowerColor"].value);
      $("#antese").append(data["rcpol:flowerOpeningTime"].value);
      $("#deiscenciaDaAntera").append(data["rcpol:antherDehiscence"].value);
      $("#odor").append(data["rcpol:odorPresence"].value);
      $("#tipoDeRecursoFloral").append(data["rcpol:mainFloralResourceCollecteByVisitors"].value);//TODO: collecteD

      //TODO: imagens da planta

      //TODO: Descrição Polínica

    });
  });
});
