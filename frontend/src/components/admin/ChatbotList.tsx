// import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Bot, Eye, Edit, Archive, Play, Pause } from 'lucide-react'
import { useChatbots } from '../../hooks/useChatbots'

interface Chatbot {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string
  system_prompt?: string
  welcome_message?: string
}

export default function ChatbotList() {
  const { chatbots, loading, error, updateChatbot, deleteChatbot, refetch } = useChatbots()

  const handleToggleActive = async (chatbot: Chatbot) => {
    try {
      const endpoint = chatbot.is_active ? 'deactivate' : 'activate'
      const response = await fetch(`/api/admin/chatbots/${chatbot.id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to ${endpoint} chatbot`)
      }
      
      // Refetch all chatbots to get the updated state
      await refetch()
    } catch (error) {
      console.error('Failed to toggle chatbot status:', error)
      alert(`Failed to toggle chatbot status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDelete = async (chatbot: Chatbot) => {
    if (!confirm(`Are you sure you want to delete "${chatbot.name}"?`)) return
    
    try {
      await deleteChatbot(chatbot.id)
    } catch (error) {
      console.error('Failed to delete chatbot:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading chatbots</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Chatbots</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your knowledge-based chatbots
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/admin/create"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Chatbot
          </Link>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Chatbot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      URL
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {chatbots.map((chatbot) => (
                    <tr key={chatbot.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Bot className="h-10 w-10 text-primary-500" />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {chatbot.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {chatbot.system_prompt?.substring(0, 60)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            chatbot.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {chatbot.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(chatbot.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <code className="bg-gray-100 px-2 py-1 rounded">
                          /{chatbot.slug}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link
                            to={`/admin/chatbot/${chatbot.id}`}
                            className="text-primary-600 hover:text-primary-900"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/admin/edit/${chatbot.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleToggleActive(chatbot)}
                            className={`${
                              chatbot.is_active
                                ? 'text-yellow-600 hover:text-yellow-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={chatbot.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {chatbot.is_active ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(chatbot)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {chatbots.length === 0 && (
                <div className="text-center py-12">
                  <Bot className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No chatbots</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating a new chatbot.
                  </p>
                  <div className="mt-6">
                    <Link
                      to="/admin/create"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Chatbot
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}