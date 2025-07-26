"use client";

import { useState, useEffect, useRef } from "react";

interface AnimatedDollar {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  type: "investment" | "spend";
  speed: number;
}

interface ThroughlineDollar {
  id: string;
  x: number;
  y: number;
  progress: number;
  stepIndex: number;
}

interface StepData {
  name: string;
  value: number;
  outflows: Array<{
    name: string;
    value: number;
    type: "investment" | "spend";
    breakdown: { [key: string]: string | number };
  }>;
}

interface FlexCashFlowDataProps {
  state: any;
  scaleFactor: number;
  onUpdateBreakdown: (
    stepName: string,
    itemName: string,
    value: number
  ) => void;
}

export function FlexCashFlowData({
  state,
  scaleFactor,
  onUpdateBreakdown,
}: FlexCashFlowDataProps) {
  const [animatedDollars, setAnimatedDollars] = useState<AnimatedDollar[]>([]);
  const [throughlineDollars, setThroughlineDollars] = useState<
    ThroughlineDollar[]
  >([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  if (!state || !state.calculatedSteps) {
    return (
      <div className="terminal-yellow text-center font-mono">
        Loading flow data...
      </div>
    );
  }

  // Build rigid step structure
  const steps: StepData[] = [];

  // Add Monthly Income as first step with its outflows (from Total Income step)
  const monthlyIncomeOutflows: StepData["outflows"] = [];
  const totalIncomeStep = state.data.steps["Total Income"];
  if (totalIncomeStep?.outflow) {
    Object.entries(totalIncomeStep.outflow).forEach(
      ([outflowName, outflowData]) => {
        if (outflowData.breakdown) {
          const total = Object.values(outflowData.breakdown).reduce(
            (sum, val) => sum + Number(val),
            0
          );
          monthlyIncomeOutflows.push({
            name: outflowName,
            value: total,
            type: outflowData.type || "spend",
            breakdown: outflowData.breakdown,
          });
        }
      }
    );
  }

  steps.push({
    name: "Monthly Income",
    value: state.data.monthly_income,
    outflows: monthlyIncomeOutflows,
  });

  // Define the waterfall progression
  const stepOrder = ["Takehome", "Free Cash", "Net Income"];

  // Process each step in order
  stepOrder.forEach((stepName) => {
    const calculatedStep = state.calculatedSteps.find(
      (s) => s.name === stepName && s.type === "checkpoint"
    );
    if (!calculatedStep) return;

    const dataStep = state.data.steps[stepName];
    const outflows: StepData["outflows"] = [];

    if (dataStep?.outflow) {
      Object.entries(dataStep.outflow).forEach(([outflowName, outflowData]) => {
        if (outflowData.breakdown) {
          const total = Object.values(outflowData.breakdown).reduce(
            (sum, val) => sum + Number(val),
            0
          );
          outflows.push({
            name: outflowName,
            value: total,
            type: outflowData.type || "spend",
            breakdown: outflowData.breakdown,
          });
        }
      });
    }

    steps.push({
      name: stepName,
      value: calculatedStep.value,
      outflows,
    });
  });

  // Animation for dollar signs
  useEffect(() => {
    const animate = () => {
      setAnimatedDollars((prev) => {
        const updated = prev
          .map((dollar) => {
            return {
              ...dollar,
              progress: Math.min(dollar.progress + dollar.speed, 1),
              x: dollar.x + (dollar.targetX - dollar.x) * dollar.speed,
              y: dollar.y + (dollar.targetY - dollar.y) * dollar.speed,
            };
          })
          .filter((dollar) => dollar.progress < 1);

        // Add new dollars randomly
        if (Math.random() < 0.3 && containerRef.current) {
          const container = containerRef.current;
          const rect = container.getBoundingClientRect();

          steps.forEach((step, stepIndex) => {
            step.outflows.forEach((outflow) => {
              if (Math.random() < 0.4) {
                // Create dollar from step to breakdown
                const stepElement = container.querySelector(
                  `[data-step="${stepIndex}"]`
                );
                const breakdownElements = container.querySelectorAll(
                  `[data-outflow="${step.name}-${outflow.name}"]`
                );

                if (stepElement && breakdownElements.length > 0) {
                  const stepRect = stepElement.getBoundingClientRect();
                  const randomBreakdown =
                    breakdownElements[
                      Math.floor(Math.random() * breakdownElements.length)
                    ];
                  const breakdownRect = randomBreakdown.getBoundingClientRect();

                  // Calculate speed based on this specific outflow's value
                  let speed = 0.02;
                  if (outflow.value > 1000) speed = Math.min(0.08, 0.02 + (outflow.value / 10000));
                  else if (outflow.value > 500) speed = 0.04;

                  updated.push({
                    id: Math.random().toString(),
                    x: stepRect.right - rect.left,
                    y: stepRect.top + stepRect.height / 2 - rect.top,
                    targetX: breakdownRect.left - rect.left,
                    targetY:
                      breakdownRect.top + breakdownRect.height / 2 - rect.top,
                    progress: 0,
                    type: outflow.type,
                    speed: speed,
                  });
                }
              }
            });
          });
        }

        return updated;
      });

      // Animate throughline dollars
      setThroughlineDollars((prev) => {
        const updated = prev
          .map((dollar) => ({
            ...dollar,
            progress: Math.min(dollar.progress + 0.05, 1),
            x: dollar.x + 3, // Move 3px per frame
          }))
          .filter((dollar) => dollar.progress < 1 && dollar.x < 64); // Remove when off screen

        // Add new throughline dollars randomly
        if (Math.random() < 0.2) {
          steps.forEach((_, stepIndex) => {
            if (stepIndex < steps.length - 1 && Math.random() < 0.5) {
              updated.push({
                id: Math.random().toString(),
                x: 0,
                y: 20, // Center of throughline
                progress: 0,
                stepIndex,
              });
            }
          });
        }

        return updated;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [steps]);

  return (
    <>
      {/* Flexbox Layout */}
      <div className="relative overflow-x-auto" ref={containerRef}>
        {/* Animated Dollars */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {animatedDollars.map((dollar) => (
            <div
              key={dollar.id}
              className={`absolute text-lg font-mono font-bold ${
                dollar.type === "investment" ? "text-blue-400" : "text-red-400"
              }`}
              style={{
                left: `${dollar.x}px`,
                top: `${dollar.y}px`,
                opacity: 1 - dollar.progress * 0.7,
                transform: "translate(-50%, -50%)",
              }}
            >
              $
            </div>
          ))}
        </div>

        <div className="flex items-start justify-start min-w-max py-8">
          {steps.map((step, stepIndex) => {
            // Calculate the height needed for this step based on its value and outflows
            const stepHeight = Math.max(60, step.value / scaleFactor);

            return (
              <>
                <div
                  key={`step-${stepIndex}`}
                  className="flex items-center"
                  style={{ height: `${stepHeight}px` }}
                >
                  {/* Step Container */}
                  <div className="flex flex-col items-center relative">
                    {/* Step Box */}
                    <div
                      className="bg-green-900 border-2 border-green-400 rounded-lg flex items-center justify-center min-w-[120px] relative z-10"
                      style={{
                        height: `${Math.max(60, step.value / scaleFactor)}px`,
                      }}
                      data-step={stepIndex}
                    >
                      <div className="text-center">
                        <div className="text-white text-sm font-mono font-bold mb-1">
                          {step.name}
                        </div>
                        <div className="text-green-400 text-xs font-mono">
                          <span>$</span>
                          {step.value.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                {/* Outflows */}
                {step.outflows.length > 0 && (
                  <div className="flex flex-col h-full">
                    {(() => {
                      const investments = step.outflows.filter(o => o.type === "investment");
                      const spending = step.outflows.filter(o => o.type === "spend");
                      
                      return (
                        <>
                          {/* Investment section (or placeholder) */}
                          {investments.length > 0 ? (
                            investments.map((outflow, outflowIndex) => (
                              <div
                                key={`outflow-investment-${stepIndex}-${outflowIndex}`}
                                className="flex items-center justify-center space-x-4 flex-1"
                              >
                                {/* Category Label */}
                                <div className="text-sm font-mono font-bold w-[100px] text-right text-blue-300">
                                  <div className="break-words">{outflow.name}</div>
                                  <div className="text-xs font-mono opacity-75">
                                    <span>$</span>
                                    {outflow.value.toLocaleString()}
                                  </div>
                                </div>

                                {/* Breakdown Boxes */}
                                <div className="flex flex-col space-y-2">
                                  {Object.entries(outflow.breakdown).map(
                                    (
                                      [breakdownName, breakdownValue],
                                      breakdownIndex
                                    ) => {
                                      const height = Math.max(
                                        20,
                                        Number(breakdownValue) / scaleFactor
                                      );
                                      
                                      return (
                                        <div className="flex items-center" key={`breakdown-investment-${stepIndex}-${outflowIndex}-${breakdownIndex}`}>
                                          <div
                                            className="bg-blue-800 border-blue-300 border rounded flex items-center justify-center min-w-[80px] relative group"
                                            style={{ height: `${height}px` }}
                                            data-outflow={`${step.name}-${outflow.name}`}
                                          ></div>
                                          {/* Breakdown content */}
                                          <div className="px-2 flex flex-col">
                                            <div className="text-blue-200 text-xs font-mono">
                                              <span>$</span>
                                              {Number(breakdownValue).toLocaleString()}
                                            </div>
                                            <div className="text-white text-xs font-mono font-bold truncate">
                                              {breakdownName}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="flex-1"></div>
                          )}
                          
                          {/* Spending section */}
                          {spending.map((outflow, outflowIndex) => (
                            <div
                              key={`outflow-spend-${stepIndex}-${outflowIndex}`}
                              className="flex items-center justify-center space-x-4 flex-1"
                            >
                              {/* Category Label */}
                              <div className="text-sm font-mono font-bold w-[100px] text-right text-red-300">
                                <div className="break-words">{outflow.name}</div>
                                <div className="text-xs font-mono opacity-75">
                                  <span>$</span>
                                  {outflow.value.toLocaleString()}
                                </div>
                              </div>

                              {/* Breakdown Boxes */}
                              <div className="flex flex-col space-y-2">
                                {Object.entries(outflow.breakdown).map(
                                  (
                                    [breakdownName, breakdownValue],
                                    breakdownIndex
                                  ) => {
                                    const height = Math.max(
                                      20,
                                      Number(breakdownValue) / scaleFactor
                                    );
                                    
                                    return (
                                      <div className="flex items-center" key={`breakdown-spend-${stepIndex}-${outflowIndex}-${breakdownIndex}`}>
                                        <div
                                          className="bg-red-800 border-red-300 border rounded flex items-center justify-center min-w-[80px] relative group"
                                          style={{ height: `${height}px` }}
                                          data-outflow={`${step.name}-${outflow.name}`}
                                        ></div>
                                        {/* Breakdown content */}
                                        <div className="px-2 flex flex-col">
                                          <div className="text-red-200 text-xs font-mono">
                                            <span>$</span>
                                            {Number(breakdownValue).toLocaleString()}
                                          </div>
                                          <div className="text-white text-xs font-mono font-bold truncate">
                                            {breakdownName}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                )}
                </div>

                {/* Throughline between steps */}
                {stepIndex < steps.length - 1 && (
                  <div className="flex items-center justify-center w-16" style={{ height: `${stepHeight}px` }}>
                    <div className="w-full h-10 bg-green-400 bg-opacity-30 overflow-hidden relative">
                      {throughlineDollars
                        .filter((dollar) => dollar.stepIndex === stepIndex)
                        .map((dollar) => (
                          <div
                            key={dollar.id}
                            className="absolute text-sm font-mono font-bold text-green-400"
                            style={{
                              left: `${dollar.x}px`,
                              top: `${dollar.y}px`,
                              opacity: 0.8,
                              transform: "translate(-50%, -50%)",
                            }}
                          >
                            $
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            );
          })}
        </div>
      </div>

      {/* Editable breakdown panels */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        {steps.map((step, stepIndex) =>
          step.outflows.map((outflow) => (
            <div
              key={`${step.name}-${outflow.name}`}
              className="border border-gray-600 rounded p-3 bg-gray-800"
            >
              <div
                className={`text-sm font-mono font-bold mb-2 ${
                  outflow.type === "investment"
                    ? "text-blue-400"
                    : "text-red-400"
                }`}
              >
                {outflow.name} - <span>$</span>
                {outflow.value.toLocaleString()}
              </div>
              <div className="space-y-1">
                {Object.entries(outflow.breakdown).map(([item, amount]) => (
                  <div
                    key={item}
                    className="flex items-center justify-between text-xs font-mono text-gray-400"
                  >
                    <span>{item}</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={typeof amount === "number" ? amount : amount}
                        onChange={(e) =>
                          onUpdateBreakdown(
                            outflow.name,
                            item,
                            Number(e.target.value)
                          )
                        }
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
    </>
  );
}
