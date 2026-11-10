// Shared by the window and service worker. Clearing this before logout also blocks late in-flight pushes.
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('shiftsync-push', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('state')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Không thể lưu tùy chọn thông báo.'))
    request.onblocked = () => reject(new Error('Hãy đóng các tab cũ rồi thử lại.'))
  })
}
export async function writeBinding(employeeId: string | null) {
  const db = await database()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('state', 'readwrite')
      transaction.objectStore('state').put(employeeId, 'employeeId')
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error('Không thể lưu tùy chọn thông báo.'))
      transaction.onabort = () => reject(new Error('Không thể lưu tùy chọn thông báo.'))
    })
  } finally { db.close() }
}
export async function readBinding() {
  const db = await database()
  try {
    return await new Promise<string | null>((resolve, reject) => {
      const request = db.transaction('state').objectStore('state').get('employeeId')
      request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null)
      request.onerror = () => reject(new Error('Không thể đọc tùy chọn thông báo.'))
    })
  } finally { db.close() }
}
