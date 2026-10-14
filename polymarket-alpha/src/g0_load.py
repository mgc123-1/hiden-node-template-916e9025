"""Load the BTC/ETH 5m/15m top-of-book snapshots (Aug 6-18) into one parquet."""
import sqlite3, glob, pandas as pd, numpy as np
dfs = []
for f in sorted(glob.glob("/home/user/data/gensx_db/*.db")):
    con = sqlite3.connect(f"file:{f}?mode=ro", uri=True)
    dfs.append(pd.read_sql("SELECT ts_ms, asset, window_label, window_start, window_end, secs_into, up_bid, up_ask, up_last, up_bid_sz, up_ask_sz, down_bid, down_ask, down_last, down_bid_sz, down_ask_sz, ok FROM ticks", con))
    con.close()
g = pd.concat(dfs, ignore_index=True)
g = g.drop_duplicates(["asset", "window_label", "window_start", "ts_ms"]).sort_values(["asset", "window_label", "window_start", "ts_ms"])
g.to_parquet("/home/user/data/books_aug.parquet")
print(len(g), g.ok.mean())
print(g.groupby(["asset", "window_label"]).agg(n=("ts_ms", "size"), windows=("window_start", "nunique")))
w = g[g.ok == 1].groupby(["asset", "window_label", "window_start"]).ts_ms.apply(lambda x: np.median(np.diff(x.to_numpy())) if len(x) > 2 else np.nan)
print("median snapshot interval ms by series:\n", w.groupby(level=[0, 1]).median())
