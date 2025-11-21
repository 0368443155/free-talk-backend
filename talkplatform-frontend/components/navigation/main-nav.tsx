"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Users,
    GraduationCap,
    CreditCard,
    Settings,
    BarChart3,
    User,
    LogOut,
    Bell,
    Search,
    Menu,
    X,
    Home,
    BookOpen,
    Calendar,
    Star,
    Wallet,
    ShoppingBag
} from 'lucide-react';
import { useUser } from '@/store/user-store';
import { useToast } from '@/components/ui/use-toast';

type NavItem = {
    title: string;
    href: string;
    icon: any;
    description: string;
    badge?: string;
    submenu?: Array<{
        title: string;
        href: string;
        icon: any;
    }>;
};

const navigationItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: Home,
        description: 'Overview and quick actions'
    },
    {
        title: 'Lobby',
        href: '/lobby',
        icon: Users,
        description: 'Find free talk rooms',
        badge: 'Popular'
    },
    {
        title: 'Marketplace',
        href: '/marketplace',
        icon: ShoppingBag,
        description: 'Buy learning materials',
        badge: 'New'
    },
    {
        title: 'Teachers',
        href: '/teachers',
        icon: GraduationCap,
        description: 'Browse teacher marketplace',
        submenu: [
            { title: 'Find Teachers', href: '/teachers', icon: Search },
            { title: 'Featured Teachers', href: '/teachers/featured', icon: Star },
            { title: 'Book a Class', href: '/teachers/book', icon: Calendar }
        ]
    },
    {
        title: 'My Classes',
        href: '/my-classes',
        icon: BookOpen,
        description: 'Your enrolled and teaching classes',
        submenu: [
            { title: 'Enrolled Classes', href: '/my-classes/enrolled', icon: BookOpen },
            { title: 'Teaching Classes', href: '/my-classes/teaching', icon: GraduationCap },
            { title: 'Schedule', href: '/my-classes/schedule', icon: Calendar }
        ]
    },
    {
        title: 'Credits',
        href: '/credits',
        icon: CreditCard,
        description: 'Manage your credits and payments',
        submenu: [
            { title: 'My Balance', href: '/credits/balance', icon: Wallet },
            { title: 'Purchase Credits', href: '/credits/purchase', icon: CreditCard },
            { title: 'Transaction History', href: '/credits/transactions', icon: BarChart3 }
        ]
    }
];

const teacherNavItems: NavItem[] = [
    {
        title: 'Teacher Dashboard',
        href: '/teacher/dashboard',
        icon: BarChart3,
        description: 'Earnings and analytics'
    },
    {
        title: 'My Profile',
        href: '/teacher/profile',
        icon: User,
        description: 'Manage your teaching profile'
    },
    {
        title: 'Availability',
        href: '/teacher/availability',
        icon: Calendar,
        description: 'Set your teaching schedule'
    },
    {
        title: 'Students',
        href: '/teacher/students',
        icon: Users,
        description: 'Manage your students'
    }
];

