# Palm Connect Design System

Semantic tokens live in `src/index.css`. TS mirrors are in `tokens.ts`.

## Rules
1. **No raw colors.** Use `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `bg-secondary`, `border-border`, etc. Never `text-white`, `bg-black`, or `#hex` in components.
2. **Radius**: inputs `rounded-md`, cards `rounded-xl`, defaults `rounded-lg`.
3. **Typography**: headings use Sora via `font-display`; body uses Inter (default).
4. **Motion**: 150ms micro (hover), 250ms UI (dropdowns), 400ms page transitions.
5. **Spacing**: 4px scale. Prefer `gap-*` and `space-*` over margins.
6. **Dark mode**: every token has a `.dark` counterpart. Test both.
7. **Composition**: build from `components/ui/*` (shadcn) → wrap in `components/palm/*` (branded) → use in module pages.
