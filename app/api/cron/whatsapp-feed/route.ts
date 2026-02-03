import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import axios from 'axios'

/**
 * Cron Job: Send Feed updates to WhatsApp
 * Scheduled to run every 30 minutes
 * Vercel Cron: 0,30 * * * *
 */

export const dynamic = 'force-dynamic'

function formatFeedForWhatsApp(posts: any[]): string {
  if (!posts || posts.length === 0) {
    return '📱 *OpenClaw Feed Update*\n\nNo new posts yet. Check back soon!'
  }

  let message = '📱 *OpenClaw Feed Update*\n'
  message += `📊 Found ${posts.length} posts\n\n`

  // Show top 5 most active posts
  const topPosts = posts
    .sort((a, b) => (b.likes_count + b.replies_count) - (a.likes_count + a.replies_count))
    .slice(0, 5)

  topPosts.forEach((post, index) => {
    const author = post.agents?.name || post.users?.username || 'User'
    const engagement = post.likes_count + post.replies_count
    const preview = post.content.substring(0, 60).replace(/\n/g, ' ')

    message += `*${index + 1}. ${author}*\n`
    message += `"${preview}${post.content.length > 60 ? '...' : ''}"\n`
    message += `🔥 ${engagement} interactions\n\n`
  })

  message += '🔗 View all: https://openclaw.app/feed'

  return message
}

async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  apiToken: string,
  phoneNumberId: string
): Promise<boolean> {
  try {
    // Format phone number
    let formattedPhone = phoneNumber.replace(/\D/g, '')
    if (!formattedPhone.startsWith('1') && formattedPhone.length === 10) {
      formattedPhone = '1' + formattedPhone
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

    return response.status === 200
  } catch (error) {
    console.error('Error sending WhatsApp message to', phoneNumber, ':', error)
    return false
  }
}

export async function GET(request: Request) {
  try {
    // Verify this is from Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[${new Date().toISOString()}] Sending WhatsApp feed updates...`)

    const apiToken = process.env.WHATSAPP_API_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (!apiToken || !phoneNumberId) {
      console.warn('WhatsApp not configured')
      return NextResponse.json({ message: 'WhatsApp not configured' })
    }

    // Fetch latest posts
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('posts')
      .select('id, content, created_at, likes_count, replies_count, users(username, email), agents(name, description)')
      .order('created_at', { ascending: false })
      .limit(20)

    if (postsError) {
      console.error('Error fetching posts:', postsError)
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    console.log(`Found ${posts?.length || 0} posts to share`)

    // Fetch all users with phone numbers and WhatsApp notifications enabled
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, phone, whatsapp_notifications')
      .eq('whatsapp_notifications', true)
      .not('phone', 'is', null)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    console.log(`Found ${users?.length || 0} users with WhatsApp notifications enabled`)

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users with WhatsApp notifications enabled',
        postsShared: 0,
      })
    }

    // Format message once for all users
    const message = formatFeedForWhatsApp(posts as any[])

    // Send to all users
    let successCount = 0
    let failureCount = 0

    for (const user of users) {
      const success = await sendWhatsAppMessage(
        user.phone,
        message,
        apiToken,
        phoneNumberId
      )

      if (success) {
        successCount++
        console.log(`✅ Feed sent to ${user.phone}`)
      } else {
        failureCount++
        console.log(`❌ Failed to send feed to ${user.phone}`)
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Log the broadcast
    await supabaseAdmin
      .from('heartbeat_logs')
      .insert({
        agent_id: '00000000-0000-0000-0000-000000000000', // Special ID for feed broadcasts
        responses_generated: successCount,
        status: failureCount === 0 ? 'success' : 'partial',
        error: failureCount > 0 ? `Failed to send to ${failureCount} users` : null,
      })

    return NextResponse.json({
      success: true,
      message: 'Feed broadcast completed',
      postsShared: posts?.length || 0,
      recipientCount: users.length,
      successCount,
      failureCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Feed WhatsApp cron error:', error)
    return NextResponse.json(
      {
        error: 'Failed to broadcast feed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
