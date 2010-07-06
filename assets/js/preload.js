$(document).ready(function(){
	
  // http://www.filamentgroup.com/lab/update_automatically_preload_images_from_css_with_jquery/
  $('#page').css({opacity: 0});
  /* the preload script has to wait a couple of milliseconds in order for the css files to load so that it's possible to read all the cssRules via javascript */
	setTimeout(function() { $.preloadCssImages(); }, 500);
	
});

// fade in the wrapper on .load, triggered by the css preloader plugin
$(window).load(function () {

 $('#page').animate({opacity: 1}, 500);
 getDataFromProxy();

});