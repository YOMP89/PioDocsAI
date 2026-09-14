import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Nunito, Playfair_Display } from 'next/font/google'
import { AssistantWidget } from '@/components/AssistantWidget'
import './globals.css'

// Tipografías de la guía de marca del Colegio Franciscano de Pío XII:
// Playfair Display para títulos (H1/H2), Nunito para el resto de la interfaz.
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'PioDocsAI | Acompañamiento académico',
  description: 'Sistema inteligente para la detección temprana de dificultades académicas.',
  generator: 'PioDocsAI',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#F7F3EC',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" className="bg-background"><body className={`${nunito.variable} ${playfair.variable} antialiased`}>{children}<AssistantWidget />{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
