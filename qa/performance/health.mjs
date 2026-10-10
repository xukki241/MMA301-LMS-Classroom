import autocannon from "autocannon";

const configuredCore = process.env.CORE_URL || "http://127.0.0.1:4002";
const url = configuredCore.replace(/\/$/, "").endsWith("/health")
  ? configuredCore
  : `${configuredCore.replace(/\/$/, "")}/health`;
const duration = Number(process.env.PERF_DURATION || 3);
const result = await autocannon({ url, duration, connections: 10, pipelining: 1 });

const p99 = result.latency.p99;
console.log(JSON.stringify({ url, requests: result.requests.total, errors: result.errors, non2xx: result.non2xx, p99 }, null, 2));
if (result.errors > 0 || result.non2xx > 0) process.exit(1);
if (p99 > Number(process.env.PERF_P99_MS || 1000)) process.exit(1);
