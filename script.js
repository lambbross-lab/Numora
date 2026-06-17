document.addEventListener('DOMContentLoaded', () => {
  const fmt = n => new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2
  }).format(Number.isFinite(n) ? n : 0);
  const num = (f, n) => parseFloat(new FormData(f).get(n)) || 0;
  const output = (f, h) => {
    const r = f.parentElement.querySelector('#result');
    if (r) {
      r.innerHTML = h;
      r.classList.add('show');
    }
  };

  document.querySelectorAll('.calculator').forEach(form => form.addEventListener('submit', e => {
    e.preventDefault();
    const t = form.dataset.calc;

    if (t === 'finiquito') {
      const s = num(form, 'salary'), d = num(form, 'days'), v = num(form, 'vacdays'), ex = num(form, 'extra'), day = s / 30, a = day * d, b = day * v;
      output(form, `<div class="big">${fmt(a + b + ex)}</div><div class="result-grid"><div><small>Días trabajados</small>${fmt(a)}</div><div><small>Vacaciones</small>${fmt(b)}</div><div><small>Pagas extra</small>${fmt(ex)}</div></div>`);
    }

    if (t === 'despido') {
      const s = num(form, 'salary'), y = num(form, 'years'), days = num(form, 'type'), day = s / 30;
      output(form, `<div class="big">${fmt(day * days * y)}</div><div class="result-grid"><div><small>Salario día</small>${fmt(day)}</div><div><small>Días/año</small>${days}</div><div><small>Antigüedad</small>${y} años</div></div>`);
    }

    if (t === 'paro') {
      const base = num(form, 'base'), days = num(form, 'days'), child = num(form, 'children');
      let m = 0;
      if (days >= 360) m = 4;
      if (days >= 540) m = 6;
      if (days >= 720) m = 8;
      if (days >= 900) m = 10;
      if (days >= 1080) m = 12;
      if (days >= 1260) m = 14;
      if (days >= 1440) m = 16;
      if (days >= 1620) m = 18;
      if (days >= 1800) m = 20;
      if (days >= 1980) m = 22;
      if (days >= 2160) m = 24;
      output(form, `<div class="big">${m} meses</div><div class="result-grid"><div><small>Primeros 180 días</small>${fmt(base * .70)}</div><div><small>Después</small>${fmt(base * .60)}</div><div><small>Hijos</small>${child}</div></div><p class="microcopy">No aplica topes mínimos/máximos exactos. Revísalo con SEPE.</p>`);
    }

    if (t === 'vacaciones') {
      const fd = new FormData(form), a = new Date(fd.get('start')), b = new Date(fd.get('end')), annual = num(form, 'annual'), used = num(form, 'used');
      let worked = 0;
      if (!isNaN(a) && !isNaN(b) && b >= a) worked = Math.ceil((b - a) / 86400000) + 1;
      const gen = worked * annual / 365, p = Math.max(0, gen - used);
      output(form, `<div class="big">${p.toFixed(1)} días</div><div class="result-grid"><div><small>Días trabajados</small>${worked}</div><div><small>Generados</small>${gen.toFixed(1)}</div><div><small>Disfrutados</small>${used}</div></div>`);
    }

    if (t === 'nomina') {
      const g = num(form, 'gross'), p = num(form, 'pays') || 12, ir = num(form, 'irpf') / 100, ss = num(form, 'ss') / 100, net = g - (g * ir) - (g * ss);
      output(form, `<div class="big">${fmt(net / p)}</div><div class="result-grid"><div><small>Neto anual</small>${fmt(net)}</div><div><small>IRPF estimado</small>${fmt(g * ir)}</div><div><small>Seg. Social</small>${fmt(g * ss)}</div></div>`);
    }

    if (t === 'reduccion') {
      const s = num(form, 'salary'), c = num(form, 'current'), n = num(form, 'new'), ns = c ? s * (n / c) : 0;
      output(form, `<div class="big">${fmt(ns)}</div><div class="result-grid"><div><small>Salario actual</small>${fmt(s)}</div><div><small>Pérdida mensual</small>${fmt(s - ns)}</div><div><small>Nueva jornada</small>${n}%</div></div>`);
    }

    if (t === 'coste') {
      const g = num(form, 'gross'), co = num(form, 'company') / 100, o = num(form, 'other'), cost = g + (g * co) + o;
      output(form, `<div class="big">${fmt(cost)}</div><div class="result-grid"><div><small>Bruto anual</small>${fmt(g)}</div><div><small>Cotización empresa</small>${fmt(g * co)}</div><div><small>Otros costes</small>${fmt(o)}</div></div>`);
    }

    if (t === 'horas') {
      const s = num(form, 'salary'), w = num(form, 'weekly'), h = num(form, 'hours'), b = num(form, 'bonus') / 100, mh = w * 52 / 12, hour = mh ? s / mh : 0;
      output(form, `<div class="big">${fmt(hour * (1 + b) * h)}</div><div class="result-grid"><div><small>Valor hora base</small>${fmt(hour)}</div><div><small>Horas extra</small>${h}</div><div><small>Recargo</small>${(b * 100).toFixed(0)}%</div></div>`);
    }

    if (t === 'baja') {
      const s = num(form, 'salary'), d = num(form, 'days'), v = num(form, 'vacdays'), req = num(form, 'required'), given = num(form, 'given'), ex = num(form, 'extra'), day = s / 30, a = day * d, b = day * v, disc = day * Math.max(0, req - given);
      output(form, `<div class="big">${fmt(a + b + ex - disc)}</div><div class="result-grid"><div><small>Salario pendiente</small>${fmt(a)}</div><div><small>Vacaciones</small>${fmt(b)}</div><div><small>Descuento preaviso</small>${fmt(disc)}</div></div><p class="microcopy">Estimación bruta. La baja voluntaria normalmente no genera indemnización.</p>`);
    }

    if (t === 'salariohora') {
      const sal = num(form, 'salary'), period = new FormData(form).get('period'), w = num(form, 'weekly'), p = num(form, 'pays') || 12, annual = period === 'annual' ? sal : sal * p, hours = w * 52, hour = hours ? annual / hours : 0;
      output(form, `<div class="big">${fmt(hour)} / hora</div><div class="result-grid"><div><small>Salario anual</small>${fmt(annual)}</div><div><small>Salario mensual medio</small>${fmt(annual / 12)}</div><div><small>Horas/año</small>${hours.toFixed(0)}</div></div>`);
    }

    if (t === 'pagasextra') {
      const sal = num(form, 'salary'), extras = num(form, 'extras'), months = num(form, 'months'), pro = new FormData(form).get('prorated'), prop = sal * Math.min(months, 12) / 12, month = (sal * extras) / 12;
      output(form, `<div class="big">${fmt(pro === 'yes' ? month : prop)}</div><div class="result-grid"><div><small>Paga completa</small>${fmt(sal)}</div><div><small>Proporcional</small>${fmt(prop)}</div><div><small>Prorrata mensual</small>${fmt(month)}</div></div>`);
    }

    if (t === 'notapau') {
      const bach = num(form, 'bachillerato'), obl = num(form, 'obligatoria'), acceso = bach * .6 + obl * .4;
      const aportaciones = [1, 2, 3, 4].map(i => {
        const nota = num(form, `materia${i}`), pond = num(form, `ponderacion${i}`);
        return nota >= 5 ? nota * pond : 0;
      }).sort((a, b) => b - a);
      const cumpleAcceso = obl >= 4 && acceso >= 5, extra = cumpleAcceso ? aportaciones.slice(0, 2).reduce((a, b) => a + b, 0) : 0, admision = Math.min(14, acceso + extra);
      const estado = obl < 4 ? 'La fase obligatoria no alcanza el mínimo orientativo de 4.' : acceso < 5 ? 'La nota de acceso no alcanza el 5 orientativo.' : 'Supera el mínimo orientativo de acceso.';
      const principal = cumpleAcceso ? `${admision.toFixed(3)} / 14` : `${acceso.toFixed(3)} / 10`;
      const nota = cumpleAcceso ? 'Revisa siempre las ponderaciones oficiales de la universidad y grado que te interesen.' : 'Si no se cumple el acceso orientativo, las materias voluntarias no se aplican a la admisión.';
      output(form, `<div class="big">${principal}</div><div class="result-grid"><div><small>Nota de acceso</small>${acceso.toFixed(3)} / 10</div><div><small>Aportación optativas</small>${extra.toFixed(3)}</div><div><small>Estado</small>${estado}</div></div><p class="microcopy">${nota}</p>`);
    }

    if (t === 'mediaponderada') {
      const fd = new FormData(form), notas = fd.getAll('nota[]').map(Number), pesos = fd.getAll('peso[]').map(Number);
      let totalPeso = 0, sumaPonderada = 0;
      notas.forEach((nota, i) => {
        const peso = Number.isFinite(pesos[i]) ? pesos[i] : 0;
        if (Number.isFinite(nota) && Number.isFinite(peso) && peso > 0) {
          totalPeso += peso;
          sumaPonderada += nota * peso;
        }
      });
      const media = totalPeso ? sumaPonderada / totalPeso : 0, diferencia = totalPeso - 100;
      const aviso = Math.abs(diferencia) < .01 ? 'Los pesos suman 100%.' : diferencia < 0 ? `Falta ${(100 - totalPeso).toFixed(2)}% para llegar a 100%.` : `Los pesos superan 100% en ${(totalPeso - 100).toFixed(2)}%.`;
      output(form, `<div class="big">${media.toFixed(2)} / 10</div><div class="result-grid"><div><small>Media ponderada</small>${media.toFixed(2)}</div><div><small>Peso total usado</small>${totalPeso.toFixed(2)}%</div><div><small>Revisión de pesos</small>${aviso}</div></div><p class="microcopy">Resultado orientativo. Depende de los criterios oficiales de cada curso, centro o examen.</p>`);
    }

    if (t === 'costeperro') {
      const fd = new FormData(form), size = fd.get('size') || 'mediano', food = num(form, 'food'), vetAnnual = num(form, 'vet'), insurance = num(form, 'insurance'), grooming = num(form, 'grooming'), other = num(form, 'other');
      const vetMonth = vetAnnual / 12, monthly = food + vetMonth + insurance + grooming + other, annual = monthly * 12;
      output(form, `<div class="big">${fmt(monthly)} / mes</div><div class="result-grid"><div><small>Coste mensual</small>${fmt(monthly)}</div><div><small>Coste anual</small>${fmt(annual)}</div><div><small>Tamaño</small>${size}</div><div><small>Alimentación</small>${fmt(food)}</div><div><small>Veterinario mensualizado</small>${fmt(vetMonth)}</div><div><small>Seguro y extras</small>${fmt(insurance + grooming + other)}</div></div><p class="microcopy">Estimación orientativa. Los costes varían por ubicación, raza, edad, salud y circunstancias.</p>`);
    }

    if (t === 'edadperro') {
      const fd = new FormData(form), age = Math.max(0, num(form, 'age')), size = fd.get('size') || 'mediano';
      const factor = size === 'pequeño' ? 4 : size === 'grande' ? 6 : 5;
      const human = age <= 1 ? age * 15 : age <= 2 ? 15 + (age - 1) * 9 : 24 + (age - 2) * factor;
      const stage = age < 1 ? 'Cachorro' : age < 3 ? 'Joven' : age < 8 ? 'Adulto' : 'Senior';
      output(form, `<div class="big">${human.toFixed(1)} años humanos</div><div class="result-grid"><div><small>Edad del perro</small>${age.toFixed(1)} años</div><div><small>Tamaño</small>${size}</div><div><small>Etapa orientativa</small>${stage}</div><div><small>Ritmo desde 2 años</small>${factor} años humanos/año</div></div><p class="microcopy">Estimación orientativa. La edad biológica puede variar por raza, tamaño, salud, alimentación y circunstancias individuales.</p>`);
    }

    if (t === 'antiguedad') {
      const fd = new FormData(form), start = new Date(fd.get('start')), end = new Date(fd.get('end'));
      if (isNaN(start) || isNaN(end) || end < start) {
        output(form, `<div class="big">Fechas no válidas</div><p class="microcopy">Comprueba que la fecha de fin sea posterior a la fecha de inicio.</p>`);
      } else {
        let y = end.getFullYear() - start.getFullYear(), m = end.getMonth() - start.getMonth(), d = end.getDate() - start.getDate();
        if (d < 0) {
          m--;
          d += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
        }
        if (m < 0) {
          y--;
          m += 12;
        }
        const total = Math.ceil((end - start) / 86400000) + 1;
        output(form, `<div class="big">${y} años, ${m} meses y ${d} días</div><div class="result-grid"><div><small>Años</small>${y}</div><div><small>Meses</small>${m}</div><div><small>Días totales</small>${total}</div></div>`);
      }
    }
  }));

  document.querySelectorAll('[data-add-row]').forEach(btn => btn.addEventListener('click', () => {
    const form = btn.closest('form'), rows = form?.querySelector('[data-weighted-rows]');
    if (!rows) return;
    const source = rows.querySelector('[data-weighted-row]');
    if (!source) return;
    const row = source.cloneNode(true);
    row.querySelectorAll('input').forEach(input => {
      input.value = '';
    });
    rows.appendChild(row);
  }));

  document.querySelectorAll('[data-weighted-rows]').forEach(rows => rows.addEventListener('click', e => {
    const btn = e.target.closest('[data-remove-row]');
    if (!btn) return;
    const row = btn.closest('[data-weighted-row]'), allRows = rows.querySelectorAll('[data-weighted-row]');
    if (allRows.length > 1) {
      row.remove();
    } else {
      row.querySelectorAll('input').forEach(input => {
        input.value = '';
      });
    }
  }));

  const toggle = document.querySelector('.menu-toggle'), nav = document.querySelector('#site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  const banner = document.getElementById('cookie-banner');
  if (banner) {
    const hide = () => {
      banner.setAttribute('hidden', '');
      banner.classList.add('is-hidden');
      banner.style.display = 'none';
    };
    const show = () => {
      banner.removeAttribute('hidden');
      banner.classList.remove('is-hidden');
      banner.style.display = '';
    };
    const saved = localStorage.getItem('cl_consent');
    saved === 'accepted' || saved === 'rejected' ? hide() : show();
    document.querySelectorAll('[data-consent]').forEach(btn => btn.addEventListener('click', () => {
      const ok = btn.dataset.consent === 'accept';
      localStorage.setItem('cl_consent', ok ? 'accepted' : 'rejected');
      if (window.gtag) {
        gtag('consent', 'update', {
          ad_storage: ok ? 'granted' : 'denied',
          analytics_storage: ok ? 'granted' : 'denied',
          ad_user_data: ok ? 'granted' : 'denied',
          ad_personalization: ok ? 'granted' : 'denied'
        });
      }
      hide();
    }));
  }
});
