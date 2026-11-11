import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  TrendingUp, 
  AlertTriangle, 
  Activity, 
  Clock, 
  Wind, 
  Thermometer, 
  Droplets, 
  CheckCircle2, 
  Filter, 
  Eye, 
  PlusCircle, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldAlert,
  Calendar,
  FileCheck2,
  RefreshCw
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AqiBadge from '../components/AqiBadge';
import LeafletMap from '../components/LeafletMap';
import ShapWaterfall from '../components/ShapWaterfall';
import ActionModal from '../components/ActionModal';
import { 
  fetchLocations, 
  fetchCurrentAirQuality, 
  fetchAqiPredictions, 
  fetchAuthorityRecommendations, 
  fetchAuthorityActions, 
  saveAuthorityAction,
  fetchAlerts,
  fetchExplanations,
  subscribeToTelemetry,
  toggleTelemetryStream
} from '../services/api';

export default function AuthorityDashboard() {
  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState('DEL_AV_01');
  const [currentAirQuality, setCurrentAirQuality] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [actions, setActions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [explanations, setExplanations] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'map' | 'recommendations' | 'actions' | 'alerts'
  const [mapFilter, setMapFilter] = useState('all');
  const [modalAction, setModalAction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streamPacket, setStreamPacket] = useState({ packet_id: 1, timestamp: new Date().toISOString() });
  const [isStreaming, setIsStreaming] = useState(true);

  // Subscribe to dynamic interval telemetry stream
  useEffect(() => {
    const unsubscribe = subscribeToTelemetry((update) => {
      setStreamPacket({
        packet_id: update.packet_id,
        timestamp: update.timestamp,
        interval_seconds: update.interval_seconds
      });
      setStations(update.stations);

      // Dynamically update the selected station observation
      const curr = update.stations.find(s => s.station_id === selectedStationId) || update.stations[0];
      if (curr) {
        setCurrentAirQuality(curr);
      }
    });

    return () => unsubscribe();
  }, [selectedStationId]);

  // Load initial station data
  useEffect(() => {
    async function loadInitial() {
      try {
        const [locs, allCurrent, alertsData, actionsData] = await Promise.all([
          fetchLocations(),
          fetchCurrentAirQuality(),
          fetchAlerts(),
          fetchAuthorityActions()
        ]);
        setStations(Array.isArray(allCurrent) ? allCurrent : locs);
        setAlerts(alertsData);
        setActions(actionsData);
      } catch (err) {
        console.error('Failed to load initial authority data', err);
      }
    }
    loadInitial();
  }, []);

  // Load station-specific details on station change
  useEffect(() => {
    async function loadStationData() {
      if (!selectedStationId) return;
      setLoading(true);
      try {
        const [curr, preds, recs, expl] = await Promise.all([
          fetchCurrentAirQuality(selectedStationId),
          fetchAqiPredictions(selectedStationId),
          fetchAuthorityRecommendations(selectedStationId),
          fetchExplanations(selectedStationId, 'pm25')
        ]);
        setCurrentAirQuality(curr);
        setPredictions(preds);
        setRecommendations(recs.recommendations || []);
        setExplanations(expl.explanation);
      } catch (err) {
        console.error('Failed to load station data', err);
      } finally {
        setLoading(false);
      }
    }
    loadStationData();
  }, [selectedStationId]);

  const handleSaveAction = async (updatedAction) => {
    try {
      await saveAuthorityAction(updatedAction);
      const updatedList = await fetchAuthorityActions();
      setActions(updatedList);
    } catch (err) {
      console.error(err);
    }
  };

  const selectedStationObj = stations.find(s => s.station_id === selectedStationId) || stations[0];
  const h6 = predictions?.forecasts?.h6;
  const h12 = predictions?.forecasts?.h12;
  const h24 = predictions?.forecasts?.h24;

  return (
    <div className="min-h-screen flex flex-col bg-base-50 text-base-900">
      <Navbar />

      {/* Authority Command Header */}
      <section className="bg-white border-b border-base-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1 rounded-lg bg-authority-50 text-authority-700 border border-authority-200">
                  <Building2 className="w-4 h-4" />
                </span>
                <span className="text-xs uppercase font-mono font-bold tracking-wider text-authority-700">
                  Authority Command & Decision Support
                </span>
              </div>
              <h1 className="text-2xl font-black text-base-900 tracking-tight">
                National Capital Region CAAQMS Surveillance
              </h1>
              <p className="text-xs text-base-500 mt-0.5">
                Multi-Horizon Forecasting Engine • CPCB NAQI Compliance • Graded Response Action Plan (GRAP)
              </p>
            </div>

            {/* Station Selector Dropdown */}
            <div className="flex items-center gap-3 bg-base-50 p-2 rounded-xl border border-base-200">
              <MapPin className="w-4 h-4 text-authority-600 shrink-0" />
              <div className="text-left">
                <span className="block text-[10px] text-base-400 font-medium">Monitoring Station:</span>
                <select
                  value={selectedStationId}
                  onChange={(e) => setSelectedStationId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-base-800 focus:outline-none cursor-pointer"
                >
                  {stations.map((s) => (
                    <option key={s.station_id} value={s.station_id}>
                      {s.station_name || s.name} ({s.agency || 'CPCB'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dynamic Interval Telemetry Status Banner */}
          <div className="mt-4 p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                <span>Dynamic Telemetry Stream Active</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-200/70 text-emerald-800 text-[10px] font-mono">
                  Interval: 5s
                </span>
              </span>
              <span className="text-emerald-700 hidden sm:inline">•</span>
              <span className="text-emerald-800 font-mono text-[11px] hidden sm:inline">
                Packet #{streamPacket.packet_id} delivered at {new Date(streamPacket.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const active = toggleTelemetryStream();
                  setIsStreaming(active);
                }}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  isStreaming
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                {isStreaming ? 'Stream Running' : 'Stream Paused'}
              </button>
              <button
                onClick={async () => {
                  const [preds, recs] = await Promise.all([
                    fetchAqiPredictions(selectedStationId),
                    fetchAuthorityRecommendations(selectedStationId)
                  ]);
                  setPredictions(preds);
                  setRecommendations(recs.recommendations || []);
                }}
                className="px-2.5 py-1 rounded-lg bg-white border border-base-200 text-base-700 hover:bg-base-100 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                title="Force manual refresh"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Nav Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 mt-6 border-b border-base-200 overflow-x-auto pb-px">
            {[
              { id: 'overview', label: 'Surveillance & Forecasts', icon: Activity },
              { id: 'map', label: 'Spatial Hotspot Map', icon: Layers },
              { id: 'recommendations', label: 'Intervention Engine', icon: ShieldAlert, badge: recommendations.length },
              { id: 'actions', label: 'Action Tracking & History', icon: FileCheck2, badge: actions.length },
              { id: 'alerts', label: 'Active Alerts', icon: AlertTriangle, badge: alerts.length },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
                    isActive
                      ? 'border-authority-600 text-authority-700 bg-authority-50/50 rounded-t-lg'
                      : 'border-transparent text-base-600 hover:text-base-900 hover:border-base-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-authority-600 text-white' : 'bg-base-200 text-base-700'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Tab 1: Overview & Forecasts */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPI Cards: Current vs 6h, 12h, 24h Forecasts */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-base-900">Multi-Horizon Air Quality Trajectory</h2>
                <span className="text-[11px] text-base-500 font-mono">
                  Observed vs Direct Random Forest Horizons
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Latest Observed */}
                <div className="bg-white rounded-2xl p-5 border border-base-200 shadow-soft relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-base-500 bg-base-100 px-2 py-0.5 rounded">
                      Latest Observed
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="text-3xl font-black text-base-900 tracking-tight my-1">
                    {Math.round(currentAirQuality?.aqi || 0)}
                  </div>
                  <div className="mb-3">
                    <AqiBadge 
                      category={currentAirQuality?.category || 'Moderate'} 
                      code={currentAirQuality?.category_code}
                    />
                  </div>
                  <div className="text-[11px] text-base-500 border-t border-base-100 pt-2 flex justify-between">
                    <span>Dominant Pollutant:</span>
                    <strong className="text-base-800">{currentAirQuality?.dominant_pollutant || 'PM2.5'}</strong>
                  </div>
                </div>

                {/* 2. Forecast 6 Hours */}
                <div className="bg-white rounded-2xl p-5 border-2 border-authority-100 shadow-soft relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-authority-700 bg-authority-50 px-2 py-0.5 rounded border border-authority-200">
                      Forecast +6 Hours
                    </span>
                    <Clock className="w-3.5 h-3.5 text-authority-600" />
                  </div>
                  <div className="text-3xl font-black text-authority-900 tracking-tight my-1">
                    {Math.round(h6?.aqi || 0)}
                  </div>
                  <div className="mb-3">
                    <AqiBadge category={h6?.category || 'Moderate'} code={h6?.category_code} />
                  </div>
                  <div className="text-[11px] text-base-500 border-t border-base-100 pt-2 flex justify-between">
                    <span>Target Time:</span>
                    <span className="font-mono text-base-700">{h6?.target_timestamp?.slice(11, 16) || '+6h'}</span>
                  </div>
                </div>

                {/* 3. Forecast 12 Hours */}
                <div className="bg-white rounded-2xl p-5 border border-base-200 shadow-soft relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-base-600 bg-base-100 px-2 py-0.5 rounded">
                      Forecast +12 Hours
                    </span>
                    <Clock className="w-3.5 h-3.5 text-base-400" />
                  </div>
                  <div className="text-3xl font-black text-base-900 tracking-tight my-1">
                    {Math.round(h12?.aqi || 0)}
                  </div>
                  <div className="mb-3">
                    <AqiBadge category={h12?.category || 'Moderate'} code={h12?.category_code} />
                  </div>
                  <div className="text-[11px] text-base-500 border-t border-base-100 pt-2 flex justify-between">
                    <span>Target Time:</span>
                    <span className="font-mono text-base-700">{h12?.target_timestamp?.slice(11, 16) || '+12h'}</span>
                  </div>
                </div>

                {/* 4. Forecast 24 Hours */}
                <div className="bg-white rounded-2xl p-5 border border-base-200 shadow-soft relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-base-600 bg-base-100 px-2 py-0.5 rounded">
                      Forecast +24 Hours
                    </span>
                    <Clock className="w-3.5 h-3.5 text-base-400" />
                  </div>
                  <div className="text-3xl font-black text-base-900 tracking-tight my-1">
                    {Math.round(h24?.aqi || 0)}
                  </div>
                  <div className="mb-3">
                    <AqiBadge category={h24?.category || 'Moderate'} code={h24?.category_code} />
                  </div>
                  <div className="text-[11px] text-base-500 border-t border-base-100 pt-2 flex justify-between">
                    <span>Trend Trajectory:</span>
                    <span className="font-bold text-base-700">
                      {(h24?.aqi || 0) > (currentAirQuality?.aqi || 0) ? 'Deteriorating' : 'Improving'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Criteria Pollutants Matrix */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-base-900">Criteria Pollutant Telemetry & Sub-Indices (CPCB NAQI)</h3>
                <span className="text-[11px] text-base-500">Breakdown of all 6 monitored criteria pollutants</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { key: 'pm25', name: 'PM2.5', unit: 'µg/m³', limit: '60 standard' },
                  { key: 'pm10', name: 'PM10', unit: 'µg/m³', limit: '100 standard' },
                  { key: 'no2', name: 'NO2', unit: 'µg/m³', limit: '80 standard' },
                  { key: 'so2', name: 'SO2', unit: 'µg/m³', limit: '80 standard' },
                  { key: 'co', name: 'CO', unit: 'mg/m³', limit: '2.0 standard' },
                  { key: 'o3', name: 'Ozone (O3)', unit: 'µg/m³', limit: '100 standard' },
                ].map((pol) => {
                  const obsVal = currentAirQuality?.observed_pollutants?.[pol.key];
                  const subIdx = currentAirQuality?.sub_indices?.[pol.key];
                  const pred6h = h6?.concentrations?.[pol.key];
                  const isDominant = currentAirQuality?.dominant_pollutant === pol.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

                  return (
                    <div 
                      key={pol.key}
                      className={`p-4 rounded-xl border transition-all ${
                        isDominant 
                          ? 'bg-authority-50/40 border-authority-300 shadow-soft' 
                          : 'bg-white border-base-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-base-800">{pol.name}</span>
                        {isDominant && (
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-authority-600 text-white">
                            Dominant
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-black text-base-900 my-0.5">
                        {obsVal !== undefined ? obsVal : '--'} <span className="text-[10px] font-normal text-base-400">{pol.unit}</span>
                      </div>
                      <div className="text-[11px] text-base-500 font-mono mb-2">
                        Sub-Index: <strong>{subIdx ? Math.round(subIdx) : '--'}</strong>
                      </div>
                      <div className="border-t border-base-100 pt-1.5 text-[10px] text-base-400 flex justify-between">
                        <span>+6h Forecast:</span>
                        <strong className="text-base-700">{pred6h !== undefined ? pred6h : '--'}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Surface Meteorology & SHAP Factor Waterfall */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Meteorology Card */}
              <div className="bg-white rounded-2xl p-6 border border-base-200 shadow-soft">
                <h3 className="font-bold text-base-900 text-sm mb-4 flex items-center gap-2">
                  <Wind className="w-4 h-4 text-blue-600" />
                  <span>Boundary Layer & Meteorology</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-base-50 border border-base-100">
                    <span className="text-base-600 flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                      <span>Temperature:</span>
                    </span>
                    <strong className="font-mono text-base-800">{currentAirQuality?.meteorology?.temperature ?? 24.5} °C</strong>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-base-50 border border-base-100">
                    <span className="text-base-600 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Relative Humidity:</span>
                    </span>
                    <strong className="font-mono text-base-800">{currentAirQuality?.meteorology?.humidity ?? 62} %</strong>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-base-50 border border-base-100">
                    <span className="text-base-600 flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Wind Speed:</span>
                    </span>
                    <strong className="font-mono text-base-800">{currentAirQuality?.meteorology?.wind_speed ?? 2.1} m/s</strong>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-base-50 border border-base-100">
                    <span className="text-base-600">Wind Direction:</span>
                    <strong className="font-mono text-base-800">{currentAirQuality?.meteorology?.wind_direction ?? 280}° (NW)</strong>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-800 leading-relaxed mt-4">
                    <strong>Dispersion State: </strong>
                    {(currentAirQuality?.meteorology?.wind_speed || 2.1) < 1.5 
                      ? 'Calm surface winds trapping local particulate matter under winter inversion.'
                      : 'Moderate ventilation assisting horizontal dispersion.'}
                  </div>
                </div>
              </div>

              {/* Local SHAP Waterfall Component */}
              <div className="lg:col-span-2">
                <ShapWaterfall
                  factors={explanations?.factors || []}
                  baseValue={explanations?.base_value || 75}
                  predictedValue={h6?.concentrations?.pm25}
                  pollutant="PM2.5"
                  summary={explanations?.summary}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Spatial Map & Hotspots */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-base-900">Delhi NCR Spatial Surveillance Network</h2>
                <p className="text-xs text-base-500">Live Continuous Ambient Air Quality Monitoring Stations (CAAQMS)</p>
              </div>

              {/* Map Filter Controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-base-500">Filter:</span>
                <div className="bg-white p-1 rounded-xl border border-base-200 flex gap-1">
                  <button
                    onClick={() => setMapFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      mapFilter === 'all' ? 'bg-authority-600 text-white' : 'text-base-600 hover:bg-base-100'
                    }`}
                  >
                    All Stations ({stations.length})
                  </button>
                  <button
                    onClick={() => setMapFilter('hotspots')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      mapFilter === 'hotspots' ? 'bg-rose-600 text-white' : 'text-base-600 hover:bg-base-100'
                    }`}
                  >
                    Hotspots Only (AQI ≥ 250)
                  </button>
                </div>
              </div>
            </div>

            {/* Map Container */}
            <div className="h-[520px]">
              <LeafletMap 
                stations={stations}
                selectedStationId={selectedStationId}
                onSelectStation={(id) => setSelectedStationId(id)}
                activeFilter={mapFilter}
              />
            </div>

            {/* Station Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {stations.map((st) => (
                <div
                  key={st.station_id}
                  onClick={() => setSelectedStationId(st.station_id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    st.station_id === selectedStationId
                      ? 'border-authority-500 bg-authority-50/50 shadow-soft'
                      : 'border-base-200 bg-white hover:border-base-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-base-900">{st.station_name || st.name}</span>
                    <span className="text-[10px] text-base-400 font-mono">{st.agency || 'CPCB'}</span>
                  </div>
                  <div className="text-[11px] text-base-500 mb-2 truncate">{st.station_type || st.type}</div>
                  <div className="flex items-center justify-between">
                    <AqiBadge category={st.category || 'Moderate'} aqi={st.aqi} size="sm" />
                    <span className="text-[10px] font-semibold text-authority-700">Select →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Intervention Engine */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-base-200">
              <div>
                <h2 className="text-lg font-bold text-base-900">Pollutant-Specific Municipal Interventions</h2>
                <p className="text-xs text-base-500">
                  Targeted regulatory and operational investigations generated for <strong>{selectedStationObj?.station_name || 'Selected Station'}</strong>.
                </p>
              </div>

              <div className="text-xs text-base-500 font-mono bg-base-100 px-3 py-1.5 rounded-lg border border-base-200">
                Active Suggestions: <strong>{recommendations.length}</strong>
              </div>
            </div>

            {/* Disclaimer Alert */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Operational Decision Support:</strong> These suggestions are evidence-backed investigation directives derived from machine-learning pollutant forecast trajectories and local station context. They do not constitute automatic government gazette decrees.
              </div>
            </div>

            {/* Recommendations List */}
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div key={rec.id} className="bg-white rounded-2xl p-6 border border-base-200 shadow-soft">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-base-100 gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                        rec.priority === 'Immediate' 
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : rec.priority === 'High'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}>
                        {rec.priority} Priority
                      </span>
                      <span className="font-mono text-xs text-base-400">{rec.pollutant}</span>
                      <span className="text-xs text-base-400">•</span>
                      <span className="text-xs font-semibold text-base-600">{rec.department}</span>
                    </div>

                    <button
                      onClick={() => {
                        setModalAction({
                          id: rec.id,
                          station_id: selectedStationId,
                          station_name: selectedStationObj?.station_name || 'Station',
                          pollutant: rec.pollutant,
                          action_title: rec.title,
                          action_type: rec.action_type,
                          department: rec.department,
                          priority: rec.priority,
                          severity: rec.severity,
                          status: 'Pending',
                          pre_intervention_aqi: currentAirQuality?.aqi
                        });
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-authority-600 hover:bg-authority-700 text-white text-xs font-semibold shadow-soft transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Dispatch Intervention</span>
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-base-900 mt-3 mb-2">{rec.title}</h3>
                  <p className="text-xs text-base-700 leading-relaxed mb-4">{rec.description}</p>

                  <div className="p-3 bg-base-50 rounded-xl border border-base-100 text-xs mb-4">
                    <strong className="text-base-800 block text-[11px] mb-1">Atmospheric & Scientific Rationale:</strong>
                    <span className="text-base-600 leading-relaxed">{rec.scientific_rationale}</span>
                  </div>

                  {rec.suggested_actions && (
                    <div>
                      <span className="text-[11px] font-bold text-base-800 block mb-2">Recommended Operational Checklist:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {rec.suggested_actions.map((act, i) => (
                          <div key={i} className="flex items-start gap-2 text-base-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-authority-500 mt-1.5 shrink-0" />
                            <span>{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Action Tracking & History */}
        {activeTab === 'actions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-base-200">
              <div>
                <h2 className="text-lg font-bold text-base-900">Authority Action Log & Attenuation Verification</h2>
                <p className="text-xs text-base-500">
                  Track ongoing municipal deployments and record before-and-after air quality evaluations.
                </p>
              </div>

              <button
                onClick={() => {
                  setModalAction({
                    station_id: selectedStationId,
                    station_name: selectedStationObj?.station_name || 'Station',
                    pollutant: 'PM2.5',
                    action_title: 'Custom Field Intervention',
                    action_type: 'Municipal Enforcement',
                    department: 'DPCC / Municipal Corporation',
                    priority: 'High',
                    severity: 'High',
                    status: 'In Progress',
                    pre_intervention_aqi: currentAirQuality?.aqi
                  });
                  setIsModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-authority-600 hover:bg-authority-700 text-white text-xs font-bold shadow-soft flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Log New Action</span>
              </button>
            </div>

            {/* Actions Table */}
            <div className="bg-white rounded-2xl border border-base-200 shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-base-50 border-b border-base-200 text-base-500 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-4">Action ID & Date</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Intervention Title & Dept</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Pre / Post AQI</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-100">
                    {actions.map((act) => (
                      <tr key={act.id} className="hover:bg-base-50/60 transition-colors">
                        <td className="p-4">
                          <span className="font-mono font-bold text-base-900">{act.id}</span>
                          <span className="block text-[10px] text-base-400 mt-0.5">
                            {act.action_date ? new Date(act.action_date).toLocaleDateString() : 'Recent'}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-base-800">
                          {act.station_name}
                        </td>
                        <td className="p-4">
                          <strong className="text-base-900 block">{act.action_title}</strong>
                          <span className="text-[11px] text-base-500">{act.department}</span>
                          {act.action_notes && (
                            <p className="text-[11px] text-base-600 mt-1 italic max-w-sm">"{act.action_notes}"</p>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            act.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : act.status === 'In Progress'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {act.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono">
                          <div>Pre: <strong>{act.pre_intervention_aqi ? Math.round(act.pre_intervention_aqi) : '--'}</strong></div>
                          {act.post_intervention_aqi ? (
                            <div className="text-emerald-700 font-bold">
                              Post: {Math.round(act.post_intervention_aqi)}
                              {act.pre_intervention_aqi && (
                                <span className="text-[10px] ml-1">
                                  ({Math.round(((act.post_intervention_aqi - act.pre_intervention_aqi) / act.pre_intervention_aqi) * 100)}%)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-base-400">Monitoring...</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setModalAction(act);
                              setIsModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-base-200 text-authority-700 hover:bg-authority-50 font-semibold"
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Active Alerts */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-base-200">
              <h2 className="text-lg font-bold text-base-900">Automated Forecast Surveillance Alerts</h2>
              <p className="text-xs text-base-500">
                Triggered automatically when machine learning models predict threshold breaches or rapid pollution surges.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.map((alt) => (
                <div key={alt.id} className="bg-white rounded-2xl p-5 border border-base-200 shadow-soft">
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-1.5 font-bold text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{alt.alert_type}</span>
                    </span>
                    <span className="text-[10px] font-mono text-base-400">Horizon: +{alt.forecast_horizon}h</span>
                  </div>

                  <h3 className="font-bold text-base text-base-900 mb-1">{alt.station_name}</h3>
                  <p className="text-xs text-base-600 leading-relaxed mb-4">{alt.message}</p>

                  <div className="flex items-center justify-between text-xs pt-3 border-t border-base-100 font-mono">
                    <span className="text-base-500">Predicted {alt.pollutant}: <strong className="text-rose-600">{alt.predicted_value}</strong></span>
                    <span className="text-base-400">Threshold: {alt.threshold_value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* Action Update Modal */}
      <ActionModal
        isOpen={isModalOpen}
        action={modalAction}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAction}
      />
    </div>
  );
}
