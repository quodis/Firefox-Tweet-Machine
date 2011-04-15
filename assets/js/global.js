
var stage = [ window.screenX, window.screenY, window.innerWidth, window.innerHeight ];
var res_current = -1;

// Standard RES and HD Res settings
var res = [{
    multiplier: 1,
    name: 'sd',
    cssFile: 'assets/css/ftm-sd.css',
    gaugeIndicatorNeedleSrc: 'assets/img/sd/pressure-display-pointer-sd.png',
    spawnY: -215,
    bubbleSizeMax: 200,
    bubbleSizeMin: 130,
    avatarLeft: '-22%',
    avatarTop: '20px',
    maxBubbles: 8,
    logoWidth: 220
  }, {
    multiplier: 1.4,
    name: 'hd',
    cssFile: 'assets/css/ftm-hd.css',
    gaugeIndicatorNeedleSrc: 'assets/img/hd/pressure-display-pointer-hd.png',
    spawnY: -280,
    bubbleSizeMax: 300,
    bubbleSizeMin: 190,
    avatarLeft: '-22%',
    avatarTop: '20px',
    maxBubbles: 10,
    logoWidth: 310
}]

var version = '';
var worldAABB, world, iterations = 1, time_step = 1 / 30;
var walls = [];
var wall_thickness = 200;
var wallsSetted = false;
var bodies = [], elements = [], text, bubble_wrapper, search_query = '';
var PI2 = Math.PI * 2;
var gravity_y = -50;
var gravity_y_inverted = 150;

// Time difference between 0 and 10th tweet from where gauge will be at 0
var gauge_max_minutes = 20;

var spawn_y_impulse = -15;
var spawn_y_impulse_inverted = -400;
var spawn_y_impulse_current = spawn_y_impulse;

var interval_spawn, interval_loop, timeout_data_interval, timeout_data_interval_time = (60*1000), timeout_getcustomsearch, fresh_custom_search = true;

var debug = false;

var data_update_count = 0;
var bubble_count = 0;
var lamp_time_on = 1000;

var pool = [];
var pool_index = 0;
var pool_count_spawned = 0;

var timeline_data;
var timeline_data_max_id = 0;
var sb_timeline_step = 0;

var search_data = '';
var search_data_max_id = 0;

// Special bubbles
var sb_clock_step = 0; // Minutes
var sb_clock_last = 0;

var sb_ffdownloads_step = 0; // At each step of downloads
var sb_ffdownloads_last = 0;
var sb_ffdownloads_total = 0;

var sb_followers_step = 0;
var sb_followers_last = 0;
var sb_followers_total = 0;

// Keywords Highlights and Profanity Filter
var keywords;

// Displays

  // Countdown
  var ds_type;
  var ds_datetime;
  var ds_datetime_description;
  var ds_datetime_reached;
  var ds_datetime_interval;
  
  var ds_followers;
  var ds_followers_description;
  
  // Social Media Stats
  var ds_stats_retweets = 0;
  var ds_stats_facebook_shares = 0;

var idleTimeout;
var isIdle = true;

getBrowserDimensions();

function loadCSS(file) {
	var link = document.createElement('link');
	link.href = file;
	link.rel = 'stylesheet';
	link.type = 'text/css';
	link.media = 'screen, projection';
	document.getElementsByTagName('head')[0].appendChild(link);
};


$(document).ready(function(){
  
  // On resize check dimensins and redraw walls
  $(window).resize(function() {
    getBrowserDimensions();
    setWalls();
  });

  // Load SD or HD css file
  loadCSS(res[res_current].cssFile);
  
  init();
  play();

  // Set periodic refresh of data
  timeout_data_interval = setInterval(getDataFromProxy, timeout_data_interval_time);

  $.history.init(
    function(hash){
      if(hash == "") {
        // initialize your app
      } else {
        $('#search-input').val(decodeURIComponent(hash));
		    search();
      }
    },
    { unescape: "" }
  );

  // Pause the world
  $('#flow-transposer a').click(function(){
    var parent = $(this).parent();
    if (parent.hasClass('up')) {
      parent.removeClass('up').addClass('down');
      pause();
    } else {
      parent.removeClass('down').addClass('up');
      play();
    }
    return false;
  })
  
  // Invert the gravity
  $('#gravity-inverter a').click(function(){
    var parent = $(this).parent();
    if (world.m_gravity.y == gravity_y) {
      parent.removeClass('up').addClass('down');
      world.m_gravity.y = gravity_y_inverted;
      spawn_y_impulse_current = spawn_y_impulse_inverted;
    } else {
      parent.removeClass('down').addClass('up');
      world.m_gravity.y = gravity_y;
      spawn_y_impulse_current = spawn_y_impulse;
    }
    return false;
  })
  
  // Search form submit
  $("form#search-box").submit(function(){
    search();
    $.history.load(search_query);
		return false;
	});
	
	// About button lightbox
	$('a.colorbox').colorbox({ width:"50%", opacity:0.8, inline:true, href:"#colophon", title:' ', scrolling:false, onComplete: function() { $.colorbox.resize(); } });
  
  // Zero the idle timer on mouse movement.
  // Limit is three seconds
  $(this).mousemove(function(){
    isIdle = false;
    if (!idleTimeout) {
      idleTimeout = setTimeout("setIdle()", 1000 * 3);
    }
  });
   
  // handles the input field focus and blur behaviours
  input_field_values = new Array();
  // store all the input fields value in an array
  $('input').each(function() {
    // push it into an array
    input_field_values[$(this).attr('name')] = $(this).attr('value');
  }).focus(function() {
    // check if the stored value equals the current value
    // and if so, clear the current value
    if (input_field_values[$(this).attr('name')] == $(this).attr('value')) { $(this).attr('value', ''); };
  }).blur(function() {
    // check if the current value is null and if so replace it by the stored value
    if ($(this).attr('value') == '') { $(this).attr('value', input_field_values[$(this).attr('name')]); };
  });
  
});

