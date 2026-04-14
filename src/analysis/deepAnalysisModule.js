import * as echarts from 'echarts';
import 'echarts-gl';
import deepJsRaw from '../out/deep.js?raw';
import deepHtmlRaw from '../out/deep.html?raw';

/**
 * 从 src/deep/deep.js 截取 analysisModule，修补 DOM id / 设备类型（DEEP）后与 GNSS 弹窗共存。
 */
function patchAnalysisSource(src) {
  let code = src.replace(/\r\n/g, '\n');

  code = code.replace(/m\.type === 'SJ'/g, "m.type === 'DEEP'");
  code = code.replace(
    /if \(\/\\^\\d\+\\$\/\.test\(part\)\) targetId = 'SJ' \+ part;/g,
    "if (/^\\d+$/.test(part)) targetId = 'DEEP' + part;"
  );

  const idReplacements = [
    ["getElementById('analysis-modal')", "getElementById('deep-analysis-modal')"],
    ["getElementById('an-start')", "getElementById('deep-an-start')"],
    ["getElementById('an-end')", "getElementById('deep-an-end')"],
    ["getElementById('an-region')", "getElementById('deep-an-region')"],
    ["getElementById('an-device-input')", "getElementById('deep-an-device-input')"],
    ["getElementById('device-items-container')", "getElementById('deep-device-items-container')"],
    ["getElementById('export-panel')", "getElementById('deep-export-panel')"],
    ["getElementById('export-metric-list')", "getElementById('deep-export-metric-list')"],
    ["getElementById('traj-freq')", "getElementById('deep-traj-freq')"],
    ["getElementById('an-table-freq')", "getElementById('deep-an-table-freq')"],
    ["getElementById('tab-' + tabId)", "getElementById('deep-tab-' + tabId)"],
    ["'tab-' + tabId", "'deep-tab-' + tabId"],
    ["document.querySelectorAll('.tab-item')", "document.querySelectorAll('#deep-analysis-modal .tab-item')"],
    ["document.querySelectorAll('.tab-content')", "document.querySelectorAll('#deep-analysis-modal .tab-content')"],
    ["document.querySelector('.tab-item.active')", "document.querySelector('#deep-analysis-modal .tab-item.active')"],
    ["document.querySelector('#tab-", "document.querySelector('#deep-tab-"],
    ["document.querySelector('.data-indicators')", "document.querySelector('#deep-analysis-modal .data-indicators')"],
    ["document.querySelectorAll('.indicator-item')", "document.querySelectorAll('#deep-analysis-modal .indicator-item')"],
    ["document.querySelectorAll('.time-btn')", "document.querySelectorAll('#deep-analysis-modal .time-btn')"],
    ["document.querySelectorAll('.ex-check')", "document.querySelectorAll('#deep-export-panel .ex-check')"]
  ];
  for (const [a, b] of idReplacements) {
    code = code.split(a).join(b);
  }

  code = code.replace(/\|\| 'SJ45'/g, "|| 'DEEP0'");
  code = code.replace(/selectedDevices: \['SJ45'\]/, 'selectedDevices: []');

  code = code.replace(
    `            // 默认选中SJ45
            this.selectedDevices = ['SJ45'];
            this.selectedMetricsMap = {
                'SJ45': (this.selectedGlobalMetrics && this.selectedGlobalMetrics.length > 0 ? [...this.selectedGlobalMetrics] : ['XY速度(mm/h)'])
            };`,
    `            { const _dd = Object.values(mapModule.pMeta).filter(m => m.type === 'DEEP')[0];
            this.selectedDevices = _dd ? [_dd.deviceId] : [];
            this.selectedMetricsMap = _dd ? {
                [_dd.deviceId]: (this.selectedGlobalMetrics && this.selectedGlobalMetrics.length > 0 ? [...this.selectedGlobalMetrics] : ['XY速度(mm/h)'])
            } : {};
            }`
  );

  code = code.replace(
    `            // 如果输入框为空，保持默认选中SJ45
            this.selectedDevices = ['SJ45'];
            if (!this.selectedMetricsMap['SJ45']) {
                this.selectedMetricsMap['SJ45'] = (this.selectedGlobalMetrics && this.selectedGlobalMetrics.length > 0) ?
                    [...this.selectedGlobalMetrics] : ['XY速度(mm/h)'];
            }`,
    `            { const _dd = Object.values(mapModule.pMeta).filter(m => m.type === 'DEEP')[0];
            this.selectedDevices = _dd ? [_dd.deviceId] : [];
            if (_dd && !this.selectedMetricsMap[_dd.deviceId]) {
                this.selectedMetricsMap[_dd.deviceId] = (this.selectedGlobalMetrics && this.selectedGlobalMetrics.length > 0) ?
                    [...this.selectedGlobalMetrics] : ['XY速度(mm/h)'];
            }
            }`
  );

  code = code.replace(/onchange="analysisModule\./g, 'onchange="window.deepAnalysisModule.');
  code = code.replace(/onclick="analysisModule\./g, 'onclick="window.deepAnalysisModule.');
  code = code.replace(/onfocus="analysisModule\./g, 'onfocus="window.deepAnalysisModule.');
  code = code.replace(/oninput="analysisModule\./g, 'oninput="window.deepAnalysisModule.');
  code = code.replace(/analysisModule\.handleDeviceToggle/g, 'window.deepAnalysisModule.handleDeviceToggle');
  code = code.replace(/analysisModule\.handleMetricToggle/g, 'window.deepAnalysisModule.handleMetricToggle');

  return code;
}

function buildModuleFromDeepJs() {
  const text = deepJsRaw;
  const start = text.indexOf('const analysisModule = ');
  const end = text.indexOf('\n};\n\nwindow.onload', start);
  if (start === -1 || end === -1) {
    throw new Error('deep.js: 未找到 analysisModule 块');
  }
  let body = text.slice(start, end + 3);
  body = patchAnalysisSource(body);

  const factory = new Function('echarts', 'mapModule', `${body}; return analysisModule;`);
  const mm = typeof window !== 'undefined' ? window.mapModule : undefined;
  const mod = factory(echarts, mm);

  const noop = () => {};
  mod.renderMetricSelector = noop;
  mod.updateMetricButtonLabel = noop;
  mod.toggleMetricMenu = noop;
  mod.renderCurveChart = noop;
  mod.renderVectorChart = noop;
  mod.renderTable = noop;
  mod.exportChart = noop;
  mod.openExportDialog = noop;
  mod.doExport = noop;
  mod.toggleAllExport = noop;

  mod.query = function deepQuery() {
    const startInput = document.getElementById('deep-an-start');
    const endInput = document.getElementById('deep-an-end');
    if (!startInput || !endInput) return;
    const start = new Date(startInput.value);
    const end = new Date(endInput.value);
    const now = new Date();
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
    if (start >= end) {
      alert('时间选择错误：起始时间不得晚于或等于结束时间。');
      return;
    }
    if (end > now) {
      alert('终止时间不得晚于当下时刻，请重新调整时间范围。');
      return;
    }
    if (!this.selectedDevices || this.selectedDevices.length === 0) return;
    const activeTab = document.querySelector('#deep-analysis-modal .tab-item.active');
    if (!activeTab) return;
    const tabId = activeTab.getAttribute('data-tab');
    if (tabId === 'datapoint') this.initDataPointCharts();
    else if (tabId === 'posture') this.init3DPostureChart();
    else if (tabId === 'trend') this.initTrendCharts();
    else if (tabId === 'cluster') this.initClusterCharts();
    else if (tabId === 'nodedisp') this.initNodeDispCharts();
    else if (tabId === 'trajectory') setTimeout(() => this.initTrajectoryCharts(), 80);
    else if (tabId === 'nodetemp') this.initNodetempCharts();
    else if (tabId === 'tempfield') this.initTempfieldCharts();
    else if (tabId === 'angle') this.initAngleCharts();
  };

  return mod;
}

let _impl;

export function getDeepAnalysisModule() {
  if (!_impl) {
    if (typeof window !== 'undefined' && !window.mapModule) {
      console.warn('[deepAnalysis] window.mapModule 尚未就绪');
    }
    _impl = buildModuleFromDeepJs();
  }
  return _impl;
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'deepAnalysisModule', {
    configurable: true,
    get() {
      return getDeepAnalysisModule();
    }
  });
}

/** 从 deep.html 取出两个模态框片段并替换 id / onclick，供大屏挂载 */
export function getDeepModalMarkup() {
  const start = deepHtmlRaw.indexOf('<!-- 数据分析模态框 -->');
  const end = deepHtmlRaw.indexOf('</body>');
  if (start === -1 || end === -1) return '';
  let fragment = deepHtmlRaw.slice(start, end);
  fragment = fragment
    .replace(/id="analysis-modal"/g, 'id="deep-analysis-modal"')
    .replace(/id="an-start"/g, 'id="deep-an-start"')
    .replace(/id="an-end"/g, 'id="deep-an-end"')
    .replace(/id="an-region"/g, 'id="deep-an-region"')
    .replace(/id="an-device-input"/g, 'id="deep-an-device-input"')
    .replace(/id="device-items-container"/g, 'id="deep-device-items-container"')
    .replace(/id="export-panel"/g, 'id="deep-export-panel"')
    .replace(/id="export-metric-list"/g, 'id="deep-export-metric-list"')
    .replace(/id="tab-/g, 'id="deep-tab-')
    .replace(/analysisModule\./g, 'window.deepAnalysisModule.')
    .replace(/getElementById\('export-panel'\)/g, "getElementById('deep-export-panel')");
  fragment = fragment.replace(
    /id="deep-analysis-modal"/,
    'id="deep-analysis-modal" style="display:none"'
  );
  fragment = fragment.replace(/id="deep-export-panel"/, 'id="deep-export-panel" style="display:none"');
  return fragment;
}
