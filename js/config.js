requirejs.config({
  baseUrl: "js",
  paths: {
    glm: "https://git.io/glm-js.min",
    glh: "glh",
    jquery: "https://code.jquery.com/jquery-3.2.1.min",
  },
  shim: {
    glm: { exports: "glm" },
  },
});
