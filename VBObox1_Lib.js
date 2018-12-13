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
  	//--------------- GLSL Struct Definitions:
	'struct MatlT {\n' +		// Describes one Phong material by its reflectances:
	'		vec3 emit;\n' +			// Ke: emissive -- surface 'glow' amount (r,g,b);
	'		vec3 ambi;\n' +			// Ka: ambient reflectance (r,g,b)
	'		vec3 diff;\n' +			// Kd: diffuse reflectance (r,g,b)
	'		vec3 spec;\n' + 		// Ks: specular reflectance (r,g,b)
	'		int shiny;\n' +			// Kshiny: specular exponent (integer >= 1; typ. <200)
  '		};\n' +
  

  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'uniform MatlT u_MatlSet[1];\n' +		// Array of all materials.
  'attribute vec4 a_Normal;\n' +
  'attribute vec4 a_Position;\n' +
  'varying vec4 v_Position;\n' +
  'varying vec3 v_Normal;\n' +
  'varying vec3 v_Kd; \n' +							// Phong Lighting: diffuse reflectance
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +      // Calculate a normal to be fit with a model matrix, and make it 1.0 in length
  '  v_Position = u_ModelMatrix * a_Position;\n' +
  // '  gl_PointSize = 10.0;\n' +
  // Calculate the light direction and make it 1.0 in length
  // '  vec3 lightDirection = normalize(u_LightPosition - vec3(v_Position));\n' +
  // The dot product of the light direction and the normal
  // '  float nDotL = max(dot(lightDirection, normal), 0.0);\n' +
  // // Calculate the color due to diffuse reflection
  // '  vec3 diffuse = u_LightColor * a_Color.rgb * nDotL;\n' +
  // // Calculate the color due to ambient reflection
  // '  vec3 ambient = u_AmbientLight * a_Color.rgb;\n' +
  // // Add the surface colors due to diffuse reflection and ambient reflection
  // '  v_Color = vec4(diffuse + ambient, a_Color.a);\n' + 
  ' v_Kd = u_MatlSet[0].diff;\n' + 
  '}\n';

  this.FRAG_SRC = //---------------------- FRAGMENT SHADER source code 
  'precision highp float;\n' +
  'precision highp int;\n' +
  // 'varying vec4 v_Color;\n' +
  // 'uniform vec3 u_LightColor;\n' +     // Light color
  // 'uniform vec3 u_LightPosition;\n' +  // Position of the light source
  // 'uniform vec3 u_AmbientLight;\n' +   // Ambient light color
  	//--------------- GLSL Struct Definitions:
	'struct LampT {\n' +		// Describes one point-like Phong light source
	'		vec3 pos;\n' +			// (x,y,z,w); w==1.0 for local light at x,y,z position
													//		   w==0.0 for distant light from x,y,z direction 
	' 	vec3 ambi;\n' +			// Ia ==  ambient light source strength (r,g,b)
	' 	vec3 diff;\n' +			// Id ==  diffuse light source strength (r,g,b)
	'		vec3 spec;\n' +			// Is == specular light source strength (r,g,b)
	'}; \n' +
	//
	'struct MatlT {\n' +		// Describes one Phong material by its reflectances:
	'		vec3 emit;\n' +			// Ke: emissive -- surface 'glow' amount (r,g,b);
	'		vec3 ambi;\n' +			// Ka: ambient reflectance (r,g,b)
	'		vec3 diff;\n' +			// Kd: diffuse reflectance (r,g,b)
	'		vec3 spec;\n' + 		// Ks: specular reflectance (r,g,b)
	'		int shiny;\n' +			// Kshiny: specular exponent (integer >= 1; typ. <200)
  '		};\n' +

  //-------------UNIFORMS: values set from JavaScript before a drawing command.
	'uniform LampT u_LampSet[2];\n' +		// Array of all light sources.
	'uniform MatlT u_MatlSet[1];\n' +		// Array of all materials.
  'uniform vec3 u_eyePosWorld;\n' + 	// Camera/eye location in world coords.
  
 	//-------------VARYING:Vertex Shader values sent per-pixel to Fragment shader: 
  'varying vec3 v_Normal;\n' +				// Find 3D surface normal at each pix
  'varying vec4 v_Position;\n' +			// pixel's 3D pos too -- in 'world' coords
  'varying vec3 v_Kd;\n' +						// Find diffuse reflectance K_d per pix
  													// Ambient? Emissive? Specular? almost
  													// NEVER change per-vertex: I use 'uniform' values
  'void main() { \n' +
        // Normalize! !!IMPORTANT!! TROUBLE if you don't! 
        // normals interpolated for each pixel aren't 1.0 in length any more!
    'vec3 normal = normalize(v_Normal); \n' +
  //	'  vec3 normal = v_Normal; \n' +
        // Find the unit-length light dir vector 'L' (surface pt --> light):
    'vec3 lightDirection = normalize(u_LampSet[0].pos - v_Position.xyz);\n' +
    // '  vec3 light2Direction = normalize(u_LampSet[1].pos - v_Position.xyz);\n' +
  
        // Find the unit-length eye-direction vector 'V' (surface pt --> camera)
    'vec3 eyeDirection = normalize(u_eyePosWorld - v_Position.xyz); \n' +
        // The dot product of (unit-length) light direction and the normal vector
        // (use max() to discard any negatives from lights below the surface) 
        // (look in GLSL manual: what other functions would help?)
        // gives us the cosine-falloff factor needed for the diffuse lighting term:
    'float nDotL = max(dot(lightDirection, normal), 0.0); \n' +
    'float n2DotL = max(dot(eyeDirection, normal), 0.0); \n' +
  
    // '  float nDot2 = max(dot(eyeDirection, normal), 0.0); \n' +
        // The Blinn-Phong lighting model computes the specular term faster 
        // because it replaces the (V*R)^shiny weighting with (H*N)^shiny,
        // where 'halfway' vector H has a direction half-way between L and V
        // H = norm(norm(V) + norm(L)).  Note L & V already normalized above.
        // (see http://en.wikipedia.org/wiki/Blinn-Phong_shading_model)
    'vec3 H = normalize(lightDirection + eyeDirection); \n' +
    'vec3 H2 = normalize(eyeDirection + eyeDirection); \n' +
  
    'float nDotH = max(dot(H, normal), 0.0); \n' +
    'float n2DotH = max(dot(H2, normal), 0.0); \n' +
  
        // (use max() to discard any negatives from lights below the surface)
        // Apply the 'shininess' exponent K_e:
        // Try it two different ways:		The 'new hotness': pow() fcn in GLSL.
        // CAREFUL!  pow() won't accept integer exponents! Convert K_shiny!  
    'float e64 = pow(nDotH, float(u_MatlSet[0].shiny));\n' +
    'float e65 = pow(n2DotH, float(u_MatlSet[0].shiny));\n' +
  
    // Calculate the final color from diffuse reflection and ambient reflection
  //  '	 vec3 emissive = u_Ke;' +
    'vec3 emissive = 										u_MatlSet[0].emit;\n' +
    'vec3 ambient = u_LampSet[0].ambi * u_LampSet[1].ambi * u_MatlSet[0].ambi;\n' +
    'vec3 diffuse = u_LampSet[0].diff * u_LampSet[1].diff * v_Kd * (nDotL + nDotH);\n' +
    'vec3 speculr = u_LampSet[0].spec * u_LampSet[1].spec * u_MatlSet[0].spec * (e64 + e65);\n' +
    'gl_FragColor = vec4(emissive + ambient + diffuse + speculr , 1.0);\n' +
  '}\n';
    
                                  // bytes req'd for 1 vboContents array element;                                // (why? used to compute stride and offset 
                                  // in bytes for vertexAttribPointer() calls) 
  this.shaderLoc;									// Shader-program location # on the GPU, made 
                                  // by compile/link of VERT_SRC and FRAG_SRC.
  this.modelMatrix = new Matrix4();
  this.mvpMatrix = new Matrix4();
  this.normalMatrix = new Matrix4();

  this.lamp0 = new LightsT();  
  this.lamp1 = new LightsT();

	// ... for our first material:
  this.matlSel= MATL_RED_PLASTIC;				// see keypress(): 'm' key changes matlSel
  this.matl0 = new Material(this.matlSel);	
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
  // var colors = [];
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
      // colors.push(0.2);
      // colors.push(1.0);
      // colors.push(0.2);
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
  // if (!this.initArrayBuffer(myGL, 'a_Color', new Float32Array(colors), myGL.FLOAT,3)) return -1;
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
  if (!this.u_MvpMatrix || !this.u_NormalMatrix || !this.u_ModelMatrix) { 
    console.log('Failed to get the storage location');
    return;
  }

  this.lamp0.u_pos  = myGL.getUniformLocation(myGL.program, 'u_LampSet[0].pos');	
  this.lamp0.u_ambi = myGL.getUniformLocation(myGL.program, 'u_LampSet[0].ambi');
  this.lamp0.u_diff = myGL.getUniformLocation(myGL.program, 'u_LampSet[0].diff');
  this.lamp0.u_spec = myGL.getUniformLocation(myGL.program, 'u_LampSet[0].spec');
  if( !this.lamp0.u_pos || !this.lamp0.u_ambi	|| !this.lamp0.u_diff || !this.lamp0.u_spec	) {
    console.log('Failed to get GPUs this.lamp0 storage locations');
    return;
	}
	
  this.lamp1.u_pos  = myGL.getUniformLocation(myGL.program, 'u_LampSet[1].pos');	
  this.lamp1.u_ambi = myGL.getUniformLocation(myGL.program, 'u_LampSet[1].ambi');
  this.lamp1.u_diff = myGL.getUniformLocation(myGL.program, 'u_LampSet[1].diff');
  this.lamp1.u_spec = myGL.getUniformLocation(myGL.program, 'u_LampSet[1].spec');
  if( !this.lamp1.u_pos || !this.lamp1.u_ambi	|| !this.lamp1.u_diff || !this.lamp1.u_spec	) {
    console.log('Failed to get GPUs this.lamp1 storage locations');
    return;
  }

	// ... for Phong material/reflectance:
	this.matl0.uLoc_Ke = myGL.getUniformLocation(myGL.program, 'u_MatlSet[0].emit');
	this.matl0.uLoc_Ka = myGL.getUniformLocation(myGL.program, 'u_MatlSet[0].ambi');
	this.matl0.uLoc_Kd = myGL.getUniformLocation(myGL.program, 'u_MatlSet[0].diff');
	this.matl0.uLoc_Ks = myGL.getUniformLocation(myGL.program, 'u_MatlSet[0].spec');
	this.matl0.uLoc_Kshiny = myGL.getUniformLocation(myGL.program, 'u_MatlSet[0].shiny');
	if(!this.matl0.uLoc_Ke || !this.matl0.uLoc_Ka || !this.matl0.uLoc_Kd || !this.matl0.uLoc_Ks || !this.matl0.uLoc_Kshiny) {
		console.log('Failed to get GPUs Reflectance storage locations');
		return;
	}


  this.uLoc_eyePosWorld  = gl.getUniformLocation(myGL.program, 'u_eyePosWorld');
	// Position the camera in world coordinates:
	myGL.uniform3fv(this.uLoc_eyePosWorld, g_Eye);// use it to set our uniform
	// (Note: uniform4fv() expects 4-element float32Array as its 2nd argument)
	
  // Init World-coord. position & colors of first light source in global vars;
  this.lamp0.I_pos.elements.set( [6.0, 5.0, 5.0]);
  this.lamp0.I_ambi.elements.set([0.4, 0.4, 0.4]);
  this.lamp0.I_diff.elements.set([1.0, 1.0, 1.0]);
	this.lamp0.I_spec.elements.set([1.0, 1.0, 1.0]);
	
	this.lamp1.I_pos.elements.set( g_Eye);
  this.lamp1.I_ambi.elements.set([0.4, 0.4, 0.4]);
  this.lamp1.I_diff.elements.set([1.0, 1.0, 1.0]);
  this.lamp1.I_spec.elements.set([1.0, 1.0, 1.0]);

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

