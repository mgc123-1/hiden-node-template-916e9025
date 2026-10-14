"""Pre-open maker with a slow mean-reversion prior (BTC 5m, Sep). Prior fitted on the first half only.
FV_pre = 0.5 + b . [r15, r30, r60]  (log returns ending at S-120).  Quotes bid/ask = FV -/+ h on a 0.01 tick
for match-seconds in [z0, -60). Same fill rules as the in-window maker simulation."""
import numpy as np, pandas as pd, itertools
from numba import njit
from maker_core import *

s = load_spot_btc(); t0, px = spot_array(s)
a = starts - 120 - t0
X = np.c_[[np.log(px[a] / px[a - k]) * 1e4 for k in (900, 1800, 3600)]].T
nwin = len(starts); half = nwin // 2
A = np.c_[np.ones(half), X[:half]]
b, *_ = np.linalg.lstsq(A, up[:half] - 0.5, rcond=None)
prior = np.clip(0.5 + np.c_[np.ones(nwin), X] @ b, 0.3, 0.7)
print("coef (per bp):", np.round(b, 5))
y = up; 
for nm, sl in [("train", slice(0, half)), ("test", slice(half, nwin))]:
    p = prior[sl]; yy = y[sl]
    print(f"{nm}: corr(prior,Y) {np.corrcoef(p, yy)[0,1]:.3f}  Brier prior {np.mean((p-yy)**2):.4f} vs 0.5 {np.mean((0.5-yy)**2):.4f}")

@njit(cache=True)
def sim_pre(row, m, d, pu, sz, prior, up, h, at_rule, phi, z0, Q, IMAX, nwin):
    pnl = np.zeros(nwin); vol = np.zeros(nwin); nf = np.zeros(nwin)
    inv = 0.0; cur = -1
    for i in range(len(row)):
        r = row[i]
        if r != cur: cur = r; inv = 0.0
        if m[i] < z0 or m[i] >= -60: continue
        f = prior[r]
        bid = np.floor((f - h) * 100 + 1e-9) / 100; ask = np.ceil((f + h) * 100 - 1e-9) / 100
        p = pu[i]; q = 0.0
        if d[i] < 0:
            if p < bid - 1e-9: q = min(Q, sz[i])
            elif at_rule and p < bid + 1e-9: q = min(Q, phi * sz[i])
            sgn = 1.0; px_ = bid
        else:
            if p > ask + 1e-9: q = min(Q, sz[i])
            elif at_rule and p > ask - 1e-9: q = min(Q, phi * sz[i])
            sgn = -1.0; px_ = ask
        if q <= 0: continue
        new = inv + sgn * q
        if abs(new) > IMAX and abs(new) > abs(inv):
            q = max(0.0, IMAX - abs(inv)); new = inv + sgn * q
        if q <= 0: continue
        inv = new
        pnl[r] += sgn * (up[r] - px_) * q + 0.2 * 0.07 * px_ * (1 - px_) * q
        vol[r] += px_ * q; nf[r] += 1
    return pnl, vol, nf

rows = []
for pr_name, pr in [("flat0.5", np.full(nwin, 0.5)), ("MRprior", prior)]:
    for h, (rule, phi), z0 in itertools.product([0.005, 0.01, 0.02], [("through", 0.0), ("at", 0.2), ("at", 0.5)], [-600, -300]):
        pnl, vol, nf = sim_pre(row, m, d, pu, sz, pr, up, h, rule == "at", phi, z0, 50.0, 300.0, nwin)
        rec = dict(prior=pr_name, h=h, rule=f"{rule}{phi if rule=='at' else ''}", z0=z0)
        for nm, sl in [("tr", slice(0, half)), ("te", slice(half, nwin))]:
            x = pnl[sl]
            rec[f"{nm}_$"] = x.sum(); rec[f"{nm}_fills"] = nf[sl].sum(); rec[f"{nm}_bp"] = 1e4 * x.sum() / max(vol[sl].sum(), 1)
            rec[f"{nm}_t"] = x.mean() / (x.std() + 1e-12) * np.sqrt(len(x))
        rows.append(rec)
R = pd.DataFrame(rows)
pd.set_option("display.width", 250); pd.set_option("display.float_format", lambda x: f"{x:,.2f}")
print(R.to_string(index=False))
R.to_csv("../out/s4_preopen_mr_maker.csv", index=False)
