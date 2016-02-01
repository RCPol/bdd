var query = [];
var descritoresElegiveis = [];

function buscaDescritores() {
  $(".descritor").empty();

  var key = $("#buscadescritores").val().trim().toLowerCase();

  descritoresElegiveis.forEach(function(descritor){
    // checar se a palavra pesquisada é substring do descritor ou de algum estado deste descritor
    var is_in_states = false;
    descritor.states.forEach(function(estado){
      if (estado.state.toLowerCase().indexOf(key) != -1){
        is_in_states = true;
      }
    });
    if(descritor.descriptor_name.toLowerCase().indexOf(key) != -1 || is_in_states){
      escreverDescritor(descritor);
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
      escreverEspecie(especie, "#especiesElegiveis");
    }
  });*/
}

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
  $(".descritor").empty();
  $("#especiesDescartadas").empty();
  $("#descritoresSelecionados").empty();
  descritoresElegiveis = [];

  $.post("/api/Identification/identify", {param: query}, function(data){

    var ids = data.response.eligibleItems.map(function(item) {return item.id;});
    var species_query = {where: {id: {inq: ids}}};

    $.getJSON("/api/Species/", {filter : species_query}, function(especies){

      /* especies */
      especies.forEach(function(especie){
        escreverEspecie(especie, "#especiesElegiveis");
      });

      /* descritores */
      // apenas se houver ainda mais de uma especie
      if (especies.length > 1){
        //TODO: Agregador de descritores
        data.response.eligibleStates.forEach(function(descritor){
          /* apenas escrever descritores com mais de um estado */
          if(descritor.states.length > 1){
            descritoresElegiveis.push(descritor);
            escreverDescritor(descritor);
          }
        });
      }

      $(".accordion").accordion("refresh");
      escreverDescartados(ids, query);
    });
  });
}

function escreverDescartados(ids, query){
  $.post("/api/Identification/identify", {}, function(data){

    var excluding_ids = $.map( data.response.eligibleItems, function(item) { if(ids.indexOf(item.id) == -1){ return item.id;}});
    var excluding_species_query = {where: {id: {inq: excluding_ids}}};

    if(excluding_ids.length > 0){
      $.getJSON("/api/Species/", {filter : excluding_species_query}, function(especies){

        /* especies descartadas */
        especies.forEach(function(especie){
          escreverEspecie(especie, "#especiesDescartadas");
        });

        /* descritores selecionados */
        query.forEach(function(estado){
          $("#descritoresSelecionados").append("<h3>" + estado.descriptor + ": " + estado.state + "</h3>");
        });
      });
    }
  });
};

function escreverEspecie(especie, nicho){
  $(nicho).append("<div class='especies' id = " + especie.id + "></div>");
  $(nicho + " > #" + especie.id).append("<img src='img/lspm.jpg'>");
  $(nicho + " > #" + especie.id).append("<div class='nsp'></div>");

  $.getJSON("/api/Specimens/" + especie.specimens[0].id, {}, function(especime){
    var nome = especime['dwc:scientificName'].value;
    var autor = especime['dwc:scientificNameAuthorship'].value;
    var familia = especime['dwc:family'].value;

    $(nicho + " > #" + especie.id + " > .nsp").append("<a href='/profile/species/" + especie.id + "' target='_blank' ><p class='nomesp'><i>" + nome + " </i>" + autor + "</p></a>");
    $(nicho + " > #" + especie.id + " > .nsp").append("<p class='famisp'>" + familia + "</p>");
  });
}

function escreverDescritor(descritor){
  //TODO: usar ids para consultar Schema
  $(".descritor").append("<h3>" + descritor.descriptor_name + "</h3>");
  $(".descritor").append("<ul class='valoresi'></ul>");

  descritor.states.forEach(function(estado){
    $(".descritor ul").last().append("<input name='" + descritor.descriptor_name + ":" + estado.state + "' type='checkbox' class='vimagens'><p><!-- Imagem representante do valor fixo --><img src='/img/lspm.jpg' class='vimg'><!-- Link e icone para o glossário --><a href='#' target='_blank'><img src='/img/glo.png' class='vglos'></a>" + estado.state + " - " + estado.count + "</p></input>");
  });
}
