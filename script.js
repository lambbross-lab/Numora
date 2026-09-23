document.addEventListener('DOMContentLoaded', () => {
  const fmt = n => new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2
  }).format(Number.isFinite(n) ? n : 0);
  const parseLocalizedNumber = value => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    let raw = String(value ?? '').trim().replace(/[\s\u00a0€%']/g, '');
    if (!raw) return NaN;
    const comma = raw.lastIndexOf(','), dot = raw.lastIndexOf('.');
    if (comma >= 0 && dot >= 0) {
      const decimal = comma > dot ? ',' : '.';
      const grouping = decimal === ',' ? /\./g : /,/g;
      raw = raw.replace(grouping, '').replace(decimal, '.');
    } else if (comma >= 0) {
      const parts = raw.split(',');
      raw = parts.length === 2 ? `${parts[0]}.${parts[1]}` : parts.join('');
    } else if (dot >= 0) {
      const grouped = /^-?\d{2,3}\.\d{3}$/.test(raw) || /^-?\d{1,3}(\.\d{3}){2,}$/.test(raw);
      if (grouped) raw = raw.replace(/\./g, '');
      else if ((raw.match(/\./g) || []).length > 1) {
        const parts = raw.split('.'), decimals = parts.pop();
        raw = `${parts.join('')}.${decimals}`;
      }
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : NaN;
  };
  window.NumoraNumber = parseLocalizedNumber;
  const num = (f, n) => {
    const parsed = parseLocalizedNumber(new FormData(f).get(n));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const output = (f, h) => {
    const r = f.parentElement.querySelector('#result');
    if (r) {
      r.innerHTML = h;
      r.classList.add('show');
    }
  };

  const validateAndNormalize = input => {
    if (!input.value.trim()) {
      input.setCustomValidity(input.required ? 'Introduce un valor.' : '');
      return !input.required;
    }
    const value = parseLocalizedNumber(input.value);
    let message = '';
    if (!Number.isFinite(value)) message = 'Escribe un número válido, por ejemplo 30000, 30.000 o 30000,50.';
    const min = parseLocalizedNumber(input.dataset.numMin), max = parseLocalizedNumber(input.dataset.numMax);
    if (!message && Number.isFinite(min) && value < min) message = `El valor mínimo es ${input.dataset.numMin}.`;
    if (!message && Number.isFinite(max) && value > max) message = `El valor máximo es ${input.dataset.numMax}.`;
    input.setCustomValidity(message);
    if (!message) input.value = String(value);
    return !message;
  };

  document.querySelectorAll('input[type="number"]').forEach(input => {
    input.dataset.numMin = input.getAttribute('min') || '';
    input.dataset.numMax = input.getAttribute('max') || '';
    input.dataset.numStep = input.getAttribute('step') || '';
    input.type = 'text';
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    input.addEventListener('input', () => input.setCustomValidity(''));
    input.addEventListener('blur', () => validateAndNormalize(input));
  });

  const seniorityForm = document.querySelector('form[data-calc="antiguedad"]');
  if (seniorityForm) {
    const end = seniorityForm.elements.namedItem('end');
    if (end && !end.value) end.value = new Date().toISOString().slice(0, 10);
  }

  const vacationForm = document.querySelector('form[data-calc="vacaciones"]');
  if (vacationForm) {
    const start = vacationForm.elements.namedItem('start');
    const end = vacationForm.elements.namedItem('end');
    const today = new Date();
    const iso = d => d.toISOString().slice(0, 10);
    if (end && !end.value) end.value = iso(today);
    if (start && !start.value) start.value = `${today.getFullYear()}-01-01`;
  }

  document.querySelectorAll('form.calculator').forEach(form => {
    if (!form.querySelector('input[data-num-step]')) return;
    const hint = document.createElement('p');
    hint.className = 'number-hint';
    hint.textContent = 'Puedes escribir 30000, 30.000 o 30.000,50.';
    const button = form.querySelector('button[type="submit"], button:not([type])');
    if (button) form.insertBefore(hint, button);
  });

  document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const inputs = [...form.querySelectorAll('input[data-num-step]')];
    const valid = inputs.every(validateAndNormalize);
    if (!valid) {
      event.preventDefault();
      event.stopImmediatePropagation();
      form.reportValidity();
    }
  }, true);

  const taxScale = base => {
    const brackets = [[12450, .19], [7750, .24], [15000, .30], [24800, .37], [240000, .45], [Infinity, .47]];
    let remaining = Math.max(0, base), quota = 0;
    for (const [width, rate] of brackets) {
      const slice = Math.min(remaining, width);
      quota += slice * rate;
      remaining -= slice;
      if (remaining <= 0) break;
    }
    return quota;
  };

  const salarySocialSecurity = (gross, contract) => {
    const monthlyPay = gross / 12, maxBase = 5101.20;
    const base = Math.min(Math.max(0, monthlyPay), maxBase);
    const rate = contract === 'indefinite' ? .065 : .0655;
    let annual = base * 12 * rate;
    if (monthlyPay > maxBase) {
      const first = Math.min(monthlyPay, 5611.32) - maxBase;
      const second = Math.max(0, Math.min(monthlyPay, 7651.80) - 5611.32);
      const third = Math.max(0, monthlyPay - 7651.80);
      annual += 12 * (Math.max(0, first) * .0019 + second * .0021 + third * .0024);
    }
    return annual;
  };

  const salaryWithholding = data => {
    const {
      gross, socialSecurity, situation, children, childrenUnder3, childShare,
      age, disability, disabledChildren33, disabledChildren65, mobility,
      ascendants65, ascendants75, spousePension, childSupport, mortgage, contract
    } = data;
    const otherExpenses = Math.min(Math.max(0, gross - socialSecurity),
      2000 + (mobility ? 2000 : 0) + (disability === '65' ? 7750 : disability === '33' ? 3500 : 0));
    const rnt = Math.max(0, gross - socialSecurity);
    let reduction = 0;
    if (rnt <= 14852) reduction = 7302;
    else if (rnt <= 17673.52) reduction = 7302 - 1.75 * (rnt - 14852);
    else if (rnt < 19747.50) reduction = 2364.34 - 1.14 * (rnt - 17673.52);
    reduction = Math.max(0, Math.round(reduction * 100) / 100);
    const reducedNet = Math.max(0, rnt - otherExpenses - reduction);
    const base = Math.max(0, reducedNet - spousePension - (children > 2 ? 600 : 0));

    let personalMinimum = 5550;
    if (age >= 65) personalMinimum += 1150;
    if (age >= 75) personalMinimum += 1400;
    if (disability === '33') personalMinimum += 3000;
    if (disability === '65') personalMinimum += 12000;
    const childAmounts = [2400, 2700, 4000];
    let descendantMinimum = 0;
    for (let i = 0; i < children; i++) descendantMinimum += (childAmounts[i] || 4500) * childShare;
    descendantMinimum += childrenUnder3 * 2800 * childShare;
    descendantMinimum += disabledChildren33 * 3000 * childShare + disabledChildren65 * 12000 * childShare;
    const ascendantMinimum = ascendants65 * 1150 + ascendants75 * 2550;
    const familyMinimum = personalMinimum + descendantMinimum + ascendantMinimum;

    const childBand = children > 1 ? 2 : children;
    const thresholds = {
      one: [0, 17644, 18694],
      two: [17197, 18130, 19262],
      three: [15876, 16342, 16867]
    };
    const threshold = thresholds[situation][childBand] || 0;
    if (threshold && gross <= threshold) {
      const exemptRate = contract === 'under-year' ? 2 : 0;
      return { rate: exemptRate, annual: gross * exemptRate / 100, familyMinimum, base };
    }

    const annualities = Math.min(Math.max(0, childSupport), base);
    const quota1 = annualities > 0 && base > annualities
      ? taxScale(base - annualities) + taxScale(annualities)
      : taxScale(base);
    const quota2 = taxScale(familyMinimum + (annualities > 0 && base > annualities ? 1980 : 0));
    let quota = Math.max(0, quota1 - quota2);
    if (gross <= 35200 && threshold) quota = Math.min(quota, Math.max(0, (gross - threshold) * .43));
    if (mortgage && gross < 33007.20) quota = Math.max(0, quota - Math.trunc(gross * .02));
    let rate = gross > 0 ? Math.floor((quota / gross * 100) * 100) / 100 : 0;
    if (contract === 'under-year' && rate < 2) rate = 2;
    return { rate, annual: gross * rate / 100, familyMinimum, base };
  };
  window.NumoraSalary = { socialSecurity: salarySocialSecurity, withholding: salaryWithholding };

  document.querySelectorAll('.calculator').forEach(form => form.addEventListener('submit', e => {
    e.preventDefault();
    const t = form.dataset.calc;

    if (t === 'finiquito') {
      const fd = new FormData(form);
      const s = Math.max(0, num(form, 'salary'));
      const d = Math.max(0, Math.min(31, num(form, 'days')));
      const v = Math.max(0, num(form, 'vacdays'));
      const extras = Math.max(0, Math.round(num(form, 'extras')));
      const extraAmount = Math.max(0, num(form, 'extraAmount'));
      const extraMonths = Math.max(0, Math.min(12, num(form, 'extraMonths')));
      const prorated = fd.get('prorated') === 'yes';
      const day = s / 30;
      const salaryPending = day * d;
      const vacationPending = day * v;
      const extraPending = prorated ? 0 : extraAmount * extras * (extraMonths / 12);
      const total = salaryPending + vacationPending + extraPending;
      output(form, `<div class="big">${fmt(total)}</div><div class="result-grid"><div><small>Salario pendiente</small>${fmt(salaryPending)}</div><div><small>Vacaciones</small>${fmt(vacationPending)}</div><div><small>Pagas extra proporcionales</small>${fmt(extraPending)}</div><div><small>Salario día</small>${fmt(day)}</div></div><p class="microcopy">Estimación bruta. Las pagas extra se estiman suponiendo devengo anual uniforme; revisa convenio, nómina y periodo real de devengo.</p>`);
    }

    if (t === 'despido') {
      const fd = new FormData(form);
      const salary = Math.max(0, num(form, 'salary'));
      const start = new Date(fd.get('start'));
      const end = new Date(fd.get('end'));
      const type = fd.get('type') || 'objective';
      const daySalary = salary / 365;
      if (!salary || isNaN(start) || isNaN(end) || end < start) {
        output(form, '<p>Revisa salario y fechas.</p>');
      } else {
        const yearMs = 365.2425 * 86400000;
        const totalYears = (end - start + 86400000) / yearMs;
        let daysOfComp = 0;
        let cap = 0;
        let detail = '';
        if (type === 'objective') {
          daysOfComp = totalYears * 20;
          cap = salary;
          detail = '20 días por año, con máximo de 12 mensualidades.';
        } else {
          const reform = new Date('2012-02-12T00:00:00');
          if (start < reform) {
            const preEnd = end < reform ? end : reform;
            const preYears = Math.max(0, (preEnd - start) / yearMs);
            const postYears = end > reform ? (end - reform + 86400000) / yearMs : 0;
            const preDays = preYears * 45;
            const postDays = postYears * 33;
            daysOfComp = preDays + postDays;
            const generalCapDays = 720;
            const transitionalCapDays = preDays > generalCapDays ? Math.min(preDays, 1260) : generalCapDays;
            cap = daySalary * transitionalCapDays;
            detail = 'Tramo transitorio: 45 días/año antes del 12/02/2012 y 33 días/año después, con los límites legales.';
          } else {
            daysOfComp = totalYears * 33;
            cap = salary * 2;
            detail = '33 días por año, con máximo de 24 mensualidades.';
          }
        }
        const raw = daySalary * daysOfComp;
        const compensation = Math.min(raw, cap);
        output(form, `<div class="big">${fmt(compensation)}</div><div class="result-grid"><div><small>Salario día</small>${fmt(daySalary)}</div><div><small>Antigüedad aprox.</small>${totalYears.toFixed(2)} años</div><div><small>Indemnización antes de tope</small>${fmt(raw)}</div><div><small>Tope aplicado</small>${fmt(cap)}</div></div><p class="microcopy">${detail} Estimación orientativa: el cálculo jurídico exacto puede prorratear periodos por meses y depender del salario regulador.</p>`);
      }
    }

    if (t === 'paro') {
      const base = Math.max(0, num(form, 'base'));
      const days = Math.max(0, Math.round(num(form, 'days')));
      const child = Math.max(0, Math.min(2, Math.round(num(form, 'children'))));
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
      const minimum = child === 0 ? 560 : 749;
      const maximum = child === 0 ? 1225 : child === 1 ? 1400 : 1575;
      const clampBenefit = value => Math.min(maximum, Math.max(minimum, value));
      const first = m ? clampBenefit(base * .70) : 0;
      const later = m ? clampBenefit(base * .60) : 0;
      output(form, `<div class="big">${m} meses</div><div class="result-grid"><div><small>Primeros 180 días</small>${fmt(first)}</div><div><small>Desde el día 181</small>${fmt(later)}</div><div><small>Mínimo 2026 aplicado</small>${fmt(minimum)}</div><div><small>Máximo 2026 aplicado</small>${fmt(maximum)}</div></div><p class="microcopy">${m ? 'Cuantía bruta orientativa antes de deducciones, aplicando los topes SEPE 2026 según hijos a cargo.' : 'Con menos de 360 días cotizados no se genera esta prestación contributiva; pueden existir otros subsidios.'}</p>`);
    }

    if (t === 'vacaciones') {
      const fd = new FormData(form), a = new Date(fd.get('start')), b = new Date(fd.get('end')), annual = num(form, 'annual'), used = num(form, 'used');
      let worked = 0;
      if (!isNaN(a) && !isNaN(b) && b >= a) worked = Math.ceil((b - a) / 86400000) + 1;
      const gen = worked * annual / 365, p = Math.max(0, gen - used);
      output(form, `<div class="big">${p.toFixed(1)} días</div><div class="result-grid"><div><small>Días trabajados</small>${worked}</div><div><small>Generados</small>${gen.toFixed(1)}</div><div><small>Disfrutados</small>${used}</div></div>`);
    }

    if (t === 'nomina') {
      const fd = new FormData(form);
      const pays = num(form, 'pays') || 12;
      const grossInput = Math.max(0, num(form, 'gross'));
      const grossPeriod = fd.get('grossPeriod') || 'annual';
      const gross = grossPeriod === 'perpay' ? grossInput * pays : grossInput;
      const contract = fd.get('contract') || 'indefinite';
      const civilStatus = fd.get('civilStatus') || 'other';
      const spouseIncome = num(form, 'spouseIncome');
      const children = Math.max(0, Math.round(num(form, 'children')));
      const childrenUnder3 = Math.min(children, Math.max(0, Math.round(num(form, 'childrenUnder3'))));
      const exclusiveChildren = fd.get('exclusiveChildren') === 'yes';
      const situation = civilStatus === 'married' && spouseIncome <= 1500
        ? 'two'
        : civilStatus === 'single' && children > 0 && exclusiveChildren ? 'one' : 'three';
      const commonWithholding = {
        situation,
        children,
        childrenUnder3,
        childShare: fd.get('childShare') === 'full' ? 1 : .5,
        age: Math.max(16, Math.round(num(form, 'age') || 35)),
        disability: fd.get('disability') || 'none',
        disabledChildren33: Math.max(0, Math.round(num(form, 'disabledChildren33'))),
        disabledChildren65: Math.max(0, Math.round(num(form, 'disabledChildren65'))),
        mobility: fd.get('mobility') === 'yes',
        ascendants65: Math.max(0, Math.round(num(form, 'ascendants65'))),
        ascendants75: Math.max(0, Math.round(num(form, 'ascendants75'))),
        spousePension: Math.max(0, num(form, 'spousePension')),
        childSupport: Math.max(0, num(form, 'childSupport')),
        mortgage: fd.get('mortgage') === 'yes',
        contract
      };
      const calculateScenario = annualGross => {
        const ss = salarySocialSecurity(annualGross, contract);
        const wh = salaryWithholding({ gross: annualGross, socialSecurity: ss, ...commonWithholding });
        const manualRate = Math.max(0, Math.min(60, num(form, 'manualIrpf')));
        const useManual = fd.get('irpfMode') === 'manual';
        const rate = useManual ? manualRate : wh.rate;
        const irpf = annualGross * rate / 100;
        const net = Math.max(0, annualGross - ss - irpf);
        return { gross: annualGross, socialSecurity: ss, withholding: wh, irpfRate: rate, irpfAnnual: irpf, netAnnual: net, useManual };
      };
      const current = calculateScenario(gross);
      const { socialSecurity, withholding, irpfRate, irpfAnnual, netAnnual, useManual } = current;
      const averageMonth = netAnnual / 12;
      const payGross = gross / pays, payIrpf = irpfAnnual / pays;
      const ordinaryPay = pays === 14 ? payGross - payIrpf - socialSecurity / 12 : netAnnual / 12;
      const extraPay = pays === 14 ? payGross - payIrpf : 0;
      const ssRate = gross > 0 ? socialSecurity / gross * 100 : 0;
      const deductionRate = gross > 0 ? (socialSecurity + irpfAnnual) / gross * 100 : 0;
      const retainedRate = Math.max(0, 100 - deductionRate);
      const familyLabels = { one: '1: monoparental', two: '2: cónyuge con rentas ≤ 1.500 €', three: '3: otras situaciones' };
      const payCards = pays === 14
        ? `<div><small>Nómina ordinaria aprox.</small>${fmt(ordinaryPay)}</div><div><small>Cada paga extra aprox.</small>${fmt(extraPay)}</div>`
        : `<div><small>Neto por paga</small>${fmt(netAnnual / 12)}</div>`;

      const step = gross < 20000 ? 2500 : 5000;
      const scenarioGrosses = [Math.max(12000, gross - step), gross + step];
      const scenarioCards = scenarioGrosses.map(value => {
        const scenario = calculateScenario(value);
        const perPay = scenario.netAnnual / pays;
        return `<div><small>Con ${fmt(value)} brutos/año</small><strong>${fmt(perPay)} netos/paga</strong><span>${fmt(scenario.netAnnual)} netos/año · IRPF ${scenario.irpfRate.toFixed(2)}%</span></div>`;
      }).join('');

      output(form, `<div class="big">${fmt(averageMonth)} / mes de media</div>
        <div class="result-grid">
          <div><small>Neto anual</small>${fmt(netAnnual)}</div>
          ${payCards}
          <div><small>IRPF (${irpfRate.toFixed(2)}%)</small>${fmt(irpfAnnual)}</div>
          <div><small>Seguridad Social (${ssRate.toFixed(2)}%)</small>${fmt(socialSecurity)}</div>
          <div><small>Bruto anual calculado</small>${fmt(gross)}</div>
          <div><small>Te queda del bruto</small>${retainedRate.toFixed(1)}%</div>
          <div><small>Deducciones totales</small>${deductionRate.toFixed(1)}%</div>
        </div>
        <div class="salary-scenarios"><h3>Si negociaras otro bruto</h3><p>Misma situación personal, contrato y número de pagas.</p><div class="salary-scenario-grid">${scenarioCards}</div></div>
        <p class="microcopy">Situación AEAT aplicada: ${familyLabels[situation]}. ${grossPeriod === 'perpay' ? `El bruto introducido se ha anualizado multiplicándolo por ${pays} pagas. ` : ''}${useManual ? 'Se ha usado el IRPF manual indicado.' : 'IRPF estimado con el algoritmo general de retenciones 2026.'} Las nóminas reales pueden variar por convenio, conceptos no cotizables, retribución irregular, regularizaciones o circunstancias especiales.</p>`);
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
      const fd = new FormData(form);
      const s = Math.max(0, num(form, 'salary'));
      const d = Math.max(0, Math.min(31, num(form, 'days')));
      const v = Math.max(0, num(form, 'vacdays'));
      const req = Math.max(0, num(form, 'required'));
      const given = Math.max(0, num(form, 'given'));
      const extras = Math.max(0, Math.round(num(form, 'extras')));
      const extraAmount = Math.max(0, num(form, 'extraAmount'));
      const extraMonths = Math.max(0, Math.min(12, num(form, 'extraMonths')));
      const prorated = fd.get('prorated') === 'yes';
      const day = s / 30;
      const salaryPending = day * d;
      const vacationPending = day * v;
      const extraPending = prorated ? 0 : extraAmount * extras * (extraMonths / 12);
      const discount = day * Math.max(0, req - given);
      const total = salaryPending + vacationPending + extraPending - discount;
      output(form, `<div class="big">${fmt(total)}</div><div class="result-grid"><div><small>Salario pendiente</small>${fmt(salaryPending)}</div><div><small>Vacaciones</small>${fmt(vacationPending)}</div><div><small>Pagas extra proporcionales</small>${fmt(extraPending)}</div><div><small>Descuento preaviso</small>${fmt(discount)}</div></div><p class="microcopy">Estimación bruta. La baja voluntaria normalmente no genera indemnización. El descuento por preaviso solo procede si existe obligación aplicable.</p>`);
    }

    if (t === 'salariohora') {
      const sal = num(form, 'salary'), period = new FormData(form).get('period'), w = num(form, 'weekly'), p = num(form, 'pays') || 12, annual = period === 'annual' ? sal : sal * p, hours = w * 52, hour = hours ? annual / hours : 0;
      output(form, `<div class="big">${fmt(hour)} / hora</div><div class="result-grid"><div><small>Salario anual</small>${fmt(annual)}</div><div><small>Salario mensual medio</small>${fmt(annual / 12)}</div><div><small>Horas/año</small>${hours.toFixed(0)}</div></div>`);
    }

    if (t === 'pagasextra') {
      const sal = num(form, 'salary'), extras = num(form, 'extras'), months = num(form, 'months'), pro = new FormData(form).get('prorated'), prop = sal * Math.min(months, 12) / 12, month = (sal * extras) / 12;
      output(form, `<div class="big">${fmt(pro === 'yes' ? month : prop)}</div><div class="result-grid"><div><small>Paga completa</small>${fmt(sal)}</div><div><small>Proporcional</small>${fmt(prop)}</div><div><small>Prorrata mensual</small>${fmt(month)}</div></div>`);
    }

    if (t === 'interescompuesto') {
      const fd = new FormData(form);
      const initial = Math.max(0, num(form, 'initial'));
      const contribution = Math.max(0, num(form, 'contribution'));
      const frequency = parseInt(fd.get('frequency') || '12', 10);
      const compound = parseInt(fd.get('compound') || '12', 10);
      const annualRate = num(form, 'rate') / 100;
      const years = Math.max(1, Math.min(60, Math.round(num(form, 'years'))));
      const months = years * 12;
      const monthlyRate = Math.pow(1 + annualRate / compound, compound / 12) - 1;
      const contributionEveryMonths = Math.max(1, Math.round(12 / frequency));
      let balance = initial;
      let contributed = initial;
      const yearly = [];
      for (let month = 1; month <= months; month++) {
        balance *= (1 + monthlyRate);
        if (month % contributionEveryMonths === 0) {
          balance += contribution;
          contributed += contribution;
        }
        if (month % 12 === 0) {
          yearly.push({ year: month / 12, balance, contributed });
        }
      }
      const interest = balance - contributed;
      const maxBalance = Math.max(...yearly.map(y => y.balance), 1);
      const bars = yearly.slice(-10).map(y => `<div class="growth-bar-row"><span>Año ${y.year}</span><div class="growth-bar"><i style="width:${Math.max(3, y.balance / maxBalance * 100).toFixed(1)}%"></i></div><strong>${fmt(y.balance)}</strong></div>`).join('');
      const table = yearly.map(y => `<tr><td>${y.year}</td><td>${fmt(y.contributed)}</td><td>${fmt(y.balance - y.contributed)}</td><td>${fmt(y.balance)}</td></tr>`).join('');
      output(form, `<div class="big">${fmt(balance)}</div><div class="result-grid"><div><small>Capital aportado</small>${fmt(contributed)}</div><div><small>Intereses estimados</small>${fmt(interest)}</div><div><small>Plazo</small>${years} años</div></div><div class="growth-bars">${bars}</div><details class="result-table"><summary>Ver tabla año a año</summary><div class="table-wrap"><table><thead><tr><th>Año</th><th>Aportado</th><th>Intereses</th><th>Valor final</th></tr></thead><tbody>${table}</tbody></table></div></details><p class="microcopy">Simulación bruta y orientativa. No incluye impuestos, comisiones, inflación ni variaciones reales de mercado.</p>`);
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

    if (t === 'hogaragua') {
      const people = Math.max(1, Math.round(num(form, 'people'))), litres = Math.max(0, num(form, 'litres'));
      const days = Math.max(1, num(form, 'days')), price = Math.max(0, num(form, 'price')), fixed = Math.max(0, num(form, 'fixed'));
      const cubicMetres = people * litres * days / 1000, monthlyCost = cubicMetres * price + fixed;
      output(form, `<div class="big">${fmt(monthlyCost)} / mes</div><div class="result-grid"><div><small>Consumo mensual</small>${cubicMetres.toFixed(2)} m³</div><div><small>Consumo anual</small>${(cubicMetres * 12).toFixed(2)} m³</div><div><small>Coste variable</small>${fmt(cubicMetres * price)}</div><div><small>Cuota fija</small>${fmt(fixed)}</div><div><small>Coste anual</small>${fmt(monthlyCost * 12)}</div><div><small>Personas</small>${people}</div></div><p class="microcopy">Estimación basada en el consumo indicado. La factura real puede incluir bloques, cánones, saneamiento, impuestos y mínimos de consumo.</p>`);
    }

    if (t === 'hogarcalefaccion') {
      const power = Math.max(0, num(form, 'power')), hours = Math.max(0, num(form, 'hours')), days = Math.max(0, num(form, 'days'));
      const price = Math.max(0, num(form, 'price')), load = Math.max(0, Math.min(100, num(form, 'load'))) / 100;
      const monthlyKwh = power * hours * days * load, monthlyCost = monthlyKwh * price;
      output(form, `<div class="big">${fmt(monthlyCost)} / mes</div><div class="result-grid"><div><small>Consumo mensual</small>${monthlyKwh.toFixed(2)} kWh</div><div><small>Coste diario</small>${fmt(days ? monthlyCost / days : 0)}</div><div><small>Coste mensual</small>${fmt(monthlyCost)}</div><div><small>Horas de uso</small>${(hours * days).toFixed(1)} h</div><div><small>Factor de funcionamiento</small>${(load * 100).toFixed(0)}%</div><div><small>Coste 5 meses</small>${fmt(monthlyCost * 5)}</div></div><p class="microcopy">No incluye cuotas fijas, impuestos ni pérdidas que no estén reflejadas en el factor de funcionamiento.</p>`);
    }

    if (t === 'hogarstandby') {
      const watts = Math.max(0, num(form, 'watts')), devices = Math.max(1, Math.round(num(form, 'devices')));
      const hours = Math.max(0, Math.min(24, num(form, 'hours'))), price = Math.max(0, num(form, 'price'));
      const yearlyKwh = watts * devices / 1000 * hours * 365, yearlyCost = yearlyKwh * price;
      output(form, `<div class="big">${fmt(yearlyCost)} / año</div><div class="result-grid"><div><small>Consumo diario</small>${(yearlyKwh / 365).toFixed(3)} kWh</div><div><small>Consumo mensual</small>${(yearlyKwh / 12).toFixed(2)} kWh</div><div><small>Consumo anual</small>${yearlyKwh.toFixed(2)} kWh</div><div><small>Coste mensual</small>${fmt(yearlyCost / 12)}</div><div><small>Coste anual</small>${fmt(yearlyCost)}</div><div><small>Aparatos</small>${devices}</div></div><p class="microcopy">Para mejorar la estimación, utiliza la potencia en espera indicada por el fabricante o medida con un medidor de consumo.</p>`);
    }

    if (t === 'hogarpintura') {
      const perimeter = Math.max(0, num(form, 'perimeter')), height = Math.max(0, num(form, 'height'));
      const openings = Math.max(0, num(form, 'openings')), coats = Math.max(1, Math.round(num(form, 'coats')));
      const coverage = Math.max(.1, num(form, 'coverage')), waste = Math.max(0, num(form, 'waste')) / 100;
      const price = Math.max(0, num(form, 'price')), area = Math.max(0, perimeter * height - openings);
      const litres = area * coats / coverage * (1 + waste), cost = litres * price;
      output(form, `<div class="big">${litres.toFixed(2)} litros</div><div class="result-grid"><div><small>Superficie neta</small>${area.toFixed(2)} m²</div><div><small>Manos</small>${coats}</div><div><small>Rendimiento</small>${coverage.toFixed(1)} m²/L</div><div><small>Margen extra</small>${(waste * 100).toFixed(0)}%</div><div><small>Coste estimado</small>${fmt(cost)}</div><div><small>Litros redondeados</small>${Math.ceil(litres)} L</div></div><p class="microcopy">La absorción de la pared, el color anterior, la técnica y el producto pueden modificar el rendimiento real.</p>`);
    }

    if (t === 'hogarsuelo') {
      const length = Math.max(0, num(form, 'length')), width = Math.max(0, num(form, 'width'));
      const tileWidth = Math.max(.1, num(form, 'tileWidth')) / 100, tileHeight = Math.max(.1, num(form, 'tileHeight')) / 100;
      const waste = Math.max(0, num(form, 'waste')) / 100, perBox = Math.max(1, Math.round(num(form, 'perBox'))), boxPrice = Math.max(0, num(form, 'boxPrice'));
      const area = length * width, purchaseArea = area * (1 + waste), tileArea = tileWidth * tileHeight;
      const tiles = Math.ceil(purchaseArea / tileArea), boxes = Math.ceil(tiles / perBox), boughtTiles = boxes * perBox;
      output(form, `<div class="big">${boxes} cajas</div><div class="result-grid"><div><small>Superficie</small>${area.toFixed(2)} m²</div><div><small>Con margen</small>${purchaseArea.toFixed(2)} m²</div><div><small>Piezas necesarias</small>${tiles}</div><div><small>Piezas compradas</small>${boughtTiles}</div><div><small>Sobrantes estimadas</small>${Math.max(0, boughtTiles - tiles)}</div><div><small>Coste estimado</small>${fmt(boxes * boxPrice)}</div></div><p class="microcopy">Comprueba que todas las cajas correspondan al mismo lote. Los cortes complejos o la colocación diagonal pueden exigir más margen.</p>`);
    }

    if (t === 'hogarac') {
      const power = Math.max(0, num(form, 'power')), hours = Math.max(0, num(form, 'hours')), days = Math.max(0, num(form, 'days'));
      const months = Math.max(1, Math.min(12, Math.round(num(form, 'months')))), price = Math.max(0, num(form, 'price'));
      const load = Math.max(0, Math.min(100, num(form, 'load'))) / 100, monthlyKwh = power * hours * days * load;
      const monthlyCost = monthlyKwh * price, seasonCost = monthlyCost * months;
      output(form, `<div class="big">${fmt(monthlyCost)} / mes</div><div class="result-grid"><div><small>Consumo mensual</small>${monthlyKwh.toFixed(2)} kWh</div><div><small>Coste diario</small>${fmt(days ? monthlyCost / days : 0)}</div><div><small>Coste mensual</small>${fmt(monthlyCost)}</div><div><small>Meses de uso</small>${months}</div><div><small>Consumo temporada</small>${(monthlyKwh * months).toFixed(2)} kWh</div><div><small>Coste temporada</small>${fmt(seasonCost)}</div></div><p class="microcopy">Usa la potencia eléctrica absorbida, no la potencia frigorífica. Los equipos inverter no consumen continuamente al máximo.</p>`);
    }

    if (t === 'hogarcomparador') {
      const fd = new FormData(form), years = Math.max(1, Math.round(num(form, 'years'))), hours = Math.max(0, num(form, 'hours'));
      const days = Math.max(0, Math.min(365, num(form, 'days'))), energyPrice = Math.max(0, num(form, 'energyPrice'));
      const purchaseA = Math.max(0, num(form, 'purchaseA')), wattsA = Math.max(0, num(form, 'wattsA'));
      const purchaseB = Math.max(0, num(form, 'purchaseB')), wattsB = Math.max(0, num(form, 'wattsB'));
      const energyA = wattsA / 1000 * hours * days * years * energyPrice, energyB = wattsB / 1000 * hours * days * years * energyPrice;
      const totalA = purchaseA + energyA, totalB = purchaseB + energyB, winner = totalA <= totalB ? (fd.get('nameA') || 'Opción A') : (fd.get('nameB') || 'Opción B');
      const saving = Math.abs(totalA - totalB);
      output(form, `<div class="big">Conviene ${winner}</div><div class="result-grid"><div><small>Total opción A</small>${fmt(totalA)}</div><div><small>Energía opción A</small>${fmt(energyA)}</div><div><small>Total opción B</small>${fmt(totalB)}</div><div><small>Energía opción B</small>${fmt(energyB)}</div><div><small>Diferencia</small>${fmt(saving)}</div><div><small>Periodo comparado</small>${years} años</div></div><p class="microcopy">Compara compra y electricidad. No incluye mantenimiento, reparaciones, financiación, vida útil ni cambios futuros del precio energético.</p>`);
    }

    if (t === 'consumodescuento') {
      const price = Math.max(0, num(form, 'price')), first = Math.max(0, Math.min(100, num(form, 'first'))) / 100;
      const second = Math.max(0, Math.min(100, num(form, 'second'))) / 100, units = Math.max(1, Math.round(num(form, 'units')));
      const unitFinal = price * (1 - first) * (1 - second), total = unitFinal * units, saving = (price - unitFinal) * units;
      const effective = price ? (1 - unitFinal / price) * 100 : 0;
      output(form, `<div class="big">${fmt(total)}</div><div class="result-grid"><div><small>Precio final por unidad</small>${fmt(unitFinal)}</div><div><small>Ahorro total</small>${fmt(saving)}</div><div><small>Descuento efectivo</small>${effective.toLocaleString('es-ES', { maximumFractionDigits: 2 })}%</div><div><small>Precio original total</small>${fmt(price * units)}</div><div><small>Unidades</small>${units}</div><div><small>Segundo descuento</small>${(second * 100).toLocaleString('es-ES', { maximumFractionDigits: 2 })}%</div></div><p class="microcopy">Los descuentos sucesivos se aplican uno después del otro; no se suman directamente.</p>`);
    }

    if (t === 'consumoiva') {
      const fd = new FormData(form), amount = Math.max(0, num(form, 'amount')), rate = Math.max(0, num(form, 'rate')) / 100;
      const mode = fd.get('mode') || 'add';
      const base = mode === 'add' ? amount : amount / (1 + rate), total = mode === 'add' ? amount * (1 + rate) : amount, tax = total - base;
      output(form, `<div class="big">${mode === 'add' ? fmt(total) : fmt(base)}</div><div class="result-grid"><div><small>Base sin IVA</small>${fmt(base)}</div><div><small>IVA</small>${fmt(tax)}</div><div><small>Total con IVA</small>${fmt(total)}</div><div><small>Tipo aplicado</small>${(rate * 100).toLocaleString('es-ES', { maximumFractionDigits: 2 })}%</div></div><p class="microcopy">Cálculo matemático orientativo. Comprueba el tipo aplicable al producto o servicio concreto.</p>`);
    }

    if (t === 'consumovariacion') {
      const oldValue = num(form, 'oldValue'), newValue = num(form, 'newValue'), difference = newValue - oldValue;
      const calculable = oldValue !== 0;
      const percent = calculable ? difference / Math.abs(oldValue) * 100 : null;
      const direction = difference > 0 ? 'Subida' : difference < 0 ? 'Bajada' : 'Sin variación';
      const percentLabel = calculable ? `${Math.abs(percent).toLocaleString('es-ES', { maximumFractionDigits: 2 })}%` : 'no calculable';
      const relativeLabel = calculable ? `${percent.toLocaleString('es-ES', { maximumFractionDigits: 2 })}%` : 'No calculable desde 0';
      output(form, `<div class="big">${direction}: ${percentLabel}</div><div class="result-grid"><div><small>Valor anterior</small>${fmt(oldValue)}</div><div><small>Valor nuevo</small>${fmt(newValue)}</div><div><small>Diferencia</small>${fmt(difference)}</div><div><small>Variación relativa</small>${relativeLabel}</div></div><p class="microcopy">${calculable ? 'La variación porcentual compara el cambio con el valor inicial.' : 'No existe una variación porcentual finita cuando el valor inicial es cero.'}</p>`);
    }

    if (t === 'consumooferta') {
      const price = Math.max(0, num(form, 'price')), needed = Math.max(1, Math.round(num(form, 'needed')));
      const take = Math.max(1, Math.round(num(form, 'take'))), pay = Math.max(0, Math.min(take, Math.round(num(form, 'pay'))));
      const discount = Math.max(0, Math.min(100, num(form, 'discount'))) / 100;
      const fullPacks = Math.floor(needed / take), remainder = needed % take;
      const offerCost = (fullPacks * pay + remainder) * price, discountCost = needed * price * (1 - discount);
      const winner = offerCost < discountCost ? `Lleva ${take} y paga ${pay}` : discountCost < offerCost ? `Descuento del ${(discount * 100).toFixed(0)}%` : 'Ambas ofertas';
      output(form, `<div class="big">Conviene: ${winner}</div><div class="result-grid"><div><small>Oferta por unidades</small>${fmt(offerCost)}</div><div><small>Oferta por descuento</small>${fmt(discountCost)}</div><div><small>Diferencia</small>${fmt(Math.abs(offerCost - discountCost))}</div><div><small>Unidades necesarias</small>${needed}</div><div><small>Sin oferta</small>${fmt(needed * price)}</div><div><small>Packs completos</small>${fullPacks}</div></div><p class="microcopy">El cálculo supone que las unidades restantes fuera de los packs se pagan a precio normal.</p>`);
    }

    if (t === 'consumocosteuso') {
      const purchase = Math.max(0, num(form, 'purchase')), annual = Math.max(0, num(form, 'annual'));
      const usesMonth = Math.max(0, num(form, 'usesMonth')), years = Math.max(1, num(form, 'years')), resale = Math.max(0, num(form, 'resale'));
      const totalUses = usesMonth * 12 * years, totalCost = Math.max(0, purchase + annual * years - resale), perUse = totalUses ? totalCost / totalUses : 0;
      output(form, `<div class="big">${fmt(perUse)} / uso</div><div class="result-grid"><div><small>Coste total</small>${fmt(totalCost)}</div><div><small>Usos totales</small>${totalUses.toFixed(0)}</div><div><small>Compra</small>${fmt(purchase)}</div><div><small>Mantenimiento</small>${fmt(annual * years)}</div><div><small>Valor de reventa</small>${fmt(resale)}</div><div><small>Coste mensual medio</small>${fmt(totalCost / (years * 12))}</div></div><p class="microcopy">No incluye inflación, financiación ni costes imprevistos que no hayas incorporado al mantenimiento.</p>`);
    }

    if (t === 'consumosuscripcion') {
      const monthly = Math.max(0, num(form, 'monthly')), annual = Math.max(0, num(form, 'annual'));
      const setup = Math.max(0, num(form, 'setup')), months = Math.max(1, Math.round(num(form, 'months'))), users = Math.max(1, Math.round(num(form, 'users')));
      const monthlyTotal = monthly * months + setup, annualCycles = Math.ceil(months / 12), annualTotal = annual * annualCycles + setup;
      const winner = monthlyTotal <= annualTotal ? 'Plan mensual' : 'Plan anual', best = Math.min(monthlyTotal, annualTotal);
      output(form, `<div class="big">Conviene ${winner}</div><div class="result-grid"><div><small>Plan mensual</small>${fmt(monthlyTotal)}</div><div><small>Plan anual</small>${fmt(annualTotal)}</div><div><small>Ahorro</small>${fmt(Math.abs(monthlyTotal - annualTotal))}</div><div><small>Coste por usuario/mes</small>${fmt(best / months / users)}</div><div><small>Periodo</small>${months} meses</div><div><small>Usuarios</small>${users}</div></div><p class="microcopy">El plan anual se cobra por ciclos completos; revisa cancelación, renovación y posibles impuestos antes de contratar.</p>`);
    }

    if (t === 'consumoviaje') {
      const distance = Math.max(0, num(form, 'distance')), consumption = Math.max(0, num(form, 'consumption'));
      const fuelPrice = Math.max(0, num(form, 'fuelPrice')), tolls = Math.max(0, num(form, 'tolls')), people = Math.max(1, Math.round(num(form, 'people')));
      const litres = distance * consumption / 100, fuelCost = litres * fuelPrice, total = fuelCost + tolls;
      output(form, `<div class="big">${fmt(total)} en total</div><div class="result-grid"><div><small>Combustible</small>${fmt(fuelCost)}</div><div><small>Litros estimados</small>${litres.toFixed(2)} L</div><div><small>Peajes y extras</small>${fmt(tolls)}</div><div><small>Coste por persona</small>${fmt(total / people)}</div><div><small>Coste por 100 km</small>${fmt(distance ? total / distance * 100 : 0)}</div><div><small>Distancia</small>${distance.toFixed(1)} km</div></div><p class="microcopy">Usa la distancia total, incluida la vuelta. El consumo real cambia con tráfico, carga, velocidad, clima y estilo de conducción.</p>`);
    }
  }));

  const poolForm = document.getElementById('pool-form');
  if (poolForm) {
    const poolResult = document.getElementById('pool-result');
    const lengthField = document.getElementById('length-field');
    const widthField = document.getElementById('width-field');
    const diameterField = document.getElementById('diameter-field');
    const poolNumber = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
    const calculatePool = e => {
      if (e) e.preventDefault();
      const data = new FormData(poolForm);
      const shape = data.get('shape');
      const depth = Number(data.get('depth'));
      const price = Number(data.get('price'));
      let volume = 0;
      if (shape === 'round') {
        const diameter = Number(data.get('diameter'));
        volume = Math.PI * Math.pow(diameter / 2, 2) * depth;
      } else {
        const length = Number(data.get('length'));
        const width = Number(data.get('width'));
        volume = length * width * depth * (shape === 'oval' ? 0.785 : 1);
      }
      poolResult.classList.add('show');
      if (!(volume > 0) || price < 0) {
        poolResult.innerHTML = '<p>Revisa los datos.</p>';
        return;
      }
      poolResult.innerHTML = `<h3>Resultado</h3><p><strong>Volumen:</strong> ${poolNumber.format(volume)} m³</p><p><strong>Capacidad:</strong> ${Math.round(volume * 1000).toLocaleString('es-ES')} L</p><p><strong>Coste de agua estimado:</strong> ${fmt(volume * price)}</p>`;
    };
    const updatePoolShape = () => {
      const round = new FormData(poolForm).get('shape') === 'round';
      lengthField.hidden = round;
      widthField.hidden = round;
      diameterField.hidden = !round;
      calculatePool();
    };
    poolForm.addEventListener('submit', calculatePool);
    poolForm.elements.namedItem('shape').addEventListener('change', updatePoolShape);
    updatePoolShape();
  }

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
          analytics_storage: ok ? 'granted' : 'denied'
        });
      }
      hide();
    }));
  }
});
