export default async function handler(req, res) {
    try {
      const [fundingRes, orderbookRes] = await Promise.all([
        fetch("https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT"),
        fetch("https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=20")
      ]);
  
      if (!fundingRes.ok) throw new Error("Funding API failed");
      if (!orderbookRes.ok) throw new Error("Orderbook API failed");
  
      const fundingData = await fundingRes.json();
      const orderbookData = await orderbookRes.json();
  
      const bids = Array.isArray(orderbookData.bids)
        ? orderbookData.bids.map(([p, q]) => [parseFloat(p), parseFloat(q)])
        : [];
  
      const asks = Array.isArray(orderbookData.asks)
        ? orderbookData.asks.map(([p, q]) => [parseFloat(p), parseFloat(q)])
        : [];
  
      if (asks.length === 0 || bids.length === 0) {
        throw new Error("Empty asks or bids received from Binance");
      }
  
      res.status(200).json({
        symbol: "BTCUSDT",
        fundingRate: parseFloat(fundingData.lastFundingRate),
        bestBid: bids[0][0],
        bestAsk: asks[0][0],
        bids,
        asks
      });
    } catch (err) {
      console.error("❌ API error:", err.message);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  }
  