function setIdle() {
  clearTimeout(idleTimeout);
  idleTimeout = null;
  isIdle = true;
}

function play() {
	interval_loop = setInterval( loop, 1000 / 40 );
	interval_spwan = setInterval(spawn, 4000);
}

function pause() {
  clearInterval(interval_loop);
  clearInterval(interval_spwan);
}


function init() {

	bubble_wrapper = document.getElementById('bubbles');

	// create and configure new world
	worldAABB = new b2AABB();
	worldAABB.minVertex.Set( -200, 0 );
	worldAABB.maxVertex.Set( screen.width + 200, screen.height + 1000);

  // allow objects to sleep, 
  var doSleep = false;
	world = new b2World( worldAABB, new b2Vec2( 0, 0 ), doSleep );
  world.m_gravity.y = gravity_y;
  
  // set walls around the world
	setWalls();

}

// Calculate at what the position the Gauge should be
function calculateGauge() {

  if (search_data.length) {
  
    // Find the freshest tweet
    var freshest_tweet_created_at = new Date(search_data[0].created_at);
    
    // Find the 10thest (or oldest tweet if there's lesse than 10)
    if (search_data.length <= 10) {
      var older_tweet_created_at = new Date(search_data[search_data.length-1].created_at);
    } else {
      var older_tweet_created_at = new Date(search_data[10-1].created_at);
    }
    
    // Minutes of difference between first and last tweet
    var diff_in_minutes = (Math.abs(freshest_tweet_created_at.getTime() - older_tweet_created_at.getTime()) / (1000 * 60));
    
    // If bigger then max (max minutes is the number where the gauge will be at 0), set to max
    if (diff_in_minutes > gauge_max_minutes) {
      degrees = 2;
    
    // Else, get the proportional
    } else {
      degrees = 180-((diff_in_minutes*180)/gauge_max_minutes);
    }
  } else {
    // No tweets!
    degrees = 0;
  }
  // Let's move the needle!
  gaugeIndicatorNeedleMove(degrees);

}

// Refresh all information from Proxy
function getDataFromProxy() {

  $.getJSON('/proxy.php', function(data) {

    if (data.status.http_code == 200) {
      
      data_update_count ++;
      
      // Update variables with new data
      sb_clock_step = data.contents.special_bubbles.sb_clock_step;
      
      sb_ffdownloads_step = data.contents.special_bubbles.sb_ffdownloads_step;
      sb_ffdownloads_total = data.contents.special_bubbles.sb_ffdownloads_total;
      sb_followers_step = data.contents.special_bubbles.sb_followers_step;
      sb_timeline_step = data.contents.special_bubbles.sb_timeline_step;
      
      ds_type = data.contents.display.ds_type;
      ds_datetime = data.contents.display.ds_datetime;
      ds_datetime_description = data.contents.display.ds_datetime_description;
      ds_datetime_reached = data.contents.display.ds_datetime_reached;
      ds_followers = data.contents.display.ds_followers;
      ds_followers_description = data.contents.display.ds_followers_description;
      ds_stats_facebook_shares = data.contents.display.ds_stats_facebook_shares;
      ds_stats_retweets = data.contents.display.ds_stats_retweets;

      keywords = data.contents.keywords;
      checkVersion(data.contents.version);
      
      if (data.contents.timeline.length) {
        
        // Process timeline results
        sb_followers_total = data.contents.timeline[0].user.followers_count;
        timeline_data = data.contents.timeline;
        timeline_data.reverse();

      } else {
      
        throwError('Twitter REST API down');
      
      }
      
      // Process the default search query from proxy
      if (search_query == '') {
        if (data.contents.search_results.results) {
        
          // Process search results
          search_data = data.contents.search_results.results;
          process_search_result();
        	
        } else {
          
          throwError('Twitter Search API down');
        
        }
      }
      
      specialBubbleFFDownloadsCheck();
      specialBubbleFollowersCheck();
      updateStats();
      updateCountdown();
      
    } else {
    
      throwError('Error (HTTP Code ' + data.status.http_code + ')');
    
    }
    
    spawn();
    
  });

}

