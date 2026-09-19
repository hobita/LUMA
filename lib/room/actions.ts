"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { RoomAccessResult, Room, UserSanctuaryResult, RoomRole, Profile } from "@/types/room";

// Helper to generate a memorable 4-character code (e.g., "7F92")
function generateSlugCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `sanctuary-${code}`;
}

// Check if live Supabase keys exist
function hasSupabaseConfig(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );
}

// Cookie-based room store for demo/local mode before database credentials are set
interface DemoRoomStore {
  [slug: string]: {
    slug: string;
    name: string;
    owner_id: string;
    partner_id?: string;
    members: string[]; // user ids
  };
}

async function getDemoRooms(): Promise<DemoRoomStore> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("luma_demo_rooms")?.value;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveDemoRooms(rooms: DemoRoomStore) {
  try {
    const cookieStore = await cookies();
    cookieStore.set("luma_demo_rooms", JSON.stringify(rooms), {
      path: "/",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  } catch {
    // Ignored if called during Server Component render phase
  }
}

async function getDemoUserId(canWrite = false): Promise<string> {
  const cookieStore = await cookies();
  let userId = cookieStore.get("luma_demo_user_id")?.value;
  if (!userId) {
    userId = `user-${Math.random().toString(36).substring(2, 9)}`;
    if (canWrite) {
      try {
        cookieStore.set("luma_demo_user_id", userId, {
          path: "/",
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 30,
        });
      } catch {
        // Ignored if called during Server Component render phase
      }
    }
  }
  return userId;
}

/**
 * Creates a private room for two people.
 */
export async function createRoomAction(name?: string) {
  const slug = generateSlugCode();
  const roomName = name || "Our Sanctuary";

  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    // Insert room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        slug,
        name: roomName,
        owner_id: user.id,
      })
      .select()
      .single();

    if (roomError) {
      return { error: roomError.message };
    }

    // Insert owner into room_members
    await supabase.from("room_members").insert({
      room_id: room.id,
      user_id: user.id,
      role: "owner",
    });

    redirect(`/room/${slug}`);
  } else {
    // Local / Demo Mode fallback
    const userId = await getDemoUserId();
    const rooms = await getDemoRooms();

    rooms[slug] = {
      slug,
      name: roomName,
      owner_id: userId,
      members: [userId],
    };

    await saveDemoRooms(rooms);
    redirect(`/room/${slug}`);
  }
}

/**
 * Joins an existing room by slug with strict 2-member limit enforcement.
 */
