import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'

interface DocumentUploaderProps {
  chatbotId: string
  onUploadComplete: () => void
}

interface UploadFile {
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  file: File
}

export default function DocumentUploader({ chatbotId, onUploadComplete }: DocumentUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      status: 'pending' as const,
      progress: 0,
      file: file
    }))
    
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true
  })

  const removeFile = (fileId: string) => {
    setFiles(files => files.filter(f => f.id !== fileId))
  }

  const uploadFiles = async () => {
    if (files.length === 0) return
    
    setIsUploading(true)
    
    for (const fileWrapper of files) {
      if (fileWrapper.status !== 'pending') continue
      
      setFiles(files => 
        files.map(f => 
          f.id === fileWrapper.id 
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        )
      )

      try {
        const originalFile = fileWrapper.file
        
        console.log('File object before upload:', {
          name: originalFile.name,
          size: originalFile.size,
          type: originalFile.type,
          lastModified: originalFile.lastModified,
          id: fileWrapper.id,
          status: fileWrapper.status,
          progress: fileWrapper.progress
        })
        
        const formData = new FormData()
        formData.append('file', originalFile)

        console.log(`Uploading file: ${originalFile.name} to chatbot ${chatbotId}`)
        console.log('Auth token:', localStorage.getItem('adminToken') ? 'Present' : 'Missing')
        console.log('FormData entries:', Array.from(formData.entries()))

        const response = await fetch(`/api/admin/chatbots/${chatbotId}/documents/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: formData
        })

        console.log('Upload response status:', response.status)
        console.log('Upload response headers:', Object.fromEntries(response.headers.entries()))

        if (response.ok) {
          const result = await response.json()
          console.log('Upload success:', result)
          setFiles(files => 
            files.map(f => 
              f.id === fileWrapper.id 
                ? { ...f, status: 'success', progress: 100 }
                : f
            )
          )
        } else {
          const error = await response.text()
          console.error('Upload error response:', response.status, error)
          setFiles(files => 
            files.map(f => 
              f.id === fileWrapper.id 
                ? { ...f, status: 'error', error: `${response.status}: ${error}` }
                : f
            )
          )
        }
      } catch (error) {
        console.error('Upload exception:', error)
        setFiles(files => 
          files.map(f => 
            f.id === fileWrapper.id 
              ? { ...f, status: 'error', error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` }
              : f
          )
        )
      }
    }
    
    setIsUploading(false)
    onUploadComplete()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'uploading':
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
      default:
        return <FileText className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive
            ? 'Drop the files here...'
            : 'Drag & drop files here, or click to select'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Supports PDF, Word, PowerPoint, Excel, and text files (max 50MB each)
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Files to Upload</h3>
          </div>
          
          <ul className="divide-y divide-gray-200">
            {files.map((file) => (
              <li key={file.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(file.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.file.size)}
                        {file.error && (
                          <span className="ml-2 text-red-600">• {file.error}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {file.status === 'pending' && (
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {file.status === 'uploading' && (
                  <div className="mt-2">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {files.length} file{files.length !== 1 ? 's' : ''} ready
              </p>
              <div className="space-x-2">
                <button
                  onClick={() => setFiles([])}
                  className="text-sm text-gray-600 hover:text-gray-800"
                  disabled={isUploading}
                >
                  Clear All
                </button>
                <button
                  onClick={uploadFiles}
                  disabled={isUploading || files.filter(f => f.status === 'pending').length === 0}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload Files'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}