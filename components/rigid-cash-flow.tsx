"use client"

import { useFinancial } from "@/contexts/financial-context"
import { useState, useRef, useEffect } from "react"

interface AnimatedDollar {
  id: string
  x: number
  y: number
  targetX: number
  targetY: number
  progress: number
  type: "outflow" | "flow"
}

interface StepData {
  name: string
  value: number
  outflows: Array<{
    name: string
    value: number
    type: "investment" | "spend"
    breakdown: { [key: string]: string | number }
  }>
}

function CurvedPath({ x1, y1, x2, y2, strokeWidth, color }: {
  x1: number, y1: number, x2: number, y2: number, strokeWidth: number, color: string
}) {
  const controlX = x1 + (x2 - x1) * 0.6
  const path = `M ${x1} ${y1} Q ${controlX} ${y1} ${x2} ${y2}`
  
  return (
    <path
      d={path}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      opacity={0.7}
      className="transition-all duration-300"
    />
  )
}

export function RigidCashFlow() {
  const { state, dispatch } = useFinancial()
  const svgRef = useRef<SVGSVGElement>(null)
  const [animatedDollars, setAnimatedDollars] = useState<AnimatedDollar[]>([])
  const [scaleFactor, setScaleFactor] = useState(15)
  const animationRef = useRef<number>()

  if (!state || !state.calculatedSteps) {
    return (
      <div className="border-2 border-green-500 rounded-lg p-6 bg-black">
        <div className="terminal-yellow text-center font-mono">Loading flow data...</div>
      </div>
    )
  }

  // Build rigid step structure
  const steps: StepData[] = []
  
  // Add Monthly Income as first step with its outflows (from Total Income step)
  const monthlyIncomeOutflows: StepData['outflows'] = []
  const totalIncomeStep = state.data.steps["Total Income"]
  if (totalIncomeStep?.outflow) {
    Object.entries(totalIncomeStep.outflow).forEach(([outflowName, outflowData]) => {
      if (outflowData.breakdown) {
        const total = Object.values(outflowData.breakdown).reduce((sum, val) => sum + Number(val), 0)
        monthlyIncomeOutflows.push({
          name: outflowName,
          value: total,
          type: outflowData.type || "spend",
          breakdown: outflowData.breakdown
        })
      }
    })
  }
  
  steps.push({
    name: "Monthly Income",
    value: state.data.monthly_income,
    outflows: monthlyIncomeOutflows
  })
  
  // Define the waterfall progression 
  const stepOrder = ["Takehome", "Free Cash", "Net Income"]
  
  // Process each step in order
  stepOrder.forEach(stepName => {
    const calculatedStep = state.calculatedSteps.find(s => s.name === stepName && s.type === "checkpoint")
    if (!calculatedStep) return
    
    const dataStep = state.data.steps[stepName]
    const outflows: StepData['outflows'] = []
    
    if (dataStep?.outflow) {
      Object.entries(dataStep.outflow).forEach(([outflowName, outflowData]) => {
        if (outflowData.breakdown) {
          const total = Object.values(outflowData.breakdown).reduce((sum, val) => sum + Number(val), 0)
          outflows.push({
            name: outflowName,
            value: total,
            type: outflowData.type || "spend",
            breakdown: outflowData.breakdown
          })
        }
      })
    }
    
    steps.push({
      name: stepName,
      value: calculatedStep.value,
      outflows
    })
  })

  // Layout constants
  const svgWidth = 2400
  const svgHeight = 1000
  const stepWidth = 120
  const outflowWidth = 100
  const breakdownWidth = 80
  const stepSpacing = 500  // Much more space between steps
  const startX = 150       // Shift everything to the right
  const centerY = svgHeight / 2

  // Animate dollar signs
  useEffect(() => {
    const animate = () => {
      setAnimatedDollars(prev => {
        const updated = prev.map(dollar => ({
          ...dollar,
          progress: Math.min(dollar.progress + 0.015, 1),
          x: dollar.x + (dollar.targetX - dollar.x) * 0.015,
          y: dollar.y + (dollar.targetY - dollar.y) * 0.015
        })).filter(dollar => dollar.progress < 1)
        
        // Add new dollars for breakdown boxes
        if (Math.random() < 0.3) {
          steps.forEach((step, stepIndex) => {
            if (step.outflows.length > 0 && Math.random() < 0.4) {
              const stepX = stepIndex * stepSpacing + startX
              
              step.outflows.forEach((outflow, outflowIndex) => {
                if (outflow.breakdown && Math.random() < 0.5) {
                  const breakdownEntries = Object.entries(outflow.breakdown)
                  breakdownEntries.forEach(([breakdownName, breakdownValue], breakdownIndex) => {
                    if (Math.random() < 0.6) {
                      const breakdownX = stepX + stepWidth + 250
                      const breakdownHeight = Math.max(15, Number(breakdownValue) / scaleFactor)
                      
                      // Calculate Y position using same logic as render
                      const totalBreakdownHeight = breakdownEntries.reduce((sum, [, val]) => sum + Math.max(15, Number(val) / scaleFactor), 0)
                      const outflowGroupSpacing = 180
                      let outflowGroupY = centerY - (step.outflows.length - 1) * outflowGroupSpacing / 2 + outflowIndex * outflowGroupSpacing - totalBreakdownHeight / 2
                      const breakdownY = outflowGroupY + breakdownIndex * (breakdownHeight + 10)
                      
                      updated.push({
                        id: Math.random().toString(),
                        x: stepX + stepWidth,
                        y: centerY,
                        targetX: breakdownX + breakdownWidth,
                        targetY: breakdownY + breakdownHeight / 2,
                        progress: 0,
                        type: outflow.type === "investment" ? "flow" : "outflow"
                      })
                    }
                  })
                }
              })
            }
          })
        }
        
        // Add flow dollars between steps
        if (Math.random() < 0.2) {
          steps.forEach((step, stepIndex) => {
            if (stepIndex < steps.length - 1 && Math.random() < 0.4) {
              const currentStepX = stepIndex * stepSpacing + startX
              const nextStepIndex = stepIndex + 1
              const nextStepX = nextStepIndex * stepSpacing + startX
              const outflowWidth = step.outflows.length > 0 ? 250 : 0
             
              updated.push({
                id: Math.random().toString(),
                x: currentStepX + stepWidth + outflowWidth + 80,
                y: centerY,
                targetX: nextStepX,
                targetY: centerY,
                progress: 0,
                type: "flow"
              })
            }
          })
        }
        
        return updated
      })
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [steps])

  const handleUpdateBreakdown = (stepName: string, itemName: string, value: number) => {
    dispatch({
      type: "UPDATE_BREAKDOWN_ITEM",
      stepName,
      itemName,
      value
    })
  }

  return (
    <div className="border-2 border-green-500 rounded-lg p-6 bg-black">
      <div className="terminal-green text-xl font-mono font-bold mb-4 text-center">
        RIGID CASH FLOW WATERFALL
      </div>
      
      {/* Scale Factor Slider */}
      <div className="mb-4 flex items-center justify-center space-x-4">
        <span className="terminal-cyan text-sm font-mono">Scale:</span>
        <input
          type="range"
          min="5"
          max="50"
          step="1"
          value={scaleFactor}
          onChange={(e) => setScaleFactor(Number(e.target.value))}
          className="w-32 accent-green-500"
        />
        <span className="terminal-green text-sm font-mono">1:{scaleFactor}</span>
      </div>
      
      {/* Legend */}
      <div className="mb-4 flex items-center justify-center space-x-8">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-900 border-2 border-green-400 rounded"></div>
          <span className="terminal-green text-xs font-mono">Income Checkpoints</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-800 border border-blue-300 rounded"></div>
          <span className="text-blue-300 text-xs font-mono">Investments</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-800 border border-red-300 rounded"></div>
          <span className="text-red-300 text-xs font-mono">Spending</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-blue-400 text-xs font-mono">$</span>
          <span className="text-blue-300 text-xs font-mono">Investment Flow</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-red-400 text-xs font-mono">$</span>
          <span className="text-red-300 text-xs font-mono">Spending Flow</span>
        </div>
      </div>
      
      <div className="relative overflow-x-auto">
        <svg
          ref={svgRef}
          width={svgWidth}
          height={svgHeight}
          className="border border-green-400 rounded bg-gray-900"
        >
          {/* Flow lines between steps */}
          {steps.map((step, stepIndex) => {
            if (stepIndex >= steps.length - 1) return null
            
            const currentX = stepIndex * stepSpacing + startX + stepWidth
            const outflowWidth = step.outflows.length > 0 ? 250 : 0  // Account for breakdown space
            const nextX = (stepIndex + 1) * stepSpacing + startX
            const strokeWidth = Math.max(3, (step.value / 2000) * 8)
            
            return (
              <CurvedPath
                key={`flow-${stepIndex}`}
                x1={currentX + outflowWidth}
                y1={centerY}
                x2={nextX}
                y2={centerY}
                strokeWidth={strokeWidth}
                color="#22c55e"
              />
            )
          })}
          
          {/* Direct lines to breakdown boxes */}
          {steps.map((step, stepIndex) => {
            const stepX = stepIndex * stepSpacing + startX
            
            return step.outflows.map((outflow, outflowIndex) => {
              if (!outflow.breakdown) return null
              
              const breakdownEntries = Object.entries(outflow.breakdown)
              // Calculate total height for this outflow's breakdowns
              const totalBreakdownHeight = breakdownEntries.reduce((sum, [, val]) => sum + Math.max(15, Number(val) / scaleFactor), 0)
              const totalSpacingHeight = (breakdownEntries.length - 1) * 10
              const totalOutflowGroupHeight = totalBreakdownHeight + totalSpacingHeight
              
              // Calculate starting Y for this outflow group
              const outflowGroupSpacing = 180  // Much more vertical space
              let outflowGroupY = centerY - (step.outflows.length - 1) * outflowGroupSpacing / 2 + outflowIndex * outflowGroupSpacing - totalOutflowGroupHeight / 2
              
              return breakdownEntries.map(([breakdownName, breakdownValue], breakdownIndex) => {
                const breakdownX = stepX + stepWidth + 250
                const breakdownHeight = Math.max(15, Number(breakdownValue) / scaleFactor)
                const breakdownY = outflowGroupY + breakdownIndex * (breakdownHeight + 10)
                const strokeWidth = Math.max(1, Number(breakdownValue) / 500)
                const color = outflow.type === "investment" ? "#3b82f6" : "#ef4444"
                
                return (
                  <CurvedPath
                    key={`breakdown-line-${stepIndex}-${outflowIndex}-${breakdownIndex}`}
                    x1={stepX + stepWidth}
                    y1={centerY}
                    x2={breakdownX}
                    y2={breakdownY + breakdownHeight / 2}
                    strokeWidth={strokeWidth}
                    color={color}
                  />
                )
              })
            }).flat()
          }).flat()}
          
          {/* Animated dollars */}
          {animatedDollars.map(dollar => (
            <text
              key={dollar.id}
              x={dollar.x}
              y={dollar.y}
              className={`text-sm font-mono font-bold ${
                dollar.type === "outflow" ? "fill-red-400" : "fill-green-400"
              }`}
              opacity={1 - dollar.progress * 0.8}
            >
              $
            </text>
          ))}
          
          {/* Step nodes */}
          {steps.map((step, stepIndex) => {
            const stepX = stepIndex * stepSpacing + startX
            const height = Math.max(30, step.value / scaleFactor) // Height = dollars / scaleFactor
            
            return (
              <g key={`step-${stepIndex}`}>
                <rect
                  x={stepX}
                  y={centerY - height / 2}
                  width={stepWidth}
                  height={height}
                  rx={6}
                  className="fill-green-900 stroke-green-400 stroke-2"
                />
                <text
                  x={stepX - 10}
                  y={centerY - 8}
                  textAnchor="end"
                  className="fill-white text-sm font-mono font-bold"
                >
                  {step.name}
                </text>
                <text
                  x={stepX - 10}
                  y={centerY + 8}
                  textAnchor="end"
                  className="fill-green-400 text-sm font-mono"
                >
                  ${step.value.toLocaleString()}
                </text>
              </g>
            )
          })}
          
          
          {/* Breakdown boxes with category labels */}
          {steps.map((step, stepIndex) => {
            const stepX = stepIndex * stepSpacing + startX
            
            return step.outflows.map((outflow, outflowIndex) => {
              if (!outflow.breakdown) return null
              
              const breakdownEntries = Object.entries(outflow.breakdown)
              // Calculate total height for this outflow's breakdowns
              const totalBreakdownHeight = breakdownEntries.reduce((sum, [, val]) => sum + Math.max(15, Number(val) / scaleFactor), 0)
              const totalSpacingHeight = (breakdownEntries.length - 1) * 10
              const totalOutflowGroupHeight = totalBreakdownHeight + totalSpacingHeight
              
              // Calculate starting Y for this outflow group
              const outflowGroupSpacing = 180  // Much more vertical space
              let outflowGroupY = centerY - (step.outflows.length - 1) * outflowGroupSpacing / 2 + outflowIndex * outflowGroupSpacing - totalOutflowGroupHeight / 2
              
              const bgColor = outflow.type === "investment" ? "fill-blue-800" : "fill-red-800"
              const strokeColor = outflow.type === "investment" ? "stroke-blue-300" : "stroke-red-300"
              const textColor = outflow.type === "investment" ? "fill-blue-200" : "fill-red-200"
              
              return [
                // Category label on the left
                <g key={`category-${stepIndex}-${outflowIndex}`}>
                  <text
                    x={stepX + stepWidth + 220}
                    y={outflowGroupY + totalOutflowGroupHeight / 2}
                    textAnchor="end"
                    className={`${textColor} text-sm font-mono font-bold`}
                  >
                    {outflow.name}
                  </text>
                </g>,
                // Breakdown boxes
                ...breakdownEntries.map(([breakdownName, breakdownValue], breakdownIndex) => {
                  const breakdownX = stepX + stepWidth + 250
                  const breakdownHeight = Math.max(15, Number(breakdownValue) / scaleFactor)
                  const breakdownY = outflowGroupY + breakdownIndex * (breakdownHeight + 10)
                  
                  return (
                    <g key={`breakdown-${stepIndex}-${outflowIndex}-${breakdownIndex}`}>
                      <rect
                        x={breakdownX}
                        y={breakdownY}
                        width={breakdownWidth}
                        height={breakdownHeight}
                        rx={3}
                        className={`${bgColor} ${strokeColor} stroke-1`}
                      />
                      <text
                        x={breakdownX + breakdownWidth + 8}
                        y={breakdownY + breakdownHeight / 2 - 3}
                        className="fill-white text-xs font-mono font-bold"
                      >
                        {breakdownName}
                      </text>
                      <text
                        x={breakdownX + breakdownWidth + 8}
                        y={breakdownY + breakdownHeight / 2 + 8}
                        className={`${textColor} text-xs font-mono`}
                      >
                        ${Number(breakdownValue).toLocaleString()}
                      </text>
                    </g>
                  )
                })
              ]
            }).flat()
          }).flat()}
        </svg>
        
        {/* Editable breakdown panels */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          {steps.map((step, stepIndex) => 
            step.outflows.map(outflow => (
              <div key={`${step.name}-${outflow.name}`} className="border border-gray-600 rounded p-3 bg-gray-800">
                <div className={`text-sm font-mono font-bold mb-2 ${
                  outflow.type === "investment" ? "text-blue-400" : "text-red-400"
                }`}>
                  {outflow.name}
                </div>
                <div className="space-y-1">
                  {Object.entries(outflow.breakdown).map(([item, amount]) => (
                    <div key={item} className="flex items-center justify-between text-xs font-mono text-gray-400">
                      <span>{item}</span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={typeof amount === 'number' ? amount : amount}
                          onChange={(e) => handleUpdateBreakdown(outflow.name, item, Number(e.target.value))}
                          className="w-16 bg-gray-700 border border-gray-600 rounded px-1 py-0 text-right text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}