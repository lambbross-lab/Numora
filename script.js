
document.addEventListener('DOMContentLoaded', () => {
  const fmt = n => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);
  const num = (form, name) => parseFloat(new FormData(form).get(name)) || 0;
  const out = (form, html) => {
    const r = form.parentElement.querySelector('#result');
    if (!r) return;
    r.innerHTML = html;
    r.classList.add('show');
  };

  document.querySelectorAll('.calculator').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const type = form.dataset.calc;

      if (type === 'finiquito') {
        const s = num(form, 'salary'), d = num(form, 'days'), v = num(form, 'vacdays'), ex = num(form, 'extra');
        const daily = s / 30, salary = daily * d, vac = daily * v, total = salary + vac + ex;
        out(form, `<div class="big">${fmt(total)}</div><div class="result-grid"><div><small>Días trabajados</small>${fmt(salary)}</div><div><small>Vacaciones</small>${fmt(vac)}</div><div><small>Pagas extra</small>${fmt(ex)}</div></div>`);
      }

      if (type === 'despido') {
        const s = num(form, 'salary'), y = num(form, 'years'), days = num(form, 'type');
        const daily = s / 30, total = daily * days * y;
        out(form, `<div class="big">${fmt(total)}</div><div class="result-grid"><div><small>Salario día</small>${fmt(daily)}</div><div><small>Días/año</small>${days}</div><div><small>Antigüedad</small>${y} años</div></div>`);
      }

      if (type === 'paro') {
        const base = num(form, 'base'), days = num(form, 'days'), child = num(form, 'children');
        let months = 0;
        if (days >= 360) months = 4; if (days >= 540) months = 6; if (days >= 720) months = 8; if (days >= 900) months = 10;
        if (days >= 1080) months = 12; if (days >= 1260) months = 14; if (days >= 1440) months = 16; if (days >= 1620) months = 18;
        if (days >= 1800) months = 20; if (days >= 1980) months = 22; if (days >= 2160) months = 24;
        const first = base * .70, after = base * .60;
        out(form, `<div class="big">${months} meses</div><div class="result-grid"><div><small>Primeros 180 días</small>${fmt(first)}</div><div><small>Después</small>${fmt(after)}</div><div><small>Hijos</small>${child}</div></div><p class="microcopy">No aplica topes mínimos/máximos exactos. Revísalo con SEPE.</p>`);
      }

      if (type === 'vacaciones') {
        const fd = new FormData(form), start = new Date(fd.get('start')), end = new Date(fd.get('end'));
        const annual = num(form, 'annual'), used = num(form, 'used');
        let worked = 0;
        if (!isNaN(start) && !isNaN(end) && end >= start) worked = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const generated = worked * annual / 365, pending = Math.max(0, generated - used);
        out(form, `<div class="big">${pending.toFixed(1)} días</div><div class="result-grid"><div><small>Días trabajados</small>${worked}</div><div><small>Generados</small>${generated.toFixed(1)}</div><div><small>Disfrutados</small>${used}</div></div>`);
      }

      if (type === 'nomina') {
        const gross = num(form, 'gross'), pays = num(form, 'pays'), irpf = num(form, 'irpf') / 100, ss = num(form, 'ss') / 100;
        const ssA = gross * ss, irpfA = gross * irpf, net = gross - ssA - irpfA;
        out(form, `<div class="big">${fmt(net / (pays || 12))}</div><div class="result-grid"><div><small>Neto anual</small>${fmt(net)}</div><div><small>IRPF estimado</small>${fmt(irpfA)}</div><div><small>Seg. Social</small>${fmt(ssA)}</div></div>`);
      }

      if (type === 'reduccion') {
        const s = num(form, 'salary'), cur = num(form, 'current'), nw = num(form, 'new');
        const newS = cur ? s * (nw / cur) : 0, loss = s - newS;
        out(form, `<div class="big">${fmt(newS)}</div><div class="result-grid"><div><small>Salario actual</small>${fmt(s)}</div><div><small>Pérdida mensual</small>${fmt(loss)}</div><div><small>Nueva jornada</small>${nw}%</div></div>`);
      }

      if (type === 'coste') {
        const gross = num(form, 'gross'), company = num(form, 'company') / 100, other = num(form, 'other'), cost = gross + (gross * company) + other;
        out(form, `<div class="big">${fmt(cost)}</div><div class="result-grid"><div><small>Bruto anual</small>${fmt(gross)}</div><div><small>Cotización empresa</small>${fmt(gross * company)}</div><div><small>Otros costes</small>${fmt(other)}</div></div>`);
      }

      if (type === 'horas') {
        const s = num(form, 'salary'), weekly = num(form, 'weekly'), hours = num(form, 'hours'), bonus = num(form, 'bonus') / 100;
        const monthlyHours = weekly * 52 / 12, hour = monthlyHours ? s / monthlyHours : 0, extra = hour * (1 + bonus) * hours;
        out(form, `<div class="big">${fmt(extra)}</div><div class="result-grid"><div><small>Valor hora base</small>${fmt(hour)}</div><div><small>Horas extra</small>${hours}</div><div><small>Recargo</small>${(bonus * 100).toFixed(0)}%</div></div>`);
      }
    });
  });

  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  const banner = document.getElementById('cookie-banner');
  if (banner) {
    const hideBanner = () => {
      banner.setAttribute('hidden', '');
      banner.classList.add('is-hidden');
      banner.style.display = 'none';
    };
    const showBanner = () => {
      banner.removeAttribute('hidden');
      banner.classList.remove('is-hidden');
      banner.style.display = '';
    };
    const saved = localStorage.getItem('cl_consent');
    if (saved === 'accepted' || saved === 'rejected') hideBanner();
    else showBanner();

    document.querySelectorAll('[data-consent]').forEach(btn => {
      btn.addEventListener('click', () => {
        const accepted = btn.dataset.consent === 'accept';
        localStorage.setItem('cl_consent', accepted ? 'accepted' : 'rejected');
        if (window.gtag) {
          gtag('consent', 'update', {
            ad_storage: accepted ? 'granted' : 'denied',
            analytics_storage: accepted ? 'granted' : 'denied',
            ad_user_data: accepted ? 'granted' : 'denied',
            ad_personalization: accepted ? 'granted' : 'denied'
          });
        }
        hideBanner();
      });
    });
  }
});
