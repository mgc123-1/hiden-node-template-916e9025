"""Does recent BTC spot movement (known before the open) predict the next 5m window's outcome? (Sep 5 - Oct 4)"""
import numpy as np, pandas as pd
from common import *
m = load_markets_5m(); s = load_spot_btc(); t0, px = spot_array(s)
S = m.start.to_numpy(); Y = m.up.to_numpy()
rows = []
for lead in [120, 60, 30, 0]:                 # decision time = S - lead
    for k in [30, 60, 180, 300, 900, 1800, 3600]:
        a = S - lead - t0
        ok = (a - k >= 0)
        r = np.log(px[a[ok]] / px[a[ok] - k]); y = Y[ok]
        sg = np.sign(r)
        p_up_given_up = y[sg > 0].mean(); p_up_given_dn = y[sg < 0].mean()
        se = np.sqrt(.25 / (sg > 0).sum() + .25 / (sg < 0).sum())
        q = np.abs(r) > np.quantile(np.abs(r), 0.8)
        hit_big = ((sg > 0) == (y == 1))[q].mean()
        half = len(y) // 2
        d1 = y[:half][sg[:half] > 0].mean() - y[:half][sg[:half] < 0].mean()
        d2 = y[half:][sg[half:] > 0].mean() - y[half:][sg[half:] < 0].mean()
        rows.append(dict(lead=lead, k=k, diff=p_up_given_up - p_up_given_dn, z=(p_up_given_up - p_up_given_dn) / se,
                         hit_top20=hit_big, diff_h1=d1, diff_h2=d2))
pd.set_option("display.float_format", lambda x: f"{x:,.4f}"); pd.set_option("display.width", 200)
print(pd.DataFrame(rows).to_string())
