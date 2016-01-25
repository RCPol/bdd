function readSpecies(id){

  $.getJSON("/api/Species/"+id, {}, function(data){
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
};