// Force page refresh if server says so
function checkVersion(newVersion) {
  if ((newVersion != version) && (version != '')) {
    window.location = window.location;
  }
  version = newVersion;
}

function search() {
  
  // Clear the pool
  clearPool();
  $('#search-submit-bttn').addClass('loading');
  
  // Set the query and escape it to prevent xss
  search_query = encodeURIComponent($('#search-input').val());
  // clear the search_query var if the value == 'Search' which is the placeholder text
  if ($('#search-input').val() == 'Search') { search_query = ''; };
  
  fresh_custom_search = true;
  clearTimeout(timeout_getcustomsearch);
  getCustomSearch();
  
}

function getCustomSearch() {
  
  $.getJSON('http://search.twitter.com/search.json?callback=?&rpp=40&q=' + search_query, function(data) {
    if (data.results) {
      search_data = data.results;
      process_search_result();
      	
    } else {
      throwError('Twitter Search API down');
    
    }
    $('#search-submit-bttn').removeClass('loading');
  });
  
  timeout_getcustomsearch = setTimeout(getCustomSearch, 1000 * 60 * 5)
}


function process_search_result() {
  
  calculateGauge();
  search_data.reverse();
  
  // Clean user information to lookup
  var twitter_profiles_to_lookup = [];
  
  var i;
	for (i = 0; i < search_data.length; i++) {
    var result = search_data[i];
    
    // See if this is newer than what is already pooled
    // If yes, add it at current position
    // If not, do nothing
    
    if (result.id > search_data_max_id) {
      pool.splice(pool_index, 0, {type: 'search', data: result});

      // Add to pool of user information to lookup
      twitter_profiles_to_lookup.push(result.from_user)

      search_data_max_id = result.id;
    }
    
	}
	
  // Get user information and apply them to the data
  if (twitter_profiles_to_lookup.length > 0) {
    $.getJSON('proxy.php?screen_names=' + twitter_profiles_to_lookup.toString(), function(data) {
      if (data) {
        // Loop through retrieved user information
        for (i = 0; i < data.contents.length; i++) {
          // Find all tweets by this user and complete the information
          for (j = 0; j < pool.length; j++) {
            if (pool[j].type == 'search') {
              if (pool[j].data.from_user.toLowerCase() == data.contents[i].screen_name.toLowerCase()) {
                pool[j].data.user = data.contents[i];
              }
            }
          }
        }
      }
    });
  }
	
	// If this is the first time results are processed
  if (fresh_custom_search) {
    if (i == 0) {
      pool.splice(pool_index, 0, {type: 'search_presenter', data: {h1: 'Sorry', p: 'Zero tweets found'}});
    } else {
      // If this is a custom search
      if (search_query != '') {
        search_query_clean = decodeURIComponent(search_query);
        search_query_clean = search_query_clean.replace("<", "&lt;");
        search_query_clean = search_query_clean.replace(">", "&gt;");
        search_query_clean = '"' + friendlyTrim(search_query_clean,16) + '"';
        pool.splice(pool_index, 0, {type: 'search_presenter', data: {h1:'Showing results for', p: search_query_clean}});
      // Standard initial search
      } else {
        pool.splice(pool_index, 0, {type: 'search_presenter', data: {h1:'Showing Firefox activity on twitter', p: ''}});
      }
    }
    fresh_custom_search = false;
  }
	
}

// Remove all Search Results from pool
function clearPool () {
  search_data_max_id = 0;
  pool_index = 0;
  pool = [];
}


// Get a string, trim it to maxlength and add "..." if longer
function friendlyTrim(input, m) {
  var input_short = input.substr(0, m);
  if (input.length > m) input_short += '...';
  return input_short;
}

// Updates the Countdown Display
// Can be a countdown to a @firefox followers milestone
// or a countdown to a datetime
function updateCountdown() {

  var counter_dt;
  clearInterval(ds_datetime_interval);
  
  if (ds_type == 'followers') {
  
    if (sb_followers_total > ds_followers) {
    
      counter_dd = addCommas(sb_followers_total) + ' followers';
      counter_dt = 'Previous milestone: ' + addCommas(ds_followers);
      
    } else {
    
      counter_dd = addCommas(sb_followers_total) + ' followers';
      counter_dt = addCommas(ds_followers - sb_followers_total) + ' to reach ' + addCommas(ds_followers);
      
    }  
    
    $('#counter dd').text(counter_dd).attr('title', counter_dd);
    
  } else if (ds_type == 'datetime') {
  
    //if (ds_datetime_description)
    counter_dt = ds_datetime_description;
    
    //ds_datetime_interval
    ds_datetime_interval = setInterval(datetimeCountdown, 1000);
    
  } else {
  
    counter_dd = '';
    counter_dt = '';
    
  }
  
  $('#counter dt').text(counter_dt).attr('title', counter_dt);

}


