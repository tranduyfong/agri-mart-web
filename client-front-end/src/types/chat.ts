export interface ChatRecommendation {
  product_id: string;
  variant_id: string;
  name: string;
  variant_name: string;
  unit: string;
  thumbnail_url: string | null;
  quantity: number;
  price: number | null;
  list_price: number | null;
  stock_quantity: number;
  available: boolean;
}

export interface ChatMessage {
  id: string;
  client_id: string | null;
  sender_id: string | null;
  sender_name: string;
  sender_type: string;
  content: string;
  attachments: string[];
  created_at: string;
  recommendations?: ChatRecommendation[];
}
export interface ChatRoom {
  id: string;
  customer_name: string;
  status: string;
  ai_pending: boolean;
  ai_enabled: boolean;
  waiting_for_staff: boolean;
  staff_name: string | null;
  assigned_staff_id: string | null;
  unread_count: number;
  has_more: boolean;
  messages: ChatMessage[];
}
