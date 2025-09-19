# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Canvas Editor Interaction Cheatsheet

Core selection & navigation:
- Click: Select a single node.
- Shift / Ctrl + Click: Add/remove nodes from selection.
- Drag on empty space: Marquee select (hold Shift/Ctrl to toggle in/out).
- Right‑Click: Open context menu (Group / Ungroup / Re-enable Aspect when applicable).
- Middle Mouse / Alt+Left Drag / Space+Drag: Pan (Spacebar enables temporary panning mode).
- Mouse Wheel: Zoom to cursor.

Transform & geometry:
- Drag corner/edge handles: Resize freely (non-uniform allowed).
- Shift + Drag handle: Constrain resize to original aspect ratio.
- Alt/Option + Drag handle: Centered scaling (expands/shrinks symmetrically about center).
- Shift + Alt + Drag: Centered uniform scaling.
- Rotate handle: Free rotation (snaps at 0/90/180/270°).

Rectangle tool:
- Activate: toolbar button or press `R` (toggle).
- Draw: Click-drag on empty canvas to create rectangle.
- Shift while dragging: Constrain to square.
- Alt while dragging: Center-out creation (start point becomes center). Shift+Alt: centered square.
- Release mouse to finalize; tool auto-switches back to Select; new rect is selected.

Text glyph scaling:
- Text nodes distort (squash/stretch) their glyphs when resized; the box itself does not reflow text.
- Shift during text resize: Uniform glyph scale (maintain original distortion ratio).
- Alt: Centered glyph scaling; Shift+Alt combines both behaviors.
- Context Menu → Reset Text Scale: Restore glyph scale to 1× (removes distortion).

Images:
- Non-uniform resize of an aspect-preserving image: Switches to stretched mode (aspect disabled).
- Context Menu → Re-enable Aspect: Restores aspect mode (uses existing or fallback `contain` fit).
- Shift constraint still works after restoring aspect.

Grouping:
- Ctrl/Cmd + G: Group selected nodes.
- Ctrl/Cmd + Shift + G: Ungroup (when a single group is selected).

Editing:
- Delete / Backspace: Remove selected nodes.
- Ctrl/Cmd + D: Duplicate selection.
- Arrow Keys: Nudge 1px.
- Shift + Arrow Keys: Nudge 10px.

Layer ordering (z-order within same parent):
- Context Menu → Move Forward: Move each selected node one step closer to front (cannot pass another selected node).
- Context Menu → Move Lower: Move each selected node one step toward back.
- Context Menu → Move To Top: Bring selected nodes to front (relative order preserved among them).
- Context Menu → Move To Bottom: Send selected nodes to back (relative order preserved).

Rotation & Baking:
- Transform changes are baked on mouse release: live Konva transform is reset while persisted spec stores final position, size, rotation.

Notes:
- Aspect behavior for images is controlled by `preserveAspect` + `objectFit` (cover/contain). Stretched images have `preserveAspect=false`.
- Any subsequent non-uniform scale of a restored aspect image will disable aspect again.
 - Text scaling persists as `textScaleX` / `textScaleY` in the spec; resetting sets both to 1.

