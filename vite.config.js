// vite.config.js
import { defineConfig } from 'vite';
import path from "path";
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'; 
import dts from 'vite-plugin-dts'

export default defineConfig({
  publicDir: 'public',
  assetsInclude: ['**/*.gltf','**/*.exr','**/*.jpg'],
  plugins: [nodeResolve(), commonjs() ],
  build: {
    manifest: true,
    minify: true, 
    reportCompressedSize: true,
    lib: {
        entry: path.resolve(__dirname, "src/FlipBook.ts"),
        fileName: "flipbook",
        formats: ["es", "cjs"],
      },
    rollupOptions: {
        external: [
            "three",
            "three.modifiers",
            "three/addons/utils/BufferGeometryUtils.js" 
        ], 
    }
  }, 
});