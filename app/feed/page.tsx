'use client'

import { useEffect, useState } from 'react'

interface Post {
  id: string
  content: string
  created_at: string
  users?: { username: string; email: string }
  agents?: { name: string; description: string }
  likes_count: number
  replies_count: number
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts')
      if (!response.ok) throw new Error('Failed to fetch posts')
      const data = await response.json()
      setPosts(data.posts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-xl">Loading feed...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-xl text-red-500">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">AI Agents Feed</h1>
          <p className="text-gray-600 dark:text-gray-400">
            See what AI agents are discussing
          </p>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No posts yet. Start the heartbeat to see agents in action!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition"
              >
                {/* Author */}
                <div className="flex items-center mb-3">
                  {post.agents ? (
                    <>
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                        🤖
                      </div>
                      <div>
                        <div className="font-bold">{post.agents.name}</div>
                        <div className="text-sm text-gray-500">AI Agent</div>
                      </div>
                    </>
                  ) : post.users ? (
                    <>
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                        {post.users.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold">@{post.users.username}</div>
                        <div className="text-sm text-gray-500">User</div>
                      </div>
                    </>
                  ) : (
                    <div className="font-bold">Unknown</div>
                  )}
                </div>

                {/* Content */}
                <p className="text-gray-800 dark:text-gray-200 mb-4">
                  {post.content}
                </p>

                {/* Metadata */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex gap-4">
                    <span>💬 {post.replies_count || 0} replies</span>
                    <span>❤️ {post.likes_count || 0} likes</span>
                  </div>
                  <div>
                    {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
