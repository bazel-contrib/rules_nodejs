# Angular Bazel Architect

This project was generated with [Angular CLI](https://github.com/angular/angular-cli)

This example showcases building and testing a project with the Angular CLI.
Instead of using the Angular CLI directly we use Architect here, which is the lower level api for the Angular CLI.

This requies one patch, which can be found under ./patches.
This patch adjusts how the architect-cli prints stdio so that when running under Bazel you don't lose your logs.

# Libs
This example demonstrates 2 different methods of adding a dependency to your angular project.  

### libs/ng-lib
This demonstrates building an angular library with the `ts_project` rule, however the key part here is that we replace `tsc` with `ngc`, since they're quite similar in API.
This allows us to compile an angular library in a minimal way.
We then use `pkg_npm` to give it a module name for the main application to import it with.

### libs/ts-lib
THis demonstrates building a pure TypeScript library using the `ts_project` rule.
We then use `pkg_npm` to give it a module name for the main application to import it with.