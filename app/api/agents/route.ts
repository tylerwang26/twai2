import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: agents, error } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ agents })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      master,
      description,
      skills,
      trigger_words,
      response_style,
      rate_limit,
    } = body
    
    if (!name || !master || !description) {
      return NextResponse.json(
        { error: 'name, master, and description are required' },
        { status: 400 }
      )
    }
    
    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .insert({
        name,
        master,
        description,
        skills: skills || [],
        trigger_words: trigger_words || [],
        response_style: response_style || 'professional',
        rate_limit: rate_limit || 10,
        status: 'active',
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ agent }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    )
  }
}
