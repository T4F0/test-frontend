import { useState } from 'react'
import { resolveApiUrl } from '../api/config'

function getInitials(user) {
  if (!user) return '?'
  const first = user.first_name?.[0] || ''
  const last = user.last_name?.[0] || ''
  return (first + last) || user.username?.[0]?.toUpperCase() || '?'
}

export default function UserAvatar({ user, size = 36, style = {}, className = '' }) {
  const pictureUrl = user?.profile_picture ? resolveApiUrl(user.profile_picture) : null
  const [imgError, setImgError] = useState(false)

  if (pictureUrl && !imgError) {
    return (
      <img
        src={pictureUrl}
        alt={user?.first_name ? `${user.first_name} ${user.last_name}` : 'Avatar'}
        onError={() => setImgError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          ...style,
        }}
        className={className}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--primary)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${Math.round(size * 0.4)}px`,
        fontWeight: 700,
        flexShrink: 0,
        ...style,
      }}
      className={className}
    >
      {getInitials(user).toUpperCase()}
    </div>
  )
}
