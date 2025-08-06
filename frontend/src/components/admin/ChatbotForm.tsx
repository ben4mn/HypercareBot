import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save } from 'lucide-react'
import { useChatbots } from '../../hooks/useChatbots'

interface ChatbotFormData {
  name: string
  system_prompt: string
  welcome_message: string
  config?: {
    max_tokens?: number
    temperature?: number
  }
}

export default function ChatbotForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { createChatbot, updateChatbot, getChatbot } = useChatbots()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(!!id)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<ChatbotFormData>({
    defaultValues: {
      name: '',
      system_prompt: 'You are a helpful assistant that answers questions based on the provided knowledge base.',
      welcome_message: 'Hello! How can I help you today?',
      config: {
        max_tokens: 4096,
        temperature: 0.7
      }
    }
  })

  const isEditing = !!id

  useEffect(() => {
    if (id) {
      loadChatbot(id)
    }
  }, [id])

  const loadChatbot = async (chatbotId: string) => {
    try {
      setInitialLoading(true)
      const chatbot = await getChatbot(chatbotId)
      
      setValue('name', chatbot.name)
      setValue('system_prompt', chatbot.system_prompt || '')
      setValue('welcome_message', chatbot.welcome_message || '')
      
      if (chatbot.config_json) {
        const config = JSON.parse(chatbot.config_json)
        setValue('config.max_tokens', config.max_tokens || 4096)
        setValue('config.temperature', config.temperature || 0.7)
      }
    } catch (error) {
      console.error('Failed to load chatbot:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  const onSubmit = async (data: ChatbotFormData) => {
    try {
      setLoading(true)
      
      const chatbotData = {
        ...data,
        config: data.config
      }

      if (isEditing && id) {
        await updateChatbot(id, chatbotData)
      } else {
        await createChatbot(chatbotData)
      }
      
      navigate('/admin')
    } catch (error) {
      console.error('Failed to save chatbot:', error)
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Chatbots
        </button>
      </div>

      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {isEditing ? 'Edit Chatbot' : 'Create Chatbot'}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Configure your chatbot's behavior and personality.
            </p>
          </div>
        </div>
        
        <div className="mt-5 md:mt-0 md:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="shadow sm:rounded-md sm:overflow-hidden">
              <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Chatbot Name
                  </label>
                  <input
                    type="text"
                    {...register('name', { required: 'Name is required' })}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="e.g., Customer Support Bot"
                  />
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                {/* System Prompt */}
                <div>
                  <label htmlFor="system_prompt" className="block text-sm font-medium text-gray-700">
                    System Prompt
                  </label>
                  <p className="mt-1 text-sm text-gray-500">
                    Instructions that define how your chatbot should behave and respond.
                  </p>
                  <textarea
                    {...register('system_prompt', { required: 'System prompt is required' })}
                    rows={4}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="You are a helpful assistant..."
                  />
                  {errors.system_prompt && (
                    <p className="mt-2 text-sm text-red-600">{errors.system_prompt.message}</p>
                  )}
                </div>

                {/* Welcome Message */}
                <div>
                  <label htmlFor="welcome_message" className="block text-sm font-medium text-gray-700">
                    Welcome Message
                  </label>
                  <p className="mt-1 text-sm text-gray-500">
                    The first message users will see when they start a conversation.
                  </p>
                  <textarea
                    {...register('welcome_message', { required: 'Welcome message is required' })}
                    rows={3}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="Hello! How can I help you today?"
                  />
                  {errors.welcome_message && (
                    <p className="mt-2 text-sm text-red-600">{errors.welcome_message.message}</p>
                  )}
                </div>

                {/* Advanced Settings */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-base font-medium text-gray-900 mb-4">Advanced Settings</h4>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="max_tokens" className="block text-sm font-medium text-gray-700">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        {...register('config.max_tokens', { 
                          valueAsNumber: true,
                          min: 100,
                          max: 8000
                        })}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                      <p className="mt-1 text-xs text-gray-500">Maximum length of responses (100-8000)</p>
                    </div>

                    <div>
                      <label htmlFor="temperature" className="block text-sm font-medium text-gray-700">
                        Temperature
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        {...register('config.temperature', { 
                          valueAsNumber: true,
                          min: 0,
                          max: 1
                        })}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                      <p className="mt-1 text-xs text-gray-500">Creativity level (0.0 = focused, 1.0 = creative)</p>
                    </div>
                  </div>
                </div>

              </div>
              
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="mr-3 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isEditing ? 'Update Chatbot' : 'Create Chatbot'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}