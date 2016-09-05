function Identification() {
  this.internacionalization = new Internacionalization();
  this.internacionalization.siteTranslator().keyTranslator();
  this.species = {};
  this.descriptors = {};
  this.eligibleSpecies = {};
  this.eligibleCategories = {};
  this.eligibleDescriptors = {};
  this.eligibleStates = {};
  this.selectedStates = {};
  this.definedNumericals = {};
  this.tooltipConfig();
}
Identification.prototype.tooltipConfig = function() {
  $( document ).tooltip({
    items: "img",
    content: function(callback) {
      // callback("teste");
      var element = $( this );
      if ( element.is( ".vglos" )) {
        var id = element.attr( "alt" );
        $.get("/profile/glossary/individual/"+id,function(data) {         
          callback(data);
        });
      } 
      else if (element.is( ".lala" ) ) {
        console.log("ALT: ",element.attr( "alt" ));
        var parsedAlt = element.attr( "alt" ).split("|");
        console.log("PARSED ALT: ",parsedAlt);
        var category = parsedAlt[1];        
        var descriptor = parsedAlt[0];
        $.get("/api/Schemas/findOne?filter[where][category]="+category+"&filter[where][field]="+descriptor,function(rs) {          
          $.get("/profile/glossary/individual/"+rs.id,function(data) {
            callback(data);
          });
        });        
      }
    }
  });
}
Identification.prototype.startup = function() {
  $("#category").html("");
  $("#descritoresSelecionados").html("");
  $("#especiesElegiveis").html("");
  $("#especiesDescartadas").html("");
  this.species = {};
  this.descriptors = {};
  this.eligibleSpecies = {};
  this.eligibleCategories = {};
  this.eligibleDescriptors = {};
  this.eligibleStates = {};
  this.selectedStates = {};
  this.definedNumericals = {};
  console.time("load species");
  console.time("load descriptors");
  var self = this;
  self.createSpecies(function() {
    Object.keys(self.species).forEach(function(id) {
      self.eligibleSpecies[id] = true;
    });
    self.printSpecies();

  }).createDescriptors(function() {
    Object.keys(self.descriptors).forEach(function(idCategory) {
      self.eligibleCategories[idCategory] = true;
      Object.keys(self.descriptors[idCategory]).forEach(function(idDescriptor) {
        self.eligibleDescriptors[idCategory+":"+idDescriptor] = true;
        Object.keys(self.descriptors[idCategory][idDescriptor]).forEach(function(idState) {
          self.eligibleStates[self.descriptors[idCategory][idDescriptor][idState].id] = {count:null};
        });
      });
    });
    self.printDescriptors();
    self.identify();
  });
}
Identification.prototype.translate = function(language) {
  var self = this;
  self.internacionalization.setLanguage(language).siteTranslator().keyTranslator();
  self.startup();
  return this;
}
Identification.prototype.selectState = function(id) {
  var self = this;
  if(typeof self.selectedStates[id] == "undefined")
    self.selectedStates[id] = true;
  else
    delete self.selectedStates[id];
  return this;
}
Identification.prototype.removeAll = function() {
  var self = this;
  self.selectedStates = {}
  self.printDescriptors();
  Object.keys(self.species).forEach(function(id) {
    self.eligibleSpecies[id] = true;
  });
  self.printSpecies();
  self.identify();
  return this;
}
Identification.prototype.unselectState = function(id) {
  var self = this;
  self.eligibleStates[id] = {count:null}
  // delete self.selectedStates[id];
  self.identify();
  return this;
}
Identification.prototype.createSpecies = function(callback) {
  var self = this;
  $.getJSON("/api/Species?filter[where][language]="+self.internacionalization.language+"&filter[fields]["+self.internacionalization.language+":rcpol:Image:plantImage]=true&filter[fields]["+self.internacionalization.language+":rcpol:Image:flowerImage]=true&filter[fields]["+self.internacionalization.language+":rcpol:Image:allPollenImage]=true&filter[fields][id]=true&filter[fields]["+self.internacionalization.language+":dwc:Taxon:vernacularName]=true&filter[fields][id]=true&filter[fields]["+self.internacionalization.language+":dwc:Taxon:scientificName]=true&filter[fields]["+self.internacionalization.language+":dwc:Taxon:family]=true&filter[fields]["+self.internacionalization.language+":dwc:Taxon:scientificNameAuthorship]=true&filter[fields]["+self.internacionalization.language+":dwc:Taxon:vernacularName]=true&filter[order][0]="+self.internacionalization.language+":dwc:Taxon:family%20ASC&filter[order][1]="+self.internacionalization.language+":dwc:Taxon:scientificName%20ASC"/*, { filter : query }*/, function(species){
    species.forEach(function(sp) {
      self.species[sp.id] = {};
      self.species[sp.id].id = sp.id;
      self.species[sp.id].htmlId = sp.id.htmlId();
      self.species[sp.id].scientificName = sp[self.internacionalization.language+":dwc:Taxon:scientificName"].value;
      self.species[sp.id].family = sp[self.internacionalization.language+":dwc:Taxon:family"].value;
      self.species[sp.id].scientificNameAuthorship = sp[self.internacionalization.language+":dwc:Taxon:scientificNameAuthorship"].value;
      self.species[sp.id].vernacularName = sp[self.internacionalization.language+":dwc:Taxon:vernacularName"]?sp[self.internacionalization.language+":dwc:Taxon:vernacularName"].value:"";
      self.species[sp.id].html = $("<div class='especies' id = " + self.species[sp.id].htmlId + "></div>");
      self.species[sp.id].thumbnail = sp[self.internacionalization.language+":rcpol:Image:flowerImage"]?sp[self.internacionalization.language+":rcpol:Image:flowerImage"].images[0].thumbnail:sp[self.internacionalization.language+":rcpol:Image:plantImage"]?sp[self.internacionalization.language+":rcpol:Image:plantImage"].images[0].thumbnail:sp[self.internacionalization.language+":rcpol:Image:allPollenImage"]?sp[self.internacionalization.language+":rcpol:Image:allPollenImage"].images[0].thumbnail:"img/lspm.jpg"
      self.species[sp.id].html.append("<a href='/profile/species/" + sp.id + "' target='_blank' ><img id='_img_"+self.species[sp.id].htmlId+"' src='"+self.species[sp.id].thumbnail+"' onerror='imageError(this)'/></a>");
      self.species[sp.id].html.append("<div class='nsp'></div>");
      self.species[sp.id].html.find(".nsp").append("<a href='/profile/species/" + sp.id + "' target='_blank' ><p class='famisp'>" + self.species[sp.id].family + "</p></a>");
      self.species[sp.id].html.find(".nsp").append("<a href='/profile/species/" + sp.id + "' target='_blank' ><p class='nomesp'><i>" + self.species[sp.id].scientificName+ " </i>" + self.species[sp.id].scientificNameAuthorship + "</p></a>");
      self.species[sp.id].html.find(".nsp").append("<a href='/profile/species/" + sp.id + "' target='_blank' ><p class='popn'>" + self.species[sp.id].vernacularName + "</p></a>");
    });
    callback();
  });
  return this;
}
Identification.prototype.createDescriptors = function(callback) {
  var self = this;
  $.getJSON("/api/Schemas?filter[where][language]="+self.internacionalization.language+"&filter[where][class]=State&filter[order]=order"/*, { filter : query }*/, function(states){
    states.forEach(function(state) {
      var stateImg  = typeof state.images != "undefined" && state.images.length && state.images.length>0 && state.images[0].thumbnail ?state.images[0].thumbnail:"img/lspm.jpg";
      // CATEGORY
      if(typeof self.descriptors[state.category] == "undefined"){
        self.descriptors[state.category] = self.descriptors[state.category]?self.descriptors[state.category]:{};
        self.descriptors[state.category].htmlId = "category_"+state.category.htmlId();
        self.descriptors[state.category].value = state.category;
        self.descriptors[state.category].html = $('<li><a id="'+self.descriptors[state.category].htmlId+'" class="toggle" href="javascript:void(0);"><span>+</span> '+self.descriptors[state.category].value+' </a><ul id="descriptors" class="descritor inner"></ul></li>');
      }
      // DESCRIPTOR
      if(typeof self.descriptors[state.category][state.field] == "undefined"){
        self.descriptors[state.category][state.field] = self.descriptors[state.category][state.field]?self.descriptors[state.category][state.field]:{};
        self.descriptors[state.category][state.field].htmlId = "descriptor_"+(state.category+state.field).htmlId();
        self.descriptors[state.category][state.field].value = state.field;
        self.descriptors[state.category][state.field].html = $("<li><section class='toggle'><span>+</span>" + self.descriptors[state.category][state.field].value + "<a target='_blank' href='/profile/glossary/"+self.descriptors[state.category][state.field].value+"'><img alt='"+self.descriptors[state.category][state.field].value+"|"+self.descriptors[state.category].value+"' src='img/glo.png' class='lala'></a></section><div id='"+self.descriptors[state.category][state.field].htmlId+"'class='valoresi inner show' style='display: block;'></div></li>");
        // self.descriptors[state.category][state.field].html.find("li").append("<div class='valoresn inner'><input name='" + self.descriptors[state.category][state.field].htmlId +"' type='text' class='numnum' size='5' maxlength='12' placeholder='00.00'> un </div>");
      }
      // STATE
      if(typeof self.descriptors[state.category][state.field][state.state] == "undefined"){
        self.descriptors[state.category][state.field][state.state] = self.descriptors[state.category][state.field][state.state]?self.descriptors[state.category][state.field][state.state]:{};
        self.descriptors[state.category][state.field][state.state].htmlId = "state_"+(state.category+state.field+state.state).htmlId();
        self.descriptors[state.category][state.field][state.state].value = state.state;
        self.descriptors[state.category][state.field][state.state].id = state.id;
        self.descriptors[state.category][state.field][state.state].html = $('<div onclick="identification.selectState(\''+state.id+'\').identify();" class="vimagens" id="'+self.descriptors[state.category][state.field][state.state].htmlId+'" name="'+state.id+'"><p><img src="'+stateImg+'" onerror=\'imageError(this)\' class="vimg mCS_img_loaded" id="desc_for_Planta_img_19ec1de76b8f8798054c5bdc3a74abb6"><a href="/profile/glossary/19ec1de76b8f8798054c5bdc3a74abb6" target="_blank"><img alt="'+self.descriptors[state.category][state.field][state.state].id+'" src="/img/glo.png" class="vglos mCS_img_loaded"></a>  '+self.descriptors[state.category][state.field][state.state].value+' <span id="count_'+self.descriptors[state.category][state.field][state.state].htmlId+'"></span></p></div>');
      }
    });
    callback();
  });
  return this;
}
Identification.prototype.printSpecies = function() {
  var self = this;
  $("#speciesCount").html(Object.keys(self.eligibleSpecies).length);
  Object.keys(self.species).forEach(function(id) {
      self.species[id].html.detach().appendTo(self.eligibleSpecies[id]?"#especiesElegiveis":"#especiesDescartadas");// species is eligible
  });
  console.timeEnd("load species");
  console.timeEnd("Identify");
}
Identification.prototype.printDescriptors = function() {
  var self = this;
  Object.keys(self.descriptors).forEach(function(idCategory) {
    // IS CATEGORY ELIGIBLE?
    if(self.eligibleCategories[idCategory]){
      self.descriptors[idCategory].html.appendTo($("#category"));
    }
    var descriptorCount = 0;
    Object.keys(self.descriptors[idCategory]).forEach(function(idDescriptor) {
      if(self.descriptors[idCategory][idDescriptor].value){
        // IS DESCRIPTOR ELIGIBLE?
        if(self.eligibleDescriptors[idCategory+":"+idDescriptor]){
          descriptorCount++;
          self.descriptors[idCategory][idDescriptor].html.appendTo($("#"+self.descriptors[idCategory].htmlId).next("#descriptors"));
        }
      }
      var stateCount = 0;
      Object.keys(self.descriptors[idCategory][idDescriptor]).forEach(function(idState) {
        if(typeof self.descriptors[idCategory][idDescriptor][idState].value != "undefined"){
          if(self.descriptors[idCategory][idDescriptor][idState].value){
            // default
            $("#count_"+self.descriptors[idCategory][idDescriptor][idState].htmlId).html("(0)")
            // IS STATE ELIGIBLE?
            if(self.eligibleStates[self.descriptors[idCategory][idDescriptor][idState].id] && (self.eligibleStates[self.descriptors[idCategory][idDescriptor][idState].id].count==null || self.eligibleStates[self.descriptors[idCategory][idDescriptor][idState].id].count<Object.keys(self.eligibleSpecies).length)){
              stateCount++;
              self.descriptors[idCategory][idDescriptor][idState].html.detach().appendTo($("#"+self.descriptors[idCategory][idDescriptor].htmlId));
              if(self.eligibleStates[self.descriptors[idCategory][idDescriptor][idState].id].count!=null){
                $("#count_"+self.descriptors[idCategory][idDescriptor][idState].htmlId).html("("+self.eligibleStates[self.descriptors[idCategory][idDescriptor][idState].id].count+")")
              } else {
                $("#count_"+self.descriptors[idCategory][idDescriptor][idState].htmlId).html("(0)")
              }
            } else {
              self.descriptors[idCategory][idDescriptor][idState].html.detach();
            }
            // IS SELECTED STATE?
            if(self.selectedStates[self.descriptors[idCategory][idDescriptor][idState].id]){
              self.descriptors[idCategory][idDescriptor][idState].html.detach().appendTo($("#descritoresSelecionados"));
              $("#count_"+self.descriptors[idCategory][idDescriptor][idState].htmlId).html("<br><a href='#' onclick='identification.unselectState(\""+self.descriptors[idCategory][idDescriptor][idState].id+"\")'><img style='width:20px;margin-top:5px' src='http://icons.iconarchive.com/icons/hopstarter/soft-scraps/24/Button-Close-icon.png'/></a>")
            }
          }
        }
      });
      // REMOVE UNELIGIBLE DESCRIPTOR
      if(self.descriptors[idCategory][idDescriptor].value&&stateCount==0){
        descriptorCount--;
        self.descriptors[idCategory][idDescriptor].html.detach();
      }
    });
    // REMOVE UNELIGIBLE CATEGORY
    if(self.descriptors[idCategory].value&&descriptorCount==0)
      self.descriptors[idCategory].html.detach();
  });
  console.timeEnd("load descriptors");
}
String.prototype.htmlId = function() {
    var target = this;
    return md5(target);
}
// Identification.prototype.selectState = function(state) {
//   this.selectedStates.push({id:state});
//   return this;
// }
Identification.prototype.definedNumerical = function(id,value) {
  this.definedNumericals.push({id:id,value:value});
  return this;
}

