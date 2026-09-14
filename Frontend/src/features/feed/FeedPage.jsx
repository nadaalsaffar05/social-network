import './FeedPage.css'
import '../../shared/styles/components/PostComposer.css'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { followUser, getFollowers, getFollowing, getProfile, searchUsers, unfollowUser } from '../../api/profile.js'
import { togglePostReaction } from '../../api/feed.js'
import FeedNavigation from './components/FeedNavigation.jsx'
import GradientWaves from './components/GradientWaves.jsx'
import PostComposer from './components/PostComposer.jsx'
import PostCard from './components/PostCard.jsx'
import { GRADIENT_WAVE_PROPS } from './constants.js'
import { useFeed } from './hooks/useFeed.js'
import { useChatRealtime } from '../chat/realtime/useChatRealtime.js'
import Avatar from '../../shared/components/avatar/Avatar.jsx'

function getProfileName(profile) {
  return (
    profile?.nickname ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    'Your profile'
  )
}

function OnlineFriend({ user, onOpen }) {
  return (
    <li className="feed-online-users__item">
      <button type="button" className="feed-online-users__button" onClick={onOpen}>
        <span className="feed-online-users__avatar-wrap">
          <Avatar
            avatarPath={user.avatar_path}
            seed={user.id}
            className="feed-online-users__avatar"
          />
          <span className="feed-online-users__status" aria-label="Online" />
        </span>
        <span className="feed-online-users__copy">
          <strong>{getProfileName(user)}</strong>
          <small>Online</small>
        </span>
      </button>
    </li>
  )
}

export default function FeedPage() {
  const navigate = useNavigate()
  const { posts, status, error, hasMore, refresh, loadMore, removePost, updatePost } = useFeed()
  const [currentUserID, setCurrentUserID] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [deletingPostID, setDeletingPostID] = useState('')
  const [operationError, setOperationError] = useState('')
  const [reactingPostID, setReactingPostID] = useState('')
  const [friendIDs, setFriendIDs] = useState(new Set())
  const [followingIDs, setFollowingIDs] = useState(new Set())
  const [requestedIDs, setRequestedIDs] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const { onlineUsers } = useChatRealtime()

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

  useEffect(() => {
    let active = true

    Promise.all([getFollowers(), getFollowing()])
      .then(([followers, followingUsers]) => {
        if (!active) return
        const followerIDs = new Set(followers.map((user) => user.id))
        const nextFollowingIDs = new Set(followingUsers.map((user) => user.id))
        setFollowingIDs(nextFollowingIDs)
        setFriendIDs(new Set([...nextFollowingIDs].filter((userID) => followerIDs.has(userID))))
      })
      .catch(() => {
        if (active) setFriendIDs(new Set())
        if (active) setFollowingIDs(new Set())
      })

    return () => { active = false }
  }, [])

  const visibleOnlineUsers = onlineUsers.filter((user) => user.id !== currentUserID && friendIDs.has(user.id))

  useEffect(() => {
    const query = searchQuery.trim()
    if (query.length < 2) {
      return
    }

    const timer = window.setTimeout(() => {
      searchUsers(query)
        .then((response) => setSearchResults(response.users ?? []))
        .catch(() => setSearchResults([]))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  const visibleSearchResults = searchQuery.trim().length >= 2 ? searchResults : []

  async function handleDelete(postID) {
    if (!window.confirm('Delete this post?')) return

    setDeletingPostID(postID)
    setOperationError('')

    try {
      await removePost(postID)
    } catch (requestError) {
      setOperationError(requestError.message || 'Failed to delete the post')
    } finally {
      setDeletingPostID('')
    }
  }

  async function handlePostReaction(postID, reactionType) {
    setReactingPostID(postID)
    setOperationError('')

    try {
      const response = await togglePostReaction(postID, reactionType)
      updatePost(postID, {
        viewer_reaction: response.reaction_type,
        like_count: response.counts.LIKE,
        dislike_count: response.counts.DISLIKE,
      })
    } catch (requestError) {
      setOperationError(requestError.message || 'Failed to update reaction')
    } finally {
      setReactingPostID('')
    }
  }

  async function handleFollowUser(userID) {
    try {
      const response = await followUser(userID)
      if (response.status === 'following') {
        setFollowingIDs((current) => new Set(current).add(userID))
      } else if (response.status === 'pending') {
        setRequestedIDs((current) => new Set(current).add(userID))
      }
    } catch (requestError) {
      setOperationError(requestError.message || 'Failed to follow this user')
    }
  }

  async function handleUnfollowUser(userID) {
    try {
      await unfollowUser(userID)
      setFollowingIDs((current) => {
        const next = new Set(current)
        next.delete(userID)
        return next
      })
      setFriendIDs((current) => {
        const next = new Set(current)
        next.delete(userID)
        return next
      })
    } catch (requestError) {
      setOperationError(requestError.message || 'Failed to unfollow this user')
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
              <span>loop</span>
            </button>
          </div>
          <div className="feed-search-wrap">
            <label className="feed-search">
              <MagnifyingGlass size={19} weight="bold" aria-hidden="true" />
              <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search users" aria-label="Search users" />
            </label>
            {visibleSearchResults.length > 0 && (
              <ul className="feed-search-results" aria-label="Search results">
                {visibleSearchResults.map((user) => (
                  <li key={user.id}>
                    <button type="button" onClick={() => navigate(`/profile/${user.id}`)}>
                      <span>{getProfileName(user)}</span>
                      {user.nickname && <small>@{user.nickname}</small>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
              <p className="feed-message">No posts to show yet</p>
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
                onAuthorOpen={() => navigate(`/profile/${post.author_id}`)}
                onFollow={followingIDs.has(post.author_id) ? () => handleUnfollowUser(post.author_id) : () => handleFollowUser(post.author_id)}
                followLabel={followingIDs.has(post.author_id) ? 'Unfollow' : (requestedIDs.has(post.author_id) ? 'Requested' : 'Follow')}
                followDisabled={requestedIDs.has(post.author_id)}
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
            <Avatar
              avatarPath={currentUser?.avatar_path}
              seed={currentUser?.id}
              className="feed-profile-avatar"
            />
            <span>
              <span className="feed-sidebar-label">Profile</span>
              <strong>{getProfileName(currentUser)}</strong>
            </span>
          </button>

          <section className="feed-sidebar-panel">
            <span className="feed-sidebar-label">Your feed</span>
            <h2>Catch up with your circle</h2>
            <p>Posts from people you follow will appear here as they share</p>
          </section>

          <section className="feed-sidebar-panel feed-online-users" aria-label="Online friends">
            <div className="feed-online-users__heading">
              <h2>Active friends</h2>
              <span>{visibleOnlineUsers.length}</span>
            </div>
            {visibleOnlineUsers.length === 0 ? (
              <p className="feed-online-users__empty">No friends are online</p>
            ) : (
              <ul className="feed-online-users__list">
                {visibleOnlineUsers.map((user) => (
                  <OnlineFriend
                    key={user.id}
                    user={user}
                    onOpen={() => navigate(`/messages/${user.id}`)}
                  />
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  )
}
