// global mvp variable
var g_vpMatrix = new Matrix4();
var floatsPerVertex = 7; // different for each vbo; move to be a member of each vbo

//=============================================================================
//=============================================================================
function VBObox0() {
//=============================================================================
//=============================================================================
// CONSTRUCTOR for one re-usable 'VBObox0' object  that holds all data and 
// fcns needed to render vertices from one Vertex Buffer Object (VBO) using one 
// separate set of shaders.
  
  this.VERT_SRC =	//--------------------- VERTEX SHADER source code 
  'uniform mat4 u_MvpMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

  this.FRAG_SRC = //---------------------- FRAGMENT SHADER source code 
  'precision mediump float;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';
  
  /// start
// Make each 3D shape in its own array of vertices:
  makeGroundPlane();
  
  // how many floats total needed to store all shapes?
  var mySiz = (gndVerts.length);						

  // How many vertices total?
  var nn = mySiz / floatsPerVertex;
  // Copy all shapes into one big Float32 array:
  this.vboContents = new Float32Array(mySiz);

  // Copy them:  remember where to start for each shape:
  gndStart = 0;							// we stored the cylinder first.
  for(i=0,j=0; j< gndVerts.length; i++,j++) {
    this.vboContents[i] = gndVerts[j];
  }

  this.vboLoc;										// Vertex Buffer Object location# on the GPU
  
  this.vboVerts = this.vboContents.length/7;						// # of vertices held in 'vboContents' array
  this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;
                                  // bytes req'd for 1 vboContents array element;
                                  // (why? used to compute stride and offset 
                                  // in bytes for vertexAttribPointer() calls) 
  this.shaderLoc;									// Shader-program location # on the GPU, made 
                                  // by compile/link of VERT_SRC and FRAG_SRC.
                //-------------------- Attribute locations in our shaders
  this.a_PosLoc;									// GPU location for 'a_Pos1' attribute
  this.a_ColrLoc;									// GPU location for 'a_Colr1' attribute

                //-------------------- Uniform locations &values in our shaders
  this.u_ModelMatLoc;								// GPU location for u_ModelMat uniform
}

// make axes
function makeGroundPlane(){
  // set up ground floor vertices
  var xcount = 100;			// # of lines to draw in x,y to make the grid.
  var ycount = 100;		
  var xymax	= 50.0;			// grid size; extends to cover +/-xymax in x and y.
  var xColr = new Float32Array([1.0, 1.0, 1.0]);	// bright white
  var yColr = new Float32Array([0.5, 0.5, 0.5]);	// gray.
    
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

VBObox0.prototype.init = function(myGL) {
//=============================================================================
// Compile,link,upload shaders-------------------------------------------------
  this.shaderLoc = createProgram(myGL, this.VERT_SRC, this.FRAG_SRC);
  if (!this.shaderLoc) {
    console.log(this.constructor.name + 
                '.init() failed to create executable Shaders on the GPU. Bye!');
    return;
  }
  // CUTE TRICK: we can print the NAME of this VBO object: tells us which one!
  myGL.program = this.shaderLoc;		// (to match cuon-utils.js -- initShaders())

  this.vboLoc = myGL.createBuffer();	
  if (!this.vboLoc) {
    console.log(this.constructor.name + 
                '.init() failed to create VBO in GPU. Bye!'); 
    return;
  }
    
  // Specify the purpose of our newly-created VBO.  Your choices are:
  myGL.bindBuffer(myGL.ARRAY_BUFFER,	// GLenum 'target' for this GPU buffer 
                  this.vboLoc);				// the ID# the GPU uses for this buffer.

  // Transfer data from JavaScript Float32Array object to the just-bound VBO. 
  myGL.bufferData(myGL.ARRAY_BUFFER, 			// GLenum target(same as 'bindBuffer()')
                    this.vboContents, 		// JavaScript Float32Array
                    myGL.STATIC_DRAW);			// Usage hint.
                  
// Find & Set All Attributes:------------------------------
  // a) Get the GPU location for each attribute var used in our shaders:
  this.a_PosLoc = myGL.getAttribLocation(this.shaderLoc, 'a_Position');
  if(this.a_PosLoc < 0) {
    console.log(this.constructor.name + 
                '.init() Failed to get GPU location of attribute a_Pos1');
    return -1;	// error exit.
  }
    this.a_ColrLoc = myGL.getAttribLocation(this.shaderLoc, 'a_Color');
  if(this.a_ColrLoc < 0) {
    console.log(this.constructor.name + 
                '.init() failed to get the GPU location of attribute a_Colr1');
    return -1;	// error exit.
  }
  // b) Next, set up GPU to fill these attribute vars in our shader with 
  // values pulled from the currently-bound VBO (see 'gl.bindBuffer()).
  myGL.vertexAttribPointer(
    this.a_PosLoc,//index == ID# for the attribute var in your GLSL shaders;
    4,						// size == how many dimensions for this attribute: 1,2,3 or 4?
    myGL.FLOAT,			// type == what data type did we use for those numbers?
    false,				// isNormalized == are these fixed-point values that we need
                  //									normalize before use? true or false
    floatsPerVertex*this.FSIZE,	// Stride == #bytes we must skip in the VBO to move from one 
                  // of our stored attributes to the next.  This is usually the 
                  // number of bytes used to store one complete vertex.  If set 
                  // to zero, the GPU gets attribute values sequentially from 
                  // VBO, starting at 'Offset'.	
                  // (Our vertex size in bytes: 4 floats for pos + 3 for color)
    0);						// Offset == how many bytes from START of buffer to the first
                  // value we will actually use?  (We start with position).
  myGL.vertexAttribPointer(
    this.a_ColrLoc, 
    4, 
    myGL.FLOAT, 
    false, 
    7*this.FSIZE, 
    4*this.FSIZE);

  // c) Enable this assignment of the attribute to its' VBO source:
  myGL.enableVertexAttribArray(this.a_PosLoc);
  myGL.enableVertexAttribArray(this.a_ColrLoc);

  
  // Find All Uniforms:--------------------------------
  //Get GPU storage location for each uniform var used in our shader programs: 
  this.u_ModelMatLoc = myGL.getUniformLocation(this.shaderLoc, 'u_MvpMatrix');
  if (!this.u_ModelMatLoc) { 
    console.log(this.constructor.name + 
                '.init() failed to get GPU location for u_ModelMat1 uniform');
    return;
  }
}

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
  var d1 = (a[x] - g_Eye[x])/15;
  var d2 = (a[y] - g_Eye[y])/15;

  g_Eye[x] += d1;
  g_Eye[y] += d2;
  g_LookAt[x] += d1;
  g_LookAt[y] += d2;	
}


