function Filter(identification) {  
  this.identification = identification;  
}
Filter.prototype.getVocabulary = function(prefix,field,label){
  var self = this;  
  $.get("/api/Specimens/aggregationByField?prefix="+prefix+"&base="+self.identification.base+"&lang="+self.identification.internacionalization.language+"&field="+field,function(rs) {     
    var selector = field.split(":").slice(-3).join("-");      
    $('#selected-'+selector).html('<option value=""></option>');
    
    rs.response.values.forEach(function(item) {      
      $('#selected-'+selector).append('<option value="'+item._id+'">'+item._id+'</option>');      
    });    
    $('#selected-'+selector).unbind('change')
    $('#selected-'+selector).on('change', function(e) {
      self.identification.filter = self.identification.filter?self.identification.filter:{};
      
      if(this.value == '')
        delete self.identification.filter[field];  
      else {        
        self.identification.filter[field] = this.value;
      }
      self.identification.identify();
    });    
  });  
  return this;
}
// Filter.prototype.setAutocomplete = function(elementId) {
//   var self = this;  
//   $.widget( "custom.catcomplete", $.ui.autocomplete, {
//       _create: function() {
//         this._super();
//         this.widget().menu( "option", "items", "> :not(.ui-autocomplete-category)" );
//       },
//       _renderMenu: function( ul, items ) {
//         var self = this,
//           currentCategory = "";
//         $.each( items, function( index, item ) {
//           var li;
//           if ( item.category != currentCategory ) {
//             ul.append( "<li class='ui-autocomplete-category'><b>" + item.category + "</b></li>" );
//             currentCategory = item.category;
//           }
//           li = self._renderItemData( ul, item );
//           if ( item.category ) {
//             li.attr( "aria-label", item.category + " : " + item.label );
//           }
//         });
//       }
//   });
//   var data = [];
//   if(Object.keys(self.values)){
//     Object.keys(self.values).forEach(function(field) {    
//       self.values[field].values.forEach(function(item) {     
//         if(item._id)
//           data.push({label:item._id,category:self.values[field].label,field:field});
//       });
//     });   
//   }  
//   $( "#"+elementId ).catcomplete({
//     delay: 0,
//     source: data,
//     select: function(event, ui) {
//       var id = ui.item.field.split(":").slice(-3).join("-");      
//       var rmv = ' <a style="font-size:10px; color:darkgrey" href="javascript:filter.cleanField(\''+id+'\')"> Limpar</a>';
//       $("#selected-"+id).html(ui.item.value+" "+rmv);
//       $("#selected-"+id).css("color","darkorange");            
//       self.identification.filter = self.identification.filter?self.identification.filter:{};
//       // if(ui.item.field.split(":")[2]=="Collection")
//         self.identification.filter[ui.item.field] = ui.item.value;
//       // else
//         // self.identification.filter[self.identification.base+":"+self.identification.internacionalization.language+":"+ui.item.field] = ui.item.value;
//       ui.item.value = '';
//       self.identification.identify();
//     }
//   });
// }
// Filter.prototype.cleanField = function(id) {   
//   $("#selected-"+id).html("<i>nenhum</i>");
//   $("#selected-"+id).css("color","darkgrey");
//   id = id.split("-").join(":"); 
//   if(ui.item.field.split(":")[1]=="Collection")
//     delete self.identification.filter[self.identification.internacionalization.language+":"+id];
//   else
//     delete self.identification.filter[self.identification.base+":"+self.identification.internacionalization.language+":"+id];
  
//   self.identification.identify();
// }