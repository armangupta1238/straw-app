/**
 * offline-sync.js
 * Straw Collector — Shared Offline Queue Engine
 * Include this in ALL HTML pages so sync fires no matter which page the agent opens.
 * Handles two queues:
 *   offline_farmer_queue  — village + farmer + season chain
 *   offline_pickup_queue  — single pickup POST
 */

(function () {
  const API                = 'https://straw-app-production.up.railway.app/api';
  const FARMER_QUEUE_KEY   = 'offline_farmer_queue';
  const PICKUP_QUEUE_KEY   = 'offline_pickup_queue';
  let isSyncing = false;

  // ── GENERIC QUEUE HELPERS ──

  function getQueue(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
  }
  function saveQueue(key, q) {
    localStorage.setItem(key, JSON.stringify(q));
  }
  function removeFromQueue(key, id) {
    saveQueue(key, getQueue(key).filter(e => e.id !== id));
  }
  function addToQueue(key, entry) {
    const q = getQueue(key);
    q.push({ ...entry, queued_at: new Date().toISOString(), id: Date.now() });
    saveQueue(key, q);
  }
  function totalQueueCount() {
    return getQueue(FARMER_QUEUE_KEY).length + getQueue(PICKUP_QUEUE_KEY).length;
  }

  // ── TOAST (works on any page) ──

  function showSyncToast(msg, type) {
    let toast = document.getElementById('toast');
    let created = false;
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'offlineSyncToast';
      toast.style.cssText = [
        'position:fixed', 'bottom:90px', 'left:50%',
        'transform:translateX(-50%) translateY(20px)',
        'padding:10px 20px', 'border-radius:20px',
        'font-family:DM Sans,sans-serif', 'font-size:13px', 'font-weight:500',
        'opacity:0', 'transition:all .3s', 'z-index:9999', 'white-space:nowrap',
        'color:#fff'
      ].join(';');
      document.body.appendChild(toast);
      created = true;
    }
    toast.textContent = msg;
    toast.style.background = type === 'teal' ? '#0d9488' : type === 'amber' ? '#92400e' : '#1e1b3a';
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      if (created) setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  // ── SYNC FARMERS ──

  async function syncFarmerQueue() {
    const q = getQueue(FARMER_QUEUE_KEY);
    let synced = 0, failed = 0;
    for (const entry of q) {
      try {
        const villageRes = await fetch(`${API}/villages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry.village)
        });
        if (!villageRes.ok) throw new Error('Village POST failed');
        const village = await villageRes.json();

        const farmerRes = await fetch(`${API}/farmers`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...entry.farmer, village_id: village.village_id })
        });
        if (!farmerRes.ok) throw new Error('Farmer POST failed');
        const farmer = await farmerRes.json();

        const seasonRes = await fetch(`${API}/seasons`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...entry.season, farmer_id: farmer.farmer_id })
        });
        if (!seasonRes.ok) throw new Error('Season POST failed');

        removeFromQueue(FARMER_QUEUE_KEY, entry.id);
        synced++;
      } catch (err) {
        console.warn('[OfflineSync] Farmer sync failed', entry.id, err.message);
        failed++;
      }
    }
    return { synced, failed };
  }

  // ── SYNC PICKUPS ──

  async function syncPickupQueue() {
    const q = getQueue(PICKUP_QUEUE_KEY);
    let synced = 0, failed = 0;
    for (const entry of q) {
      try {
        const res = await fetch(`${API}/pickups`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry.pickup)
        });
        if (!res.ok) throw new Error('Pickup POST failed');
        const data = await res.json();
        if (!data.pickup_id) throw new Error('No pickup_id returned');
        removeFromQueue(PICKUP_QUEUE_KEY, entry.id);
        synced++;
      } catch (err) {
        console.warn('[OfflineSync] Pickup sync failed', entry.id, err.message);
        failed++;
      }
    }
    return { synced, failed };
  }

  // ── SYNC ALL ──

  async function syncAll() {
    if (!navigator.onLine) return;
    if (isSyncing) return;
    if (totalQueueCount() === 0) return;
    isSyncing = true;

    const farmers = await syncFarmerQueue();
    const pickups = await syncPickupQueue();

    isSyncing = false;

    const totalSynced = farmers.synced + pickups.synced;
    const totalFailed = farmers.failed + pickups.failed;

    if (totalSynced > 0 && totalFailed === 0) {
      const parts = [];
      if (farmers.synced > 0) parts.push(`${farmers.synced} farmer${farmers.synced > 1 ? 's' : ''}`);
      if (pickups.synced > 0) parts.push(`${pickups.synced} pickup${pickups.synced > 1 ? 's' : ''}`);
      showSyncToast(`✅ Synced: ${parts.join(' & ')}`, 'teal');
    } else if (totalSynced > 0 && totalFailed > 0) {
      showSyncToast(`⚠️ ${totalSynced} synced, ${totalFailed} failed — will retry`, 'amber');
    }
  }

  // ── EXPOSED GLOBALLY ──

  window.OfflineSync = {
    // Farmer queue
    addFarmerToQueue: function (entry) { addToQueue(FARMER_QUEUE_KEY, entry); },
    farmerQueueCount: function () { return getQueue(FARMER_QUEUE_KEY).length; },

    // Pickup queue
    addPickupToQueue: function (entry) { addToQueue(PICKUP_QUEUE_KEY, entry); },
    pickupQueueCount: function () { return getQueue(PICKUP_QUEUE_KEY).length; },

    // Combined
    queueCount: function () { return totalQueueCount(); },

    syncNow: function (manual) {
      if (!navigator.onLine) {
        if (manual) showSyncToast('📵 Still offline — can\'t sync yet', 'amber');
        return;
      }
      syncAll();
    },

    // Legacy — farmer-form.html used addToQueue before this update
    addToQueue: function (entry) { addToQueue(FARMER_QUEUE_KEY, entry); },
  };

  // ── INIT ──

  function init() {
    if (navigator.onLine && totalQueueCount() > 0) {
      setTimeout(syncAll, 2000);
    }
    window.addEventListener('online', function () {
      setTimeout(syncAll, 1500);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
