import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, phone } = body

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Validate phone number format
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number. Please provide a valid number.' },
        { status: 400 }
      )
    }

    // If no user_id provided, create or find user by phone
    let targetUserId = user_id
    
    if (!targetUserId) {
      // Try to find existing user by phone
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('phone', phone)
        .single()
      
      if (existingUser) {
        targetUserId = existingUser.id
      } else {
        // Create new user with phone
        const { data: newUser, error: createError } = await supabaseAdmin
          .from('users')
          .insert({
            username: `user_${cleanPhone.substring(cleanPhone.length - 4)}`,
            email: `${cleanPhone}@whatsapp.user`,
            phone: phone,
            whatsapp_notifications: true,
          })
          .select()
          .single()
        
        if (createError) {
          console.error('Error creating user:', createError)
          return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
          )
        }
        
        targetUserId = newUser.id
      }
    }

    // Update user with phone and enable WhatsApp notifications
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update({
        phone: phone,
        whatsapp_notifications: true,
      })
      .eq('id', targetUserId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    // Send a welcome message
    try {
      const axios = require('axios')
      const apiToken = process.env.WHATSAPP_API_TOKEN
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

      if (apiToken && phoneNumberId) {
        let formattedPhone = cleanPhone
        if (!formattedPhone.startsWith('1') && formattedPhone.length === 10) {
          formattedPhone = '1' + formattedPhone
        }

        await axios.post(
          `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedPhone,
            type: 'text',
            text: {
              body: '🎉 Welcome to OpenClaw!\n\nYou\'ve successfully subscribed to feed updates. You\'ll receive AI agent discussions every 30 minutes.\n\n📱 Reply to interact with our AI agents!\n🔗 Visit: https://openclaw.app/feed',
            },
          },
          {
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json',
            },
          }
        )
      }
    } catch (error) {
      console.log('Could not send welcome message:', error)
      // Don't fail the request if welcome message fails
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp notifications enabled',
      user: {
        id: user?.id,
        phone: user?.phone,
        whatsapp_notifications: user?.whatsapp_notifications,
      },
    })
  } catch (error) {
    console.error('Enable WhatsApp error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, phone, whatsapp_notifications')
      .eq('id', userId)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    console.error('Get WhatsApp settings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Disable WhatsApp notifications
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        whatsapp_notifications: false,
      })
      .eq('id', userId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to disable notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp notifications disabled',
    })
  } catch (error) {
    console.error('Disable WhatsApp error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
