import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  Search, 
  Clock, 
  Wind, 
  AlertCircle, 
  HeartHandshake, 
  Activity, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Info,
  Shield,
  HelpCircle,
  Home,
  Check
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AqiBadge from '../components/AqiBadge';
import { 
  fetchLocations, 
  fetchCurrentAirQuality, 
  fetchAqiPredictions, 
  fetchCitizenAdvisory,
  fetchAirQualityHistory,
  subscribeToTelemetry 
} from '../services/api';

export default function CitizenDashboard() {
  const [locations, setLocations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState('DEL_AV_01');
  const [selectedProfile, setSelectedProfile] = useState('general'); // 'general' | 'children' | 'elderly' | 'respiratory'
  const [currentAirQuality, setCurrentAirQuality] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [advisory, setAdvisory] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [streamPacket, setStreamPacket] = useState({ packet_id: 1, timestamp: new Date().toISOString() });

  // Subscribe to dynamic interval telemetry stream
  useEffect(() => {
    const unsubscribe = subscribeToTelemetry((update) => {
      setStreamPacket({
        packet_id: update.packet_id,
        timestamp: update.timestamp,
        interval_seconds: update.interval_seconds
      });
      setLocations(update.stations);

      const current = update.stations.find(s => s.station_id === selectedStationId) || update.stations[0];
      if (current) {
        setCurrentAirQuality(current);
      }
    });

    return () => unsubscribe();
  }, [selectedStationId]);

  // Load locations
  useEffect(() => {
    async function loadLocs() {
      try {
        const locs = await fetchLocations();
        setLocations(locs);
      } catch (err) {
        console.error(err);
      }
    }
    loadLocs();
  }, []);

  // Load air quality, predictions, advisory on change
  useEffect(() => {
    async function loadData() {
      if (!selectedStationId) return;
      setLoading(true);
      try {
        const [curr, preds, adv, hist] = await Promise.all([
          fetchCurrentAirQuality(selectedStationId),
          fetchAqiPredictions(selectedStationId),
          fetchCitizenAdvisory(selectedStationId, selectedProfile),
          fetchAirQualityHistory(selectedStationId, 24)
        ]);
        setCurrentAirQuality(curr);
        setPredictions(preds);
        setAdvisory(adv);
        setHistoryData(hist);
      } catch (err) {
        console.error('Failed to load citizen data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedStationId, selectedProfile]);

  const selectedLocObj = locations.find(l => l.station_id === selectedStationId) || locations[0];
  const h6 = predictions?.forecasts?.h6;
  const h12 = predictions?.forecasts?.h12;
  const h24 = predictions?.forecasts?.h24;

  // Chart data: past 12h + current + 6h, 12h, 24h forecasts
  const chartData = [
    ...(historyData.slice(-8).map(h => ({
      time: h.timestamp?.slice(11, 16) || 'Obs',
      aqi: Math.round(h.aqi || 120),
      pm25: Math.round(h.pm25 || 80),
      isForecast: false
    }))),
    {
      time: 'Now',
      aqi: Math.round(currentAirQuality?.aqi || 150),
      pm25: Math.round(currentAirQuality?.observed_pollutants?.pm25 || 90),
      isForecast: false
    },
    {
      time: '+6h',
      aqi: Math.round(h6?.aqi || 160),
      pm25: Math.round(h6?.concentrations?.pm25 || 95),
      isForecast: true
    },
    {
      time: '+12h',
      aqi: Math.round(h12?.aqi || 155),
      pm25: Math.round(h12?.concentrations?.pm25 || 92),
      isForecast: true
    },
    {
      time: '+24h',
      aqi: Math.round(h24?.aqi || 140),
      pm25: Math.round(h24?.concentrations?.pm25 || 85),
      isForecast: true
    }
  ];

  const filteredLocations = locations.filter(loc => 
    (loc.station_name || loc.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-base-50 text-base-900">
      <Navbar />

      {/* Citizen Header */}
      <section className="bg-gradient-to-b from-citizen-50/50 via-white to-white border-b border-base-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-citizen-100/70 border border-citizen-300 text-citizen-800 text-xs font-semibold mb-3">
                <Users className="w-4 h-4 text-citizen-700" />
                <span>Citizen Health Advisory & Forecasts</span>
              </div>
              <h1 className="text-3xl font-black text-base-900 tracking-tight">
                Clear Air Guidance for You and Your Family
              </h1>
              <p className="text-xs sm:text-sm text-base-600 mt-1 max-w-2xl leading-relaxed">
                Understand what is in your air, why pollution levels change, and what actionable precautions you should take right now.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Dynamic Telemetry Stream • Delivering packets every 5s • Packet #{streamPacket.packet_id}</span>
                </span>
              </div>
            </div>

            {/* Location Search & Selection Box */}
            <div className="w-full lg:w-80 bg-white p-3 rounded-2xl border border-base-200 shadow-soft">
              <label className="block text-[11px] font-bold text-base-600 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-citizen-600" />
                <span>Select Your Locality in Delhi NCR:</span>
              </label>
              <select
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(e.target.value)}
                className="w-full bg-base-50 text-xs font-bold text-base-800 p-2.5 rounded-xl border border-base-200 focus:outline-none focus:border-citizen-500 cursor-pointer"
              >
                {locations.map((loc) => (
                  <option key={loc.station_id} value={loc.station_id}>
                    {loc.station_name || loc.name} ({loc.station_type || 'Residential'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Vulnerability Profile Selector Buttons */}
          <div className="mt-8 pt-6 border-t border-base-100">
            <span className="block text-xs font-bold text-base-700 mb-3">
              Select Your Vulnerability Profile for Tailored Guidance:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'general', title: 'General Population', subtitle: 'Healthy active adults' },
                { id: 'children', title: 'Children & Students', subtitle: 'Developing lungs, school' },
                { id: 'elderly', title: 'Older Adults (60+)', subtitle: 'Seniors & heart health' },
                { id: 'respiratory', title: 'Asthma / Respiratory', subtitle: 'Chronic pulmonary condition' },
              ].map((prof) => {
                const isSelected = selectedProfile === prof.id;
                return (
                  <button
                    key={prof.id}
                    onClick={() => setSelectedProfile(prof.id)}
                    className={`p-3.5 rounded-2xl text-left border-2 transition-all ${
                      isSelected
                        ? 'border-citizen-500 bg-citizen-50/70 shadow-soft'
                        : 'border-base-200 bg-white hover:border-base-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-black ${isSelected ? 'text-citizen-900' : 'text-base-800'}`}>
                        {prof.title}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-citizen-700" />}
                    </div>
                    <span className="text-[11px] text-base-500 block">{prof.subtitle}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Top Cards: Current AQI & Next 6h, 12h, 24h Forecast */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Large Current AQI Dial Card */}
          <div className="bg-white rounded-3xl p-6 border-2 border-citizen-200 shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-base-500 uppercase tracking-wider">
                  Current Air Quality ({selectedLocObj?.station_name || 'Delhi'})
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              
              <div className="flex items-baseline gap-3 my-2">
                <span className="text-5xl font-black text-base-900 tracking-tight">
                  {Math.round(currentAirQuality?.aqi || 0)}
                </span>
                <span className="text-xs font-mono text-base-400">AQI</span>
              </div>

              <div className="mb-4">
                <AqiBadge 
                  category={currentAirQuality?.category || 'Moderate'} 
                  code={currentAirQuality?.category_code}
                  size="lg"
                />
              </div>

              <p className="text-xs text-base-600 leading-relaxed">
                {currentAirQuality?.health_impact || 'Air quality is within acceptable bounds.'}
              </p>
            </div>

            <div className="pt-4 border-t border-base-100 mt-4 flex items-center justify-between text-xs">
              <span className="text-base-500">Dominant Cause:</span>
              <span className="font-bold text-base-800 bg-base-100 px-2.5 py-1 rounded-lg">
                {currentAirQuality?.dominant_pollutant || 'PM2.5'}
              </span>
            </div>
          </div>

          {/* Forecast Cards: 6h, 12h, 24h Progression */}
          <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-base-200 shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base-900 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-citizen-600" />
                  <span>Upcoming 24-Hour Forecast Timeline</span>
                </h3>
                <span className="text-[11px] text-base-400 font-mono">Random Forest Direct Horizon</span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-4 rounded-2xl bg-base-50 border border-base-200 text-center">
                  <span className="text-[10px] text-base-500 uppercase font-bold block mb-1">In 6 Hours</span>
                  <div className="text-2xl font-black text-base-900 my-1">{Math.round(h6?.aqi || 0)}</div>
                  <AqiBadge category={h6?.category || 'Moderate'} code={h6?.category_code} size="sm" />
                </div>

                <div className="p-4 rounded-2xl bg-base-50 border border-base-200 text-center">
                  <span className="text-[10px] text-base-500 uppercase font-bold block mb-1">In 12 Hours</span>
                  <div className="text-2xl font-black text-base-900 my-1">{Math.round(h12?.aqi || 0)}</div>
                  <AqiBadge category={h12?.category || 'Moderate'} code={h12?.category_code} size="sm" />
                </div>

                <div className="p-4 rounded-2xl bg-base-50 border border-base-200 text-center">
                  <span className="text-[10px] text-base-500 uppercase font-bold block mb-1">In 24 Hours</span>
                  <div className="text-2xl font-black text-base-900 my-1">{Math.round(h24?.aqi || 0)}</div>
                  <AqiBadge category={h24?.category || 'Moderate'} code={h24?.category_code} size="sm" />
                </div>
              </div>

              {/* Forecast Trajectory Visual */}
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                    />
                    <Area type="monotone" dataKey="aqi" stroke="#16a34a" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAqi)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="pt-3 border-t border-base-100 text-[11px] text-base-500 flex items-center justify-between">
              <span>Expected trend: <strong>{advisory?.forecast_comparison?.trend?.toUpperCase() || 'STABLE'}</strong></span>
              <span className="text-citizen-700 font-semibold">Forecasts updated hourly</span>
            </div>
          </div>
        </div>

        {/* Personalized Health Guidance Box */}
        {advisory && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-base-200 shadow-soft space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-base-100 gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-citizen-800 bg-citizen-50 px-2.5 py-0.5 rounded border border-citizen-200 font-mono">
                  Personalized Advisory • {selectedProfile.toUpperCase()}
                </span>
                <h2 className="text-xl font-bold text-base-900 mt-1">Recommended Precautions & Activity Guide</h2>
              </div>

              <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                advisory.outdoor_class === 'danger' || advisory.outdoor_class === 'emergency'
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : advisory.outdoor_class === 'warning'
                  ? 'bg-orange-50 text-orange-800 border-orange-300'
                  : advisory.outdoor_class === 'caution'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}>
                {advisory.outdoor_status}
              </div>
            </div>

            {/* Core Action Points */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. Outdoor Exertion */}
              <div className="p-5 rounded-2xl bg-base-50 border border-base-200">
                <span className="text-[11px] font-bold text-base-500 uppercase tracking-wider block mb-2">Outdoor Exercise</span>
                <p className="text-xs text-base-700 leading-relaxed font-medium">
                  {advisory.outdoor_advice}
                </p>
              </div>

              {/* 2. Mask Guideline */}
              <div className="p-5 rounded-2xl bg-base-50 border border-base-200">
                <span className="text-[11px] font-bold text-base-500 uppercase tracking-wider block mb-2">Protective Mask (N95)</span>
                <p className="text-xs text-base-700 leading-relaxed font-medium">
                  {advisory.mask_text}
                </p>
              </div>

              {/* 3. Indoor Ventilation */}
              <div className="p-5 rounded-2xl bg-base-50 border border-base-200">
                <span className="text-[11px] font-bold text-base-500 uppercase tracking-wider block mb-2">Home & Ventilation</span>
                <p className="text-xs text-base-700 leading-relaxed font-medium">
                  {advisory.ventilation_advice}
                </p>
              </div>
            </div>

            {/* Profile Specific Notes */}
            {advisory.profile_notes && advisory.profile_notes.length > 0 && (
              <div className="p-4 rounded-2xl bg-citizen-50/60 border border-citizen-200">
                <h4 className="font-bold text-xs text-citizen-900 mb-2">Key Guidance for {advisory.profile_id.toUpperCase()}:</h4>
                <ul className="space-y-1.5 text-xs text-citizen-800">
                  {advisory.profile_notes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-citizen-600 mt-1.5 shrink-0" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Plain Language Pollutant Explanation */}
            {advisory.pollutant_details && (
              <div className="p-5 rounded-2xl bg-base-50 border border-base-200">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-xs text-base-900">
                    Understanding the Dominant Threat: {advisory.pollutant_details.title}
                  </h4>
                </div>
                <p className="text-xs text-base-600 leading-relaxed mb-3">
                  {advisory.pollutant_details.plain_explanation}
                </p>

                <div className="flex flex-wrap gap-2 text-[11px] text-base-500">
                  <span className="font-semibold text-base-700">Watch out for symptoms:</span>
                  {advisory.pollutant_details.primary_symptoms?.map((sym, idx) => (
                    <span key={idx} className="bg-white px-2 py-0.5 rounded border border-base-200 text-base-700">
                      {sym}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Medical Disclaimer */}
            <div className="pt-4 border-t border-base-100 text-[11px] text-base-400 italic">
              {advisory.disclaimer}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
