import { useNavigate } from 'react-router-dom'
import { UserPlus, Bell } from '@phosphor-icons/react'
import './HeaderNav.css'

export default function HeaderNav({
  followRequestCount = 0,
  notificationCount = 0,
  onNotificationsClick,
}) {
  const navigate = useNavigate()

  function handleFollowRequests() {
    navigate('/follow-requests')
  }

  function handleNotifications() {
    if (onNotificationsClick) {
      onNotificationsClick()
    } else {
      navigate('/notifications')
    }
  }

  return (
    <div className="header-nav" role="toolbar" aria-label="Header navigation">

      <button
        type="button"
        id="header-nav-follow-requests"
        className="header-nav__btn"
        onClick={handleFollowRequests}
        aria-label="Follow requests"
        title="Follow requests"
      >
        <UserPlus size={22} weight="regular" />
        {followRequestCount > 0 && (
          <span className="header-nav__badge" aria-label={`${followRequestCount} follow requests`}>
            {followRequestCount > 99 ? '99+' : followRequestCount}
          </span>
        )}
      </button>

      <div className="header-nav__divider" aria-hidden="true" />


      <button
        type="button"
        id="header-nav-notifications"
        className="header-nav__btn"
        onClick={handleNotifications}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={22} weight="regular" />
        {notificationCount > 0 && (
          <span className="header-nav__badge" aria-label={`${notificationCount} notifications`}>
            {notificationCount > 99 ? '99+' : notificationCount}
          </span>
        )}
      </button>
    </div>
  )
}
