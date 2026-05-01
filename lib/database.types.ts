// Database types — kept in sync with supabase/migrations/.
//
// To regenerate from the live Supabase schema (after auth via `supabase login`):
//   npm run db:types
//
// The hand-written types below match supabase/migrations/0001_init.sql.

export type OrderTier = "S" | "M" | "L";
export type OrderStatus = "AWAITING_UPLOAD" | "PROCESSING" | "READY" | "DELIVERED";
export type PhotoStatus = "UPLOADED" | "PROCESSING" | "ENHANCED" | "FAILED";

export interface OrderRow {
  id: string;
  user_id: string;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  tier: OrderTier;
  photos_quota: number;
  amount_cents: number;
  status: OrderStatus;
  paid_at: string;
  upload_completed_at: string | null;
  scheduled_delivery_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderInsert = Omit<OrderRow, "id" | "created_at" | "updated_at" | "paid_at"> & {
  id?: string;
  paid_at?: string;
  created_at?: string;
  updated_at?: string;
};

export type OrderUpdate = Partial<OrderInsert>;

export interface PhotoRow {
  id: string;
  order_id: string;
  original_path: string;
  original_filename: string;
  original_size_bytes: number;
  autoenhance_image_id: string | null;
  autoenhance_order_id: string | null;
  enhanced_path: string | null;
  status: PhotoStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type PhotoInsert = Omit<PhotoRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type PhotoUpdate = Partial<PhotoInsert>;

export interface Database {
  public: {
    Tables: {
      orders: { Row: OrderRow; Insert: OrderInsert; Update: OrderUpdate; Relationships: [] };
      photos: { Row: PhotoRow; Insert: PhotoInsert; Update: PhotoUpdate; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      order_tier: OrderTier;
      order_status: OrderStatus;
      photo_status: PhotoStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
