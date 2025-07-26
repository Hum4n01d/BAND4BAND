"use client"

import { useMemo, useState } from "react"
import { useFinancial } from "@/contexts/financial-context"
import { formatCurrency } from "@/lib/financial-calculator"
import { StepEditModal } from "./step-edit-modal"
import type { CalculatedStep } from "@/types/financial"

interface HierarchicalStepProps {
  step: CalculatedStep
  x: number
  y: number
  width: number
  maxAmount: number
  isIllegal?: boolean
  onEdit: () => void
}

function HierarchicalStep({ step, x, y, width, maxAmount, isIllegal, onEdit }: HierarchicalStepProps) {
  const [isHovered, setIsHovered] = useState(false)

  const getStepColor = () => {
    if (step.type === "income") return "#00ff41" // Green for income
    if (step.type === "checkpoint") return "#00ffff" // Cyan for checkpoints
    if (step.name.includes("Tax") || step.name.includes("Deduction")) return "#ff073a" // Red for taxes
    return "#ff8c00" // Orange for other deductions
  }

  const getTextColor = () => {
    if (step.type === "income") return "terminal-green"
    if (step.type === "checkpoint") return "terminal-cyan"
    return "terminal-red"
  }

  // Calculate proportional height based on amount
  const proportionalHeight = Math.max(50, (step.value / maxAmount) * 400)
  const indentOffset = step.level * 40 // Indent based on hierarchy level

  return (
    <div
      className={`absolute cursor-pointer transition-all duration-200 ${
        isHovered ? "glow-green" : ""
      } ${isIllegal ? "glow-red" : ""}`}
      style={{
        left: x + indentOffset,
        top: y - proportionalHeight + 80,
        width: width - indentOffset,
        height: proportionalHeight,
        backgroundColor: "#1a1a1a",
        border: `2px solid ${isHovered ? "#00ff41" : getStepColor()}`,
        borderRadius: "4px",
      }}
      onClick={onEdit}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-3 h-full flex flex-col justify-center text-white text-xs font-mono overflow-hidden">
        <div className={`truncate font-semibold ${getTextColor()} mb-1`}>{step.name}</div>
        <div className="text-white font-bold mb-1">{formatCurrency(step.value)}</div>

        {step.type === "checkpoint" && (
          <div className="terminal-green text-xs mb-2">Remaining: {formatCurrency(step.remaining)}</div>
        )}

        {step.breakdown && (
          <div className="text-xs space-y-0.5 max-h-32 overflow-y-auto">
            {Object.entries(step.breakdown).map(([key, value]) => (
              <div key={key} className="flex justify-between terminal-yellow">
                <span className="truncate mr-1">{key}:</span>
                <span>{formatCurrency(Number(value))}</span>
              </div>
            ))}
          </div>
        )}

        {isIllegal && step.remaining < 0 && <div className="terminal-red text-xs mt-1 animate-pulse">[DEFICIT]</div>}
      </div>
    </div>
  )
}

interface DollarFlowLineProps {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  dashed?: boolean
}

function DollarFlowLine({ x1, y1, x2, y2, color, dashed }: DollarFlowLineProps) {
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

export function HierarchicalSankey() {
  const { state } = useFinancial()
  const [editingStep, setEditingStep] = useState<string | null>(null)

  const layout = useMemo(() => {
    const width = 1600
    const height = 700
    const stepWidth = 180
    const stepSpacing = 200

    const displayState = state.pendingScenario?.previewState || state
    const maxAmount = Math.max(...displayState.calculatedSteps.map((step) => step.value))

    const steps = displayState.calculatedSteps.map((step, index) => {
      const x = index * stepSpacing + 50
      const y = height - 100

      return {
        ...step,
        x,
        y,
        width: stepWidth,
        maxAmount,
      }
    })

    // Create flow lines between main steps (level 0 only)
    const flows = []
    const mainSteps = steps.filter((step) => step.level === 0)

    for (let i = 0; i < mainSteps.length - 1; i++) {
      const currentStep = mainSteps[i]
      const nextStep = mainSteps[i + 1]

      const x1 = currentStep.x + currentStep.width
      const y1 = currentStep.y - (currentStep.value / maxAmount) * 400 + 40
      const x2 = nextStep.x
      const y2 = nextStep.y - (nextStep.value / maxAmount) * 400 + 40

      flows.push({
        x1,
        y1,
        x2,
        y2,
        color: currentStep.type === "checkpoint" ? "#00ffff" : "#00ff41",
        dashed: currentStep.remaining < 0,
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
          <div className="terminal-green text-sm font-mono">HIERARCHICAL_CASH_FLOW_v4.0</div>
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
          />
        ))}

        {/* Render steps */}
        {layout.steps.map((step, index) => (
          <HierarchicalStep
            key={index}
            step={step}
            x={step.x}
            y={step.y}
            width={step.width}
            maxAmount={step.maxAmount}
            isIllegal={displayState.isIllegalState && step.remaining < 0}
            onEdit={() => setEditingStep(step.name)}
          />
        ))}

        {/* One-time expenses sidebar */}
        <div className="absolute right-4 top-4 bg-black border border-yellow-500 rounded p-4 w-64">
          <div className="terminal-yellow text-xs font-mono mb-3">ONE_TIME_EXPENSES:</div>
          <div className="space-y-2">
            {Object.entries(state.data.one_time_spend.breakdown).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs font-mono">
                <span className="terminal-red">{key}</span>
                <span className="terminal-red">{formatCurrency(Number(value))}</span>
              </div>
            ))}
            <div className="border-t border-yellow-500 pt-2 mt-2">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="terminal-yellow">TOTAL:</span>
                <span className="terminal-yellow">{formatCurrency(Number(state.data.one_time_spend.value))}</span>
              </div>
            </div>
          </div>
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
          stepName={editingStep}
          step={displayState.calculatedSteps.find((s) => s.name === editingStep)}
        />
      )}
    </div>
  )
}
