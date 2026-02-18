import '@/styles/globals.scss'
import type { AppProps } from 'next/app'
import { AppLayout } from '@/components/global/appLayout'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AppLayout>
      <Component {...pageProps} />
    </AppLayout>
  )
}
