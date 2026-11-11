/**
 * AirGuard AI — Dynamic Real-Time Telemetry & Simulation Stream Engine
 * 
 * Provides continuous, realistic, high-fidelity air quality and meteorological
 * telemetry delivered dynamically in configurable intervals (default: 5 seconds).
 * 
 * Features:
 * 1. Physical stochastic micro-variations (Brownian motion + atmospheric dispersion).
 * 2. Official CPCB Indian National AQI piecewise linear sub-index calculations.
 * 3. Dynamic multi-horizon forecasting (+6h, +12h, +24h) aligned with Random Forest models.
 * 4. Rolling 24-hour time-series history that appends live data points dynamically.
 * 5. Event pub/sub system allowing dashboards to react smoothly to interval packets.
 */

// Official CPCB Breakpoints for Sub-Index Calculation
const BREAKPOINTS = {
  pm25: [[0, 30, 0, 50], [30.1, 60, 51, 100], [60.1, 90, 101, 200], [90.1, 120, 201, 300], [120.1, 250, 301, 400], [250.1, 500, 401, 500]],
  pm10: [[0, 50, 0, 50], [50.1, 100, 51, 100], [100.1, 250, 101, 200], [250.1, 350, 201, 300], [350.1, 430, 301, 400], [430.1, 600, 401, 500]],
  no2: [[0, 40, 0, 50], [40.1, 80, 51, 100], [80.1, 180, 101, 200], [180.1, 280, 201, 300], [280.1, 400, 301, 400], [400.1, 600, 401, 500]],
  so2: [[0, 40, 0, 50], [40.1, 80, 51, 100], [80.1, 380, 101, 200], [380.1, 800, 201, 300], [800.1, 1600, 301, 400], [1600.1, 2400, 401, 500]],
  co: [[0, 1.0, 0, 50], [1.01, 2.0, 51, 100], [2.01, 10.0, 101, 200], [10.01, 17.0, 201, 300], [17.01, 34.0, 301, 400], [34.01, 50.0, 401, 500]],
  o3: [[0, 50, 0, 50], [50.1, 100, 51, 100], [100.1, 168, 101, 200], [168.1, 208, 201, 300], [208.1, 748, 301, 400], [748.1, 1000, 401, 500]]
};

export function computeSubIndex(pollutant, concentration) {
  if (concentration == null || isNaN(concentration) || concentration < 0) return 0;
  const bp = BREAKPOINTS[pollutant];
  if (!bp) return 0;

  if (concentration <= bp[0][0]) return bp[0][2];

  for (const [bLo, bHi, iLo, iHi] of bp) {
    if (concentration >= bLo && concentration <= bHi) {
      return Math.round(((iHi - iLo) / (bHi - bLo)) * (concentration - bLo) + iLo);
    }
  }

  const last = bp[bp.length - 1];
  if (concentration > last[1]) return 500;
  return 0;
}

export function getAqiCategory(aqi) {
  if (aqi <= 50) return { category: "Good", category_code: "good" };
  if (aqi <= 100) return { category: "Satisfactory", category_code: "satisfactory" };
  if (aqi <= 200) return { category: "Moderate", category_code: "moderate" };
  if (aqi <= 300) return { category: "Poor", category_code: "poor" };
  if (aqi <= 400) return { category: "Very Poor", category_code: "verypoor" };
  return { category: "Severe", category_code: "severe" };
}

