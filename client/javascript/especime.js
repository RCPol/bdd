var coordinates = {};
function readSpecimen(id, cb){
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
      if(parsedId.length==4 && class_!="NumericalDescriptor"){
        if(data[key].value && !data[key].states && !data[key].months){
          $("#"+base+"-label").append(data[key].field+": ");
          $("#"+base+"-value").append(data[key].value);
        }
        if(data[key].states){
          data[key].states.forEach(function(state) {
            $("#"+base+"-value").append(state.state).append(", ");
            if(data[key].term == "exineOrnamentation"){
              console.log("#"+base+"-value");
              console.log(state.state);
            }
          });
          var aux = $("#"+base+"-value").html() || "";
          if(aux.length>0){
            $("#"+base+"-label").append(data[key].field+": ");
            $("#"+base+"-value").html(
              aux.substring(0,aux.length-2)
            );
          }
        }
        if(data[key].months){
          data[key].months.forEach(function(month) {
            $("#"+base+"-value").append(month).append(", ");
          });
          var aux = $("#"+base+"-value").html() || "";
          if(aux.length>0){
            $("#"+base+"-label").append(data[key].field+": ");
            $("#"+base+"-value").html(
              aux.substring(0,aux.length-2)
            );
          }
        }
      } else if(class_=="NumericalDescriptor"){
        if(data[key].field && data[key].state && data[key].state.numerical && data[key].state.numerical.min && data[key].state.numerical.max){
          if(data[key].term == "pollenShapePE"){
            var pos = data[key].field.toLowerCase().indexOf("p/e");
            var before = data[key].field.substring(0,pos);
            var after = data[key].field.substring(pos+3,data[key].field.length);
            var aux = before+"P/E"+after;
            $("#"+base+"-label").append(aux+": ");
          } else
            $("#"+base+"-label").append(data[key].field+": ");
          $("#"+base+"-value").append("Min: "+data[key].state.numerical.min+" / Max: "+data[key].state.numerical.max +
          (data[key].state.numerical.med?" / Avg: "+data[key].state.numerical.avg:"")+
          (data[key].state.numerical.sd?" / SD: "+data[key].state.numerical.sd:"")
          );
        }
      }
    });

    // IMAGES
    data[lang+':rcpol:Image:plantImage'] = !(Array.isArray(data[lang+':rcpol:Image:plantImage']))?[data[lang+':rcpol:Image:plantImage']]:data[lang+':rcpol:Image:plantImage'];
    data[lang+":rcpol:Image:plantImage"].forEach(function(media){
        imagem("#foto_planta", data[lang+":rcpol:Image:plantImage"]);
        $("#foto_planta img").attr("style", "max-width:500px; max-height:400px;");
    });
    data[lang+':rcpol:Image:flowerImage'] = !(Array.isArray(data[lang+':rcpol:Image:flowerImage']))?[data[lang+':rcpol:Image:flowerImage']]:data[lang+':rcpol:Image:flowerImage'];
    data[lang+":rcpol:Image:flowerImage"].forEach(function(media){
        imagem("#foto_planta", data[lang+":rcpol:Image:flowerImage"]);
        $("#foto_planta img").attr("style", "max-width:500px; max-height:400px;");
    });
    data[lang+':rcpol:Image:pollenImage'] = !(Array.isArray(data[lang+':rcpol:Image:pollenImage']))?[data[lang+':rcpol:Image:pollenImage']]:data[lang+':rcpol:Image:pollenImage'];
    data[lang+":rcpol:Image:pollenImage"].forEach(function(media){
        imagem("#foto_polen", data[lang+":rcpol:Image:pollenImage"]);
    });
    data[lang+':rcpol:Image:allPollenImage'] = !(Array.isArray(data[lang+':rcpol:Image:allPollenImage']))?[data[lang+':rcpol:Image:allPollenImage']]:data[lang+':rcpol:Image:allPollenImage'];
    data[lang+":rcpol:Image:allPollenImage"].forEach(function(media){
        imagem("#foto_polen", data[lang+":rcpol:Image:allPollenImage"]);
    });
    $(".fotorama").fotorama();

    function imagem(nicho, descritor){
        descritor.forEach(function(img_object){
          if(img_object)
            $(nicho).append(img_object.name
              ?"<img src='/resized_images/" +img_object.name + ".jpg'>"
              :"<img style='max-width:500px;' src="+ img_object.url +">");
          // }
        });
    }

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

    // specimenDb = specimen;
    // var name = specimenDb["dwc:scientificName"].value + " " + specimenDb["dwc:scientificNameAuthorship"].value;
    // document.title = "RCPol - "+name;
    // $("#familia").append(specimenDb["dwc:family"].value);
    // $("#nome").append(specimenDb["dwc:scientificName"].value);
    // $("#autor").append(specimenDb["dwc:scientificNameAuthorship"].value);
    // if (specimenDb["dwc:vernacularName"])
    //   $("#nomePopular").append(specimenDb["dwc:vernacularName"].value);
    // //dados da palinoteca
    var codigo_palinoteca = data[lang+":dwc:RecordLevel:collectionCode"].value;
    var codigo_herbario = data[lang+":dwc:RecordLevel:collectionCodeHerbarium"].value;
    // var collectionCode = specimenDb["dwc:collectionCode"];
    // if (!(Array.isArray(collectionCode))) collectionCode = [collectionCode]; // se houver apenas um valor
    // collectionCode.forEach(function(c_code){
    //   if (c_code.label == "Sigla da Palinoteca"){
    //     codigo_palinoteca = c_code.value;
    //   }
    //   else if (c_code.label == "Sigla do Herbário")
    //     codigo_herbario = c_code.value;
    // });


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
      $("#link_palinoteca").attr("href", "/profile/palinoteca/"+palinoteca["id"]);
      if(palinoteca["rcpol:logotipo"].url)
        $("#logo").attr("src", palinoteca["rcpol:logotipo"].url);
      // console.log(palinoteca["rcpol:logotipo"].url);
    });
