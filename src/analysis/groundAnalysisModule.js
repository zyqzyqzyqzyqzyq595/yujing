import * as echarts from 'echarts';
import groundJsRaw from '../out/ground.js?raw';
import groundHtmlRaw from '../out/ground.html?raw';

/**
 * 从 out/ground.js 截取 analysisModule，为 DOM id 加 ground- 前缀；并修正模块内仍写 GNSS 的地下水逻辑。
 */
function patchGroundAnalysisSource(src) {
  let code = src.replace(/\r\n/g, '\n');

  const pairs = [
    ["getElementById('analysis-modal')", "getElementById('ground-analysis-modal')"],
    ["getElementById('an-start')", "getElementById('ground-an-start')"],
    ["getElementById('an-end')", "getElementById('ground-an-end')"],
    ["getElementById('an-region-dropdown')", "getElementById('ground-an-region-dropdown')"],
    ["getElementById('an-point-dropdown')", "getElementById('ground-an-point-dropdown')"],
    ["getElementById('an-region-label')", "getElementById('ground-an-region-label')"],
    ["getElementById('an-point-input')", "getElementById('ground-an-point-input')"],
    ["getElementById('curve-chart-main')", "getElementById('ground-curve-chart-main')"],
    ["getElementById('vector-chart-main')", "getElementById('ground-vector-chart-main')"],
    ["getElementById('traj-freq')", "getElementById('ground-traj-freq')"],
    ["getElementById('metric-select-btn')", "getElementById('ground-metric-select-btn')"],
    ["getElementById('metric-items-container')", "getElementById('ground-metric-items-container')"],
    ["getElementById('metric-btn-label')", "getElementById('ground-metric-btn-label')"],
    ["getElementById('an-table-freq')", "getElementById('ground-an-table-freq')"],
    ["getElementById('full-table-head')", "getElementById('ground-full-table-head')"],
    ["getElementById('full-table-body')", "getElementById('ground-full-table-body')"],
    ["getElementById('export-metric-list')", "getElementById('ground-export-metric-list')"],
    ["getElementById('export-panel')", "getElementById('ground-export-panel')"],
    ["getElementById('ex-all-toggle')", "getElementById('ground-ex-all-toggle')"],
    ["document.querySelectorAll('#analysis-modal .freq-btn')", "document.querySelectorAll('#ground-analysis-modal .freq-btn')"],
    ["document.querySelector('#analysis-modal .freq-btn')", "document.querySelector('#ground-analysis-modal .freq-btn')"],
    ["document.querySelectorAll('#analysis-modal .freq-btn')", "document.querySelectorAll('#ground-analysis-modal .freq-btn')"],
    ["document.querySelectorAll('#full-table-body tr')", "document.querySelectorAll('#ground-full-table-body tr')"],
    ["document.querySelectorAll('.ex-check')", "document.querySelectorAll('#ground-export-panel .ex-check')"],
    ["document.querySelectorAll('.ex-check:checked')", "document.querySelectorAll('#ground-export-panel .ex-check:checked')"]
  ];
  for (const [a, b] of pairs) {
    code = code.split(a).join(b);
  }

  code = code.split("if (id === 'an-point-dropdown')").join("if (id === 'ground-an-point-dropdown')");
  code = code.split("if (id === 'an-region-dropdown')").join("if (id === 'ground-an-region-dropdown')");

  code = code.replace(
    /document\.querySelectorAll\('\.custom-dropdown-content'\)/g,
    "document.querySelectorAll('#ground-analysis-modal .custom-dropdown-content')"
  );

  code = code.replace(/id="met-an-/g, 'id="ground-met-an-');
  code = code.replace(/for="met-an-/g, 'for="ground-met-an-');
  code = code.replace(/id="ex-col-\$\{/g, 'id="ground-ex-col-${');
  code = code.replace(/for="ex-col-\$\{/g, 'for="ground-ex-col-${');

  code = code.replace(
    'const allGnssIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === \'GNSS\');\n    this.selectedPoints = [...allGnssIds];',
    'const allGroundIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === \'GROUND\');\n    this.selectedPoints = [...allGroundIds];'
  );
  code = code.replace(
    "this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'GNSS');\n        this.selectedGlobalMetrics = ['XY速度(mm/h)']; this.tMultiplier = 1;",
    "this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'GROUND');\n        this.selectedGlobalMetrics = ['温度（℃）']; this.tMultiplier = 1;"
  );
  code = code.replace(
    "p.deviceId.replace('GNSS', '').includes(filterVal)",
    "p.deviceId.replace('GROUND', '').includes(filterVal)"
  );
  code = code.replace(
    '        const allGnssCount = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === \'GNSS\').length;\n        if (this.selectedPoints.length > 0 && this.selectedPoints.length >= allGnssCount) {',
    '        const allGroundCount = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === \'GROUND\').length;\n        if (this.selectedPoints.length > 0 && this.selectedPoints.length >= allGroundCount) {'
  );
  code = code.replace(
    "mapModule.pMeta[id]?.deviceId?.replace('GNSS', '')",
    "mapModule.pMeta[id]?.deviceId?.replace('GROUND', '')"
  );
  code = code.replace(
    "if (input) input.value = targetMeta.deviceId.replace('GNSS', '');",
    "if (input) input.value = targetMeta.deviceId.replace('GROUND', '');"
  );

  code = code.replace(/const analysisModule = \{/g, 'const ___groundAnalysisModuleMarker___ = {');
  code = code.replace(/analysisModule\./g, 'window.groundAnalysisModule.');
  code = code.replace(/const ___groundAnalysisModuleMarker___ = \{/g, 'const analysisModule = {');

  return code;
}

function buildGroundModuleFromSource() {
  const text = groundJsRaw.replace(/\r\n/g, '\n');
  const start = text.indexOf('const analysisModule = {');
  const end = text.indexOf('};\n\n\n// ========== 页面初始化', start);
  if (start === -1 || end === -1) {
    throw new Error('ground.js: 未找到 analysisModule 块');
  }
  const body = text.slice(start, end + 2);
  const patched = patchGroundAnalysisSource(body);

  const factory = new Function('echarts', 'mapModule', `${patched}; return analysisModule;`);
  const mm = typeof window !== 'undefined' ? window.mapModule : undefined;
  return factory(echarts, mm);
}

let _impl;

export function getGroundAnalysisModule() {
  if (!_impl) {
    if (typeof window !== 'undefined' && !window.mapModule) {
      console.warn('[groundAnalysis] window.mapModule 尚未就绪');
    }
    _impl = buildGroundModuleFromSource();
  }
  return _impl;
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'groundAnalysisModule', {
    configurable: true,
    get() {
      return getGroundAnalysisModule();
    }
  });
}

export function getGroundModalMarkup() {
  const start = groundHtmlRaw.indexOf('<div id="analysis-modal"');
  const end = groundHtmlRaw.indexOf('<canvas id="bg-canvas"');
  if (start === -1 || end === -1) return '';
  let f = groundHtmlRaw.slice(start, end);
  f = f.replace(/id="analysis-modal"/, 'id="ground-analysis-modal" style="display:none"');
  f = f.replace(/id="export-panel"/, 'id="ground-export-panel" style="display:none"');
  f = f.replace(/id="export-metric-list"/, 'id="ground-export-metric-list"');
  f = f.replace(/id="ex-all-toggle"/, 'id="ground-ex-all-toggle"');
  f = f.replace(/for="ex-all-toggle"/, 'for="ground-ex-all-toggle"');
  f = f.replace(/id="an-region-btn"/, 'id="ground-an-region-btn"');
  f = f.replace(/id="an-region-label"/, 'id="ground-an-region-label"');
  f = f.replace(/id="an-region-dropdown"/, 'id="ground-an-region-dropdown"');
  f = f.replace(/id="an-point-input"/, 'id="ground-an-point-input"');
  f = f.replace(/id="an-point-dropdown"/, 'id="ground-an-point-dropdown"');
  f = f.replace(/id="an-start"/, 'id="ground-an-start"');
  f = f.replace(/id="an-end"/, 'id="ground-an-end"');
  f = f.replace(/id="metric-select-btn"/, 'id="ground-metric-select-btn"');
  f = f.replace(/id="metric-btn-label"/, 'id="ground-metric-btn-label"');
  f = f.replace(/id="metric-items-container"/, 'id="ground-metric-items-container"');
  f = f.replace(/id="curve-chart-main"/, 'id="ground-curve-chart-main"');
  f = f.replace(/id="vector-chart-main"/, 'id="ground-vector-chart-main"');
  f = f.replace(/id="an-table-freq"/, 'id="ground-an-table-freq"');
  f = f.replace(/id="full-table-head"/, 'id="ground-full-table-head"');
  f = f.replace(/id="full-table-body"/, 'id="ground-full-table-body"');
  f = f.replace(/id="an-pagination"/, 'id="ground-an-pagination"');
  f = f.replace(/toggleDropdown\('an-region-dropdown'/g, "toggleDropdown('ground-an-region-dropdown'");
  f = f.replace(/toggleDropdown\('an-point-dropdown'/g, "toggleDropdown('ground-an-point-dropdown'");
  f = f.replace(/analysisModule\./g, 'window.groundAnalysisModule.');
  f = f.replace(/getElementById\('export-panel'\)/g, "getElementById('ground-export-panel')");

  // groundAnalysisModule.js 底部 getGroundModalMarkup 函数内

  // 1. 强制左右 1:1 分列布局：左侧曲线图，右侧水位剖面图，锁定行高 400px
  f = f.replace(/class="([^"]*chart-row[^"]*)"/g, 'class="$1" style="display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 15px !important; height: 400px !important; width: 100%; margin-bottom: 15px;"');

  // 2. 核心修正：允许下拉框溢出显示，并锁定相对定位基准
  f = f.replace(/class="([^"]*chart-box[^"]*)"/g, 'class="$1" style="min-width: 0 !important; overflow: visible !important; position: relative !important; display: flex; flex-direction: column;"');

  // 3. 强制锁定图表渲染高度：确保 ECharts 获得 320px 的饱满空间
  f = f.replace(/id="([^"]*chart-main[^"]*)"/g, 'id="$1" style="height: 320px !important; width: 100% !important; flex: none !important;"');

  // 4. 将指标选择下拉框彻底悬浮化，解决它在截图右侧霸占空间的问题
  f = f.replace(/id="([^"]*metric-items-container[^"]*)"/g, 'id="$1" style="position: absolute !important; z-index: 99999 !important; top: 40px !important; right: 10px !important; background: #fff; border: 1px solid #1c3d90; box-shadow: 0 10px 25px rgba(0,0,0,0.2); width: 220px; display: none;"');

  return f;

  return f;
}
