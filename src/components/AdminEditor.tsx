import React, { useState, useRef, useEffect } from 'react';
import { Upload, Wand2, PenTool, Save, Trash2, MousePointer2, CheckCircle2, Loader2, SlidersHorizontal, ChevronDown, Lock, Unlock, Layers, Undo2, Redo2, Calculator } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

interface Point {
  x: number;
  y: number;
}

interface DrawnPolygon {
  id: string;
  points: Point[];
  data: {
    number: string;
    rooms: number;
    area: number;
    price: number;
    status: 'available' | 'reserved' | 'sold';
  };
  isLocked?: boolean;
}

export const AdminEditor: React.FC = () => {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [polygons, setPolygons] = useState<DrawnPolygon[]>([]);
  const [currentPolygon, setCurrentPolygon] = useState<Point[]>([]);
  const [mode, setMode] = useState<'select' | 'draw'>('select');
  const [selectedPolyId, setSelectedPolyId] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);
  const [draggingPolyId, setDraggingPolyId] = useState<string | null>(null);
  const [draggingEdge, setDraggingEdge] = useState<{ polyId: string, index: number } | null>(null);
  const [dragStartPos, setDragStartPos] = useState<Point | null>(null);
  
  // History for Undo/Redo
  const [history, setHistory] = useState<DrawnPolygon[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  
  // AI Parameters
  const [aiSensitivity, setAiSensitivity] = useState(75);
  const [aiComplexity, setAiComplexity] = useState(50);
  const [showAiSettings, setShowAiSettings] = useState(false);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pushToHistory = (newPolygons: DrawnPolygon[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPolygons);
    if (newHistory.length > 100) {
      newHistory.shift();
    }
    setHistoryIndex(newHistory.length - 1);
    setHistory(newHistory);
    setPolygons(newPolygons);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPolygons(history[newIndex]);
      
      if (selectedPolyId && !history[newIndex].find(p => p.id === selectedPolyId)) {
        setSelectedPolyId(null);
      }
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPolygons(history[newIndex]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackgroundImage(event.target?.result as string);
        setPolygons([]);
        setHistory([[]]);
        setHistoryIndex(0);
        setSelectedPolyId(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSvgClick = (e: React.MouseEvent) => {
    if (mode !== 'draw' || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPolygon([...currentPolygon, { x, y }]);
  };

  const handleSvgMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    if (mode === 'draw' && currentPolygon.length >= 3) {
      const startPoint = currentPolygon[0];
      const dist = Math.hypot(x - startPoint.x, y - startPoint.y);
      if (dist < 15) {
        x = startPoint.x;
        y = startPoint.y;
      }
    }

    setMousePos({ x, y });

    if (draggingPointIndex !== null && selectedPolyId) {
      setPolygons(prev => prev.map(p => {
        if (p.id === selectedPolyId && !p.isLocked) {
          const newPoints = [...p.points];
          newPoints[draggingPointIndex] = { x, y };
          return { ...p, points: newPoints };
        }
        return p;
      }));
    } else if (draggingEdge && dragStartPos) {
      const dx = x - dragStartPos.x;
      const dy = y - dragStartPos.y;
      setPolygons(prev => prev.map(p => {
        if (p.id === draggingEdge.polyId && !p.isLocked) {
          const newPts = [...p.points];
          newPts[draggingEdge.index] = { x: newPts[draggingEdge.index].x + dx, y: newPts[draggingEdge.index].y + dy };
          const nextIdx = (draggingEdge.index + 1) % newPts.length;
          newPts[nextIdx] = { x: newPts[nextIdx].x + dx, y: newPts[nextIdx].y + dy };
          return { ...p, points: newPts };
        }
        return p;
      }));
      setDragStartPos({ x, y });
    } else if (draggingPolyId && dragStartPos) {
      const dx = x - dragStartPos.x;
      const dy = y - dragStartPos.y;
      setPolygons(prev => prev.map(p => {
        if (p.id === draggingPolyId && !p.isLocked) {
          return {
            ...p,
            points: p.points.map(pt => ({ x: pt.x + dx, y: pt.y + dy }))
          };
        }
        return p;
      }));
      setDragStartPos({ x, y });
    }
  };

  const handleSvgMouseUp = () => {
    if (draggingPointIndex !== null || draggingPolyId !== null || draggingEdge !== null) {
      pushToHistory(polygons);
    }
    setDraggingPointIndex(null);
    setDraggingPolyId(null);
    setDraggingEdge(null);
    setDragStartPos(null);
  };

  const finishDrawing = () => {
    if (mode === 'draw' && currentPolygon.length >= 3) {
      const newPoly: DrawnPolygon = {
        id: `apt-${Date.now()}`,
        points: currentPolygon,
        data: {
          number: `Apt-${polygons.length + 1}`,
          rooms: 2,
          area: 50,
          price: 200000,
          status: 'available'
        }
      };
      pushToHistory([...polygons, newPoly]);
      setCurrentPolygon([]);
      setMode('select');
      setSelectedPolyId(newPoly.id);
    }
  };

  const handleFirstPointClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    finishDrawing();
  };

  const runAiDetection = async () => {
    if (!backgroundImage || !svgRef.current) return;
    setIsAiLoading(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const [mimePrefix, base64Data] = backgroundImage.split(',');
      const mimeType = mimePrefix.match(/:(.*?);/)?.[1] || 'image/png';

      const prompt = `Analyze this floor plan image and identify the distinct apartments or main rooms.
For each apartment, provide a polygon representing its boundary.
The user has set a sensitivity of ${aiSensitivity}% and a shape complexity of ${aiComplexity}%.
If sensitivity is high (>70%), detect more, smaller units. If low (<30%), detect only the largest main units.
CRITICAL SHAPE RULES:
1. Polygons MUST NOT be self-intersecting. The points must form a valid, simple closed shape.
2. Based on the complexity of ${aiComplexity}%, if it is > 50%, you MUST use more than 4 points (e.g., 6-12 points) to accurately trace L-shapes, T-shapes, or irregular rooms. If it is <= 50%, use 4 points for simple bounding boxes.
Return the result as a JSON array of objects.
The {x, y} coordinates MUST be normalized values between 0.0 and 1.0, representing the relative position within the image width and height.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.STRING },
                rooms: { type: Type.INTEGER },
                area: { type: Type.INTEGER },
                price: { type: Type.INTEGER },
                points: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER }
                    },
                    required: ["x", "y"]
                  }
                }
              },
              required: ["number", "rooms", "area", "price", "points"]
            }
          }
        }
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        const svgRect = svgRef.current.getBoundingClientRect();

        const newPolygons: DrawnPolygon[] = parsed.map((apt: any, i: number) => ({
          id: `ai-${Date.now()}-${i}`,
          points: apt.points.map((p: any) => ({
            x: p.x * svgRect.width,
            y: p.y * svgRect.height
          })),
          data: {
            number: apt.number || `Unit ${101 + i}`,
            rooms: apt.rooms || 2,
            area: apt.area || 50,
            price: apt.price || 200000,
            status: 'available'
          },
          isLocked: false
        }));

        pushToHistory([...polygons, ...newPolygons]);
        setMode('select');
      }
    } catch (error) {
      console.error("AI Detection failed:", error);
      alert("Failed to detect apartments using AI. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const selectedPoly = polygons.find(p => p.id === selectedPolyId);

  const updateSelectedPolyData = (field: keyof DrawnPolygon['data'], value: string | number) => {
    if (!selectedPolyId) return;
    const newPolygons = polygons.map(p => {
      if (p.id === selectedPolyId) {
        return { ...p, data: { ...p.data, [field]: value } };
      }
      return p;
    });
    pushToHistory(newPolygons);
  };

  const calculatePolygonArea = (points: Point[]) => {
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      area += (p1.x * p2.y) - (p2.x * p1.y);
    }
    return Math.abs(area / 2);
  };

  const recalculateAreas = () => {
    if (!selectedPolyId) return;
    const referencePoly = polygons.find(p => p.id === selectedPolyId);
    if (!referencePoly || referencePoly.points.length < 3) return;

    const refPixelArea = calculatePolygonArea(referencePoly.points);
    if (refPixelArea === 0) return;

    const ratio = referencePoly.data.area / refPixelArea;

    const newPolygons = polygons.map(p => {
      if (p.id === selectedPolyId || p.isLocked) return p; // Skip reference and locked polygons
      const pixelArea = calculatePolygonArea(p.points);
      const calculatedArea = Math.round(pixelArea * ratio);
      return {
        ...p,
        data: {
          ...p.data,
          area: calculatedArea
        }
      };
    });

    pushToHistory(newPolygons);
  };

  const deleteSelectedPoly = () => {
    if (!selectedPolyId) return;
    const poly = polygons.find(p => p.id === selectedPolyId);
    if (poly?.isLocked) return;
    const newPolygons = polygons.filter(p => p.id !== selectedPolyId);
    pushToHistory(newPolygons);
    setSelectedPolyId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        deleteSelectedPoly();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !isInput) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'y' && !isInput) {
        e.preventDefault();
        redo();
      }

      if (e.key === 'Enter' && mode === 'draw' && currentPolygon.length >= 3) {
        e.preventDefault();
        finishDrawing();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPolyId, polygons, history, historyIndex, mode, currentPolygon]);

  const toggleLock = (id: string) => {
    const newPolygons = polygons.map(p => p.id === id ? { ...p, isLocked: !p.isLocked } : p);
    pushToHistory(newPolygons);
  };

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden">
      {/* Sidebar Tools */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-lg z-20">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Map Creator</h1>
          <p className="text-sm text-slate-500 mt-1">Admin Dashboard</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Upload Section */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
              1. Base Floor Plan
            </label>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <Upload className="w-5 h-5" />
              {backgroundImage ? 'Change Image' : 'Upload Image'}
            </button>
          </div>

          {/* Tools Section */}
          <div className={cn("transition-opacity", !backgroundImage && "opacity-50 pointer-events-none")}>
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                2. Define Apartments
              </label>
              <div className="flex gap-1">
                <button 
                  onClick={undo} 
                  disabled={historyIndex <= 0}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={redo} 
                  disabled={historyIndex >= history.length - 1}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => { setMode('select'); setCurrentPolygon([]); }}
                className={cn(
                  "py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all",
                  mode === 'select' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <MousePointer2 className="w-4 h-4" /> Select
              </button>
              <button
                onClick={() => { setMode('draw'); setSelectedPolyId(null); }}
                className={cn(
                  "py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all",
                  mode === 'draw' ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <PenTool className="w-4 h-4" /> Draw
              </button>
            </div>
            <button
              onClick={runAiDetection}
              disabled={isAiLoading}
              className="w-full py-3 px-4 bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              {isAiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
              {isAiLoading ? 'Analyzing with Gemini...' : 'AI Auto-Detect Rooms'}
            </button>

            {/* AI Settings Panel */}
            <div className="mt-3 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              <button 
                onClick={() => setShowAiSettings(!showAiSettings)}
                className="w-full p-3 flex justify-between items-center hover:bg-slate-100 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5"/> AI Parameters
                </span>
                <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", showAiSettings && "rotate-180")} />
              </button>
              
              <AnimatePresence>
                {showAiSettings && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-3 pb-4 space-y-4 border-t border-slate-200"
                  >
                    <div className="pt-2">
                      <div className="flex justify-between text-xs text-slate-600 font-medium mb-1.5">
                        <span>Sensitivity</span>
                        <span>{aiSensitivity}%</span>
                      </div>
                      <input 
                        type="range" min="1" max="100" 
                        value={aiSensitivity} 
                        onChange={e => setAiSensitivity(Number(e.target.value))} 
                        className="w-full accent-indigo-500" 
                      />
                      <p className="text-[10px] text-slate-400 mt-1 leading-tight">Higher sensitivity detects smaller rooms and balconies.</p>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 font-medium mb-1.5">
                        <span>Shape Complexity</span>
                        <span>{aiComplexity}%</span>
                      </div>
                      <input 
                        type="range" min="1" max="100" 
                        value={aiComplexity} 
                        onChange={e => setAiComplexity(Number(e.target.value))} 
                        className="w-full accent-indigo-500" 
                      />
                      <p className="text-[10px] text-slate-400 mt-1 leading-tight">Higher complexity fits polygons tighter to non-standard walls.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Properties Section */}
          <div className={cn("transition-opacity", !selectedPolyId && "opacity-50 pointer-events-none")}>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block flex justify-between items-center">
              <span>3. Properties</span>
              {selectedPolyId && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => toggleLock(selectedPolyId)} 
                    className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors", selectedPoly?.isLocked ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
                  >
                    {selectedPoly?.isLocked ? <><Lock className="w-3 h-3" /> Locked</> : <><Unlock className="w-3 h-3" /> Unlocked</>}
                  </button>
                  <button 
                    onClick={deleteSelectedPoly} 
                    disabled={selectedPoly?.isLocked}
                    className="text-red-500 hover:text-red-700 flex items-center gap-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              )}
            </label>
            
            {selectedPoly ? (
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="text-xs text-slate-500 font-medium">Unit Number</label>
                  <input 
                    type="text" 
                    value={selectedPoly.data.number}
                    onChange={(e) => updateSelectedPolyData('number', e.target.value)}
                    disabled={selectedPoly.isLocked}
                    className="w-full mt-1 px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 font-medium">Rooms</label>
                    <input 
                      type="number" 
                      value={selectedPoly.data.rooms}
                      onChange={(e) => updateSelectedPolyData('rooms', parseInt(e.target.value) || 0)}
                      disabled={selectedPoly.isLocked}
                      className="w-full mt-1 px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-medium">Area (m²)</label>
                    <input 
                      type="number" 
                      value={selectedPoly.data.area}
                      onChange={(e) => updateSelectedPolyData('area', parseInt(e.target.value) || 0)}
                      disabled={selectedPoly.isLocked}
                      className="w-full mt-1 px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">Price ($)</label>
                  <input 
                    type="number" 
                    value={selectedPoly.data.price}
                    onChange={(e) => updateSelectedPolyData('price', parseInt(e.target.value) || 0)}
                    disabled={selectedPoly.isLocked}
                    className="w-full mt-1 px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">Status</label>
                  <select 
                    value={selectedPoly.data.status}
                    onChange={(e) => updateSelectedPolyData('status', e.target.value)}
                    disabled={selectedPoly.isLocked}
                    className="w-full mt-1 px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-xl">
                Select a room to edit properties
              </div>
            )}
          </div>

          {/* Area Calibration Section */}
          <div className={cn("transition-opacity", !selectedPolyId && "opacity-50 pointer-events-none")}>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
              4. Area Calibration
            </label>
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <p className="text-xs text-indigo-700 mb-3 leading-relaxed">
                Set the correct area for the selected polygon above, then click below to automatically calculate the area for all other unlocked polygons based on their relative size.
              </p>
              <button
                onClick={recalculateAreas}
                disabled={polygons.length <= 1}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Calculator className="w-4 h-4" /> Auto-Calculate All Areas
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50">
          <button 
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
            onClick={() => alert(JSON.stringify(polygons, null, 2))}
          >
            <Save className="w-5 h-5" /> Export Data
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative p-6 flex flex-col items-center justify-center bg-slate-100/50">
        {!backgroundImage ? (
          <div className="text-center text-slate-400 flex flex-col items-center">
            <Upload className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium text-slate-500">No floor plan uploaded</p>
            <p className="text-sm">Upload an image from the sidebar to start mapping.</p>
          </div>
        ) : (
          <div className="relative w-full h-full max-w-5xl bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center">
            <div className="relative inline-block">
              <img 
                src={backgroundImage} 
                alt="Floor plan" 
                className="max-w-full max-h-[80vh] object-contain pointer-events-none"
              />
              <svg
                ref={svgRef}
                className={cn(
                  "absolute inset-0 w-full h-full",
                  mode === 'draw' ? "cursor-crosshair" : "cursor-default"
                )}
                onClick={handleSvgClick}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={handleSvgMouseUp}
              >
                {/* Render completed polygons */}
                {polygons.map((poly) => {
                  const isSelected = poly.id === selectedPolyId;
                  const pointsStr = poly.points.map(p => `${p.x},${p.y}`).join(' ');
                  
                  return (
                    <g key={poly.id} onMouseDown={(e) => {
                      if (mode === 'select') {
                        e.stopPropagation();
                        setSelectedPolyId(poly.id);
                        if (!poly.isLocked) {
                          setDraggingPolyId(poly.id);
                          if (svgRef.current) {
                            const rect = svgRef.current.getBoundingClientRect();
                            setDragStartPos({
                              x: e.clientX - rect.left,
                              y: e.clientY - rect.top
                            });
                          }
                        }
                      }
                    }}>
                      <polygon
                        points={pointsStr}
                        className={cn(
                          "transition-all duration-200",
                          isSelected 
                            ? "fill-emerald-500/40 stroke-emerald-600 stroke-2" 
                            : poly.isLocked
                              ? "fill-slate-500/20 stroke-slate-500 stroke-2"
                              : "fill-sky-500/20 stroke-sky-600 stroke-2 hover:fill-sky-500/40",
                          mode === 'select' && (poly.isLocked ? "cursor-default" : "cursor-move")
                        )}
                      />
                      {/* Center label */}
                      {poly.points.length > 0 && (
                        <text
                          x={poly.points.reduce((sum, p) => sum + p.x, 0) / poly.points.length}
                          y={poly.points.reduce((sum, p) => sum + p.y, 0) / poly.points.length}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-slate-900 font-bold text-sm pointer-events-none drop-shadow-md"
                        >
                          {poly.data.number}
                        </text>
                      )}
                      
                      {/* Edit Points for Selected Polygon */}
                      {isSelected && !poly.isLocked && mode === 'select' && (
                        <>
                          {/* Edges for dragging walls */}
                          {poly.points.map((pt, idx) => {
                            const nextPt = poly.points[(idx + 1) % poly.points.length];
                            return (
                              <line
                                key={`edge-${idx}`}
                                x1={pt.x} y1={pt.y} x2={nextPt.x} y2={nextPt.y}
                                stroke="transparent" strokeWidth={12}
                                className="cursor-move"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setDraggingEdge({ polyId: poly.id, index: idx });
                                  if (svgRef.current) {
                                    const rect = svgRef.current.getBoundingClientRect();
                                    setDragStartPos({
                                      x: e.clientX - rect.left,
                                      y: e.clientY - rect.top
                                    });
                                  }
                                }}
                              />
                            );
                          })}
                          {/* Points for dragging corners */}
                          {poly.points.map((pt, idx) => (
                            <circle
                              key={`pt-${idx}`}
                              cx={pt.x}
                              cy={pt.y}
                              r={5}
                              className="fill-white stroke-indigo-600 stroke-2 cursor-move hover:scale-125 transition-transform"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setDraggingPointIndex(idx);
                              }}
                            />
                          ))}
                        </>
                      )}
                    </g>
                  );
                })}

                {/* Render currently drawing polygon */}
                {currentPolygon.length > 0 && (
                  <g>
                    <polyline
                      points={[...currentPolygon, mousePos].filter(Boolean).map(p => `${p!.x},${p!.y}`).join(' ')}
                      className="fill-emerald-500/20 stroke-emerald-500 stroke-2 border-dashed pointer-events-none"
                      strokeDasharray="4 4"
                    />
                    {currentPolygon.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={i === 0 ? 6 : 4}
                        className={cn(
                          "fill-white stroke-2",
                          i === 0 ? "stroke-emerald-600 cursor-pointer hover:scale-150 transition-transform" : "stroke-emerald-500 pointer-events-none"
                        )}
                        onClick={i === 0 ? handleFirstPointClick : undefined}
                      />
                    ))}
                  </g>
                )}
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
