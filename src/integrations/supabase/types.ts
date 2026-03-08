export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          position: number | null
          slug: string
        }
        Insert: {
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          position?: number | null
          slug: string
        }
        Update: {
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          position?: number | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_conversations: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          session_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          session_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          session_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatbot_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order: number | null
          type: string
          used_count: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order?: number | null
          type?: string
          used_count?: number | null
          value?: number
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order?: number | null
          type?: string
          used_count?: number | null
          value?: number
        }
        Relationships: []
      }
      crm_interactions: {
        Row: {
          body: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          id: string
          subject: string | null
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          id?: string
          subject?: string | null
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          id?: string
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          apartment: string | null
          auth_id: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          floor: string | null
          full_name: string | null
          house_number: string | null
          id: string
          notes: string | null
          phone: string | null
          shipping_notes: string | null
          street: string | null
          tags: string[] | null
          total_orders: number | null
          total_spent: number | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          apartment?: string | null
          auth_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          floor?: string | null
          full_name?: string | null
          house_number?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          shipping_notes?: string | null
          street?: string | null
          tags?: string[] | null
          total_orders?: number | null
          total_spent?: number | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          apartment?: string | null
          auth_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          floor?: string | null
          full_name?: string | null
          house_number?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          shipping_notes?: string | null
          street?: string | null
          tags?: string[] | null
          total_orders?: number | null
          total_spent?: number | null
          zip?: string | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          html_body: string
          id: string
          name: string
          recipient_filter: Json | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          subject: string
          total_clicked: number | null
          total_opened: number | null
          total_sent: number | null
        }
        Insert: {
          html_body: string
          id?: string
          name: string
          recipient_filter?: Json | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          total_clicked?: number | null
          total_opened?: number | null
          total_sent?: number | null
        }
        Update: {
          html_body?: string
          id?: string
          name?: string
          recipient_filter?: Json | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          total_clicked?: number | null
          total_opened?: number | null
          total_sent?: number | null
        }
        Relationships: []
      }
      email_subscribers: {
        Row: {
          email: string
          full_name: string | null
          id: string
          is_subscribed: boolean | null
          source: string | null
          subscribed_at: string | null
        }
        Insert: {
          email: string
          full_name?: string | null
          id?: string
          is_subscribed?: boolean | null
          source?: string | null
          subscribed_at?: string | null
        }
        Update: {
          email?: string
          full_name?: string | null
          id?: string
          is_subscribed?: boolean | null
          source?: string | null
          subscribed_at?: string | null
        }
        Relationships: []
      }
      market_research_results: {
        Row: {
          competitor_prices: Json | null
          created_at: string | null
          id: string
          product_id: string | null
          recommendation: string | null
          result_data: Json | null
          suppliers: Json | null
        }
        Insert: {
          competitor_prices?: Json | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          recommendation?: string | null
          result_data?: Json | null
          suppliers?: Json | null
        }
        Update: {
          competitor_prices?: Json | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          recommendation?: string | null
          result_data?: Json | null
          suppliers?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "market_research_results_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      market_research_settings: {
        Row: {
          api_key_encrypted: string | null
          api_provider: string
          custom_prompt: string | null
          id: string
          last_run_at: string | null
          schedule_day: number | null
          schedule_hour: number | null
          schedule_type: string | null
          updated_at: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          api_provider?: string
          custom_prompt?: string | null
          id?: string
          last_run_at?: string | null
          schedule_day?: number | null
          schedule_hour?: number | null
          schedule_type?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          api_provider?: string
          custom_prompt?: string | null
          id?: string
          last_run_at?: string | null
          schedule_day?: number | null
          schedule_hour?: number | null
          schedule_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string | null
          quantity: number
          total_price: number
          unit_price: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name?: string | null
          quantity: number
          total_price: number
          unit_price: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          coupon_discount: number | null
          created_at: string | null
          customer_id: string | null
          delivered_at: string | null
          discount: number | null
          id: string
          notes: string | null
          order_number: number
          payment_method: string | null
          payment_ref: string | null
          payment_status: string | null
          shipped_at: string | null
          shipping_cost: number | null
          shipping_method: string | null
          shipping_status: string | null
          status: string | null
          subtotal: number | null
          total: number | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string | null
        }
        Insert: {
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          order_number?: number
          payment_method?: string | null
          payment_ref?: string | null
          payment_status?: string | null
          shipped_at?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          shipping_status?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Update: {
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          order_number?: number
          payment_method?: string | null
          payment_ref?: string | null
          payment_status?: string | null
          shipped_at?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          shipping_status?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_group_items: {
        Row: {
          group_id: string
          position: number | null
          product_id: string
        }
        Insert: {
          group_id: string
          position?: number | null
          product_id: string
        }
        Update: {
          group_id?: string
          position?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_group_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_group_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_groups: {
        Row: {
          description: string | null
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string | null
          id: string
          is_video: boolean | null
          position: number | null
          product_id: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          id?: string
          is_video?: boolean | null
          position?: number | null
          product_id: string
          url: string
        }
        Update: {
          alt_text?: string | null
          id?: string
          is_video?: boolean | null
          position?: number | null
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          id: string
          is_active: boolean | null
          price_override: number | null
          product_id: string
          sku: string | null
          stock: number | null
          variant_label: string
          variant_value: string
        }
        Insert: {
          barcode?: string | null
          id?: string
          is_active?: boolean | null
          price_override?: number | null
          product_id: string
          sku?: string | null
          stock?: number | null
          variant_label: string
          variant_value: string
        }
        Update: {
          barcode?: string | null
          id?: string
          is_active?: boolean | null
          price_override?: number | null
          product_id?: string
          sku?: string | null
          stock?: number | null
          variant_label?: string
          variant_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          catalog_number: string | null
          created_at: string | null
          description: string | null
          id: string
          in_stock: boolean | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          price: number
          price_raw: number | null
          slug: string
          stock: number | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          catalog_number?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          in_stock?: boolean | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          price: number
          price_raw?: number | null
          slug: string
          stock?: number | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          catalog_number?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          in_stock?: boolean | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          price?: number
          price_raw?: number | null
          slug?: string
          stock?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
