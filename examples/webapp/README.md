# Webapp example

This example shows how to compose some rules from this repo.

The first rule is `rollup_bundle` which takes `index.js` and `strings.en.js` and produces a single JS file for our application which combines the two, given an `entry_point`.

The output bundle is then passed to the `assets` of a `pkg_web` rule, along with some CSS and an image.
The `pkg_web` rule produces a directory ready to ship to our CDN to serve the application in production.
It also injects a `<link>` tag for our CSS and a `<script>` tag for our JavaScript.

The `http_server` rule lets us run a server locally which serves the packaged application.

```sh
$ bazel run :server
Starting up http-server, serving package
Available on:
  http://127.0.0.1:8080
  http://192.168.86.240:8080
Hit CTRL-C to stop the server
```
