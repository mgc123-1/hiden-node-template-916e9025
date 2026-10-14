"""Fetch Polymarket crypto Up/Down markets, every fill (maker + taker, with wallets) and Binance 1s klines.

Needs outbound access to gamma-api.polymarket.com, data-api.polymarket.com and data.binance.vision
(blocked in the research container; allow them under the environment's network settings).

    python fetch.py markets --assets btc,eth,sol,xrp,doge,bnb,hype,link --tf 5m,15m,4h --days 35
    python fetch.py trades  --assets btc,eth --tf 5m,15m
    python fetch.py spot    --assets btc,eth,sol,xrp,doge,bnb,hype,link --days 35
"""
import argparse, io, json, os, time, zipfile, datetime as dt
import pandas as pd, requests

GAMMA = "https://gamma-api.polymarket.com"
DATA = "https://data-api.polymarket.com"
BINANCE = "https://data.binance.vision/data/spot/daily/klines"
OUT = os.environ.get("PM_DATA", "data")
TF_SEC = {"5m": 300, "15m": 900, "4h": 14400}
SESSION = requests.Session()


def get(url, params=None, tries=5):
    for i in range(tries):
        r = SESSION.get(url, params=params, timeout=30)
        if r.status_code == 200:
            return r
        if r.status_code in (429, 500, 502, 503, 504):
            time.sleep(2 ** i)
            continue
        r.raise_for_status()
    r.raise_for_status()


def fetch_markets(assets, tfs, days):
    """Epoch-slug series ({asset}-updown-{tf}-{start}); one row per window with tokens, strike, outcome, fees."""
    now = int(time.time())
    rows = []
    for a in assets:
        for tf in tfs:
            step = TF_SEC[tf]
            start = now - days * 86400
            for s in range(start - start % step, now - step, step):
                slug = f"{a}-updown-{tf}-{s}"
                r = SESSION.get(f"{GAMMA}/events/slug/{slug}", timeout=30)
                if r.status_code != 200:
                    continue
                m = r.json()["markets"][0]
                up_id, dn_id = json.loads(m["clobTokenIds"])
                rows.append(dict(asset=a, tf=tf, start=s, slug=slug, condition_id=m["conditionId"], up_id=up_id, dn_id=dn_id,
                                 outcome_prices=m.get("outcomePrices"), closed=m.get("closed"),
                                 fee_schedule=json.dumps(m.get("feeSchedule")), description=m.get("description", "")[:400],
                                 volume=float(m.get("volumeNum") or 0)))
            print(a, tf, len(rows), flush=True)
    df = pd.DataFrame(rows)
    os.makedirs(OUT, exist_ok=True)
    df.to_parquet(f"{OUT}/markets.parquet")
    return df


def fetch_trades_for(condition_id, taker_only):
    """All fills of one market. takerOnly=False also returns the maker side of each fill."""
    out, offset = [], 0
    while True:
        r = get(f"{DATA}/trades", dict(market=condition_id, limit=500, offset=offset, takerOnly=str(taker_only).lower()))
        batch = r.json()
        out += batch
        if len(batch) < 500:
            return out
        offset += 500


def fetch_trades(assets, tfs):
    mk = pd.read_parquet(f"{OUT}/markets.parquet")
    mk = mk[mk.asset.isin(assets) & mk.tf.isin(tfs)]
    os.makedirs(f"{OUT}/trades", exist_ok=True)
    for r in mk.itertuples():
        path = f"{OUT}/trades/{r.slug}.parquet"
        if os.path.exists(path):
            continue
        taker = pd.DataFrame(fetch_trades_for(r.condition_id, True)).assign(role="taker")
        every = pd.DataFrame(fetch_trades_for(r.condition_id, False))
        if len(every):
            key = ["transactionHash", "proxyWallet", "asset", "price", "size"]
            every = every.merge(taker[key].assign(_t=1), on=key, how="left")
            every["role"] = every.pop("_t").map({1: "taker"}).fillna("maker")
        df = every if len(every) else taker
        df.assign(slug=r.slug, start=r.start, asset_sym=r.asset, tf=r.tf).to_parquet(path)


def fetch_spot(assets, days):
    os.makedirs(f"{OUT}/spot", exist_ok=True)
    today = dt.date.today()
    for a in assets:
        sym = f"{a.upper()}USDT"
        for k in range(days, 0, -1):
            d = today - dt.timedelta(days=k)
            path = f"{OUT}/spot/{sym}-{d}.parquet"
            if os.path.exists(path):
                continue
            r = SESSION.get(f"{BINANCE}/{sym}/1s/{sym}-1s-{d}.zip", timeout=60)
            if r.status_code != 200:
                print("missing", sym, d); continue
            z = zipfile.ZipFile(io.BytesIO(r.content))
            k_ = pd.read_csv(z.open(z.namelist()[0]), header=None)
            ts = k_[0] // (1_000_000 if k_[0].iloc[0] > 1e14 else 1000)     # microseconds from 2025 on
            pd.DataFrame({"ts": ts, "close": k_[4], "taker_buy_base": k_[9], "volume": k_[5]}).to_parquet(path)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("what", choices=["markets", "trades", "spot"])
    ap.add_argument("--assets", default="btc,eth,sol,xrp,doge,bnb,hype,link")
    ap.add_argument("--tf", default="5m,15m")
    ap.add_argument("--days", type=int, default=35)
    a = ap.parse_args()
    assets, tfs = a.assets.split(","), a.tf.split(",")
    {"markets": lambda: fetch_markets(assets, tfs, a.days), "trades": lambda: fetch_trades(assets, tfs),
     "spot": lambda: fetch_spot(assets, a.days)}[a.what]()
