# NodeJS rules for Bazel


Circle CI | Bazel CI
:---: | :---:
[![CircleCI](https://circleci.com/gh/bazelbuild/rules_nodejs.svg?style=svg)](https://circleci.com/gh/bazelbuild/rules_nodejs) | [![Build status](https://badge.buildkite.com/af1a592b39b11923ef0f523cbb223dd3dbd61629f8bc813c07.svg?branch=master)](https://buildkite.com/bazel/nodejs-rules-nodejs-postsubmit)

**This is a beta-quality release. Breaking changes are likely.**

The nodejs rules integrate NodeJS development toolchain and runtime with Bazel.

This toolchain can be used to build applications that target a browser runtime,
so this repo can be thought of as "JavaScript rules for Bazel" as well.

## Documentation

Comprehensive documentation for installing and using the rules, including generated API docs:
https://bazelbuild.github.io/rules_nodejs/

## Quickstart

This is the fastest way to get started.
See sections below for details and alternative methods.

```sh
$ npm init @bazel
```

or if you prefer yarn,

```sh
$ yarn create @bazel
```

> These commands are equivalent to `npx @bazel/create` which downloads the latest version of the `@bazel/create` package from npm and runs the program contained.

See the output of the tool for command-line options and next steps.

## Adopters

Thanks to the following active users!

Open-source repositories:

- [Angular](https://github.com/angular/angular)
- [Angular CLI](https://github.com/angular/angular-cli)
- [Angular Components](https://github.com/angular/components)
- [Selenium](https://github.com/SeleniumHQ/selenium)
- [NgRX](https://github.com/ngrx/platform)
- [tsickle](https://github.com/angular/tsickle)
- [incremental-dom](https://github.com/google/incremental-dom)
- [dataform](https://github.com/dataform-co/dataform)

Organizations:

- [Evertz](https://www.evertz.com)
- [LucidChart](https://www.lucidchart.com)
- [Webdox](https://www.webdox.cl)

Not on this list? [Send a PR](https://github.com/bazelbuild/rules_nodejs/edit/master/README.md) to add your repo or organization!

## User testimonials

From [Lewis Hemens](https://github.com/lewish) at Dataform:

> At Dataform we manage a number of NPM packages, Webpack builds, Node services and Java pipelines across two separate repositories. This quickly became hard for us to manage, development was painful and and deploying code required a many manual steps. We decided to dive in and migrate our build system entirely to Bazel. This was a gradual transition that one engineer did over the course of about 2 months, during which we had both Bazel and non bazel build processes in place. Once we had fully migrated, we saw many benefits to all parts of our development workflow:
> - Faster CI: we enabled the remote build caching which has reduced our average build time from 30 minutes to 5 (for the entire repository)
> - Improvements to local development: no more random bash scripts that you forget to run, incremental builds reduced to seconds from minutes
> - Simplified deployment processes: we can deploy our code to environments in Kubernetes with just one command that builds and pushes images
> - A monorepo that scales: adding new libraries or packages to our repo became easy, which means we do it more and end up write more modular, shared, maintainable code
> - Developing across machine types: our engineers have both Macbooks and Linux machines, bazel makes it easy to build code across both
> - Developer setup time: New engineers can build all our code with just 3 dependencies - bazel, docker and the JVM. The last engineer to join our team managed to build all our code in < 30 minutes on a brand new, empty laptop

## Documentation site

https://bazelbuild.github.io/rules_nodejs/
