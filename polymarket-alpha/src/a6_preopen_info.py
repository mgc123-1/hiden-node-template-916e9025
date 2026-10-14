"""Are pre-open takers informed? P(Up | taker direction) by minutes before open; net-flow -> outcome."""
import numpy as np, pandas as pd
from common import *
P = np.load("/home/user/data/panel_btc5m.npz")
starts, up, spot = P["start"], P["up"], P["spot"]
t = load_trades_5m(); t["m"] = t.sec - 2
row = np.searchsorted(starts, t.start.to_numpy()); t["Y"] = up[row]
pre = t[t.m < -60].copy()
pre["mb"] = pd.cut(-pre.m / 60, [1, 2, 3, 5, 15, 2000])
pre["Yd"] = np.where(pre.dir > 0, pre.Y, 1 - pre.Y)        # did the taker's side win?
pre["acq"] = np.where(pre.dir > 0, pre.pu, 1 - pre.pu)
g = pre.groupby("mb", observed=True).apply(lambda x: pd.Series({
    "trades": len(x), "share_w_win": np.average(x.Yd, weights=x["size"]), "avg_paid": np.average(x.acq, weights=x["size"])}))
print(g)
# window-level: net pre-open taker flow vs outcome
w = pre.assign(q=pre.dir * pre["size"]).groupby("start").agg(q=("q", "sum"), Y=("Y", "first"))
w["sgn"] = np.sign(w.q)
print("\nP(Up | net pre-open flow buys Up) =", w[w.sgn > 0].Y.mean(), " n", (w.sgn > 0).sum())
print("P(Up | net pre-open flow sells Up) =", w[w.sgn < 0].Y.mean(), " n", (w.sgn < 0).sum())
big = w.q.abs() > w.q.abs().quantile(0.8)
print("top-20% |flow|: P(taker side wins) =", ((w.sgn > 0) == (w.Y == 1))[big].mean(), " n", big.sum())
# Is it the CURRENT window's spot move that informs? correlate pre-open flow sign with spot move over the 60s before the trade
ts0 = int(P["t0"])
