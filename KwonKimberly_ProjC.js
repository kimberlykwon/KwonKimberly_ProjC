// Vertex shader program----------------------------------
var VSHADER_SOURCE = 
  'uniform mat4 u_MvpMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
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

// Global Variables
var ANGLE_STEP = 45.0; //rotation
var NUNCHUCK_ANGLE_STEP = 45.0;

// Global vars for mouse click-and-drag for rotation.
var isDrag=false;		// mouse-drag: true when user holds down mouse button
var xMclik=0.0;			// last mouse button-down position (in CVV coords)
var yMclik=0.0;   
var xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot=0.0;  

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

  // Mouse move functions
  canvas.onmousedown =	function(ev){myMouseDown( ev, gl, canvas) }; 
  canvas.onmousemove = 	function(ev){myMouseMove( ev, gl, canvas) };
  canvas.onmouseup = function(ev){myMouseUp( ev, gl, canvas)};

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST); 	  
	
  // Get handle to graphics system's storage location of u_MvpMatrix
  u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  if (!u_MvpMatrix) { 
    console.log('Failed to get the storage location of u_MvpMatrix');
    return;
  }

  // Create a local version of our model matrix in JavaScript 
  mvpMatrix = new Matrix4();
  mvpMatrix.setPerspective(30, canvas.width/canvas.height, 1, 100);

  document.onkeydown= function(ev){keydown(ev, gl); };

  // Create, init current rotation angle value in JavaScript
  
  currentAngle = 0.0;
  nunchuckAngle = 0.0;
  wholeNunchuckAngle = 0.0;

  //Start drawing: create 'tick' variable whose value is this function:
  var tick = function() {
    currentAngle = animate(currentAngle);  // Update the rotation angle
    wholeNunchuckAngle = animateNunchuck(wholeNunchuckAngle);
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
  makeCylinder();					// create, fill the cylVerts array
  makeSphere();						// create, fill the sphVerts array
  makeCube();
  makeClockFace();
  makeBand();
  makeGroundGrid();
  makeTri();
  
  // how many floats total needed to store all shapes?
	var mySiz = (cylVerts.length + sphVerts.length + cubeVerts.length + clockVerts.length + bandVerts.length + gndVerts.length + triVerts.length);						

	// How many vertices total?
	var nn = mySiz / floatsPerVertex;
	// Copy all shapes into one big Float32 array:
  var colorShapes = new Float32Array(mySiz);
	// Copy them:  remember where to start for each shape:
	cylStart = 0;							// we stored the cylinder first.
  for(i=0,j=0; j< cylVerts.length; i++,j++) {
  	colorShapes[i] = cylVerts[j];
  }

  sphStart = i;						// next, we'll store the sphere;
	for(j=0; j< sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = sphVerts[j];
  }
    
  cubeStart = i;
  for(j=0; j< cubeVerts.length; i++, j++){
    colorShapes[i] = cubeVerts[j];
  }

  clockStart = i;
  for(j=0; j< clockVerts.length; i++, j++){
    colorShapes[i] = clockVerts[j];
  }

  bandStart = i;
  for(j=0; j< bandVerts.length; i++, j++){
    colorShapes[i] = bandVerts[j];
  }

  gndStart = i;
  for(j=0; j< gndVerts.length; i++, j++){
    colorShapes[i] = gndVerts[j];
  }

  triStart = i;
  for(j=0; j< triVerts.length; i++, j++){
    colorShapes[i] = triVerts[j];
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

function makeCube() {					 
  cubeVerts = new Float32Array([
		// +x face: RED
     1.0, -1.0, -1.0, 1.0,		1.0, 0.0, 0.0,	// Node 3
     1.0,  1.0, -1.0, 1.0,		0.3, 0.3, 0.3,	// Node 2
     1.0,  1.0,  1.0, 1.0,	  0.3, 0.3, 0.3,  // Node 4
     
     1.0,  1.0,  1.0, 1.0,	  0.3, 0.3, 0.3,	// Node 4
     1.0, -1.0,  1.0, 1.0,	  1.0, 0.0, 0.0,	// Node 7
     1.0, -1.0, -1.0, 1.0,	  1.0, 0.0, 0.0,	// Node 3

		// +y face: GREEN
    -1.0,  1.0, -1.0, 1.0,	  0.0, 1.0, 0.0,	// Node 1
    -1.0,  1.0,  1.0, 1.0,	  1.0, 0.0, 0.0,	// Node 5
     1.0,  1.0,  1.0, 1.0,	  0.3, 0.3, 0.3,	// Node 4

     1.0,  1.0,  1.0, 1.0,	  0.3, 0.3, 0.3,	// Node 4
     1.0,  1.0, -1.0, 1.0,	  0.3, 0.3, 0.3,	// Node 2 
    -1.0,  1.0, -1.0, 1.0,	  0.1, 1.0, 0.1,	// Node 1

		// +z face: BLUE
    -1.0,  1.0,  1.0, 1.0,	  1.0, 0.0, 0.0,	// Node 5
    -1.0, -1.0,  1.0, 1.0,	  1.0, 1.0, 1.0,	// Node 6
     1.0, -1.0,  1.0, 1.0,	  1.0, 0.0, 0.0,	// Node 7

     1.0, -1.0,  1.0, 1.0,	  1.0, 0.0, 0.0,	// Node 7
     1.0,  1.0,  1.0, 1.0,	  0.3, 0.3, 0.3,	// Node 4
    -1.0,  1.0,  1.0, 1.0,	  1.0, 0.0, 0.0,	// Node 5

		// -x face: CYAN
    -1.0, -1.0,  1.0, 1.0,	  0.0, 1.0, 1.0,	// Node 6	
    -1.0,  1.0,  1.0, 1.0,	  1.0, 0.0, 0.0,	// Node 5 
    -1.0,  1.0, -1.0, 1.0,	  0.0, 1.0, 1.0,	// Node 1
    
    -1.0,  1.0, -1.0, 1.0,	  0.1, 1.0, 1.0,	// Node 1
    -1.0, -1.0, -1.0, 1.0,	  0.1, 1.0, 1.0,	// Node 0  
    -1.0, -1.0,  1.0, 1.0,	  0.1, 1.0, 1.0,	// Node 6  
    
		// -y face: MAGENTA
     1.0, -1.0, -1.0, 1.0,	  1.0, 0.0, 0.0,	// Node 3
     1.0, -1.0,  1.0, 1.0,	  1.0, 0.0, 0.0,	// Node 7
    -1.0, -1.0,  1.0, 1.0,	  1.0, 1.0, 1.0,	// Node 6

    -1.0, -1.0,  1.0, 1.0,	  1.0, 1.0, 1.0,	// Node 6
    -1.0, -1.0, -1.0, 1.0,	  1.0, 0.1, 1.0,	// Node 0
     1.0, -1.0, -1.0, 1.0,	  1.0, 0.0, 0.0,	// Node 3

     // -z face: YELLOW
     1.0,  1.0, -1.0, 1.0,	  0.3, 0.3, 0.3,	// Node 2
     1.0, -1.0, -1.0, 1.0,	  1.0, 0.0, 0.0,	// Node 3
    -1.0, -1.0, -1.0, 1.0,	  1.0, 1.0, 0.0,	// Node 0		

    -1.0, -1.0, -1.0, 1.0,	  1.0, 0.0, 0.0,	// Node 0
    -1.0,  1.0, -1.0, 1.0,	  1.0, 1.0, 1.0,	// Node 1
     1.0,  1.0, -1.0, 1.0,	  0.3, 0.3, 0.3,	// Node 2
  ]);
}


function makeBand() {					 
  bandVerts = new Float32Array([
		// +x face: BROWN
     0.5, -1.0, -.1, 1.0,		0.8, 0.8, 0.8,	// Node 3
     0.5,  1.0, -.1, 1.0,		0.8, 0.8, 0.8,	// Node 2
     0.5,  1.0,  .1, 1.0,	  0.8, 0.8, 0.8,  // Node 4
     
     0.5,  1.0,  .1, 1.0,	  0.8, 0.8, 0.8,	// Node 4
     0.5, -1.0,  .1, 1.0,	  0.8, 0.8, 0.8,	// Node 7
     0.5, -1.0, -.1, 1.0,	  0.8, 0.8, 0.8,	// Node 3

		// +y face: BROWN
    -0.5,  1.0, -.1, 1.0,	  0.8, 0.8, 0.8,	// Node 1
    -0.5,  1.0,  .1, 1.0,	  0.8, 0.8, 0.8,	// Node 5
    0.5,  1.0,  .1, 1.0,	  0.8, 0.8, 0.8,	// Node 4

    0.5,  1.0,  .1, 1.0,	  0.8, 0.8, 0.8,	// Node 4
    0.5,  1.0, -.1, 1.0,	  0.8, 0.8, 0.8,	// Node 2 
    -0.5,  1.0, -.1, 1.0,	  0.8, 0.8, 0.8,	// Node 1

		// +z face: maroon
    -0.5,  1.0,  .1, 1.0,	  0.13, 0.0, 0.0,	// Node 5
    -0.5, -1.0,  .1, 1.0,	  0.13, 0.0, 0.0,	// Node 6
    0.5, -1.0,  .1, 1.0,	  0.13, 0.0, 0.0,	// Node 7

    0.5, -1.0,  .1, 1.0,	  0.13, 0.0, 0.0,	// Node 7
    0.5,  1.0,  .1, 1.0,	  0.13, 0.0, 0.0,	// Node 4
    -0.5,  1.0,  .1, 1.0,	  0.13, 0.0, 0.0,	// Node 5

		// -x face: BROWN
    -0.5, -1.0,  0.1, 1.0,	0.8, 0.8, 0.8,	// Node 6	
    -0.5,  1.0,  .1, 1.0,	  0.8, 0.8, 0.8,	// Node 5 
    -0.5,  1.0, -.1, 1.0,	  0.8, 0.8, 0.8,	// Node 1
    
    -0.5,  1.0, -.1, 1.0,	  0.8, 0.8, 0.8,	// Node 1
    -0.5, -1.0, -.1, 1.0,	  0.8, 0.8, 0.8,	// Node 0  
    -0.5, -1.0,  .1, 1.0,	  0.8, 0.8, 0.8,	// Node 6  
    
		// -y face: BROWN
    0.5, -1.0, -.1, 1.0,	  0.8, 0.8, 0.8,	// Node 3
    0.5, -1.0,  .1, 1.0,	  0.8, 0.8, 0.8,	// Node 7
    -0.5, -1.0,  .1, 1.0,	  0.8, 0.8, 0.8,	// Node 6

    -0.5, -1.0,  .1, 1.0,	  0.8, 0.8, 0.8,	// Node 6
    -0.5, -1.0, -.1, 1.0,	  0.8, 0.8, 0.8,	// Node 0
    0.5, -1.0, -.1, 1.0,	  0.8, 0.8, 0.8,	// Node 3

     // -z face: 
     0.5,  1.0, -.1, 1.0,	  1.0, 1.0, 0.0,	// Node 2
     0.5, -1.0, -.1, 1.0,	  1.0, 1.0, 0.0,	// Node 3
    -0.5, -1.0, -.1, 1.0,	  1.0, 1.0, 0.0,	// Node 0		

    -0.5, -1.0, -.1, 1.0,	  1.0, 1.0, 0.1,	// Node 0
    -0.5,  1.0, -.1, 1.0,	  1.0, 1.0, 0.1,	// Node 1
    0.5,  1.0, -.1, 1.0,	  1.0, 1.0, 0.1,	// Node 2
  ]);
  // Make last face random brown
  for (k=210; k<252; k+=7){
    var num = randNum();
    bandVerts[k+4] = num;
    bandVerts[k+5] = num-0.2;
    bandVerts[k+6] = num-0.4;
  }
}



function makeCylinder() {
  var ctrColr = new Float32Array([0.2, 0.2, 0.2]);	
  var topColr = new Float32Array([0.6, 0.2, 0.2]);	
  var botColr = new Float32Array([0.13, 0.0, 0.0]);	
  var capVerts = 16;	// # of vertices around the topmost 'cap' of the shape
 
  // Create a (global) array to hold this cylinder's vertices;
  cylVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 

	// Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {	
		// skip the first vertex--not needed.
		if(v%2==0)
		{				// put even# vertices at center of cylinder's top cap:
			cylVerts[j  ] = 0.0; // x
			cylVerts[j+1] = 3.0; // y
			cylVerts[j+2] = 0.0; // z
			cylVerts[j+3] = 1.0; // w			// r,g,b = topColr[]
			cylVerts[j+4]=ctrColr[0]; 
			cylVerts[j+5]=ctrColr[1]; 
			cylVerts[j+6]=ctrColr[2];
		}
		else { 	// put odd# vertices around the top cap's outer edge;
						// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
						// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
			cylVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);	// x
			cylVerts[j+1] = 3.0;	// y
			cylVerts[j+2] = Math.sin(Math.PI*(v-1)/capVerts);	// z
			cylVerts[j+3] = 1.0;	// w
			cylVerts[j+4]=topColr[0]; 
			cylVerts[j+5]=topColr[1]; 
			cylVerts[j+6]=topColr[2];			
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
		if(v%2==0)	// position all even# vertices along top cap:
		{		
				cylVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);	// x
				cylVerts[j+1] = 3.0;	// y
				cylVerts[j+2] = Math.sin(Math.PI*(v)/capVerts);	// z
				cylVerts[j+3] = 1.0;	// w
				cylVerts[j+4]=topColr[0]; 
				cylVerts[j+5]=topColr[1]; 
				cylVerts[j+6]=topColr[2];			
		}
		else		// position all odd# vertices along the bottom cap:
		{
        cylVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);	// x
				cylVerts[j+1] = -3.0;	// y
				cylVerts[j+2] = Math.sin(Math.PI*(v-1)/capVerts);	// z
				cylVerts[j+3] = 1.0;	// w
				cylVerts[j+4]=botColr[0]; 
				cylVerts[j+5]=botColr[1]; 
				cylVerts[j+6]=botColr[2];			
		}
	}
	// Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		if(v%2==0) {	// position even #'d vertices around bot cap's outer edge
      cylVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);	// x
			cylVerts[j+1] = -3.0;		// y
			cylVerts[j+2] = Math.sin(Math.PI*(v)/capVerts);	// z
			cylVerts[j+3] = 1.0;	// w
			cylVerts[j+4]=botColr[0]; 
			cylVerts[j+5]=botColr[1]; 
			cylVerts[j+6]=botColr[2];		
		}
		else {				// position odd#'d vertices at center of the bottom cap:
      cylVerts[j  ] = 0.0; 			// x
			cylVerts[j+1] = -3.0;	    // y
			cylVerts[j+2] = 0.0;      // z
			cylVerts[j+3] = 1.0;			// w
			cylVerts[j+4]=botColr[0]; 
			cylVerts[j+5]=botColr[1]; 
			cylVerts[j+6]=botColr[2];
		}
	}
}

