import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'dist/esm/index.js',
  plugins: [nodeResolve()],
  output: [
    {
      file: 'dist/plugin.js',
      format: 'iife',
      name: 'capacitorNativeUI',
      globals: { '@capacitor/core': 'capacitorExports' },
      sourcemap: true,
      inlineDynamicImports: true,
    },
    {
      file: 'dist/plugin.cjs',
      format: 'cjs',
      sourcemap: true,
      inlineDynamicImports: true,
    },
  ],
  external: ['@capacitor/core'],
};
