function readSpecies(id, map){

  $.getJSON("/api/Species/"+id, function(data){
    // titulo
    var name = data["dwc:scientificName"].value + " " + data["dwc:scientificNameAuthorship"].value;
    document.title = name;

    // nome da espécie
    $("#nomeDaEspecie").append(data["dwc:scientificName"].value);
    $("#nomeDoAutor").append(data["dwc:scientificNameAuthorship"].value);

    escreverEstados("#habito", data["rcpol:habit"]);

    if (data["dwc:establishmentMean"])
      $("#origem").append(data["dwc:establishmentMean"].value);

    if (data["recpol:floweringPeriod"])
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
    escreverEstados("#tipoDeRecursoFloral", data["rcpol:mainFloralResourceCollectedByVisitors"]);

    // imagens da planta
    if(!(Array.isArray(data['dwc:associatedMedia']))) data['dwc:associatedMedia'] = [data['dwc:associatedMedia']];
    data["dwc:associatedMedia"].forEach(function(media){
      if (media.category != "Pólen"){
        imagem("#foto_planta", data["dwc:associatedMedia"], media.category);
        $("#foto_planta img").attr("style", "max-width:500px; max-height:400px;");
      }
    });
    $(".fotorama").fotorama();

    // Descrição Polínica
    escreverEstados("#unidadeDeDispersaoDoPolen", data["rcpol:pollenDispersalUnit"], true);

    if (data["rcpol:pollenDiameter"])
      escreverEstados("#tamanhoDoPolen", data["rcpol:pollenDiameter"], true);
    else if (data["rcpol:smallerPollenDiameter"] && data["rcpol:largerPollenDiameter"])
      $("#tamanhoDoPolen").append("tamanho do pólen maior: ", data["rcpol:smallerPollenDiameter"].value, ", tamanho do pólen menor: ", data["rcpol:largerPollenDiameter"].value);

    if (data["rcpol:pollenDiameter"]){
      var d = data["rcpol:pollenDiameter"];
      $("#pollenDiameter").append("D = " +d.mean + " ± " + d.sd + " (" + d.min + " - " + d.max + "), " );
    }

    if (data["rcpol:smallerPollenDiameter"]){
      var smalld = data["rcpol:smallerPollenDiameter"];
      $("#smallerPollenDiameter").append("Dmenor = " +smalld.mean + " ± " + smalld.sd + " (" + smalld.min + " - " + smalld.max + "), " );
    }

    if (data["rcpol:largerPollenDiameter"]){
      var larged = data["rcpol:largerPollenDiameter"];
      $("#largerPollenDiameter").append("Dmaior = " +larged.mean + " ± " + larged.sd + " (" + larged.min + " - " + larged.max + "), " );
    }

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
    if (data["rcpol:pollenShapePE"]){ // se o ponto foi colocado
      $("#tipoDeAberturaDoPolen").css('text-transform', 'capitalize');
    }

    if(data["rcpol:colpeFeature"]){
      if (data["rcpol:colpeFeature"].value.indexOf("ausente") == -1){
        $("#caracteristicaDoColpo").append("ectoabertura do tipo colpo ");
        escreverEstados("#caracteristicaDoColpo", data["rcpol:colpeFeature"], true);
      } else
        $("#caracteristicaDoColpo").append("ectoabertura ausente, ");
    }

    if (data["rcpol:poreFeature"]){
      $("#caracteristicaDoPoro").append("endoabertura ");
      escreverEstados("#caracteristicaDoPoro", data["rcpol:poreFeature"]);
      //$("#caracteristicaDoPoro").append(" (Figuras C-D). ");
    }

    if (data["rcpol:espexi"]){
      var espexi = data["rcpol:espexi"];
      $("#espexi").append(". Exina de espessura " + espexi.mean + " ± " + espexi.sd + " (" + espexi.min + " - " + espexi.max + "), " );
    }

    $("#ornamentacaoDaExina").append("superficie ");
    escreverEstados("#ornamentacaoDaExina", data["rcpol:exineOrnamentation"]);
    //$("#ornamentacaoDaExina").append("  (visível em 2.500x, Figuras E-F ).");
    $("#ornamentacaoDaExina").append(".");

    //imagens do polen
    data["dwc:associatedMedia"].forEach(function(media){
      if (media.category == "Pólen"){
        imagem("#foto_polen", data["dwc:associatedMedia"], media.category);
      }
    });
    $(".fotorama").fotorama();

    // mapa
    map.attributionControl.addAttribution('<a href="./' + id + '"">Ocorrências de ' + name  +'</a>');

    //especimes
    var specimen_ids = data.specimens.map(function(elem){return elem.id;});
    var specimen_query = "filter[fields][dwc:decimalLatitude]=true&filter[fields][dwc:decimalLongitude]=true&filter[fields][dwc:collectionCode]=true&filter[fields][dwc:recordedBy]=true&filter[fields][dwc:municipality]=true&filter[fields][dwc:stateProvince]=true&filter[fields][id]=true&filter[where][id][inq]=" + specimen_ids[0];
    specimen_ids.forEach(function(id){
      specimen_query += "&filter[where][id][inq]=" + id;
    });

    $.getJSON("/api/Specimens?" + specimen_query, function(specimens){
      specimens.forEach(function(specimen, id){
        // mapa
        var p = [specimen["dwc:decimalLatitude"].value, specimen["dwc:decimalLongitude"].value];
                console.log(p);
        var marker = L.marker(p, {opacity:0.9}).addTo(map);

        // especimes
        var palinoteca = "";
        if (!(Array.isArray(specimen["dwc:collectionCode"]))) specimen["dwc:collectionCode"] = [specimen["dwc:collectionCode"]];
        specimen["dwc:collectionCode"].forEach(function(c_code){
          if(c_code.label == "Código da Palinoteca")
            palinoteca = c_code.value;
        });
        w2ui['grid'].add({recid: id, species: name, palinoteca: palinoteca, tipo: specimen["dwc:recordedBy"].value, cidade: specimen["dwc:municipality"].value + " - " + specimen["dwc:stateProvince"].value, specimen_id: specimen.id});
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
function imagem(nicho, descritor, categoria){
  if(descritor.length > 0){
    descritor.forEach(function(img_object){
      if(img_object.category == categoria){
        $(nicho).append("<img src='/resized_images/" + img_object.name + ".jpg'>");
      }
    });
  } else { // se não for um array
    if (descritor.category == categoria){
      $(nicho).append("<img style='max-width:500px;' src="+ descritor.url +">");
    }
  }
}
