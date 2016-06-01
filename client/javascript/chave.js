var query = [];
var eligibleDescriptor = []; // descritores elegíveis
var speciesDb = {}; // todas espécies
var eligibleSpeciesDb = []; // ids das espécies elegíveis

function composeQuery(){
  // chamado pelo botão "identificar", Adiciona à query os estados selecionados
  $(".selecionado").each( function(){
    var name = $(this).attr('name');
    query.push(name);
  });
  identify(query);
}

function resetQuery(){
  // acionado pelo botão "remover todos", limpa a query
  query = [];
  identify(query);
}

function removeSelected(){
  // acionado pelo botão "remover selecionados", remove da query apenas os estados selecioados
  $("input:checked").each(function(){
    var $this = $(this);
    query = query.filter(function(elem){
      if(elem == $this.attr('state'))
        return false;
      else
        return true;
    });
  });
  identify(query);
}

function getImage(id, nicho, model){
  // obtem imagem principal referente ao modelo
  var url = '/api/' + model +'/mainImage?id=' + id;
  $.getJSON(url, {}, function(res){
    if (res.response && res.response != ""){
      $(nicho+"_img_"+id).attr("src", res.response);
    }
  });
}

function writeSpecies(ids, nicho){
  // adicionar espécies (id, imagem, familia, nome científico, nome popular) a alguma lista (ex: especiesDescartadas ou especiesElegiveis)
  for (let id of ids){
    $(nicho).append("<div class='especies' id = " + id + "></div>");

    $(nicho + " > #" + id).append("<img id='"+nicho.slice(1,nicho.length)+"_img_"+id+"' src='img/lspm.jpg'>"); // imagem placeholder caso a imagem real não possa ser carregada
    $(nicho + " > #" + id).append("<div class='nsp'></div>");
    $(nicho + " > #" + id + " > .nsp").append("<p class='famisp'>" + speciesDb[id].family + "</p>");
    $(nicho + " > #" + id + " > .nsp").append("<a href='/profile/species/" + id + "' target='_blank' ><p class='nomesp'><i>" + speciesDb[id].scientificName + " </i>" + speciesDb[id].scientificNameAuthorship + "</p></a>");
    if (speciesDb[id].vernacularName != undefined)
      $(nicho + " > #" + id + " > .nsp").append("<p class='popn'>" + speciesDb[id].vernacularName + "</p>");
    getImage(id, nicho, "Species");
    $(nicho + " > #" + id + " img").width(100).height(100);
  };
}

function writeDescriptor(descritor, species_length){
  // adicionar um descritor e seus estados associados à lista de descritores
  var copia_descritor = [];
  descritor.states.forEach(function(estado){
    if (estado.count < species_length){
      // retirar estados com count >= species_length
      copia_descritor.push(estado);
    }
  });

  //TODO: usar ids para consultar Schema
  // adicionar descritor, se houver algum estado
  if (copia_descritor.length > 0){
    $("#desc_for_"+descritor.category_name).append("<li><section class='toggle'><span>+</span>" + descritor.descriptor_name + "<a target='_blank' href='/profile/glossary/"+descritor.descriptor_term+"'><img src='img/glo.png' class='lala'></a></section></li>");
    $("#desc_for_"+descritor.category_name + " li").last().append("<div class='valoresi inner'></div>");
  }

  // ordenar estados
  copia_descritor.sort(function(a, b){
    return parseInt(a.state.order) - parseInt(b.state.order);
  });

  copia_descritor.forEach(function(estado){
    $("#desc_for_"+descritor.category_name + " li").last().find(".valoresi").append(
      "<div class='vimagens' id='" + estado.state.value.split(":").join("-") + "' name='" + estado.state.value + "'>"
        + "<p>"+
        "<img src='/img/lspm.jpg' class='vimg' id='desc_for_"+ descritor.category_name +"_img_"+ estado.state.id +"'>"+
        "<a href='/profile/glossary/" + estado.state.id + "' target='_blank'>"+
        "<img src='/img/glo.png' class='vglos'>"+
        "</a>  " + estado.state.value.split(":")[2] + " (" + estado.count+ ")" +
        "</p></div>");

    getImage(estado.state.id, "#desc_for_"+descritor.category_name, "Schemas");
  });
}

function buscaDescritores(nothing) {
  // buscar por estado ou descritor. Se nothing = true, retornar todos os descritores
  $(".descritor").empty();
  var key = $("#buscadescritores").val().trim().toLowerCase();
  if (nothing) key = "";
  eligibleDescriptor.forEach(function(descritor){
    // checar se a palavra pesquisada é substring do descritor ou de algum estado deste descritor
    var is_in_states = false;
    descritor.states.forEach(function(estado){
      if (estado.state.value.toLowerCase().indexOf(key) != -1){
        is_in_states = true;
      }
    });
    if(descritor.descriptor_name.toLowerCase().indexOf(key) != -1 || is_in_states){
      writeDescriptor(descritor, Object.keys(eligibleSpeciesDb).length);
    }
  });
  // expandir descritores
  if (!nothing){
    $('.open').trigger("click");
  }
}

