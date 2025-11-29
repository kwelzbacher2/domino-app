import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'tensorflow': ['@tensorflow/tfjs', '@tensorflow-models/coco-ssd'],
        }
      }
    }
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tensorflow/tfjs', '@tensorflow-models/coco-ssd'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  define: {
    'global': 'globalThis',
  }
})
