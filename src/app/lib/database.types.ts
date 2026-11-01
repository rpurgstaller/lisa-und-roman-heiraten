export type GuestFrom = "Roman" | "Lisa";
export type InvitationCategory = "Freunde" | "Arbeit" | "Familie";
export type DietaryRestriction = "Vegetarian" | "Vegan" | "Lactose intolerant";

export type InvitationAddress = {
  street: string | null;
  house_number: string | null;
  address_addition: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
};

export type InvitationRow = {
  id: number;
  code: string;
  created_at: string | null;
  invitation_sent: boolean;
  save_the_date_sent: boolean;
  guest_from: GuestFrom | null;
  category: InvitationCategory | null;
} & InvitationAddress;

export type GuestRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  invitation_id: number;
  attending: boolean | null;
  dietary_restrictions: DietaryRestriction | null;
  additional_dietary_restrictions: string | null;
  companion_name: string | null;
  created_at: string | null;
};

export type ResponseLogRow = {
  id: number;
  changed_at: string;
  changed_by: "admin" | "guest";
  change: string;
};

export type SeatSide = "top" | "bottom" | "left" | "right";

export type SeatingPlanRow = {
  id: number;
  name: string;
  note: string | null;
  created_at: string;
  deleted_at: string | null;
};

export type SeatingTableRow = {
  id: number;
  plan_id: number;
  name: string | null;
  grid_x: number;
  grid_y: number;
  length: number;
  width: number;
};

export type HostId = "lisa" | "roman";

export type SeatAssignmentRow = {
  id: number;
  plan_id: number;
  guest_id: number | null;
  host: HostId | null;
  table_id: number;
  side: SeatSide;
  position: number;
};

export type Database = {
  public: {
    Tables: {
      invitation: {
        Row: InvitationRow;
        Insert: {
          code?: string;
          created_at?: string | null;
          invitation_sent?: boolean;
          save_the_date_sent?: boolean;
          guest_from?: GuestFrom | null;
          category?: InvitationCategory | null;
        } & Partial<InvitationAddress>;
        Update: Partial<Omit<InvitationRow, "id">>;
        Relationships: [];
      };
      guest: {
        Row: GuestRow;
        Insert: Omit<GuestRow, "id" | "created_at"> & {
          created_at?: string | null;
        };
        Update: Partial<Omit<GuestRow, "id">>;
        Relationships: [
          {
            foreignKeyName: "guest_invitation_id_fkey";
            columns: ["invitation_id"];
            isOneToOne: false;
            referencedRelation: "invitation";
            referencedColumns: ["id"];
          },
        ];
      };
      response_log: {
        Row: ResponseLogRow;
        Insert: Omit<ResponseLogRow, "id" | "changed_at"> & {
          changed_at?: string;
        };
        Update: Partial<Omit<ResponseLogRow, "id">>;
        Relationships: [];
      };
      seating_plan: {
        Row: SeatingPlanRow;
        Insert: {
          name: string;
          note?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Omit<SeatingPlanRow, "id">>;
        Relationships: [];
      };
      seating_table: {
        Row: SeatingTableRow;
        Insert: {
          plan_id: number;
          name?: string | null;
          grid_x: number;
          grid_y: number;
          length: number;
          width: number;
        };
        Update: Partial<Omit<SeatingTableRow, "id" | "plan_id">>;
        Relationships: [
          {
            foreignKeyName: "seating_table_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "seating_plan";
            referencedColumns: ["id"];
          },
        ];
      };
      seat_assignment: {
        Row: SeatAssignmentRow;
        Insert: Omit<SeatAssignmentRow, "id">;
        Update: Partial<SeatAssignmentRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_guest_by_invitation_code: {
        Args: {
          provided_code: string;
        };
        Returns: Pick<
          GuestRow,
          | "id"
          | "first_name"
          | "last_name"
          | "attending"
          | "dietary_restrictions"
          | "additional_dietary_restrictions"
          | "companion_name"
        >[];
      };
      update_guest_rsvp: {
        Args: {
          provided_code: string;
          provided_attending: boolean;
          provided_dietary_restrictions?: DietaryRestriction | null;
          provided_companion_name?: string | null;
          provided_additional_dietary_restrictions?: string | null;
        };
        Returns: boolean;
      };
    };
  };
};
