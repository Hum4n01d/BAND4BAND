"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { useFinancial } from "@/contexts/financial-context"
import { formatCurrency } from "@/lib/financial-calculator"

interface NodeEditModalProps {
  isOpen: boolean
  onClose: () => void
  nodeId: string
  currentValue: number
  label: string
}

export function NodeEditModal({ isOpen, onClose, nodeId, currentValue, label }: NodeEditModalProps) {
  const { dispatch } = useFinancial()
  const [value, setValue] = useState(currentValue)
  const [inputValue, setInputValue] = useState((currentValue / 100).toString())

  const maxValue = currentValue * 2 // Max is 2x current value

  useEffect(() => {
    if (isOpen) {
      setValue(currentValue)
      setInputValue((currentValue / 100).toString())
    }
  }, [isOpen, currentValue])

  const handleSliderChange = (newValue: number[]) => {
    const val = newValue[0]
    setValue(val)
    setInputValue((val / 100).toString())
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value
    setInputValue(inputVal)

    const numVal = Number.parseFloat(inputVal) * 100
    if (!isNaN(numVal) && numVal >= 0 && numVal <= maxValue) {
      setValue(numVal)
    }
  }

  const handleSave = () => {
    dispatch({ type: "UPDATE_NODE_VALUE", nodeId, value })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-black border-2 border-green-500 text-green-400">
        <DialogHeader className="border-b border-green-500 pb-2">
          <DialogTitle className="font-mono terminal-green">EDIT_NODE: {label.toUpperCase()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="terminal-green font-mono text-sm">CURRENT_VALUE: {formatCurrency(value)}</div>
            <Slider
              value={[value]}
              onValueChange={handleSliderChange}
              max={maxValue}
              min={0}
              step={100}
              className="w-full [&_[role=slider]]:bg-green-500 [&_[role=slider]]:border-green-400"
            />
            <div className="flex justify-between text-xs font-mono terminal-yellow">
              <span>$0</span>
              <span>{formatCurrency(maxValue)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="terminal-green font-mono text-sm">EXACT_AMOUNT ($):</div>
            <Input
              id="amount-input"
              type="number"
              value={inputValue}
              onChange={handleInputChange}
              className="bg-black border-green-500 text-green-400 font-mono placeholder:text-green-600 focus:border-cyan-500 focus:ring-cyan-500"
              placeholder="Enter amount"
              min="0"
              max={maxValue / 100}
              step="1"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-transparent border-red-500 text-red-400 hover:bg-red-900 font-mono"
            >
              [CANCEL]
            </Button>
            <Button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 text-black font-mono border border-green-500"
            >
              [SAVE_CHANGES]
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
