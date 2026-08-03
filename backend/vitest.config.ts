import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./src/tests/setup.ts'],
    environment: 'node',
    fileParallelism: false,
    maxWorkers: 1,
  },
});
