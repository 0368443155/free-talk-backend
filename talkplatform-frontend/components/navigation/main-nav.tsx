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
    ShoppingBag,
    ShieldCheck,
    Video
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
        title: 'Courses',
        href: '/courses',
        icon: BookOpen,
        description: 'Browse and manage courses',
        badge: 'New',
        submenu: [
            { title: 'Browse Courses', href: '/courses', icon: Search },
            { title: 'My Learning', href: '/student/my-learning', icon: GraduationCap }
        ]
    },
    {
        title: 'Marketplace',
        href: '/marketplace',
        icon: ShoppingBag,
        description: 'Buy learning materials',
        badge: 'New',
        submenu: [
            { title: 'Browse Materials', href: '/marketplace', icon: Search },
            { title: 'My Purchases', href: '/marketplace/my-purchases', icon: ShoppingBag }
        ]
    },
    {
        title: 'Teachers',
        href: '/teachers',
        icon: GraduationCap,
        description: 'Browse teacher marketplace',
        submenu: [
            { title: 'Find Teachers', href: '/teachers', icon: Search },
            { title: 'Featured Teachers', href: '/teachers?featured=true', icon: Star }
        ]
    },
    {
        title: 'Bookings',
        href: '/bookings',
        icon: Calendar,
        description: 'Your class bookings',
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
        title: 'My Materials',
        href: '/teacher/materials',
        icon: BookOpen,
        description: 'Manage your teaching materials'
    },
    {
        title: 'Availability',
        href: '/teacher/availability',
        icon: Calendar,
        description: 'Set your teaching schedule'
    },
    {
        title: 'Verification',
        href: '/teacher/verification',
        icon: Star,
        description: 'Teacher verification status'
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
    const isAdmin = user?.role === 'admin';
    const isStudent = user?.role === 'student' || !user?.role;

    // Build navigation items based on role
    // Remove duplicates by filtering unique hrefs
    const currentNavItems = [...navigationItems];
    if (isTeacher) {
        // Only add teacher items that don't already exist in navigationItems
        const existingHrefs = new Set(navigationItems.map(item => item.href));
        const uniqueTeacherItems = teacherNavItems.filter(item => !existingHrefs.has(item.href));
        currentNavItems.push(...uniqueTeacherItems);
    }
    if (isAdmin) {
        currentNavItems.push({
            title: 'Admin',
            href: '/admin',
            icon: ShieldCheck,
            description: 'Admin dashboard',
            submenu: [
                { title: 'Dashboard', href: '/admin', icon: BarChart3 },
                { title: 'User Management', href: '/admin/users', icon: Users },
                { title: 'Teacher Verification', href: '/admin/teachers', icon: GraduationCap },
                { title: 'LiveKit Monitoring', href: '/admin/livekit', icon: Video }
            ]
        });
    }

    return (
        <nav className="glass sticky top-0 z-50 border-b border-white/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo and Main Navigation */}
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/dashboard" className="text-2xl font-bold font-heading bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                                TalkConnect
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden lg:ml-8 lg:flex lg:space-x-1">
                            {currentNavItems.slice(0, 5).map((item, index) => (
                                <div key={`nav-${item.href}-${index}`} className="relative group">
                                    <Link
                                        href={item.href}
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${isActive(item.href)
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
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
                                        <div className="absolute left-0 mt-2 w-56 glass rounded-xl shadow-xl border border-white/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                                            <div className="py-1">
                                                {item.submenu.map((subitem) => (
                                                    <Link
                                                        key={subitem.href}
                                                        href={subitem.href}
                                                        className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors"
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
                        {/* Become Teacher Button (for non-teachers) */}
                        {!isTeacher && (
                            <Link href="/teacher/verification">
                                <Button variant="outline" size="sm" className="hidden md:flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4" />
                                    Become Teacher
                                </Button>
                            </Link>
                        )}

                        {/* Credits Display */}
                        <Link
                            href="/credits/balance"
                            className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-700 rounded-full text-sm font-medium hover:bg-green-500/20 transition-colors border border-green-200/50"
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
                                    <Link href="/student/my-learning" className="cursor-pointer">
                                        <GraduationCap className="w-4 h-4 mr-2" />
                                        My Learning
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild>
                                    <Link href="/marketplace/my-purchases" className="cursor-pointer">
                                        <ShoppingBag className="w-4 h-4 mr-2" />
                                        My Purchases
                                    </Link>
                                </DropdownMenuItem>

                                {isTeacher && (
                                    <>
                                        <DropdownMenuItem asChild>
                                            <Link href="/teacher/dashboard" className="cursor-pointer">
                                                <BarChart3 className="w-4 h-4 mr-2" />
                                                Teacher Dashboard
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/teacher/materials" className="cursor-pointer">
                                                <BookOpen className="w-4 h-4 mr-2" />
                                                My Materials
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/teacher/availability" className="cursor-pointer">
                                                <Calendar className="w-4 h-4 mr-2" />
                                                Availability
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/teacher/verification" className="cursor-pointer">
                                                <ShieldCheck className="w-4 h-4 mr-2" />
                                                Verification
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                )}

                                {isAdmin && (
                                    <>
                                        <DropdownMenuItem asChild>
                                            <Link href="/admin" className="cursor-pointer">
                                                <ShieldCheck className="w-4 h-4 mr-2" />
                                                Admin Dashboard
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                )}

                                <DropdownMenuItem asChild>
                                    <Link href="/bookings" className="cursor-pointer">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        My Bookings
                                    </Link>
                                </DropdownMenuItem>

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
                            {/* Become Teacher Button (Mobile) */}
                            {!isTeacher && (
                                <div className="px-3 py-2 mb-2">
                                    <Link href="/teacher/verification">
                                        <Button className="w-full" variant="default" onClick={() => setMobileMenuOpen(false)}>
                                            <GraduationCap className="w-4 h-4 mr-2" />
                                            Become a Teacher
                                        </Button>
                                    </Link>
                                </div>
                            )}

                            {currentNavItems.map((item, index) => (
                                <div key={`mobile-nav-${item.href}-${index}`}>
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
