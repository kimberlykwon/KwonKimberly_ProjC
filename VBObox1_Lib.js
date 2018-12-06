var floatsPerVertex = 7; // different for each vbo; move to be a member of each vbo

//=============================================================================
//=============================================================================
function VBObox1() {
//=============================================================================
//=============================================================================
// CONSTRUCTOR for one re-usable 'VBObox0' object  that holds all data and 
// fcns needed to render vertices from one Vertex Buffer Object (VBO) using one 
// separate set of shaders.
  
  this.VERT_SRC =	//--------------------- VERTEX SHADER source code 
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

  this.FRAG_SRC = //---------------------- FRAGMENT SHADER source code 
  'precision mediump float;\n' +
  'varying vec4 v_Color;\n' +
  // 'uniform vec3 u_LightColor;\n' +     // Light color
  // 'uniform vec3 u_LightPosition;\n' +  // Position of the light source
  // 'uniform vec3 u_AmbientLight;\n' +   // Ambient light color
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';
    
                                  // bytes req'd for 1 vboContents array element;                                // (why? used to compute stride and offset 
                                  // in bytes for vertexAttribPointer() calls) 
  this.shaderLoc;									// Shader-program location # on the GPU, made 
                                  // by compile/link of VERT_SRC and FRAG_SRC.
  this.modelMatrix = new Matrix4();
  this.mvpMatrix = new Matrix4();
  this.normalMatrix = new Matrix4();
}


VBObox1.prototype.initArrayBuffer = function(myGL, attribute, data, type, num){
  // Create a buffer object
  var buffer = myGL.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  // Write date into the buffer object
  myGL.bindBuffer(myGL.ARRAY_BUFFER, buffer);
  myGL.bufferData(myGL.ARRAY_BUFFER, data, myGL.STATIC_DRAW);

  // Assign the buffer object to the attribute variable
  var a_attribute = myGL.getAttribLocation(myGL.program, attribute);
  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  } 
  myGL.vertexAttribPointer(a_attribute, num, type, false, 0, 0);

  // Enable the assignment of the buffer object to the attribute variable
  myGL.enableVertexAttribArray(a_attribute);

  myGL.bindBuffer(myGL.ARRAY_BUFFER, null);

  return true;
}

// make axes
VBObox1.prototype.makeSphere = function(myGL) {
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
  if (!this.initArrayBuffer(myGL, 'a_Position', new Float32Array(positions), myGL.FLOAT, 3)) return -1;
  if (!this.initArrayBuffer(myGL, 'a_Color', new Float32Array(colors), myGL.FLOAT,3)) return -1;
  if (!this.initArrayBuffer(myGL, 'a_Normal', new Float32Array(positions), myGL.FLOAT, 3))  return -1;

  // Unbind the buffer object
  myGL.bindBuffer(myGL.ARRAY_BUFFER, null);

  // Write the indices to the buffer object
  var indexBuffer = myGL.createBuffer();
  if (!indexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }
  myGL.bindBuffer(myGL.ELEMENT_ARRAY_BUFFER, indexBuffer);
  myGL.bufferData(myGL.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), myGL.STATIC_DRAW);

  // console.log("initializes ok")
  return indices.length;
}