function makeClockFace() {
 var ctrColr = new Float32Array([0.2, 0.2, 0.2]);	// dark gray
 var topColr = new Float32Array([0.4, 0.4, 0.4]);	// light green
 var botColr = new Float32Array([1.0, 1.0, 1.0]);	// light blue
 var capVerts = 16;	// # of vertices around the topmost 'cap' of the shape
 var botRadius = 1.6;		// radius of bottom of cylinder (top always 1.0)
 
 // Create a (global) array to hold this cylinder's vertices;
 clockVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);

	// Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {	
		// skip the first vertex--not needed.
		if(v%2==0)
		{				// put even# vertices at center of cylinder's top cap:
			clockVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,1,1
			clockVerts[j+1] = 0.0;	
			clockVerts[j+2] = 0.2; 
			clockVerts[j+3] = 1.0;			// r,g,b = topColr[]
			clockVerts[j+4]=ctrColr[0]; 
			clockVerts[j+5]=ctrColr[1]; 
			clockVerts[j+6]=ctrColr[2];
		}
		else { 	// put odd# vertices around the top cap's outer edge;
						// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
						// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
			clockVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);			// x
			clockVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);			// y
			clockVerts[j+2] = 0.2;	// z
      clockVerts[j+3] = 1.0;	// w.
      clockVerts[j+4]=topColr[0]; 
			clockVerts[j+5]=topColr[1]; 
			clockVerts[j+6]=topColr[2];			
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
		if(v%2==0)	// position all even# vertices along top cap:
		{		
				clockVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);		// x
				clockVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);		// y
				clockVerts[j+2] = 0.2;	// z
				clockVerts[j+3] = 1.0;	// w.
				clockVerts[j+4]=topColr[0]; 
				clockVerts[j+5]=topColr[1]; 
				clockVerts[j+6]=topColr[2];			
		}
		else		// position all odd# vertices along the bottom cap:
		{
				clockVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);		// x
				clockVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);		// y
				clockVerts[j+2] =-0.2;	// z
				clockVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				clockVerts[j+4]=botColr[0]; 
				clockVerts[j+5]=botColr[1]; 
				clockVerts[j+6]=botColr[2];			
		}
	}
	// Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		if(v%2==0) {	// position even #'d vertices around bot cap's outer edge
			clockVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			clockVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			clockVerts[j+2] =-0.2;	// z
			clockVerts[j+3] = 1.0;	// w.
			clockVerts[j+4]=botColr[0]; 
			clockVerts[j+5]=botColr[1]; 
			clockVerts[j+6]=botColr[2];		
		}
		else {				// position odd#'d vertices at center of the bottom cap:
			clockVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			clockVerts[j+1] = 0.0;	
			clockVerts[j+2] =-0.2; 
			clockVerts[j+3] = 1.0;			// r,g,b = botColr[]
			clockVerts[j+4]=botColr[0]; 
			clockVerts[j+5]=botColr[1]; 
			clockVerts[j+6]=botColr[2];
		}
	}
}

