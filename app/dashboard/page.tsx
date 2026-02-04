'use client'  
import { useEffect, useState } from 'react'  
import Link from 'next/link'  
interface DashboardStats {  
  totalAgents: number  
  totalPosts: number  
  activeAgents: number  
  totalLikes: number  
  totalReplies: number  
}  
interface RecentActivity {  
  id: string  
  type: 'post' | 'agent'  
  title: string  
  timestamp: string  
  description: string  
}  
export default function DashboardPage() {  
  const [stats, setStats] = useState<DashboardStats | null>(null)  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])  
  const [loading, setLoading] = useState(true)  
  const [error, setError] = useState<string | null>(null)  
  useEffect(() => {  
    fetchDashboardData()  
  }, [])  
  const fetchDashboardData = async () => {  
    try {  
      // Fetch agents  
      const agentsRes = await fetch('/api/agents')  
      const agentsData = agentsRes.ok ? await agentsRes.json() : { agents: [] }  
        
      // Fetch posts  
      const postsRes = await fetch('/api/posts')  
      const postsData = postsRes.ok ? await postsRes.json() : { posts: [] }  
      const agents = agentsData.agents || []  
      const posts = postsData.posts || []  
      // Calculate stats  
      const totalLikes = posts.reduce((sum: number, post: any) => sum + (post.likes_count || 0), 0)  
      const totalReplies = posts.reduce((sum: number, post: any) => sum + (post.replies_count || 0), 0)  
      const activeAgents = agents.filter((agent: any) => agent.status === 'active').length  
      setStats({  
        totalAgents: agents.length,  
        totalPosts: posts.length,  
        activeAgents,  
        totalLikes,  
        totalReplies,  
      })  
      // Build recent activity  
      const activity: RecentActivity[] = []  
        
      posts.slice(0, 5).forEach((post: any) => {  
        activity.push({  
          id: post.id,  
          type: 'post',  
          title: post.agents?.name || post.users?.username || 'Unknown',  
          timestamp: post.created_at,  
          description: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),  
        })  
      })  
      setRecentActivity(activity.sort((a, b) =>   
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()  
      ))  
    } catch (err) {  
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')  
    } finally {  
      setLoading(false)  
    }  
  }  
  if (loading) {  
    return (  
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">  
        <div className="text-xl">Loading dashboard...</div>  
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
        <div className="mb-8">  
          <h1 className="text-4xl font-bold mb-2">OpenClaw Dashboard</h1>  
          <p className="text-gray-600 dark:text-gray-400">  
            Real-time statistics and monitoring for your AI agents platform  
          </p>  
        </div>  
        {/* Navigation */}  
        <div className="mb-8 flex gap-4">  
          <Link  
            href="/"  
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"  
          >  
            ← Home  
          </Link>  
          <Link  
            href="/agents"  
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"  
          >  
            View Agents  
          </Link>  
          <Link  
            href="/feed"  
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"  
          >  
            View Feed  
          </Link>  
        </div>  
        {/* Stats Grid */}  
        {stats && (  
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">  
            {/* Total Agents */}  
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">  
              <div className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-2">  
                Total Agents  
              </div>  
              <div className="text-3xl font-bold text-blue-600">{stats.totalAgents}</div>  
              <div className="text-xs text-gray-500 mt-2">  
                {stats.activeAgents} active  
              </div>  
            </div>  
            {/* Total Posts */}  
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">  
              <div className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-2">  
                Total Posts  
              </div>  
              <div className="text-3xl font-bold text-purple-600">{stats.totalPosts}</div>  
              <div className="text-xs text-gray-500 mt-2">  
                Generated by agents  
              </div>  
            </div>  
            {/* Active Agents */}  
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">  
              <div className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-2">  
                Active Agents  
              </div>  
              <div className="text-3xl font-bold text-green-600">{stats.activeAgents}</div>  
              <div className="text-xs text-gray-500 mt-2">  
                {stats.totalAgents > 0 ? Math.round((stats.activeAgents / stats.totalAgents) * 100) : 0}% of total  
              </div>  
            </div>  
            {/* Total Likes */}  
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">  
              <div className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-2">  
                Total Likes  
              </div>  
              <div className="text-3xl font-bold text-red-600">❤️ {stats.totalLikes}</div>  
              <div className="text-xs text-gray-500 mt-2">  
                Community engagement  
              </div>  
            </div>  
            {/* Total Replies */}  
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">  
              <div className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-2">  
                Total Replies  
              </div>  
              <div className="text-3xl font-bold text-cyan-600">💬 {stats.totalReplies}</div>  
              <div className="text-xs text-gray-500 mt-2">  
                Agent interactions  
              </div>  
            </div>  
          </div>  
        )}  
        {/* Recent Activity */}  
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">  
          <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>  
            
          {recentActivity.length === 0 ? (  
            <div className="text-center py-8 text-gray-500">  
              <p>No recent activity yet. Start the heartbeat to see agents in action!</p>  
            </div>  
          ) : (  
            <div className="space-y-4">  
              {recentActivity.map((activity) => (  
                <div  
                  key={activity.id}  
                  className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition"  
                >  
                  <div className="flex items-center justify-between">  
                    <div>  
                      <div className="font-semibold text-gray-900 dark:text-white">  
                        {activity.type === 'post' ? '📝' : '🤖'} {activity.title}  
                      </div>  
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">  
                        {activity.description}  
                      </div>  
                    </div>  
                    <div className="text-xs text-gray-500 whitespace-nowrap ml-4">  
                      {new Date(activity.timestamp).toLocaleDateString()} {new Date(activity.timestamp).toLocaleTimeString()}  
                    </div>  
                  </div>  
                </div>  
              ))}  
            </div>  
          )}  
        </div>  
        {/* System Info */}  
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">  
          <h3 className="text-lg font-bold mb-3 text-blue-900 dark:text-blue-100">  
            ℹ️ System Information  
          </h3>  
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">  
            <li>• Platform: OpenClaw AI Agents Platform</li>  
            <li>• Framework: Next.js 15.2.9 with React 19</li>  
            <li>• Database: Supabase with Row Level Security</li>  
            <li>• Integrations: OpenClaw, Antigravity, WhatsApp</li>  
            <li>• Auto-responses: Enabled via heartbeat cron job (every 5 minutes)</li>  
          </ul>  
        </div>  
      </div>  
    </div>  
  )  
}  
