/**
 * Загрузка картинок в документ.
 *
 * Файл читается в data URL, поэтому картинка переживает перезагрузку страницы.
 * Большие файлы уменьшаются: документ хранится в localStorage, а там всего
 * около пяти мегабайт на всё.
 */

/** Максимальная сторона картинки в пикселях. */
export const MAX_IMAGE_SIZE = 1024

export interface LoadedImage {
  src: string
  width: number
  height: number
}

/** Читает файл картинки и возвращает готовый к вставке результат. */
export async function loadImageFile(file: File): Promise<LoadedImage> {
  const source = await readAsDataUrl(file)
  const image = await decodeImage(source)
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height

  if (width <= MAX_IMAGE_SIZE && height <= MAX_IMAGE_SIZE) {
    return { src: source, width, height }
  }

  const scale = MAX_IMAGE_SIZE / Math.max(width, height)
  const scaled = { width: Math.round(width * scale), height: Math.round(height * scale) }

  const canvas = document.createElement('canvas')
  canvas.width = scaled.width
  canvas.height = scaled.height

  const context = canvas.getContext('2d')
  if (!context) return { src: source, width, height }

  context.drawImage(image, 0, 0, scaled.width, scaled.height)
  return { src: canvas.toDataURL('image/png'), width: scaled.width, height: scaled.height }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Не удалось прочитать файл'))
    reader.readAsDataURL(file)
  })
}

function decodeImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Файл не похож на изображение'))
    image.src = source
  })
}
