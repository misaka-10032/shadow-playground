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
  gl_Position = uCameraMVP * pos;
  vRGBx = (pos + vec4(1)) * .4 + .2;
  vLightCoord = kBias * uLightMVP * pos;
}

`;

const kShadowFragmentShader = `

precision mediump float;

const float kEps = 5e-3;

uniform sampler2D uDepthMap;
varying vec4 vRGBx;
varying vec4 vLightCoord;

void main() {
  vec4 lightCoord = vLightCoord / vLightCoord.w;
  float fragmentLightDist = lightCoord.z;
  float occluderLightDist = texture2D(uDepthMap, lightCoord.xy).z;
  float visibility =
      fragmentLightDist > occluderLightDist + kEps ?
      0.5 : 1.;
  gl_FragColor = vec4(visibility, 0, 0, 1);
}

`;

define(["glm", "glh", "cube-scene"], function(glm, glh, scene) {
  return {
    onStart: onStart,
  };

  function initDepthPass(canvas, gl) {
    const depthProgram = glh.createShaderProgram(gl, kDepthVertexShader, kDepthFragmentShader);
    const depthPass = {
      program: depthProgram,
      positionLocation: gl.getAttribLocation(depthProgram, "aPos"),
      lightMvpLocation: gl.getUniformLocation(depthProgram, "uLightMVP"),
    };
    depthPass.draw = function(width, height) {
      if (width == null && height == null) {
        scene.drawPass(canvas, depthPass);
        return;
      }
      const texture =
          glh.createTexture(gl, width, height, /* data= */ null);
      const rb =
          glh.createRenderbuffer(gl, width, height);
      const fb =
          glh.createFramebuffer(gl, texture, rb);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      scene.drawPass(canvas, depthPass);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return {
        texture: texture,
        width: width,
        height: height,
      };
    };
    return depthPass;
  }

  function initShadowPass(canvas, gl) {
    const shadowProgram = glh.createShaderProgram(gl, kShadowVertexShader, kShadowFragmentShader);
    const shadowPass = {
      program: shadowProgram,
      positionLocation: gl.getAttribLocation(shadowProgram, "aPos"),
      cameraMvpLocation: gl.getUniformLocation(shadowProgram, "uCameraMVP"),
      lightMvpLocation: gl.getUniformLocation(shadowProgram, "uLightMVP"),
      depthMapLocation: gl.getUniformLocation(shadowProgram, "uDepthMap"),
      depthMapScaleLocation: gl.getUniformLocation(shadowProgram, "uDepthMapScale"),
    };
    shadowPass.draw = function(textureWrapper) {
      shadowPass.depthMapTexture = textureWrapper.texture;
      shadowPass.depthMapWidth = textureWrapper.width;
      shadowPass.depthMapHeight = textureWrapper.height;
      scene.drawPass(canvas, shadowPass);
    };
    return shadowPass;
  }
  
  function onStart(config) {
    const canvas = document.querySelector("#".concat(config.canvasId));
    canvas.onresize = () => onResize();

    const gl = glh.getContext(canvas);
    gl.clearColor(0.8, 0.9, 0.8, 1);
    gl.clearDepth(1);
    gl.enable(gl.DEPTH_TEST);

    const depthPass = initDepthPass(canvas, gl);
    const shadowPass = initShadowPass(canvas, gl);

    const textureWrapper = depthPass.draw(canvas.width, canvas.height);
    shadowPass.draw(textureWrapper);
  }
  
  function onResize() {
    // no-op
  }
});