# 🌌 UniVerse Design System

## Concept: "Cosmic Elegance"
A modern, immersive space theme that feels premium, sophisticated, and otherworldly.

---

## 🎨 Color Philosophy

### Background Layers (Depth System)
- **Background Deep** (#020408) - Farthest back, used for app background
- **Background** (#050810) - Main screen background
- **Surface** (#0A0E1F) - Cards, modals, elevated surfaces
- **Surface Elevated** (#141B2D) - Active states, hover effects
- **Surface Glass** - Transparent overlays with blur effects

### Accent Colors (Cosmic Energy)
- **Primary** - Nebula Purple (#8B5CF6) - Main interactive elements
- **Secondary** - Starlight Cyan (#06B6D4) - Secondary actions, highlights
- **Accent** - Cosmic Dust Pink (#EC4899) - Special highlights, badges
- **Success** - Aurora Green (#10B981) - Positive states
- **Warning** - Meteor Amber (#F59E0B) - Caution states
- **Error** - Red Dwarf (#EF4444) - Error states

### Text Hierarchy
- **Primary** (#F9FAFB) - Main text, headings
- **Secondary** (#D1D5DB) - Body text, descriptions
- **Muted** (#6B7280) - Disabled, placeholder text
- **Accent** (#A5B4FC) - Highlighted text, links

---

## 📐 Spacing System

```
xs:    4px   - Tight spacing
sm:    8px   - Small gaps
md:    12px  - Default gaps
lg:    16px  - Section spacing
xl:    20px  - Large spacing
xxl:   24px  - Major sections
xxxl:  32px  - Screen padding
huge:  48px  - Hero spacing
massive: 64px - Feature spacing
```

---

## 🎯 Border Radius Scale

```
sm:    8px   - Small buttons, tags
md:    12px  - Inputs, small cards
lg:    16px  - Cards, modals
xl:    20px  - Large cards
xxl:   24px  - Feature cards
full:  999px - Pills, avatars, circular buttons
```

---

## ✨ Visual Effects

### 1. Glassmorphism
- Semi-transparent backgrounds
- Subtle blur effects
- Soft borders with primary color tint
- Creates depth and layering

### 2. Glow Effects
- Purple glow: `shadowColor: #8B5CF6, shadowRadius: 20`
- Cyan glow: `shadowColor: #06B6D4, shadowRadius: 20`
- Pink glow: `shadowColor: #EC4899, shadowRadius: 20`
- Use for emphasis, active states, floating elements

### 3. Gradient Accents
- Nebula: Purple → Pink
- Aurora: Cyan → Green
- Meteor: Amber → Red
- Use sparingly for hero elements, CTAs

### 4. Particle Effects
- Animated stars in background
- Floating cosmic dust
- Shimmer effects on loading

---

## 🔤 Typography

### Font Weights
- **800-900** - Display titles (UniVerse logo, hero text)
- **700** - Section headings
- **600** - Subheadings, buttons
- **500** - Body text
- **400** - Secondary text, captions

### Font Sizes
- **52-64px** - Hero titles (splash, landing)
- **32-40px** - Screen titles
- **22-28px** - Section headers
- **16-18px** - Body text
- **13-15px** - Captions, secondary text

### Letter Spacing
- **Titles**: 0.5px - Adds breathing room
- **Body**: 0px - Default
- **Buttons**: 0.3px - Slight spacing for readability

---

## 🎭 Component Patterns

### Cards
- Background: `surface`
- Border: `1.5px solid border`
- Radius: `lg` (16px)
- Shadow: `medium` with purple tint
- Padding: `lg` (16px)

### Buttons
- **Primary**: Purple gradient with glow effect
- **Secondary**: Glassmorphism with cyan border
- **Ghost**: Transparent with border
- Radius: `full` (pills)
- Min height: 50px
- Pressed: Scale 0.96, reduce glow

### Inputs
- Background: `surface`
- Border: `1.5px solid border`
- Focus: Border becomes `borderStrong` + subtle glow
- Radius: `lg` (16px)
- Height: 56px
- Error: Pink border + glow

### Navigation
- Background: `surfaceGlass` with blur
- Top border: Purple gradient line
- Icons: 24px, filled when active
- Labels: 12px, bold
- Active: Purple text + glow under icon

### Modals
- Backdrop: Dark gradient (not solid black)
- Background: `surface` with strong glow
- Top: Rounded corners (xxl)
- Slide up animation
- Swipe to dismiss

---

## 🌟 Animation Principles

### Timing
- **Instant**: 0-100ms - Micro-interactions
- **Fast**: 150-250ms - Button presses, toggles
- **Medium**: 300-500ms - Screen transitions
- **Slow**: 800-1200ms - Complex animations

### Easing
- **Spring**: Bounce effect (buttons, cards)
- **Ease-out**: Smooth deceleration (transitions)
- **Ease-in-out**: Symmetric motion (loading)

### Motion
- Scale: Press effects (0.96-1.02)
- Fade: Opacity transitions (0-1)
- Slide: Y-axis movements
- Glow: Shadow radius pulsing

---

## 🚀 Implementation Priorities

### Phase 1: Foundation ✅
- [x] Updated color system
- [x] Created ThemedInput component
- [x] Created ThemedButton component
- [x] Added icons to navigation

### Phase 2: Enhanced Components
- [ ] Gradient backgrounds for hero sections
- [ ] Glassmorphism cards
- [ ] Animated star background
- [ ] Shimmer loading states
- [ ] Glow effects on interactive elements

### Phase 3: Micro-interactions
- [ ] Particle effects on button press
- [ ] Smooth screen transitions
- [ ] Pull-to-refresh cosmic animation
- [ ] Skeleton screens with shimmer
- [ ] Haptic feedback expansion

### Phase 4: Polish
- [ ] Typography refinements
- [ ] Spacing consistency audit
- [ ] Animation timing optimization
- [ ] Accessibility improvements
- [ ] Dark mode optimizations

---

## 🎨 Visual Inspiration

Think: **Apple's Vision Pro meets SpaceX**

- Clean, minimal surfaces
- Subtle gradients and glows
- Premium feel with depth
- Sophisticated color usage
- Smooth, satisfying animations
- Glassmorphism done right
- Purposeful visual hierarchy

---

## 📱 Screen-by-Screen Breakdown

### Landing Screen
- Full cosmic background with animated stars
- Large gradient title
- Glassmorphism cards for login options
- Subtle parallax on scroll

### Auth Screens
- Starfield background
- Floating glass cards
- Purple glow on focus
- Smooth validation animations
- Gradient CTA buttons

### Event Feed
- Clean card layout
- Subtle elevation hierarchy
- Time-based status badges (with gradients)
- Pull-to-refresh with star animation

### Social Feed
- Card-based posts
- Avatar glow on organizations
- Reaction animations (hearts burst)
- Image loading shimmer

### Modals
- Backdrop blur effect
- Slide-up presentation
- Rounded top corners
- Gradient header line
- Glassmorphism content

---

This design system creates a **premium, immersive experience** that feels like you're navigating through a beautiful cosmos. The key is restraint - using glows, gradients, and effects purposefully, not excessively.
