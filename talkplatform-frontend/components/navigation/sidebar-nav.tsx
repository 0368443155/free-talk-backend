"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Home,
  Users, 
  MessageCircle, 
  GraduationCap, 
  CreditCard, 
  Calendar,
  BookOpen,
  Star,
  BarChart3,
  Settings,
  HelpCircle,
  Mic,
  Video,
  Wallet,
  User,
  Bell,
  Award,
  TrendingUp,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ArrowUpRight
} from 'lucide-react';
import { useUser } from '@/store/user-store';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  className?: string;
}

const studentNavItems = [
  {
    title: 'Overview',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: Home,
        description: 'Your learning overview'
      },
      {
        title: 'Activity',
        href: '/activity',
        icon: BarChart3,
        description: 'Track your progress'
      }
    ]
  },
  {
    title: 'Learning',
    items: [
      {
        title: 'Free Talk Lobby',
        href: '/lobby',
        icon: Users,
        badge: 'Live',
        description: 'Join conversation rooms'
      },
      {
        title: 'Find Teachers',
        href: '/teachers',
        icon: GraduationCap,
        description: 'Browse teacher marketplace'
      },
      {
        title: 'Marketplace',
        href: '/marketplace',
        icon: BookOpen,
        description: 'Buy learning materials'
      },
      {
        title: 'My Bookings',
        href: '/bookings',
        icon: Calendar,
        description: 'Your class bookings'
      },
      {
        title: 'My Learning',
        href: '/student/my-learning',
        icon: GraduationCap,
        description: 'My courses and enrollments'
      },
      {
        title: 'My Purchases',
        href: '/marketplace/my-purchases',
        icon: BookOpen,
        description: 'Purchased materials'
      }
    ]
  },
  {
    title: 'Payments',
    items: [
      {
        title: 'Credits',
        href: '/credits',
        icon: Wallet,
        description: 'Manage your credits'
      },
      {
        title: 'Purchase History',
        href: '/credits/transactions',
        icon: CreditCard,
        description: 'Payment history'
      }
    ]
  },
  {
    title: 'Account',
    items: [
      {
        title: 'Profile',
        href: '/profile',
        icon: User,
        description: 'Manage your profile'
      },
      {
        title: 'Achievements',
        href: '/achievements',
        icon: Award,
        description: 'Your learning milestones'
      },
      {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        description: 'Account preferences'
      }
    ]
  }
];

const teacherNavItems = [
  {
    title: 'Teaching',
    items: [
      {
        title: 'Teacher Dashboard',
        href: '/teacher/dashboard',
        icon: BarChart3,
        description: 'Teaching analytics'
      },
      {
        title: 'My Materials',
        href: '/teacher/materials',
        icon: BookOpen,
        description: 'Manage your materials'
      },
      {
        title: 'Availability',
        href: '/teacher/availability',
        icon: Clock,
        description: 'Set your schedule'
      },
      {
        title: 'My Bookings',
        href: '/bookings',
        icon: Calendar,
        description: 'Student bookings'
      },
      {
        title: 'Verification',
        href: '/teacher/verification',
        icon: Star,
        description: 'Verification status'
      }
    ]
  },
  {
    title: 'Profile',
    items: [
      {
        title: 'Teacher Profile',
        href: '/teacher/profile',
        icon: GraduationCap,
        description: 'Manage teaching profile'
      },
      {
        title: 'Reviews',
        href: '/teacher/reviews',
        icon: Star,
        description: 'Student feedback'
      }
    ]
  },
  {
    title: 'Earnings',
    items: [
      {
        title: 'Revenue Dashboard',
        href: '/teacher/revenue',
        icon: DollarSign,
        description: 'View earnings and revenue'
      },
      {
        title: 'Withdrawals',
        href: '/teacher/revenue/withdraw',
        icon: ArrowUpRight,
        description: 'Request withdrawal'
      }
    ]
  },
  {
    title: 'Earnings (Old)',
    items: [
      {
        title: 'Revenue',
        href: '/teacher/earnings',
        icon: TrendingUp,
        description: 'Teaching income'
      },
      {
        title: 'Affiliate Program',
        href: '/teacher/affiliate',
        icon: Users,
        description: 'Referral earnings'
      }
    ]
  }
];

const adminNavItems = [
  {
    title: 'Administration',
    items: [
      {
        title: 'Admin Dashboard',
        href: '/admin',
        icon: BarChart3,
        description: 'System overview'
      },
      {
        title: 'User Management',
        href: '/admin/users',
        icon: Users,
        description: 'Manage users'
      },
      {
        title: 'Teacher Verification',
        href: '/admin/teachers',
        icon: GraduationCap,
        description: 'Approve teachers'
      },
      {
        title: 'LiveKit Monitoring',
        href: '/admin/livekit',
        icon: Video,
        description: 'System monitoring'
      },
      {
        title: 'Revenue Analytics',
        href: '/admin/revenue',
        icon: TrendingUp,
        description: 'Financial overview'
      }
    ]
  }
];

const helpItems = [
  {
    title: 'Help & Support',
    href: '/help',
    icon: HelpCircle,
    description: 'Get assistance'
  },
  {
    title: 'Feedback',
    href: '/feedback',
    icon: MessageCircle,
    description: 'Share your thoughts'
  }
];

export default function SidebarNav({ className }: SidebarNavProps) {
  const pathname = usePathname();
  const { userInfo: user } = useUser();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  // Build navigation items based on user role
  const navigationSections = [...studentNavItems];
  
  if (isTeacher) {
    navigationSections.push(...teacherNavItems);
  }
  
  if (isAdmin) {
    navigationSections.push(...adminNavItems);
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">
              TalkConnect
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 p-0"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Become Teacher Button (for non-teachers) */}
      {!collapsed && user && !isTeacher && (
        <div className="p-4 border-b bg-blue-50">
          <Link href="/teacher/verification">
            <Button className="w-full" variant="default">
              <GraduationCap className="w-4 h-4 mr-2" />
              Become a Teacher
            </Button>
          </Link>
        </div>
      )}

      {/* User Info */}
      {!collapsed && user && (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-medium">
                {user.username?.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{user.username}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {user.role || 'student'}
                </Badge>
                {user.credit_balance !== undefined && (
                  <span className="text-xs text-green-600 font-medium">
                    {user.credit_balance} credits
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {navigationSections.map((section, index) => (
          <div key={index}>
            {!collapsed && (
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:text-blue-600 hover:bg-gray-100",
                      collapsed && "justify-center"
                    )}>
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                    {/* Tooltip for collapsed state */}
                    {collapsed && (
                      <div className="sr-only">{item.title}</div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Separator */}
        <Separator />

        {/* Help Section */}
        <div>
          {!collapsed && (
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Support
            </h3>
          )}
          <div className="space-y-1">
            {helpItems.map((item) => {
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-700 hover:text-blue-600 hover:bg-gray-100",
                    collapsed && "justify-center"
                  )}>
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {!collapsed && (
        <div className="p-4 border-t bg-gray-50 space-y-2">
          <Button 
            size="sm" 
            className="w-full" 
            onClick={() => window.location.href = '/meetings'}
          >
            <Mic className="w-4 h-4 mr-2" />
            Quick Talk
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => window.location.href = '/teachers'}
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Find Teacher
          </Button>
        </div>
      )}
    </div>
  );
}