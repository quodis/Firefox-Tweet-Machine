var bubbleWrapper;

var delta = [ 0, 0 ];
var stage = [ window.screenX, window.screenY, window.innerWidth, window.innerHeight ];
getBrowserDimensions();

var themes = [ [ "#10222B", "#95AB63", "#BDD684", "#E2F0D6", "#F6FFE0" ],
		[ "#362C2A", "#732420", "#BF734C", "#FAD9A0", "#736859" ],
		[ "#0D1114", "#102C2E", "#695F4C", "#EBBC5E", "#FFFBB8" ],
		[ "#2E2F38", "#FFD63E", "#FFB54B", "#E88638", "#8A221C" ],
		[ "#121212", "#E6F2DA", "#C9F24B", "#4D7B85", "#23383D" ],
		[ "#343F40", "#736751", "#F2D7B6", "#BFAC95", "#8C3F3F" ],
		[ "#000000", "#2D2B2A", "#561812", "#B81111", "#FFFFFF" ],
		[ "#333B3A", "#B4BD51", "#543B38", "#61594D", "#B8925A" ] ];
var theme;

/* var worldAABB, world, iterations = 1, timeStep = 1 / 20; */
var worldAABB, world, iterations = 1, timeStep = 1 / 10;

var walls = [];
var wall_thickness = 200; // Seems to have no effect
var wallsSetted = false;

var bodies, elements, text;

var createMode = false;
var destroyMode = false;

var isMouseDown = false;
var mouseJoint;
var mouseX = 0;
var mouseY = 0;

var PI2 = Math.PI * 2;

$(document).ready(function(){
  // 
  init();
  // 
  play();
  
  setInterval( createSomeBubbles, 200 );
});

function init() {

  // select the DOM object that'll work as a bubbleWrapper
	bubbleWrapper = document.getElementById('bubbles-wrapper');

	// init box2d
	// create and configure new worls
	worldAABB = new b2AABB();
	
	// ???
	worldAABB.minVertex.Set( 0, 0 );
	worldAABB.maxVertex.Set( screen.width, screen.height + 200 );

  // x/y point of gravity - the further, the stronger
  var gravity = new b2Vec2( 0, 500 );
  
  // allow objects to sleep, 
  var doSleep = false;
	world = new b2World( worldAABB, gravity, doSleep );

  // set walls around the world
	setWalls();
	reset();
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

	// color theme
	theme = themes[ Math.random() * themes.length >> 0 ];
	bodies = [];
	elements = [];
	
}


function createSomeBubbles() {
  for ( i = 0; i < 1  ; i++ ) {
    createBubble(stage[2]/2, 300);
  }
}

function createBubble( x, y ) {

  // calculate the position, will be used to place the element once created
  // could be changed to a fixed spawn point that'd match the machine chimney
	var x = x; // || Math.random() * stage[2];
	var y = y; // || Math.random() * -200;

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

// run this on every frame
function loop() {

  // check for changes in the viewport and adjust the walls if there's any change
	if (getBrowserDimensions()) {

		setWalls();

	}

  // set world gravity
/*
	delta[0] += (0 - delta[0]) * .5;
	delta[1] += (0 - delta[1]) * .5;

	world.m_gravity.x = 0 + delta[0];
	world.m_gravity.y = 350 + delta[1];
*/

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
		if ((newLeft < (-element.width)) ||
		  (newLeft > stage[2])){
		  world.DestroyBody(body);
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


function setWalls() {

	if (wallsSetted) {

		world.DestroyBody(walls[0]);
		world.DestroyBody(walls[1]);
		world.DestroyBody(walls[2]);

		walls[0] = null; 
		walls[1] = null; 
		walls[2] = null; 
	}

          // createBox(world, x,           y,                width,    height, fixed)
  // top box wall
  // walls[0] = createBox(world, stage[2] / 2, - wall_thickness, stage[2], wall_thickness);
	walls[0] = createPoly(world, stage[2] / 2, 0, [
	 [stage[2] / 2, 0],
	 [0, 20],
	 [- stage[2] / 2, 0]
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

// BROWSER DIMENSIONS

function getBrowserDimensions() {

	var changed = false;

	if (stage[0] != window.screenX) {

		delta[0] = (window.screenX - stage[0]) * 50;
		stage[0] = window.screenX;
		changed = true;

	}

	if (stage[1] != window.screenY) {

		delta[1] = (window.screenY - stage[1]) * 50;
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