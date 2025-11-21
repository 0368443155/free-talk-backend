"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Home } from 'lucide-react';

// Path to readable name mapping
const pathNames: Record<string, string> = {
  dashboard: 'Dashboard',
  lobby: 'Free Talk Lobby',
  teachers: 'Teachers',
  'my-classes': 'My Classes',
  classes: 'Classes',
  credits: 'Credits',
  profile: 'Profile',
  settings: 'Settings',
  admin: 'Admin',
  teacher: 'Teacher',
  students: 'Students',
  earnings: 'Earnings',
  availability: 'Availability',
  reviews: 'Reviews',
  affiliate: 'Affiliate',
  purchase: 'Purchase',
  transactions: 'Transactions',
  balance: 'Balance',
  featured: 'Featured',
  book: 'Book',
  enrolled: 'Enrolled',
  teaching: 'Teaching',
  schedule: 'Schedule',
  create: 'Create',
  edit: 'Edit',
  livekit: 'LiveKit Monitoring',
  users: 'User Management',
  revenue: 'Revenue Analytics',
  help: 'Help & Support',
  feedback: 'Feedback',
  notifications: 'Notifications',
  activity: 'Activity',
  achievements: 'Achievements'
};

// Special routes that should be hidden from breadcrumbs
const hiddenRoutes = ['api', 'auth'];

export default function BreadcrumbNav() {
  const pathname = usePathname();
  
  // Don't show breadcrumbs on root or auth pages
  if (pathname === '/' || pathname.startsWith('/auth') || pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return null;
  }

  const pathSegments = pathname.split('/').filter(segment => 
    segment && !hiddenRoutes.includes(segment)
  );

  if (pathSegments.length === 0) {
    return null;
  }

  const breadcrumbItems = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/');
    const isLast = index === pathSegments.length - 1;
    
    // Handle dynamic segments (UUIDs, etc)
    let displayName = pathNames[segment] || segment;
    
    // If it looks like an ID (UUID-like), try to get a better name
    if (/^[a-f0-9-]{36}$/.test(segment) || /^[a-zA-Z0-9-]{8,}$/.test(segment)) {
      displayName = `ID: ${segment.slice(0, 8)}...`;
    }

    // Capitalize first letter if not in pathNames
    if (!pathNames[segment] && displayName === segment) {
      displayName = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    }

    return {
      href,
      label: displayName,
      isLast
    };
  });

  // Add home as the first item if not already on dashboard
  const items = pathSegments[0] !== 'dashboard' 
    ? [{ href: '/dashboard', label: 'Dashboard', isLast: false }, ...breadcrumbItems]
    : breadcrumbItems;

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <Breadcrumb>
          <BreadcrumbList>
            {/* Home icon for dashboard */}
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard" className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  <span className="sr-only">Dashboard</span>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            
            {items.map((item, index) => (
              <div key={item.href} className="flex items-center">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {item.isLast ? (
                    <BreadcrumbPage className="font-medium">
                      {item.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link 
                        href={item.href}
                        className="text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {item.label}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}