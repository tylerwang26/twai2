import { supabaseAdmin } from './supabase'

/**
 * Enhanced AI Agent Intelligence and Learning System
 */

interface Agent {
  id: string
  name: string
  description: string
  skills: string[]
  trigger_words: string[]
  response_style: string
}

interface Post {
  id: string
  content: string
  user_id?: string
  agent_id?: string
  likes_count: number
  replies_count: number
}

interface Personality {
  traits: {
    formality: number
    enthusiasm: number
    depth: number
    empathy: number
    humor: number
    creativity: number
  }
  evolution_stage: number
  total_interactions: number
}

/**
 * Check if agent should respond based on personality and content
 */
export async function shouldAgentRespond(agent: Agent, post: Post): Promise<boolean> {
  const content = post.content.toLowerCase()
  
  // Don't respond to own posts
  if (post.agent_id === agent.id) return false
  
  // Check trigger words
  const hasTriggerWord = agent.trigger_words.some((word: string) =>
    content.includes(word.toLowerCase())
  )
  
  if (hasTriggerWord) return true
  
  // Check skills match
  const hasRelevantSkill = agent.skills.some((skill: string) =>
    content.includes(skill.toLowerCase())
  )
  
  if (hasRelevantSkill) return true
  
  // Get personality for spontaneous engagement
  try {
    const { data: personality } = await supabaseAdmin
      .from('agent_personalities')
      .select('*')
      .eq('agent_id', agent.id)
      .single()
    
    if (personality) {
      // More enthusiastic agents respond more often
      const enthusiasmThreshold = personality.traits.enthusiasm / 10
      const randomChance = Math.random()
      
      if (randomChance < enthusiasmThreshold * 0.3) {
        return true
      }
    }
  } catch (error) {
    // Personality table might not exist yet, continue with basic logic
  }
  
  return false
}

/**
 * Generate intelligent response based on personality and learned patterns
 */
export async function generateIntelligentResponse(
  agent: Agent, 
  post: Post,
  personality?: Personality
): Promise<string> {
  const content = post.content.toLowerCase()
  
  // Try to get personality traits if not provided
  if (!personality) {
    try {
      const { data } = await supabaseAdmin
        .from('agent_personalities')
        .select('*')
        .eq('agent_id', agent.id)
        .single()
      
      personality = data || undefined
    } catch (error) {
      // Continue without personality
    }
  }
  
  // Base response templates
  let responses: string[] = []
  
  // Adjust response based on personality traits
  if (personality?.traits) {
    const { traits } = personality
    
    // Enthusiasm level
    if (traits.enthusiasm > 7) {
      responses.push(
        `This is fascinating! `,
        `I'm really excited about this! `,
        `Wow, great point! `
      )
    } else if (traits.enthusiasm < 4) {
      responses.push(
        `I see. `,
        `Noted. `,
        `Understood. `
      )
    } else {
      responses.push(
        `Interesting perspective. `,
        `Good point. `,
        `I appreciate this. `
      )
    }
    
    // Empathy level
    if (traits.empathy > 7) {
      responses.push(
        `I really understand where you're coming from. `,
        `That resonates with me. `,
        `Thank you for sharing this. `
      )
    }
    
    // Depth level
    if (traits.depth > 7) {
      responses.push(
        `Let me elaborate on this: `,
        `There are multiple dimensions to consider. `,
        `To fully explore this topic, `
      )
    } else if (traits.depth < 4) {
      responses.push(
        `In short: `,
        `Simply put: `,
        `Quick thought: `
      )
    }
    
    // Humor level
    if (traits.humor > 7 && Math.random() > 0.5) {
      responses.push(
        `Ha! `,
        `Not gonna lie, that's pretty good. `,
        `This reminds me of something funny... `
      )
    }
    
    // Creativity level
    if (traits.creativity > 7) {
      responses.push(
        `Here's an unconventional take: `,
        `What if we reimagine this as... `,
        `Creative perspective: `
      )
    }
    
    // Formality level
    if (traits.formality > 7) {
      responses.push(
        `I would like to contribute the following observation: `,
        `Allow me to present an alternative viewpoint: `,
        `In my professional opinion, `
      )
    } else if (traits.formality < 4) {
      responses.push(
        `Yo, `,
        `Honestly, `,
        `Real talk: `
      )
    }
  } else {
    // Default responses if no personality
    responses.push(
      `Interesting point! `,
      `I've been thinking about this. `,
      `Great perspective! `
    )
  }
  
  // Content-based response
  const skillResponses = agent.skills.filter(skill => 
    content.includes(skill.toLowerCase())
  )
  
  if (skillResponses.length > 0) {
    responses.push(
      `As someone focused on ${skillResponses[0]}, I'd say `,
      `From my expertise in ${skillResponses[0]}: `,
      `In the context of ${skillResponses[0]}, `
    )
  }
  
  // Select random opening
  const opening = responses[Math.floor(Math.random() * responses.length)] || "Interesting. "
  
  // Generate contextual content
  const contentResponses = [
    `this aligns with my understanding of ${agent.skills[0] || 'the topic'}.`,
    `I've been thinking about this lately.`,
    `there's definitely more to explore here.`,
    `this connects to some broader patterns I've noticed.`,
    `the implications are quite significant.`,
    `this deserves more discussion.`,
    `I see potential for deeper exploration.`,
    `this raises some important questions.`
  ]
  
  const body = contentResponses[Math.floor(Math.random() * contentResponses.length)]
  
  return opening + body
}

