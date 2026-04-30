import { getAuthAxios } from './authApi'

import { API_BASE } from './config'

export const getAttachments = async (params = {}) => {
  const authAxios = getAuthAxios()
  const sp = new URLSearchParams(params).toString()
  const url = sp ? `${API_BASE}/attachments/?${sp}` : `${API_BASE}/attachments/`
  const { data } = await authAxios.get(url)
  return data.results ?? data
}

export const getAttachment = async (id) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/attachments/${id}/`)
  return data
}

export const uploadAttachment = async (formData, signal = null) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.post(`${API_BASE}/attachments/`, formData, { signal })
  return data
}

export const deleteAttachment = async (id) => {
  const authAxios = getAuthAxios()
  await authAxios.delete(`${API_BASE}/attachments/${id}/`)
}

export const downloadAttachment = async (url, filename) => {
  const authAxios = getAuthAxios()
  const { data, headers } = await authAxios.get(url, { responseType: 'blob' })
  
  // The backend might send custom types like 'PDF' or 'IMAGE' instead of real MIME types.
  let mimeType = headers['content-type']
  if (mimeType === 'PDF' || (filename && filename.toLowerCase().endsWith('.pdf'))) {
    mimeType = 'application/pdf'
  } else if (mimeType === 'IMAGE') {
    mimeType = 'image/jpeg' // Fallback image type
  } else if (!mimeType || mimeType === 'application/octet-stream') {
    if (filename && filename.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf'
  }

  // Create a blob URL and trigger a download or open
  const blobUrl = window.URL.createObjectURL(new Blob([data], { type: mimeType }))
  const link = document.createElement('a')
  link.href = blobUrl
  
  if (filename) {
    link.setAttribute('download', filename) // Force download if filename provided
  } else {
    link.setAttribute('target', '_blank') // Open in new tab if no filename
  }
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000)
}
