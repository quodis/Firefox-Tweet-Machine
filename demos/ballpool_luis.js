var canvas;

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
var worldAABB, world, iterations = 1, timeStep = 1 / 90;

var walls = [];
var wall_thickness = 200;
var wallsSetted = false;

var bodies, elements, text;

var createMode = false;
var destroyMode = false;

var isMouseDown = false;
var mouseJoint;
var mouseX = 0;
var mouseY = 0;

var PI2 = Math.PI * 2;

var timeOfLastTouch = 0;

$(document).ready(function(){
  // 
  init();
  // 
  play();	
});

function init() {

  // select the DOM object that'll work as a canvas
	canvas = document.getElementById( 'canvas' );
  
  // bind the document mouse events to functions
	document.onmousedown = onDocumentMouseDown;
	document.onmouseup = onDocumentMouseUp;
	document.onmousemove = onDocumentMouseMove;
	document.ondblclick = onDocumentDoubleClick;

  // handle touch events, assign appropriate mouse events
	document.addEventListener( 'touchstart', onDocumentTouchStart, false );
	document.addEventListener( 'touchmove', onDocumentTouchMove, false );
	document.addEventListener( 'touchend', onDocumentTouchEnd, false );


	// init box2d
	// create and configure new worls
	worldAABB = new b2AABB();
	
	// ???
	worldAABB.minVertex.Set( -200, -200 );
	worldAABB.maxVertex.Set( screen.width + 200, screen.height + 200 );

/* 	world = new b2World( worldAABB, new b2Vec2( 0, 0 ), true ); */
  var gravity = new b2Vec2( 0, -500 );
  // allow objects to sleep, 
  var doSleep = true;
	world = new b2World( worldAABB, gravity, doSleep );

// set walls around the world
	setWalls();
	reset();
}


function play() {

	setInterval( loop, 1000 / 40 );
}

function reset() {

	var i;

	if ( bodies ) {

		for ( i = 0; i < bodies.length; i++ ) {

			var body = bodies[ i ]
/* 			$('#canvas').removeChild( body.GetUserData().element ); */
      $('#canvas').children().remove();
			world.DestroyBody( body );
			body = null;
		}
	}

	// color theme
	theme = themes[ Math.random() * themes.length >> 0 ];
	$('body').css( 'background-color', theme[ 0 ]);

	bodies = [];
	elements = [];

	createInstructions();

	for( i = 0; i < 10; i++ ) {

		createBall();

	}

}

//

function onDocumentMouseDown() {

	isMouseDown = true;
	return false;
}

function onDocumentMouseUp() {

	isMouseDown = false;
	return false;
}

function onDocumentMouseMove( event ) {

	mouseX = event.clientX;
	mouseY = event.clientY;
}

function onDocumentDoubleClick() {

	reset();
}

function onDocumentTouchStart( event ) {

	if( event.touches.length == 1 ) {

		event.preventDefault();

		// Faking double click for touch devices

		var now = new Date().getTime();

		if ( now - timeOfLastTouch  < 250 ) {

			reset();
			return;
		}

		timeOfLastTouch = now;

		mouseX = event.touches[ 0 ].pageX;
		mouseY = event.touches[ 0 ].pageY;
		isMouseDown = true;
	}
}

function onDocumentTouchMove( event ) {

	if ( event.touches.length == 1 ) {

		event.preventDefault();

		mouseX = event.touches[ 0 ].pageX;
		mouseY = event.touches[ 0 ].pageY;

	}

}

function onDocumentTouchEnd( event ) {

	if ( event.touches.length == 0 ) {

		event.preventDefault();
		isMouseDown = false;

	}

}

//