VBObox0.prototype.adjust = function(myGL) {
//=============================================================================
// Update the GPU to newer, current values we now store for 'uniform' vars on 
// the GPU; and (if needed) update each attribute's stride and offset in VBO.

  myGL.useProgram(this.shaderLoc);	// In the GPU, SELECT our already-compiled
                                    // -and-linked executable shader program.

  // Transfer new uniforms' values to the GPU:-------------
  myGL.uniformMatrix4fv(this.u_ModelMatLoc,	// GPU location of the uniform
                        false, 				// use matrix transpose instead?
                        g_vpMatrix.elements);	// send data from Javascript.
}

VBObox0.prototype.draw = function(myGL) {
//=============================================================================
// Send commands to GPU to select and render current VBObox contents.  	

  myGL.useProgram(this.shaderLoc);	

  // a) Re-set the GPU's currently 'bound' vbo buffer;
  myGL.bindBuffer(myGL.ARRAY_BUFFER,	// GLenum 'target' for this GPU buffer 
                    this.vboLoc);			// the ID# the GPU uses for this buffer.
  // (Here's how to use the almost-identical OpenGL version of this function:
  //		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml )
  // b) Re-connect data paths from VBO to each shader attribute:
  myGL.vertexAttribPointer(this.a_PosLoc, 4, myGL.FLOAT, false, 
                            7*this.FSIZE, 0);		// stride, offset
  myGL.vertexAttribPointer(this.a_ColrLoc, 3, myGL.FLOAT, false, 
                            7*this.FSIZE, 4*this.FSIZE); // stride, offset
  // c) enable the newly-re-assigned attributes:
  myGL.enableVertexAttribArray(this.a_PosLoc);
  myGL.enableVertexAttribArray(this.a_ColrLoc);

  vpAspect = (myGL.drawingBufferWidth	/				// On-screen aspect ratio for
              myGL.drawingBufferHeight);				// this camera: width/height.
                            
                    
  g_vpMatrix.setPerspective(35.0, 				// fovy: y-axis field-of-view in degrees 	
                      // (top <-> bottom in view frustum)
            vpAspect, // aspect ratio: width/height
            1, 100);	// near, far (always >0).

                    
  g_vpMatrix.lookAt(	g_Eye[x], g_Eye[y], g_Eye[z], 					// 'Center' or 'Eye Point',
                    g_LookAt[x], g_LookAt[y], g_LookAt[z], 					// look-At point,
                    g_Up[x], g_Up[y], g_Up[z]);					// View UP vector, all in 'world' coords.

  
  myGL.uniformMatrix4fv(this.u_ModelMatLoc, false, g_vpMatrix.elements);

  // ----------------------------Draw the contents of the currently-bound VBO:
  myGL.drawArrays(myGL.LINES, 	// select the drawing primitive to draw,
                  gndStart/floatsPerVertex, 								// location of 1st vertex to draw;
                  gndVerts.length/floatsPerVertex);		// number of vertices to draw on-screen.
}

var g_Eye = [10.25, 0.0, 4.25];
var g_LookAt = [0, 0, 1];
var g_Up = [0, 0, 10];
var x = 0, y = 1, z = 2;
  