// Updates the counts on the Social Media Display
function updateStats() {
  
  // Followers
  $('dd.twitter-follow a').text(addCommas(sb_followers_total));

  // Retweets
  $('dd.twitter-retweet a').text(addCommas(ds_stats_retweets));

  // Facebook Shares
  $('dd.fb-share a').text(addCommas(ds_stats_facebook_shares));
  
}


function spawn() {
  
  // Check if pool is empty
  if (pool.length == 0) return;
  
  // Check if there are too many bubbles on display
  if (bodies.length >= res[res_current].maxBubbles) return;
  
  // Check if at end of pool
  // If so, resort it by id and delete whatever is over 40 results
  if ((pool_index+1) > pool.length) {
    pool_index = 0;
  }
  
  // Create the bubble 
  createBubble(pool[pool_index].type, pool[pool_index].data);
  pool_count_spawned ++;
  
  // Jump to next
  pool_index ++;
  
  // Check if I should show timeline tweets
  specialBubbleTimelineCheck();
  
  
}

function getHeightClass(height) {
  var height_class = '';
	if (res_current == 0) {
    // SD
      
  	if (height <= 100) {
      height_class = "s";
  	} else if (height <= 140) {
      height_class = "m";
  	} else if (height <= 180) {
      height_class = "l";
  	} else if (height <= 220) {
      height_class = "xl";
  	} else {
      height_class = "xxl";
  	}
  	
	} else {
    // HD

  	if (height <= 150) {
      height_class = "s";
  	} else if (height <= 200) {
      height_class = "m";
  	} else if (height <= 250) {
      height_class = "l";
  	} else if (height <= 300) {
      height_class = "xl";
  	} else {
      height_class = "xxl";
  	}
	}
	return height_class;
}
	
