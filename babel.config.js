module.exports = api => ({
  presets: api.env("test")
    ? ["@babel/preset-flow"]
    : [["@babel/preset-env", { loose: true, targets: { node: '12.8.0' }  }], "@babel/preset-flow"]
});
