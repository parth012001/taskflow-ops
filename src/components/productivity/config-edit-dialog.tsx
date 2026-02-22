"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ScoringConfig {
  departmentId: string;
  departmentName: string;
  weeklyOutputTarget: number;
  outputWeight: number;
  qualityWeight: number;
  reliabilityWeight: number;
  consistencyWeight: number;
}

interface ConfigEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ScoringConfig | null;
  onSuccess: () => void;
}

export function ConfigEditDialog({
  open,
  onOpenChange,
  config,
  onSuccess,
}: ConfigEditDialogProps) {
  const [weeklyOutputTarget, setWeeklyOutputTarget] = useState(15);
  const [outputWeight, setOutputWeight] = useState(0.35);
  const [qualityWeight, setQualityWeight] = useState(0.25);
  const [reliabilityWeight, setReliabilityWeight] = useState(0.25);
  const [consistencyWeight, setConsistencyWeight] = useState(0.15);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config && open) {
      setWeeklyOutputTarget(config.weeklyOutputTarget);
      setOutputWeight(config.outputWeight);
      setQualityWeight(config.qualityWeight);
      setReliabilityWeight(config.reliabilityWeight);
      setConsistencyWeight(config.consistencyWeight);
    }
  }, [config, open]);

  const weightSum = outputWeight + qualityWeight + reliabilityWeight + consistencyWeight;
  const isWeightValid = Math.abs(weightSum - 1.0) < 0.01;

  const handleSave = async () => {
    if (!config || !isWeightValid) return;

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/productivity/config/${config.departmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weeklyOutputTarget,
            outputWeight,
            qualityWeight,
            reliabilityWeight,
            consistencyWeight,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update config");
      }

      toast.success(`Updated config for ${config.departmentName}`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating config:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update config"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit Config — {config?.departmentName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="weeklyTarget">Weekly Output Target</Label>
            <Input
              id="weeklyTarget"
              type="number"
              min={1}
              max={100}
              step={1}
              value={weeklyOutputTarget}
              onChange={(e) => setWeeklyOutputTarget(Math.round(Number(e.target.value)))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="outputWeight">Output Weight</Label>
              <Input
                id="outputWeight"
                type="number"
                step={0.05}
                min={0}
                max={1}
                value={outputWeight}
                onChange={(e) => setOutputWeight(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="qualityWeight">Quality Weight</Label>
              <Input
                id="qualityWeight"
                type="number"
                step={0.05}
                min={0}
                max={1}
                value={qualityWeight}
                onChange={(e) => setQualityWeight(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="reliabilityWeight">Reliability Weight</Label>
              <Input
                id="reliabilityWeight"
                type="number"
                step={0.05}
                min={0}
                max={1}
                value={reliabilityWeight}
                onChange={(e) => setReliabilityWeight(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="consistencyWeight">Consistency Weight</Label>
              <Input
                id="consistencyWeight"
                type="number"
                step={0.05}
                min={0}
                max={1}
                value={consistencyWeight}
                onChange={(e) => setConsistencyWeight(Number(e.target.value))}
              />
            </div>
          </div>

          <div
            className={`text-sm font-medium px-3 py-2 rounded-md ${
              isWeightValid
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            Weight sum: {weightSum.toFixed(2)}{" "}
            {isWeightValid ? "— Valid" : "— Must equal 1.0"}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isWeightValid || isSaving}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
