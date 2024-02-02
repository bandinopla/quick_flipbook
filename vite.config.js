// vite.config.js
import { defineConfig } from 'vite';
import path from "path";
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig({
  publicDir: 'public',
  assetsInclude: ['**/*.gltf','**/*.exr','**/*.jpg'],
  plugins: [nodeResolve(), commonjs()],
  build: {
    manifest: true,
    minify: true,
    reportCompressedSize: true,
    lib: {
        entry: path.resolve(__dirname, "src/book.js"),
        fileName: "flipbook",
        formats: ["es", "cjs"],
      },
    rollupOptions: {
        external: [
            "three",
            "three.modifiers",
            "three/addons/utils/BufferGeometryUtils.js" 
        ]
    }
  }
});