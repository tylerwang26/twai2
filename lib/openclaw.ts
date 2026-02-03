import axios from 'axios'

/**
 * OpenClaw Integration Module (using Antigravity + Gemini)
 * Provides AI capabilities for agent interactions
 */
class OpenClawService {
  private apiKey: string
  private apiUrl: string
  private model: string

  constructor() {
    this.apiKey = process.env.ANTIGRAVITY_API_KEY || ''
    this.apiUrl = process.env.ANTIGRAVITY_API_URL || 'https://api.antigravity.com'
    this.model = process.env.GEMINI_MODEL || 'gemini-3-flash'
    
    if (!this.apiKey) {
      console.warn('⚠️ Antigravity API key not configured')
    }
  }

  /**
   * Generate a response using Antigravity + Gemini
   */
  async generateResponse(
    prompt: string,
    systemPrompt?: string,
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
    }
  ): Promise<string> {
    try {
      // Combine system prompt and user prompt
      const messages = []
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        })
      }
      messages.push({
        role: 'user',
        content: prompt
      })

      const response = await axios.post(
        `${this.apiUrl}/v1/chat/completions`,
        {
          model: options?.model || this.model,
          messages: messages,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 500,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds timeout
        }
      )

      // Handle different possible response formats
      const content = response.data?.choices?.[0]?.message?.content 
        || response.data?.text 
        || response.data?.response 
        || 'No response generated'

      return content
    } catch (error: any) {
      console.error('❌ Antigravity/Gemini error:', error.response?.data || error.message)
      
      // Provide more detailed error information
      if (error.response) {
        console.error('Status:', error.response.status)
        console.error('Data:', error.response.data)
      }
      
      throw new Error(`Failed to generate response: ${error.message}`)
    }
  }

  /**
   * Generate a contextual reply for an agent based on post content
   */
  async generateAgentReply(
    agentConfig: {
      name: string
      description: string
      skills: string[]
      responseStyle: string
    },
    postContent: string,
    context?: string
  ): Promise<string> {
    const systemPrompt = `You are ${agentConfig.name}, an AI agent on a social platform.
Description: ${agentConfig.description}
Skills: ${agentConfig.skills.join(', ')}
Response Style: ${agentConfig.responseStyle}

Generate a relevant, engaging response to the following post. Keep it concise (under 280 characters like a tweet).
Be helpful, friendly, and stay in character.
${context ? `Additional context: ${context}` : ''}`

    return this.generateResponse(postContent, systemPrompt, {
      maxTokens: 150,
    })
  }

  /**
   * Analyze if an agent should respond to a post
   */
  async shouldRespond(
    agentSkills: string[],
    triggerWords: string[],
    postContent: string
  ): Promise<boolean> {
    const content = postContent.toLowerCase()
    
    // Check for trigger words first (fast path)
    const hasTriggerWord = triggerWords.some(word => 
      content.includes(word.toLowerCase())
    )
    
    if (hasTriggerWord) {
      console.log('✅ Trigger word found, agent should respond')
      return true
    }

    // Use AI to determine relevance based on skills
    try {
      const prompt = `Post content: "${postContent}"

Agent's skills: ${agentSkills.join(', ')}

Based on the agent's skills, should this AI agent respond to the post above? 
Consider if the post topic matches the agent's expertise.

Answer with only "YES" or "NO".`

      const response = await this.generateResponse(prompt, undefined, {
        model: this.model, // Use fast model for quick decisions
        temperature: 0.3,
        maxTokens: 10,
      })

      const shouldRespond = response.trim().toUpperCase().includes('YES')
      console.log(`🤖 AI decision: ${shouldRespond ? 'RESPOND' : 'SKIP'}`)
      
      return shouldRespond
    } catch (error) {
      console.error('⚠️ Error in shouldRespond, defaulting to false:', error)
      return false
    }
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generateResponse(
        'Hello! Please respond with "OK" if you can read this.',
        undefined,
        { maxTokens: 20 }
      )
      
      console.log('✅ API connection successful:', response)
      return true
    } catch (error) {
      console.error('❌ API connection failed:', error)
      return false
    }
  }
}

export const openClaw = new OpenClawService()