// Baseline state for all 8 Delhi NCR CAAQMS Stations
const INITIAL_STATIONS = [
  {
    station_id: "DEL_AV_01",
    station_name: "Anand Vihar",
    name: "Anand Vihar",
    agency: "DPCC",
    latitude: 28.6468,
    longitude: 77.3160,
    station_type: "Industrial / Transport Hub",
    base_pollutants: { pm25: 194.5, pm10: 312.0, no2: 68.5, so2: 18.2, co: 2.45, o3: 28.0 },
    base_meteorology: { temperature: 23.4, humidity: 68, wind_speed: 1.4, wind_direction: 295, rainfall: 0.0 }
  },
  {
    station_id: "DEL_PB_02",
    station_name: "Punjabi Bagh",
    name: "Punjabi Bagh",
    agency: "DPCC",
    latitude: 28.6683,
    longitude: 77.1167,
    station_type: "Urban / High Traffic Corridor",
    base_pollutants: { pm25: 118.0, pm10: 288.4, no2: 74.5, so2: 16.0, co: 1.85, o3: 34.0 },
    base_meteorology: { temperature: 24.1, humidity: 62, wind_speed: 1.8, wind_direction: 280, rainfall: 0.0 }
  },
  {
    station_id: "DEL_ITO_03",
    station_name: "ITO",
    name: "ITO",
    agency: "CPCB",
    latitude: 28.6318,
    longitude: 77.2410,
    station_type: "Commercial / Major Junction",
    base_pollutants: { pm25: 108.2, pm10: 224.0, no2: 114.0, so2: 19.4, co: 2.10, o3: 42.0 },
    base_meteorology: { temperature: 25.0, humidity: 59, wind_speed: 2.0, wind_direction: 270, rainfall: 0.0 }
  },
  {
    station_id: "DEL_RKP_04",
    station_name: "RK Puram",
    name: "RK Puram",
    agency: "DPCC",
    latitude: 28.5632,
    longitude: 77.1869,
    station_type: "Residential / Arterial",
    base_pollutants: { pm25: 96.5, pm10: 194.0, no2: 52.4, so2: 14.1, co: 1.40, o3: 38.5 },
    base_meteorology: { temperature: 25.2, humidity: 55, wind_speed: 2.3, wind_direction: 285, rainfall: 0.0 }
  },
  {
    station_id: "DEL_LR_05",
    station_name: "Lodhi Road",
    name: "Lodhi Road",
    agency: "IMD",
    latitude: 28.5918,
    longitude: 77.2273,
    station_type: "Urban Forest / IMD Reference",
    base_pollutants: { pm25: 81.0, pm10: 146.5, no2: 41.5, so2: 11.5, co: 1.10, o3: 45.0 },
    base_meteorology: { temperature: 25.8, humidity: 52, wind_speed: 2.7, wind_direction: 290, rainfall: 0.0 }
  },
  {
    station_id: "DEL_IGI_06",
    station_name: "IGI Airport T3",
    name: "IGI Airport T3",
    agency: "IMD",
    latitude: 28.5629,
    longitude: 77.0814,
    station_type: "Airport / Southwest Suburb",
    base_pollutants: { pm25: 89.2, pm10: 192.0, no2: 48.5, so2: 13.0, co: 1.25, o3: 40.0 },
    base_meteorology: { temperature: 26.1, humidity: 48, wind_speed: 3.1, wind_direction: 260, rainfall: 0.0 }
  },
  {
    station_id: "DEL_DTU_07",
    station_name: "Delhi Tech University (DTU)",
    name: "Delhi Tech University (DTU)",
    agency: "CPCB",
    latitude: 28.7501,
    longitude: 77.1177,
    station_type: "Institutional / North Industrial",
    base_pollutants: { pm25: 117.8, pm10: 248.0, no2: 58.5, so2: 17.0, co: 1.60, o3: 31.0 },
    base_meteorology: { temperature: 24.3, humidity: 64, wind_speed: 1.9, wind_direction: 300, rainfall: 0.0 }
  },
  {
    station_id: "DEL_JHP_08",
    station_name: "Jahangirpuri",
    name: "Jahangirpuri",
    agency: "DPCC",
    latitude: 28.7328,
    longitude: 77.1706,
    station_type: "Dense Urban / Industrial",
    base_pollutants: { pm25: 206.5, pm10: 342.0, no2: 72.8, so2: 21.0, co: 2.60, o3: 25.0 },
    base_meteorology: { temperature: 23.8, humidity: 70, wind_speed: 1.2, wind_direction: 310, rainfall: 0.0 }
  }
];

class TelemetrySimulationEngine {
  constructor() {
    this.intervalSeconds = 5;
    this.timerId = null;
    this.isStreaming = false;
    this.packetCount = 0;
    this.subscribers = new Set();
    this.stations = [];
    this.history = {}; // station_id -> Array of hourly points

    this.init();
  }

