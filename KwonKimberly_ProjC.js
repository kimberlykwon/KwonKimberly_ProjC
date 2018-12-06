// Vertex shader program----------------------------------
var VSHADER_SOURCE = 
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'varying vec4 v_Position;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  v_Position = u_ModelMatrix * a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '  v_Color = a_Color;\n' + 
  '}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE = 
  'precision mediump float;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

// Animation
var ANGLE_STEP = 45.0;

var a_PositionLoc;							// GPU location for 'a_Position' attrib in VBO1
var a_ColorLoc;									// GPU location ofr 'a_Color' attrib in VBO1

var g_showGouroudShading;
var g_showPhongShading;
var g_showPhongLighting;
var g_showBillPhongLighting;

var floatsPerVertex = 7;	

function main() {
//==============================================================================
  // Retrieve <canvas> element
  var canvas = document.getElementById('HTML5_canvas');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Initialize vertex buffer
  n = initVertexBuffer(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST); 	  
	
  // Get handle to graphics system's storage location of u_MvpMatrix
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  if (!u_MvpMatrix || !u_ModelMatrix) { 
    console.log('Failed to get the storage location');
    return;
  }

  // Create a local version of our model matrix in JavaScript 
  var modelMatrix = new Matrix4(); 
  // Pass the model matrix to u_ModelMatrix
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  mvpMatrix = new Matrix4();
  mvpMatrix.setPerspective(30, canvas.width/canvas.height, 1, 100);
  mvpMatrix.multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  document.onkeydown= function(ev){keydown(ev, gl); };

  // Create, init current rotation angle value in JavaScript
  
  currentAngle = 0.0;

  //Start drawing: create 'tick' variable whose value is this function:
  var tick = function() {
    currentAngle = animate(currentAngle);  // Update the rotation angle
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawResize();
    requestAnimationFrame(tick, canvas);   
  };
  tick();							// start (and continue) animation: draw current image

  // resize window
  drawResize();
  drawResize();
}

