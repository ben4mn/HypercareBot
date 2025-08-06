import { useState, useRef, useEffect } from 'react'
import { Bot, Minimize2 } from 'lucide-react'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

interface ChatWindowProps {
  chatbot: {
    id: string
    name: string
    welcome_message: string
  }
  slug: string
  sessionId: string
  conversationId: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

export default function ChatWindow({ chatbot, slug, sessionId, conversationId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Add welcome message
    if (chatbot.welcome_message) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: chatbot.welcome_message,
        timestamp: new Date()
      }])
    }
  }, [chatbot.welcome_message])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch(`/api/chat/${slug}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          sessionId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''
      let streamingMessageId = `streaming-${Date.now()}`

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.type === 'content') {
                  assistantMessage += data.content
                  
                  // Update or create streaming message
                  setMessages(prev => {
                    const lastMessage = prev[prev.length - 1]
                    if (lastMessage && lastMessage.id === streamingMessageId) {
                      return [
                        ...prev.slice(0, -1),
                        { ...lastMessage, content: assistantMessage }
                      ]
                    } else {
                      return [
                        ...prev,
                        {
                          id: streamingMessageId,
                          role: 'assistant',
                          content: assistantMessage,
                          timestamp: new Date(),
                          isStreaming: true
                        }
                      ]
                    }
                  })
                } else if (data.type === 'done') {
                  // Finalize the message
                  setMessages(prev => {
                    const lastMessage = prev[prev.length - 1]
                    if (lastMessage && lastMessage.id === streamingMessageId) {
                      return [
                        ...prev.slice(0, -1),
                        { 
                          ...lastMessage, 
                          id: Date.now().toString(),
                          isStreaming: false
                        }
                      ]
                    }
                    return prev
                  })
                } else if (data.type === 'error') {
                  throw new Error(data.error)
                }
              } catch (parseError) {
                // Skip invalid JSON lines
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-primary-600 text-white p-3 rounded-full shadow-lg hover:bg-primary-700 transition-colors"
        >
          <Bot className="h-6 w-6" />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center sm:p-0">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl h-full max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Bot className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{chatbot.name}</h3>
              <p className="text-sm text-gray-500">Online</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Minimize"
            >
              <Minimize2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col min-h-0">
          <MessageList
            messages={messages}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
          />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200">
          <MessageInput
            onSendMessage={sendMessage}
            disabled={isLoading}
            placeholder="Type your question..."
          />
        </div>
      </div>
    </div>
  )
}