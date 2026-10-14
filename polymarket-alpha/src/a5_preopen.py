"""Pre-open flow in BTC 5m: price paid vs fair 0.5, size, timing, imbalance."""
import numpy as np, pandas as pd
from common import *
t = load_trades_5m()
m = t.sec - 2
pre = t[m < -60].copy(); pre["m"] = m[m < -60]
print("pre-open (>60s before open) trades:", len(pre), " notional $", round(pre.notional.sum()), " windows with flow:", pre.start.nunique(), "of 8640")
# price the taker paid for the token acquired, vs 0.5
pre["acq_p"] = np.where(pre.dir > 0, pre.pu, 1 - pre.pu)
pre["prem"] = pre.acq_p - 0.5                       # premium over fair paid by taker (per share)
pd.set_option("display.width", 200); pd.set_option("display.float_format", lambda x: f"{x:,.4f}")
print("\npremium paid over 0.50 (per share), notional-weighted mean:", np.average(pre.prem, weights=pre["size"]))
print(pre.prem.describe(percentiles=[.05, .25, .5, .75, .95]))
print("\nby minutes before open:")
pre["mb"] = pd.cut(-pre.m / 60, [1, 2, 5, 15, 60, 240, 2000])
print(pre.groupby("mb", observed=True).agg(trades=("prem", "size"), notional=("notional", "sum"), prem_w=("prem", lambda x: np.average(x, weights=pre.loc[x.index, "size"])),
      med_size=("size", "median")))
print("\nby price paid:")
print(pre.groupby(pd.cut(pre.acq_p, [0, .3, .45, .49, .5, .51, .53, .55, .6, .7, 1]), observed=True).agg(trades=("prem", "size"), notional=("notional", "sum")))
# per-window net Up exposure a maker would have absorbed if it took all pre-open flow
w = pre.assign(q=pre.dir * pre["size"]).groupby("start").q.sum()
print("\nper-window net taker Up shares pre-open: median |q|", w.abs().median(), " mean |q|", w.abs().mean(), " gross shares/window", pre.groupby("start")["size"].sum().mean())
# last minute before open
lm = t[(m >= -60) & (m < 0)]
print("\nlast minute pre-open: trades", len(lm), "notional $", round(lm.notional.sum()))
