const IMAGE_REGEX = /^\s*!\[(.*?)\]\(([^)]+)\)\s*$/
const SEPARATOR_REGEX = /^\s*\.?\s*$/

interface ImageInfo {
  src: string
  alt: string
}

function encodeForAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

/**
 * Detecta imagens consecutivas (2+) no markdown, separadas por
 * linhas vazias ou paragrafos ".", e substitui por uma tag
 * <image-carousel> que o MarkdownRenderer renderiza como carrossel.
 */
export function preprocessImageCarousels(content: string): string {
  const lines = content.split('\n')
  const result: string[] = []
  let currentGroup: ImageInfo[] = []
  let separatorBuffer: string[] = []

  function flushGroup() {
    if (currentGroup.length >= 2) {
      const srcs = currentGroup.map((img) => img.src).join('||')
      const alts = currentGroup.map((img) => img.alt).join('||')
      result.push('')
      result.push(
        `<image-carousel data-images="${encodeForAttr(srcs)}" data-alts="${encodeForAttr(alts)}"></image-carousel>`,
      )
      result.push('')
    } else if (currentGroup.length === 1) {
      result.push(`![${currentGroup[0].alt}](${currentGroup[0].src})`)
    }
    currentGroup = []
    separatorBuffer = []
  }

  for (const line of lines) {
    const imageMatch = line.match(IMAGE_REGEX)

    if (imageMatch) {
      separatorBuffer = []
      currentGroup.push({ alt: imageMatch[1], src: imageMatch[2] })
    } else if (SEPARATOR_REGEX.test(line) && currentGroup.length > 0) {
      separatorBuffer.push(line)
    } else {
      if (currentGroup.length > 0) {
        flushGroup()
      }
      for (const sep of separatorBuffer) {
        result.push(sep)
      }
      separatorBuffer = []
      result.push(line)
    }
  }

  if (currentGroup.length > 0) {
    flushGroup()
  }

  return result.join('\n')
}
