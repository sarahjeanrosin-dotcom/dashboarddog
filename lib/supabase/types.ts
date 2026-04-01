export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      branding: {
        Row: {
          id: string
          logo_url: string | null
          primary_color: string
          accent_color: string
          font_family: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['branding']['Row'], 'id' | 'updated_at'> & {
          id?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['branding']['Insert']>
      }
      verticals: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['verticals']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['verticals']['Insert']>
      }
      roles: {
        Row: {
          id: string
          vertical_id: string
          title: string
          blurb: string
          avatar_emoji: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['roles']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['roles']['Insert']>
      }
      widgets: {
        Row: {
          id: string
          name: string
          description: string
          screenshot_url: string | null
          masked_url: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['widgets']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['widgets']['Insert']>
      }
      role_widgets: {
        Row: {
          id: string
          role_id: string
          widget_id: string
          position: number
          x: number
          y: number
          w: number
          h: number
        }
        Insert: Omit<Database['public']['Tables']['role_widgets']['Row'], 'id'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['role_widgets']['Insert']>
      }
      dashboard_layouts: {
        Row: {
          id: string
          vertical_id: string
          role_id: string
          layout_json: Json
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['dashboard_layouts']['Row'], 'id' | 'updated_at'> & {
          id?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['dashboard_layouts']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience types
export type Branding = Database['public']['Tables']['branding']['Row']
export type Vertical = Database['public']['Tables']['verticals']['Row']
export type Role = Database['public']['Tables']['roles']['Row']
export type Widget = Database['public']['Tables']['widgets']['Row']
export type RoleWidget = Database['public']['Tables']['role_widgets']['Row']
export type DashboardLayout = Database['public']['Tables']['dashboard_layouts']['Row']

export interface WidgetLayout {
  widget_id: string
  x: number
  y: number
  w: number
  h: number
}

export interface RoleWithWidgets extends Role {
  role_widgets: (RoleWidget & { widget: Widget })[]
}

export interface VerticalWithRoles extends Vertical {
  roles: Role[]
}
