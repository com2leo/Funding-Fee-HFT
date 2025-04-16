export default async function handler(req, res) {
    try {
      const [fundingRes, orderbookRes] = await Promise.all([
        fetch("https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT"),
        fetch("https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=20")
      ]);
  
      if (!fundingRes.ok || !orderbookRes.ok) {
        throw new Error("Binance API fetch failed");
      }
  
      const fundingData = await fundingRes.json();
      const orderbookData = await orderbookRes.json();
  
      const bids = orderbookData.bids.map(([p, q]) => [parseFloat(p), parseFloat(q)]);
      const asks = orderbookData.asks.map(([p, q]) => [parseFloat(p), parseFloat(q)]);
  
      res.status(200).json({
        symbol: "BTCUSDT",
        fundingRate: parseFloat(fundingData.lastFundingRate),
        bestBid: bids[0][0],
        bestAsk: asks[0][0],
        bids,
        asks
      });
    } catch (err) {
      console.error("API handler error:", err.message);
      res.status(500).json({ error: "API fetch failed" });
    }
  }
  