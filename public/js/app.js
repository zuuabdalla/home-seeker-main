// Small progressive enhancements. Every page also works without JavaScript.
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const csrf = () => ($('input[name="_csrf"]') || {}).value || '';

  // Flash messages: dismiss on click, fade away after a few seconds.
  $$('[data-autoclose]').forEach((alert) => {
    const close = () => alert.remove();
    $('[data-dismiss]', alert)?.addEventListener('click', close);
    setTimeout(close, 6000);
  });

  // Mobile menus.
  $('[data-menu-toggle]')?.addEventListener('click', (e) => {
    const header = $('#siteHeader');
    const open = header.classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', open);
  });
  const dash = $('#dash');
  $('[data-dash-toggle]')?.addEventListener('click', () => dash.classList.add('open'));
  dash?.addEventListener('click', (e) => {
    if (dash.classList.contains('open') && e.target === dash) dash.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') dash?.classList.remove('open');
  });

  // Collapse the filters panel on small screens.
  const filters = $('[data-filters]');
  if (filters && window.matchMedia('(max-width: 900px)').matches) filters.removeAttribute('open');

  // Selects that apply immediately (sort order, status changes).
  $$('[data-autosubmit]').forEach((el) => el.addEventListener('change', () => el.form.submit()));

  // "Are you sure?" for destructive forms.
  $$('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      if (!window.confirm(form.dataset.confirm)) e.preventDefault();
    });
  });

  // Dialogs: <button data-open="id"> opens <dialog id="id">; [data-close] closes it.
  $$('[data-open]').forEach((btn) => {
    btn.addEventListener('click', () => document.getElementById(btn.dataset.open)?.showModal());
  });
  $$('dialog').forEach((dialog) => {
    $$('[data-close]', dialog).forEach((btn) => btn.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close(); // click on backdrop
    });
  });

  // Tabs (message / viewing on the listing page).
  $$('[role="tablist"]').forEach((list) => {
    const tabs = $$('[role="tab"]', list);
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => {
          const selected = t === tab;
          t.setAttribute('aria-selected', selected);
          document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
        });
      });
    });
  });

  // Photo gallery.
  const main = $('[data-gallery-main]');
  if (main) {
    const thumbs = $$('.thumbs [data-gallery-index]');
    const show = (index) => {
      const thumb = thumbs[index];
      if (!thumb) return;
      main.src = thumb.dataset.src;
      thumbs.forEach((t) => t.classList.toggle('active', t === thumb));
    };
    $$('[data-gallery-index]').forEach((btn) => {
      btn.addEventListener('click', () => show(Number(btn.dataset.galleryIndex)));
    });
  }

  // Save / unsave without reloading the page.
  $$('[data-save-form]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('button', form);
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { Accept: 'application/json', 'x-csrf-token': csrf() },
        });
        if (!res.ok) throw new Error();
        const { saved, count } = await res.json();
        btn.classList.toggle('on', saved);
        btn.setAttribute('aria-pressed', saved);
        const icon = $('i', btn);
        icon.className = 'bi ' + (saved ? 'bi-heart-fill' : 'bi-heart');
        const text = $('span', btn);
        if (text) text.textContent = saved ? 'Saved' : 'Save this home';
        updateSavedCount(count);
      } catch {
        form.submit();
      }
    });
  });

  function updateSavedCount(count) {
    const link = $('.saved-link');
    if (!link) return;
    let dot = $('[data-saved-count]', link);
    if (!count) return dot?.remove();
    if (!dot) {
      dot = document.createElement('span');
      dot.className = 'count-dot';
      dot.dataset.savedCount = '';
      link.appendChild(dot);
    }
    dot.textContent = count;
  }

  // Show / hide password.
  $$('[data-toggle-password]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.togglePassword);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      $('i', btn).className = 'bi ' + (show ? 'bi-eye-slash' : 'bi-eye');
    });
  });

  // Profile photo preview.
  $('[data-avatar-input]')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    $('[data-avatar-preview]').innerHTML = '';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    $('[data-avatar-preview]').appendChild(img);
  });

  // Read-only map on the listing page.
  const mapEl = $('[data-map]');
  if (mapEl && window.L) {
    const point = [Number(mapEl.dataset.lat), Number(mapEl.dataset.lng)];
    const map = L.map(mapEl, { scrollWheelZoom: false }).setView(point, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    L.circle(point, { radius: 250, color: '#1f5b45', fillColor: '#1f5b45', fillOpacity: 0.15, weight: 2 }).addTo(map);
  }
})();
