export default async function handler(req, res) {
    try {
      const [fundingRaw, orderbookRaw] = await Promise.all([
        fetch("https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT").then(res => res.json()),
        fetch("https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=20").then(res => res.json())
      ]);
  
      const bids = orderbookRaw.bids.map(b => [parseFloat(b[0]), parseFloat(b[1])]);
      const asks = orderbookRaw.asks.map(a => [parseFloat(a[0]), parseFloat(a[1])]);
  
      res.status(200).json([{
        symbol: "BTCUSDT",
        fundingRate: parseFloat(fundingRaw.lastFundingRate),
        bestBid: parseFloat(orderbookRaw.bids[0][0]),
        bestAsk: parseFloat(orderbookRaw.asks[0][0]),
        bids,
        asks
      }]);
    } catch (err) {
      console.error("Binance API failed:", err);
      res.status(500).json({ error: "API fetch failed" });
    }
  }
  