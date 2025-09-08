// --- 模型数据：3x3 到 8x8 的 mean (秒) 和 sd (秒) ---
// 这些值来自一个简单的模拟模型（可替换为真实数据）
const SCHULTE_MODEL: any = {
  3: { side: 3, n_cells: 9,  per_cell_sec: 1.0, mean_sec: 9.0,   sd_sec: 2.25 },
  4: { side: 4, n_cells:16,  per_cell_sec: 1.2, mean_sec: 19.2,  sd_sec: 4.8  },
  5: { side: 5, n_cells:25,  per_cell_sec: 1.4, mean_sec: 35.0,  sd_sec: 8.75 },
  6: { side: 6, n_cells:36,  per_cell_sec: 1.6, mean_sec: 57.6,  sd_sec: 14.4 },
  7: { side: 7, n_cells:49,  per_cell_sec: 1.8, mean_sec: 88.2,  sd_sec: 22.05},
  8: { side: 8, n_cells:64,  per_cell_sec: 2.0, mean_sec: 128.0, sd_sec: 32.0 }
};

// --- 辅助：误差函数 erf（Abramowitz & Stegun 近似）和正态 CDF ---
function erf(x: number) {
  // constants
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p  = 0.3275911;
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((( (a5 * t + a4) * t ) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}
function normalCdf(x: number) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

// --- 主函数：输入 size (3..8) 和 durationMs，返回 0..100 的分数（两位小数） ---
export function schulteScore(size: number, durationMs: number) {
  if (!Number.isInteger(size) || !(size in SCHULTE_MODEL)) {
    throw new Error('size must be an integer between 3 and 8 (3 means 3x3).');
  }
  if (typeof durationMs !== 'number' || durationMs < 0) {
    throw new Error('durationMs must be a non-negative number (milliseconds).');
  }

  const data = SCHULTE_MODEL[size];
  const tSec = durationMs / 1000;
  const mean = data.mean_sec;
  const sd = data.sd_sec;

  // 防护：若 sd 非法则返回 50.00
  if (!(sd > 0)) return 50.00;

  // z = (mean - observed) / sd  （更小时间 => 更高分）
  const z = (mean - tSec) / sd;
  let pct = normalCdf(z) * 100;

  // clamp & round
  if (!isFinite(pct)) pct = 0;
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;

  return Number(pct.toFixed(2));
}