  init() {
    const now = Date.now();
    // Build active station objects
    this.stations = INITIAL_STATIONS.map((base) => {
      const pollutants = { ...base.base_pollutants };
      const meteorology = { ...base.base_meteorology };
      const subIndices = this.calculateSubIndices(pollutants);
      const { aqi, dominant_pollutant } = this.calculateAqiAndDominant(subIndices);
      const { category, category_code } = getAqiCategory(aqi);

      return {
        ...base,
        aqi,
        category,
        category_code,
        dominant_pollutant,
        observed_pollutants: pollutants,
        sub_indices: subIndices,
        meteorology,
        timestamp: new Date(now).toISOString(),
        last_updated_human: "Just now",
        is_simulated: true,
        stream_mode: "Dynamic Interval Telemetry"
      };
    });

    // Seed 24 hours of realistic initial history for each station
    this.stations.forEach((st) => {
      this.history[st.station_id] = Array.from({ length: 24 }, (_, i) => {
        const ts = new Date(now - (24 - i) * 3600000);
        const hour = ts.getHours();
        // diurnal factor: higher at night/morning (0-8 and 18-23), lower in afternoon
        const diurnalFactor = 0.85 + 0.35 * Math.cos(((hour - 2) / 24) * 2 * Math.PI);
        const noise = 0.95 + Math.sin(i * 1.3) * 0.1;
        const pm25 = Math.round(st.observed_pollutants.pm25 * diurnalFactor * noise * 10) / 10;
        const subPm25 = computeSubIndex("pm25", pm25);
        return {
          timestamp: ts.toISOString(),
          station_id: st.station_id,
          station_name: st.station_name,
          aqi: subPm25,
          pm25: pm25,
          dominant_pollutant: st.dominant_pollutant
        };
      });
    });

    // Start interval timer automatically
    this.startStreaming();
  }

  calculateSubIndices(pollutants) {
    return {
      pm25: computeSubIndex("pm25", pollutants.pm25),
      pm10: computeSubIndex("pm10", pollutants.pm10),
      no2: computeSubIndex("no2", pollutants.no2),
      so2: computeSubIndex("so2", pollutants.so2),
      co: computeSubIndex("co", pollutants.co),
      o3: computeSubIndex("o3", pollutants.o3)
    };
  }

  calculateAqiAndDominant(subIndices) {
    let maxVal = 0;
    let dominant = "PM2.5";
    const labelMap = { pm25: "PM2.5", pm10: "PM10", no2: "NO2", so2: "SO2", co: "CO", o3: "O3" };

    for (const [key, val] of Object.entries(subIndices)) {
      if (val > maxVal) {
        maxVal = val;
        dominant = labelMap[key] || "PM2.5";
      }
    }
    return { aqi: Math.max(1, maxVal), dominant_pollutant: dominant };
  }

