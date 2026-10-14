"""How fast must a taker be? Sep 8, exact websocket print times.
A taker-buy print at time ms proves an ask at that price existed then. Signal = calibrated FV using Binance closes
through second floor(ms/1000)-1-extra. Reaction delay = ms within the second (time since that close became final).
Enter on the first print per window/token with FV - price - fee > theta, hold to resolution."""
import numpy as np, pandas as pd
from common import *
P = np.load("/home/user/data/panel_btc5m.npz"); fv = np.load("/home/user/data/fv_btc5m.npy").astype(float)
starts, up, taus = P["start"], P["up"], P["taus"]
mk = pd.DataFrame(list(read_jsonl_gz(glob.glob(f"{OT}/polymarket/daily/markets/BTC-5m/*.gz")[0])))
tok = {}
for r in mk.itertuples():
    tok[r.token_ids[0]] = (r.start_sec, 1); tok[r.token_ids[1]] = (r.start_sec, 0)
rows = []
for x in read_jsonl_gz(glob.glob(f"{OT}/polymarket/daily/last_trade_price/BTC-5m/*.gz")[0]):
    p = x["payload"]; k = tok.get(x["asset_id"])
    if k and p["side"] == "BUY": rows.append((k[0], k[1], float(p["price"]), int(p["timestamp"])))
w = pd.DataFrame(rows, columns=["start", "is_up", "price", "ms"])
w = w[w.start.isin(starts)]
row = np.searchsorted(starts, w.start.to_numpy())
w["Y"] = np.where(w.is_up == 1, up[row], 1 - up[row])
w["sec"] = w.ms // 1000 - w.start; w["msin"] = w.ms % 1000
w = w[(w.sec >= 0) & (w.sec < 297)]
row = np.searchsorted(starts, w.start.to_numpy())
out = []
for extra in [0, 1, 2]:
    k = np.clip(w.sec.to_numpy() - 1 - extra - taus[0], 0, len(taus) - 1)
    f = fv[row, k]; f = np.where(w.is_up == 1, f, 1 - f)
    edge = f - w.price - fee(w.price)
    for lo, hi in [(0, 150), (150, 400), (400, 1000), (0, 1000)]:
        for th in [0.05, 0.10]:
            sel = (edge > th) & (w.msin >= lo) & (w.msin < hi)
            s = w[sel].sort_values("ms").groupby(["start", "is_up"]).head(1)
            pnl = s.Y - s.price - fee(s.price)
            out.append(dict(stale_extra_s=extra, reaction_ms=f"{lo}-{hi}", theta=th, n=len(s), pnl_c=100 * pnl.mean(),
                            t=pnl.mean() / (pnl.std() + 1e-9) * np.sqrt(max(len(s), 1))))
pd.set_option("display.width", 200); pd.set_option("display.float_format", lambda x: f"{x:,.2f}")
print(pd.DataFrame(out).to_string(index=False))
