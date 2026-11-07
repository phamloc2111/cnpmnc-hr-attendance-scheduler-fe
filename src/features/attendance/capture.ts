import { instantLabel } from '../../shared/utils/dates'

export function freshLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Trình duyệt không hỗ trợ định vị. Hãy dùng HTTPS hoặc localhost và bật GPS.')); return }
    navigator.geolocation.getCurrentPosition(resolve, error => reject(new Error(
      error.code === 1 ? 'Bạn chưa cho phép định vị. Hãy cấp quyền vị trí trong trình duyệt; chưa có lượt điểm danh nào được ghi nhận.'
        : error.code === 3 ? 'Lấy vị trí quá thời gian chờ. Hãy bật GPS và thử lại.' : 'Không lấy được vị trí. Hãy bật GPS và thử lại.'
    )), { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 })
  })
}

export async function capturePhoto(video: HTMLVideoElement, position: GeolocationPosition) {
  if (!video.videoWidth || !video.videoHeight) throw new Error('Camera chưa sẵn sàng. Vui lòng đợi và thử lại.')
  const capturedAt = new Date(Date.now()).toISOString()
  const canvas = document.createElement('canvas')
  const ratio = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight))
  canvas.width = Math.round(video.videoWidth * ratio); canvas.height = Math.round(video.videoHeight * ratio)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Trình duyệt không thể xử lý ảnh camera.')
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  const font = Math.max(12, Math.round(canvas.width / 40)), line = font * 1.6
  const footerHeight = line * 4
  context.fillStyle = '#10213fe6'; context.fillRect(0, canvas.height - footerHeight, canvas.width, footerHeight)
  context.fillStyle = 'white'; context.font = `600 ${font}px sans-serif`
  const lines = ['ShiftSync · Ảnh chụp mới', instantLabel(capturedAt) + ' (UTC+7)',
    `GPS: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
    `Độ chính xác: ±${Math.round(position.coords.accuracy)} m`]
  lines.forEach((text, index) => context.fillText(text, font, canvas.height - footerHeight + line * (index + .85)))
  const photo = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Không tạo được ảnh camera.')), 'image/jpeg', .88))
  return { photo, capturedAt }
}
