var query = [];
var eligibleDescriptor = [];
var speciesDb = {};
var statesDb = {};
var eligibleSpeciesDB = {};

function composeQuery(){
  $(".selecionado").each( function(){
    var name = $(this).attr('name');
    query.push(name);
  });
  identify(query);
}
function resetQuery(){
  query = [];
  identify(query);
}
function removeSelected(){
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
function identify(query){
  // limpar tudo
  $(".btnident").attr('disabled', 'disabled');
  $("#especiesElegiveis").empty();
  $("#especiesElegiveis").append('<p style="margin-bottom:10px" id="elegibleCount"></p>');
  $(".descritor").empty();
  $("#especiesDescartadas").empty();
  $("#descritoresSelecionados").empty();
  eligibleDescriptor = [];
  console.log(query);
  writeSelectedState(query);
  $.get("/api/Identification/identify", {param: query}, function(data){
    console.log("Identify()", data.response);
    var ids = data.response.eligibleItems.map(function(item) {return item.id;});
    var species_query = {where: {id: {inq: ids}}};
    if (ids.length == 0)
      species_query = {where: {id: ""}};
    $.getJSON("/api/Species?filter[fields][id]=true&filter[order]=dwc:scientificName%20ASC", { filter : species_query }, function(species){
      // clean eligible itens
      eligibleSpeciesDB = {};
      /* especies */
      $("#elegibleCount").html("#"+species.length+" espécies elegiveis");
      species.forEach(function(item){
        setEligibleSpecies(item);
        getSpecies(item, "#especiesElegiveis", writeSpecies);
      });
      setDiscartedSpecies();
      data.response.eligibleStates.forEach(function(descriptor){
        /* apenas escrever descritores não selecionados, com mais de um estado */
        //TODO
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
    });

  });
}
function setEligibleSpecies(species){
  eligibleSpeciesDB[species.id] = species;
}
function setDiscartedSpecies(){
  for (var id in speciesDb) {
    if(typeof eligibleSpeciesDB[id] == 'undefined'){
      writeSpecies(id,"#especiesDescartadas");
    }
  }
}
function writeSelectedState(query){
  query.forEach(function(selected, i){
    console.log(selected);
    $.getJSON('/api/Schemas/'+selected.split(":")[1], function(schema){
      $(".descel").append("<input state='" + selected +"' type='checkbox' id='idcheckbox" + i + "'><label for='idcheckbox" + i + "'>" + schema["rcpol:descriptor"].value + ": " + selected.split(":")[2] + "</label><br>");
    });
  });
};
function getSpecies(species, nicho, callback){
  if(typeof speciesDb[species.id] == 'undefined'){
    $.getJSON('/api/Species/' + species.id + '?filter=%7B%20%22fields%22%3A%20%7B%22dwc%3AscientificName%22%3Atrue%2C%20%22dwc%3Afamily%22%3Atrue%2C%20%22dwc%3AscientificNameAuthorship%22%3Atrue%2C%20%22dwc%3AvernacularName%22%3Atrue%7D%20%7D', {}, function(sp){
      speciesDb[species.id] = {};
      speciesDb[species.id].scientificName = sp['dwc:scientificName'].value;
      speciesDb[species.id].family = sp['dwc:family'].value;
      speciesDb[species.id].scientificNameAuthorship = sp['dwc:scientificNameAuthorship'].value;
      if (sp['dwc:vernacularName'] != undefined)
        speciesDb[species.id].vernacularName = sp['dwc:vernacularName'].value.split("|");
      callback(species.id,nicho);
    });
  }else{
    callback(species.id,nicho);
  }
}
function writeSpecies(id, nicho){
  $(nicho).append("<div class='especies' id = " + id + "></div>");

  $(nicho + " > #" + id).append("<img id='"+nicho.slice(1,nicho.length)+"_img_"+id+"' src='img/lspm.jpg'>");
  $(nicho + " > #" + id).append("<div class='nsp'></div>");
  $(nicho + " > #" + id + " > .nsp").append("<p class='famisp'>" + speciesDb[id].family + "</p>");
  $(nicho + " > #" + id + " > .nsp").append("<a href='/profile/species/" + id + "' target='_blank' ><p class='nomesp'><i>" + speciesDb[id].scientificName + " </i>" + speciesDb[id].scientificNameAuthorship + "</p></a>");
  if (speciesDb[id].vernacularName != undefined)
    $(nicho + " > #" + id + " > .nsp").append("<p class='popn'>" + speciesDb[id].vernacularName + "</p>");
  getImage(id, nicho, "Species");
  $(nicho + " > #" + id + " img").width(100).height(100);
}

function writeDescriptor(descritor, species_length){
  // retirar estados com count >= species_length
  var copia_descritor = [];
  descritor.states.forEach(function(estado){
    if (estado.count < species_length)
      copia_descritor.push(estado);
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

function getImage(id, nicho, model){
  var url = '/api/' + model +'/mainImage?id=' + id;
  $.getJSON(url, {}, function(res){
    if (res.response && res.response != ""){
      $(nicho+"_img_"+id).attr("src", res.response);
    }
  });
}
function buscaDescritores(nothing) {
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
      writeDescriptor(descritor, Object.keys(eligibleSpeciesDB).length);
    }
  });
  // expandir descritores
  if (!nothing){
    $('.open').trigger("click");
  }
}
function buscaEspecies(nothing) {
  var key = $("#buscaespecies").val().trim().toLowerCase();
  if(nothing) key = "";
  $("#especiesElegiveis div").each(function(){
    if( $(this).find("p").text().toLowerCase().indexOf(key) === -1 ){
      $(this).fadeOut();
    }
    else { // queremos que as outras divs fiquem invisiveis, mas que nao sejam deletadas
           // caso o usuario precise fazer uma nova pesquisa
      $(this).fadeIn();
    }
  });
}
