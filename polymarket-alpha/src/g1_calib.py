"""Aug 6-18 books: infer outcomes, then calibration / favourite-longshot by asset x timeframe x time left."""
import numpy as np, pandas as pd
g = pd.read_parquet("/home/user/data/books_aug.parquet")
g = g[g.ok == 1].copy()
g["W"] = g.window_end - g.window_start
g["left"] = g.window_end - g.ts_ms / 1000
g["mid"] = (g.up_bid + g.up_ask) / 2
g["spread"] = g.up_ask - g.up_bid
# outcome: last snapshot in the final 3 seconds must be decisive
last = g[(g.left > -1) & (g.left < 3)].sort_values("ts_ms").groupby(["asset", "window_label", "window_start"]).tail(1)
last = last.assign(Y=np.where(last.mid >= 0.9, 1, np.where(last.mid <= 0.1, 0, -1)))
print("decisive outcome share:", (last.Y >= 0).mean(), " n windows", len(last))
out = last[last.Y >= 0][["asset", "window_label", "window_start", "Y"]]
out.to_parquet("/home/user/data/outcomes_aug.parquet")
print(out.groupby(["asset", "window_label"]).Y.agg(["mean", "size"]))
g = g.merge(out, on=["asset", "window_label", "window_start"])
g["frac"] = 1 - g.left / g.W
g.to_parquet("/home/user/data/books_aug_y.parquet")
# calibration of mid by fraction of window elapsed
pd.set_option("display.width", 250); pd.set_option("display.float_format", lambda x: f"{x:,.3f}")
g["pb"] = pd.cut(g.mid, [0, .05, .15, .3, .45, .55, .7, .85, .95, 1])
g["fb"] = pd.cut(g.frac, [0, .2, .5, .8, .95, 1.0])
c = g.groupby(["asset", "window_label", "fb", "pb"], observed=True).agg(mid=("mid", "mean"), y=("Y", "mean"), n=("Y", "size"), spread=("spread", "mean"))
c["y-mid"] = c.y - c.mid
print(c.unstack("pb")["y-mid"].to_string())
print("\nmean spread (Up token) by asset x tf x fraction:")
print(g.groupby(["asset", "window_label", "fb"], observed=True).spread.mean().unstack("fb"))
print("\nmedian top-of-book ask size (shares):")
print(g.groupby(["asset", "window_label", "fb"], observed=True).up_ask_sz.median().unstack("fb"))
