// src/utils/datetime.js

// Tenta pegar o fuso IANA do próprio dispositivo via Intl
export const getDeviceTimeZone = () => {
  // Regra de negócio: sempre forçar o horário de Brasília (America/Sao_Paulo)
  return 'America/Sao_Paulo';
};

// Retorna "YYYY-MM-DD HH:mm:ss" no fuso informado (padrão: fuso do dispositivo)
export const nowLocalTimestamp = (tz = getDeviceTimeZone()) => {
  const dt = new Date();
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(dt).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
};

// (Opcional) UTC para padronizar no servidor
export const nowUtcTimestamp = () => {
  const dt = new Date();
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'UTC',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(dt).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
};

// (Opcional) Exibir bonito pro usuário (pt-BR) a partir de "YYYY-MM-DD HH:mm:ss"
export const formatPtBR = (yyyyMMddHHmmss, tz = getDeviceTimeZone()) => {
  if (!yyyyMMddHHmmss) return '';
  const s = yyyyMMddHHmmss.replace(' ', 'T'); // "2025-11-13T10:41:00"
  const dt = new Date(s);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(dt);
};


// Retorna "DD/MM/YYYY HH:mm" no fuso do device
export const nowLocalDMYHM = (tz = getDeviceTimeZone()) => {
  const dt = new Date();
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(dt).map(p => [p.type, p.value]));
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
};

// Se você já tem "YYYY-MM-DD HH:mm:ss" e só quer converter:
export const toDMYHM = (yyyyMMddHHmmss, tz = getDeviceTimeZone()) => {
  if (!yyyyMMddHHmmss) return '';
  const dt = new Date(yyyyMMddHHmmss.replace(' ', 'T'));
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(dt).map(p => [p.type, p.value]));
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
};
