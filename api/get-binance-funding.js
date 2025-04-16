export default async function handler(req, res) {
    try {
      const fundingUrl = "https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT";
      const depthUrl = "https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=20";
  
      const [fundingRes, depthRes] = await Promise.all([
        fetch(fundingUrl),
        fetch(depthUrl)
      ]);
  
      if (!fundingRes.ok) throw new Error(`Funding API failed: ${fundingRes.status}`);
      if (!depthRes.ok) throw new Error(`Orderbook API failed: ${depthRes.status}`);
  
      const fundingData = await fundingRes.json();
      const depthData = await depthRes.json();
  
      if (!Array.isArray(depthData.asks) || !Array.isArray(depthData.bids)) {
        throw new Error("Depth data missing or malformed");
      }
  
      const bids = depthData.bids.map(([p, q]) => [parseFloat(p), parseFloat(q)]);
      const asks = depthData.asks.map(([p, q]) => [parseFloat(p), parseFloat(q)]);
  
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
  