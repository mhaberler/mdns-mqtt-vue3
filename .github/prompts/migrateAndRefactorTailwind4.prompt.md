---
name: migrateAndRefactorTailwind4
description: Migrates project to Tailwind 4 and refactors layout for responsive window width handling.
argument-hint: [project type, responsiveness goals]
---
# Migrate and Refactor to Tailwind CSS v4
Migrate the current project to Tailwind CSS v4 and refactor the user interface to be fully responsive using Tailwind utilities.

## Requirements
1. **Dependency Migration**: Install `tailwindcss` and the corresponding build tool plugin (e.g., `@tailwindcss/vite`).
2. **Build Configuration**: Update the build configuration file (e.g., `vite.config.js`) to include the Tailwind plugin.
3. **CSS Integration**:
   - Update the main CSS file to use the `@import "tailwindcss";` syntax.
   - Define custom theme variables within the `@theme` block if specific brand colors or design tokens are present.
4. **Layout Refactoring**:
   - Identify and remove hardcoded width constraints (e.g., `max-width`, `min-width`) in global and scoped component styles.
   - Replace manual centering and layout logic with Tailwind's utility classes (e.g., `mx-auto`, `flex`, `grid`, `max-w-*`).
   - Implement responsive design patterns (e.g., full-width on mobile, centered/contained on desktop) using responsive modifiers like `md:`, `lg:`.
5. **Code Style**: Move existing CSS logic into the template as utility classes wherever possible to reduce reliance on external stylesheets.

Verify the migration by performing a successful production build and ensuring layout elements adapt correctly to changing window widths.
