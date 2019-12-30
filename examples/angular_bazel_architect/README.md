# Angular Bazel Architect

This project was generated with [Angular CLI](https://github.com/angular/angular-cli)

This example showcases building and testing a project with the Angular CLI.
Instead of using the Angular CLI directly we use Architect here, which is the lower level api for the Angular CLI.

This requies one patch, which can be found under ./patches.
This patch adjusts how the architect-cli prints stdio so that when running under Bazel you don't lose your logs.