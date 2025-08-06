import { useState, useEffect, useCallback } from 'react'

interface Chatbot {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string
  updated_at: string
  system_prompt?: string
  welcome_message?: string
  config_json?: string
}

export function useChatbots() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchChatbots = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/admin/chatbots', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch chatbots')
      }

      const data = await response.json()
      setChatbots(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const createChatbot = useCallback(async (chatbotData: Partial<Chatbot>) => {
    const response = await fetch('/api/admin/chatbots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify(chatbotData)
    })

    if (!response.ok) {
      throw new Error('Failed to create chatbot')
    }

    const newChatbot = await response.json()
    setChatbots(prev => [newChatbot, ...prev])
    return newChatbot
  }, [])

  const updateChatbot = useCallback(async (id: string, updates: Partial<Chatbot>) => {
    const response = await fetch(`/api/admin/chatbots/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      throw new Error('Failed to update chatbot')
    }

    const updatedChatbot = await response.json()
    setChatbots(prev => 
      prev.map(chatbot => 
        chatbot.id === id ? updatedChatbot : chatbot
      )
    )
    return updatedChatbot
  }, [])

  const deleteChatbot = useCallback(async (id: string) => {
    const response = await fetch(`/api/admin/chatbots/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to delete chatbot')
    }

    setChatbots(prev => prev.filter(chatbot => chatbot.id !== id))
  }, [])

  const getChatbot = useCallback(async (id: string): Promise<Chatbot> => {
    const response = await fetch(`/api/admin/chatbots/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch chatbot')
    }

    return response.json()
  }, [])

  useEffect(() => {
    fetchChatbots()
  }, [fetchChatbots])

  return {
    chatbots,
    loading,
    error,
    createChatbot,
    updateChatbot,
    deleteChatbot,
    getChatbot,
    refetch: fetchChatbots
  }
}