 function Internacionalization() {
  this.language = "pt-BR";  
  this.base = 'eco';
  if(localStorage){
    this.language = typeof localStorage.language!="undefined"?localStorage.language:this.language;
  } else alert("O seu navegador de Internet pode não suportar alguns dos recursos utilizados por este sistema.\n Para uma melhor experiência, por favor, atualize o seu navegador ou utilize outro de sua preferência.");  
}
Internacionalization.prototype.setLanguage = function(language){
  var self = this;
  self.language = language;
  localStorage.language = self.language;
  self.updateLogo();  
  return this;
}
Internacionalization.prototype.updateLogo = function(){  
  var self = this;
  $('.logo > img').attr('src','/img/logo_'+self.base+'_'+self.language+'.png');
  return this;
}
Internacionalization.prototype.siteTranslator = function(){
  var self = this;
  $('#base_selector').html('');  
  $.getJSON("/api/Schemas?filter=%7B%22where%22%3A%7B%22class%22%3A%22SiteLabel%22%2C%22language%22%3A%22"+self.language+"%22%2C%22base%22%3A%22"+self.base+"%22%7D%7D", function(data){
    // console.log("LOG: ",data);
    data.forEach(function(label) {
      if(label.term=="baseTaxon"){
        $('#base_selector').append('<option value="taxon">'+label.field+'</option>');            
      } else if(label.term=="baseEco"){
        $('#base_selector').append('<option value="eco">'+label.field+'</option>');            
      } else if(label.term=="basePaleo"){
        $('#base_selector').append('<option value="paleo">'+label.field+'</option>');            
      } else if(label.term=="siteSearch"){
        $(".formbusca > :text").attr("placeholder",label.field);
      } else if(label.term=="citation"){
        var field = label.field;
        var formattedDate = "";
        var date = new Date();
        var day = date.getDate();
        var monthIndex = date.getMonth();
        var year = date.getFullYear();
        if(self.language=="en-US"){
          formattedDate = monthIndex+"/"+day+"/"+year;
        } else formattedDate = day+"/"+monthIndex+"/"+year;
        field = field+" "+formattedDate;
        $("#"+label.schema+"-"+label["class"]+"-"+label.term).html(field);
      } else 
      // if(label.term=="siteClean"){
      //   $(".formbusca > :reset").val(label.field)
      // } else
        $("#"+label.schema+"-"+label["class"]+"-"+label.term).html(label.field);
    });
  });
  return this;
}
Internacionalization.prototype.profileTranslator = function(){
  var self = this;
  $.getJSON("/api/Schemas?filter=%7B%22where%22%3A%7B%22class%22%3A%22ProfilesLabel%22%2C%22language%22%3A%22"+self.language+"%22%2C%22base%22%3A%22"+self.base+"%22%7D%7D", function(data){
    data.forEach(function(label) {
      $("#"+label.schema+"-"+label["class"]+"-"+label.term).html(label.field);
    });
  });
  return this;
}
Internacionalization.prototype.interactionTranslator = function(){
  var self = this;
  $.getJSON("/api/Schemas?filter=%7B%22where%22%3A%7B%22class%22%3A%22InteractionLabel%22%2C%22language%22%3A%22"+self.language+"%22%2C%22base%22%3A%22"+self.base+"%22%7D%7D", function(data){
    data.forEach(function(label) {
      $("#"+label.schema+"-"+label["class"]+"-"+label.term).html(label.field);
    });
  });
  return this;
}
Internacionalization.prototype.keyTranslator = function(){
  var self = this;
  $.getJSON("/api/Schemas?filter=%7B%22where%22%3A%7B%22class%22%3A%22KeyLabel%22%2C%22language%22%3A%22"+self.language+"%22%2C%22base%22%3A%22"+self.base+"%22%7D%7D", function(data){
    data.forEach(function(label) {
      $("#"+label.schema+"-"+label["class"]+"-"+label.term).html(label.field);
    });
  });
  return this;
}
