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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          channel: string
          created_at: string
          id: string
          incident_id: string
          recipient: string
          status: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          incident_id: string
          recipient: string
          status?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          incident_id?: string
          recipient?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      danger_zone_cache: {
        Row: {
          area_label: string | null
          cell_key: string
          latitude: number
          longitude: number
          updated_at: string
          zones: Json
        }
        Insert: {
          area_label?: string | null
          cell_key: string
          latitude: number
          longitude: number
          updated_at?: string
          zones: Json
        }
        Update: {
          area_label?: string | null
          cell_key?: string
          latitude?: number
          longitude?: number
          updated_at?: string
          zones?: Json
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string
          priority: number
          relationship: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone: string
          priority?: number
          relationship?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          priority?: number
          relationship?: string | null
          user_id?: string
        }
        Relationships: []
      }
      hospitals: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          emergency_24x7: boolean | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          emergency_24x7?: boolean | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          emergency_24x7?: boolean | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      incidents: {
        Row: {
          address: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          resolved_at: string | null
          responder_id: string | null
          status: Database["public"]["Enums"]["incident_status"]
          type: Database["public"]["Enums"]["incident_type"]
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          resolved_at?: string | null
          responder_id?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          type?: Database["public"]["Enums"]["incident_type"]
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          resolved_at?: string | null
          responder_id?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          type?: Database["public"]["Enums"]["incident_type"]
          user_id?: string
        }
        Relationships: []
      }
      location_logs: {
        Row: {
          accuracy: number | null
          created_at: string
          id: string
          incident_id: string | null
          latitude: number
          longitude: number
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          id?: string
          incident_id?: string | null
          latitude: number
          longitude: number
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          id?: string
          incident_id?: string | null
          latitude?: number
          longitude?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_logs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      police_stations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          blood_group: string | null
          created_at: string
          emergency_message: string | null
          full_name: string
          id: string
          phone: string | null
          preferred_language: string
          updated_at: string
        }
        Insert: {
          blood_group?: string | null
          created_at?: string
          emergency_message?: string | null
          full_name: string
          id: string
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          blood_group?: string | null
          created_at?: string
          emergency_message?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      volunteer_requests: {
        Row: {
          accepted_at: string | null
          accepted_volunteer_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          incident_id: string | null
          latitude: number
          longitude: number
          radius_m: number
          requester_id: string
          status: string
          timeout_at: string
          updated_at: string
          volunteer_latitude: number | null
          volunteer_longitude: number | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_volunteer_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          incident_id?: string | null
          latitude: number
          longitude: number
          radius_m?: number
          requester_id: string
          status?: string
          timeout_at?: string
          updated_at?: string
          volunteer_latitude?: number | null
          volunteer_longitude?: number | null
        }
        Update: {
          accepted_at?: string | null
          accepted_volunteer_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          incident_id?: string | null
          latitude?: number
          longitude?: number
          radius_m?: number
          requester_id?: string
          status?: string
          timeout_at?: string
          updated_at?: string
          volunteer_latitude?: number | null
          volunteer_longitude?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_requests_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_responses: {
        Row: {
          created_at: string
          id: string
          request_id: string
          response: string
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          response: string
          volunteer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          response?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "volunteer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers: {
        Row: {
          available: boolean
          created_at: string
          display_name: string
          latitude: number | null
          longitude: number | null
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          available?: boolean
          created_at?: string
          display_name: string
          latitude?: number | null
          longitude?: number | null
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          available?: boolean
          created_at?: string
          display_name?: string
          latitude?: number | null
          longitude?: number | null
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_nearby_volunteers: {
        Args: { _request_id: string }
        Returns: number
      }
      create_volunteer_request: {
        Args: {
          _incident_id: string
          _lat: number
          _lng: number
          _radius_m?: number
          _timeout_s?: number
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      km_between: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      open_requests_near_me: {
        Args: never
        Returns: {
          created_at: string
          distance_km: number
          id: string
          timeout_at: string
        }[]
      }
      requester_info_for_request: {
        Args: { _request_id: string }
        Returns: {
          first_name: string
          phone: string
        }[]
      }
      respond_volunteer_request: {
        Args: { _accept: boolean; _request_id: string }
        Returns: boolean
      }
      update_volunteer_progress: {
        Args: {
          _lat?: number
          _lng?: number
          _request_id: string
          _status: string
        }
        Returns: undefined
      }
      volunteer_info_for_request: {
        Args: { _request_id: string }
        Returns: {
          display_name: string
          verified: boolean
        }[]
      }
    }
    Enums: {
      app_role: "user" | "admin" | "police" | "hospital"
      incident_status: "active" | "responded" | "resolved" | "false_alarm"
      incident_type: "sos" | "voice" | "manual" | "auto_detected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["user", "admin", "police", "hospital"],
      incident_status: ["active", "responded", "resolved", "false_alarm"],
      incident_type: ["sos", "voice", "manual", "auto_detected"],
    },
  },
} as const
