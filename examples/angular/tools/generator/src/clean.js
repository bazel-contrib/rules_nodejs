const rimraf = require('rimraf');
const { FEATURES } = require('./feature-names');
const { updateNgModule, removeRoutesFromNgModule, removeRoutesFromAppComponentHtml } = require('./ng-module');

module.exports = function() {
  FEATURES.map(feature => `src/app/${feature.path}`).forEach(featPath => {
    console.log(`DELETE ${featPath}`);
    rimraf.sync(featPath);
  });

  updateNgModule('src/app/app.module.ts');
  removeRoutesFromNgModule('src/app/app-routing.module.ts');
  removeRoutesFromAppComponentHtml('src/app/app.component.html');
}