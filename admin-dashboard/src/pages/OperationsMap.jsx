import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Flame,
  Users,
  Briefcase,
  RefreshCw,
  Filter,
  Navigation,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Radio,
  Maximize2,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geoApi } from '../api/geo';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/common/FeedbackStates';

export function OperationsMap() {
  const { isSuperAdmin, federation } = useAuth();
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);
  const [selectedFederation, setSelectedFederation] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | available | on_job | emergency
  const [selectedEntity, setSelectedEntity] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const hasInitiallyFittedRef = useRef(false);

  const loadData = async () => {
    setErrorState(null);
    try {
      const res = await geoApi.getLiveMap(selectedFederation || null);
      setMapData(res);
    } catch (err) {
      setErrorState(err.message || 'Failed to fetch live geospatial operations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hasInitiallyFittedRef.current = false; // Reset fit on federation switch
    loadData();
    const interval = setInterval(loadData, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [selectedFederation]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [19.0760, 72.8777],
        zoom: 11,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      layerGroupRef.current = layerGroup;

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    } catch (err) {
      console.error('Failed to initialize Leaflet map:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, []);

  // Update Map Markers when data or filters change
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // If map not yet created, initialize it
    if (!mapInstanceRef.current) {
      try {
        const map = L.map(mapContainerRef.current, {
          center: [19.0760, 72.8777],
          zoom: 11,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        const layerGroup = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
        layerGroupRef.current = layerGroup;
      } catch (err) {
        console.error('Map init fallback error:', err);
      }
    }

    if (!mapInstanceRef.current || !layerGroupRef.current || !mapData) return;

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    const bounds = [];

    // Custom Marker Icons
    const createCustomIcon = (color, text, isEmergency = false) => {
      return L.divIcon({
        className: 'custom-geo-marker',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background-color: ${color};
            color: white;
            font-size: 11px;
            font-weight: 800;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            cursor: pointer;
            ${isEmergency ? 'animation: pulse 1.5s infinite;' : ''}
          ">
            ${text}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
      });
    };

    // 1. Render Workers
    const workersToRender = (mapData.workers || []).filter((w) => {
      if (statusFilter === 'available') return w.status === 'available';
      if (statusFilter === 'on_job') return w.status === 'on_job';
      if (statusFilter === 'emergency') return false;
      return true;
    });

    workersToRender.forEach((w) => {
      if (w.lat && w.lng && !isNaN(w.lat) && !isNaN(w.lng)) {
        bounds.push([w.lat, w.lng]);
        const color = w.status === 'available' ? '#10B981' : (w.status === 'on_job' ? '#F59E0B' : '#6B7280');
        const iconLetter = w.skill_category ? w.skill_category[0].toUpperCase() : 'W';

        const marker = L.marker([w.lat, w.lng], {
          icon: createCustomIcon(color, iconLetter),
        });

        marker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 180px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-weight: 800; color: #1E293B; font-size: 13px;">${w.full_name}</span>
              <span style="
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 9px;
                font-weight: 800;
                background: ${w.status === 'available' ? '#DCFCE7' : '#FEF3C7'};
                color: ${w.status === 'available' ? '#15803D' : '#B45309'};
              ">${w.status.toUpperCase()}</span>
            </div>
            <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">Role: <strong style="color: #334155;">${w.skill_category.toUpperCase()}</strong></div>
            <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">Federation: <strong style="color: #334155;">${w.federation_name || 'Independent'}</strong></div>
            <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">Rating: <strong>★ ${w.avg_rating || '5.0'}</strong></div>
            <div style="font-size: 10px; color: #94A3B8; margin-top: 6px;">GPS: ${w.lat.toFixed(4)}, ${w.lng.toFixed(4)}</div>
          </div>
        `);

        marker.on('click', () => setSelectedEntity({ type: 'worker', data: w }));
        layerGroup.addLayer(marker);
      }
    });

    // 2. Render Active & Emergency Jobs
    const jobsToRender = (mapData.active_jobs || []).filter((j) => {
      if (statusFilter === 'available') return false;
      if (statusFilter === 'on_job') return !j.is_emergency;
      if (statusFilter === 'emergency') return j.is_emergency;
      return true;
    });

    jobsToRender.forEach((job) => {
      if (job.service_lat && job.service_lng && !isNaN(job.service_lat) && !isNaN(job.service_lng)) {
        bounds.push([job.service_lat, job.service_lng]);
        const isEmergency = job.is_emergency;
        const color = isEmergency ? '#EF4444' : '#3B82F6';
        const iconText = isEmergency ? '⚡' : '📍';

        const marker = L.marker([job.service_lat, job.service_lng], {
          icon: createCustomIcon(color, iconText, isEmergency),
        });

        marker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 200px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-weight: 800; color: #1E293B; font-size: 13px;">${job.skill_category.toUpperCase()}</span>
              <span style="
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 9px;
                font-weight: 800;
                background: ${isEmergency ? '#FEE2E2' : '#DBEAFE'};
                color: ${isEmergency ? '#B91C1C' : '#1D4ED8'};
              ">${isEmergency ? 'EMERGENCY' : job.status.toUpperCase()}</span>
            </div>
            <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">Assigned: <strong style="color: #334155;">${job.worker_name}</strong></div>
            <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">Location: ${job.service_address}</div>
            <div style="font-size: 10px; color: #94A3B8; margin-top: 6px;">Coordinates: ${job.service_lat.toFixed(4)}, ${job.service_lng.toFixed(4)}</div>
          </div>
        `);

        marker.on('click', () => setSelectedEntity({ type: 'job', data: job }));
        layerGroup.addLayer(marker);

        // If worker coordinates available, draw route connection line
        if (job.worker_lat && job.worker_lng && !isNaN(job.worker_lat) && !isNaN(job.worker_lng)) {
          bounds.push([job.worker_lat, job.worker_lng]);
          const routeLine = L.polyline(
            [
              [job.worker_lat, job.worker_lng],
              [job.service_lat, job.service_lng],
            ],
            {
              color: isEmergency ? '#EF4444' : '#3B82F6',
              weight: 3,
              dashArray: '6, 8',
              opacity: 0.8,
            }
          );
          layerGroup.addLayer(routeLine);
        }
      }
    });

    // Fit bounds ONLY on initial load or federation switch, preserving user zoom
    if (mapInstanceRef.current) {
      setTimeout(() => {
        if (!mapInstanceRef.current) return;
        mapInstanceRef.current.invalidateSize();
        if (!hasInitiallyFittedRef.current && bounds.length > 0) {
          hasInitiallyFittedRef.current = true;
          if (bounds.length === 1) {
            mapInstanceRef.current.setView(bounds[0], 12);
          } else if (bounds.length > 1) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
          }
        }
      }, 150);
    }
  }, [mapData, statusFilter]);

  const handleRecenter = () => {
    if (!mapInstanceRef.current || !mapData) return;
    const bounds = [];
    (mapData.workers || []).forEach((w) => {
      if (w.lat && w.lng) bounds.push([w.lat, w.lng]);
    });
    (mapData.active_jobs || []).forEach((j) => {
      if (j.service_lat && j.service_lng) bounds.push([j.service_lat, j.service_lng]);
    });
    if (bounds.length === 1) {
      mapInstanceRef.current.setView(bounds[0], 12);
    } else if (bounds.length > 1) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  };

  const summary = mapData?.summary || {
    total_workers_on_map: 0,
    available_workers: 0,
    busy_workers: 0,
    active_jobs_count: 0,
    emergency_jobs_count: 0,
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-indigo-600" />
            Geospatial Fleet & Operations Map
          </h3>
          <p className="text-xs text-slate-500">
            Realtime location intelligence, live worker telemetry, and emergency dispatch tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Federation Filter (Supervising Admin Global Control) */}
          {isSuperAdmin && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Building2 className="w-4 h-4 text-slate-400" />
              <select
                value={selectedFederation}
                onChange={(e) => setSelectedFederation(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="">All Federations (Global)</option>
                {(mapData?.federations || []).map((fed) => (
                  <option key={fed.id} value={fed.id}>
                    {fed.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Layers</option>
              <option value="available">🟢 Available Workers Only</option>
              <option value="on_job">🟡 On-Job / Transit Only</option>
              <option value="emergency">🔴 Emergency Incidents Only</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Live Sync (10s)
          </div>

          <button
            onClick={handleRecenter}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
            title="Recenter and Fit All Pins"
          >
            <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
            Fit All
          </button>

          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
            title="Refresh Fleet Map"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Fleet Tracked</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{summary.total_workers_on_map}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>Available</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <p className="text-xl font-extrabold text-emerald-700 mt-1">{summary.available_workers}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>On Active Job</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <p className="text-xl font-extrabold text-amber-700 mt-1">{summary.busy_workers}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between text-blue-700 text-xs font-semibold">
            <span>In-Flight Gigs</span>
            <Briefcase className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-extrabold text-blue-700 mt-1">{summary.active_jobs_count}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-red-50/50 border border-red-200 shadow-sm">
          <div className="flex items-center justify-between text-red-700 text-xs font-semibold">
            <span>Emergencies</span>
            <Flame className="w-4 h-4 text-red-500 animate-pulse" />
          </div>
          <p className="text-xl font-extrabold text-red-700 mt-1">{summary.emergency_jobs_count}</p>
        </div>
      </div>

      {/* Main Map Canvas & Side Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm relative" style={{ minHeight: '580px', height: '580px' }}>
          <div ref={mapContainerRef} className="w-full h-full z-0" style={{ minHeight: '580px', height: '100%', width: '100%' }} />
          
          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur px-3 py-2 rounded-xl border border-slate-200 shadow-lg text-[11px] space-y-1">
            <div className="font-bold text-slate-800 text-xs mb-1">Fleet Map Legend</div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-3 h-3 rounded-full bg-emerald-500" /> Available Worker
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-3 h-3 rounded-full bg-amber-500" /> On-Job Worker
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-3 h-3 rounded-full bg-red-500" /> Emergency Incident (⚡)
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-3 h-3 rounded-full bg-blue-500" /> Normal Booking (📍)
            </div>
          </div>
        </div>

        {/* Selected Entity Inspector Panel */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4 flex flex-col justify-between" style={{ height: '580px' }}>
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Live Inspector
              </h4>
              {selectedEntity && (
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Clear
                </button>
              )}
            </div>

            {selectedEntity ? (
              <div className="mt-4 space-y-3.5">
                {selectedEntity.type === 'worker' ? (
                  <>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400">Worker Profile</span>
                      <h5 className="text-base font-extrabold text-slate-900">{selectedEntity.data.full_name}</h5>
                      <p className="text-xs text-indigo-600 font-semibold uppercase mt-0.5">{selectedEntity.data.skill_category}</p>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                        <span>Federation</span>
                        <strong className="text-slate-900">{selectedEntity.data.federation_name}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                        <span>Status</span>
                        <span className={`font-bold ${selectedEntity.data.status === 'available' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {selectedEntity.data.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                        <span>Rating</span>
                        <strong className="text-slate-900">★ {selectedEntity.data.avg_rating || '5.0'}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                        <span>Hourly Rate</span>
                        <strong className="text-slate-900">₹{selectedEntity.data.hourly_rate || 450}/hr</strong>
                      </div>
                      <div className="flex justify-between py-1 text-slate-600">
                        <span>Coordinates</span>
                        <span className="font-mono text-[11px] text-slate-500">{selectedEntity.data.lat.toFixed(4)}, {selectedEntity.data.lng.toFixed(4)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`p-3 rounded-xl border ${selectedEntity.data.is_emergency ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                      <span className="text-[10px] font-extrabold uppercase text-slate-400">
                        {selectedEntity.data.is_emergency ? '⚡ Emergency Incident' : '📍 Active Service Booking'}
                      </span>
                      <h5 className="text-base font-extrabold text-slate-900">{selectedEntity.data.skill_category.toUpperCase()}</h5>
                      <p className="text-xs text-slate-600 mt-1">{selectedEntity.data.service_address}</p>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                        <span>Status</span>
                        <strong className="text-slate-900 uppercase">{selectedEntity.data.status}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                        <span>Assigned Partner</span>
                        <strong className="text-slate-900">{selectedEntity.data.worker_name}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                        <span>Federation</span>
                        <strong className="text-slate-900">{selectedEntity.data.federation_name || 'Pilot'}</strong>
                      </div>
                      {selectedEntity.data.is_emergency && (
                        <div className="flex justify-between py-1 border-b border-slate-100 text-red-600 font-bold">
                          <span>Emergency Surcharge</span>
                          <span>₹{selectedEntity.data.emergency_fee || 50}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <Radio className="w-8 h-8 mx-auto text-slate-300 animate-pulse" />
                <p className="text-xs font-medium">Click any worker pin or incident beacon on the map to inspect live telemetry.</p>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Multi-tenant isolation active. Live telemetry is strictly scoped to authorized administrators.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
