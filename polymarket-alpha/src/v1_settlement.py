"""Validate settlement rule on 2026-09-08 using Chainlink feeds, and Binance as a proxy."""
import numpy as np, pandas as pd
from common import *

def cl(name):
    f = glob.glob(f"{OT}/{name}/daily/prices/BTCUSD/*.csv.gz")[0]
    d = pd.read_csv(f)
    d["ts"] = d.feed_ts_ms // 1000
    return d.drop_duplicates("ts").set_index("ts")["value"]

inst, tw60, tw30 = cl("chainlink"), cl("chainlink-twap-60s"), cl("chainlink-twap-30s")
mk = pd.DataFrame(list(read_jsonl_gz(glob.glob(f"{OT}/polymarket/daily/markets/BTC-5m/*.gz")[0])))
mk = mk[mk.resolved == True].copy()
mk["up"] = mk.outcome_prices.apply(lambda x: int(float(x[0]) == 1.0))
mk["strike"] = mk.strike_value.astype(float) / 1e18
print("markets", len(mk), "Up rate", mk.up.mean())

def at(series, t):
    return series.get(t, np.nan)

rows = []
for r in mk.itertuples():
    s, e = r.start_sec, r.end_sec
    rows.append(dict(start=s, up=r.up, strike=r.strike,
                     tw60_s=at(tw60, s), tw60_e=at(tw60, e), inst_s=at(inst, s), inst_e=at(inst, e),
                     tw30_s=at(tw30, s), tw30_e=at(tw30, e),
                     mean_inst_last60=inst.loc[e-59:e].mean(), mean_inst_pre60=inst.loc[s-59:s].mean()))
d = pd.DataFrame(rows).dropna()
print("n with feeds", len(d))
for col in ["tw60_s", "inst_s", "tw30_s", "mean_inst_pre60"]:
    print(f"strike - {col}: median abs diff ${np.median(np.abs(d.strike - d[col])):.4f}, exact(<1c) {np.mean(np.abs(d.strike-d[col])<0.01):.3f}")
for a, b in [("tw60_e", "tw60_s"), ("tw60_e", "strike"), ("inst_e", "inst_s"), ("tw30_e", "tw30_s"), ("mean_inst_last60", "mean_inst_pre60")]:
    pred = (d[a] >= d[b]).astype(int)
    print(f"rule {a} >= {b}: match official {np.mean(pred == d.up):.4f}")

# Binance proxy on the same day
s = load_spot_btc(); t0, px = spot_array(s)
def bn(t): return px[t - t0]
def bn_twap(t): return px[t - t0 - 59: t - t0 + 1].mean()
d["bn_s"], d["bn_e"] = d.start.map(bn), (d.start + 300).map(bn)
d["bn_tw_s"], d["bn_tw_e"] = d.start.map(bn_twap), (d.start + 300).map(bn_twap)
print("Binance - Chainlink inst basis: mean $%.2f sd $%.2f" % ((d.bn_s - d.inst_s).mean(), (d.bn_s - d.inst_s).std()))
print("Binance-ret vs CL-ret (5m) corr %.4f; diff sd in bp %.3f" % (
    np.corrcoef(np.log(d.bn_e/d.bn_s), np.log(d.inst_e/d.inst_s))[0,1],
    1e4*np.std(np.log(d.bn_tw_e/d.bn_tw_s) - np.log(d.tw60_e/d.tw60_s))))
for a, b in [("bn_tw_e", "bn_tw_s"), ("bn_e", "bn_s")]:
    print(f"Binance rule {a} >= {b}: match official {np.mean((d[a] >= d[b]).astype(int) == d.up):.4f}")
# compare to the 30-day market file outcomes
m5 = load_markets_5m().set_index("start")
j = d.join(m5[["up"]].rename(columns={"up": "up_mm"}), on="start", how="inner")
print("official (OT) vs markets.parquet outcome agreement", np.mean(j.up == j.up_mm), len(j))
# TWAP60 vs mean of instantaneous over (t-59..t)
x = pd.concat([tw60, inst.rolling(60).mean()], axis=1, keys=["tw", "m"]).dropna()
print("TWAP60 vs rolling-60 mean of 1Hz inst: median abs $%.3f, p99 $%.3f" % (np.median(np.abs(x.tw-x.m)), np.quantile(np.abs(x.tw-x.m), .99)))
for lag in [-2,-1,0,1,2]:
    x = pd.concat([tw60, inst.rolling(60).mean().shift(lag)], axis=1, keys=["tw", "m"]).dropna()
    print(" lag", lag, "median abs $%.3f" % np.median(np.abs(x.tw-x.m)))
