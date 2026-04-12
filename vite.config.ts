import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      formats: ['iife'],
      name: '__HS_PLUGIN__',
      fileName: () => 'bundle.js',
    },
    sourcemap: true,
    outDir: 'dist',
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        exports: 'named',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
