"""Slow statistical hypotheses on long outcome histories (BTC 5m/15m/1h, 2025-06 -> 2026-07) + Sep 2026 5m.
Break-even for a taker at p~0.5 is ~ +2.75pp of win rate (1.75c fee + ~1c half-spread)."""
import numpy as np, pandas as pd
from common import load_markets_5m
D = "/home/user/data/supervik_polymarket-btc-preopen/data"
pd.set_option("display.width", 200); pd.set_option("display.float_format", lambda x: f"{x:,.4f}")
def series(tf):
    d = pd.read_parquet(f"{D}/dataset_BTC_{tf}.parquet")
    o = d.drop_duplicates("market_id")[["open_time", "outcome"]].dropna()
    o = o[o.outcome.isin(["Up", "Down"])].sort_values("open_time").drop_duplicates("open_time")
    o["Y"] = (o.outcome == "Up").astype(int)
    return o.set_index("open_time").Y
S = {tf: series(tf) for tf in ["5m", "15m", "1h"]}
m = load_markets_5m(); S["5m_sep26"] = pd.Series(m.up.to_numpy(), index=pd.to_datetime(m.start, unit="s", utc=True))
for tf, y in S.items():
    step = {"5m": "5min", "15m": "15min", "1h": "1h", "5m_sep26": "5min"}[tf]
    prev = y.shift(1, freq=step).reindex(y.index)
    ok = prev.notna()
    a = y[ok & (prev == 1)].mean(); b = y[ok & (prev == 0)].mean()
    n1, n0 = (ok & (prev == 1)).sum(), (ok & (prev == 0)).sum()
    se = np.sqrt(0.25 / n1 + 0.25 / n0)
    # streaks of 3
    p3 = y.shift(1, freq=step).reindex(y.index) + y.shift(2, freq=step).reindex(y.index) + y.shift(3, freq=step).reindex(y.index)
    print(f"{tf:9s} n={len(y):6d} upRate={y.mean():.4f}  P(U|prevU)={a:.4f} P(U|prevD)={b:.4f} diff={a-b:+.4f} (z {(a-b)/se:+.2f})"
          f"  P(U|3U)={y[p3==3].mean():.4f} P(U|3D)={y[p3==0].mean():.4f}")
    h = y.groupby(y.index.hour).agg(["mean", "size"])
    z = (h["mean"] - 0.5) / np.sqrt(0.25 / h["size"])
    print(f"   hour-of-day: max |z| {z.abs().max():.2f} (hour {z.abs().idxmax()}), #|z|>2: {(z.abs() > 2).sum()} of 24;  "
          f"dow max|z| {((y.groupby(y.index.dayofweek).mean()-0.5)/np.sqrt(0.25/y.groupby(y.index.dayofweek).size())).abs().max():.2f}")
# hour-of-day persistence: is the sign of (hourly up-rate - 0.5) stable between first and second half of the 5m history?
y = S["5m"]; half = y.index[len(y) // 2]
h1 = y[y.index < half].groupby(y[y.index < half].index.hour).mean(); h2 = y[y.index >= half].groupby(y[y.index >= half].index.hour).mean()
print("5m hour-of-day effect persistence corr(first half, second half):", np.corrcoef(h1, h2)[0, 1].round(3))
# pre-open price calibration at 1 minute before open (pre-TWAP era) for each interval
for tf in ["5m", "15m", "1h"]:
    d = pd.read_parquet(f"{D}/dataset_BTC_{tf}.parquet")
    d = d[(d.minutes_before == 1) & d.price_up.notna() & d.outcome.isin(["Up", "Down"])]
    d = d[(d.price_up - (1 - d.price_down)).abs() <= 0.01]
    d["Y"] = (d.outcome == "Up").astype(int)
    d["skew"] = d.price_up - 0.5
    b = d.groupby(pd.cut(d.price_up, [0, .45, .48, .495, .505, .52, .55, 1]), observed=True).agg(n=("Y", "size"), price=("price_up", "mean"), up=("Y", "mean"))
    print(f"\n{tf} pre-open (1 min before) calibration:\n", b.T)
