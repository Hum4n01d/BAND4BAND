"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { useFinancial } from "@/contexts/financial-context"
import { formatCurrency } from "@/lib/financial-calculator"
import type { CalculatedStep } from "@/types/financial"
import { Plus, Trash2, Edit3 } from "lucide-react"

interface StepEditModalProps {
  isOpen: boolean
  onClose: () => void
  stepName: string
  step?: CalculatedStep
}

export function StepEditModal({ isOpen, onClose, stepName, step }: StepEditModalProps) {
  const { dispatch } = useFinancial()
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [itemValue, setItemValue] = useState(0)
  const [inputValue, setInputValue] = useState("")
  const [newItemName, setNewItemName] = useState("")
  const [renamingItem, setRenamingItem] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  useEffect(() => {
    if (isOpen && step?.breakdown) {
      const firstItem = Object.keys(step.breakdown)[0]
      if (firstItem) {
        setEditingItem(firstItem)
        const value = Number(step.breakdown[firstItem])
        setItemValue(value)
        setInputValue(value.toString())
      }
    }
  }, [isOpen, step])

  const handleItemSelect = (itemName: string, value: number) => {
    setEditingItem(itemName)
    setItemValue(value)
    setInputValue(value.toString())
    setRenamingItem(null)
  }

  const handleSliderChange = (newValue: number[]) => {
    const val = newValue[0]
    setItemValue(val)
    setInputValue(val.toString())
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value
    setInputValue(inputVal)

    const numVal = Number.parseFloat(inputVal)
    if (!isNaN(numVal) && numVal >= 0) {
      setItemValue(numVal)
    }
  }

  const handleSave = () => {
    if (editingItem) {
      if (stepName === "Monthly Income") {
        dispatch({ type: "UPDATE_MONTHLY_INCOME", value: itemValue })
      } else {
        dispatch({
          type: "UPDATE_BREAKDOWN_ITEM",
          stepName,
          itemName: editingItem,
          value: itemValue,
        })
      }
    }
    onClose()
  }

  const handleAddItem = () => {
    if (newItemName.trim()) {
      dispatch({
        type: "ADD_BREAKDOWN_ITEM",
        stepName,
        itemName: newItemName.trim(),
        value: 0,
      })
      setNewItemName("")
    }
  }

  const handleRemoveItem = (itemName: string) => {
    dispatch({
      type: "REMOVE_BREAKDOWN_ITEM",
      stepName,
      itemName,
    })
    if (editingItem === itemName) {
      setEditingItem(null)
    }
  }

  const handleRename = (oldName: string) => {
    if (renameValue.trim() && renameValue !== oldName) {
      dispatch({
        type: "RENAME_BREAKDOWN_ITEM",
        stepName,
        oldName,
        newName: renameValue.trim(),
      })
      if (editingItem === oldName) {
        setEditingItem(renameValue.trim())
      }
    }
    setRenamingItem(null)
    setRenameValue("")
  }

  const startRename = (itemName: string) => {
    setRenamingItem(itemName)
    setRenameValue(itemName)
  }

  if (!step?.breakdown && stepName !== "Monthly Income") {
    return null
  }

  const maxValue = itemValue * 3

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-black border-2 border-green-500 text-green-400 max-h-[80vh] overflow-y-auto">
        <DialogHeader className="border-b border-green-500 pb-2">
          <DialogTitle className="font-mono terminal-green">EDIT_STEP: {stepName.toUpperCase()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item management */}
          {step?.breakdown && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="terminal-green font-mono text-sm">BREAKDOWN_ITEMS:</div>
                <div className="flex items-center space-x-2">
                  <Input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="New item name"
                    className="bg-black border-green-500 text-green-400 font-mono text-xs h-8 w-32"
                    onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  />
                  <Button
                    onClick={handleAddItem}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-black font-mono h-8 px-2"
                    disabled={!newItemName.trim()}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {Object.entries(step.breakdown).map(([itemName, value]) => (
                  <div
                    key={itemName}
                    className={`p-2 rounded border font-mono text-xs transition-colors ${
                      editingItem === itemName
                        ? "border-cyan-500 bg-cyan-900 bg-opacity-20 terminal-cyan"
                        : "border-green-500 terminal-green hover:bg-green-900 hover:bg-opacity-20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {renamingItem === itemName ? (
                        <div className="flex items-center space-x-2 flex-1">
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="bg-black border-cyan-500 text-cyan-400 font-mono text-xs h-6 flex-1"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename(itemName)
                              if (e.key === "Escape") setRenamingItem(null)
                            }}
                            autoFocus
                          />
                          <Button
                            onClick={() => handleRename(itemName)}
                            size="sm"
                            className="bg-cyan-600 hover:bg-cyan-700 text-black h-6 px-2"
                          >
                            ✓
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleItemSelect(itemName, Number(value))}
                            className="flex justify-between flex-1 text-left"
                          >
                            <span>{itemName}</span>
                            <span>{formatCurrency(Number(value))}</span>
                          </button>
                          <div className="flex items-center space-x-1 ml-2">
                            <Button
                              onClick={() => startRename(itemName)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-yellow-400 hover:text-yellow-300"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleRemoveItem(itemName)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editingItem && (
            <>
              <div className="space-y-2">
                <div className="terminal-green font-mono text-sm">
                  EDITING: {editingItem} - {formatCurrency(itemValue)}
                </div>
                <Slider
                  value={[itemValue]}
                  onValueChange={handleSliderChange}
                  max={maxValue}
                  min={0}
                  step={10}
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
                  type="number"
                  value={inputValue}
                  onChange={handleInputChange}
                  className="bg-black border-green-500 text-green-400 font-mono placeholder:text-green-600 focus:border-cyan-500 focus:ring-cyan-500"
                  placeholder="Enter amount"
                  min="0"
                  step="10"
                />
              </div>
            </>
          )}

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
              disabled={!editingItem}
              className="bg-green-600 hover:bg-green-700 text-black font-mono border border-green-500 disabled:opacity-50"
            >
              [SAVE_CHANGES]
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
