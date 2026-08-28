// src/app/pages/feed/hooks/useFeed.js
import { useCallback, useEffect, useState } from 'react'
import { getFeed } from '../../../../api/feed.js'

export function useFeed() {
  const [posts, setPosts] = useState([])
  const [nextCursor, setNextCursor] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setStatus('loading')
    setError(null)

    try {
      const { posts: nextPosts = [], next_cursor: cursor = '' } = await getFeed()

      setPosts(nextPosts)
      setNextCursor(cursor)
      setStatus('ready')
    } catch (requestError) {
      setError(requestError.message)
      setStatus('error')
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (!nextCursor || status === 'loading-more') return

    setStatus('loading-more')
    setError(null)

    try {
      const { posts: nextPosts = [], next_cursor: cursor = '' } = await getFeed({
        cursor: nextCursor,
      })

      setPosts((currentPosts) => [...currentPosts, ...nextPosts])
      setNextCursor(cursor)
      setStatus('ready')
    } catch (requestError) {
      setError(requestError.message)
      setStatus('ready')
    }
  }, [nextCursor, status])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    posts,
    error,
    status,
    hasMore: Boolean(nextCursor),
    refresh,
    loadMore,
  }
}