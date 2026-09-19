export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  isOptimistic?: boolean;
}

export interface ReactionParticle {
  id: string;
  emoji: string;
  xOffset: number; // -100 to 100 random horizontal drift
  scale: number;
}