function createBubble(type, data) {

  // calculate the position, will be used to place the element once created
  // could be changed to a fixed spawn point that'd match the machine chimney
	var x = stage[2]/2;
	var y = stage[3] + res[res_current].spawnY;
  bubble_count ++;
  var bubbleClass;
  var size;
  var opacity;
  
  turnLampOn();
	setTimeout(turnLampOff, lamp_time_on);
	
  // create the DOM element to be animated
	var element = document.createElement("article");
	
	switch (type) {
	 
    case 'search':
      
      // Variate the opacity of the bubble depending on the nr. of followers
      // The higher the follower count, the whiter the bubble
      
      // default opacity
      opacity = 'high';
      
      // Only calculate if there's info about the user
    	if (data.user) {

        followers_count = parseInt(data.user.followers_count);
 
      	if (followers_count <= 100) {
          opacity = 'low';
      	} else if (followers_count <= 300) {
          opacity = 'med';
      	} else if (followers_count <= 600) {
          opacity = 'high';
      	} else {
          opacity = 'vhigh';
      	}
    	}
    	    	
      element.className = 'bubble tweet ' + opacity;
      element.innerHTML = buildBubbleTweet(data);
      break;
      
    case 'clock':
  	
      element.className = 'bubble time';
      element.innerHTML = buildBubbleClock(data);
      pool.splice(pool_index, 1);
      pool_index --;
      break;
    	 
  	case 'ffdownloads':
      
      element.className = 'bubble downloads';
      element.innerHTML = buildBubbleDownloads(data);
      pool.splice(pool_index, 1);
      pool_index --;
      break;
  
  	case 'followers':
      
      element.className = 'bubble followers';
      element.innerHTML = buildBubbleFollowers(data);
      pool.splice(pool_index, 1);
      pool_index --;
      break;
  
  	case 'timeline':
      
      element.className = 'bubble tweet firefox vhigh';
      element.innerHTML = buildBubbleTweet(data);
      pool.splice(pool_index, 1);
      pool_index --;
      break;
  
  	case 'error':
      
      element.className = 'bubble error';
      element.innerHTML = buildBubbleError(data);
      pool.splice(pool_index, 1);
      pool_index --;
      break;
  
  	case 'search_presenter':
      element.className = 'bubble search';
      element.innerHTML = buildBubbleSearch(data);
      pool.splice(pool_index, 1);
      pool_index --;
      break;
      
	}

	element.style['position'] = 'absolute';
	element.style['left'] = -600 + 'px';
	element.style['top'] = 0 + 'px';
	element.id = bubble_count;
	
	jquery_element = $(element);
	$(bubble_wrapper).append(element);
	
	height = jquery_element.height();
	
	height_class = getHeightClass(height);
	
	jquery_element.addClass(height_class);
	$.data(jquery_element, 'height_class', height_class);
	
	// Calculate size (excluding padding)
	size = (0.5 * res[res_current].bubbleSizeMax) + (0.5 * height);
	
	// Avoid size being bigger than the chimney
	if (size > res[res_current].bubbleSizeMax) size = res[res_current].bubbleSizeMax
	if (size < res[res_current].bubbleSizeMin) size = res[res_current].bubbleSizeMin
	
	element.width = size;
	element.height = size;
	
	// Hover in and out behaviour
  jquery_element.hover(function() {
  
    // Only if mouse isn't idle.
    // Otherwise leaving the mouse on a spot
    // Will create unwanted traffic jam
    
    if (!isIdle) {
      // Bring bubble to front and fade in the bubble menu
      $(this).css({'z-index': '999'}).find("nav").fadeIn(20);
      
      // If the bubble is covered by the logo
      // Send the FTM logo behind all the bubbles
  //console.log($(this).left);
  
      bubble_left = Math.floor($(this).css('left').replace('px', ''));
      bubble_top = Math.floor($(this).css('top').replace('px', ''));
  
      if (((bubble_left - res[res_current].logoWidth) < 0) && ((bubble_top - 150) < 0)) {
        $('header').css({'z-index': '10'});
      }
      
      // Find the correspondant Body and set it's userData.hover = true
      var max_i = bodies.length;
      var this_id = $(this).attr('id');
    	for (var i = 0; i < max_i; i++) {
    		if (bodies[i].m_userData.id == this_id) {
    		  bodies[i].m_userData.hover = true;
    		}
    	}
  	}
    	
  }, function() {  
  
    // Send the bubble back to it's original z-index and fade out the bubble menu
    $(this).css({'z-index': '10'}).find("nav").fadeOut(100);
    
    // Send the FTM logo back to it's original z-index, in front of all the bubbles
    $('header').css({'z-index': '40'});
    
    // Find the correspondant Body and set it's userData.hover = false
  	for (var i = 0; i < bodies.length; i++) {
  		if (bodies[i].m_userData.id == $(this).attr('id')) {
  		  bodies[i].m_userData.hover = false;
  		}
  	}
    	
  });
  
  // Flip button actions
  jquery_element.find('li.flip a').click(function(){
    
    // Find the correspondant Body
    var max_i = bodies.length;
    var this_id = $(this).parents('.bubble').attr('id');
    var original_height_class = '';
    for (var i = 0; i < max_i; i++) {
    	if (bodies[i].m_userData.id == this_id) {
    	  original_height_class = bodies[i].m_userData.height_class;
    	}
    }
    
    if ($(this).parents('.bubble').find('section').hasClass('hide')) {
    
      // Currently showing bubble front
      $(this).parents('.bubble').find('p.text, header, section').toggleClass('hide');
      
      // Remove original height class
      $(this).parents('.bubble').removeClass(original_height_class);
      
      // Calculate new height class
      height = $(this).parents('.bubble').height();
      new_height_class = getHeightClass(height);
            
      // Switch to maximum height
      $(this).parents('.bubble').addClass(new_height_class);
      
    } else {
  
      // Switch to original height
      $(this).parents('.bubble').removeClass('s m l xl xxl');
      $(this).parents('.bubble').addClass(original_height_class);
        
      // Currently showing bubble back
      $(this).parents('.bubble').find('p.text, header, section').toggleClass('hide');
      
    }
    return false;
  });
  
  $(bubble_wrapper).find('.avatar-wrapper').delay(500).animate({left: res[res_current].avatarLeft, top: res[res_current].avatarTop}, 1000);
	elements.push( element );

  // create a new box2d body
	var b2body = new b2BodyDef();

  // define that body as a circle and its properties
	var circle = new b2CircleDef();
	circle.radius = size >> 1;
	circle.density = 1;
	circle.friction = 0.6;
  // Restitution is how elastic something is 0 being in elastic and 1 being totally elastic
  circle.restitution = 0.3;
	circle.preventRotation = true;
	
	b2body.AddShape(circle);
	
	// add the body to userData, so that all the elements can be addressed and manipulated later on
	b2body.userData = {element: element, id: bubble_count, hover: false, height_class: height_class};

  // define position where the body will be spawned
	b2body.position.Set( x, y );

	// define initial velocity on x, y axis
	// This is a one-time impulse
	b2body.linearVelocity.Set( Math.random() * 400 - 200, spawn_y_impulse_current );
	
	// add the box2d body to the real world and bodies array
	bodies.push( world.CreateBody(b2body) );

}


