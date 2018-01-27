const kCubeVertexShader = `

attribute vec4 aPos;
uniform mat4 uMVP;

void main() {
  gl_Position = uMVP * aPos;
}

`;

const kCubeFragmentShader = `

precision mediump float;

void main() {
  gl_FragColor = vec4(gl_FragCoord.zzz, 1);
}

`;

const kDefaultStride = 0;
const kDefaultOffset = 0;

const kCubePositions = [
  -1, -1, -1, 1,
  +1, -1, -1, 1,
  +1, +1, -1, 1,
  -1, +1, -1, 1, 
  -1, -1, +1, 1,
  +1, -1, +1, 1,
  +1, +1, +1, 1,
  -1, +1, +1, 1,
];
const kCubePositionDim = 4;
const kCubePositionCount = kCubePositions.length / kCubePositionDim;

const kFloorPositions = [
  -4, -1.2, -4, 1,
  +4, -1.2, -4, 1,
  +4, -1.0, -4, 1,
  -4, -1.0, -4, 1, 
  -4, -1.2, +4, 1,
  +4, -1.2, +4, 1,
  +4, -1.0, +4, 1,
  -4, -1.0, +4, 1,
]
const kFloorPositionDim = 4;
const kFloorPositionCount = kFloorPositionDim.length / kFloorPositionDim;

const kCubeIndices = [
  0, 2, 1,
  0, 3, 2,
  4, 5, 6,
  4, 6, 7,
  0, 5, 4,
  0, 1, 5,
  1, 6, 5,
  1, 2, 6,
  2, 7, 6,
  2, 3, 7,
  3, 4, 7,
  3, 0, 4,
];
const kCubeIndexCount = kCubeIndices.length;

define(["glm", "glh"], function(glm, glh) {
  return {
    onStart: onStart,
  };
  
  function onStart(config) {
    var canvas = document.querySelector("#".concat(config.canvasId));
    canvas.onresize = () => onResize(canvas);
    const gl = glh.getContext(canvas);
    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    const program = glh.createShaderProgram(gl, kCubeVertexShader, kCubeFragmentShader);
    const positionLocation = gl.getAttribLocation(program, "aPos");
    const mvpLocation = gl.getUniformLocation(program, "uMVP");
    const cubePositionBuffer = glh.createFloatVertexBuffer(gl, kCubePositions);
    const floorPositionBuffer = glh.createFloatVertexBuffer(gl, kFloorPositions);
    const indexBuffer = glh.createShortIndexBuffer(gl, kCubeIndices);
    
    const center = glm.vec3(0, 0, 16);
    const modelMatrix =
        glm.rotate(
            glm.rotate(
                glm.translate(glm.mat4(1), center),
                /* angle= */ glm.radians(20),
                /* axis= */ glm.vec3(-1, 0, 0)),
            /* angle= */ glm.radians(50),
            /* axis= */ glm.vec3(0, -1, 0));
    const viewMatrix =
        glm.lookAt(
            /* eye= */ glm.vec3(0, 10, 26), center,
            /* up= */ glm.vec3(0, 1, 0));
    const projMatrix =
        glm.perspective(
            /* fovy= */ glm.radians(30),
            /* aspect= */ 4./3,
            /* zNear= */ 10,
            /* zFar= */ 20);
    const mvpMatrix = projMatrix['*'](viewMatrix['*'](modelMatrix));
        
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);

    // Draw cube.
    gl.bindBuffer(gl.ARRAY_BUFFER, cubePositionBuffer);
    gl.vertexAttribPointer(
        positionLocation, kCubePositionDim, gl.FLOAT, /* normalize= */ false,
        kDefaultStride, kDefaultOffset);
    gl.uniformMatrix4fv(mvpLocation, /* transpose= */ false, mvpMatrix.elements);   
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(gl.TRIANGLES, kCubeIndexCount, gl.UNSIGNED_SHORT, kDefaultOffset);
    
    // Draw floor.
    gl.bindBuffer(gl.ARRAY_BUFFER, floorPositionBuffer);
    gl.vertexAttribPointer(
        positionLocation, kFloorPositionDim, gl.FLOAT, /* normalize= */ false,
        kDefaultStride, kDefaultOffset);
    gl.drawElements(gl.TRIANGLES, kCubeIndexCount, gl.UNSIGNED_SHORT, kDefaultOffset);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.disableVertexAttribArray(positionLocation);
    gl.useProgram(null);
  }
  
  function onResize(canvas) {
    // no-op
  }
});