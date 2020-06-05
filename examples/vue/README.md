# How to setup Bazel for your Vue App

## Setting up Vue

Install the Vue CLI und run 'vue create PROJECTNAME'. This will create a your vueproject and create a package.json with all needed dependencies.

## Adding Bazel to your Vue Application
The full instructions can be found [here](https://bazelbuild.github.io/rules_nodejs/install.html).

Install bazelisk and ibazel with yarn or npm.
Create a WORKSPACE File in your the Root Folder of your Application.
Add the NodeJS Rules to your Workspace, as well as the NPM Packages.

## Adding Building and Serving to your Ruleset
TODO

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