function setWalls() {

	if (wallsSetted) {

		world.DestroyBody(walls[0]);
		world.DestroyBody(walls[1]);
		world.DestroyBody(walls[2]);
		world.DestroyBody(walls[3]);

		walls[0] = null; 
		walls[1] = null; 
		walls[2] = null; 
		walls[3] = null; 
	}

  // arguments: world, x, y, width, height, fixed
  // top box wall
  walls[0] = createBox(world, stage[2] / 2, 0, stage[2], (10 * res[res_current].multiplier));

  // bottom machine base box
	walls[1] = createBox(world, stage[2] / 2, stage[3], stage[2], (100 * res[res_current].multiplier));
	
	// machine polygon left
	walls[2] = createPoly(world, (stage[2] / 2) + (100 * res[res_current].multiplier), (stage[3] - (330 * res[res_current].multiplier)), [
    [(10 * res[res_current].multiplier), 0],
    [(40 * res[res_current].multiplier), 0],
    [(110 * res[res_current].multiplier), (60 * res[res_current].multiplier)],
    [(110 * res[res_current].multiplier), (330 * res[res_current].multiplier)],
    [0, (330 * res[res_current].multiplier)]
  ], true);
  
  // machine polygon right
  walls[3] = createPoly(world, (stage[2] / 2) - (210 * res[res_current].multiplier), (stage[3] - (330 * res[res_current].multiplier)), [
    [(70 * res[res_current].multiplier), 0],
    [(100 * res[res_current].multiplier), 0],
    [(110 * res[res_current].multiplier), (330 * res[res_current].multiplier)],
    [0, (330 * res[res_current].multiplier)],
    [0, (60 * res[res_current].multiplier)]
  ], true);

	wallsSetted = true;

}


// Check to see if it's time to spawn a Clock bubble
function specialBubbleClockCheck() {
  if (sb_clock_step > 0) {
    var now = new Date();
    hours = now.getHours();
    minutes = now.getMinutes();
    seconds = now.getSeconds();
    
    if (minutes < 10) minutes = '0' + minutes
    
    if ((seconds == 0) && 
      ((minutes % sb_clock_step) == 0) && 
      ((hours + 'h' + minutes) != sb_clock_last)) {
      
      sb_clock_last = hours + 'h' + minutes
      pool.splice(pool_index, 0, {type: 'clock', data: sb_clock_last});
    }
  }
}

function specialBubbleFFDownloadsCheck() {
  if (sb_ffdownloads_step > 0) {

    if (sb_ffdownloads_last == 0) sb_ffdownloads_last = sb_ffdownloads_total;
    
    if ((sb_ffdownloads_total > sb_ffdownloads_last) &&
      (Math.floor(sb_ffdownloads_total / sb_ffdownloads_step) > Math.floor(sb_ffdownloads_last / sb_ffdownloads_step))) {
      
      sb_ffdownloads_last = sb_ffdownloads_total;
      pool.splice(pool_index, 0, {type: 'ffdownloads', data: addCommas(Math.floor(sb_ffdownloads_total / sb_ffdownloads_step) * sb_ffdownloads_step)});
      
    }
  }
}

function specialBubbleFollowersCheck() {
  if (sb_followers_step > 0) {
  
    if (sb_followers_last == 0) sb_followers_last = sb_followers_total;
    
    if ((sb_followers_total > sb_followers_last) &&
      (Math.floor(sb_followers_total / sb_followers_step) > Math.floor(sb_followers_last / sb_followers_step))) {
      
      sb_followers_last = sb_followers_total;
      pool.splice(pool_index, 0, {type: 'followers', data: addCommas(Math.floor(sb_followers_total / sb_followers_step) * sb_followers_step)});
      
    }
  }
}

function specialBubbleTimelineCheck() {
  if (!timeline_data) return;
  
  if ((sb_timeline_step > 0) && (timeline_data.length > 0)) {
    if (((pool_count_spawned % sb_timeline_step) == 0) || (!search_data.length)) {
    
      var i = 0;
      var found = false;
      while ((i < timeline_data.length) && (!found)) {
        var result = timeline_data[i];
        if (result.id > timeline_data_max_id) {
        
          pool.splice(pool_index, 0, {type: 'timeline', data: result});
          timeline_data_max_id = result.id;
          found = true;
          
        }
        i++;
    	}
    	
    	// If none found, set max_id to 0 and start over
    	if (!found) {
      	timeline_data_max_id = 0;
        specialBubbleTimelineCheck();
      }
      
    }
  }
}




// run this on every frame
function loop(){
  
  specialBubbleClockCheck();
  
	// make the time advance
	world.Step(time_step, iterations);
	
	for (i = 0; i < bodies.length; i++) {

		var body = bodies[i];
		var element = elements[i];
		
		newLeft = (body.m_position0.x - (element.width >> 1));
		newTop = (body.m_position0.y - (element.height >> 1) - (10 * res[res_current].multiplier));
		element.style.left = newLeft + 'px';
		element.style.top = newTop + 'px';

    if (body.m_userData.hover) {
      body.m_linearVelocity.SetZero();
    }

		// Destroy bubble if it's out of the screen
		
		if (((newLeft + Math.floor(element.width)) <= -100) ||
		  (newLeft > (stage[2] + 100))){
		  
		  world.DestroyBody(body);
		  bodies.splice(i, 1);
		  elements.splice(i, 1);
		  $(element).remove();
		  
		}
		
		// When bubbles are reaching the ceiling, right above the chimney,
		// Make them move left/right instead of just creating a traffic jam
		
		if ((Math.abs(body.m_position0.x - (stage[2]/2)) < 150) && (newTop < 20)) {
		
		  if (Math.abs(body.m_linearVelocity.x) < 20 ) {
		    if ((body.m_position0.x - (stage[2]/2)) < 0) {
		      newx = -50;
		    } else {
		      newx = 50;
		    }
		    body.m_linearVelocity.Set(newx, body.m_linearVelocity.y);
		  }
		} else if ((newTop < 2) && (body.m_linearVelocity.y < 0)) {
		
		    body.m_linearVelocity.Set(body.m_linearVelocity.x, 40);
		}
		
	}
}


