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


// For VBOs:
var g_BufID1;										// 1st Vertex Buffer Object ID# sent from GPU
var g_BufID2;										//  ID# for 2nd VBO.
var g_BufVerts1;								// # of vertices in our first VBO in the GPU.
var g_BufVerts2;								// # of vertices in our second VBO in the GPU.
		//----within VBO1:
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

  // Mouse move functions
  // canvas.onmousedown =	function(ev){myMouseDown( ev, gl, canvas) }; 
  // canvas.onmousemove = 	function(ev){myMouseMove( ev, gl, canvas) };
  // canvas.onmouseup = function(ev){myMouseUp( ev, gl, canvas)};

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
  makeSphere();						// create, fill the sphVerts array
  makeAxes();
  makeGroundGrid();
  
  // how many floats total needed to store all shapes?
	var mySiz = (sphVerts.length + axesVerts.length + gndVerts.length);						

	// How many vertices total?
	var nn = mySiz / floatsPerVertex;
	// Copy all shapes into one big Float32 array:
  var colorShapes = new Float32Array(mySiz);
	// Copy them:  remember where to start for each shape:

  var i = 0;
  sphStart = 0;						// next, we'll store the sphere;
	for(j=0; j< sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = sphVerts[j];
  }
  
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

function randNum(){
  var rand = Math.random()*(0.9-0.6) + 0.6;
  var power = Math.pow(10, 1);
  return Math.floor(rand*power) / power;
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

function drawSphere(gl){
  pushMatrix(mvpMatrix);

  mvpMatrix.translate(0.0, 0.0, 1.0);

  mvpMatrix.rotate(currentAngle, 0.0, 0.0);

  mvpMatrix.scale(0.4,0.4,0.4);

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  // Now, using these drawing axes, draw our ground plane: 
  gl.drawArrays(gl.TRIANGLE_STRIP,							// use this drawing primitive, and
                sphStart/floatsPerVertex,	// start at this vertex number, and
                sphVerts.length/floatsPerVertex);		// draw this many vertices

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
  drawSphere(gl);
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

//==================HTML Button Callbacks
function runStop() {
  if(ANGLE_STEP*ANGLE_STEP > 1) {
    myTmp = ANGLE_STEP;
    ANGLE_STEP = 0;
  }
  else {
  	ANGLE_STEP = myTmp;
  }
}

// function myMouseDown(ev, gl, canvas) {  
//     runStop();
//   // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
//     var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
//     var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
//     var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
    
//     // Convert to Canonical View Volume (CVV) coordinates too:
//     var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
//                  (canvas.width/2);			// normalize canvas to -1 <= x < +1,
//     var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
//                  (canvas.height/2);
    
//     isDrag = true;											// set our mouse-dragging flag
//     xMclik = x;													// record where mouse-dragging began
//     yMclik = y;
//   };
  
  
//   function myMouseMove(ev, gl, canvas) {  
//     if(isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'
  
//     // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
//     var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
//     var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
//     var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
    
//     // Convert to Canonical View Volume (CVV) coordinates too:
//     var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
//                  (canvas.width/2);			// normalize canvas to -1 <= x < +1,
//     var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
//                  (canvas.height/2);
  
//     // find how far we dragged the mouse:
//     xMdragTot += (x - xMclik);					// Accumulate change-in-mouse-position,&
//     yMdragTot += (y - yMclik);
//     xMclik = x;													// Make next drag-measurement from here.
//     yMclik = y;
//   };
  
//   function myMouseUp(ev, gl, canvas) {
//     runStop()
//     // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
//     var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
//     var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
//     var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
    
//     // Convert to Canonical View Volume (CVV) coordinates too:
//     var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
//                  (canvas.width/2);			// normalize canvas to -1 <= x < +1,
//     var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
//                  (canvas.height/2);

                 
//     isDrag = false;											// CLEAR our mouse-dragging flag, and
//     // accumulate any final bit of mouse-dragging we did:
//     xMdragTot += (x - xMclik);
//     yMdragTot += (y - yMclik);
//     //console.log('myMouseUp: xMdragTot,yMdragTot =',xMdragTot,',\t',yMdragTot);
//   };