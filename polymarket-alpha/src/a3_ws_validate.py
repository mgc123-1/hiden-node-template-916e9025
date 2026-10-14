"""Sep 8: classify trades with exact websocket match times (ms) to validate the sniper / stale-flow split."""
import numpy as np, pandas as pd
from common import *
P = np.load("/home/user/data/panel_btc5m.npz"); fv = np.load("/home/user/data/fv_btc5m.npy")
starts, up, taus = P["start"], P["up"], P["taus"]
mk = pd.DataFrame(list(read_jsonl_gz(glob.glob(f"{OT}/polymarket/daily/markets/BTC-5m/*.gz")[0])))
tok = {}
for r in mk.itertuples():
    tok[r.token_ids[0]] = (r.start_sec, 1); tok[r.token_ids[1]] = (r.start_sec, 0)
rows = []
for x in read_jsonl_gz(glob.glob(f"{OT}/polymarket/daily/last_trade_price/BTC-5m/*.gz")[0]):
    p = x["payload"]; k = tok.get(x["asset_id"])
    if k: rows.append((k[0], k[1], p["side"] == "BUY", float(p["price"]), float(p["size"]), int(p["timestamp"])))
w = pd.DataFrame(rows, columns=["start", "is_up", "buy", "price", "size", "ms"])
w = w[w.start.isin(starts)]
row = np.searchsorted(starts, w.start.to_numpy())
w["pu"] = np.where(w.is_up == 1, w.price, 1 - w.price)
w["dir"] = np.where((w.is_up == 1) == w.buy, 1, -1)
w["Y"] = up[row]
w["notional"] = w.price * w["size"]
w["gross"] = w.dir * (w.Y - w.pu) * w["size"]; w["fee"] = fee(w.pu) * w["size"]
sec = w.ms // 1000 - w.start                   # second of the match
known = sec - 1                                 # last fully known Binance 1s close
def F(off):
    return fv[row, np.clip(known + off - taus[0], 0, len(taus) - 1)].astype(float)
w["d_before"] = F(0) - F(-3)                    # FV move in the 3s before the match (knowable)
w["d_after"] = F(4) - F(0)                      # FV move in the 4s after
w = w[(sec >= 0) & (sec < 300)]
def cls(d): return np.where(np.abs(d) > 0.03, np.sign(d), 0)
w["before"] = cls(w.d_before) * w.dir; w["after"] = cls(w.d_after) * w.dir
w["maker_net"] = -w.gross + REBATE_RATE * w.fee
pd.set_option("display.float_format", lambda x: f"{x:,.1f}")
g = w.groupby(["before", "after"]).agg(trades=("gross", "size"), notional=("notional", "sum"), maker_net=("maker_net", "sum"))
g["maker_bp"] = 1e4 * g.maker_net / g.notional
print("Sep 8, exact match times. before/after: +1 taker trades WITH the FV jump, -1 against\n", g)
print("\ntotal maker net $", w.maker_net.sum(), " notional", w.notional.sum())
# how quickly after a Binance move do takers arrive? distribution of ms within the second for 'with jump' flow
w["ms_in_sec"] = w.ms % 1000
print("\nshare of with-jump trades by delay since last 1s close boundary:")
print(w[w.before == 1].ms_in_sec.describe())
