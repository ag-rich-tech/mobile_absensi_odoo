import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix ikon default Leaflet di bundler Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icon Kantor Utama (Oranye Terang - Target Validasi Absensi)
const officeIcon = L.divIcon({
  className: 'custom-map-marker-office',
  html: `
    <div style="
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #f97316, #ea580c);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid #ffffff;
      box-shadow: 0 5px 16px rgba(234, 88, 12, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg style="transform: rotate(45deg); width: 20px; height: 20px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

// Custom Icon Kantor Lainnya (Abu-Abu Slate / Indigo Elegan - Hanya Penampil Visual)
const otherOfficeIcon = L.divIcon({
  className: 'custom-map-marker-other-office',
  html: `
    <div style="
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #64748b, #475569);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 12px rgba(71, 85, 105, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg style="transform: rotate(45deg); width: 16px; height: 16px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// Custom Icon Karyawan (Biru berdenyut - Posisi User)
const userIcon = L.divIcon({
  className: 'custom-map-marker-user',
  html: `
    <div style="position: relative; width: 28px; height: 28px;">
      <div style="
        position: absolute;
        inset: -6px;
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.35);
        animation: pulse 1.8s infinite;
      "></div>
      <div style="
        position: relative;
        width: 28px;
        height: 28px;
        background: #2563eb;
        border-radius: 50%;
        border: 3px solid #ffffff;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
      </div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14]
});

export default function AttendanceMap({ 
  officeCoords, 
  userCoords, 
  otherLocations = [], 
  radius = 100, 
  isInside = true 
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Inisialisasi peta jika belum ada
    if (!mapInstanceRef.current) {
      const centerLat = officeCoords?.latitude || -6.225588;
      const centerLng = officeCoords?.longitude || 106.809312;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 17,
        zoomControl: false,
        attributionControl: false
      });

      // OpenStreetMap Tiles Clean
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Kontrol zoom di pojok kanan bawah
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
      markersGroupRef.current = L.featureGroup().addTo(map);
    }

    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;

    // Bersihkan marker lama
    group.clearLayers();

    // 1. Tambahkan Marker Kantor Utama & Lingkaran Geofence Utama (Target Validasi)
    if (officeCoords) {
      const officeLat = Number(officeCoords.latitude);
      const officeLng = Number(officeCoords.longitude);

      // Marker Kantor Utama
      L.marker([officeLat, officeLng], { icon: officeIcon })
        .bindPopup(`
          <div style="padding: 2px;">
            <div style="display: inline-block; background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">
              Target Lokasi Anda
            </div>
            <strong style="display: block; font-size: 13px; color: #0f172a;">${officeCoords.nama || 'Kantor Utama'}</strong>
            <p style="font-size: 11px; color: #64748b; margin: 2px 0 0;">Batas Geofence Radius: <strong>${radius} meter</strong></p>
          </div>
        `)
        .addTo(group);

      // Lingkaran Radius Geofence Utama
      L.circle([officeLat, officeLng], {
        radius: Number(radius) || 100,
        color: '#ea580c',
        weight: 2,
        dashArray: '5, 6',
        fillColor: '#ea580c',
        fillOpacity: 0.12,
      }).addTo(group);
    }

    // 2. Tambahkan Titik Lokasi Lainnya (Hanya sebagai Visualisasi Penanda)
    if (Array.isArray(otherLocations) && otherLocations.length > 0) {
      otherLocations.forEach((loc) => {
        const locLat = Number(loc.latitude);
        const locLng = Number(loc.longitude);
        const locRadius = Number(loc.radius_meter) || 100;

        if (isNaN(locLat) || isNaN(locLng)) return;

        // Marker Lokasi Lain
        L.marker([locLat, locLng], { icon: otherOfficeIcon })
          .bindPopup(`
            <div style="padding: 2px;">
              <div style="display: inline-block; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">
                Lokasi Cabang Lain
              </div>
              <strong style="display: block; font-size: 13px; color: #0f172a;">${loc.nama_lokasi}</strong>
              ${loc.alamat ? `<p style="font-size: 10px; color: #64748b; margin: 2px 0;">${loc.alamat}</p>` : ''}
              <p style="font-size: 11px; color: #64748b; margin: 2px 0 0;">Radius: ${locRadius}m</p>
              <p style="font-size: 10px; color: #94a3b8; font-style: italic; margin-top: 4px;">*Bukan target penugasan absensi Anda</p>
            </div>
          `)
          .addTo(group);

        // Lingkaran Geofence Halus untuk Lokasi Lain
        L.circle([locLat, locLng], {
          radius: locRadius,
          color: '#64748b',
          weight: 1.5,
          dashArray: '4, 6',
          fillColor: '#64748b',
          fillOpacity: 0.06,
        }).addTo(group);
      });
    }

    // 3. Tambahkan Marker Posisi Karyawan (User GPS)
    if (userCoords) {
      const userLat = Number(userCoords.latitude);
      const userLng = Number(userCoords.longitude);

      L.marker([userLat, userLng], { icon: userIcon })
        .bindPopup(`
          <div style="padding: 2px;">
            <strong style="color: #0f172a; font-size: 12px;">Posisi GPS Anda</strong>
            <p style="font-size: 11px; color: ${isInside ? '#16a34a' : '#dc2626'}; font-weight: 700; margin: 2px 0 0;">
              ${isInside ? '✓ Dalam Radius Kantor' : '✗ Di Luar Radius Kantor'}
            </p>
          </div>
        `)
        .addTo(group);

      // Garis hubung karyawan ke target kantor utama yang divalidasi
      if (officeCoords) {
        L.polyline([
          [userCoords.latitude, userCoords.longitude],
          [officeCoords.latitude, officeCoords.longitude]
        ], {
          color: isInside ? '#22c55e' : '#ef4444',
          weight: 2.5,
          dashArray: '6, 6',
          opacity: 0.85
        }).addTo(group);
      }
    }

    // 4. Sesuaikan Viewport (Fit Bounds) agar fokus pada Target Kantor & User
    if (officeCoords && userCoords) {
      const bounds = L.latLngBounds([
        [Number(officeCoords.latitude), Number(officeCoords.longitude)],
        [Number(userCoords.latitude), Number(userCoords.longitude)]
      ]);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 18 });
    } else if (officeCoords) {
      map.setView([Number(officeCoords.latitude), Number(officeCoords.longitude)], 17);
    }

    // Trigger map resize agar tile render dengan benar
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

  }, [officeCoords, userCoords, otherLocations, radius, isInside]);

  // Cleanup saat unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '24px',
          overflow: 'hidden',
          zIndex: 1
        }}
      />
    </div>
  );
}
