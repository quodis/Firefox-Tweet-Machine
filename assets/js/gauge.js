$(document).ready(function(){

  // android doesn't support svg, therefore Raphael would break
  if (!isAndroid()) {
  
    // define img source
    gauge_indicator_needle_src = res.gaugeIndicatorNeedleSrc[res_current];
    // define default angle
    gauge_indicator_needle_angle = -90;
    // get holder dom element and clear its contents
    $('.pointer').attr('id', 'pointer').text('');
    // place the raphael object inside the holder
    R = Raphael("pointer", 70 * res.multiplier[res_current], 30 * res.multiplier[res_current]);
    // draw image in the holder
    gauge_indicator_needle = R.image(gauge_indicator_needle_src, 30 * res.multiplier[res_current], -4 * res.multiplier[res_current], 8 * res.multiplier[res_current], 56 * res.multiplier[res_current]);
    // fix possible webkit/safari rendering bug
    R.safari();

  }
});

function gaugeIndicatorNeedleMove(gauge_indicator_needle_angle) {

  // android doesn't support svg, therefore Raphael would break
  if (!isAndroid()) {
  
    // reset the needle, helps when switching from 90 to 100, otherwise the animation would be too subtle
    gauge_indicator_needle.animate({rotation: -90}, 300, "linear");
    // move it to the new position
    gauge_indicator_needle_angle -= 90;
    setTimeout(function() { gauge_indicator_needle.animate({rotation: gauge_indicator_needle_angle}, 2500, "bounce"); }, 300)
  
  };
  
};

//**************************
//Initialize our user agent string to lower case.
// Detects if the current device is an Android OS-based device.
var uagent = navigator.userAgent.toLowerCase();
function isAndroid() {
   if (uagent.search("android") > -1)
      return true;
   else
      return false;
}