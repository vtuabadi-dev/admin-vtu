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

interface WorkerMetricData {
  completed: number;
  failed: number;
  totalDuration: number;
  durationCount: number;
}

const counters = new Map<string, MetricCounter>();
const histograms = new Map<string, MetricHistogram>();
const workerMetrics = new Map<string, WorkerMetricData>();
const queueDepths = new Map<string, number>();

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

/** Track a completed or failed job for a specific worker */
export function incrementWorkerJob(
  workerName: string,
  status: "completed" | "failed",
): void {
  const existing = workerMetrics.get(workerName) ?? {
    completed: 0,
    failed: 0,
    totalDuration: 0,
    durationCount: 0,
  };
  if (status === "completed") {
    existing.completed += 1;
  } else {
    existing.failed += 1;
  }
  workerMetrics.set(workerName, existing);
}

/** Record the current depth of a queue */
export function setQueueDepth(queueName: string, depth: number): void {
  queueDepths.set(queueName, depth);
}

/** Record the duration of a worker job execution */
export function recordJobDuration(workerName: string, durationMs: number): void {
  const existing = workerMetrics.get(workerName) ?? {
    completed: 0,
    failed: 0,
    totalDuration: 0,
    durationCount: 0,
  };
  existing.totalDuration += durationMs;
  existing.durationCount += 1;
  workerMetrics.set(workerName, existing);
}

export function getMetrics() {
  const counterData: Record<string, number> = {};
  counters.forEach((v, k) => {
    counterData[k] = v.count;
  });

  const histogramData: Record<string, { avg: number; p95: number; count: number }> =
    {};
  histograms.forEach((v, k) => {
    const sorted = [...v.values].sort((a, b) => a - b);
    const avg = sorted.length
      ? sorted.reduce((a, b) => a + b, 0) / sorted.length
      : 0;
    const p95 = sorted.length
      ? (sorted[Math.floor(sorted.length * 0.95)] ?? 0)
      : 0;
    histogramData[k] = {
      avg: Math.round(avg),
      p95: Math.round(p95),
      count: sorted.length,
    };
  });

  // Build worker metrics summary
  const workerData: Record<
    string,
    { completed: number; failed: number; avgDuration: number }
  > = {};
  workerMetrics.forEach((v, k) => {
    workerData[k] = {
      completed: v.completed,
      failed: v.failed,
      avgDuration:
        v.durationCount > 0 ? Math.round(v.totalDuration / v.durationCount) : 0,
    };
  });

  // Build queue depth snapshot
  const queueDepthData: Record<string, number> = {};
  queueDepths.forEach((v, k) => {
    queueDepthData[k] = v;
  });

  return {
    counters: counterData,
    histograms: histogramData,
    workers: workerData,
    queueDepths: queueDepthData,
    uptime: process.uptime(),
  };
}

export function resetMetrics(): void {
  counters.clear();
  histograms.clear();
  workerMetrics.clear();
  queueDepths.clear();
}
