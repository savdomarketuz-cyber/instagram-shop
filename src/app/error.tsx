'use client'

import { useEffect } from 'react'
import { AlertCircle, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application Error:', error)
  }, [error])

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-10 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <AlertCircle size={40} className="text-red-500" />
      </div>
      
      <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">
        Nimadir noto&apos;g'ri ketdi
      </h2>
      <p className="text-gray-500 text-sm max-w-xs mx-auto mb-8 font-medium">
        Xato yuz berdi. Iltimos, sahifani yangilang yoki asosiy sahifaga qayting.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
        >
          <RotateCcw size={16} />
          Qayta urinish
        </button>
        
        <Link
          href="/"
          className="flex items-center justify-center gap-2 bg-gray-100 text-gray-900 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
        >
          <Home size={16} />
          Bosh sahifa
        </Link>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-10 p-4 bg-gray-50 rounded-xl text-left text-[10px] text-red-400 overflow-auto max-w-full font-mono border border-gray-100">
          {error.message}
          {error.stack}
        </pre>
      )}
    </div>
  )
}
