// var xlsx = require('node-xlsx');
// var hash = require('object-hash');
// module.exports = function(app) {
//   var data = xlsx.parse(__dirname + '/template-especimes.xlsx')[0].data;
//   var schema = data[0];
//   var collumns = data[1];
//   var idIndexes = [collumns.indexOf("Código da Instituição"),collumns.indexOf("Código da Palinoteca"),
//                   collumns.indexOf("Numero de Catálogo da Palinoteca"),collumns.indexOf("Código do Herbário"),
//                   collumns.indexOf("Numero de Catálogo do Herbário")
//                 ];
//   var logs = [];
//   var specimens = [];
//
//   if(tableValidation(idIndexes)){
//     for(var i = 2; i < data.length; i++){
//       var log = [];
//       var specimen = {};
//       specimen.id = defineId(i);
//       if(specimen.id){
//         for(var j = 0; j < collumns.length; j++){
//           specimen[collumns[j]] = {}
//           specimen[collumns[j]].value = data[i][j];
//           specimen[collumns[j]].schema = schema[j].split(":")[0].trim();
//           //DWC
//           if(specimen[collumns[j]].schema=="dwc"){
//             if(schema[j].split(":")[1])
//               specimen[collumns[j]].term = schema[j].split(":")[1].trim();
//           //INTERACTION
//           } else if(specimen[collumns[j]].schema=="interaction"){
//             if(schema[j].split(":")[1])
//               specimen[collumns[j]].interactionType = schema[j].split(":")[1].trim();;
//           //IMAGE
//           } else if(specimen[collumns[j]].schema.indexOf("image")!=-1){
//             specimen[collumns[j]].schema = "image";
//             if(schema[j].split(":")[1])
//               specimen[collumns[j]].category = schema[j].split(":")[1].trim();
//             else
//               specimen[collumns[j]].category = "Outro";
//             if(typeof specimen[collumns[j]].value === "string")
//               specimen[collumns[j]].url = specimen[collumns[j]].value.replace("https://drive.google.com/open?id=","https://docs.google.com/uc?id=");
//           //CAT
//           } else if(specimen[collumns[j]].schema=="cat"){
//             specimen[collumns[j]].schema = "rcpol"
//             specimen[collumns[j]].type = "categoricalDescriptor"
//             if(schema[j].split(":")[1]){
//               specimen[collumns[j]].category = schema[j].split(":")[1].trim();
//             }else{
//               specimen[collumns[j]].category = "Outro";
//             }
//             specimen[collumns[j]].states = [];
//             if(specimen[collumns[j]].value){
//               specimen[collumns[j]].value.split("|").forEach(function (state) {
//                 specimen[collumns[j]].states.push(state.trim());
//               })
//             }
//           //NUM
//           } else if(specimen[collumns[j]].schema=="num"){
//             specimen[collumns[j]].schema = "rcpol"
//             specimen[collumns[j]].type = "numericalDescriptor"
//             if(schema[j].split(":")[1]){
//               specimen[collumns[j]].category = schema[j].split(":")[1].trim();
//             } else {
//               specimen[collumns[j]].category = "Outro";
//             }
//             if(specimen[collumns[j]].value){
//               if(specimen[collumns[j]].value.toUpperCase().indexOf("VALUE:")>0){
//                 specimen[collumns[j]].value = specimen[collumns[j]].value.toUpperCase().split("VALUE:")[1].trim();
//               }else{
//                 specimen[collumns[j]].value.split(";").forEach(function (item) {
//                   if(item.toUpperCase().indexOf("MIN:")!=-1){
//                     specimen[collumns[j]].min = item.toUpperCase().split("MIN:")[1].trim();
//                   } else if(item.toUpperCase().indexOf("MAX:")!=-1){
//                     specimen[collumns[j]].max = item.toUpperCase().split("MAX:")[1].trim();
//                   } else if(item.toUpperCase().indexOf("MEAN:")!=-1){
//                     specimen[collumns[j]].mean = item.toUpperCase().split("MEAN:")[1].trim();
//                   } else if(item.toUpperCase().indexOf("SD:")!=-1){
//                     specimen[collumns[j]].sd = item.toUpperCase().split("SD:")[1].trim();
//                   }
//                 });
//               }
//             }
//           }
//         }
//         specimens.push(specimen);
//         logs.push(log);
//         console.log("Data:", (specimen));
//         console.log("Log:", JSON.stringify(log));
//       }
//       else{
//         log.push("Was not possible to generate ID");
//         //console.log("Log:", JSON.stringify(log));
//       }
//     }
//   }else{
//     logs.push("There isn't the enought collumns for generates IDs");
//     console.log("Log:", JSON.stringify(logs));
//   }
//
//   function defineId(i) {
//     var idValue = '';
//     for(var j = 0; j < idIndexes.length; j++){
//       if(!data[i][j] || (data[i][j]+" ").trim()=='')
//         return null;
//       idValue = idValue+":"+ data[i][j];
//     };
//     return hash.MD5(idValue);
//   }
//
//   function tableValidation(){
//     // Check if there is fields enought to define an ID
//     for(var i = 0; i < idIndexes.length; i++){
//       if(idIndexes[i]==-1)
//         return false
//     }
//     return true;
//   }
//
// }
