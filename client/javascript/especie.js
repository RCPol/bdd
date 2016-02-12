function readSpecies(id, map){

  $.getJSON("/api/Species/"+id, function(data){
    // titulo
    var name = data["dwc:scientificName"].value + " " + data["dwc:scientificNameAuthorship"].value;
    document.title = name;

    // nome da espécie
    $("#nomeDaEspecie").append(document.title);

    escreverEstados("#habito", data["rcpol:habit"]);

    if (data["dwc:establishmentMean"])
      $("#origem").append(data["dwc:establishmentMean"].value); //TODO: pular se nao tiver a informação

    $("#periodoDeFloracao").append(data["rcpol:floweringPeriod"].months.join(', '));

    // caracteristicas da flor
    escreverEstados("#sindromeDePolinizacao", data["rcpol:pollinationSyndrome"]);
    escreverEstados("#unidadeDeAtracao", data["rcpol:attractionUnit"]);
    escreverEstados("#sexualidade", data["rcpol:flowerSexuality"]);
    escreverEstados("#tamanhoDaFlor", data["rcpol:flowerSize"]);
    escreverEstados("#forma", data["rcpol:flowerForm"]);
    escreverEstados("#simetria", data["rcpol:flowerSymmetry"]);
    escreverEstados("#corDaFlor", data["rcpol:flowerColor"]);
    escreverEstados("#antese", data["rcpol:flowerOpeningTime"]);
    escreverEstados("#deiscenciaDaAntera", data["rcpol:antherDehiscence"]);
    escreverEstados("#odor", data["rcpol:odorPresence"]);
    escreverEstados("#tipoDeRecursoFloral", data["rcpol:mainFloralResourceCollecteByVisitors"]); //TODO collecteD

    //TODO: imagens da planta

    // Descrição Polínica
    escreverEstados("#unidadeDeDispersaoDoPolen", data["rcpol:pollenDispersalUnit"], true);

    //$("#tamanhoDoPolen").append(data["rcpol:pollenDiameter"].value); //TODO

    if (data["rcpol:polarAxis"]){
      var p = data["rcpol:polarAxis"];
      $("#polarAxis").append("P = " +p.mean + " ± " + p.sd + " (" + p.min + " - " + p.max + "), " );
    }

    if (data["rcpol:equatorialAxis"]){
      var e = data["rcpol:equatorialAxis"];
      $("#equatorialAxis").append("E = " + e.mean + " ± " + e.sd + " (" + e.min + " - " + e.max + "), " );
    }

    escreverEstados("#simetriaDoPolen", data["rcpol:pollenSymmetry"], true);
    escreverEstados("#polaridadeDoPolen", data["rcpol:pollenPolarity"], true);
    $("#ambitoDoPolen").append("âmbito ");
    escreverEstados("#ambitoDoPolen", data["rcpol:pollenAmbit"], true);
    escreverEstados("#formaDoPolen", data["rcpol:pollenShape"], true);

    if(data["rcpol:pollenShapePE"]){
      var p_e = data["rcpol:pollenShapePE"];
      $("#formaDoPolenPE").append("P/E = " + p_e.mean + " ± " + p_e.sd + " (" + p_e.min + " - " + p_e.max + "). " );
    }

    escreverEstados("#tipoDeAberturaDoPolen", data["rcpol:pollenAperture"], true); //letra maiuscula
    // primeira letra maiuscula após o ponto
    //TODO: e se houverem dois estados?
    if (data["rcpol:pollenShapePE"]){ // se o ponto foi colocado
      $("#tipoDeAberturaDoPolen").css('text-transform', 'capitalize');
    }

    if (data["rcpol:colpeFeature"].value.indexOf("ausente") == -1){
      $("#caracteristicaDoColpo").append("ectoabertura do tipo colpo ");
      escreverEstados("#caracteristicaDoColpo", data["rcpol:colpeFeature"], true);
    } else
      $("#caracteristicaDoColpo").append("ectoabertura ausente, ");

    if (data["rcpol:poreFeature"]){
      $("#caracteristicaDoPoro").append("endoabertura ");
      escreverEstados("#caracteristicaDoPoro", data["rcpol:poreFeature"]);
      //TODO:  por a figura mesmo se estiver ausente?
      $("#caracteristicaDoPoro").append(" (Figuras C-D). ");
    }

    if (data["rcpol:espexi"]){
      var espexi = data["rcpol:espexi"];
      $("#espexi").append("Exina de espessura " + espexi.mean + " ± " + espexi.sd + " (" + espexi.min + " - " + espexi.max + "), " );
    }

    $("#ornamentacaoDaExina").append("superficie ");
    escreverEstados("#ornamentacaoDaExina", data["rcpol:exineOrnamentation"]);
    $("#ornamentacaoDaExina").append("  (visível em 2.500x, Figuras E-F ).");

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
        w2ui['grid'].add({recid: id, species: name, palinoteca: specimen["dwc:collectionCode"].value, tipo: specimen["dwc:recoredBy"].value, cidade: specimen["dwc:municipality"].value + " - " + specimen["dwc:stateProvince"].value, specimen_id: specimen.id});
      });
    });

  });
};

function escreverEstados(seletor, descritor, adicionarVirgula){
  // adicionar separador ","...
  if(descritor && descritor.hasOwnProperty("states")){
    var estados = descritor.states;
    if (estados.length > 1){
      $(seletor).append(estados.map(function(estado){ return estado.value; }).join(", "));
    }
    else
      $(seletor).append(estados[0].value);
    if (adicionarVirgula)
      $(seletor).append(", ");
  }
}
