"use client"

import { useState, useEffect } from "react"
import { Input } from "./input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

interface TimeInputProps {
  value: string
  onChange: (value: string) => void
  id?: string
  className?: string
}

export function TimeInput({ value, onChange, id, className }: TimeInputProps) {
  const [hour, setHour] = useState("12")
  const [minute, setMinute] = useState("00")
  const [period, setPeriod] = useState<"AM" | "PM">("AM")

  // Convert 24-hour format to 12-hour format
  useEffect(() => {
    if (value) {
      const [hours, minutes] = value.split(":")
      const hourNum = Number.parseInt(hours)
      const minuteNum = Number.parseInt(minutes)
      
      if (hourNum === 0) {
        setHour("12")
        setPeriod("AM")
      } else if (hourNum === 12) {
        setHour("12")
        setPeriod("PM")
      } else if (hourNum > 12) {
        setHour((hourNum - 12).toString())
        setPeriod("PM")
      } else {
        setHour(hourNum.toString())
        setPeriod("AM")
      }
      
      setMinute(minutes)
    }
  }, [value])

  // Convert 12-hour format to 24-hour format
  const updateValue = (newHour: string, newMinute: string, newPeriod: "AM" | "PM") => {
    let hourNum = Number.parseInt(newHour)
    const minuteNum = Number.parseInt(newMinute)
    
    if (newPeriod === "PM" && hourNum !== 12) {
      hourNum += 12
    } else if (newPeriod === "AM" && hourNum === 12) {
      hourNum = 0
    }
    
    const newValue = `${hourNum.toString().padStart(2, "0")}:${minuteNum.toString().padStart(2, "0")}`
    onChange(newValue)
  }

  const handleHourChange = (newHour: string) => {
    setHour(newHour)
    updateValue(newHour, minute, period)
  }

  const handleMinuteChange = (newMinute: string) => {
    setMinute(newMinute)
    updateValue(hour, newMinute, period)
  }

  const handlePeriodChange = (newPeriod: "AM" | "PM") => {
    setPeriod(newPeriod)
    updateValue(hour, minute, newPeriod)
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <Select value={hour} onValueChange={handleHourChange}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <SelectItem key={h} value={h.toString()}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <span className="flex items-center text-sm">:</span>
      
      <Select value={minute} onValueChange={handleMinuteChange}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 60 }, (_, i) => i).map((m) => (
            <SelectItem key={m} value={m.toString().padStart(2, "0")}>
              {m.toString().padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
