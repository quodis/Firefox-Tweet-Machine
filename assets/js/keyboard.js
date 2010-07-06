$(document).ready(function(){
	
  $(document).keydown(function(e){

    if (!$('input#search-input:focus').length) {

      if (e.keyCode == 71) {
      // toggle gravity when G is pressed
        if ("console" in window) {
        	console.log('pressed G - toggling gravity');
        }
        $('#gravity-inverter a').trigger('click');
        return false;
      } else if (e.keyCode == 80) {
      // toggle play/pause when P is pressed
        if ("console" in window) {
        	console.log('pressed P - toggling play');
        }
        $('#flow-transposer a').trigger('click');
        return false;
      } else if (e.keyCode == 83) {
      // focus search box when S is pressed
        if ("console" in window) {
        	console.log('pressed S - focusing search box');
        }
        $('input#search-input').focus();
        return false;
      } else if (e.keyCode == 66) {
      // spawn a random bubble when B is pressed
        if ("console" in window) {
        	console.log('pressed B - spawning bubble');
        }
        spawn();
        return false;
      } else if (e.keyCode == 65) {
      // show about box when A is pressed
        if ("console" in window) {
        	console.log('pressed A - showing about box');
        }
        $('a.colorbox').trigger('click');
        return false;
      }

    } else {
    
     if (e.keyCode == 27) {
      // remove focus from search box when Esc is pressed
        if ("console" in window) {
        	console.log('pressed Esc - removing focus (blurring) search box');
        }
        $('input#search-input').blur();
        return false;
      };
    
    };
  });

});