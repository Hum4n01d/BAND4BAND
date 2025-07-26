"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFinancial } from "@/contexts/financial-context"
import { formatCurrency } from "@/lib/financial-calculator"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function TerminalScenario() {
  const { state, dispatch } = useFinancial()
  const { toast } = useToast()
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [...messages, userMessage].map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
            systemInstruction: {
              parts: [
                {
                  text: `You are a financial scenario processor for analyzing 'what if' financial scenarios. You can modify financial data by calling functions. When users ask about financial scenarios like raises, expense changes, or investment adjustments, use the appropriate tools to make those changes. Always provide clear descriptions of what changes you're making.

Current Financial Context:
- Monthly Income: $${state.data.monthly_income.toLocaleString()}
- Current Financial Categories and Values:
${JSON.stringify(state.data.steps, null, 2)}

Available Categories for modifications:
- Fixed Spend (includes Rent, Utilities, Insurance, Car Payment)
- Variable Spend (includes Groceries, Restaurants, Entertainment, Other)
- Pre-Tax Deductions (includes Employer 401K)
- Taxes (includes Federal, State)
- Investments (includes Long Term Taxable, Roth IRA)
- Emergency Fund

When users mention relative changes (like "increase by $100" or "raise by 10%"), calculate based on current values. When they mention absolute values (like "set rent to $2500"), use those exact amounts.`,
                },
              ],
            },
            tools: [
              {
                functionDeclarations: [
                  {
                    name: "updateMonthlyIncome",
                    description: "Update the monthly income amount",
                    parameters: {
                      type: "object",
                      properties: {
                        value: {
                          type: "number",
                          description: "The new monthly income value",
                        },
                      },
                      required: ["value"],
                    },
                  },
                  {
                    name: "updateBreakdownItem",
                    description: "Update a specific item in a financial category",
                    parameters: {
                      type: "object",
                      properties: {
                        stepName: {
                          type: "string",
                          description: "The category name (e.g., 'Fixed Spend', 'Variable Spend', 'Investments')",
                        },
                        itemName: {
                          type: "string",
                          description: "The specific item name (e.g., 'Rent', 'Groceries', 'Roth IRA')",
                        },
                        value: {
                          type: "number",
                          description: "The new value for this item",
                        },
                      },
                      required: ["stepName", "itemName", "value"],
                    },
                  },
                  {
                    name: "addBreakdownItem",
                    description: "Add a new item to a financial category",
                    parameters: {
                      type: "object",
                      properties: {
                        stepName: {
                          type: "string",
                          description: "The category name to add the item to",
                        },
                        itemName: {
                          type: "string",
                          description: "The name of the new item",
                        },
                        value: {
                          type: "number",
                          description: "The value for the new item",
                        },
                      },
                      required: ["stepName", "itemName", "value"],
                    },
                  },
                  {
                    name: "removeBreakdownItem",
                    description: "Remove an item from a financial category",
                    parameters: {
                      type: "object",
                      properties: {
                        stepName: {
                          type: "string",
                          description: "The category name",
                        },
                        itemName: {
                          type: "string",
                          description: "The item name to remove",
                        },
                      },
                      required: ["stepName", "itemName"],
                    },
                  },
                ],
              },
            ],
          }),
        }
      )

      const data = await response.json()
      console.log("Gemini response:", data)

      if (data.error) {
        throw new Error(`API Error: ${data.error.message || 'Unknown API error'}`)
      }

      if (data.candidates?.[0]?.content) {
        const content = data.candidates[0].content
        let actionsPerformed = []

        for (const part of content.parts) {
          if (part.functionCall) {
            const functionCall = part.functionCall

            if (functionCall.name === "updateMonthlyIncome") {
              const args = functionCall.args
              dispatch({ type: "UPDATE_MONTHLY_INCOME", value: args.value })
              actionsPerformed.push(`Updated monthly income to ${formatCurrency(args.value)}`)
            } else if (functionCall.name === "updateBreakdownItem") {
              const args = functionCall.args
              dispatch({ 
                type: "UPDATE_BREAKDOWN_ITEM", 
                stepName: args.stepName, 
                itemName: args.itemName, 
                value: args.value 
              })
              actionsPerformed.push(`Updated ${args.itemName} in ${args.stepName} to ${formatCurrency(args.value)}`)
            } else if (functionCall.name === "addBreakdownItem") {
              const args = functionCall.args
              dispatch({ 
                type: "ADD_BREAKDOWN_ITEM", 
                stepName: args.stepName, 
                itemName: args.itemName, 
                value: args.value 
              })
              actionsPerformed.push(`Added ${args.itemName} to ${args.stepName}: ${formatCurrency(args.value)}`)
            } else if (functionCall.name === "removeBreakdownItem") {
              const args = functionCall.args
              dispatch({ 
                type: "REMOVE_BREAKDOWN_ITEM", 
                stepName: args.stepName, 
                itemName: args.itemName 
              })
              actionsPerformed.push(`Removed ${args.itemName} from ${args.stepName}`)
            }
          } else if (part.text) {
            actionsPerformed.push(part.text)
          }
        }

        if (actionsPerformed.length > 0) {
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: actionsPerformed.join("\n"),
            },
          ])

          toast({
            title: "SCENARIO_PROCESSED",
            description: "Financial model updated successfully",
          })
        }
      } else if (data.candidates?.[0]?.finishReason) {
        // Handle cases where AI doesn't provide content but has a finish reason
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `AI Response: ${data.candidates[0].finishReason}. Please try rephrasing your request.`,
          },
        ])
      } else {
        // No valid response from AI
        throw new Error("No valid response from AI")
      }
    } catch (error) {
      console.error("AI processing error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `ERROR: ${errorMessage}. Please try again or check your API key.`,
        },
      ])
      toast({
        title: "PROCESSING_FAILED",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-black border-2 border-green-500 rounded-lg p-6 scanlines">
      <div className="flex items-center justify-between mb-4 border-b border-green-500 pb-2">
        <div className="terminal-green text-sm font-mono">AI_SCENARIO_PROCESSOR.exe</div>
        <div className="terminal-green text-xs font-mono animate-pulse">[READY]</div>
      </div>

      <div className="space-y-4">
        {/* Chat Messages */}
        <div className="h-48 overflow-y-auto space-y-2 border border-green-500 rounded p-2 bg-gray-950">
          {messages.length === 0 && (
            <div className="text-center text-green-600 text-xs font-mono py-4">
              [AWAITING_SCENARIO_INPUT]
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-2 rounded font-mono text-xs ${
                message.role === "user"
                  ? "bg-gray-900 border border-cyan-500 text-cyan-400"
                  : "bg-gray-800 border border-green-500 text-green-400"
              }`}
            >
              <div className="text-xs opacity-70 mb-1">
                {message.role === "user" ? "[USER_INPUT]" : "[AI_RESPONSE]"}
              </div>
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          ))}

          {isLoading && (
            <div className="p-2 rounded font-mono text-xs bg-gray-800 border border-green-500 text-green-400">
              <div className="text-xs opacity-70 mb-1">[AI_PROCESSING]</div>
              <div className="flex items-center">
                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                Analyzing scenario...
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="terminal-green text-xs font-mono mb-2">{">"} ENTER_SCENARIO_QUERY:</div>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="what if i get a $2k raise?"
            className="bg-black border-green-500 text-green-400 font-mono text-sm placeholder:text-green-600 focus:border-cyan-500 focus:ring-cyan-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-green-600 hover:bg-green-700 text-black font-mono text-sm border border-green-500"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                PROCESSING...
              </>
            ) : (
              "EXECUTE_ANALYSIS"
            )}
          </Button>
        </form>
      </div>

      <div className="mt-6 text-xs font-mono terminal-yellow space-y-1 border-t border-green-500 pt-4">
        <div className="terminal-green">SAMPLE_QUERIES:</div>
        <div>• "what if i get a $2000 raise?"</div>
        <div>• "increase my rent to $2500"</div>
        <div>• "add a new expense called gym membership for $50"</div>
        <div>• "remove my car payment"</div>
        <div>• "increase my Roth IRA contribution to $500"</div>
      </div>
    </div>
  )
}