/* Stail Dental — step-by-step appointment widget. No dependencies. */
(function () {
	'use strict';

	var DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
	var DAYS_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
	var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
	var DAYS_AHEAD = 14;
	var STEP_MIN = 30;

	function pad(n) { return (n < 10 ? '0' : '') + n; }
	function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
	function human(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()] + ', ' + DAYS_FULL[d.getDay()]; }

	/* Demo only: mark some slots as taken so the schedule looks lived-in. Deterministic per day + doctor. */
	function looksBusy(key) {
		var h = 0;
		for (var i = 0; i < key.length; i++) { h = (h * 31 + key.charCodeAt(i)) >>> 0; }
		return h % 10 < 3;
	}

	function init(form) {
		var steps = [].slice.call(form.querySelectorAll('.wizard__step'));
		var progress = [].slice.call(form.querySelectorAll('.wizard__progress li'));
		var back = form.querySelector('.wizard__back');
		var next = form.querySelector('.wizard__next');
		var submit = form.querySelector('.wizard__submit');
		var daysEl = form.querySelector('.days');
		var slotsEl = form.querySelector('.slots');
		var dateInput = form.querySelector('input[name=date]');
		var timeInput = form.querySelector('input[name=time]');
		var errorEl = form.querySelector('.wizard__error');
		var done = form.querySelector('.wizard__done');
		var hours = JSON.parse(form.getAttribute('data-hours') || '{"wd":[9,21],"we":[10,19]}');
		var demo = form.getAttribute('data-demo') === '1';
		var demoBusy = form.getAttribute('data-demo-busy') === '1';
		var current = 0;

		form.classList.add('is-enhanced');

		function value(name) {
			var el = form.querySelector('input[name="' + name + '"]:checked');
			return el ? el : null;
		}
		function doctorName() {
			var d = value('doctor');
			return d ? d.getAttribute('data-name') : 'Любой врач';
		}

		function show(i) {
			current = i;
			steps.forEach(function (s, n) { s.classList.toggle('is-active', n === i); });
			progress.forEach(function (p, n) {
				p.classList.toggle('is-active', n === i);
				p.classList.toggle('is-done', n < i);
			});
			back.hidden = i === 0;
			next.hidden = i === steps.length - 1;
			submit.hidden = i !== steps.length - 1;
			if (i === 2) { renderDays(); }
			if (i === 3) { renderSummary(form.querySelector('.wizard__step[data-step="4"] .summary')); }
			updateNext();
		}

		function updateNext() {
			next.disabled = current === 2 && !timeInput.value;
		}

		/* Days and time slots */
		function slotsFor(day) {
			var weekend = day.getDay() === 0 || day.getDay() === 6;
			var range = weekend ? hours.we : hours.wd;
			var out = [];
			var now = new Date();
			var earliest = new Date(now.getTime() + 60 * 60 * 1000);
			for (var m = range[0] * 60; m <= range[1] * 60 - 60; m += STEP_MIN) {
				var t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60);
				if (t < earliest) { continue; }
				var label = pad(Math.floor(m / 60)) + ':' + pad(m % 60);
				out.push({ label: label, busy: demoBusy && looksBusy(iso(day) + label + doctorName()) });
			}
			return out;
		}

		function renderDays() {
			if (daysEl.childElementCount) { renderSlots(); return; }
			var today = new Date();
			today.setHours(0, 0, 0, 0);
			var first = null;
			for (var i = 0; i < DAYS_AHEAD; i++) {
				var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
				var free = slotsFor(d).filter(function (s) { return !s.busy; }).length;
				var b = document.createElement('button');
				b.type = 'button';
				b.className = 'day';
				b.disabled = free === 0;
				b.setAttribute('data-date', iso(d));
				b.innerHTML = '<span class="day__name">' + (i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : DAYS[d.getDay()]) +
					'</span><span class="day__num">' + d.getDate() + '</span><span class="day__month">' + MONTHS[d.getMonth()].slice(0, 3) + '</span>';
				b.addEventListener('click', pickDay);
				daysEl.appendChild(b);
				if (!first && free) { first = b; }
			}
			if (first) { first.click(); }
		}

		function pickDay(e) {
			var b = e.currentTarget;
			[].forEach.call(daysEl.children, function (c) { c.classList.toggle('is-selected', c === b); c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
			dateInput.value = b.getAttribute('data-date');
			timeInput.value = '';
			renderSlots();
		}

		function renderSlots() {
			slotsEl.innerHTML = '';
			if (!dateInput.value) { return; }
			var parts = dateInput.value.split('-');
			var day = new Date(+parts[0], +parts[1] - 1, +parts[2]);
			slotsFor(day).forEach(function (s) {
				var b = document.createElement('button');
				b.type = 'button';
				b.className = 'slot';
				b.textContent = s.label;
				b.disabled = s.busy;
				if (s.busy) { b.title = 'Занято'; }
				if (s.label === timeInput.value) { b.classList.add('is-selected'); }
				b.addEventListener('click', function () {
					[].forEach.call(slotsEl.children, function (c) { c.classList.toggle('is-selected', c === b); });
					timeInput.value = s.label;
					updateNext();
				});
				slotsEl.appendChild(b);
			});
			updateNext();
		}

		/* Summary */
		function summaryRows() {
			var rows = [['Услуга', value('reason') ? value('reason').value : '—'], ['Врач', doctorName()]];
			if (dateInput.value) {
				var p = dateInput.value.split('-');
				rows.push(['Когда', human(new Date(+p[0], +p[1] - 1, +p[2])) + (timeInput.value ? ', ' + timeInput.value : '')]);
			}
			return rows;
		}
		function renderSummary(el) {
			el.innerHTML = '';
			summaryRows().forEach(function (r) {
				var dt = document.createElement('dt'); dt.textContent = r[0];
				var dd = document.createElement('dd'); dd.textContent = r[1];
				el.appendChild(dt); el.appendChild(dd);
			});
		}

		/* Navigation */
		next.addEventListener('click', function () { if (current < steps.length - 1) { show(current + 1); scrollTop(); } });
		back.addEventListener('click', function () { if (current > 0) { show(current - 1); scrollTop(); } });
		form.querySelectorAll('input[name=reason], input[name=doctor]').forEach(function (r) {
			r.addEventListener('change', function () {
				if (r.name === 'doctor') { timeInput.value = ''; daysEl.innerHTML = ''; }
			});
			r.closest('.choice').addEventListener('dblclick', function () { next.click(); });
		});
		function scrollTop() {
			var top = form.getBoundingClientRect().top + window.pageYOffset - 100;
			if (window.pageYOffset > top) { window.scrollTo({ top: top, behavior: 'smooth' }); }
		}

		/* Phone mask: +7 (___) ___-__-__ */
		var phone = form.querySelector('input[name=phone]');
		phone.addEventListener('input', function () {
			var d = phone.value.replace(/\D/g, '');
			if (d[0] === '8') { d = '7' + d.slice(1); }
			if (d && d[0] !== '7') { d = '7' + d; }
			d = d.slice(0, 11);
			var f = '+7';
			if (d.length > 1) { f += ' (' + d.slice(1, 4); }
			if (d.length >= 4) { f += ')'; }
			if (d.length > 4) { f += ' ' + d.slice(4, 7); }
			if (d.length > 7) { f += '-' + d.slice(7, 9); }
			if (d.length > 9) { f += '-' + d.slice(9, 11); }
			phone.value = d ? f : '';
		});

		/* Submit */
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			var name = form.querySelector('input[name=name]').value.trim();
			var digits = phone.value.replace(/\D/g, '');
			var consent = form.querySelector('input[name=consent]').checked;
			var msg = !name ? 'Укажите, как к вам обращаться.' : digits.length < 11 ? 'Проверьте номер телефона.' : !consent ? 'Нужно согласие на обработку данных.' : '';
			errorEl.hidden = !msg;
			errorEl.textContent = msg;
			if (msg) { return; }

			if (demo) { finish(); return; }

			submit.disabled = true;
			submit.textContent = 'Отправляем…';
			fetch(form.getAttribute('action'), { method: 'POST', body: new FormData(form), credentials: 'same-origin' })
				.then(function (r) {
					if (r.url.indexOf('booking=sent') === -1) { throw new Error('not sent'); }
					finish();
				})
				.catch(function () { form.submit(); });
		});

		function finish() {
			renderSummary(form.querySelector('.summary--done'));
			steps.forEach(function (s) { s.classList.remove('is-active'); });
			form.querySelector('.wizard__nav').hidden = true;
			form.querySelector('.wizard__progress').hidden = true;
			var note = form.querySelector('.form-note'); if (note) { note.remove(); }
			done.hidden = false;
			form.querySelector('.wizard__demo-note').hidden = !demo;
			scrollTop();
		}

		form.querySelector('.wizard__again').addEventListener('click', function () {
			done.hidden = true;
			form.querySelector('.wizard__nav').hidden = false;
			form.querySelector('.wizard__progress').hidden = false;
			submit.disabled = false;
			submit.textContent = 'Записаться';
			timeInput.value = '';
			daysEl.innerHTML = '';
			show(0);
		});

		/* Deep links: ?doctor=ID or ?service=Name preselect a choice. */
		var params = new URLSearchParams(window.location.search);
		var preDoctor = params.get('doctor');
		var preService = params.get('service');
		var start = 0;
		if (preService) {
			form.querySelectorAll('input[name=reason]').forEach(function (r) { if (r.value === preService) { r.checked = true; start = 1; } });
		}
		if (preDoctor) {
			var d = form.querySelector('input[name=doctor][value="' + preDoctor.replace(/\D/g, '') + '"]');
			if (d) { d.checked = true; start = 2; }
		}
		show(start);
	}

	document.querySelectorAll('form.wizard').forEach(init);
})();
