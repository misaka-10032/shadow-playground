const kDepthVertexShader = `

attribute vec4 aPos;
uniform mat4 uLightMVP;

void main() {
  gl_Position = uLightMVP * aPos;
}

`;

const kDepthFragmentShader = `

precision mediump float;

void main() {
  gl_FragColor = vec4(gl_FragCoord.zzz, 1);
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
    depthPass.draw = function() {
      scene.drawPass(canvas, depthPass);
    };
    return depthPass;
  }
  
  function onStart(config) {
    const canvas = document.querySelector("#".concat(config.canvasId));
    canvas.onresize = () => onResize();

    const gl = glh.getContext(canvas);
    gl.clearColor(0.8, 0.9, 0.8, 1);
    gl.clearDepth(1);
    gl.enable(gl.DEPTH_TEST);

    const depthPass = initDepthPass(canvas, gl);
    depthPass.draw();
  }
  
  function onResize(canvas) {
    // no-op
  }
});