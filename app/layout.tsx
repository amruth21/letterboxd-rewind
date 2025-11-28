import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Letterboxd Rewind',
  description: 'Analyze your Letterboxd viewing stats',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
