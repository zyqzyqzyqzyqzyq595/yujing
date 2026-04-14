import * as echarts from 'echarts';
import yingliJsRaw from '../out/yingli.js?raw';
import yingliHtmlRaw from '../out/yingli.html?raw';

/**
 * 从 out/yingli.js 截取 analysisModule，为 DOM id 加 yingli- 前缀，避免与其它分析弹窗冲突。
 */
function patchYingliAnalysisSource(src) {
  let code = src.replace(/\r\n/g, '\n');

  const pairs = [
    ["getElementById('analysis-modal')", "getElementById('yingli-analysis-modal')"],
    ["getElementById('an-start')", "getElementById('yingli-an-start')"],
    ["getElementById('an-end')", "getElementById('yingli-an-end')"],
    ["getElementById('an-region-dropdown')", "getElementById('yingli-an-region-dropdown')"],
    ["getElementById('an-point-dropdown')", "getElementById('yingli-an-point-dropdown')"],
    ["getElementById('an-region-label')", "getElementById('yingli-an-region-label')"],
    ["getElementById('an-point-input')", "getElementById('yingli-an-point-input')"],
    ["getElementById('an-stress-sub-dropdown')", "getElementById('yingli-an-stress-sub-dropdown')"],
    ["getElementById('an-stress-sub-label')", "getElementById('yingli-an-stress-sub-label')"],
    ["getElementById('curve-chart-main')", "getElementById('yingli-curve-chart-main')"],
    ["getElementById('metric-select-btn')", "getElementById('yingli-metric-select-btn')"],
    ["getElementById('metric-items-container')", "getElementById('yingli-metric-items-container')"],
    ["getElementById('metric-btn-label')", "getElementById('yingli-metric-btn-label')"],
    ["getElementById('an-table-freq')", "getElementById('yingli-an-table-freq')"],
    ["getElementById('full-table-head')", "getElementById('yingli-full-table-head')"],
    ["getElementById('full-table-body')", "getElementById('yingli-full-table-body')"],
    ["getElementById('export-metric-list')", "getElementById('yingli-export-metric-list')"],
    ["getElementById('export-panel')", "getElementById('yingli-export-panel')"],
    ["getElementById('ex-all-toggle')", "getElementById('yingli-ex-all-toggle')"],
    ["document.querySelectorAll('#analysis-modal .freq-btn')", "document.querySelectorAll('#yingli-analysis-modal .freq-btn')"],
    ["document.querySelector('#analysis-modal .freq-btn')", "document.querySelector('#yingli-analysis-modal .freq-btn')"],
    ["document.querySelectorAll('#analysis-modal .freq-btn')", "document.querySelectorAll('#yingli-analysis-modal .freq-btn')"],
    ["document.querySelectorAll('#full-table-body tr')", "document.querySelectorAll('#yingli-full-table-body tr')"],
    ["document.querySelectorAll('.ex-check')", "document.querySelectorAll('#yingli-export-panel .ex-check')"],
    ["document.querySelectorAll('.ex-check:checked')", "document.querySelectorAll('#yingli-export-panel .ex-check:checked')"]
  ];
  for (const [a, b] of pairs) {
    code = code.split(a).join(b);
  }

  code = code.split("if (id === 'an-point-dropdown')").join("if (id === 'yingli-an-point-dropdown')");
  code = code.split("if (id === 'an-region-dropdown')").join("if (id === 'yingli-an-region-dropdown')");

  code = code.replace(
    /document\.querySelectorAll\('\.custom-dropdown-content'\)/g,
    "document.querySelectorAll('#yingli-analysis-modal .custom-dropdown-content')"
  );

  code = code.replace(/id="met-an-/g, 'id="yingli-met-an-');
  code = code.replace(/for="met-an-/g, 'for="yingli-met-an-');
  code = code.replace(/id="ex-col-\$\{/g, 'id="yingli-ex-col-${');
  code = code.replace(/for="ex-col-\$\{/g, 'for="yingli-ex-col-${');

  code = code.replace(
    `    // 初始化监测点：默认全选
    const allGnssIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'GNSS');
    this.selectedPoints = [...allGnssIds];
    this.selectedStressSubTypes = ['锚索应力', '土压力计'];

// 初始勾选所有符合条件的应力点`,
    `    // 初始化监测点：默认全选（应力）
    this.selectedStressSubTypes = ['锚索应力', '土压力计'];

// 初始勾选所有符合条件的应力点`
  );

  code = code.replace(
    "this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'GNSS');\n        this.selectedGlobalMetrics = ['XY速度(mm/h)']; this.tMultiplier = 1;",
    "this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'STRESS');\n        this.selectedGlobalMetrics = ['XY速度(mm/h)']; this.tMultiplier = 1;"
  );

  code = code.replace(
    `        const metricBtn = document.getElementById('yingli-metric-select-btn');
        const metricMenu = document.getElementById('yingli-metric-items-container');
        if (metricMenu && metricMenu.style.display === 'block') {
            // 如果点击的既不是按钮本身，也不是菜单内部，则收起
            if (!metricBtn.contains(e.target) && !metricMenu.contains(e.target)) {
                metricMenu.style.display = 'none';
            }
        }`,
    `        const metricBtn = document.getElementById('yingli-metric-select-btn');
        const metricMenu = document.getElementById('yingli-metric-items-container');
        if (metricBtn && metricMenu && metricMenu.style.display === 'block') {
            if (!metricBtn.contains(e.target) && !metricMenu.contains(e.target)) {
                metricMenu.style.display = 'none';
            }
        }`
  );

  code = code.replace(
    'const sortedData = dashModule.getSortedGnssData();',
    "const sortedData = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'STRESS' && mapModule.pMeta[id]?.isOnline).map(id => ({ id }));"
  );

  code = code.replace(
    `        if (id === 'yingli-an-point-dropdown') {
            this.renderPoints('');
        } else if (id === 'yingli-an-region-dropdown') {
            this.renderRegions();
        }
    }
},`,
    `        if (id === 'yingli-an-point-dropdown') {
            this.renderPoints('');
        } else if (id === 'yingli-an-region-dropdown') {
            this.renderRegions();
        } else if (id === 'yingli-an-stress-sub-dropdown') {
            this.renderStressSubTypes();
        }
    }
},`
  );

  code = code.replace(/const analysisModule = \{/g, 'const ___yingliAnalysisModuleMarker___ = {');
  code = code.replace(/analysisModule\./g, 'window.yingliAnalysisModule.');
  code = code.replace(/const ___yingliAnalysisModuleMarker___ = \{/g, 'const analysisModule = {');

  return code;
}

function buildYingliModuleFromSource() {
  const text = yingliJsRaw.replace(/\r\n/g, '\n');
  const start = text.indexOf('const analysisModule = {');
  const end = text.indexOf('};\n\n\n// ========== 页面初始化', start);
  if (start === -1 || end === -1) {
    throw new Error('yingli.js: 未找到 analysisModule 块');
  }
  const body = text.slice(start, end + 2);
  const patched = patchYingliAnalysisSource(body);

  const factory = new Function('echarts', 'mapModule', `${patched}; return analysisModule;`);
  const mm = typeof window !== 'undefined' ? window.mapModule : undefined;
  return factory(echarts, mm);
}

let _impl;

export function getYingliAnalysisModule() {
  if (!_impl) {
    if (typeof window !== 'undefined' && !window.mapModule) {
      console.warn('[yingliAnalysis] window.mapModule 尚未就绪');
    }
    _impl = buildYingliModuleFromSource();
  }
  return _impl;
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'yingliAnalysisModule', {
    configurable: true,
    get() {
      return getYingliAnalysisModule();
    }
  });
}

export function getYingliModalMarkup() {
  const start = yingliHtmlRaw.indexOf('<div id="analysis-modal"');
  const end = yingliHtmlRaw.indexOf('<canvas id="bg-canvas"');
  if (start === -1 || end === -1) return '';
  let f = yingliHtmlRaw.slice(start, end);
  f = f.replace(/id="analysis-modal"/, 'id="yingli-analysis-modal" style="display:none"');
  f = f.replace(/id="export-panel"/, 'id="yingli-export-panel" style="display:none"');
  f = f.replace(/id="export-metric-list"/, 'id="yingli-export-metric-list"');
  f = f.replace(/id="ex-all-toggle"/, 'id="yingli-ex-all-toggle"');
  f = f.replace(/for="ex-all-toggle"/, 'for="yingli-ex-all-toggle"');
  f = f.replace(/id="an-region-btn"/, 'id="yingli-an-region-btn"');
  f = f.replace(/id="an-region-label"/, 'id="yingli-an-region-label"');
  f = f.replace(/id="an-region-dropdown"/, 'id="yingli-an-region-dropdown"');
  f = f.replace(/id="an-stress-sub-btn"/, 'id="yingli-an-stress-sub-btn"');
  f = f.replace(/id="an-stress-sub-label"/, 'id="yingli-an-stress-sub-label"');
  f = f.replace(/id="an-stress-sub-dropdown"/, 'id="yingli-an-stress-sub-dropdown"');
  f = f.replace(/id="an-point-input"/, 'id="yingli-an-point-input"');
  f = f.replace(/id="an-point-dropdown"/, 'id="yingli-an-point-dropdown"');
  f = f.replace(/id="an-start"/, 'id="yingli-an-start"');
  f = f.replace(/id="an-end"/, 'id="yingli-an-end"');
  f = f.replace(/id="curve-chart-main"/, 'id="yingli-curve-chart-main"');
  f = f.replace(/id="analysis-chart-title"/, 'id="yingli-analysis-chart-title"');
  f = f.replace(/id="an-table-freq"/, 'id="yingli-an-table-freq"');
  f = f.replace(/id="full-table-head"/, 'id="yingli-full-table-head"');
  f = f.replace(/id="full-table-body"/, 'id="yingli-full-table-body"');
  f = f.replace(/id="an-pagination"/, 'id="yingli-an-pagination"');
  f = f.replace(/toggleDropdown\('an-region-dropdown'/g, "toggleDropdown('yingli-an-region-dropdown'");
  f = f.replace(/toggleDropdown\('an-stress-sub-dropdown'/g, "toggleDropdown('yingli-an-stress-sub-dropdown'");
  f = f.replace(/toggleDropdown\('an-point-dropdown'/g, "toggleDropdown('yingli-an-point-dropdown'");
  f = f.replace(/analysisModule\./g, 'window.yingliAnalysisModule.');
  f = f.replace(/getElementById\('export-panel'\)/g, "getElementById('yingli-export-panel')");
  return f;
}
