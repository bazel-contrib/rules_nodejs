module.exports = {
  "moduleIds": true,
  getModuleId (name) {
    const path = require("path");
    const process = require("process");
    return path.relative(process.cwd(), name)
  },
  "plugins": [
    // Note: For some reason this plugin can not be properly loaded from node_modules so have to load relatively
    ["../../../../../external/build_bazel_rules_nodejs_js_library_deps/node_modules/@babel/plugin-transform-modules-amd", {
      "strict": true,
      "noInterop": true
    }]
  ]
};
