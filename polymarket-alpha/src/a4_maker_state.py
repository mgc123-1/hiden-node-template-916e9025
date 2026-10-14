"""Average maker P&L per $ by state knowable before the fill (info at match-2s): tau, FV level, recent |dFV|, hour."""
import numpy as np, pandas as pd
from common import *
P = np.load("/home/user/data/panel_btc5m.npz"); fv = np.load("/home/user/data/fv_btc5m.npy").astype(float)
starts, taus = P["start"], P["taus"]
t = pd.read_parquet("/home/user/data/trades_btc5m_enriched.parquet")
t = t[t.inwin].copy()
row = np.searchsorted(starts, t.start.to_numpy()); m = (t.sec - 2).to_numpy()
k = np.clip(m - 2 - taus[0], 0, len(taus) - 1)                 # info 2s before match
f = fv[row, k]; f10 = fv[row, np.clip(k - 10, 0, len(taus) - 1)]
t["fvk"] = f; t["dfv10"] = np.abs(f - f10)
t["maker_net"] = -t.gross + REBATE_RATE * t.fee
t["maker_gross"] = -t.gross
t["fav_dist"] = np.abs(f - 0.5)
t["hour"] = pd.to_datetime(t.timestamp, unit="s").dt.hour
pd.set_option("display.width", 250); pd.set_option("display.float_format", lambda x: f"{x:,.1f}")
def bp(g): return pd.Series({"notional_$k": g.notional.sum() / 1e3, "maker_net_bp": 1e4 * g.maker_net.sum() / g.notional.sum(),
                             "maker_gross_bp": 1e4 * g.maker_gross.sum() / g.notional.sum(), "net_$k": g.maker_net.sum() / 1e3})
t["tb"] = pd.cut(m, [-61, 0, 30, 60, 120, 180, 240, 270, 295])
t["vb"] = pd.cut(t.dfv10, [-1, 0.01, 0.03, 0.08, 1.1])
t["fb"] = pd.cut(t.fav_dist, [-.01, .1, .25, .4, .5])
print("maker by tau x |dFV last 10s| (net bp)")
print(t.groupby(["tb", "vb"], observed=True).apply(bp)["maker_net_bp"].unstack("vb"))
print("\nmaker by tau x |FV-0.5| (net bp)")
print(t.groupby(["tb", "fb"], observed=True).apply(bp)["maker_net_bp"].unstack("fb"))
print("\nnotional share $k by tau x vol:")
print(t.groupby(["tb", "vb"], observed=True).apply(bp)["notional_$k"].unstack("vb"))
print("\nmaker by hour UTC (net bp):")
h = t.groupby("hour").apply(bp); print(h[["maker_net_bp", "net_$k"]].T)
t["half"] = np.where(t.start < starts[len(starts)//2], "1st", "2nd")
print("\nstability, calm (|dFV|<1c) vs moving, by half:")
print(t.groupby(["half", "vb"], observed=True).apply(bp)[["maker_net_bp", "net_$k"]].unstack("vb"))
