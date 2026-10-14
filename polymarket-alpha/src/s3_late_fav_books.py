"""Late-window favourite at the ask (Aug books, BTC/ETH x 5m/15m).
At the first snapshot with time-left <= T, if the favourite's ask is in [lo, hi] and the book is not crossed,
buy the favourite at the ask (+ taker fee), hold to resolution. One entry per window."""
import numpy as np, pandas as pd
from common import fee
g = pd.read_parquet("/home/user/data/books_aug_y.parquet")
g = g[(g.up_ask > g.up_bid) & (g.down_ask > g.down_bid)]
rows = []
for (asset, tf), x in g.groupby(["asset", "window_label"]):
    W = 300 if tf == "5m" else 900
    for T in ([60, 30, 20, 15, 10, 5, 3] if tf == "5m" else [180, 90, 60, 45, 30, 15, 5]):
        s = x[x.left <= T].sort_values("ts_ms").groupby("window_start").head(1)
        s = s[s.left > T - 3]                           # snapshot must be close to the target time
        fav_up = s.up_bid + s.up_ask >= s.down_bid + s.down_ask
        ask = np.where(fav_up, s.up_ask, s.down_ask)
        Y = np.where(fav_up, s.Y, 1 - s.Y)
        for lo, hi in [(0.5, 0.7), (0.7, 0.85), (0.85, 0.95), (0.55, 0.9)]:
            sel = (ask >= lo) & (ask < hi)
            if sel.sum() < 20: continue
            pnl = Y[sel] - ask[sel] - fee(ask[sel])
            day = pd.to_datetime(s.window_start[sel], unit="s").dt.day.to_numpy()
            rows.append(dict(asset=asset, tf=tf, T=T, band=f"{lo}-{hi}", n=sel.sum(), win=Y[sel].mean(), ask=ask[sel].mean(),
                             pnl_c=100 * pnl.mean(), t=pnl.mean() / pnl.std() * np.sqrt(sel.sum()),
                             first_half_c=100 * pnl[day <= 12].mean(), second_half_c=100 * pnl[day > 12].mean()))
R = pd.DataFrame(rows)
pd.set_option("display.width", 250); pd.set_option("display.max_rows", 300); pd.set_option("display.float_format", lambda x: f"{x:,.3f}")
print(R.to_string())
R.to_csv("../out/s3_late_fav_books.csv", index=False)
