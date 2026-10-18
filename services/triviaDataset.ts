export interface TriviaItem {
  name: string;
  value: number;
  image: string;
  category?: string;
}

export const TRIVIA_DATASET: TriviaItem[] = [
  // Landmarks & Architectural Wonders
  { name: "Burj Khalifa (Height in m)", value: 828, image: "🏙️", category: "landmarks" },
  { name: "Shanghai Tower (Height in m)", value: 632, image: "🏙️", category: "landmarks" },
  { name: "One World Trade Center (Height in m)", value: 541, image: "🏙️", category: "landmarks" },
  { name: "Petronas Twin Towers (Height in m)", value: 452, image: "🏙️", category: "landmarks" },
  { name: "Empire State Building (Height in m)", value: 381, image: "🏙️", category: "landmarks" },
  { name: "Eiffel Tower (Height in m)", value: 330, image: "🗼", category: "landmarks" },
  { name: "The Shard London (Height in m)", value: 310, image: "🏙️", category: "landmarks" },
  { name: "Transamerica Pyramid (Height in m)", value: 260, image: "🏙️", category: "landmarks" },
  { name: "Gateway Arch St. Louis (Height in m)", value: 192, image: "🏛️", category: "landmarks" },
  { name: "Space Needle Seattle (Height in m)", value: 184, image: "🗼", category: "landmarks" },
  { name: "Washington Monument (Height in m)", value: 169, image: "🏛️", category: "landmarks" },
  { name: "Great Pyramid of Giza (Original Height in m)", value: 147, image: "🔺", category: "landmarks" },
  { name: "Statue of Liberty (Ground to Torch in m)", value: 93, image: "🗽", category: "landmarks" },
  { name: "Big Ben Clock Tower (Height in m)", value: 96, image: "🕰️", category: "landmarks" },
  { name: "Sydney Opera House (Height in m)", value: 65, image: "🎭", category: "landmarks" },
  { name: "Leaning Tower of Pisa (Height in m)", value: 57, image: "🏛️", category: "landmarks" },
  { name: "Colosseum Rome (Height in m)", value: 48, image: "🏟️", category: "landmarks" },
  { name: "Christ the Redeemer Rio (Height in m)", value: 38, image: "🗿", category: "landmarks" },
  { name: "Great Wall of China (Total Length in km)", value: 21196, image: "🧱", category: "landmarks" },
  { name: "Panama Canal (Length in km)", value: 82, image: "🚢", category: "landmarks" },
  { name: "Suez Canal (Length in km)", value: 193, image: "🚢", category: "landmarks" },
  { name: "Golden Gate Bridge (Total Length in m)", value: 2737, image: "🌉", category: "landmarks" },
  { name: "Brooklyn Bridge (Total Length in m)", value: 1825, image: "🌉", category: "landmarks" },
  { name: "Tower Bridge London (Length in m)", value: 244, image: "🌉", category: "landmarks" },
  { name: "Hoover Dam (Height in m)", value: 221, image: "🧱", category: "landmarks" },
  { name: "Three Gorges Dam (Length in m)", value: 2335, image: "🧱", category: "landmarks" },
  { name: "Taj Mahal (Height in m)", value: 73, image: "🕌", category: "landmarks" },

  // Animals & Nature Records
  { name: "Blue Whale (Average Weight in kg)", value: 150000, image: "🐋", category: "animals" },
  { name: "Sperm Whale (Average Weight in kg)", value: 45000, image: "🐳", category: "animals" },
  { name: "Humpback Whale (Average Weight in kg)", value: 30000, image: "🐋", category: "animals" },
  { name: "Whale Shark (Average Weight in kg)", value: 19000, image: "🦈", category: "animals" },
  { name: "African Bush Elephant (Weight in kg)", value: 6000, image: "🐘", category: "animals" },
  { name: "White Rhinoceros (Weight in kg)", value: 2300, image: "🦏", category: "animals" },
  { name: "Hippopotamus (Weight in kg)", value: 1500, image: "🦛", category: "animals" },
  { name: "Giraffe (Average Weight in kg)", value: 1200, image: "🦒", category: "animals" },
  { name: "Saltwater Crocodile (Weight in kg)", value: 1000, image: "🐊", category: "animals" },
  { name: "Polar Bear (Average Weight in kg)", value: 450, image: "🐻‍❄️", category: "animals" },
  { name: "Grizzly Bear (Average Weight in kg)", value: 270, image: "🐻", category: "animals" },
  { name: "African Lion (Average Weight in kg)", value: 190, image: "🦁", category: "animals" },
  { name: "Bengal Tiger (Average Weight in kg)", value: 220, image: "🐯", category: "animals" },
  { name: "Gorilla (Average Weight in kg)", value: 160, image: "🦍", category: "animals" },
  { name: "Wolf (Average Weight in kg)", value: 45, image: "🐺", category: "animals" },
  { name: "Bald Eagle (Wingspan in cm)", value: 220, image: "🦅", category: "animals" },
  { name: "Wandering Albatross (Wingspan in cm)", value: 350, image: "🕊️", category: "animals" },
  { name: "Giant Ostrich (Height in cm)", value: 270, image: "🦤", category: "animals" },
  { name: "Peregrine Falcon (Diving Speed km/h)", value: 389, image: "🦅", category: "animals" },
  { name: "Golden Eagle (Diving Speed km/h)", value: 320, image: "🦅", category: "animals" },
  { name: "Cheetah (Top Land Speed km/h)", value: 120, image: "🐆", category: "animals" },
  { name: "Pronghorn Antelope (Top Speed km/h)", value: 88, image: "🦌", category: "animals" },
  { name: "Sailfish (Top Swimming Speed km/h)", value: 110, image: "🐟", category: "animals" },
  { name: "Black Marlin (Top Swimming Speed km/h)", value: 129, image: "🐟", category: "animals" },
  { name: "Lion (Top Sprint Speed km/h)", value: 80, image: "🦁", category: "animals" },
  { name: "Greyhound (Top Sprint Speed km/h)", value: 72, image: "🐕", category: "animals" },
  { name: "Giant Redwood Hyperion (Tree Height in m)", value: 116, image: "🌲", category: "animals" },
  { name: "General Sherman Tree (Volume in cubic m)", value: 1487, image: "🌲", category: "animals" },
  { name: "Galapagos Tortoise Lifespan (Years)", value: 175, image: "🐢", category: "animals" },
  { name: "Greenland Shark Lifespan (Years)", value: 400, image: "🦈", category: "animals" },
  { name: "Mayfly Adult Lifespan (Hours)", value: 24, image: "🦟", category: "animals" },

  // Space & Astronomy
  { name: "Moon Distance from Earth (Thousand km)", value: 384, image: "🌙", category: "space" },
  { name: "Mars Closest Distance to Earth (Million km)", value: 55, image: "🔴", category: "space" },
  { name: "Sun Distance from Earth (Million km)", value: 150, image: "☀️", category: "space" },
  { name: "Jupiter Distance from Sun (Million km)", value: 778, image: "🪐", category: "space" },
  { name: "Pluto Distance from Sun (Million km)", value: 5906, image: "🪐", category: "space" },
  { name: "Sun Diameter (Thousand km)", value: 1392, image: "☀️", category: "space" },
  { name: "Jupiter Diameter (Thousand km)", value: 140, image: "🪐", category: "space" },
  { name: "Saturn Ring Span Diameter (Thousand km)", value: 282, image: "🪐", category: "space" },
  { name: "Earth Diameter (km)", value: 12742, image: "🌍", category: "space" },
  { name: "Venus Diameter (km)", value: 12104, image: "🟡", category: "space" },
  { name: "Mars Diameter (km)", value: 6779, image: "🔴", category: "space" },
  { name: "Moon Diameter (km)", value: 3474, image: "🌙", category: "space" },
  { name: "International Space Station (Altitude in km)", value: 408, image: "🛰️", category: "space" },
  { name: "Hubble Space Telescope (Altitude in km)", value: 540, image: "🔭", category: "space" },
  { name: "Geostationary Satellite (Altitude in km)", value: 35786, image: "🛰️", category: "space" },
  { name: "James Webb Space Telescope Distance (Thousand km)", value: 1500, image: "🔭", category: "space" },
  { name: "Voyager 1 Distance from Earth (Billion km)", value: 24, image: "🛰️", category: "space" },
  { name: "Sun Surface Temperature (Degrees Celsius)", value: 5500, image: "☀️", category: "space" },
  { name: "Venus Surface Temperature (Degrees Celsius)", value: 464, image: "🟡", category: "space" },
  { name: "Moon Orbit Period around Earth (Days)", value: 27, image: "🌙", category: "space" },
  { name: "Mars Orbit Period around Sun (Days)", value: 687, image: "🔴", category: "space" },
  { name: "Jupiter Orbit Period around Sun (Years)", value: 12, image: "🪐", category: "space" },
  { name: "Neptune Orbit Period around Sun (Years)", value: 165, image: "🔵", category: "space" },
  { name: "Halley's Comet Orbit Period (Years)", value: 76, image: "☄️", category: "space" },

  // Geography & Earth
  { name: "Mount Everest (Height in m)", value: 8849, image: "🏔️", category: "geography" },
  { name: "K2 Mountain (Height in m)", value: 8611, image: "🏔️", category: "geography" },
  { name: "Kangchenjunga (Height in m)", value: 8586, image: "🏔️", category: "geography" },
  { name: "Mont Blanc Alps (Height in m)", value: 4809, image: "🏔️", category: "geography" },
  { name: "Mount Kilimanjaro (Height in m)", value: 5895, image: "🏔️", category: "geography" },
  { name: "Mount Fuji Japan (Height in m)", value: 3776, image: "🌋", category: "geography" },
  { name: "Mariana Trench Challenger Deep (Depth in m)", value: 10994, image: "🌊", category: "geography" },
  { name: "Puerto Rico Trench (Depth in m)", value: 8376, image: "🌊", category: "geography" },
  { name: "Java Trench (Depth in m)", value: 7450, image: "🌊", category: "geography" },
  { name: "Lake Baikal Maximum Depth (m)", value: 1642, image: "💧", category: "geography" },
  { name: "Lake Superior Maximum Depth (m)", value: 406, image: "💧", category: "geography" },
  { name: "Dead Sea Elevation Below Sea Level (m)", value: 430, image: "🌊", category: "geography" },
  { name: "Nile River (Length in km)", value: 6650, image: "🏞️", category: "geography" },
  { name: "Amazon River (Length in km)", value: 6400, image: "🏞️", category: "geography" },
  { name: "Yangtze River (Length in km)", value: 6300, image: "🏞️", category: "geography" },
  { name: "Mississippi-Missouri River (Length in km)", value: 6275, image: "🏞️", category: "geography" },
  { name: "Danube River (Length in km)", value: 2850, image: "🏞️", category: "geography" },
  { name: "Angel Falls Venezuela (Height in m)", value: 979, image: "💧", category: "geography" },
  { name: "Victoria Falls (Width in m)", value: 1708, image: "💧", category: "geography" },
  { name: "Niagara Falls (Height in m)", value: 51, image: "💧", category: "geography" },
  { name: "Grand Canyon Maximum Depth (m)", value: 1828, image: "🏜️", category: "geography" },
  { name: "Sahara Desert Area (Thousand sq km)", value: 9200, image: "🏜️", category: "geography" },
  { name: "Gobi Desert Area (Thousand sq km)", value: 1295, image: "🏜️", category: "geography" },
  { name: "Antarctica Ice Sheet Thickness (Max m)", value: 4776, image: "🧊", category: "geography" },
  { name: "Pacific Ocean Area (Million sq km)", value: 165, image: "🌊", category: "geography" },
  { name: "Atlantic Ocean Area (Million sq km)", value: 106, image: "🌊", category: "geography" },
  { name: "Indian Ocean Area (Million sq km)", value: 70, image: "🌊", category: "geography" },

  // Human Inventions, Science & History
  { name: "Speed of Light in Vacuum (Thousand km/s)", value: 300, image: "⚡", category: "science" },
  { name: "Speed of Sound in Air (km/h)", value: 1235, image: "🔊", category: "science" },
  { name: "Commercial Jetliner Cruising Speed (km/h)", value: 900, image: "✈️", category: "science" },
  { name: "Concorde Supersonic Speed (km/h)", value: 2179, image: "✈️", category: "science" },
  { name: "Fastest Maglev Bullet Train Speed (km/h)", value: 603, image: "🚄", category: "science" },
  { name: "Formula 1 Car Top Speed (km/h)", value: 372, image: "🏎️", category: "science" },
  { name: "Apollo 10 Max Re-entry Speed (km/h)", value: 39897, image: "🚀", category: "science" },
  { name: "Titanic Ocean Liner Length (m)", value: 269, image: "🚢", category: "science" },
  { name: "Largest Cruise Ship Icon of the Seas (Length in m)", value: 365, image: "🚢", category: "science" },
  { name: "Nimitz-class Aircraft Carrier (Length in m)", value: 333, image: "⚓", category: "science" },
  { name: "Human Body Total Bones", value: 206, image: "🦴", category: "science" },
  { name: "Human Average Heartbeats per Day (Thousands)", value: 100, image: "❤️", category: "science" },
  { name: "Human Body Average Muscle Count", value: 650, image: "💪", category: "science" },
  { name: "Human Brain Neurons (Billions)", value: 86, image: "🧠", category: "science" },
  { name: "Human Taste Buds on Tongue", value: 10000, image: "👅", category: "science" },
  { name: "Periodic Table Chemical Elements", value: 118, image: "🧪", category: "science" },
  { name: "Water Boiling Point at Sea Level (Celsius)", value: 100, image: "☕", category: "science" },
  { name: "Absolute Zero Temperature (Negative Celsius)", value: 273, image: "❄️", category: "science" },
  { name: "Days for Earth to Orbit the Sun", value: 365, image: "🌍", category: "science" },
  { name: "Standard Chess Board Total Squares", value: 64, image: "♟️", category: "science" },
  { name: "Standard Piano Total Keys", value: 88, image: "🎹", category: "science" },
  { name: "Marathon Race Distance (km)", value: 42, image: "🏃", category: "science" },
  { name: "Olympic Swimming Pool Length (m)", value: 50, image: "🏊", category: "science" },
  { name: "Tokyo Metropolitan Population (Millions)", value: 37, image: "🏙️", category: "science" },
  { name: "New York City Population (Millions)", value: 8, image: "🏙️", category: "science" },
  { name: "Moon Landing Apollo 11 (Year)", value: 1969, image: "🚀", category: "science" },
  { name: "First Human in Space Yuri Gagarin (Year)", value: 1961, image: "🧑‍🚀", category: "science" },
  { name: "Invention of World Wide Web by Tim Berners-Lee (Year)", value: 1989, image: "🌐", category: "science" }
];

