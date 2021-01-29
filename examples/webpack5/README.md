# 🚀 Welcome to your new awesome project!

This project has been created using **webpack scaffold**, you can now run

```
yarn && yarn start
```

Will run the dev server in a browser at port http://localhost:8080/
Open the debugger at that address and you will see HMR console logs
To validate HMR is working with the dev server, modify the `hot.js` file
in `src/` and save it while the server is running. This will cause a hot reload
and you will see more console logs output.

This requires a few things
1. Webpack must be configured to have `resolve: { symlinks: false }`.
1. Webpack `devServer` options must have `followSymlinks` set to `true`.
1. Babel is not allowed to handle the modules, so make sure in the babel config to set the `modules` to false (see https://stackoverflow.com/a/47898487).

NOTE: This requires `watchpack 2.1.1` in your node modules tree so that webpack can watch correctly. It also requires `cache` to be turned off as Webpack won't issue a manifest update if it finds an cache'd module