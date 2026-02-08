import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

export type WorkspaceTab = "chat" | "calendar" | "billing";

type Store = {
  // auth boot
  authReady: boolean;
  setAuthReady: (v: boolean) => void;

  session: Session | null;
  user: User | null;
  setSession: (s: Session | null) => void;
  setUser: (u: User | null) => void;

  profile: Profile | null;
  setProfile: (p: Profile | null) => void;

  // ui
  tab: WorkspaceTab;
  setTab: (t: WorkspaceTab) => void;

  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (d: string) => void;

  reset: () => void;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export const useAppStore = create<Store>((set) => ({
  authReady: false,
  setAuthReady: (v) => set({ authReady: v }),

  session: null,
  user: null,
  setSession: (s) => set({ session: s }),
  setUser: (u) => set({ user: u }),

  profile: null,
  setProfile: (p) => set({ profile: p }),

  tab: "chat",
  setTab: (t) => set({ tab: t }),

  selectedDate: todayISO(),
  setSelectedDate: (d) => set({ selectedDate: d }),

  reset: () =>
    set({
      authReady: true,
      session: null,
      user: null,
      profile: null,
      tab: "chat",
      selectedDate: todayISO(),
    }),
}));