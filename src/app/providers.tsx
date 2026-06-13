'use client'
import { PrivyProvider } from '@privy-io/react-auth'
import { AppProvider } from '@/context/AppContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? 'placeholder-app-id'}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || undefined}
      config={{
        loginMethods: ['email'],
        appearance: {
          theme: 'light',
          accentColor: '#7C3AED',
          logo: '/vivi-logo.svg',
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      <AppProvider>{children}</AppProvider>
    </PrivyProvider>
  )
}
