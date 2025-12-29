/**
 * Import OpenFlights Database
 * Downloads and converts OpenFlights airports.dat to our JSON format
 * 
 * Filter: Option B (Moderate)
 * - Must have IATA code
 * - Must have valid timezone
 * - Must have valid coordinates
 * - Type = "airport"
 * 
 * Expected output: ~6,000-8,000 airports
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENFLIGHTS_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat';
const OUTPUT_PATH = path.join(__dirname, '../src/data/airports.json');

/**
 * Download airports.dat from OpenFlights
 */
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    console.log('📥 Downloading OpenFlights airports.dat...');
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        console.log('✅ Download complete!');
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Convert OpenFlights format to our JSON format
 */
function convertToOurFormat(csvData) {
  const lines = csvData.split('\n').filter(line => line.trim());
  const airports = [];
  let filtered = 0;
  
  console.log(`\n📊 Processing ${lines.length} airports...`);
  
  for (const line of lines) {
    try {
      const fields = parseCSVLine(line);
      
      // OpenFlights format:
      // 0: Airport ID
      // 1: Name
      // 2: City
      // 3: Country
      // 4: IATA
      // 5: ICAO
      // 6: Latitude
      // 7: Longitude
      // 8: Altitude
      // 9: Timezone offset
      // 10: DST
      // 11: Tz database timezone
      // 12: Type
      // 13: Source
      
      const iata = fields[4];
      const name = fields[1];
      const city = fields[2];
      const country = fields[3];
      const lat = parseFloat(fields[6]);
      const lon = parseFloat(fields[7]);
      const timezone = fields[11];
      const type = fields[12];
      
      // Option B (Moderate) Filters:
      // 1. Must have IATA code (3 letters, not "\\N")
      if (!iata || iata === '\\N' || iata.length !== 3) {
        filtered++;
        continue;
      }
      
      // 2. Must have valid timezone
      if (!timezone || timezone === '\\N') {
        filtered++;
        continue;
      }
      
      // 3. Type must be "airport" (exclude heliports, etc.)
      if (type && type !== '\\N' && type.toLowerCase() !== 'airport') {
        filtered++;
        continue;
      }
      
      // 4. Must have valid coordinates
      if (isNaN(lat) || isNaN(lon)) {
        filtered++;
        continue;
      }
      
      // Add to our format
      airports.push({
        iata: iata,
        name: name,
        city: city,
        country: country,
        lat: lat,
        lon: lon,
        timezone: timezone
      });
      
    } catch (error) {
      console.warn(`⚠️  Failed to parse line: ${line.substring(0, 50)}...`);
      filtered++;
    }
  }
  
  console.log(`✅ Processed: ${airports.length} airports`);
  console.log(`🚫 Filtered out: ${filtered} airports`);
  
  return airports;
}

/**
 * Sort airports for better search experience
 */
