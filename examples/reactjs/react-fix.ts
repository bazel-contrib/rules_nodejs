// https://github.com/bazelbuild/rules_nodejs/issues/555
(window as any).process = { env: { NODE_ENV: 'production' } }
