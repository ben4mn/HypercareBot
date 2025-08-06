import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import ChatWindow from '../components/chat/ChatWindow'
import WelcomeScreen from '../components/chat/WelcomeScreen'
import ErrorBoundary from '../components/shared/ErrorBoundary'
import LoadingSpinner from '../components/shared/LoadingSpinner'

interface ChatbotConfig {
  id: string
  name: string
  welcome_message: string
  config: {
    theme?: string
    brand_color?: string
  }
}

export default function ChatInterface() {
  const { slug } = useParams<{ slug: string }>()
  const [config, setConfig] = useState<ChatbotConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string>('')
  const [conversationId, setConversationId] = useState<string>('')
  const [isStarted, setIsStarted] = useState(false)

  useEffect(() => {
    if (slug) {
      loadChatbotConfig(slug)
    }
  }, [slug])

  const loadChatbotConfig = async (chatbotSlug: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/chat/${chatbotSlug}/config`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Chatbot not found')
        } else {
          setError('Failed to load chatbot')
        }
        return
      }
      
      const data = await response.json()
      setConfig(data)
    } catch (err) {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  const initializeSession = async () => {
    if (!slug) return
    
    try {
      const response = await fetch(`/api/chat/${slug}/session`)
      
      if (response.ok) {
        const data = await response.json()
        setSessionId(data.sessionId)
        setConversationId(data.conversationId)
        setIsStarted(true)
      }
    } catch (error) {
      console.error('Failed to initialize session:', error)
      setError('Failed to start chat session')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.334 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!config) {
    return null
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {!isStarted ? (
          <WelcomeScreen
            chatbot={config}
            onStartChat={initializeSession}
          />
        ) : (
          <ChatWindow
            chatbot={config}
            slug={slug!}
            sessionId={sessionId}
            conversationId={conversationId}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}