function makeSphere() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeCylinder) to build the
// sphere from one triangle strip.
  var slices = 13;		// # of slices of the sphere along the z axis. >=3 req'd
                      // (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts	= 27;	// # of vertices around the top edge of the slice
                      // (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([0.7, 0.7, 0.7]);	// North Pole: light gray
  //var equColr = new Float32Array([0.0, 0.0, 0.0]);	// Equator:    bright green
  var botColr = new Float32Array([0.9, 0.9, 0.9]);	// South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;	// lattitude angle spanned by one slice.

  // Create a (global) array to hold this sphere's vertices:
  sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 
                    // each slice requires 2*sliceVerts vertices except 1st and
                    // last ones, which require only 2*sliceVerts-1.
                    
  // Create dome-shaped top slice of sphere at z=+1
  // s counts slices; v counts vertices; 
  // j counts array elements (vertices * elements per vertex)
  var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
  var sin0 = 0.0;
  var cos1 = 0.0;
  var sin1 = 0.0;	
  var j = 0;							// initialize our array index
  var isLast = 0;
  var isFirst = 1;
  for(s=0; s<slices; s++) {	// for each slice of the sphere,
    // find sines & cosines for top and bottom of this slice
    if(s==0) {
      isFirst = 1;	// skip 1st vertex of 1st slice.
      cos0 = 1.0; 	// initialize: start at north pole.
      sin0 = 0.0;
    }
    else {					// otherwise, new top edge == old bottom edge
      isFirst = 0;	
      cos0 = cos1;
      sin0 = sin1;
    }								// & compute sine,cosine for new bottom edge.
    cos1 = Math.cos((s+1)*sliceAngle);
    sin1 = Math.sin((s+1)*sliceAngle);
    // go around the entire slice, generating TRIANGLE_STRIP verts
    // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
    if(s==slices-1) isLast=1;	// skip last vertex of last slice.
    for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) {	
    // for(v=isFirst; v< sliceVerts-isLast; v++, j+=floatsPerVertex) {	
      if(v%2==0)
      {				// put even# vertices at the the slice's top edge  
        sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
        sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
        sphVerts[j+2] = cos0;		
        sphVerts[j+3] = 1.0;			
      }
      else { 	// put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              // 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
        sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
        sphVerts[j+2] = cos1;																				// z
        sphVerts[j+3] = 1.0;																				// w.		
      }
      if(s==0) {	// finally, set some interesting colors for vertices:
        sphVerts[j+4]=topColr[0]; 
        sphVerts[j+5]=topColr[1]; 
        sphVerts[j+6]=topColr[2];	
        }
      else if(s==slices-1) {
        sphVerts[j+4]=botColr[0]; 
        sphVerts[j+5]=botColr[1]; 
        sphVerts[j+6]=botColr[2];	
      }
      else {
          var num = randNum();
          sphVerts[j+4]=num;
          sphVerts[j+5]=num;
          sphVerts[j+6]=num;			
      }
    }
  }
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

