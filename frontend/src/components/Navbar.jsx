import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Activity, Users, FileText, Cpu, AlertTriangle, Radio } from 'lucide-react';
import { fetchHealth } from '../services/api';

export default function Navbar() {
  const location = useLocation();
  const path = location.pathname;
  const [healthInfo, setHealthInfo] = useState({ is_live: null, live_type: null });

  useEffect(() => {
    fetchHealth()
      .then(res => setHealthInfo(res))
      .catch(() => setHealthInfo({ is_live: false, live_type: 'demo' }));
  }, []);

  const isAuth = path.startsWith('/authority');
  const isCitizen = path.startsWith('/citizen');
  const isResearch = path.startsWith('/research') || path === '/about';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-base-200 shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-card group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-base-900">
                  AirGuard<span className="text-blue-600 font-extrabold">AI</span>
                </span>
                {healthInfo.is_live === true ? (
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-xs" title="Live Telemetry Stream delivering CPCB CAAQMS sensor observations in dynamic intervals">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {healthInfo.live_type === 'stream' 
                      ? 'LIVE STREAM (5s INTERVAL)' 
                      : (healthInfo.live_type === 'direct' ? 'LIVE CAAQMS (DIRECT)' : 'LIVE CAAQMS (BACKEND)')}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1" title="Offline Demo Simulation. Run python start_server.py for live ML backend.">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    DEMO SIMULATION
                  </span>
                )}
              </div>
              <p className="text-[11px] text-base-500 hidden sm:block">Explainable Dual-Stakeholder Air Quality Decision Support</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/"
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                path === '/' 
                  ? 'bg-base-100 text-base-900 font-semibold' 
                  : 'text-base-600 hover:text-base-900 hover:bg-base-50'
              }`}
            >
              Overview
            </Link>

            {/* Authority Portal Tab */}
            <Link
              to="/authority"
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${
                isAuth
                  ? 'bg-authority-600 text-white shadow-soft'
                  : 'text-authority-700 hover:bg-authority-50'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Authority Portal</span>
            </Link>

            {/* Citizen Portal Tab */}
            <Link
              to="/citizen"
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${
                isCitizen
                  ? 'bg-citizen-600 text-white shadow-soft'
                  : 'text-citizen-700 hover:bg-citizen-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Citizen Portal</span>
            </Link>

            {/* Explainability Tab */}
            <Link
              to="/research/explainability"
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium hidden md:flex items-center gap-1.5 transition-colors ${
                path.startsWith('/research')
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-base-600 hover:text-base-900 hover:bg-base-50'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>ML & SHAP</span>
            </Link>

            {/* About Research Tab */}
            <Link
              to="/about"
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium hidden lg:flex items-center gap-1.5 transition-colors ${
                path === '/about'
                  ? 'bg-base-100 text-base-900 font-semibold'
                  : 'text-base-600 hover:text-base-900 hover:bg-base-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>About Research</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
