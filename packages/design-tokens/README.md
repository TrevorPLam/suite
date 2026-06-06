# @suite/design-tokens

Design tokens package for the Suite productivity suite. Provides DTCG-compliant design tokens for colors, spacing, and typography.

## Overview

This package follows the [Design Tokens Community Group (DTCG)](https://www.designtokens.org/) format specification for interoperability and tool support. Tokens are defined in JSON files and exported as TypeScript types for type-safe access.

## Installation

This package is part of the Suite monorepo. No additional installation is required if you're working within the monorepo.

```bash
# Import within the monorepo
import { colorTokens, formatOklchColor } from '@suite/design-tokens';
```

## Token Structure

### DTCG Format

All tokens follow the DTCG JSON format with `$type` and `$value` properties:

```json
{
  "primary": {
    "$type": "color",
    "$value": {
      "colorSpace": "oklch",
      "channels": [0.45, 0.18, 260]
    }
  }
}
```

### Color Tokens

Located in `src/colors.json`. Includes:

- **Semantic colors**: primary, background, foreground, border, muted-foreground, ring
- **Status colors**: destructive, success, warning with foreground variants
- **Surface colors**: card, popover, accent with foreground variants
- **Dark mode**: Overrides for dark theme (background, foreground, border, etc.)

All colors use the `oklch` color space for perceptual uniformity and better color manipulation.

### Spacing Tokens

Located in `src/spacing.json`. Includes:

- **Spacing scale**: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24 (in rem units)
- **Radius tokens**: md (0.75rem)

### Typography Tokens

Located in `src/typography.json`. Includes:

- **Font sizes**: xs, sm, base, lg, xl, 2xl, 3xl, 4xl (in rem units)
- **Line heights**: none, tight, snug, normal, relaxed, loose (unitless)
- **Font weights**: normal (400), medium (500), semibold (600), bold (700)
- **Letter spacing**: tighter, tight, normal, wide, wider, widest (in em units)

## Usage

### TypeScript/JavaScript

```typescript
import {
  colorTokens,
  darkColorTokens,
  spacingTokens,
  radiusTokens,
  fontSizeTokens,
  lineHeightTokens,
  fontWeightTokens,
  letterSpacingTokens,
  formatOklchColor,
  formatDimension,
  formatFontWeight,
} from '@suite/design-tokens';

// Access color tokens
const primaryColor = formatOklchColor(colorTokens.primary);
// Returns: "oklch(45% 0.18 260)"

// Access spacing tokens
const spacing4 = formatDimension(spacingTokens['4']);
// Returns: "1rem"

// Access typography tokens
const fontSizeLg = formatDimension(fontSizeTokens.lg);
// Returns: "1.125rem"

const fontWeightBold = formatFontWeight(fontWeightTokens.bold);
// Returns: "700"
```

### CSS Integration

CSS custom properties in `packages/ui/src/styles/globals.css` are the source of truth for styling. The design tokens package provides programmatic access to the same values.

CSS variable names match token names with kebab-case:
- `--color-primary` → `colorTokens.primary`
- `--spacing-4` → `spacingTokens['4']`
- `--font-size-lg` → `fontSizeTokens.lg`

## Token Naming Conventions

- **Colors**: Use semantic names (primary, destructive, success) rather than literal names (blue, red)
- **Spacing**: Use numeric scale (0-24) for consistency
- **Typography**: Use relative scale names (xs, sm, base, lg) rather than pixel values
- **Dark mode**: Override tokens in the `dark` group rather than creating separate dark tokens

## Adding New Tokens

1. **Add to JSON file**: Add the token to the appropriate JSON file (`colors.json`, `spacing.json`, or `typography.json`)
2. **Follow DTCG format**: Include `$type` and `$value` properties
3. **Update CSS**: Add corresponding CSS custom property to `packages/ui/src/styles/globals.css`
4. **Update documentation**: Document the new token in this README

Example adding a new color:

```json
// src/colors.json
{
  "color": {
    "info": {
      "$type": "color",
      "$value": {
        "colorSpace": "oklch",
        "channels": [0.6, 0.15, 220]
      }
    }
  }
}
```

```css
/* packages/ui/src/styles/globals.css */
@theme {
  --color-info: oklch(60% 0.15 220);
}
```

## Color Format

All colors use the `oklch` color space for:

- **Perceptual uniformity**: Equal changes in values produce equal perceived changes
- **Better color manipulation**: Easier to create consistent color palettes
- **Wide gamut support**: Access to colors beyond sRGB

Format: `oklch(L% C H)` where:
- **L**: Lightness (0-100%)
- **C**: Chroma (saturation, 0-0.4 for web-safe colors)
- **H**: Hue (0-360 degrees)

## Type Safety

The package exports TypeScript types for all token formats:

```typescript
import type { ColorToken, DimensionToken, NumberToken, FontWeightToken } from '@suite/design-tokens';

// Type-safe token access
const token: ColorToken = colorTokens.primary;
```

## Tool Consumption

JSON files are exported for tool consumption:

```typescript
import colors from '@suite/design-tokens/colors.json';
import spacing from '@suite/design-tokens/spacing.json';
import typography from '@suite/design-tokens/typography.json';
```

This enables integration with design tools, style generators, and translation tools that support DTCG format.

## Contribution Guidelines

- Follow DTCG format specification
- Use oklch color space for all colors
- Maintain semantic naming conventions
- Update CSS custom properties when adding tokens
- Document new tokens in this README

## References

- [DTCG Format Specification](https://www.designtokens.org/tr/drafts/format/)
- [OKLCH Color Space](https://oklch.com/)
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4-alpha)
