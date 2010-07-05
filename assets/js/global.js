

var stage = [ window.screenX, window.screenY, window.innerWidth, window.innerHeight ];

var res_current = -1;
var res = {
  multiplier: [1, 1.4],
  name: ['sd', 'hd'],
  cssFile: ['assets/css/ftm-sd.css', 'assets/css/ftm-hd.css'],
  gaugeIndicatorNeedleSrc: ['assets/img/sd/pressure-display-pointer-sd.png', 'assets/img/hd/pressure-display-pointer-hd.png'],
  spawnY: [-215, -301],
  bubbleSize: [200, 300],
  avatarLeft: ['-22%', '-22%'],
  avatarTop: ['20px', '30px'],
  maxBubbles: [7, 7]
}

getBrowserDimensions();

var worldAABB, world, iterations = 1, time_step = 1 / 24;
var walls = [];
var wall_thickness = 200; // Seems to have no effect
var wallsSetted = false;
var bodies, elements, text, bubble_wrapper, search_query = '';
var PI2 = Math.PI * 2;

var gravity_y = -50;
var gravity_y_inverted = 150;

var gauge_max_minutes = (60);

var spawn_y_impulse = -30;
var spawn_y_impulse_inverted = -200;
var spawn_y_impulse_current = spawn_y_impulse;

var interval_spawn, interval_loop, timeout_data, timeout_data_interval = (60*1000);

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
  var ds_datetime_interval;
  
  var ds_followers;
  var ds_followers_description;
  
  // Social Media Stats
  var ds_stats_retweets = 0;
  var ds_stats_facebook_shares = 0;


function loadCSS(file) {
	var link = document.createElement('link');
	link.href = file;
	link.rel = 'stylesheet';
	link.type = 'text/css';
	link.media = 'screen, projection';
	document.getElementsByTagName('head')[0].appendChild(link);
};


