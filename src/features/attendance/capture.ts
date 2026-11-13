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
