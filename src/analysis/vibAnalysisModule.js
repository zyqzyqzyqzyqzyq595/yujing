import * as echarts from 'echarts';
import vibJsRaw from '../out/vib.js?raw';
import vibHtmlRaw from '../out/vib.html?raw';

/**
 * 从 out/vib.js 截取 analysisModule，为 DOM id 加 vib- 前缀，避免与其它分析弹窗冲突。
 */
function patchVibAnalysisSource(src) {
  let code = src.replace(/\r\n/g, '\n');

  const pairs = [
    ["getElementById('analysis-modal')", "getElementById('vib-analysis-modal')"],
    ["getElementById('an-start')", "getElementById('vib-an-start')"],
    ["getElementById('an-end')", "getElementById('vib-an-end')"],
    ["getElementById('an-region-dropdown')", "getElementById('vib-an-region-dropdown')"],
    ["getElementById('an-point-dropdown')", "getElementById('vib-an-point-dropdown')"],
    ["getElementById('an-region-label')", "getElementById('vib-an-region-label')"],
    ["getElementById('an-point-input')", "getElementById('vib-an-point-input')"],
    ["getElementById('curve-chart-main')", "getElementById('vib-curve-chart-main')"],
    ["getElementById('vector-chart-main')", "getElementById('vib-vector-chart-main')"],
    ["getElementById('traj-freq')", "getElementById('vib-traj-freq')"],
    ["getElementById('metric-select-btn')", "getElementById('vib-metric-select-btn')"],
    ["getElementById('metric-items-container')", "getElementById('vib-metric-items-container')"],
    ["getElementById('metric-btn-label')", "getElementById('vib-metric-btn-label')"],
    ["getElementById('an-table-freq')", "getElementById('vib-an-table-freq')"],
    ["getElementById('full-table-head')", "getElementById('vib-full-table-head')"],
    ["getElementById('full-table-body')", "getElementById('vib-full-table-body')"],
    ["getElementById('export-metric-list')", "getElementById('vib-export-metric-list')"],
    ["getElementById('export-panel')", "getElementById('vib-export-panel')"],
    ["getElementById('ex-all-toggle')", "getElementById('vib-ex-all-toggle')"],
    ["document.querySelectorAll('#analysis-modal .freq-btn')", "document.querySelectorAll('#vib-analysis-modal .freq-btn')"],
    ["document.querySelector('#analysis-modal .freq-btn')", "document.querySelector('#vib-analysis-modal .freq-btn')"],
    ["document.querySelectorAll('#analysis-modal .freq-btn')", "document.querySelectorAll('#vib-analysis-modal .freq-btn')"],
    ["document.querySelectorAll('#full-table-body tr')", "document.querySelectorAll('#vib-full-table-body tr')"],
    ["document.querySelectorAll('.ex-check')", "document.querySelectorAll('#vib-export-panel .ex-check')"],
    ["document.querySelectorAll('.ex-check:checked')", "document.querySelectorAll('#vib-export-panel .ex-check:checked')"]
  ];
  for (const [a, b] of pairs) {
    code = code.split(a).join(b);
  }

  code = code.split("if (id === 'an-point-dropdown')").join("if (id === 'vib-an-point-dropdown')");
  code = code.split("if (id === 'an-region-dropdown')").join("if (id === 'vib-an-region-dropdown')");

  code = code.replace(
    /document\.querySelectorAll\('\.custom-dropdown-content'\)/g,
    "document.querySelectorAll('#vib-analysis-modal .custom-dropdown-content')"
  );

  code = code.replace(/id="met-an-/g, 'id="vib-met-an-');
  code = code.replace(/for="met-an-/g, 'for="vib-met-an-');
  code = code.replace(/id="ex-col-\$\{/g, 'id="vib-ex-col-${');
  code = code.replace(/for="ex-col-\$\{/g, 'for="vib-ex-col-${');

  code = code.replace(
    `            const metricBtn = document.getElementById('vib-metric-select-btn');
            const metricMenu = document.getElementById('vib-metric-items-container');
            if (metricMenu && metricMenu.style.display === 'block') {
                if (!metricBtn.contains(e.target) && !metricMenu.contains(e.target)) {
                    metricMenu.style.display = 'none';
                }
            }`,
    `            const metricBtn = document.getElementById('vib-metric-select-btn');
            const metricMenu = document.getElementById('vib-metric-items-container');
            if (metricBtn && metricMenu && metricMenu.style.display === 'block') {
                if (!metricBtn.contains(e.target) && !metricMenu.contains(e.target)) {
                    metricMenu.style.display = 'none';
                }
            }`
  );

  code = code.replace(/const analysisModule = \{/g, 'const ___vibAnalysisModuleMarker___ = {');
  code = code.replace(/analysisModule\./g, 'window.vibAnalysisModule.');
  code = code.replace(/const ___vibAnalysisModuleMarker___ = \{/g, 'const analysisModule = {');

  return code;
}

function buildVibModuleFromSource() {
  const text = vibJsRaw.replace(/\r\n/g, '\n');
  const start = text.indexOf('const analysisModule = {');
  const end = text.indexOf('};\n\n// ==========================================\n// 入口函数', start);
  if (start === -1 || end === -1) {
    throw new Error('vib.js: 未找到 analysisModule 块');
  }
  const body = text.slice(start, end + 2);
  const patched = patchVibAnalysisSource(body);

  const factory = new Function('echarts', 'mapModule', `${patched}; return analysisModule;`);
  const mm = typeof window !== 'undefined' ? window.mapModule : undefined;
  return factory(echarts, mm);
}

let _impl;

export function getVibAnalysisModule() {
  if (!_impl) {
    if (typeof window !== 'undefined' && !window.mapModule) {
      console.warn('[vibAnalysis] window.mapModule 尚未就绪');
    }
    _impl = buildVibModuleFromSource();
  }
  return _impl;
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'vibAnalysisModule', {
    configurable: true,
    get() {
      return getVibAnalysisModule();
    }
  });
}

export function getVibModalMarkup() {
  const start = vibHtmlRaw.indexOf('<div id="analysis-modal"');
  const end = vibHtmlRaw.indexOf('<canvas id="bg-canvas"');
  if (start === -1 || end === -1) return '';
  let f = vibHtmlRaw.slice(start, end);
  f = f.replace(/id="analysis-modal"/, 'id="vib-analysis-modal" style="display:none"');
  f = f.replace(/id="export-panel"/, 'id="vib-export-panel" style="display:none"');
  f = f.replace(/id="export-metric-list"/, 'id="vib-export-metric-list"');
  f = f.replace(/id="ex-all-toggle"/, 'id="vib-ex-all-toggle"');
  f = f.replace(/for="ex-all-toggle"/, 'for="vib-ex-all-toggle"');
  f = f.replace(/id="an-region-btn"/, 'id="vib-an-region-btn"');
  f = f.replace(/id="an-region-label"/, 'id="vib-an-region-label"');
  f = f.replace(/id="an-region-dropdown"/, 'id="vib-an-region-dropdown"');
  f = f.replace(/id="an-point-input"/, 'id="vib-an-point-input"');
  f = f.replace(/id="an-point-dropdown"/, 'id="vib-an-point-dropdown"');
  f = f.replace(/id="an-start"/, 'id="vib-an-start"');
  f = f.replace(/id="an-end"/, 'id="vib-an-end"');
  f = f.replace(/id="metric-select-btn"/, 'id="vib-metric-select-btn"');
  f = f.replace(/id="metric-btn-label"/, 'id="vib-metric-btn-label"');
  f = f.replace(/id="metric-items-container"/, 'id="vib-metric-items-container"');
  f = f.replace(/id="curve-chart-main"/, 'id="vib-curve-chart-main"');
  f = f.replace(/id="an-table-freq"/, 'id="vib-an-table-freq"');
  f = f.replace(/id="full-table-head"/, 'id="vib-full-table-head"');
  f = f.replace(/id="full-table-body"/, 'id="vib-full-table-body"');
  f = f.replace(/id="an-pagination"/, 'id="vib-an-pagination"');
  f = f.replace(/toggleDropdown\('an-region-dropdown'/g, "toggleDropdown('vib-an-region-dropdown'");
  f = f.replace(/toggleDropdown\('an-point-dropdown'/g, "toggleDropdown('vib-an-point-dropdown'");
  f = f.replace(/analysisModule\./g, 'window.vibAnalysisModule.');
  f = f.replace(/getElementById\('export-panel'\)/g, "getElementById('vib-export-panel')");

// vibAnalysisModule.js 底部 getVibModalMarkup 函数内

// 1. 爆破振动专属：通长布局（1fr），取消分列，锁定高度 420px
f = f.replace(/class="([^"]*chart-row[^"]*)"/g, 'class="$1" style="display: grid !important; grid-template-columns: 1fr !important; gap: 15px !important; height: 420px !important; width: 100%; margin-bottom: 15px;"');

// 2. 允许下拉框溢出显示，确保不会被盒子裁剪
f = f.replace(/class="([^"]*chart-box[^"]*)"/g, 'class="$1" style="min-width: 0 !important; overflow: visible !important; position: relative !important; display: flex; flex-direction: column;"');

// 3. 锁定图表渲染高度，适应通长布局
f = f.replace(/id="([^"]*chart-main[^"]*)"/g, 'id="$1" style="height: 350px !important; width: 100% !important; flex: none !important;"');

// 4. 将指标下拉菜单彻底悬浮化，解决层级冲突
f = f.replace(/id="([^"]*metric-items-container[^"]*)"/g, 'id="$1" style="position: absolute !important; z-index: 99999 !important; top: 40px !important; right: 10px !important; background: #fff; border: 1px solid #1c3d90; box-shadow: 0 10px 25px rgba(0,0,0,0.2); width: 220px; display: none;"');


  return f;
}
