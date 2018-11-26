// Vertex shader program----------------------------------
var VSHADER_SOURCE = 
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'uniform vec3 u_LightColor;\n' +     // Light color
  'uniform vec3 u_LightPosition;\n' +  // Position of the light source
  'uniform vec3 u_AmbientLight;\n' +   // Ambient light color
  'attribute vec4 a_Normal;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'varying vec4 v_Position;\n' +
  'void main() {\n' +
  // '  vec4 color = vec4(0.2, 1.0, 0.2, 1.0);\n' + // Sphere color
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +      // Calculate a normal to be fit with a model matrix, and make it 1.0 in length
  '  v_Position = u_ModelMatrix * a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  // Calculate the light direction and make it 1.0 in length
  '  vec3 lightDirection = normalize(u_LightPosition - vec3(v_Position));\n' +
  // The dot product of the light direction and the normal
  '  float nDotL = max(dot(lightDirection, normal), 0.0);\n' +
  // Calculate the color due to diffuse reflection
  '  vec3 diffuse = u_LightColor * a_Color.rgb * nDotL;\n' +
  // Calculate the color due to ambient reflection
  '  vec3 ambient = u_AmbientLight * a_Color.rgb;\n' +
  // Add the surface colors due to diffuse reflection and ambient reflection
  '  v_Color = vec4(diffuse + ambient, a_Color.a);\n' + 
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

// var mySiz;


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
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  var u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
  var u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');
  if (!u_MvpMatrix || !u_NormalMatrix || !u_LightColor || !u_LightPosition　|| !u_AmbientLight) { 
    console.log('Failed to get the storage location');
    return;
  }

  // Set the light color (white)
  gl.uniform3f(u_LightColor, 0.8, 0.8, 0.8);
  // Set the light direction (in the world coordinate)
  gl.uniform3f(u_LightPosition, 5.0, 8.0, 7.0);
  // Set the ambient light
  gl.uniform3f(u_AmbientLight, 0.5, 0.5, 0.5);

  // Create a local version of our model matrix in JavaScript 
  modelMatrix = new Matrix4(); 

  vpMatrix = new Matrix4();
  vpMatrix.setPerspective(30, canvas.width/canvas.height, 1, 100);

  mvpMatrix = new Matrix4();
  mvpMatrix.set(vpMatrix).multiply(modelMatrix);

  // Pass the model matrix to u_ModelMatrix
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  normalMatrix = new Matrix4();

  // Calculate the matrix to transform the normal based on the model matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  // Pass the transformation matrix for normals to u_NormalMatrix
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

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
  var mySiz = makeSphere(gl);

  return mySiz;
}

// 0.2, 1.0, 0.2, 1.0

function makeSphere(gl) {
  var SPHERE_DIV = 25;

  var i, ai, si, ci;
  var j, aj, sj, cj;
  var p1, p2;

  var positions = [];
  var colors = [];
  var indices = [];

  // Generate coordinates
  for (j = 0; j <= SPHERE_DIV; j++) {
    aj = j * Math.PI / SPHERE_DIV;
    sj = Math.sin(aj);
    cj = Math.cos(aj);
    for (i = 0; i <= SPHERE_DIV; i++) {
      ai = i * 2 * Math.PI / SPHERE_DIV;
      si = Math.sin(ai);
      ci = Math.cos(ai);

      positions.push(si * sj);  // X
      positions.push(cj);       // Y
      positions.push(ci * sj);  // Z
      colors.push(0.2);
      colors.push(1.0);
      colors.push(0.2);
    }
  }

  // Generate indices
  for (j = 0; j < SPHERE_DIV; j++) {
    for (i = 0; i < SPHERE_DIV; i++) {
      p1 = j * (SPHERE_DIV+1) + i;
      p2 = p1 + (SPHERE_DIV+1);

      indices.push(p1);
      indices.push(p2);
      indices.push(p1 + 1);

      indices.push(p1 + 1);
      indices.push(p2);
      indices.push(p2 + 1);
    }
  }

  // Write the vertex property to buffers (coordinates and normals)
  // Same data can be used for vertex and normal
  // In order to make it intelligible, another buffer is prepared separately
  if (!initArrayBuffer(gl, 'a_Position', new Float32Array(positions), gl.FLOAT, 3)) return -1;
  if (!initArrayBuffer(gl, 'a_Color', new Float32Array(colors), gl.FLOAT,3)) return -1;
  if (!initArrayBuffer(gl, 'a_Normal', new Float32Array(positions), gl.FLOAT, 3))  return -1;
  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // Write the indices to the buffer object
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  return indices.length;
}

function initArrayBuffer(gl, attribute, data, type, num){
  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  // Assign the buffer object to the attribute variable
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  // Enable the assignment of the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_attribute);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return true;
}

function drawSphere(gl){
  pushMatrix(mvpMatrix);

  mvpMatrix.translate(0.0, 0.0, 1.0);

  mvpMatrix.rotate(currentAngle, 0.0, 0.0);

  mvpMatrix.scale(0.4,0.4,0.4);

  // Calculate the model matrix
  modelMatrix.setRotate(currentAngle, 0, 1, 0); // Rotate around the y-axis
  // Pass the model matrix to u_ModelMatrix
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  // Pass the model view projection matrix to u_MvpMatrix
  mvpMatrix.set(vpMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  // Pass the matrix to transform the normal based on the model matrix to u_NormalMatrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);



  // Now, using these drawing axes, draw our ground plane: 
  gl.drawElements(gl.TRIANGLES,							// use this drawing primitive, and
                n,	// start at this vertex number, and
                gl.UNSIGNED_SHORT,
                0);		// draw this many vertices

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
  
  // mvpMatrix.setIdentity();    // DEFINE 'world-space' coords.
  
  vpMatrix.setIdentity();
          
  // For this viewport, set camera's eye point and the viewing volume:
  vpMatrix.setPerspective(35.0, 				// fovy: y-axis field-of-view in degrees 	
  																		// (top <-> bottom in view frustum)
  													vpAspect, // aspect ratio: width/height
  													1, 100);	// near, far (always >0).
                            
                            
  vpMatrix.lookAt(	g_Eye[x], g_Eye[y], g_Eye[z], 					// 'Center' or 'Eye Point',
  									g_LookAt[x], g_LookAt[y], g_LookAt[z], 					// look-At point,
  									g_Up[x], g_Up[y], g_Up[z]);					// View UP vector, all in 'world' coords.


  mvpMatrix.set(vpMatrix).multiply(modelMatrix);
  
  // // Pass the view projection matrix
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

	// Draw the scene:
  drawAll(gl);
}

function drawAll(gl){
  drawSphere(gl);
  // drawGrid(gl);
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
