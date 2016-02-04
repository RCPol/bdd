var query = [];
var eligibleDescriptor = [];
var speciesDb = {};
var statesDb = {};
var eligibleSpeciesDB = {};

function composeQuery(){
  $(":checked").each( function(){
    var name = $(this).attr('name');
    var d = name.split(":")[0];
    var s = name.split(":")[1];
    query.push({descriptor: d, state: s});
  });
  identify(query);
}
function resetQuery(){
  query = [];
  identify(query);
}

function identify(query){
  //query = [{descriptor:"Cor da flor", state: "azul"}];
  // limpar tudo
  $("#especiesElegiveis").empty();
  $("#especiesElegiveis").append('<p style="margin-bottom:10px" id="elegibleCount"></p>');
  $(".descritor").empty();
  $("#especiesDescartadas").empty();
  $("#descritoresSelecionados").empty();
  eligibleDescriptor = [];
  writeSelectedState();
  $.post("/api/Identification/identify", {param: query}, function(data){
    console.log("Identify()", data.response);
    var ids = data.response.eligibleItems.map(function(item) {return item.id;});
    var species_query = {where: {id: {inq: ids}}};
    $.getJSON("/api/Species/", {filter : species_query}, function(species){
      // clean eligible itens
      eligibleSpeciesDB = {}
      /* especies */
      $("#elegibleCount").html("#"+species.length+" espécies elegiveis");
      species.forEach(function(item){
        setEligibleSpecies(item);
        getSpecies(item, "#especiesElegiveis", writeSpecies);
      });
      setDiscartedSpecies();
      // apenas se houver ainda mais de uma especie
      // PATRICK, Pq existe isso? Teoricamente, se só há uma espécie, o estados elegiveis deveria ser zerado, não?
      if (species.length > 1){
        //TODO: Agregador de descritores
      }
    });
    data.response.eligibleStates.forEach(function(descriptor){
      /* apenas escrever descritores com mais de um estado */
      if(descriptor.states.length > 1){
        eligibleDescriptor.push(descriptor);
        writeDescriptor(descriptor);
      }
    });
    if(!createAccordion.created)
      createAccordion();
    $(".accordion").accordion("refresh");
  });
}
function setEligibleSpecies(species){
  eligibleSpeciesDB[species.id] = species;
}
function setDiscartedSpecies(){
  for (var id in speciesDb) {
    if(typeof eligibleSpeciesDB[id] == 'undefined'){
        writeSpecies(id,"#especiesDescartadas")
    }
  }
}
function writeSelectedState(){
    query.forEach(function(selected){
      $("#descritoresSelecionados").append("<b>" + selected.descriptor + "</b>: " + selected.state + "<br>");
    });
};
function getSpecies(species, nicho, callback){
  if(typeof speciesDb[species.id] == 'undefined'){
    $.getJSON('/api/Species/' + species.id + '?filter=%7B%20%22fields%22%3A%20%7B%22dwc%3AscientificName%22%3Atrue%2C%20%22dwc%3Afamily%22%3Atrue%2C%20%22dwc%3AscientificNameAuthorship%22%3Atrue%7D%20%7D', {}, function(sp){
      speciesDb[species.id] = {};
      speciesDb[species.id].scientificName = sp['dwc:scientificName'].value;
      speciesDb[species.id].scientificNameAuthorship = sp['dwc:scientificNameAuthorship'].value;
      speciesDb[species.id].family = sp['dwc:family'].value;
      callback(species.id,nicho);
    });
  }else{
    callback(species.id,nicho);
  }
}
function writeSpecies(id, nicho){
  $(nicho).append("<div class='especies' id = " + id + "></div>");
  $(nicho + " > #" + id).append("<img src='img/lspm.jpg'>");
  $(nicho + " > #" + id).append("<div class='nsp'></div>");
  $(nicho + " > #" + id + " > .nsp").append("<a href='/profile/species/" + id + "' target='_blank' ><p class='nomesp'><i>" + speciesDb[id].scientificName + " </i>" + speciesDb[id].scientificNameAuthorship + "</p></a>");
  $(nicho + " > #" + id + " > .nsp").append("<p class='famisp'>" + speciesDb[id].family + "</p>");
}

function writeDescriptor(descritor){
   if(!$('#category_'+descritor.category_name).html()){
     var cat = '<h3 id="category_'+descritor.category_name+'">'+descritor.category_name+'</h3>';
     var des = '<div id="desc_for_'+descritor.category_name+'" class="descritor accordion"></div>';
     $('.agregadordescritores').html(cat+"\n"+des+$('.agregadordescritores').html());
   }
  //TODO: usar ids para consultar Schema
  $("#desc_for_"+descritor.category_name).append("<h3>" + descritor.descriptor_name + "</h3>");
  $("#desc_for_"+descritor.category_name).append("<ul class='valoresi'></ul>");
  descritor.states.forEach(function(estado){
    $("#desc_for_"+descritor.category_name+" ul").last().append("<input name='" + descritor.descriptor_name + ":" + estado.state + "' type='checkbox' class='vimagens'><p><!-- Imagem representante do valor fixo --><img src='/img/lspm.jpg' class='vimg'><!-- Link e icone para o glossário --><a href='#' target='_blank'><img src='/img/glo.png' class='vglos'></a>" + estado.state + " - " + estado.count + "</p></input>");
  });
}

function buscaDescritores() {
  $(".descritor").empty();
  var key = $("#buscadescritores").val().trim().toLowerCase();
  eligibleDescriptor.forEach(function(descritor){
    // checar se a palavra pesquisada é substring do descritor ou de algum estado deste descritor
    var is_in_states = false;
    descritor.states.forEach(function(estado){
      if (estado.state.toLowerCase().indexOf(key) != -1){
        is_in_states = true;
      }
    });
    if(descritor.descriptor_name.toLowerCase().indexOf(key) != -1 || is_in_states){
      writeDescriptor(descritor);
    }
  });
  $(".accordion").accordion("refresh");
}
function buscaEspecies() {
  //$("#especiesElegiveis").empty();
  var key = $("#buscaespecies").val().trim().toLowerCase();
  $("#especiesElegiveis div").each(function(){
    if( $(this).find("p").text().toLowerCase().indexOf(key) === -1 ){
      $(this).fadeOut();
    }
    else { // queremos que as outras divs fiquem invisiveis, mas que nao sejam deletadas
           // caso o usuario precise fazer uma nova pesquisa
      $(this).fadeIn();
    }
  });
  /*especiesElegiveis.forEach(function(especie){
    if( especie.nome.toLowerCase().indexOf(key) != -1 || especie.familia.toLowerCase().indexOf(key) != -1 ){
      writeSpecies(especie, "#especiesElegiveis");
    }
  });*/
}
