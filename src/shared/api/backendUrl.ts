type BackendEnvironment = {
  VITE_API_BASE_URL?: string
  VITE_API_LOCAL_BASE_URL?: string
  VITE_API_CLOUD_BASE_URL?: string
}

export function resolveBackendApiUrl(mode: string, environment: BackendEnvironment): string {
  const configured = mode === 'backend-local'
    ? environment.VITE_API_LOCAL_BASE_URL?.trim() || 'http://localhost:8080'
    : mode === 'backend-cloud'
      ? environment.VITE_API_CLOUD_BASE_URL?.trim()
      : environment.VITE_API_BASE_URL?.trim() ?? 'http://localhost:8080'
  if (configured === undefined || (mode === 'backend-cloud' && configured === '')) {
    throw new Error('Chưa cấu hình VITE_API_CLOUD_BASE_URL. Điền URL backend cloud trong fe/.env hoặc môi trường hosting.')
  }
  // Preserve existing same-origin deployments configured with an explicitly empty base URL.
  if (configured === '') return '/api/v1'
  let url: URL
  try { url = new URL(configured) }
  catch { throw new Error('URL backend phải là địa chỉ HTTP hoặc HTTPS hợp lệ.') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('URL backend phải dùng HTTP/HTTPS, không chứa thông tin đăng nhập, query hoặc fragment.')
  }
  const path = url.pathname.replace(/\/+$/, '')
  return url.origin + (path.endsWith('/api/v1') ? path : path + '/api/v1')
}
