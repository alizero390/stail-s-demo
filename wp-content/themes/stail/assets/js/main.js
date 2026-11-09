/* Stail Dental — small progressive enhancements, no dependencies. */
(function () {
	'use strict';

	/* Mobile menu */
	var toggle = document.querySelector('.nav-toggle');
	if (toggle) {
		var setOpen = function (open) {
			document.body.classList.toggle('nav-open', open);
			toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
		};
		toggle.addEventListener('click', function () {
			setOpen(!document.body.classList.contains('nav-open'));
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') { setOpen(false); }
		});
		document.querySelectorAll('.site-nav a').forEach(function (a) {
			a.addEventListener('click', function () { setOpen(false); });
		});
	}

	/* Load the Yandex map only on request: faster page, no third-party cookies until asked. */
	document.querySelectorAll('.map[data-src]').forEach(function (map) {
		var btn = map.querySelector('.map__load');
		if (!btn) { return; }
		btn.addEventListener('click', function () {
			var frame = document.createElement('iframe');
			frame.src = map.getAttribute('data-src');
			frame.title = 'Клиника на Яндекс Картах';
			frame.loading = 'lazy';
			frame.allowFullscreen = true;
			map.innerHTML = '';
			map.appendChild(frame);
		});
	});

	/* Price list search with highlighting */
	var search = document.getElementById('price-search');
	if (search) {
		var groups = Array.prototype.slice.call(document.querySelectorAll('.price-group'));
		var empty = document.getElementById('price-empty');
		var rows = [];
		groups.forEach(function (group) {
			group.querySelectorAll('.price-row').forEach(function (row) {
				var cell = row.querySelector('.price-row__name');
				rows.push({ group: group, row: row, cell: cell, text: cell.textContent });
			});
		});

		var escapeHtml = function (s) {
			return s.replace(/[&<>"']/g, function (c) {
				return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
			});
		};
		var normalize = function (s) { return s.toLowerCase().replace(/ё/g, 'е'); };

		search.addEventListener('input', function () {
			var q = normalize(search.value.trim());
			var visible = {};
			rows.forEach(function (r) {
				var idx = normalize(r.text).indexOf(q);
				var match = !q || idx !== -1;
				r.row.hidden = !match;
				if (q && match) {
					r.cell.innerHTML = escapeHtml(r.text.slice(0, idx)) + '<mark>' +
						escapeHtml(r.text.slice(idx, idx + q.length)) + '</mark>' +
						escapeHtml(r.text.slice(idx + q.length));
				} else {
					r.cell.textContent = r.text;
				}
				if (match) { visible[r.group.id] = true; }
			});
			var any = false;
			groups.forEach(function (g) {
				var show = !!visible[g.id];
				g.hidden = !show;
				if (show) { any = true; g.open = true; }
				g.querySelectorAll('.price-table__sub').forEach(function (sub) { sub.hidden = !!q; });
			});
			if (empty) { empty.hidden = any; }
		});
	}
})();
