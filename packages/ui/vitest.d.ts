import 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';

declare global {
  namespace Vi {
    interface Assertion extends AxeMatchers {}
    interface AsymmetricMatchersContaining extends AxeMatchers {}
  }
}
