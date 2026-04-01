export type ApartmentStatus = 'available' | 'reserved' | 'sold';

export interface Apartment {
  id: string;
  number: string;
  rooms: number;
  area: number;
  price: number;
  status: ApartmentStatus;
  path: string;
  center: { x: number; y: number };
  floorPlanImage: string;
}

export interface Floor {
  id: string;
  level: number;
  apartments: Apartment[];
}

export interface Building {
  id: string;
  name: string;
  viewBox: string;
  floors: Floor[];
}

export interface Stage {
  id: string;
  name: string;
  buildings: Building[];
}

const generateApartmentsForFloor = (floorLevel: number, prefix: string): Apartment[] => {
  const apts: Apartment[] = [];
  const statuses: ApartmentStatus[] = ['available', 'reserved', 'sold'];
  const randomStatus = () => statuses[Math.floor(Math.random() * statuses.length)];

  const getImg = (id: string) => `https://picsum.photos/seed/${id}/400/300`;

  // Top Left (L-shape)
  const id1 = `${prefix}-${floorLevel}01`;
  apts.push({
    id: id1, number: `${floorLevel}01`, rooms: 3, area: 75, price: 250000 + floorLevel * 5000, status: randomStatus(),
    path: 'M 50 50 L 400 50 L 400 250 L 200 250 L 200 350 L 50 350 Z',
    center: { x: 200, y: 150 },
    floorPlanImage: getImg(id1)
  });
  // Top Right (Rectangle)
  const id2 = `${prefix}-${floorLevel}02`;
  apts.push({
    id: id2, number: `${floorLevel}02`, rooms: 2, area: 50, price: 180000 + floorLevel * 5000, status: randomStatus(),
    path: 'M 400 50 L 750 50 L 750 250 L 400 250 Z',
    center: { x: 575, y: 150 },
    floorPlanImage: getImg(id2)
  });
  // Bottom Left (Rectangle)
  const id3 = `${prefix}-${floorLevel}03`;
  apts.push({
    id: id3, number: `${floorLevel}03`, rooms: 2, area: 55, price: 190000 + floorLevel * 5000, status: randomStatus(),
    path: 'M 200 350 L 400 350 L 400 550 L 200 550 Z',
    center: { x: 300, y: 450 },
    floorPlanImage: getImg(id3)
  });
  // Bottom Right (L-shape)
  const id4 = `${prefix}-${floorLevel}04`;
  apts.push({
    id: id4, number: `${floorLevel}04`, rooms: 4, area: 95, price: 320000 + floorLevel * 5000, status: randomStatus(),
    path: 'M 600 250 L 750 250 L 750 550 L 400 550 L 400 350 L 600 350 Z',
    center: { x: 575, y: 450 },
    floorPlanImage: getImg(id4)
  });

  return apts;
};

const generateFloors = (numFloors: number, prefix: string): Floor[] => {
  const floors: Floor[] = [];
  for (let i = 1; i <= numFloors; i++) {
    floors.push({
      id: `fl-${prefix}-${i}`,
      level: i,
      apartments: generateApartmentsForFloor(i, prefix)
    });
  }
  return floors;
};

export const mockData: Stage[] = [
  {
    id: 'stage-1',
    name: 'Phase 1: The Gardens',
    buildings: [
      { id: 'bld-a', name: 'Building A', viewBox: '0 0 800 600', floors: generateFloors(5, 'A') },
      { id: 'bld-b', name: 'Building B', viewBox: '0 0 800 600', floors: generateFloors(4, 'B') },
    ],
  }
];
