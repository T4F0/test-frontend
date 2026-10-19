import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'

function Video({ stream, id }) {
  return <video data-peer={id} autoPlay playsInline muted style={{ width: 160, height: 90, background: '#111' }} ref={(el) => { if (el && el.srcObject !== stream) el.srcObject = stream }} />
}

export function mount(useHook) {
  const q = new URLSearchParams(location.search)
  const me = q.get('u'); const room = q.get('room') || 'r'
  localStorage.setItem('access_token', me)
  function App() {
    const api = useHook(room, me, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {})
    window.__rtc = api
    useEffect(() => { api.connect({ lobbyMode: false }) }, [])
    return (
      <div>
        <div id="state">{String(api.isConnected)}</div>
        {Object.entries(api.remoteStreams).map(([id, st]) => <Video key={id} id={id} stream={st} />)}
      </div>
    )
  }
  ReactDOM.createRoot(document.getElementById('root')).render(<App />)
}
