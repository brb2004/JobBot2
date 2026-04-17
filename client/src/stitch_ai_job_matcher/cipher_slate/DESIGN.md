# Design System Document: The Precision-Tech Editorial

## 1. Overview & Creative North Star
**The Creative North Star: "The Architectural Ledger"**
This design system moves beyond the "generic SaaS dashboard" by adopting a philosophy of **Architectural Ledgering**. It treats the interface not as a series of boxes, but as a high-end editorial publication for the financial world. We prioritize data clarity through expansive white space, intentional asymmetry, and a "layered glass" depth model.

The goal is to feel **Intelligent yet Accessible**. We achieve this by pairing the structural rigor of a fintech platform with the breathing room of a luxury lifestyle brand. We avoid the "cluttered grid" by using tonal shifts and typography scale to define importance, ensuring the user feels in control of a sophisticated, high-tech engine.

---

## 2. Colors & Tonal Logic
Our palette is anchored in Deep Navy and Slate Blue, using energetic Teal as a surgical tool for conversion and focus.

### The "No-Line" Rule
**Borders are a failure of hierarchy.** In this system, 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely through background color shifts. 
- *Implementation:* Use a `surface-container-low` section sitting on a `surface` background to define a sidebar or header.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper and frosted glass.
*   **Base Layer:** `surface` (#f7f9fb)
*   **Secondary Content:** `surface-container-low` (#f2f4f6)
*   **Interactive Cards:** `surface-container-lowest` (#ffffff) — This creates a "pop" effect against the slightly darker background.
*   **High-Contrast Accents:** Use `primary_container` (#111c2d) for dark-mode-in-light-mode moments, such as sophisticated tooltips or footer sections.

### The "Glass & Gradient" Rule
To avoid a "flat" feel, use **Glassmorphism** for floating elements (e.g., navigation bars or mobile overlays).
*   **Token:** `surface` with 80% opacity + 20px backdrop-blur.
*   **Signature Textures:** Use subtle linear gradients for CTAs: `primary` (#000000) to `primary_container` (#111c2d) at a 135-degree angle. This provides a tactile "ink" depth.

---

## 3. Typography
We utilize a dual-font strategy to balance authority with technical precision.

*   **Display & Headlines (Manrope):** Chosen for its geometric modernism. High-contrast sizing (e.g., `display-lg` at 3.5rem) should be used with generous leading (1.1) to create an editorial feel.
*   **Body & UI (Inter):** The workhorse. Inter’s tall x-height ensures readability in dense data visualizations and fintech tables.

**Hierarchy as Identity:**
*   **Primary Data Points:** Use `headline-sm` in `on_surface` for numbers.
*   **Secondary Context:** Use `label-md` in `on_surface_variant` for metadata.
*   **CTAs:** Always `title-sm` with medium weight for immediate recognition.

---

## 4. Elevation & Depth
Depth is a functional tool, not a decoration. We use **Tonal Layering** to convey importance.

### The Layering Principle
Stacking tiers creates a "soft lift."
- Place a `surface-container-lowest` card (Pure White) on a `surface-container-low` background. This creates a natural elevation without the need for high-contrast shadows.

### Ambient Shadows
For floating elements (Modals, Dropdowns):
- **Blur:** 32px to 64px.
- **Opacity:** 4% to 6%.
- **Color:** Use `on_surface` (#191c1e) with a slight blue tint rather than pure black to keep the shadows "airy."

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., in high-density maps):
- **Rule:** Use `outline_variant` at 20% opacity. **Never** use 100% opaque borders.

---

## 5. Components

### Buttons (The "Precision" Set)
*   **Primary:** Solid `primary` background. 12px (`xl`) rounded corners. Use the "Signature Texture" gradient for a premium feel.
*   **Secondary:** `surface-container-high` background with `on_surface` text. No border.
*   **Tertiary/Ghost:** No background. Underline only on hover to maintain a clean "ledger" look.

### Input Fields
*   **Style:** `surface-container-lowest` background. 
*   **Focus State:** Instead of a thick border, use a 2px `tertiary` (Teal) bottom-bar and a subtle `tertiary_container` glow.

### Cards & Data Visualization
*   **Forbid Dividers:** Do not use lines to separate list items. Use 16px-24px of vertical white space or a subtle hover shift to `surface-container-highest`.
*   **Match Scores:** Represent scores using high-contrast Teal (`tertiary_fixed`) against Deep Navy (`primary_container`). 
*   **Maps:** Use a "Silver/Water" custom map style. Desaturate all map elements and use `tertiary` (Teal) for data pips to ensure the tech-fintech aesthetic remains focused.

### Match Score Chips
*   **Construction:** Semi-transparent `tertiary_container` (Teal) background with `on_tertiary_container` text. This "glow" effect denotes intelligence and high-tech matching.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Negative Space:** If a section feels crowded, increase the padding by 50% rather than adding a border.
*   **Use Intentional Asymmetry:** Align headline text to the left while keeping data points right-aligned to create a dynamic, editorial flow.
*   **Tint Your Neutrals:** Always ensure your "greys" are pulled from the `surface_variant` (Slate Blue) palette to maintain a "high-tech navy" atmosphere.

### Don't:
*   **Don't use 1px Borders:** This is the quickest way to make a premium system look like a generic template. Use tonal shifts.
*   **Don't use Pure Black Shadows:** Use low-opacity, blue-tinted shadows for a "cloud" effect.
*   **Don't Overuse the Teal:** Teal is your "Energy" color. If everything is teal, nothing is important. Reserve it for primary actions and successful data matches.