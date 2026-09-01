import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChatCircle, DotsThree, Trash } from '@phosphor-icons/react'

import { getProfile } from '../../api/profile.js'
import {
  deleteComment,
  deletePost,
  getComments,
  getPost,
  toggleCommentReaction,
  togglePostReaction,
} from '../../api/feed.js'
import GradientWaves from './components/GradientWaves.jsx'
import LikeButton from './components/LikeButton.jsx'
import PostCard from './components/PostCard.jsx'
import PostComposer from './components/PostComposer.jsx'
import { GRADIENT_WAVE_PROPS } from './constants.js'
import {
  formatPostTime,
  getMediaUrl,
  getPostDisplayName,
  getPostInitials,
} from './utils/post.js'
import './post-detail.css'

function Avatar({ item }) {
  const avatarPath = item?.author_avatar_path
  const initials = getPostInitials(item)

  if (avatarPath) {
    return <img className="post-detail-avatar" src={getMediaUrl(avatarPath)} alt="" />
  }

  return (
    <span className="post-detail-avatar post-detail-avatar--initials" aria-hidden="true">
      {initials}
    </span>
  )
}

function CommentItem({ comment, currentUserID, isReacting, isDeleting, onDelete, onLike, onReply }) {
  const isOwner = comment.author_id === currentUserID
  const authorHandle = comment.author_nickname ? `@${comment.author_nickname} · ` : ''

  return (
    <article className={`post-detail-comment${comment.parent_comment_id ? ' post-detail-comment--reply' : ''}`}>
      <Avatar item={comment} />
      <div>
        <header>
          <div className="post-detail-comment__author">
            <strong>{getPostDisplayName(comment)}</strong>
            <time dateTime={comment.created_at}>
              {authorHandle}{formatPostTime(comment.created_at, { detailed: true })}
            </time>
          </div>
          {isOwner && (
            <details className="post-detail-comment__menu">
              <summary aria-label="Comment options"><DotsThree size={21} weight="bold" /></summary>
              <button type="button" onClick={onDelete} disabled={isDeleting}>
                <Trash size={16} /> {isDeleting ? 'Deleting…' : 'Delete comment'}
              </button>
            </details>
          )}
        </header>

        <p>{comment.content}</p>

        {comment.media?.length > 0 && (
          <div className="post-detail-comment-media">
            {comment.media.map((path, index) => (
              <img key={path} src={getMediaUrl(path)} alt={`Comment media ${index + 1}`} />
            ))}
          </div>
        )}

        <footer>
          <button type="button" onClick={onReply}><ChatCircle size={19} /> Reply</button>
          <LikeButton
            liked={comment.viewer_reaction === 'LIKE'}
            count={comment.like_count}
            onClick={onLike}
            disabled={isReacting}
          />
        </footer>
      </div>
    </article>
  )
}

export default function PostPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [composer, setComposer] = useState({ isOpen: false, replyTo: null })
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reactingID, setReactingID] = useState('')
  const [deletingCommentID, setDeletingCommentID] = useState('')

  const loadPost = useCallback(async () => {
    const response = await getPost(postId)
    setPost(response.post)
  }, [postId])

  const loadComments = useCallback(async () => {
    const response = await getComments(postId)
    setComments(response.comments || [])
  }, [postId])

  useEffect(() => {
    let isMounted = true

    getProfile({ includePosts: false })
      .then((profile) => {
        if (isMounted) setCurrentUser(profile)
      })
      .catch(() => {
        if (isMounted) setCurrentUser(null)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadPostDetail() {
      setStatus('loading')
      setError('')

      try {
        await Promise.all([loadPost(), loadComments()])
        if (isMounted) setStatus('ready')
      } catch (requestError) {
        if (!isMounted) return
        setError(requestError.message || 'Could not load this post.')
        setStatus('error')
      }
    }

    void loadPostDetail()

    return () => {
      isMounted = false
    }
  }, [loadComments, loadPost])

  async function handlePostReaction() {
    setReactingID('post')

    try {
      const response = await togglePostReaction(postId, 'LIKE')
      setPost((currentPost) => currentPost && {
        ...currentPost,
        viewer_reaction: response.reaction_type,
        like_count: response.counts.LIKE,
        dislike_count: response.counts.DISLIKE,
      })
    } catch (requestError) {
      setError(requestError.message || 'Could not update reaction.')
    } finally {
      setReactingID('')
    }
  }

  async function handleCommentReaction(commentId) {
    setReactingID(commentId)

    try {
      const response = await toggleCommentReaction(postId, commentId, 'LIKE')
      setComments((currentComments) => currentComments.map((comment) => (
        comment.id === commentId
          ? {
              ...comment,
              viewer_reaction: response.reaction_type,
              like_count: response.counts.LIKE,
              dislike_count: response.counts.DISLIKE,
            }
          : comment
      )))
    } catch (requestError) {
      setError(requestError.message || 'Could not update reaction.')
    } finally {
      setReactingID('')
    }
  }

  function openCommentComposer(replyTo = null) {
    setComposer({ isOpen: true, replyTo })
  }

  function handleComposerOpenChange(isOpen) {
    setComposer((current) => ({
      isOpen,
      replyTo: isOpen ? current.replyTo : null,
    }))
  }

  async function handleCommentCreated() {
    await loadComments()
    setComposer({ isOpen: false, replyTo: null })
  }

  async function handleDeletePost() {
    if (!window.confirm('Delete this post?')) return

    try {
      await deletePost(postId)
      navigate('/home', { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Could not delete post.')
    }
  }

  async function handleDeleteComment(commentId) {
    if (!window.confirm('Delete this comment?')) return

    setDeletingCommentID(commentId)

    try {
      await deleteComment(postId, commentId)
      await loadComments()
    } catch (requestError) {
      setError(requestError.message || 'Could not delete comment.')
    } finally {
      setDeletingCommentID('')
    }
  }

  if (status === 'loading') {
    return <main className="post-detail-page"><p>Loading post…</p></main>
  }

  if (status === 'error' || !post) {
    return <main className="post-detail-page"><p>{error || 'Post not found.'}</p></main>
  }

  return (
    <main className="post-detail-page">
      <div className="post-detail-waves"><GradientWaves {...GRADIENT_WAVE_PROPS} /></div>

      <section className="post-detail-timeline">
        <header className="post-detail-topbar">
          <button type="button" aria-label="Go back" onClick={() => navigate('/home')}>
            <ArrowLeft size={23} />
          </button>
          <h1>Post</h1>
        </header>

        <div className="post-detail-feed-card">
          <PostCard
            post={post}
            currentUserID={currentUser?.id}
            isReacting={reactingID === 'post'}
            onLike={handlePostReaction}
            onComment={() => openCommentComposer()}
            onDelete={handleDeletePost}
            detailedTime
          />
        </div>

        <PostComposer
          postId={postId}
          replyTo={composer.replyTo}
          open={composer.isOpen}
          onOpenChange={handleComposerOpenChange}
          onCreated={handleCommentCreated}
        />

        {error && <p className="post-detail-error" role="alert">{error}</p>}

        <section className="post-detail-comments" aria-label="Replies">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserID={currentUser?.id}
              isReacting={reactingID === comment.id}
              isDeleting={deletingCommentID === comment.id}
              onDelete={() => handleDeleteComment(comment.id)}
              onLike={() => handleCommentReaction(comment.id)}
              onReply={() => openCommentComposer(comment)}
            />
          ))}

          {comments.length === 0 && <p className="post-detail-empty">No replies yet.</p>}
        </section>
      </section>
    </main>
  )
}
