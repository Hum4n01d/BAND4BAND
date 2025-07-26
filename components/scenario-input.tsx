"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useFinancial } from "@/contexts/financial-context"
import type { ScenarioChange } from "@/types/financial"
import { formatCurrency } from "@/lib/financial-calculator"
import { Loader2, Sparkles, Undo2, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function ScenarioInput() {
  const { state, dispatch } = useFinancial()
  const { toast } = useToast()
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const parseScenario = async (prompt: string): Promise<ScenarioChange[]> => {
    // Simulate AI parsing - in real implementation, this would call your AI API
    setIsLoading(true)

    try {
      // Mock parsing logic for demo
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const changes: ScenarioChange[] = []

      // Simple pattern matching for demo
      if (prompt.toLowerCase().includes("bonus")) {
        const match = prompt.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)[k]?/i)
        if (match) {
          let amount = Number.parseFloat(match[1].replace(",", ""))
          if (prompt.toLowerCase().includes("k")) amount *= 1000

          changes.push({
            category: "income",
            delta: amount * 100, // Convert to cents
            type: "one_time",
            description: `One-time bonus of ${formatCurrency(amount * 100)}`,
          })
        }
      }

      if (prompt.toLowerCase().includes("rent") && prompt.toLowerCase().includes("increase")) {
        const match = prompt.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i)
        if (match) {
          const amount = Number.parseFloat(match[1].replace(",", ""))
          changes.push({
            category: "fixed",
            delta: amount * 100,
            type: "recurring",
            description: `Rent increase of ${formatCurrency(amount * 100)}/month`,
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
              description: `Reduce variable spending by ${formatCurrency(amount * 100)}/month`,
            })
          }
        }
      }

      if (changes.length === 0) {
        throw new Error("Couldn't understand the scenario. Try rephrasing with specific amounts and categories.")
      }

      return changes
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    try {
      const changes = await parseScenario(input)
      dispatch({ type: "PREVIEW_SCENARIO", changes })
      setInput("")
    } catch (error) {
      toast({
        title: "Parsing Error",
        description: error instanceof Error ? error.message : "Couldn't understand the scenario",
        variant: "destructive",
      })
    }
  }

  const handleApply = () => {
    if (state.pendingScenario) {
      dispatch({ type: "APPLY_SCENARIO", changes: state.pendingScenario.changes })
      toast({
        title: "Scenario Applied",
        description: "Changes have been applied to your budget",
      })
    }
  }

  const handleUndo = () => {
    dispatch({ type: "CLEAR_PREVIEW" })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <span>AI What-If Scenarios</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., 'What if I get a $6k bonus in July?' or 'What if rent increases by $500?'"
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
            </Button>
          </form>

          {state.pendingScenario && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-blue-700">Scenario Preview:</div>

              <div className="space-y-2">
                {state.pendingScenario.changes.map((change, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span className="text-sm">{change.description}</span>
                    <Badge variant={change.delta > 0 ? "default" : "secondary"}>{change.type}</Badge>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <Button onClick={handleApply} size="sm" className="flex items-center space-x-1">
                  <Check className="h-4 w-4" />
                  <span>Apply</span>
                </Button>
                <Button
                  onClick={handleUndo}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1 bg-transparent"
                >
                  <Undo2 className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-gray-500 space-y-1">
        <p>
          <strong>Try these examples:</strong>
        </p>
        <p>• "What if I get a $5000 bonus?"</p>
        <p>• "What if my rent increases by $300?"</p>
        <p>• "What if I reduce variable spending by $200?"</p>
      </div>
    </div>
  )
}
