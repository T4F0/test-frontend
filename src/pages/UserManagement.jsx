import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsers, deleteUser } from '../api/authApi'

const ROLE_LABELS = {
  'MEDECIN': 'Medecin',
  'COORDINATEUR': 'Coordinator',
  'ADMIN': 'Administrator'
}

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await getUsers()
      setUsers(Array.isArray(data) ? data : (data?.results || []))
      setError(null)
    } catch (err) {
      setError('Failed to load users')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(id)
        setUsers(users.filter(u => u.id !== id))
      } catch (err) {
        setError('Failed to delete user')
      }
    }
  }

  if (loading) return <div className="loading">Loading users...</div>

  return (
    <div className="users-management">
      <div className="users-header">
        <h2>User Management</h2>
        <button onClick={() => navigate('/users/new')} className="btn-primary">
          + Add User
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {users.length === 0 ? (
        <div className="empty">No users found</div>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Hospital</th>
              <th>Specialty</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.first_name} {user.last_name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`badge badge-${user.role.toLowerCase()}`}>
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                </td>
                <td>{user.hospital || '-'}</td>
                <td>{user.specialty || '-'}</td>
                <td className="actions">
                  <button 
                    onClick={() => navigate(`/users/${user.id}/edit`)}
                    className="btn-small"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(user.id)}
                    className="btn-small btn-danger"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
