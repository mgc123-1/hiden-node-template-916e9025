"""Data-API trade timestamps vs websocket match time (Sep 8 overlap)."""
import numpy as np, pandas as pd
from common import *

mk = pd.DataFrame(list(read_jsonl_gz(glob.glob(f"{OT}/polymarket/daily/markets/BTC-5m/*.gz")[0])))
tok = {}
for r in mk.itertuples():
    tok[r.token_ids[0]] = (r.start_sec, "Up"); tok[r.token_ids[1]] = (r.start_sec, "Down")
ws = []
for x in read_jsonl_gz(glob.glob(f"{OT}/polymarket/daily/last_trade_price/BTC-5m/*.gz")[0]):
    p = x["payload"]; k = tok.get(x["asset_id"])
    if k is None: continue
    ws.append((k[0], k[1], p["side"], float(p["price"]), float(p["size"]), int(p["timestamp"]), p["transaction_hash"]))
ws = pd.DataFrame(ws, columns=["start", "outcome", "side", "price", "size", "ts_ms", "tx"])
print("ws trades", len(ws), "unique tx", ws.tx.nunique())
t = pd.read_parquet(f"{MM}/trades.parquet")
t = t[t.start.isin(ws.start.unique())].copy()
t["outcome"] = t.outcome.astype(str); t["side"] = t.side.astype(str)
print("data-api trades same markets", len(t))
ws["sz"] = ws["size"].round(2); t["sz"] = t["size"].round(2)
key = ["start", "outcome", "price", "sz"]
g_ws = ws.groupby(key).size(); g_t = t.groupby(key).size()
uniq = set(g_ws[g_ws == 1].index) & set(g_t[g_t == 1].index)
a = ws.set_index(key).loc[list(uniq)]; b = t.set_index(key).loc[list(uniq)]
j = a.join(b[["timestamp", "side"]], rsuffix="_api")
j["delay"] = j.timestamp - j.ts_ms / 1000
print("uniquely matched", len(j), "side agree", np.mean(j.side == j.side_api))
print(j.delay.describe(percentiles=[.05, .25, .5, .75, .95]))
# what fraction of ws prints appear in data-api, by size
ws["in_api"] = ws.set_index(key).index.isin(t.set_index(key).index)
print("ws prints found in data-api:", ws.in_api.mean())
print(ws.groupby(pd.cut(ws["size"], [0, 5, 20, 100, 1000, 1e9]), observed=True).in_api.mean())
print("WS notional", (ws.price*ws["size"]).sum(), " API notional", (t.price*t["size"]).sum())