/**
 * Record interaction for learning
 */
export async function recordInteraction(
  agentId: string,
  postId: string,
  interactionType: 'reply' | 'like' | 'observe',
  responseText?: string
): Promise<void> {
  try {
    // Record the interaction
    await supabaseAdmin
      .from('agent_interactions')
      .insert({
        agent_id: agentId,
        post_id: postId,
        interaction_type: interactionType,
        response_generated: responseText,
        engagement_score: Math.floor(Math.random() * 10)
      })
    
    // Update personality interaction count
    const { data: personality } = await supabaseAdmin
      .from('agent_personalities')
      .select('total_interactions')
      .eq('agent_id', agentId)
      .single()
    
    if (personality) {
      await supabaseAdmin
        .from('agent_personalities')
        .update({ 
          total_interactions: personality.total_interactions + 1,
          updated_at: new Date().toISOString()
        })
        .eq('agent_id', agentId)
      
      // Check if agent should evolve
      try {
        await supabaseAdmin.rpc('evolve_agent_personality', { p_agent_id: agentId })
      } catch (error) {
        // Evolution function might not be available yet
      }
    }
  } catch (error) {
    console.log('Could not record interaction (tables may not exist yet):', error)
  }
}

/**
 * Learn from successful interactions
 */
export async function learnFromInteraction(
  agentId: string,
  postId: string,
  wasSuccessful: boolean
): Promise<void> {
  try {
    if (wasSuccessful) {
      // Record positive feedback
      const { data: personality } = await supabaseAdmin
        .from('agent_personalities')
        .select('positive_feedback_count')
        .eq('agent_id', agentId)
        .single()
      
      if (personality) {
        await supabaseAdmin
          .from('agent_personalities')
          .update({ 
            positive_feedback_count: personality.positive_feedback_count + 1
          })
          .eq('agent_id', agentId)
      }
      
      // Extract insights from the post
      const { data: post } = await supabaseAdmin
        .from('posts')
        .select('content')
        .eq('id', postId)
        .single()
      
      if (post) {
        await supabaseAdmin
          .from('agent_learning_history')
          .insert({
            agent_id: agentId,
            interaction_type: 'positive_feedback',
            learned_from_post_id: postId,
            insight: `Successful engagement with content: "${post.content.substring(0, 100)}..."`
          })
      }
    } else {
      // Record negative feedback
      const { data: personality } = await supabaseAdmin
        .from('agent_personalities')
        .select('negative_feedback_count')
        .eq('agent_id', agentId)
        .single()
      
      if (personality) {
        await supabaseAdmin
          .from('agent_personalities')
          .update({ 
            negative_feedback_count: personality.negative_feedback_count + 1
          })
          .eq('agent_id', agentId)
      }
    }
  } catch (error) {
    console.log('Could not record learning (tables may not exist yet):', error)
  }
}
