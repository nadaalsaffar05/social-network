import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X, UserPlus, Users, Sparkle } from '@phosphor-icons/react'
import { getFollowRequests, respondToFollowRequest } from '../../../api/Profile.js'
import { BASE_API } from '../../../Config.js'
import GradientWaves from '../feed/components/GradientWaves.jsx'
import { GRADIENT_WAVE_PROPS } from '../feed/constants.js'
import '../../../styles/FollowRequestsPage.css'

function mediaUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${BASE_API}${normalized}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export default function FollowRequestsPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' })
  const [processingId, setProcessingId] = useState(null)
  const [failedAvatarIds, setFailedAvatarIds] = useState(new Set())

  useEffect(() => {
    let isMounted = true

    async function fetchRequests() {
      try {
        setLoading(true)
        setError('')
        const data = await getFollowRequests()
        if (isMounted) {
          setRequests(data)
        }
      } catch (err) {
        if (
          err.message === 'unauthorized' ||
          err.message === 'authentication required' ||
          err.message === 'session expired or invalid'
        ) {
          navigate('/login', { replace: true })
          return
        }
        if (isMounted) {
          setError(err.message || 'Failed to load follow requests')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchRequests()
    return () => {
      isMounted = false
    }
  }, [navigate])

  async function handleResponse(requestId, action) {
    setProcessingId(requestId)
    setActionMessage({ type: '', text: '' })
    try {
      await respondToFollowRequest(requestId, action)
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
      setActionMessage({
        type: 'success',
        text: action === 'accept' ? 'Follow request accepted!' : 'Follow request declined.',
      })
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || `Failed to ${action} follow request`,
      })
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <main className="follow-requests-layout">
      <div className="follow-requests-waves">
        <GradientWaves {...GRADIENT_WAVE_PROPS} />
      </div>

      <div className="follow-requests-container">
        <header className="follow-requests-header-card">
          <div className="follow-requests-header-left">
            <button
              type="button"
              className="follow-requests-back-btn"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <ArrowLeft size={20} weight="bold" />
            </button>
            <h1 className="follow-requests-title">
              Follow Requests
              {requests.length > 0 && (
                <span className="follow-requests-badge">{requests.length}</span>
              )}
            </h1>
          </div>
        </header>

        {actionMessage.text && (
          <div className={`follow-requests-message ${actionMessage.type}`}>
            {actionMessage.text}
          </div>
        )}

        {error && (
          <div className="follow-requests-message error">
            {error}
          </div>
        )}

        <section className="follow-requests-content">
          {loading ? (
            <div className="follow-requests-empty">
              <p className="follow-requests-empty-text">Loading follow requests...</p>
            </div>
          ) : requests.length > 0 ? (
            requests.map((req) => {
              const fullName = `${req.first_name || ''} ${req.last_name || ''}`.trim() || 'User'
              const handle = req.nickname ? `@${req.nickname}` : (req.email ? `@${req.email.split('@')[0]}` : '')
              const initials = `${req.first_name?.[0] ?? ''}${req.last_name?.[0] ?? ''}`.toUpperCase() || 'U'
              const avatarUrl = req.avatar_path && !failedAvatarIds.has(req.id) ? mediaUrl(req.avatar_path) : null
              const isProcessing = processingId === req.id

              return (
                <div key={req.id} className="follow-request-card">
                  <div
                    className="follow-request-user"
                    onClick={() => req.sender_id && navigate(`/profile/${req.sender_id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="follow-request-avatar"
                        onError={() => setFailedAvatarIds((prev) => new Set(prev).add(req.id))}
                      />
                    ) : (
                      <div className="follow-request-avatar-initials">{initials}</div>
                    )}
                    <div className="follow-request-info">
                      <h3 className="follow-request-name">{fullName}</h3>
                      {handle && <span className="follow-request-handle">{handle}</span>}
                      {req.created_at && (
                        <span className="follow-request-time">{formatDate(req.created_at)}</span>
                      )}
                    </div>
                  </div>

                  <div className="follow-request-actions">
                    <button
                      type="button"
                      className="btn-accept"
                      disabled={isProcessing}
                      onClick={() => handleResponse(req.id, 'accept')}
                    >
                      <Check size={16} weight="bold" />
                      {isProcessing ? 'Saving...' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      className="btn-decline"
                      disabled={isProcessing}
                      onClick={() => handleResponse(req.id, 'decline')}
                    >
                      <X size={16} weight="bold" />
                      Decline
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="follow-requests-empty">
              <UserPlus size={48} className="follow-requests-empty-icon" weight="duotone" />
              <h2 className="follow-requests-empty-title">No pending requests</h2>
              <p className="follow-requests-empty-text">
                When someone requests to follow your private account, their request will appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
