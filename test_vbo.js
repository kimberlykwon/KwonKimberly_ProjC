// Global Variables  
//   (These are almost always a BAD IDEA, but here they eliminate lots of
//    tedious function arguments. 
//    Later, collect them into just a few global, well-organized objects!)
// ============================================================================
// for WebGL usage:--------------------
var gl;													// WebGL rendering context -- the 'webGL' object
																// in JavaScript with all its member fcns & data
var g_canvasID;									// HTML-5 'canvas' element ID#

// For multiple VBOs & Shaders:-----------------
worldBox = new VBObox0();		  // Holds VBO & shaders for drawing world surfaces; // use for project A; put in ground plane and box (1m) centered at origin
part1Box = new VBObox1();		  // "  "  for drawing 1st particle system           // import 2d bouncy ball and make it work in 3d constraint


// For animation:---------------------
var g_last = Date.now();				// Timestamp: set after each frame of animation,
																// used by 'animate()' function to find how much
																// time passed since we last updated our canvas.

// For mouse/keyboard:------------------------
var g_show0 = 1;								// 0==Show, 1==Hide VBO0 contents on-screen.
var g_show1 = 1;								// 	"					"			VBO1		"				"				" 

var ANGLE_STEP = 25.0;		// Rotation angle rate (degrees/second)
var sphereAngle;
var objectAngle;

var lightOn = true;
var headlightOn = true;
var phongLighting = true;
var phongShading = true;


function main() {
//=============================================================================
  // Retrieve <canvas> element
  g_canvasID = document.getElementById('webgl');

  console.log(g_canvasID.width);

  gl = getWebGLContext(g_canvasID);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize each of our 'vboBox' objects: 
  worldBox.init(gl);		// VBO + shaders + uniforms + attribs for our 3D world,
                      //including ground-plane,
                       
  part1Box.init(gl);	
  
  document.onkeydown= function(ev){keydown(ev, gl); };

  browserResize();			// Re-size this canvas before we use it. (ignore the 

  gl.clearColor(0.0, 0.0, 0.0, 1.0);	  // RGBA color for clearing <canvas>
  
  sphereAngle = 0.0;
  objectAngle = 0.0;

  var tick = function() {			// define our self-calling animation function:
    elapsed = animate();  // Update the rotation angle
    sphereAngle = animateSphere(sphereAngle, elapsed);
    objectAngle = animateObject(objectAngle, elapsed);
    masterDraw(); // Draw the triangle
    requestAnimationFrame(tick, g_canvasID); // browser request: ?call tick fcn
  };
  tick();
}

function animate() {
  //==============================================================================
    // Calculate the elapsed time
    var now = Date.now();
    var elapsed = now - g_last;
    g_last = now;

    return elapsed;
}

function animateSphere(angle, elapsed){
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}

function animateObject(angle, elapsed) {
    if(angle >   20.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
    if(angle <  -85.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
    var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    return newAngle %= 360;
  }

function masterDraw() {
//=============================================================================
  // Clear on-screen HTML-5 <canvas> object:
  gl.clear(gl.COLOR_BUFFER_BIT);
  //gl = someCanvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });

  gl.enable(gl.DEPTH_TEST);

	if(g_show0 == 1) {	// IF user didn't press HTML button to 'hide' VBO0:
		worldBox.adjust(gl);		// Send new values for uniforms to the GPU, and
		worldBox.draw(gl);			// draw our VBO's contents using our shaders.
  }

  if(g_show1 == 1) {	// IF user didn't press HTML button to 'hide' VBO0:
    part1Box.adjust(gl);		// Send new values for uniforms to the GPU, and
    part1Box.draw(gl);			// draw our VBO's contents using our shaders.
  }
}

function VBO0toggle() {
//=============================================================================
// Called when user presses HTML-5 button 'Show/Hide VBO0'.
  if(g_show0 != 1) g_show0 = 1;				// show,
  else g_show0 = 0;										// hide.
  console.log('g_show0: '+g_show0);
}

function VBO1toggle() {
//=============================================================================
// Called when user presses HTML-5 button 'Show/Hide VBO1'.
  if(g_show1 != 1) g_show1 = 1;			// show,
  else g_show1 = 0;									// hide.
  console.log('g_show1: '+g_show1);
}
  
function keydown(ev, gl) {
  //------------------------------------------------------
  //HTML calls this'Event handler' or 'callback function' when we press a key:
      // Arrow keys
      // right
      if(ev.keyCode == 39) { // The right arrow key was pressed
          strafe("R");
        } else 
      // left
      if (ev.keyCode == 37) { // The left arrow key was pressed
          strafe("L");
      } else 
      // up
      if (ev.keyCode == 38) { // The left arrow key was pressed
          move("F");
      } else
      // down
      if (ev.keyCode == 40) { // The left arrow key was pressed
          move("B");
      } else

      if(ev.keyCode == 87) { // The right arrow key was pressed
        tilt("U");
      } else 
      //a
      if (ev.keyCode == 65) { // The left arrow key was pressed
        turn("L");
      } else 
      //s
      if (ev.keyCode == 83) { // The left arrow key was pressed
        tilt("D");		
      } else
      //d
      if (ev.keyCode == 68) { // The left arrow key was pressed
        turn("R");	
      }

      //z
      if (ev.keyCode == 90) {
        if(headlightOn){
          headlightOn = false;
          console.log("Headlight turned off");
        } else {
          headlightOn = true;
          console.log("Headlight turned on");
        }
      }
      // x
      if (ev.keyCode == 88){
        if (lightOn){
          lightOn = false;
          console.log("Secondary light turned off");
        } else {
          lightOn = true;
          console.log("Secondary light turned on");
        }
      }
      //c
      if (ev.keyCode == 67){
        if (phongLighting){
          phongLighting = false;
          console.log("Using Blinn-Phong Lighting");
        } else {
          phongLighting = true;
          console.log("Using Phong Lighting");
        }
      }
      //v
      if (ev.keyCode == 86){
        if (phongShading){
          phongShading = false;
          console.log("Using Gouroud Shading");
        } else {
          phongShading = true;
          console.log("Using Phong Shading");
        }
      }
      masterDraw(gl);  
  }


function browserResize() {
  //=============================================================================  
  var nuCanvas = document.getElementById('webgl');	// get current canvas
  var nuGL = getWebGLContext(nuCanvas);							// and context:

  //Make canvas fill the top 3/4 of our browser window:
  nuCanvas.width = innerWidth;
  nuCanvas.height = innerHeight*(4/5);

  masterDraw(nuGL);
}
