declare module 'npm:web-push' {
  const webpush: any
  export default webpush
}

// Editor-only: Deno resolves npm: at runtime; reuse the app's installed types.
declare module 'npm:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js'
}

declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}
