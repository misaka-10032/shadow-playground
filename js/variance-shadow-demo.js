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
  fragColor = vec4(z*z*z*z, z*z*z, z*z, z);
}

`;

const kConvVertexShader = `#version 300 es

in vec2 aPos;
in vec2 aTexCoord;
out vec2 vTexCoord;

void main() {
  gl_Position = vec4(aPos, 0, 1);
  vTexCoord = aTexCoord;
}

`;

const kConvFragmentShader = `#version 300 es

precision mediump float;

const float[] kWeights = float[](
  0.045, 0.122, 0.045,
  0.122, 0.332, 0.122,
  0.045, 0.122, 0.045);

uniform sampler2D uTexture;
uniform vec2 uTextureScale;
in vec2 vTexCoord;
out vec4 fragColor;

void main() {
  int i = 0;
  float x, y;
  vec4 sum = vec4(0, 0, 0, 0);    
  for (y = -1.; y <= 1.; y += 1.) {
    for (x = -1.; x <= 1.; x += 1., i++) {
      vec4 textureSample =
          texture(uTexture, vTexCoord + uTextureScale * vec2(x, y));
      sum += kWeights[i] * textureSample;
    }
  }
  fragColor = sum;
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
out vec4 vLightCoord;

void main() {
  vec4 pos = vec4(aPos, 1);
  gl_Position = uCameraMVP * pos;
  vLightCoord = kBias * uLightMVP * pos;
}

`;

const kShadowFragmentShader = `#version 300 es

precision mediump float;

uniform sampler2D uDepthMap;
in vec4 vLightCoord;
out vec4 fragColor;

void main() {
  vec4 lightCoord = vLightCoord / vLightCoord.w;
  float fragLightDist = lightCoord.z;
  vec4 depthMapSample = texture(uDepthMap, lightCoord.xy);
  float mu = depthMapSample.w;
  float mu2 = mu * mu;
  float sigma2 = clamp(depthMapSample.z - mu2, 1e-4, 1e4);
  float fragOccluderDist = fragLightDist - mu;
  float fragOccluderDist2 = fragOccluderDist * fragOccluderDist;
  float visibility = sigma2 / (sigma2 + fragOccluderDist2);
  fragColor = vec4(.5 + .5 * visibility, 0, 0, 1);
}

`;

define(["glm", "glh", "cube-scene", "paper-scene"], function(glm, glh, cubeScene, paperScene) {
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
        gl.viewport(0, 0, canvas.width, canvas.height);
        cubeScene.drawPass(canvas, depthPass);
        return;
      }

      const texture =
          glh.createTexture(gl, width, height, /* data= */ null);
      const renderbuffer =
          glh.createRenderbuffer(gl, width, height);
      const framebuffer =
          glh.createFramebuffer(gl, texture, renderbuffer);

      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.viewport(0, 0, width, height);
      cubeScene.drawPass(canvas, depthPass);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      return {
        texture: texture,
        width: width,
        height: height,
      };
    };

    return depthPass;
  }

  function initConvPass(canvas, gl) {
    const convProgram = glh.createShaderProgram(gl, kConvVertexShader, kConvFragmentShader);
    const convPass = {
      program: convProgram,
      positionLocation: gl.getAttribLocation(convProgram, "aPos"),
      texCoordLocation: gl.getAttribLocation(convProgram, "aTexCoord"),
      textureLocation: gl.getUniformLocation(convProgram, "uTexture"),
      textureScaleLocation: gl.getUniformLocation(convProgram, "uTextureScale"),
    };
    convPass.draw = function(textureWrapper, debug) {
      convPass.texture = textureWrapper.texture;
      convPass.textureScale = glm.vec2(1./textureWrapper.width, 1./textureWrapper.height);

      if (debug === true) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        paperScene.drawPass(canvas, convPass);
        return;
      }

      const texture =
          glh.createTexture(gl, textureWrapper.width, textureWrapper.height, /* data= */ null);
      const renderbuffer =
          glh.createRenderbuffer(gl, textureWrapper.width, textureWrapper.height);
      const framebuffer =
          glh.createFramebuffer(gl, texture, renderbuffer);

      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.viewport(0, 0, textureWrapper.width, textureWrapper.height);
      paperScene.drawPass(canvas, convPass);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.bindTexture(gl.TEXTURE_2D, null);

      return texture;
    };

    return convPass;
  }

  function initShadowPass(canvas, gl) {
    const shadowProgram = glh.createShaderProgram(gl, kShadowVertexShader, kShadowFragmentShader);
    const shadowPass = {
      program: shadowProgram,
      positionLocation: gl.getAttribLocation(shadowProgram, "aPos"),
      cameraMvpLocation: gl.getUniformLocation(shadowProgram, "uCameraMVP"),
      lightMvpLocation: gl.getUniformLocation(shadowProgram, "uLightMVP"),
      depthMapLocation: gl.getUniformLocation(shadowProgram, "uDepthMap"),
    };
    shadowPass.draw = function(texture) {
      shadowPass.depthMapTexture = texture;
      gl.viewport(0, 0, canvas.width, canvas.height);
      cubeScene.drawPass(canvas, shadowPass);
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
    const convPass = initConvPass(canvas, gl);
    const shadowPass = initShadowPass(canvas, gl);

    const textureWrapper = depthPass.draw(canvas.width * 2, canvas.height * 2);
    const texture = convPass.draw(textureWrapper);
    shadowPass.draw(texture);
  }
  
  function onResize() {
    // no-op
  }
});