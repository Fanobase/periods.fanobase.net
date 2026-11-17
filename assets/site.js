/* Buildless progressive enhancement; coefficients remain exact strings. */
(() => {
  'use strict';
  const status = document.getElementById('copy-status');
  let toastTimer;
  function toast(text) {
    status.textContent = text;
    status.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { status.hidden = true; }, 2200);
  }
  async function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const input = document.createElement('textarea');
        input.value = text;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.append(input);
        input.select();
        const ok = document.execCommand('copy');
        input.remove();
        if (!ok) throw new Error('Clipboard unavailable');
      }
      toast('Copied to clipboard');
    } catch { toast('Clipboard unavailable. Select the sequence to copy it.'); }
  }
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', () => copy(button.dataset.copy)));
  document.querySelectorAll('[data-copy-target]').forEach(button => button.addEventListener('click', () => {
    const values = JSON.parse(document.getElementById(button.dataset.copyTarget).textContent);
    copy('[' + values.join(', ') + ']');
  }));
  if (window.renderMathInElement) {
    const macros = {
      '\\PP': '\\mathbb{P}', '\\Gr': '\\operatorname{Gr}', '\\cO': '\\mathcal{O}',
      '\\cE': '\\mathcal{E}', '\\CC': '\\mathbb{C}', '\\QQ': '\\mathbb{Q}',
      '\\MW': '\\operatorname{MW}(#1,#2)', '\\FI': '\\operatorname{FI}(#1,#2)',
      '\\wedge': '\\bigwedge', '\\Bl': '\\operatorname{Bl}'
    };
    document.querySelectorAll('.math-prose').forEach(element => renderMathInElement(element, {
      delimiters: [{left: '$', right: '$', display: false}], macros, throwOnError: false, strict: false
    }));
  }
  document.querySelectorAll('[data-copy-label-period]').forEach(button => button.addEventListener('click', () => {
    const values = JSON.parse(document.getElementById(button.dataset.copyLabelPeriod).textContent);
    const terms = button.dataset.terms ? Number(button.dataset.terms) : values.length;
    copy(button.dataset.label + ': [' + values.slice(0, terms).join(', ') + ']');
  }));
  document.querySelectorAll('[data-copy-link]').forEach(button => button.addEventListener('click', () => copy(location.href.split('#')[0])));
  const root = document.querySelector('[data-catalogue]');
  if (!root) return;
  const search = document.getElementById('period-search');
  const coefficientSearch = document.getElementById('coefficient-search');
  const sourceFilters = [...document.querySelectorAll('.source-filters input[name="source"]')];
  const excludedSourceFilters = [...document.querySelectorAll('.source-filters input[name="exclude"]')];
  const datasetFilter = document.getElementById('dataset-filter');
  const sourceMatch = document.getElementById('source-match');
  const proofFilter = document.getElementById('proof-filter');
  const cy3Filter = document.getElementById('cy3-filter');
  const tbody = document.querySelector('#period-table tbody');
  const rows = [...tbody.querySelectorAll('.period-row')].map((node, index) => ({
    node, index, title: node.dataset.title, id: node.dataset.id,
    names: node.dataset.names.toLowerCase(), origin: node.dataset.origin,
    sources: node.dataset.sources.split(' '), proof: node.dataset.proof === 'true',
    cy3: node.dataset.cy3, cy3Names: node.dataset.cy3Names,
    filterSources: node.dataset.filterSources.split(' '),
    prefix: node.dataset.prefix.split(','), terms: Number(node.dataset.terms), href: node.querySelector('a').href
  }));
  const count = document.getElementById('result-count');
  const empty = document.getElementById('no-results');
  let sort = null, descending = false, filtered = [];
  const parameters = new URLSearchParams(location.search);
  search.value = parameters.get('q') || '';
  const groups = {legacy: 'type-a'};
  if ([...datasetFilter.options].some(option => option.value === parameters.get('dataset'))) datasetFilter.value = parameters.get('dataset');
  for (const [name, inputs] of [['source', sourceFilters], ['exclude', excludedSourceFilters]]) {
    const selected = new Set(parameters.getAll(name).flatMap(value => value.split(',')).map(key => groups[key] || key));
    inputs.forEach(input => { input.checked = selected.has(input.value); });
  }
  if (parameters.get('match') === 'all') sourceMatch.value = 'all';
  coefficientSearch.value = parameters.get('coefficients') || '';
  proofFilter.checked = parameters.get('operator') === 'exact';
  if ([...cy3Filter.options].some(option => option.value === parameters.get('cy3'))) cy3Filter.value = parameters.get('cy3');
  if (sourceFilters.some(input => input.checked) || excludedSourceFilters.some(input => input.checked) || proofFilter.checked || cy3Filter.value !== 'any') document.querySelector('.advanced-filters').open = true;
  function normalizedPrefix(text) {
    const cleaned = text.trim().replace(/^\[/, '').replace(/\]$/, '').trim();
    if (!cleaned) return [];
    const pieces = cleaned.split(/[\s,;]+/).filter(Boolean);
    if (pieces.length > 20 || pieces.some(value => !/^\+?\d+$/.test(value))) return null;
    return pieces.map(value => BigInt(value).toString());
  }
  function updateURL() {
    const url = new URL(location.href);
    url.search = '';
    if (datasetFilter.value) url.searchParams.set('dataset', datasetFilter.value);
    if (search.value.trim()) url.searchParams.set('q', search.value.trim());
    sourceFilters.filter(input => input.checked).forEach(input => url.searchParams.append('source', input.value));
    excludedSourceFilters.filter(input => input.checked).forEach(input => url.searchParams.append('exclude', input.value));
    if (sourceMatch.value === 'all') url.searchParams.set('match', 'all');
    if (coefficientSearch.value.trim()) url.searchParams.set('coefficients', coefficientSearch.value.trim());
    if (proofFilter.checked) url.searchParams.set('operator', 'exact');
    if (cy3Filter.value !== 'any') url.searchParams.set('cy3', cy3Filter.value);
    history.replaceState(null, '', url);
  }
  function apply() {
    const query = search.value.trim().toLowerCase();
    const cy3Reference = /^(aesz\s*\(?\d+\)?|cydb\s*\d+\.\d+)$/.test(query)
      ? query.replace(/[\s()]/g, '') : null;
    const prefix = normalizedPrefix(coefficientSearch.value);
    const selectedSources = sourceFilters.filter(input => input.checked).map(input => input.value);
    const excludedSources = excludedSourceFilters.filter(input => input.checked).map(input => input.value);
    coefficientSearch.setCustomValidity(prefix === null ? 'Enter up to 20 nonnegative integer coefficients, separated by commas or spaces.' : '');
    coefficientSearch.setAttribute('aria-invalid', String(prefix === null));
    filtered = rows.filter(row => {
      const identifier = row.id.toLowerCase();
      const matchesId = identifier.slice(4).includes(query) || (query.startsWith('qp4-') && identifier.includes(query));
      const matchesCY3 = cy3Reference
        ? row.cy3Names.toLowerCase().split('; ').some(label => label.replace(/[\s()]/g, '') === cy3Reference)
        : row.cy3Names.toLowerCase().includes(query);
      if (query && !row.names.includes(query) && !matchesCY3 && !matchesId) return false;
      if (datasetFilter.value && !row.filterSources.includes(datasetFilter.value)) return false;
      if (excludedSources.some(source => row.filterSources.includes(source))) return false;
      if (selectedSources.length && !(sourceMatch.value === 'all'
          ? selectedSources.every(source => row.filterSources.includes(source))
          : selectedSources.some(source => row.filterSources.includes(source)))) return false;
      if (proofFilter.checked && !row.proof) return false;
      if (cy3Filter.value === 'matched' && !['operator_identity', 'coefficient_match'].includes(row.cy3)) return false;
      if (!['any', 'matched'].includes(cy3Filter.value) && row.cy3 !== cy3Filter.value) return false;
      if (prefix === null || prefix.some((value, i) => row.prefix[i] !== value)) return false;
      return true;
    });
    if (sort) filtered.sort((a, b) => {
      let comparison;
      if (sort === 'title') comparison = a.title.localeCompare(b.title, undefined, {numeric: true});
      else {
        const i = Number(sort.slice(1));
        if (a.prefix[i] === undefined || b.prefix[i] === undefined) {
          if (a.prefix[i] === b.prefix[i]) return a.index - b.index;
          return a.prefix[i] === undefined ? 1 : -1;
        }
        const left = BigInt(a.prefix[i]), right = BigInt(b.prefix[i]);
        comparison = left < right ? -1 : left > right ? 1 : 0;
      }
      return (descending ? -comparison : comparison) || a.index - b.index;
    });
    const visible = new Set(filtered);
    rows.forEach(row => { row.node.hidden = !visible.has(row); });
    if (sort) {
      const fragment = document.createDocumentFragment();
      filtered.forEach(row => fragment.append(row.node));
      tbody.append(fragment);
    }
    count.textContent = `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()} period groups`;
    empty.hidden = filtered.length !== 0;
    updateURL();
  }
  function reset() {
    datasetFilter.value = ''; search.value = ''; coefficientSearch.value = ''; proofFilter.checked = false; cy3Filter.value = 'any';
    clearSources();
    apply();
  }
  function clearSources() {
    [...sourceFilters, ...excludedSourceFilters].forEach(input => { input.checked = false; });
    sourceMatch.value = 'any';
  }
  [search, coefficientSearch].forEach(input => input.addEventListener('input', () => apply()));
  [datasetFilter, proofFilter, sourceMatch, cy3Filter].forEach(input => input.addEventListener('change', apply));
  [...sourceFilters, ...excludedSourceFilters].forEach(input => input.addEventListener('change', () => {
    if (input.checked) {
      const opposite = input.name === 'source' ? excludedSourceFilters : sourceFilters;
      opposite.find(other => other.value === input.value).checked = false;
    }
    apply();
  }));
  document.getElementById('clear-source-filters').addEventListener('click', () => {
    clearSources();
    apply();
  });
  document.getElementById('reset-filters').addEventListener('click', reset);
  document.querySelectorAll('[data-reset]').forEach(button => button.addEventListener('click', reset));
  document.querySelectorAll('[data-sort]').forEach(button => button.addEventListener('click', () => {
    if (sort === button.dataset.sort) descending = !descending;
    else { sort = button.dataset.sort; descending = false; }
    document.querySelectorAll('[data-sort]').forEach(other => {
      other.parentElement.removeAttribute('aria-sort');
      other.querySelector('span').textContent = '↕';
    });
    button.parentElement.setAttribute('aria-sort', descending ? 'descending' : 'ascending');
    button.querySelector('span').textContent = descending ? '↓' : '↑';
    apply();
  }));
  document.getElementById('copy-search-link').addEventListener('click', () => copy(location.href));
  document.getElementById('export-results').addEventListener('click', () => {
    const escape = value => '"' + String(value).replaceAll('"', '""') + '"';
    const lines = [['period_id', 'name', 'status', 'sources', 'available_coefficients', 'page', 'cy3_status', 'cy3_references', ...Array.from({length:20}, (_,i) => `c${i}`)]];
    filtered.forEach(row => lines.push([row.id, row.title, row.origin, row.sources.join('; '), row.terms, row.href, row.cy3, row.cy3Names, ...row.prefix]));
    const blob = new Blob(['\uFEFF' + lines.map(line => line.map(escape).join(',')).join('\r\n')], {type:'text/csv;charset=utf-8'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = 'quantum-periods-filtered.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });
  apply();
})();
