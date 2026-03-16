import {
  Bot,
  BarChart2,
  CandlestickChart,
  IndianRupee,
  LayoutDashboard,
  PieChart,
  Settings,
  TrendingUp,
  Wrench,
  UserCog,
  Command,
  Zap,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Admin',
    email: '',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Finally',
      logo: Command,
      plan: 'SaaS Platform',
    },
  ],
  navGroups: [
    {
      title: 'General',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'Portfolio',
          url: '/portfolio',
          icon: PieChart,
        },
        {
          title: 'Analysis',
          url: '/analysis',
          icon: BarChart2,
        },
        {
          title: 'Options',
          url: '/options',
          icon: CandlestickChart,
        },
        {
          title: 'Strategy',
          url: '/strategy',
          icon: Zap,
        },
        {
          title: 'Profit & Loss',
          url: '/pnl',
          icon: IndianRupee,
        },
      ],
    },
    {
      title: 'Other',
      items: [
        {
          title: 'Settings',
          icon: Settings,
          items: [
            {
              title: 'Profile',
              url: '/settings',
              icon: UserCog,
            },
            {
              title: 'Account',
              url: '/settings/account',
              icon: Wrench,
            },
            {
              title: 'Broker',
              url: '/settings/broker',
              icon: TrendingUp,
            },
            {
              title: 'Claude',
              url: '/settings/claude',
              icon: Bot,
            },
          ],
        },
      ],
    },
  ],
}
