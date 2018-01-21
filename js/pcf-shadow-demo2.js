const kDepthVertexShader = `#version 300 es

uniform mat4 uLightMVP;
in vec3 aPos;

void main() {
  gl_Position = uLightMVP * vec4(aPos, 1);
}

`;

const kDepthFragmentShader = `#version 300 es

precision mediump float;

out vec4 fragColor;

void main() {
  fragColor = vec4(gl_FragCoord.zzz, 1);
}

`;

const kShadowVertexShader = `#version 300 es

const mat4 kBias = mat4(
    vec4(0.5, 0.0, 0.0, 0.0),
    vec4(0.0, 0.5, 0.0, 0.0),
    vec4(0.0, 0.0, 0.5, 0.0),
    vec4(0.5, 0.5, 0.5, 1.0));

uniform mat4 uCameraMVP;
uniform mat4 uLightMVP;
in vec3 aPos;
out vec4 vRGBx;
out vec4 vLightCoord;

void main() {
  vec4 pos = vec4(aPos, 1);
  gl_Position = uCameraMVP * pos;
  vRGBx = (pos + vec4(1)) * .4 + .2;
  vLightCoord = kBias * uLightMVP * pos;
}

`;

const kShadowFragmentShader = `#version 300 es

precision mediump float;

const float kEps = 1.125e-2;

uniform sampler2D uDepthMap;
uniform vec2 uDepthMapScale;
in vec4 vRGBx;
in vec4 vLightCoord;
out vec4 fragColor;

float weight(float x, float y) {
  return abs(x) < 1. && abs(y) < 1. ?
      (.6 / 4.) : (.4 / 12.);
}

void main() {
  vec4 lightCoord = vLightCoord / vLightCoord.w;
  float fragLightDist = lightCoord.z;
  float x, y, visibility = 0.;
  for (y = -1.5; y <= 1.5; y += 1.) {
    for (x = -1.5; x <= 1.5; x += 1.) {
      float occluderLightDist =
          texture(uDepthMap, lightCoord.xy + uDepthMapScale * vec2(x, y)).z;
      float diff = occluderLightDist + kEps - fragLightDist;
      float sigmoid = 1. / (1. + exp(-diff * 1e3));
      visibility += weight(x, y) * sigmoid;
    }
  }
  fragColor = vec4(.5 + .5 * visibility, 0, 0, 1);
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
            glm.rotate(
                glm.translate(glm.mat4(1), center),
                /* angle= */ glm.radians(20),
                /* axis= */ glm.vec3(-1, 0, 0)),
            /* angle= */ glm.radians(20),
            /* axis= */ glm.vec3(0, -1, 0));
    const aspect = self.canvas.width / self.canvas.height;

    const cameraViewMatrix =
        glm.lookAt(
            /* eye= */ glm.vec3(0, 0, 0), center,
            /* up= */ glm.vec3(0, 1, 0));
    const cameraProjMatrix =
        glm.perspective(
            /* fovy= */ glm.radians(30), aspect,
            /* zNear= */ 10,
            /* zFar= */ 30);
    const cameraMvpMatrix = cameraProjMatrix['*'](cameraViewMatrix['*'](modelMatrix));

    const lightViewMatrix =
        glm.lookAt(
            /* eye= */ glm.vec3(0, 10, 26), center,
            /* up= */ glm.vec3(0, 1, 0));
    const lightProjMatrix =
        glm.perspective(
            /* fovy= */ glm.radians(30), aspect,
            /* zNear= */ 10,
            /* zFar= */ 30);
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
        gl.uniform2fv(pass.depthMapScaleLocation, pass.depthMapScale.elements);
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
    
    const depthProgram = glh.createShaderProgram(gl, kDepthVertexShader, kDepthFragmentShader);
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
          glh.createTexture(gl, self.depthMapWidth, self.depthMapHeight, /* data= */ null);
      const rb =
          glh.createRenderbuffer(gl, self.depthMapWidth, self.depthMapHeight);
      const fb =
          glh.createFramebuffer(gl, texture, rb);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      drawPass(self.depthPass);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return texture;
    };
    
    const shadowProgram = glh.createShaderProgram(gl, kShadowVertexShader, kShadowFragmentShader);
    self.shadowPass = {
      program: shadowProgram,
      positionLocation: gl.getAttribLocation(shadowProgram, "aPos"),
      cameraMvpLocation: gl.getUniformLocation(shadowProgram, "uCameraMVP"),
      lightMvpLocation: gl.getUniformLocation(shadowProgram, "uLightMVP"),
      depthMapLocation: gl.getUniformLocation(shadowProgram, "uDepthMap"),
      depthMapScaleLocation: gl.getUniformLocation(shadowProgram, "uDepthMapScale"),
      cubePositionBuffer: glh.createFloatVertexBuffer(gl, kCubePositions),
      floorPositionBuffer: glh.createFloatVertexBuffer(gl, kFloorPositions),
      cameraMvpMatrix: cameraMvpMatrix,
      lightMvpMatrix: lightMvpMatrix,
      depthMapTexture: null,
      depthMapScale: glm.vec2(1./self.depthMapWidth, 1./self.depthMapHeight),
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
    this.depthMapWidth = this.canvas.width;
    this.depthMapHeight = this.canvas.height;
    const gl = this.canvas.getContext("webgl2");
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