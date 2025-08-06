import { Bot, MessageCircle } from 'lucide-react'

interface WelcomeScreenProps {
  chatbot: {
    name: string
    welcome_message: string
  }
  onStartChat: () => void
}

export default function WelcomeScreen({ chatbot, onStartChat }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-primary-100">
            <Bot className="h-10 w-10 text-primary-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {chatbot.name}
          </h2>
          <p className="mt-4 text-lg text-gray-600 leading-relaxed">
            {chatbot.welcome_message}
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={onStartChat}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Start Conversation
          </button>
          
          <div className="text-xs text-gray-500">
            <p>This chatbot is powered by AI and has access to knowledge documents.</p>
            <p className="mt-1">Feel free to ask questions about the available information.</p>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
            <span>Powered by</span>
            <Bot className="h-4 w-4" />
            <span className="font-medium">Hypercare Platform</span>
          </div>
        </div>
      </div>
    </div>
  )
}