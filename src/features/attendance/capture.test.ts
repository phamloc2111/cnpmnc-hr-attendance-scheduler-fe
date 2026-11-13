import { expect, it } from 'vitest'
import { validateSelectedPhoto } from './capture'

it('accepts valid JPEG, PNG and WEBP photos within 5 MB', () => {
  const jpeg = new File(['dummy-content'], 'test.jpg', { type: 'image/jpeg' })
  const png = new File(['dummy-content'], 'test.png', { type: 'image/png' })
  const webp = new File(['dummy-content'], 'test.webp', { type: 'image/webp' })

  expect(validateSelectedPhoto(jpeg)).toBeNull()
  expect(validateSelectedPhoto(png)).toBeNull()
  expect(validateSelectedPhoto(webp)).toBeNull()
})

it('rejects unsupported file formats', () => {
  const gif = new File(['dummy-content'], 'test.gif', { type: 'image/gif' })
  const pdf = new File(['dummy-content'], 'test.pdf', { type: 'application/pdf' })

  expect(validateSelectedPhoto(gif)).toContain('JPG, PNG hoặc WEBP')
  expect(validateSelectedPhoto(pdf)).toContain('JPG, PNG hoặc WEBP')
})

it('rejects files exceeding 5 MB limit', () => {
  const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' })
  expect(validateSelectedPhoto(oversized)).toContain('vượt quá 5 MB')
})

it('rejects empty files', () => {
  const empty = new File([], 'empty.jpg', { type: 'image/jpeg' })
  expect(validateSelectedPhoto(empty)).toContain('không có nội dung')
})
