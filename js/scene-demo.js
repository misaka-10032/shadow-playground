const kVertexShader = `

attribute vec4 aPos;
uniform mat4 uMVP;

varying vec4 vRGBx;

void main() {
  gl_Position = uMVP * aPos;
  vRGBx = (aPos + vec4(1)) * .4 + .2;
}

`;

const kFragmentShader = `

precision mediump float;

varying vec4 vRGBx;

void main() {
  gl_FragColor = vec4(vRGBx.xyz, 1);
}

`;

define(["glm", "glh", "cube-scene"], function(glm, glh, scene) {
  return {
    onStart: onStart,
  };

  function initPass(canvas, gl) {
    const program = glh.createShaderProgram(gl, kVertexShader, kFragmentShader);
    const pass = {
      program: program,
      positionLocation: gl.getAttribLocation(program, "aPos"),
      cameraMvpLocation: gl.getUniformLocation(program, "uMVP"),
    };
    pass.draw = function() {
      scene.drawPass(canvas, pass);
    };
    return pass;
  }

  function onStart(config) {
    const canvas = document.querySelector("#".concat(config.canvasId));
    canvas.onresize = () => onResize();

    const gl = glh.getContext(canvas);
    gl.clearColor(0.8, 0.9, 0.8, 1);
    gl.clearDepth(1);
    gl.enable(gl.DEPTH_TEST);

    const pass = initPass(canvas, gl);
    pass.draw();
  }
  
  function onResize(canvas) {
    // no-op
  }
});