function createInstructions() {

  // size of the instructions ball
	var size = 250;

  // create new DOM div element that'll wrap the DOM canvas circle and div with text, something like:
    // div
      // canvas
      // div
        // <span> text </span>
	var element = document.createElement( 'div' );
	element.width = size;
	element.height = size;	
	element.style.position = 'absolute';
	element.style.left = -200 + 'px';
	element.style.top = -200 + 'px';
	element.style.cursor = "default";

  // append the element to the DOM
	$('#canvas').append(element);
	// add the element to the elements array
	elements.push( element );

  // create a canvas DOM element
	var circle = document.createElement( 'canvas' );
	circle.width = size;
	circle.height = size;

  // get the canvas element context
	var graphics = circle.getContext( '2d' );

  // fill the canvas with color defined in theme array
	graphics.fillStyle = theme[ 3 ];
	// draw the circle in canvas element
	graphics.beginPath();
	graphics.arc( size * .5, size * .5, size * .5, 0, PI2, true );
	graphics.closePath();
	graphics.fill();

  // append the circle canvas DOM element to the instructions wrapper div
	$(element).append( circle );

	text = document.createElement( 'div' );
	text.onSelectStart = true;
	text.innerHTML = '<span style="color:' + theme[0] + ';font-size:40px;">Hello!</span><br /><br /><span style="font-size:15px;"><strong>This is how it works:</strong><br /><br />1. Drag a ball.<br />2.&nbsp;Click&nbsp;on&nbsp;the&nbsp;background.<br />3. Shake your browser.<br />4. Double click.<br />5. Play!</span>';
	text.style.color = theme[1];
	text.style.position = 'absolute';
	text.style.left = '0px';
	text.style.top = '0px';
	text.style.fontFamily = 'Georgia';
	text.style.textAlign = 'center';
	$(element).append(text);
	text.style.left = ((250 - text.clientWidth) / 2) +'px';
	text.style.top = ((250 - text.clientHeight) / 2) +'px';	


	var b2body = new b2BodyDef();

	var circle = new b2CircleDef();
	circle.radius = size / 2;
	circle.density = 1;
/* 	circle.friction = 0.3; */
	circle.friction = 0;
	circle.restitution = 0.3;
/* 	circle.preventRotation = true; */
	b2body.AddShape(circle);
	b2body.userData = {element: element};

	b2body.position.Set( Math.random() * stage[2], Math.random() * -200 );
/* 	b2body.linearVelocity.Set( Math.random() * 400 - 200, Math.random() * 400 - 200 ); */
	b2body.linearVelocity.Set( Math.random() * 400 - 200, 0 );
	bodies.push( world.CreateBody(b2body) );	
}

