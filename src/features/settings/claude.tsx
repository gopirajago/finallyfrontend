import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'
import { claudeApi, CLAUDE_MODELS } from '@/lib/claude-api'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const claudeFormSchema = z.object({
  api_key: z.string().min(1, 'API Key is required'),
  model: z.string().min(1, 'Model is required'),
})

type ClaudeFormValues = z.infer<typeof claudeFormSchema>

export function SettingsClaude() {
  const queryClient = useQueryClient()
  const [showKey, setShowKey] = useState(false)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['claude-settings'],
    queryFn: claudeApi.getSettings,
  })

  const form = useForm<ClaudeFormValues>({
    resolver: zodResolver(claudeFormSchema),
    defaultValues: { api_key: '', model: 'claude-opus-4-5' },
  })

  useEffect(() => {
    if (settings) {
      form.reset({
        api_key: settings.api_key ?? '',
        model: settings.model ?? 'claude-opus-4-5',
      })
    }
  }, [settings, form])

  const saveMutation = useMutation({
    mutationFn: claudeApi.saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claude-settings'] })
      toast.success('Saved', { description: 'Claude settings saved successfully.' })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to save settings.'
      toast.error('Error', { description: msg })
    },
  })

  const verifyMutation = useMutation({
    mutationFn: claudeApi.verifyKey,
    onSuccess: (data) => {
      toast.success('API key is valid', { description: `Connected to ${data.model}` })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Key verification failed.'
      toast.error('Invalid API key', { description: msg })
    },
  })

  const onSubmit = (values: ClaudeFormValues) => {
    saveMutation.mutate(values)
  }

  return (
    <div className='space-y-6 w-full'>
      <div>
        <h3 className='text-lg font-medium'>Claude Integration</h3>
        <p className='text-sm text-muted-foreground'>
          Connect Anthropic's Claude for AI-powered trading insights and analysis.
        </p>
      </div>
      <Separator />

      {/* Status badge */}
      {settings?.api_key && (
        <Alert className='border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/40'>
          <CheckCircle2 className='h-4 w-4 text-emerald-600 dark:text-emerald-400' />
          <AlertTitle className='text-emerald-700 dark:text-emerald-300'>API Key Configured</AlertTitle>
          <AlertDescription className='text-emerald-600 dark:text-emerald-400'>
            Active model: <span className='font-mono font-semibold'>{settings.model}</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Credentials Card */}
      <Card className='border-0 shadow-sm'>
        <CardHeader className='border-b border-indigo-50 dark:border-indigo-950'>
          <CardTitle className='flex items-center gap-2 text-base'>
            <span className='rounded-lg p-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'>
              <KeyRound className='h-4 w-4' />
            </span>
            Anthropic API Key
          </CardTitle>
          <CardDescription>
            Your API key from{' '}
            <a
              href='https://console.anthropic.com/settings/keys'
              target='_blank'
              rel='noopener noreferrer'
              className='underline text-primary'
            >
              console.anthropic.com
            </a>
            . Keys start with <span className='font-mono text-xs'>sk-ant-</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className='pt-4'>
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
                        <div className='relative'>
                          <Input
                            type={showKey ? 'text' : 'password'}
                            placeholder='sk-ant-api03-...'
                            {...field}
                          />
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='absolute right-0 top-0 h-full px-3 hover:bg-transparent'
                            onClick={() => setShowKey((p) => !p)}
                          >
                            {showKey ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>Never share this key publicly.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='model'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select a model' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CLAUDE_MODELS.map((m) => (
                            <SelectItem key={m} value={m}>
                              <div className='flex items-center gap-2'>
                                <Bot className='h-3.5 w-3.5 text-indigo-500' />
                                <span className='font-mono text-xs'>{m}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Choose the Claude model to use for AI features.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className='flex items-center gap-3'>
                  <Button type='submit' disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    className='gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950'
                    disabled={verifyMutation.isPending || !settings?.api_key}
                    onClick={() => verifyMutation.mutate()}
                  >
                    <ShieldCheck className={`h-4 w-4 ${verifyMutation.isPending ? 'animate-pulse' : ''}`} />
                    {verifyMutation.isPending ? 'Verifying...' : 'Verify Key'}
                  </Button>
                </div>
                {!settings?.api_key && (
                  <p className='text-xs text-muted-foreground'>Save your API key first to verify it.</p>
                )}
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
