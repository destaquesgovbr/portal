import { describe, expect, it } from 'vitest'
import { markdownToHtml } from '../markdown-to-html'

describe('markdownToHtml', () => {
  it('converts basic markdown to HTML', async () => {
    const html = await markdownToHtml('# Hello\n\nWorld')
    expect(html).toContain('<h1>Hello</h1>')
    expect(html).toContain('<p>World</p>')
  })

  it('supports GFM tables', async () => {
    const md = '| Col1 | Col2 |\n| --- | --- |\n| A | B |'
    const html = await markdownToHtml(md)
    expect(html).toContain('<table>')
    expect(html).toContain('<td>A</td>')
  })

  it('supports GFM strikethrough', async () => {
    const html = await markdownToHtml('~~deleted~~')
    expect(html).toContain('<del>deleted</del>')
  })

  it('supports GFM autolinks', async () => {
    const html = await markdownToHtml('Visit https://gov.br')
    expect(html).toContain('<a href="https://gov.br">')
  })

  it('preserves raw HTML (rehype-raw)', async () => {
    const html = await markdownToHtml('<div class="custom">Content</div>')
    expect(html).toContain('<div class="custom">Content</div>')
  })

  it('converts links', async () => {
    const html = await markdownToHtml('[Gov.br](https://gov.br)')
    expect(html).toContain('<a href="https://gov.br">Gov.br</a>')
  })

  it('converts images', async () => {
    const html = await markdownToHtml('![Alt](https://example.com/img.jpg)')
    expect(html).toContain('<img')
    expect(html).toContain('src="https://example.com/img.jpg"')
    expect(html).toContain('alt="Alt"')
  })

  it('returns empty string for empty input', async () => {
    expect(await markdownToHtml('')).toBe('')
  })

  it('returns empty string for null-like input', async () => {
    expect(await markdownToHtml(undefined as unknown as string)).toBe('')
  })

  it('truncates very long content', async () => {
    const longContent = 'a'.repeat(60_000)
    const html = await markdownToHtml(longContent)
    expect(html).toContain('[...]')
  })

  it('does not truncate content under limit', async () => {
    const content = 'Normal content'
    const html = await markdownToHtml(content)
    expect(html).not.toContain('[...]')
    expect(html).toContain('Normal content')
  })
})
