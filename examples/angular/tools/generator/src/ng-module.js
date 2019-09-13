const fs = require('fs');
const { Project, ts } = require('ts-morph');
const { FEATURES } = require('./feature-names');
const { humanize, routeLinkRegex } = require('./utils');

module.exports.updateNgModule = function updateNgModule(ngAppModulePath = 'src/app/app.module.ts') {
  // 0-setup
  const project = new Project();
  project.addExistingSourceFiles(ngAppModulePath);
  const importedFeautreModules = [];

  // 1-clean import statements in app.module.ts
  const ngAppModuleFile = project.getSourceFile(ngAppModulePath);
  ngAppModuleFile.getImportDeclarations().forEach(importDeclaration => {

    // get the import statment:
    // eg: import {LoggingModule} from './logging/logging.module';

    const imp = importDeclaration.print();
    FEATURES.forEach(feature => {
      if (imp.includes(feature.path)) {

        // we assume there is only one import, eg: {LoggingModule}
        // not many: {LoggingModule, BillingModule, UserModule}
        const moduleName = importDeclaration.getNamedImports().pop();
        importedFeautreModules.push(moduleName.print());
        importDeclaration.remove();
      }
    });

  });


  // 2-clean the @NgModule.imports array in app.module.ts
  const ngAppModuleClass = ngAppModuleFile.getClass('AppModule');
  const ngModuleDecorator = ngAppModuleClass.getDecorator('NgModule');
  const ngModuleDecoratorArgs = ngModuleDecorator.getArguments().pop();

  const cleanImportedFeatureModules = ngModuleDecoratorArgs.getProperty('imports').getDescendantsOfKind(ts.SyntaxKind.ArrayLiteralExpression).pop();
  importedFeautreModules.forEach(featureName => {
    cleanImportedFeatureModules.getElements().forEach(element => {
      if (featureName === element.getText()) {
        cleanImportedFeatureModules.removeElement(element);
      }
    });
  });

  console.log(`UPDATE ${ngAppModulePath}`);

  project.saveSync();
};

module.exports.removeRoutesFromNgModule = function removeRoutesFromNgModule(
    ngAppRoutingModulePath = 'src/app/app-routing.module.ts') {
  // 0-setup
  const project = new Project();
  project.addExistingSourceFiles(ngAppRoutingModulePath);

  // 1- clean the route statements in app-routing.module.ts
  const ngAppRoutingModuleFile = project.getSourceFile(ngAppRoutingModulePath);

  try {
    var routesArray = ngAppRoutingModuleFile.getVariableDeclaration('routes').getDescendantsOfKind(ts.SyntaxKind.ArrayLiteralExpression).pop();
  } catch (error) {
    console.error('ERROR', `couldn't find declaration 'routes' in '${ngAppRoutingModulePath}'.`);
    process.exit(1);
  }

  const featureRoutePaths = FEATURES.map(feature => feature.path);

  routesArray.getElements().forEach(route => {

    // route is:
    // {
    //  path: 'billing',
    //  pathMatch: 'full',
    //  loadChildren: () => import('./billing/billing.module.ngfactory').then(m => m.BillingModuleNgFactory)
    // }

    const path = route.getProperty('path').getInitializer().getLiteralValue();
    if (featureRoutePaths.includes(path)) {
      routesArray.removeElement(route);
    }

  });

  console.log(`UPDATE ${ngAppRoutingModulePath}`);

  project.saveSync();
};

module.exports.removeRoutesFromAppComponentHtml = function removeRoutesFromAppComponentHtml(
    file = 'src/app/app.component.html') {
  const appComponent = fs.readFileSync(file, { encoding: 'utf-8' });

  fs.writeFileSync(file, appComponent.replace(routeLinkRegex, ''));

  console.log(`UPDATE ${file}`);
};

