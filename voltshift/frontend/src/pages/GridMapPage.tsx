import React, { useState } from 'react';
import { InteractiveMap } from '../components/InteractiveMap';
import { GeminiDispatchRightPanel } from '../components/GeminiDispatchRightPanel';
import { GridZone, IndustrialWorkload, GeminiAgentExplanation } from '../types';

interface GridMapPageProps {
  zones: GridZone[];
  workloads: IndustrialWorkload[];
  selectedSiteId: string | null;
  onSelectSite: (id: string | null) => void;
  isAutonomous: boolean;
  explanation: GeminiAgentExplanation;
  simHour: number;
  onSelectHour?: (h: number) => void;
  isPeaker: boolean;
  onToggleAutonomous?: () => void;
  onTriggerPeaker?: () => void;
}

export const GridMapPage: React.FC<GridMapPageProps> = ({
  zones,
  workloads,
  selectedSiteId,
  onSelectSite,
  isAutonomous,
  explanation,
  simHour,
  onSelectHour,
  isPeaker,
  onToggleAutonomous,
  onTriggerPeaker,
}) => {
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  return (
    <div className="relative w-full h-full flex overflow-hidden bg-zinc-950">
      {/* 100% Full-Viewport Interactive Map on Left/Center */}
      <div className="flex-1 h-full min-w-0 relative">
        <InteractiveMap
          zones={zones}
          workloads={workloads}
          selectedSiteId={selectedSiteId}
          onSelectSite={onSelectSite}
        />
      </div>

      {/* Gemini Dispatch Agent Panel Docked to the Right */}
      <GeminiDispatchRightPanel
        explanation={explanation}
        simHour={simHour}
        isPeaker={isPeaker}
        isAutonomous={isAutonomous}
        zones={zones}
        workloads={workloads}
        onSetHour={onSelectHour}
        onToggleAutonomous={onToggleAutonomous}
        onTriggerPeaker={onTriggerPeaker}
        isCollapsed={isPanelCollapsed}
        onToggleCollapse={() => setIsPanelCollapsed((prev) => !prev)}
      />
    </div>
  );
};
