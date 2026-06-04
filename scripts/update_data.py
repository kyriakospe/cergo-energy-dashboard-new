from __future__ import annotations

import csv
import json
import math
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
USER_AGENT = "CERGO-Energy-Dash/1.0"


@dataclass(frozen=True)
class InstrumentSpec:
    id: str
    name: str
    symbol: str
    yahoo: str
    category: str
    source: str
    currency: str = "$"
    exchange: str = ""


FUTURES = {
    "energy": [
        InstrumentSpec("cl", "WTI Crude Oil", "CL", "CL=F", "energy", "Yahoo Finance / NYMEX"),
        InstrumentSpec("bz", "Brent Crude Oil", "BZ", "BZ=F", "energy", "Yahoo Finance / ICE"),
        InstrumentSpec("ng", "Natural Gas", "NG", "NG=F", "energy", "Yahoo Finance / NYMEX"),
        InstrumentSpec("rb", "Gasoline", "RB", "RB=F", "energy", "Yahoo Finance / NYMEX"),
        InstrumentSpec("ho", "Heating Oil", "HO", "HO=F", "energy", "Yahoo Finance / NYMEX"),
    ],
    "commodities": [
        InstrumentSpec("gc", "Gold", "GC", "GC=F", "commodities", "Yahoo Finance / COMEX"),
        InstrumentSpec("si", "Silver", "SI", "SI=F", "commodities", "Yahoo Finance / COMEX"),
        InstrumentSpec("hg", "Copper", "HG", "HG=F", "commodities", "Yahoo Finance / COMEX"),
        InstrumentSpec("pl", "Platinum", "PL", "PL=F", "commodities", "Yahoo Finance / NYMEX"),
        InstrumentSpec("pa", "Palladium", "PA", "PA=F", "commodities", "Yahoo Finance / NYMEX"),
    ],
    "agriculture": [
        InstrumentSpec("zc", "Corn", "ZC", "ZC=F", "agriculture", "Yahoo Finance / CBOT"),
        InstrumentSpec("zw", "Wheat", "ZW", "ZW=F", "agriculture", "Yahoo Finance / CBOT"),
        InstrumentSpec("zs", "Soybeans", "ZS", "ZS=F", "agriculture", "Yahoo Finance / CBOT"),
        InstrumentSpec("ct", "Cotton", "CT", "CT=F", "agriculture", "Yahoo Finance / ICE"),
        InstrumentSpec("sb", "Sugar", "SB", "SB=F", "agriculture", "Yahoo Finance / ICE"),
        InstrumentSpec("gf", "Feeder Cattle", "GF", "GF=F", "agriculture", "Yahoo Finance / CME"),
        InstrumentSpec("le", "Live Cattle", "LE", "LE=F", "agriculture", "Yahoo Finance / CME"),
    ],
}

