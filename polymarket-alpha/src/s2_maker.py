"""Maker simulation on BTC 5m (30d tape, Up space), numba event loop.

Quote each second: bid = FV(t-1-L) - h, ask = FV(t-1-L) + h on a 0.01 tick (pre-open, tau<-60: FV = 0.5).
Fills: 'through' = print strictly through our price; 'at' = at-or-through, at-price prints give us a
queue share phi. Q shares per print max, |inventory| <= IMAX, inventory held to resolution.
Rebate = 20% of the taker fee on our filled shares. Optional guard: no quotes if |FV(t) - FV(t-3)| >= mvcap.
"""
import numpy as np, pandas as pd, itertools
from numba import njit
from common import *

P = np.load("/home/user/data/panel_btc5m.npz"); fv = np.load("/home/user/data/fv_btc5m.npy").astype(np.float64)
starts, up, taus = P["start"], P["up"].astype(np.float64), P["taus"]
t = load_trades_5m()
m_all = (t.sec - 2).to_numpy()
keep = (m_all >= -600) & (m_all < 295)
t = t[keep]
row = np.searchsorted(starts, t.start.to_numpy()).astype(np.int64)
order = np.lexsort((t.timestamp.to_numpy(), row))
row = row[order]; m = m_all[keep][order].astype(np.int64)
d = t.dir.to_numpy()[order].astype(np.int64); pu = t.pu.to_numpy()[order]; sz = t["size"].to_numpy()[order]
T0 = int(taus[0]); NT = len(taus)

@njit(cache=True)
def sim(row, m, d, pu, sz, fv, up, T0, NT, h, L, at_rule, phi, z0, z1, mvcap, Q, IMAX, nwin):
    pnl = np.zeros(nwin); vol = np.zeros(nwin); nf = np.zeros(nwin)
    inv = 0.0; cur = -1
    for i in range(len(row)):
        r = row[i]
        if r != cur:
            cur = r; inv = 0.0
        mi = m[i]
        if mi < z0 or mi >= z1:
            continue
        if mi < -60:
            f = 0.5; fp = 0.5
        else:
            k = mi - 1 - L - T0
            if k < 0: k = 0
            if k > NT - 1: k = NT - 1
            k3 = k - 3
            if k3 < 0: k3 = 0
            f = fv[r, k]; fp = fv[r, k3]
        if abs(f - fp) >= mvcap:
            continue
        bid = np.floor((f - h) * 100 + 1e-9) / 100
        ask = np.ceil((f + h) * 100 - 1e-9) / 100
        if bid < 0.01 or ask > 0.99:
            continue
        p = pu[i]; q = 0.0; sgn = 0.0; px = 0.0
        if d[i] < 0:                       # taker sells Up -> may hit our bid
            if p < bid - 1e-9: q = min(Q, sz[i])
            elif at_rule and p < bid + 1e-9: q = min(Q, phi * sz[i])
            sgn = 1.0; px = bid
        else:                              # taker buys Up -> may lift our ask
            if p > ask + 1e-9: q = min(Q, sz[i])
            elif at_rule and p > ask - 1e-9: q = min(Q, phi * sz[i])
            sgn = -1.0; px = ask
        if q <= 0: continue
        new = inv + sgn * q
        if abs(new) > IMAX:
            q = max(0.0, IMAX - abs(inv)) if abs(new) > abs(inv) else q
            new = inv + sgn * q
        if q <= 0: continue
        inv = new
        pnl[r] += sgn * (up[r] - px) * q + 0.2 * 0.07 * px * (1 - px) * q
        vol[r] += px * q; nf[r] += 1
    return pnl, vol, nf

nwin = len(starts); half = nwin // 2
zones = {"pre(-10m..-60s)": (-600, -60), "lastmin(-60..0)": (-60, 0), "early(0..60)": (0, 60), "mid(60..180)": (60, 180),
         "late(180..240)": (180, 240), "end(240..295)": (240, 295)}
rows = []
for h, L, (rule, phi), (zn, (z0, z1)), mv in itertools.product([0.01, 0.02, 0.03, 0.05], [0, 1, 2],
        [("through", 0.0), ("at", 0.1), ("at", 0.3)], zones.items(), [0.02, 9.0]):
    if z1 <= -60 and (L > 0 or mv < 1): continue        # pre-open quotes are static; L/mv irrelevant
    pnl, vol, nf = sim(row, m, d, pu, sz, fv, up, T0, len(taus), h, L, rule == "at", phi, z0, z1, mv, 20.0, 100.0, nwin)
    rec = dict(h=h, L=L, rule=f"{rule}{phi if rule=='at' else ''}", zone=zn, mvcap=mv)
    for nm, sl in [("tr", slice(0, half)), ("te", slice(half, nwin))]:
        x = pnl[sl]
        rec[f"{nm}_$"] = x.sum(); rec[f"{nm}_fills"] = nf[sl].sum(); rec[f"{nm}_bp"] = 1e4 * x.sum() / max(vol[sl].sum(), 1)
        rec[f"{nm}_t"] = x.mean() / (x.std() + 1e-12) * np.sqrt(len(x))
    rows.append(rec)
R = pd.DataFrame(rows); R.to_csv("../out/s2_maker.csv", index=False)
pd.set_option("display.width", 250); pd.set_option("display.max_rows", 500); pd.set_option("display.float_format", lambda x: f"{x:,.1f}")
for zn in zones:
    z = R[R.zone == zn].sort_values("tr_t", ascending=False)
    print(f"\n=== {zn}: best 6 by train t  | share of configs with test>0: {(z['te_$'] > 0).mean():.2f}")
    print(z.head(6).to_string(index=False))
