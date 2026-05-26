# Design System: Triage

## 1. Visual Theme And Atmosphere

A restrained operations console with warm charcoal depth, paper-tinted text, precise spacing, and purposeful motion. The dashboard is dense enough for daily queue work without feeling cramped. The widget is compact, brandable, and quiet. The playground is more editorial and demonstrative, with stronger composition and product context.

## 2. Color Palette And Roles

- **Charcoal Canvas** (`#11100E`) is the application background.
- **Smoked Surface** (`#181715`) is the primary raised surface.
- **Pressed Surface** (`#211F1C`) is used for controls, rows, and selected states.
- **Paper Text** (`#F5EFE5`) is primary text.
- **Ash Text** (`#A49B8E`) is supporting text and metadata.
- **Moss Signal** (`#B8D66B`) is the single primary accent for calls to action, focus, and active states.
- **Critical Clay** (`#E66A5C`) marks urgent escalations.
- **Amber Review** (`#D99A3D`) marks expedited work.

## 3. Typography Rules

- Dashboard and widget UI use Geist Sans with Geist Mono for identifiers, counts, and technical metadata.
- Serif display type is avoided inside the dashboard and widget.
- Headings should be compact and weight-led, not oversized.
- Body copy should stay below 75 characters per line where possible.

## 4. Component Styling

- Buttons are tactile and flat, with inner borders and no outer neon glow.
- Cards are used only for grouped tools, repeated entities, and framed previews.
- Tables and queues should rely on row dividers, tint, and spacing instead of heavy boxes.
- Inputs always use labels above the control, visible focus states, and stable heights.
- Loading states should preserve layout dimensions. Avoid using a lone spinner where a skeleton can show structure.

## 5. Layout Principles

- The dashboard uses a sticky top shell and a wide max-width workspace.
- Queue pages favor scan lines and compact filters.
- Settings and widget configuration keep dense controls in full-width sections.
- Mobile layouts collapse to one column and preserve 44px touch targets.
- Avoid nested cards.

## 6. Motion And Interaction

- Motion is subtle: opacity and transform only.
- Hover states should clarify interactivity without shifting layout.
- Active states move by 1px or slightly compress.
- Respect reduced motion globally.

## 7. Anti-Patterns

- No emojis.
- No pure black or pure white.
- No gradient text.
- No neon outer glow.
- No generic purple or blue SaaS gradient.
- No identical feature-card grids for product surfaces.
- No vague copy such as "seamless", "unleash", or "next generation".
