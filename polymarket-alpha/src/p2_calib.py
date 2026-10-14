"""Calibrated fair value: P = T_nu( M / (k * sqrt(sig^2 V + (sp*spot)^2)) ), per tau bucket (k, nu).
Fitted on the first half of the sample, tested on the second."""
import numpy as np
from scipy.stats import t as st
from scipy.optimize import minimize

P = np.load("/home/user/data/panel_btc5m.npz")
M, V, sig, up, taus, spot = P["M"], P["V"], P["sig"], P["up"], P["taus"], P["spot"]
n = len(up); half = n // 2
EDGES = [-120, 0, 30, 60, 120, 180, 220, 240, 260, 275, 285, 292, 301]
SP_BP = 0.55
Z = M / np.sqrt(sig[:, None] ** 2 * V + (SP_BP * 1e-4 * spot) ** 2)

def p_of(z, k, nu):
    return np.clip(st.cdf(z / k, nu), 1e-5, 1 - 1e-5)

params = {}
fv = np.full(Z.shape, np.nan, dtype=np.float32)
print("bucket      k     nu   trainLL  testLL  testLL(normal,k=1)")
for b in range(len(EDGES) - 1):
    c = (taus >= EDGES[b]) & (taus < EDGES[b + 1])
    ztr = Z[:half][:, c]; ytr = np.broadcast_to(up[:half, None], ztr.shape)
    zte = Z[half:][:, c]; yte = np.broadcast_to(up[half:, None], zte.shape)
    def ll(x, z, y):
        p = p_of(z, np.exp(x[0]), 2.05 + np.exp(x[1]))
        return -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))
    r = minimize(ll, [0.0, 1.0], args=(ztr, ytr), method="Nelder-Mead")
    k, nu = np.exp(r.x[0]), 2.05 + np.exp(r.x[1])
    params[EDGES[b]] = (k, nu)
    fv[:, c] = p_of(Z[:, c], k, nu)
    print(f"{EDGES[b]:4d}-{EDGES[b+1]:4d} {k:6.3f} {nu:6.2f}  {r.fun:.4f}  {ll(r.x, zte, yte):.4f}  {ll([0.0, 10.0], zte, yte):.4f}")
te = slice(half, n)
for lo, hi in [(0, 60), (60, 180), (180, 240), (240, 285), (285, 300)]:
    c = (taus >= lo) & (taus < hi)
    p = fv[te][:, c].ravel(); yy = np.broadcast_to(up[te, None], fv[te][:, c].shape).ravel()
    bins = np.clip((p * 10).astype(int), 0, 9)
    cal = " ".join(f"{p[bins==b].mean():.2f}/{yy[bins==b].mean():.2f}" for b in range(10) if (bins == b).sum() > 200)
    print(f"TEST tau {lo:3d}-{hi:3d} brier {np.mean((p-yy)**2):.4f} | {cal}")
np.save("/home/user/data/fv_btc5m.npy", fv)
np.save("/home/user/data/fv_params.npy", np.array([[e, *params[e]] for e in EDGES[:-1]]))
