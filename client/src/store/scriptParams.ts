import { create } from 'zustand';

export interface ScriptParams {
  topic: string;
  hook: string;
  angle: string;
  pillar: string;       // 'P1' | 'P2' | 'P3' OR a real name
  minutes: number;
  structure: string;    // 'auto' | 'levels-escalation' | ...
  sections: string;     // 'auto' | '5' | '6' | ...
  pov: string;          // 'mixed-1-2-3' | ...
  customStructure: string;
}

const DEFAULT: ScriptParams = {
  topic: '', hook: '', angle: '', pillar: 'P1', minutes: 18,
  structure: 'auto', sections: 'auto', pov: 'mixed-1-2-3', customStructure: '',
};

interface ScriptParamsState {
  byChannel: Record<string, ScriptParams>;
  get: (channelId: string) => ScriptParams;
  set: (channelId: string, patch: Partial<ScriptParams>) => void;
  reset: (channelId: string) => void;
}

export const useScriptParams = create<ScriptParamsState>((set, getState) => ({
  byChannel: {},
  get: (channelId) => getState().byChannel[channelId] ?? DEFAULT,
  set: (channelId, patch) => {
    const prev = getState().byChannel[channelId] ?? DEFAULT;
    set({ byChannel: { ...getState().byChannel, [channelId]: { ...prev, ...patch } } });
  },
  reset: (channelId) => {
    const next = { ...getState().byChannel };
    delete next[channelId];
    set({ byChannel: next });
  },
}));
