import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({

  // chokidarWatchOptions: {
  //   usePolling: true
  // },
  plugins: [react()],
  server: {
    port: 3001,
    hmr: {
      protocol: 'ws',
      // timeout: 1,
      port: 3001,
      // host: 'localhost',
      // overlay: false,
    },
    // watch: {
    //   usePolling: false
    // }
  },
  resolve: {
    preserveSymlinks: true
  },
  logLevel: 'info',
  build: {
    rollupOptions: {
      // output: {
      //   dir: 'bazel-out/k8-fastbuild/bin',
      //   entryFileNames: `assets/[name].js`,
      //   chunkFileNames: `assets/[name].js`,
      //   assetFileNames: `assets/[name].[ext]`
      // }
    }
  }
})
