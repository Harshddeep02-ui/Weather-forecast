// AeroSky Weather Forecast Application Logic

// --- Constants & Global State ---
const DEFAULT_COORDS = { latitude: 51.5074, longitude: -0.1278 }; // London fallback
let currentCoords = null;
let currentCityName = "London";
let updateTimer = null;
let updateCountdown = 60;
let searchDebounceTimeout = null;

// --- DOM Elements ---
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const clearSearchBtn = document.getElementById('clear-search');
const locateBtn = document.getElementById('locate-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const cityNameEl = document.getElementById('city-name');
const currentDateEl = document.getElementById('current-date');
const weatherIconContainer = document.getElementById('weather-icon-container');
const currentTempEl = document.getElementById('current-temp');
const weatherDescEl = document.getElementById('weather-description');
const tempRangeEl = document.getElementById('temp-range');
const updateStatusEl = document.getElementById('update-status');

// Detailed Metric Elements
const feelsLikeEl = document.getElementById('feels-like');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('wind-speed');
const windDirectionEl = document.getElementById('wind-direction');
const pressureEl = document.getElementById('pressure');
const uvIndexEl = document.getElementById('uv-index');
const uvLevelEl = document.getElementById('uv-level');
const precipitationEl = document.getElementById('precipitation');
const forecastContainer = document.getElementById('forecast-container');
const hourlyContainer = document.getElementById('hourly-container');

// --- WMO Weather Code Mapping ---
// Maps Open-Meteo codes to readable text, background styling class, and weather type
const weatherCodeMap = {
    0: { text: "Clear Sky", class: "clear-day", nClass: "clear-night", type: "clear" },
    1: { text: "Mainly Clear", class: "clear-day", nClass: "clear-night", type: "partly-cloudy" },
    2: { text: "Partly Cloudy", class: "cloudy-day", nClass: "cloudy-night", type: "partly-cloudy" },
    3: { text: "Overcast", class: "cloudy-day", nClass: "cloudy-night", type: "cloudy" },
    45: { text: "Foggy", class: "cloudy-day", nClass: "cloudy-night", type: "cloudy" },
    48: { text: "Depositing Rime Fog", class: "cloudy-day", nClass: "cloudy-night", type: "cloudy" },
    51: { text: "Light Drizzle", class: "rainy", nClass: "rainy", type: "rainy" },
    53: { text: "Moderate Drizzle", class: "rainy", nClass: "rainy", type: "rainy" },
    55: { text: "Dense Drizzle", class: "rainy", nClass: "rainy", type: "rainy" },
    56: { text: "Light Freezing Drizzle", class: "rainy", nClass: "rainy", type: "rainy-snowy" },
    57: { text: "Dense Freezing Drizzle", class: "rainy", nClass: "rainy", type: "rainy-snowy" },
    61: { text: "Slight Rain", class: "rainy", nClass: "rainy", type: "rainy" },
    63: { text: "Moderate Rain", class: "rainy", nClass: "rainy", type: "rainy" },
    65: { text: "Heavy Rain", class: "rainy", nClass: "rainy", type: "rainy" },
    66: { text: "Light Freezing Rain", class: "rainy", nClass: "rainy", type: "rainy-snowy" },
    67: { text: "Heavy Freezing Rain", class: "rainy", nClass: "rainy", type: "rainy-snowy" },
    71: { text: "Slight Snow Fall", class: "snowy", nClass: "snowy", type: "snowy" },
    73: { text: "Moderate Snow Fall", class: "snowy", nClass: "snowy", type: "snowy" },
    75: { text: "Heavy Snow Fall", class: "snowy", nClass: "snowy", type: "snowy" },
    77: { text: "Snow Grains", class: "snowy", nClass: "snowy", type: "snowy" },
    80: { text: "Slight Rain Showers", class: "rainy", nClass: "rainy", type: "rainy" },
    81: { text: "Moderate Rain Showers", class: "rainy", nClass: "rainy", type: "rainy" },
    82: { text: "Violent Rain Showers", class: "rainy", nClass: "rainy", type: "rainy" },
    85: { text: "Slight Snow Showers", class: "snowy", nClass: "snowy", type: "snowy" },
    86: { text: "Heavy Snow Showers", class: "snowy", nClass: "snowy", type: "snowy" },
    95: { text: "Thunderstorm", class: "thunder", nClass: "thunder", type: "thunder" },
    96: { text: "Thunderstorm with Slight Hail", class: "thunder", nClass: "thunder", type: "thunder" },
    99: { text: "Thunderstorm with Heavy Hail", class: "thunder", nClass: "thunder", type: "thunder" },
};

// --- Custom Animated SVG Weather Icons ---
function getWeatherSVG(type, isDay = 1) {
    const strokeColor = "currentColor";
    const sunColor = "#f59e0b"; // Amber-500
    const moonColor = "#e2e8f0"; // Slate-200
    const cloudColor = "#cbd5e1"; // Slate-300
    const rainColor = "#38bdf8"; // Sky-400
    const snowColor = "#ffffff";
    const thunderColor = "#eab308"; // Yellow-500

    switch (type) {
        case "clear":
            if (isDay) {
                return `
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5" class="svg-sun-spin" fill="rgba(245, 158, 11, 0.25)" stroke="${sunColor}"/>
                    <path class="svg-sun-spin" stroke="${sunColor}" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>`;
            } else {
                return `
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" fill="rgba(226, 232, 240, 0.15)" stroke="${moonColor}"/>
                    <circle cx="19" cy="5" r="0.5" fill="${moonColor}" stroke="none"/>
                    <circle cx="15" cy="8" r="0.5" fill="${moonColor}" stroke="none"/>
                </svg>`;
            }
        case "partly-cloudy":
            if (isDay) {
                return `
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="16" cy="9" r="3" class="svg-sun-spin" fill="rgba(245, 158, 11, 0.25)" stroke="${sunColor}"/>
                    <path class="svg-sun-spin" stroke="${sunColor}" d="M16 4v1.5M16 12.5v1.5M12.5 9h1.5M19 9h1.5M13.5 6.5l1 1M17.5 10.5l1 1M13.5 11.5l1-1M17.5 7.5l1-1"/>
                    <path class="svg-cloud-float" d="M18 18.5a4 4 0 0 0-4-4 4.07 4.07 0 0 0-.77.07 5 5 0 0 0-9.23 2.43 4.28 4.28 0 0 0 .1 1.5 4 4 0 0 0 3.9 4H18a4 4 0 0 0 0-8z" fill="var(--glass-bg)" stroke="${strokeColor}"/>
                </svg>`;
            } else {
                return `
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 11.5a4 4 0 0 0-4-4 4.07 4.07 0 0 0-.77.07 5 5 0 0 0-9.23 2.43 4.28 4.28 0 0 0 .1 1.5 4 4 0 0 0 3.9 4H19a4 4 0 0 0 0-8z" fill="var(--glass-bg)" stroke="${strokeColor}" class="svg-cloud-float"/>
                    <path d="M15.2 6.2a3.5 3.5 0 0 0 4.1 4.1 5.5 5.5 0 0 1-4.1-4.1z" fill="rgba(226, 232, 240, 0.15)" stroke="${moonColor}"/>
                </svg>`;
            }
        case "cloudy":
            return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-cloud-float">
                <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" fill="rgba(255,255,255,0.05)" stroke="${strokeColor}"/>
            </svg>`;
        case "rainy":
            return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" fill="rgba(255,255,255,0.05)" stroke="${strokeColor}" class="svg-cloud-float"/>
                <line x1="8" y1="18" x2="6" y2="22" stroke="${rainColor}" class="svg-rain-drop" />
                <line x1="12" y1="19" x2="10" y2="23" stroke="${rainColor}" class="svg-rain-drop" />
                <line x1="16" y1="18" x2="14" y2="22" stroke="${rainColor}" class="svg-rain-drop" />
            </svg>`;
        case "rainy-snowy":
            return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" fill="rgba(255,255,255,0.05)" stroke="${strokeColor}" class="svg-cloud-float"/>
                <line x1="8" y1="18" x2="6" y2="22" stroke="${rainColor}" class="svg-rain-drop" />
                <circle cx="12" cy="20" r="1" fill="${snowColor}" stroke="none" />
                <line x1="16" y1="18" x2="14" y2="22" stroke="${rainColor}" class="svg-rain-drop" />
            </svg>`;
        case "snowy":
            return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" fill="rgba(255,255,255,0.05)" stroke="${strokeColor}" class="svg-cloud-float"/>
                <circle cx="8" cy="19" r="1.2" fill="${snowColor}" stroke="none" />
                <circle cx="12" cy="21" r="1.2" fill="${snowColor}" stroke="none" />
                <circle cx="16" cy="19" r="1.2" fill="${snowColor}" stroke="none" />
                <circle cx="10" cy="23" r="0.8" fill="${snowColor}" stroke="none" />
                <circle cx="14" cy="23" r="0.8" fill="${snowColor}" stroke="none" />
            </svg>`;
        case "thunder":
            return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" fill="rgba(255,255,255,0.05)" stroke="${strokeColor}" class="svg-cloud-float"/>
                <polyline points="13 16 9 20 12 20 10 24" stroke="${thunderColor}" stroke-linejoin="round"/>
                <line x1="8" y1="18" x2="7" y2="20" stroke="${rainColor}" class="svg-rain-drop" />
                <line x1="16" y1="18" x2="15" y2="20" stroke="${rainColor}" class="svg-rain-drop" />
            </svg>`;
        default:
            return `
            <svg viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>`;
    }
}

// --- Helper Functions ---

// Convert Degrees to Cardinal Wind Direction
function getWindDirection(deg) {
    if (deg === undefined || deg === null) return "--";
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(deg / 22.5) % 16;
    return directions[index];
}

// Get readable UV level description
function getUVLevel(uv) {
    if (uv === undefined || uv === null) return "--";
    if (uv <= 2) return "Low";
    if (uv <= 5) return "Moderate";
    if (uv <= 7) return "High";
    if (uv <= 10) return "Very High";
    return "Extreme";
}

// Format date nicely (e.g., "Thursday, Jun 25")
function formatDate(dateStr) {
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    const date = dateStr ? new Date(dateStr) : new Date();
    return date.toLocaleDateString('en-US', options);
}

// Format forecast day name (e.g. "Today", "Tomorrow", "Mon", "Tue")
function formatForecastDay(dateStr, index) {
    if (index === 0) return "Today";
    if (index === 1) return "Tomorrow";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// --- Show/Hide Loading Overlay ---
function showLoading(text) {
    loadingText.textContent = text;
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

// --- Dynamic Styling ---
// Sets appropriate body class and gradient background based on weather code and day/night
function updateThemeBackground(code, isDay) {
    const config = weatherCodeMap[code] || { class: "clear-day", nClass: "clear-night" };
    const activeClass = isDay ? config.class : config.nClass;
    
    // Clear existing body classes starting with "weather-"
    Array.from(body.classList).forEach(cls => {
        if (cls.startsWith('weather-')) {
            body.classList.remove(cls);
        }
    });
    
    body.classList.add(`weather-${activeClass}`);
}

const body = document.body;

// --- API Calls ---

// Reverse Geocoding: Get City Name from Latitude/Longitude
async function getCityNameFromCoords(lat, lon) {
    try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        if (!response.ok) throw new Error("Reverse geocoding failed");
        
        const data = await response.json();
        
        // Formulate a user-friendly city name
        const city = data.city || data.locality || data.principalSubdivision || "Selected Location";
        const country = data.countryName ? `, ${data.countryName}` : "";
        return `${city}${country}`;
    } catch (error) {
        console.error("Error reverse geocoding:", error);
        return `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
    }
}

// Fetch Full Weather Forecast Data
async function fetchWeather(lat, lon, silent = false) {
    if (!silent) {
        showLoading("Retrieving live weather forecast...");
    }

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,weather_code,is_day,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,uv_index_max,precipitation_sum&timezone=auto`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Weather API fetch failed");
        
        const data = await response.json();
        
        // Render all data to screen
        renderWeatherData(data);
        
        // Store current coords and start/reset the heartbeat timer
        currentCoords = { latitude: lat, longitude: lon };
        resetHeartbeatTimer();
    } catch (error) {
        console.error("Error fetching weather:", error);
        alert("Unable to fetch weather forecast. Please check your network and try again.");
    } finally {
        if (!silent) {
            hideLoading();
        }
    }
}

// --- Render Logic ---

function renderWeatherData(data) {
    const current = data.current;
    const daily = data.daily;
    const isDay = current.is_day;
    const wCode = current.weather_code;
    
    // Update theme background dynamically
    updateThemeBackground(wCode, isDay);

    // 1. Current Weather Details Card
    cityNameEl.textContent = currentCityName;
    currentDateEl.textContent = formatDate();
    
    const weatherConfig = weatherCodeMap[wCode] || { text: "Unknown", type: "unknown" };
    weatherDescEl.textContent = weatherConfig.text;
    currentTempEl.textContent = Math.round(current.temperature_2m);
    
    const todayMax = Math.round(daily.temperature_2m_max[0]);
    const todayMin = Math.round(daily.temperature_2m_min[0]);
    tempRangeEl.textContent = `H: ${todayMax}°  L: ${todayMin}°`;
    
    // Render central animated icon
    weatherIconContainer.innerHTML = getWeatherSVG(weatherConfig.type, isDay);

    // 2. Metrics Grid
    feelsLikeEl.textContent = Math.round(current.apparent_temperature);
    humidityEl.textContent = current.relative_humidity_2m;
    windSpeedEl.textContent = current.wind_speed_10m.toFixed(1);
    windDirectionEl.textContent = `Direction: ${getWindDirection(current.wind_direction_10m)}`;
    pressureEl.textContent = Math.round(current.pressure_msl);
    
    const uvIdx = daily.uv_index_max[0];
    uvIndexEl.textContent = uvIdx.toFixed(1);
    uvLevelEl.textContent = `Level: ${getUVLevel(uvIdx)}`;
    
    // Open-Meteo precipitation sum represents precipitation value
    precipitationEl.textContent = current.precipitation.toFixed(1);

    // 3. Hourly Forecast Scroll Cards
    hourlyContainer.innerHTML = "";
    
    const currentLocalTime = current.time;
    const currentHourPrefix = currentLocalTime.substring(0, 13) + ":00";
    
    let hourlyStartIndex = data.hourly.time.findIndex(t => t.startsWith(currentHourPrefix));
    if (hourlyStartIndex === -1) {
        hourlyStartIndex = 0;
    }
    
    const hourlyLimit = Math.min(hourlyStartIndex + 24, data.hourly.time.length);
    for (let i = hourlyStartIndex; i < hourlyLimit; i++) {
        const rawTime = data.hourly.time[i];
        const temp = Math.round(data.hourly.temperature_2m[i]);
        const hourlyWCode = data.hourly.weather_code[i];
        const hourlyIsDay = data.hourly.is_day[i];
        const pop = data.hourly.precipitation_probability[i];
        
        const hourConfig = weatherCodeMap[hourlyWCode] || { text: "Unknown", type: "unknown" };
        
        let displayHour = "";
        if (i === hourlyStartIndex) {
            displayHour = "Now";
        } else {
            const date = new Date(rawTime);
            displayHour = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        }
        
        const card = document.createElement('div');
        card.className = "glass-card hourly-card";
        if (i === hourlyStartIndex) {
            card.classList.add("active-hour");
        }
        
        card.innerHTML = `
            <span class="hourly-time">${displayHour}</span>
            <div class="hourly-icon" title="${hourConfig.text}">
                ${getWeatherSVG(hourConfig.type, hourlyIsDay)}
            </div>
            <span class="hourly-temp">${temp}°</span>
            <span class="hourly-pop">${pop > 0 ? pop + '%' : ''}</span>
        `;
        hourlyContainer.appendChild(card);
    }

    // 4. 7-Day Forecast Grid
    forecastContainer.innerHTML = ""; // Clear existing
    
    for (let i = 0; i < 7; i++) {
        const date = daily.time[i];
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);
        const dayCode = daily.weather_code[i];
        const dayConfig = weatherCodeMap[dayCode] || { text: "Unknown", type: "unknown" };
        
        const card = document.createElement('div');
        card.className = "glass-card forecast-card";
        card.innerHTML = `
            <span class="forecast-day">${formatForecastDay(date, i)}</span>
            <div class="forecast-icon">
                ${getWeatherSVG(dayConfig.type, 1)}
            </div>
            <div class="forecast-temp">
                <span class="temp-max">${maxTemp}°</span>
                <span class="temp-min">${minTemp}°</span>
            </div>
            <span class="forecast-desc" title="${dayConfig.text}">${dayConfig.text}</span>
        `;
        forecastContainer.appendChild(card);
    }
}

// --- Heartbeat 1-Minute Timer ---

function resetHeartbeatTimer() {
    if (updateTimer) {
        clearInterval(updateTimer);
    }
    
    updateCountdown = 60;
    updateStatusEl.textContent = `Updating in ${updateCountdown}s`;
    
    updateTimer = setInterval(async () => {
        updateCountdown--;
        if (updateCountdown <= 0) {
            updateStatusEl.textContent = "Updating...";
            // Fetch silently so UI does not flicker
            if (currentCoords) {
                await fetchWeather(currentCoords.latitude, currentCoords.longitude, true);
            }
            updateCountdown = 60;
        } else {
            updateStatusEl.textContent = `Updating in ${updateCountdown}s`;
        }
    }, 1000);
}

// --- Geolocation Logic ---

async function detectUserLocation() {
    showLoading("Requesting browser geolocation...");
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                showLoading("Detecting your local city name...");
                currentCityName = await getCityNameFromCoords(lat, lon);
                
                await fetchWeather(lat, lon);
            },
            async (error) => {
                console.warn("Geolocation access denied or failed. Fallback to default city.");
                currentCityName = "London, United Kingdom";
                await fetchWeather(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude);
            },
            { timeout: 10000 }
        );
    } else {
        console.warn("Geolocation API not supported by browser. Fallback to default city.");
        currentCityName = "London, United Kingdom";
        await fetchWeather(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude);
    }
}

// --- Search and Autocomplete Logic ---

// Clear search input and restore defaults
function clearSearch() {
    searchInput.value = "";
    clearSearchBtn.classList.add('hidden');
    searchResults.classList.add('hidden');
    searchResults.innerHTML = "";
}

// Handle forward geocoding with Open-Meteo search API
async function performSearch(query) {
    if (!query || query.trim().length < 2) {
        searchResults.classList.add('hidden');
        searchResults.innerHTML = "";
        return;
    }

    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Search request failed");
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            renderSearchResults(data.results);
        } else {
            searchResults.innerHTML = `<div class="search-result-item" style="cursor: default;">No cities found</div>`;
            searchResults.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Geocoding lookup error:", error);
    }
}

function renderSearchResults(results) {
    searchResults.innerHTML = ""; // Clear existing
    
    results.forEach(city => {
        const item = document.createElement('div');
        item.className = "search-result-item";
        
        const stateStr = city.admin1 ? `, ${city.admin1}` : "";
        const countryStr = city.country ? `, ${city.country}` : "";
        const fullName = `${city.name}${stateStr}${countryStr}`;
        
        item.innerHTML = `
            <span class="result-city-name">${city.name}</span>
            <span class="result-country">${city.admin1 || ''} ${city.country_code ? city.country_code.toUpperCase() : ''}</span>
        `;
        
        item.addEventListener('click', async () => {
            currentCityName = fullName;
            clearSearch();
            await fetchWeather(city.latitude, city.longitude);
        });
        
        searchResults.appendChild(item);
    });
    
    searchResults.classList.remove('hidden');
}

// --- Event Listeners Setup ---

searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    
    if (val.length > 0) {
        clearSearchBtn.classList.remove('hidden');
    } else {
        clearSearchBtn.classList.add('hidden');
    }
    
    // Debounce geocoding queries
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
        performSearch(val);
    }, 300);
});

clearSearchBtn.addEventListener('click', clearSearch);

// Close dropdown if user clicks outside
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.add('hidden');
    }
});

// Focus on search input toggles dropdown back if it has items
searchInput.addEventListener('focus', () => {
    if (searchResults.children.length > 0) {
        searchResults.classList.remove('hidden');
    }
});

// Locate button click re-triggers device location detection
locateBtn.addEventListener('click', detectUserLocation);

// --- Theme Toggle Logic ---
function setTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        themeIcon.innerHTML = `
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        `;
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light-theme');
        themeIcon.innerHTML = `
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"></path>
        `;
        localStorage.setItem('theme', 'dark');
    }
}

themeToggleBtn.addEventListener('click', () => {
    const isLight = document.body.classList.contains('light-theme');
    setTheme(isLight ? 'dark' : 'light');
});

// --- Initialization ---
window.addEventListener('DOMContentLoaded', () => {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    
    detectUserLocation();
});
