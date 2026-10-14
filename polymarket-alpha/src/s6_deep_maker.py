"""Deep resting liquidity anchored on the market's own last print (BTC 5m, 30d tape, Up space).

Anchor a(t) = last Up-space print in seconds <= t-1-L. Resting bid = a - h, ask = a + h (0.01 tick).
A print in second t strictly through our price fills min(Q, size) (deep levels are only reached by sweeps).
Guard: skip when the anchor itself moved > g in the last 3 seconds. Rebates included, held to resolution.
"""
import numpy as np, pandas as pd, itertools
from numba import njit
from common import *
P = np.load("/home/user/data/panel_btc5m.npz"); starts, up = P["start"], P["up"].astype(float)
t = load_trades_5m()
t = t[(t.sec >= -300) & (t.sec < 297)]
row = np.searchsorted(starts, t.start.to_numpy()).astype(np.int64)
o = np.lexsort((t.timestamp.to_numpy(), row))
row = row[o]; sec = t.sec.to_numpy()[o].astype(np.int64); d = t.dir.to_numpy()[o].astype(np.int64)
pu = t.pu.to_numpy()[o]; sz = t["size"].to_numpy()[o]

@njit(cache=True)
def sim(row, sec, d, pu, sz, up, h, L, g, z0, z1, Q, IMAX, nwin):
    pnl = np.zeros(nwin); vol = np.zeros(nwin); nf = np.zeros(nwin)
    last = np.full(700, np.nan)                 # last print per second (index sec+300)
    cur = -1; inv = 0.0
    for i in range(len(row)):
        r = row[i]
        if r != cur:
            cur = r; inv = 0.0; last[:] = np.nan
        s = sec[i]
        # anchor from seconds <= s-1-L
        k = s - 1 - L + 300
        a = np.nan; a3 = np.nan
        j = k
        while j >= 0 and j > k - 30:
            if not np.isnan(last[j]): a = last[j]; break
            j -= 1
        j = k - 3
        while j >= 0 and j > k - 33:
            if not np.isnan(last[j]): a3 = last[j]; break
            j -= 1
        if s >= z0 and s < z1 and not np.isnan(a) and not np.isnan(a3) and abs(a - a3) <= g:
            bid = np.floor((a - h) * 100 + 1e-9) / 100; ask = np.ceil((a + h) * 100 - 1e-9) / 100
            p = pu[i]; q = 0.0; sgn = 0.0; px = 0.0
            if d[i] < 0 and bid >= 0.01 and p < bid - 1e-9: q = min(Q, sz[i]); sgn = 1.0; px = bid
            elif d[i] > 0 and ask <= 0.99 and p > ask + 1e-9: q = min(Q, sz[i]); sgn = -1.0; px = ask
            if q > 0:
                new = inv + sgn * q
                if abs(new) > IMAX and abs(new) > abs(inv):
                    q = max(0.0, IMAX - abs(inv)); new = inv + sgn * q
                if q > 0:
                    inv = new
                    pnl[r] += sgn * (up[r] - px) * q + 0.2 * 0.07 * px * (1 - px) * q
                    vol[r] += px * q; nf[r] += 1
        last[s + 300] = pu[i]
    return pnl, vol, nf

nwin = len(starts); half = nwin // 2; rows = []
for h, L, g, (z0, z1) in itertools.product([0.03, 0.05, 0.08, 0.12], [1, 2, 3], [0.02, 0.05, 1.0],
                                           [(-300, -60), (0, 120), (120, 240), (240, 297), (0, 297)]):
    pnl, vol, nf = sim(row, sec, d, pu, sz, up, h, L, g, z0, z1, 20.0, 200.0, nwin)
    rec = dict(h=h, L=L, guard=g, zone=f"{z0}..{z1}")
    for nm, sl in [("tr", slice(0, half)), ("te", slice(half, nwin))]:
        x = pnl[sl]
        rec[f"{nm}_$"] = x.sum(); rec[f"{nm}_fills"] = nf[sl].sum(); rec[f"{nm}_bp"] = 1e4 * x.sum() / max(vol[sl].sum(), 1)
        rec[f"{nm}_t"] = x.mean() / (x.std() + 1e-12) * np.sqrt(len(x))
    rows.append(rec)
R = pd.DataFrame(rows); R.to_csv("../out/s6_deep_maker.csv", index=False)
pd.set_option("display.width", 250); pd.set_option("display.max_rows", 300); pd.set_option("display.float_format", lambda x: f"{x:,.2f}")
print("share of configs with test $>0:", (R["te_$"] > 0).mean())
print(R.sort_values("tr_t", ascending=False).head(25).to_string(index=False))
print(R.groupby("zone")[["tr_$", "te_$"]].median())
