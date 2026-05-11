import { create } from 'zustand';
import type { StageId } from 'shared';

type ModalKind = 'channel-create' | 'channel-edit';

interface ModalState {
  kind: ModalKind;
  channelId?: string;
}

interface UiState {
  activeChannelId: string | null;
  activeStage: StageId;
  dark: boolean;
  modal: ModalState | null;
  setActiveChannel: (id: string | null) => void;
  setActiveStage: (stage: StageId) => void;
  toggleDark: () => void;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
}

const STORAGE_KEY = 'faceless_studio_ui_v1';

interface PersistedSlice {
  activeChannelId: string | null;
  activeStage: StageId;
  dark: boolean;
}

function loadPersisted(): PersistedSlice {
  if (typeof window === 'undefined') {
    return { activeChannelId: null, activeStage: 'overview', dark: false };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activeChannelId: null, activeStage: 'overview', dark: false };
    const parsed = JSON.parse(raw) as Partial<PersistedSlice>;
    return {
      activeChannelId: parsed.activeChannelId ?? null,
      activeStage: parsed.activeStage ?? 'overview',
      dark: Boolean(parsed.dark),
    };
  } catch {
    return { activeChannelId: null, activeStage: 'overview', dark: false };
  }
}

function persist(slice: PersistedSlice): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slice));
  } catch {
    // ignore quota errors
  }
}

const initial = loadPersisted();
if (typeof document !== 'undefined') {
  document.body.classList.toggle('dark', initial.dark);
}

export const useUiStore = create<UiState>((set, get) => ({
  activeChannelId: initial.activeChannelId,
  activeStage: initial.activeStage,
  dark: initial.dark,
  modal: null,

  setActiveChannel: (id) => {
    set({ activeChannelId: id, activeStage: 'overview' });
    const s = get();
    persist({ activeChannelId: s.activeChannelId, activeStage: s.activeStage, dark: s.dark });
  },

  setActiveStage: (stage) => {
    set({ activeStage: stage });
    const s = get();
    persist({ activeChannelId: s.activeChannelId, activeStage: s.activeStage, dark: s.dark });
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  },

  toggleDark: () => {
    const next = !get().dark;
    set({ dark: next });
    if (typeof document !== 'undefined') document.body.classList.toggle('dark', next);
    const s = get();
    persist({ activeChannelId: s.activeChannelId, activeStage: s.activeStage, dark: s.dark });
  },

  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
}));
