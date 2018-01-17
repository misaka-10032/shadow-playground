const kDepthVertexShader = `

attribute vec3 aPos;
uniform mat4 uLightMVP;

void main() {
  gl_Position = uLightMVP * vec4(aPos, 1);
}

`;

const kDepthFragmentShader = `

precision mediump float;

void main() {
  gl_FragColor = vec4(gl_FragCoord.zzz, 1);
}

`;

const kShadowVertexShader = `

attribute vec3 aPos;
uniform mat4 uCameraMVP;
uniform mat4 uLightMVP;
varying vec4 vRGBx;

void main() {
  vec4 pos = vec4(aPos, 1);
  gl_Position = uCameraMVP * pos;
  vRGBx = (pos + vec4(1)) * .4 + .2;
}

`;

const kShadowFragmentShader = `

precision mediump float;

uniform sampler2D uDepthMap;
varying vec4 vRGBx;

void main() {
  gl_FragColor = vec4(vRGBx.xyz, 1);
}

`;

const kDefaultStride = 0;
const kDefaultOffset = 0;

const kCubePositions = [
  -1, -1, -1,
  +1, -1, -1,
  +1, +1, -1,
  -1, +1, -1, 
  -1, -1, +1,
  +1, -1, +1,
  +1, +1, +1,
  -1, +1, +1,
];
const kCubePositionDim = 3;
const kCubePositionCount = kCubePositions.length / kCubePositionDim;

const kFloorPositions = [
  -4, -1.2, -4,
  +4, -1.2, -4,
  +4, -1.0, -4,
  -4, -1.0, -4, 
  -4, -1.2, +4,
  +4, -1.2, +4,
  +4, -1.0, +4,
  -4, -1.0, +4,
]
const kFloorPositionDim = 3;
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
    
  function initPasses(self, gl) {
    const center = glm.vec3(0, 0, 16);
    const modelMatrix =
        glm.rotate(
            glm.translate(glm.mat4(1), center),
            /* angle= */ glm.radians(20),
            /* axis= */ glm.vec3(-1, -1, 0));

    const cameraViewMatrix =
        glm.lookAt(
            /* eye= */ glm.vec3(0, 0, 0), center,
            /* up= */ glm.vec3(0, 1, 0));
    const cameraProjMatrix =
        glm.perspective(
            /* fovy= */ glm.radians(30),
            /* aspect= */ 4./3,
            /* zNear= */ 10,
            /* zFar= */ 30);
    const cameraMvpMatrix = cameraProjMatrix['*'](cameraViewMatrix['*'](modelMatrix));

    const lightViewMatrix =
        glm.lookAt(
            /* eye= */ glm.vec3(0, 10, 26), center,
            /* up= */ glm.vec3(0, 1, 0));
    const lightProjMatrix = cameraProjMatrix;
    const lightMvpMatrix = lightProjMatrix['*'](lightViewMatrix['*'](modelMatrix));
    
    function drawPass(pass) {
      gl.useProgram(pass.program);
      gl.enableVertexAttribArray(pass.positionLocation);

      // Draw cube.
      gl.bindBuffer(gl.ARRAY_BUFFER, pass.cubePositionBuffer);
      gl.vertexAttribPointer(
          pass.positionLocation, kCubePositionDim, gl.FLOAT, /* normalize= */ false,
          kDefaultStride, kDefaultOffset);
      if (pass.cameraMvpLocation) {
        gl.uniformMatrix4fv(
            pass.cameraMvpLocation, /* transpose= */ false, pass.cameraMvpMatrix.elements);
      }
      if (pass.lightMvpLocation) {
        gl.uniformMatrix4fv(
            pass.lightMvpLocation, /* transpose= */ false, pass.lightMvpMatrix.elements);
      }
      if (pass.depthMapLocation) {
        // TODO
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pass.indexBuffer);
      gl.drawElements(gl.TRIANGLES, kCubeIndexCount, gl.UNSIGNED_SHORT, kDefaultOffset);

      // Draw floor.
      gl.bindBuffer(gl.ARRAY_BUFFER, pass.floorPositionBuffer);
      gl.vertexAttribPointer(
          pass.positionLocation, kFloorPositionDim, gl.FLOAT, /* normalize= */ false,
          kDefaultStride, kDefaultOffset);
      gl.drawElements(gl.TRIANGLES, kCubeIndexCount, gl.UNSIGNED_SHORT, kDefaultOffset);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.disableVertexAttribArray(pass.positionLocation);
      gl.useProgram(null);
    }
    
    const depthProgram = glh.initShaderProgram(gl, kDepthVertexShader, kDepthFragmentShader);
    self.depthPass = {
      program: depthProgram,
      positionLocation: gl.getAttribLocation(depthProgram, "aPos"),
      lightMvpLocation: gl.getUniformLocation(depthProgram, "uLightMVP"),
      cubePositionBuffer: glh.createFloatVertexBuffer(gl, kCubePositions),
      floorPositionBuffer: glh.createFloatVertexBuffer(gl, kFloorPositions),
      lightMvpMatrix: lightMvpMatrix,
      indexBuffer: glh.createShortIndexBuffer(gl, kCubeIndices),
    };
    self.depthPass.draw = function() {
      const tex =
          glh.createTexture(gl, self.canvas.width, self.canvas.height, /* data= */ null);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(
          gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, /* level= */ 0);
      drawPass(self.depthPass);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return fb;
    };
    
    const shadowProgram = glh.initShaderProgram(gl, kShadowVertexShader, kShadowFragmentShader);
    self.shadowPass = {
      program: shadowProgram,
      positionLocation: gl.getAttribLocation(shadowProgram, "aPos"),
      cameraMvpLocation: gl.getUniformLocation(shadowProgram, "uCameraMVP"),
      lightMvpLocation: gl.getUniformLocation(shadowProgram, "uLightMVP"),
      depthMapLocation: gl.getUniformLocation(shadowProgram, "uDepthMap"),
      cubePositionBuffer: glh.createFloatVertexBuffer(gl, kCubePositions),
      floorPositionBuffer: glh.createFloatVertexBuffer(gl, kFloorPositions),
      cameraMvpMatrix: cameraMvpMatrix,
      lightMvpMatrix: lightMvpMatrix,
      depthMapTexture: null, // TODO
      indexBuffer: glh.createShortIndexBuffer(gl, kCubeIndices),
    };
    self.shadowPass.draw = function(fb) {
      drawPass(self.shadowPass);
    };
  }
  
  function onStart(config) {
    this.canvas = document.querySelector("#".concat(config.canvasId));
    this.canvas.onresize = () => onResize();
    const gl = this.canvas.getContext("webgl");
    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    initPasses(this, gl);
    fb = this.depthPass.draw();
    this.shadowPass.draw(fb);
  }
  
  function onResize() {
    // no-op
  }
});