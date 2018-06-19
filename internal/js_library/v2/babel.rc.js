var amd_plugin = require('@babel/plugin-transform-modules-amd')

module.exports = {
  'moduleIds': true,
  getModuleId(name) {
    const path = require("path");
    const process = require("process");
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
  'plugins': [amd_plugin]
};
