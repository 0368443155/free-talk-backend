import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AuthProvider from '@/components/auth-provider';
import { MeetingLayoutWrapper } from '@/components/meeting/meeting-layout-wrapper';
import MainNav from '@/components/navigation/main-nav';
import BreadcrumbNav from '@/components/navigation/breadcrumb-nav';
import FooterNav from '@/components/navigation/footer-nav';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata = {
  title: 'TalkConnect - Language Learning Platform',
  description: 'Connect with teachers and practice languages through live conversations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased`}>
        <AuthProvider>
          <MeetingLayoutWrapper>
            <div className="min-h-screen flex flex-col">
              <MainNav />
              <BreadcrumbNav />
              <main className="flex-1">{children}</main>
              <FooterNav />
            </div>
          </MeetingLayoutWrapper>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}