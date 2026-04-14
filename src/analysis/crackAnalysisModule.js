import * as echarts from 'echarts';
import crackJsRaw from '../out/crack.js?raw';
import crackHtmlRaw from '../out/crack.html?raw';

/**
 * 从 out/crack.js 截取 analysisModule，为 DOM id 加 crack- 前缀，避免与 GNSS / 雷达等弹窗冲突。
 */
function patchCrackAnalysisSource(src) {
  let code = src.replace(/\r\n/g, '\n');

  const pairs = [
    ["getElementById('analysis-modal')", "getElementById('crack-analysis-modal')"],
    ["getElementById('an-start')", "getElementById('crack-an-start')"],
    ["getElementById('an-end')", "getElementById('crack-an-end')"],
    ["getElementById('an-region')", "getElementById('crack-an-region')"],
    ["getElementById('an-device-input')", "getElementById('crack-an-device-input')"],
    ["getElementById('an-table-freq')", "getElementById('crack-an-table-freq')"],
    ["getElementById('traj-freq')", "getElementById('crack-traj-freq')"],
    ["getElementById('device-items-container')", "getElementById('crack-device-items-container')"],
    ["getElementById('metric-items-container')", "getElementById('crack-metric-items-container')"],
    ["getElementById('metric-select-btn')", "getElementById('crack-metric-select-btn')"],
    ["getElementById('metric-btn-label')", "getElementById('crack-metric-btn-label')"],
    ["getElementById('curve-chart-main')", "getElementById('crack-curve-chart-main')"],
    ["getElementById('evolution-chart-main')", "getElementById('crack-evolution-chart-main')"],
    ["getElementById('full-table-head')", "getElementById('crack-full-table-head')"],
    ["getElementById('full-table-body')", "getElementById('crack-full-table-body')"],
    ["getElementById('export-metric-list')", "getElementById('crack-export-metric-list')"],
    ["getElementById('export-panel')", "getElementById('crack-export-panel')"],
    ["getElementById(`metric-list-${devId}`)", "getElementById(`crack-metric-list-${devId}`)"],
    ["getElementById(`arrow-${devId}`)", "getElementById(`crack-arrow-${devId}`)"],
    ["document.querySelectorAll('#analysis-modal .freq-btn')", "document.querySelectorAll('#crack-analysis-modal .freq-btn')"],
    ["document.querySelectorAll('#full-table-body tr')", "document.querySelectorAll('#crack-full-table-body tr')"],
    ["document.querySelectorAll('.ex-check')", "document.querySelectorAll('#crack-export-panel .ex-check')"],
    ["document.querySelectorAll('.ex-check:checked')", "document.querySelectorAll('#crack-export-panel .ex-check:checked')"]
  ];
  for (const [a, b] of pairs) {
    code = code.split(a).join(b);
  }

  code = code.replace(/id="select-all-devices"/g, 'id="crack-select-all-devices"');
  code = code.replace(/for="select-all-devices"/g, 'for="crack-select-all-devices"');
  code = code.replace(/id="dev-\$\{/g, 'id="crack-dev-${');
  code = code.replace(/for="dev-\$\{/g, 'for="crack-dev-${');
  code = code.replace(/id="met-global-/g, 'id="crack-met-global-');
  code = code.replace(/for="met-global-/g, 'for="crack-met-global-');
  code = code.replace(/id="ex-col-\$\{/g, 'id="crack-ex-col-${');
  code = code.replace(/for="ex-col-\$\{/g, 'for="crack-ex-col-${');

  code = code.replace(/const analysisModule = \{/g, 'const ___crackAnalysisModuleMarker___ = {');
  code = code.replace(/analysisModule\./g, 'window.crackAnalysisModule.');
  code = code.replace(/const ___crackAnalysisModuleMarker___ = \{/g, 'const analysisModule = {');

  return code;
}

function buildCrackModuleFromSource() {
  const text = crackJsRaw;
  const start = text.indexOf('const analysisModule = {');
  const end = text.indexOf('};\n\nwindow.onload', start);
  if (start === -1 || end === -1) {
    throw new Error('crack.js: 未找到 analysisModule 块');
  }
  const body = text.slice(start, end + 2);
  const patched = patchCrackAnalysisSource(body);

  const factory = new Function('echarts', 'mapModule', `${patched}; return analysisModule;`);
  const mm = typeof window !== 'undefined' ? window.mapModule : undefined;
  return factory(echarts, mm);
}

let _impl;

export function getCrackAnalysisModule() {
  if (!_impl) {
    if (typeof window !== 'undefined' && !window.mapModule) {
      console.warn('[crackAnalysis] window.mapModule 尚未就绪');
    }
    _impl = buildCrackModuleFromSource();
  }
  return _impl;
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'crackAnalysisModule', {
    configurable: true,
    get() {
      return getCrackAnalysisModule();
    }
  });
}

export function getCrackModalMarkup() {
  const start = crackHtmlRaw.indexOf('<div id="analysis-modal"');
  const end = crackHtmlRaw.indexOf('<canvas id="bg-canvas"');
  if (start === -1 || end === -1) return '';
  let f = crackHtmlRaw.slice(start, end);
  f = f.replace(/id="analysis-modal"/, 'id="crack-analysis-modal" style="display:none"');
  f = f.replace(/id="export-panel"/, 'id="crack-export-panel" style="display:none"');
  f = f.replace(/id="export-metric-list"/, 'id="crack-export-metric-list"');
  f = f.replace(/id="an-region"/, 'id="crack-an-region"');
  f = f.replace(/id="an-device-input"/, 'id="crack-an-device-input"');
  f = f.replace(/id="an-start"/, 'id="crack-an-start"');
  f = f.replace(/id="an-end"/, 'id="crack-an-end"');
  f = f.replace(/id="device-items-container"/, 'id="crack-device-items-container"');
  f = f.replace(/id="metric-select-btn"/, 'id="crack-metric-select-btn"');
  f = f.replace(/id="metric-btn-label"/, 'id="crack-metric-btn-label"');
  f = f.replace(/id="metric-items-container"/, 'id="crack-metric-items-container"');
  f = f.replace(/id="curve-chart-main"/, 'id="crack-curve-chart-main"');
  f = f.replace(/id="evolution-chart-main"/, 'id="crack-evolution-chart-main"');
  f = f.replace(/id="an-table-freq"/, 'id="crack-an-table-freq"');
  f = f.replace(/id="full-table-head"/, 'id="crack-full-table-head"');
  f = f.replace(/id="full-table-body"/, 'id="crack-full-table-body"');
  f = f.replace(/id="an-pagination"/, 'id="crack-an-pagination"');
  f = f.replace(/analysisModule\./g, 'window.crackAnalysisModule.');
  f = f.replace(/getElementById\('export-panel'\)/g, "getElementById('crack-export-panel')");
// crackAnalysisModule.js 底部 getCrackModalMarkup 函数内

// 1. 保持 Grid 布局，确保左右 1:1 分页
f = f.replace(/class="([^"]*chart-row[^"]*)"/g, 'class="$1" style="display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 15px !important; height: 400px !important; width: 100%; margin-bottom: 15px;"');

// 2. 核心修正：允许溢出显示（让下拉框能浮出来），并锁定相对定位基准
f = f.replace(/class="([^"]*chart-box[^"]*)"/g, 'class="$1" style="min-width: 0 !important; overflow: visible !important; position: relative !important; display: flex; flex-direction: column;"');

// 3. 强制锁定图表高度：防止它被任何元素挤压
f = f.replace(/id="([^"]*chart-main[^"]*)"/g, 'id="$1" style="height: 320px !important; width: 100% !important; flex: none !important;"');

// 4. 强制下拉菜单悬浮化：给它绝对定位和最高 z-index
f = f.replace(/id="([^"]*metric-items-container[^"]*)"/g, 'id="$1" style="position: absolute !important; z-index: 99999 !important; top: 40px !important; right: 10px !important; background: #fff; border: 1px solid #1c3d90; box-shadow: 0 10px 25px rgba(0,0,0,0.2); width: 220px; display: none;"');


  return f;
}
