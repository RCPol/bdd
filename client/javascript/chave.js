function Identification() {
  this.internacionalization = new Internacionalization();
  this.internacionalization.siteTranslator().keyTranslator()
  this.internacionalization.base = 'eco';
  this.species = {};
  this.descriptors = {};
  this.eligibleSpecies = {};
  this.eligibleCategories = {};
  this.eligibleDescriptors = {};
  this.eligibleStates = {};
  this.selectedStates = {};
  this.definedNumericals = {};
  this.base = 'eco';
  this.tooltipConfig();
}
Identification.prototype.tooltipConfig = function() {
  var self = this;
  $( document ).tooltip({
    items: ".lala",
    content: function(callback) {      
      // callback("teste");
      var element = $( this );
      if ( element.is( ".vglos" )) {
        var id = element.attr( "alt" );
        $.get("/profile/glossary/individual/"+self.base+"/"+id,function(data) {         
          callback(data);
        });
      } 
      else if (element.is( ".lala" ) ) {
        // console.log("ALT: ",element.attr( "alt" ));
        var parsedAlt = element.attr( "alt" ).split("|");
        // console.log("PARSED ALT: ",parsedAlt);
        var category = parsedAlt[1];        
        var descriptor = parsedAlt[0];
        $.get("/api/Schemas/findOne?filter[where][category]="+category+"&filter[where][field]="+descriptor,function(rs) {          
          $.get("/profile/glossary/individual/"+self.base+"/"+rs.id,function(data) {
            callback(data);
          });
        });        
      }
      return '<img src="/img/loader.gif"/>';
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
  $.getJSON("/api/Species?filter[where][base]="+self.base+"&filter[where][language]="+self.internacionalization.language+"&filter[fields]["+self.base+":"+self.internacionalization.language+":rcpol:Image:plantImage]=true&filter[fields]["+self.base+":"+self.internacionalization.language+":rcpol:Image:flowerImage]=true&filter[fields]["+self.base+":"+self.internacionalization.language+":rcpol:Image:allPollenImage]=true&filter[fields][id]=true&filter[fields]["+self.base+":"+self.internacionalization.language+":dwc:Taxon:vernacularName]=true&filter[fields][id]=true&filter[fields]["+self.base+":"+self.internacionalization.language+":dwc:Taxon:scientificName]=true&filter[fields]["+self.base+":"+self.internacionalization.language+":dwc:Taxon:family]=true&filter[fields]["+self.base+":"+self.internacionalization.language+":dwc:Taxon:scientificNameAuthorship]=true&filter[fields]["+self.base+":"+self.internacionalization.language+":dwc:Taxon:vernacularName]=true&filter[order][0]="+self.base+":"+self.internacionalization.language+":dwc:Taxon:family.value%20ASC&filter[order][1]="+self.base+":"+self.internacionalization.language+":dwc:Taxon:scientificName.value%20ASC", function(data){          
    var species = data;
    species.forEach(function(sp) {      
      self.species[sp.id] = {};
      self.species[sp.id].id = sp.id;
      self.species[sp.id].htmlId = sp.id.htmlId();            
      self.species[sp.id].scientificName = sp[self.base+":"+self.internacionalization.language+":dwc:Taxon:scientificName"].value;            
      self.species[sp.id].family = sp[self.base+":"+self.internacionalization.language+":dwc:Taxon:family"].value;
      self.species[sp.id].scientificNameAuthorship = sp[self.base+":"+self.internacionalization.language+":dwc:Taxon:scientificNameAuthorship"].value;
      self.species[sp.id].vernacularName = sp[self.base+":"+self.internacionalization.language+":dwc:Taxon:vernacularName"]?sp[self.base+":"+self.internacionalization.language+":dwc:Taxon:vernacularName"].value:"";
      self.species[sp.id].html = $("<div class='especies' id = " + self.species[sp.id].htmlId + "></div>");
      self.species[sp.id].thumbnail = sp[self.base+":"+self.internacionalization.language+":rcpol:Image:flowerImage"]?sp[self.base+":"+self.internacionalization.language+":rcpol:Image:flowerImage"].images[0].thumbnail:sp[self.base+":"+self.internacionalization.language+":rcpol:Image:plantImage"]?sp[self.base+":"+self.internacionalization.language+":rcpol:Image:plantImage"].images[0].thumbnail:sp[self.base+":"+self.internacionalization.language+":rcpol:Image:allPollenImage"]?sp[self.base+":"+self.internacionalization.language+":rcpol:Image:allPollenImage"].images[0].thumbnail:"img/lspm.jpg"
      self.species[sp.id].html.append("<a href='/profile/species/"+self.base+"/" + sp.id + "' target='_blank' ><img id='_img_"+self.species[sp.id].htmlId+"' src='"+self.species[sp.id].thumbnail+"' onerror='imageError(this)'/></a>");
      self.species[sp.id].html.append("<div class='nsp'></div>");
      self.species[sp.id].html.find(".nsp").append("<a href='/profile/species/"+self.base+"/" + sp.id + "' target='_blank' ><p class='famisp'>" + self.species[sp.id].family + "</p></a>");
      self.species[sp.id].html.find(".nsp").append("<a href='/profile/species/"+self.base+"/" + sp.id + "' target='_blank' ><p class='nomesp'><i>" + self.species[sp.id].scientificName+ " </i>" + self.species[sp.id].scientificNameAuthorship + "</p></a>");
      self.species[sp.id].html.find(".nsp").append("<a href='/profile/species/"+self.base+"/" + sp.id + "' target='_blank' ><p class='popn'>" + self.species[sp.id].vernacularName + "</p></a>");
    });
    callback();
  });
  return this;
}
Identification.prototype.createDescriptors = function(callback) {
  var self = this;
  $.getJSON("/api/Schemas?filter[where][base]="+self.base+"&filter[where][language]="+self.internacionalization.language+"&filter[where][class]=State&filter[order]=order"/*, { filter : query }*/, function(states){
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
        self.descriptors[state.category][state.field].html = $("<li><section class='toggle'><span>+</span>" + self.descriptors[state.category][state.field].value + "<a target='_blank' href='/profile/glossary/"+self.base+"/"+self.descriptors[state.category][state.field].value+"'><img alt='"+self.descriptors[state.category][state.field].value+"|"+self.descriptors[state.category].value+"' src='img/"+self.base+"_glo.png' class='lala'></a></section><div id='"+self.descriptors[state.category][state.field].htmlId+"'class='valoresi inner show' style='display: block;'></div></li>");
        // self.descriptors[state.category][state.field].html.find("li").append("<div class='valoresn inner'><input name='" + self.descriptors[state.category][state.field].htmlId +"' type='text' class='numnum' size='5' maxlength='12' placeholder='00.00'> un </div>");
      }
      // STATE
      if(typeof self.descriptors[state.category][state.field][state.state] == "undefined"){
        self.descriptors[state.category][state.field][state.state] = self.descriptors[state.category][state.field][state.state]?self.descriptors[state.category][state.field][state.state]:{};
        self.descriptors[state.category][state.field][state.state].htmlId = "state_"+(state.category+state.field+state.state).htmlId();
        self.descriptors[state.category][state.field][state.state].value = state.state;
        self.descriptors[state.category][state.field][state.state].id = state.id;
        self.descriptors[state.category][state.field][state.state].html = $('<div onclick="identification.selectState(\''+state.id+'\').identify();" class="vimagens" id="'+self.descriptors[state.category][state.field][state.state].htmlId+'" name="'+state.id+'"><p><img src="'+stateImg+'" onerror=\'imageError(this)\' class="vimg mCS_img_loaded" id="desc_for_Planta_img_19ec1de76b8f8798054c5bdc3a74abb6"><a href="/profile/glossary/'+self.base+'/19ec1de76b8f8798054c5bdc3a74abb6" target="_blank"><img alt="'+self.descriptors[state.category][state.field][state.state].id+'" src="/img/'+self.base+'_glo.png" class="lala vglos mCS_img_loaded"></a>  '+self.descriptors[state.category][state.field][state.state].value+' <span id="count_'+self.descriptors[state.category][state.field][state.state].htmlId+'"></span></p></div>');
      }
    });
    callback();
  });
  return this;
}
Identification.prototype.printSpecies = function() {
  var self = this;
  // $("#speciesCount").html(Object.keys(self.eligibleSpecies).length);
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
              $("#count_"+self.descriptors[idCategory][idDescriptor][idState].htmlId).html("<br><a href='#' onclick='identification.unselectState(\""+self.descriptors[idCategory][idDescriptor][idState].id+"\")'><img style='width:20px;margin-top:5px' src='img/"+self.base+"_x.png'/></a>")
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
  var query = {filter:self.filter, base:self.base, language:self.internacionalization.language, states:Object.keys(self.selectedStates).map(function(item){return {"states.states.id":item}}), numerical:self.definedNumericals}
  self.printDescriptors();
  $.get("/api/Identification/identify", {param: query}, function(data){
    self.eligibleSpecies = {};
    // console.log("ELIGIBLE SPECIES: ",data.response.eligibleSpecies);
    data.response.eligibleSpecies.forEach(function(remoteEligibleSpecies) {      
      self.eligibleSpecies[remoteEligibleSpecies.id] = true;
    });
    self.printSpecies();
    self.eligibleStates = {};
    data.response.eligibleStates.forEach(function(remoteEligibleState) {
        // console.log("ELIGIBLE STATES: ",data.response.eligibleStates);
        self.eligibleStates[remoteEligibleState._id] = {count: remoteEligibleState.count}
    });
    self.printDescriptors();
  });
  return this;
};