// .. BOX2D UTILS

function createBox(world, x, y, width, height, fixed) {

	if (typeof(fixed) == 'undefined') {
		fixed = true;
	}

	var boxSd = new b2BoxDef();
	if (!fixed) {
		boxSd.density = 1.0;
	}
	boxSd.extents.Set(width, height);
	var boxBd = new b2BodyDef();
	boxBd.AddShape(boxSd);
	boxBd.position.Set(x,y);
	return world.CreateBody(boxBd);
}

function createPoly(world, x, y, points, fixed) {
	var polySd = new b2PolyDef();
	
	if (!fixed) polySd.density = 1.0;
	
	polySd.vertexCount = points.length;
	
	for (var i = 0; i < points.length; i++) {
		polySd.vertices[i].Set(points[i][0], points[i][1]);
	}
	
	var polyBd = new b2BodyDef();
	polyBd.AddShape(polySd);
	polyBd.position.Set(x,y);
	return world.CreateBody(polyBd);
}



// BROWSER DIMENSIONS
function getBrowserDimensions() {

	stage[0] = window.screenX;
	stage[1] = window.screenY;
	stage[2] = window.innerWidth;
	stage[3] = window.innerHeight;
	
	// If screen is as good as HD...
  if ((stage[2] >= 1400) && (stage[3] >= 840)) {
    res_new = 1;
  } else {
    res_new = 0;
  }
  
  if ((res_new != res_current) && (res_current != -1)) {
    // Resolution changed, refresh page
    window.location = window.location;
  }
  res_current = res_new;
  
}

function buildBubbleTweet(data) {

  var real_name = '', username = '', profile_image_url = '', user_location = '', user_url = '', followers_count = '', retweet_count = '', description = '', text = '';
  
  if (data.user) {
    real_name = data.user.name;
    username = data.user.screen_name;
    profile_image_url = data.user.profile_image_url;
    user_location = data.user.location;
    user_url = data.user.url;
    followers_count = data.user.followers_count;
    description = data.user.description;
  }
  
  // Fallback for timeline results
  if (data.from_user) {
    username = data.from_user;
  }
  if (data.profile_image_url) {
    profile_image_url = data.profile_image_url;
  }
  
  
  // If HD version, replace profile image with bigger version
  if (res_current == 1) {
    profile_image_url = profile_image_url.replace('normal', 'bigger');
    profile_image_size = 65;
  } else {
    profile_image_size = 48;
  }

  text = create_urls(data.text);
  text = filterKeywords(text);
  created_at = new Date(data.created_at.substring(4));
  
  html = '\
		<header class="">\
			<h1><a href="http://twitter.com/' + username + '" title="' + username + '" rel="author external">' + username + '</a> wrote</h1>\
			<time datetime="' + created_at + '" pubdate><a href="http://twitter.com/' + username + '/status/' + data.id + '" rel="bookmark external" title="permalink">' + jQuery.timeago(data.created_at.substring(4)) + '</a></time>\
		</header>\
		<p class="avatar-wrapper"><a href="http://twitter.com/' + username + '" title="' + username + '" rel="author external"><img alt="' + username + ' avatar" src="\
		' + profile_image_url + '" height="' + profile_image_size + '" width="' + profile_image_size + '" /></a></p>\
		<p class="text">' + text + '</p>\
		<section class="hide">\
			<dl>';
			
				if (real_name) {
				  html = html + '\
				  <dt>Name</dt>\
				  <dd>' + real_name + '</dd>';
				} else {
				  html = html + '\
				  <dt>Profile</dt>\
				  <dd>N/A</dd>';
				}
				
				if (user_location) {
				  html = html + '\
				  <dt>Location</dt>\
				  <dd>' + user_location + '</dd>';
				}
				
				if (user_url) {
				  html = html + '\
				  <dt>Web</dt>\
				  <dd><a href="' + user_url + '" rel="author external" title="Web">' + friendlyTrim(user_url.replace("http://", ""), 12) + '</a></dd>';
				}
				
				if (description) {
				  html = html + '\
				  <dt>Bio</dt>\
				  <dd>' + friendlyTrim(description, 44) + '</dd>';
				}
				
		    html = html + '\
		    </dl>\
		</section>\
		<nav class="hide">\
			<ul>\
				<li class="flip"><a href="#section-id-01" title="Flip bubble">Flip</a></li>\
				<li class="retweet"><a href="http://button.topsy.com/retweet?nick=' + username + '&title=' + data.text + '" title="Retweet" rel="external">Retweet</a></li>\
				<li class="follow"><a href="http://twitter.com/' + username + '" title="Follow ' + username + '" rel="external">Follow</a></li>\
			</ul>\
		</nav>\
	';
	
	return html;
}

