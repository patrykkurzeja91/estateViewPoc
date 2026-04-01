import React, { useState } from 'react';
import { mockData, Stage, Building, Apartment, Floor } from './data';
import { Sidebar } from './components/Sidebar';
import { BuildingMap } from './components/BuildingMap';
import { ContactModal } from './components/ContactModal';
import { AdminEditor } from './components/AdminEditor';
import { cn } from './lib/utils';
import { Map, Settings } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'client' | 'admin'>('client');
  
  const [selectedStage, setSelectedStage] = useState<Stage>(mockData[0]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building>(mockData[0].buildings[0]);
  const [selectedFloor, setSelectedFloor] = useState<Floor>(mockData[0].buildings[0].floors[0]);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [hoveredApartment, setHoveredApartment] = useState<Apartment | null>(null);
  const [is3D, setIs3D] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

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
    <div className="flex flex-col h-screen w-full bg-slate-50 font-sans overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="bg-slate-900 text-white px-6 py-3 flex justify-between items-center shadow-md z-50">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <Map className="w-5 h-5 text-emerald-400" />
          EstateView Platform
        </div>
        <div className="flex bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setView('client')}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
              view === 'client' ? "bg-emerald-500 text-white" : "text-slate-300 hover:text-white hover:bg-slate-700"
            )}
          >
            <Map className="w-4 h-4" /> Client View
          </button>
          <button
            onClick={() => setView('admin')}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
              view === 'admin' ? "bg-emerald-500 text-white" : "text-slate-300 hover:text-white hover:bg-slate-700"
            )}
          >
            <Settings className="w-4 h-4" /> Admin Creator
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      {view === 'client' ? (
        <div className="flex flex-1 overflow-hidden">
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
            onContactSales={() => setIsContactModalOpen(true)}
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

          <ContactModal 
            isOpen={isContactModalOpen} 
            onClose={() => setIsContactModalOpen(false)} 
            apartment={selectedApartment} 
          />
        </div>
      ) : (
        <AdminEditor />
      )}
    </div>
  );
}