function makeTri(){
  var c30 = Math.sqrt(0.75);					// == cos(30deg) == sqrt(3) / 2
	var sq2	= Math.sqrt(2.0);		
  triVerts = new Float32Array([
    // Vertex coordinates(x,y,z,w) and color (R,G,B) for a new color tetrahedron:
    //		Apex on +z axis; equilateral triangle base at z=0
        // Face 0: (right side)  
       0.0,	 0.0, sq2, 1.0,		0.3, 	0.4,	0.4,	// Node 0 (apex, +z axis;  blue)
       c30, -0.5, 0.0, 1.0, 		1.0,  1.0,  1.0, 	// Node 1 (base: lower rt; red)
       0.0,  1.0, 0.0, 1.0,  		0.2,  0.2,  0.2,	// Node 2 (base: +y axis;  grn)
        // Face 1: (left side)
       0.0,	 0.0, sq2, 1.0,			0.3, 	0.4,	0.4,	// Node 0 (apex, +z axis;  blue)
       0.0,  1.0, 0.0, 1.0,  		0.2,  0.2,  0.2,	// Node 2 (base: +y axis;  grn)
      -c30, -0.5, 0.0, 1.0, 		1.0,  1.0,  1.0, 	// Node 3 (base:lower lft; white)
        // Face 2: (lower side)
       0.0,	 0.0, sq2, 1.0,			0.3, 	0.4,	0.4,	// Node 0 (apex, +z axis;  blue) 
      -c30, -0.5, 0.0, 1.0, 		1.0,  1.0,  1.0, 	// Node 3 (base:lower lft; white)
       c30, -0.5, 0.0, 1.0, 		1.0,  1.0,  1.0, 	// Node 1 (base: lower rt; red) 
         // Face 3: (base side)  
      -c30, -0.5, 0.0, 1.0, 		1.0,  1.0,  1.0, 	// Node 3 (base:lower lft; white)
       0.0,  1.0, 0.0, 1.0,  		0.2,  0.2,  0.2,	// Node 2 (base: +y axis;  grn)
       c30, -0.5, 0.0, 1.0, 		1.0,  1.0,  1.0, 	// Node 1 (base: lower rt; red)
  ])
}
    

