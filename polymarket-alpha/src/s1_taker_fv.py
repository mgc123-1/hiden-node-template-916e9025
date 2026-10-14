"""Taker fair-value strategy on BTC 5m, print-conditional.

Each taker-BUY print shows that an ask existed at that price at match time. The strategy may lift that same
ask if FV (computed from spot info that was available L seconds before the match) exceeds price + fee + theta.
One entry per window per side (first qualifying print). P&L to resolution per $1 notional and per share.
Train/test split by date to avoid choosing theta in-sample.
"""
import numpy as np, pandas as pd
from common import *
P = np.load("/home/user/data/panel_btc5m.npz"); fv = np.load("/home/user/data/fv_btc5m.npy")
starts, up, taus = P["start"], P["up"], P["taus"]
t = load_trades_5m()
t = t[t.buy].copy()                                    # taker buys: price = ask that existed
row = np.searchsorted(starts, t.start.to_numpy())
t["Y_tok"] = np.where(t.tok_up, up[row], 1 - up[row])
t["match_sec"] = t.sec - 2                             # data-api delay ~2.3s
mid = len(starts) // 2; split_start = starts[mid]
out = []
for L in [0, 1, 2, 4, 8]:
    known = t.match_sec.to_numpy() - 1 - L
    k = np.clip(known - taus[0], 0, len(taus) - 1)
    f_up = fv[row, k].astype(float)
    f_tok = np.where(t.tok_up, f_up, 1 - f_up)
    p = t.price.to_numpy()
    edge = f_tok - p - fee(p)
    for th in [0.0, 0.02, 0.05, 0.10, 0.15]:
        for zone, (lo, hi) in {"0-120": (0, 120), "120-240": (120, 240), "240-290": (240, 290), "all": (0, 290)}.items():
            sel = (edge > th) & (t.match_sec >= lo) & (t.match_sec < hi) & (known >= -100)
            s = t[sel].assign(edge=edge[sel])
            s = s.sort_values("timestamp").groupby(["start", "tok_up"]).head(1)
            pnl = s.Y_tok - s.price - fee(s.price)            # per share
            for half, hs in [("train", s.start < split_start), ("test", s.start >= split_start)]:
                x = pnl[hs]
                if len(x) < 30: continue
                out.append(dict(L=L, theta=th, zone=zone, half=half, n=len(x), win=(s.Y_tok[hs] == 1).mean(),
                                avg_price=s.price[hs].mean(), pnl_c=100 * x.mean(), t=x.mean() / x.std() * np.sqrt(len(x)),
                                roi=x.sum() / (s.price[hs] + fee(s.price[hs])).sum()))
r = pd.DataFrame(out)
pd.set_option("display.width", 200); pd.set_option("display.max_rows", 500)
pd.set_option("display.float_format", lambda x: f"{x:,.3f}")
w = r.pivot_table(index=["L", "theta", "zone"], columns="half", values=["n", "pnl_c", "t", "roi"])
print(w.to_string())
r.to_csv("../out/s1_taker_fv.csv", index=False)
