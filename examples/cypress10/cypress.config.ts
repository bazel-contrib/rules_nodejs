import { defineConfig } from "cypress";
import * as express from 'express';

export default defineConfig({
  e2e: {
    video: false,
    supportFile: false,
    setupNodeEvents(on, config) {
      on('before:run', (_runDetails) => {
        const app = express();
      
        app.get('/', function(_req, res) {
          res.send('<html><body>hello-world</body></html>');
        });
      
        const port = 3000;
        app.listen(port);
      
        config.baseUrl = `http://localhost:${port}`;
      });

      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'electron' || browser.name === 'chrome') {
          launchOptions.args.push('--disable-gpu');
          launchOptions.args.push('--disable-dev-shm-usage');
          launchOptions.args.push('--disable-gpu-sandbox');
          launchOptions.args.push('--no-sandbox');
          return launchOptions;
        }
      });

      return config;
    },
  },
});
