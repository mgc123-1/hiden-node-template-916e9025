"""Shared loaders and helpers for the Polymarket crypto Up/Down research."""
import glob
import json
import gzip
import numpy as np
import pandas as pd

DATA = "/home/user/data"
MM = f"{DATA}/raw_mm/data"
OT = f"{DATA}/raw_ot/polymarket-data-samples/data"
FEE_RATE = 0.07      # taker fee per share = FEE_RATE * p * (1 - p)
REBATE_RATE = 0.20   # share of taker fees paid back to makers


def fee(p):
    return FEE_RATE * p * (1.0 - p)


def load_markets_5m():
    m = pd.read_parquet(f"{MM}/markets.parquet")
    m["up"] = (m["outcome_up"].astype(str) == "1").astype(np.int8)
    return m[["start", "condition_id", "up", "fee_rate", "rebate_rate"]].sort_values("start").reset_index(drop=True)


def load_trades_5m():
    """Data-API taker trades, mapped into Up space.

    pu    : price of the Up token implied by the trade
    dir   : +1 if the taker bought Up exposure (buy Up / sell Down), -1 otherwise
    tok_p : price of the token actually traded (fee basis)
    """
    t = pd.read_parquet(f"{MM}/trades.parquet")
    is_up = (t["outcome"].astype(str) == "Up").to_numpy()
    buy = (t["side"].astype(str) == "BUY").to_numpy()
    p = t["price"].to_numpy()
    t["pu"] = np.where(is_up, p, 1.0 - p)
    t["dir"] = np.where(is_up == buy, 1, -1).astype(np.int8)
    t["tok_up"] = is_up
    t["buy"] = buy
    t["notional"] = p * t["size"].to_numpy()
    t["sec"] = (t["timestamp"] - t["start"]).astype(np.int32)
    return t


def load_spot_btc():
    files = sorted(glob.glob(f"{MM}/spot/*.parquet"))
    s = pd.concat([pd.read_parquet(f) for f in files], ignore_index=True)
    s = s.drop_duplicates("ts").sort_values("ts").reset_index(drop=True)
    return s


def spot_array(s):
    """Dense 1-second array of closes from t0, forward-filled."""
    t0 = int(s.ts.iloc[0])
    n = int(s.ts.iloc[-1]) - t0 + 1
    arr = np.full(n, np.nan)
    arr[s.ts.to_numpy() - t0] = s.close.to_numpy()
    arr = pd.Series(arr).ffill().to_numpy()
    return t0, arr


def read_jsonl_gz(path):
    with gzip.open(path, "rt") as f:
        for line in f:
            yield json.loads(line)
