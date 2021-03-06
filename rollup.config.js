import { eslint } from 'rollup-plugin-eslint';

import typescript from 'rollup-plugin-typescript2';
import tstreeshaking from 'rollup-plugin-ts-treeshaking';

import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

import replace from '@rollup/plugin-replace';

import { terser } from 'rollup-plugin-terser';

const env = "production";

export default [
  {
    input: ['./src/index.tsx'],
    output: {
      dir: 'dist',
      format: 'esm',
      sourcemap: true,
      plugins: [terser()]
    },
    manualChunks(id) {
      if (id.includes('node_modules') || id.includes('react-esm')) {
        return 'vendor';
      }
    },
    plugins: [
      commonjs(),
      nodeResolve(),
      replace({
        'process.env.NODE_ENV': env
      }),
      eslint({ ignore: false, exclude: ['react-esm/**'] }),
      typescript(),
      tstreeshaking()
    ]
  }
];