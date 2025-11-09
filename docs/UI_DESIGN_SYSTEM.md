# SafeVoice Professional Design System

## Overview

This document outlines the Phase 1 design system overhaul that powers the professional SafeVoice interface. The refresh establishes consistent colors, typography, spacing, and responsive rules while enabling granular user customization that persists across sessions.

## Color Architecture

| Token | Light Theme | Dark Theme | Notes |
|-------|-------------|------------|-------|
| `--color-surface` | `#FFFFFF` | `#0A0E27` | Primary application background |
| `--color-surface-secondary` | `#F5F7FA` | `#1A1F3A` | Secondary surfaces, cards |
| `--color-text` | `#0A0E27` | `#F5F7FA` | Default body copy |
| `--color-text-secondary` | `#1A223E` | `#D7DEF6` | Secondary copy & labels |
| `--color-text-muted` | `#5A637A` | `#A7B2DA` | Metadata, captions |
| `--color-primary` | `#0066CC` | `#FFD800` | Brand accent |
| `--color-success` | `#0B8620` | `#33F08D` | Positive feedback |
| `--color-danger` | `#FF6B6B` | `#FF6B6B` | Alerts & destructive actions |
| `--color-warning` | `#F0B429` | `#FFC857` | Attention states |
| `--color-info` | `#0066CC` | `#76AAFF` | Informational messaging |

* All color pairings meet WCAG AAA (≥ 7:1) for critical text and ≥ 4.5:1 for component states.
* Semantic aliases (`--color-error`, `--color-success-light`, etc.) remain for backwards compatibility with existing components.

## Typography

* Base font size: `16px` (mobile), fluidly scales to `18px` on desktop.
* Font scale controls (`90%`–`120%`) adjust `rem` units globally for accessible zoom.
* Scale tokens:
  * `--font-size-caption` 12–14px
  * `--font-size-body` 15–18px
  * `--font-size-title` 22–26px
  * `--font-size-hero` 32–48px (clamped)
* Font profiles
  * **System Default** – platform fonts (SF Pro / Roboto)
  * **OpenDyslexic** – dyslexia-friendly glyphs
  * **Comic Sans Pro** – casual alternative
* `--font-line-height` defaults to `1.5` and is user-adjustable (1.4–1.8).

## Spatial System

* Base spacing unit: `8px`
* Density multiplier (`compact`, `comfort`, `spacious`) scales spacing tokens without breaking Tailwind utility usage.
* Utility classes:
  * `spacing-stack-{xs|sm|md|lg|xl}` – vertical stacks with semantic gaps
  * `spacing-inline-{sm|md|lg}` – horizontal clusters respecting density
  * `spacing-grid` – responsive grid skeletons with tokenised gaps

## Responsive Layout

* Breakpoints: `xs (320px)`, `tablet (768px)`, `desktop (1024px)`, `wide (1440px)`
* `ResponsiveLayout` component exposes context (`breakpoint`, `orientation`, `width`, `height`) and applies `data-layout-breakpoint`/`data-orientation` attributes on `<html>` for advanced responsive styling.
* Safe area handling: `.safe-area-layout` and `.safe-area-inset` classes pad content using `env(safe-area-inset-*)` to support devices with notches, rounded corners, and gesture areas.

## Customization Engine

* Store: `src/lib/customizationStore.ts`
  * Persists preferences to `localStorage` (`safevoice:appearance`).
  * Applies CSS variables in real time, syncing with the theme store.
  * Settings include theme mode, font profile, font size & scale, line height, density, sidebar width, color palette, border radius, button style, elevation, and motion preferences.
  * Supports export/import of settings as JSON (clipboard friendly).
* Preferences enforce WCAG contrast and maintain compatibility with legacy Tailwind utilities by manipulating root `font-size` and CSS variables instead of rewriting markup.

## Components

* **AppearanceSettings** (`/settings/appearance`): unified control surface for all customization options, featuring live validation and reset/export/import controls.
* **ThemePreview**: showcases buttons, cards, inputs, and modals that immediately reflect user changes, with real-time contrast feedback.
* **ResponsiveLayout**: wraps the application shell, enforcing consistent breakpoints, safe-area padding, and providing contextual layout data via React context.

## Tailwind & Utility Enhancements

* `tailwind.config.js` extends custom screens, spacing, font sizes, and semantic colors mapped to the new CSS variables.
* Button, card, and shadow styles reference the semantic token set, with overrides for button style (filled/outlined/ghost) driven by the customization store (`data-button-style`).
* Tailwind `rounded-lg/xl` utilities now reference `--radius-lg`/`--radius-xl`, enabling global border-radius adjustments without refactoring component markup.

## Accessibility & Performance

* Auto theme respects `prefers-color-scheme` and updates on system changes.
* Reduced motion preference (`animations: reduced`) zeroes transition and animation durations for sensitive users.
* Root font scaling maintains consistent layout density on high/low DPI displays while keeping bundle size unchanged (CSS only).
* All new controls are keyboard accessible with semantic form elements and descriptive labels.

---

For additional implementation details, refer to:
* `src/lib/customizationStore.ts`
* `src/components/settings/AppearanceSettings.tsx`
* `src/components/settings/ThemePreview.tsx`
* `src/components/responsive/ResponsiveLayout.tsx`
* `src/styles/*.css` for tokens, spacing, and responsive utilities.
