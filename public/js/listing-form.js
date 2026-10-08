// Add / edit listing form: photo previews, map pin, AI description.
(function () {
  const form = document.getElementById('listingForm');
  if (!form) return;
  const $ = (sel) => form.querySelector(sel);

  // ---- Photos: preview selected files and allow drag & drop ----
  const input = $('[data-photo-input]');
  const preview = $('[data-photo-preview]');
  const dropzone = $('[data-dropzone]');

  function renderPreviews() {
    preview.innerHTML = '';
    Array.from(input.files).slice(0, 10).forEach((file, i) => {
      const tile = document.createElement('div');
      tile.className = 'photo';
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = '';
      tile.appendChild(img);
      if (i === 0 && !form.querySelector('.photo .cover')) {
        const cover = document.createElement('span');
        cover.className = 'cover';
        cover.textContent = 'Cover';
        tile.appendChild(cover);
      }
      preview.appendChild(tile);
    });
  }
  input.addEventListener('change', renderPreviews);
  ['dragenter', 'dragover'].forEach((type) =>
    dropzone.addEventListener(type, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag');
    })
  );
  ['dragleave', 'drop'].forEach((type) => dropzone.addEventListener(type, () => dropzone.classList.remove('drag')));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    input.files = e.dataTransfer.files;
    renderPreviews();
  });

  // ---- Description character count ----
  const description = $('#description');
  const counter = $('[data-char-count]');
  const updateCount = () => {
    const n = description.value.trim().length;
    counter.textContent = n < 50 ? `${n} / 50 characters minimum` : `${n} characters`;
  };
  description.addEventListener('input', updateCount);
  updateCount();

  // ---- Map pin (Leaflet + OpenStreetMap, no API key needed) ----
  const mapEl = $('[data-map-picker]');
  const latInput = form.elements.latitude;
  const lngInput = form.elements.longitude;
  const pinStatus = $('[data-pin-status]');
  let map;
  let marker;

  function setPin(lat, lng, zoom) {
    latInput.value = lat.toFixed(6);
    lngInput.value = lng.toFixed(6);
    if (marker) marker.setLatLng([lat, lng]);
    else {
      marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        setPin(p.lat, p.lng);
      });
    }
    if (zoom) map.setView([lat, lng], zoom);
    pinStatus.textContent = 'Pin set. Drag it to adjust.';
  }

  if (mapEl && window.L) {
    const hasPin = mapEl.dataset.lat && mapEl.dataset.lng;
    const start = hasPin ? [Number(mapEl.dataset.lat), Number(mapEl.dataset.lng)] : [-1.286389, 36.817223]; // Nairobi
    map = L.map(mapEl, { scrollWheelZoom: false }).setView(start, hasPin ? 15 : 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    if (hasPin) setPin(start[0], start[1]);
    map.on('click', (e) => setPin(e.latlng.lat, e.latlng.lng));
  }

  // Look up the typed address with OpenStreetMap's free geocoder.
  $('[data-locate]')?.addEventListener('click', async (e) => {
    const query = [form.elements.address.value, form.elements.estate.value, form.elements.town.value, form.elements.county.value, 'Kenya']
      .filter(Boolean)
      .join(', ');
    const btn = e.currentTarget;
    btn.disabled = true;
    pinStatus.textContent = 'Searching…';
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ke&q=${encodeURIComponent(query)}`;
      const results = await (await fetch(url, { headers: { Accept: 'application/json' } })).json();
      if (results[0]) setPin(Number(results[0].lat), Number(results[0].lon), 15);
      else pinStatus.textContent = "Couldn't find that address. Click the map to place the pin yourself.";
    } catch {
      pinStatus.textContent = 'Search is unavailable. Click the map to place the pin.';
    } finally {
      btn.disabled = false;
    }
  });

  // ---- AI description ----
  $('[data-ai-describe]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (description.value.trim().length > 80 && !confirm('Replace your current description with an AI draft?')) return;

    const data = new FormData(form);
    const payload = {
      title: data.get('title'),
      property_type: data.get('property_type'),
      bedrooms: data.get('bedrooms'),
      bathrooms: data.get('bathrooms'),
      furnished: data.get('furnished'),
      county: data.get('county'),
      town: data.get('town'),
      estate: data.get('estate'),
      amenities: data.getAll('amenities'),
    };

    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Writing…';
    try {
      const res = await fetch('/api/ai/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-csrf-token': data.get('_csrf') },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      description.value = json.description;
      updateCount();
      description.focus();
    } catch (err) {
      alert(err.message || 'Could not write a description right now. Please try again.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });

  // Prevent double submits while photos upload.
  form.addEventListener('submit', () => {
    const btn = form.querySelector('[data-submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Uploading…';
  });
})();
