import colors from './colors.json' with { type: 'json' };
import spacing from './spacing.json' with { type: 'json' };
import typography from './typography.json' with { type: 'json' };

// Type definitions for DTCG token format
export interface ColorToken {
  $type: 'color';
  $value: {
    colorSpace: 'srgb' | 'oklch' | 'p3' | 'rec2020';
    channels: number[];
  };
}

export interface DimensionToken {
  $type: 'dimension';
  $value: {
    value: number;
    unit: string;
  };
}

export interface NumberToken {
  $type: 'number';
  $value: number;
}

export interface FontWeightToken {
  $type: 'font-weight';
  $value: number;
}

export type Token = ColorToken | DimensionToken | NumberToken | FontWeightToken;

// Color tokens
export const colorTokens = colors.color as unknown as Record<string, ColorToken>;
export const darkColorTokens = colors.dark as unknown as Record<string, ColorToken>;

// Spacing tokens
export const spacingTokens = spacing.spacing as unknown as Record<string, DimensionToken>;
export const radiusTokens = spacing.radius as unknown as Record<string, DimensionToken>;

// Typography tokens
export const fontSizeTokens = typography['font-size'] as unknown as Record<string, DimensionToken>;
export const lineHeightTokens = typography['line-height'] as unknown as Record<string, NumberToken>;
export const fontWeightTokens = typography['font-weight'] as unknown as Record<string, FontWeightToken>;
export const letterSpacingTokens = typography['letter-spacing'] as unknown as Record<string, DimensionToken>;

// Helper function to format oklch color for CSS
export function formatOklchColor(token: ColorToken): string {
  if (token.$value.colorSpace !== 'oklch') {
    throw new Error(`Unsupported color space: ${token.$value.colorSpace}`);
  }
  const channels = token.$value.channels;
  if (channels.length < 3) {
    throw new Error(`Color channels must have at least 3 values, got ${channels.length}`);
  }
  const l = channels[0] as number;
  const c = channels[1] as number;
  const h = channels[2] as number;
  return `oklch(${l * 100}% ${c} ${h})`;
}

// Helper function to format dimension for CSS
export function formatDimension(token: DimensionToken): string {
  return `${token.$value.value}${token.$value.unit}`;
}

// Helper function to format font weight for CSS
export function formatFontWeight(token: FontWeightToken): string {
  return token.$value.toString();
}

// Export all tokens for direct access
export const tokens = {
  color: colorTokens,
  dark: darkColorTokens,
  spacing: spacingTokens,
  radius: radiusTokens,
  fontSize: fontSizeTokens,
  lineHeight: lineHeightTokens,
  fontWeight: fontWeightTokens,
  letterSpacing: letterSpacingTokens,
};

// Export JSON files for tool consumption
export { colors, spacing, typography };
