import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send } from 'lucide-react'

/**
 * Real-time chat sidebar for the conference.
 */
export default function ChatSidebar({
  messages,
  onSendMessage,
  isOpen,
  onToggle,
  currentUserId,
}) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    onSendMessage(text)
    setInput('')
  }

  if (!isOpen) return null

  return (
    <div className="sidebar chat-sidebar">
      <div className="sidebar-header">
        <h3>
          <MessageSquare size={18} />
          Chat
        </h3>
        <button className="sidebar-close" onClick={onToggle}>×</button>
      </div>
      <div className="sidebar-content chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">No messages yet. Start the conversation!</div>
        )}
        {messages.map((msg, i) => (
          <div
            key={msg.message_id || i}
            className={`chat-message ${msg.message_type === 'SYSTEM' ? 'system-message' : ''} ${
              msg.sender_user_id === currentUserId ? 'own-message' : ''
            }`}
          >
            {msg.message_type === 'SYSTEM' ? (
              <div className="system-text">{msg.content}</div>
            ) : (
              <>
                <div className="message-header">
                  <span className="message-sender">{msg.sender_name}</span>
                  <span className="message-time">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div className="message-content">{msg.content}</div>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input" onSubmit={handleSend}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          autoComplete="off"
        />
        <button type="submit" disabled={!input.trim()} title="Send">
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}