function randNum(){
  var rand = Math.random()*(0.9-0.6) + 0.6;
  var power = Math.pow(10, 1);
  return Math.floor(rand*power) / power;
}

function randBlue(){
  var rand = Math.random()*(0.4-0.2) + 0.2;
  var power = Math.pow(10, 1);
  return Math.floor(rand*power) / power;
}


function drawNunchucks(gl) {
  pushMatrix(mvpMatrix);
  //-------Draw Cylinder:
  mvpMatrix.translate(-0.4,-0.4, 0.4);  // 'set' means DISCARD old matrix,
  						// (drawing axes centered in CVV), and then make new
  						// drawing axes moved to the lower-left corner of CVV. 
  //mvpMatrix.scale(1,1,-1);							// convert to left-handed coord sys
  mvpMatrix.scale(0.1, 0.1, 0.1); // maybe fix idk  // to match WebGL display canvas.
  mvpMatrix.rotate(wholeNunchuckAngle, 1, 1, 0);
  var dist = Math.sqrt(xMdragTot*xMdragTot+yMdragTot*yMdragTot);
  mvpMatrix.rotate(dist*120.0, -yMdragTot+0.0001, xMdragTot+0.0001, 0.0);

  // Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  // Draw the cylinder's vertices, and no other vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  							cylStart/floatsPerVertex, // start at this vertex number, and
                cylVerts.length/floatsPerVertex);	// draw this many vertices.

  // ---------Draw circle joints (5)
  // joint 1
  mvpMatrix.translate(0.0, 4.0, 0.0); 
  mvpMatrix.rotate(nunchuckAngle*0.2, 0, 0, 1); 
  //console.log("current angle: " + nunchuckAngle);

  // Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
                sphStart/floatsPerVertex,	// start at this vertex number, and 
                sphVerts.length/floatsPerVertex);	// draw this many vertices

  // joint 2
  mvpMatrix.translate(0.0, 2.0, 0.0);  
  mvpMatrix.rotate(nunchuckAngle*0.2, 0, 0, 1); 

  // Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
                sphStart/floatsPerVertex,	// start at this vertex number, and 
                sphVerts.length/floatsPerVertex);	// draw this many vertices
  
  // joint 3
  mvpMatrix.translate(0.0, 2.0, 0.0); 
  mvpMatrix.rotate(nunchuckAngle*0.2, 0, 0, 1);  

  // Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
                sphStart/floatsPerVertex,	// start at this vertex number, and 
                sphVerts.length/floatsPerVertex);	// draw this many vertices
  
  // joint 4
  mvpMatrix.translate(0.0, 2.0, 0.0); 
  mvpMatrix.rotate(nunchuckAngle*0.2, 0, 0, 1);  

  // Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
                sphStart/floatsPerVertex,	// start at this vertex number, and 
                sphVerts.length/floatsPerVertex);	// draw this many vertices
 
  // joint 5
  mvpMatrix.translate(0.0, 2.0, 0.0); 
  mvpMatrix.rotate(nunchuckAngle*0.2, 0, 0, 1);  

  // Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
                sphStart/floatsPerVertex,	// start at this vertex number, and 
                sphVerts.length/floatsPerVertex);	// draw this many vertices
 

  //-------Draw Spinning Cylinder:
  mvpMatrix.translate(0.0, 4.0, 0.0);  // 'set' means DISCARD old matrix,
  mvpMatrix.rotate(180, 1, 0, 0);
  mvpMatrix.rotate(nunchuckAngle*0.05, 0, 0, 1);

  // Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  // Draw the cylinder's vertices, and no other vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  							cylStart/floatsPerVertex, // start at this vertex number, and
                cylVerts.length/floatsPerVertex);	// draw this many vertices. 
  mvpMatrix = popMatrix();         
}

