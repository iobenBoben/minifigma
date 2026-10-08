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

## Project layout

```
src/
  constants/   палитра, инструменты, значения по умолчанию
  types/       модели данных
  utils/       геометрия, дерево слоёв, раскладка, векторные пути
  hooks/       состояние документа, камера, горячие клавиши
  components/  Canvas, Shape, Toolbar, LayersPanel, PropertiesPanel
```

Учебный проект
