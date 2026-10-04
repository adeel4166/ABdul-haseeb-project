import { ProfileScreen } from "@/components/profile-screen";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile · Abroad Fund",
};

export default function Profile() {
  return <ProfileScreen />;
}
