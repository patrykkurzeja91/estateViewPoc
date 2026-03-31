import React from 'react';
import { Apartment, Building, Stage, Floor } from '../data';
import { cn } from '../lib/utils';
import { Building2, Layers, Maximize, DollarSign, Bed, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  stages: Stage[];
  selectedStage: Stage;
  onSelectStage: (stage: Stage) => void;
  selectedBuilding: Building;
  onSelectBuilding: (building: Building) => void;
  selectedFloor: Floor;
  onSelectFloor: (floor: Floor) => void;
  selectedApartment: Apartment | null;
  onClearSelection: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  stages,
  selectedStage,
  onSelectStage,
  selectedBuilding,
  onSelectBuilding,
  selectedFloor,
  onSelectFloor,
  selectedApartment,
  onClearSelection,
}) => {
  return (
    <div className="w-80 bg-white border-r border-slate-200 h-full flex flex-col shadow-lg z-20 relative">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Building2 className="w-6 h-6 text-emerald-600" />
          EstateView
        </h1>
        <p className="text-sm text-slate-500 mt-1">Interactive Property Search</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Navigation / Selectors */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
              Development Phase
            </label>
            <div className="grid grid-cols-1 gap-2">
              {stages.map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => onSelectStage(stage)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg text-left transition-colors",
                    selectedStage.id === stage.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  {stage.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
              Building
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedStage.buildings.map((building) => (
                <button
                  key={building.id}
                  onClick={() => onSelectBuilding(building)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex-1 text-center",
                    selectedBuilding.id === building.id
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {building.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
              Floor
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedBuilding.floors.map((floor) => (
                <button
                  key={floor.id}
                  onClick={() => onSelectFloor(floor)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex-1 text-center",
                    selectedFloor.id === floor.id
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Floor {floor.level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
            Availability Legend
          </label>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-400" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <div className="w-4 h-4 rounded bg-amber-100 border border-amber-400" />
              <span>Reserved</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <div className="w-4 h-4 rounded bg-slate-200 border border-slate-300" />
              <span>Sold</span>
            </div>
          </div>
        </div>

        {/* Selected Apartment Details */}
        <AnimatePresence mode="wait">
          {selectedApartment ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-50 rounded-xl p-5 border border-slate-200 relative"
            >
              <button
                onClick={onClearSelection}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
              
              <div className="mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Selected Unit
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">
                  Apt {selectedApartment.number}
                </h2>
                <div className="mt-2">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium capitalize",
                    selectedApartment.status === 'available' && "bg-emerald-100 text-emerald-800",
                    selectedApartment.status === 'reserved' && "bg-amber-100 text-amber-800",
                  )}>
                    {selectedApartment.status === 'available' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {selectedApartment.status === 'reserved' && <Clock className="w-3.5 h-3.5" />}
                    {selectedApartment.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Layers className="w-4 h-4" />
                    <span className="text-xs font-medium">Floor</span>
                  </div>
                  <div className="text-lg font-semibold text-slate-900">{selectedApartment.floor}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Bed className="w-4 h-4" />
                    <span className="text-xs font-medium">Rooms</span>
                  </div>
                  <div className="text-lg font-semibold text-slate-900">{selectedApartment.rooms}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Maximize className="w-4 h-4" />
                    <span className="text-xs font-medium">Area</span>
                  </div>
                  <div className="text-lg font-semibold text-slate-900">{selectedApartment.area} m²</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">Price</span>
                  </div>
                  <div className="text-lg font-semibold text-slate-900">
                    ${(selectedApartment.price / 1000).toFixed(0)}k
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  className={cn(
                    "flex-1 py-3 px-4 rounded-lg font-semibold transition-all shadow-sm text-sm",
                    selectedApartment.status === 'available' 
                      ? "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md"
                      : "bg-amber-500 text-white hover:bg-amber-600 hover:shadow-md"
                  )}
                >
                  {selectedApartment.status === 'available' ? 'Contact Sales' : 'Waitlist'}
                </button>
                <button 
                  className="flex-1 py-3 px-4 rounded-lg font-semibold transition-all shadow-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:shadow-md text-sm"
                  onClick={() => alert(`Navigating to details for Apt ${selectedApartment.number}...`)}
                >
                  View Details
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-48 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 p-6 text-center"
            >
              <Building2 className="w-8 h-8 mb-3 opacity-50" />
              <p className="text-sm">Select an available apartment on the map to view details.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
