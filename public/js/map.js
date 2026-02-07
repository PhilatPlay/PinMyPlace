// Map Variables
let map;
let originalMarker;
let correctedMarker;
let originalPosition = null;
let correctedPosition = null;

// Initialize the interactive map
function initializeMap() {
    // Prevent multiple initializations
    if (map) {
        return;
    }

    // Hide the button
    const mapButton = document.getElementById("mapLoadButton");
    if (mapButton) {
        mapButton.style.display = "none";
    }

    // Function to initialize map with given coordinates
    const setupMap = (lat, lng, useGPS = true) => {
        originalPosition = { lat: lat, lng: lng };
        correctedPosition = { lat: lat, lng: lng };
        
        // Update location state for trial pages immediately
        if (typeof window.updateLocationState === 'function') {
            window.updateLocationState(lat, lng, lat, lng);
        }

        // Initialize Leaflet map
        const zoomLevel = useGPS ? 18 : 12; // Wider zoom if no GPS
        map = L.map("map").setView([lat, lng], zoomLevel);

        // Add OpenStreetMap as default
        const openStreetMap = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 19,
        }).addTo(map);

        // Add satellite/imagery layer as alternative
        const satellite = L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
                attribution:
                    "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
            }
        );

        // Create custom toggle button
        let isSatellite = false;
        const toggleControl = L.control({ position: 'topright' });
        
        toggleControl.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'leaflet-control');
            div.innerHTML = '<button class="map-toggle-btn" style="background: white; color: #333; border: none; border-radius: 4px; padding: 12px 16px; cursor: pointer; font-size: 15px; font-weight: 600; box-shadow: 0 1px 5px rgba(0,0,0,0.2); min-width: 110px;">Satellite</button>';
            
            div.onclick = function(e) {
                e.stopPropagation();
                isSatellite = !isSatellite;
                
                if (isSatellite) {
                    map.removeLayer(openStreetMap);
                    map.addLayer(satellite);
                    div.querySelector('.map-toggle-btn').innerHTML = 'Map';
                } else {
                    map.removeLayer(satellite);
                    map.addLayer(openStreetMap);
                    div.querySelector('.map-toggle-btn').innerHTML = 'Satellite';
                }
            };
            
            return div;
        };
        
        toggleControl.addTo(map);

        // Create custom icons
        const redIcon = L.icon({
            iconUrl:
                "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
            shadowUrl:
                "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        });

        const greenIcon = L.icon({
            iconUrl:
                "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
            shadowUrl:
                "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        });

        if (useGPS) {
            // Add original position marker (red, non-draggable) - only if GPS was used
            originalMarker = L.marker([lat, lng], {
                icon: redIcon,
                title: "GPS Detected Location",
            }).addTo(map);
            originalMarker
                .bindPopup(
                    "📍 GPS Detected Location<br>This is where your device thinks you are"
                )
                .openPopup();
        }

        // Add corrected position marker (green, draggable)
        correctedMarker = L.marker([lat, lng], {
            icon: greenIcon,
            draggable: true,
            title: "Drag me to your actual location",
        }).addTo(map);
        correctedMarker.bindPopup(useGPS ? "🎯 Drag me to your actual location" : "🎯 Drag me to your location (GPS not available)");
        if (!useGPS) {
            correctedMarker.openPopup();
        }

        // Update coordinates when marker is dragged
        correctedMarker.on("dragend", function (e) {
            const position = e.target.getLatLng();
            correctedPosition = {
                lat: position.lat,
                lng: position.lng,
            };
            
            // Update location state for trial pages
            if (typeof window.updateLocationState === 'function') {
                window.updateLocationState(
                    originalPosition.lat, 
                    originalPosition.lng, 
                    correctedPosition.lat, 
                    correctedPosition.lng
                );
            }
            // Don't show coordinates before payment - security measure
        });

        // Show address section and map controls after map loads (if they exist)
        const addressSection = document.getElementById("addressSection");
        const mapControls = document.getElementById("mapControls");
        if (addressSection) addressSection.style.display = "block";
        if (mapControls) mapControls.style.display = "block";

        if (useGPS) {
            showStatus(
                "Map loaded! Drag the green marker to correct your location.",
                "success"
            );
        } else {
            showStatus(
                "Map loaded! Drag the green marker to your exact location (GPS unavailable).",
                "info"
            );
        }
    };

    // Function to get approximate location from IP (city-level, privacy-friendly)
    const getApproximateLocation = async () => {
        try {
            // Use ipapi.co free service for approximate location (no API key needed for basic use)
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            
            if (data.latitude && data.longitude) {
                console.log(`Approximate location from IP: ${data.city}, ${data.country_name}`);
                return {
                    lat: data.latitude,
                    lng: data.longitude,
                    city: data.city,
                    country: data.country_name
                };
            }
        } catch (error) {
            console.log("IP geolocation failed:", error);
        }
        
        // Fallback: Use timezone to estimate general region
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log("Using timezone for approximate location:", timezone);
        
        // Map common timezones to approximate coordinates
        const timezoneMap = {
            'Asia/Manila': { lat: 14.5995, lng: 120.9842, region: 'Philippines' },
            'Asia/Singapore': { lat: 1.3521, lng: 103.8198, region: 'Singapore' },
            'Asia/Kuala_Lumpur': { lat: 3.1390, lng: 101.6869, region: 'Malaysia' },
            'Asia/Bangkok': { lat: 13.7563, lng: 100.5018, region: 'Thailand' },
            'Asia/Jakarta': { lat: -6.2088, lng: 106.8456, region: 'Indonesia' },
            'Asia/Ho_Chi_Minh': { lat: 10.8231, lng: 106.6297, region: 'Vietnam' },
            'America/New_York': { lat: 40.7128, lng: -74.0060, region: 'New York' },
            'America/Los_Angeles': { lat: 34.0522, lng: -118.2437, region: 'Los Angeles' },
            'America/Chicago': { lat: 41.8781, lng: -87.6298, region: 'Chicago' },
            'Europe/London': { lat: 51.5074, lng: -0.1278, region: 'London' },
            'Europe/Paris': { lat: 48.8566, lng: 2.3522, region: 'Paris' },
            'Australia/Sydney': { lat: -33.8688, lng: 151.2093, region: 'Sydney' }
        };
        
        return timezoneMap[timezone] || { lat: 20, lng: 0, region: 'World' }; // World center if unknown
    };

    if (navigator.geolocation) {
        showStatus("Getting your location for map...", "info");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setupMap(lat, lng, true);
            },
            async (error) => {
                // Location denied or failed - use IP-based approximate location
                console.log("GPS unavailable:", error.message);
                const approxLocation = await getApproximateLocation();
                setupMap(approxLocation.lat, approxLocation.lng, false);
                
                // Show button to allow GPS
                showGPSButton();
                
                // Set up listener for if user grants permission later
                watchForPermissionChange();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    } else {
        // Geolocation not supported - use IP-based approximate location
        getApproximateLocation().then(approxLocation => {
            setupMap(approxLocation.lat, approxLocation.lng, false);
        });
    }
}

// Show GPS enable button
function showGPSButton() {
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) return;
    
    // Remove existing button if any
    const existingButton = document.getElementById('gpsEnableButton');
    if (existingButton) return; // Already showing
    
    const buttonDiv = document.createElement('div');
    buttonDiv.id = 'gpsEnableButton';
    buttonDiv.style.cssText = 'margin-bottom: 15px;';
    
    buttonDiv.innerHTML = `
        <button 
            onclick="requestGPSAndReload()" 
            style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 14px 24px;
                border-radius: 8px;
                font-weight: bold;
                font-size: 15px;
                cursor: pointer;
                width: 100%;
                box-shadow: 0 4px 6px rgba(0,0,0,0.15);
                transition: transform 0.2s, box-shadow 0.2s;
                min-height: 50px;
            "
            onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 6px 12px rgba(0,0,0,0.2)';"
            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.15)';"
        >
            📍 Allow GPS Assistance
        </button>
    `;
    
    mapContainer.insertBefore(buttonDiv, mapContainer.firstChild);
}

// Request GPS permission and reload map
function requestGPSAndReload() {
    if (!navigator.geolocation) {
        alert('GPS is not supported by your browser');
        return;
    }
    
    showStatus("Requesting GPS access...", "info");
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            // GPS granted! Remove button
            const buttonDiv = document.getElementById('gpsEnableButton');
            if (buttonDiv) buttonDiv.remove();
            
            // Remove existing map completely
            if (map) {
                map.remove();
                map = null;
                originalMarker = null;
                correctedMarker = null;
            }
            
            // Reinitialize map - will now get GPS since permission granted
            initializeMap();
        },
        (error) => {
            console.log("GPS request failed:", error);
            
            // Show custom dialog with image
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                z-index: 10000;
                text-align: center;
                max-width: 400px;
            `;
            
            dialog.innerHTML = `
                <h3 style="margin-top: 0; color: #333;">To Enable GPS</h3>
                <p style="color: #666; margin: 15px 0;">Click this icon in your browser's address bar:</p>
                <img src="/pics/map_flag.png" style="max-width: 100%; height: auto; margin: 15px 0; border: 2px solid #ddd; border-radius: 4px;">
                <p style="color: #666; margin: 15px 0;">Then allow location access</p>
                <button onclick="this.parentElement.remove(); document.getElementById('dialogOverlay').remove();" 
                    style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 12px 30px;
                        border-radius: 6px;
                        font-weight: bold;
                        cursor: pointer;
                        margin-top: 10px;
                    ">
                    Got It
                </button>
            `;
            
            // Add overlay
            const overlay = document.createElement('div');
            overlay.id = 'dialogOverlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 9999;
            `;
            overlay.onclick = () => {
                dialog.remove();
                overlay.remove();
            };
            
            document.body.appendChild(overlay);
            document.body.appendChild(dialog);
            
            showStatus("GPS access denied. You can drag the green marker to your location.", "info");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// Watch for location permission changes after initial denial
function watchForPermissionChange() {
    if (!navigator.permissions) return; // Permissions API not supported
    
    navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
        permissionStatus.addEventListener('change', function() {
            if (this.state === 'granted' && map) {
                // Permission granted after initial denial - reload map completely
                console.log('Location permission granted - reloading map with GPS');
                showStatus("Location permission granted! Reloading map with GPS...", "info");
                
                // Remove button if showing
                const buttonDiv = document.getElementById('gpsEnableButton');
                if (buttonDiv) buttonDiv.remove();
                
                // Remove existing map completely
                if (map) {
                    map.remove();
                    map = null;
                    originalMarker = null;
                    correctedMarker = null;
                }
                
                // Reinitialize map - will now get GPS since permission granted
                initializeMap();
            }
        });
    }).catch((error) => {
        console.log("Permissions API not available:", error);
    });
}

// Update coordinate display
function updateCoordinateDisplay() {
    if (originalPosition) {
        document.getElementById("originalCoords").innerHTML =
            `${originalPosition.lat.toFixed(6)}, ${originalPosition.lng.toFixed(6)}`;
    }
    if (correctedPosition) {
        document.getElementById("correctedCoords").innerHTML =
            `${correctedPosition.lat.toFixed(6)}, ${correctedPosition.lng.toFixed(6)}`;

        // Calculate and display distance between original and corrected
        if (originalPosition) {
            const distance = calculateDistance(
                originalPosition.lat,
                originalPosition.lng,
                correctedPosition.lat,
                correctedPosition.lng
            );
            document.getElementById("correctionDistance").innerHTML =
                `${distance.toFixed(1)}m`;
        }
    }
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}
