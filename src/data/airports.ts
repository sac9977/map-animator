import { Waypoint } from '../types/travel';

export interface AirportEntry {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export const WORLD_AIRPORTS: AirportEntry[] = [
  // African Safari & Adventure Gateways
  { iata: 'JRO', icao: 'HTKJ', name: 'Kilimanjaro International Airport', city: 'Arusha / Kilimanjaro', country: 'Tanzania', lat: -3.4294, lng: 37.0745 },
  { iata: 'NBO', icao: 'HKJK', name: 'Jomo Kenyatta International', city: 'Nairobi', country: 'Kenya', lat: -1.3192, lng: 36.9278 },
  { iata: 'ZNZ', icao: 'HTZA', name: 'Abeid Amani Karume International', city: 'Zanzibar City', country: 'Tanzania', lat: -6.2222, lng: 39.2249 },
  { iata: 'SEU', icao: 'HTSN', name: 'Seronera Airstrip', city: 'Serengeti National Park', country: 'Tanzania', lat: -2.3317, lng: 34.8211 },
  { iata: 'ARK', icao: 'HTAR', name: 'Arusha Airport', city: 'Arusha', country: 'Tanzania', lat: -3.3678, lng: 36.6333 },
  { iata: 'DAR', icao: 'HTDA', name: 'Julius Nyerere International', city: 'Dar es Salaam', country: 'Tanzania', lat: -6.8781, lng: 39.2026 },
  { iata: 'CPT', icao: 'FACT', name: 'Cape Town International', city: 'Cape Town', country: 'South Africa', lat: -33.9715, lng: 18.6021 },
  { iata: 'JNB', icao: 'FAOR', name: 'O. R. Tambo International', city: 'Johannesburg', country: 'South Africa', lat: -26.1367, lng: 28.2411 },
  { iata: 'CAI', icao: 'HECA', name: 'Cairo International Airport', city: 'Cairo', country: 'Egypt', lat: 30.1219, lng: 31.4056 },
  { iata: 'MRU', icao: 'FIMP', name: 'Sir Seewoosagur Ramgoolam International', city: 'Plaine Magnien', country: 'Mauritius', lat: -20.4302, lng: 57.6836 },

  // European Gateways
  { iata: 'LHR', icao: 'EGLL', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom', lat: 51.4700, lng: -0.4543 },
  { iata: 'CDG', icao: 'LFPG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', lat: 49.0097, lng: 2.5479 },
  { iata: 'FRA', icao: 'EDDF', name: 'Frankfurt am Main Airport', city: 'Frankfurt', country: 'Germany', lat: 50.0379, lng: 8.5622 },
  { iata: 'AMS', icao: 'EHAM', name: 'Amsterdam Schiphol Airport', city: 'Amsterdam', country: 'Netherlands', lat: 52.3105, lng: 4.7683 },
  { iata: 'ZRH', icao: 'LSZH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland', lat: 47.4582, lng: 8.5555 },
  { iata: 'GVA', icao: 'LSGG', name: 'Geneva Airport', city: 'Geneva', country: 'Switzerland', lat: 46.2370, lng: 6.1092 },
  { iata: 'FCO', icao: 'LIRF', name: 'Leonardo da Vinci–Fiumicino', city: 'Rome', country: 'Italy', lat: 41.8003, lng: 12.2389 },
  { iata: 'BCN', icao: 'LEBL', name: 'Josep Tarradellas Barcelona–El Prat', city: 'Barcelona', country: 'Spain', lat: 41.2974, lng: 2.0833 },
  { iata: 'MAD', icao: 'LEMD', name: 'Adolfo Suárez Madrid–Barajas', city: 'Madrid', country: 'Spain', lat: 40.4839, lng: -3.5680 },
  { iata: 'KEF', icao: 'BIKF', name: 'Keflavik International Airport', city: 'Reykjavik', country: 'Iceland', lat: 63.9850, lng: -22.6056 },
  { iata: 'ATH', icao: 'LGAV', name: 'Athens International Airport', city: 'Athens', country: 'Greece', lat: 37.9364, lng: 23.9445 },
  { iata: 'IST', icao: 'LTFM', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', lat: 41.2753, lng: 28.7519 },

  // North America
  { iata: 'JFK', icao: 'KJFK', name: 'John F. Kennedy International', city: 'New York', country: 'United States', lat: 40.6413, lng: -73.7781 },
  { iata: 'LAX', icao: 'KLAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'United States', lat: 33.9416, lng: -118.4085 },
  { iata: 'SFO', icao: 'KSFO', name: 'San Francisco International', city: 'San Francisco', country: 'United States', lat: 37.6213, lng: -122.3790 },
  { iata: 'ORD', icao: 'KORD', name: "O'Hare International Airport", city: 'Chicago', country: 'United States', lat: 41.9742, lng: -87.9073 },
  { iata: 'MIA', icao: 'KMIA', name: 'Miami International Airport', city: 'Miami', country: 'United States', lat: 25.7959, lng: -80.2870 },
  { iata: 'SEA', icao: 'KSEA', name: 'Seattle-Tacoma International', city: 'Seattle', country: 'United States', lat: 47.4502, lng: -122.3088 },
  { iata: 'YVR', icao: 'CYVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada', lat: 49.1967, lng: -123.1815 },
  { iata: 'YYZ', icao: 'CYYZ', name: 'Toronto Pearson International', city: 'Toronto', country: 'Canada', lat: 43.6777, lng: -79.6248 },
  { iata: 'HNL', icao: 'PHNL', name: 'Daniel K. Inouye International', city: 'Honolulu', country: 'United States', lat: 21.3187, lng: -157.9224 },
  { iata: 'MEX', icao: 'MMMX', name: 'Mexico City International', city: 'Mexico City', country: 'Mexico', lat: 19.4363, lng: -99.0721 },

  // South America
  { iata: 'GRU', icao: 'SBGR', name: 'São Paulo/Guarulhos International', city: 'São Paulo', country: 'Brazil', lat: -23.4356, lng: -46.4731 },
  { iata: 'GIG', icao: 'SBGL', name: 'Rio de Janeiro/Galeão', city: 'Rio de Janeiro', country: 'Brazil', lat: -22.8089, lng: -43.2436 },
  { iata: 'EZE', icao: 'SAEZ', name: 'Ministro Pistarini International', city: 'Buenos Aires', country: 'Argentina', lat: -34.8222, lng: -58.5358 },
  { iata: 'SCL', icao: 'SCEL', name: 'Arturo Merino Benítez International', city: 'Santiago', country: 'Chile', lat: -33.3930, lng: -70.7858 },
  { iata: 'CUZ', icao: 'SPZO', name: 'Alejandro Velasco Astete International', city: 'Cusco', country: 'Peru', lat: -13.5357, lng: -71.9388 },
  { iata: 'LIM', icao: 'SPJC', name: 'Jorge Chávez International', city: 'Lima', country: 'Peru', lat: -12.0219, lng: -77.1143 },

  // Asia & Middle East
  { iata: 'DXB', icao: 'OMDB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates', lat: 25.2532, lng: 55.3657 },
  { iata: 'DOH', icao: 'OTHH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar', lat: 25.2731, lng: 51.6081 },
  { iata: 'HND', icao: 'RJTT', name: 'Tokyo Haneda Airport', city: 'Tokyo', country: 'Japan', lat: 35.5494, lng: 139.7798 },
  { iata: 'NRT', icao: 'RJAA', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', lat: 35.7720, lng: 140.3929 },
  { iata: 'SIN', icao: 'WSSS', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', lat: 1.3644, lng: 103.9915 },
  { iata: 'BKK', icao: 'VTBS', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', lat: 13.6900, lng: 100.7501 },
  { iata: 'HKG', icao: 'VHHH', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong', lat: 22.3080, lng: 113.9185 },
  { iata: 'ICN', icao: 'RKSI', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea', lat: 37.4602, lng: 126.4407 },
  { iata: 'DEL', icao: 'VIDP', name: 'Indira Gandhi International', city: 'Delhi', country: 'India', lat: 28.5562, lng: 77.1000 },
  { iata: 'BOM', icao: 'VABB', name: 'Chhatrapati Shivaji Maharaj International', city: 'Mumbai', country: 'India', lat: 19.0896, lng: 72.8656 },
  { iata: 'KTM', icao: 'VNKT', name: 'Tribhuvan International Airport', city: 'Kathmandu', country: 'Nepal', lat: 27.6966, lng: 85.3591 },
  { iata: 'DPS', icao: 'WADD', name: 'I Gusti Ngurah Rai International', city: 'Bali / Denpasar', country: 'Indonesia', lat: -8.7482, lng: 115.1672 },

  // Oceania
  { iata: 'SYD', icao: 'YSSY', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia', lat: -33.9399, lng: 151.1753 },
  { iata: 'MEL', icao: 'YMML', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia', lat: -37.6690, lng: 144.8410 },
  { iata: 'AKL', icao: 'NZAA', name: 'Auckland Airport', city: 'Auckland', country: 'New Zealand', lat: -37.0082, lng: 174.7850 },
  { iata: 'ZQN', icao: 'NZQN', name: 'Queenstown Airport', city: 'Queenstown', country: 'New Zealand', lat: -45.0216, lng: 168.7392 },
];

export function findAirport(query: string): AirportEntry | undefined {
  const clean = query.trim().toUpperCase();
  return WORLD_AIRPORTS.find(
    a => a.iata === clean || a.icao === clean || a.name.toUpperCase().includes(clean) || a.city.toUpperCase().includes(clean)
  );
}

export function searchAirports(query: string): AirportEntry[] {
  if (!query || query.length < 2) return [];
  const clean = query.trim().toUpperCase();
  return WORLD_AIRPORTS.filter(
    a => a.iata.includes(clean) || a.name.toUpperCase().includes(clean) || a.city.toUpperCase().includes(clean) || a.country.toUpperCase().includes(clean)
  ).slice(0, 8);
}

export function airportToWaypoint(airport: AirportEntry): Waypoint {
  return {
    id: `apt-${airport.iata.toLowerCase()}`,
    name: `${airport.city} (${airport.iata})`,
    lat: airport.lat,
    lng: airport.lng,
    country: airport.country,
    airportCode: airport.iata,
  };
}
