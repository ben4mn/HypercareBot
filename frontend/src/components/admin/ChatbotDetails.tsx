import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit, FileText, Trash2, MessageSquare, BarChart3 } from 'lucide-react'
import { useChatbots } from '../../hooks/useChatbots'
import DocumentUploader from './DocumentUploader'
import ChatbotTester from './ChatbotTester'

interface Chatbot {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string
  system_prompt?: string
  welcome_message?: string
  config_json?: string
}

interface Document {
  id: string
  filename: string
  file_type: string
  file_size: number
  uploaded_at: string
  processed_at?: string
}

export default function ChatbotDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getChatbot } = useChatbots()
  const [chatbot, setChatbot] = useState<Chatbot | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (id) {
      loadChatbotData(id)
    }
  }, [id])

  const loadChatbotData = async (chatbotId: string) => {
    try {
      setLoading(true)
      const [chatbotData, documentsData] = await Promise.all([
        getChatbot(chatbotId),
        fetchDocuments(chatbotId)
      ])
      
      setChatbot(chatbotData)
      setDocuments(documentsData)
    } catch (error) {
      console.error('Failed to load chatbot data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDocuments = async (chatbotId: string) => {
    const response = await fetch(`/api/admin/chatbots/${chatbotId}/documents`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch documents')
    }
    
    return response.json()
  }

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    
    try {
      const response = await fetch(`/api/admin/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      })
      
      if (response.ok) {
        setDocuments(docs => docs.filter(doc => doc.id !== docId))
      }
    } catch (error) {
      console.error('Failed to delete document:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!chatbot) {
    return (
      <div className="text-center">
        <h3 className="mt-2 text-sm font-medium text-gray-900">Chatbot not found</h3>
        <div className="mt-6">
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'documents', name: 'Documents', icon: FileText },
    { id: 'test', name: 'Test Chat', icon: MessageSquare },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Chatbots
        </button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{chatbot.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Created {new Date(chatbot.created_at).toLocaleDateString()}
            </p>
            <div className="mt-2">
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  chatbot.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {chatbot.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <a
              href={`/${chatbot.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              View Live
            </a>
            <Link
              to={`/admin/edit/${chatbot.id}`}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">URL Slug</dt>
                  <dd className="text-sm text-gray-900">
                    <code className="bg-gray-100 px-2 py-1 rounded">/{chatbot.slug}</code>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">System Prompt</dt>
                  <dd className="text-sm text-gray-900">{chatbot.system_prompt}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Welcome Message</dt>
                  <dd className="text-sm text-gray-900">{chatbot.welcome_message}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Statistics</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Documents</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{documents.length}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Processed Documents</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {documents.filter(doc => doc.processed_at).length}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div>
            <div className="mb-6">
              <DocumentUploader 
                chatbotId={chatbot.id} 
                onUploadComplete={() => loadChatbotData(chatbot.id)}
              />
            </div>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {documents.map((document) => (
                  <li key={document.id}>
                    <div className="px-4 py-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-8 w-8 text-gray-400" />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {document.filename}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatFileSize(document.file_size)} • 
                            Uploaded {new Date(document.uploaded_at).toLocaleDateString()}
                            {document.processed_at && (
                              <span className="ml-2 text-green-600">• Processed</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteDocument(document.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              
              {documents.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Upload documents to provide knowledge to your chatbot.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'test' && (
          <ChatbotTester chatbot={chatbot} />
        )}
      </div>
    </div>
  )
}