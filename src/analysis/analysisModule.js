import * as echarts from 'echarts';

/**
 * GNSS 数据分析模块（自 COMBINE/index.js analysisModule 迁移）
 * 依赖 window.mapModule / window.connectionModule / window.dashModule / window.timeUtils（由 map.vue 挂载）
 */
export const analysisModule = {
  charts: { curve: null, vector: null },
  selectedMetricsMap: {},
  selectedRegions: ['全部'],
  selectedPoints: [],
  selectedLines: ['全部'],
  selectedGlobalMetrics: ['XY速度(mm/h)'],
  tMultiplier: 1,
  tableFreq: 'hour',
  metricPage: 1,
  metricPageSize: 6,
  allLines: ['全部', '1号线', '2号线', '3号线', '4号线'],
  allMetrics: [
    'X速度(mm/h)', 'Y速度(mm/h)', 'H速度(mm/h)', 'XY速度(mm/h)', 'XYH速度(mm/h)',
    'X位移(mm)', 'Y位移(mm)', 'H位移(mm)', 'XY位移(mm)', 'XYH位移(mm)',
    'X累积位移(mm)', 'Y累积位移(mm)', 'H累积位移(mm)', 'XY累积位移(mm)', 'XYH累积位移(mm)',
    'X加速度(mm/h²)', 'Y加速度(mm/h²)', 'H加速度(mm/h²)', '切线角（°）'
  ],
  deviceColors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'],
  lineStyles: ['solid', 'dashed', 'dotted', 'dashDot'],

  setQuickTime(days, btn) {
    document.querySelectorAll('#analysis-modal .freq-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const now = new Date();
    const start = new Date();
    if (days === 1) {
      start.setTime(now.getTime() - 24 * 60 * 60 * 1000);
    } else {
      start.setDate(now.getDate() - days);
      start.setHours(0, 0, 0, 0);
    }
    const offset = now.getTimezoneOffset() * 60000;
    const formatISO = (d) => new Date(d - offset).toISOString().slice(0, 16);
    document.getElementById('an-start').value = formatISO(start);
    document.getElementById('an-end').value = formatISO(now);
    this.tMultiplier = Math.max(0.1, (now - start) / (24 * 3600000));
    this.query();
  },

  initFilter() {
    if (this.filterInited) return;
    this.filterInited = true;
    window.addEventListener('click', (e) => {
      if (!e.target.closest('.filter-group') && !e.target.closest('.custom-dropdown-content')) {
        document.querySelectorAll('.custom-dropdown-content').forEach(d => { d.style.display = 'none'; });
      }
      const metricBtn = document.getElementById('metric-select-btn');
      const metricMenu = document.getElementById('metric-items-container');
      if (metricMenu && metricMenu.style.display === 'block') {
        if (!metricBtn.contains(e.target) && !metricMenu.contains(e.target)) {
          metricMenu.style.display = 'none';
        }
      }
    });
    const allRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
    this.selectedRegions = [...allRegions];
    this.selectedLines = ['全部', '1号线', '2号线', '3号线', '4号线'];
    const allLinePoints = [];
    if (window.connectionModule && window.connectionModule.detectionLines) {
      window.connectionModule.detectionLines.forEach(line => {
        line.points.forEach(p => allLinePoints.push(p.id));
      });
    }
    this.selectedPoints = [...new Set(allLinePoints)];
    this.selectedGlobalMetrics = [...this.allMetrics];
    this.renderMetricSelector();
    this.updateMetricButtonLabel();
    this.syncFilterUI();
  },

  toggleDropdown(id, e) {
    if (e) e.stopPropagation();
    const el = document.getElementById(id);
    if (!el) return;
    const isShow = el.style.display === 'block';
    document.querySelectorAll('.custom-dropdown-content').forEach(d => { d.style.display = 'none'; });
    el.style.display = isShow ? 'none' : 'block';
    if (el.style.display === 'block') {
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        el.style.left = 'auto';
        el.style.right = '0';
      }
      if (id === 'an-point-dropdown') this.renderPoints('');
      else if (id === 'an-region-dropdown') this.renderRegions();
      else if (id === 'an-line-dropdown') this.renderLines();
    }
  },

  handleItemClick(el, event, type) {
    if (event) event.stopPropagation();
    if (event.target.tagName === 'INPUT') return;
    const cb = el.querySelector('input[type="checkbox"]');
    if (cb) {
      cb.checked = !cb.checked;
      type === 'region' ? this.handleRegionChange(cb) : this.handlePointChange(cb);
    }
  },

  formatLabel(list) {
    if (!list || list.length === 0) return '选择区域';
    return list.length <= 2 ? list.join('、') : `${list.slice(0, 2).join('、')}...`;
  },

  renderRegions() {
    const regions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
    const container = document.getElementById('an-region-dropdown');
    if (!container) return;
    container.innerHTML = regions.map(reg => `
            <div class="custom-dropdown-item" onclick="window.analysisModule.handleItemClick(this, event, 'region')">
                <input type="checkbox" value="${reg}" ${this.selectedRegions.includes(reg) ? 'checked' : ''} onchange="window.analysisModule.handleRegionChange(this)">
                <span style="${reg === '全部' ? 'font-weight:bold; color:#1c3d90;' : ''}">${reg}</span>
            </div>`).join('');
  },

  renderLines() {
    const container = document.getElementById('an-line-dropdown');
    if (!container) return;
    const regToLineMap = { '北帮': '1号线', '南帮': '2号线', '东帮': '3号线', '西帮': '4号线' };
    const activeRegs = this.selectedRegions.filter(r => r !== '全部');
    let displayLines = ['全部'];
    const allAvailableLines = ['1号线', '2号线', '3号线', '4号线'];
    if (activeRegs.length > 0 && !this.selectedRegions.includes('全部')) {
      activeRegs.forEach(r => {
        if (regToLineMap[r]) displayLines.push(regToLineMap[r]);
      });
    } else {
      displayLines = ['全部', ...allAvailableLines];
    }
    const currentLinesOnly = displayLines.filter(l => l !== '全部');
    const isAllChecked = currentLinesOnly.length > 0 && currentLinesOnly.every(l => this.selectedLines.includes(l));
    container.innerHTML = displayLines.map(line => `
        <div class="custom-dropdown-item" onclick="window.analysisModule.handleLineItemClick(this, event)">
            <input type="checkbox" value="${line}" ${(line === '全部' ? isAllChecked : this.selectedLines.includes(line)) ? 'checked' : ''} onchange="window.analysisModule.handleLineChange(this)">
            <span style="${line === '全部' ? 'font-weight:bold; color:#1c3d90;' : ''}">${line === '全部' ? '全部' : line}</span>
        </div>`).join('');
  },

  getDisplayPoints(filterVal = '') {
    const allGnss = Object.keys(window.mapModule.pMeta)
      .filter(id => window.mapModule.pMeta[id]?.type === 'GNSS')
      .map(id => ({ id, ...window.mapModule.pMeta[id] }));
    let list = [];
    if (this.selectedRegions.includes('全部')) {
      list = allGnss;
    } else {
      list = allGnss.filter(p => this.selectedRegions.includes(p.region));
    }
    let allowedDeviceIds = null;
    if (window.connectionModule) {
      allowedDeviceIds = window.connectionModule.getDevicesByLines(this.selectedLines);
    }
    if (allowedDeviceIds && allowedDeviceIds.length > 0) {
      list = list.filter(p => allowedDeviceIds.includes(p.id));
    }
    if (filterVal && filterVal !== '全部' && !filterVal.includes('、')) {
      list = list.filter(p =>
        p.deviceId.toLowerCase().includes(filterVal.toLowerCase()) ||
        p.deviceId.replace('GNSS', '').includes(filterVal)
      );
    }
    return list;
  },

  renderPoints(filterVal = '') {
    const container = document.getElementById('an-point-dropdown');
    if (!container) return;
    const displayList = this.getDisplayPoints(filterVal);
    const isAllChecked = displayList.length > 0 && displayList.every(p => this.selectedPoints.includes(p.id));
    const allHtml = `
        <div class="custom-dropdown-item" style="border-bottom: 1px solid #eee; margin-bottom: 5px;" onclick="window.analysisModule.handleItemClick(this, event, 'point')">
            <input type="checkbox" value="全部" ${isAllChecked ? 'checked' : ''} onchange="window.analysisModule.handlePointChange(this)">
            <span style="font-weight:bold; color:#1c3d90;">全部</span>
        </div>`;
    const itemsHtml = displayList.map(p => `
        <div class="custom-dropdown-item" onclick="window.analysisModule.handleItemClick(this, event, 'point')">
            <input type="checkbox" value="${p.id}" ${this.selectedPoints.includes(p.id) ? 'checked' : ''} onchange="window.analysisModule.handlePointChange(this)">
            <span>${p.deviceId} <small style="color:#999">(${p.region})</small></span>
        </div>`).join('');
    container.innerHTML = displayList.length > 0 ? (allHtml + itemsHtml) : '<div style="padding:10px; color:#999; text-align:center;">当前区域内暂无监测点</div>';
  },

  handleRegionChange(cb) {
    const val = cb.value;
    const allRegions = ['北帮', '南帮', '东帮', '西帮', '中央区'];
    const allGnssIds = Object.keys(window.mapModule.pMeta).filter(id => window.mapModule.pMeta[id]?.type === 'GNSS');
    const regToLineMap = { '北帮': '1号线', '南帮': '2号线', '东帮': '3号线', '西帮': '4号线' };
    if (val === '全部') {
      if (cb.checked) {
        this.selectedRegions = ['全部', ...allRegions];
        this.selectedPoints = [...allGnssIds];
        this.selectedLines = ['全部', '1号线', '2号线', '3号线', '4号线'];
      } else {
        this.selectedRegions = [];
        this.selectedPoints = [];
        this.selectedLines = [];
      }
    } else {
      if (cb.checked) {
        this.selectedRegions = this.selectedRegions.filter(r => r !== '全部');
        if (!this.selectedRegions.includes(val)) this.selectedRegions.push(val);
        allGnssIds.filter(id => window.mapModule.pMeta[id]?.region === val).forEach(id => {
          if (!this.selectedPoints.includes(id)) this.selectedPoints.push(id);
        });
        if (regToLineMap[val] && !this.selectedLines.includes(regToLineMap[val])) {
          this.selectedLines.push(regToLineMap[val]);
        }
        if (this.selectedRegions.length === 5) this.selectedRegions.push('全部');
      } else {
        this.selectedRegions = this.selectedRegions.filter(r => r !== val && r !== '全部');
        const regionPoints = allGnssIds.filter(id => window.mapModule.pMeta[id]?.region === val);
        this.selectedPoints = this.selectedPoints.filter(id => !regionPoints.includes(id));
        if (regToLineMap[val]) {
          this.selectedLines = this.selectedLines.filter(l => l !== regToLineMap[val] && l !== '全部');
        }
      }
    }
    this.renderLines();
    this.syncFilterUI();
    this.query();
  },

  renderRegionSelector() { this.renderRegions(); },
  updateRegionButtonLabel() { this.syncFilterUI(); },

  handleRegionToggle(val, cb) {
    if (val === '全部') {
      this.selectedRegions = cb.checked ? ['全部', '北帮', '南帮', '西帮', '东帮', '中央区'] : [];
    } else {
      if (cb.checked) {
        if (!this.selectedRegions.includes(val)) this.selectedRegions.push(val);
      } else {
        this.selectedRegions = this.selectedRegions.filter(r => r !== val && r !== '全部');
      }
    }
    this.renderRegionSelector();
    this.updateRegionButtonLabel();
  },

  handlePointChange(cb) {
    const val = cb.value;
    const currentVisibleList = this.getDisplayPoints('');
    const currentVisibleIds = currentVisibleList.map(p => p.id);
    if (val === '全部') {
      if (cb.checked) {
        currentVisibleList.forEach(p => {
          if (!this.selectedPoints.includes(p.id)) this.selectedPoints.push(p.id);
        });
      } else {
        this.selectedPoints = this.selectedPoints.filter(id => !currentVisibleIds.includes(id));
      }
    } else {
      if (cb.checked) {
        if (!this.selectedPoints.includes(val)) this.selectedPoints.push(val);
      } else {
        this.selectedPoints = this.selectedPoints.filter(p => p !== val);
      }
    }
    this.syncFilterUI();
    this.query();
  },

  handleLineChange(cb) {
    const val = cb.value;
    const isChecked = cb.checked;
    if (val === '全部') {
      this.selectedLines = isChecked ? ['全部', '1号线', '2号线', '3号线', '4号线'] : [];
      if (isChecked) {
        window.connectionModule.detectionLines.forEach(line => {
          line.points.forEach(p => {
            if (!this.selectedPoints.includes(p.id)) this.selectedPoints.push(p.id);
          });
        });
      }
    } else {
      if (isChecked) {
        if (!this.selectedLines.includes(val)) this.selectedLines.push(val);
        const targetLine = window.connectionModule.detectionLines.find(l => l.name === val);
        if (targetLine) {
          targetLine.points.forEach(p => {
            if (!this.selectedPoints.includes(p.id)) this.selectedPoints.push(p.id);
          });
        }
      } else {
        this.selectedLines = this.selectedLines.filter(l => l !== val && l !== '全部');
      }
      const activeLines = this.selectedLines.filter(l => l !== '全部');
      if (activeLines.length === 4) this.selectedLines.push('全部');
    }
    this.syncFilterUI();
    this.query();
  },

  handleLineItemClick(el, event) {
    if (event) event.stopPropagation();
    if (event.target.tagName === 'INPUT') return;
    const cb = el.querySelector('input[type="checkbox"]');
    if (cb) {
      cb.checked = !cb.checked;
      this.handleLineChange(cb);
    }
  },

  filterPointList(val) { this.renderPoints(val); },

  handlePointInput() {
    const val = document.getElementById('an-point-input')?.value.trim();
    const allGnss = Object.keys(window.mapModule.pMeta).filter(id => window.mapModule.pMeta[id]?.type === 'GNSS');
    if (!val || val === '全部') {
      this.selectedPoints = (val === '全部') ? [...allGnss] : [];
      this.selectedRegions = (val === '全部') ? ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'] : [];
    } else {
      const parts = val.split(/[、,，\s]/).map(p => p.trim()).filter(p => p !== '');
      this.selectedPoints = []; this.selectedRegions = [];
      parts.forEach(part => {
        const matchedId = allGnss.find(id => window.mapModule.pMeta[id]?.deviceId?.replace('GNSS', '') === part.replace(/GNSS/i, ''));
        if (matchedId) {
          if (!this.selectedPoints.includes(matchedId)) this.selectedPoints.push(matchedId);
          if (!this.selectedRegions.includes(window.mapModule.pMeta[matchedId].region)) this.selectedRegions.push(window.mapModule.pMeta[matchedId].region);
        }
      });
      if (this.selectedRegions.length === 5) this.selectedRegions.push('全部');
    }
    this.syncFilterUI(); this.query();
  },

  syncFilterUI() {
    const regionLabel = document.getElementById('an-region-label');
    if (regionLabel) {
      const activeRegs = this.selectedRegions.filter(r => r !== '全部');
      if (this.selectedRegions.includes('全部') && activeRegs.length >= 5) {
        regionLabel.innerText = '全部区域';
      } else {
        regionLabel.innerText = this.formatLabel(activeRegs) || '选择区域';
      }
    }
    const lineLabel = document.getElementById('an-line-label');
    if (lineLabel) {
      const activeLines = this.selectedLines.filter(l => l !== '全部');
      if (this.selectedLines.includes('全部') && activeLines.length >= 4) {
        lineLabel.innerText = '全部监测线';
      } else {
        lineLabel.innerText = this.formatLabel(activeLines) || '选择监测线';
      }
    }
    const input = document.getElementById('an-point-input');
    if (input) {
      const allGnssCount = Object.keys(window.mapModule.pMeta).filter(id => window.mapModule.pMeta[id]?.type === 'GNSS').length;
      if (this.selectedPoints.length > 0 && this.selectedPoints.length >= allGnssCount) {
        input.value = '全部';
      } else {
        const names = this.selectedPoints.map(id => window.mapModule.pMeta[id]?.deviceId?.replace('GNSS', ''));
        input.value = names.join('、');
      }
    }
    this.renderRegions();
    this.renderLines();
    this.renderPoints('');
  },

  getLogicData(devId, timestamp, metricIdx = 0) {
    const meta = window.mapModule.pMeta[devId] || { alarmIdx: 4 };
    const seed = parseInt(devId.replace('pt-', ''), 10) || 0;
    const multiplier = this.tMultiplier || 1;
    let baseSpeed = [8.5, 5.5, 4.2, 3.2, 0.6][meta.alarmIdx] || 0.6;
    baseSpeed += (seed % 10) * 0.05 + (metricIdx * 0.02);
    const phase = seed * 1.5 + metricIdx;
    const wave = Math.sin(timestamp / 3600000 + phase);
    const noise = Math.sin(timestamp / 600000 * (seed % 5 + 1)) * 0.1;
    if (metricIdx >= 5 && metricIdx < 10) {
      return parseFloat((baseSpeed * 24 * multiplier * (0.8 + noise)).toFixed(2));
    }
    if (metricIdx >= 10 && metricIdx < 15) {
      return parseFloat((baseSpeed * 48 * multiplier * (1 + noise * 0.2)).toFixed(2));
    }
    if (metricIdx >= 15 && metricIdx < 18) {
      return parseFloat((Math.cos(timestamp / 3600000 + phase) * 0.05 + noise * 0.1).toFixed(3));
    }
    if (metricIdx === 18) {
      const angleBase = 15 + (seed % 30);
      return parseFloat((angleBase + wave * 5).toFixed(1));
    }
    return parseFloat(Math.max(0.01, baseSpeed + wave * 0.5 + noise).toFixed(2));
  },

  open(targetMeta) {
    const modal = document.getElementById('analysis-modal');
    if (modal) modal.style.display = 'flex';
    this.initFilter();
    if (typeof window.timeUtils !== 'undefined') window.timeUtils.updateMaxConstraints();

    const modalBtns = document.querySelectorAll('#analysis-modal .freq-btn');

    if (targetMeta) {
      const homeStart = document.getElementById('date-start')?.value;
      const homeEnd = document.getElementById('date-end')?.value;
      if (homeStart && homeEnd) {
        document.getElementById('an-start').value = homeStart;
        document.getElementById('an-end').value = homeEnd;
      }
      const homeActiveBtn = document.querySelector('#time-engine-bar .freq-btn.active');
      if (homeActiveBtn) {
        const btnText = homeActiveBtn.innerText;
        const matchBtn = Array.from(modalBtns).find(b => b.innerText === btnText);
        if (matchBtn) matchBtn.classList.add('active');
      }
      this.selectedPoints = [targetMeta.id];
      this.selectedRegions = [targetMeta.region];
      this.selectedLines = [];
      if (window.connectionModule && window.connectionModule.detectionLines) {
        const parentLine = window.connectionModule.detectionLines.find(line =>
          line.points.some(p => p.id === targetMeta.id)
        );
        if (parentLine) this.selectedLines = [parentLine.name];
      }
    } else {
      const modalOneDayBtn = document.querySelector('#analysis-modal .freq-btn');
      if (modalOneDayBtn) this.setQuickTime(1, modalOneDayBtn);
      const sortedData = window.dashModule.getSortedGnssData();
      if (sortedData.length > 0) {
        const firstMeta = window.mapModule.pMeta[sortedData[0].id];
        this.selectedPoints = [firstMeta.id];
        this.selectedRegions = [firstMeta.region];
        this.selectedLines = [];
        if (window.connectionModule && window.connectionModule.detectionLines) {
          const parentLine = window.connectionModule.detectionLines.find(line =>
            line.points.some(p => p.id === firstMeta.id)
          );
          if (parentLine) this.selectedLines = [parentLine.name];
        }
        targetMeta = firstMeta;
      }
    }

    this.handleManualTimeChange();
    this.syncFilterUI();
    if (targetMeta) {
      const input = document.getElementById('an-point-input');
      if (input) input.value = targetMeta.deviceId.replace('GNSS', '');
    }
    this.query();
  },

  handleManualTimeChange() {
    document.querySelectorAll('#analysis-modal .freq-btn').forEach(btn => btn.classList.remove('active'));
    const sInp = document.getElementById('an-start');
    const eInp = document.getElementById('an-end');
    const now = new Date();
    if (sInp.value && eInp.value) {
      const start = new Date(sInp.value);
      const end = new Date(eInp.value);
      if (start > now || end > now) {
        alert('所选时间不得晚于当前时刻');
        this.setQuickTime(1, document.querySelector('#analysis-modal .freq-btn'));
        return;
      }
      if (start.getTime() === end.getTime()) {
        alert('起始时间与终止时间不得相同');
        return;
      }
      if (start > end) {
        alert('初始时间不得晚于终止时间');
        return;
      }
      this.tMultiplier = Math.max(0.1, (end - start) / (24 * 3600000));
    }
  },

  close() { document.getElementById('analysis-modal').style.display = 'none'; },
  query() { this.renderCurveChart(); this.renderVectorChart(); this.renderTable(); },

  renderCurveChart() {
    const el = document.getElementById('curve-chart-main');
    if (!el) return;
    if (this.charts.curve) {
      this.charts.curve.dispose();
      this.charts.curve = null;
    }
    if (this.selectedPoints.length === 0) return;
    this.charts.curve = echarts.init(el);
    const startVal = document.getElementById('an-start').value;
    const endVal = document.getElementById('an-end').value;
    const start = new Date(startVal); const end = new Date(endVal);
    const totalHours = (end - start) / 3600000;
    let stepMs = totalHours <= 24 ? 1800000 : (totalHours <= 744 ? 3600000 : 86400000);
    const metricStyles = [
      { type: 'solid', width: 3 },
      { type: [10, 5], width: 2.5 },
      { type: [2, 4], width: 2 },
      { type: [10, 4, 2, 4], width: 2.5 },
      { type: [10, 4, 2, 4, 2, 4], width: 2.5 }
    ];
    const series = [];
    this.selectedPoints.forEach((devId, pIdx) => {
      const meta = window.mapModule.pMeta[devId] || { deviceId: devId };
      const baseColor = this.deviceColors[pIdx % this.deviceColors.length];
      this.selectedGlobalMetrics.forEach((metric, mIdx) => {
        const metricFullIdx = this.allMetrics.indexOf(metric);
        const dataPoints = [];
        for (let t = start.getTime(); t <= end.getTime(); t += stepMs) {
          dataPoints.push([t, this.getLogicData(devId, t, metricFullIdx)]);
        }
        const style = metricStyles[mIdx % metricStyles.length];
        series.push({
          name: `${meta.deviceId}-${metric}`,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: dataPoints,
          lineStyle: { color: baseColor, width: style.width, type: style.type },
          itemStyle: { color: baseColor }
        });
      });
    });
    this.charts.curve.setOption({
      tooltip: {
        trigger: 'axis',
        confine: true,
        axisPointer: { type: 'cross' },
        enterable: true,
        extraCssText: 'z-index: 999999 !important;padding: 0 !important;border: 1px solid #1c3d90 !important;background: rgba(255, 255, 255, 0.98) !important;box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;pointer-events: auto !important;',
        formatter(params) {
          if (!params || params.length === 0) return '';
          const time = params[0].axisValueLabel;
          let html = `<div style="padding: 8px 12px; background: #f8fbff; border-bottom: 1px solid #eee; font-weight: bold; color: #1c3d90;">${time}</div><div style="max-height: 250px; overflow-y: auto; padding: 10px; pointer-events: auto;">`;
          params.forEach(item => {
            html += `<div style="display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 6px;"><div style="display: flex; align-items: center; gap: 8px;"><span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${item.color};"></span><span style="font-size: 12px; color: #555;">${item.seriesName}</span></div><b style="font-size: 12px; color: #1c3d90;">${item.value[1]}</b></div>`;
          });
          html += '</div>';
          return html;
        }
      },
      legend: { top: '5%', type: 'scroll', pageIconSize: 12, textStyle: { fontSize: 12 } },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, zoomOnMouseWheel: true, moveOnMouseMove: true },
        { type: 'slider', height: 20, bottom: 5, xAxisIndex: 0 }
      ],
      grid: { top: 80, bottom: 60, left: 60, right: 40 },
      xAxis: { type: 'time', axisLabel: { color: '#888', fontSize: 11 }, splitLine: { show: true, lineStyle: { color: '#f0f0f0' } } },
      yAxis: { type: 'value', scale: true, axisLabel: { color: '#888' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
      series
    });
  },

  renderVectorChart() {
    const el = document.getElementById('vector-chart-main');
    if (!el || !this.charts) return;
    if (this.charts.vector) {
      this.charts.vector.dispose();
      this.charts.vector = null;
    }
    if (this.selectedPoints.length === 0) return;
    this.charts.vector = echarts.init(el);
    const start = new Date(document.getElementById('an-start').value);
    const end = new Date(document.getElementById('an-end').value);
    const freqType = document.getElementById('traj-freq').value;
    const freqMs = { hour: 3600000, day: 86400000, week: 604800000 }[freqType];
    const segments = Math.floor((end - start) / freqMs);
    const pointCount = segments + 1;
    const series = this.selectedPoints.map((devId, pIdx) => {
      const meta = window.mapModule.pMeta[devId] || { alarmIdx: 4 };
      const seed = parseInt(devId.replace('pt-', ''), 10) || 0;
      const baseAngle = (seed * 137.5) % 360;
      const speed = [2.2, 1.8, 1.2, 0.8, 0.3][meta.alarmIdx] || 0.3;
      const baseColor = this.deviceColors[pIdx % this.deviceColors.length];
      let curX = 0; let curY = 0;
      const pathData = [{ value: [0, 0], symbol: 'none' }];
      for (let i = 1; i < pointCount; i++) {
        const dx = Math.cos(baseAngle * Math.PI / 180) * speed + (Math.random() - 0.5) * 0.2;
        const dy = Math.sin(baseAngle * Math.PI / 180) * speed + (Math.random() - 0.5) * 0.2;
        curX += dx;
        curY += dy;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI - 90;
        pathData.push({
          value: [parseFloat(curX.toFixed(2)), parseFloat(curY.toFixed(2))],
          symbol: 'arrow',
          symbolRotate: angle,
          symbolSize: 8
        });
      }
      return {
        name: meta.deviceId,
        type: 'line',
        smooth: false,
        data: pathData,
        lineStyle: { width: 2, color: baseColor },
        itemStyle: { color: baseColor }
      };
    });
    this.charts.vector.setOption({
      tooltip: {
        trigger: 'item',
        confine: true,
        position(point, params, dom, rect, size) {
          const x = point[0]; const boxW = size.contentSize[0]; const viewW = size.viewSize[0];
          return [x + (x + boxW > viewW ? -boxW - 20 : 20), point[1] + 20];
        }
      },
      legend: { bottom: 5, type: 'scroll' },
      grid: { top: 40, bottom: 60, left: 60, right: 40 },
      xAxis: { name: 'X位移(mm)', scale: true, splitLine: { show: true, lineStyle: { type: 'dashed', color: '#eee' } } },
      yAxis: { name: 'Y位移(mm)', scale: true, splitLine: { show: true, lineStyle: { type: 'dashed', color: '#eee' } } },
      series
    });
  },

  renderTable() {
    const head = document.getElementById('full-table-head');
    const body = document.getElementById('full-table-body');
    if (!head || !body) return;
    if (this.selectedPoints.length === 0) {
      head.innerHTML = '';
      body.innerHTML = '<tr><td colspan="26" style="text-align:center; padding:30px; color:#999;">请先选择监测点进行查询</td></tr>';
      return;
    }
    const cols = ['序号', '区域', '编号', '时间', '基准X', '基准Y', '基准H', 'X位移(mm)', 'Y位移(mm)', 'H位移(mm)', 'XY位移(mm)', 'XYH位移(mm)', 'X累积位移(mm)', 'Y累积位移(mm)', 'H累积位移(mm)', 'XY累积位移(mm)', 'XYH累积位移(mm)', 'X速度(mm/h)', 'Y速度(mm/h)', 'H速度(mm/h)', 'XY速度(mm/h)', 'XYH速度(mm/h)', 'X加速度(mm/h²)', 'Y加速度(mm/h²)', 'H加速度(mm/h²)', '切线角（°）'];
    head.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
    const start = new Date(document.getElementById('an-start').value);
    const end = new Date(document.getElementById('an-end').value);
    const msMap = { hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 };
    const interval = msMap[this.tableFreq || 'hour'];
    let html = '';
    let rowNum = 1;
    this.selectedPoints.forEach(devId => {
      const meta = window.mapModule.pMeta[devId] || { region: '未知', deviceId: devId };
      for (let currentTs = start.getTime(); currentTs <= end.getTime(); currentTs += interval) {
        const spX = this.getLogicData(devId, currentTs, 0);
        const spY = this.getLogicData(devId, currentTs, 1);
        const spH = this.getLogicData(devId, currentTs, 2);
        const spXY = this.getLogicData(devId, currentTs, 3);
        const spXYH = this.getLogicData(devId, currentTs, 4);
        const accX = this.getLogicData(devId, currentTs, 15);
        const accY = this.getLogicData(devId, currentTs, 16);
        const accH = this.getLogicData(devId, currentTs, 17);
        const tAngle = this.getLogicData(devId, currentTs, 18);
        html += `<tr><td>${rowNum++}</td><td>${meta.region}</td><td style="font-weight:bold; color:#1c3d90">${meta.deviceId}</td><td>${new Date(currentTs).toLocaleString()}</td><td>2450.55</td><td>1300.12</td><td>1150.00</td> <td>0.84</td><td>0.67</td><td>0.01</td><td>8.40</td><td>10.08</td> <td>186.47</td><td>149.18</td><td>5.20</td><td>261.06</td><td>298.35</td> <td>${spX}</td><td>${spY}</td><td>${spH}</td><td>${spXY}</td><td>${spXYH}</td> <td style="color:#666">${accX}</td><td style="color:#666">${accY}</td><td style="color:#666">${accH}</td> <td style="font-weight:bold; color:#1c3d90">${tAngle}°</td></tr>`;
        if (rowNum > 2000) break;
      }
    });
    body.innerHTML = html;
  },

  toggleMetricMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('metric-items-container');
    if (menu) menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
  },

  renderMetricSelector() {
    const container = document.getElementById('metric-items-container');
    if (!container) return;
    const groups = [
      { name: '速度指标 (mm/h)', start: 0, end: 5 },
      { name: '位移指标 (mm)', start: 5, end: 10 },
      { name: '累积位移 (mm)', start: 10, end: 15 },
      { name: '派生指标 (加速度/角度)', start: 15, end: 19 }
    ];
    let html = `
        <div class="multi-item" style="border-bottom: 2px solid #eee; margin-bottom: 5px; background: #f8fbff;">
            <input type="checkbox" id="met-an-all"
                   ${this.selectedGlobalMetrics.length === this.allMetrics.length ? 'checked' : ''}
                   onchange="window.analysisModule.handleMetricToggle(this)" value="全部">
            <label for="met-an-all" style="font-weight:bold; color:#1c3d90;">全选所有指标</label>
        </div>`;
    groups.forEach(group => {
      html += `<div class="menu-group-title">${group.name}</div>`;
      const subMetrics = this.allMetrics.slice(group.start, group.end);
      subMetrics.forEach(metric => {
        const safeId = metric.replace(/[()°²/]/g, '_');
        html += `
                <div class="multi-item sub-item">
                    <input type="checkbox" id="met-an-${safeId}" value="${metric}"
                           ${this.selectedGlobalMetrics.includes(metric) ? 'checked' : ''}
                           onchange="window.analysisModule.handleMetricToggle(this)">
                    <label for="met-an-${safeId}">${metric}</label>
                </div>`;
      });
    });
    container.innerHTML = html;
  },

  handleMetricToggle(cb) {
    const val = cb.value;
    if (val === '全部') {
      this.selectedGlobalMetrics = cb.checked ? [...this.allMetrics] : [];
    } else {
      if (cb.checked) {
        if (!this.selectedGlobalMetrics.includes(val)) this.selectedGlobalMetrics.push(val);
      } else {
        this.selectedGlobalMetrics = this.selectedGlobalMetrics.filter(m => m !== val);
      }
    }
    this.renderMetricSelector();
    this.updateMetricButtonLabel();
    this.renderCurveChart();
    this.renderTable();
  },

  updateMetricButtonLabel() {
    const label = document.getElementById('metric-btn-label');
    if (!label) return;
    const count = this.selectedGlobalMetrics.length;
    if (count === 0) {
      label.innerText = '请选择指标...';
      label.className = 'placeholder-text';
    } else if (count === this.allMetrics.length) {
      label.innerText = '全部指标已选';
      label.className = '';
    } else {
      label.innerText = `已选 ${count} 项指标`;
      label.className = '';
    }
  },

  exportChart(type) {
    const chart = (type === 'curve') ? this.charts.curve : this.charts.vector;
    if (chart) {
      const link = document.createElement('a');
      link.href = chart.getDataURL({ pixelRatio: 2, backgroundColor: '#fff' });
      link.download = `GNSS分析_${type}_${Date.now()}.png`;
      link.click();
    }
  },

  openExportDialog() { this.openExportDialogLogic(); },

  openExportDialogLogic() {
    const container = document.getElementById('export-metric-list');
    if (!container) return;
    const exportCols = ['基准X', '基准Y', '基准H', 'X位移(mm)', 'Y位移(mm)', 'H位移(mm)', 'XY位移(mm)', 'XYH位移(mm)', 'X累积位移(mm)', 'Y累积位移(mm)', 'H累积位移(mm)', 'XY累积位移(mm)', 'XYH累积位移(mm)', 'X速度(mm/h)', 'Y速度(mm/h)', 'H速度(mm/h)', 'XY速度(mm/h)', 'XYH速度(mm/h)', 'X加速度(mm/h²)', 'Y加速度(mm/h²)', 'H加速度(mm/h²)', '切线角（°）'];
    container.innerHTML = exportCols.map(col => `
        <div class="multi-item" style="border:none; padding: 5px 10px;">
            <input type="checkbox" class="ex-check" id="ex-col-${col.replace(/[()°²/]/g, '_')}" value="${col}" checked
                   onchange="window.analysisModule.syncExportToggleState()">
            <label for="ex-col-${col.replace(/[()°²/]/g, '_')}" style="cursor:pointer; font-size:13px; color:#444; flex:1;">${col}</label>
        </div>`).join('');
    const allToggle = document.getElementById('ex-all-toggle');
    if (allToggle) allToggle.checked = true;
    document.getElementById('export-panel').style.display = 'flex';
  },

  toggleAllExport(status) {
    document.querySelectorAll('.ex-check').forEach(cb => { cb.checked = status; });
  },

  syncExportToggleState() {
    const allChecks = document.querySelectorAll('.ex-check');
    const allToggle = document.getElementById('ex-all-toggle');
    if (!allToggle) return;
    allToggle.checked = Array.from(allChecks).every(cb => cb.checked);
  },

  doExport() {
    const checkedBoxes = document.querySelectorAll('.ex-check:checked');
    const selectedCols = Array.from(checkedBoxes).map(cb => cb.value);
    if (selectedCols.length === 0) { alert('请至少选择一个导出字段'); return; }
    const allTableCols = ['序号', '区域', '编号', '时间', '基准X', '基准Y', '基准H', 'X位移(mm)', 'Y位移(mm)', 'H位移(mm)', 'XY位移(mm)', 'XYH位移(mm)', 'X累积位移(mm)', 'Y累积位移(mm)', 'H累积位移(mm)', 'XY累积位移(mm)', 'XYH累积位移(mm)', 'X速度(mm/h)', 'Y速度(mm/h)', 'H速度(mm/h)', 'XY速度(mm/h)', 'XYH速度(mm/h)', 'X加速度(mm/h²)', 'Y加速度(mm/h²)', 'H加速度(mm/h²)', '切线角（°）'];
    let csvContent = '\ufeff序号,区域,编号,时间,' + selectedCols.join(',') + '\n';
    document.querySelectorAll('#full-table-body tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 4) return;
      const rowData = [cells[0].innerText, cells[1].innerText, cells[2].innerText, cells[3].innerText];
      selectedCols.forEach(col => {
        const idx = allTableCols.indexOf(col);
        if (idx !== -1) rowData.push(cells[idx].innerText.replace(/,/g, ''));
      });
      csvContent += rowData.join(',') + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `GNSS数据分析_${Date.now()}.csv`;
    link.click();
    document.getElementById('export-panel').style.display = 'none';
  },

  clearAll() {
    this.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
    this.selectedPoints = Object.keys(window.mapModule.pMeta).filter(id => window.mapModule.pMeta[id]?.type === 'GNSS');
    this.selectedGlobalMetrics = ['XY速度(mm/h)'];
    this.tMultiplier = 1;
    if (this.charts.curve) this.charts.curve.clear();
    if (this.charts.vector) this.charts.vector.clear();
    document.getElementById('full-table-head').innerHTML = '';
    document.getElementById('full-table-body').innerHTML = '';
    this.syncFilterUI();
    this.updateMetricButtonLabel();
    this.renderMetricSelector();
  }
};
