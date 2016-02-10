function readSpecies(id, map){

  $.getJSON("/api/Species/"+id, function(data){
    // titulo
    var name = data["dwc:scientificName"].value + " " + data["dwc:scientificNameAuthorship"].value;
    document.title = name;

    // nome da espécie
    $("#nomeDaEspecie").append(document.title);

    escreverEstados("#habito", data["rcpol:habit"].states);

    $("#origem").append(data["dwc:establishmentMean"].value); //TODO: pular se nao tiver a informação

    $("#periodoDeFloracao").append(data["rcpol:floweringPeriod"].months.join(', '));

    // caracteristicas da flor
    escreverEstados("#sindromeDePolinizacao", data["rcpol:pollinationSyndrome"].states);
    escreverEstados("#unidadeDeAtracao", data["rcpol:attractionUnit"].states);
    escreverEstados("#sexualidade", data["rcpol:flowerSexuality"].states);
    escreverEstados("#tamanhoDaFlor", data["rcpol:flowerSize"].states);
    escreverEstados("#forma", data["rcpol:flowerForm"].states);
    escreverEstados("#simetria", data["rcpol:flowerSymmetry"].states);
    escreverEstados("#corDaFlor", data["rcpol:flowerColor"].states);
    escreverEstados("#antese", data["rcpol:flowerOpeningTime"].states);
    escreverEstados("#deiscenciaDaAntera", data["rcpol:antherDehiscence"].states);
    escreverEstados("#odor", data["rcpol:odorPresence"].states);
    escreverEstados("#tipoDeRecursoFloral", data["rcpol:mainFloralResourceCollecteByVisitors"].states); //TODO collecteD

    //TODO: imagens da planta

    // Descrição Polínica
    escreverEstados("#unidadeDeDispersaoDoPolen", data["rcpol:pollenDispersalUnit"].states);
    //$("#tamanhoDoPolen").append(data["rcpol:pollenDiameter"].value); //TODO

    var p = data["rcpol:polarAxis"];
    $("#polarAxis").append(p.mean + "±" + p.sd + "(" + p.min + "-" + p.max + ")" );

    var e = data["rcpol:equatorialAxis"];
    $("#equatorialAxis").append(e.mean + "±" + e.sd + "(" + e.min + "-" + e.max + ")" );

    escreverEstados("#simetriaDoPolen", data["rcpol:pollenSymmetry"].states);
    escreverEstados("#polaridadeDoPolen", data["rcpol:pollenPolarity"].states);
    escreverEstados("#ambitoDoPolen", data["rcpol:pollenAmbit"].states);
    escreverEstados("#formaDoPolen", data["rcpol:pollenShape"].states);

    var p_e = data["rcpol:pollenShapePE"];
    $("#formaDoPolenPE").append(p_e.mean + "±" + p_e.sd + "(" + p_e.min + "-" + p_e.max + ")" );

    escreverEstados("#tipoDeAberturaDoPolen", data["rcpol:pollenAperture"].states); //letra maiuscula
    // primeira letra maiuscula após o ponto
    $("#tipoDeAberturaDoPolen").css('textTransform', 'capitalize');
    escreverEstados("#caracteristicaDoColpo", data["rcpol:colpeFeature"].states);
    escreverEstados("#caracteristicaDoPoro", data["rcpol:poreFeature"].states);

    var espexi = data["rcpol:espexi"];
    $("#espexi").append(espexi.mean + "±" + espexi.sd + "(" + espexi.min + "-" + espexi.max + ")" );

    escreverEstados("#ornamentacaoDaExina", data["rcpol:exineOrnamentation"].states);

    // mapa
    map.attributionControl.addAttribution('<a href="./' + id + '"">Ocorrências de ' + name  +'</a>');

    //especimes
    var specimen_ids = data.specimens.map(function(elem){return elem.id;});
    var specimen_query = "filter[where][id][inq]=" + specimen_ids[0];
    specimen_ids.forEach(function(id){
      specimen_query += "&filter[where][id][inq]=" + id;
    });

    $.getJSON("/api/Specimens?" + specimen_query, function(specimens){
      specimens.forEach(function(specimen, id){
        var p = [specimen["dwc:decimalLatitude"].value, specimen["dwc:decimalLongitude"].value];
        var marker = L.marker(p, {opacity:0.9}).addTo(map);
        //TODO: nome da palinoteca, recorDedBy, abreviação do estado (SP, RJ)
        w2ui['grid'].add({recid: id, species: name, palinoteca: specimen["dwc:collectionCode"].value, tipo: specimen["dwc:recoredBy"].value, cidade: specimen["dwc:municipality"].value + " - " + specimen["dwc:stateProvince"].value});
      });
    });

  });
};

function escreverEstados(seletor, estados){
  // adicionar separador ","...
  if (estados.length > 1){
    $(seletor).append(estados.map(function(estado){ return estado.value; }).join(", "));
  }
  else
    $(seletor).append(estados[0].value);
}
