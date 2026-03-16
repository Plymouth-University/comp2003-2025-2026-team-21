export const colours = {
  // Deep space backgrounds
  background: "#050810",
  backgroundDeep: "#020408",
  surface: "#0A0E1F",
  surfaceElevated: "#141B2D",
  surfaceGlass: "rgba(10, 14, 31, 0.8)",

  // Cosmic accent colors
  primary: "#8B5CF6",       // Vibrant purple nebula
  primaryLight: "#A78BFA",
  primaryDark: "#6D28D9",

  secondary: "#06B6D4",      // Cyan starlight
  secondaryLight: "#22D3EE",
  secondaryDark: "#0891B2",
  successLight: "#34D399",

  accent: "#EC4899",         // Pink cosmic dust
  accentLight: "#F472B6",

  success: "#10B981",        // Emerald aurora
  successLight: "#34D399",
  successDark: "#059669",

  warning: "#F59E0B",        // Amber meteor
  error: "#EF4444",          // Red dwarf
  errorLight: "#F87171",

  // Text hierarchy
  textPrimary: "#F9FAFB",    // Bright star white
  textSecondary: "#D1D5DB",  // Dim star gray
  textMuted: "#6B7280",      // Distant star
  textAccent: "#A5B4FC",     // Light purple tint

  // Borders and overlays
  border: "rgba(139, 92, 246, 0.15)",
  borderLight: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(139, 92, 246, 0.3)",

  glass: "rgba(10, 14, 31, 0.6)",
  glassLight: "rgba(255, 255, 255, 0.05)",

  // Special effects
  glow: "rgba(139, 92, 246, 0.4)",
  glowCyan: "rgba(6, 182, 212, 0.4)",
  glowPink: "rgba(236, 72, 153, 0.3)",

  // Gradients (for reference)
  gradients: {
    nebula: ["#8B5CF6", "#EC4899"],
    aurora: ["#06B6D4", "#10B981"],
    sunset: ["#F59E0B", "#EF4444"],
    deepSpace: ["#050810", "#0A0E1F"],
  },
};

// Spacing scale for consistency
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  massive: 64,
};

// Border radius scale
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

// Shadow styles
export const shadows = {
  small: {
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
};
