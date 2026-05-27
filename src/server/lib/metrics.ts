// Simple in-memory metrics counters
// Untuk production, ganti dengan Prometheus / OpenTelemetry

interface MetricCounter {
  name: string;
  count: number;
  lastUpdated: number;
}

interface MetricHistogram {
  name: string;
  values: number[];
  maxSamples: number;
}

const counters = new Map<string, MetricCounter>();
const histograms = new Map<string, MetricHistogram>();

export function incrementCounter(name: string, by = 1): void {
  const existing = counters.get(name);
  if (existing) {
    existing.count += by;
    existing.lastUpdated = Date.now();
  } else {
    counters.set(name, { name, count: by, lastUpdated: Date.now() });
  }
}

export function recordTiming(name: string, durationMs: number): void {
  incrementCounter(`${name}:count`);
  const hist = histograms.get(name);
  if (hist) {
    hist.values.push(durationMs);
    if (hist.values.length > hist.maxSamples) hist.values.shift();
  } else {
    histograms.set(name, { name, values: [durationMs], maxSamples: 100 });
  }
}

export function getMetrics() {
  const counterData: Record<string, number> = {};
  counters.forEach((v, k) => { counterData[k] = v.count; });

  const histogramData: Record<string, { avg: number; p95: number; count: number }> = {};
  histograms.forEach((v, k) => {
    const sorted = [...v.values].sort((a, b) => a - b);
    const avg = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
    const p95 = sorted.length ? (sorted[Math.floor(sorted.length * 0.95)] ?? 0) : 0;
    histogramData[k] = { avg: Math.round(avg), p95: Math.round(p95), count: sorted.length };
  });

  return { counters: counterData, histograms: histogramData, uptime: process.uptime() };
}

export function resetMetrics(): void {
  counters.clear();
  histograms.clear();
}