function buildBubbleClock(data) {
  html = '\
		<h1>Cuckoo!</h1>\
		<p>' + data + '</p>\
  ';
	return html;
}

function buildBubbleFollowers(data) {
  html = '\
		<a href="http://twitter.com/firefox/followers" title="Firefox followers" rel="external">\
			<h1>@firefox followers</h1>\
			<p>' + data + '</p>\
		</a>\
  ';
	return html;
}

function buildBubbleDownloads(data) {
  html = '\
		<a href="http://www.mozilla.com/en-US/firefox/stats/" title="Firefox downloads" rel="external">\
			<h1>Firefox downloads</h1>\
			<p>' + data + '</p>\
		</a>\
  ';
	return html;
}

function buildBubbleError(data) {
  html = '\
  	<h1>Malfunction!</h1>\
  	<p>' + data + '</p>\
  ';
	return html;
}

function buildBubbleSearch(data) {
  html = '\
  	<h1>' + data.h1 + '</h1>\
  	<p>' + data.p + '</p>\
  ';
	return html;
}

function throwError(explanation) {
  pool.splice(pool_index, 0, {type: 'error', data: explanation});
}

function addCommas(nStr) {
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

function turnLampOn() {
  $('#activity-indicator').removeClass('off').addClass('on');
}
function turnLampOff() {
  $('#activity-indicator').removeClass('on').addClass('off');
}

// Parse tweets to make links to links, @usernames and #hashtags
function create_urls(input) {
  return input
  .replace(/(ftp|http|https|file):\/\/([\S]+(\b|$))/gim, '<a href="$&" class="my_link" target="_blank">$2</a>')
  .replace(/([^\/])(www[\S]+(\b|$))/gim, '$1<a href="http://$2" class="my_link" target="_blank">$2</a>')
  .replace(/(^|\s)@(\w+)/g, '$1<a href="http://twitter.com/$2" class="my_link" target="_blank">@$2</a>')
  .replace(/(^|\s)#(\S+)/g, '$1<a href="http://search.twitter.com/search?q=%23$2" class="my_link" target="_blank">#$2</a>');
}


function filterKeywords(input) {
  if (keywords) {
  
    // Highlight terms
    for (var key in keywords.highlights) {
      if (keywords.highlights.hasOwnProperty(key)) {
      
        // Replace keyword string: , becomes |, so it's the RegExp "or" operator
        fKwords = keywords.highlights[key].replace(/,/gi, '|');
        
        if (fKwords != '') {
          // Only if it has spaces, start of line
          var reg = new RegExp('(\\s|:|^)(' + fKwords + ')(\\s|:\\s|(\\.\\s)|(\\,\\s)|$)', 'gi');
          input = input.replace(reg, '$1<span class="mood ' + key + '">$2</span>$3');
        }
        
      }
    }
    
    // Replace profanity
    fKwords = keywords.excluded.replace(/,/gi, '|');
    
    if (fKwords != '') {
      var reg = new RegExp('(\\s|:|^)(' + fKwords + ')', 'gi');
      input = input.replace(reg, '$1#@*%');
      
      var reg = new RegExp('(' + fKwords + ')(\\s|:\\s|(\\.\\s)|(\\,\\s)|$)', 'gi');
      input = input.replace(reg, '#@*%$2');
    }
    
  }
  return input;
}


function datetimeCountdown(){

  dateFuture = new Date(ds_datetime);

  //grab current date
	localDate = new Date();
	utc = localDate.getTime() + (localDate.getTimezoneOffset() * 60000);
	dateNow = new Date(utc + (3600000*-7)); // *x, where x is the offset from UTC
	
	//calc milliseconds between dates
	amount = dateFuture.getTime() - dateNow.getTime();
	
	delete dateNow;

	// time is already past
	if(amount < 0){
		$('#counter dd').text(ds_datetime_reached).attr('title', ds_datetime_reached);
	}
	// date is still good
	else{
		days=0;hours=0;mins=0;secs=0;out="";

		amount = Math.floor(amount/1000);//kill the "milliseconds" so just secs

		days=Math.floor(amount/86400);//days
		amount=amount%86400;

		hours=Math.floor(amount/3600);//hours
		amount=amount%3600;

		mins=Math.floor(amount/60);//minutes
		amount=amount%60;

		secs=Math.floor(amount);//seconds

    // Build string
		if(days != 0){out += days + "d : ";}
		if(days != 0 || hours != 0){out += hours +"h : ";}
		if(days != 0 || hours != 0 || mins != 0){out += mins +"m : ";}
		out += secs +"s";
		$('#counter dd').text(out).attr('title', out);;

	}
}
