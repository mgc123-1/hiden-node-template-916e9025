"""Queue-aware maker simulation on the Sep 8 BTC 5m full order book (Up-token space).

The strategy JOINS the current best bid / best ask (never improves it) with Q shares, at the back of the queue.
Queue ahead shrinks with trades at our price; with 'prorata' cancels it also shrinks pro-rata to level-size
drops not explained by trades ('back' = cancels never help us). Trades through our price fill us fully.
Decisions every second at s*1000 + L_ms using Binance info through second s-1 (TWAP-aware FV, calibrated).
Quote a side only if FV is at least `margin` beyond our price (edge at fill) and tau is inside the zone;
otherwise cancel. Inventory held to resolution; rebate = 20% of taker fee on our fills.
"""
import numpy as np, pandas as pd, itertools, collections
from common import *

P = np.load("/home/user/data/panel_btc5m.npz"); fv = np.load("/home/user/data/fv_btc5m.npy").astype(float)
rowof = {int(v): i for i, v in enumerate(P["start"])}; taus = P["taus"]; upv = P["up"]
mk = pd.DataFrame(list(read_jsonl_gz(glob.glob(f"{OT}/polymarket/daily/markets/BTC-5m/*.gz")[0])))
mk = mk[mk.resolved == True]
UP = dict(zip(mk.token_ids.str[0], mk.start_sec)); DN = dict(zip(mk.token_ids.str[1], mk.start_sec))
ev = collections.defaultdict(list)   # start -> list of (ms, kind, data)
for x in read_jsonl_gz(glob.glob(f"{OT}/polymarket/daily/book/BTC-5m/*.gz")[0]):
    s = UP.get(x["asset_id"])
    if s is None: continue
    p = x["payload"]
    ev[s].append((x["event_ts_ms"], 0, ({float(l["price"]): float(l["size"]) for l in p["bids"]},
                                        {float(l["price"]): float(l["size"]) for l in p["asks"]})))
for x in read_jsonl_gz(glob.glob(f"{OT}/polymarket/daily/price_change/BTC-5m/*.gz")[0]):
    for c in x["payload"]["price_changes"]:
        s = UP.get(c["asset_id"])
        if s is None: continue
        ev[s].append((x["event_ts_ms"], 1, (c["side"] == "BUY", float(c["price"]), float(c["size"]))))
for x in read_jsonl_gz(glob.glob(f"{OT}/polymarket/daily/last_trade_price/BTC-5m/*.gz")[0]):
    p = x["payload"]; a = x["asset_id"]
    if a in UP: s, pu, taker_buys_up = UP[a], float(p["price"]), p["side"] == "BUY"
    elif a in DN: s, pu, taker_buys_up = DN[a], 1 - float(p["price"]), p["side"] != "BUY"
    else: continue
    ev[s].append((int(p["timestamp"]), 2, (taker_buys_up, round(pu, 4), float(p["size"]))))
print("markets with events:", len(ev))

def run(L_ms, margin, zone, cancel_mode, Q=20.0, IMAX=200.0):
    tot = collections.defaultdict(float); per_w = []
    for S, E0 in ev.items():
        if S not in rowof: continue
        r = rowof[S]; Y = float(upv[r])
        E = sorted(E0, key=lambda z: (z[0], z[1]))
        dec = [(1000 * (S + tau) + L_ms, 3, tau) for tau in range(zone[0], zone[1])]
        E = sorted(E + dec, key=lambda z: (z[0], z[1]))
        bids, asks = {}, {}
        myb = mya = None            # [price, queue_ahead, remaining]
        inv = 0.0; pnl = 0.0; vol = 0.0
        def fill(px, q, sgn):
            nonlocal inv, pnl, vol
            q = min(q, IMAX - sgn * inv) if sgn * inv + q > IMAX else q
            if q <= 0: return 0.0
            inv += sgn * q; pnl += sgn * (Y - px) * q + REBATE_RATE * fee(px) * q; vol += px * q
            return q
        for ms, kind, dat in E:
            if kind == 0:
                bids, asks = dict(dat[0]), dict(dat[1])
            elif kind == 1:
                is_bid, px, size = dat
                book = bids if is_bid else asks
                old = book.get(px, 0.0)
                if size <= 0: book.pop(px, None)
                else: book[px] = size
                mine = myb if is_bid else mya
                if mine is not None and abs(mine[0] - px) < 1e-9 and size < old and cancel_mode == "prorata" and old > 0:
                    mine[1] *= size / old
            elif kind == 2:
                taker_buys_up, pu, size = dat
                if not taker_buys_up and myb is not None:
                    b = myb
                    if pu < b[0] - 1e-9: q = fill(b[0], b[2], +1); b[2] -= q
                    elif abs(pu - b[0]) < 1e-9:
                        use = min(size, b[1]); b[1] -= use; rest = size - use
                        if rest > 0: q = fill(b[0], min(rest, b[2]), +1); b[2] -= q
                    if b[2] <= 1e-9: myb = None
                if taker_buys_up and mya is not None:
                    a = mya
                    if pu > a[0] + 1e-9: q = fill(a[0], a[2], -1); a[2] -= q
                    elif abs(pu - a[0]) < 1e-9:
                        use = min(size, a[1]); a[1] -= use; rest = size - use
                        if rest > 0: q = fill(a[0], min(rest, a[2]), -1); a[2] -= q
                    if a[2] <= 1e-9: mya = None
            else:
                tau = dat
                k = min(max(tau - 1 - taus[0], 0), len(taus) - 1)
                f = 0.5 if tau < -60 else fv[r, k]
                bb = max(bids) if bids else None; ba = min(asks) if asks else None
                # bid side
                want_b = bb is not None and f - bb >= margin and bb >= 0.02
                if myb is not None and (not want_b or abs(myb[0] - bb) > 1e-9): myb = None
                if want_b and myb is None: myb = [bb, bids[bb], Q]
                want_a = ba is not None and ba - f >= margin and ba <= 0.98
                if mya is not None and (not want_a or abs(mya[0] - ba) > 1e-9): mya = None
                if want_a and mya is None: mya = [ba, asks[ba], Q]
        per_w.append((S, pnl, vol))
    w = pd.DataFrame(per_w, columns=["S", "pnl", "vol"])
    x = w.pnl
    return dict(pnl=x.sum(), vol=w.vol.sum(), bp=1e4 * x.sum() / max(w.vol.sum(), 1), t=x.mean() / (x.std() + 1e-9) * np.sqrt(len(x)), n=len(x), wins=(x > 0).mean())

rows = []
for L_ms, margin, zone, cm in itertools.product([200, 1000], [0.0, 0.01, 0.02, 0.04],
        [(-290, -60), (-60, 0), (0, 120), (120, 240), (240, 295), (0, 295)], ["prorata", "back"]):
    res = run(L_ms, margin, zone, cm)
    rows.append(dict(L_ms=L_ms, margin=margin, zone=f"{zone[0]}..{zone[1]}", cancels=cm, **res))
    print(rows[-1], flush=True)
R = pd.DataFrame(rows); R.to_csv("../out/s5_queue_maker.csv", index=False)
