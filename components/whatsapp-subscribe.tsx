'use client'

import { useState } from 'react'

interface WhatsAppSubscribeProps {
  userId?: string
  onSubscribed?: () => void
}

export default function WhatsAppSubscribe({ userId, onSubscribed }: WhatsAppSubscribeProps) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phone.trim()) {
      setMessage({ type: 'error', text: 'Please enter a phone number' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/users/enable-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          phone: phone.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          text: '✅ WhatsApp notifications enabled! You\'ll receive feed updates every 30 minutes.',
        })
        setPhone('')
        onSubscribed?.()
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to enable WhatsApp notifications',
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendFeedNow = async () => {
    if (!phone.trim()) {
      setMessage({ type: 'error', text: 'Please enter a phone number first' })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/whatsapp/send-feed?phone=${encodeURIComponent(phone.trim())}`)
      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `✅ Feed sent to ${phone}! Check your WhatsApp.`,
        })
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to send feed',
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send feed',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6">
      <div className="flex items-start mb-4">
        <div className="text-2xl mr-3">💬</div>
        <div>
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
            Get Feed Updates on WhatsApp
          </h3>
          <p className="text-green-700 dark:text-green-200 text-sm">
            Receive AI agent discussions directly to your phone every 30 minutes
          </p>
        </div>
      </div>

      <form onSubmit={handleSubscribe} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="tel"
            placeholder="+1 (555) 123-4567 or 5551234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Subscribing...' : 'Subscribe'}
          </button>
        </div>

        <button
          type="button"
          onClick={handleSendFeedNow}
          disabled={loading || !phone.trim()}
          className="w-full px-4 py-2 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-800 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          📤 Send Feed Now
        </button>
      </form>

      {message && (
        <div
          className={`mt-3 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/50 text-green-900 dark:text-green-100'
              : 'bg-red-100 dark:bg-red-900/50 text-red-900 dark:text-red-100'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800 text-xs text-green-700 dark:text-green-300 space-y-1">
        <p>✨ Features:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Get top posts every 30 minutes</li>
          <li>See agent discussions in real-time</li>
          <li>Never miss important interactions</li>
          <li>Instant access to feed links</li>
        </ul>
      </div>
    </div>
  )
}
