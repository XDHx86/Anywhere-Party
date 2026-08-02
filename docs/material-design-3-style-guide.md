# Material Design 3 Style Guide

## Overview

This style guide defines the visual design system for the Watch Party Extension, implementing Google's Material Design 3 (Material You) principles. It ensures consistency, accessibility, and modern aesthetics across all interface components.

## Color System

### Primary Palette

The extension uses a carefully selected color palette that provides excellent contrast and accessibility:

```css
:root {
  /* Primary Colors */
  --md-primary-main: #6200EE;
  --md-primary-light: #9C47FF;
  --md-primary-dark: #3700B3;
  --md-primary-contrast: #FFFFFF;

  /* Secondary Colors */
  --md-secondary-main: #03DAC6;
  --md-secondary-light: #66FFF9;
  --md-secondary-dark: #00A896;
  --md-secondary-contrast: #000000;

  /* Surface Colors */
  --md-surface-main: #FFFFFF;
  --md-surface-variant: #F5F5F5;
  --md-surface-container: #FAFAFA;
  --md-surface-container-high: #F0F0F0;

  /* Error Colors */
  --md-error-main: #B00020;
  --md-error-light: #E57373;
  --md-error-dark: #7B1FA2;
  --md-error-contrast: #FFFFFF;
}
```

### Dark Theme Palette

```css
:root[data-theme="dark"] {
  /* Primary Colors */
  --md-primary-main: #D0BCFF;
  --md-primary-light: #EADDFF;
  --md-primary-dark: #9C47FF;
  --md-primary-contrast: #381E72;

  /* Secondary Colors */
  --md-secondary-main: #4FD0C7;
  --md-secondary-light: #7FFFD4;
  --md-secondary-dark: #00A896;
  --md-secondary-contrast: #003D36;

  /* Surface Colors */
  --md-surface-main: #121212;
  --md-surface-variant: #1E1E1E;
  --md-surface-container: #2C2C2C;
  --md-surface-container-high: #383838;

  /* Text Colors */
  --md-on-surface: #E6E1E5;
  --md-on-surface-variant: #CAC4D0;
}
```

### Color Usage Guidelines

