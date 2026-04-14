import * as echarts from 'echarts';
import fireJsRaw from '../out/fire.js?raw';
import fireHtmlRaw from '../out/fire.html?raw';

/**
 * 从 out/fire.js 截取 analysisModule，为 DOM id 加 fire- 前缀，避免与其它分析弹窗冲突。
 */
function patchFireAnalysisSource(src) {
  let code = src.replace(/\r\n/g, '\n');

  const pairs = [
    ["getElementById('analysis-modal')", "getElementById('fire-analysis-modal')"],
    ["getElementById('an-start')", "getElementById('fire-an-start')"],
    ["getElementById('an-end')", "getElementById('fire-an-end')"],
    ["getElementById('an-region-dropdown')", "getElementById('fire-an-region-dropdown')"],
    ["getElementById('an-point-dropdown')", "getElementById('fire-an-point-dropdown')"],
    ["getElementById('an-region-label')", "getElementById('fire-an-region-label')"],
    ["getElementById('an-point-input')", "getElementById('fire-an-point-input')"],
    ["getElementById('combustion-chart-main')", "getElementById('fire-combustion-chart-main')"],
    ["getElementById('vector-chart-main')", "getElementById('fire-vector-chart-main')"],
    ["getElementById('traj-freq')", "getElementById('fire-traj-freq')"],
    ["getElementById('metric-select-btn')", "getElementById('fire-metric-select-btn')"],
    ["getElementById('metric-items-container')", "getElementById('fire-metric-items-container')"],
    ["getElementById('metric-btn-label')", "getElementById('fire-metric-btn-label')"],
    ["getElementById('an-table-freq')", "getElementById('fire-an-table-freq')"],
    ["getElementById('full-table-head')", "getElementById('fire-full-table-head')"],
    ["getElementById('full-table-body')", "getElementById('fire-full-table-body')"],
    ["getElementById('export-metric-list')", "getElementById('fire-export-metric-list')"],
    ["getElementById('export-panel')", "getElementById('fire-export-panel')"],
    ["getElementById('ex-all-toggle')", "getElementById('fire-ex-all-toggle')"],
    ["document.querySelectorAll('#analysis-modal .freq-btn')", "document.querySelectorAll('#fire-analysis-modal .freq-btn')"],
    ["document.querySelector('#analysis-modal .freq-btn')", "document.querySelector('#fire-analysis-modal .freq-btn')"],
    ["document.querySelectorAll('#analysis-modal .freq-btn')", "document.querySelectorAll('#fire-analysis-modal .freq-btn')"],
    ["document.querySelectorAll('#full-table-body tr')", "document.querySelectorAll('#fire-full-table-body tr')"],
    ["document.querySelectorAll('.ex-check')", "document.querySelectorAll('#fire-export-panel .ex-check')"],
    ["document.querySelectorAll('.ex-check:checked')", "document.querySelectorAll('#fire-export-panel .ex-check:checked')"]
  ];
  for (const [a, b] of pairs) {
    code = code.split(a).join(b);
  }

  code = code.split("if (id === 'an-point-dropdown')").join("if (id === 'fire-an-point-dropdown')");
  code = code.split("if (id === 'an-region-dropdown')").join("if (id === 'fire-an-region-dropdown')");

  code = code.replace(
    /document\.querySelectorAll\('\.custom-dropdown-content'\)/g,
    "document.querySelectorAll('#fire-analysis-modal .custom-dropdown-content')"
  );

  code = code.replace(/id="met-an-/g, 'id="fire-met-an-');
  code = code.replace(/for="met-an-/g, 'for="fire-met-an-');
  code = code.replace(/id="ex-col-\$\{/g, 'id="fire-ex-col-${');
  code = code.replace(/for="ex-col-\$\{/g, 'for="fire-ex-col-${');

  code = code.replace(
    'const allGnssIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === \'GNSS\');\n        this.selectedPoints = [...allGnssIds];',
    'const allFireIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === \'FIRE\');\n        this.selectedPoints = [...allFireIds];'
  );
  code = code.replace(
    "this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'GNSS');\n        this.selectedGlobalMetrics = ['XY速度(mm/h)']; this.tMultiplier = 1;",
    "this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'FIRE');\n        this.selectedGlobalMetrics = ['温度(℃)']; this.tMultiplier = 1;"
  );

  code = code.replace(
    'exportChart(type) { const chart = (type === \'curve\') ? this.charts.curve : this.charts.vector;',
    "exportChart(type) { const chart = (type === 'curve' || type === 'combustion') ? this.charts.curve : this.charts.vector;"
  );

  code = code.replace(/const analysisModule = \{/g, 'const ___fireAnalysisModuleMarker___ = {');
  code = code.replace(/analysisModule\./g, 'window.fireAnalysisModule.');
  code = code.replace(/const ___fireAnalysisModuleMarker___ = \{/g, 'const analysisModule = {');

  return code;
}

function buildFireModuleFromSource() {
  const text = fireJsRaw.replace(/\r\n/g, '\n');
  const start = text.indexOf('const analysisModule = {');
  const end = text.indexOf('};\n\n\n// ========== 页面初始化', start);
  if (start === -1 || end === -1) {
    throw new Error('fire.js: 未找到 analysisModule 块');
  }
  const body = text.slice(start, end + 2);
  const patched = patchFireAnalysisSource(body);

  const factory = new Function('echarts', 'mapModule', `${patched}; return analysisModule;`);
  const mm = typeof window !== 'undefined' ? window.mapModule : undefined;
  const mod = factory(echarts, mm);

  mod.toggleAllExport = function toggleAllExport(checked) {
    document.querySelectorAll('#fire-export-panel .ex-check').forEach((cb) => {
      cb.checked = checked;
    });
    const t = document.getElementById('fire-ex-all-toggle');
    if (t) t.checked = checked;
  };

  return mod;
}

let _impl;

export function getFireAnalysisModule() {
  if (!_impl) {
    if (typeof window !== 'undefined' && !window.mapModule) {
      console.warn('[fireAnalysis] window.mapModule 尚未就绪');
    }
    _impl = buildFireModuleFromSource();
  }
  return _impl;
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'fireAnalysisModule', {
    configurable: true,
    get() {
      return getFireAnalysisModule();
    }
  });
}

export function getFireModalMarkup() {
  const start = fireHtmlRaw.indexOf('<div id="analysis-modal"');
  const end = fireHtmlRaw.indexOf('<canvas id="bg-canvas"');
  if (start === -1 || end === -1) return '';
  let f = fireHtmlRaw.slice(start, end);
  f = f.replace(/id="analysis-modal"/, 'id="fire-analysis-modal" style="display:none"');
  f = f.replace(/id="export-panel"/, 'id="fire-export-panel" style="display:none"');
  f = f.replace(/id="export-metric-list"/, 'id="fire-export-metric-list"');
  f = f.replace(/id="ex-all-toggle"/, 'id="fire-ex-all-toggle"');
  f = f.replace(/for="ex-all-toggle"/, 'for="fire-ex-all-toggle"');
  f = f.replace(/id="an-region-btn"/, 'id="fire-an-region-btn"');
  f = f.replace(/id="an-region-label"/, 'id="fire-an-region-label"');
  f = f.replace(/id="an-region-dropdown"/, 'id="fire-an-region-dropdown"');
  f = f.replace(/id="an-point-input"/, 'id="fire-an-point-input"');
  f = f.replace(/id="an-point-dropdown"/, 'id="fire-an-point-dropdown"');
  f = f.replace(/id="an-start"/, 'id="fire-an-start"');
  f = f.replace(/id="an-end"/, 'id="fire-an-end"');
  f = f.replace(/id="metric-select-btn"/, 'id="fire-metric-select-btn"');
  f = f.replace(/id="metric-btn-label"/, 'id="fire-metric-btn-label"');
  f = f.replace(/id="metric-items-container"/, 'id="fire-metric-items-container"');
  f = f.replace(/id="combustion-chart-main"/, 'id="fire-combustion-chart-main"');
  f = f.replace(/id="an-table-freq"/, 'id="fire-an-table-freq"');
  f = f.replace(/id="full-table-head"/, 'id="fire-full-table-head"');
  f = f.replace(/id="full-table-body"/, 'id="fire-full-table-body"');
  f = f.replace(/id="an-pagination"/, 'id="fire-an-pagination"');
  f = f.replace(/toggleDropdown\('an-region-dropdown'/g, "toggleDropdown('fire-an-region-dropdown'");
  f = f.replace(/toggleDropdown\('an-point-dropdown'/g, "toggleDropdown('fire-an-point-dropdown'");
  f = f.replace(/analysisModule\./g, 'window.fireAnalysisModule.');
  f = f.replace(/getElementById\('export-panel'\)/g, "getElementById('fire-export-panel')");
  return f;
}
