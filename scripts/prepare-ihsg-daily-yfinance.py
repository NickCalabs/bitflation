#!/usr/bin/env python3
"""
IHSG (Jakarta Composite Index) ^JKSE daily close via yfinance.
Output: src/data/idr-dca/ihsg-daily.json as [{ "date": "YYYY-MM-DD", "price": N }].

Usage: python scripts/prepare-ihsg-daily-yfinance.py
Requires: pip install -r scripts/requirements-data.txt
"""
from pathlib import Path
import json

try:
    import yfinance as yf
except ImportError:
    raise SystemExit(
        "yfinance not installed. Run: pip install -r scripts/requirements-data.txt"
    )

START_DATE = "2015-01-01"
OUT_DIR = Path(__file__).resolve().parent.parent / "src" / "data" / "idr-dca"
OUT_FILE = OUT_DIR / "ihsg-daily.json"
TICKER = "^JKSE"  # Yahoo symbol for IDX Composite (IHSG)


def main():
    print("Fetching IHSG (^JKSE) daily data via yfinance...")
    ticker = yf.Ticker(TICKER)
    # period="max" or start/end; use start/end for consistency with other scripts
    hist = ticker.history(start=START_DATE, end=None, interval="1d", auto_adjust=True)
    if hist is None or hist.empty:
        raise SystemExit("No history returned for ^JKSE")
    # Close column; index is timezone-aware DatetimeIndex
    hist = hist.loc[hist["Close"].notna() & (hist["Close"] > 0)]
    hist.index = hist.index.tz_localize(None) if hist.index.tz else hist.index
    entries = [
        {"date": d.strftime("%Y-%m-%d"), "price": int(round(float(close)))}
        for d, close in hist["Close"].items()
    ]
    entries.sort(key=lambda x: x["date"])
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(entries), encoding="utf-8")
    n = len(entries)
    print(f"  Got {n} daily closes")
    if n:
        print(f"  Date range: {entries[0]['date']} to {entries[-1]['date']}")
    size_kb = OUT_FILE.stat().st_size / 1024
    print(f"\nWrote {n} entries to src/data/idr-dca/ihsg-daily.json ({size_kb:.0f}KB)")


if __name__ == "__main__":
    main()
