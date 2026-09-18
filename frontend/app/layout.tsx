import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Nunito, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

// Tipografías de la guía de marca del Colegio Franciscano de Pío XII:
// Plus Jakarta Sans para títulos y subtítulos (H1/H2) — geométrica, redondeada
// y moderna, alineada con la referencia visual de modelo.png (en vez de la
// serif Playfair Display, que desentonaba con esa estética). Nunito se
// mantiene para el resto de la interfaz.
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' })
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-heading' })

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
  return <html lang="es" className="bg-background"><body className={`${nunito.variable} ${plusJakarta.variable} antialiased`}>{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
