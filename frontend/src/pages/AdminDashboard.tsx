import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AdminLayout from '../components/admin/AdminLayout'
import ChatbotList from '../components/admin/ChatbotList'
import ChatbotForm from '../components/admin/ChatbotForm'
import ChatbotDetails from '../components/admin/ChatbotDetails'
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard'

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    setIsAuthenticated(!!token)
  }, [])

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<ChatbotList />} />
        <Route path="/create" element={<ChatbotForm />} />
        <Route path="/edit/:id" element={<ChatbotForm />} />
        <Route path="/chatbot/:id" element={<ChatbotDetails />} />
        <Route path="/analytics" element={<AnalyticsDashboard />} />
      </Routes>
    </AdminLayout>
  )
}