STOCKS = {
    "energy": [
        InstrumentSpec("xom", "Exxon Mobil", "XOM", "XOM", "stocks", "Yahoo Finance / NYSE"),
        InstrumentSpec("cvx", "Chevron", "CVX", "CVX", "stocks", "Yahoo Finance / NYSE"),
        InstrumentSpec("shel", "Shell", "SHEL", "SHEL", "stocks", "Yahoo Finance / NYSE"),
        InstrumentSpec("bp", "BP", "BP", "BP", "stocks", "Yahoo Finance / NYSE"),
        InstrumentSpec("tte", "TotalEnergies", "TTE", "TTE", "stocks", "Yahoo Finance / NYSE"),
        InstrumentSpec("cop", "ConocoPhillips", "COP", "COP", "stocks", "Yahoo Finance / NYSE"),
        InstrumentSpec("eqnr", "Equinor", "EQNR", "EQNR", "stocks", "Yahoo Finance / NYSE"),
    ],
    "commodities": [
        InstrumentSpec("bhp", "BHP", "BHP", "BHP", "stocks", "Yahoo Finance / NYSE"),
        InstrumentSpec("rio", "Rio Tinto", "RIO", "RIO", "stocks", "Yahoo Finance / NYSE"),
        InstrumentSpec("fcx", "Freeport-McMoRan", "FCX", "FCX", "stocks", "Yahoo Finance / NYSE"),
        InstrumentSpec("scco", "Southern Copper", "SCCO", "SCCO", "stocks", "Yahoo Finance / NYSE"),
        InstrumentSpec("aa", "Alcoa", "AA", "AA", "stocks", "Yahoo Finance / NYSE"),
    ],
    "agriculture": [
        InstrumentSpec("adm", "Archer Daniels Midland", "ADM", "ADM", "stocks", "Yahoo Finance / NYSE"),
        InstrumentSpec("bg", "Bunge", "BG", "BG", "stocks", "Yahoo Finance / NYSE"),
        InstrumentSpec("de", "Deere", "DE", "DE", "stocks", "Yahoo Finance / NYSE"),
        InstrumentSpec("mos", "Mosaic", "MOS", "MOS", "stocks", "Yahoo Finance / NYSE"),
        InstrumentSpec("ntr", "Nutrien", "NTR", "NTR", "stocks", "Yahoo Finance / NYSE"),
    ],
}

COUNTRIES = [
    ("Brazil", "Bovespa", "^BVSP", "B3", "linear-gradient(135deg, #159447 0 100%)"),
    ("South Africa", "FTSE/JSE", "J203.JO", "JSE", "linear-gradient(90deg, #111 0 22%, #f4cc3c 22% 34%, #159447 34% 56%, #fff 56% 68%, #d92f2f 68%)"),
    ("Mexico", "IPC", "^MXX", "BMV", "linear-gradient(90deg, #178f4c 0 33%, #fff 33% 66%, #c72d36 66%)"),
    ("Saudi Arabia", "TASI", "^TASI.SR", "Tadawul", "linear-gradient(#0b7a4b 0 100%)"),
    ("Norway", "OSEBX", "OSEBX.OL", "Oslo", "linear-gradient(90deg, #bd1f2d 0 100%)"),
    ("Canada", "TSX", "^GSPTSE", "TMX", "linear-gradient(90deg, #d7252f 0 25%, #fff 25% 75%, #d7252f 75%)"),
    ("Australia", "ASX 200", "^AXJO", "ASX", "linear-gradient(#1c3f8e 0 100%)"),
    ("Qatar", "QE Index", "QSI.QA", "QSE", "linear-gradient(90deg, #8a1538 0 36%, #fff 36%)"),
]

RANKING_SPECS = [
    *FUTURES["energy"],
    *FUTURES["commodities"],
    *FUTURES["agriculture"],
    InstrumentSpec("bdi", "Baltic Dry Index", "BDI", "BDIY:IND", "indices", "Fallback index seed", currency=""),
    InstrumentSpec("crb", "CRB Index", "CRB", "CRB", "indices", "Fallback index seed", currency=""),
    InstrumentSpec("gsci", "S&P GSCI Index", "GSCI", "GD=F", "indices", "Yahoo Finance", currency=""),
]

RSS_FEEDS = [
    ("energy", "EIA", "https://www.eia.gov/rss/todayinenergy.xml"),
    ("energy", "Google News", "https://news.google.com/rss/search?q=energy%20commodities%20oil%20gas%20when%3A7d&hl=en-US&gl=US&ceid=US%3Aen"),
    ("commodities", "Google News", "https://news.google.com/rss/search?q=copper%20lithium%20mining%20commodities%20when%3A7d&hl=en-US&gl=US&ceid=US%3Aen"),
    ("agriculture", "Google News", "https://news.google.com/rss/search?q=agriculture%20grain%20corn%20wheat%20soybeans%20when%3A7d&hl=en-US&gl=US&ceid=US%3Aen"),
]


