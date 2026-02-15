/**
 * Design Tokens - Centralized design system constants
 * All UI components should import values from this file instead of using raw Tailwind classes
 *
 * RULES:
 * - Colors reference CSS variables (defined in globals.css)
 * - All values are type-safe and autocomplete-friendly
 * - Never hardcode these values in components - always import from here
 */

// =============================================================================
// COLORS (CSS Variable References)
// =============================================================================

export const colors = {
  // Primary brand color (Blue)
  primary: 'hsl(var(--primary))',
  primaryForeground: 'hsl(var(--primary-foreground))',

  // Accent color (Indigo)
  accent: 'hsl(var(--accent))',
  accentForeground: 'hsl(var(--accent-foreground))',

  // Semantic colors
  success: 'hsl(var(--success))',
  successForeground: 'hsl(var(--success-foreground))',
  warning: 'hsl(var(--warning))',
  warningForeground: 'hsl(var(--warning-foreground))',
  destructive: 'hsl(var(--destructive))',
  destructiveForeground: 'hsl(var(--destructive-foreground))',
  info: 'hsl(var(--info))',
  infoForeground: 'hsl(var(--info-foreground))',

  // Surface colors
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  card: 'hsl(var(--card))',
  cardForeground: 'hsl(var(--card-foreground))',
  popover: 'hsl(var(--popover))',
  popoverForeground: 'hsl(var(--popover-foreground))',

  // UI element colors
  secondary: 'hsl(var(--secondary))',
  secondaryForeground: 'hsl(var(--secondary-foreground))',
  muted: 'hsl(var(--muted))',
  mutedForeground: 'hsl(var(--muted-foreground))',
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',
} as const;

// Tailwind CSS class mappings (for use in className)
export const colorClasses = {
  primary: 'bg-primary text-primary-foreground',
  accent: 'bg-accent text-accent-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  info: 'bg-info text-info-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  muted: 'bg-muted text-muted-foreground',
  card: 'bg-card text-card-foreground',
} as const;

// =============================================================================
// SPACING SCALE (Tailwind 4px grid)
// =============================================================================

export const spacing = {
  xs: '0.25rem',    // 4px  - p-1
  sm: '0.5rem',     // 8px  - p-2
  md: '1rem',       // 16px - p-4
  lg: '1.5rem',     // 24px - p-6
  xl: '2rem',       // 32px - p-8
  '2xl': '3rem',    // 48px - p-12
  '3xl': '4rem',    // 64px - p-16
} as const;

// Standard component spacing
export const componentSpacing = {
  pageMargin: 'p-6 md:p-8',           // Page container padding
  cardPadding: 'p-4 md:p-6',          // Card internal padding
  sectionGap: 'space-y-6',            // Gap between sections
  formFieldGap: 'space-y-4',          // Gap between form fields
  buttonGroup: 'space-x-2',           // Gap between buttons
  listItemGap: 'space-y-2',           // Gap between list items
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // Font families (defined in tailwind.config.ts)
  fontHeading: 'font-heading',
  fontBody: 'font-body',
  fontMono: 'font-mono',

  // Type scale
  pageTitle: 'text-3xl font-heading font-bold tracking-tight',
  sectionHeading: 'text-xl font-heading font-semibold tracking-tight',
  cardTitle: 'text-lg font-heading font-semibold',
  body: 'text-sm font-body',
  caption: 'text-xs font-medium tracking-wide uppercase text-muted-foreground',
  label: 'text-sm font-medium',
  data: 'text-sm font-mono font-medium',
  largeMetric: 'text-4xl font-heading font-bold tracking-tight',

  // Font sizes (for programmatic use)
  sizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },

  // Font weights
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const borderRadius = {
  none: '0',
  sm: 'calc(var(--radius) - 4px)',
  md: 'calc(var(--radius) - 2px)',
  lg: 'var(--radius)',        // 0.75rem / 12px
  xl: '1rem',                  // 16px
  '2xl': '1.5rem',             // 24px
  full: '9999px',
} as const;

