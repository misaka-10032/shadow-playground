define(["glm", "glh"], function(glm, glh) {

  const kDefaultStride = 0;
  const kDefaultOffset = 0;

  const kCornerPositions = [
    -1, -1,
    +1, -1,
    +1, +1,
    -1, +1,
  ];
  const kCornerPositionDim = 2;

  const kCornerTexCoords = [
    0, 0,
    1, 0,
    1, 1,
    0, 1,
  ];
  const kCornerTexCoordDim = 2;

  const kCornerIndices = [
    0, 1, 2,
    0, 2, 3,
  ];
  const kCornerIndexCount = kCornerIndices.length;

  /**
   * @param canvas
   * @param pass
   *   program
   *   positionLocation
   *   texCoordLocation
   *   textureLocation
   *   textureScaleLocation
   *   texture
   *   textureScale
   */
  function drawPass(canvas, pass) {
    const gl = glh.getContext(canvas);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(pass.program);

    // Bind required parameters.
    gl.enableVertexAttribArray(pass.positionLocation);
    const cornerPositionBuffer = glh.createFloatVertexBuffer(gl, kCornerPositions);
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerPositionBuffer);
    gl.vertexAttribPointer(
        pass.positionLocation, kCornerPositionDim, gl.FLOAT, /* normalize= */ false,
        kDefaultStride, kDefaultOffset);

    // Bind optional parameters.
    if (pass.texCoordLocation != null) {
      const texCoordBuffer = glh.createFloatVertexBuffer(gl, kCornerTexCoords);
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.enableVertexAttribArray(pass.texCoordLocation);
      gl.vertexAttribPointer(
          pass.texCoordLocation, kCornerTexCoordDim, gl.FLOAT, /* normalize= */ false,
          kDefaultStride, kDefaultOffset);
    }
    if (pass.textureLocation != null) {
      const textureUnit = 0;
      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(gl.TEXTURE_2D, pass.texture);
      gl.uniform1i(pass.textureLocation, textureUnit);
    }
    if (pass.textureScaleLocation != null) {
      gl.uniform2fv(pass.textureScaleLocation, pass.textureScale.elements);
    }

    const cornerIndexBuffer = glh.createShortIndexBuffer(gl, kCornerIndices);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cornerIndexBuffer);
    gl.drawElements(gl.TRIANGLES, kCornerIndexCount, gl.UNSIGNED_SHORT, kDefaultOffset);

    // Reset.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    if (pass.textureLocation != null) {
      const textureUnit = 0;
      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
    if (pass.texCoordLocation != null) {
      gl.disableVertexAttribArray(pass.texCoordLocation);
    }
    gl.disableVertexAttribArray(pass.positionLocation);
    gl.useProgram(null);
  }

  return {
    drawPass: drawPass,
  };
});