"""Is slow mean reversion priced? Compare pre-open mid (1 min before open) with realized Up rate, split by MR signal."""
import numpy as np, pandas as pd
D = "/home/user/data/supervik_polymarket-btc-preopen/data"
pd.set_option("display.width", 200); pd.set_option("display.float_format", lambda x: f"{x:,.4f}")
CFG = {"5m": ("5min", [2, 3, 4, 5, 6]), "15m": ("15min", list(range(2, 13))), "1h": ("1h", [2, 3])}
for tf, (step, lags) in CFG.items():
    d = pd.read_parquet(f"{D}/dataset_BTC_{tf}.parquet")
    o = d.drop_duplicates("market_id")[["open_time", "outcome"]].dropna()
    o = o[o.outcome.isin(["Up", "Down"])].sort_values("open_time").drop_duplicates("open_time")
    y = o.set_index("open_time").outcome.eq("Up").astype(int)
    L = pd.concat([y.shift(j, freq=step).reindex(y.index) for j in lags], axis=1)
    sig = (L.mean(axis=1) - 0.5).rename("sig")                     # >0: recent windows mostly Up -> expect Down
    for mb in [1, 5]:
        p = d[(d.minutes_before == mb) & d.price_up.notna() & ((d.price_up - (1 - d.price_down)).abs() <= 0.01)]
        p = p.drop_duplicates("open_time").set_index("open_time")[["price_up"]]
        x = p.join(y.rename("Y")).join(sig).dropna()
        x = x[(x.price_up > 0.3) & (x.price_up < 0.7)]
        x["grp"] = np.where(x.sig > 1e-9, "recent Up", np.where(x.sig < -1e-9, "recent Down", "mixed"))
        g = x.groupby("grp").agg(n=("Y", "size"), mid=("price_up", "mean"), up=("Y", "mean"))
        g["up-mid"] = g.up - g.mid; g["z"] = g["up-mid"] / np.sqrt(0.25 / g.n)
        # logistic-style check with OLS: Y ~ mid + sig
        A = np.c_[np.ones(len(x)), x.price_up - 0.5, x.sig]
        b, *_ = np.linalg.lstsq(A, x.Y, rcond=None); res = x.Y - A @ b
        se = np.sqrt(np.diag(np.linalg.inv(A.T @ A)) * res.var())
        print(f"\n{tf} @ {mb} min before open, n={len(x)}  OLS: Y = {b[0]:.3f} + {b[1]:.2f}*(mid-.5) [t {b[1]/se[1]:.1f}] + {b[2]:.3f}*sig [t {b[2]/se[2]:.1f}]")
        print(g.to_string())
