import type { Metadata } from 'next'
import { Noto_Sans } from 'next/font/google'
import './globals.css'

const notoSans = Noto_Sans({
  subsets: ['latin', 'devanagari'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Sahara — Aapka Sahara, Hamesha',
  description: 'AI-powered eldercare platform for families across India',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="hi" className={notoSans.variable}>
      <head>
        {/* Tabler Icons CDN */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.9.0/dist/tabler-icons.min.css"
        />
      </head>
      <body className={`${notoSans.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}
