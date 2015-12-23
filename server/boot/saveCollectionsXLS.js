var xlsx = require('node-xlsx');
var hash = require('object-hash');
module.exports = function(app) {
  // var data = xlsx.parse(__dirname + '/template-palinotecas.xlsx')[0].data;
  // var schema = data[0];
  // var collumns = data[1];
  // var idIndexes = [collumns.indexOf("Institution code"),collumns.indexOf("Collection code")];
  // var logs = [];
  // var collections = [];
  //
  // if(tableValidation(idIndexes)){
  //   for(var i = 2; i < data.length; i++){
  //     var log = [];
  //     var collection = {};
  //     collection.id = defineId(i,idIndexes);
  //     if(collection.id){
  //       for(var j = 0; j < collumns.length; j++){
  //         collection[collumns[j]] = {}
  //         collection[collumns[j]].value = data[i][j];
  //         collection[collumns[j]].schema = schema[j].split(":")[0].trim();
  //         //DWC
  //         if(collection[collumns[j]].schema=="dwc"){
  //           if(schema[j].split(":")[1])
  //             collection[collumns[j]].term = schema[j].split(":")[1].trim();
  //         //IMAGE
  //         } else if(collection[collumns[j]].schema.indexOf("image")!=-1){
  //           collection[collumns[j]].schema = "image";
  //           if(schema[j].split(":")[1])
  //             collection[collumns[j]].category = schema[j].split(":")[1].trim();
  //           else
  //             collection[collumns[j]].category = "Outro";
  //           if(typeof collection[collumns[j]].value === "string")
  //             collection[collumns[j]].url = collection[collumns[j]].value.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
  //         }
  //       }
  //       collections.push(collection);
  //       collections.push(log);
  //       console.log("Data:", (collection));
  //       console.log("Log:", JSON.stringify(log));
  //     }
  //     else{
  //       log.push("Was not possible to generate ID");
  //       console.log("Log:", JSON.stringify(log));
  //     }
  //   }
  // }else{
  //   logs.push("There isn't the enought collumns for generates IDs");
  // }
  //
  //
  // function defineId(i,idIndexes) {
  //   var idValue = '';
  //   for(var j = 0; j < idIndexes.length; j++){
  //     if(!data[i][j] || (data[i][j]+" ").trim()=='')
  //       return null;
  //     idValue = idValue+":"+ data[i][j];
  //   };
  //   return hash.MD5(idValue);
  // }
  //
  // function tableValidation(idIndexes){
  //   // Check if there is fields enought to define an ID
  //   for(var i = 0; i < idIndexes.length; i++){
  //     if(idIndexes[i]==-1)
  //       return false
  //   }
  //   return true;
  // }

}
