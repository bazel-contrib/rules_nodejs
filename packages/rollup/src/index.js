// npm install throws if there is no JS in the package
// npm ERR! path /home/alexeagle/Projects/angular/node_modules/@bazel/rollup/index.js
// npm ERR! code ENOENT
// npm ERR! errno -2
// npm ERR! syscall chmod
// npm ERR! enoent ENOENT: no such file or directory, chmod
// '/home/alexeagle/Projects/angular/node_modules/@bazel/rollup/index.js' npm ERR! enoent This is
// related to npm not being able to find a file. npm ERR! enoent
throw new Error('@bazel/rollup package has no executable JS code');
