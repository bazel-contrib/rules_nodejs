///<reference types="node"/>
import "zone.js/dist/zone-node";

import { ngExpressEngine } from "@nguniversal/express-engine";
import * as express from "express";
import { join } from "path";

const app = express();

const PORT = process.env.PORT || 4000;
const DIST_FOLDER = join(process.cwd(), "src/prodapp");

import { AppServerModule } from "./app/app.server.module";

app.engine(
  "html",
  ngExpressEngine({
    bootstrap: AppServerModule,
    providers: [
      // TODO add support for lazy loading with server side rendering
      // provideModuleMap(LAZY_MODULE_MAP)
    ]
  }) as any
);

app.set("view engine", "html");
app.set("views", DIST_FOLDER);

app.get("*.*", express.static(DIST_FOLDER, { maxAge: "1y" }));

// catch /favicon.ico route to prevent the following server error:
// Error: Cannot match any routes. URL Segment: 'favicon.ico'
app.get("/favicon.ico", (req, res) => res.send(""));

app.get("*", (req, res) => {
  res.render("example/index", { req });
});

app.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});
