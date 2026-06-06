import { vi, expect } from 'vitest';
import '@testing-library/jest-dom';
import * as matchers from 'vitest-axe/matchers';

// Extend Vitest with vitest-axe matchers
expect.extend(matchers);

// Mock scrollIntoView for Radix UI components in jsdom
Element.prototype.scrollIntoView = vi.fn();
