$(document).ready(function(){
	
  $(document).keydown(function(e){

    if (!$('input#search-input:focus').length) {

      if (e.keyCode == 71) {
      // toggle gravity when pressing G
        if ("console" in window) {
        	console.log('pressed G');
        }
        $('#gravity-inverter a').trigger('click');
        return false;
      } else if (e.keyCode == 80) {
      // toggle play/pause when pressing P
        if ("console" in window) {
        	console.log('pressed P');
        }
        $('#flow-transposer a').trigger('click');
        return false;
      } else if (e.keyCode == 66) {
      // spawn a random bubble
        if ("console" in window) {
        	console.log('');
        }
        spawn();
        return false;
      }
  
    };
  });

});