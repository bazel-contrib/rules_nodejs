
const { makeFeatureModule } = require('./create-feature-module');
const { updateRoutesInAppComponentHtml, updateRoutesInNgModule } = require('./ng-module');
const { FEATURES } = require('./feature-names');

module.exports = function(argv) {
  // Create all feature modules and update BUILD files
  FEATURES.forEach(makeFeatureModule(argv));

  // Update routing module with routes definition
  updateRoutesInNgModule(
      `src/app/app-routing.module.ts`, {routes: FEATURES.map(_feature => _feature.path)});

  // Update src/app/app.component.html with links to the new generated modules
  updateRoutesInAppComponentHtml('src/app/app.component.html', {features: FEATURES});
}