module.exports.updateRoutesInNgModule = function updateRoutesInNgModule(
    ngAppRoutingModulePath = 'src/app/app-routing.module.ts', {routes}) {
  // 0-setup
  const project = new Project();
  project.addExistingSourceFiles(ngAppRoutingModulePath);

  // 1- add route statements in app-routing.module.ts
  const ngAppRoutingModuleFile = project.getSourceFile(ngAppRoutingModulePath);

  try {
    var routesArray = ngAppRoutingModuleFile.getVariableDeclaration('routes').getDescendantsOfKind(ts.SyntaxKind.ArrayLiteralExpression).pop();
  } catch (error) {
    console.error('ERROR', `couldn't find declaration 'routes' in '${ngAppRoutingModulePath}'.`);
    process.exit(1);
  }

  routes.forEach(route => {
    // write a route definition, eg:
    // {
    //  path: '${route}',
    //  pathMatch: 'full',
    //  loadChildren: () =>
    //      import('./${route}/${route}.module.ngfactory').then(m => m.HelloWorldModuleNgFactory)
    // }

    if (routesArray.print().includes(route)) {
      console.log(`SKIP ${ngAppRoutingModulePath} (${route})`);
    }
    else {
      routesArray.addElement(writer =>
        writer.writeLine('{')
          .writeLine(`path: '${route}',`)
          .writeLine(`pathMatch: 'full',`)
          .writeLine(`loadChildren: () => import('./${route}/${route}.module.ngfactory').then(m => m.${humanize(route, true)}ModuleNgFactory)`)
          .writeLine('}')
      );
    }
  });

  console.log(`UPDATE ${ngAppRoutingModulePath}`);
  project.saveSync();
};

module.exports.updateRoutesInFeatureModule = function updateRoutesInFeatureModule(file) {
  const originalFeatureModuleContent =
    fs.readFileSync(file, { encoding: 'utf-8' });

  if (originalFeatureModuleContent.includes('RouterModule')) {
    console.log(`SKIP ${file} (RouterModule)`);
    return true;
  }

  fs.writeFileSync(
    file,
    originalFeatureModuleContent
      .replace('CommonModule,', `CommonModule,
RouterModule.forChild([{path: '', component: IndexComponent}]),`)
      .replace(
        `from '@angular/common';`,
        `from '@angular/common';\nimport { RouterModule } from '@angular/router';`));
};


module.exports.updateRoutesInAppComponentHtml = function updateRoutesInAppComponentHtml(
    file = 'src/app/app.component.html', {features}) {
  let appComponent =
    fs.readFileSync(file, { encoding: 'utf-8' });

  const linkTemplate = (feature) => `  <a mat-list-item routerLink="/${feature.path}"><mat-icon>${feature.icon}</mat-icon> ${humanize(feature.path)} </a>`;

  features.forEach(feature => {
    if (!appComponent.includes(`routerLink="/${feature.path}"`)) {
      appComponent = appComponent.replace('</mat-nav-list>', `${linkTemplate(feature)}\n    </mat-nav-list>`);
    }
  });

  fs.writeFileSync(file, appComponent);

  console.log(`UPDATE ${file}`);
};

module.exports.updateNgModuleWithExtraDeps = function updateNgModuleWithExtraDeps(
    featureNgModule, {className}) {
  // 0-setup
  const project = new Project();
  project.addExistingSourceFiles(featureNgModule);

  // 1- add extra imports required by this module
  // eg: import { MaterialModule } from '../../../shared/material/material.module';
  const featureNgModuleFile = project.getSourceFile(featureNgModule);

  if (featureNgModuleFile.print().includes('MaterialModule')) {
    console.log(`SKIP ${featureNgModule} (${className})`);
    return true;
  }

  featureNgModuleFile.addImportDeclarations([{
    defaultImport: '{ ReactiveFormsModule }',
    moduleSpecifier: '@angular/forms'
  }, {
    defaultImport: '{ MaterialModule }',
    // TODO(manekinekko): use TS path aliases
    moduleSpecifier: '../../../shared/material/material.module'
  }]);

  // 2-add MaterialModule to @NgModule.imports
  const ngAppModuleClass = featureNgModuleFile.getClass(className);
  const ngModuleDecorator = ngAppModuleClass.getDecorator('NgModule');
  const ngModuleDecoratorArgs = ngModuleDecorator.getArguments().pop();
  const importedModules = ngModuleDecoratorArgs.getProperty('imports').getDescendantsOfKind(ts.SyntaxKind.ArrayLiteralExpression).pop();
  importedModules.addElements(['ReactiveFormsModule', 'MaterialModule']);

  console.log(`UPDATE ${featureNgModule}`);

  project.saveSync();
};