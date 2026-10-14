"""Who makes and who loses money: BTC 5m, 30 days of Data-API taker trades."""
import numpy as np, pandas as pd
from common import *

P = np.load("/home/user/data/panel_btc5m.npz"); fv = np.load("/home/user/data/fv_btc5m.npy")
starts, up, taus, spot = P["start"], P["up"], P["taus"], P["spot"]
t = load_trades_5m()
row = np.searchsorted(starts, t.start.to_numpy())
assert (starts[row] == t.start.to_numpy()).all()
LAG = 2
tau = t.sec.to_numpy() - LAG
tau_i = np.clip(tau - taus[0], 0, len(taus) - 1)
inwin = (tau >= taus[0]) & (tau <= taus[-1])
def fv_at(off):
    return fv[row, np.clip(tau_i + off, 0, len(taus) - 1)].astype(float)
Y = up[row].astype(float)
pu = t.pu.to_numpy(); d = t.dir.to_numpy().astype(float); sz = t["size"].to_numpy()
tok_p = t.price.to_numpy()
t["Y"] = Y
t["gross"] = d * (Y - pu) * sz                   # taker P&L before fees
t["fee"] = fee(pu) * sz
t["net"] = t.gross - t.fee
t["edge_fill"] = d * (fv_at(0) - pu) * sz        # taker edge vs fair value at the fill
t["mk5"] = d * (fv_at(5) - pu) * sz
t["mk30"] = d * (fv_at(30) - pu) * sz
# spot momentum over the 5s before the fill, aligned with taker direction
sp = spot[row, np.clip(tau_i, 0, len(taus) - 1)]; sp5 = spot[row, np.clip(tau_i - 5, 0, len(taus) - 1)]
t["mom_aligned"] = np.sign(sp - sp5) * d
dfv = fv_at(0) - fv_at(-3)
t["fv_jump_aligned"] = np.where(np.abs(dfv) > 0.03, np.sign(dfv) * d, 0)
t["inwin"] = inwin
# price of the token the taker acquired (cheap token = longshot)
t["acq_p"] = np.where(d > 0, pu, 1 - pu)
t.to_parquet("/home/user/data/trades_btc5m_enriched.parquet")

def summarize(g):
    n = g.notional.sum()
    return pd.Series({
        "trades": len(g), "notional_$k": n / 1e3,
        "taker_gross_bp": 1e4 * g.gross.sum() / n, "fee_bp": 1e4 * g.fee.sum() / n,
        "taker_net_bp": 1e4 * g.net.sum() / n, "taker_net_$k": g.net.sum() / 1e3,
        "maker_net_$k(incl rebate)": (-g.gross.sum() + REBATE_RATE * g.fee.sum()) / 1e3,
        "edge_fill_bp": 1e4 * g.edge_fill.sum() / n, "mk30_bp": 1e4 * g.mk30.sum() / n})

pd.set_option("display.width", 250); pd.set_option("display.max_columns", 20)
pd.set_option("display.float_format", lambda x: f"{x:,.1f}")
print("== TOTAL"); print(summarize(t).to_frame().T)
print("\n== by trade notional ($)")
print(t.groupby(pd.cut(t.notional, [0, 2, 10, 50, 200, 1000, 5000, 1e9]), observed=True).apply(summarize))
print("\n== by seconds into window (match time)")
print(t.groupby(pd.cut(tau, [-1e9, -60, 0, 30, 60, 120, 180, 240, 270, 285, 295, 300, 1e9]), observed=True).apply(summarize))
print("\n== by price of token acquired by taker")
print(t.groupby(pd.cut(t.acq_p, [0, .03, .1, .2, .35, .5, .65, .8, .9, .97, 1.0]), observed=True).apply(summarize))
print("\n== taker direction vs prior 5s spot move (+1 = chasing, -1 = fading)")
print(t[inwin].groupby("mom_aligned").apply(summarize))
print("\n== taker after FV jump >3c in last 3s (+1 = trades with jump = sniping stale quotes)")
print(t[inwin].groupby("fv_jump_aligned").apply(summarize))
