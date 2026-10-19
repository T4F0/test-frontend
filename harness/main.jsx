import React from 'react'
import * as cst from '@cornerstonejs/tools'
window.cst = cst
import ReactDOM from 'react-dom/client'
import DicomViewer from '../src/components/conference/LazyDicomViewer'
const q = new URLSearchParams(location.search)
const id = q.get('id') || '1'
const present = q.get('present') === '1'
window.__ws = { viewport: 0, annotation: 0, bytes: 0 }
const count = (k) => (...a) => { window.__ws[k] += 1; try { window.__ws.bytes += JSON.stringify(a).length } catch (e) {} ; return true }
localStorage.setItem('access_token', 'x')
ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <div id="stage"><DicomViewer file={{ id, name: 't.dcm', file_type: 'DICOM' }} onClose={() => {}}
      {...(present ? { onBroadcastViewportSync: count('viewport'), onBroadcastPresenterMode: count('presenter'), onBroadcastAnnotationSync: count('annotation'), currentUserId: 'me' } : {})} /></div>
  </>,
)
