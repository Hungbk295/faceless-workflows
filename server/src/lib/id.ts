export function newChannelId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 0x7fffffff).toString(36);
  return `ch_${ts}${rand}`;
}

export function newScriptId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 0x7fffffff).toString(36);
  return `proj_${ts}${rand}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
