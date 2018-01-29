define(["glm", "glh"], function(glm, glh) {

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

  const kFloorPositions = [
    -4, -1.2, -4,
    +4, -1.2, -4,
    +4, -1.0, -4,
    -4, -1.0, -4,
    -4, -1.2, +4,
    +4, -1.2, +4,
    +4, -1.0, +4,
    -4, -1.0, +4,
  ];
  const kFloorPositionDim = 3;

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

  function initScene(canvas) {
    const aspectRatio = canvas.width / canvas.height;

    const modelCenter = glm.vec3(0, 0, 18);
    const modelMatrix =
        glm.rotate(
            glm.rotate(
                glm.translate(glm.mat4(1), modelCenter),
                /* angle= */ glm.radians(20),
                /* axis= */ glm.vec3(-1, 0, 0)),
            /* angle= */ glm.radians(20),
            /* axis= */ glm.vec3(0, -1, 0));

    const cameraViewMatrix =
        glm.lookAt(
            /* eye= */ glm.vec3(0, 0, 0), modelCenter,
            /* up= */ glm.vec3(0, 1, 0));
    const cameraProjMatrix =
        glm.perspective(
            /* fovy= */ glm.radians(30), aspectRatio,
            /* zNear= */ 10, /* zFar= */ 30);
    const cameraMvpMatrix =
        cameraProjMatrix['*'](cameraViewMatrix['*'](modelMatrix));

    const lightViewMatrix =
        glm.lookAt(
            /* eye= */ glm.vec3(0, 10, 30), modelCenter,
            /* up= */ glm.vec3(0, 1, 0));
    const lightProjMatrix =
        glm.perspective(
            /* fovy= */ glm.radians(30), aspectRatio,
            /* zNear= */ 10, /* zFar= */ 30);
    const lightMvpMatrix =
        lightProjMatrix['*'](lightViewMatrix['*'](modelMatrix));

    return {
      cameraMvpMatrix: cameraMvpMatrix,
      lightMvpMatrix: lightMvpMatrix,
    }
  }

  /**
   * @param canvas
   * @param pass
   *   program
   *   positionLocation
   *   cameraMvpLocation
   *   lightMvpLocation
   *   depthMapLocation
   *   depthMapScaleLocation
   *   depthMapTexture
   *   depthMapScale
   */
  function drawPass(canvas, pass) {
    const scene = initScene(canvas);
    const gl = glh.getContext(canvas);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(pass.program);
    gl.enableVertexAttribArray(pass.positionLocation);

    // Bind optional parameters.
    if (pass.cameraMvpLocation != null) {
      gl.uniformMatrix4fv(
          pass.cameraMvpLocation, /* transpose= */ false, scene.cameraMvpMatrix.elements);
    }
    if (pass.lightMvpLocation != null) {
      gl.uniformMatrix4fv(
          pass.lightMvpLocation, /* transpose= */ false, scene.lightMvpMatrix.elements);
    }
    if (pass.depthMapLocation != null) {
      const textureUnit = 0;
      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(gl.TEXTURE_2D, pass.depthMapTexture);
      gl.uniform1i(pass.depthMapLocation, textureUnit);
    }
    if (pass.depthMapScaleLocation != null) {
      gl.uniform2fv(pass.depthMapScaleLocation, pass.depthMapScale.elements);
    }

    // Both objects share the same index buffer.
    const indexBuffer = glh.createShortIndexBuffer(gl, kCubeIndices);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // Draw floor.
    const floorPositionBuffer = glh.createFloatVertexBuffer(gl, kFloorPositions);
    gl.bindBuffer(gl.ARRAY_BUFFER, floorPositionBuffer);
    gl.vertexAttribPointer(
        pass.positionLocation, kFloorPositionDim, gl.FLOAT, /* normalize= */ false,
        kDefaultStride, kDefaultOffset);
    gl.drawElements(gl.TRIANGLES, kCubeIndexCount, gl.UNSIGNED_SHORT, kDefaultOffset);

    // Draw cube.
    const cubePositionBuffer = glh.createFloatVertexBuffer(gl, kCubePositions);
    gl.bindBuffer(gl.ARRAY_BUFFER, cubePositionBuffer);
    gl.vertexAttribPointer(
        pass.positionLocation, kCubePositionDim, gl.FLOAT, /* normalize= */ false,
        kDefaultStride, kDefaultOffset);
    gl.drawElements(gl.TRIANGLES, kCubeIndexCount, gl.UNSIGNED_SHORT, kDefaultOffset);

    // Reset.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    if (pass.depthMapLocation != null) {
      const textureUnit = 0;
      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
    gl.disableVertexAttribArray(pass.positionLocation);
    gl.useProgram(null);
  }

  return {
    drawPass: drawPass,
  };
});