function imageError(img) {
  img.src = "img/lspm.jpg";
  img.onerror= "";
  return true;
}
Identification.prototype.identify = function() {
  console.time("Identify");
  var self = this;
  var query = {language:self.internacionalization.language, states:Object.keys(self.selectedStates).map(function(item){return {"states.states.id":item}}), numerical:self.definedNumericals}
  self.printDescriptors();
  $.get("/api/Identification/identify", {param: query}, function(data){
    self.eligibleSpecies = {};
    data.response.eligibleSpecies.forEach(function(remoteEligibleSpecies) {
      self.eligibleSpecies[remoteEligibleSpecies.id] = true;
    });
    self.printSpecies();
    self.eligibleStates = {};
    data.response.eligibleStates.forEach(function(remoteEligibleState) {
        self.eligibleStates[remoteEligibleState._id] = {count: remoteEligibleState.count}
    });
    self.printDescriptors();
  });
  return this;
};

// function composeQuery(){
//   // chamado pelo botão "identificar", Adiciona à query os estados selecionados
//   $(".selecionado").each( function(){
//     var name = $(this).attr('name');
//     query.push({state: name});
//   });
//   $(".numnum").each(function(){
//     if ($(this).val()){
//       query.push({descriptor: $(this).attr('name'), value: $(this).val()});
//     }
//   });
//   identify(query);
// }
//
// function resetQuery(){
//   // acionado pelo botão "remover todos", limpa a query
//   query = [];
//   identify(query);
// }
//
// function removeSelected(){
//   // acionado pelo botão "remover selecionados", remove da query apenas os estados selecioados
//   $("input:checked").each(function(){
//     var $this = $(this);
//     query = query.filter(function(elem){
//       if(elem.state == $this.attr('state') || elem.descriptor == $this.attr('state'))
//         return false;
//       else
//         return true;
//     });
//   });
//   identify(query);
// }
//
// function getImage(id, nicho, model){
//   // obtem imagem principal referente ao modelo
//   var url = '/api/' + model +'/mainImage?id=' + id;
//   $.getJSON(url, {}, function(res){
//     if (res.response && res.response != ""){
//       $(nicho+"_img_"+id).attr("src", res.response);
//     }
//   });
// }
//
// function writeSpecies(ids, nicho){
//   // adicionar espécies (id, imagem, familia, nome científico, nome popular) a alguma lista (ex: especiesDescartadas ou especiesElegiveis)
//   for (let id of ids){
//     $(nicho).append("<div class='especies' id = " + id + "></div>");
//
//     $(nicho + " > #" + id).append("<img id='"+nicho.slice(1,nicho.length)+"_img_"+id+"' src='img/lspm.jpg'>"); // imagem placeholder caso a imagem real não possa ser carregada
//     $(nicho + " > #" + id).append("<div class='nsp'></div>");
//     $(nicho + " > #" + id + " > .nsp").append("<p class='famisp'>" + speciesDb[id].family + "</p>");
//     $(nicho + " > #" + id + " > .nsp").append("<a href='/profile/species/" + id + "' target='_blank' ><p class='nomesp'><i>" + speciesDb[id].scientificName + " </i>" + speciesDb[id].scientificNameAuthorship + "</p></a>");
//     if (speciesDb[id].vernacularName != undefined)
//       $(nicho + " > #" + id + " > .nsp").append("<p class='popn'>" + speciesDb[id].vernacularName + "</p>");
//     getImage(id, nicho, "Species");
//     $(nicho + " > #" + id + " img").width(100).height(100);
//   };
// }
//
// function writeDescriptor(descritor, species_length){
//   if (descritor.class == "NumericalDescriptor"){
//     $("#desc_for_"+descritor.category_name).append("<li><section class='toggle'><span>+</span>" + descritor.descriptor_name + "<a target='_blank' href='/profile/glossary/"+descritor.descriptor_term+"'><img src='img/glo.png' class='lala'></a></section></li>");
//     $("#desc_for_"+descritor.category_name + " li").last().append("<div class='valoresn inner'><input name='" + descritor.schema + ":" + descritor.descriptor_term +"' type='text' class='numnum' size='5' maxlength='12' placeholder='00.00'> un </div>");
//   }
//
//   if (descritor.class == "CategoricalDescriptor"){
//     // adicionar um descritor e seus estados associados à lista de descritores
//     var copia_descritor = [];
//     descritor.states.forEach(function(estado){
//       if (estado.count < species_length){
//         // retirar estados com count >= species_length
//         copia_descritor.push(estado);
//       }
//     });
//
//     //TODO: usar ids para consultar Schema
//     // adicionar descritor, se houver algum estado
//     if (copia_descritor.length > 0){
//       $("#desc_for_"+descritor.category_name).append("<li><section class='toggle'><span>+</span>" + descritor.descriptor_name + "<a target='_blank' href='/profile/glossary/"+descritor.descriptor_term+"'><img src='img/glo.png' class='lala'></a></section></li>");
//       $("#desc_for_"+descritor.category_name + " li").last().append("<div class='valoresi inner'></div>");
//     }
//
//     // ordenar estados
//     copia_descritor.sort(function(a, b){
//       return parseInt(a.state.order) - parseInt(b.state.order);
//     });
//
//     copia_descritor.forEach(function(estado){
//       $("#desc_for_"+descritor.category_name + " li").last().find(".valoresi").append(
//         "<div class='vimagens' id='" + estado.state.value.split(":").join("-") + "' name='" + estado.state.value + "'>"
//           + "<p>"+
//           "<img src='/img/lspm.jpg' class='vimg' id='desc_for_"+ descritor.category_name +"_img_"+ estado.state.id +"'>"+
//           "<a href='/profile/glossary/" + estado.state.id + "' target='_blank'>"+
//           "<img src='/img/glo.png' class='vglos'>"+
//           "</a>  " + estado.state.value.split(":")[2] + " (" + estado.count+ ")" +
//           "</p></div>");
//
//       getImage(estado.state.id, "#desc_for_"+descritor.category_name, "Schemas");
//     });
//   }
// }
//
// function buscaDescritores(nothing) {
//   // buscar por estado ou descritor. Se nothing = true, retornar todos os descritores
//   $(".descritor").empty();
//   var key = $("#buscadescritores").val().trim().toLowerCase();
//   if (nothing) key = "";
//   eligibleDescriptor.forEach(function(descritor){
//     // checar se a palavra pesquisada é substring do descritor ou de algum estado deste descritor
//     var is_in_states = false;
//     descritor.states.forEach(function(estado){
//       if (estado.state.value.toLowerCase().indexOf(key) != -1){
//         is_in_states = true;
//       }
//     });
//     if(descritor.descriptor_name.toLowerCase().indexOf(key) != -1 || is_in_states){
//       writeDescriptor(descritor, Object.keys(eligibleSpeciesDb).length);
//     }
//   });
//   // expandir descritores
//   if (!nothing){
//     $('.open').trigger("click");
//   }
// }
//
// function buscaEspecies(nothing) {
//   // buscar na lista de espécies. Se nothing = true, retornar todas as espécies
//   var key = $("#buscaespecies").val().trim().toLowerCase();
//   if(nothing) key = "";
//   $("#especiesElegiveis div").each(function(){
//     if( $(this).find("p").text().toLowerCase().indexOf(key) === -1 ){
//       $(this).fadeOut();
//     }
//     else { // queremos que as outras divs fiquem invisiveis, mas que nao sejam deletadas
//            // caso o usuario precise resetar e fazer uma nova pesquisa
//       $(this).fadeIn();
//     }
//   });
// }
//
// function setDiscartedSpecies(){
//   // escrever espécies descartadas
//   var discartedSpeciesDb = Object.keys(speciesDb).filter(function(id){
//     if (eligibleSpeciesDb.indexOf(id) == -1){
//       return true;
//     } else {
//       return false;
//     }
//   });
//   writeSpecies(discartedSpeciesDb,"#especiesDescartadas");
// }
//
// function writeSelectedState(query){
//   // escrever estado selecionado na lista de descritores selecionados
//   query.forEach(function(selected, i){
//     if (selected.state){ // se for categórico
//       $.getJSON('/api/Schemas/'+selected.state.split(":")[1], function(schema){
//         $(".descel").append("<input state='" + selected.state +"' type='checkbox' id='idcheckbox" + i + "'><label for='idcheckbox" + i + "'>" + schema["rcpol:descriptor"].value + ": " + selected.state.split(":")[2] + "</label><br>");
//       });
//     } else if (selected.value) { // se for numérico
//       $.getJSON('/api/Schemas/'+selected.descriptor.split(":")[1], function(schema){
//         $(".descel").append("<input state='" + selected.descriptor +"' type='checkbox' id='idcheckbox" + i + "'><label for='idcheckbox" + i + "'>" + schema["rcpol:descriptor"].value + ": " + selected.value + "</label><br>");
//       });
//     }
//   });
// };
//
// function getSpeciesInfo(species, nicho, callback){
//   // obter nome científico, familia e nome popular da espécie e salvar em speciesDb
//   if(typeof speciesDb[species.id] == 'undefined'){
//     speciesDb[species.id] = {};
//     speciesDb[species.id].scientificName = species['dwc:scientificName'].value;
//     speciesDb[species.id].family = species['dwc:family'].value;
//     speciesDb[species.id].scientificNameAuthorship = species['dwc:scientificNameAuthorship'].value;
//     if (species['dwc:vernacularName'] != undefined)
//       speciesDb[species.id].vernacularName = species['dwc:vernacularName'].value.split("|");
//   }
// }
//
// function getSpecies(data, species_query, limit, offset, callback){
//   /* listas de especies */
//   $.getJSON("/api/Species?filter[fields][id]=true&filter[fields][dwc:scientificName]=true&filter[fields][dwc:family]=true&filter[fields][dwc:scientificNameAuthorship]=true&filter[fields][dwc:vernacularName]=true&filter[order][0]=dwc:family%20ASC&filter[order][1]=dwc:scientificName%20ASC&filter[limit]="+limit+"&filter[skip]="+offset, { filter : species_query }, function(species){
//     species.forEach(function(item){
//       eligibleSpeciesDb.push(item.id); // eligibleSpeciesDb será depois comparado com speciesDb para obter as espécies descartadas
//       getSpeciesInfo(item);
//     });
//     writeSpecies(eligibleSpeciesDb.slice(offset, offset+limit), "#especiesElegiveis");
//     if (species.length > 0)
//       getSpecies(data, species_query, limit, offset + limit, callback);
//     else
//       callback();
//   });
// }
//
// function getDescriptors(data){
//   /* listas de descritores */
//   // limpar descritores elegíveis
//   eligibleDescriptor = [];
//   data.response.eligibleStates.forEach(function(descriptor){
//     /* apenas escrever descritores não selecionados, com mais de um estado */
//     //TODO: numericos
//     var selected = false;
//     query.forEach(function(element){
//       if (!element.value && element.state.split(":")[1] == descriptor.descriptor_term){
//         selected = true;
//       }
//     });
//
//     if(descriptor.states.length > 1 && !selected){
//       eligibleDescriptor.push(descriptor);
//       writeDescriptor(descriptor, eligibleSpeciesDb.length);
//     }
//   });
//   $(".btnident").removeAttr('disabled');
//   if(eligibleSpeciesDb.length == 1){
//     window.open($("#especiesElegiveis .nsp > a").attr("href"));
//   }
// }