def fetch_text(url: str, timeout: int = 20) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="replace")


def fetch_chart(symbol: str, chart_range: str = "1y") -> dict | None:
    encoded = urllib.parse.quote(symbol, safe="")
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}?range={chart_range}&interval=1d"
    try:
        payload = json.loads(fetch_text(url))
        result = payload.get("chart", {}).get("result") or []
        if not result:
            return None
        return result[0]
    except Exception as exc:
        print(f"warn: chart fetch failed for {symbol}: {exc}")
        return None


def closes_from_chart(chart: dict) -> list[float]:
    quotes = chart.get("indicators", {}).get("quote") or []
    if not quotes:
        return []
    closes = quotes[0].get("close") or []
    return [float(value) for value in closes if isinstance(value, (int, float)) and math.isfinite(value)]


def timestamps_from_chart(chart: dict) -> list[datetime]:
    stamps = chart.get("timestamp") or []
    return [datetime.fromtimestamp(stamp, tz=timezone.utc) for stamp in stamps]


def instrument_from_chart(spec: InstrumentSpec, chart_range: str = "1y") -> dict | None:
    chart = fetch_chart(spec.yahoo, chart_range=chart_range)
    if not chart:
        return None
    closes = closes_from_chart(chart)
    if len(closes) < 2:
        return None

    meta = chart.get("meta", {})
    price = float(meta.get("regularMarketPrice") or closes[-1])
    previous = closes[-2]
    change_abs = price - previous
    change_pct = (change_abs / previous) * 100 if previous else 0
    regular_time = meta.get("regularMarketTime")
    updated_at = (
        datetime.fromtimestamp(regular_time, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        if regular_time
        else datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    )
    currency = "$" if (meta.get("currency") or spec.currency) == "USD" else spec.currency
    return {
        "id": spec.id,
        "name": spec.name,
        "category": spec.category,
        "symbol": spec.symbol,
        "price": round(price, 4),
        "currency": currency,
        "changePct1D": round(change_pct, 2),
        "changeAbs1D": round(change_abs, 4),
        "sparkline": [round(value, 4) for value in closes[-24:]],
        "updatedAt": updated_at,
        "source": spec.source,
    }


def load_previous(path: Path, fallback):
    try:
      return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
      return fallback


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def update_watchlists() -> None:
    futures = {}
    for group, specs in FUTURES.items():
        futures[group] = [item for spec in specs if (item := instrument_from_chart(spec, chart_range="3mo"))]
        time.sleep(0.15)

    stocks = {}
    for group, specs in STOCKS.items():
        stocks[group] = [item for spec in specs if (item := instrument_from_chart(spec, chart_range="3mo"))]
        time.sleep(0.15)

    if all(futures.values()):
        write_json(DATA / "futures.json", futures)
    else:
        print("warn: futures update incomplete; preserving previous JSON")

    if all(stocks.values()):
        write_json(DATA / "stocks.json", stocks)
    else:
        print("warn: stocks update incomplete; preserving previous JSON")


def update_countries() -> None:
    previous = load_previous(DATA / "country-indices.json", [])
    by_country = {item.get("country"): item for item in previous if isinstance(item, dict)}
    rows = []
    for country, index, symbol, exchange, flag_css in COUNTRIES:
        spec = InstrumentSpec(country.lower().replace(" ", "-"), index, symbol, symbol, "indices", "Yahoo Finance", currency="")
        item = instrument_from_chart(spec, chart_range="3mo")
        if item:
            rows.append({
                "country": country,
                "index": index,
                "exchange": exchange,
                "value": item["price"],
                "changePct1D": item["changePct1D"],
                "flagCss": flag_css,
                "source": item["source"],
                "updatedAt": item["updatedAt"],
            })
        elif country in by_country:
            rows.append({**by_country[country], "source": by_country[country].get("source", "Previous cached value")})
        time.sleep(0.15)
    if rows:
        write_json(DATA / "country-indices.json", rows)


def performance_for_range(closes: list[float], dates: list[datetime], timeframe: str) -> float | None:
    if len(closes) < 2:
        return None

    now = dates[-1] if dates else datetime.now(timezone.utc)
    target_index = 0
    if timeframe == "MTD":
        target_index = next((i for i, dt in enumerate(dates) if dt.year == now.year and dt.month == now.month), max(0, len(closes) - 22))
    elif timeframe == "QTD":
        q_month = ((now.month - 1) // 3) * 3 + 1
        target_index = next((i for i, dt in enumerate(dates) if dt.year == now.year and dt.month >= q_month), max(0, len(closes) - 64))
    elif timeframe == "YTD":
        target_index = next((i for i, dt in enumerate(dates) if dt.year == now.year), max(0, len(closes) - 252))
    else:
        sessions = {"1M": 22, "3M": 64, "6M": 126, "1Y": 252, "3Y": 756, "5Y": 1260, "10Y": 2520}[timeframe]
        target_index = max(0, len(closes) - sessions - 1)

    target_index = min(max(target_index, 0), max(0, len(closes) - 2))
    start = closes[target_index]
    end = closes[-1]
    if not start:
        return None
    return round(((end - start) / start) * 100, 2)


def update_rankings() -> None:
    ranges = {tf: [] for tf in ["MTD", "1M", "QTD", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "10Y"]}
    for spec in RANKING_SPECS:
        chart = fetch_chart(spec.yahoo, chart_range="10y")
        if not chart:
            continue
        closes = closes_from_chart(chart)
        dates = timestamps_from_chart(chart)
        for timeframe in ranges:
            value = performance_for_range(closes, dates, timeframe)
            if value is not None:
                ranges[timeframe].append({"name": spec.name, "group": spec.category, "value": value})
        time.sleep(0.15)

    output = {}
    for timeframe, rows in ranges.items():
        rows = sorted(rows, key=lambda item: item["value"], reverse=True)
        if len(rows) > 8:
            output[timeframe] = rows[:5] + rows[-3:]
        else:
            output[timeframe] = rows
    if output and all(output.values()):
        write_json(DATA / "performance-rankings.json", output)


def feed_items(category: str, source: str, url: str) -> list[dict]:
    try:
        xml = fetch_text(url)
        root = ET.fromstring(xml)
    except Exception as exc:
        print(f"warn: RSS failed for {source}: {exc}")
        return []

    rows = []
    for item in root.findall(".//item")[:12]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub = (item.findtext("pubDate") or "").strip()
        if not title or not link:
            continue
        try:
            dt = parsedate_to_datetime(pub)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except Exception:
            dt = datetime.now(timezone.utc)
        rows.append({
            "id": f"{source.lower().replace(' ', '-')}-{abs(hash(link))}",
            "title": title,
            "source": source,
            "url": link,
            "category": category,
            "publishedAt": dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            "publishedTs": dt.timestamp(),
        })
    return rows


def update_news() -> None:
    rows = []
    seen = set()
    for category, source, url in RSS_FEEDS:
        for item in feed_items(category, source, url):
            fingerprint = item["title"].lower()[:80]
            if fingerprint in seen:
                continue
            seen.add(fingerprint)
            rows.append(item)
        time.sleep(0.15)
    rows.sort(key=lambda item: item["publishedTs"], reverse=True)
    for item in rows:
        item.pop("publishedTs", None)
    if rows:
        write_json(DATA / "news.json", rows[:24])


def main() -> None:
    started = datetime.now(timezone.utc)
    update_watchlists()
    update_countries()
    update_rankings()
    update_news()
    elapsed = (datetime.now(timezone.utc) - started).total_seconds()
    print(f"updated dashboard data in {elapsed:.1f}s")


if __name__ == "__main__":
    main()
