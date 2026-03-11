import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { authApi } from '@/lib/auth-api'
import { brokerApi } from '@/lib/broker-api'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CheckCircle2, XCircle, Clock, KeyRound, Bot,
  BarChart2, CandlestickChart, LogOut, ShieldCheck,
  User, RefreshCw,
} from 'lucide-react'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function tokenAge(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days > 0)  return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return `${mins}m ago`
}

// ── sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className='flex items-center justify-between py-2 border-b border-border/40 last:border-0'>
      <span className='text-xs text-muted-foreground'>{label}</span>
      <span className={`text-xs font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AccountForm() {
  const { auth } = useAuthStore()
  const user = auth.user
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      if (auth.refreshToken) await authApi.logout(auth.refreshToken)
    } catch {}
    finally {
      auth.reset()
      navigate({ to: '/sign-in', replace: true })
    }
  }

  const { data: freshUser, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    initialData: user ?? undefined,
    staleTime: 30_000,
  })

  const { data: broker, isLoading: brokerLoading } = useQuery({
    queryKey: ['broker-settings'],
    queryFn: brokerApi.getSettings,
    staleTime: 60_000,
  })

  const brokerConnected = !!(broker?.api_key && broker?.access_token)
  const tokenValid      = !!(broker?.access_token && broker?.token_generated_at)

  return (
    <div className='space-y-8'>

      {/* ── Account Summary ── */}
      <div>
        <div className='flex items-center gap-2 mb-4'>
          <User className='h-4 w-4 text-muted-foreground' />
          <h3 className='text-sm font-semibold'>Account Summary</h3>
        </div>
        <div className='rounded-xl border border-border/50 bg-muted/30 divide-y divide-border/40'>
          {userLoading ? (
            <div className='p-4 space-y-2'>
              {[1,2,3,4].map(i => <Skeleton key={i} className='h-5 w-full' />)}
            </div>
          ) : (
            <div className='p-4'>
              <InfoRow label='Account ID' value={`#${freshUser?.id}`} mono />
              <InfoRow label='Username' value={`@${freshUser?.username}`} mono />
              <InfoRow label='Email' value={freshUser?.email} />
              <InfoRow label='Member Since' value={freshUser?.created_at ? fmtDate(freshUser.created_at) : '—'} />
              <InfoRow
                label='Role'
                value={
                  freshUser?.is_superuser
                    ? <Badge className='bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-xs gap-1 h-5'><ShieldCheck className='h-3 w-3' />Superuser</Badge>
                    : <Badge variant='secondary' className='text-xs h-5'>User</Badge>
                }
              />
              <InfoRow
                label='Status'
                value={
                  freshUser?.is_active
                    ? <Badge className='bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs h-5 gap-1'><CheckCircle2 className='h-3 w-3' />Active</Badge>
                    : <Badge variant='destructive' className='text-xs h-5 gap-1'><XCircle className='h-3 w-3' />Inactive</Badge>
                }
              />
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* ── Broker Connection ── */}
      <div>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-2'>
            <BarChart2 className='h-4 w-4 text-muted-foreground' />
            <h3 className='text-sm font-semibold'>Broker Connection</h3>
          </div>
          <Button variant='outline' size='sm' className='h-7 text-xs gap-1.5' asChild>
            <Link to='/settings/broker'>
              <KeyRound className='h-3 w-3' /> Manage
            </Link>
          </Button>
        </div>
        <div className='rounded-xl border border-border/50 bg-muted/30'>
          {brokerLoading ? (
            <div className='p-4 space-y-2'>{[1,2,3].map(i => <Skeleton key={i} className='h-5 w-full' />)}</div>
          ) : (
            <div className='p-4'>
              <InfoRow
                label='Groww API'
                value={
                  brokerConnected
                    ? <Badge className='bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs h-5 gap-1'><CheckCircle2 className='h-3 w-3' />Connected</Badge>
                    : <Badge variant='outline' className='text-xs h-5 gap-1 text-muted-foreground'><XCircle className='h-3 w-3' />Not connected</Badge>
                }
              />
              <InfoRow
                label='Access Token'
                value={
                  tokenValid
                    ? <Badge className='bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs h-5 gap-1'><CheckCircle2 className='h-3 w-3' />Active</Badge>
                    : <Badge variant='outline' className='text-xs h-5 text-muted-foreground'>None</Badge>
                }
              />
              {broker?.token_generated_at && (
                <InfoRow
                  label='Token Generated'
                  value={
                    <span className='flex items-center gap-1 text-muted-foreground'>
                      <Clock className='h-3 w-3' />
                      {tokenAge(broker.token_generated_at)} · {fmt(broker.token_generated_at)}
                    </span>
                  }
                />
              )}
              {broker?.updated_at && (
                <InfoRow label='Last Updated' value={fmt(broker.updated_at)} />
              )}
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* ── Integrations ── */}
      <div>
        <div className='flex items-center gap-2 mb-4'>
          <Bot className='h-4 w-4 text-muted-foreground' />
          <h3 className='text-sm font-semibold'>Integrations</h3>
        </div>
        <div className='space-y-2'>
          {[
            {
              icon: <Bot className='h-4 w-4 text-indigo-500' />,
              title: 'Claude AI',
              desc: 'AI-powered trade signals via Anthropic Claude',
              href: '/settings/claude',
              label: 'Configure',
            },
            {
              icon: <CandlestickChart className='h-4 w-4 text-emerald-500' />,
              title: 'Groww Broker',
              desc: 'Live data, portfolio sync, and order management',
              href: '/settings/broker',
              label: 'Configure',
            },
          ].map(({ icon, title, desc, href, label }) => (
            <div key={title} className='flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20'>
              <div className='flex items-center gap-3'>
                <div className='rounded-lg p-1.5 bg-background border border-border/50'>{icon}</div>
                <div>
                  <div className='text-sm font-medium'>{title}</div>
                  <div className='text-xs text-muted-foreground'>{desc}</div>
                </div>
              </div>
              <Button variant='outline' size='sm' className='h-7 text-xs' asChild>
                <Link to={href}>{label}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* ── Active Pages ── */}
      <div>
        <div className='flex items-center gap-2 mb-4'>
          <BarChart2 className='h-4 w-4 text-muted-foreground' />
          <h3 className='text-sm font-semibold'>Quick Navigation</h3>
        </div>
        <div className='grid grid-cols-2 gap-2'>
          {[
            { label: 'Analysis', href: '/analysis', icon: <CandlestickChart className='h-3.5 w-3.5' /> },
            { label: 'Options', href: '/options', icon: <BarChart2 className='h-3.5 w-3.5' /> },
            { label: 'Portfolio', href: '/portfolio', icon: <RefreshCw className='h-3.5 w-3.5' /> },
            { label: 'Dashboard', href: '/', icon: <User className='h-3.5 w-3.5' /> },
          ].map(({ label, href, icon }) => (
            <Button key={label} variant='outline' size='sm' className='h-8 text-xs gap-1.5 justify-start' asChild>
              <Link to={href}>{icon}{label}</Link>
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* ── Danger Zone ── */}
      <div>
        <div className='flex items-center gap-2 mb-4'>
          <LogOut className='h-4 w-4 text-destructive' />
          <h3 className='text-sm font-semibold text-destructive'>Danger Zone</h3>
        </div>
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <div>
              <div className='text-sm font-medium'>Sign out of all sessions</div>
              <div className='text-xs text-muted-foreground mt-0.5'>
                Revoke all active tokens and sign out everywhere.
              </div>
            </div>
            <Button
              variant='destructive'
              size='sm'
              className='h-8 text-xs gap-1.5'
              onClick={handleSignOut}
            >
              <LogOut className='h-3.5 w-3.5' /> Sign Out
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}
