import * as echarts from 'echarts';
import waterJsRaw from '../out/water.js?raw';
import waterHtmlRaw from '../out/water.html?raw';

/**
 * 从 out/water.js 截取 analysisModule，为 DOM id 加 water- 前缀，避免与其它分析弹窗冲突。
 */
function patchWaterAnalysisSource(src) {
  let code = src.replace(/\r\n/g, '\n');

  const pairs = [
    ["getElementById('analysis-modal')", "getElementById('water-analysis-modal')"],
    ["getElementById('an-start')", "getElementById('water-an-start')"],
    ["getElementById('an-end')", "getElementById('water-an-end')"],
    ["getElementById('an-region-dropdown')", "getElementById('water-an-region-dropdown')"],
    ["getElementById('an-point-dropdown')", "getElementById('water-an-point-dropdown')"],
    ["getElementById('an-region-label')", "getElementById('water-an-region-label')"],
    ["getElementById('an-point-input')", "getElementById('water-an-point-input')"],
    ["getElementById('curve-chart-main')", "getElementById('water-curve-chart-main')"],
    ["getElementById('vector-chart-main')", "getElementById('water-vector-chart-main')"],
    ["getElementById('traj-freq')", "getElementById('water-traj-freq')"],
    ["getElementById('metric-select-btn')", "getElementById('water-metric-select-btn')"],
    ["getElementById('metric-items-container')", "getElementById('water-metric-items-container')"],
    ["getElementById('metric-btn-label')", "getElementById('water-metric-btn-label')"],
    ["getElementById('an-table-freq')", "getElementById('water-an-table-freq')"],
    ["getElementById('full-table-head')", "getElementById('water-full-table-head')"],
    ["getElementById('full-table-body')", "getElementById('water-full-table-body')"],
    ["getElementById('export-metric-list')", "getElementById('water-export-metric-list')"],
    ["getElementById('export-panel')", "getElementById('water-export-panel')"],
    ["getElementById('ex-all-toggle')", "getElementById('water-ex-all-toggle')"],
    ["document.querySelectorAll('#analysis-modal .freq-btn')", "document.querySelectorAll('#water-analysis-modal .freq-btn')"],
    ["document.querySelector('#analysis-modal .freq-btn')", "document.querySelector('#water-analysis-modal .freq-btn')"],
    ["document.querySelectorAll('#analysis-modal .freq-btn')", "document.querySelectorAll('#water-analysis-modal .freq-btn')"],
    ["document.querySelectorAll('#full-table-body tr')", "document.querySelectorAll('#water-full-table-body tr')"],
    ["document.querySelectorAll('.ex-check')", "document.querySelectorAll('#water-export-panel .ex-check')"],
    ["document.querySelectorAll('.ex-check:checked')", "document.querySelectorAll('#water-export-panel .ex-check:checked')"]
  ];
  for (const [a, b] of pairs) {
    code = code.split(a).join(b);
  }

  code = code.split("if (id === 'an-point-dropdown')").join("if (id === 'water-an-point-dropdown')");
  code = code.split("if (id === 'an-region-dropdown')").join("if (id === 'water-an-region-dropdown')");

  code = code.replace(
    /document\.querySelectorAll\('\.custom-dropdown-content'\)/g,
    "document.querySelectorAll('#water-analysis-modal .custom-dropdown-content')"
  );

  code = code.replace(/id="met-an-/g, 'id="water-met-an-');
  code = code.replace(/for="met-an-/g, 'for="water-met-an-');
  code = code.replace(/id="ex-col-\$\{/g, 'id="water-ex-col-${');
  code = code.replace(/for="ex-col-\$\{/g, 'for="water-ex-col-${');

  code = code.replace(/const analysisModule = \{/g, 'const ___waterAnalysisModuleMarker___ = {');
  code = code.replace(/analysisModule\./g, 'window.waterAnalysisModule.');
  code = code.replace(/const ___waterAnalysisModuleMarker___ = \{/g, 'const analysisModule = {');

  return code;
}

function buildWaterModuleFromSource() {
  const text = waterJsRaw.replace(/\r\n/g, '\n');
  const start = text.indexOf('const analysisModule = {');
  const end = text.indexOf('};\n\n\n// ========== 页面初始化', start);
  if (start === -1 || end === -1) {
    throw new Error('water.js: 未找到 analysisModule 块');
  }
  const body = text.slice(start, end + 2);
  const patched = patchWaterAnalysisSource(body);

  const factory = new Function('echarts', 'mapModule', `${patched}; return analysisModule;`);
  const mm = typeof window !== 'undefined' ? window.mapModule : undefined;
  return factory(echarts, mm);
}

let _impl;

export function getWaterAnalysisModule() {
  if (!_impl) {
    if (typeof window !== 'undefined' && !window.mapModule) {
      console.warn('[waterAnalysis] window.mapModule 尚未就绪');
    }
    _impl = buildWaterModuleFromSource();
  }
  return _impl;
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'waterAnalysisModule', {
    configurable: true,
    get() {
      return getWaterAnalysisModule();
    }
  });
}

export function getWaterModalMarkup() {
  const start = waterHtmlRaw.indexOf('<div id="analysis-modal"');
  const end = waterHtmlRaw.indexOf('<canvas id="bg-canvas"');
  if (start === -1 || end === -1) return '';
  let f = waterHtmlRaw.slice(start, end);
  f = f.replace(/id="analysis-modal"/, 'id="water-analysis-modal" style="display:none"');
  f = f.replace(/id="export-panel"/, 'id="water-export-panel" style="display:none"');
  f = f.replace(/id="export-metric-list"/, 'id="water-export-metric-list"');
  f = f.replace(/id="ex-all-toggle"/, 'id="water-ex-all-toggle"');
  f = f.replace(/for="ex-all-toggle"/, 'for="water-ex-all-toggle"');
  f = f.replace(/id="an-region-btn"/, 'id="water-an-region-btn"');
  f = f.replace(/id="an-region-label"/, 'id="water-an-region-label"');
  f = f.replace(/id="an-region-dropdown"/, 'id="water-an-region-dropdown"');
  f = f.replace(/id="an-point-input"/, 'id="water-an-point-input"');
  f = f.replace(/id="an-point-dropdown"/, 'id="water-an-point-dropdown"');
  f = f.replace(/id="an-start"/, 'id="water-an-start"');
  f = f.replace(/id="an-end"/, 'id="water-an-end"');
  f = f.replace(/id="metric-select-btn"/, 'id="water-metric-select-btn"');
  f = f.replace(/id="metric-btn-label"/, 'id="water-metric-btn-label"');
  f = f.replace(/id="metric-items-container"/, 'id="water-metric-items-container"');
  f = f.replace(/id="curve-chart-main"/, 'id="water-curve-chart-main"');
  f = f.replace(/id="an-table-freq"/, 'id="water-an-table-freq"');
  f = f.replace(/id="full-table-head"/, 'id="water-full-table-head"');
  f = f.replace(/id="full-table-body"/, 'id="water-full-table-body"');
  f = f.replace(/id="an-pagination"/, 'id="water-an-pagination"');
  f = f.replace(/toggleDropdown\('an-region-dropdown'/g, "toggleDropdown('water-an-region-dropdown'");
  f = f.replace(/toggleDropdown\('an-point-dropdown'/g, "toggleDropdown('water-an-point-dropdown'");
  f = f.replace(/analysisModule\./g, 'window.waterAnalysisModule.');
  f = f.replace(/getElementById\('export-panel'\)/g, "getElementById('water-export-panel')");

  // waterAnalysisModule.js 底部 getWaterModalMarkup 函数内

  // 1. 降雨监测专属：强制通长布局（1fr），锁定高度 420px
  f = f.replace(/class="([^"]*chart-row[^"]*)"/g, 'class="$1" style="display: grid !important; grid-template-columns: 1fr !important; gap: 15px !important; height: 420px !important; width: 100%; margin-bottom: 15px;"');

  // 2. 允许下拉框溢出显示，确保不会被盒子裁剪
  f = f.replace(/class="([^"]*chart-box[^"]*)"/g, 'class="$1" style="min-width: 0 !important; overflow: visible !important; position: relative !important; display: flex; flex-direction: column;"');

  // 3. 锁定曲线图渲染高度，确保 ECharts 画布撑满 350px
  f = f.replace(/id="([^"]*chart-main[^"]*)"/g, 'id="$1" style="height: 350px !important; width: 100% !important; flex: none !important;"');

  // 4. 将指标下拉菜单彻底悬浮化，解决层级冲突并防止挤压图表
  f = f.replace(/id="([^"]*metric-items-container[^"]*)"/g, 'id="$1" style="position: absolute !important; z-index: 99999 !important; top: 40px !important; right: 10px !important; background: #fff; border: 1px solid #1c3d90; box-shadow: 0 10px 25px rgba(0,0,0,0.2); width: 220px; display: none;"');

  return f;

  return f;
}
