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
  float z = gl_FragCoord.z;
  fragColor = vec4(z*z*z, z*z, z, 1);
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
const float kWeight = 1./16.;

uniform sampler2D uDepthMap;
uniform vec2 uDepthMapScale;
in vec4 vRGBx;
in vec4 vLightCoord;
out vec4 fragColor;

void main() {
  vec4 lightCoord = vLightCoord / vLightCoord.w;
  float fragLightDist = lightCoord.z;
  float x, y, mu = 0., sigma2 = 0.;
  // TODO: Convolution could be pre-computed.
  for (y = -1.5; y <= 1.5; y += 1.) {
    for (x = -1.5; x <= 1.5; x += 1.) {
      vec4 occluderSample =
          texture(uDepthMap, lightCoord.xy + uDepthMapScale * vec2(x, y));
      mu += kWeight * occluderSample.z;
      sigma2 += kWeight * occluderSample.y;
    }
  }
  sigma2 = clamp(sigma2 - mu * mu, 1e-4, 1e4);
  float fragOccluderDist = fragLightDist - mu;
  float visibility = sigma2 / (sigma2 + fragOccluderDist * fragOccluderDist);
  fragColor = vec4(.5 + .5 * visibility, 0, 0, 1);
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