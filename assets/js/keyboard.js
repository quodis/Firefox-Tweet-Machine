$(document).ready(function(){
	
	keyboard_debug = false;
	modifier_keys_pressed = false;
	
  $(document).keydown(function(e){
  
    if (!$('input#search-input:focus').length && !modifier_keys_pressed) {

      if (e.keyCode == 71) {
      // toggle gravity when G is pressed
        if (("console" in window) && keyboard_debug) {
        	console.log('pressed G - toggling gravity');
        }
        $('#gravity-inverter a').trigger('click');
        return false;
      } else if (e.keyCode == 80) {
      // toggle play/pause when P is pressed
        if (("console" in window) && keyboard_debug) {
        	console.log('pressed P - toggling play');
        }
        $('#flow-transposer a').trigger('click');
        return false;
      } else if (e.keyCode == 83) {
      // focus search box when S is pressed
        if (("console" in window) && keyboard_debug) {
        	console.log('pressed S - focusing search box');
        }
        $('input#search-input').focus();
        return false;
      } else if (e.keyCode == 66) {
      // spawn a random bubble when B is pressed
        if (("console" in window) && keyboard_debug) {
        	console.log('pressed B - spawning bubble');
        }
        spawn();
        return false;
      } else if (e.keyCode == 65) {
      // show about box when A is pressed
        if (("console" in window) && keyboard_debug) {
        	console.log('pressed A - showing about box');
        }
        $('a.colorbox').trigger('click');
        return false;
      } else if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
        if ("console" in window && keyboard_debug) {
        	console.log('cmd or ctrl pressed');
        }
        modifier_keys_pressed = true;
      }
      
      if (("console" in window) && keyboard_debug) {
      	console.log(e);
      	console.log('mod keys: ' + modifier_keys_pressed);
      }

    } else {
    
     if (e.keyCode == 27) {
      // remove focus from search box when Esc is pressed
        if (("console" in window) && keyboard_debug) {
        	console.log('pressed Esc - removing focus (blurring) search box');
        }
        $('input#search-input').blur();
        return false;
      };
    
    };
  }).keyup(function(e){
    modifier_keys_pressed = false;
    
    if (("console" in window) && keyboard_debug) {
    	console.log('keys released');
    	console.log('mod keys: ' + modifier_keys_pressed);
    }
  });

});