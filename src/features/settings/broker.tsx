import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Eye, EyeOff, KeyRound, RefreshCw, Zap } from 'lucide-react'
import { brokerApi } from '@/lib/broker-api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const brokerFormSchema = z.object({
  api_key: z.string().min(1, 'API Key is required'),
  api_secret: z.string().min(1, 'API Secret is required'),
})

type BrokerFormValues = z.infer<typeof brokerFormSchema>

export function SettingsBroker() {
  const queryClient = useQueryClient()
  const [showSecret, setShowSecret] = useState(false)
  const [tokenCopied, setTokenCopied] = useState(false)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['broker-settings'],
    queryFn: brokerApi.getSettings,
  })

  const form = useForm<BrokerFormValues>({
    resolver: zodResolver(brokerFormSchema),
    defaultValues: { api_key: '', api_secret: '' },
  })

  useEffect(() => {
    if (settings) {
      form.reset({
        api_key: settings.api_key ?? '',
        api_secret: settings.api_secret ?? '',
      })
    }
  }, [settings, form])

  const saveMutation = useMutation({
    mutationFn: brokerApi.saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broker-settings'] })
      toast.success('Credentials saved', { description: 'Groww API credentials have been saved successfully.' })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to save credentials.'
      toast.error('Error', { description: msg })
    },
  })

  const tokenMutation = useMutation({
    mutationFn: brokerApi.generateToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broker-settings'] })
      toast.success('Token generated', { description: 'Groww access token has been generated and saved.' })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to generate token.'
      toast.error('Token generation failed', { description: msg })
    },
  })

  const onSubmit = (values: BrokerFormValues) => {
    saveMutation.mutate(values)
  }

  const handleCopyToken = () => {
    if (settings?.access_token) {
      navigator.clipboard.writeText(settings.access_token)
      setTokenCopied(true)
      setTimeout(() => setTokenCopied(false), 2000)
    }
  }

  const tokenAge = settings?.token_generated_at
    ? new Date(settings.token_generated_at).toLocaleString()
    : null

  return (
    <div className='space-y-6 w-full'>
      <div>
        <h3 className='text-lg font-medium'>Broker Integration</h3>
        <p className='text-sm text-muted-foreground'>
          Connect your Groww account for algo trading and portfolio management.
        </p>
      </div>
      <Separator />

      {/* Credentials Card */}
      <Card className='border-0 shadow-sm'>
        <CardHeader className='border-b border-indigo-50 dark:border-indigo-950'>
          <CardTitle className='flex items-center gap-2 text-base'>
            <span className='rounded-lg p-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'>
              <KeyRound className='h-4 w-4' />
            </span>
            Groww API Credentials
          </CardTitle>
          <CardDescription>
            Enter your Groww Trade API key and secret. These are used to generate an access token for all trading operations.{' '}
            <a
              href='https://groww.in/trade-api/docs/python-sdk'
              target='_blank'
              rel='noopener noreferrer'
              className='underline text-primary'
            >
              View documentation
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className='text-sm text-muted-foreground'>Loading...</p>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
                <FormField
                  control={form.control}
                  name='api_key'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input placeholder='Enter your Groww API key' {...field} />
                      </FormControl>
                      <FormDescription>
                        Found in your Groww Trade API dashboard.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='api_secret'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Secret</FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <Input
                            type={showSecret ? 'text' : 'password'}
                            placeholder='Enter your Groww API secret'
                            {...field}
                          />
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='absolute right-0 top-0 h-full px-3 hover:bg-transparent'
                            onClick={() => setShowSecret((p) => !p)}
                          >
                            {showSecret ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Keep this secret. Never share it publicly.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type='submit' disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : 'Save Credentials'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* Token Card */}
      <Card className='border-0 shadow-sm'>
        <CardHeader className='border-b border-emerald-50 dark:border-emerald-950'>
          <CardTitle className='flex items-center gap-2 text-base'>
            <span className='rounded-lg p-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'>
              <Zap className='h-4 w-4' />
            </span>
            Access Token
          </CardTitle>
          <CardDescription>
            Generate an access token using your saved credentials. The token is required for all Groww API calls and should be refreshed periodically.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {settings?.access_token ? (
            <Alert className='border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/40'>
              <CheckCircle2 className='h-4 w-4 text-emerald-600 dark:text-emerald-400' />
              <AlertTitle className='flex items-center gap-2 text-emerald-700 dark:text-emerald-300'>
                Token Active
                <span className='rounded-full bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 text-xs font-normal text-emerald-700 dark:text-emerald-300'>Groww</span>
              </AlertTitle>
              <AlertDescription className='space-y-2 mt-2'>
                <div className='font-mono text-xs break-all bg-white dark:bg-background rounded p-2 border border-emerald-100 dark:border-emerald-900'>
                  {settings.access_token.slice(0, 40)}…
                </div>
                {tokenAge && (
                  <p className='text-xs text-muted-foreground'>Generated: {tokenAge}</p>
                )}
                <Button variant='outline' size='sm' onClick={handleCopyToken}
                  className='border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950'>
                  {tokenCopied ? 'Copied!' : 'Copy Full Token'}
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <p className='text-sm text-muted-foreground'>
              No token generated yet. Save your credentials first, then generate a token.
            </p>
          )}

          <Button
            onClick={() => tokenMutation.mutate()}
            disabled={tokenMutation.isPending || !settings?.api_key}
            className='gap-2'
          >
            <RefreshCw className={`h-4 w-4 ${tokenMutation.isPending ? 'animate-spin' : ''}`} />
            {tokenMutation.isPending ? 'Generating...' : settings?.access_token ? 'Regenerate Token' : 'Generate Token'}
          </Button>

          {!settings?.api_key && (
            <p className='text-xs text-muted-foreground'>
              Save your API credentials above before generating a token.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
