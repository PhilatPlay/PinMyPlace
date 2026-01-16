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

        // Add satellite/imagery layer as default
        const satellite = L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
                attribution:
                    "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
            }
        ).addTo(map);

        // Add OpenStreetMap as alternative
        const openStreetMap = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 19,
        });

        // Layer control to switch between map types
        const baseMaps = {
            Satellite: satellite,
            OpenStreetMap: openStreetMap,
        };
        L.control.layers(baseMaps).addTo(map);

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
