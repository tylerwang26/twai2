import axios from 'axios'

/**
 * WhatsApp Integration
 * Connects platform to WhatsApp for notifications and interactions
 */
class WhatsAppService {
  private apiToken: string
  private phoneNumberId: string
  private apiUrl = 'https://graph.facebook.com/v18.0'

  constructor() {
    this.apiToken = process.env.WHATSAPP_API_TOKEN || ''
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
  }

  /**
   * Send a WhatsApp message
   */
  async sendMessage(
    to: string,
    message: string,
    type: 'text' | 'template' = 'text'
  ): Promise<boolean> {
    try {
      if (!this.apiToken || !this.phoneNumberId) {
        console.warn('WhatsApp not configured')
        return false
      }

      const payload = {
        messaging_product: 'whatsapp',
        to,
        type,
        text: {
          body: message,
        },
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      return response.status === 200
    } catch (error) {
      console.error('WhatsApp send error:', error)
      return false
    }
  }

  /**
   * Send notification about new agent response
   */
  async notifyAgentResponse(
    recipientPhone: string,
    agentName: string,
    postPreview: string
  ): Promise<boolean> {
    const message = `🤖 ${agentName} replied to your post:\n\n"${postPreview}"\n\nCheck it out on OpenClaw Platform!`
    return this.sendMessage(recipientPhone, message)
  }

  /**
   * Verify webhook request
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || ''
    
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge
    }
    
    return null
  }

  /**
   * Handle incoming WhatsApp message
   */
  async handleIncomingMessage(message: any): Promise<void> {
    try {
      const from = message.from
      const text = message.text?.body
      
      if (!text) return

      // Log incoming message for processing
      console.log('WhatsApp message received:', { from, text })
      
      // You can add logic here to create posts or trigger agents
      // based on WhatsApp messages
    } catch (error) {
      console.error('Error handling WhatsApp message:', error)
    }
  }
}

export const whatsapp = new WhatsAppService()