function initVertexBuffer(gl) {
//==============================================================================
// Create one giant vertex buffer object (VBO) that holds all vertices for all
// shapes.
 
 	// Make each 3D shape in its own array of vertices:
  makeAxes();
  makeGroundGrid();
  
  // how many floats total needed to store all shapes?
	var mySiz = (axesVerts.length + gndVerts.length);						

	// How many vertices total?
	var nn = mySiz / floatsPerVertex;
	// Copy all shapes into one big Float32 array:
  var colorShapes = new Float32Array(mySiz);
	// Copy them:  remember where to start for each shape:

  var i = 0;
  
  axesStart = i;
  for(j=0; j< axesVerts.length; i++, j++){
    colorShapes[i] = axesVerts[j];
  }

  gndStart = i;
  for(j=0; j< gndVerts.length; i++, j++){
    colorShapes[i] = gndVerts[j];
  }

  // Create a buffer object on the graphics hardware:
  var shapeBufferHandle = gl.createBuffer();  
  if (!shapeBufferHandle) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  // Bind the the buffer object to target:
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  // Transfer data from Javascript array colorShapes to Graphics system VBO
  // (Use sparingly--may be slow if you transfer large shapes stored in files)
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);
    
  //Get graphics system's handle for our Vertex Shader's position-input variable: 
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }

  var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?

  // Use handle to specify how to retrieve **POSITION** data from our VBO:
  gl.vertexAttribPointer(
  		a_Position, 	// choose Vertex Shader attribute to fill with data
  		4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
  		gl.FLOAT, 		// data type for each value: usually gl.FLOAT
  		false, 				// did we supply fixed-point data AND it needs normalizing?
  		FSIZE * floatsPerVertex, // Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  		0);						// Offset -- now many bytes from START of buffer to the
  									// value we will actually use?
  gl.enableVertexAttribArray(a_Position);  
  									// Enable assignment of vertex buffer object's position data

  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  // Use handle to specify how to retrieve **COLOR** data from our VBO:
  gl.vertexAttribPointer(
  	a_Color, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 7, 			// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  	FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w
  									
  gl.enableVertexAttribArray(a_Color);  
  									// Enable assignment of vertex buffer object's position data

	//--------------------------------DONE!
  // Unbind the buffer object 
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return nn;
}

function makeAxes(){
  axesVerts = new Float32Array(
    // Drawing Axes: Draw them using gl.LINES drawing primitive;
     	// +x axis RED; +y axis GREEN; +z axis BLUE; origin: GRAY
		[0.0,  0.0,  0.0, 1.0,		0.3,  0.3,  0.3,	// X axis line (origin: gray)
		 1.3,  0.0,  0.0, 1.0,		1.0,  0.3,  0.3,	// 						 (endpoint: red)
		 
		 0.0,  0.0,  0.0, 1.0,    0.3,  0.3,  0.3,	// Y axis line (origin: white)
		 0.0,  1.3,  0.0, 1.0,		0.3,  1.0,  0.3,	//						 (endpoint: green)

		 0.0,  0.0,  0.0, 1.0,		0.3,  0.3,  0.3,	// Z axis line (origin:white)
		 0.0,  0.0,  1.3, 1.0,		0.3,  0.3,  1.0,	//						 (endpoint: blue)
  ]);
}

function makeGroundGrid() {
  //==============================================================================
  // Create a list of vertices that create a large grid of lines in the x,y plane
  // centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.
  
    var xcount = 100;			// # of lines to draw in x,y to make the grid.
    var ycount = 100;		
    var xymax	= 50.0;			// grid size; extends to cover +/-xymax in x and y.
     var xColr = new Float32Array([1.0, 1.0, 1.0]);	// bright yellow
     var yColr = new Float32Array([0.5, 0.5, 0.5]);	// bright green.
     
    // Create an (global) array to hold this ground-plane's vertices:
    gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
              // draw a grid made of xcount+ycount lines; 2 vertices per line.
              
    var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
    var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
    
    // First, step thru x values as we make vertical lines of constant-x:
    for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
      if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
        gndVerts[j  ] = -xymax + (v  )*xgap;	// x
        gndVerts[j+1] = -xymax;								// y
        gndVerts[j+2] = 0.0;									// z
        gndVerts[j+3] = 1.0;									// w.
      }
      else {				// put odd-numbered vertices at (xnow, +xymax, 0).
        gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
        gndVerts[j+1] = xymax;								// y
        gndVerts[j+2] = 0.0;									// z
        gndVerts[j+3] = 1.0;									// w.
      }
      gndVerts[j+4] = xColr[0];			// red
      gndVerts[j+5] = xColr[1];			// grn
      gndVerts[j+6] = xColr[2];			// blu
    }
    // Second, step thru y values as wqe make horizontal lines of constant-y:
    // (don't re-initialize j--we're adding more vertices to the array)
    for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
      if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
        gndVerts[j  ] = -xymax;								// x
        gndVerts[j+1] = -xymax + (v  )*ygap;	// y
        gndVerts[j+2] = 0.0;									// z
        gndVerts[j+3] = 1.0;									// w.
      }
      else {					// put odd-numbered vertices at (+xymax, ynow, 0).
        gndVerts[j  ] = xymax;								// x
        gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
        gndVerts[j+2] = 0.0;									// z
        gndVerts[j+3] = 1.0;									// w.
      }
      gndVerts[j+4] = yColr[0];			// red
      gndVerts[j+5] = yColr[1];			// grn
      gndVerts[j+6] = yColr[2];			// blu
    }
}

function drawGrid(gl){
  pushMatrix(mvpMatrix);
  // Rotate to make a new set of 'world' drawing axes: 
  mvpMatrix.translate(0.0, 0.0, 0.0);	
  //mvpMatrix.rotate(-90.0, 1,0,0);	// new one has "+z points upwards",

  mvpMatrix.scale(0.1, 0.1, 0.1);		// shrink the drawing axes 
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  // Now, using these drawing axes, draw our ground plane: 
  gl.drawArrays(gl.LINES,							// use this drawing primitive, and
                gndStart/floatsPerVertex,	// start at this vertex number, and
                gndVerts.length/floatsPerVertex);		// draw this many vertices
  
  mvpMatrix.scale(4, 4, 4);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.LINES, 
                axesStart/floatsPerVertex,
                axesVerts.length/floatsPerVertex);				// start at vertex #12; draw 6 vertices
  
  mvpMatrix = popMatrix();
}

var zNear = 1;
var zFar = 8;