VBObox1.prototype.init = function(myGL) {
//=============================================================================
// Compile,link,upload shaders-------------------------------------------------

  // Initialize shaders
  this.shaderLoc = createProgram(myGL, this.VERT_SRC, this.FRAG_SRC);
  if (!this.shaderLoc) {
    console.log(this.constructor.name + 
                '.init() failed to create executable Shaders on the GPU. Bye!');
    return;
  }

  myGL.program = this.shaderLoc;

  myGL.useProgram(this.shaderLoc);

  this.mySiz = this.makeSphere(myGL);

  // How many vertices total?
  if (this.mySiz < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Get handle to graphics system's storage location of u_MvpMatrix
  this.u_ModelMatrix = myGL.getUniformLocation(myGL.program, 'u_ModelMatrix');
  this.u_MvpMatrix = myGL.getUniformLocation(myGL.program, 'u_MvpMatrix');
  this.u_NormalMatrix = myGL.getUniformLocation(myGL.program, 'u_NormalMatrix');
  var u_LightColor = myGL.getUniformLocation(myGL.program, 'u_LightColor');
  var u_LightPosition = myGL.getUniformLocation(myGL.program, 'u_LightPosition');
  var u_AmbientLight = myGL.getUniformLocation(myGL.program, 'u_AmbientLight');
  if (!this.u_MvpMatrix || !this.u_NormalMatrix || !this.u_ModelMatrix || !u_LightColor || !u_LightPosition　|| !u_AmbientLight) { 
    console.log('Failed to get the storage location');
    return;
  }

  // Set the light color (white)
  myGL.uniform3f(u_LightColor, 0.8, 0.8, 0.8);
  // Set the light direction (in the world coordinate)
  myGL.uniform3f(u_LightPosition, 5.0, 8.0, 7.0);
  // Set the ambient light
  myGL.uniform3f(u_AmbientLight, 0.5, 0.5, 0.5);

  // Pass the model matrix to u_ModelMatrix
  myGL.uniformMatrix4fv(this.u_ModelMatrix, false, this.modelMatrix.elements);


  // Calculate the matrix to transform the normal based on the model matrix
  this.normalMatrix.setInverseOf(this.modelMatrix);
  this.normalMatrix.transpose();
  // Pass the transformation matrix for normals to u_NormalMatrix
  myGL.uniformMatrix4fv(this.u_NormalMatrix, false, this.normalMatrix.elements);

  this.mvpMatrix.set(g_vpMatrix).multiply(this.modelMatrix);
  myGL.uniformMatrix4fv(this.u_MvpMatrix, false, this.mvpMatrix.elements)
  console.log("initializes ok")
}

VBObox1.prototype.adjust = function(myGL) {
//=============================================================================
// Update the GPU to newer, current values we now store for 'uniform' vars on 
// the GPU; and (if needed) update each attribute's stride and offset in VBO.
// if (!initShaders(myGL, this.VERT_SRC, this.FRAG_SRC)) {
//   console.log('Failed to intialize shaders.');
//   return;
// }
  myGL.useProgram(this.shaderLoc);	// In the GPU, SELECT our already-compiled
                                    // -and-linked executable shader program.

  // Transfer new uniforms' values to the GPU:-------------
  myGL.uniformMatrix4fv(this.u_ModelMatrix,	// GPU location of the uniform
                        false, 				// use matrix transpose instead?
                        this.modelMatrix.elements);	// send data from Javascript.

    // Transfer new uniforms' values to the GPU:-------------
  this.normalMatrix.setInverseOf(this.modelMatrix);
  this.normalMatrix.transpose();
  myGL.uniformMatrix4fv(this.u_NormalMatrix,	// GPU location of the uniform
                        false, 				// use matrix transpose instead?
                        this.normalMatrix.elements);	// send data from Javascript.

  this.mvpMatrix.set(g_vpMatrix).multiply(this.modelMatrix)
  myGL.uniformMatrix4fv(this.u_MvpMatrix, 
                        false, 
                        this.mvpMatrix.elements);
}

VBObox1.prototype.draw = function(myGL) {
//=============================================================================
// Send commands to GPU to select and render current VBObox contents.  	
  myGL.useProgram(this.shaderLoc);	

  // Initialize vertex buffer
  this.mySiz = this.makeSphere(myGL);
  if (this.n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  //=========================================================================
  // draw sphere
  pushMatrix(this.modelMatrix);

  this.modelMatrix.translate(0.0, 0.0, 1.0);

  this.modelMatrix.scale(0.5,0.5,0.5);

  // Calculate the model matrix
  // modelMatrix.setRotate(currentAngle, 0, 1, 0); // Rotate around the y-axis
  // Pass the model matrix to u_ModelMatrix
  myGL.uniformMatrix4fv(this.u_ModelMatrix, false, this.modelMatrix.elements);

  // Pass the model view projection matrix to u_MvpMatrix
  this.mvpMatrix.set(g_vpMatrix).multiply(this.modelMatrix);
  myGL.uniformMatrix4fv(this.u_MvpMatrix, false, this.mvpMatrix.elements);

  // Pass the matrix to transform the normal based on the model matrix to u_NormalMatrix
  this.normalMatrix.setInverseOf(this.modelMatrix);
  this.normalMatrix.transpose();
  myGL.uniformMatrix4fv(this.u_NormalMatrix, false, this.normalMatrix.elements);

  myGL.uniformMatrix4fv(this.u_MvpMatrix, false, this.mvpMatrix.elements);


  // Now, using these drawing axes, draw our ground plane: 
  myGL.drawElements(myGL.TRIANGLES,							// use this drawing primitive, and
                this.mySiz,	// start at this vertex number, and
                myGL.UNSIGNED_SHORT,
                0);		// draw this many vertices

  this.modelMatrix = popMatrix();
}
