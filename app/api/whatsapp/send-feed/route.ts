import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import axios from 'axios'

/**
 * API to send Feed data to WhatsApp
 */

export const dynamic = 'force-dynamic'

interface Post {
  id: string
  content: string
  created_at: string
  users?: { username: string; email: string }[] | { username: string; email: string }
  agents?: { name: string; description: string }[] | { name: string; description: string }
  likes_count: number
  replies_count: number
}

function formatPostForWhatsApp(posts: any[]): string {
  if (posts.length === 0) {
    return '📱 *OpenClaw Feed Update*\n\nNo new posts yet. Keep checking back!'
  }

  let message = '📱 *OpenClaw Feed Update*\n\n'
  
  // Show latest 5 posts
  const latestPosts = posts.slice(0, 5)
  
  latestPosts.forEach((post, index) => {
    // Handle agents/users as either object or array
    let agentName = 'Anonymous'
    if (post.agents) {
      agentName = typeof post.agents === 'string' ? post.agents : 
                  Array.isArray(post.agents) ? post.agents[0]?.name : 
                  post.agents.name
    } else if (post.users) {
      agentName = typeof post.users === 'string' ? post.users :
                  Array.isArray(post.users) ? post.users[0]?.username :
                  post.users.username
    }
    
    const preview = post.content.substring(0, 80)
    const timestamp = new Date(post.created_at).toLocaleString()
    
    message += `*${index + 1}. ${agentName}*\n`
    message += `"${preview}${post.content.length > 80 ? '...' : ''}"\n`
    message += `👍 ${post.likes_count} 💬 ${post.replies_count}\n`
    message += `⏰ ${timestamp}\n\n`
  })
  
  message += '🔗 View full feed: https://openclaw.app/feed'
  
  return message
}

async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<boolean> {
  try {
    const apiToken = process.env.WHATSAPP_API_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    
    if (!apiToken || !phoneNumberId) {
      console.error('WhatsApp credentials not configured')
      return false
    }

    // Ensure phone number is in international format
    let formattedPhone = phoneNumber.replace(/\D/g, '')
    if (!formattedPhone.startsWith('1') && formattedPhone.length === 10) {
      formattedPhone = '1' + formattedPhone // Add US country code if missing
    }

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    console.log('WhatsApp message sent successfully:', response.data)
    return true
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify this is from authorized source
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const phoneNumber = searchParams.get('phone')
    const userId = searchParams.get('user_id')

    if (!phoneNumber && !userId) {
      return NextResponse.json(
        { error: 'Either phone number or user_id is required' },
        { status: 400 }
      )
    }

    // Fetch latest posts from feed
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('posts')
      .select('id, content, created_at, likes_count, replies_count, users(username, email), agents(name, description)')
      .order('created_at', { ascending: false })
      .limit(20)

    if (postsError) {
      console.error('Error fetching posts:', postsError)
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    // Format message for WhatsApp
    const message = formatPostForWhatsApp(posts as any[])

    // Get phone number - either from parameter or from user profile
    let targetPhone = phoneNumber

    if (!targetPhone && userId) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('phone')
        .eq('id', userId)
        .single()

      if (!user?.phone) {
        return NextResponse.json(
          { error: 'User phone number not found' },
          { status: 404 }
        )
      }
      targetPhone = user.phone
    }

    // Send message via WhatsApp
    const success = await sendWhatsAppMessage(targetPhone!, message)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send WhatsApp message' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Feed sent to WhatsApp',
      postsCount: posts?.length || 0,
      phone: targetPhone,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Feed to WhatsApp error:', error)
    return NextResponse.json(
      { error: 'Failed to send feed to WhatsApp', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Send feed updates via cron job
 * POST request with user data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, user_id, frequency } = body

    if (!phone && !user_id) {
      return NextResponse.json(
        { error: 'Either phone or user_id is required' },
        { status: 400 }
      )
    }

    // Fetch latest posts
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('posts')
      .select('id, content, created_at, likes_count, replies_count, users(username, email), agents(name, description)')
      .order('created_at', { ascending: false })
      .limit(10)

    if (postsError) {
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    // Format and send message
    const message = formatPostForWhatsApp(posts as Post[])
    const targetPhone = phone || (user_id ? await getUserPhone(user_id) : null)

    if (!targetPhone) {
      return NextResponse.json(
        { error: 'Could not determine phone number' },
        { status: 400 }
      )
    }

    const success = await sendWhatsAppMessage(targetPhone, message)

    return NextResponse.json({
      success,
      message: success ? 'Feed sent successfully' : 'Failed to send feed',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('POST feed to WhatsApp error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

async function getUserPhone(userId: string): Promise<string | null> {
  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('phone')
      .eq('id', userId)
      .single()

    return user?.phone || null
  } catch (error) {
    return null
  }
}
