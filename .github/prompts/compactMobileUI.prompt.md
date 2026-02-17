---
name: compactMobileUI
description: Make a component's UI compact and mobile-first to match a reference component's styling.
argument-hint: The file or component to compact, and optionally a reference component whose style to match.
---
Make the specified component's template compact and mobile-friendly, matching the density and sizing patterns of the reference component (or general mobile-first best practices if no reference is given).

Apply these systematic changes throughout the template:

1. **Padding**: Reduce container padding (e.g., `p-4`/`p-5` → `p-3`, with responsive `md:p-6`). Reduce card/section inner padding similarly.
2. **Margins/gaps**: Tighten vertical spacing between sections (e.g., `mb-6` → `mb-3`, `gap-3` → `gap-2`/`gap-1.5`).
3. **Typography**: Reduce heading sizes (e.g., `text-2xl` → `text-lg`), body text (e.g., `text-sm` → `text-xs`), and labels/timestamps to smallest legible size (e.g., `text-[10px]`).
4. **Border radius**: Use smaller radii (e.g., `rounded-xl` → `rounded-lg` or `rounded-md`).
5. **Buttons**: Compact with smaller padding (`py-1.5 px-3`) and `text-sm`.
6. **Inputs/textareas**: Reduce padding and font size; fewer rows for textareas.
7. **Icons/indicators**: Scale down decorative elements (spinners, empty-state icons, status dots).
8. **Scroll containers**: Reduce max-height for mobile viewport (e.g., `max-h-[60vh]` → `max-h-[50vh]`).
9. **Layout**: Prefer flat row layouts over stacked card wrappers where possible. Use `truncate`/`min-w-0` for text overflow.
10. **Remove**: Unnecessary wrapper cards, animations, and verbose labels that waste space on mobile.

Preserve all functionality, reactivity, and conditional rendering. Only change styling classes and static text (e.g., shorten labels). Remove any computed properties or data that become unused after the changes.

After editing, verify that the project's type-check and build still pass.