export default function MainNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const { userInfo: user, isLoading, isAuthenticated, logout } = useUser();

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState(3); // Mock notification count

    const isActive = (href: string) => {
        if (href === '/dashboard') {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };

    const handleLogout = async () => {
        try {
            await logout();
            toast({
                title: "Success",
                description: "Logged out successfully",
            });
            router.push('/login');
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to logout",
                variant: "destructive",
            });
        }
    };

    const handleNotificationClick = () => {
        setNotifications(0);
        router.push('/notifications');
    };

    if (isLoading) {
        return (
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </nav>
        );
    }

    if (!isAuthenticated) {
        return (
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Link href="/" className="text-2xl font-bold text-blue-600">
                                TalkConnect
                            </Link>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link href="/login">
                                <Button variant="ghost">Login</Button>
                            </Link>
                            <Link href="/register">
                                <Button>Get Started</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>
        );
    }

    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
    const currentNavItems = isTeacher ? [...navigationItems, ...teacherNavItems] : navigationItems;

    return (
        <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo and Main Navigation */}
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/dashboard" className="text-2xl font-bold text-blue-600">
                                TalkConnect
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden lg:ml-8 lg:flex lg:space-x-1">
                            {currentNavItems.slice(0, 5).map((item) => (
                                <div key={item.href} className="relative group">
                                    <Link
                                        href={item.href}
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${isActive(item.href)
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <item.icon className="w-4 h-4" />
                                        {item.title}
                                        {item.badge && (
                                            <Badge variant="secondary" className="text-xs">
                                                {item.badge}
                                            </Badge>
                                        )}
                                    </Link>

                                    {/* Submenu Dropdown */}
                                    {item.submenu && (
                                        <div className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                            <div className="py-1">
                                                {item.submenu.map((subitem) => (
                                                    <Link
                                                        key={subitem.href}
                                                        href={subitem.href}
                                                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                                                    >
                                                        <subitem.icon className="w-4 h-4" />
                                                        {subitem.title}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right side - User menu and notifications */}
                    <div className="flex items-center space-x-4">
                        {/* Credits Display */}
                        <Link
                            href="/credits/balance"
                            className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium hover:bg-green-100 transition-colors"
                        >
                            <Wallet className="w-4 h-4" />
                            {user?.credit_balance || 0} Credits
                        </Link>

                        {/* Notifications */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleNotificationClick}
                            className="relative"
                        >
                            <Bell className="w-5 h-5" />
                            {notifications > 0 && (
                                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                                    {notifications}
                                </Badge>
                            )}
                        </Button>

                        {/* User Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user?.avatar_url} alt={user?.username} />
                                        <AvatarFallback>
                                            {user?.username?.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <div className="flex items-center justify-start gap-2 p-2">
                                    <div className="flex flex-col space-y-1 leading-none">
                                        <p className="font-medium">{user?.username}</p>
                                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                                            {user?.email}
                                        </p>
                                    </div>
                                </div>
                                <DropdownMenuSeparator />

                                <DropdownMenuItem asChild>
                                    <Link href="/profile" className="cursor-pointer">
                                        <User className="w-4 h-4 mr-2" />
                                        My Profile
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild>
                                    <Link href="/marketplace/my-purchases" className="cursor-pointer">
                                        <ShoppingBag className="w-4 h-4 mr-2" />
                                        My Purchases
                                    </Link>
                                </DropdownMenuItem>

                                {isTeacher && (
                                    <DropdownMenuItem asChild>
                                        <Link href="/teacher/dashboard" className="cursor-pointer">
                                            <GraduationCap className="w-4 h-4 mr-2" />
                                            Teacher Dashboard
                                        </Link>
                                    </DropdownMenuItem>
                                )}

                                <DropdownMenuItem asChild>
                                    <Link href="/credits/balance" className="cursor-pointer">
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        Credits & Payments
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild>
                                    <Link href="/settings" className="cursor-pointer">
                                        <Settings className="w-4 h-4 mr-2" />
                                        Settings
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Mobile menu button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="lg:hidden"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </Button>
                    </div>
                </div>

                {/* Mobile Navigation Menu */}
                {mobileMenuOpen && (
                    <div className="lg:hidden border-t bg-white">
                        <div className="px-2 pt-2 pb-3 space-y-1">
                            {currentNavItems.map((item) => (
                                <div key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${isActive(item.href)
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                                            }`}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <item.icon className="w-5 h-5" />
                                            {item.title}
                                            {item.badge && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {item.badge}
                                                </Badge>
                                            )}
                                        </div>
                                    </Link>

                                    {/* Mobile Submenu */}
                                    {item.submenu && (
                                        <div className="ml-6 mt-1 space-y-1">
                                            {item.submenu.map((subitem) => (
                                                <Link
                                                    key={subitem.href}
                                                    href={subitem.href}
                                                    className="block px-3 py-2 text-sm text-gray-600 hover:text-blue-600"
                                                    onClick={() => setMobileMenuOpen(false)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <subitem.icon className="w-4 h-4" />
                                                        {subitem.title}
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
