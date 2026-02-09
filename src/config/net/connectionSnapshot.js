let snapshot = {
  isConnected: true,
  isInternetReachable: true,
  type: "unknown",
  details: {},
  qualityPct: 100,
};

export function setConnectionSnapshot(partial) {
  snapshot = { ...snapshot, ...partial };
}

export function getConnectionSnapshot() {
  return snapshot;
}

// Calcula “qualidade” (0–100)
export function computeQualityPct({ type, details }) {
  const raw = details?.strength ?? details?.signalStrength ?? null;
  if (typeof raw === "number" && raw >= 0 && raw <= 100) return raw;

  if (type === "wifi") return 100;
  if (type === "cellular") {
    const gen = (details?.cellularGeneration || "").toLowerCase();
    if (gen.includes("5g")) return 90;
    if (gen.includes("4g") || gen.includes("lte")) return 75;
    if (gen.includes("3g") || gen.includes("hspa")) return 50;
    if (gen.includes("2g") || gen.includes("edge") || gen.includes("gprs")) return 25;
    return 30;
  }
  return 10;
}

export const SIGNAL_OK_THRESHOLD = 40;
export const isGoodSignal = (pct) => pct >= SIGNAL_OK_THRESHOLD;
export const isPoorSignal = (pct) => pct > 0 && pct < SIGNAL_OK_THRESHOLD;
export const isNoSignal = (pct) => pct < 1;
export const isNoConnection = (pct) => pct === null;