//
    // $.getJSON("/api/Specimens/getCollection?code="+codigo_herbario, function(res){
    //   console.log(res);
    //   var herbario = res.response[0];
    //   $("#herbario").append(herbario["rcpol:collectionName"].value+" (").append(codigo_herbario+")");
    //   // $("#herbario").append(codigo_herbario);
    // });
//
//     $.getJSON("/api/Species?filter[fields][id]=true&filter[where][dwc:scientificName.value]="+specimenDb["dwc:scientificName"].value, function(especies){
//       $("#link_especie").attr("href", "/profile/species/"+especies[0].id);
//     });
//
//     $("#coletor").append(specimenDb['dwc:recordedBy'].value);
//
//     var num_palinoteca, num_herbario;
//     var catalogNumber = specimenDb['dwc:catalogNumber'];
//     if (!(Array.isArray(catalogNumber))) catalogNumber = [catalogNumber]; // se houver apenas um valor
//     catalogNumber.forEach(function(c_number){
//       if (c_number.label == "Número de Catálogo da Palinoteca")
//         num_palinoteca = c_number.value;
//       else if (c_number.label == "Número de Catálogo do Herbário")
//         num_herbario = c_number.value;
//     });
//
//     $("#numeroDeRegistroNoHerbario").append(num_herbario);
//     $("#numeroDeRegistroNaPalinoteca").append(num_palinoteca);
//     $("#dataColeta").append(specimenDb['dwc:eventDate'].day.value?specimenDb['dwc:eventDate'].day.value:"??").append("/");
//     $("#dataColeta").append(specimenDb['dwc:eventDate'].month.value?specimenDb['dwc:eventDate'].month.value:"??").append("/");
//     $("#dataColeta").append(specimenDb['dwc:eventDate'].year.value?specimenDb['dwc:eventDate'].year.value:"??");
//     $("#pais").append(specimenDb['dwc:country'].value);
//     $("#estado").append(specimenDb['dwc:stateProvince'].value);
//     $("#municipio").append(specimenDb['dwc:municipality'].value);
//     $("#tipoDeFormacaoVegetal").append(specimenDb['rcpol:vegetalFormationType'].value);
//     //latitude e longitude são adicionadas no html direto
//
//     //TODO: informações adicionais
//
//     escreverEstados("#habito", specimenDb["rcpol:habit"]);
//
//     if (specimenDb["dwc:establishmentMean"])
//       $("#origem").append(specimenDb["dwc:establishmentMean"].value);
//
//     if (specimenDb["rcpol:floweringPeriod"])
//       $("#periodoDeFloracao").append(specimenDb["rcpol:floweringPeriod"].months.join(', '));
//
//     // caracteristicas da flor
//     escreverEstados("#sindromeDePolinizacao", specimenDb["rcpol:pollinationSyndrome"]);
//     escreverEstados("#unidadeDeAtracao", specimenDb["rcpol:attractionUnit"]);
//     escreverEstados("#sexualidade", specimenDb["rcpol:flowerSexuality"]);
//     escreverEstados("#tamanhoDaFlor", specimenDb["rcpol:flowerSize"]);
//     escreverEstados("#forma", specimenDb["rcpol:flowerForm"]);
//     escreverEstados("#simetria", specimenDb["rcpol:flowerSymmetry"]);
//     escreverEstados("#corDaFlor", specimenDb["rcpol:flowerColor"]);
//     escreverEstados("#antese", specimenDb["rcpol:flowerOpeningTime"]);
//     escreverEstados("#deiscenciaDaAntera", specimenDb["rcpol:antherDehiscence"]);
//     escreverEstados("#odor", specimenDb["rcpol:odorPresence"]);
//     escreverEstados("#tipoDeRecursoFloral", specimenDb["rcpol:mainFloralResourceCollectedByVisitors"]);
//
//     // imagens da planta
//     if(!(Array.isArray(specimenDb['dwc:associatedMedia']))) specimenDb['dwc:associatedMedia'] = [specimenDb['dwc:associatedMedia']];
//     specimenDb["dwc:associatedMedia"].forEach(function(media){
//       if (media.category != "Pólen"){
//         imagem("#foto_planta", specimenDb["dwc:associatedMedia"], media.category);
//         $("#foto_planta img").attr("style", "max-width:500px; max-height:400px;");
//       }
//     });
//     $(".fotorama").fotorama();
//
//     // Descrição Polínica
//     escreverEstados("#unidadeDeDispersaoDoPolen", specimenDb["rcpol:pollenDispersalUnit"], true);
//
//     if (specimenDb["rcpol:pollenDiameter"])
//       escreverEstados("#tamanhoDoPolen", specimenDb["rcpol:pollenDiameter"], true);
//     else if (specimenDb["rcpol:smallerPollenDiameter"] && specimenDb["rcpol:largerPollenDiameter"])
//       $("#tamanhoDoPolen").append("tamanho do pólen maior: ", specimenDb["rcpol:smallerPollenDiameter"].value, ", tamanho do pólen menor: ", specimenDb["rcpol:largerPollenDiameter"].value);
//
//     if (specimenDb["rcpol:pollenDiameter"]){
//       var d = specimenDb["rcpol:pollenDiameter"];
//       $("#pollenDiameter").append("D = " +d.mean + " ± " + d.sd + " (" + d.min + " - " + d.max + "), " );
//     }
//
//     if (specimenDb["rcpol:smallerPollenDiameter"]){
//       var smalld = specimenDb["rcpol:smallerPollenDiameter"];
//       $("#smallerPollenDiameter").append("Dmenor = " +smalld.mean + " ± " + smalld.sd + " (" + smalld.min + " - " + smalld.max + "), " );
//     }
//
//     if (specimenDb["rcpol:largerPollenDiameter"]){
//       var larged = specimenDb["rcpol:largerPollenDiameter"];
//       $("#largerPollenDiameter").append("Dmaior = " +larged.mean + " ± " + larged.sd + " (" + larged.min + " - " + larged.max + "), " );
//     }
//
//     if (specimenDb["rcpol:polarAxis"]){
//       var p = specimenDb["rcpol:polarAxis"];
//       $("#polarAxis").append("P = " +p.mean + " ± " + p.sd + " (" + p.min + " - " + p.max + "), " );
//     }
//
//     if (specimenDb["rcpol:equatorialAxis"]){
//       var e = specimenDb["rcpol:equatorialAxis"];
//       $("#equatorialAxis").append("E = " + e.mean + " ± " + e.sd + " (" + e.min + " - " + e.max + "), " );
//     }
//
//     escreverEstados("#simetriaDoPolen", specimenDb["rcpol:pollenSymmetry"], true);
//     escreverEstados("#polaridadeDoPolen", specimenDb["rcpol:pollenPolarity"], true);
//     $("#ambitoDoPolen").append("âmbito ");
//     escreverEstados("#ambitoDoPolen", specimenDb["rcpol:pollenAmbit"], true);
//     escreverEstados("#formaDoPolen", specimenDb["rcpol:pollenShape"], true);
//
//     if(specimenDb["rcpol:pollenShapePE"]){
//       var p_e = specimenDb["rcpol:pollenShapePE"];
//       $("#formaDoPolenPE").append("P/E = " + p_e.mean + " ± " + p_e.sd + " (" + p_e.min + " - " + p_e.max + "). " );
//       escreverEstados("#tipoDeAberturaDoPolen", specimenDb["rcpol:pollenAperture"], true); //letra maiuscula
//     } else {
//       escreverEstados("#tipoDeAberturaDoPolen", specimenDb["rcpol:pollenAperture"], true); //letra minuscula
//       $("#tipoDeAberturaDoPolen").addClass("tipoDeAberturaDoPolen-minusculo").removeClass("tipoDeAberturaDoPolen");
//     }
//
//     if(specimenDb["rcpol:colpeFeature"]){
//       if (specimenDb["rcpol:colpeFeature"].value.indexOf("ausente") == -1){
//         $("#caracteristicaDoColpo").append("ectoabertura do tipo colpo ");
//         escreverEstados("#caracteristicaDoColpo", specimenDb["rcpol:colpeFeature"], true);
//       } else
//         $("#caracteristicaDoColpo").append("ectoabertura ausente, ");
//     }
//
//     if (specimenDb["rcpol:poreFeature"]){
//       $("#caracteristicaDoPoro").append("endoabertura ");
//       escreverEstados("#caracteristicaDoPoro", specimenDb["rcpol:poreFeature"]);
//       //$("#caracteristicaDoPoro").append(" (Figuras C-D). ");
//     }
//
//     if (specimenDb["rcpol:espexi"]){
//       var espexi = specimenDb["rcpol:espexi"];
//       $("#espexi").append(". Exina de espessura " + espexi.mean + " ± " + espexi.sd + " (" + espexi.min + " - " + espexi.max + "), " );
//     }
//
//     $("#ornamentacaoDaExina").append("superficie ");
//     escreverEstados("#ornamentacaoDaExina", specimenDb["rcpol:exineOrnamentation"]);
//     //$("#ornamentacaoDaExina").append("  (visível em 2.500x, Figuras E-F ).");
//     $("#ornamentacaoDaExina").append(".");
//
//     //imagens do polen
//     specimenDb["dwc:associatedMedia"].forEach(function(media){
//       if (media.category == "Pólen"){
//         imagem("#foto_polen", specimenDb["dwc:associatedMedia"], media.category);
//       }
//     });
//     $(".fotorama").fotorama();
//
//
//     var biblio = specimenDb["dwc:bibliographicCitation"];
//     if(biblio){
//       //$("#referencias").append("<h2>Refer&ecirc;ncias relacionadas ao esp&eacute;cime:</h2>");
//       if (!(Array.isArray(biblio))) biblio = [biblio];
//       biblio.forEach(function(citation){
//         citation.references.forEach(function(referencia){
//          $("#referencias").append('<p>' + referencia + '</p>');
//         });
//       });
//     }
//
    cb();
  });
}
//
// function escreverEstados(seletor, descritor, adicionarVirgula){
//   // adicionar separador ","...
//   if(descritor && descritor.hasOwnProperty("states")){
//     var estados = descritor.states;
//     if (estados.length > 1){
//       $(seletor).append(estados.map(function(estado){ return estado.value; }).join(", "));
//     }
//     else
//       $(seletor).append(estados[0].value);
//     if (adicionarVirgula)
//       $(seletor).append(", ");
//   }
// }
//
// function imagem(nicho, descritor, categoria){
//   if(descritor.length > 0){
//     descritor.forEach(function(img_object){
//       if(img_object.category == categoria){
//         $(nicho).append("<img src='/resized_images/" + img_object.name + ".jpg'>");
//       }
//     });
//   } else { // se não for um array
//     if (descritor.category == categoria){
//       $(nicho).append("<img style='max-width:500px;' src="+ descritor.url +">");
//     }
//   }
// }
