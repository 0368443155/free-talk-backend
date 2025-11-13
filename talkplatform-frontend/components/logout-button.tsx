"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useUser } from "@/store/user-store";
import { useToast } from "@/components/ui/use-toast";
import { logoutApi } from "@/api/user.rest";

export function LogoutButton() {
  const router = useRouter();
  const { logout } = useUser();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logoutApi();
      logout();
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      router.push("/login");
    } catch (error) {
      // Even if API call fails, clear local state
      logout();
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      router.push("/login");
    }
  };

  return (
    <Button variant="outline" onClick={handleLogout}>
      <LogOut className="w-4 h-4 mr-2" />
      Logout
    </Button>
  );
}