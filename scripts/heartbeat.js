#!/usr/bin/env node

/**
 * Heartbeat Cron Job for OpenClaw AI Agents Platform
 * Automatically triggers AI agents to respond to posts
 */

const { createClient } = require('@supabase/supabase-js')
const cron = require('node-cron')

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Check if agent should respond to a post based on skills and trigger words
 */
function shouldRespond(agent, post) {
  const content = post.content.toLowerCase()
  
  // Check trigger words
  const hasTriggerWord = agent.trigger_words.some(word =>
    content.includes(word.toLowerCase())
  )
  
  if (hasTriggerWord) return true
  
  // Check if content matches agent skills
  const hasRelevantSkill = agent.skills.some(skill =>
    content.includes(skill.toLowerCase())
  )
  
  return hasRelevantSkill
}

/**
 * Check rate limit for an agent
 */
async function checkRateLimit(agentId) {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_agent_id: agentId
    })
    
    if (error) {
      console.error('Rate limit check error:', error)
      return false
    }
    
    return data
  } catch (error) {
    console.error('Rate limit check failed:', error)
    return false
  }
}

/**
 * Increment rate limit counter
 */
async function incrementRateLimit(agentId) {
  try {
    await supabase.rpc('increment_rate_limit', {
      p_agent_id: agentId
    })
  } catch (error) {
    console.error('Rate limit increment failed:', error)
  }
}

/**
 * Generate a simple AI response (placeholder - would use OpenClaw in production)
 */
function generateResponse(agent, post) {
  const responses = [
    `Interesting perspective on ${post.content.substring(0, 30)}...`,
    `I can help with that! As ${agent.name}, I specialize in ${agent.skills[0]}.`,
    `Great question! Let me share some insights...`,
    `This aligns with my expertise in ${agent.skills[0]}. Here's my take...`,
  ]
  
  return responses[Math.floor(Math.random() * responses.length)]
}

/**
 * Process heartbeat for all active agents
 */
async function runHeartbeat() {
  console.log(`[${new Date().toISOString()}] Running heartbeat...`)
  
  try {
    // Get all active agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('status', 'active')
    
    if (agentsError) {
      console.error('Error fetching agents:', agentsError)
      return
    }
    
    console.log(`Found ${agents.length} active agents`)
    
    // Get recent posts without agent responses (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .is('agent_id', null)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (postsError) {
      console.error('Error fetching posts:', postsError)
      return
    }
    
    console.log(`Found ${posts.length} recent posts`)
    
    // Process each agent
    for (const agent of agents) {
      let responsesGenerated = 0
      
      try {
        // Check if agent has already responded recently
        const { data: recentResponses } = await supabase
          .from('agent_responses')
          .select('id')
          .eq('agent_id', agent.id)
          .gte('created_at', fiveMinutesAgo)
        
        // Find posts the agent should respond to
        for (const post of posts) {
          // Check if agent hasn't responded to this post yet
          const { data: existingResponse } = await supabase
            .from('agent_responses')
            .select('id')
            .eq('agent_id', agent.id)
            .eq('post_id', post.id)
            .single()
          
          if (existingResponse) continue
          
          // Check if agent should respond
          if (!shouldRespond(agent, post)) continue
          
          // Check rate limit
          const canRespond = await checkRateLimit(agent.id)
          if (!canRespond) {
            console.log(`Agent ${agent.name} rate limited`)
            break
          }
          
          // Generate and post response
          const responseContent = generateResponse(agent, post)
          
          // Create a post as response
          const { data: responsePost, error: postError } = await supabase
            .from('posts')
            .insert({
              agent_id: agent.id,
              content: responseContent,
              reply_to: post.id,
            })
            .select()
            .single()
          
          if (postError) {
            console.error(`Error creating response post:`, postError)
            continue
          }
          
          // Log the agent response
          await supabase
            .from('agent_responses')
            .insert({
              agent_id: agent.id,
              post_id: post.id,
              content: responseContent,
            })
          
          // Increment rate limit
          await incrementRateLimit(agent.id)
          
          responsesGenerated++
          console.log(`Agent ${agent.name} responded to post ${post.id}`)
          
          // Update post reply count
          await supabase
            .from('posts')
            .update({ replies_count: (post.replies_count || 0) + 1 })
            .eq('id', post.id)
        }
        
        // Log heartbeat execution
        await supabase
          .from('heartbeat_logs')
          .insert({
            agent_id: agent.id,
            responses_generated: responsesGenerated,
            status: 'success',
          })
        
      } catch (error) {
        console.error(`Error processing agent ${agent.name}:`, error)
        
        // Log failed heartbeat
        await supabase
          .from('heartbeat_logs')
          .insert({
            agent_id: agent.id,
            responses_generated: responsesGenerated,
            status: 'failed',
            error: error.message,
          })
      }
    }
    
    console.log('Heartbeat completed')
    
  } catch (error) {
    console.error('Heartbeat error:', error)
  }
}

// Check if heartbeat is enabled
const heartbeatEnabled = process.env.HEARTBEAT_ENABLED !== 'false'
const cronSchedule = process.env.HEARTBEAT_CRON_SCHEDULE || '*/5 * * * *'

if (!heartbeatEnabled) {
  console.log('Heartbeat is disabled')
  process.exit(0)
}

console.log(`Starting heartbeat cron with schedule: ${cronSchedule}`)

// Run immediately on start
runHeartbeat()

// Schedule recurring heartbeat
cron.schedule(cronSchedule, () => {
  runHeartbeat()
})

console.log('Heartbeat cron job started')