// Standard border radius classes
export const borderRadiusClasses = {
  card: 'rounded-xl',           // Cards use xl (16px)
  button: 'rounded-lg',         // Buttons use lg (12px)
  input: 'rounded-md',          // Inputs use md (10px)
  badge: 'rounded-full',        // Badges fully rounded
  dialog: 'rounded-xl',         // Dialogs use xl
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  none: 'shadow-none',

  // Conditional shadows for dark mode
  card: 'shadow-sm dark:shadow-none',
  elevated: 'shadow-md dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
} as const;

// =============================================================================
// ANIMATIONS & TRANSITIONS
// =============================================================================

export const animations = {
  // Duration (in milliseconds)
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },

  // Easing functions
  easing: {
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Transition classes
  transition: {
    default: 'transition-all duration-150 ease-out',
    colors: 'transition-colors duration-150',
    transform: 'transition-transform duration-150',
    opacity: 'transition-opacity duration-150',
  },

  // Stagger delays (for list animations)
  stagger: {
    fast: 0.03,   // 30ms
    normal: 0.05, // 50ms
    slow: 0.08,   // 80ms
  },
} as const;

// Framer Motion variants (for use with motion components)
export const motionVariants = {
  // Page entry
  pageEntry: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  // List stagger
  listContainer: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  },

  listItem: {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  },

  // Modal/Dialog
  modal: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.15 },
  },

  // Collapse/Expand
  collapse: {
    initial: { height: 0, opacity: 0 },
    animate: { height: 'auto', opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: { duration: 0.2 },
  },
} as const;

// =============================================================================
// BREAKPOINTS
// =============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Media query helpers
export const mediaQueries = {
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  '2xl': `@media (min-width: ${breakpoints['2xl']})`,
} as const;

// =============================================================================
// Z-INDEX SCALE
// =============================================================================

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  toast: 70,
  tooltip: 80,
} as const;

// =============================================================================
// COMMON UI PATTERNS
// =============================================================================

export const patterns = {
  // Interactive states
  interactive: {
    hover: 'hover:bg-accent/10 transition-colors',
    focus: 'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    active: 'active:scale-[0.98]',
    disabled: 'disabled:opacity-50 disabled:pointer-events-none',
  },

  // Layout patterns
  layout: {
    container: 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
    section: 'py-8 md:py-12',
    grid2: 'grid grid-cols-1 md:grid-cols-2 gap-6',
    grid3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
    grid4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6',
  },

  // Card patterns
  card: {
    base: 'bg-card text-card-foreground rounded-xl shadow-sm dark:shadow-none border border-border',
    interactive: 'bg-card text-card-foreground rounded-xl shadow-sm dark:shadow-none border border-border hover:shadow-md transition-shadow cursor-pointer',
    elevated: 'bg-card text-card-foreground rounded-xl shadow-md dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] border border-border',
  },

  // Text truncation
  truncate: {
    single: 'truncate',
    lines2: 'line-clamp-2',
    lines3: 'line-clamp-3',
  },
} as const;

// =============================================================================
// ICON SIZES
// =============================================================================

export const iconSizes = {
  xs: 'h-3 w-3',    // 12px
  sm: 'h-4 w-4',    // 16px
  md: 'h-5 w-5',    // 20px
  lg: 'h-6 w-6',    // 24px
  xl: 'h-8 w-8',    // 32px
  '2xl': 'h-10 w-10', // 40px
} as const;

// =============================================================================
// EXPORTS
// =============================================================================

export const designTokens = {
  colors,
  colorClasses,
  spacing,
  componentSpacing,
  typography,
  borderRadius,
  borderRadiusClasses,
  shadows,
  animations,
  motionVariants,
  breakpoints,
  mediaQueries,
  zIndex,
  patterns,
  iconSizes,
} as const;

export default designTokens;
