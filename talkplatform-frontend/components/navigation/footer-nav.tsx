"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Globe,
  GraduationCap,
  Users,
  HelpCircle,
  Shield,
  FileText,
  Heart
} from 'lucide-react';

const footerLinks = {
  platform: [
    { title: 'Free Talk Rooms', href: '/meetings' },
    { title: 'Find Teachers', href: '/teachers' },
    { title: 'Featured Teachers', href: '/teachers/featured' },
    { title: 'How It Works', href: '/how-it-works' },
    { title: 'Success Stories', href: '/success-stories' }
  ],
  learning: [
    { title: 'Language Courses', href: '/courses' },
    { title: 'Study Materials', href: '/materials' },
    { title: 'Practice Tests', href: '/tests' },
    { title: 'Progress Tracking', href: '/progress' },
    { title: 'Certificates', href: '/certificates' }
  ],
  teachers: [
    { title: 'Become a Teacher', href: '/become-teacher' },
    { title: 'Teacher Resources', href: '/teacher-resources' },
    { title: 'Teaching Guidelines', href: '/teaching-guidelines' },
    { title: 'Earnings Calculator', href: '/earnings-calculator' },
    { title: 'Teacher Community', href: '/teacher-community' }
  ],
  support: [
    { title: 'Help Center', href: '/help' },
    { title: 'Contact Support', href: '/support' },
    { title: 'Live Chat', href: '/chat' },
    { title: 'Video Tutorials', href: '/tutorials' },
    { title: 'System Status', href: '/status' }
  ],
  company: [
    { title: 'About Us', href: '/about' },
    { title: 'Careers', href: '/careers' },
    { title: 'Press Kit', href: '/press' },
    { title: 'Blog', href: '/blog' },
    { title: 'Partnerships', href: '/partnerships' }
  ],
  legal: [
    { title: 'Privacy Policy', href: '/privacy' },
    { title: 'Terms of Service', href: '/terms' },
    { title: 'Cookie Policy', href: '/cookies' },
    { title: 'Community Guidelines', href: '/community-guidelines' },
    { title: 'Safety Center', href: '/safety' }
  ]
};

const socialLinks = [
  { icon: Facebook, href: 'https://facebook.com/talkconnect', label: 'Facebook' },
  { icon: Twitter, href: 'https://twitter.com/talkconnect', label: 'Twitter' },
  { icon: Instagram, href: 'https://instagram.com/talkconnect', label: 'Instagram' },
  { icon: Youtube, href: 'https://youtube.com/talkconnect', label: 'YouTube' }
];

const contactInfo = [
  { icon: Mail, text: 'support@talkconnect.com', href: 'mailto:support@talkconnect.com' },
  { icon: Phone, text: '+1 (555) 123-4567', href: 'tel:+15551234567' },
  { icon: MapPin, text: 'San Francisco, CA', href: '#' }
];

export default function FooterNav() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">TalkConnect</span>
            </div>
            
            <p className="text-gray-600 text-sm leading-relaxed">
              Connect with native speakers and expert teachers worldwide. 
              Practice languages through live conversations, structured lessons, 
              and immersive learning experiences.
            </p>

            {/* Contact Info */}
            <div className="space-y-2">
              {contactInfo.map((contact, index) => (
                <div key={index} className="flex items-center gap-2">
                  <contact.icon className="w-4 h-4 text-gray-500" />
                  {contact.href !== '#' ? (
                    <Link href={contact.href} className="text-sm text-gray-600 hover:text-blue-600">
                      {contact.text}
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-600">{contact.text}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3 pt-4">
              {socialLinks.map((social, index) => (
                <Link
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-gray-100 hover:bg-blue-100 rounded-full flex items-center justify-center transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4 text-gray-600 hover:text-blue-600" />
                </Link>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Platform
            </h3>
            <ul className="space-y-2">
              {footerLinks.platform.map((link, index) => (
                <li key={index}>
                  <Link href={link.href} className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Learning Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Learning
            </h3>
            <ul className="space-y-2">
              {footerLinks.learning.map((link, index) => (
                <li key={index}>
                  <Link href={link.href} className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Teachers Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Teachers
            </h3>
            <ul className="space-y-2">
              {footerLinks.teachers.map((link, index) => (
                <li key={index}>
                  <Link href={link.href} className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Support
            </h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link, index) => (
                <li key={index}>
                  <Link href={link.href} className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Stay Updated</h3>
              <p className="text-gray-600 text-sm">
                Get the latest language learning tips, teacher spotlights, and platform updates.
              </p>
            </div>
            
            <div className="flex gap-3 w-full lg:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 lg:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Button size="sm">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>© {currentYear} TalkConnect. All rights reserved.</span>
              <div className="flex items-center gap-1">
                <span>Made with</span>
                <Heart className="w-4 h-4 text-red-500 fill-current" />
                <span>for language learners worldwide</span>
              </div>
            </div>

            {/* Legal Links */}
            <div className="flex items-center gap-6 text-sm">
              {footerLinks.legal.slice(0, 3).map((link, index) => (
                <Link key={index} href={link.href} className="text-gray-600 hover:text-blue-600 transition-colors">
                  {link.title}
                </Link>
              ))}
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>SSL Secured</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>10,000+ Active Learners</span>
              </div>
              <div className="flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                <span>500+ Verified Teachers</span>
              </div>
              <div className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                <span>50+ Languages</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}