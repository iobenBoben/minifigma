import type { Shape } from '../types/shape'
import { buildPathData } from './vector'

/**
 * Экспорт документа в PNG.
 *
 * Документ перерисовывается на обычный canvas теми же средствами, что и на экране:
 * без внешних библиотек и без скриншотов вкладки браузера.
 */

export interface ExportOptions {
  /** Множитель размера: 2 — картинка вдвое крупнее, чётче на retina. */
  scale?: number
  /** Отступ вокруг содержимого в пикселях. */
  padding?: number
  /** Прозрачный фон вместо цвета холста. */
  transparent?: boolean
}

export interface ExportResult {
  dataUrl: string
  width: number
  height: number
}

const BACKGROUND = '#0a0c11'

/** Границы содержимого документа в координатах холста. */
export function documentBounds(shapes: Shape[]): { x: number; y: number; width: number; height: number } {
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity

  const visit = (nodes: Shape[], offsetX: number, offsetY: number) => {
    for (const node of nodes) {
      if (!node.visible) continue
      const x = offsetX + node.x
      const y = offsetY + node.y
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x + node.width)
      bottom = Math.max(bottom, y + node.height)
      visit(node.children, x, y)
    }
  }

  visit(shapes, 0, 0)

  if (!Number.isFinite(left)) return { x: 0, y: 0, width: 1, height: 1 }
  return { x: left, y: top, width: Math.max(right - left, 1), height: Math.max(bottom - top, 1) }
}

/** Рисует документ на canvas и отдаёт готовый PNG. */
export async function exportToPng(
  shapes: Shape[],
  options: ExportOptions = {},
): Promise<ExportResult> {
  const scale = options.scale ?? 2
  const padding = options.padding ?? 24
  const bounds = documentBounds(shapes)

  const width = Math.ceil((bounds.width + padding * 2) * scale)
  const height = Math.ceil((bounds.height + padding * 2) * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Браузер не дал доступ к canvas')

  if (!options.transparent) {
    context.fillStyle = BACKGROUND
    context.fillRect(0, 0, width, height)
  }

  context.save()
  context.scale(scale, scale)
  context.translate(-bounds.x + padding, -bounds.y + padding)
  await drawShapes(context, shapes)
  context.restore()

  return { dataUrl: canvas.toDataURL('image/png'), width, height }
}

async function drawShapes(
  context: CanvasRenderingContext2D,
  shapes: Shape[],
): Promise<void> {
  for (const shape of shapes) {
    if (!shape.visible) continue
    await drawShape(context, shape)
  }
}

async function drawShape(
  context: CanvasRenderingContext2D,
  shape: Shape,
): Promise<void> {
  context.save()
  context.globalAlpha = shape.opacity / 100
  context.translate(shape.x, shape.y)

  if (shape.shadow) {
    context.shadowColor = shape.shadow.color
    context.shadowBlur = shape.shadow.blur
    context.shadowOffsetX = shape.shadow.offsetX
    context.shadowOffsetY = shape.shadow.offsetY
  }

  const centerX = shape.width / 2
  const centerY = shape.height / 2

  if (shape.rotation) {
    context.translate(centerX, centerY)
    context.rotate((shape.rotation * Math.PI) / 180)
    context.translate(-centerX, -centerY)
  }

  if (shape.type === 'frame' || shape.type === 'group') {
    if (shape.type === 'frame' && shape.strokeWidth > 0 && shape.stroke !== 'transparent') {
      context.strokeStyle = shape.stroke
      context.lineWidth = shape.strokeWidth
      context.strokeRect(0, 0, shape.width, shape.height)
    }
    await drawShapes(context, shape.children)
    context.restore()
    return
  }

  if (shape.type === 'image') {
    await drawImage(context, shape)
    context.restore()
    return
  }

  if (shape.type === 'vector') {
    const path = new Path2D(buildPathData(shape.vector.vertices, shape.vector.closed))
    if (shape.fill !== 'transparent') {
      context.fillStyle = shape.fill
      context.fill(path)
    }
    if (shape.strokeWidth > 0 && shape.stroke !== 'transparent') {
      context.strokeStyle = shape.stroke
      context.lineWidth = shape.strokeWidth
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.stroke(path)
    }
    context.restore()
    return
  }

  if (shape.type === 'text') {
    context.fillStyle = shape.fill
    context.font = `${shape.text.fontStyle === 'Bold' ? '700' : '400'} ${shape.text.fontSize}px ${shape.text.fontFamily}, sans-serif`
    context.textAlign = shape.text.textAlign.toLowerCase() as 'left' | 'center' | 'right'
    context.textBaseline = 'top'
    const lines = shape.text.content.split('\n')
    const lineHeight = shape.text.lineHeight
    const x = shape.text.textAlign === 'CENTER' ? centerX : shape.text.textAlign === 'RIGHT' ? shape.width : 0
    lines.forEach((line, index) => {
      context.fillText(line, x, index * lineHeight)
    })
    context.restore()
    return
  }

  // Прямоугольник и эллипс.
  const path = new Path2D()
  if (shape.type === 'ellipse') {
    path.ellipse(centerX, centerY, shape.width / 2, shape.height / 2, 0, 0, Math.PI * 2)
  } else {
    const radius = Math.min(shape.radius, shape.width / 2, shape.height / 2)
    path.roundRect(0, 0, shape.width, shape.height, radius)
  }

  if (shape.fill !== 'transparent') {
    context.fillStyle = shape.fill
    context.fill(path)
  }

  if (shape.strokeWidth > 0 && shape.stroke !== 'transparent') {
    context.strokeStyle = shape.stroke
    context.lineWidth = shape.strokeWidth
    context.stroke(path)
  }

  context.restore()
}

async function drawImage(context: CanvasRenderingContext2D, shape: Shape): Promise<void> {
  if (!shape.image.src) return

  try {
    const image = await loadImage(shape.image.src)
    context.drawImage(image, 0, 0, shape.width, shape.height)
  } catch {
    // Битая картинка не должна срывать весь экспорт.
  }
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Не удалось загрузить картинку'))
    image.src = source
  })
}

/** Открывает PNG в новой вкладке и предлагает сохранить файл. */
export function downloadPng(result: ExportResult, fileName = 'mini-figma.png'): void {
  const link = document.createElement('a')
  link.href = result.dataUrl
  link.download = fileName
  link.click()
}
