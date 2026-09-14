/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Boton flotante negro con el logo "N" que Next.js muestra en modo dev
  // (abajo a la izquierda, no es parte de la interfaz de la app).
  devIndicators: false,
}

export default nextConfig