function sortAirports(airports) {
  return airports.sort((a, b) => {
    // Sort by country first, then city, then name
    if (a.country !== b.country) {
      return a.country.localeCompare(b.country);
    }
    if (a.city !== b.city) {
      return a.city.localeCompare(b.city);
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Validate that demo routes still work
 */
function validateDemoRoutes(airports) {
  console.log('\n🔍 Validating demo routes...');
  
  const demoRoutes = [
    { origin: 'LAX', destination: 'JFK' },
    { origin: 'JFK', destination: 'LHR' },
    { origin: 'SFO', destination: 'LHR' },
    { origin: 'SFO', destination: 'NRT' },
    { origin: 'SIN', destination: 'JFK' },
    { origin: 'DXB', destination: 'SIN' },
    { origin: 'LAX', destination: 'SFO' },
    { origin: 'SYD', destination: 'JNB' },
    { origin: 'LHR', destination: 'SYD' },
    { origin: 'MIA', destination: 'BOS' }
  ];
  
  const iataSet = new Set(airports.map(a => a.iata));
  let allValid = true;
  
  for (const route of demoRoutes) {
    const originExists = iataSet.has(route.origin);
    const destExists = iataSet.has(route.destination);
    
    if (!originExists || !destExists) {
      console.error(`❌ Route ${route.origin} → ${route.destination}: Missing airport!`);
      allValid = false;
    } else {
      console.log(`✅ Route ${route.origin} → ${route.destination}: OK`);
    }
  }
  
  return allValid;
}

/**
 * Generate statistics
 */
function generateStats(airports) {
  const countryCount = new Set(airports.map(a => a.country)).size;
  const cityCount = new Set(airports.map(a => a.city)).size;
  
  // Count by region (simplified)
  const regions = {
    'North America': 0,
    'Europe': 0,
    'Asia': 0,
    'Africa': 0,
    'South America': 0,
    'Oceania': 0
  };
  
  // Sample country categorization (simplified)
  const regionMap = {
    'United States': 'North America',
    'Canada': 'North America',
    'Mexico': 'North America',
    'United Kingdom': 'Europe',
    'France': 'Europe',
    'Germany': 'Europe',
    'Spain': 'Europe',
    'Italy': 'Europe',
    'China': 'Asia',
    'Japan': 'Asia',
    'India': 'Asia',
    'South Korea': 'Asia',
    'Australia': 'Oceania',
    'New Zealand': 'Oceania',
    'Brazil': 'South America',
    'Argentina': 'South America',
    'South Africa': 'Africa',
    'Kenya': 'Africa',
    'Nigeria': 'Africa'
  };
  
  airports.forEach(airport => {
    const region = regionMap[airport.country];
    if (region && regions[region] !== undefined) {
      regions[region]++;
    }
  });
  
  console.log('\n📊 Database Statistics:');
  console.log(`   Total Airports: ${airports.length}`);
  console.log(`   Countries: ${countryCount}`);
  console.log(`   Cities: ${cityCount}`);
  console.log('\n   By Region:');
  Object.entries(regions).forEach(([region, count]) => {
    console.log(`   ${region}: ${count}`);
  });
  
  // File size estimation
  const jsonString = JSON.stringify({ airports }, null, 2);
  const sizeKB = (jsonString.length / 1024).toFixed(2);
  const sizeMB = (jsonString.length / (1024 * 1024)).toFixed(2);
  
  console.log(`\n   Estimated file size: ${sizeKB} KB (${sizeMB} MB)`);
}

/**
 * Save to JSON file
 */
function saveToFile(airports, outputPath) {
  const data = {
    airports: airports
  };
  
  const jsonString = JSON.stringify(data, null, 2);
  
  // Create directory if it doesn't exist
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, jsonString, 'utf8');
  console.log(`\n✅ Saved to: ${outputPath}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 OpenFlights Airport Database Import');
  console.log('=====================================\n');
  console.log('Filter: Option B (Moderate)');
  console.log('- Must have IATA code');
  console.log('- Must have valid timezone');
  console.log('- Must have valid coordinates');
  console.log('- Type = "airport"\n');
  
  try {
    // Download data
    const csvData = await downloadFile(OPENFLIGHTS_URL);
    
    // Convert to our format
    const airports = convertToOurFormat(csvData);
    
    // Sort for better UX
    const sortedAirports = sortAirports(airports);
    
    // Validate demo routes
    const routesValid = validateDemoRoutes(sortedAirports);
    
    if (!routesValid) {
      console.error('\n❌ Some demo routes have missing airports!');
      console.log('Continuing anyway, but you may need to update demo routes.');
    }
    
    // Generate statistics
    generateStats(sortedAirports);
    
    // Save to file
    saveToFile(sortedAirports, OUTPUT_PATH);
    
    console.log('\n🎉 Import complete!');
    console.log('\nNext steps:');
    console.log('1. Test autocomplete: npm run dev');
    console.log('2. Verify search works with city/country names');
    console.log('3. Check that demo routes still load');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();

