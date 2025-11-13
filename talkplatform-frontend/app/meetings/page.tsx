"use client";
import {LogoutButton }from "@/components/logout-button";
// SỬA LỖI: Import 'PublicMeetings' như một default import (không có ngoặc nhọn)
import PublicMeetings from "@/section/meetings/public-meetings";

export default function MeetingsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Public Meetings</h1>
        <LogoutButton />
      </div>
      <PublicMeetings />
    </div>
  );
}