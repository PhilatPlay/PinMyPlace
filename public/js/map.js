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

    if (navigator.geolocation) {
        showStatus("Getting your location for map...", "info");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                originalPosition = { lat: lat, lng: lng };
                correctedPosition = { lat: lat, lng: lng };

                // Initialize Leaflet map with OpenStreetMap
                map = L.map("map").setView([lat, lng], 18);

                // Add OpenStreetMap tile layer
                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    attribution: "© OpenStreetMap contributors",
                    maxZoom: 19,
                }).addTo(map);

                // Add satellite/imagery layer option
                const satellite = L.tileLayer(
                    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                    {
                        attribution:
                            "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
                    }
                );

                // Layer control to switch between map types
                const baseMaps = {
                    OpenStreetMap: L.tileLayer(
                        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    ),
                    Satellite: satellite,
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

                // Add original position marker (red, non-draggable)
                originalMarker = L.marker([lat, lng], {
                    icon: redIcon,
                    title: "GPS Detected Location",
                }).addTo(map);
                originalMarker
                    .bindPopup(
                        "📍 GPS Detected Location<br>This is where your device thinks you are"
                    )
                    .openPopup();

                // Add corrected position marker (green, draggable)
                correctedMarker = L.marker([lat, lng], {
                    icon: greenIcon,
                    draggable: true,
                    title: "Drag me to your actual location",
                }).addTo(map);
                correctedMarker.bindPopup("🎯 Drag me to your actual location");

                // Update coordinates when marker is dragged
                correctedMarker.on("dragend", function (e) {
                    const position = e.target.getLatLng();
                    correctedPosition = {
                        lat: position.lat,
                        lng: position.lng,
                    };
                    // Don't show coordinates before payment - security measure
                });

                // Show address section and map controls after map loads
                document.getElementById("addressSection").style.display = "block";
                document.getElementById("mapControls").style.display = "block";

                showStatus(
                    "Map loaded! Drag the green marker to correct your location.",
                    "success"
                );
            },
            (error) => {
                showStatus(`Error getting location for map: ${error.message}`, "error");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    } else {
        showStatus("Geolocation is not supported by this browser", "error");
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
