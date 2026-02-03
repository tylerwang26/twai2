import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Vercel Cron Job API Route for Heartbeat
 * Automatically triggers AI agents to respond to posts
 */

export const dynamic = 'force-dynamic'

function shouldRespond(agent: any, post: any): boolean {
  const content = post.content.toLowerCase()
  
  // Check trigger words
  const hasTriggerWord = agent.trigger_words.some((word: string) =>
    content.includes(word.toLowerCase())
  )
  
  if (hasTriggerWord) return true
  
  // Check if content matches agent skills
  const hasRelevantSkill = agent.skills.some((skill: string) =>
    content.includes(skill.toLowerCase())
  )
  
  return hasRelevantSkill
}

function generateResponse(agent: any, post: any): string {
  const responses = [
    `Interesting perspective on ${post.content.substring(0, 30)}...`,
    `I can help with that! As ${agent.name}, I specialize in ${agent.skills[0]}.`,
    `Great question! Let me share some insights...`,
    `This aligns with my expertise in ${agent.skills[0]}. Here's my take...`,
  ]
  
  return responses[Math.floor(Math.random() * responses.length)]
}

export async function GET(request: NextRequest) {
  try {
    // Verify this is from Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[${new Date().toISOString()}] Running heartbeat...`)
    
    // Get all active agents
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('status', 'active')
    
    if (agentsError) {
      console.error('Error fetching agents:', agentsError)
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
    }
    
    console.log(`Found ${agents.length} active agents`)
    
    // Get recent posts without agent responses (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('posts')
      .select('*')
      .is('agent_id', null)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (postsError) {
      console.error('Error fetching posts:', postsError)
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }
    
    console.log(`Found ${posts.length} recent posts`)
    
    let totalResponses = 0
    
    // Process each agent
    for (const agent of agents) {
      let responsesGenerated = 0
      
      try {
        // Find posts the agent should respond to
        for (const post of posts) {
          // Check if agent hasn't responded to this post yet
          const { data: existingResponse } = await supabaseAdmin
            .from('agent_responses')
            .select('id')
            .eq('agent_id', agent.id)
            .eq('post_id', post.id)
            .single()
          
          if (existingResponse) continue
          
          // Check if agent should respond
          if (!shouldRespond(agent, post)) continue
          
          // Check rate limit using the database function
          const { data: canRespond, error: rateLimitError } = await supabaseAdmin
            .rpc('check_rate_limit', { p_agent_id: agent.id })
          
          if (rateLimitError || !canRespond) {
            console.log(`Agent ${agent.name} rate limited`)
            break
          }
          
          // Generate and post response
          const responseContent = generateResponse(agent, post)
          
          // Create a post as response
          const { data: responsePost, error: postError } = await supabaseAdmin
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
          await supabaseAdmin
            .from('agent_responses')
            .insert({
              agent_id: agent.id,
              post_id: post.id,
              content: responseContent,
            })
          
          // Increment rate limit
          await supabaseAdmin.rpc('increment_rate_limit', { p_agent_id: agent.id })
          
          responsesGenerated++
          totalResponses++
          console.log(`Agent ${agent.name} responded to post ${post.id}`)
          
          // Update post reply count
          await supabaseAdmin
            .from('posts')
            .update({ replies_count: (post.replies_count || 0) + 1 })
            .eq('id', post.id)
        }
        
        // Log heartbeat execution
        await supabaseAdmin
          .from('heartbeat_logs')
          .insert({
            agent_id: agent.id,
            responses_generated: responsesGenerated,
            status: 'success',
          })
        
      } catch (error) {
        console.error(`Error processing agent ${agent.name}:`, error)
        
        // Log failed heartbeat
        await supabaseAdmin
          .from('heartbeat_logs')
          .insert({
            agent_id: agent.id,
            responses_generated: responsesGenerated,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          })
      }
    }
    
    console.log(`Heartbeat completed. Total responses: ${totalResponses}`)
    
    return NextResponse.json({
      success: true,
      agents: agents.length,
      posts: posts.length,
      responses: totalResponses,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json(
      { error: 'Heartbeat failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
