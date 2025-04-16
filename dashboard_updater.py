# dashboard_updater.py
import asyncio
import aiohttp
import websockets
import json
import ssl
from datetime import datetime

funding_rate = 0.0
next_funding_time = 0
orderbook = {'bids': [], 'asks': []}
ssl_context = ssl._create_unverified_context()

async def listen_orderbook():
    url = 'wss://fstream.binance.com/ws/btcusdt@depth20@100ms'
    async with websockets.connect(url, ssl=ssl_context) as ws:
        while True:
            data = json.loads(await ws.recv())
            orderbook['bids'] = [(float(p), float(q)) for p, q in data.get('b', [])]
            orderbook['asks'] = [(float(p), float(q)) for p, q in data.get('a', [])]

async def fetch_funding():
    global funding_rate, next_funding_time
    url = 'https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT'
    async with aiohttp.ClientSession() as session:
        while True:
            try:
                async with session.get(url) as resp:
                    data = await resp.json()
                    funding_rate = float(data['lastFundingRate'])
                    next_funding_time = int(data['nextFundingTime'])
            except:
                pass
            await asyncio.sleep(0.2)

async def update_dashboard():
    while True:
        try:
            bids = orderbook['bids']
            asks = orderbook['asks']
            if not bids or not asks:
                await asyncio.sleep(0.5)
                continue

            best_bid = bids[0][0]
            best_ask = asks[0][0]
            spread = best_ask - best_bid
            mid_price = (best_ask + best_bid) / 2

            # Test profitability at top level
            test_qty = 0.001
            funding_gain = funding_rate * test_qty * mid_price
            trading_fee = 0.0004 * test_qty * mid_price
            spread_cost = spread * test_qty

            if funding_gain - trading_fee - spread_cost < 0:
                result = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "data": [{
                        "symbol": "BTCUSDT",
                        "funding_rate": funding_rate,
                        "next_funding_time": next_funding_time,
                        "executable_qty": 0.0,
                        "executable_value": 0.0,
                        "spread": spread,
                        "expected_pnl": 0.0
                    }]
                }
                with open("dashboard.json", "w") as f:
                    json.dump(result, f, indent=2)
                await asyncio.sleep(0.5)
                continue

            total_qty = 0.0
            total_cost = 0.0
            total_pnl = 0.0

            for ask_price, ask_qty in asks:
                funding = funding_rate * ask_qty * mid_price
                fees = 0.0004 * ask_qty * mid_price
                spread_penalty = (ask_price - best_bid) * ask_qty
                profit = funding - fees - spread_penalty
                if profit > 0:
                    total_qty += ask_qty
                    total_cost += ask_price * ask_qty
                    total_pnl += profit
                else:
                    break

            vwap = total_cost / total_qty if total_qty else 0.0
            notional_value = total_qty * vwap

            result = {
                "timestamp": datetime.utcnow().isoformat(),
                "data": [{
                    "symbol": "BTCUSDT",
                    "funding_rate": funding_rate,
                    "next_funding_time": next_funding_time,
                    "executable_qty": total_qty,
                    "executable_value": notional_value,
                    "spread": spread,
                    "expected_pnl": total_pnl
                }]
            }

            with open("dashboard.json", "w") as f:
                json.dump(result, f, indent=2)

            print(f"✅ {datetime.utcnow().isoformat()} | Qty: {total_qty:.4f} | PnL: ${total_pnl:.4f}")
        except Exception as e:
            print("⚠️ Error:", e)

        await asyncio.sleep(0.5)

async def main():
    await asyncio.gather(
        listen_orderbook(),
        fetch_funding(),
        update_dashboard()
    )

if __name__ == '__main__':
    asyncio.run(main())
