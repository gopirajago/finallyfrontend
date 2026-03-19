import { useEffect, useRef, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'

const SYMBOLS: { label: string; tv: string }[] = [
  { label: 'NIFTY',     tv: 'NSE:NIFTY' },
  { label: 'BANKNIFTY', tv: 'NSE:BANKNIFTY' },
  { label: 'SENSEX',    tv: 'BSE:SENSEX' },
  { label: 'NIFTY IT',  tv: 'NSE:NIFTYIT' },
  { label: 'RELIANCE',  tv: 'NSE:RELIANCE' },
  { label: 'INFY',      tv: 'NSE:INFY' },
  { label: 'TCS',       tv: 'NSE:TCS' },
  { label: 'HDFCBANK',  tv: 'NSE:HDFCBANK' },
  { label: 'ICICIBANK', tv: 'NSE:ICICIBANK' },
  { label: 'SBIN',      tv: 'NSE:SBIN' },
]

const INTERVALS: { label: string; value: string }[] = [
  { label: '1m',  value: '1'  },
  { label: '3m',  value: '3'  },
  { label: '5m',  value: '5'  },
  { label: '15m', value: '15' },
  { label: '1h',  value: '60' },
  { label: '1D',  value: 'D'  },
  { label: '1W',  value: 'W'  },
]

function SymBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
        active
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {label}
    </button>
  )
}

function IvBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  )
}

export function TradingPlatform() {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef    = useRef<any>(null)
  const [symbol,   setSymbol]   = useState('NSE:NIFTY')
  const [interval, setInterval] = useState('5')
  const [theme,    setTheme]    = useState<'light' | 'dark'>('dark')

  // Detect system/app dark mode
  useEffect(() => {
    const update = () =>
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    update()
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // Load / reload TradingView widget whenever symbol, interval or theme changes
  useEffect(() => {
    if (!containerRef.current) return

    // Clear previous widget
    containerRef.current.innerHTML = ''
    widgetRef.current = null

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => {
      if (!(window as any).TradingView || !containerRef.current) return
      widgetRef.current = new (window as any).TradingView.widget({
        autosize: true,
        symbol,
        interval,
        timezone: 'Asia/Kolkata',
        theme,
        style: '1',              // Candlestick
        locale: 'en',
        toolbar_bg: theme === 'dark' ? '#09090b' : '#ffffff',
        enable_publishing: false,
        allow_symbol_change: true,
        save_image: false,
        container_id: 'tv_chart_container',
        studies: [
          'STD;Volume',
          'STD;RSI',
          'STD;MACD',
        ],
        show_popup_button: true,
        popup_width: '1000',
        popup_height: '650',
        withdateranges: true,
        hide_side_toolbar: false,
        details: true,
        hotlist: false,
        calendar: false,
        news: ['headlines'],
        watchlist: [
          'NSE:NIFTY', 'NSE:BANKNIFTY', 'BSE:SENSEX',
          'NSE:RELIANCE', 'NSE:INFY', 'NSE:TCS',
          'NSE:HDFCBANK', 'NSE:ICICIBANK', 'NSE:SBIN',
        ],
      })
    }

    // If tv.js already loaded, don't re-add the script — just init widget directly
    if ((window as any).TradingView) {
      script.onload?.(new Event('load'))
    } else {
      document.head.appendChild(script)
    }

    return () => {
      try { script.remove() } catch {}
    }
  }, [symbol, interval, theme])

  const activeLabel = SYMBOLS.find(s => s.tv === symbol)?.label ?? symbol

  return (
    <>
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <Search /><ThemeSwitch /><ConfigDrawer /><ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-col gap-3 p-0 sm:p-3'>

        {/* ── Controls row ── */}
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 pt-3 sm:px-0 sm:pt-0'>
          <div>
            <h1 className='text-lg font-bold tracking-tight'>Trading Platform</h1>
            <p className='text-xs text-muted-foreground'>TradingView Advanced Charts · {activeLabel}</p>
          </div>
          <div className='flex items-center gap-1.5 flex-wrap'>
            {/* Interval picker */}
            <div className='flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5'>
              {INTERVALS.map(iv => (
                <IvBtn
                  key={iv.value}
                  label={iv.label}
                  active={interval === iv.value}
                  onClick={() => setInterval(iv.value)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Symbol selector ── */}
        <div className='flex flex-wrap gap-1.5 px-3 sm:px-0'>
          {SYMBOLS.map(s => (
            <SymBtn
              key={s.tv}
              label={s.label}
              active={symbol === s.tv}
              onClick={() => setSymbol(s.tv)}
            />
          ))}
        </div>

        {/* ── TradingView Chart ── */}
        <div
          className='rounded-xl border border-border/50 overflow-hidden shadow-sm mx-3 sm:mx-0'
          style={{ height: 'calc(100vh - 220px)', minHeight: '600px' }}
        >
          <div
            id='tv_chart_container'
            ref={containerRef}
            style={{ width: '100%', height: '100%' }}
          />
        </div>

      </Main>
    </>
  )
}