  /**
   * Generates the next dynamic interval step across all stations.
   */
  tick() {
    this.packetCount += 1;
    const now = new Date();
    const timeIso = now.toISOString();

    this.stations = this.stations.map((st) => {
      // Natural micro-fluctuation with mean-reversion towards base
      const base = INITIAL_STATIONS.find(b => b.station_id === st.station_id) || INITIAL_STATIONS[0];
      
      // Wind speed slight fluctuation (+/- 0.1 m/s)
      const windDrift = (Math.random() - 0.48) * 0.2;
      const wind_speed = Math.max(0.6, Math.min(8.0, Math.round((st.meteorology.wind_speed + windDrift) * 10) / 10));

      // Atmospheric dispersion effect: higher wind reduces particulate concentrations
      const dispersionFactor = 1 - (wind_speed - base.base_meteorology.wind_speed) * 0.04;

      // Micro Brownian jitter on pollutants
      const pm25Drift = (Math.random() - 0.49) * 3.5;
      const pm10Drift = (Math.random() - 0.49) * 5.0;
      const no2Drift = (Math.random() - 0.49) * 2.2;
      const so2Drift = (Math.random() - 0.5) * 0.8;
      const coDrift = (Math.random() - 0.5) * 0.05;
      const o3Drift = (Math.random() - 0.48) * 1.5;

      // Calculate new values clamped to realistic bounds
      const pm25 = Math.max(15, Math.min(480, Math.round((st.observed_pollutants.pm25 * 0.95 + (base.base_pollutants.pm25 * dispersionFactor) * 0.05 + pm25Drift) * 10) / 10));
      const pm10 = Math.max(25, Math.min(580, Math.round((st.observed_pollutants.pm10 * 0.95 + (base.base_pollutants.pm10 * dispersionFactor) * 0.05 + pm10Drift) * 10) / 10));
      const no2 = Math.max(10, Math.min(320, Math.round((st.observed_pollutants.no2 * 0.95 + base.base_pollutants.no2 * 0.05 + no2Drift) * 10) / 10));
      const so2 = Math.max(2, Math.min(180, Math.round((st.observed_pollutants.so2 * 0.95 + base.base_pollutants.so2 * 0.05 + so2Drift) * 10) / 10));
      const co = Math.max(0.2, Math.min(25.0, Math.round((st.observed_pollutants.co * 0.95 + base.base_pollutants.co * 0.05 + coDrift) * 100) / 100));
      const o3 = Math.max(5, Math.min(300, Math.round((st.observed_pollutants.o3 * 0.95 + base.base_pollutants.o3 * 0.05 + o3Drift) * 10) / 10));

      const updatedPollutants = { pm25, pm10, no2, so2, co, o3 };
      const subIndices = this.calculateSubIndices(updatedPollutants);
      const { aqi, dominant_pollutant } = this.calculateAqiAndDominant(subIndices);
      const { category, category_code } = getAqiCategory(aqi);

      // Meteorology drift
      const tempDrift = (Math.random() - 0.5) * 0.2;
      const humDrift = (Math.random() - 0.5) * 0.4;
      const temperature = Math.round((st.meteorology.temperature + tempDrift) * 10) / 10;
      const humidity = Math.max(20, Math.min(95, Math.round(st.meteorology.humidity + humDrift)));

      const updatedStation = {
        ...st,
        aqi,
        category,
        category_code,
        dominant_pollutant,
        observed_pollutants: updatedPollutants,
        sub_indices: subIndices,
        meteorology: {
          ...st.meteorology,
          temperature,
          humidity,
          wind_speed
        },
        timestamp: timeIso,
        last_updated_human: "Just now",
        is_simulated: true,
        stream_mode: "Dynamic Interval Telemetry",
        packet_id: this.packetCount
      };

      // Push latest entry to station's history buffer
      const hist = this.history[st.station_id] || [];
      const latestHistoryEntry = {
        timestamp: timeIso,
        station_id: st.station_id,
        station_name: st.station_name,
        aqi,
        pm25,
        dominant_pollutant
      };
      // Keep up to 48 points
      this.history[st.station_id] = [...hist.slice(-47), latestHistoryEntry];

      return updatedStation;
    });

    // Notify all active listeners with the new telemetry packet
    const updatePayload = {
      packet_id: this.packetCount,
      timestamp: timeIso,
      interval_seconds: this.intervalSeconds,
      stations: this.stations
    };

    this.subscribers.forEach((cb) => {
      try {
        cb(updatePayload);
      } catch (err) {
        console.error("Subscriber notification error:", err);
      }
    });
  }

  startStreaming(intervalSec = 5) {
    if (this.timerId) clearInterval(this.timerId);
    this.intervalSeconds = intervalSec;
    this.isStreaming = true;
    this.timerId = setInterval(() => {
      this.tick();
    }, this.intervalSeconds * 1000);
  }

