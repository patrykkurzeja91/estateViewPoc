import React, { useState } from 'react';
import { mockData, Stage, Building, Apartment, Floor } from './data';
import { Sidebar } from './components/Sidebar';
import { BuildingMap } from './components/BuildingMap';
import { cn } from './lib/utils';

export default function App() {
  const [selectedStage, setSelectedStage] = useState<Stage>(mockData[0]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building>(mockData[0].buildings[0]);
  const [selectedFloor, setSelectedFloor] = useState<Floor>(mockData[0].buildings[0].floors[0]);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [hoveredApartment, setHoveredApartment] = useState<Apartment | null>(null);
  const [is3D, setIs3D] = useState(false);

  const handleSelectStage = (stage: Stage) => {
    setSelectedStage(stage);
    setSelectedBuilding(stage.buildings[0]);
    setSelectedFloor(stage.buildings[0].floors[0]);
    setSelectedApartment(null);
  };

  const handleSelectBuilding = (building: Building) => {
    setSelectedBuilding(building);
    setSelectedFloor(building.floors[0]);
    setSelectedApartment(null);
  };

  const handleSelectFloor = (floor: Floor) => {
    setSelectedFloor(floor);
    setSelectedApartment(null);
  };

  const handleSelectApartment = (apt: Apartment, floor: Floor) => {
    setSelectedFloor(floor);
    setSelectedApartment(apt);
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden">
      <Sidebar
        stages={mockData}
        selectedStage={selectedStage}
        onSelectStage={handleSelectStage}
        selectedBuilding={selectedBuilding}
        onSelectBuilding={handleSelectBuilding}
        selectedFloor={selectedFloor}
        onSelectFloor={handleSelectFloor}
        selectedApartment={selectedApartment}
        onClearSelection={() => setSelectedApartment(null)}
      />
      
      <main className="flex-1 relative p-6 flex flex-col">
        <header className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
              {selectedBuilding.name}
            </h2>
            <p className="text-slate-500 mt-1">
              {selectedStage.name} &bull; {selectedBuilding.floors.reduce((acc, f) => acc + f.apartments.filter(a => a.status === 'available').length, 0)} units available
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button
              onClick={() => setIs3D(false)}
              className={cn("px-4 py-2 text-sm font-semibold rounded-md transition-all", !is3D ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              2D Top-Down
            </button>
            <button
              onClick={() => setIs3D(true)}
              className={cn("px-4 py-2 text-sm font-semibold rounded-md transition-all", is3D ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              3D Immersive
            </button>
          </div>
        </header>
        
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 overflow-hidden">
          <BuildingMap
            building={selectedBuilding}
            selectedFloor={selectedFloor}
            is3D={is3D}
            selectedApartment={selectedApartment}
            onSelectApartment={handleSelectApartment}
            hoveredApartment={hoveredApartment}
            onHoverApartment={setHoveredApartment}
          />
        </div>
      </main>
    </div>
  );
}
