export type RoomRole = "owner" | "partner";

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string | null;
}

export interface Room {
  id: string;
  slug: string;
  name: string;
  owner_id: string;
  partner_id?: string | null;
  created_at: string;
  is_active: boolean;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  role: RoomRole;
  joined_at: string;
  profile?: Profile;
}

export interface RoomAccessResult {
  allowed: boolean;
  status: "ok" | "not_found" | "unauthorized" | "room_full";
  room?: Room;
  currentUserId?: string;
  userRole?: RoomRole;
  partnerProfile?: Profile | null;
}
