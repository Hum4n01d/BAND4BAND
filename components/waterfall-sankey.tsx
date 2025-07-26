"use client"

import { useMemo, useState } from "react"
import { useFinancial } from "@/contexts/financial-context"
import { formatCurrency } from "@/lib/financial-calculator"
import { StepEditModal } from "./step-edit-modal"

interface WaterfallStepProps {
  step: {
    label: string
    amount: number
    remaining: number
    type: "checkpoint" | "deduction"
    category?: string
    components?: Record<string, number>
  }
  x: number
  y: number
  width: number
  height: number
  maxAmount: number
  isIllegal?: boolean
  onEdit: () => void
}

function WaterfallStep({ step, x, y, width, height, maxAmount, isIllegal, onEdit }: WaterfallStepProps) {
  const [isHovered, setIsHovered] = useState(false)

  const getStepColor = () => {
    if (step.type === "checkpoint") return "#00ffff" // Cyan for checkpoints
    if (step.category === "pre_tax") return "#ff073a" // Red for pre-tax deductions
    if (step.category?.includes("post_tax")) return "#ff8c00" // Orange for post-tax
    return "#ff073a" // Default red
  }

  const getTextColor = () => {
    if (step.type === "checkpoint") return "terminal-cyan"
    return "terminal-red"
  }

  // Calculate proportional height based on amount
  const proportionalHeight = Math.max(40, (step.amount / maxAmount) * 300)

  return (
    <>
      <div
        className={`absolute cursor-pointer transition-all duration-200 ${
          isHovered ? "glow-green" : ""
        } ${isIllegal ? "glow-red" : ""}`}
        style={{
          left: x,
          top: y - proportionalHeight + height, // Align to bottom
          width: width,
          height: proportionalHeight,
          backgroundColor: "#1a1a1a",
          border: `2px solid ${isHovered ? "#00ff41" : getStepColor()}`,
          borderRadius: "4px",
        }}
        onClick={onEdit}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="p-2 h-full flex flex-col justify-center text-white text-xs font-mono">
          <div className={`truncate font-semibold ${getTextColor()} mb-1`}>{step.label}</div>
          <div className="text-white font-bold">{formatCurrency(step.amount * 100)}</div>
          {step.type === "checkpoint" && (
            <div className="terminal-green text-xs mt-1">Remaining: {formatCurrency(step.remaining * 100)}</div>
          )}
          {step.components && (
            <div className="text-xs mt-1 space-y-0.5">
              {Object.entries(step.components).map(([key, value]) => (
                <div key={key} className="terminal-yellow">
                  {key}: {formatCurrency(value * 100)}
                </div>
              ))}
            </div>
          )}
          {isIllegal && step.remaining < 0 && <div className="terminal-red text-xs mt-1 animate-pulse">[DEFICIT]</div>}
        </div>
      </div>
    </>
  )
}

interface DollarFlowLineProps {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  dashed?: boolean
  amount: number
}

function DollarFlowLine({ x1, y1, x2, y2, color, dashed, amount }: DollarFlowLineProps) {
  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)

  const segmentLength = 15
  const numSegments = Math.floor(length / segmentLength)

  const segments = []
  for (let i = 0; i < numSegments; i++) {
    const progress = i / numSegments
    const x = x1 + (x2 - x1) * progress
    const y = y1 + (y2 - y1) * progress

    const isDollar = i % 2 === 0
    segments.push({
      x,
      y,
      content: isDollar ? "$" : "─",
      isDollar,
    })
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {segments.map((segment, index) => (
        <div
          key={index}
          className={`absolute text-xs font-mono transition-all duration-200 ${dashed ? "animate-pulse" : ""}`}
          style={{
            left: segment.x,
            top: segment.y,
            color: color,
            transform: `rotate(${angle}deg)`,
            transformOrigin: "center",
            textShadow: `0 0 5px ${color}`,
          }}
        >
          {segment.content}
        </div>
      ))}
    </div>
  )
}

