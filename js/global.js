var bubbleWrapper;

var stage = [ window.screenX, window.screenY, window.innerWidth, window.innerHeight ];
getBrowserDimensions();

/* var worldAABB, world, iterations = 1, timeStep = 1 / 20; */
var worldAABB, world, iterations = 1, timeStep = 1 / 100;

var walls = [];
var wall_thickness = 200; // Seems to have no effect
var wallsSetted = false;
var bodies, elements, text;
var PI2 = Math.PI * 2;

$(document).ready(function(){
  init();
  play();
  setInterval(spawn, 1000);

});

var debug = true;

var pool = [];
var pool_index = 0;
var firefox_data;
var firefox_data_max_id = 0;

var search_data;
var search_data_max_id = 0;


// Special bubbles
var sb_clock_step = 0; // Minutes
var sb_clock_last = 0;

var sb_ffdownloads_step = 0; // At each step of downloads
var sb_ffdownloads_last = 0;
var sb_ffdownloads_stats = 0;

function getDataFromProxy() {
  $.getJSON('http://192.168.1.84/proxy.php', function(data) {
    // print it out to the wrapper
    if (data.status.http_code == 200) {
      
      if (debug) console.log('Received code 200');
      
      // Update variables with new data
      sb_clock_step = data.contents.triggers.minutes;
      sb_ffdownloads_step = data.contents.triggers.firefox_download_step;
      sb_ffdownloads_stats = data.contents.triggers.firefox_download_stats;
      
      specialBubbleFFDownloadsCheck();
      
      // Reverse results, so we start with oldest
      firefox_data = data.contents.timeline;
      firefox_data.reverse();      
      search_data = data.contents.search_results;
      search_data.results.reverse();
      
      if (debug) console.log(search_data.results.length + ' results for search');
      if (debug) console.log('Previous pool length: ' + pool.length);
      
    	for (var i = 0; i < search_data.results.length; i++) {
        var result = search_data.results[i];
        
        // See if this is newer than what is already pooled
        // If yes, add it at current position
        // If not, do nothing
        if (result.id > search_data_max_id) {
          pool.splice(pool_index, 0, {type: 'search', data: result});
          search_data_max_id = result.id;
        }
    	}
      if (debug) console.log('New pool length: ' + pool.length);
    } else {
      contents = data.status.http_code;
    }

  });

}

function spawn() {
  
  // Check if pool is empty
  if (pool.length == 0) return;
  
  // Check if there are too many bubbles on display
  if (bodies.length > 10) return;
  
  // Check if at end of pool
  // If so, resort it by id and delete whatever is over 40 results
  if ((pool_index+1) > pool.length) {
    pool_index = 0;
    
  }
  
  // Show 
  createBubble(pool[pool_index].type, pool[pool_index].data);
  
  // Jump to next
  pool_index ++;
  
}

function search() {
  // Clear the pool
  clearPool();
}

function clearPool () {
  pool = [];
  pool_index = 0;
}


function init() {

	bubbleWrapper = document.getElementById('bubbles-wrapper');

	// create and configure new world
	worldAABB = new b2AABB();
	worldAABB.minVertex.Set( 0, 0 );
	worldAABB.maxVertex.Set( screen.width, screen.height + 200 );

  // x/y point of gravity - the further, the stronger
  var gravity = new b2Vec2( 0, -300 );
  
  // allow objects to sleep, 
  var doSleep = false;
	world = new b2World( worldAABB, gravity, doSleep );

  // set walls around the world
	setWalls();
	reset();
	getDataFromProxy();
}


