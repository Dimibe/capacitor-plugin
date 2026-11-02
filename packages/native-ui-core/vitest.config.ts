import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@rdlabo/capacitor-native-ui/integration': new URL('./src/native-integration/index.ts', import.meta.url).pathname,
    },
  },
  test: { environment: 'jsdom', include: ['tests/**/*.spec.ts'], isolate: true, setupFiles: ['../../tests/test-setup.ts'] },
});
