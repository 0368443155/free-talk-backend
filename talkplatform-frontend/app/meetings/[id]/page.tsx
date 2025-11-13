"use client";
//import { getUserInfoApiSsr } from "@/api/user.rest";
import { useUser } from "@/store/user-store";
//import { cookies } from "next/headers";
import { PublicMeetingRoomWrapper } from "@/section/meetings/public-meeting-room-wrapper";
//import axios from "axios";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

interface PageProps {
  //params: Promise<{ id: string }>;
  params: { id: string };
}

// export default async function MeetingRoomPage({ params }: PageProps) {
//   try {

//     // const cookieStore = cookies();
//     // const token = (await cookieStore).get("accessToken")?.value || "";
//     const { userInfo: user, isLoading, isAuthenticated } = useUser();
//     const { id } = params;

//     if (!token) {
//       return <div>Please login to access this meeting</div>;
//     }

//     // Get user info from backend
//     const { data: user } = await getUserInfoApiSsr(token);
//     const { id } = await params;

//     // Verify meeting exists and user has access
//     try {
//       await axios.get(`${process.env.NEXT_PUBLIC_SERVER}/public-meetings/${id}`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });
//     } catch (meetingError) {
//       return <div>Meeting not found or access denied</div>;
//     }

//     return <PublicMeetingRoomWrapper meetingId={id} user={user} />;
//   } catch (error) {
//     return <div>Please login to access this meeting</div>;
//   }
// }

export default function MeetingRoomPage() {
  const { userInfo: user, isLoading, isAuthenticated } = useUser();
  
  // BƯỚC 2: Dùng hook useParams để lấy ID (thay vì props)
  const params = useParams();
  const meetingId = params.id as string; // Lấy ID từ hook

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        Please login to access this meeting
      </div>
    );
  }
  
  return <PublicMeetingRoomWrapper meetingId={meetingId} user={user} />;
}