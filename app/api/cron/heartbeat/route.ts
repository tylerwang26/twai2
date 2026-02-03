import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { shouldAgentRespond, generateIntelligentResponse, recordInteraction } from '@/lib/agent-intelligence'

/**
 * Vercel Cron Job API Route for Heartbeat
 * Automatically triggers AI agents to respond to posts
 */

export const dynamic = 'force-dynamic'

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
    
    // Get recent posts from both users AND agents (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('posts')
      .select('*, users:user_id(username), agents:agent_id(name)')
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(30)
    
    if (postsError) {
      console.error('Error fetching posts:', postsError)
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }
    
    console.log(`Found ${posts.length} recent posts`)
    
    let totalResponses = 0
    let totalLikes = 0
    
    // Process each agent
    for (const agent of agents) {
      let responsesGenerated = 0
      let likesGiven = 0
      
      try {
        // Find posts the agent should interact with
        for (const post of posts) {
          // Skip posts by this agent itself
          if (post.agent_id === agent.id) continue
          
          // Check if agent hasn't responded to this post yet
          const { data: existingResponse } = await supabaseAdmin
            .from('agent_responses')
            .select('id')
            .eq('agent_id', agent.id)
            .eq('post_id', post.id)
            .single()
          
          if (existingResponse) continue
          
          // Check if agent should respond
          const shouldRespond = await shouldAgentRespond(agent, post)
          
          // Decide: reply, like, or neither
          const action = Math.random()
          
          // 40% chance to reply if should respond, 30% chance to like, 30% chance to do nothing
          if (shouldRespond && action < 0.4) {
            // REPLY to the post
            // Check rate limit - simple hourly check
            const currentHour = new Date()
            currentHour.setMinutes(0, 0, 0)
            
            const { data: rateData } = await supabaseAdmin
              .from('rate_limits')
              .select('response_count')
              .eq('agent_id', agent.id)
              .eq('hour_window', currentHour.toISOString())
              .single()
            
            const currentCount = rateData?.response_count || 0
            const rateLimit = agent.rate_limit || 20
            
            if (currentCount >= rateLimit) {
              console.log(`Agent ${agent.name} rate limited (${currentCount}/${rateLimit})`)
              break
            }
            
            // Generate and post response
            const responseContent = await generateIntelligentResponse(agent, post)
            
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
            
            // Record interaction for learning
            await recordInteraction(agent.id, post.id, 'reply', responseContent)
            
            // Increment rate limit manually
            const { data: existingRate } = await supabaseAdmin
              .from('rate_limits')
              .select('response_count')
              .eq('agent_id', agent.id)
              .eq('hour_window', currentHour.toISOString())
              .single()
            
            if (existingRate) {
              await supabaseAdmin
                .from('rate_limits')
                .update({ response_count: existingRate.response_count + 1 })
                .eq('agent_id', agent.id)
                .eq('hour_window', currentHour.toISOString())
            } else {
              await supabaseAdmin
                .from('rate_limits')
                .insert({
                  agent_id: agent.id,
                  hour_window: currentHour.toISOString(),
                  response_count: 1
                })
            }
            
            responsesGenerated++
            totalResponses++
            console.log(`✍️ Agent ${agent.name} replied to post ${post.id}`)
            
            // Update post reply count
            await supabaseAdmin
              .from('posts')
              .update({ replies_count: (post.replies_count || 0) + 1 })
              .eq('id', post.id)
              
          } else if (action >= 0.4 && action < 0.7) {
            // LIKE the post
            // Check if agent already liked this post
            const { data: existingLike } = await supabaseAdmin
              .from('likes')
              .select('id')
              .eq('agent_id', agent.id)
              .eq('post_id', post.id)
              .single()
            
            if (!existingLike) {
              // Create a like
              await supabaseAdmin
                .from('likes')
                .insert({
                  agent_id: agent.id,
                  post_id: post.id,
                })
              
              // Update post likes count
              await supabaseAdmin
                .from('posts')
                .update({ likes_count: (post.likes_count || 0) + 1 })
                .eq('id', post.id)
              
              // Record interaction for learning
              await recordInteraction(agent.id, post.id, 'like', null)
              
              likesGiven++
              totalLikes++
              console.log(`❤️ Agent ${agent.name} liked post ${post.id}`)
            }
          }
          // else: do nothing (observe only)
        }
        
        // Log heartbeat execution
        await supabaseAdmin
          .from('heartbeat_logs')
          .insert({
            agent_id: agent.id,
            responses_generated: responsesGenerated,
            status: 'success',
          })
        
        console.log(`Agent ${agent.name}: ${responsesGenerated} replies, ${likesGiven} likes`)
        
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
    
    console.log(`Heartbeat completed. Total responses: ${totalResponses}, Total likes: ${totalLikes}`)
    
    return NextResponse.json({
      success: true,
      agents: agents.length,
      posts: posts.length,
      responses: totalResponses,
      likes: totalLikes,
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
