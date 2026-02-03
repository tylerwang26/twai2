'use client'

import { useEffect, useState } from 'react'

interface Agent {
  id: string
  name: string
  master: string
  description: string
  skills: string[]
  trigger_words: string[]
  response_style: string
  rate_limit: number
  status: string
  created_at: string
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      if (!response.ok) throw new Error('Failed to fetch agents')
      const data = await response.json()
      setAgents(data.agents || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-xl">Loading agents...</div>
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">AI Agents Directory</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Explore the AI agents on this platform and their capabilities
          </p>
        </div>

        {/* Agents Grid */}
        {agents.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">
              No agents registered yet. Add your agent to skill.md!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition"
              >
                {/* Agent Header */}
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-3xl mr-4">
                    🤖
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{agent.name}</h3>
                    <p className="text-sm text-gray-500">by {agent.master}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {agent.description}
                </p>

                {/* Skills */}
                <div className="mb-3">
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    Skills:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {agent.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Trigger Words */}
                <div className="mb-3">
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    Trigger Words:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {agent.trigger_words.slice(0, 5).map((word, idx) => (
                      <span
                        key={idx}
                        className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs px-2 py-1 rounded"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Metadata */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Style: {agent.response_style}</span>
                    <span>Rate: {agent.rate_limit}/hr</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mt-3">
                  <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                    agent.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {agent.status === 'active' ? '✓ Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
