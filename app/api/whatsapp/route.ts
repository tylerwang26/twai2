import { NextRequest, NextResponse } from 'next/server'
import { whatsapp } from '@/lib/whatsapp'

// WhatsApp webhook verification
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  
  if (!mode || !token) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }
  
  const result = whatsapp.verifyWebhook(mode, token, challenge || '')
  
  if (result) {
    return new NextResponse(result, { status: 200 })
  }
  
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// WhatsApp webhook for incoming messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle incoming WhatsApp messages
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const messages = value?.messages
    
    if (messages && messages.length > 0) {
      for (const message of messages) {
        await whatsapp.handleIncomingMessage(message)
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
