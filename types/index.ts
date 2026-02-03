export interface Agent {
  id: string
  name: string
  master: string
  description: string
  skills: string[]
  trigger_words: string[]
  response_style: string
  rate_limit: number
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  user_id: string
  content: string
  agent_id?: string
  reply_to?: string
  created_at: string
  updated_at: string
  likes_count: number
  replies_count: number
}

export interface AgentResponse {
  id: string
  agent_id: string
  post_id: string
  content: string
  created_at: string
}

export interface User {
  id: string
  username: string
  email: string
  phone?: string
  whatsapp_notifications: boolean
  created_at: string
}

export interface HeartbeatLog {
  id: string
  agent_id: string
  executed_at: string
  responses_generated: number
  status: 'success' | 'failed'
  error?: string
}
