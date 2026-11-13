export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function validateSelectedPhoto(file: File): string | null {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    return 'Chỉ hỗ trợ ảnh định dạng JPG, PNG hoặc WEBP.'
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return 'Dung lượng ảnh vượt quá 5 MB. Vui lòng chọn ảnh nhỏ hơn.'
  }
  if (file.size === 0) {
    return 'Tệp ảnh không có nội dung.'
  }
  return null
}

export async function validatePhotoSignature(file: File): Promise<string | null> {
  const bytes = new Uint8Array(await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Không đọc được tệp ảnh. Vui lòng chọn lại ảnh Timemark.'))
    reader.readAsArrayBuffer(file.slice(0, 12))
  }))
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const png = bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => bytes[i] === byte)
  const webp = bytes.length >= 12 && [0x52, 0x49, 0x46, 0x46].every((byte, i) => bytes[i] === byte)
    && [0x57, 0x45, 0x42, 0x50].every((byte, i) => bytes[i + 8] === byte)
  if ((file.type === 'image/jpeg' && jpeg) || (file.type === 'image/png' && png) || (file.type === 'image/webp' && webp)) return null
  return 'Nội dung ảnh không khớp định dạng JPG, PNG hoặc WEBP. Vui lòng xuất lại ảnh gốc từ Timemark.'
}
