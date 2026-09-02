---
name: SignSecure TrustFlow
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3e4947'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6e7977'
  outline-variant: '#bdc9c6'
  surface-tint: '#006a63'
  primary: '#005c55'
  on-primary: '#ffffff'
  primary-container: '#0f766e'
  on-primary-container: '#a3faef'
  inverse-primary: '#80d5cb'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#425268'
  on-tertiary: '#ffffff'
  tertiary-container: '#5a6a81'
  on-tertiary-container: '#deeaff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9cf2e8'
  primary-fixed-dim: '#80d5cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style
The design system is engineered for institutional trust, legal credibility, and high-stakes financial operations within the West African B2B landscape. It rejects transient trends like glassmorphism or aggressive gradients in favor of a **Corporate Modern** aesthetic that emphasizes stability and precision.

The visual language communicates authority through structured layouts, generous whitespace, and a disciplined color palette. Every element is designed to reduce cognitive load for users managing sensitive legal documents and compliance workflows. The emotional response is one of calm, professional reliability—essential for a platform handling document verification and trust flows.

## Colors
The palette is rooted in a deep turquoise primary color, selected for its association with professional growth and security. This is balanced by a near-black navy for high-contrast typography and structural elements.

- **Primary (#0F766E):** Used strictly for primary actions, active navigation states, and critical brand identifiers.
- **Secondary (#0F172A):** The core color for headings and primary text, providing a grounded, authoritative feel.
- **Neutral (#F8FAFC):** Applied to page backgrounds to reduce glare and differentiate from the white surfaces of cards and document previews.
- **Status Colors:** Functional colors must always be accompanied by icons to ensure accessibility. They follow standard semantic patterns: Green for *Valide*, Amber for *En attente*, and Red for *Révoqué* or *Erreur*.

## Typography
This design system utilizes **Inter** exclusively to ensure maximum legibility across all digital interfaces. The type scale is optimized for information-dense dashboards and legal text.

- **Headlines:** Use tight letter spacing and bold weights to establish clear hierarchy.
- **Body Text:** Designed for readability in both French and English. Standard body text uses a 16px base for accessibility.
- **Labels:** Small labels use a medium or semi-bold weight to remain legible even at 12px.
- **Language Note:** Use realistic French placeholders (e.g., "Direction Générale des Impôts", "Certificat d'Authenticité") to test text expansion and alignment.

## Layout & Spacing
The layout follows a strict 8px grid system. A 12-column fluid grid is used for the main content area, with fixed side navigation (280px).

- **Grid:** 12 columns on desktop, 8 on tablet, 4 on mobile.
- **Rhythm:** Vertical spacing between sections should follow a 1.5x or 2x multiplier of the 24px gutter (36px or 48px).
- **Alignment:** Content is primarily left-aligned to mirror the reading flow of legal documents.
- **Margins:** Generous outer margins are maintained to prevent the interface from feeling cluttered, reinforcing the "Calm" brand personality.

## Elevation & Depth
Depth is conveyed through a **Tonal Layering** approach combined with soft, ambient shadows. This clarifies the relationship between the background, the workspace, and interactive elements.

- **Level 0 (Background):** #F8FAFC. The lowest layer.
- **Level 1 (Cards/Surface):** Pure White (#FFFFFF). Used for the main content areas. Shadow: 0px 1px 3px rgba(15, 23, 42, 0.1).
- **Level 2 (Dropdowns/Modals):** Pure White (#FFFFFF). Higher elevation to signify temporary overlay. Shadow: 0px 10px 15px -3px rgba(15, 23, 42, 0.1).
- **Outlines:** Low-contrast borders (#E2E8F0) are used on inputs and inactive states to maintain structure without adding visual noise.

## Shapes
The shape language is consistent and professional. The 8px (`rounded-md`) standard provides a modern feel while remaining formal enough for banking and legal sectors.

- **Small Components (Checkboxes, Tags):** 4px radius.
- **Standard Components (Buttons, Inputs, Cards):** 8px radius.
- **Large Components (Modals, Feature Sections):** 12px or 16px radius.
- **Interactive States:** Focus states should use a 2px offset ring in the primary color (#0F766E).

## Components
- **Buttons:** Primary buttons use the deep turquoise background with white text. Secondary buttons use a light gray stroke with navy text. Tertiary buttons are text-only with the primary color.
- **Input Fields:** Use a 1px border (#E2E8F0). On focus, the border transitions to the primary color with a subtle outer glow. Labels are always visible above the field.
- **Status Chips:** High-contrast background with a darker text version of the same hue (e.g., Light Green bg with Dark Green text for "Validé").
- **Cards:** Used for document summaries. Must include a clear icon (e.g., Folder or Shield), a title, and a timestamp (e.g., "Modifié le 12 Oct 2023").
- **Data Tables:** Row-based with subtle dividers. No vertical lines. Hover states use #F8FAFC.
- **Iconography:** Use 24px line icons with a 1.5px or 2px stroke weight. Icons should be functional, never decorative. Shield for security, QR Code for verification, and Clock for audit trails.