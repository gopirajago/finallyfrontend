import { Logo } from '@/assets/logo'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='relative grid h-svh max-w-none items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-white dark:from-indigo-950/40 dark:via-background dark:to-background'>
      {/* Decorative blobs */}
      <div className='pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-100/60 blur-3xl dark:bg-indigo-900/20' />
      <div className='pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-100/40 blur-3xl dark:bg-indigo-900/10' />

      <div className='relative mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:w-[480px] sm:p-8'>
        <div className='mb-4 flex items-center justify-center'>
          <Logo className='me-2' />
          <h1 className='text-xl font-semibold text-indigo-700 dark:text-indigo-300'>Finally</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
