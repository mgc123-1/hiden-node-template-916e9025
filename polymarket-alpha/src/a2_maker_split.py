"""Maker P&L decomposition: which taker flow do makers win/lose against."""
import numpy as np, pandas as pd
from common import *
t = pd.read_parquet("/home/user/data/trades_btc5m_enriched.parquet")
t = t[t.inwin].copy()
t["maker_net"] = -t.gross + REBATE_RATE * t.fee
t["tau"] = t.sec - 2
pd.set_option("display.width", 250); pd.set_option("display.float_format", lambda x: f"{x:,.1f}")
def tab(idx, cols):
    a = t.pivot_table(index=idx, columns=cols, values="maker_net", aggfunc="sum", observed=True) / 1e3
    n = t.pivot_table(index=idx, columns=cols, values="notional", aggfunc="sum", observed=True)
    return a, 1e4 * a * 1e3 / n
t["pb"] = pd.cut(t.acq_p, [0, .1, .3, .5, .7, .9, 1.0])
t["tb"] = pd.cut(t.tau, [-130, 0, 60, 120, 180, 240, 270, 300])
t["snipe"] = t.fv_jump_aligned.map({1: "with_jump", 0: "no_jump", -1: "against_jump"})
a, bp = tab("pb", "snipe"); print("maker net $k by acquired price x jump flag\n", a, "\n bp:\n", bp)
a, bp = tab("tb", "snipe"); print("\nmaker net $k by tau x jump flag\n", a, "\n bp:\n", bp)
t["sz"] = pd.cut(t.notional, [0, 10, 50, 200, 1e9])
a, bp = tab("sz", "snipe"); print("\nmaker net $k by size x jump flag\n", a, "\n bp:\n", bp)
# daily stability of the main buckets
t["day"] = pd.to_datetime(t.timestamp, unit="s").dt.date
d = t.pivot_table(index="day", columns="snipe", values="maker_net", aggfunc="sum") / 1e3
d["total"] = d.sum(axis=1)
print("\nmaker net by day $k:\n", d.describe().T)
print("days total>0:", (d.total > 0).mean(), " days no_jump>0:", (d.no_jump > 0).mean())
