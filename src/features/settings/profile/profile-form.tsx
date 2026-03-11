import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { usersApi } from '@/lib/users-api'
import { authApi } from '@/lib/auth-api'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, User, Mail, AtSign, Calendar, ShieldCheck, KeyRound } from 'lucide-react'

// ── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  full_name: z.string().max(100).optional().or(z.literal('')),
  username: z.string().min(2, 'Min 2 characters').max(30, 'Max 30 characters'),
  email: z.string().email('Invalid email'),
})

const passwordSchema = z.object({
  new_password: z.string().min(8, 'Min 8 characters'),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfileForm() {
  const { auth } = useAuthStore()
  const user = auth.user
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Fetch fresh data from server
  const { data: freshUser } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    initialData: user ?? undefined,
    staleTime: 30_000,
  })

  const displayName = freshUser?.full_name || freshUser?.username || 'User'
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  // Profile form
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: freshUser?.full_name ?? '',
      username: freshUser?.username ?? '',
      email: freshUser?.email ?? '',
    },
  })

  const profileMutation = useMutation({
    mutationFn: (payload: ProfileValues) => usersApi.updateMe({
      full_name: payload.full_name || undefined,
      username: payload.username,
      email: payload.email,
    }),
    onSuccess: (updated) => {
      auth.setUser({ ...user!, ...updated })
      setProfileMsg({ ok: true, text: 'Profile updated successfully.' })
      setTimeout(() => setProfileMsg(null), 3000)
    },
    onError: (e: any) => {
      setProfileMsg({ ok: false, text: e?.response?.data?.detail ?? 'Update failed.' })
    },
  })

  // Password form
  const pwForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { new_password: '', confirm_password: '' },
  })

  const pwMutation = useMutation({
    mutationFn: (payload: PasswordValues) => usersApi.updateMe({ password: payload.new_password }),
    onSuccess: () => {
      pwForm.reset()
      setPwMsg({ ok: true, text: 'Password changed successfully.' })
      setTimeout(() => setPwMsg(null), 3000)
    },
    onError: (e: any) => {
      setPwMsg({ ok: false, text: e?.response?.data?.detail ?? 'Failed to change password.' })
    },
  })

  return (
    <div className='space-y-8'>

      {/* ── Avatar + account overview ── */}
      <div className='flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/50'>
        <Avatar className='h-16 w-16 text-lg'>
          <AvatarFallback className='bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-xl'>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className='flex-1 min-w-0'>
          <div className='font-semibold text-base truncate'>{displayName}</div>
          <div className='text-sm text-muted-foreground truncate'>{freshUser?.email}</div>
          <div className='flex items-center gap-2 mt-1.5 flex-wrap'>
            {freshUser?.is_active
              ? <Badge className='bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs'>Active</Badge>
              : <Badge variant='destructive' className='text-xs'>Inactive</Badge>}
            {freshUser?.is_superuser && (
              <Badge className='bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-xs gap-1'>
                <ShieldCheck className='h-3 w-3' /> Superuser
              </Badge>
            )}
          </div>
        </div>
        <div className='hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground'>
          <span className='flex items-center gap-1'>
            <Calendar className='h-3 w-3' />
            Joined {freshUser?.created_at ? fmt(freshUser.created_at) : '—'}
          </span>
          <span className='text-muted-foreground/60'>ID #{freshUser?.id}</span>
        </div>
      </div>

      <Separator />

      {/* ── Profile info form ── */}
      <div>
        <div className='flex items-center gap-2 mb-4'>
          <User className='h-4 w-4 text-muted-foreground' />
          <h3 className='text-sm font-semibold'>Personal Information</h3>
        </div>

        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(d => profileMutation.mutate(d))} className='space-y-4'>
            <FormField
              control={profileForm.control}
              name='full_name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Your full name' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <FormField
                control={profileForm.control}
                name='username'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center gap-1.5'>
                      <AtSign className='h-3 w-3' /> Username
                    </FormLabel>
                    <FormControl>
                      <Input placeholder='username' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center gap-1.5'>
                      <Mail className='h-3 w-3' /> Email
                    </FormLabel>
                    <FormControl>
                      <Input type='email' placeholder='you@example.com' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {profileMsg && (
              <Alert variant={profileMsg.ok ? 'default' : 'destructive'} className='py-2'>
                {profileMsg.ok
                  ? <CheckCircle className='h-4 w-4' />
                  : <AlertCircle className='h-4 w-4' />}
                <AlertDescription>{profileMsg.text}</AlertDescription>
              </Alert>
            )}

            <Button type='submit' disabled={profileMutation.isPending} className='w-full sm:w-auto'>
              {profileMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </form>
        </Form>
      </div>

      <Separator />

      {/* ── Change password ── */}
      <div>
        <div className='flex items-center gap-2 mb-4'>
          <KeyRound className='h-4 w-4 text-muted-foreground' />
          <h3 className='text-sm font-semibold'>Change Password</h3>
        </div>

        <Form {...pwForm}>
          <form onSubmit={pwForm.handleSubmit(d => pwMutation.mutate(d))} className='space-y-4'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <FormField
                control={pwForm.control}
                name='new_password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type='password' placeholder='Min 8 characters' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={pwForm.control}
                name='confirm_password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type='password' placeholder='Repeat password' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {pwMsg && (
              <Alert variant={pwMsg.ok ? 'default' : 'destructive'} className='py-2'>
                {pwMsg.ok
                  ? <CheckCircle className='h-4 w-4' />
                  : <AlertCircle className='h-4 w-4' />}
                <AlertDescription>{pwMsg.text}</AlertDescription>
              </Alert>
            )}

            <Button type='submit' variant='outline' disabled={pwMutation.isPending} className='w-full sm:w-auto'>
              {pwMutation.isPending ? 'Updating…' : 'Update Password'}
            </Button>
          </form>
        </Form>
      </div>

      <Separator />

      {/* ── Account metadata ── */}
      <div>
        <h3 className='text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-xs'>Account Details</h3>
        <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
          {[
            { label: 'Account ID', value: `#${freshUser?.id}` },
            { label: 'Status', value: freshUser?.is_active ? 'Active' : 'Inactive' },
            { label: 'Role', value: freshUser?.is_superuser ? 'Superuser' : 'User' },
            { label: 'Member Since', value: freshUser?.created_at ? fmt(freshUser.created_at) : '—' },
            { label: 'Email', value: freshUser?.email ?? '—' },
            { label: 'Username', value: `@${freshUser?.username ?? '—'}` },
          ].map(({ label, value }) => (
            <div key={label} className='p-3 rounded-lg bg-muted/40 border border-border/40'>
              <div className='text-xs text-muted-foreground mb-0.5'>{label}</div>
              <div className='text-sm font-medium truncate'>{value}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