//   //---------------For the light source(s):
//   gl.uniform3fv(lamp0.u_pos,  lamp0.I_pos.elements.slice(0,3));
//   //		 ('slice(0,3) member func returns elements 0,1,2 (x,y,z) ) 
//   gl.uniform3fv(lamp0.u_ambi, lamp0.I_ambi.elements);		// ambient
//   gl.uniform3fv(lamp0.u_diff, lamp0.I_diff.elements);		// diffuse
//   gl.uniform3fv(lamp0.u_spec, lamp0.I_spec.elements);		// Specular
  
//   gl.uniform3fv(lamp1.u_pos,  lamp1.I_pos.elements.slice(0,3));
//   //		 ('slice(0,3) member func returns elements 0,1,2 (x,y,z) ) 
//   gl.uniform3fv(lamp1.u_ambi, lamp1.I_ambi.elements);		// ambient
//   gl.uniform3fv(lamp1.u_diff, lamp1.I_diff.elements);		// diffuse
//   gl.uniform3fv(lamp1.u_spec, lamp1.I_spec.elements);		// Specular
// //	console.log('lamp0.u_pos',lamp0.u_pos,'\n' );
// //	console.log('lamp0.I_diff.elements', lamp0.I_diff.elements, '\n');

//   //---------------For the Material object(s):
//   gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));				// Ke emissive
//   gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));				// Ka ambient
//   gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));				// Kd	diffuse
//   gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));				// Ks specular
//   gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny 
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

  //---------------For the light source(s):
  myGL.uniform3fv(this.lamp0.u_pos,  this.lamp0.I_pos.elements.slice(0,3));
  //		 ('slice(0,3) member func returns elements 0,1,2 (x,y,z) ) 
  myGL.uniform3fv(this.lamp0.u_ambi, this.lamp0.I_ambi.elements);		// ambient
  myGL.uniform3fv(this.lamp0.u_diff, this.lamp0.I_diff.elements);		// diffuse
  myGL.uniform3fv(this.lamp0.u_spec, this.lamp0.I_spec.elements);		// Specular
  
  myGL.uniform3fv(this.lamp1.u_pos,  this.lamp1.I_pos.elements.slice(0,3));
  //		 ('slice(0,3) member func returns elements 0,1,2 (x,y,z) ) 
  myGL.uniform3fv(this.lamp1.u_ambi, this.lamp1.I_ambi.elements);		// ambient
  myGL.uniform3fv(this.lamp1.u_diff, this.lamp1.I_diff.elements);		// diffuse
  myGL.uniform3fv(this.lamp1.u_spec, this.lamp1.I_spec.elements);		// Specular
  //	console.log('this.lamp0.u_pos',this.lamp0.u_pos,'\n' );
  //	console.log('this.lamp0.I_diff.elements', this.lamp0.I_diff.elements, '\n');

  //---------------For the Material object(s):
  myGL.uniform3fv(this.matl0.uLoc_Ke, this.matl0.K_emit.slice(0,3));				// Ke emissive
  myGL.uniform3fv(this.matl0.uLoc_Ka, this.matl0.K_ambi.slice(0,3));				// Ka ambient
  myGL.uniform3fv(this.matl0.uLoc_Kd, this.matl0.K_diff.slice(0,3));				// Kd	diffuse
  myGL.uniform3fv(this.matl0.uLoc_Ks, this.matl0.K_spec.slice(0,3));				// Ks specular
  myGL.uniform1i(this.matl0.uLoc_Kshiny, parseInt(this.matl0.K_shiny, 10));     // Kshiny 

  this.modelMatrix.translate(0.0, 0.0, 1.0);

  this.modelMatrix.scale(0.5,0.5,0.5);

  // Calculate the model matrix
  // modelMatrix.setRotate(currentAnmyGLe, 0, 1, 0); // Rotate around the y-axis
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
