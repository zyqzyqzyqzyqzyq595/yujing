import * as echarts from 'echarts';
import radarJsRaw from '../out/radar.js?raw';
import radarHtmlRaw from '../out/radar.html?raw';

/**
 * 从 out/radar.js 截取 analysisModule，为 DOM id 加 radar- 前缀，避免与 GNSS / 深部弹窗冲突。
 */
function patchRadarAnalysisSource(src) {
  let code = src.replace(/\r\n/g, '\n');

  const pairs = [
    ["getElementById('analysis-modal')", "getElementById('radar-analysis-modal')"],
    ["getElementById('an-start')", "getElementById('radar-an-start')"],
    ["getElementById('an-end')", "getElementById('radar-an-end')"],
    ["getElementById('export-panel')", "getElementById('radar-export-panel')"],
    ["getElementById('export-metric-list')", "getElementById('radar-export-metric-list')"],
    ["getElementById('curve-chart-main')", "getElementById('radar-curve-chart-main')"],
    ["getElementById('vector-chart-main')", "getElementById('radar-vector-chart-main')"],
    ["getElementById('full-table-head')", "getElementById('radar-full-table-head')"],
    ["getElementById('full-table-body')", "getElementById('radar-full-table-body')"],
    ["getElementById('metric-items-container')", "getElementById('radar-metric-items-container')"],
    ["getElementById('metric-btn-label')", "getElementById('radar-metric-btn-label')"],
    ["getElementById('an-virt-list-container')", "getElementById('radar-an-virt-list-container')"],
    ["getElementById('an-point-list-container')", "getElementById('radar-an-point-list-container')"],
    ["getElementById('an-radar-dropdown')", "getElementById('radar-an-radar-dropdown')"],
    ["getElementById('an-region-dropdown')", "getElementById('radar-an-region-dropdown')"],
    ["getElementById('an-virt-label')", "getElementById('radar-an-virt-label')"],
    ["document.querySelectorAll('.custom-dropdown-content')", "document.querySelectorAll('#radar-analysis-modal .custom-dropdown-content')"],
    ["document.querySelectorAll('.ex-check:checked')", "document.querySelectorAll('#radar-export-panel .ex-check:checked')"],
    ["document.querySelectorAll('.ex-check')", "document.querySelectorAll('#radar-export-panel .ex-check')"]
  ];
  for (const [a, b] of pairs) {
    code = code.split(a).join(b);
  }


  const strRepl = [
    ["'an-region-dropdown'", "'radar-an-region-dropdown'"],
    ["'an-radar-dropdown'", "'radar-an-radar-dropdown'"],
    ["'an-virt-list-container'", "'radar-an-virt-list-container'"],
    ["'an-point-list-container'", "'radar-an-point-list-container'"],
    ["'an-region-label'", "'radar-an-region-label'"],
    ["'an-radar-label'", "'radar-an-radar-label'"],
    ["'an-point-label'", "'radar-an-point-label'"],
    ["'traj-freq-dropdown'", "'radar-traj-freq-dropdown'"],
    ["'an-table-freq-dropdown'", "'radar-an-table-freq-dropdown'"],
    ["'metric-items-container'", "'radar-metric-items-container'"]
  ];
  for (const [a, b] of strRepl) {
    code = code.split(a).join(b);
  }

  code = code.replace(/onchange="analysisModule\./g, 'onchange="window.radarAnalysisModule.');
  code = code.replace(/onclick="analysisModule\./g, 'onclick="window.radarAnalysisModule.');
  code = code.replace(/oninput="analysisModule\./g, 'oninput="window.radarAnalysisModule.');
  code = code.replace(/analysisModule\.handleFreqChange/g, 'window.radarAnalysisModule.handleFreqChange');
  code = code.replace(/analysisModule\.handleMetricToggle/g, 'window.radarAnalysisModule.handleMetricToggle');



  return code;
}

function buildRadarModuleFromSource() {
  const text = radarJsRaw;
  const start = text.indexOf('const analysisModule = {');
  const end = text.indexOf(
    '\n};\n\n/* =========================================================\n   9. 初始化入口',
    start
  );
  if (start === -1 || end === -1) {
    throw new Error('radar.js: 未找到 analysisModule 块');
  }
  let body = text.slice(start, end + 3);
  body = patchRadarAnalysisSource(body);

  const factory = new Function('echarts', 'mapModule', `${body}; return analysisModule;`);
  const mm = typeof window !== 'undefined' ? window.mapModule : undefined;
  return factory(echarts, mm);
}

let _impl;

export function getRadarAnalysisModule() {
  if (!_impl) {
    if (typeof window !== 'undefined' && !window.mapModule) {
      console.warn('[radarAnalysis] window.mapModule 尚未就绪');
    }
    _impl = buildRadarModuleFromSource();
  }
  return _impl;
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'radarAnalysisModule', {
    configurable: true,
    get() {
      return getRadarAnalysisModule();
    }
  });
}

export function getRadarModalMarkup() {
  const start = radarHtmlRaw.indexOf('<!-- 分析弹窗 -->');
  const end = radarHtmlRaw.indexOf('<canvas id="bg-canvas"');
  if (start === -1 || end === -1) return '';
  let f = radarHtmlRaw.slice(start, end);
  f = f.replace(/id="analysis-modal"/, 'id="radar-analysis-modal" style="display:none"');
  f = f.replace(/id="export-panel"/, 'id="radar-export-panel" style="display:none"');
  f = f.replace(/id="export-metric-list"/, 'id="radar-export-metric-list"');
  f = f.replace(/id="an-/g, 'id="radar-an-');
  f = f.replace(/id="point-search-input"/, 'id="radar-point-search-input"');
  f = f.replace(/id="traj-freq-/g, 'id="radar-traj-freq-');
  f = f.replace(/id="metric-/g, 'id="radar-metric-');
  f = f.replace(/id="curve-chart-main"/, 'id="radar-curve-chart-main"');
  f = f.replace(/id="vector-chart-main"/, 'id="radar-vector-chart-main"');
  f = f.replace(/id="full-table-head"/, 'id="radar-full-table-head"');
  f = f.replace(/id="full-table-body"/, 'id="radar-full-table-body"');
  f = f.replace(/analysisModule\./g, 'window.radarAnalysisModule.');
  f = f.replace(/getElementById\('export-panel'\)/g, "getElementById('radar-export-panel')");
  const argFix = [
    ["'an-region-dropdown'", "'radar-an-region-dropdown'"],
    ["'an-radar-dropdown'", "'radar-an-radar-dropdown'"],
    ["'an-virt-dropdown'", "'radar-an-virt-dropdown'"],
    ["'an-point-dropdown'", "'radar-an-point-dropdown'"],
    ["'metric-items-container'", "'radar-metric-items-container'"],
    ["'traj-freq-dropdown'", "'radar-traj-freq-dropdown'"],
    ["'an-table-freq-dropdown'", "'radar-an-table-freq-dropdown'"]
  ];
  for (const [a, b] of argFix) {
    f = f.split(a).join(b);
  }
  // 👇 将这两行代码插入到 return 语句的正上方 👇

    // 强制把行变成 Grid 网格，一分为二，绝对不可能换行！
    f = f.replace(/class="chart-row"/g, 'class="chart-row" style="display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 15px !important; height: 350px !important; width: 100%; margin-bottom: 15px;"');

    // 强制限制盒子的最小宽度为 0，彻底打断 ECharts 瞎撑宽度的施法！
    f = f.replace(/class="chart-box"/g, 'class="chart-box" style="min-width: 0 !important; overflow: hidden;"');

    // 👆 插入结束 👆

    return f; // 原本代码末尾的 return (可能是 f，也可能是 html，请保持原样)
  return f;
}