export async function joinRoomAction(formData: FormData) {
  const slug = (formData.get("slug") as string)?.trim().toLowerCase();
  if (!slug) {
    return { error: "Please provide a valid room code." };
  }

  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/login?next=/room/${slug}`);
    }

    // Execute atomic join function in PostgreSQL
    const { data: joinResult, error } = await supabase.rpc("join_room_as_partner", {
      p_slug: slug,
      p_user_id: user.id,
    });

    if (error) {
      return { error: error.message };
    }

    if (!joinResult?.success) {
      return { error: joinResult?.error || "Unable to join room." };
    }

    redirect(`/room/${slug}`);
  } else {
    // Local / Demo Mode fallback
    const userId = await getDemoUserId();
    const rooms = await getDemoRooms();
    const room = rooms[slug];

    if (!room) {
      return { error: "This room doesn't exist." };
    }

    if (room.members.includes(userId)) {
      // Already a member
      redirect(`/room/${slug}`);
    }

    if (room.members.length >= 2) {
      return { error: "This room is full. LUMA rooms strictly allow two people." };
    }

    // Add as second member
    room.partner_id = userId;
    room.members.push(userId);
    await saveDemoRooms(rooms);

    redirect(`/room/${slug}`);
  }
}

/**
 * Server-side authorization check for /room/[slug]
 */
export async function getRoomAccess(slug: string): Promise<RoomAccessResult> {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { allowed: false, status: "unauthorized" };
    }

    // Query room
    const { data: room, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !room) {
      return { allowed: false, status: "not_found" };
    }

    // Check membership
    const { data: membership } = await supabase
      .from("room_members")
      .select("role")
      .eq("room_id", room.id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      // Check if slot available
      const { count } = await supabase
        .from("room_members")
        .select("*", { count: "exact", head: true })
        .eq("room_id", room.id);

      if ((count ?? 0) >= 2) {
        return { allowed: false, status: "room_full" };
      }

      // Automatically join as partner if slot is open
      const { data: joinRes } = await supabase.rpc("join_room_as_partner", {
        p_slug: slug,
        p_user_id: user.id,
      });

      if (!joinRes?.success) {
        return { allowed: false, status: "room_full" };
      }

      return {
        allowed: true,
        status: "ok",
        room: { ...room, partner_id: user.id } as Room,
        currentUserId: user.id,
        userRole: "partner",
      };
    }

    return {
      allowed: true,
      status: "ok",
      room: room as Room,
      currentUserId: user.id,
      userRole: membership.role as "owner" | "partner",
    };
  } else {
    // Demo Mode validation (purely read-only during Server Component render)
    const userId = await getDemoUserId(false);
    const rooms = await getDemoRooms();
    const room = rooms[slug];

    if (!room) {
      return {
        allowed: false,
        status: "not_found",
      };
    }

    const isMember = room.members.includes(userId);
    if (!isMember) {
      if (room.members.length >= 2) {
        return { allowed: false, status: "room_full" };
      }
    }

    const role = room.owner_id === userId ? "owner" : "partner";

    return {
      allowed: true,
      status: "ok",
      room: {
        id: `demo-${slug}`,
        slug: room.slug,
        name: room.name,
        owner_id: room.owner_id,
        partner_id: room.partner_id || null,
        created_at: new Date().toISOString(),
        is_active: true,
      },
      currentUserId: userId,
      userRole: role,
    };
  }
}

/**
 * Fetches the persistent Sanctuary room for the current user (owner or partner).
 * This ensures couples always stay connected to their room without having to re-create it.
 */
export async function getUserSanctuary(): Promise<UserSanctuaryResult> {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { room: null, role: null, partnerProfile: null };
    }

    // 1. Fetch user's own profile display name
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", user.id)
      .maybeSingle();

    // 2. Fetch room where user is owner or partner
    const { data: rooms, error } = await supabase
      .from("rooms")
      .select("*")
      .or(`owner_id.eq.${user.id},partner_id.eq.${user.id}`)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !rooms || rooms.length === 0) {
      return {
        room: null,
        role: null,
        partnerProfile: null,
        userEmail: user.email,
        userDisplayName: userProfile?.display_name || user.email?.split("@")[0] || "Love",
      };
    }

    const room = rooms[0] as Room;
    const role: RoomRole = room.owner_id === user.id ? "owner" : "partner";

    let partnerProfile: Profile | null = null;
    const partnerId = room.owner_id === user.id ? room.partner_id : room.owner_id;

    if (partnerId) {
      const { data: pProfile } = await supabase
        .from("profiles")
        .select("id, email, display_name, avatar_url")
        .eq("id", partnerId)
        .maybeSingle();

      if (pProfile) {
        partnerProfile = pProfile as Profile;
      }
    }

    return {
      room,
      role,
      partnerProfile,
      userEmail: user.email,
      userDisplayName: userProfile?.display_name || user.email?.split("@")[0] || "Love",
    };
  } else {
    // Demo Mode fallback
    const userId = await getDemoUserId(false);
    const rooms = await getDemoRooms();
    const userRoomList = Object.values(rooms).filter((r) =>
      r.members?.includes(userId)
    );

    if (userRoomList.length === 0) {
      return {
        room: null,
        role: null,
        partnerProfile: null,
        userEmail: "demo@luma.space",
        userDisplayName: "Demo User",
      };
    }

    const demoRoom = userRoomList[0];
    const role: RoomRole = demoRoom.owner_id === userId ? "owner" : "partner";

    return {
      room: {
        id: `demo-${demoRoom.slug}`,
        slug: demoRoom.slug,
        name: demoRoom.name,
        owner_id: demoRoom.owner_id,
        partner_id: demoRoom.partner_id || null,
        created_at: new Date().toISOString(),
        is_active: true,
      },
      role,
      partnerProfile: demoRoom.partner_id
        ? {
            id: demoRoom.partner_id,
            email: "partner@luma.space",
            display_name: "My Partner",
          }
        : null,
      userEmail: "demo@luma.space",
      userDisplayName: "Demo Lover",
    };
  }
}

/**
 * Permanently deletes a room if the owner explicitly chooses to reset it.
 */
export async function deleteRoomAction(roomId: string) {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    const { error } = await supabase
      .from("rooms")
      .delete()
      .eq("id", roomId)
      .eq("owner_id", user.id);

    if (error) {
      return { error: error.message };
    }
  } else {
    const rooms = await getDemoRooms();
    for (const key of Object.keys(rooms)) {
      if (rooms[key].slug === roomId || `demo-${rooms[key].slug}` === roomId) {
        delete rooms[key];
      }
    }
    await saveDemoRooms(rooms);
  }
  return { success: true };
}

/**
 * Leaves a room partnership (partner only).
 */
export async function leaveRoomAction(roomId: string) {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    await supabase
      .from("rooms")
      .update({ partner_id: null })
      .eq("id", roomId)
      .eq("partner_id", user.id);

    await supabase
      .from("room_members")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", user.id);
  } else {
    const rooms = await getDemoRooms();
    for (const key of Object.keys(rooms)) {
      if (rooms[key].partner_id) {
        rooms[key].partner_id = undefined;
        rooms[key].members = rooms[key].members.filter((m) => m !== roomId);
      }
    }
    await saveDemoRooms(rooms);
  }
  return { success: true };
}

