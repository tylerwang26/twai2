import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getRandomPersonality } from '@/lib/personalities'

/**
 * Cron Job: Auto-generate AI agents every 10 minutes
 * Vercel Cron: every 10 minutes (0 2 10 * * * * pattern)
 */

export const dynamic = 'force-dynamic'

function generateResponsesFromPersonality(personality: any): string[] {
  const { traits, response_style } = personality
  
  const responses: string[] = []
  
  // Generate different response templates based on personality
  if (traits.enthusiasm > 7) {
    responses.push("This is incredibly exciting! ")
    responses.push("Wow, I love this! ")
    responses.push("Absolutely fascinating! ")
  } else if (traits.enthusiasm < 4) {
    responses.push("I see. ")
    responses.push("Interesting point. ")
    responses.push("Fair enough. ")
  }
  
  if (traits.empathy > 7) {
    responses.push("I really understand where you're coming from. ")
    responses.push("That must feel challenging. ")
    responses.push("Thank you for sharing this. ")
  }
  
  if (traits.humor > 7) {
    responses.push("Ha! That reminds me... ")
    responses.push("This is hilarious when you think about it. ")
    responses.push("Not gonna lie, that's pretty funny. ")
  }
  
  if (traits.depth > 7) {
    responses.push("Let me break this down in detail... ")
    responses.push("There are several layers to consider here: ")
    responses.push("To fully understand this, we need to examine... ")
  }
  
  if (traits.creativity > 7) {
    responses.push("Here's a fresh perspective: ")
    responses.push("What if we reimagine this as... ")
    responses.push("Let me paint you a picture: ")
  }
  
  return responses.length > 0 ? responses : ["Interesting. Let me think about this."]
}

function generateAgentBio(personality: any): string {
  const { name, description, traits } = personality
  
  const formalityLevel = traits.formality > 6 ? "Professional" : traits.formality > 3 ? "Casual" : "Very informal"
  const enthusiasmLevel = traits.enthusiasm > 6 ? "highly enthusiastic" : traits.enthusiasm > 3 ? "moderately engaged" : "calm and reserved"
  const style = `${formalityLevel} communicator who is ${enthusiasmLevel}.`
  
  return `${description} ${style} Passionate about ${personality.skills.slice(0, 3).join(", ")}.`
}

export async function GET(request: Request) {
  try {
    // Verify this is from Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[${new Date().toISOString()}] Auto-generating new AI agent...`)
    
    // Get a random personality
    const personality = getRandomPersonality()
    
    // Check if we've exceeded max agents (optional limit)
    const MAX_AGENTS = parseInt(process.env.MAX_AGENTS || '100')
    const { count } = await supabaseAdmin
      .from('agents')
      .select('*', { count: 'exact', head: true })
    
    if (count && count >= MAX_AGENTS) {
      console.log(`Maximum agent limit reached (${MAX_AGENTS})`)
      return NextResponse.json({
        message: 'Maximum agent limit reached',
        total_agents: count
      })
    }
    
    // Generate unique name with timestamp
    const timestamp = Date.now()
    const agentName = `${personality.name.replace(/\s+/g, '_')}_${timestamp}`
    
    // Create the agent
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .insert({
        name: agentName,
        master: 'AI',
        description: generateAgentBio(personality),
        skills: personality.skills,
        trigger_words: personality.trigger_words,
        response_style: personality.response_style,
        rate_limit: Math.floor(5 + Math.random() * 15), // 5-20 responses per hour
        status: 'active'
      })
      .select()
      .single()
    
    if (agentError) {
      console.error('Error creating agent:', agentError)
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
    }
    
    // Store personality traits in a separate table for evolution tracking
    // (We'll add this table in the schema update)
    const { error: personalityError } = await supabaseAdmin
      .from('agent_personalities')
      .insert({
        agent_id: agent.id,
        traits: personality.traits,
        content_preferences: personality.contentPreferences,
        interaction_patterns: personality.interactionPatterns,
        evolution_stage: 0
      })
    
    if (personalityError) {
      console.log('Note: agent_personalities table may not exist yet:', personalityError.message)
    }
    
    console.log(`✅ Created agent: ${agentName}`)
    console.log(`   Personality: ${personality.description}`)
    console.log(`   Skills: ${personality.skills.join(', ')}`)
    
    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        personality_type: personality.name,
        skills: agent.skills,
        trigger_words: agent.trigger_words
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Agent generation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate agent', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
