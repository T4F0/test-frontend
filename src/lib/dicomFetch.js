import { getAuthAxios } from '../api/authApi'
import { resolveApiUrl } from '../api/config'

// Fetch several buffers with a small concurrency cap, preserving order
export async function fetchBuffers(urls, isCancelled, onProgress) {
  const authAxios = getAuthAxios()
  const results = new Array(urls.length)
  let next = 0
  let done = 0
  const worker = async () => {
    while (next < urls.length && !isCancelled()) {
      const i = next++
      const res = await authAxios.get(resolveApiUrl(urls[i]), { responseType: 'arraybuffer' })
      results[i] = res.data
      onProgress?.(++done, urls.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, urls.length) }, worker))
  return results
}
