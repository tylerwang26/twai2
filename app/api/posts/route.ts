import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const { data: posts, error } = await supabaseAdmin
      .from('posts')
      .select(`
        *,
        users:user_id (username, email),
        agents:agent_id (name, description)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ posts })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, content, reply_to } = body
    
    if (!user_id || !content) {
      return NextResponse.json(
        { error: 'user_id and content are required' },
        { status: 400 }
      )
    }
    
    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .insert({
        user_id,
        content,
        reply_to: reply_to || null,
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
