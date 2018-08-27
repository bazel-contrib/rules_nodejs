var amd_plugin = require('@babel/plugin-transform-modules-amd')
var env_preset = require('@babel/preset-env')

const babelConfig = {};

if (process.env.BAZEL_ES5_TARGET) {
  babelConfig.presets = [env_preset];
}

if (process.env.BAZEL_AMD_TARGET) {
  const amdConfig = {
    moduleIds: true,
    getModuleId(name) {
      const moduleName = 'TMPL_module_name';
      if (moduleName) {
        return moduleName;
      }

      const path = require('path');
      const process = require('process');
      const binDirPath = 'TMPL_bin_dir_path';
      // TODO: Add workspace name to the id
      moduleId = path.relative(process.cwd(), name);
      if (moduleId.startsWith(binDirPath)) {
        // For generated files we take out the bin dir path
        return moduleId.slice(binDirPath.length + 1);
      } else {
        return moduleId
      }
    },
    plugins: [amd_plugin],
  };
  Object.assign(babelConfig, amdConfig);
}

module.exports = babelConfig;