export function WaterfallSankey() {
  const { state } = useFinancial()
  const [editingStep, setEditingStep] = useState<string | null>(null)

  const layout = useMemo(() => {
    const width = 1400
    const height = 600
    const stepWidth = 140
    const stepSpacing = 160

    const displayState = state.pendingScenario?.previewState || state
    const maxAmount = Math.max(...displayState.flow.map((step) => step.amount))

    const steps = displayState.flow.map((step, index) => {
      const x = index * stepSpacing + 50
      const y = height - 100 // Base line for all steps

      return {
        ...step,
        x,
        y,
        width: stepWidth,
        height: 80,
        maxAmount,
      }
    })

    // Create flow lines between steps
    const flows = []
    for (let i = 0; i < steps.length - 1; i++) {
      const currentStep = steps[i]
      const nextStep = steps[i + 1]

      // Calculate connection points
      const x1 = currentStep.x + currentStep.width
      const y1 = currentStep.y - (currentStep.amount / maxAmount) * 300 + currentStep.height / 2
      const x2 = nextStep.x
      const y2 = nextStep.y - (nextStep.amount / maxAmount) * 300 + nextStep.height / 2

      flows.push({
        x1,
        y1,
        x2,
        y2,
        color: currentStep.type === "checkpoint" ? "#00ffff" : "#ff073a",
        dashed: currentStep.remaining < 0,
        amount: currentStep.remaining,
      })
    }

    return { steps, flows, width, height }
  }, [state])

  const displayState = state.pendingScenario?.previewState || state

  return (
    <div className="relative bg-black rounded-lg border-2 border-green-500 p-6 overflow-auto scanlines">
      {/* Terminal header */}
      <div className="flex items-center justify-between mb-6 border-b border-green-500 pb-2">
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="terminal-green text-sm font-mono">WATERFALL_CASH_FLOW_v3.0</div>
        </div>
        <div className="terminal-green text-xs font-mono">{new Date().toISOString().slice(0, 19)}Z</div>
      </div>

      <div className="relative" style={{ width: layout.width, height: layout.height }}>
        {/* Render flow lines */}
        {layout.flows.map((flow, index) => (
          <DollarFlowLine
            key={index}
            x1={flow.x1}
            y1={flow.y1}
            x2={flow.x2}
            y2={flow.y2}
            color={flow.color}
            dashed={flow.dashed}
            amount={flow.amount}
          />
        ))}

        {/* Render steps */}
        {layout.steps.map((step, index) => (
          <WaterfallStep
            key={index}
            step={step}
            x={step.x}
            y={step.y}
            width={step.width}
            height={step.height}
            maxAmount={step.maxAmount}
            isIllegal={displayState.isIllegalState && step.remaining < 0}
            onEdit={() => setEditingStep(step.label)}
          />
        ))}

        {/* One-time expenses sidebar */}
        <div className="absolute right-4 top-4 bg-black border border-yellow-500 rounded p-4 w-48">
          <div className="terminal-yellow text-xs font-mono mb-2">ONE_TIME_EXPENSES:</div>
          {state.oneTimeExpenses.map((expense, index) => (
            <div key={index} className="flex justify-between text-xs font-mono mb-1">
              <span className="terminal-red">{expense.label}</span>
              <span className="terminal-red">{formatCurrency(expense.amount * 100)}</span>
            </div>
          ))}
        </div>

        {/* Preview overlay */}
        {state.pendingScenario && (
          <div className="absolute inset-0 bg-cyan-500 bg-opacity-10 border-2 border-cyan-500 border-dashed rounded-lg flex items-center justify-center">
            <div className="bg-black border border-cyan-500 p-4 rounded-lg">
              <div className="text-sm font-mono terminal-cyan animate-pulse">[SCENARIO_PREVIEW_ACTIVE]</div>
            </div>
          </div>
        )}
      </div>

      {editingStep && (
        <StepEditModal
          isOpen={!!editingStep}
          onClose={() => setEditingStep(null)}
          stepLabel={editingStep}
          currentAmount={displayState.flow.find((s) => s.label === editingStep)?.amount || 0}
        />
      )}
    </div>
  )
}
