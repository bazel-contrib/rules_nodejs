/**
 * @license
 * Copyright 2017 The Bazel Authors. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as child_process from 'child_process';
import * as net from 'net';

export function isTcpPortFree(port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', (e) => {
      resolve(false);
    });
    server.on('close', () => {
      resolve(true);
    });
    server.listen(port, () => {
      server.close();
    });
  });
}

export function isTcpPortBound(port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.once('connect', () => {
      resolve(true);
    });
    client.once('error', (e) => {
      resolve(false);
    });
    client.connect(port);
  });
}

export async function findFreeTcpPort(): Promise<number> {
  const range = {
    min: 32768,
    max: 60000,
  };
  for (let i = 0; i < 100; i++) {
    let port = Math.floor(Math.random() * (range.max - range.min) + range.min);
    if (await isTcpPortFree(port)) {
      return port;
    }
  }
  throw new Error('Unable to find a free port');
}

// Interface for config parameter of the protractor_web_test_suite onPrepare function
export interface OnPrepareConfig {
  // The workspace name
  workspace: string;

  // The server binary to run
  server: string;
}

export function waitForServer(port: number, timeout: number): Promise<boolean> {
  return isTcpPortBound(port).then(isBound => {
    if (!isBound) {
      if (timeout <= 0) {
        throw new Error('Timeout waiting for server to start');
      }
      const wait = Math.min(timeout, 500);
      return new Promise((res, rej) => setTimeout(res, wait))
          .then(() => waitForServer(port, timeout - wait));
    }
    return true;
  });
}

// Return type from runServer function
export interface ServerSpec {
  // Port number that the server is running on
  port: number;
}

/**
 * Runs the specified server binary from a given workspace and waits for the server
 * being ready. The server binary will be resolved from the Bazel runfiles. Note that
 * the server will be launched with a random free port in order to support test concurrency
 * with Bazel.
 */
export async function runServer(
    workspace: string, serverTarget: string, portFlag: string, serverArgs: string[],
    timeout = 5000): Promise<ServerSpec> {
  const serverPath = require.resolve(`${workspace}/${serverTarget}`);
  const port = await findFreeTcpPort();

  // Start the Bazel server binary with a random free TCP port.
  const serverProcess = child_process.spawn(
      serverPath, serverArgs.concat([portFlag, port.toString()]), {stdio: 'inherit'});

  // In case the process exited with an error, we want to propagate the error.
  serverProcess.on('exit', exitCode => {
    if (exitCode !== 0) {
      throw new Error(`Server exited with error code: ${exitCode}`);
    }
  });

  // Wait for the server to be bound to the given port.
  await waitForServer(port, timeout);

  return {port};
}
