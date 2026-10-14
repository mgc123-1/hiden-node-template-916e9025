"""Lead-lag between the four simultaneously-polled books (BTC/ETH x 5m/15m), 1s grid, probit-mid space."""
import numpy as np, pandas as pd
from scipy.special import ndtri
g = pd.read_parquet("/home/user/data/books_aug_y.parquet")
g = g[(g.up_ask > g.up_bid)]
g["sec"] = (g.ts_ms // 1000).astype(np.int64)
g["z"] = ndtri(np.clip((g.up_bid + g.up_ask) / 2, 0.02, 0.98))
g["key"] = g.asset + g.window_label
piv = g.pivot_table(index="sec", columns="key", values="z", aggfunc="last")
# also keep the window id to avoid differencing across windows
wid = g.pivot_table(index="sec", columns="key", values="window_start", aggfunc="last")
full = pd.RangeIndex(piv.index.min(), piv.index.max() + 1)
piv = piv.reindex(full); wid = wid.reindex(full)
dz = piv.diff().where(wid.diff() == 0)
print("non-null 1s changes:", dz.notna().sum().to_dict())
def xcorr(a, b, ks=range(-5, 6)):
    out = {}
    for k in ks:
        x = pd.concat([dz[a], dz[b].shift(-k)], axis=1).dropna()
        out[k] = np.corrcoef(x.iloc[:, 0], x.iloc[:, 1])[0, 1]
    return out
pd.set_option("display.float_format", lambda x: f"{x:,.3f}"); pd.set_option("display.width", 200)
pairs = [("BTC5m", "ETH5m"), ("BTC15m", "ETH15m"), ("BTC5m", "BTC15m"), ("ETH5m", "ETH15m")]
print("corr( d[A](t), d[B](t+k) ): positive k = A leads B")
print(pd.DataFrame({f"{a}->{b}": xcorr(a, b) for a, b in pairs}).T)
# predictive regression: future 3s change of B on past 3s change of A and of B
for a, b in pairs + [(y, x) for x, y in pairs]:
    pa = piv[a].diff(3).where(wid[a].diff(3) == 0); pb = piv[b].diff(3).where(wid[b].diff(3) == 0)
    fb = (piv[b].shift(-3) - piv[b]).where(wid[b].shift(-3) == wid[b])
    X = pd.concat([pa, pb, fb], axis=1, keys=["a", "b", "f"]).dropna()
    A = np.c_[np.ones(len(X)), X.a, X.b]
    beta, *_ = np.linalg.lstsq(A, X.f, rcond=None)
    res = X.f - A @ beta
    se = np.sqrt(np.diag(np.linalg.inv(A.T @ A)) * res.var())
    print(f"future 3s d{b} ~ past 3s d{a}: beta_a={beta[1]:+.3f} (t {beta[1]/se[1]:+.1f})  own beta_b={beta[2]:+.3f} (t {beta[2]/se[2]:+.1f})  n={len(X)}")
