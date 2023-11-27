var UIPrinter = function(){    

    // SPECIMEN
    $("#specimen-amendment").html("");
    
    $("#specimen-tab").removeClass("green-text");
    $("#specimen-tab").removeClass("red-text");					
    
    $("#completeness-specimen").html(`loading...`);					
    $("#completeness-specimen").removeClass("red");
    $("#completeness-specimen").removeClass("green");
    $("#completeness-specimen").removeClass("white-text");

    $("#accessibility-specimen").html(`loading...`);
    $("#accessibility-specimen").removeClass("red");
    $("#accessibility-specimen").removeClass("green");
    $("#accessibility-specimen").removeClass("white-text");

    $("#conformity-specimen").html(`loading...`);					
    $("#conformity-specimen").removeClass("red");
    $("#conformity-specimen").removeClass("green");
    $("#conformity-specimen").removeClass("white-text");

    $("#consistency-specimen").html(`loading...`);					
    $("#consistency-specimen").removeClass("red");
    $("#consistency-specimen").removeClass("green");
    $("#consistency-specimen").removeClass("white-text");

    $("#uniqueness-specimen").html(`loading...`);					
    $("#uniqueness-specimen").removeClass("red");
    $("#uniqueness-specimen").removeClass("green");
    $("#uniqueness-specimen").removeClass("white-text");
}

UIPrinter.prototype.specimenAmendment = function(assertion, target, dimension, i) {
    
    $("#"+target+"-amendment").prepend(`<tr id="i-sp-${dimension}-${i}">
                    <td>${assertion.response.result}</td>
                    <td>${assertion.dimension}</td>
                    <td>${assertion.ie}</td>
                    <td>${assertion.dr.row}</td>
                    <td>${assertion.dr.value === "undefined"?"":assertion.dr.value}</td>
                    <td><a onclick="
                    
                        $('#detail-enhancement').html('${assertion.enhancement}');
                        $('#detail-result').html('${assertion.response.result}');
                        $('#detail-ie').html('${assertion.ie}');
                        $('#detail-specification').html('${assertion.specification}');
                        $('#detail-mechanism').html('${assertion.mechanism}');

                    
                    " href="#" data-target="slide-out" class="sidenav-trigger"><i class="material-icons">assignment</i></a></td>
                </tr>`);

                
    // var elem = document.querySelector('#i-sp-'+dimension+'-'+i);							
    // var instance = M.Tooltip.init(elem, {
    //     position:"left",
    //     html:`
    //         <div style="width:20em; padding:1em">
    //             <b style="font-size:110%">Specification</b><p style="font-size:70%">${assertion.specification}</p>
    //             <br>
    //             <b style="font-size:110%">Mechanism</b><p style="font-size:70%">${assertion.mechanism}</p>
    //         </div>
    //     `
    //     });
}
UIPrinter.prototype.specimenMeasure = function(assertion, target, dimension) {    
    $("#"+dimension+"-"+target).html(`<a class="waves-effect waves-light modal-trigger white-text" href="#details">${assertion.response.result}% of `+dimension+`</a>`);									
    $("#d-content").val(JSON.stringify(assertion,null,4));                                
}
UIPrinter.prototype.specimenValidation = function(assertion, target,dimension) {
    if(!$("#"+target+"-tab").hasClass("red-text")){
        $("#"+target+"-tab").removeClass("green-text");
        $("#"+target+"-tab").removeClass("red-text");					
        $("#"+target+"-tab").addClass(assertion.response.result?"green-text":"red-text");
    }
    // console.log("#"+dimension+"-"+target, assertion.response.result)
    $("#"+dimension+"-"+target).addClass(assertion.response.result?"green":"red");
    $("#"+dimension+"-"+target).addClass("white-text");
    
}
