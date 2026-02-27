declare module 'npm:web-push' {
  const webpush: any
  export default webpush
}

declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}
