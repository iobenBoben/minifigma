# Mini Figma

A small React + TypeScript + Tailwind CSS canvas prototype built with Vite.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — type-check and create a production build
- `npm run lint` — run oxlint
- `npm run preview` — preview the production build

## Current interactions

- Frame, rectangle, ellipse, text and vector pen tools: `F`, `R`, `O`, `T`, `P`, `V` for select
- Pan with Space + primary mouse button
- Zoom from 10% to 400% with the mouse wheel
- Centered initial viewport and a reset control
- Layers tree with nesting, collapse, reordering by drag, visibility and lock toggles
- Drawing inside a frame nests the new shape into it
- Auto layout for frames: direction, gap, padding, align and justify
- Vector pen with Bezier handles, open or closed path
- Resize handles with Shift for equal sides, `Ctrl+D` to duplicate, `Delete` to remove
- Document is autosaved to `localStorage` under `mini-figma:document:v1`

## Added features

- **Images** — drag an image file onto the canvas or pick one with the image button in the
  toolbar. Large files are scaled down to 1024 px and stored inside the document as a data URL.
- **Undo and redo** — `Ctrl+Z` and `Ctrl+Shift+Z` (`Ctrl+Y` as well). A drag counts as a single
  step, not one step per mouse frame.
- **Copy and paste** — `Ctrl+C` and `Ctrl+V`. The clipboard also holds the plain JSON of the
  shape, so a figure can be pasted into another tab.
- **Layer order** — bring to front, send to back, bring forward and send backward in the
  properties panel. A layer only changes its place among its own siblings.
- **Grab offset** — a shape follows the cursor from the exact point it was grabbed.
- **Groups** — select several shapes with `Shift` and press `Ctrl+G` to group them,
  `Ctrl+Shift+G` to ungroup. Moving a group moves its contents, resizing scales them.
- **Export PNG** — the button in the header saves the document as a PNG at double resolution.
  The second button saves it with a transparent background.
- **Shadow** — a drop shadow with offset, blur and color on any shape.
- **Stroke** — stroke color and width for every shape type, not only for vectors.

## Project layout

```
src/
  constants/   палитра, инструменты, значения по умолчанию
  types/       модели данных
  utils/       геометрия, дерево слоёв, раскладка, векторные пути, картинки, экспорт
  hooks/       состояние документа с историей, камера, горячие клавиши
  components/  Canvas, Shape, Toolbar, LayersPanel, PropertiesPanel
```

Учебный проект
