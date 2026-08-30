import { useCallback, useEffect, useState } from 'react'

import { deletePost, getFeed } from '../../../../api/feed.js'

const INITIAL_CURSOR = ''
const STATUS = {
  LOADING: 'loading',
  LOADING_MORE: 'loading-more',
  READY: 'ready',
  ERROR: 'error',
}

export function useFeed() {
  const [posts, setPosts] = useState([])
  const [nextCursor, setNextCursor] = useState(INITIAL_CURSOR)
  const [status, setStatus] = useState(STATUS.LOADING)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setStatus(STATUS.LOADING)
    setError(null)

    try {
      const { posts: nextPosts = [], next_cursor: cursor = INITIAL_CURSOR } = await getFeed()
      setPosts(nextPosts)
      setNextCursor(cursor)
      setStatus(STATUS.READY)
    } catch (requestError) {
      setError(requestError.message)
      setStatus(STATUS.ERROR)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (!nextCursor || status === STATUS.LOADING_MORE) return

    setStatus(STATUS.LOADING_MORE)
    setError(null)

    try {
      const { posts: nextPosts = [], next_cursor: cursor = INITIAL_CURSOR } = await getFeed({
        cursor: nextCursor,
      })

      setPosts((currentPosts) => [...currentPosts, ...nextPosts])
      setNextCursor(cursor)
      setStatus(STATUS.READY)
    } catch (requestError) {
      setError(requestError.message)
      setStatus(STATUS.READY)
    }
  }, [nextCursor, status])

  const removePost = useCallback(async (postId) => {
    await deletePost(postId)
    setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId))
  }, [])

  useEffect(() => {
    async function loadInitialFeed() {
      await refresh()
    }

    void loadInitialFeed()

  }, [refresh])

  return {
    posts,
    error,
    status,
    hasMore: Boolean(nextCursor),
    refresh,
    loadMore,
    removePost,
  }
}
