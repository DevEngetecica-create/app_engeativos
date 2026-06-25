// Centraliza constantes compartilhadas para evitar ciclos entre servicos de sync.
export const SYNC_STATUS = Object.freeze({
  PENDING: 0,
  SYNCED: 1,
  IN_PROGRESS: 2,
  ERROR: 3,
  ABANDONED: 99,
});

export const MAX_SYNC_ATTEMPTS = 5;
