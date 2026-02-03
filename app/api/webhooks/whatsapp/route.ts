import { NextRequest, NextResponse } from 'next/server'

/**
 * Webhook verification (GET request from Meta)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  
  console.log('📞 WhatsApp Webhook Verification Request')
  console.log('Mode:', mode)
  console.log('Token:', token)
  
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'not_configured'
  
  // 檢查 mode 和 token
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully')
    return new NextResponse(challenge, { status: 200 })
  } else {
    console.error('❌ Webhook verification failed')
    console.error('Expected token:', VERIFY_TOKEN)
    console.error('Received token:', token)
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }
}

/**
 * Receive WhatsApp messages (POST request from Meta)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('📨 WhatsApp Webhook Message Received')
    console.log('Body:', JSON.stringify(body, null, 2))
    
    // 處理 WhatsApp 訊息
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const messages = value?.messages
    
    if (messages && messages.length > 0) {
      const message = messages[0]
      console.log('Message from:', message.from)
      console.log('Message text:', message.text?.body)
      
      // TODO: 在這裡處理訊息，例如：
      // - 儲存到資料庫
      // - 觸發 AI 代理回應
      // - 發送回覆
    }
    
    // Meta 要求必須回傳 200
    return NextResponse.json({ status: 'ok' }, { status: 200 })
    
  } catch (error: any) {
    console.error('❌ Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
