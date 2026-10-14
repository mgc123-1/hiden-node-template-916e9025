"""Wallet-level attribution and the 'smart money' persistence test.

Input: data/trades/*.parquet from fetch.py (every fill with proxyWallet and role), data/markets.parquet.
Output: per-wallet P&L (gross, fees, est. rebates), maker/taker mix, timing profile, archetype; and the test that
matters for copy-trading: do wallets that were profitable in the first half stay profitable in the second half,
and does following them with a delay still pay after the spread they leave behind?

    python wallets.py --delay 1,2,5,10
"""
import argparse, glob, json
import numpy as np, pandas as pd

FEE, REBATE = 0.07, 0.20


def load(data="data"):
    mk = pd.read_parquet(f"{data}/markets.parquet")
    mk["Y_up"] = mk.outcome_prices.map(lambda s: float(json.loads(s)[0]) if isinstance(s, str) else np.nan)
    t = pd.concat([pd.read_parquet(f) for f in glob.glob(f"{data}/trades/*.parquet")], ignore_index=True)
    t = t.merge(mk[["slug", "Y_up", "start", "tf"]], on=["slug", "start", "tf"], how="inner")
    t = t[t.Y_up.isin([0.0, 1.0])]
    is_up = t.outcome.str.lower().eq("up")
    t["Y_tok"] = np.where(is_up, t.Y_up, 1 - t.Y_up)
    sgn = np.where(t.side.eq("BUY"), 1.0, -1.0)
    t["gross"] = sgn * (t.Y_tok - t.price) * t["size"]
    f = FEE * t.price * (1 - t.price) * t["size"]
    t["fee"] = np.where(t.role.eq("taker"), f, 0.0)
    t["rebate_est"] = np.where(t.role.eq("maker"), REBATE * f, 0.0)
    t["net"] = t.gross - t.fee + t.rebate_est
    t["notional"] = t.price * t["size"]
    t["secs_into"] = t.timestamp - t.start
    t["frac_into"] = t.secs_into / t.tf.map({"5m": 300, "15m": 900, "1h": 3600, "4h": 14400})
    return t


def wallet_table(t):
    g = t.groupby("proxyWallet")
    w = pd.DataFrame({
        "fills": g.size(), "notional": g.notional.sum(), "net": g.net.sum(), "gross": g.gross.sum(),
        "fees": g.fee.sum(), "rebates": g.rebate_est.sum(),
        "maker_share": g.apply(lambda x: np.average(x.role.eq("maker"), weights=x.notional)),
        "markets": g.slug.nunique(), "med_secs_into": g.secs_into.median(),
        "late_share": g.apply(lambda x: np.average(x.frac_into >= 0.8, weights=x.notional)),
        "med_size": g.notional.median(),
    })
    w["roi_bp"] = 1e4 * w.net / w.notional
    w["archetype"] = np.select(
        [w.maker_share > 0.8, (w.maker_share < 0.2) & (w.late_share > 0.5), (w.maker_share < 0.2) & (w.med_size > 200)],
        ["market_maker", "late_sniper", "large_taker"], "mixed/retail")
    return w.sort_values("net", ascending=False)


def persistence(t, min_fills=200):
    mid = t.timestamp.quantile(0.5)
    a = wallet_table(t[t.timestamp < mid]); b = wallet_table(t[t.timestamp >= mid])
    j = a[a.fills >= min_fills][["net", "roi_bp", "archetype"]].join(b[["net", "roi_bp"]], rsuffix="_2", how="inner")
    j["q"] = pd.qcut(j.roi_bp.rank(method="first"), 10, labels=False)
    return j.groupby("q").agg(n=("net", "size"), roi_1=("roi_bp", "median"), roi_2=("roi_bp_2", "median"),
                              net_2=("net_2", "sum"), share_pos_2=("net_2", lambda x: (x > 0).mean()))


def copy_test(t, leaders, delays):
    """Enter the leader's taker trades `d` seconds later at the next taker price seen in that token (proxy for the
    ask/bid then), pay the taker fee, hold to resolution."""
    tk = t[t.role.eq("taker")].sort_values("timestamp")
    out = []
    for d in delays:
        lead = tk[tk.proxyWallet.isin(leaders)]
        nxt = pd.merge_asof(lead.assign(ts2=lead.timestamp + d).sort_values("ts2"),
                            tk[["timestamp", "asset", "side", "price"]].rename(columns={"timestamp": "ts2", "price": "p2"}).sort_values("ts2"),
                            on="ts2", by=["asset", "side"], direction="forward")
        nxt = nxt.dropna(subset=["p2"])
        sgn = np.where(nxt.side.eq("BUY"), 1.0, -1.0)
        pnl = sgn * (nxt.Y_tok - nxt.p2) - FEE * nxt.p2 * (1 - nxt.p2)
        out.append(dict(delay=d, trades=len(nxt), pnl_per_share=pnl.mean(), t=pnl.mean() / pnl.std() * np.sqrt(len(pnl))))
    return pd.DataFrame(out)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--delay", default="1,2,5,10"); ap.add_argument("--data", default="data")
    a = ap.parse_args()
    t = load(a.data)
    w = wallet_table(t); w.to_csv("wallets.csv")
    print(w.groupby("archetype")[["fills", "notional", "net", "fees", "rebates"]].sum())
    print(w.head(30))
    print(persistence(t))
    top = w[(w.fills >= 200) & (w.maker_share < 0.5)].head(20).index
    print(copy_test(t, set(top), [int(x) for x in a.delay.split(",")]))
