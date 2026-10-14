"""Sep 8: in the last 30s of each window, does the market price follow a Chainlink-TWAP-based or a Binance-based FV?"""
import numpy as np, pandas as pd
from scipy.special import ndtr
from common import *
from fv import window_weights
def cl(name):
    f = glob.glob(f"{OT}/{name}/daily/prices/BTCUSD/*.csv.gz")[0]
    d = pd.read_csv(f); d["ts"] = d.feed_ts_ms // 1000
    return d.drop_duplicates("ts").set_index("ts")["value"]
inst, tw60 = cl("chainlink"), cl("chainlink-twap-60s")
mk = pd.DataFrame(list(read_jsonl_gz(glob.glob(f"{OT}/polymarket/daily/markets/BTC-5m/*.gz")[0])))
mk = mk[mk.resolved == True]
mk["Y"] = mk.outcome_prices.apply(lambda x: int(float(x[0]) == 1.0)); mk["K"] = mk.strike_value.astype(float) / 1e18
up_tok = dict(zip(mk.token_ids.str[0], mk.start_sec))
# best bid/ask of the Up token per second
bb = []
for x in read_jsonl_gz(glob.glob(f"{OT}/polymarket/daily/best_bid_ask/BTC-5m/*.gz")[0]):
    s = up_tok.get(x["asset_id"])
    if s is None: continue
    p = x["payload"]
    try: bb.append((s, int(p["timestamp"]) // 1000, float(p["best_bid"]), float(p["best_ask"])))
    except (ValueError, KeyError): pass
bb = pd.DataFrame(bb, columns=["start", "sec", "bid", "ask"]).groupby(["start", "sec"]).last().reset_index()
bb["mid"] = (bb.bid + bb.ask) / 2
s = load_spot_btc(); t0, px = spot_array(s)
P = np.load("/home/user/data/panel_btc5m.npz"); fvb = np.load("/home/user/data/fv_btc5m.npy"); taus = P["taus"]
rowof = {v: i for i, v in enumerate(P["start"])}
inst_d = inst.reindex(range(inst.index.min(), inst.index.max() + 1)).ffill()
sig_cl = 1.4  # $ per sqrt(second) floor; replaced by realised below
recs = []
for r in mk.itertuples():
    S, E = r.start_sec, r.end_sec
    if S not in rowof or S - 1900 < inst_d.index.min() or E > inst_d.index.max(): continue
    X = inst_d.loc[S - 59:E].to_numpy()
    sv, w = window_weights(S, E)
    rv = np.diff(inst_d.loc[S - 1800:S].to_numpy()); sigma = np.sqrt(np.mean(rv ** 2))
    T = np.r_[np.cumsum(w[::-1])[::-1], 0.0]; T2 = np.r_[np.cumsum((T[:-1] ** 2)[::-1])[::-1], 0.0]; cw = np.cumsum(w * X)
    for tau in range(270, 299):
        i = S + tau - sv[0]
        mean = cw[i] + T[i + 1] * X[i]; var = sigma ** 2 * T2[i + 1] + (0.3) ** 2
        f_cl = ndtr(mean / np.sqrt(var))
        f_bn = float(fvb[rowof[S], tau - taus[0]])
        recs.append((S, tau, r.Y, f_cl, f_bn))
R = pd.DataFrame(recs, columns=["start", "tau", "Y", "f_cl", "f_bn"])
R["sec"] = R.start + R.tau
R = R.merge(bb[["start", "sec", "mid", "bid", "ask"]], on=["start", "sec"], how="inner")
print("rows", len(R), "windows", R.start.nunique())
for c in ["f_cl", "f_bn", "mid"]:
    p = np.clip(R[c], 1e-4, 1 - 1e-4)
    print(f"{c:5s} Brier {np.mean((p - R.Y)**2):.4f}  logloss {-np.mean(R.Y*np.log(p)+(1-R.Y)*np.log(1-p)):.4f}")
dis = R[(np.abs(R.f_cl - R.f_bn) > 0.2)]
print("\nseconds where Chainlink-FV and Binance-FV disagree by >0.2:", len(dis), "windows", dis.start.nunique())
print(" mean |mid - f_cl|", np.abs(dis.mid - dis.f_cl).mean(), " mean |mid - f_bn|", np.abs(dis.mid - dis.f_bn).mean())
print(" outcome agrees with sign(f_cl-.5):", ((dis.f_cl > .5) == (dis.Y == 1)).mean(), " with sign(f_bn-.5):", ((dis.f_bn > .5) == (dis.Y == 1)).mean(),
      " with sign(mid-.5):", ((dis.mid > .5) == (dis.Y == 1)).mean())
# taker opportunity with Chainlink info: buy the side with f_cl - ask - fee > 0.1, first per window
R["ask_dn"] = 1 - R.bid
R["e_up"] = R.f_cl - R.ask - fee(R.ask); R["e_dn"] = (1 - R.f_cl) - R.ask_dn - fee(R.ask_dn)
for th in [0.05, 0.1, 0.2]:
    o = R[(R.e_up > th) | (R.e_dn > th)].sort_values("sec").groupby("start").head(1)
    buy_up = o.e_up > th
    pnl = np.where(buy_up, o.Y - o.ask - fee(o.ask), (1 - o.Y) - o.ask_dn - fee(o.ask_dn))
    print(f"theta {th}: trades {len(o)}, mean pnl/share {pnl.mean():.3f}, win {np.mean(pnl>0):.2f}")
