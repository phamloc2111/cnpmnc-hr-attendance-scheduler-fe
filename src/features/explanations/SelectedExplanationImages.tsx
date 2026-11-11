import { useEffect, useState } from 'react'

function Preview({ file }: { file: File }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  return src ? <img src={src} alt={file.name} /> : null
}

export function SelectedExplanationImages({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  if (!files.length) return null
  return <div className="explanation-images explanation-selected-images" aria-label="Ảnh đã chọn">{files.map((file, index) =>
    <div className="explanation-selected-image" key={index}><Preview file={file} /><span title={file.name}>{file.name}</span><button type="button" onClick={() => onRemove(index)} aria-label={`Xóa ảnh ${file.name}`}>×</button></div>
  )}</div>
}
