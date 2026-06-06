import type { ProjectConfig } from 'chromatic';

const config: ProjectConfig = {
  // Storybook configuration
  storybookConfigDir: '.storybook',
  buildScriptName: 'build-storybook',
  
  // Auto-accept changes for initial baseline setup
  // Set to false after baseline is established
  autoAcceptChanges: process.env.CHROMATIC_AUTO_ACCEPT === 'true',
  
  // Enable parallel builds for faster CI
  parallel: true,
  
  // Exit with zero even if changes are found (for CI integration)
  // Chromatic will still report the status check
  exitZeroOnChanges: true,
};

export default config;