function drawWatch(gl) {     
  pushMatrix(mvpMatrix);      
  // ------- watch face
  mvpMatrix.translate(0.4, 0.4, 0.4);  // 'set' means DISCARD old matrix,
  						// (drawing axes centered in CVV), and then make new
  						// drawing axes moved to the lower-left corner of CVV. 
  																				// to match WebGL display canvas.
                                          
  mvpMatrix.scale(.075, .075, .075); // maybe fix idk

  // FIX THIS: z needs to point up; y pointing back
  mvpMatrix.rotate(currentAngle, 1, 1, 0);  // spin around y axis.

  // Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  // Draw the cylinder's vertices, and no other vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  							clockStart/floatsPerVertex, // start at this vertex number, and
                clockVerts.length/floatsPerVertex);	// draw this many vertices.
                
  pushMatrix(mvpMatrix);
  
  // // other hand
  //mvpMatrix = popMatrix();
  mvpMatrix.translate(-2.0, 0.0, 0.0);  // 'set' means DISCARD old matrix,
  mvpMatrix.rotate(currentAngle*0.4, 0, 1, 0);  // Spin on XY diagonal axis
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,           // draw triangles from verts in VBO
                bandStart/floatsPerVertex,                     // start at vertex 12,
                bandVerts.length/floatsPerVertex);                    // and draw exactly 36 vertices.
  
  mvpMatrix.translate(-1.0, 0.0, 0.0);  // 'set' means DISCARD old matrix,
  mvpMatrix.rotate(currentAngle*0.1, 0, 1, 0);  // Spin on XY diagonal axis
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,           // draw triangles from verts in VBO
                bandStart/floatsPerVertex,                     // start at vertex 12,
                bandVerts.length/floatsPerVertex);                    //
  mvpMatrix.translate(-1.0, 0.0, 0.0);  // 'set' means DISCARD old matrix,
  mvpMatrix.rotate(currentAngle*0.1, 0, 1, 0);  // Spin on XY diagonal axis
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,           // draw triangles from verts in VBO
                bandStart/floatsPerVertex,                     // start at vertex 12,
                bandVerts.length/floatsPerVertex);                    //

  mvpMatrix.translate(-1.0, 0.0, 0.0);  // 'set' means DISCARD old matrix,
  mvpMatrix.rotate(currentAngle*0.1, 0, 1, 0);  // Spin on XY diagonal axis
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,           // draw triangles from verts in VBO
                bandStart/floatsPerVertex,                     // start at vertex 12,
                bandVerts.length/floatsPerVertex);                    //
  mvpMatrix.translate(-1.0, 0.0, 0.0);  // 'set' means DISCARD old matrix,
  mvpMatrix.rotate(currentAngle*0.1, 0, 1, 0);  // Spin on XY diagonal axis
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,           // draw triangles from verts in VBO
                bandStart/floatsPerVertex,                     // start at vertex 12,
                bandVerts.length/floatsPerVertex);                    //    
  mvpMatrix.translate(-1.0, 0.0, 0.0);  // 'set' means DISCARD old matrix,
  mvpMatrix.rotate(currentAngle*0.1, 0, 1, 0);  // Spin on XY diagonal axis
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,           // draw triangles from verts in VBO
                bandStart/floatsPerVertex,                     // start at vertex 12,
                bandVerts.length/floatsPerVertex);                    //
  mvpMatrix.translate(-1.0, 0.0, 0.0);  // 'set' means DISCARD old matrix,
  mvpMatrix.rotate(currentAngle*0.1, 0, 1, 0);  // Spin on XY diagonal axis
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,           // draw triangles from verts in VBO
                bandStart/floatsPerVertex,                     // start at vertex 12,
                bandVerts.length/floatsPerVertex);                    //



  // // other hand
  mvpMatrix = popMatrix();
  mvpMatrix.translate(2.0, 0.0, 0.0);  // 'set' means DISCARD old matrix,
  mvpMatrix.rotate(currentAngle*0.4, 0, 1, 0);  // Spin on XY diagonal axis
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,           // draw triangles from verts in VBO
                bandStart/floatsPerVertex,                     // start at vertex 12,
                bandVerts.length/floatsPerVertex);                    // and draw exactly 36 vertices.
  
  mvpMatrix.translate(1.0, 0.0, 0.0);  // 'set' means DISCARD old matrix,
  mvpMatrix.rotate(currentAngle*0.1, 0, 1, 0);  // Spin on XY diagonal axis
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,           // draw triangles from verts in VBO
                bandStart/floatsPerVertex,                     // start at vertex 12,
                bandVerts.length/floatsPerVertex);                    //
  mvpMatrix.translate(1.0, 0.0, 0.0);  // 'set' means DISCARD old matrix,
  mvpMatrix.rotate(currentAngle*0.1, 0, 1, 0);  // Spin on XY diagonal axis
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,           // draw triangles from verts in VBO
                bandStart/floatsPerVertex,                     // start at vertex 12,
                bandVerts.length/floatsPerVertex);                    //

  mvpMatrix.translate(1.0, 0.0, 0.0);  // 'set' means DISCARD old matrix,
  mvpMatrix.rotate(currentAngle*0.1, 0, 1, 0);  // Spin on XY diagonal axis
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,           // draw triangles from verts in VBO
                bandStart/floatsPerVertex,                     // start at vertex 12,
                bandVerts.length/floatsPerVertex);                    //
  mvpMatrix.translate(1.0, 0.0, 0.0);  // 'set' means DISCARD old matrix,
  mvpMatrix.rotate(currentAngle*0.1, 0, 1, 0);  // Spin on XY diagonal axis
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,           // draw triangles from verts in VBO
                bandStart/floatsPerVertex,                     // start at vertex 12,
                bandVerts.length/floatsPerVertex);                    //    
  mvpMatrix.translate(1.0, 0.0, 0.0);  // 'set' means DISCARD old matrix,
  mvpMatrix.rotate(currentAngle*0.1, 0, 1, 0);  // Spin on XY diagonal axis
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,           // draw triangles from verts in VBO
                bandStart/floatsPerVertex,                     // start at vertex 12,
                bandVerts.length/floatsPerVertex);                    //
  mvpMatrix.translate(1.0, 0.0, 0.0);  // 'set' means DISCARD old matrix,
  mvpMatrix.rotate(currentAngle*0.1, 0, 1, 0);  // Spin on XY diagonal axis
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,           // draw triangles from verts in VBO
                bandStart/floatsPerVertex,                     // start at vertex 12,
                bandVerts.length/floatsPerVertex);                    //
  
  mvpMatrix = popMatrix();
}