function buscaEspecies(nothing) {
  // buscar na lista de espécies. Se nothing = true, retornar todas as espécies
  var key = $("#buscaespecies").val().trim().toLowerCase();
  if(nothing) key = "";
  $("#especiesElegiveis div").each(function(){
    if( $(this).find("p").text().toLowerCase().indexOf(key) === -1 ){
      $(this).fadeOut();
    }
    else { // queremos que as outras divs fiquem invisiveis, mas que nao sejam deletadas
           // caso o usuario precise resetar e fazer uma nova pesquisa
      $(this).fadeIn();
    }
  });
}

function setDiscartedSpecies(){
  // escrever espécies descartadas
  var discartedSpeciesDb = Object.keys(speciesDb).filter(function(id){
    if (eligibleSpeciesDb.indexOf(id) == -1){
      return true;
    } else {
      return false;
    }
  });
  writeSpecies(discartedSpeciesDb,"#especiesDescartadas");
}

function writeSelectedState(query){
  // escrever estado selecionado na lista de descritores selecionados
  query.forEach(function(selected, i){
    $.getJSON('/api/Schemas/'+selected.split(":")[1], function(schema){
      $(".descel").append("<input state='" + selected +"' type='checkbox' id='idcheckbox" + i + "'><label for='idcheckbox" + i + "'>" + schema["rcpol:descriptor"].value + ": " + selected.split(":")[2] + "</label><br>");
    });
  });
};

function writeChunks(i, n, nicho){
  // escrever uma lista de espécies de n em n
  console.log(i);
  if (i+n < eligibleSpeciesDb.length){
    window.setTimeout(function(){
      writeSpecies(eligibleSpeciesDb.slice(i,i+n), nicho);
      writeChunks(i+n, n, nicho);
    }, 1000);
  } else {
    writeSpecies(eligibleSpeciesDb.slice(i,i+n), nicho);
    return;
  }
}

function getSpeciesInfo(species, nicho, callback){
  // obter nome científico, familia e nome popular da espécie e salvar em speciesDb
  if(typeof speciesDb[species.id] == 'undefined'){
    speciesDb[species.id] = {};
    speciesDb[species.id].scientificName = species['dwc:scientificName'].value;
    speciesDb[species.id].family = species['dwc:family'].value;
    speciesDb[species.id].scientificNameAuthorship = species['dwc:scientificNameAuthorship'].value;
    if (species['dwc:vernacularName'] != undefined)
      speciesDb[species.id].vernacularName = species['dwc:vernacularName'].value.split("|");
  }
}

function getSpecies(data, species_query, callback){
  /* listas de especies */
  $.getJSON("/api/Species?filter[fields][id]=true&filter[fields][dwc:scientificName]=true&filter[fields][dwc:family]=true&filter[fields][dwc:scientificNameAuthorship]=true&filter[fields][dwc:vernacularName]=true&filter[order][0]=dwc:family%20ASC&filter[order][1]=dwc:scientificName%20ASC", { filter : species_query }, function(species){
    // limpar espécies elegíveis
    eligibleSpeciesDb = [];
    $("#elegibleCount").html("#" + species.length + " espécies elegiveis");
    species.forEach(function(item){
      eligibleSpeciesDb.push(item.id); // eligibleSpeciesDb será depois comparado com speciesDb para obter as espécies descartadas
      getSpeciesInfo(item);
    });
    writeChunks(0, 100, "#especiesElegiveis");
    setDiscartedSpecies();
    callback(species);
  });
}

function getDescriptors(data, species){
  /* listas de descritores */
  // limpar descritores elegíveis
  eligibleDescriptor = [];
  data.response.eligibleStates.forEach(function(descriptor){
    /* apenas escrever descritores não selecionados, com mais de um estado */
    var selected = false;
    query.forEach(function(element){
      if (element.split(":")[1] == descriptor.descriptor_term){
        selected = true;
      }
    });

    if(descriptor.states.length > 1 && !selected){
      eligibleDescriptor.push(descriptor);
      writeDescriptor(descriptor, species.length);
    }
  });
  $(".btnident").removeAttr('disabled');
  if(species.length == 1){
    window.open($("#especiesElegiveis .nsp > a").attr("href"));
  }
}

function identify(query){
  // limpar tudo
  $(".btnident").attr('disabled', 'disabled');
  $("#especiesElegiveis").empty();
  $("#especiesElegiveis").append('<p style="margin-bottom:10px" id="elegibleCount"></p>');
  $(".descritor").empty();
  $("#especiesDescartadas").empty();
  $("#descritoresSelecionados").empty();
  console.log(query);
  writeSelectedState(query);
  $.get("/api/Identification/identify", {param: query}, function(data){
    console.log("Identify()", data.response);
    var ids = data.response.eligibleItems.map(function(item) {return item.id;});
    var species_query = {where: {id: {inq: ids}}};
    if (ids.length == 0)
      species_query = {where: {id: ""}};
    getSpecies(data, species_query, function(species){
      getDescriptors(data, species);
    });
  });
}
