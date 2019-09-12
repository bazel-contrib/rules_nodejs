[![CircleCI](https://circleci.com/gh/angular/angular-bazel-example.svg?style=svg)](https://circleci.com/gh/angular/angular-bazel-example)

# Example Angular monorepo using Bazel

**This is experimental, as part of Angular Labs! There may be breaking changes.**

This is part of the ABC project. The overall goal is to make it possible to
develop Angular applications the same way we do at Google.

Learn more about Bazel and Angular at https://bazel.angular.io

This example is deployed at https://bazel.angular.io/example

## Guide to the example

This example is a monorepo, meant to show many different features and integrations that we expect are generally useful for enterprise use cases.

- **Angular CLI**: you can use the `ng` command to run build, serve, test, and e2e
- **Angular Libraries**: to maximize build incrementality, each Angular module is compiled as a separate step. This lets us re-use Angular libraries without having to publish them as npm packages. See `src/todos` for a typical `NgModule` compiled as a library for use in the application, using the `ng_module` rule in the `BUILD.bazel` file.
- **TypeScript Libraries**: see `src/lib` for a trivial example of a pure-TS library that's consumed in the application, using the `ts_library` rule in the `BUILD.bazel` file.
- **Sass**: we use Sass for all styling. Angular components import Sass files, and these are built by Bazel as independent processes calling the modern Sass compiler (written in Dart).
- **Material design**: see `src/material` where we collect the material modules we use.
- **Redux-style state management**: see `src/reducers` where we use the [NgRx Store](https://ngrx.io/guide/store).
- **Lazy loading**: in production mode, the application is served in chunks. Run `ng serve --prod`
- **Differential loading**: in production mode, we load a pair of `<script>` tags. Modern browsers will load code in the ES2015 syntax, which is smaller and requires fewer polyfills. Older browsers will load ES5 syntax.
- **Docker**: see below where we package up the production app for deployment on Kubernetes.

## Installation

You only need to install one build tool, and which one you choose typically depends on what kind of development you do most often.

If you're a frontend developer, you should install NodeJS and yarn.
The `package.json` file has an `engines` section which indicates the range of NodeJS and yarn versions that you could use.
You simply run `yarn` commands shown below, and don't need to install Bazel or any other dependencies.

If you're a full-stack developer, you might be using Bazel for your backend already.
In this case, you should install Bazel following instructions at http://bazel.build.
Also install `ibazel`, which is a watch mode for Bazel not included in the standard distribution. See https://github.com/bazelbuild/bazel-watcher#installation.
The `WORKSPACE` file has a `check_bazel_version` call which will print an error if your Bazel version is not in the supported range.
You simply run `bazel` commands shown below, and don't need to install NodeJS, yarn, or any other dependencies.

## Development

First we'll run the development server:

```bash
$ ng serve
# or
$ ibazel run //src:devserver
```

This runs in "watch mode", which means it will watch any files that are inputs to the devserver, and when they change it will ask Bazel to re-build them.
When the re-build is finished, it will trigger a LiveReload in the browser.

This command prints a URL on the terminal. Open that page to see the demo app
running. Now you can edit one of the source files (`src/lib/file.ts` is an easy
one to understand and see the effect). As soon as you save a change, the app
should refresh in the browser with the new content. Our intent is that this time
is less than two seconds, even for a large application.

Control-C twice to kill the devserver.

## Testing

We can also run all the unit tests:

```bash
$ ng test
# or
$ bazel test //src/...
```

Or run the end-to-end tests:

```bash
$ ng e2e
# or
$ bazel test //e2e/...
```

In this example, there is a unit test for the `hello-world` component which uses
the `ts_web_test_suite` rule. There are also protractor e2e tests for both the
`prodserver` and `devserver` which use the `protractor_web_test_suite` rule.

Note that Bazel will only re-run the tests whose inputs changed since the last run.

## Production

We can run the application in production mode, where the code has been bundled
and optimized. This can be slower than the development mode, because any change
requires re-optimizing the app. This example uses Rollup and Uglify, but other
bundlers can be integrated with Bazel.

```bash
$ ng serve --prod
# or
$ bazel run //src:prodserver
```

### Code splitting

The production bundle is code split and routes such as `/` and `/todos`
are lazy loaded. Code splitting is handled by the rollup_bundle rule
which now supports the new code splitting feature in rollup.

Note: code splitting is _not_ supported in development mode yet so the
`//src:devserver` target does not serve a code split bundle. The dynamic
`import()` statements will resolve to modules that are served in the initial
JS payload.

## Npm dependencies

Having a local `node_modules` folder setup by `yarn` or `npm` is not
necessary when building this example with Bazel. This example makes use
of Bazel managed npm dependencies (https://github.com/bazelbuild/rules_nodejs#using-bazel-managed-dependencies)
which means Bazel will setup the npm dependencies in your `package.json` for you
outside of your local workspace for use in the build.

However, you may still want to run `yarn` or `npm` to manually
setup a local `node_modules` folder for editor and tooling support.

## Deployment

### Firebase

We use the standard firebase deploy command.

Run `yarn deploy` to release changes to bazel.angular.io.

### Kubernetes Engine
We use Bazel's docker support to package up our production server for deployment.
Each time the app changes, we'll get a slim new docker layer with just the modified files, keeping the round-trip for deployment incremental and fast.
This example is configured to run on Google Kubernetes Engine, so we can have an elastic pool of backend machines behind a load balancer.
This setup is more expensive to operate than something like Firebase Functions where the backend code is spun up on-demand, but is also more adaptable to scenarios like backend servers that need to run other binaries on the machine.

The application is currently live at http://35.197.115.230/

To run it under docker:

```
$ bazel run src:nodejs_image -- --norun
$ docker run --rm -p 8080:8080 bazel/src:nodejs_image
```

Deploy to production:

1. Install gcloud and kubectl
1. Authenticate to the Google Container Registry
    `gcloud auth configure-docker`
1. Authenticate to Kubernetes Engine
    `gcloud container clusters get-credentials angular-bazel-example --zone=us-west1-a`
1. For the first deployment: `bazel run :deploy.create`
1. To update: `bazel run :deploy.replace`

Tips:

```
# Run the binary without docker
$ bazel run src:nodejs_image.binary
 # What's in the image?
$ bazel build src:nodejs_image && file-roller dist/bin/src/nodejs_image-layer.tar
 # Tear down all running docker containers
$ docker rm -f $(docker ps -aq)
 # Hop into the running image on kubernetes
$ kubectl exec angular-bazel-example-prod-3285254973-ncv3g  -it -- /bin/bash
```