let lastTriviaSeedIndex = -1;

export function getTriviaItemsBatch(count: number = 8): TriviaItem[] {
  // Balanced sample across categories
  const categories = ["landmarks", "animals", "space", "geography", "science"];
  const poolsByCategory: Record<string, TriviaItem[]> = {};

  categories.forEach(cat => {
    poolsByCategory[cat] = TRIVIA_DATASET.filter(i => i.category === cat);
  });

  const selected: TriviaItem[] = [];
  const usedIndices = new Set<number>();

  // Pick balanced across categories first
  let catIdx = 0;
  while (selected.length < count && usedIndices.size < TRIVIA_DATASET.length) {
    const cat = categories[catIdx % categories.length];
    const catPool = poolsByCategory[cat] || TRIVIA_DATASET;
    const available = catPool.filter(item => {
      const globalIdx = TRIVIA_DATASET.indexOf(item);
      return !usedIndices.has(globalIdx);
    });

    if (available.length > 0) {
      const choice = available[Math.floor(Math.random() * available.length)];
      const choiceIdx = TRIVIA_DATASET.indexOf(choice);
      usedIndices.add(choiceIdx);
      selected.push(choice);
    }
    catIdx++;
  }

  // Shuffle selected items with Fisher-Yates
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  return selected.slice(0, count);
}
