"use client";

import { RecognitionType } from "@prisma/client";
import { Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RecognitionBadge } from "./recognition-badge";

interface Recognition {
  id: string;
  type: RecognitionType;
  awardedFor: string | null;
  awardedDate: Date | string;
}

interface RecognitionWidgetProps {
  recognitions: Recognition[];
}

export function RecognitionWidget({ recognitions }: RecognitionWidgetProps) {
  if (recognitions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-amber-500" />
            Your Achievements
          </CardTitle>
          <CardDescription>
            Keep completing your daily rituals to earn badges!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-gray-400">
            <div className="text-center">
              <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No badges earned yet</p>
              <p className="text-xs mt-1">
                Complete 5 morning rituals in a row for your first badge!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-amber-500" />
          Your Achievements
        </CardTitle>
        <CardDescription>
          {recognitions.length} badge{recognitions.length !== 1 ? "s" : ""} earned
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {recognitions.map((recognition) => (
            <RecognitionBadge
              key={recognition.id}
              type={recognition.type}
              awardedDate={recognition.awardedDate}
              size="md"
              showLabel={true}
              showTooltip={true}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
