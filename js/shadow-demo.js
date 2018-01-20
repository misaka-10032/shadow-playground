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

const mat4 kBias = mat4(
    vec4(0.5, 0.0, 0.0, 0.0),
    vec4(0.0, 0.5, 0.0, 0.0),
    vec4(0.0, 0.0, 0.5, 0.0),
    vec4(0.5, 0.5, 0.5, 1.0));

attribute vec3 aPos;
uniform mat4 uCameraMVP;
uniform mat4 uLightMVP;
varying vec4 vRGBx;
varying vec4 vLightCoord;

void main() {
  vec4 pos = vec4(aPos, 1);
  // gl_Position = uCameraMVP * pos;
  gl_Position = uLightMVP * pos;
  vRGBx = (pos + vec4(1)) * .4 + .2;
  vLightCoord = kBias * uLightMVP * pos;
}

`;

const kShadowFragmentShader = `

precision mediump float;

uniform sampler2D uDepthMap;
varying vec4 vRGBx;
varying vec4 vLightCoord;

void main() {
  vec2 lightCoord = vLightCoord.xy / vLightCoord.w;
  gl_FragColor = vec4(texture2D(uDepthMap, lightCoord).zzz, 1);
  // gl_FragColor = vec4(vRGBx.xyz, 1);
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
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(pass.program);
      gl.enableVertexAttribArray(pass.positionLocation);

      if (pass.cameraMvpLocation != null) {
        gl.uniformMatrix4fv(
            pass.cameraMvpLocation, /* transpose= */ false, pass.cameraMvpMatrix.elements);
      }
      if (pass.lightMvpLocation != null) {
        gl.uniformMatrix4fv(
            pass.lightMvpLocation, /* transpose= */ false, pass.lightMvpMatrix.elements);
      }
      if (pass.depthMapLocation != null) {
        const textureUnit = 0;
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, pass.depthMapTexture);
        gl.uniform1i(pass.depthMapLocation, textureUnit);
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pass.indexBuffer);
      
      // Draw floor.
      gl.bindBuffer(gl.ARRAY_BUFFER, pass.floorPositionBuffer);
      gl.vertexAttribPointer(
          pass.positionLocation, kFloorPositionDim, gl.FLOAT, /* normalize= */ false,
          kDefaultStride, kDefaultOffset);
      gl.drawElements(gl.TRIANGLES, kCubeIndexCount, gl.UNSIGNED_SHORT, kDefaultOffset);
      
      // Draw cube.
      gl.bindBuffer(gl.ARRAY_BUFFER, pass.cubePositionBuffer);
      gl.vertexAttribPointer(
          pass.positionLocation, kCubePositionDim, gl.FLOAT, /* normalize= */ false,
          kDefaultStride, kDefaultOffset);
      gl.drawElements(gl.TRIANGLES, kCubeIndexCount, gl.UNSIGNED_SHORT, kDefaultOffset);
      
      gl.bindTexture(gl.TEXTURE_2D, null);
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
      const texture =
          glh.createTexture(gl, self.canvas.width, self.canvas.height, /* data= */ null);
      const rb =
          glh.createRenderbuffer(gl, self.canvas.width, self.canvas.height);
      const fb =
          glh.createFramebuffer(gl, texture, rb);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      drawPass(self.depthPass);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return texture;
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
      depthMapTexture: null,
      indexBuffer: glh.createShortIndexBuffer(gl, kCubeIndices),
    };
    self.shadowPass.draw = function(texture) {
      self.shadowPass.depthMapTexture = texture;
      drawPass(self.shadowPass);
    };
  }
  
  function onStart(config) {
    this.canvas = document.querySelector("#".concat(config.canvasId));
    this.canvas.onresize = () => onResize();
    const gl = this.canvas.getContext("webgl");
    gl.clearColor(0.8, 0.9, 0.8, 1);
    gl.clearDepth(1);
    gl.enable(gl.DEPTH_TEST);
    initPasses(this, gl);
    const texture = this.depthPass.draw();
    this.shadowPass.draw(texture);
  }
  
  function onResize() {
    // no-op
  }
});