// FIX: not split exactly in half
function draw(gl){
//==============================================================================
  // Clear <canvas> color AND DEPTH buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.viewport(0,  														// Viewport lower-left corner
							0,															// (x,y) location(in pixels)
  						gl.drawingBufferWidth, 				// viewport width, height.
  						gl.drawingBufferHeight);
              
  vpAspect = (gl.drawingBufferWidth 	/				// On-screen aspect ratio for
              gl.drawingBufferHeight);				// this camera: width/height.
  
  mvpMatrix.setIdentity();    // DEFINE 'world-space' coords.
          
  // For this viewport, set camera's eye point and the viewing volume:
  mvpMatrix.setPerspective(35.0, 				// fovy: y-axis field-of-view in degrees 	
  																		// (top <-> bottom in view frustum)
  													vpAspect, // aspect ratio: width/height
  													1, 100);	// near, far (always >0).
                            
                            
  mvpMatrix.lookAt(	g_Eye[x], g_Eye[y], g_Eye[z], 					// 'Center' or 'Eye Point',
  									g_LookAt[x], g_LookAt[y], g_LookAt[z], 					// look-At point,
  									g_Up[x], g_Up[y], g_Up[z]);					// View UP vector, all in 'world' coords.


  // // Pass the view projection matrix
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

	// Draw the scene:
  drawAll(gl);
}

function drawAll(gl){
  drawGrid(gl);
}

// camera coordinates
//var g_EyeX = 6.25, g_EyeY = 0.0, g_EyeZ = 1.25; 
var g_Eye = [6.25, 0.0, 1.25];
var g_LookAt = [0, 0, 0];
var g_Up = [0, 0, 10];
var x = 0, y = 1, z = 2;

// camera movements
function move(dir){
  var vel = 0.055;
  var d = [1,1,1];

  if (dir == "B"){
    vel *= -1;
  }

  for (j=0; j<3; j++){
    d[j] = (g_LookAt[j]-g_Eye[j]) * vel;
    g_LookAt[j] += d[j];
    g_Eye[j] += d[j];
  }
}

// https://stackoverflow.com/questions/17410809/how-to-calculate-rotation-in-2d-in-javascript
function rotate(cx, cy, x, y, angle) {
    var radians = (Math.PI / 180) * angle,
        cos = Math.cos(radians),
        sin = Math.sin(radians),
        nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
        ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
    return [nx, ny];
}

function turn(dir) {
  var turnAngle = 3.0;

  if (dir == "L"){
    turnAngle *= -1;
  }

  var a = rotate(g_Eye[x], g_Eye[y], g_LookAt[x], g_LookAt[y], turnAngle);

  g_LookAt[x] = a[0];
  g_LookAt[y] = a[1];
}

function tilt(dir) {
  var tiltAmt = .1;

  if (dir == "D"){
    tiltAmt *= -1;
  } 

  g_LookAt[z] += tiltAmt;
}

function strafe(dir){
  var movement = 90.0;

  if (dir == "L"){
    movement *= -1;
  }

  var a = rotate(g_Eye[x], g_Eye[y], g_LookAt[x], g_LookAt[y], movement);
  console.log(a);
  var d1 = (a[x] - g_Eye[x])/15;
  var d2 = (a[y] - g_Eye[y])/15;

  g_Eye[x] += d1;
  g_Eye[y] += d2;
  g_LookAt[x] += d1;
  g_LookAt[y] += d2;
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

      // wasd keys
      //w
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
      else
      if (ev.keyCode == 88) { // The left arrow key was pressed
        nunchuckAngle += 2.0;		// INCREASED for perspective camera)
      } else 
      if (ev.keyCode == 90) { // The left arrow key was pressed
        nunchuckAngle -= 2.0;		// INCREASED for perspective camera)
      } else{ return; } // Prevent the unnecessary drawing
      draw(gl);    
  }

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();

function animate(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;

  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}

var d_last = Date.now();

function drawResize() {
  var nuCanvas = document.getElementById('HTML5_canvas');	// get current canvas
  var nuGL = getWebGLContext(nuCanvas);							// and context:

  //Make canvas fill the top 3/4 of our browser window:
  nuCanvas.width = innerWidth;
  nuCanvas.height = innerHeight*(4/5);

  draw(nuGL);				
}
