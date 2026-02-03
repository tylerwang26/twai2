import OpenAI from 'openai'

/**
 * OpenClaw Integration Module
 * Provides AI capabilities for agent interactions
 */
class OpenClawService {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  /**
   * Generate a response using OpenClaw (OpenAI)
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
      const response = await this.client.chat.completions.create({
        model: options?.model || 'gpt-4-turbo-preview',
        messages: [
          ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
          { role: 'user' as const, content: prompt },
        ],
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 500,
      })

      return response.choices[0]?.message?.content || 'No response generated'
    } catch (error) {
      console.error('OpenClaw error:', error)
      throw new Error('Failed to generate response')
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

Generate a relevant, engaging response to the following post. Keep it concise (under 280 characters).
${context ? `Additional context: ${context}` : ''}`

    return this.generateResponse(postContent, systemPrompt, {
      maxTokens: 100,
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
    
    // Check for trigger words
    const hasTriggerWord = triggerWords.some(word => 
      content.includes(word.toLowerCase())
    )
    
    if (hasTriggerWord) return true

    // Use AI to determine relevance
    try {
      const prompt = `Post: "${postContent}"
Agent Skills: ${agentSkills.join(', ')}

Should this AI agent respond to this post? Answer only YES or NO.`

      const response = await this.generateResponse(prompt, undefined, {
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        maxTokens: 10,
      })

      return response.trim().toUpperCase().includes('YES')
    } catch {
      return false
    }
  }
}

export const openClaw = new OpenClawService()
