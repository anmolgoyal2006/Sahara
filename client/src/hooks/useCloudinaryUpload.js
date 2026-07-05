import { useState, useCallback } from 'react'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  const upload = useCallback(async (file) => {
    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      // Validate file
      const maxSizeMB = 10
      if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`File too large. Maximum size is ${maxSizeMB}MB.`)
      }

      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/webp',
        'application/pdf'
      ]
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only JPG, PNG, WebP, and PDF files are allowed.')
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', UPLOAD_PRESET)
      formData.append('folder', 'sahara/medical')

      // Use XMLHttpRequest for progress tracking
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error('Upload failed. Please try again.'))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed. Check your connection.'))
        })

        xhr.open(
          'POST',
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`
        )
        xhr.send(formData)
      })

      setProgress(100)

      return {
        url: result.secure_url,
        publicId: result.public_id,
        fileType: file.type.includes('pdf') ? 'pdf' : 'image',
        fileName: file.name,
        fileSizeKb: Math.round(file.size / 1024)
      }

    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setUploading(false)
    }
  }, [])

  return { upload, uploading, progress, error }
}
