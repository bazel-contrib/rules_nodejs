/**
 * Generate lots of "feature" code to bulk out this example to a given size.
 * By default we generate 40 components and check that in.
 * You can generate more by passing arguments, for example
 * yarn generate 10 10
 * will make 1000 components total: for each of the ten "features", it will have 10 modules, each
 * has 10 components.
 */
const { ng, ngFromTemplate } = require('./ng');
const { writeModuleBuildFile, writeFeatureModuleBuildFile } = require('./build-file');
const { referenceComponents } = require('./reference-components');
const { updateNgModuleWithExtraDeps, updateRoutesInFeatureModule } = require('./ng-module');

let globalCmpIdx = 0;

module.exports.makeFeatureModule = function makeFeatureModule(argv) {
    return function (feature) {
        const modulesPerFeature = argv[2] || 2;
        const componentsPerModule = argv[3] || 2;

        console.log('INFO  ', `Feature: ${feature.path}, Modules: ${modulesPerFeature}, Components: ${componentsPerModule}`);

        ng('generate', 'module', feature.path, '--module', 'app');
        ng('generate', 'component', `${feature.path}/index`, '--module', `${feature.path}`, '--inlineStyle=true');

        const featureModuleDeps = [];
        const featureRootModuleDeps = [];
        const selectorAcc = [];

        for (let modIdx = 0; modIdx < modulesPerFeature; modIdx++) {
            ng('generate', 'module', `${feature.path}/module${modIdx}`, '--module', feature.path);

            featureRootModuleDeps.push(`//src/app/${feature.path}`);
            featureModuleDeps.push(`//src/app/${feature.path}/module${modIdx}`);
            const tsFileAcc = [];
            const scssFileAcc = [];
            const htmlFileAcc = [];

            for (let cmpIdx = 0; cmpIdx < componentsPerModule; cmpIdx++) {
                ngFromTemplate('generate', 'component', `${feature.path}/module${modIdx}/cmp${globalCmpIdx}`, '--module',
                    `${feature.path}/module${modIdx}`, '--export=true', { componentName: `cmp${globalCmpIdx}`, featureName: feature.path});

                tsFileAcc.push(`cmp${globalCmpIdx}/cmp${globalCmpIdx}.component.ts`);
                scssFileAcc.push(`cmp${globalCmpIdx}/cmp${globalCmpIdx}.component.scss`);
                htmlFileAcc.push(`cmp${globalCmpIdx}/cmp${globalCmpIdx}.component.html`);
                selectorAcc.push(`app-cmp${globalCmpIdx}`);
                globalCmpIdx++;
            }

            // Write a BUILD file to build the module
            writeModuleBuildFile(`src/app/${feature.path}/module${modIdx}/BUILD.bazel`, { modIdx, scssFileAcc, tsFileAcc, htmlFileAcc });

            // Update feature modules with extra dependencies ie, MaterialModule, FormsModule...
            updateNgModuleWithExtraDeps(`src/app/${feature.path}/module${modIdx}/module${modIdx}.module.ts`, {
                className: `Module${modIdx}Module`
            });
        }

        // Reference all the component selectors in the feature module's index component
        referenceComponents(`src/app/${feature.path}/index/index.component.html`, { selectorAcc });

        // Wire up routing for the feature module
        updateRoutesInFeatureModule(`src/app/${feature.path}/${feature.path}.module.ts`);

        // Write a BUILD file to build the feature module
        writeFeatureModuleBuildFile(`src/app/${feature.path}/BUILD.bazel`, { name: feature.path, featureModuleDeps });
    }
}