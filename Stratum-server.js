const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "STRATUM API running", version: "1.0" });
});

app.post("/analyze", async (req, res) => {
  const { bizName, industry, revenue, costs, teamSize, yearsOp, competitors, challenge } = req.body;

  if (!bizName || !industry || !revenue || !costs) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const rev = parseFloat(revenue);
  const cost = parseFloat(costs);
  const profit = rev - cost;
  const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : 0;

  const prompt = `You are a senior business strategist. Analyze this business and respond with ONLY a raw JSON object. No markdown. No explanation. Start with { and end with }.

Business: ${bizName}
Industry: ${industry}
Monthly Revenue: $${rev.toLocaleString()}
Monthly Costs: $${cost.toLocaleString()}
Net Profit: $${profit.toLocaleString()} (${margin}% margin)
Team: ${teamSize} people | Years: ${yearsOp}
Competitors: ${competitors || "not specified"}
Challenge: ${challenge || "general growth"}

Return exactly this JSON with real specific analysis:
{"marketPosition":"one sentence","financialHealth":"one sentence","growthOpportunity":"one sentence","primaryRisk":"one sentence","competitiveEdge":"one sentence","actions":[{"text":"action 1","priority":"high"},{"text":"action 2","priority":"high"},{"text":"action 3","priority":"med"},{"text":"action 4","priority":"med"},{"text":"action 5","priority":"low"}],"revenueProjection":{"q1":0,"q2":0,"q3":0,"q4":0},"marketShareEstimate":0,"customerRetentionScore":0,"innovationIndex":0}

Rules: revenueProjection values are realistic quarterly dollar projections. All score fields are integers 0-100.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Anthropic API error",
      });
    }

    const raw = (data.content || []).map(b => b.text || "").join("").trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let ai;
    try {
      ai = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        ai = JSON.parse(match[0]);
      } else {
        return res.status(500).json({ error: "Could not parse AI response" });
      }
    }

    res.json({ success: true, analysis: ai, margin, profit });

  } catch (err) {
    res.status(500).json({ error: err.message || "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`STRATUM server running on port ${PORT}`);
});
