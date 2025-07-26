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
          .map((dollar) => ({
            ...dollar,
            progress: Math.min(dollar.progress + 0.02, 1),
            x: dollar.x + (dollar.targetX - dollar.x) * 0.02,
            y: dollar.y + (dollar.targetY - dollar.y) * 0.02,
          }))
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

                  updated.push({
                    id: Math.random().toString(),
                    x: stepRect.right - rect.left,
                    y: stepRect.top + stepRect.height / 2 - rect.top,
                    targetX: breakdownRect.left - rect.left,
                    targetY:
                      breakdownRect.top + breakdownRect.height / 2 - rect.top,
                    progress: 0,
                    type: outflow.type,
                  });
                }
              }
            });
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

        <div className="flex items-center justify-start min-w-max ">
          {steps.map((step, stepIndex) => (
            <div key={`step-${stepIndex}`} className="flex items-center ">
              {/* Step Container */}
              <div className="flex flex-col items-center relative">
                {/* Throughline to next step */}
                {stepIndex < steps.length - 1 && (
                  <div className="absolute left-full top-1/2 w-16 h-0.5 bg-green-400 transform -translate-y-1/2 z-0"></div>
                )}

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
                <div className="flex flex-col">
                  {step.outflows.map((outflow, outflowIndex) => (
                    <div
                      key={`outflow-${stepIndex}-${outflowIndex}`}
                      className="flex items-center space-x-4"
                    >
                      {/* Category Label */}
                      <div
                        className={`text-sm font-mono font-bold w-[100px] text-right ${
                          outflow.type === "investment"
                            ? "text-blue-300"
                            : "text-red-300"
                        }`}
                      >
                        <div className="break-words">{outflow.name}</div>
                        <div className="text-xs font-mono opacity-75">
                          <span>$</span>
                          {outflow.value.toLocaleString()}
                        </div>
                      </div>

                      {/* Breakdown Boxes */}
                      <div className="flex flex-col space-y-2">
                        {Object.entries(outflow.breakdown).map(
                          ([breakdownName, breakdownValue], breakdownIndex) => {
                            const height = Math.max(
                              20,
                              Number(breakdownValue) / scaleFactor
                            );
                            const bgColor =
                              outflow.type === "investment"
                                ? "bg-blue-800"
                                : "bg-red-800";
                            const borderColor =
                              outflow.type === "investment"
                                ? "border-blue-300"
                                : "border-red-300";
                            const textColor =
                              outflow.type === "investment"
                                ? "text-blue-200"
                                : "text-red-200";

                            return (
                              <div className="flex items-center ">
                                <div
                                  key={`breakdown-${stepIndex}-${outflowIndex}-${breakdownIndex}`}
                                  className={`${bgColor} ${borderColor} border rounded flex items-center justify-center min-w-[80px] relative group`}
                                  style={{ height: `${height}px` }}
                                  data-outflow={`${step.name}-${outflow.name}`}
                                ></div>
                                {/* Breakdown content */}
                                <div className=" px-2 flex flex-col">
                                  <div
                                    className={`${textColor} text-xs font-mono`}
                                  >
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
                </div>
              )}

              {/* Flow Arrow to Next Step */}
              {stepIndex < steps.length - 1 && (
                <div className="flex items-center justify-center text-green-400 text-2xl font-mono">
                  →
                </div>
              )}
            </div>
          ))}
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
