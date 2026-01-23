/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_URL?: string
  readonly VITE_LIFF_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// iconify-icon の型定義
declare namespace JSX {
  interface IntrinsicElements {
    'iconify-icon': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        icon?: string
        width?: string | number
        height?: string | number
        class?: string
      },
      HTMLElement
    >
  }
}
