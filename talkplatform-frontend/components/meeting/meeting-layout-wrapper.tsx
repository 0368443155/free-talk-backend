"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Wrapper component to hide header and footer when in meeting room
 */
export function MeetingLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Exclude /meetings/create and /meetings (list) from being treated as a meeting room
  const isMeetingRoom = pathname?.startsWith('/meetings/') && pathname !== '/meetings/create' && pathname !== '/meetings';
  const isClassroomMeeting = pathname?.startsWith('/classrooms/') && pathname?.includes('/meetings/');
  const isInMeeting = isMeetingRoom || isClassroomMeeting;

  useEffect(() => {
    // Add/remove class to body to hide header and footer
    if (isInMeeting) {
      document.body.classList.add('in-meeting-room');
      // Make body full screen
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    } else {
      document.body.classList.remove('in-meeting-room');
      // Restore body styles
      document.body.style.overflow = '';
      document.body.style.height = '';
    }

    return () => {
      // Cleanup: restore on unmount
      document.body.classList.remove('in-meeting-room');
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [isInMeeting]);

  return <>{children}</>;
}

