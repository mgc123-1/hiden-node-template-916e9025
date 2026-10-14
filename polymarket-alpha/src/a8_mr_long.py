"""Slow mean reversion on long outcome histories: Y_t vs count of Ups in windows t-2 .. t-k (skip lag 1)."""
import numpy as np, pandas as pd
from common import load_markets_5m
D = "/home/user/data/supervik_polymarket-btc-preopen/data"
def series(tf):
    d = pd.read_parquet(f"{D}/dataset_BTC_{tf}.parquet")
    o = d.drop_duplicates("market_id")[["open_time", "outcome"]].dropna()
    o = o[o.outcome.isin(["Up", "Down"])].sort_values("open_time").drop_duplicates("open_time")
    return o.set_index("open_time").outcome.eq("Up").astype(int)
S = {"5m(Dec25-Jul26)": (series("5m"), "5min"), "15m(Sep25-Jul26)": (series("15m"), "15min"), "1h(Jun25-Jul26)": (series("1h"), "1h")}
m = load_markets_5m(); S["5m(Sep26,TWAP)"] = (pd.Series(m.up.to_numpy(), index=pd.to_datetime(m.start, unit="s", utc=True)), "5min")
for name, (y, step) in S.items():
    for k in ([6, 12] if "5m" in name else [4, 8] if "15m" in name else [3, 6]):
        lags = pd.concat([y.shift(j, freq=step).reindex(y.index) for j in range(2, k + 1)], axis=1)
        ok = lags.notna().all(axis=1)
        frac = lags[ok].mean(axis=1); yy = y[ok]
        hi, lo = frac > 0.5 + 1e-9, frac < 0.5 - 1e-9
        a, b = yy[hi].mean(), yy[lo].mean(); se = np.sqrt(.25 / hi.sum() + .25 / lo.sum())
        idx = yy.index; mid = idx[len(idx) // 2]
        h1 = yy[(idx < mid) & hi].mean() - yy[(idx < mid) & lo].mean(); h2 = yy[(idx >= mid) & hi].mean() - yy[(idx >= mid) & lo].mean()
        print(f"{name:18s} lags 2..{k:2d}: P(U|mostly Up)={a:.4f} P(U|mostly Down)={b:.4f} diff={a-b:+.4f} z={(a-b)/se:+.2f}  halves {h1:+.4f} {h2:+.4f}")
