import '../../../styles/feed.css'
import '../../../styles/post-composer.css'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { getProfile } from '../../../api/Profile.js'
import { togglePostReaction } from '../../../api/feed.js'
import FeedNavigation from './components/FeedNavigation.jsx'
import GradientWaves from './components/GradientWaves.jsx'
import PostComposer from './components/PostComposer.jsx'
import PostCard from './components/PostCard.jsx'
import { GRADIENT_WAVE_PROPS } from './constants.js'
import { useFeed } from './hooks/useFeed.js'
import { getMediaUrl } from './utils/post.js'

function getProfileName(profile) {
  return (
    profile?.nickname ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    'Your profile'
  )
}

function getProfileInitials(profile) {
  return `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase()
}

export default function FeedPage() {
  const navigate = useNavigate()
  const { posts, status, error, hasMore, refresh, loadMore, removePost } = useFeed()
  const [currentUserID, setCurrentUserID] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [deletingPostID, setDeletingPostID] = useState('')
  const [operationError, setOperationError] = useState('')
  const [reactingPostID, setReactingPostID] = useState('')

  useEffect(() => {
    getProfile({ includePosts: false })
      .then((profile) => {
        setCurrentUser(profile)
        setCurrentUserID(profile.id)
      })
      .catch(() => {
        setCurrentUser(null)
        setCurrentUserID('')
      })
  }, [])

  async function handleDelete(postID) {
    if (!window.confirm('Delete this post?')) return

    setDeletingPostID(postID)
    setOperationError('')

    try {
      await removePost(postID)
    } catch (requestError) {
      setOperationError(requestError.message || 'Could not delete the post.')
    } finally {
      setDeletingPostID('')
    }
  }

  async function handlePostReaction(postID, reactionType) {
    setReactingPostID(postID)
    setOperationError('')

    try {
      await togglePostReaction(postID, reactionType)
      await refresh()
    } catch (requestError) {
      setOperationError(requestError.message || 'Could not update reaction.')
    } finally {
      setReactingPostID('')
    }
  }

  return (
    <main className="feed-page">
      <div className="feed-waves"><GradientWaves {...GRADIENT_WAVE_PROPS} /></div>
      <header className="feed-topbar">
        <div className="feed-topbar__inner">
          <div className="feed-title">
            <button className="feed-title__brand" type="button" onClick={() => navigate('/home')}>
              <img src="/loop-logo.png" alt="" />
              <span>Loop</span>
            </button>
          </div>
          <label className="feed-search">
            <MagnifyingGlass size={19} weight="bold" aria-hidden="true" />
            <input type="search" placeholder="Search users, groups, and posts" aria-label="Search users, groups, and posts" />
          </label>
        </div>
      </header>

      <aside className="feed-left-sidebar">
        <FeedNavigation />
      </aside>

      <div className="feed-layout">
        <section className="feed-main">
          <PostComposer onCreated={refresh} />

          <section className="feed-posts" aria-label="Feed posts">
            {status === 'loading' && (
              <p className="feed-message">Loading posts…</p>
            )}

            {status === 'error' && (
              <div className="feed-message feed-error" role="alert">
                <p>Couldn’t load the feed: {error}</p>
                <button type="button" onClick={refresh}>
                  Try again
                </button>
              </div>
            )}

            {status !== 'loading' && !error && posts.length === 0 && (
              <p className="feed-message">No posts to show yet.</p>
            )}

            {operationError && (
              <p className="feed-message feed-error" role="alert">
                {operationError}
              </p>
            )}

            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserID={currentUserID}
                isReacting={reactingPostID === post.id}
                isDeleting={deletingPostID === post.id}
                onLike={() => handlePostReaction(post.id, 'LIKE')}
                onComment={() => navigate(`/posts/${post.id}`)}
                onDelete={() => handleDelete(post.id)}
                onOpen={() => navigate(`/posts/${post.id}`)}
              />
            ))}

            {hasMore && (
              <button
                className="feed-load-more"
                type="button"
                onClick={loadMore}
                disabled={status === 'loading-more'}
              >
                {status === 'loading-more' ? 'Loading…' : 'Load more'}
              </button>
            )}
          </section>
        </section>

        <aside className="feed-right-sidebar">
          <button
            className="feed-sidebar-card feed-profile-card"
            type="button"
            onClick={() => navigate('/profile')}
          >
            {currentUser?.avatar_path ? (
              <img
                className="feed-profile-avatar"
                src={getMediaUrl(currentUser.avatar_path)}
                alt=""
              />
            ) : (
              <span className="feed-profile-avatar feed-profile-initials" aria-hidden="true">
                {getProfileInitials(currentUser)}
              </span>
            )}
            <span>
              <span className="feed-sidebar-label">Profile</span>
              <strong>{getProfileName(currentUser)}</strong>
            </span>
          </button>

          <section className="feed-sidebar-panel">
            <span className="feed-sidebar-label">Your feed</span>
            <h2>Catch up with your circle.</h2>
            <p>Posts from people you follow will appear here as they share.</p>
          </section>
        </aside>
      </div>
    </main>
  )
}