function createBubble(type, data) {

  // calculate the position, will be used to place the element once created
  // could be changed to a fixed spawn point that'd match the machine chimney
	var x = stage[2]/2;
	var y = 300;

  // generate the random size
	var size = (Math.random() * 50 >> 0) + 200;

  // create the DOM element to be animated
  
  
	var element = document.createElement("div");
	element.className = 'bubble';
	element.width = size;
	element.height = size;
	element.style['width'] = size + 'px';
	element.style['height'] = size + 'px';
	element.style['position'] = 'absolute';
	element.style['left'] = -200 + 'px';
	element.style['top'] = -200 + 'px';
	
	if (type == 'search') {
	
    element.innerHTML = 'Time: ' + jQuery.timeago(data.created_at.substring(4)) + '<br>Text: ' + data.text;
	
  } else if (type == 'clock') {
	
    element.innerHTML = data; 
    pool.splice(pool_index, 1);
    pool_index --;
  	 
	} else if (type == 'ffdownloads') {
    
    element.innerHTML = data;
    pool.splice(pool_index, 1);
    pool_index --;

	}

  // append the element to the bubbleWrapper
	$(bubbleWrapper).append(element);

  // add that element to the elements array (needs to check this a bit more)
	elements.push( element );

  // create a new box2d body
	var b2body = new b2BodyDef();

  // define that body as a circle and its properties
	var circle = new b2CircleDef();
	circle.radius = size >> 1;
	circle.density = 1;
	circle.friction = 0.3;
  // Restitution is how elastic something is 0 being in elastic and 1 being totally elastic
  circle.restitution = 0.1;
	circle.preventRotation = true;
	b2body.AddShape(circle);
	// add the body to userData, so that all the elements can be addressed and manipulated later on, reset(); clears them all for eg.
	b2body.userData = {element: element};

  // define position where the body will be spawned
	b2body.position.Set( x, y );

	// define initial velocity on x, y axis
/* 	b2body.linearVelocity.Set( Math.random() * 400 - 200, Math.random() * 400 - 200 ); */
	b2body.linearVelocity.Set( Math.random() * 400 - 200, -10 );
	// add the box2d body to the real world and bodies array
	bodies.push( world.CreateBody(b2body) );
}


function setWalls() {

	if (wallsSetted) {

		world.DestroyBody(walls[0]);
		world.DestroyBody(walls[1]);
		world.DestroyBody(walls[2]);

		walls[0] = null; 
		walls[1] = null; 
		walls[2] = null; 
	}

  // arguments: world, x, y, width, height, fixed
  // top box wall
	walls[0] = createPoly(world, stage[2] / 2, 0, [
	 [(stage[2] / 2)+100, 0],
	 [0, 20],
	 [- (stage[2] / 2) - 100, 0]
  ], true);
  
  // bottom machine base box
	walls[1] = createBox(world, stage[2] / 2, stage[3], stage[2], 70);
	
	// machine polygon
	walls[2] = createPoly(world, stage[2] / 2, (stage[3]-310), [
	 [0, 0],
	 [100, 20],
	[300, 200],
	 [-300, 200],
	 [-100, 20]
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
    
    if ((seconds == 0) && 
      ((minutes % sb_clock_step) == 0) && 
      ((hours + ':' + minutes) != sb_clock_last)) {
      sb_clock_last = hours + ':' + minutes
      pool.splice(pool_index, 0, {type: 'clock', data: 'It is ' + sb_clock_last});
    }
  }
}

function specialBubbleFFDownloadsCheck() {
  if (sb_ffdownloads_step > 0) {
    if ((sb_ffdownloads_stats > sb_ffdownloads_last) &&
      (Math.floor(sb_ffdownloads_stats / sb_ffdownloads_step) > Math.floor(sb_ffdownloads_last / sb_ffdownloads_step))) {
      sb_ffdownloads_last = sb_ffdownloads_stats;
      pool.splice(pool_index, 0, {type: 'ffdownloads', data: 'Firefox just downloaded for the ' + Math.floor(sb_ffdownloads_stats*sb_ffdownloads_step) + 'th time'});
      console.log('ffdownloads created');
    }
  }
}


// run this on every frame
function loop(){
  
  // check for changes in the viewport and adjust the walls if there's any change
  if (getBrowserDimensions()) {
    setWalls();
  }
  
  specialBubbleClockCheck();
  
	// make the time advance
	world.Step(timeStep, iterations);

	for (i = 0; i < bodies.length; i++) {

		var body = bodies[i];
		var element = elements[i];
		
		newLeft = (body.m_position0.x - (element.width >> 1))
		newTop = (body.m_position0.y - (element.height >> 1))
		element.style.left = newLeft + 'px';
		element.style.top = newTop + 'px';


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

	setInterval( loop, 1000 / 30 );
}

function reset() {

	var i;

	if ( bodies ) {

		for ( i = 0; i < bodies.length; i++ ) {

			var body = bodies[ i ]
      $(bubbleWrapper).children().remove();
			world.DestroyBody( body );
			body = null;
		}
	}
	
	bodies = [];
	elements = [];
	
}

// BROWSER DIMENSIONS

function getBrowserDimensions() {

	var changed = false;

	if (stage[0] != window.screenX) {

		stage[0] = window.screenX;
		changed = true;

	}

	if (stage[1] != window.screenY) {

		stage[1] = window.screenY;
		changed = true;

	}

	if (stage[2] != window.innerWidth) {

		stage[2] = window.innerWidth;
		changed = true;

	}

	if (stage[3] != window.innerHeight) {

		stage[3] = window.innerHeight;
		changed = true;

	}

	return changed;

}