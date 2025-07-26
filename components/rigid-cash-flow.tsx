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
  const svgWidth = 1600
  const svgHeight = 700
  const stepWidth = 120
  const outflowWidth = 100
  const stepSpacing = 300
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
        
        // Add new dollars for outflows
        if (Math.random() < 0.4) {
          steps.forEach((step, stepIndex) => {
            if (step.outflows.length > 0 && Math.random() < 0.3) {
              const stepX = stepIndex * stepSpacing + 50
              const outflowX = stepX + stepWidth + 30
              
              step.outflows.forEach((outflow, outflowIndex) => {
                if (Math.random() < 0.5) {
                  const outflowHeight = Math.max(20, outflow.value / scaleFactor)
                  // Calculate proper Y position using same logic as render
                  const totalOutflowHeight = step.outflows.reduce((sum, o) => sum + Math.max(20, o.value / scaleFactor), 0)
                  const spacing = Math.max(10, (svgHeight * 0.4 - totalOutflowHeight) / Math.max(1, step.outflows.length - 1))
                  let currentY = centerY - totalOutflowHeight / 2
                  for (let i = 0; i < outflowIndex; i++) {
                    currentY += Math.max(20, step.outflows[i].value / scaleFactor) + spacing
                  }
                  const outflowY = currentY
                  
                  updated.push({
                    id: Math.random().toString(),
                    x: stepX + stepWidth,
                    y: centerY,
                    targetX: outflowX + outflowWidth,
                    targetY: outflowY + outflowHeight / 2,
                    progress: 0,
                    type: "outflow"
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
              const currentStepX = stepIndex * stepSpacing + 50
              const nextStepIndex = stepIndex + 1
              const nextStepX = nextStepIndex * stepSpacing + 50
              const outflowCount = step.outflows.length
             
              updated.push({
                id: Math.random().toString(),
                x: currentStepX + stepWidth + outflowWidth + 60,
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
            
            const currentX = stepIndex * stepSpacing + 50 + stepWidth
            const outflowWidth = step.outflows.length > 0 ? 100 + 30 : 0
            const nextX = (stepIndex + 1) * stepSpacing + 50
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
          
          {/* Outflow lines */}
          {steps.map((step, stepIndex) => {
            const stepX = stepIndex * stepSpacing + 50
            
            return step.outflows.map((outflow, outflowIndex) => {
              const outflowHeight = Math.max(20, outflow.value / scaleFactor)
              // Calculate proper Y position using same logic as render
              const totalOutflowHeight = step.outflows.reduce((sum, o) => sum + Math.max(20, o.value / scaleFactor), 0)
              const spacing = Math.max(10, (svgHeight * 0.4 - totalOutflowHeight) / Math.max(1, step.outflows.length - 1))
              let currentY = centerY - totalOutflowHeight / 2
              for (let i = 0; i < outflowIndex; i++) {
                currentY += Math.max(20, step.outflows[i].value / scaleFactor) + spacing
              }
              const outflowY = currentY
              const strokeWidth = Math.max(2, (outflow.value / 1000) * 6)
              const color = outflow.type === "investment" ? "#3b82f6" : "#ef4444"
              
              return (
                <CurvedPath
                  key={`outflow-${stepIndex}-${outflowIndex}`}
                  x1={stepX + stepWidth}
                  y1={centerY}
                  x2={stepX + stepWidth + 30}
                  y2={outflowY + outflowHeight / 2}
                  strokeWidth={strokeWidth}
                  color={color}
                />
              )
            })
          })}
          
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
            const stepX = stepIndex * stepSpacing + 50
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
                  x={stepX + stepWidth + 10}
                  y={centerY - 8}
                  className="fill-white text-sm font-mono font-bold"
                >
                  {step.name}
                </text>
                <text
                  x={stepX + stepWidth + 10}
                  y={centerY + 8}
                  className="fill-green-400 text-sm font-mono"
                >
                  ${step.value.toLocaleString()}
                </text>
              </g>
            )
          })}
          
          {/* Outflow boxes */}
          {steps.map((step, stepIndex) => {
            const stepX = stepIndex * stepSpacing + 50
            
            return step.outflows.map((outflow, outflowIndex) => {
              const outflowX = stepX + stepWidth + 30
              const outflowHeight = Math.max(20, outflow.value / scaleFactor) // Height = dollars / scaleFactor
              // Better spacing for outflows to prevent overlap
              const totalOutflowHeight = step.outflows.reduce((sum, o) => sum + Math.max(20, o.value / scaleFactor), 0)
              const spacing = Math.max(10, (svgHeight * 0.4 - totalOutflowHeight) / Math.max(1, step.outflows.length - 1))
              let currentY = centerY - totalOutflowHeight / 2
              for (let i = 0; i < outflowIndex; i++) {
                currentY += Math.max(20, step.outflows[i].value / scaleFactor) + spacing
              }
              const outflowY = currentY
              const bgColor = outflow.type === "investment" ? "fill-blue-900" : "fill-red-900"
              const strokeColor = outflow.type === "investment" ? "stroke-blue-400" : "stroke-red-400"
              const textColor = outflow.type === "investment" ? "fill-blue-300" : "fill-red-300"
              
              return (
                <g key={`outflow-${stepIndex}-${outflowIndex}`}>
                  <rect
                    x={outflowX}
                    y={outflowY}
                    width={outflowWidth}
                    height={outflowHeight}
                    rx={4}
                    className={`${bgColor} ${strokeColor} stroke-2`}
                  />
                  <text
                    x={outflowX + outflowWidth + 10}
                    y={outflowY + outflowHeight / 2 - 5}
                    className="fill-white text-sm font-mono font-bold"
                  >
                    {outflow.name}
                  </text>
                  <text
                    x={outflowX + outflowWidth + 10}
                    y={outflowY + outflowHeight / 2 + 8}
                    className={`${textColor} text-sm font-mono`}
                  >
                    -${outflow.value.toLocaleString()}
                  </text>
                </g>
              )
            })
          })}
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