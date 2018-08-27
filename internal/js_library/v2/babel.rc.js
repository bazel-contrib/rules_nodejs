var env_preset = require('@babel/preset-env')

const babelConfig = {
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
  presets: [[env_preset, {modules: 'umd'}]],
};

module.exports = babelConfig;
