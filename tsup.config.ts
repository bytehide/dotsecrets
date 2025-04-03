import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/index.ts'],
  outDir: 'dist',
  format: ['esm', 'cjs'],
  target: 'node18',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  shims: true,
  external: [
    "@babel/preset-typescript",
    "@babel/preset-react",
    "@babel/plugin-syntax-typescript",
    "@babel/plugin-syntax-jsx",
    "@babel/plugin-syntax-decorators"
  ],
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    };
  },
});