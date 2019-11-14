module.exports = api => ({
  presets: api.env("test")
    ? ["@babel/preset-flow"]
    : [["@babel/preset-env", { loose: true }], "@babel/preset-flow"]
});
