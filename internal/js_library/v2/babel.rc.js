var amd_plugin = require('@babel/plugin-transform-modules-amd')

module.exports = {
  'moduleIds': true,
  getModuleId(name) {
    const path = require("path");
    const process = require("process");
    return path.relative(process.cwd(), name)
  },

  'plugins': [
    // Note: For some reason this plugin can not be properly loaded from node_modules so have to
    // load relatively
    [
      // bazel_resolve_plugin,
      amd_plugin, {'strict': true, 'noInterop': true}
    ]
  ]
};
