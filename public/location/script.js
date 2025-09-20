// Enhanced Location Tracking with Professional UI/UX
class LocationTracker {
  constructor() {
    this.socket = io();
    this.map = null;
    this.markers = {};
    this.userCount = 0;
    this.isTracking = true;
    this.userLocation = null;
    this.watchId = null;
    
    this.init();
  }

  init() {
    this.initTheme();
    this.initMap();
    this.initSocket();
    this.initControls();
    this.initGeolocation();
    this.updateLastUpdateTime();
  }

  initTheme() {
    const html = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    
    const setIcon = () => themeIcon && (themeIcon.textContent = html.classList.contains('dark') ? '☀️' : '🌙');
    
    const applyStoredTheme = () => {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
      setIcon();
    };
    
    const toggleTheme = () => {
      html.classList.toggle('dark');
      localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
      setIcon();
    };
    
    themeToggle?.addEventListener('click', toggleTheme);
    applyStoredTheme();
  }

  initMap() {
    // Initialize map with dark theme
    this.map = L.map("map", {
      zoomControl: true,
      attributionControl: true
    }).setView([20, 80], 5);

    // Add dark tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      className: 'dark-tiles'
    }).addTo(this.map);

    // Hide loading overlay when map is ready
    this.map.whenReady(() => {
      setTimeout(() => {
        const loadingOverlay = document.getElementById('mapLoading');
        if (loadingOverlay) {
          loadingOverlay.style.opacity = '0';
          setTimeout(() => loadingOverlay.remove(), 300);
        }
      }, 1000);
    });
  }

  initSocket() {
    this.socket.on('connect', () => {
      this.showToast('success', 'Connected', 'Successfully connected to location server');
      this.addActivity('Connected to server');
    });

    this.socket.on('disconnect', () => {
      this.showToast('warning', 'Disconnected', 'Lost connection to server');
      this.addActivity('Disconnected from server');
    });

    this.socket.on('receive-location', (data) => {
      this.handleLocationUpdate(data);
    });

    this.socket.on('user-disconnected', (id) => {
      this.handleUserDisconnect(id);
    });
  }

  initControls() {
    const centerMapBtn = document.getElementById('centerMap');
    const toggleTrackingBtn = document.getElementById('toggleTracking');

    centerMapBtn?.addEventListener('click', () => {
      if (this.userLocation) {
        this.map.setView([this.userLocation.latitude, this.userLocation.longitude], 15);
        this.showToast('info', 'Map Centered', 'Map centered on your location');
        this.addActivity('Map centered on user location');
      } else {
        this.showToast('warning', 'Location Unavailable', 'Your location is not available yet');
      }
    });

    toggleTrackingBtn?.addEventListener('click', () => {
      this.toggleTracking();
    });
  }

  initGeolocation() {
    if (navigator.geolocation) {
      this.updateGPSStatus('requesting', 'Requesting');
      
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          this.userLocation = { latitude, longitude, accuracy };
          
          this.updateGPSStatus('connected', 'Connected');
          
          if (this.isTracking) {
            this.socket.emit("send-location", { latitude, longitude, accuracy });
            this.updateLastUpdateTime();
          }
        },
        (error) => {
          this.handleGeolocationError(error);
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    } else {
      this.updateGPSStatus('error', 'Not Supported');
      this.showToast('error', 'Geolocation Not Supported', 'Your browser does not support geolocation');
    }
  }

  handleGeolocationError(error) {
    let message = 'Unknown error';
    switch(error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location access denied by user';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out';
        break;
    }
    
    this.updateGPSStatus('error', 'Error');
    this.showToast('error', 'Location Error', message);
    this.addActivity(`Location error: ${message}`);
  }

  handleLocationUpdate(data) {
    const { id, coords } = data;
    
    if (markers[id]) {
      // Update existing marker
      markers[id].setLatLng([coords.latitude, coords.longitude]);
    } else {
      // Create new marker
      const isCurrentUser = id === this.socket.id;
      const markerColor = isCurrentUser ? 'user-marker' : 'custom-marker';
      
      const marker = L.circleMarker([coords.latitude, coords.longitude], {
        radius: isCurrentUser ? 12 : 10,
        fillColor: isCurrentUser ? '#10b981' : '#dc2626',
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(this.map);

      // Add popup with location info
      const popupContent = `
        <div class="text-center">
          <div class="font-semibold mb-2">${isCurrentUser ? 'Your Location' : 'User Location'}</div>
          <div class="text-sm text-gray-300 mb-2">
            Lat: ${coords.latitude.toFixed(6)}<br>
            Lng: ${coords.longitude.toFixed(6)}
          </div>
          ${coords.accuracy ? `<div class="text-xs text-gray-400">Accuracy: ±${Math.round(coords.accuracy)}m</div>` : ''}
        </div>
      `;
      
      marker.bindPopup(popupContent);
      markers[id] = marker;
      
      if (!isCurrentUser) {
        this.userCount++;
        this.updateUserCount();
        this.addActivity(`New user joined (${this.userCount} total)`);
      }
    }
  }

  handleUserDisconnect(id) {
    if (markers[id]) {
      this.map.removeLayer(markers[id]);
      delete markers[id];
      
      if (id !== this.socket.id) {
        this.userCount = Math.max(0, this.userCount - 1);
        this.updateUserCount();
        this.addActivity(`User disconnected (${this.userCount} remaining)`);
      }
    }
  }

  toggleTracking() {
    this.isTracking = !this.isTracking;
    const btn = document.getElementById('toggleTracking');
    const icon = btn.querySelector('i');
    const text = btn.querySelector('span') || btn.childNodes[btn.childNodes.length - 1];
    
    if (this.isTracking) {
      icon.className = 'fas fa-pause';
      text.textContent = 'Pause Tracking';
      btn.className = btn.className.replace('bg-green-600', 'border border-slate-300 dark:border-slate-700');
      this.showToast('success', 'Tracking Resumed', 'Location tracking is now active');
      this.addActivity('Location tracking resumed');
    } else {
      icon.className = 'fas fa-play';
      text.textContent = 'Resume Tracking';
      btn.className = btn.className.replace('border border-slate-300 dark:border-slate-700', 'bg-green-600 hover:bg-green-700 text-white');
      this.showToast('warning', 'Tracking Paused', 'Location tracking is now paused');
      this.addActivity('Location tracking paused');
    }
  }

  updateGPSStatus(status, text) {
    const statusEl = document.getElementById('gpsStatus');
    const textEl = document.getElementById('gpsText');
    
    if (statusEl && textEl) {
      statusEl.className = `w-2 h-2 rounded-full ${
        status === 'connected' ? 'bg-green-500' :
        status === 'requesting' ? 'bg-yellow-500' :
        'bg-red-500'
      }`;
      
      textEl.textContent = text;
      textEl.className = `text-sm font-medium ${
        status === 'connected' ? 'text-green-600 dark:text-green-400' :
        status === 'requesting' ? 'text-yellow-600 dark:text-yellow-400' :
        'text-red-600 dark:text-red-400'
      }`;
    }
  }

  updateUserCount() {
    const countEl = document.getElementById('userCount');
    if (countEl) {
      countEl.textContent = this.userCount;
    }
  }

  updateLastUpdateTime() {
    const timeEl = document.getElementById('lastUpdate');
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString();
    }
  }

  addActivity(message) {
    const logEl = document.getElementById('activityLog');
    if (logEl) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString();
      
      const activityItem = document.createElement('div');
      activityItem.className = 'activity-item';
      activityItem.innerHTML = `
        <div class="activity-time">${timeStr}</div>
        <div class="activity-text">${message}</div>
      `;
      
      // Remove "No recent activity" message if it exists
      const noActivity = logEl.querySelector('.text-slate-500');
      if (noActivity) {
        noActivity.remove();
      }
      
      // Add new activity at the top
      logEl.insertBefore(activityItem, logEl.firstChild);
      
      // Keep only last 10 activities
      while (logEl.children.length > 10) {
        logEl.removeChild(logEl.lastChild);
      }
    }
  }

  showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };

    toast.innerHTML = `
      <i class="toast-icon ${icons[type] || icons.info}"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }
}

// Initialize the location tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new LocationTracker();
});