function drawSmallShapes(gl){
  pushMatrix(mvpMatrix);

  mvpMatrix.translate(0.8, 0.125, 0.0);
  mvpMatrix.scale(0.2, 0.2, 0.2);
  //mvpMatrix.rotate(20.0, 1, 0, 0);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  
  gl.drawArrays(gl.TRIANGLES, 
                triStart/floatsPerVertex,
                triVerts.length/floatsPerVertex);

  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);

  mvpMatrix.translate(-1, 0.2, 0.1);
  mvpMatrix.scale(0.1, 0.1, 0.1);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  
  gl.drawArrays(gl.TRIANGLES, 
                cubeStart/floatsPerVertex,
                cubeVerts.length/floatsPerVertex);
  mvpMatrix = popMatrix();
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
              
  vpAspect = ((gl.drawingBufferWidth)	/				// On-screen aspect ratio for
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
  drawNunchucks(gl);
  drawWatch(gl);
  drawSmallShapes(gl);
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
  
  if(angle >   20.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
  if(angle <  -85.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;

  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}

var d_last = Date.now();
function animateNunchuck(angle) {
  var now = Date.now();
  var elapsed = now - d_last;
  d_last = now;

  var newAngle = angle + (NUNCHUCK_ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}

function drawResize() {
  var nuCanvas = document.getElementById('HTML5_canvas');	// get current canvas
  var nuGL = getWebGLContext(nuCanvas);							// and context:

  // Make canvas fill our browser window:
  nuCanvas.width = innerWidth;
  nuCanvas.height = innerHeight;

  draw(nuGL);				
}

//==================HTML Button Callbacks
function runStop() {
  if(ANGLE_STEP*ANGLE_STEP > 1) {
    myTmp = ANGLE_STEP;
    ANGLE_STEP = 0;
  }
  else {
  	ANGLE_STEP = myTmp;
  }

  if(NUNCHUCK_ANGLE_STEP*NUNCHUCK_ANGLE_STEP > 1) {
    myTmp = NUNCHUCK_ANGLE_STEP;
    NUNCHUCK_ANGLE_STEP = 0;
  }
  else {
  	NUNCHUCK_ANGLE_STEP = myTmp;
  }
}

function myMouseDown(ev, gl, canvas) {  
    runStop();
  // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
    var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
    var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
    
    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
                 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
    var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
                 (canvas.height/2);
    
    isDrag = true;											// set our mouse-dragging flag
    xMclik = x;													// record where mouse-dragging began
    yMclik = y;
  };
  
  
  function myMouseMove(ev, gl, canvas) {  
    if(isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'
  
    // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
    var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
    var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
    
    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
                 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
    var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
                 (canvas.height/2);
  
    // find how far we dragged the mouse:
    xMdragTot += (x - xMclik);					// Accumulate change-in-mouse-position,&
    yMdragTot += (y - yMclik);
    xMclik = x;													// Make next drag-measurement from here.
    yMclik = y;
  };
  
  function myMouseUp(ev, gl, canvas) {
    runStop()
    // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
    var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
    var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
    
    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
                 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
    var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
                 (canvas.height/2);

                 
    isDrag = false;											// CLEAR our mouse-dragging flag, and
    // accumulate any final bit of mouse-dragging we did:
    xMdragTot += (x - xMclik);
    yMdragTot += (y - yMclik);
    //console.log('myMouseUp: xMdragTot,yMdragTot =',xMdragTot,',\t',yMdragTot);
  };