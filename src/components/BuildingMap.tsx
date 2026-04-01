import React, { useState, useRef } from 'react';
import { Apartment, Building, Floor } from '../data';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

interface BuildingMapProps {
  building: Building;
  selectedFloor: Floor;
  is3D: boolean;
  selectedApartment: Apartment | null;
  onSelectApartment: (apt: Apartment, floor: Floor) => void;
  hoveredApartment: Apartment | null;
  onHoverApartment: (apt: Apartment | null) => void;
}

export const BuildingMap: React.FC<BuildingMapProps> = ({
  building,
  selectedFloor,
  is3D,
  selectedApartment,
  onSelectApartment,
  hoveredApartment,
  onHoverApartment,
}) => {
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [rotations, setRotations] = useState<Record<string, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const renderFloor = (floor: Floor, isStacked: boolean = false) => {
    const isActiveFloor = floor.id === selectedFloor.id;
    const isVisible = is3D || isActiveFloor;
    
    if (!isVisible) return null;

    const translateZ = is3D ? floor.level * 80 : 0;
    const opacity = is3D ? (isActiveFloor ? 1 : 0.3) : 1;

    return (
      <React.Fragment key={floor.id}>
        {/* Floor Slab Bottom (for 3D thickness) */}
        {is3D && (
          <svg
            viewBox={building.viewBox}
            className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-lg transition-all duration-700"
            style={{ transform: `translateZ(${translateZ - 15}px)`, opacity: opacity * 0.8 }}
          >
            <path
              d="M 40 40 L 760 40 L 760 560 L 40 560 Z"
              className="fill-slate-300 stroke-slate-400 stroke-2"
            />
          </svg>
        )}

        {/* Floor Content */}
        <svg
          viewBox={building.viewBox}
          className={cn(
            "absolute inset-0 w-full h-full transition-all duration-700 pointer-events-none",
            !is3D && "relative"
          )}
          style={{
            transform: is3D ? `translateZ(${translateZ}px)` : 'none',
            opacity: opacity,
            zIndex: floor.level
          }}
        >
          {/* Floor Base */}
          <path
            d="M 40 40 L 760 40 L 760 560 L 40 560 Z"
            className={cn("fill-slate-100 stroke-slate-300 stroke-2", is3D && "fill-slate-50")}
          />

          {/* Corridor (Decorative) */}
          <path
            d="M 200 250 L 600 250 L 600 350 L 200 350 Z"
            className="fill-slate-200/50 stroke-slate-300 stroke-1"
          />

          {floor.apartments.map((apt) => {
            const isSelected = selectedApartment?.id === apt.id;
            const isHovered = hoveredApartment?.id === apt.id;
            const rotation = rotations[apt.id] || 0;

            let fillClass = 'fill-white';
            let strokeClass = 'stroke-slate-300';
            let cursorClass = 'cursor-pointer';

            if (apt.status === 'available') {
              fillClass = isSelected ? 'fill-emerald-500' : isHovered ? 'fill-emerald-100' : 'fill-white';
              strokeClass = isSelected ? 'stroke-emerald-600' : 'stroke-emerald-400';
            } else if (apt.status === 'reserved') {
              fillClass = isSelected ? 'fill-amber-500' : isHovered ? 'fill-amber-100' : 'fill-amber-50/50';
              strokeClass = isSelected ? 'stroke-amber-600' : 'stroke-amber-400';
            } else if (apt.status === 'sold') {
              fillClass = 'fill-slate-200';
              strokeClass = 'stroke-slate-400';
              cursorClass = 'cursor-not-allowed';
            }

            const handleApartmentClick = () => {
              if (apt.status === 'sold') return;
              if (isSelected && is3D) {
                setRotations(prev => ({ ...prev, [apt.id]: (prev[apt.id] || 0) + 90 }));
              } else {
                onSelectApartment(apt, floor);
              }
            };

            return (
              <g
                key={apt.id}
                onClick={handleApartmentClick}
                onMouseEnter={() => apt.status !== 'sold' && onHoverApartment(apt)}
                onMouseLeave={() => onHoverApartment(null)}
                className={cn('transition-all duration-300 pointer-events-auto', cursorClass)}
                style={{
                  transformOrigin: `${apt.center.x}px ${apt.center.y}px`,
                  transform: `rotate(${rotation}deg)`,
                }}
              >
                <path
                  d={apt.path}
                  className={cn(fillClass, strokeClass)}
                  strokeWidth={isSelected ? "4" : "2"}
                />
                
                {/* Apartment Number */}
                <text
                  x={apt.center.x}
                  y={apt.center.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={cn(
                    'text-xl font-bold font-sans pointer-events-none select-none transition-colors',
                    isSelected ? 'fill-white' : 'fill-slate-700',
                    apt.status === 'sold' && 'fill-slate-400'
                  )}
                >
                  {apt.number}
                </text>
              </g>
            );
          })}
        </svg>
      </React.Fragment>
    );
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full flex items-center justify-center bg-sky-50 overflow-hidden rounded-xl border border-slate-200 shadow-inner"
      onMouseMove={handleMouseMove}
    >
      {/* Decorative background elements */}
      <div className="absolute bottom-0 w-full h-1/3 bg-emerald-100/50 pointer-events-none" />
      <div className="absolute bottom-1/3 w-full h-px bg-emerald-200 pointer-events-none" />
      
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit
        wheel={{ step: 0.1 }}
      >
        <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
          <div
            className="relative w-full max-w-4xl aspect-[4/3] transition-transform duration-1000 ease-in-out"
            style={{
              transformStyle: 'preserve-3d',
              transform: is3D ? 'rotateX(60deg) rotateZ(-45deg) scale(0.6)' : 'rotateX(0deg) rotateZ(0deg) scale(1)'
            }}
          >
            {is3D ? building.floors.map(f => renderFloor(f, true)) : renderFloor(selectedFloor, false)}
          </div>
        </TransformComponent>
      </TransformWrapper>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredApartment && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute pointer-events-none z-50 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-slate-200 text-sm min-w-[150px]"
            style={{
              left: tooltipPos.x + 20,
              top: tooltipPos.y + 20,
            }}
          >
            <div className="font-bold text-slate-800 mb-1">Apt {hoveredApartment.number}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600">
              <span>Rooms:</span> <span className="font-medium text-right">{hoveredApartment.rooms}</span>
              <span>Area:</span> <span className="font-medium text-right">{hoveredApartment.area} m²</span>
              <span>Price:</span> <span className="font-medium text-right">${hoveredApartment.price.toLocaleString()}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize",
                hoveredApartment.status === 'available' && "bg-emerald-100 text-emerald-800",
                hoveredApartment.status === 'reserved' && "bg-amber-100 text-amber-800",
                hoveredApartment.status === 'sold' && "bg-slate-100 text-slate-800"
              )}>
                {hoveredApartment.status}
              </span>
              {is3D && selectedApartment?.id === hoveredApartment.id && (
                <span className="text-xs text-slate-400 italic">Click to rotate</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
