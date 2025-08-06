import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { MessageSquare, Users, Bot, TrendingUp } from 'lucide-react'

interface AnalyticsData {
  stats: {
    total_events: number
    active_days: number
    total_messages: number
    total_conversations: number
    document_queries: number
  }
  dailyActivity: Array<{
    date: string
    events: number
    messages: number
    conversations: number
  }>
  eventTypes: Array<{
    event_type: string
    count: number
    percentage: number
  }>
  recentEvents: Array<{
    event_type: string
    event_data: any
    created_at: string
  }>
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChatbot, setSelectedChatbot] = useState<string>('all')
  const [chatbots, setChatbots] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    loadChatbots()
  }, [])

  useEffect(() => {
    if (selectedChatbot && selectedChatbot !== 'all') {
      loadAnalytics(selectedChatbot)
    }
  }, [selectedChatbot])

  const loadChatbots = async () => {
    try {
      const response = await fetch('/api/admin/chatbots', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setChatbots(data)
        if (data.length > 0) {
          setSelectedChatbot(data[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load chatbots:', error)
    }
  }

  const loadAnalytics = async (chatbotId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/chatbots/${chatbotId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const stats = [
    {
      name: 'Total Messages',
      value: analytics?.stats.total_messages || 0,
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Total Conversations',
      value: analytics?.stats.total_conversations || 0,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Document Queries',
      value: analytics?.stats.document_queries || 0,
      icon: Bot,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      name: 'Active Days',
      value: analytics?.stats.active_days || 0,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor chatbot performance and usage
          </p>
        </div>
        
        <div className="min-w-0 flex-1 md:px-8 lg:px-0 xl:col-span-6">
          <div className="flex items-center px-6 py-4 md:max-w-3xl md:mx-auto lg:max-w-none lg:mx-0 xl:px-0">
            <div className="w-full">
              <label htmlFor="chatbot-select" className="sr-only">
                Select chatbot
              </label>
              <div className="relative">
                <select
                  id="chatbot-select"
                  value={selectedChatbot}
                  onChange={(e) => setSelectedChatbot(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                  {chatbots.map((chatbot) => (
                    <option key={chatbot.id} value={chatbot.id}>
                      {chatbot.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`p-3 rounded-md ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Conversations */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Conversations</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.dailyActivity || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Bar dataKey="conversations" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Messages */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Messages</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.dailyActivity || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Line 
                  type="monotone" 
                  dataKey="messages" 
                  stroke="#10B981" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Usage Summary */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Usage Summary
          </h3>
          <div className="mt-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Messages per Conversation
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {analytics?.stats.total_conversations 
                    ? Math.round(analytics.stats.total_messages / analytics.stats.total_conversations)
                    : 0
                  }
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Total Events
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {analytics?.stats.total_events?.toLocaleString() || 0}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Document Usage %
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {analytics?.stats.total_messages 
                    ? Math.round((analytics.stats.document_queries / analytics.stats.total_messages) * 100)
                    : 0
                  }%
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Types & Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Event Types Breakdown */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Event Types</h3>
          <div className="space-y-3">
            {analytics?.eventTypes.map((event) => (
              <div key={event.event_type} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {event.event_type.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{event.count}</span>
                  <span className="text-xs text-gray-400">({(Number(event.percentage) || 0).toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {analytics?.recentEvents.slice(0, 10).map((event, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span className="font-medium text-gray-900 capitalize">
                    {event.event_type.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-gray-500">
                  {new Date(event.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            ))}
            {(!analytics?.recentEvents || analytics.recentEvents.length === 0) && (
              <p className="text-gray-500 text-sm">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}