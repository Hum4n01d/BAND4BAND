import { type NextRequest, NextResponse } from "next/server"
import type { ScenarioChange } from "@/types/financial"

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Invalid prompt provided" }, { status: 400 })
    }

    // This is a placeholder for actual AI integration
    // In production, you would integrate with OpenAI, Anthropic, or another AI service
    const changes: ScenarioChange[] = []

    // Simple pattern matching for demo purposes
    // In production, this would use a proper AI model for natural language understanding

    if (prompt.toLowerCase().includes("bonus")) {
      const match = prompt.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)[k]?/i)
      if (match) {
        let amount = Number.parseFloat(match[1].replace(",", ""))
        if (prompt.toLowerCase().includes("k")) amount *= 1000

        changes.push({
          category: "income",
          delta: amount * 100, // Convert to cents
          type: "one_time",
          description: `One-time bonus of $${amount.toLocaleString()}`,
        })
      }
    }

    if (
      prompt.toLowerCase().includes("rent") &&
      (prompt.toLowerCase().includes("increase") || prompt.toLowerCase().includes("raise"))
    ) {
      const match = prompt.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i)
      if (match) {
        const amount = Number.parseFloat(match[1].replace(",", ""))
        changes.push({
          category: "fixed",
          delta: amount * 100,
          type: "recurring",
          description: `Rent increase of $${amount}/month`,
        })
      }
    }

    if (prompt.toLowerCase().includes("cut") || prompt.toLowerCase().includes("reduce")) {
      if (prompt.toLowerCase().includes("variable") || prompt.toLowerCase().includes("spending")) {
        const match = prompt.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i)
        if (match) {
          const amount = Number.parseFloat(match[1].replace(",", ""))
          changes.push({
            category: "variable",
            delta: -amount * 100,
            type: "recurring",
            description: `Reduce variable spending by $${amount}/month`,
          })
        }
      }
    }

    if (changes.length === 0) {
      return NextResponse.json(
        { error: "Couldn't understand the scenario. Try rephrasing with specific amounts and categories." },
        { status: 400 },
      )
    }

    return NextResponse.json({ changes })
  } catch (error) {
    console.error("Error parsing scenario:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