$(document).ready(function(){
  
  
  $(window).resize(function() {
    getBrowserDimensions();
    setWalls();
  });

  loadCSS(res.cssFile[res_current]);
  
  init();
  
  getDataFromProxy();
  timeout_data = setTimeout(getDataFromProxy, timeout_data_interval);
  
  play();

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
  
  $("form#search-box").submit(function(){
		search();
		return false;
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


// Calculate at what the position the Gauge should be
function calculateGauge() {

  // Fint the most fresh tweet
  var freshest_tweet_created_at = new Date(search_data[0].created_at);
  
  // Find the 10thest (or oldest tweet if there's lesse than 10)
  if (search_data.length < 10) {
    var older_tweet_created_at = new Date(search_data[search_data.length-1].created_at);
  } else {
    var older_tweet_created_at = new Date(search_data[10].created_at);
  }
  
  // Minutes of difference between first and last tweet
  var diff_in_minutes = (Math.abs(freshest_tweet_created_at.getTime() - older_tweet_created_at.getTime()) / (1000 * 60));
 
  // If bigger then max (max minutes is the number where the gauge will be at 0), set to max
  if (diff_in_minutes > gauge_max_minutes) {
    degrees = gauge_max_minutes;
  // Else, get the proportional
  } else {
    degrees = 180-((6*180)/gauge_max_minutes);
  }
  
  // Let's move the needle!
  gaugeIndicatorNeedleMove(degrees);

}

// Refresh all information from Proxy
function getDataFromProxy() {
  $.getJSON('/proxy.php?q=' + search_query, function(data) {

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
      ds_followers = data.contents.display.ds_followers;
      ds_followers_description = data.contents.display.ds_followers_description;
      ds_stats_facebook_shares = data.contents.display.ds_stats_facebook_shares;
      ds_stats_retweets = data.contents.display.ds_stats_retweets;

      keywords = data.contents.keywords;
      
      if (data.contents.timeline.length) {
        
        // Process timeline results
        sb_followers_total = data.contents.timeline[0].user.followers_count;
        timeline_data = data.contents.timeline;
        timeline_data.reverse();
      
      } else {
      
        throwError('Twitter REST API down');
      
      }
      
      if (data.contents.search_results.results) {
      
        // Process search results
        search_data = data.contents.search_results.results;
        calculateGauge();
        
        search_data.reverse();
        
      	for (var i = 0; i < search_data.length; i++) {
          var result = search_data[i];
          
          // See if this is newer than what is already pooled
          // If yes, add it at current position
          // If not, do nothing
          if (result.id > search_data_max_id) {
            pool.splice(pool_index, 0, {type: 'search', data: result});
            search_data_max_id = result.id;
          }
      	}      	
      	
      } else {
        
        throwError('Twitter Search API down');
      
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

// Updates the Countdown Display
// Can be a countdown to a @firefox followers milestone
// or a countdown to a datetime
function updateCountdown() {

  var counter_dt;
  clearInterval(ds_datetime_interval);
  
  if (ds_type == 'afollowers') {
  
    counter_dt = ds_followers_description;
    
    if (sb_followers_total > ds_followers) {
    
      // Milestone surpassed!
      counter_dd = 0
    
    } else {
    
      // Milestone not yet reached
      counter_dd = addCommas(ds_followers - sb_followers_total)
      
    }
    
    $('#counter dd').text(counter_dd);
    
  } else if (ds_type == 'followers') {
  
    //if (ds_datetime_description)
    counter_dt = ds_datetime_description;
    
    //ds_datetime_interval
    ds_datetime_interval = setInterval(datetimeCountdown, 1000);
    
  } else {
  
    counter_dd = '';
    counter_dt = '';
    
  }
  
  $('#counter dt').text(counter_dt);

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
  if (bodies.length >= res.maxBubbles[res_current]) return;
  
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

function search() {
  
  // Clear the pool
  clearPool();
  
  // Set the query
  search_query = $('#search-input').val();
  
  
  
}

function clearPool () {
  pool = [];
  pool_index = 0;
}


function init() {

	bubble_wrapper = document.getElementById('bubbles');

	// create and configure new world
	worldAABB = new b2AABB();
	worldAABB.minVertex.Set( 0, 0 );
	worldAABB.maxVertex.Set( screen.width, screen.height + 200 );

  // allow objects to sleep, 
  var doSleep = false;
	world = new b2World( worldAABB, new b2Vec2( 0, 0 ), doSleep );
  world.m_gravity.y = gravity_y;
  
  // set walls around the world
	setWalls();
	reset();
}


function createBubble(type, data) {

  // calculate the position, will be used to place the element once created
  // could be changed to a fixed spawn point that'd match the machine chimney
	var x = stage[2]/2;
	var y = stage[3] + res.spawnY[res_current];
  bubble_count ++;
  var bubbleClass;
  var size;
  
  turnLampOn();
	setTimeout(turnLampOff, lamp_time_on);
	
  // create the DOM element to be animated
	var element = document.createElement("article");
	
	switch (type) {
	
    case 'search':
  	
      element.className = 'bubble tweet vhigh';
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
      
      element.className = 'bubble tweet error';
      element.innerHTML = buildBubbleError(data);
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
	if (height <= 150) {
    height_class = "s";
	} else if (height <= 200) {
    height_class = "m";
	} else if (height <= 250) {
    height_class = "l";
	} else {
    height_class = "xl";
	}
	jquery_element.addClass(height_class);
	
	// Calculate size (excluding padding)
	size = (0.5 * res.bubbleSize[res_current]) + (0.5 * height);
	
	// Avoid size being bigger than the chimney
	if (size > res.bubbleSize[res_current]) size = res.bubbleSize[res_current]
	
	element.width = size;
	element.height = size;
	
	// Hover in and out behaviour
  jquery_element.hover(function() {
  
    // Bring bubble to front and fade in the bubble menu
    $(this).css({'z-index': '999'}).find("nav").fadeIn(20);
    
    // Send the FTM logo behind all the bubbles
    $('header').css({'z-index': '10'});
    
    // Find the correspondant Body and set it's userData.hover = true
  	for (var i = 0; i < bodies.length; i++) {
  		if (bodies[i].m_userData.id == $(this).attr('id')) {
  		  bodies[i].m_userData.hover = true;
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
  
  jquery_element.find('li.flip a').click(function(){
    $(this).parents('.bubble').find('p.text, header, section').toggleClass('hide');
    return false;
  });
  
  $(bubble_wrapper).find('.avatar-wrapper').delay(500).animate({left: res.avatarLeft[res_current], top: res.avatarTop[res_current]}, 1000);
	elements.push( element );

  // create a new box2d body
	var b2body = new b2BodyDef();

  // define that body as a circle and its properties
	var circle = new b2CircleDef();
	circle.radius = size >> 1;
	circle.density = 1;
	circle.friction = 0.3;
  // Restitution is how elastic something is 0 being in elastic and 1 being totally elastic
  circle.restitution = 0.4;
	circle.preventRotation = true;
	
	b2body.AddShape(circle);
	
	// add the body to userData, so that all the elements can be addressed and manipulated later on, reset(); clears them all for eg.
	b2body.userData = {element: element, id: bubble_count, hover: false};

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
  walls[0] = createBox(world, stage[2] / 2, 0, stage[2], (10 * res.multiplier[res_current]));

  // bottom machine base box
	walls[1] = createBox(world, stage[2] / 2, stage[3], stage[2], (100 * res.multiplier[res_current]));
	
	// machine polygon left
	walls[2] = createPoly(world, (stage[2] / 2) + (100 * res.multiplier[res_current]), (stage[3] - (330 * res.multiplier[res_current])), [
    [(10 * res.multiplier[res_current]), 0],
    [(40 * res.multiplier[res_current]), 0],
    [(110 * res.multiplier[res_current]), (60 * res.multiplier[res_current])],
    [(110 * res.multiplier[res_current]), (330 * res.multiplier[res_current])],
    [0, (330 * res.multiplier[res_current])]
  ], true);
  
  // machine polygon right
  walls[3] = createPoly(world, (stage[2] / 2) - (210 * res.multiplier[res_current]), (stage[3] - (330 * res.multiplier[res_current])), [
    [(70 * res.multiplier[res_current]), 0],
    [(100 * res.multiplier[res_current]), 0],
    [(110 * res.multiplier[res_current]), (330 * res.multiplier[res_current])],
    [0, (330 * res.multiplier[res_current])],
    [0, (60 * res.multiplier[res_current])]
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
      pool.splice(pool_index, 0, {type: 'ffdownloads', data: Math.floor(sb_ffdownloads_total / sb_ffdownloads_step) * sb_ffdownloads_step});
      
    }
  }
}

function specialBubbleFollowersCheck() {
  if (sb_followers_step > 0) {
  
    if (sb_followers_last == 0) sb_followers_last = sb_followers_total;
    
    if ((sb_followers_total > sb_followers_last) &&
      (Math.floor(sb_followers_total / sb_followers_step) > Math.floor(sb_followers_last / sb_followers_step))) {
      
      sb_followers_last = sb_followers_total;
      pool.splice(pool_index, 0, {type: 'followers', data: Math.floor(sb_followers_total / sb_followers_step) * sb_followers_step});
      
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
		newTop = (body.m_position0.y - (element.height >> 1) - (10 * res.multiplier[res_current]));
		element.style.left = newLeft + 'px';
		element.style.top = newTop + 'px';

    if (body.m_userData.hover) {
      body.m_linearVelocity.SetZero();
    }

		// Destroy bubble if it's out of the screen
		if (((newLeft + Math.floor(element.width)) <= 1) ||
		  (newLeft > stage[2])){
		  
		  world.DestroyBody(body);
		  bodies.splice(i, 1);
		  elements.splice(i, 1);
		  $(element).remove();
		  
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

function play() {
	interval_loop = setInterval( loop, 1000 / 30 );
	interval_spwan = setInterval(spawn, 3000);
}
function pause() {
  clearInterval(interval_loop);
  clearInterval(interval_spwan);
}

function reset() {

	var i;

	if ( bodies ) {

		for ( i = 0; i < bodies.length; i++ ) {

			var body = bodies[ i ]
      $(bubble_wrapper).children().remove();
			world.DestroyBody( body );
			body = null;
		}
	}
	
	bodies = [];
	elements = [];
	
}

// BROWSER DIMENSIONS

function getBrowserDimensions() {

	stage[0] = window.screenX;
	stage[1] = window.screenY;
	stage[2] = window.innerWidth;
	stage[3] = window.innerHeight;
	
  if ((stage[2] > 1200) && (stage[3] > 600)) {
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

  var real_name = '', username = '', profile_image_url = '', user_location, user_url = '', followers_count = '', retweet_count = '', description = '', text = '';
      
  if (data.user) {
  
    // Timeline tweet
    real_name = data.user.name;
    username = data.user.screen_name;
    profile_image_url = data.user.profile_image_url;
    user_location = data.user.location;
    user_url = data.user.url;
    followers_count = data.user.followers_count;
    retweet_count = data.retweet_count;
    description = data.user.description;
    
  } else {

    // Search result
    username = data.from_user;
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
  
  html = '\
		<header>\
			<h1><a href="http://twitter.com/' + username + '" title="' + username + '" rel="author external">' + username + '</a> wrote</h1>\
			<time datetime="" pubdate><a href="http://twitter.com/' + username + '/status/' + data.id + '" rel="bookmark external" title="permalink">' + jQuery.timeago(data.created_at.substring(4)) + '</a></time>\
		</header>\
		<p class="avatar-wrapper"><a href="http://twitter.com/' + username + '" title="' + username + '" rel="author external"><img alt="' + username + ' avatar" src="\
		' + profile_image_url + '" height="' + profile_image_size + '" width="' + profile_image_size + '" /></a></p>\
		<p class="text">' + text + '</p>\
		<section class="hide">\
			<dl>\
				<dt>Name</dt>\
				<dd>' + real_name + '</dd>\
				<dt>Location</dt>\
				<dd>' + user_location + '</dd>\
				<dt>Web</dt>\
				<dd><a href="' + user_url + '" rel="author external" title="Web">' + user_url.replace("http://", "").substr(0,15) + '</a></dd>\
				<dt>Followers</dt>\
				<dd>' + addCommas(followers_count) + '</dd>\
				<dt>Retweets</dt>\
				<dd>' + retweet_count + '</dd>\
				<dt>Bio</dt>\
				<dd>' + description.substr(0,40) + '</dd>\
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
    for (var key in keywords.highlights) {
      if (keywords.highlights.hasOwnProperty(key)) {
      
        // Replace keyword string: , becomes |, so it's the RegExp "or" operator
        fKwords = keywords.highlights[key].replace(/,/gi, '|');

        // Space or : before
        var reg = new RegExp('(\\s|:|^)(' + fKwords + ')', 'gi');
        input = input.replace(reg, '$1<span class="mood ' + key + '">$2</span>');
        
        // Space or : or , or ". " after
        var reg = new RegExp('(' + fKwords + ')(\\s|:|(\\.\\s)|(\\,\\s)|$)', 'gi');
        input = input.replace(reg, '<span class="mood ' + key + '">$1</span>$2');
        
      }
    }
  }
  return input;
}


function datetimeCountdown(){

  dateFuture = new Date(2010,06,7,9,0,0);

  //grab current date
	dateNow = new Date();
	
	//calc milliseconds between dates
	amount = dateFuture.getTime() - dateNow.getTime();
	
	delete dateNow;

	// time is already past
	if(amount < 0){
		$('#counter dd').text('Countdown reached!');
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
		$('#counter dd').text(out);

	}
}