1. **Primary Color (#6200EE)**: Use for main actions, active states, and key interactive elements
2. **Secondary Color (#03DAC6)**: Use for secondary actions, accents, and complementary elements
3. **Surface Colors**: Use for backgrounds, cards, and container elements
4. **Error Color (#B00020)**: Use exclusively for error states and destructive actions

## Typography

### Font System

The extension uses a hierarchical typography system based on Material Design 3 specifications:

```css
/* Font Families */
--md-font-family-primary: 'Roboto', 'Inter', system-ui, -apple-system, sans-serif;
--md-font-family-monospace: 'Roboto Mono', 'Fira Code', monospace;

/* Display Styles */
--md-display-large: 57px/64px 'Roboto' 400;
--md-display-medium: 45px/52px 'Roboto' 400;
--md-display-small: 36px/44px 'Roboto' 400;

/* Headline Styles */
--md-headline-large: 32px/40px 'Roboto' 400;
--md-headline-medium: 28px/36px 'Roboto' 400;
--md-headline-small: 24px/32px 'Roboto' 400;

/* Title Styles */
--md-title-large: 22px/28px 'Roboto' 500;
--md-title-medium: 16px/24px 'Roboto' 500;
--md-title-small: 14px/20px 'Roboto' 500;

/* Body Styles */
--md-body-large: 16px/24px 'Roboto' 400;
--md-body-medium: 14px/20px 'Roboto' 400;
--md-body-small: 12px/16px 'Roboto' 400;

/* Label Styles */
--md-label-large: 14px/20px 'Roboto' 500;
--md-label-medium: 12px/16px 'Roboto' 500;
--md-label-small: 11px/16px 'Roboto' 500;
```

### Typography Usage

- **Display**: Large, impactful text for hero sections (not commonly used in extension UI)
- **Headline**: Section headers and important titles
- **Title**: Card titles, dialog headers, and prominent labels
- **Body**: Main content text, descriptions, and paragraphs
- **Label**: Button text, form labels, and UI element labels

## Spacing System

### Spacing Scale

Material Design 3 uses an 8dp base unit for consistent spacing:

```css
:root {
  --md-space-0: 0px;
  --md-space-1: 4px;   /* 0.5 × base */
  --md-space-2: 8px;   /* 1 × base */
  --md-space-3: 12px;  /* 1.5 × base */
  --md-space-4: 16px;  /* 2 × base */
  --md-space-5: 20px;  /* 2.5 × base */
  --md-space-6: 24px;  /* 3 × base */
  --md-space-8: 32px;  /* 4 × base */
  --md-space-10: 40px; /* 5 × base */
  --md-space-12: 48px; /* 6 × base */
  --md-space-16: 64px; /* 8 × base */
  --md-space-20: 80px; /* 10 × base */
}
```

### Spacing Usage Guidelines

- **Component Padding**: Use 16px (--md-space-4) for standard component internal spacing
- **Card Padding**: Use 24px (--md-space-6) for card content areas
- **Element Margins**: Use 8px (--md-space-2) for small gaps, 16px for medium gaps
- **Section Spacing**: Use 32px (--md-space-8) between major sections
- **Page Margins**: Use 24px (--md-space-6) for page-level margins

## Shape System

### Border Radius

Material Design 3 emphasizes rounded corners for a softer, more approachable feel:

```css
:root {
  --md-shape-none: 0px;
  --md-shape-xs: 4px;
  --md-shape-sm: 8px;
  --md-shape-md: 12px;
  --md-shape-lg: 16px;
  --md-shape-xl: 20px;
  --md-shape-2xl: 24px;
  --md-shape-full: 9999px;
}
```

### Shape Usage

- **Cards**: Use 12-16px (--md-shape-md to --md-shape-lg) for primary cards
- **Buttons**: Use 20px (--md-shape-xl) for filled buttons, 8px for outlined buttons
- **Input Fields**: Use 8px (--md-shape-sm) for form inputs
- **Avatars**: Use full rounding (--md-shape-full) for circular avatars
- **Chips/Tags**: Use full rounding for pill-shaped elements

## Elevation System

### Shadow Levels

Material Design 3 uses a refined elevation system with subtle shadows:

```css
:root {
  --md-elevation-0: none;
  --md-elevation-1: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15);
  --md-elevation-2: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15);
  --md-elevation-3: 0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px rgba(0, 0, 0, 0.3);
  --md-elevation-4: 0px 6px 10px 4px rgba(0, 0, 0, 0.15), 0px 2px 3px rgba(0, 0, 0, 0.3);
  --md-elevation-5: 0px 8px 12px 6px rgba(0, 0, 0, 0.15), 0px 4px 4px rgba(0, 0, 0, 0.3);
}
```

### Elevation Usage

- **Level 0**: Flat surfaces, backgrounds
- **Level 1**: Cards at rest, subtle elevation
- **Level 2**: Raised cards, hover states
- **Level 3**: Floating action buttons, prominent cards
- **Level 4**: Navigation drawers, modal dialogs
- **Level 5**: Tooltips, menus, overlays

## Component Specifications

### Cards

Material cards are the primary container component:

```css
.material-card {
  background: var(--md-surface-main);
  border-radius: var(--md-shape-md);
  box-shadow: var(--md-elevation-1);
  padding: var(--md-space-6);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.material-card:hover {
  box-shadow: var(--md-elevation-2);
  transform: translateY(-1px);
}

.material-card--elevated {
  box-shadow: var(--md-elevation-3);
}

.material-card--outlined {
  border: 1px solid var(--md-outline);
  box-shadow: none;
}
```

### Buttons

Button styles following Material Design 3 specifications:

```css
.material-button {
  font: var(--md-label-large);
  border-radius: var(--md-shape-xl);
  padding: 10px 24px;
  min-height: 40px;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  position: relative;
  overflow: hidden;
}

.material-button--filled {
  background: var(--md-primary-main);
  color: var(--md-primary-contrast);
  box-shadow: var(--md-elevation-0);
}

.material-button--filled:hover {
  box-shadow: var(--md-elevation-1);
  background: var(--md-primary-dark);
}

.material-button--outlined {
  background: transparent;
  color: var(--md-primary-main);
  border: 1px solid var(--md-outline);
}

.material-button--text {
  background: transparent;
  color: var(--md-primary-main);
  padding: 10px 12px;
}
```

### Input Fields

Form input styling with Material Design 3 principles:

```css
.material-input {
  position: relative;
  margin: var(--md-space-4) 0;
}

.material-input__field {
  width: 100%;
  padding: 16px;
  border: 1px solid var(--md-outline);
  border-radius: var(--md-shape-sm);
  background: var(--md-surface-main);
  font: var(--md-body-large);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.material-input__field:focus {
  outline: none;
  border-color: var(--md-primary-main);
  box-shadow: 0 0 0 2px rgba(98, 0, 238, 0.2);
}

.material-input__label {
  font: var(--md-body-small);
  color: var(--md-on-surface-variant);
  margin-bottom: var(--md-space-1);
  display: block;
}
```

## Layout Patterns

### Popup Layout

The extension popup follows a structured card-based layout:

```css
.popup-container {
  width: 380px;
  min-height: 240px;
  max-height: 600px;
  background: var(--md-surface-main);
  display: flex;
  flex-direction: column;
  gap: var(--md-space-2);
  padding: var(--md-space-4);
}

.popup-header {
  display: flex;
  align-items: center;
  gap: var(--md-space-3);
  padding: var(--md-space-4);
  border-bottom: 1px solid var(--md-outline-variant);
}

.popup-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--md-space-4);
  padding: var(--md-space-4);
}

.popup-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--md-space-4);
  border-top: 1px solid var(--md-outline-variant);
}
```

### Options Page Layout

The options page uses a tabbed interface with card-based content:

```css
.options-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--md-space-6);
}

.options-tabs {
  border-bottom: 1px solid var(--md-outline-variant);
  margin-bottom: var(--md-space-6);
}

.options-tab-panel {
  display: grid;
  gap: var(--md-space-6);
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
}

.settings-card {
  background: var(--md-surface-main);
  border-radius: var(--md-shape-lg);
  padding: var(--md-space-6);
  box-shadow: var(--md-elevation-1);
}
```

## Animation Guidelines

### Motion Principles

All animations follow Material Design 3 motion principles:

1. **Informative**: Animations should provide feedback and guide user attention
2. **Focused**: Animations should be purposeful and not distracting
3. **Expressive**: Animations should reflect the brand personality
4. **Intentional**: Every animation should have a clear purpose

### Animation Timing

```css
:root {
  /* Duration Tokens */
  --md-motion-duration-short1: 50ms;
  --md-motion-duration-short2: 100ms;
  --md-motion-duration-short3: 150ms;
  --md-motion-duration-short4: 200ms;
  --md-motion-duration-medium1: 250ms;
  --md-motion-duration-medium2: 300ms;
  --md-motion-duration-medium3: 350ms;
  --md-motion-duration-medium4: 400ms;

  /* Easing Tokens */
  --md-motion-easing-linear: cubic-bezier(0, 0, 1, 1);
  --md-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --md-motion-easing-emphasized: cubic-bezier(0.05, 0.7, 0.1, 1);
}
```

### Common Animations

```css
/* Hover Effects */
.hover-lift {
  transition: transform var(--md-motion-duration-short4) var(--md-motion-easing-standard),
              box-shadow var(--md-motion-duration-short4) var(--md-motion-easing-standard);
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--md-elevation-3);
}

/* Focus Effects */
.focus-ring {
  transition: box-shadow var(--md-motion-duration-short2) var(--md-motion-easing-standard);
}

.focus-ring:focus-visible {
  box-shadow: 0 0 0 2px var(--md-primary-main);
}

/* Loading Animation */
@keyframes material-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-spinner {
  animation: material-spin 1s linear infinite;
}
```

## Accessibility Standards

### Color Contrast

All color combinations meet WCAG 2.1 AA standards:

- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **UI Components**: Minimum 3:1 contrast ratio for borders and states

### Focus Indicators

```css
.focus-visible {
  outline: 2px solid var(--md-primary-main);
  outline-offset: 2px;
  border-radius: var(--md-shape-sm);
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .focus-visible {
    outline-width: 3px;
    outline-color: var(--md-on-surface);
  }
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Responsive Design

### Breakpoints

```css
:root {
  --md-breakpoint-xs: 0px;
  --md-breakpoint-sm: 600px;
  --md-breakpoint-md: 960px;
  --md-breakpoint-lg: 1280px;
  --md-breakpoint-xl: 1920px;
}
```

### Responsive Utilities

```css
/* Mobile-first approach */
.responsive-grid {
  display: grid;
  gap: var(--md-space-4);
  grid-template-columns: 1fr;
}

@media (min-width: 600px) {
  .responsive-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 960px) {
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## Implementation Guidelines

### CSS Custom Properties

Use CSS custom properties for all design tokens:

```css
/* ✅ Good */
.component {
  color: var(--md-primary-main);
  padding: var(--md-space-4);
  border-radius: var(--md-shape-md);
}

/* ❌ Avoid */
.component {
  color: #6200EE;
  padding: 16px;
  border-radius: 12px;
}
```

### Component Naming

Follow BEM methodology with Material Design prefixes:

```css
/* Block */
.material-card { }

/* Element */
.material-card__header { }
.material-card__content { }
.material-card__actions { }

/* Modifier */
.material-card--elevated { }
.material-card--outlined { }
.material-card--large { }
```

### Theme Switching

Support both light and dark themes:

```css
:root {
  color-scheme: light;
}

:root[data-theme="dark"] {
  color-scheme: dark;
}

.component {
  background: var(--md-surface-main);
  color: var(--md-on-surface);
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

## Quality Checklist

Before implementing any component, ensure:

- [ ] Colors meet accessibility contrast requirements
- [ ] Component works in both light and dark themes
- [ ] Proper focus indicators are implemented
- [ ] Animations respect reduced motion preferences
- [ ] Typography follows the established scale
- [ ] Spacing uses the 8dp grid system
- [ ] Component is keyboard accessible
- [ ] ARIA labels are provided where needed
- [ ] Component is responsive across different screen sizes
- [ ] Loading and error states are designed