function createBall( x, y ) {

  // calculate the position, will be used to place the element once created
  // could be changed to a fixed spawn point that'd match the machine chimney
	var x = x; // || Math.random() * stage[2];
	var y = y; // || Math.random() * -200;

  // generate the random size
	var size = (Math.random() * 100 >> 0) + 20;

  // create the DOM element to be animated
	var element = document.createElement("canvas");
	element.width = size;
	element.height = size;
	element.style['position'] = 'absolute';
	element.style['left'] = -200 + 'px';
	element.style['top'] = -200 + 'px';

  // select the element we just created and get the 2d context ( 'cos it's a canvas element )
	var graphics = element.getContext("2d");

  // calculate number of inner circles
	var num_circles = Math.random() * 10 >> 0;
  
  // generate the interior circles on the element
	for (var i = size; i > 0; i-= (size/num_circles)) {

		graphics.fillStyle = theme[ (Math.random() * 4 >> 0) + 1];
		graphics.beginPath();
		graphics.arc(size * .5, size * .5, i * .5, 0, PI2, true); 
		graphics.closePath();
		graphics.fill();
	}

  // append the element to the #canvas div
	$('#canvas').append(element);

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
/* 	circle.restitution = 0.3; */
  circle.restitution = 0.3;
	circle.preventRotation = true;
	b2body.AddShape(circle);
	// add the body to userData, so that all the elements can be addressed and manipulated later on, reset(); clears them all for eg.
	b2body.userData = {element: element};

  // define position where the body will be spawned
	b2body.position.Set( x, y );

	// define initial velocity on x, y axis
/* 	b2body.linearVelocity.Set( Math.random() * 400 - 200, Math.random() * 400 - 200 ); */
	b2body.linearVelocity.Set( Math.random() * 400 - 200, -1000 );
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

  // look for mouse drag on each frame, simply check for changes in mouse position
	mouseDrag();
	
	// make the time advance
	world.Step(timeStep, iterations);

	for (i = 0; i < bodies.length; i++) {

		var body = bodies[i];
		var element = elements[i];

		element.style.left = (body.m_position0.x - (element.width >> 1)) + 'px';
		element.style.top = (body.m_position0.y - (element.height >> 1)) + 'px';

		if (element.tagName == 'DIV') {

/*
			var rotationStyle = 'rotate(' + (body.m_rotation0 * 57.2957795) + 'deg)';
			text.style.WebkitTransform = rotationStyle;
			text.style.MozTransform = rotationStyle;
			text.style.OTransform = rotationStyle;
*/

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

function mouseDrag()
{
	// mouse press
	if (createMode) {

		createBall( mouseX, mouseY );

	} else if (isMouseDown && !mouseJoint) {

		var body = getBodyAtMouse();

		if (body) {

			var md = new b2MouseJointDef();
			md.body1 = world.m_groundBody;
			md.body2 = body;
			// where to spawn the balls
			md.target.Set(mouseX, mouseY);
			// force exerced on spawned object (?)
			md.maxForce = 30000 * body.m_mass;
			// spawn frequency based on timesteps
			md.timeStep = timeStep;
			
			mouseJoint = world.CreateJoint(md);
			body.WakeUp();

		} else {

			createMode = true;

		}

	}

	// mouse release
	if (!isMouseDown) {

		createMode = false;
		destroyMode = false;

		if (mouseJoint) {

			world.DestroyJoint(mouseJoint);
			mouseJoint = null;

		}

	}

	// mouse move
	if (mouseJoint) {

		var p2 = new b2Vec2(mouseX, mouseY);
		mouseJoint.SetTarget(p2);
	}
}

function getBodyAtMouse() {

	// Make a small box.
	var mousePVec = new b2Vec2();
	mousePVec.Set(mouseX, mouseY);

	var aabb = new b2AABB();
	aabb.minVertex.Set(mouseX - 1, mouseY - 1);
	aabb.maxVertex.Set(mouseX + 1, mouseY + 1);

	// Query the world for overlapping shapes.
	var k_maxCount = 10;
	var shapes = new Array();
	var count = world.Query(aabb, shapes, k_maxCount);
	var body = null;

	for (var i = 0; i < count; ++i) {

		if (shapes[i].m_body.IsStatic() == false) {

			if ( shapes[i].TestPoint(mousePVec) ) {

				body = shapes[i].m_body;
				break;

			}

		}

	}

	return body;

}

function setWalls() {

	if (wallsSetted) {

		world.DestroyBody(walls[0]);
/*
		world.DestroyBody(walls[1]);
		world.DestroyBody(walls[2]);
		world.DestroyBody(walls[3]);
*/

		walls[0] = null; 
/*
		walls[1] = null;
		walls[2] = null;
		walls[3] = null;
*/
	}

          // createBox(world, x,            y,                width,    height, fixed)
  // top
	walls[0] = createBox(world, stage[2] / 2, - wall_thickness, stage[2], wall_thickness);
/*
  // bottom
	walls[1] = createBox(world, stage[2] / 2, stage[3] + wall_thickness, stage[2], wall_thickness);
  // left
	walls[2] = createBox(world, - wall_thickness, stage[3] / 2, wall_thickness, stage[3]);
	// right
	walls[3] = createBox(world, stage[2] + wall_thickness, stage[3] / 2, wall_thickness, stage[3]);	
*/

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