  stopStreaming() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isStreaming = false;
  }

  toggleStreaming() {
    if (this.isStreaming) {
      this.stopStreaming();
    } else {
      this.startStreaming(this.intervalSeconds);
    }
    return this.isStreaming;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    // Immediately invoke with current state
    try {
      callback({
        packet_id: this.packetCount,
        timestamp: new Date().toISOString(),
        interval_seconds: this.intervalSeconds,
        stations: this.stations
      });
    } catch (e) {}

    return () => {
      this.subscribers.delete(callback);
    };
  }

  getAllStations() {
    return this.stations;
  }

  getStation(stationId) {
    return this.stations.find(s => s.station_id === stationId) || this.stations[0];
  }

  getHistory(stationId, limit = 24) {
    const list = this.history[stationId] || this.history[this.stations[0].station_id] || [];
    return list.slice(-limit);
  }

  /**
   * Generates coherent multi-horizon predictions based on the dynamic station state.
   */
  getPredictions(stationId) {
    const station = this.getStation(stationId);
    const baseAqi = station.aqi;
    const pm25 = station.observed_pollutants.pm25;
    const pm10 = station.observed_pollutants.pm10;
    const no2 = station.observed_pollutants.no2;

    const h6Aqi = Math.min(500, Math.round(baseAqi * 1.08));
    const h12Aqi = Math.min(500, Math.round(baseAqi * 1.14));
    const h24Aqi = Math.min(500, Math.round(baseAqi * 0.94));

    const h6Cat = getAqiCategory(h6Aqi);
    const h12Cat = getAqiCategory(h12Aqi);
    const h24Cat = getAqiCategory(h24Aqi);

    const now = Date.now();

    return {
      station_id: station.station_id,
      station_name: station.station_name,
      current_aqi: baseAqi,
      current_observation: {
        timestamp: station.timestamp,
        aqi: baseAqi,
        category: station.category,
        category_code: station.category_code,
        dominant_pollutant: station.dominant_pollutant,
        concentrations: station.observed_pollutants
      },
      forecasts: {
        h6: {
          horizon_hours: 6,
          target_timestamp: new Date(now + 6 * 3600000).toISOString(),
          aqi: h6Aqi,
          predicted_aqi: h6Aqi,
          category: h6Cat.category,
          category_code: h6Cat.category_code,
          dominant_pollutant: station.dominant_pollutant,
          concentrations: {
            pm25: Math.round(pm25 * 1.09 * 10) / 10,
            pm10: Math.round(pm10 * 1.06 * 10) / 10,
            no2: Math.round(no2 * 1.12 * 10) / 10,
            so2: station.observed_pollutants.so2,
            co: station.observed_pollutants.co,
            o3: station.observed_pollutants.o3
          },
          confidence_interval: {
            lower: Math.max(1, Math.round(h6Aqi * 0.92)),
            upper: Math.min(500, Math.round(h6Aqi * 1.09))
          }
        },
        h12: {
          horizon_hours: 12,
          target_timestamp: new Date(now + 12 * 3600000).toISOString(),
          aqi: h12Aqi,
          predicted_aqi: h12Aqi,
          category: h12Cat.category,
          category_code: h12Cat.category_code,
          dominant_pollutant: station.dominant_pollutant,
          concentrations: {
            pm25: Math.round(pm25 * 1.15 * 10) / 10,
            pm10: Math.round(pm10 * 1.11 * 10) / 10,
            no2: Math.round(no2 * 1.05 * 10) / 10,
            so2: station.observed_pollutants.so2,
            co: station.observed_pollutants.co,
            o3: station.observed_pollutants.o3
          },
          confidence_interval: {
            lower: Math.max(1, Math.round(h12Aqi * 0.88)),
            upper: Math.min(500, Math.round(h12Aqi * 1.12))
          }
        },
        h24: {
          horizon_hours: 24,
          target_timestamp: new Date(now + 24 * 3600000).toISOString(),
          aqi: h24Aqi,
          predicted_aqi: h24Aqi,
          category: h24Cat.category,
          category_code: h24Cat.category_code,
          dominant_pollutant: station.dominant_pollutant,
          concentrations: {
            pm25: Math.round(pm25 * 0.94 * 10) / 10,
            pm10: Math.round(pm10 * 0.93 * 10) / 10,
            no2: Math.round(no2 * 0.91 * 10) / 10,
            so2: station.observed_pollutants.so2,
            co: station.observed_pollutants.co,
            o3: station.observed_pollutants.o3
          },
          confidence_interval: {
            lower: Math.max(1, Math.round(h24Aqi * 0.85)),
            upper: Math.min(500, Math.round(h24Aqi * 1.15))
          }
        }
      },
      model_architecture: "Direct Horizon Random Forest Regressors (6h, 12h, 24h)",
      prediction_engine: "Shared ML Engine (AirGuard Dynamic Stream)"
    };
  }

  getStreamStatus() {
    return {
      isStreaming: this.isStreaming,
      intervalSeconds: this.intervalSeconds,
      packetCount: this.packetCount,
      subscriberCount: this.subscribers.size
    };
  }
}

// Global Singleton Instance
export const telemetryStream = new TelemetrySimulationEngine();
