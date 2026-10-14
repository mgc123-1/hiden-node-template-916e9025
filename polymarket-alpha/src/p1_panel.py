"""Per-second TWAP-aware state for every BTC 5m window (Sep 5 - Oct 4).

Stores mean_t (expected close-TWAP minus open-TWAP, $) and v_t (variance per unit sigma^2),
so the probability model can be recalibrated without rebuilding the panel.
"""
import numpy as np, pandas as pd
from common import *
from fv import window_weights

m = load_markets_5m()
s = load_spot_btc(); t0, px = spot_array(s)
lr = np.concatenate([[0], np.diff(np.log(px))])
TAUS = np.arange(-120, 301)
M = np.full((len(m), len(TAUS)), np.nan); V = np.full_like(M, np.nan)
sig = np.zeros(len(m)); spot = np.full_like(M, np.nan); dtw = np.zeros(len(m))
for i, S in enumerate(m.start.to_numpy()):
    E = S + 300; a = S - t0
    if a - 1920 < 0 or E - t0 >= len(px):
        continue
    r = lr[a - 1920: a - 120]
    sig[i] = np.sqrt(np.mean(r ** 2)) * px[a - 120]
    sv, w = window_weights(S, E)
    X = px[sv - t0]
    T = np.cumsum(w[::-1])[::-1]
    T2 = np.concatenate([np.cumsum((T ** 2)[::-1])[::-1], [0.0]])
    T = np.concatenate([T, [0.0]])
    cw = np.cumsum(w * X)
    t = S + TAUS
    idx = t - sv[0]
    pre = idx < 0
    ii = np.clip(idx, 0, len(sv) - 1)
    M[i] = np.where(pre, 0.0, cw[ii] + T[ii + 1] * X[ii])
    V[i] = np.where(pre, T2[0], T2[ii + 1])
    spot[i] = px[t - t0]
    dtw[i] = cw[-1]
np.savez_compressed("/home/user/data/panel_btc5m.npz", start=m.start.to_numpy(), up=m.up.to_numpy(),
                    taus=TAUS, M=M, V=V, sig=sig, spot=spot, dtw=dtw, t0=t0)
up = m.up.to_numpy()
print("Binance-proxy outcome match vs official:", np.mean((dtw >= 0).astype(int) == up))
