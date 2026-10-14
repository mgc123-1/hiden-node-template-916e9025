"""TWAP-aware fair value for Polymarket Up/Down windows.

Settlement: Up  <=>  mean(X[E-59..E]) >= mean(X[S-59..S])  (Chainlink TWAP60, proxied by Binance 1s).
Write D = sum_s w_s X_s with w = +1/60 on the close window and -1/60 on the open window.
With X a driftless random walk of per-second sd sigma, conditional on information up to second t:
    mean_t = sum_{s<=t} w_s X_s + T_{t+1} X_t,     T_u = sum_{s>=u} w_s
    var_t  = sigma^2 * sum_{u>t} T_u^2
    P(Up)  = Phi(mean_t / sqrt(var_t))
"""
import numpy as np
from scipy.special import ndtr


def window_weights(S, E, n=60):
    s = np.arange(S - n + 1, E + 1)
    w = np.zeros(len(s))
    w[s >= E - n + 1] += 1.0 / n
    w[s <= S] -= 1.0 / n
    return s, w


def fv_path(px, t0, S, E, sigma, taus, n=60, tail="normal", nu=4.0):
    """Fair P(Up) at absolute seconds S+tau for tau in taus, using spot info up to that second.

    px: dense 1s price array starting at t0; sigma: per-second price sd ($).
    """
    s, w = window_weights(S, E, n)
    X = px[s - t0]
    T = np.cumsum(w[::-1])[::-1]               # T[i] = sum_{j>=i} w_j
    T2tail = np.cumsum((T ** 2)[::-1])[::-1]   # sum_{j>=i} T_j^2
    cumwx = np.cumsum(w * X)
    out = np.empty(len(taus))
    for k, tau in enumerate(taus):
        t = S + tau
        if t < s[0]:
            i = -1
            mean = T[0] * px[t - t0]          # T[0] == 0, so mean == 0
            var = sigma ** 2 * (T2tail[0] + 0.0)
            # extra variance for steps between t and s[0] has coefficient T[0]==0 -> nothing
        elif t >= s[-1]:
            out[k] = 1.0 if cumwx[-1] >= 0 else 0.0
            continue
        else:
            i = t - s[0]
            mean = cumwx[i] + T[i + 1] * X[i]
            var = sigma ** 2 * T2tail[i + 1]
        z = mean / np.sqrt(var) if var > 0 else np.sign(mean) * 50
        out[k] = ndtr(z) if tail == "normal" else student_cdf(z, nu)
    return out


def student_cdf(z, nu):
    from scipy.stats import t as st
    # unit-variance Student-t
    return st.cdf(z * np.sqrt(nu / (nu - 2)), nu)
