import { SWRConfig } from 'swr'
import { fetcher } from './lib/swr'
import { ToastProvider } from './components/Toast'
import { AppRouter } from './app/AppRouter'

function App() {
  return (
    <ToastProvider>
      <SWRConfig
        value={{
          fetcher,
          revalidateOnFocus: false,
          dedupingInterval: 5000,
          focusThrottleInterval: 10000,
          errorRetryCount: 2,
        }}
      >
        <AppRouter />
      </SWRConfig>
    </ToastProvider>
  )
}

export default App
