<template>
  <!-- 结构与 COMBINE/index.html#main-map-section 一致，事件已改为 Vue 绑定 -->
  <section class="map-module" id="main-map-section">
<div style="position: absolute; top: 55px; left: 15px; z-index: 100; display: inline-block;">
  <button id="map-view-btn" class="map-btn breathing-btn rounded-btn" @click="mapModule.toggleViewDropdown($event)">
    <span id="map-view-label">地质模型</span> ▼
  </button>
  <div id="map-view-dropdown" class="custom-dropdown-content" style="left: 0;"></div>
</div>

<button id="reset-gnss-btn" class="breathing-btn rounded-circle-btn" type="button" @click="mapModule.resetView()">
  ↺
</button>

    <div class="draw-toolbar" id="draw-toolbar">
      <span class="draw-tip">【逻辑互斥】左键点选监测点连线 或 Ctrl+左键拖拽划线（两者不可混用）</span>
      <button type="button" class="map-btn" style="background:var(--warn-green);color:#fff;" @click="profileModule.confirmDraw()">确定生成</button>
      <button type="button" class="map-btn" @click="profileModule.exitMode()">取消</button>
    </div>

    <div class="map-toolbar" id="time-engine-bar">
      <div style="display:flex; align-items:center; gap:8px; flex: 1; flex-wrap: wrap;">
        <div style="position:relative; display: inline-block;">
          <button type="button" class="map-btn" id="map-region-btn" style="min-width:100px;" @click="mapFilterModule.toggleDropdown('map-region-dropdown', $event)">
            <span id="map-region-label">选择区域</span>
          </button>
          <div id="map-region-dropdown" class="custom-dropdown-content"></div>
        </div>

        <div style="position:relative; display: inline-block;">
          <button type="button" class="map-btn" id="map-line-btn" style="min-width:100px;" @click="mapFilterModule.toggleDropdown('map-line-dropdown', $event)">
            <span id="map-line-label">选择监测线</span>
          </button>
          <div id="map-line-dropdown" class="custom-dropdown-content">
            <div class="custom-dropdown-item">
              <input type="checkbox" value="全部" checked @change="mapFilterModule.handleLineChange($event.target)">
              <span>全部</span>
            </div>
            <div class="custom-dropdown-item">
              <input type="checkbox" value="1号线" checked @change="mapFilterModule.handleLineChange($event.target)">
              <span>1号线</span>
            </div>
            <div class="custom-dropdown-item">
              <input type="checkbox" value="2号线" checked @change="mapFilterModule.handleLineChange($event.target)">
              <span>2号线</span>
            </div>
            <div class="custom-dropdown-item">
              <input type="checkbox" value="3号线" checked @change="mapFilterModule.handleLineChange($event.target)">
              <span>3号线</span>
            </div>
            <div class="custom-dropdown-item">
              <input type="checkbox" value="4号线" checked @change="mapFilterModule.handleLineChange($event.target)">
              <span>4号线</span>
            </div>
            <div class="custom-dropdown-item">
              <input type="checkbox" value="5号线" checked @change="mapFilterModule.handleLineChange($event.target)">
              <span>5号线</span>
            </div>
            <div class="custom-dropdown-item">
              <input type="checkbox" value="6号线" checked @change="mapFilterModule.handleLineChange($event.target)">
              <span>6号线</span>
            </div>
          </div>
        </div>

        <div style="position:relative; display: inline-block;">
          <input type="text" id="map-point-input" class="map-btn" style="width:180px; text-align:center; padding-right:20px;" placeholder="请选择监测点..." @click="mapFilterModule.toggleDropdown('map-point-dropdown', $event)" @input="mapFilterModule.filterPointList($event.target.value)" @blur="mapFilterModule.handlePointInput()" @keydown.enter="mapFilterModule.handlePointInput()">
          <span style="position:absolute; right:8px; top:8px; pointer-events:none; font-size:10px; color:#999;">▼</span>
          <div id="map-point-dropdown" class="custom-dropdown-content"></div>
        </div>

        <div style="width: 1px; height: 20px; background: #ddd; margin: 0 5px;"></div>

        <button type="button" class="map-btn freq-btn active" @click="mapModule.setTime(1, $event.target)">一天内</button>
        <button type="button" class="map-btn freq-btn" @click="mapModule.setTime(7, $event.target)">一周内</button>
        <button type="button" class="map-btn freq-btn" @click="mapModule.setTime(30, $event.target)">一个月内</button>
        <input type="datetime-local" id="date-start" class="map-btn" value="2025-10-10T13:22" @change="mapModule.applyCustomTime()">
        <span style="font-size: clamp(10px, 0.7vw, 13px); color: #666;">至</span>
        <input type="datetime-local" id="date-end" class="map-btn" value="2026-01-18T00:00" @change="mapModule.applyCustomTime()">
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <button type="button" class="btn-profile" id="btn-enter-profile" @click="profileModule.enterMode()">剖面图绘制</button>
      </div>
    </div>

    <div class="map-viewer" id="map-viewer" @click="mapModule.handleMapBackgroundClick()">
      <div class="map-canvas" id="map-canvas">
        <div v-if="commandOverlay" class="command-overlay-layer">
        <div
          v-if="warningZone"
          class="warning-zone"
          :class="{ 'is-active': props.warningZoneActive }"
          :style="mapModule.getWarningZoneStyle(warningZone)"
          @click.stop="mapModule.handleWarningZoneClick()"
        >
            <span class="warning-zone-label">{{ warningZone.label || '橙色预警区域' }}</span>
          </div>
          <div
            v-for="unit in commandUnits"
            :key="`overlay-${unit.code}`"
            class="command-unit"
            :class="[`type-${unit.type || 'equipment'}`, { 'is-selected': mapModule.isCommandUnitSelected(unit) }]"
            :style="mapModule.getCommandUnitStyle(unit)"
            :title="mapModule.getCommandUnitTitle(unit)"
            @click.stop="mapModule.handleCommandUnitClick(unit)"
          >
            <span class="command-unit-dot">{{ mapModule.getCommandUnitIcon(unit) }}</span>
            <span class="command-unit-label">{{ mapModule.getCommandUnitLabel(unit) }}</span>
          </div>
        </div>
        <svg id="draw-svg"></svg>
        <svg id="connection-svg"></svg>
      </div>
    </div>

    <div class="profile-workbench" id="profile-workbench">
      <div class="profile-header">
        <div style="display:flex; align-items:center; gap:15px;">
          <span style="font-weight:bold; color:#1c3d90">地质剖面结构分析</span>
          <span id="profile-tag" style="font-size:10px; background:#eef6ff; color:#1c3d90; padding:2px 6px; border-radius:10px; border:1px solid #dbeafe;">当前实时</span>
        </div>
        <div style="display:flex; gap:10px" id="profile-btn-group">
          <button type="button" class="map-btn" id="btn-profile-export" @click="profileModule.exportImage()">💾 导出图片</button>
          <button type="button" class="map-btn" id="btn-profile-save" style="background:#85C6F1; color:#fff; border:none;" @click="profileModule.hideWorkbench()">保存</button>
          <button type="button" class="map-btn" id="btn-profile-exit" style="background:var(--warn-red); color:#fff; border:none;" @click="profileModule.closeWorkbench()">退出绘制</button>
        </div>
      </div>
      <div class="profile-body">
        <div id="profile-chart"></div>
      </div>
    </div>

    <div id="profile-mini-trigger" @click="profileModule.restoreWorkbench()" title="点击对比历史剖面数据">
      <div class="tech-corner-tl"></div>
      <div class="tech-corner-br"></div>
      <div class="tech-content">
        <div class="tech-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#00F2FF" stroke-width="2.5">
            <path d="M18 20V10M12 20V4M6 20v-6" stroke-linecap="round" />
            <path d="M3 20h18" stroke-linecap="round" />
          </svg>
        </div>
        <div class="tech-label">对比分析</div>
        <div class="tech-sub-text">COMPARE</div>
      </div>
    </div>

    <div id="offline-modal" class="modal-overlay">
      <div class="offline-panel-content">
        <div class="modal-header">
          <h3 style="color:#1c3d90; font-size: 16px; margin:0;">🚫 离线设备列表 </h3>
          <span class="modal-close" style="color:#999 !important; position:static; font-size:24px;" @click="dashModule.closeOfflineModal()">&times;</span>
        </div>
        <div class="modal-table-wrapper">
          <table class="dash-table">
            <thead>
              <tr>
<th width="60" style="text-align: center; vertical-align: middle;">序号</th>
<th style="text-align: center; vertical-align: middle;">区域</th>
<th style="text-align: center; vertical-align: middle;">设备编号</th>
<th style="text-align: center; vertical-align: middle;">离线时间</th>
<th style="text-align: center; vertical-align: middle;">所属厂商</th>
              </tr>
            </thead>
            <tbody id="offline-table-body"></tbody>
          </table>
        </div>
        <div class="offline-modal-footer">
          <div class="offline-pager-info" id="offline-pager-info">共 3 条记录</div>
          <div class="offline-pager-ctrl" id="offline-pager-ctrl"></div>
        </div>
      </div>
    </div>

    <div class="drawer-comp" id="device-drawer" style="z-index: 9999;">
      <div class="drawer-bar" @click="mapFilterModule.toggleDrawer()">
        <span id="drawer-arrow">▲</span> 监测设备类型切换
      </div>
      <div class="drawer-icons">
        <div class="filter-item" data-type="GNSS" @click="mapFilterModule.toggle('GNSS', $event.currentTarget)">📍 GNSS监测</div>
        <div class="filter-item" data-type="DEEP" @click="mapFilterModule.toggle('DEEP', $event.currentTarget)">⚓ 深部位移监测</div>
        <div class="filter-item" data-type="RADAR" @click="mapFilterModule.toggle('RADAR', $event.currentTarget)">
          <span>📡 雷达监测</span>
          <span class="radar-plus" @click.stop="mapFilterModule.toggleRadarCloud($event, $event.currentTarget)">+</span>
        </div>
        <div class="filter-item" data-type="SURFACE" @click="mapFilterModule.toggle('SURFACE', $event.currentTarget)">📐 裂缝写实</div>
        <div class="filter-item" data-type="CRACK" @click="mapFilterModule.toggle('CRACK', $event.currentTarget)">🧱 裂缝监测</div>
        <div class="filter-item" data-type="FIRE" @click="mapFilterModule.toggle('FIRE', $event.currentTarget)">🔥 煤自燃监测</div>
        <div class="filter-item" data-type="WATER" @click="mapFilterModule.toggle('WATER', $event.currentTarget)">💧 降雨监测</div>
        <div class="filter-item" data-type="GROUND" @click="mapFilterModule.toggle('GROUND', $event.currentTarget)">🌍 地下水监测</div>
        <div class="filter-item" data-type="STRESS" @click="mapFilterModule.toggle('STRESS', $event.currentTarget)">📊 地下应力监测</div>
        <div class="filter-item" data-type="VIB" @click="mapFilterModule.toggle('VIB', $event.currentTarget)">💥 爆破震动监测</div>
        <div class="filter-item" data-type="SAT" @click="mapFilterModule.toggle('SAT', $event.currentTarget)">🛸 遥感监测</div>
        <div class="filter-item all-btn" @click="mapFilterModule.toggle('全部', $event.currentTarget)">🔳 全部显示</div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import * as echarts from 'echarts';
import { analysisModule } from '../analysis/analysisModule.js';
import { getDeepAnalysisModule } from '../analysis/deepAnalysisModule.js';
import { getRadarAnalysisModule } from '../analysis/radarAnalysisModule.js';
import { getCrackAnalysisModule } from '../analysis/crackAnalysisModule.js';
import { getFireAnalysisModule } from '../analysis/fireAnalysisModule.js';
import { getWaterAnalysisModule } from '../analysis/waterAnalysisModule.js';
import { getGroundAnalysisModule } from '../analysis/groundAnalysisModule.js';
import { getYingliAnalysisModule } from '../analysis/yingliAnalysisModule.js';
import { getVibAnalysisModule } from '../analysis/vibAnalysisModule.js';

const props = defineProps({
  commandOverlay: {
    type: Boolean,
    default: false
  },
  commandUnits: {
    type: Array,
    default: () => []
  },
  warningZone: {
    type: Object,
    default: null
  },
  selectedCommandCode: {
    type: String,
    default: ''
  },
  warningZoneActive: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['command-unit-select', 'command-unit-clear', 'warning-zone-click', 'map-background-click']);

const commandOverlay = props.commandOverlay;
const commandUnits = props.commandUnits;
const warningZone = props.warningZone;
const activeCommandCode = ref(props.selectedCommandCode || '');

watch(
  () => props.selectedCommandCode,
  (val) => {
    activeCommandCode.value = val || '';
  }
);

// ================= 工具函数 =================
const timeUtils = {
  formatISO(d) {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d - offset).toISOString().slice(0, 16);
  },
  updateMaxConstraints() {
    const nowStr = this.formatISO(new Date());
    ['date-start', 'date-end', 'an-start', 'an-end', 'deep-an-start', 'deep-an-end', 'radar-an-start', 'radar-an-end', 'crack-an-start', 'crack-an-end', 'fire-an-start', 'fire-an-end', 'water-an-start', 'water-an-end', 'ground-an-start', 'ground-an-end', 'yingli-an-start', 'yingli-an-end', 'vib-an-start', 'vib-an-end'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.setAttribute('max', nowStr);
    });
  }
};

// ================= 地图核心模块 =================
const mapModule = {
  scale: 0.6,
  pos: { x: -300, y: -200 },
  tMultiplier: 1,
  isDetailMode: false,
  pMeta: {},
  radarList: [],
  virtualPoints: {},
  createdTooltipByMapModule: false,
  createdAnalysisModalByMapModule: false,
  createdExportPanelByMapModule: false,
  selectedMapTypes: ['geology'],
  commandOrigin: { x: 1500, y: 1250 },
  commandScale: 12,
  getCommandUnitStyle(unit) {
    const x = this.commandOrigin.x + (Number(unit?.x) || 0) * this.commandScale;
    const y = this.commandOrigin.y - (Number(unit?.z) || 0) * this.commandScale;
    return {
      left: `${x}px`,
      top: `${y}px`,
      '--unit-color': unit?.color || '#ff9f43'
    };
  },

  getCommandUnitIcon(unit) {
    const iconMap = { person: '👤', vehicle: '🚚', equipment: '🚜' };
    return iconMap[unit?.type] || '📌';
  },

  getCommandUnitLabel(unit) {
    const typeLabelMap = { person: '人员', vehicle: '车辆', equipment: '挖掘设备' };
    return `${typeLabelMap[unit?.type] || '设备'} ${unit?.code || ''}`.trim();
  },

  getCommandUnitTitle(unit) {
    const typeLabelMap = { person: '人员', vehicle: '车辆', equipment: '挖掘设备' };
    const type = typeLabelMap[unit?.type] || '设备';
    const code = unit?.code || '未命名';
    const detail = unit?.detail || '状态未知';
    return `${type}：${code}（${detail}）`;
  },

  isCommandUnitSelected(unit) {
    return !!(activeCommandCode.value && unit?.code === activeCommandCode.value);
  },

  handleCommandUnitClick(unit) {
    const code = unit?.code || '';
    activeCommandCode.value = code;
    emit('command-unit-select', code);
  },

  clearCommandSelection() {
    if (!activeCommandCode.value) return;
    activeCommandCode.value = '';
    emit('command-unit-clear');
  },

  handleWarningZoneClick() {
    emit('warning-zone-click');
  },

  handleMapBackgroundClick() {
    this.clearCommandSelection();
    emit('map-background-click');
  },

  getWarningZoneStyle(zone) {
    return {
      left: `${zone?.left ?? 960}px`,
      top: `${zone?.top ?? 740}px`,
      width: `${zone?.width ?? 920}px`,
      height: `${zone?.height ?? 560}px`
    };
  },

  init() {
    this.ensureMapTooltip();
    this.ensureGnssAnalysisDom();
    const vp = document.getElementById('map-viewer');
    const cv = document.getElementById('map-canvas');
    const upd = () => cv.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px) scale(${this.scale})`;
    vp.onwheel = (e) => {
      e.preventDefault();
      const ns = Math.min(Math.max(0.2, this.scale + (e.deltaY * -0.0012)), 3.5);
      const r = vp.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const ratio = ns / this.scale;
      this.pos.x = mx - (mx - this.pos.x) * ratio;
      this.pos.y = my - (my - this.pos.y) * ratio;
      this.scale = ns;
      upd();
    };
    let drg = false, sx, sy;
    vp.onmousedown = (e) => {
      if (profileModule.isDrawing && e.ctrlKey && e.button === 0) {
        profileModule.handleMouseDown(e);
        return;
      }
      if (e.button === 0 && (e.target === vp || e.target.id === 'map-canvas')) {
        drg = true;
        sx = e.clientX - this.pos.x;
        sy = e.clientY - this.pos.y;
        vp.style.cursor = 'grabbing';
      }
    };
    window.addEventListener('mousemove', (e) => {
      if (profileModule.isDrawing && profileModule.isDragging) {
        profileModule.handleMouseMove(e);
        return;
      }
      if (drg) {
        this.pos.x = e.clientX - sx;
        this.pos.y = e.clientY - sy;
        upd();
      }
    });
    window.addEventListener('mouseup', () => {
      if (profileModule.isDrawing && profileModule.isDragging) profileModule.handleMouseUp();
      drg = false;
      vp.style.cursor = profileModule.isDrawing ? 'crosshair' : 'grab';
    });
    this.spawnPoints();
    this.updateMapFilters();
    upd();
    window.addEventListener('click', (e) => {
      const dropdown = document.getElementById('map-view-dropdown');
      const btn = document.getElementById('map-view-btn');
      if (dropdown && !dropdown.contains(e.target) && e.target !== btn) dropdown.style.display = 'none';
    });
  },

  ensureMapTooltip() {
    let tooltip = document.getElementById('map-tooltip');
    if (tooltip) return tooltip;
    tooltip = document.createElement('div');
    tooltip.id = 'map-tooltip';
    tooltip.className = 'model-tooltip';
    document.body.appendChild(tooltip);
    this.createdTooltipByMapModule = true;
    return tooltip;
  },

  ensureGnssAnalysisDom() {
    this.ensureAnalysisModal();
    this.ensureExportPanel();
  },

  ensureAnalysisModal() {
    if (document.getElementById('analysis-modal')) return;
    const html = `
      <div id="analysis-modal" class="modal-overlay">
        <div class="analysis-modal" style="position: relative;">
          <span class="modal-close" onclick="window.analysisModule.close()">&times;</span>

          <div class="analysis-header">
            <div style="display:flex; align-items:center;">
              <span style="font-size: 18px; font-weight: bold; letter-spacing: 1px;">GNSS监测 数据分析</span>
            </div>
          </div>

          <div class="filter-bar" style="justify-content: flex-start; gap: 15px; padding: 10px 20px; background: #fff; border-bottom: 1px solid rgba(0,0,0,0.05);">
            <div class="filter-group">
              <span style="font-weight: bold; color: #1c3d90;">区域位置:</span>
              <div class="dropdown-wrapper">
                <button id="an-region-btn" type="button" class="map-btn" onclick="window.analysisModule.toggleDropdown('an-region-dropdown', event)">
                  <span id="an-region-label">全部区域</span>
                </button>
                <div id="an-region-dropdown" class="custom-dropdown-content"></div>
              </div>
            </div>

            <div class="filter-group">
              <span style="font-weight: bold; color: #1c3d90;">监测线:</span>
              <div class="dropdown-wrapper">
                <button id="an-line-btn" type="button" class="map-btn" onclick="window.analysisModule.toggleDropdown('an-line-dropdown', event)">
                  <span id="an-line-label">选择监测线</span>
                </button>
                <div id="an-line-dropdown" class="custom-dropdown-content"></div>
              </div>
            </div>

            <div class="filter-group">
              <span style="font-weight: bold; color: #1c3d90;">监测点:</span>
              <div class="dropdown-wrapper">
                <input type="text" id="an-point-input" class="map-btn" placeholder="选择..." onclick="window.analysisModule.toggleDropdown('an-point-dropdown', event)">
                <div id="an-point-dropdown" class="custom-dropdown-content"></div>
              </div>
            </div>

            <div class="filter-group">
              <span style="font-weight: bold; color: #1c3d90;">时间范围:</span>
              <div style="display:flex; gap:5px; margin-left:5px;">
                <button type="button" class="map-btn freq-btn active" onclick="window.analysisModule.setQuickTime(1, this)">一天内</button>
                <button type="button" class="map-btn freq-btn" onclick="window.analysisModule.setQuickTime(7, this)">一周内</button>
                <button type="button" class="map-btn freq-btn" onclick="window.analysisModule.setQuickTime(30, this)">一个月内</button>
              </div>
              <input type="datetime-local" id="an-start" class="map-btn" style="width: 170px; margin-left: 10px;" onchange="window.analysisModule.handleManualTimeChange()">
              <span style="margin: 0 5px; color: #999;">至</span>
              <input type="datetime-local" id="an-end" class="map-btn" style="width: 170px;" onchange="window.analysisModule.handleManualTimeChange()">
              <button type="button" class="map-btn" style="background: #1c3d90; color: white; margin-left: 10px; border: none; padding: 0 20px; font-weight: bold;" onclick="window.analysisModule.query()">查询</button>
            </div>
          </div>

          <div class="analysis-body">
            <div class="chart-row">
              <div class="chart-box">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;">
                  <span style="font-weight:bold; color:#1c3d90;">📉 指标时序演变曲线</span>
                  <div style="display:flex; gap:8px; align-items:center;">
                    <div class="dropdown-wrapper">
                      <button type="button" class="pager-btn" id="metric-select-btn" onclick="window.analysisModule.toggleMetricMenu(event)">
                        <span id="metric-btn-label" class="placeholder-text">请选择指标...</span> ▼
                      </button>
                      <div id="metric-items-container"></div>
                    </div>
                    <button type="button" class="pager-btn" onclick="window.analysisModule.exportChart('curve')">💾 导出图像</button>
                  </div>
                </div>
                <div id="curve-chart-main" style="flex:1;"></div>
              </div>

              <div class="chart-box">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;">
                  <span style="font-weight:bold; color:#1c3d90;">📍 XY 平面位移矢量轨迹图</span>
                  <div style="display:flex; gap:8px;">
                    <select id="traj-freq" class="pager-btn" style="height:28px" onchange="window.analysisModule.query()">
                      <option value="hour">按小时</option>
                      <option value="day" selected>按天显示</option>
                      <option value="week">按周显示</option>
                    </select>
                    <button type="button" class="pager-btn" onclick="window.analysisModule.exportChart('vector')">💾 导出图像</button>
                  </div>
                </div>
                <div id="vector-chart-main" style="flex:1;"></div>
                <div class="compass-icon">
                  <div style="color:#1c3d90; font-weight:bold; font-size:18px; margin-top:-3px;">↑</div>
                  <div style="font-size:10px; color:#666; margin-top:-4px;">北(N)</div>
                </div>
              </div>
            </div>

            <div class="table-section">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="dash-title" style="margin:0;">GNSS监测 历史明细报表</div>
                <div style="display:flex; align-items:center; gap:10px;">
                  <span style="font-size:13px; color:#666;">显示频率:</span>
                  <select id="an-table-freq" class="map-btn" style="width:90px; height:30px;" onchange="window.analysisModule.tableFreq=this.value; window.analysisModule.renderTable();">
                    <option value="hour">按小时</option>
                    <option value="day">按天显示</option>
                    <option value="week">按周显示</option>
                    <option value="month">按月显示</option>
                  </select>
                  <button type="button" class="map-btn" style="background:#71C446; color:#fff; border:none; padding:0 15px;" onclick="window.analysisModule.openExportDialog()">📥 导出分析报表 (Excel)</button>
                </div>
              </div>
              <div class="scroll-table-wrapper">
                <table class="full-table">
                  <thead id="full-table-head"></thead>
                  <tbody id="full-table-body"></tbody>
                </table>
              </div>
              <div id="an-pagination" style="padding-top:15px; display:flex; justify-content:center;"></div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    this.createdAnalysisModalByMapModule = true;
  },

  ensureExportPanel() {
    if (document.getElementById('export-panel')) return;
    const html = `
      <div id="export-panel" class="modal-overlay">
        <div class="modal-content" style="width: 600px;">
          <div class="export-content-box">
            <div class="modal-header" style="border-bottom:1px solid #eee; margin-bottom:15px; padding-bottom:10px;">
              <h4 style="margin:0; color:#1c3d90; display:flex; align-items:center; gap:8px; font-size:16px;">
                <span>📋</span> 选择导出指标
              </h4>
              <div style="display:flex; align-items:center; gap:4px; background: #f0f7ff; padding: 2px 8px; border-radius: 4px; border: 1px solid #dbeafe;">
                <input type="checkbox" id="ex-all-toggle" checked onchange="window.analysisModule.toggleAllExport(this.checked)" style="cursor:pointer; width:13px; height:13px; accent-color: #1c3d90;">
                <label for="ex-all-toggle" style="font-size:12px; color:#1c3d90; cursor:pointer; font-weight:bold; user-select:none;">全选</label>
              </div>
            </div>

            <div class="export-grid" id="export-metric-list" style="max-height: 400px; overflow-y: auto; margin-bottom: 20px;">
            </div>

            <div class="export-footer" style="display:flex; justify-content:flex-end; gap:10px;">
              <button type="button" class="map-btn" style="background:#f5f7fa; color:#333; border:1px solid #dcdfe6;" onclick="document.getElementById('export-panel').style.display='none'">取消</button>
              <button type="button" class="map-btn" style="background:#1c3d90; color:#fff; font-weight:bold; border:none; padding:0 30px;" onclick="window.analysisModule.doExport()">确认导出 Excel</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    this.createdExportPanelByMapModule = true;
  },

  spawnPoints() {
    const cv = document.getElementById('map-canvas');
    const icons = { 'GNSS': '📍', 'DEEP': '⚓', 'RADAR': '📡', 'SURFACE': '📐', 'CRACK': '🧱', 'FIRE': '🔥', 'WATER': '💧', 'GROUND': '🌍', 'STRESS': '📊', 'VIB': '💥', 'SAT': '🛸' };
    const types = Object.keys(icons);
    const regionDefinitions = [
      { name: '北帮', xRange: [800, 2200], yRange: [200, 600], lineAxis: { type: 'Y', val: 350 } },
      { name: '南帮', xRange: [800, 2200], yRange: [1900, 2300], lineAxis: { type: 'Y', val: 2150 } },
      { name: '西帮', xRange: [200, 700], yRange: [800, 1700], lineAxis: { type: 'X', val: 400 } },
      { name: '东帮', xRange: [2300, 2800], yRange: [800, 1700], lineAxis: { type: 'X', val: 2600 } },
      { name: '中央区', xRange: [1100, 1900], yRange: [1000, 1500], lineAxis: null }
    ];
    const placedPoints = [];
    const minDist = 60;
    const gnssCountPerRegion = { '北帮': 0, '南帮': 0, '东帮': 0, '西帮': 0, '中央区': 0 };
    let redGnssCount = 0;
    for (let i = 0; i < 150; i++) {
      let type = types[i % types.length];
      if (i < 7) type = 'RADAR';
      else if (type === 'RADAR') type = 'GNSS';
      let alarmIdx = (i * 7) % 5;
      const isOnline = (i % 8 !== 0);
      if (type === 'GNSS' && alarmIdx === 0) {
        if (redGnssCount < 2) redGnssCount++;
        else alarmIdx = 4;
      }
      const regDef = regionDefinitions[i % regionDefinitions.length];
      let posX, posY, attempts = 0;
      let isOnDetectionLine = false;
      if (type === 'GNSS' && regDef.lineAxis && gnssCountPerRegion[regDef.name] < 3) {
        isOnDetectionLine = true;
        gnssCountPerRegion[regDef.name]++;
      }
      while (attempts < 150) {
        if (isOnDetectionLine) {
          const idx = gnssCountPerRegion[regDef.name] - 1;
          if (regDef.lineAxis.type === 'Y') {
            posY = regDef.lineAxis.val;
            posX = regDef.xRange[0] + 300 + (idx * 250);
          } else {
            posX = regDef.lineAxis.val;
            posY = regDef.yRange[0] + 300 + (idx * 250);
          }
        } else {
          posX = regDef.xRange[0] + Math.random() * (regDef.xRange[1] - regDef.xRange[0]);
          posY = regDef.yRange[0] + Math.random() * (regDef.yRange[1] - regDef.yRange[0]);
          if (regDef.lineAxis) {
            if (regDef.lineAxis.type === 'Y' && Math.abs(posY - regDef.lineAxis.val) < 60) continue;
            if (regDef.lineAxis.type === 'X' && Math.abs(posX - regDef.lineAxis.val) < 60) continue;
          }
        }
        if (!placedPoints.some(p => Math.hypot(posX - p.x, posY - p.y) < minDist)) break;
        attempts++;
      }
      placedPoints.push({ x: posX, y: posY });
      const p = document.createElement('div');
      p.id = `pt-${i}`;
      p.className = `point-obj type-${type} ${(isOnline && alarmIdx === 0) ? 'breathe' : ''}`;
      p.style.left = posX + 'px';
      p.style.top = posY + 'px';
      const colors = ['#F57676', '#FFA500', '#fadb14', '#66B1FF', '#71C446'];
      const targetColor = isOnline ? colors[alarmIdx] : '#999';
      p.style.backgroundColor = targetColor;
      p.style.color = targetColor;
      const deviceId = `${type}${i}`;
      const stressSub = i % 2 === 0 ? '锚索应力' : '土压力计';
      this.pMeta[p.id] = type === 'STRESS'
        ? { id: p.id, type, alarmIdx, isOnline, deviceId, region: regDef.name, isOnDetectionLine, subType: stressSub }
        : { id: p.id, type, alarmIdx, isOnline, deviceId, region: regDef.name, isOnDetectionLine };
      p.innerHTML = `<div class="point-bubble"><span>${icons[type]}</span></div><div class="point-id">${deviceId}</div>`;
      if (type === 'GNSS' && isOnline) {
        const arrow = document.createElement('div');
        arrow.className = 'map-vector-arrow';
        arrow.style.height = '60px';
        arrow.style.transform = `translateX(-50%) rotate(${(i * 137.5) % 360}deg)`;
        p.appendChild(arrow);
      }
      p.onclick = (e) => {
        if (profileModule.isDrawing) { e.stopPropagation(); profileModule.handlePointClick(p.id); }
        else if (isOnline && type === 'GNSS') { analysisModule.open(this.pMeta[p.id]); }
        else if (isOnline && type === 'DEEP') { dashModule.focusWithRange(p.id); getDeepAnalysisModule().open(this.pMeta[p.id]); }
        else if (isOnline && type === 'RADAR') { dashModule.focusWithRange(p.id); getRadarAnalysisModule().open(this.pMeta[p.id]); }
        else if (isOnline && type === 'CRACK') { dashModule.focusWithRange(p.id); getCrackAnalysisModule().open(this.pMeta[p.id]); }
        else if (isOnline && type === 'FIRE') { dashModule.focusWithRange(p.id); getFireAnalysisModule().open(this.pMeta[p.id]); }
        else if (isOnline && type === 'WATER') { dashModule.focusWithRange(p.id); getWaterAnalysisModule().open(this.pMeta[p.id]); }
        else if (isOnline && type === 'GROUND') { dashModule.focusWithRange(p.id); getGroundAnalysisModule().open(this.pMeta[p.id]); }
        else if (isOnline && type === 'STRESS') { dashModule.focusWithRange(p.id); getYingliAnalysisModule().open(this.pMeta[p.id]); }
        else if (isOnline && type === 'VIB') { dashModule.focusWithRange(p.id); getVibAnalysisModule().open(this.pMeta[p.id]); }
      };
// 只有在线设备才绑定悬浮标签
if (isOnline) {
    p.onmouseenter = (e) => {
        const tt = this.ensureMapTooltip();
        if (!tt) return;
        tt.style.display = 'block';
        tt.innerHTML = `<b style="color:#85C6F1;">[${regDef.name}] ${deviceId}</b><hr style='margin:5px 0; opacity:0.2'>${this.getTechData(type, p.id)}`;
        tt.style.left = e.clientX + 15 + 'px';
        tt.style.top = e.clientY + 15 + 'px';
    };
    p.onmouseleave = () => {
      const tt = document.getElementById('map-tooltip');
      if (tt) tt.style.display = 'none';
    };
}
      cv.appendChild(p);
    }
    this.radarList = [];
    this.virtualPoints = {};
    const radarSeen = new Set();
    Object.keys(this.pMeta).forEach(pid => {
      const m = this.pMeta[pid];
      if (m.type !== 'RADAR') return;
      if (!radarSeen.has(m.deviceId)) {
        radarSeen.add(m.deviceId);
        this.radarList.push({ name: m.deviceId, region: m.region, isOnline: m.isOnline });
      }
      this.virtualPoints[pid] = { id: pid, radarName: m.deviceId, region: m.region };
    });
  },

getTechData(type, id) {
    const meta = this.pMeta[id];
    const multiplier = this.isDetailMode ? 1 : (this.tMultiplier || 1);
    const seed = parseInt(id.replace('pt-', '')) || 0;
    const variance = (seed % 10) * 0.1;
    let speed = 0.5;
    switch (meta.alarmIdx) {
      case 0: speed = 8.1 + variance * 3.5; break;
      case 1: speed = 5.1 + variance * 2.5; break;
      case 2: speed = 4.1 + variance * 0.8; break;
      case 3: speed = 3.1 + variance * 0.8; break;
      default: speed = 0.5 + (seed % 5) * 0.4;
    }
    const totalDisp = (speed * 24 * multiplier).toFixed(2);
    const specs = {
      'GNSS': `累计位移: ${totalDisp} mm<br>当前速度: ${speed.toFixed(2)} mm/h<br>X/Y/H变化: ${(totalDisp * 0.55).toFixed(2)}/${(totalDisp * 0.35).toFixed(2)}/${(totalDisp * 0.10).toFixed(2)} mm`,
      'RADAR': `视在形变: ${totalDisp} mm<br>反射强度: -12.4 dB<br>相干性: 0.98`,
      'DEEP': `深层位移: ${totalDisp} mm<br>测斜深度: 45.0 m`,
      'SURFACE': `裂缝宽度: ${(totalDisp / 10).toFixed(2)} mm<br>张开速率: ${(speed / 10).toFixed(2)} mm/d`,
      'FIRE': `表面温度: ${(25 + parseFloat(totalDisp) / 15).toFixed(1)} ℃<br>CO浓度: 12 ppm`,
      'WATER': `实时水位: ${(120 - totalDisp / 100).toFixed(2)} m<br>水温: 14.2 ℃`,
      'STRESS': `应力/压力: ${(2.5 + speed * 0.15).toFixed(2)} kPa<br>类型: ${meta.subType || '—'}`,
      'VIB': `振动速度峰值: ${speed.toFixed(2)} cm/s<br>主频: ${(10 + (seed % 5)).toFixed(1)} Hz`
    };
const content = specs[type] || `设备状态: 运行正常<br>当前速度: ${speed.toFixed(2)} mm/h`;
// 裂缝写实（SURFACE）不显示图片占位符
if (type !== 'SURFACE') {
    const placeholder = `<div style="width:100%; height:80px; background:#e0e0e0; border-radius:4px; margin-bottom:8px; display:flex; align-items:center; justify-content:center; color:#666; font-size:12px;">📷 现场抓拍</div>`;
    return placeholder + content;
}
return content;
},

  setTime(days, btn) {
    document.querySelectorAll('#time-engine-bar .freq-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const now = new Date();
    let start = new Date();
    start.setDate(now.getDate() - days);
    start.setHours(0, 0, 0, 0);
    const format = (d) => {
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d - offset).toISOString().slice(0, 16);
    };
    const startInp = document.getElementById('date-start');
    const endInp = document.getElementById('date-end');
    if (startInp) startInp.value = format(start);
    if (endInp) endInp.value = format(now);
    this.tMultiplier = (now - start) / (24 * 3600000);
    this.triggerFlash();
  },

  applyCustomTime() {
    const sInp = document.getElementById('date-start');
    const eInp = document.getElementById('date-end');
    if (!sInp.value || !eInp.value) return;
    const start = new Date(sInp.value);
    const end = new Date(eInp.value);
    const now = new Date();
    if (start > now || end > now) {
      alert("初始或终止时间不得晚于当前时刻");
      this.setTime(1, document.querySelector('#time-engine-bar .freq-btn'));
      return;
    }
    if (start.getTime() === end.getTime()) {
      alert("初始时间与终止时间不得相同");
      return;
    }
    if (start > end) {
      alert("初始时间不得晚于终止时间");
      return;
    }
    this.tMultiplier = (end - start) / (24 * 3600000);
    document.querySelectorAll('#time-engine-bar .freq-btn').forEach(b => b.classList.remove('active'));
    this.triggerFlash();
  },

  toggleViewDropdown(e) {
    e.stopPropagation();
    const el = document.getElementById('map-view-dropdown');
    const isShow = el.style.display === 'block';
    document.querySelectorAll('.custom-dropdown-content').forEach(d => d.style.display = 'none');
    el.style.display = isShow ? 'none' : 'block';
    if (!isShow) this.renderViewDropdown();
  },

  renderViewDropdown() {
    const options = [{ id: 'geology', label: '地质模型' }, { id: 'dtm', label: 'DTM面' }, { id: 'uav', label: '无人机地图' }];
    const container = document.getElementById('map-view-dropdown');
    if (!container) return;
    const isAllChecked = options.every(opt => this.selectedMapTypes.includes(opt.id));
    let html = `<div class="custom-dropdown-item" onclick="if(event.target.tagName !== 'INPUT') this.querySelector('input').click(); event.stopPropagation();"><input type="checkbox" value="all" ${isAllChecked ? 'checked' : ''} onchange="window.mapModule.handleViewTypeChange(this); event.stopPropagation();"><span class="all-select-text">全部选择</span></div><hr style="margin: 4px 8px; border: 0; border-top: 1px solid #f0f0f0;">`;
    html += options.map(opt => `<div class="custom-dropdown-item" onclick="if(event.target.tagName !== 'INPUT') this.querySelector('input').click(); event.stopPropagation();"><input type="checkbox" value="${opt.id}" ${this.selectedMapTypes.includes(opt.id) ? 'checked' : ''} onchange="window.mapModule.handleViewTypeChange(this); event.stopPropagation();"><span>${opt.label}</span></div>`).join('');
    container.innerHTML = html;
  },

  handleViewTypeChange(cb) {
    if (cb.value === 'all') this.selectedMapTypes = cb.checked ? ['geology', 'dtm', 'uav'] : [];
    else {
      if (cb.checked) { if (!this.selectedMapTypes.includes(cb.value)) this.selectedMapTypes.push(cb.value); }
      else this.selectedMapTypes = this.selectedMapTypes.filter(t => t !== cb.value);
    }
    this.updateMapFilters();
    this.renderViewDropdown();
  },

  updateMapFilters() {
    this.triggerFlash();
    const canvas = document.getElementById('map-canvas');
    const labelEl = document.getElementById('map-view-label');
    const labels = { geology: '地质模型', dtm: 'DTM面', uav: '无人机地图' };
    if (this.selectedMapTypes.length === 0) labelEl.innerText = "请选择模型";
    else labelEl.innerText = labels[this.selectedMapTypes[0]] + (this.selectedMapTypes.length > 1 ? "..." : "");
    canvas.style.filter = this.selectedMapTypes.includes('uav') ? 'saturate(1.5) contrast(1.2)' : 'none';
    if (connectionModule) { connectionModule.setVisible(this.selectedMapTypes.includes('geology')); if (this.selectedMapTypes.includes('geology')) connectionModule.drawConnections(); }
  },

  triggerFlash() {
    const section = document.getElementById('main-map-section');
    if (!section) return;
    section.classList.remove('section-flash-active');
    void section.offsetWidth;
    section.classList.add('section-flash-active');
  },

  focus(type) {
    const vp = document.getElementById('map-viewer'), cv = document.getElementById('map-canvas');
    const pts = Array.from(document.querySelectorAll(`.type-${type}`)).filter(p => p.style.display !== 'none');
    if (!pts.length) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pts.forEach(p => { const x = parseFloat(p.style.left), y = parseFloat(p.style.top); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
    const scaleX = (vp.clientWidth * 0.8) / ((maxX - minX) + 150), scaleY = (vp.clientHeight * 0.8) / ((maxY - minY) + 150);
    this.scale = Math.max(Math.min(scaleX, scaleY, 1.0), 0.2);
    this.pos.x = (vp.clientWidth / 2) - ((minX + (maxX - minX) / 2) * this.scale);
    this.pos.y = (vp.clientHeight / 2) - ((minY + (maxY - minY) / 2) * this.scale);
    cv.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px) scale(${this.scale})`;
  },

  /** 将视野适配到当前地图上可见的监测点（多类型筛选、预警饼图点击后使用） */
  fitVisibleFilteredPoints() {
    const vp = document.getElementById('map-viewer'), cv = document.getElementById('map-canvas');
    const pts = Array.from(document.querySelectorAll('.point-obj')).filter(p => p.style.display !== 'none');
    if (!pts.length) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pts.forEach((p) => {
      const x = parseFloat(p.style.left), y = parseFloat(p.style.top);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    });
    const scaleX = (vp.clientWidth * 0.8) / ((maxX - minX) + 150), scaleY = (vp.clientHeight * 0.8) / ((maxY - minY) + 150);
    this.scale = Math.max(Math.min(scaleX, scaleY, 1.0), 0.2);
    this.pos.x = (vp.clientWidth / 2) - ((minX + (maxX - minX) / 2) * this.scale);
    this.pos.y = (vp.clientHeight / 2) - ((minY + (maxY - minY) / 2) * this.scale);
    cv.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px) scale(${this.scale})`;
  }
};

// ================= 筛选模块 =================
const mapFilterModule = {
  activeTypes: new Set(),
  isOpen: false,
  selectedRegions: ['全部'],
  selectedPoints: [],
  selectedLines: ['全部'],
  allTypes: ['GNSS', 'DEEP', 'RADAR', 'SURFACE', 'CRACK', 'FIRE', 'WATER', 'GROUND', 'STRESS', 'VIB', 'SAT'],
  radarTargetMapping: { '西帮': ['东帮'], '东帮': ['西帮'], '南帮': ['北帮'], '北帮': ['南帮'], '中央区': ['中央区', '北帮', '南帮'] },

init() {
    window.addEventListener('click', (e) => {
      if (!e.target.closest('.filter-group') && !e.target.closest('.custom-dropdown-content')) {
        document.querySelectorAll('.custom-dropdown-content').forEach(d => d.style.display = 'none');
      }
    });
    // 默认激活 GNSS 监测类型
    this.activeTypes.add('GNSS');
    const allRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
    const allLines = ['全部', '1号线', '2号线', '3号线', '4号线'];
    // 初始化选中点：所有当前激活类型（GNSS）且非遥感的点
    const allActiveIds = Object.keys(mapModule.pMeta).filter(id => {
      const meta = mapModule.pMeta[id];
      return this.activeTypes.has(meta.type) && meta.type !== 'SAT';
    });
    this.selectedPoints = [...allActiveIds];
    // 确保区域和监测线也初始化为全部
    this.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
    this.selectedLines = ['全部', '1号线', '2号线', '3号线', '4号线'];
    this.syncUI();
},

  toggleDropdown(id, e) {
    if (e) e.stopPropagation();
    const el = document.getElementById(id);
    if (!el) return;
    const isCurrentlyShow = el.style.display === 'block';
    document.querySelectorAll('.custom-dropdown-content').forEach(d => { if (d.id !== id) d.style.display = 'none'; });
    el.style.display = isCurrentlyShow ? 'none' : 'block';
    if (el.style.display === 'block') {
      if (id === 'map-point-dropdown') this.renderPoints('');
      else if (id === 'map-region-dropdown') this.renderRegions();
      else if (id === 'map-line-dropdown') this.renderLines();
    }
  },

  renderRegions() {
    const regions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
    const container = document.getElementById('map-region-dropdown');
    container.innerHTML = regions.map(reg => `<div class="custom-dropdown-item" onclick="mapFilterModule.handleItemClick(this, event, 'region')"><input type="checkbox" value="${reg}" ${this.selectedRegions.includes(reg) ? 'checked' : ''} onchange="mapFilterModule.handleRegionChange(this)"><span style="${reg === '全部' ? 'font-weight:bold; color:#1c3d90;' : ''}">${reg}</span></div>`).join('');
  },

  renderLines() {
    const container = document.getElementById('map-line-dropdown');
    if (!container) return;
    const regToLineMap = { '北帮': '1号线', '南帮': '2号线', '东帮': '3号线', '西帮': '4号线' };
    let displayLines = [];
    if (this.selectedRegions.includes('全部')) displayLines = ['1号线', '2号线', '3号线', '4号线'];
    else { this.selectedRegions.forEach(reg => { if (regToLineMap[reg]) displayLines.push(regToLineMap[reg]); }); }
    const isAllChecked = displayLines.length > 0 && displayLines.every(l => this.selectedLines.includes(l));
    let html = `<div class="custom-dropdown-item" onclick="mapFilterModule.handleLineChange({value:'全部', checked: ${!isAllChecked}}, event)"><input type="checkbox" value="全部" ${isAllChecked ? 'checked' : ''}><span style="font-weight:bold; color:#1c3d90;">全部</span></div><hr style="margin:4px 0; border:0; border-top:1px solid #eee;">`;
    html += displayLines.map(line => `<div class="custom-dropdown-item" onclick="mapFilterModule.handleLineChange({value:'${line}', checked: !mapFilterModule.selectedLines.includes('${line}')}, event)"><input type="checkbox" value="${line}" ${this.selectedLines.includes(line) ? 'checked' : ''}><span>${line}</span></div>`).join('');
    container.innerHTML = html;
  },

getDisplayPoints(filterVal = '') {
  // 获取所有符合当前激活设备类型的点
  let allPoints = [];
  for (const id of Object.keys(mapModule.pMeta)) {
    const meta = mapModule.pMeta[id];
    // 如果该设备类型未被激活，则跳过
    if (!this.activeTypes.has(meta.type)) continue;
    // 排除 SAT 类型（遥感叠加层，不需要作为点位选择）
    if (meta.type === 'SAT') continue;
    allPoints.push({ id, ...meta });
  }
  // 按区域筛选
  let list = (this.selectedRegions.includes('全部') || this.selectedRegions.length === 0)
    ? allPoints
    : allPoints.filter(p => this.selectedRegions.includes(p.region));
  // 按输入的编号/名称模糊筛选
  if (filterVal && filterVal !== '全部' && !filterVal.includes('、')) {
    const lowerVal = filterVal.toLowerCase();
    list = list.filter(p => p.deviceId.toLowerCase().includes(lowerVal));
  }
  return list;
},

  renderPoints(filterVal = '') {
    const container = document.getElementById('map-point-dropdown');
    if (!container) return;
    container.onclick = (e) => e.stopPropagation();
    const displayList = this.getDisplayPoints(filterVal);
    const isAllChecked = displayList.length > 0 && displayList.every(p => this.selectedPoints.includes(p.id));
    let html = `<div class="custom-dropdown-item" style="border-bottom: 1px solid #eee; margin-bottom: 5px;" onclick="mapFilterModule.handlePointChange({value:'全部', checked: ${!isAllChecked}}, event)"><input type="checkbox" value="全部" ${isAllChecked ? 'checked' : ''}><span style="font-weight:bold; color:#1c3d90;">全部</span></div>`;
    html += displayList.map(p => `<div class="custom-dropdown-item" onclick="mapFilterModule.handlePointChange({value:'${p.id}', checked: !mapFilterModule.selectedPoints.includes('${p.id}')}, event)"><input type="checkbox" value="${p.id}" ${this.selectedPoints.includes(p.id) ? 'checked' : ''}><span>${p.deviceId} <small style="color:#999">(${p.region})</small></span></div>`).join('');
    container.innerHTML = html || '<div style="padding:10px; color:#999; text-align:center;">暂无监测点</div>';
  },

  handleItemClick(el, event, type) {
    if (event) event.stopPropagation();
    if (event.target.tagName === 'INPUT') return;
    const cb = el.querySelector('input[type="checkbox"]');
    if (cb) { cb.checked = !cb.checked; type === 'region' ? this.handleRegionChange(cb) : this.handlePointChange(cb); }
  },

handleRegionChange(cb) {
    const val = cb.value;
    const allRegions = ['北帮', '南帮', '东帮', '西帮', '中央区'];
    const regToLineMap = { '北帮': '1号线', '南帮': '2号线', '东帮': '3号线', '西帮': '4号线' };

    // 获取当前所有激活类型（非 SAT）的点
    const getAllActivePoints = () => {
      const points = [];
      for (const id of Object.keys(mapModule.pMeta)) {
        const meta = mapModule.pMeta[id];
        if (meta.type !== 'SAT' && this.activeTypes.has(meta.type)) {
          points.push(id);
        }
      }
      return points;
    };

    if (val === '全部') {
      if (cb.checked) {
        this.selectedRegions = ['全部', ...allRegions];
        this.selectedPoints = getAllActivePoints();  // 全选所有激活类型的点
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
        // 区域关联的监测线（仅影响 GNSS 点的连线筛选）
        const lineName = regToLineMap[val];
        if (lineName && !this.selectedLines.includes(lineName)) this.selectedLines.push(lineName);
        // 将该区域下所有激活类型的点加入 selectedPoints
        const regionPoints = Object.keys(mapModule.pMeta).filter(id => {
          const meta = mapModule.pMeta[id];
          return meta.region === val && meta.type !== 'SAT' && this.activeTypes.has(meta.type);
        });
        regionPoints.forEach(id => {
          if (!this.selectedPoints.includes(id)) this.selectedPoints.push(id);
        });
        if (this.selectedRegions.length === 5) this.selectedRegions.push('全部');
      } else {
        this.selectedRegions = this.selectedRegions.filter(r => r !== val && r !== '全部');
        // 移除该区域下所有激活类型的点
        const regionPoints = Object.keys(mapModule.pMeta).filter(id => {
          const meta = mapModule.pMeta[id];
          return meta.region === val && meta.type !== 'SAT' && this.activeTypes.has(meta.type);
        });
        this.selectedPoints = this.selectedPoints.filter(id => !regionPoints.includes(id));
        const line = regToLineMap[val];
        if (line) this.selectedLines = this.selectedLines.filter(l => l !== line && l !== '全部');
      }
    }
    this.renderLines();
    this.syncUI();
},

  handleLineChange(cb) {
    const val = cb.value, isChecked = cb.checked;
    const regToLineMap = { '北帮': '1号线', '南帮': '2号线', '东帮': '3号线', '西帮': '4号线' };
    const lineToRegMap = { '1号线': '北帮', '2号线': '南帮', '3号线': '东帮', '4号线': '西帮' };
    let targetLines = [];
    if (this.selectedRegions.includes('全部')) targetLines = ['1号线', '2号线', '3号线', '4号线'];
    else { this.selectedRegions.forEach(reg => { if (regToLineMap[reg]) targetLines.push(regToLineMap[reg]); }); }
    if (val === '全部') {
      if (isChecked) {
        targetLines.forEach(line => { if (!this.selectedLines.includes(line)) this.selectedLines.push(line); const lineData = connectionModule.detectionLines.find(l => l.name === line); if (lineData) lineData.points.forEach(p => { if (!this.selectedPoints.includes(p.id)) this.selectedPoints.push(p.id); }); });
        if (!this.selectedLines.includes('全部')) this.selectedLines.push('全部');
      } else {
        this.selectedLines = this.selectedLines.filter(l => !targetLines.includes(l) && l !== '全部');
        targetLines.forEach(line => { const lineData = connectionModule.detectionLines.find(l => l.name === line); if (lineData) { const linePointIds = lineData.points.map(p => p.id); this.selectedPoints = this.selectedPoints.filter(id => !linePointIds.includes(id)); } });
      }
    } else {
      if (isChecked) {
        if (!this.selectedLines.includes(val)) this.selectedLines.push(val);
        const lineData = connectionModule.detectionLines.find(l => l.name === val);
        if (lineData) lineData.points.forEach(p => { if (!this.selectedPoints.includes(p.id)) this.selectedPoints.push(p.id); });
        const reg = lineToRegMap[val];
        if (reg && !this.selectedRegions.includes(reg)) this.selectedRegions.push(reg);
      } else {
        this.selectedLines = this.selectedLines.filter(l => l !== val && l !== '全部');
        const lineData = connectionModule.detectionLines.find(l => l.name === val);
        if (lineData) { const linePointIds = lineData.points.map(p => p.id); this.selectedPoints = this.selectedPoints.filter(id => !linePointIds.includes(id)); }
      }
      const isAllNowChecked = targetLines.length > 0 && targetLines.every(l => this.selectedLines.includes(l));
      if (isAllNowChecked) { if (!this.selectedLines.includes('全部')) this.selectedLines.push('全部'); }
      else { this.selectedLines = this.selectedLines.filter(l => l !== '全部'); }
    }
    this.renderLines(); this.syncUI();
  },

  handlePointChange(cb, event) {
    if (event) event.stopPropagation();
    const val = cb.value, isChecked = cb.checked;
    const currentList = this.getDisplayPoints('');
    if (val === '全部') {
      currentList.forEach(p => { if (isChecked) { if (!this.selectedPoints.includes(p.id)) this.selectedPoints.push(p.id); } else { this.selectedPoints = this.selectedPoints.filter(id => id !== p.id); } });
    } else {
      if (isChecked) { if (!this.selectedPoints.includes(val)) this.selectedPoints.push(val); }
      else { this.selectedPoints = this.selectedPoints.filter(id => id !== val); }
    }
    this.renderPoints(document.getElementById('map-point-input').value);
    this.syncUI();
  },

  filterPointList(val) { this.renderPoints(val); },

handlePointInput() {
  const input = document.getElementById('map-point-input');
  if (!input) return;
  const val = input.value.trim();
  // 获取当前所有在线且属于激活类型的设备点
  let allActivePoints = [];
  for (const id of Object.keys(mapModule.pMeta)) {
    const meta = mapModule.pMeta[id];
    if (!meta.isOnline) continue;
    if (!this.activeTypes.has(meta.type)) continue;
    if (meta.type === 'SAT') continue;
    allActivePoints.push({ id, ...meta });
  }
  if (val === '' || val === '全部' || val === '全部监测点') {
    if (val === '全部' || val === '全部监测点') {
      this.selectedPoints = allActivePoints.map(p => p.id);
      this.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
    } else {
      this.selectedPoints = [];
      this.selectedRegions = [];
    }
    this.syncUI();
    return;
  }
  const parts = val.split(/[、,，\s]/).map(p => p.trim()).filter(p => p !== '');
  const newSelectedPoints = [], newSelectedRegions = [];
  parts.forEach(part => {
    // 模糊匹配 deviceId（如 "GNSS11" 或 "RADAR3" 或直接输入编号部分）
    const matchedPoint = allActivePoints.find(p => p.deviceId.toLowerCase() === part.toLowerCase() || p.deviceId.toLowerCase().includes(part.toLowerCase()));
    if (matchedPoint) {
      newSelectedPoints.push(matchedPoint.id);
      if (!newSelectedRegions.includes(matchedPoint.region)) newSelectedRegions.push(matchedPoint.region);
    }
  });
  this.selectedPoints = newSelectedPoints;
  this.selectedRegions = newSelectedRegions;
  if (this.selectedRegions.length === 5) this.selectedRegions.push('全部');
  this.syncUI();
},

  toggleDrawer() {
    this.isOpen = !this.isOpen;
    document.getElementById('device-drawer').classList.toggle('active', this.isOpen);
    document.getElementById('drawer-arrow').innerText = this.isOpen ? '▼' : '▲';
  },

toggle(type, el) {
  if (type === '全部') {
    if (this.activeTypes.size === this.allTypes.length) {
      this.activeTypes.clear();
      this.removeRadarClouds();
      this.removeSatLayer();
      mapModule.selectedMapTypes = mapModule.selectedMapTypes.filter(t => t !== 'uav');
      this.selectedPoints = [];  // 清空所有点
    } else {
      this.allTypes.forEach(t => this.activeTypes.add(t));
      this.renderSatLayer();
      // 添加所有类型的点
      this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => {
        const meta = mapModule.pMeta[id];
        return this.activeTypes.has(meta.type) && meta.type !== 'SAT';
      });
    }
  } else {
    if (this.activeTypes.has(type)) {
      this.activeTypes.delete(type);
      if (type === 'SAT') this.removeSatLayer();
      if (type === 'RADAR') { this.removeRadarClouds(); document.querySelector('.radar-plus')?.classList.remove('cloud-active'); }
      // 从 selectedPoints 中移除该类型的所有点
      this.selectedPoints = this.selectedPoints.filter(id => mapModule.pMeta[id].type !== type);
    } else {
      this.activeTypes.add(type);
      if (type === 'SAT') this.renderSatLayer();
      // 添加该类型的所有点到 selectedPoints
      const newPoints = Object.keys(mapModule.pMeta).filter(id => {
        const meta = mapModule.pMeta[id];
        return meta.type === type && meta.type !== 'SAT';
      });
      this.selectedPoints.push(...newPoints);
    }
  }
  if (window.dashModule) window.dashModule.currentPage = 1;
  this.syncUI();
},
  renderSatLayer() { this.removeSatLayer(); const overlay = document.createElement('div'); overlay.className = 'sat-green-overlay'; overlay.id = 'sat-overlay'; document.getElementById('map-canvas').appendChild(overlay); },
  removeSatLayer() { const el = document.getElementById('sat-overlay'); if (el) el.remove(); },

  toggleRadarCloud(event, el) {
    if (event) event.stopPropagation();
    if (!this.activeTypes.has('RADAR')) return;
    el.classList.toggle('cloud-active');
    this.syncUI();
  },

  renderRadarClouds() {
    this.removeRadarClouds();
    const canvas = document.getElementById('map-canvas');
    const isFullMap = this.selectedRegions.includes('全部');
    document.querySelectorAll('.point-obj.type-RADAR').forEach(p => {
      if (p.style.display === 'none') return;
      const meta = mapModule.pMeta[p.id];
      const fan = document.createElement('div');
      fan.className = 'radar-fan-layer';
      fan.style.left = (parseFloat(p.style.left) + 16 - 1400) + 'px';
      fan.style.top = (parseFloat(p.style.top) + 16 - 2800) + 'px';
      const targetPos = { '北帮':{x:1500,y:2100}, '南帮':{x:1500,y:400}, '东帮':{x:450,y:1250}, '西帮':{x:2550,y:1250}, '中央区':{x:1500,y:1250} }[meta.region];
      const dx = targetPos.x - parseFloat(p.style.left), dy = targetPos.y - parseFloat(p.style.top);
      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      fan.style.transform = `rotate(${angle}deg)`;
      fan.innerHTML = `<div class="radar-fan-label" style="transform:rotate(${-angle}deg)">${meta.deviceId} 监控[${isFullMap?'全域':meta.region}]</div>`;
      canvas.appendChild(fan);
    });
  },

  removeRadarClouds() { document.querySelectorAll('.radar-fan-layer').forEach(el => el.remove()); },

  /** 与地图 syncUI 可见性一致：类型、区域/雷达映射、GNSS 监测点勾选（不含 SAT） */
  isDeviceInDashboardScope(id) {
    const meta = mapModule.pMeta[id];
    if (!meta || meta.type === 'SAT') return false;
    if (!this.activeTypes.has(meta.type)) return false;
    const isFullRegionSelected = this.selectedRegions.includes('全部');
    let isVisibilityMatch = false;
    if (meta.type === 'RADAR') {
      if (isFullRegionSelected) isVisibilityMatch = true;
      else {
        const targets = this.radarTargetMapping[meta.region] || [];
        isVisibilityMatch = this.selectedRegions.some(reg => targets.includes(reg));
      }
    } else {
      isVisibilityMatch = isFullRegionSelected || this.selectedRegions.includes(meta.region);
    }
    const isPointChecked = meta.type === 'GNSS' ? this.selectedPoints.includes(id) : true;
    return isVisibilityMatch && isPointChecked;
  },

  syncUI() {
    this.renderRegions(); this.renderPoints(''); this.updateLabels(); this.updateDrawerStyles();
    const isFullRegionSelected = this.selectedRegions.includes('全部');
    document.querySelectorAll('.point-obj').forEach(p => {
      const meta = mapModule.pMeta[p.id];
      if (!meta) return;
      if (meta.type === 'SAT') { p.style.display = 'none'; return; }
      const isTypeActive = this.activeTypes.has(meta.type);
      let isVisibilityMatch = false;
      if (meta.type === 'RADAR') {
        if (isFullRegionSelected) isVisibilityMatch = true;
        else { const targets = this.radarTargetMapping[meta.region] || []; isVisibilityMatch = this.selectedRegions.some(reg => targets.includes(reg)); }
      } else { isVisibilityMatch = isFullRegionSelected || this.selectedRegions.includes(meta.region); }
      const isPointChecked = this.selectedPoints.includes(p.id);
      p.style.display = (isVisibilityMatch && isTypeActive && isPointChecked) ? 'block' : 'none';
    });
    const plusBtn = document.querySelector('.radar-plus');
    if (this.activeTypes.has('RADAR') && plusBtn && plusBtn.classList.contains('cloud-active')) this.renderRadarClouds();
    else this.removeRadarClouds();
    if (connectionModule && mapModule.selectedMapTypes.includes('geology')) connectionModule.drawConnections();
    if (window.dashModule && typeof window.dashModule.refreshDashboardPanels === 'function') {
      window.dashModule.refreshDashboardPanels();
    }
  },

  updateLabels() {
    const regLabel = document.getElementById('map-region-label');
    if (regLabel) { const active = this.selectedRegions.filter(r => r !== '全部'); regLabel.innerText = (this.selectedRegions.includes('全部') && active.length >= 5) ? '全部区域' : (this.formatLabel(active) || '选择区域'); }
    const lineLabel = document.getElementById('map-line-label');
    if (lineLabel) { const activeLines = this.selectedLines.filter(l => l !== '全部'); lineLabel.innerText = (this.selectedLines.includes('全部') && activeLines.length >= 3) ? '全部监测线' : (this.formatLabel(activeLines) || '选择监测线'); }
    const pointInput = document.getElementById('map-point-input');
    if (pointInput) { const allGnss = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'GNSS'); if (this.selectedPoints.length > 0 && this.selectedPoints.length === allGnss.length) pointInput.value = '全部监测点'; else pointInput.value = this.selectedPoints.map(id => mapModule.pMeta[id].deviceId).join('、'); }
  },

  updateDrawerStyles() {
    document.querySelectorAll('.drawer-icons .filter-item').forEach(item => {
      const isAllBtn = item.classList.contains('all-btn');
      let isActive = false;
      if (isAllBtn) {
        isActive = this.activeTypes.size >= this.allTypes.length;
      } else {
        const typeKey = item.dataset.type;
        if (typeKey) isActive = this.activeTypes.has(typeKey);
      }
      item.classList.toggle('checked', isActive);
    });
  },

  formatLabel(list) { if (!list || list.length === 0) return null; return list.length <= 2 ? list.join('、') : list.slice(0, 2).join('、') + '...'; }
};

// ================= 连线模块 =================
const connectionModule = {
  svg: null,
  detectionLines: [],

  init() {
    this.svg = document.getElementById('connection-svg');
    if (!this.svg) return;
    this.svg.style.position = 'absolute'; this.svg.style.top = '0'; this.svg.style.left = '0'; this.svg.style.width = '100%'; this.svg.style.height = '100%'; this.svg.style.pointerEvents = 'none'; this.svg.style.zIndex = '50'; this.svg.style.overflow = 'visible';
    this.generateDetectionLines();
  },

  getDevicesByLines(selectedLines) {
    this.generateDetectionLines();
    const deviceIds = new Set();
    if (selectedLines.includes('全部') || selectedLines.length === 0) { document.querySelectorAll('.point-obj.type-GNSS').forEach(point => deviceIds.add(point.id)); return Array.from(deviceIds); }
    this.detectionLines.forEach(line => { if (selectedLines.includes(line.name)) line.points.forEach(p => deviceIds.add(p.id)); });
    return Array.from(deviceIds);
  },

  generateDetectionLines() {
    this.detectionLines = [];
    const regions = ['北帮', '南帮', '东帮', '西帮'];
    const lineColors = ['#F57676', '#FFA500', '#66B1FF', '#71C446'];
    regions.forEach((reg, idx) => {
      const linePoints = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].region === reg && mapModule.pMeta[id].isOnDetectionLine).map(id => { const el = document.getElementById(id); return { id: id, x: parseFloat(el.style.left) + 16, y: parseFloat(el.style.top) + 16 }; }).sort((a, b) => (idx < 2) ? (a.x - b.x) : (a.y - b.y));
      if (linePoints.length >= 2) this.detectionLines.push({ id: idx + 1, name: `${idx + 1}号线`, region: reg, color: lineColors[idx], points: linePoints, path: `M ${linePoints[0].x} ${linePoints[0].y} ` + linePoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') });
    });
    if (window.mapFilterModule) window.mapFilterModule.allLines = ['全部', '1号线', '2号线', '3号线', '4号线'];
  },

  drawConnections() {
    if (!this.svg) return;
    this.svg.innerHTML = '';
    this.generateDetectionLines();
    const selectedLines = window.mapFilterModule ? window.mapFilterModule.selectedLines : ['全部'];
    this.detectionLines.forEach(line => {
      if (!(selectedLines.includes('全部') || selectedLines.includes(line.name))) return;
      const activePointsOnLine = line.points.filter(p => mapFilterModule.selectedPoints.includes(p.id));
      if (activePointsOnLine.length < 2) return;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", line.path); path.setAttribute("stroke", line.color); path.setAttribute("stroke-width", "3"); path.setAttribute("fill", "none"); path.setAttribute("stroke-opacity", "0.7");
      this.svg.appendChild(path);
    });
  },

  setVisible(visible) { if (this.svg) this.svg.style.display = visible ? 'block' : 'none'; }
};

// ================= 剖面模块 =================
const profileModule = {
  isDrawing: false, selectedPoints: [], isDragging: false, dragLine: { start: null, end: null }, chartInstance: null, lastSavedOptions: null, currentOptions: null, isViewingHistory: false,

  enterMode() { this.isDrawing = true; this.selectedPoints = []; this.dragLine = { start: null, end: null }; document.getElementById('draw-toolbar').style.display = 'flex'; document.getElementById('btn-enter-profile').style.display = 'none'; document.getElementById('map-viewer').style.cursor = 'crosshair'; this.resetDrawingData(); },
  exitMode() { this.isDrawing = false; if (this.chartInstance) { this.chartInstance.dispose(); this.chartInstance = null; } document.getElementById('draw-toolbar').style.display = 'none'; document.getElementById('profile-mini-trigger').style.display = 'none'; document.getElementById('btn-enter-profile').style.display = 'block'; document.getElementById('map-viewer').style.cursor = 'grab'; this.currentOptions = null; this.lastSavedOptions = null; this.resetDrawingData(); },
  confirmDraw() {
    let startPos, endPos;
    if (this.selectedPoints.length >= 2) { const pStart = document.getElementById(this.selectedPoints[0]), pEnd = document.getElementById(this.selectedPoints[this.selectedPoints.length - 1]); startPos = { x: parseFloat(pStart.style.left), y: parseFloat(pStart.style.top) }; endPos = { x: parseFloat(pEnd.style.left), y: parseFloat(pEnd.style.top) }; }
    else if (this.dragLine.start && this.dragLine.end) { startPos = this.dragLine.start; endPos = this.dragLine.end; }
    else { alert("请选择监测点或按住Ctrl划线以生成剖面"); return; }
    this.currentOptions = this.generateChartOptions(startPos, endPos); this.isViewingHistory = false;
    document.getElementById('profile-workbench').style.display = 'flex';
    document.getElementById('profile-mini-trigger').style.display = this.lastSavedOptions ? 'flex' : 'none';
    this.updateWorkbenchUI();
  },
  hideWorkbench() { if (this.isViewingHistory) { this.isViewingHistory = false; this.updateWorkbenchUI(); return; } if (this.currentOptions) { this.lastSavedOptions = JSON.parse(JSON.stringify(this.currentOptions)); this.currentOptions = null; } document.getElementById('profile-workbench').style.display = 'none'; document.getElementById('profile-mini-trigger').style.display = 'flex'; this.resetDrawingData(); },
  restoreWorkbench() { if (!this.lastSavedOptions) return; this.isViewingHistory = true; document.getElementById('profile-workbench').style.display = 'flex'; this.updateWorkbenchUI(); },
  updateWorkbenchUI() {
    const targetOptions = this.isViewingHistory ? this.lastSavedOptions : this.currentOptions;
    if (!targetOptions) return;
    if (!this.chartInstance) this.chartInstance = echarts.init(document.getElementById('profile-chart'));
    this.chartInstance.setOption(targetOptions, true); this.chartInstance.resize();
    const tag = document.getElementById('profile-tag');
    if (this.isViewingHistory) { tag.innerText = "历史记录对比模式"; tag.style.background = "#ffa500"; } else { tag.innerText = "最新绘制曲线窗口"; tag.style.background = "#71C446"; }
  },
  generateChartOptions(start, end) {
    const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    const seed = (Math.abs(start.x + start.y - end.x - end.y) % 100) / 100;
    const terrainData = [], slidingData = [];
    const baseH = 1200 + (seed * 80), slope = (end.y - start.y) / 5;
    for (let i = 0; i < 6; i++) { const ratio = i / 5; const h = baseH - (slope * ratio) + (Math.sin(ratio * Math.PI + seed * 10) * 20); terrainData.push(h.toFixed(1)); slidingData.push((h - (25 + (seed * 40) * Math.sin(ratio * Math.PI))).toFixed(1)); }
    return { title: { text: `剖面结构分析 (${Math.round(distance)}m)`, left: 'center', textStyle: { color: '#1c3d90', fontSize: 14 } }, tooltip: { trigger: 'axis' }, legend: { data: ['地表线', '预估滑动面'], bottom: 10 }, grid: { top: 60, bottom: 80, left: 60, right: 40 }, xAxis: { type: 'category', data: ['起', '20%', '40%', '60%', '80%', '终'], boundaryGap: false }, yAxis: { type: 'value', name: '高程(m)', min: v => Math.floor(v.min / 10) * 10 - 20 }, series: [{ name: '地表线', data: terrainData, type: 'line', smooth: true, areaStyle: { color: 'rgba(133, 198, 241, 0.3)' }, lineStyle: { color: '#1c3d90', width: 3 } }, { name: '预估滑动面', data: slidingData, type: 'line', smooth: true, lineStyle: { type: 'dashed', color: '#F57676', width: 2 } }] };
  },
  closeWorkbench() { this.exitMode(); document.getElementById('profile-workbench').style.display = 'none'; },
  resetDrawingData() { this.selectedPoints = []; this.dragLine = { start: null, end: null }; document.querySelectorAll('.point-obj').forEach(p => p.classList.remove('selected')); this.renderLines(); },
  handlePointClick(id) { if (!this.isDrawing || this.dragLine.start) return; const idx = this.selectedPoints.indexOf(id); if (idx > -1) { this.selectedPoints.splice(idx, 1); document.getElementById(id).classList.remove('selected'); } else { this.selectedPoints.push(id); document.getElementById(id).classList.add('selected'); } this.renderLines(); },
  handleMouseDown(e) { if (!this.isDrawing || !e.ctrlKey) return; const r = document.getElementById('map-canvas').getBoundingClientRect(); this.isDragging = true; this.dragLine.start = { x: (e.clientX - r.left) / mapModule.scale, y: (e.clientY - r.top) / mapModule.scale }; e.preventDefault(); },
  handleMouseMove(e) { if (!this.isDrawing || !this.isDragging) return; const r = document.getElementById('map-canvas').getBoundingClientRect(); this.dragLine.end = { x: (e.clientX - r.left) / mapModule.scale, y: (e.clientY - r.top) / mapModule.scale }; this.renderLines(); },
  handleMouseUp() { if (this.isDragging) this.isDragging = false; },
  renderLines() { const svg = document.getElementById('draw-svg'); if(!svg) return; svg.innerHTML = ''; if (this.selectedPoints.length >= 2) { let pathStr = ""; this.selectedPoints.forEach((pid, i) => { const el = document.getElementById(pid); pathStr += (i === 0 ? 'M' : 'L') + `${parseFloat(el.style.left) + 16} ${parseFloat(el.style.top) + 16}`; }); const path = document.createElementNS("http://www.w3.org/2000/svg", "path"); path.setAttribute("d", pathStr); path.setAttribute("stroke", "rgba(113, 196, 70, 0.8)"); path.setAttribute("stroke-width", "4"); path.setAttribute("fill", "none"); path.setAttribute("stroke-dasharray", "8,8"); svg.appendChild(path); } if (this.dragLine.start && this.dragLine.end) { const line = document.createElementNS("http://www.w3.org/2000/svg", "line"); line.setAttribute("x1", this.dragLine.start.x); line.setAttribute("y1", this.dragLine.start.y); line.setAttribute("x2", this.dragLine.end.x); line.setAttribute("y2", this.dragLine.end.y); line.setAttribute("stroke", "#F57676"); line.setAttribute("stroke-width", "6"); svg.appendChild(line); } },
  exportImage() { if (!this.chartInstance) return; const link = document.createElement('a'); link.href = this.chartInstance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' }); link.download = `剖面分析_${Date.now()}.png`; link.click(); }
};

// ================= 仪表盘模块（离线弹窗及聚焦） =================
const dashModule = {
  offlineData: [],
  _offlineModalKeepMapState: false,
  offlineCurrentPage: 1,
  offlinePageSize: 5,
  currentPage: 1,
  pageSize: 15,
  thresholds: { 0: 8.0, 1: 5.0, 2: 4.0, 3: 3.0, 4: '--' },
  colors: ['#F57676', '#FFA500', '#E6A23C', '#66B1FF', '#71C446'],
  currentChartId: null,
  _analysisMapSnapshot: null,

  /** 关闭数据分析弹窗后恢复地图缩放、筛选与点位展示 */
  endAnalysisFocus() {
    const snap = this._analysisMapSnapshot;
    if (!snap) return;
    mapModule.scale = snap.scale;
    mapModule.pos = { ...snap.pos };
    mapModule.isDetailMode = snap.isDetailMode;
    mapModule.tMultiplier = snap.tMultiplier;
    mapFilterModule.activeTypes.clear();
    snap.activeTypes.forEach((t) => mapFilterModule.activeTypes.add(t));
    mapFilterModule.selectedRegions = [...snap.selectedRegions];
    mapFilterModule.selectedPoints = [...snap.selectedPoints];
    mapFilterModule.selectedLines = [...snap.selectedLines];
    const cv = document.getElementById('map-canvas');
    const vp = document.getElementById('map-viewer');
    if (cv && vp) {
      cv.style.transform = `translate(${mapModule.pos.x}px, ${mapModule.pos.y}px) scale(${mapModule.scale})`;
    }
    const rb = document.getElementById('reset-gnss-btn');
    if (rb) rb.style.display = 'none';
    document.querySelectorAll('.point-obj').forEach((p) => p.classList.remove('point-focus-center'));
    mapFilterModule.syncUI();
    document.querySelectorAll('.point-obj.type-GNSS').forEach((p) => {
      const meta = mapModule.pMeta[p.id];
      p.classList.remove('breathe', 'point-glow-active');
      if (meta && meta.isOnline && meta.alarmIdx === 0 && p.style.display !== 'none') {
        p.style.color = p.style.backgroundColor;
        p.classList.add('breathe', 'point-glow-active');
      }
    });
    mapFilterModule.updateLabels();
    this._analysisMapSnapshot = null;
  },

  getSortedGnssData() {
    let data = Object.keys(mapModule.pMeta)
      .filter(id => {
        const meta = mapModule.pMeta[id];
        return meta && meta.type === 'GNSS' && meta.isOnline;
      })
      .map(id => {
        const meta = mapModule.pMeta[id];
        const seed = parseInt(id.replace('pt-', '')) || 0;
        const variance = (seed % 10) * 0.1;
        let currentSpeed = 0.5;
        switch (meta.alarmIdx) {
          case 0:
            currentSpeed = 8.1 + variance * 3.5;
            break;
          case 1:
            currentSpeed = 5.1 + variance * 2.5;
            break;
          case 2:
            currentSpeed = 4.1 + variance * 0.8;
            break;
          case 3:
            currentSpeed = 3.1 + variance * 0.8;
            break;
          default:
            currentSpeed = 0.5 + (seed % 5) * 0.4;
        }
        return {
          id: id,
          deviceId: meta.deviceId,
          alarmIdx: meta.alarmIdx,
          region: meta.region,
          elevation: (1200 + Math.sin(seed) * 50).toFixed(1),
          value: currentSpeed.toFixed(2),
          threshold: this.thresholds[meta.alarmIdx],
        };
      });
    return data.sort((a, b) => a.alarmIdx - b.alarmIdx || b.value - a.value);
  },

/** 右侧看板「监测预警」表格：根据地图当前显示的所有在线设备生成预警时间和随机值（排除遥感和地质写实） */
getWarningTableData() {
    const rows = [];
    // 遍历所有设备
    for (const id of Object.keys(mapModule.pMeta)) {
        const meta = mapModule.pMeta[id];
        // 只考虑在线设备
        if (!meta || !meta.isOnline) continue;
        // ⭐ 排除遥感和地质写实监测点
        if (meta.type === 'SAT' || meta.type === 'SURFACE') continue;
        // 必须符合地图当前的筛选条件（区域、监测线、设备类型勾选等）
        if (!mapFilterModule.isDeviceInDashboardScope(id)) continue;

        // 生成随机预警时间（最近7天内）
        const seed = parseInt(id.replace('pt-', ''), 10) || 0;
        const now = new Date();
        const randomDaysAgo = Math.floor(Math.random() * 7);
        const randomHours = Math.floor(Math.random() * 24);
        const randomMinutes = Math.floor(Math.random() * 60);
        const warnTime = new Date(now);
        warnTime.setDate(now.getDate() - randomDaysAgo);
        warnTime.setHours(randomHours, randomMinutes, 0, 0);
        const warnTimeStr = `${warnTime.getMonth() + 1}/${warnTime.getDate()} ${warnTime.getHours().toString().padStart(2, '0')}:${warnTime.getMinutes().toString().padStart(2, '0')}`;

        // 根据设备类型生成不同量级的随机值（用于演示）
        let value = '0.00';
        if (meta.type === 'GNSS') {
            value = (Math.random() * 10 + 0.5).toFixed(2);      // 0.5~10.5
        } else if (meta.type === 'RADAR') {
            value = (Math.random() * 20 + 1).toFixed(2);        // 1~21
        } else if (meta.type === 'DEEP') {
            value = (Math.random() * 30 + 5).toFixed(2);        // 5~35
        } else if (meta.type === 'STRESS') {
            value = (Math.random() * 200 + 50).toFixed(2);      // 50~250
        } else {
            value = (Math.random() * 15 + 1).toFixed(2);        // 其他类型
        }

        rows.push({
            id: meta.id,
            deviceId: meta.deviceId,
            alarmIdx: meta.alarmIdx,
            region: meta.region,
            type: meta.type,
            warnTime: warnTimeStr,
            value: value,
            threshold: this.thresholds[meta.alarmIdx],
        });
    }
    // 按预警等级排序（一级最高），同等级按值降序
    return rows.sort((a, b) => {
        const d = a.alarmIdx - b.alarmIdx;
        if (d !== 0) return d;
        return parseFloat(b.value) - parseFloat(a.value);
    });
},

  getSortedVibData() {
    const data = Object.keys(mapModule.pMeta)
      .filter(id => {
        const meta = mapModule.pMeta[id];
        return meta && meta.type === 'VIB' && meta.isOnline;
      })
      .map(id => {
        const meta = mapModule.pMeta[id];
        const seed = parseInt(id.replace('pt-', '')) || 0;
        const variance = (seed % 10) * 0.1;
        let currentSpeed = 0.5;
        switch (meta.alarmIdx) {
          case 0:
            currentSpeed = 8.1 + variance * 3.5;
            break;
          case 1:
            currentSpeed = 5.1 + variance * 2.5;
            break;
          case 2:
            currentSpeed = 4.1 + variance * 0.8;
            break;
          case 3:
            currentSpeed = 3.1 + variance * 0.8;
            break;
          default:
            currentSpeed = 0.5 + (seed % 5) * 0.4;
        }
        return {
          id,
          deviceId: meta.deviceId,
          alarmIdx: meta.alarmIdx,
          region: meta.region,
          value: currentSpeed.toFixed(2),
        };
      });
    return data.sort((a, b) => a.alarmIdx - b.alarmIdx || parseFloat(b.value) - parseFloat(a.value));
  },

  init() {
    this.refreshDashboardPanels();
  },

  refreshDashboardPanels() {
    if (!document.getElementById('chart-on')) return;
    this.initOnlineChart();
    this.initAlarmChart();
    this.renderWarningTable();
  },

  initOnlineChart() {
    const el = document.getElementById('chart-on');
    if (!el) return;
    const prev = echarts.getInstanceByDom(el);
    if (prev) prev.dispose();
    const scopeIds = Object.keys(mapModule.pMeta).filter((id) => mapFilterModule.isDeviceInDashboardScope(id));
    const scopeMetas = scopeIds.map((id) => mapModule.pMeta[id]);
    const online = scopeMetas.filter((n) => n.isOnline).length;
    const offline = scopeMetas.length - online;
    const chart = echarts.init(el);
    chart.setOption({
      title: {
        text: scopeMetas.length,
        subtext: '设备总数',
        left: 'center',
        top: '35%',
        textStyle: { fontSize: 18, color: '#1c3d90', fontWeight: 'bold' },
        subtextStyle: { fontSize: 10, color: '#999', verticalAlign: 'top' },
      },
      tooltip: { show: false },
      legend: {
        bottom: '2',
        icon: 'circle',
        itemWidth: 8,
        textStyle: { fontSize: 9 },
        selectedMode: false,
        formatter: (name) => `${name}  ${name === '在线' ? online : offline}`,
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '65%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          label: { show: false },
          data: [
            { value: online, name: '在线', itemStyle: { color: '#71C446' } },
            { value: offline, name: '离线', itemStyle: { color: '#999' } },
          ],
        },
      ],
    });
chart.on('click', (params) => {
  if (params.name === '离线') this.showOfflineModal(scopeMetas.filter((n) => !n.isOnline), true); // 传入 true，表示不修改地图状态
});
  },

  initAlarmChart() {
    const el = document.getElementById('chart-al');
    if (!el) return;
    const prev = echarts.getInstanceByDom(el);
    if (prev) prev.dispose();
    const scopeIds = Object.keys(mapModule.pMeta).filter((id) => mapFilterModule.isDeviceInDashboardScope(id));
    const scopeMetas = scopeIds.map((id) => mapModule.pMeta[id]);
    const onlineNodes = scopeMetas.filter((n) => n.isOnline);
    const counts = [0, 0, 0, 0, 0];
    onlineNodes.forEach((n) => {
      counts[n.alarmIdx]++;
    });
    const chart = echarts.init(el);
    const alarmColors = ['#F57676', '#FFA500', '#fadb14', '#66B1FF', '#71C446'];
    const alarmNames = ['一级告警', '二级告警', '三级告警', '四级告警', '运行正常'];
    let displayCount = 0;
    let displayLabel = '运行正常';
    let displayColor = alarmColors[4];
    for (let i = 0; i < 5; i++) {
      if (counts[i] > 0) {
        displayCount = counts[i];
        displayLabel = alarmNames[i];
        displayColor = alarmColors[i];
        break;
      }
    }
    chart.setOption({
      title: {
        text: displayCount,
        subtext: displayLabel,
        left: 'center',
        top: '35%',
        textStyle: { fontSize: 18, color: displayColor, fontWeight: 'bold' },
        subtextStyle: { fontSize: 10, color: '#999', verticalAlign: 'top' },
      },
      tooltip: { show: false },
      legend: {
        bottom: '2',
        icon: 'circle',
        itemWidth: 8,
        textStyle: { fontSize: 8 },
        selectedMode: false,
        formatter: (name) => {
          const idx = alarmNames.indexOf(name);
          return `${name}  ${counts[idx]}`;
        },
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '65%'],
          center: ['50%', '45%'],
          label: { show: false },
          data: alarmNames.map((name, i) => ({
            value: counts[i],
            name,
            itemStyle: { color: alarmColors[i] },
          })),
        },
      ],
    });
    chart.on('click', (params) => {
      const targetIdx = params.dataIndex;
      if (targetIdx === 4) return;
      mapModule.isDetailMode = true;
      mapModule.tMultiplier = 1;
      document.querySelectorAll('.freq-btn').forEach((b) => b.classList.remove('active'));
      const oneDayBtn = document.querySelector('.freq-btn');
      if (oneDayBtn) oneDayBtn.classList.add('active');
      const resetBtn = document.getElementById('reset-gnss-btn');
      if (resetBtn) resetBtn.style.display = 'flex';
      document.querySelectorAll('.point-obj').forEach((p) => {
        const meta = mapModule.pMeta[p.id];
        const isMatch =
          meta && mapFilterModule.isDeviceInDashboardScope(p.id) && meta.isOnline && meta.alarmIdx === targetIdx;
        p.classList.remove('breathe', 'point-glow-active', 'point-focus-center');
        if (isMatch) {
          p.style.display = 'block';
          p.style.color = p.style.backgroundColor;
          p.classList.add('breathe', 'point-glow-active');
        } else {
          p.style.display = 'none';
        }
      });
      mapModule.fitVisibleFilteredPoints();
    });
  },

  renderWarningTable() {
    const tbody = document.getElementById('warning-list');
    const pagEl = document.getElementById('table-pagination');
    if (!tbody || !pagEl) return;
    const allData = this.getWarningTableData();
    const totalPages = Math.ceil(allData.length / this.pageSize) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const pageData = allData.slice(startIndex, startIndex + this.pageSize);
    const statusColors = ['#f5222d', '#fa8c16', '#fadb14', '#1890ff', '#52c41a'];

    tbody.innerHTML = pageData
      .map((item, i) => {
        const isRed = item.alarmIdx === 0;
        const rowClass = isRed ? 'row-red-active' : '';
        const textColor = isRed ? 'inherit' : statusColors[item.alarmIdx];
        return `<tr class="${rowClass}" style="cursor:pointer;" onclick="dashModule.focusWithRange('${item.id}')">
          <td>${startIndex + i + 1}</td>
          <td>${item.region}</td>
          <td style="color:${textColor}; font-weight:600;">${item.deviceId}</td>
          <td style="color:#666; font-size:12px;">${item.warnTime}</td>
          <td style="color:${textColor}; font-weight:600;">${item.value}</td>
          <td style="color:#888;">${item.threshold}</td>
        </tr>`;
      })
      .join('');

    pagEl.innerHTML = `<button class="pager-btn ${this.currentPage === 1 ? 'disabled' : ''}" onclick="if(${this.currentPage}>1)dashModule.changePage(${this.currentPage - 1})"> &lt; </button>
      <span style="font-weight:bold; min-width:30px; text-align:center; color:#000;">${this.currentPage} / ${totalPages}</span>
      <button class="pager-btn ${this.currentPage === totalPages ? 'disabled' : ''}" onclick="if(${this.currentPage}<${totalPages})dashModule.changePage(${this.currentPage + 1})"> &gt; </button>`;
  },

  changePage(p) {
    this.currentPage = p;
    this.renderWarningTable();
  },

  focusWithRange(targetId) {
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;
    const targetMeta = mapModule.pMeta[targetId];
    const focusType = targetMeta?.type;
    this._analysisMapSnapshot = {
      scale: mapModule.scale,
      pos: { ...mapModule.pos },
      isDetailMode: mapModule.isDetailMode,
      tMultiplier: mapModule.tMultiplier,
      activeTypes: Array.from(mapFilterModule.activeTypes),
      selectedRegions: [...mapFilterModule.selectedRegions],
      selectedPoints: [...mapFilterModule.selectedPoints],
      selectedLines: [...mapFilterModule.selectedLines],
    };
    const tx = parseFloat(targetEl.style.left),
      ty = parseFloat(targetEl.style.top);
    mapModule.isDetailMode = true;
    mapModule.tMultiplier = 1;
    document.querySelectorAll('.freq-btn').forEach((b) => b.classList.remove('active'));
    const oneDayBtn = document.querySelector('.freq-btn');
    if (oneDayBtn) oneDayBtn.classList.add('active');
    const resetBtn = document.getElementById('reset-gnss-btn');
    if (resetBtn) resetBtn.style.display = 'flex';
    let maxDiffX = 100,
      maxDiffY = 100;
    const applyNearbyVisibility = (p) => {
      const px = parseFloat(p.style.left),
        py = parseFloat(p.style.top);
      const dist = Math.sqrt((px - tx) ** 2 + (py - ty) ** 2);
      p.classList.remove('breathe', 'point-glow-active', 'point-focus-center');
      if (p.id === targetId || dist <= 1200) {
        p.style.display = 'block';
        p.style.color = p.style.backgroundColor;
        maxDiffX = Math.max(maxDiffX, Math.abs(px - tx));
        maxDiffY = Math.max(maxDiffY, Math.abs(py - ty));
        if (p.id === targetId) p.classList.add('point-focus-center');
      } else {
        p.style.display = 'none';
      }
    };
    document.querySelectorAll('.point-obj').forEach((p) => {
      const meta = mapModule.pMeta[p.id];
      if (!meta) return;
      if (meta.type === 'GNSS') {
        applyNearbyVisibility(p);
      } else if (focusType && meta.type === focusType) {
        applyNearbyVisibility(p);
      } else {
        p.style.display = 'none';
      }
    });
    const vp = document.getElementById('map-viewer'),
      cv = document.getElementById('map-canvas');
    const padding = 200;
    const scaleX = vp.clientWidth / 2 / (maxDiffX + padding),
      scaleY = vp.clientHeight / 2 / (maxDiffY + padding);
    mapModule.scale = Math.min(scaleX, scaleY, 1.0);
    mapModule.pos.x = vp.clientWidth / 2 - tx * mapModule.scale;
    mapModule.pos.y = vp.clientHeight / 2 - ty * mapModule.scale;
    cv.style.transform = `translate(${mapModule.pos.x}px, ${mapModule.pos.y}px) scale(${mapModule.scale})`;
  },

showOfflineModal(data, keepMapState = false) {
    const modal = document.getElementById('offline-modal');
    const mapSection = document.getElementById('main-map-section');

    // 标记本次弹窗是否保持地图状态
    this._offlineModalKeepMapState = keepMapState;

    if (!keepMapState) {
        // 只有需要修改地图状态时才保存快照
        this._offlineModalSnapshot = {
            activeTypes: Array.from(mapFilterModule.activeTypes),
            selectedRegions: [...mapFilterModule.selectedRegions],
            selectedPoints: [...mapFilterModule.selectedPoints],
        };
    } else {
        this._offlineModalSnapshot = null;
    }

    this.offlineData = data;
    this.offlineCurrentPage = 1;
    mapSection.appendChild(modal);
    modal.style.display = 'flex';

    if (!keepMapState) {
        // 修改地图筛选（原有逻辑）
        const offlineIds = data.map((n) => n.id).filter(Boolean);
        const offlineRegions = [...new Set(data.map((n) => n.region))];
        mapFilterModule.selectedPoints = offlineIds;
        mapFilterModule.selectedRegions = offlineRegions.length ? offlineRegions : [];
        mapFilterModule.syncUI();
        const regBtn = document.getElementById('map-region-btn');
        const pointInp = document.getElementById('map-point-input');
        [regBtn, pointInp].forEach((el) => {
            if (el) {
                el.disabled = true;
                el.style.opacity = '0.5';
                el.style.cursor = 'not-allowed';
            }
        });
        document.querySelectorAll('.freq-btn').forEach((btn) => btn.classList.remove('active'));
    } else {
        // 保持地图状态，只显示弹窗，不做任何地图修改
        // 但需要确保弹窗不会与现有地图交互冲突（如遮罩层等）
    }

    this.renderOfflineTable();
},

  renderOfflineTable() {
    const total = this.offlineData.length;
    const totalPages = Math.ceil(total / this.offlinePageSize) || 1;
    const start = (this.offlineCurrentPage - 1) * this.offlinePageSize;
    const pageData = this.offlineData.slice(start, start + this.offlinePageSize);
    const vendors = ['海康威视', '大华股份', '华测导航', '司南导航', '中海达'];
    let html = pageData
      .map((n, i) => {
        const seed = parseInt(n.id.replace('pt-', '')) || 0;
        const elevation = n.type === 'GNSS' ? `${(1200 + Math.sin(seed) * 50).toFixed(1)}m` : '';
        const hour = String(Math.floor((seed % 12) + 8)).padStart(2, '0');
        const minute = String(seed % 60).padStart(2, '0');
        const offlineTime = `2026-01-20 ${hour}:${minute}`;
        const vendor = vendors[seed % vendors.length];
        return `<tr>
<td style="text-align: center; vertical-align: middle;"><span style="color:#999; font-family: monospace;">#${(start + i + 1).toString().padStart(2, '0')}</span></td>
<td style="text-align: center; vertical-align: middle;"><b style="color:#333">${n.region}</b></td>
<td style="text-align: center; vertical-align: middle;"><span class="status-tag-offline">${n.deviceId}</span></td>
<td style="text-align: center; vertical-align: middle; color:#666; font-size:13px;">${offlineTime}</td>
<td style="text-align: center; vertical-align: middle;"><span class="vendor-tag">${vendor}</span></td>
        </tr>`;
      })
      .join('');
    const emptyRowsCount = this.offlinePageSize - pageData.length;
    for (let i = 0; i < emptyRowsCount; i++)
      html += `<tr><td colspan="6" style="border:none; height: 53px;">&nbsp;</td></tr>`;
    document.getElementById('offline-table-body').innerHTML = html;
    const info = document.getElementById('offline-pager-info');
    if (info)
      info.innerHTML = `显示 <b>${start + 1} - ${Math.min(start + this.offlinePageSize, total)}</b> / 总计 ${total} 条`;
    const ctrl = document.getElementById('offline-pager-ctrl');
    if (ctrl) {
      ctrl.innerHTML = `<button class="pager-btn ${this.offlineCurrentPage === 1 ? 'disabled' : ''}" onclick="if(dashModule.offlineCurrentPage > 1) dashModule.changeOfflinePage(dashModule.offlineCurrentPage - 1)">< 上一页</button>
        <span style="margin: 0 15px; color:#999; font-weight:bold;">${this.offlineCurrentPage} / ${totalPages}</span>
        <button class="pager-btn ${this.offlineCurrentPage === totalPages ? 'disabled' : ''}" onclick="if(dashModule.offlineCurrentPage < totalPages) dashModule.changeOfflinePage(dashModule.offlineCurrentPage + 1)">下一页 ></button>`;
    }
  },

  changeOfflinePage(page) {
    this.offlineCurrentPage = page;
    this.renderOfflineTable();
  },

closeOfflineModal() {
    document.getElementById('offline-modal').style.display = 'none';

    const keepMapState = this._offlineModalKeepMapState;
    const snap = this._offlineModalSnapshot;
    const hadSnap = !!snap;

    if (!keepMapState) {
        // 原有恢复逻辑（需要修改地图状态）
        if (snap) {
            mapFilterModule.activeTypes.clear();
            snap.activeTypes.forEach((t) => mapFilterModule.activeTypes.add(t));
            mapFilterModule.selectedRegions = [...snap.selectedRegions];
            mapFilterModule.selectedPoints = [...snap.selectedPoints];
            this._offlineModalSnapshot = null;
        } else {
            mapFilterModule.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
            const allGnssIds = Object.keys(mapModule.pMeta).filter((id) => mapModule.pMeta[id].type === 'GNSS');
            mapFilterModule.selectedPoints = [...allGnssIds];
            mapFilterModule.activeTypes.clear();
            mapFilterModule.activeTypes.add('GNSS');
        }

        const regBtn = document.getElementById('map-region-btn');
        const pointInp = document.getElementById('map-point-input');
        [regBtn, pointInp].forEach((el) => {
            if (el) {
                el.disabled = false;
                el.style.opacity = '1';
                el.style.cursor = 'pointer';
            }
        });
        const defaultBtn = document.querySelector('.freq-btn');
        if (defaultBtn) mapModule.setTime(1, defaultBtn);
        mapModule.isDetailMode = false;
        mapFilterModule.syncUI();
        if (hadSnap) mapModule.fitVisibleFilteredPoints();
        else mapModule.focus('GNSS');
    } else {
        // 保持地图状态，关闭弹窗后什么都不做，只重置标记
        this._offlineModalKeepMapState = false;
        // 确保地图的筛选按钮等保持原样（不做任何恢复）
    }
},
};

// ================= 应用逻辑（重置GNSS筛选） =================
const appLogic = {
  resetGnssFilter() {
    dashModule.endAnalysisFocus();
    dashModule.currentPage = 1;
    dashModule.renderWarningTable();
  }
};

// 挂载到全局，供内联事件使用
window.mapModule = mapModule;
window.mapFilterModule = mapFilterModule;
window.connectionModule = connectionModule;
window.profileModule = profileModule;
window.dashModule = dashModule;
window.appLogic = appLogic;
window.timeUtils = timeUtils;

window.analysisModule = analysisModule;

function onAnalysisModalCloseCapture(e) {
  const closeEl = e.target.closest && e.target.closest('.modal-close');
  if (!closeEl) return;
  const modal = closeEl.closest('[id="analysis-modal"], [id$="-analysis-modal"]');
  if (!modal) return;
  queueMicrotask(() => {
    if (window.dashModule && typeof window.dashModule.endAnalysisFocus === 'function') {
      window.dashModule.endAnalysisFocus();
    }
  });
}

onMounted(() => {
  document.addEventListener('click', onAnalysisModalCloseCapture, true);
  mapModule.init();
  connectionModule.init();
  mapFilterModule.init();
  timeUtils.updateMaxConstraints();
  setInterval(() => timeUtils.updateMaxConstraints(), 60000);
  const oneDayBtn = document.querySelector('#time-engine-bar .freq-btn');
  if (oneDayBtn) mapModule.setTime(1, oneDayBtn);
  setTimeout(() => { if (mapModule.selectedMapTypes.includes('geology')) connectionModule.drawConnections(); }, 500);
});

onBeforeUnmount(() => {
  const tt = document.getElementById('map-tooltip');
  if (tt) tt.style.display = 'none';
  if (mapModule.createdTooltipByMapModule && tt?.parentNode) {
    tt.parentNode.removeChild(tt);
    mapModule.createdTooltipByMapModule = false;
  }
  const analysisModal = document.getElementById('analysis-modal');
  if (mapModule.createdAnalysisModalByMapModule && analysisModal?.parentNode) {
    analysisModal.parentNode.removeChild(analysisModal);
    mapModule.createdAnalysisModalByMapModule = false;
  }
  const exportPanel = document.getElementById('export-panel');
  if (mapModule.createdExportPanelByMapModule && exportPanel?.parentNode) {
    exportPanel.parentNode.removeChild(exportPanel);
    mapModule.createdExportPanelByMapModule = false;
  }
  document.removeEventListener('click', onAnalysisModalCloseCapture, true);
  window.removeEventListener('mousemove', null);
  window.removeEventListener('mouseup', null);
});
</script>
<style>
:root {
    --primary-blue: #85C6F1;
    --aux-blue-1: #90CFF4;
    --aux-blue-2: #C3e4FD;
    --aux-blue-3: #D6EDFE;
    --text-primary: #030303;
    --text-secondary: #333333;
    --warn-red: #F57676;
    --warn-orange: #FFA500;
    --warn-yellow: #E6A23C;
    --warn-blue: #66B1FF;
    --warn-green: #71C446;
    --bg-body: #F4F7FB;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: "Microsoft YaHei", sans-serif;
}

body {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-body);
    overflow: hidden;
    position: relative;
}

.main-container {
    display: flex;
    flex: 1;
    overflow: hidden;
    width: 100%;
    position: relative;
}

/* --- 布局核心：防止左右两侧受挤压 --- */
.sidebar-comp {
    width: 220px;
    min-width: 220px;
    flex-shrink: 0; /* 禁止收缩，确保左侧比例 */
    background: rgba(255, 255, 255, 0.2);
    border-right: 1px solid rgba(219, 234, 254, 0.3);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    backdrop-filter: blur(20px);
    z-index: 10;
}

/* --- 1. 修正外层布局截断问题 --- */
.content, .main-layout {
    flex: 1;
    display: flex;
    padding: 12px;
    gap: 12px;
    overflow: visible !important; /* 必须为 visible，否则下拉菜单会被裁剪 */
    position: relative;
}

/* --- 遮罩层：取消毛玻璃模糊效果 --- */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 5000;
    display: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: none;
}

/* 数据分析弹窗需盖过地图底部抽屉 (z-index:9999) */
#analysis-modal.modal-overlay {
    z-index: 12000;
}

#deep-analysis-modal.modal-overlay {
    z-index: 12000;
}

#radar-analysis-modal.modal-overlay {
    z-index: 12000;
}

#crack-analysis-modal.modal-overlay {
    z-index: 12000;
}

#fire-analysis-modal.modal-overlay {
    z-index: 12000;
}

#water-analysis-modal.modal-overlay {
    z-index: 12000;
}

#ground-analysis-modal.modal-overlay {
    z-index: 12000;
}

#yingli-analysis-modal.modal-overlay {
    z-index: 12000;
}

#vib-analysis-modal.modal-overlay {
    z-index: 12000;
}

/* --- 导出面板：取消毛玻璃模糊效果 --- */
#export-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 13000;
    display: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: none;
}

#export-panel .export-content-box {
    width: 100%;
    padding: 10px;
}

#export-panel .export-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 10px 0;
}

#deep-export-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 13000;
    display: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: none;
}

#deep-export-panel .export-content-box {
    width: 100%;
    padding: 10px;
}

#deep-export-panel .export-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 10px 0;
}

#radar-export-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 13000;
    display: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: none;
}

#radar-export-panel .export-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 10px 0;
}

#crack-export-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 13000;
    display: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: none;
}

#crack-export-panel .export-content-box {
    width: 100%;
    padding: 10px;
}

#crack-export-panel .export-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 10px 0;
}

#fire-export-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 13000;
    display: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: none;
}

#fire-export-panel .export-content-box {
    width: 100%;
    padding: 10px;
}

#fire-export-panel .export-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 10px 0;
}

#water-export-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 13000;
    display: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: none;
}

#water-export-panel .export-content-box {
    width: 100%;
    padding: 10px;
}

#water-export-panel .export-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 10px 0;
}

#ground-export-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 13000;
    display: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: none;
}

#ground-export-panel .export-content-box {
    width: 100%;
    padding: 10px;
}

#ground-export-panel .export-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 10px 0;
}

#yingli-export-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 13000;
    display: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: none;
}

#yingli-export-panel .export-content-box {
    width: 100%;
    padding: 10px;
}

#yingli-export-panel .export-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 10px 0;
}

#vib-export-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 13000;
    display: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: none;
}

#vib-export-panel .export-content-box {
    width: 100%;
    padding: 10px;
}

#vib-export-panel .export-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 10px 0;
}

/* --- 离线弹窗：确保处于最顶层 --- */
#offline-modal {
    position: absolute;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: auto;
    height: 38%;
    background: transparent;
    z-index: 10001 !important; /* 提升至 10001，高于抽屉 */
    display: none;
    align-items: stretch;
}

.offline-panel-content {
    background: #ffffff;
    width: 100%;
    display: flex;
    flex-direction: column;
    /* 仅保留顶部圆角，底部设为0以对齐边框 */
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.2); /* 调整投影方向向上 */
    border: 1px solid rgba(219, 234, 254, 0.5);
    border-bottom: none; /* 去掉底部边框 */
    overflow: hidden;
}

#offline-modal .modal-header {
    padding: 15px 24px;
    background: linear-gradient(90deg, #f8fbff 0%, #eef6ff 100%);
    border-bottom: 1px solid #e1e9f1;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

#offline-modal .modal-header h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 17px;
    letter-spacing: 0.5px;
}

/* 离线标签样式 */
.status-tag-offline {
    background: #fff1f0;
    color: #f5222d;
    border: 1px solid #ffa39e;
    padding: 2px 10px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 12px;
}

#offline-modal .modal-table-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 10px 20px;
}

#offline-modal .dash-table {
    width: 100%;
    border-collapse: collapse;
}

#offline-modal .dash-table th,
#offline-modal .dash-table td {
    text-align: center !important;   /* 水平居中 */
    vertical-align: middle !important; /* 核心修改：垂直居中 */
    padding: 12px 8px;
    height: 53px; /* 固定行高确保视觉对齐 */
    box-sizing: border-box;
}

#offline-modal .dash-table th {
    background: #f4f7fa;
    color: #5c6b77;
    font-weight: bold;
    border-bottom: 2px solid #e8eaec;
}

#offline-modal .dash-table td {
    border-bottom: 1px solid #f0f0f0;
    color: #444;
}

/* 行悬停变色 */
#offline-modal .dash-table tr:hover td {
    background-color: #f8faff;
}

/* 厂商标识 */
.vendor-tag {
    color: #1c3d90;
    background: #e6f7ff;
    border: 1px solid #91d5ff;
    padding: 1px 8px;
    border-radius: 2px;
    font-size: 12px;
}

/* 底部页脚美化 */
.offline-modal-footer {
    padding: 12px 24px;
    background: #ffffff;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.offline-pager-info {
    font-size: 13px;
    color: #666;
}

.offline-pager-ctrl {
    display: flex;
    gap: 8px;
    align-items: center;
}

.offline-page-select {
    padding: 2px 5px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    outline: none;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
}

/* --- 二级下拉菜单：分组标题与折叠样式 --- */
.menu-group-title {
    padding: 8px 12px;
    background: #f8fbff;
    color: #1c3d90;
    font-weight: bold;
    font-size: 13px;
    border-bottom: 1px solid #e1e9f1;
    cursor: default;
    display: flex;
    justify-content: space-between;
}

.sub-item {
    padding: 4px 0 4px 25px !important;
    border-bottom: 1px solid #f9f9f9;
}

/* --- 关闭按钮：确保在白色窗口布局内的右上角 --- */
.modal-close {
    cursor: pointer;
    font-size: 32px;
    color: white !important;
    position: absolute;
    top: 8px;
    right: 15px;
    line-height: 1;
    z-index: 2000;
    transition: 0.2s;
}

.modal-close:hover {
    opacity: 0.8;
    transform: scale(1.1);
}

/* --- 二级下拉菜单样式 --- */
.menu-group-header {
    padding: 8px 12px;
    background: #f0f7ff;
    color: #1c3d90;
    font-weight: bold;
    font-size: 13px;
    border-bottom: 1px solid #dbeafe;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
}

.metric-sub-list {
    background: #ffffff;
}

.sub-item {
    padding: 4px 0 4px 30px !important;
    border-bottom: 1px solid #f5f5f5;
}

.placeholder-text {
    color: #999 !important;
    font-size: 13px;
}

.point-glow-active {
    animation: point-glow 1s infinite !important;
    z-index: 1000 !important;
}

/* =========================================================
   模块：深度分析大屏美化 (适配分辨率与呼吸感)
   ========================================================= */
#analysis-modal .analysis-modal {
    width: 88vw;
    height: 88vh;
    max-width: 1600px;
    background: #ffffff;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 0 60px rgba(0, 21, 41, 0.45);
    border: 1px solid #dbe3eb;
}

#deep-analysis-modal .analysis-modal {
    width: 88vw;
    height: 88vh;
    max-width: 1600px;
    background: #ffffff;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 0 60px rgba(0, 21, 41, 0.45);
    border: 1px solid #dbe3eb;
}

#radar-analysis-modal .analysis-modal {
    position: relative;
    width: 88vw;
    height: 88vh;
    max-width: 1600px;
    background: #ffffff;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 0 60px rgba(0, 21, 41, 0.45);
    border: 1px solid #dbe3eb;
}

#crack-analysis-modal .analysis-modal {
    position: relative;
    width: 88vw;
    height: 88vh;
    max-width: 1600px;
    background: #ffffff;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 0 60px rgba(0, 21, 41, 0.45);
    border: 1px solid #dbe3eb;
}

#fire-analysis-modal .analysis-modal {
    position: relative;
    width: 88vw;
    height: 88vh;
    max-width: 1600px;
    background: #ffffff;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 0 60px rgba(0, 21, 41, 0.45);
    border: 1px solid #dbe3eb;
}

#water-analysis-modal .analysis-modal {
    position: relative;
    width: 88vw;
    height: 88vh;
    max-width: 1600px;
    background: #ffffff;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 0 60px rgba(0, 21, 41, 0.45);
    border: 1px solid #dbe3eb;
}

#ground-analysis-modal .analysis-modal {
    position: relative;
    width: 88vw;
    height: 88vh;
    max-width: 1600px;
    background: #ffffff;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 0 60px rgba(0, 21, 41, 0.45);
    border: 1px solid #dbe3eb;
}

#yingli-analysis-modal .analysis-modal {
    position: relative;
    width: 88vw;
    height: 88vh;
    max-width: 1600px;
    background: #ffffff;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 0 60px rgba(0, 21, 41, 0.45);
    border: 1px solid #dbe3eb;
}

#vib-analysis-modal .analysis-modal {
    position: relative;
    width: 88vw;
    height: 88vh;
    max-width: 1600px;
    background: #ffffff;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 0 60px rgba(0, 21, 41, 0.45);
    border: 1px solid #dbe3eb;
}

.analysis-header {
    padding: 0 25px;
    background: linear-gradient(90deg, #85C6F1 0%, #90CFF4 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 55px;
    flex-shrink: 0;
}

.filter-bar {
    padding: 15px 25px;
    background: #ffffff;
    border-bottom: 1px solid #e8ecef;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #444;
    font-weight: bold;
    position: relative;
}

.filter-left-group {
    display: flex;
    gap: 20px;
    align-items: center;
}

.multi-item {
    padding: 6px 0;
    border-bottom: 1px solid #f0f0f0;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.multi-item:hover {
    background: #f8fbff;
}

.multi-item input {
    cursor: pointer;
}

/* --- 深度分析：指标选择按钮及多选下拉框布局优化 --- */
#metric-select-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 160px;
    height: 30px;
    background: #fff;
    border: 1px solid #dcdfe6;
    padding: 0 10px;
    cursor: pointer;
    transition: 0.2s;
}

#metric-select-btn:hover {
    border-color: #1c3d90;
}

#metric-btn-label.placeholder-text {
    color: #999 !important;
    text-align: center;
    flex: 1;
    font-size: 13px;
}

#metric-btn-label {
    font-size: 13px;
    color: #333;
    flex: 1;
}

#metric-items-container {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    background: #ffffff;
    border: 1px solid #1c3d90;
    border-radius: 4px;
    z-index: 9999;
    padding: 8px 0;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    width: 200px;
    max-height: 300px;
    overflow-y: auto;
}

#metric-items-container .multi-item {
    padding: 8px 15px;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: 0.2s;
}

#metric-items-container .multi-item:hover {
    background: #f0f7ff;
}

.analysis-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #f0f4f8;
    display: flex;
    flex-direction: column;
    gap: 20px;
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.analysis-body::-webkit-scrollbar {
    display: none;
}

.chart-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    height: 480px;
    flex-shrink: 0;
}

.chart-box {
    background: #ffffff;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #dbe3eb;
    display: flex;
    flex-direction: column;
    position: relative;
}

.chart-box:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

#metric-items-container,
#device-items-container {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    background: #ffffff;
    border: 1px solid #1c3d90;
    border-radius: 4px;
    z-index: 9999;
    padding: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    width: 240px;
    max-height: 350px;
    overflow-y: auto;
}

.metric-tag {
    padding: 4px 12px;
    font-size: 11px;
    border: 1px solid #d1d9e0;
    border-radius: 20px;
    cursor: pointer;
    color: #5c6b77;
    background: #fff;
    transition: 0.2s;
}

.metric-tag.active {
    background: #1c3d90;
    color: #fff;
    border-color: #1c3d90;
    box-shadow: 0 2px 6px rgba(28, 61, 144, 0.3);
}

.table-section {
    background: #ffffff;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #dbe3eb;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 300px;
}

.scroll-table-wrapper {
    flex: 1;
    overflow-x: auto;
    overflow-y: auto;
    border: 1px solid #eee;
    margin-top: 15px;
}

.full-table {
    width: 100%;
    min-width: 2000px;
    border-collapse: collapse;
    font-size: 12px;
}

.full-table th {
    background: #f8fbff;
    padding: 12px 8px;
    border: 1px solid #eee;
    white-space: nowrap;
    position: sticky;
    top: 0;
    z-index: 2;
}

.full-table td {
    padding: 10px 8px;
    border: 1px solid #eee;
    text-align: center;
    color: #333;
}

.compass-icon {
    position: absolute;
    top: 70px;
    right: 30px;
    text-align: center;
    background: rgba(255, 255, 255, 0.9);
    padding: 8px;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    border: 1px solid #e1e9f1;
    z-index: 10;
}

@keyframes point-glow {
    0% {
        box-shadow: 0 0 5px currentColor;
        transform: scale(1.3);
    }

    50% {
        box-shadow: 0 0 40px currentColor;
        transform: scale(2.0);
    }

    100% {
        box-shadow: 0 0 5px currentColor;
        transform: scale(1.3);
    }
}

.draw-toolbar {
    position: absolute;
    top: 70px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    background: rgba(0, 0, 0, 0.85);
    padding: 8px 20px;
    border-radius: 4px;
    display: none;
    flex-direction: row;
    align-items: center;
    gap: 15px;
    color: #fff;
    border: 1px solid var(--primary-blue);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
    min-width: max-content;
    white-space: nowrap;
}

.draw-tip {
    font-size: 13px;
    color: #85C6F1;
    font-weight: bold;
    margin-right: 5px;
}

/* --- 剖面图工作台：提升层级至抽屉之上 --- */
.profile-workbench {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #fff;
    z-index: 6000 !important; /* 确保高于 drawer-comp 的 5000 */
    display: none;
    flex-direction: column;
    box-shadow: 0 0 20px rgba(0,0,0,0.2);
    transition: transform 0.3s ease;
}

/* --- 剖面图科技感方框（全新 3D 玻璃样式） --- */
/* --- 优化后的科技感对比分析小方框 --- */
#profile-mini-trigger {
    position: absolute;
    bottom: 50px;
    right: 30px;
    /* 确保在所有层级最上方，不被抽屉(9999)遮挡 */
    z-index: 6005;
    display: none;

    /* 窗口缩小，保持正方形比例 */
    width: 68px;
    height: 68px;

    /* 玻璃拟态：深蓝色半透明背景 */
    background: rgba(0, 30, 60, 0.75);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);

    /* 3D 边框与发光感 */
    border: 1px solid rgba(0, 242, 255, 0.5);
    box-shadow:
        0 0 15px rgba(0, 242, 255, 0.2),
        inset 0 0 10px rgba(0, 242, 255, 0.2);

    cursor: pointer;
    border-radius: 4px; /* 轻微圆角增加高级感 */
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation: tech-float-new 4s infinite ease-in-out;

    /* 内部元素绝对居中 */
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

/* 装饰性 L 型直角 - 尺寸更精细 */
.tech-corner-tl, .tech-corner-br {
    position: absolute;
    width: 12px;
    height: 12px;
    border-color: #00F2FF;
    border-style: solid;
    filter: drop-shadow(0 0 3px #00F2FF);
    pointer-events: none;
}
.tech-corner-tl { top: -2px; left: -2px; border-width: 2.5px 0 0 2.5px; }
.tech-corner-br { bottom: -2px; right: -2px; border-width: 0 2.5px 2.5px 0; }

/* 内部内容区域 */
.tech-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    width: 100%;
}

/* 图标缩小并高亮 */
.tech-icon svg {
    width: 24px;
    height: 24px;
    filter: drop-shadow(0 0 5px #00F2FF);
    margin-bottom: 3px;
}

/* 文字：纯白+极强外发光 */
.tech-label {
    font-size: 11px; /* 字号缩小 */
    font-weight: bold;
    color: #FFFFFF !important;
    text-shadow: 0 0 8px #00F2FF, 1px 1px 2px #000;
    letter-spacing: 0.5px;
    white-space: nowrap;
}

/* 辅助英文缩小 */
.tech-sub-text {
    font-size: 7px;
    color: #00F2FF;
    font-weight: bold;
    letter-spacing: 1px;
    transform: scale(0.85);
    margin-top: -1px;
    opacity: 0.8;
}

/* 悬停时的 3D 抬升效果 */
#profile-mini-trigger:hover {
    background: rgba(0, 50, 100, 0.9);
    border-color: #FFFFFF;
    transform: translateY(-5px) scale(1.05);
    box-shadow: 0 10px 25px rgba(0, 242, 255, 0.5);
}

@keyframes tech-float-new {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
}

.profile-header {
    height: 50px;
    background: #f8fbff;
    border-bottom: 1px solid #e1e9f1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
}

.profile-body {
    flex: 1;
    padding: 20px;
    position: relative;
}

#profile-chart {
    width: 100%;
    height: 100%;
}

.point-obj.selected {
    border: 3px solid #fff;
    box-shadow: 0 0 15px #fff;
    transform: scale(1.3);
}

.custom-dropdown-content {
    display: none;
    position: absolute;
    top: calc(100% + 5px); /* 与输入框保持微小间距 */
    left: 0;
    background: #ffffff;
    border: 1px solid #1c3d90;
    border-radius: 4px;
    z-index: 99999 !important; /* 绝对最高层级 */
    padding: 8px 0;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4); /* 增强投影，提升视觉层次 */
    min-width: 240px;
    max-height: 60vh; /* 根据屏幕高度动态限制，防止底部超出屏幕 */
    overflow-y: auto;
}

/* 针对移动端或小屏幕的适配 */
@media screen and (max-height: 600px) {
.custom-dropdown-content {
    box-sizing: border-box;
}
}

/* --- 地质模型下拉面板美化 --- */
#map-view-dropdown {
    min-width: 130px; /* 与按钮宽度严格一致 */
    width: 130px;
    background: #ffffff;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12); /* 柔和阴影 */
    margin-top: 4px;
    padding: 4px 0;
    font-family: "Microsoft YaHei", sans-serif;
    overflow: hidden;
}

/* 列表项样式 */
.custom-dropdown-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    gap: 10px;
}

.custom-dropdown-item:hover {
    background-color: #f5f7fa; /* 经典的浅灰交互色 */
}

/* 字体合适：统一 13px */
.custom-dropdown-item span {
    font-size: 13px;
    color: #4b5563;
    line-height: 1;
    white-space: nowrap;
}

/* 复选框美化：使用主色调 */
.custom-dropdown-item input[type="checkbox"] {
    cursor: pointer;
    width: 15px;
    height: 15px;
    accent-color: #1c3d90; /* 浏览器原生美化，使用您的主蓝色 */
    margin: 0;
}

/* 分隔线美化 */
#map-view-dropdown hr {
    border: 0;
    border-top: 1px solid #f0f0f0;
    margin: 4px 8px;
}

/* 全选项字体加粗 */
.all-select-text {
    font-weight: 600;
    color: #1c3d90 !important;
}

.custom-dropdown-item:hover {
    background: #f0f7ff;
}

.custom-dropdown-item input {
    cursor: pointer;
}

/* Header Styles */
.header-comp {
    height: 60px;
    background: rgba(255, 255, 255, 0.5);
    border-bottom: 1px solid rgba(225, 233, 241, 0.5);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    z-index: 1000;
    backdrop-filter: blur(15px);
}

.header-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 20px;
    font-weight: bold;
    color: #1c3d90;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 25px;
}

.header-clock {
    font-family: "Courier New", monospace;
    font-weight: bold;
    font-size: 16px;
    color: #1c3d90;
}

.header-user {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: var(--text-secondary);
    cursor: pointer;
}

/* Sidebar Styles */
.side-nav-header {
    padding: 12px 20px;
    font-size: 14px;
    font-weight: bold;
    color: var(--text-primary);
    border-left: 4px solid #1c3d90;
    background: rgba(248, 251, 255, 0.3);
}

.side-nav-item {
    padding: 12px 24px;
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: 0.3s;
    margin: 1px 10px;
    border-radius: 4px;
    white-space: nowrap;
}

.side-nav-item:hover {
    background: rgba(133, 198, 241, 0.2);
}

.side-nav-item.active {
    background: linear-gradient(to right, var(--aux-blue-1), var(--aux-blue-3));
    color: #1c3d90;
    font-weight: bold;
    border-left: 4px solid #1c3d90;
}

/* Map Module Styles */
.map-module {
    position: relative;
    border: 1px solid #1c3d90;
    border-radius: 4px;
    background: #0b1a31;
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: visible !important; /* 允许内部下拉框溢出容器边界 */
    z-index: 100; /* 提升地图模块整体层级，确保覆盖右侧看板 */
}

@keyframes map-dark-flash {
    0% {
        filter: brightness(1);
    }

    40% {
        filter: brightness(0.3);
    }

    100% {
        filter: brightness(1);
    }
}

.section-flash-active {
    animation: map-dark-flash 0.4s ease-in-out forwards;
}

.map-toolbar {
    padding: 8px 12px;
    background: #ffffff !important;
    border-bottom: 1px solid #e1e9f1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    position: relative;
    z-index: 1000; /* 确保工具栏在地图元素之上 */
    flex-wrap: wrap;
}

.map-btn {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    color: #333333;
    padding: 4px 10px;
    font-size: clamp(10px, 1vw, 13px);
    cursor: pointer;
    border-radius: 2px;
    min-height: 30px;
    height: auto;
    transition: 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    flex-shrink: 1;
}

.map-btn:hover {
    background: #f5f5f5;
}

.map-btn.active {
    background: var(--primary-blue) !important;
    border-color: #1c3d90 !important;
    color: #ffffff !important;
    font-weight: bold;
}

#btn-update-range {
    background: #D6EDFE !important;
    color: #1c3d90 !important;
    border-color: var(--aux-blue-1) !important;
    font-weight: bold;
}

#btn-update-range.active {
    background: var(--primary-blue) !important;
    color: #ffffff !important;
    border-color: #1c3d90 !important;
}

input[type="datetime-local"].map-btn {
    padding: 2px 6px;
    max-width: 165px;
}

.map-btn:active {
    transform: translateY(1px);
    filter: brightness(0.9);
}

.btn-profile {
    background: var(--warn-green) !important;
    color: #fff;
    border: none;
    padding: 4px 12px;
    font-size: clamp(10px, 1vw, 13px);
    font-weight: bold;
    cursor: pointer;
    border-radius: 2px;
    min-height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
}

.map-viewer {
    flex: 1;
    position: relative;
    overflow: hidden;
    cursor: grab;
    background: #0b1a31;
    z-index: 1;
}

.map-canvas {
    width: 3000px;
    height: 2500px;
    background: url('https://img.js.design/assets/img/652613010f36894c798e404b.png') no-repeat center center;
    background-size: cover;
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
    transition: transform 0.6s cubic-bezier(0.2, 0, 0.2, 1);
    will-change: transform;
}

#draw-svg,
#connection-svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 50;
}

.point-obj {
    position: absolute;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    z-index: 10;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.radar-cone {
    position: absolute;
    width: 180px;
    height: 180px;
    background: conic-gradient(from -30deg at 50% 100%, rgba(102, 177, 255, 0.3) 0deg, transparent 60deg);
    clip-path: polygon(50% 100%, 0% 0%, 100% 0%);
    top: -170px;
    left: -74px;
    transform-origin: 50% 100%;
    pointer-events: none;
    z-index: 4;
    rotate: var(--radar-rot, 0deg);
    animation: radar-pulse 4s infinite ease-in-out;
}

@keyframes radar-pulse {

    0%,
    100% {
        opacity: 0.2;
        scale: 0.95;
    }

    50% {
        opacity: 0.6;
        scale: 1.05;
    }
}

.point-focus-center {
    z-index: 999 !important;
    animation: center-breathe-glow 1.5s infinite ease-in-out !important;
}

@keyframes center-breathe-glow {
    0% {
        box-shadow: 0 0 20px currentColor;
        transform: scale(1.6);
    }

    50% {
        box-shadow: 0 0 120px 30px currentColor;
        transform: scale(2.2);
    }

    100% {
        box-shadow: 0 0 20px currentColor;
        transform: scale(1.6);
    }
}

.point-focus-center.breathe {
    animation: center-pulse 1.2s infinite ease-in-out !important;
}

.point-bubble {
    position: absolute;
    top: -48px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 20px;
    background: #fff;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50% 50% 50% 0;
    transform: translateX(-50%) rotate(-45deg);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
    border: 2px solid var(--primary-blue);
    z-index: 12;
    pointer-events: auto;
}

.point-bubble span {
    transform: rotate(45deg);
    display: block;
}

.gnss-arrow {
    position: absolute;
    width: 4px;
    height: 60px;
    background: #fff;
    top: -44px;
    left: 14px;
    transform-origin: center bottom;
    pointer-events: none;
    box-shadow: 0 0 15px #fff;
    border-radius: 2px;
    z-index: 6;
}

.gnss-arrow::after {
    content: '';
    position: absolute;
    top: -5px;
    left: -8px;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 18px solid #fff;
}

.point-id {
    position: absolute;
    top: 22px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 12px;
    color: #fff;
    background: rgba(0, 0, 0, 0.85);
    padding: 2px 8px;
    border-radius: 4px;
    white-space: nowrap;
    font-weight: bold;
    border: 1px solid rgba(255, 255, 255, 0.4);
    z-index: 15;
    pointer-events: auto;
}

.point-obj.breathe {
    animation: pointBreathe 1.5s infinite;
    z-index: 11;
}

@keyframes pointBreathe {
    0% {
        box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.8);
        transform: scale(1);
    }

    70% {
        box-shadow: 0 0 0 25px rgba(255, 255, 255, 0);
        transform: scale(1.4);
    }

    100% {
        transform: scale(1);
    }
}

.model-tooltip {
    position: fixed;
    background: rgba(0, 21, 41, 0.95);
    color: #fff;
    padding: 12px;
    border-radius: 4px;
    font-size: 12px;
    pointer-events: none;
    z-index: 3000;
    display: none;
    border: 1px solid var(--primary-blue);
    backdrop-filter: blur(5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
    line-height: 1.6;
    transition: none;
}

/* --- 底部抽屉样式修正：隐藏折叠内容 --- */
/* --- 底部抽屉组件：整体布局 --- */
.drawer-comp {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: transparent;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateY(calc(100% - 32px));
    z-index: 5000 !important;
}

.drawer-comp.active {
    background: rgba(255, 255, 255, 0.98);
    border-top: 1px solid #1c3d90;
    transform: translateY(0);
    box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.15);
}

.drawer-bar {
    height: 32px;
    background: linear-gradient(180deg, #85C6F1 0%, #1c3d90 100%);
    color: #fff;
    text-align: center;
    line-height: 32px;
    cursor: pointer;
    font-size: 13px;
    font-weight: bold;
    border-radius: 12px 12px 0 0;
    letter-spacing: 1px;
}

.drawer-icons {
    padding: 0 20px;
    display: grid;
    grid-template-columns: repeat(6, 1fr); /* 严格6列布局 */
    gap: 12px;
    height: 0;
    opacity: 0;
    overflow: hidden;
    transition: all 0.4s ease;
}

/* 1. 压缩抽屉内部容器的间距 */
.drawer-comp.active .drawer-icons {
    padding: 8px 20px; /* 大幅缩小上下内边距 */
    height: auto;
    opacity: 1;
    gap: 6px; /* 缩小图标之间的间距 */
}

.drawer-btn {
    cursor: pointer;
    font-size: 11px;
    color: var(--text-secondary);
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: 0.3s;
}

/* --- 右侧看板面板：设置固定宽度防止受挤压 --- */
.dash-panels {
    width: 450px;
    min-width: 450px;
    flex-shrink: 0; /* 禁止收缩，确保右侧看板空间 */
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    overflow: hidden;
}

.dash-panels::-webkit-scrollbar {
    display: none;
}

.dash-row {
    display: flex;
    gap: 12px;
    height: 230px;
    flex-shrink: 0;
}

.glass-panel {
    background: rgba(255, 255, 255, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    padding: 10px;
    backdrop-filter: blur(20px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
}

.dash-title {
    font-size: 13px;
    font-weight: bold;
    margin-bottom: 12px;
    border-left: 4px solid #1c3d90;
    padding-left: 10px;
    color: var(--text-primary);
}

.dash-chart {
    width: 100%;
    flex: 1;
    min-height: 0;
}

.table-panel {
    flex: none !important;
    height: 275px;
    display: flex;
    flex-direction: column;
    background: #ffffff !important;
    border: 1px solid #e0e4e8 !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
}

.dash-panels>.glass-panel:last-child {
    flex: 1 !important;
    height: auto !important;
    min-height: 0;
}

.table-wrapper {
    flex: 1;
    overflow: hidden !important;
}

.dash-table {
    border-collapse: collapse;
    width: 100%;
    color: #333;
}

.dash-table th {
    color: #000000;
    font-size: 12px;
    font-weight: bold;
    padding: 12px 8px;
    text-align: center;
    border-bottom: 2px solid #eee;
    background: #fafafa;
}

.dash-table tr {
    border-bottom: 1px solid #f0f0f0;
    transition: background 0.2s;
}

.dash-table tr:hover {
    background: #f9fbff;
}

.dash-table td {
    padding: 10px 4px;
    text-align: center;
    font-size: 12px;
    border: none;
}

.row-red-active {
    background-color: #fff1f0 !important;
}

.row-red-active td {
    color: #f5222d !important;
    font-weight: bold;
}

.mini-pager {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: #000;
}

.pager-btn {
    cursor: pointer;
    padding: 1px 6px;
    border: 1px solid #000;
    border-radius: 3px;
    transition: 0.2s;
    background: transparent;
    color: #000;
}

.pager-btn:hover:not(.disabled) {
    background: #000;
    color: #fff;
}

.pager-btn.disabled {
    opacity: 0.2;
    cursor: not-allowed;
}

/* 强化翻页按钮视觉效果 */
.offline-pager-ctrl .pager-btn {
    padding: 4px 12px;
    background: #ffffff;
    border: 1px solid #1c3d90;
    color: #1c3d90;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
}

.offline-pager-ctrl .pager-btn:hover:not(.disabled) {
    background: #1c3d90;
    color: #ffffff;
}

.offline-pager-ctrl .pager-btn.disabled {
    border-color: #ccc;
    color: #ccc;
    cursor: not-allowed;
    opacity: 0.6;
}

/* 固定表格行高，防止空行坍塌 */
#offline-table-body tr {
    height: 42px;
}

/*抽屉样式*/
/* 监测设备按钮选中状态：左侧显示勾选标识 */
/* --- 过滤按钮样式：常规与选中状态 --- */
/* --- 抽屉按钮及雷达交互增强样式 --- */
/* 2. 压缩每一个监测类型按钮的大小 */
.filter-item {
    padding: 4px 12px !important; /* 取消左侧固定边距，改为统一左右边距 */
    border: 1px solid #d9e4ef;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    color: #4b5563;
    background: #fff;
    position: relative;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center; /* 核心修改：文字内容居中 */
    gap: 8px; /* 增加文字与雷达+号之间的间距 */
    height: 32px;
}
/* 雷达按钮特殊容器 */
.radar-item { position: relative; padding-right: 10px !important; }

/* 雷达 + 号按钮：默认隐藏 */
.radar-plus {
    display: none;
    width: 18px; /* 从 22px 减小到 18px */
    height: 18px;
    background: #fff;
    color: #71C446;
    border: 1px solid #71C446;
    border-radius: 50%;
    text-align: center;
    line-height: 16px;
    font-size: 14px;
    font-weight: bold;
    transition: 0.3s;
    margin-left: 4px;
}

/* 选中状态下显示 + 号 */
.filter-item.checked .radar-plus { display: inline-block; }

/* 云图激活时的 + 号样式 */
.radar-plus.cloud-active {
    background: #71C446;
    box-shadow: 0 0 10px rgba(113, 196, 70, 0.6);
    transform: rotate(45deg); /* 激活时变为 x 形状或倾斜 */
}

.filter-item:hover {
    border-color: #1c3d90;
    background: #f8fbff;
    transform: translateY(-2px);
}

.filter-item.checked {
    border-color: #1c3d90 !important;
    color: #1c3d90 !important;
    background: #eef6ff !important;
    font-weight: bold;
}

.filter-item.checked::before {
    content: '✔';
    position: absolute;
    left: 8px; /* 固定在左侧，不参与 flex 居中计算 */
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    color: #71C446;
}

.filter-item.all-btn.checked {
    background: #1c3d90 !important;
    color: #fff !important;
}

.filter-item.all-btn {
    border: 1px dashed #1c3d90;
    color: #1c3d90;
    background: #f0f7ff;
}

.filter-item.all-btn.checked {
    background: #1c3d90 !important;
    color: #fff !important;
    border-style: solid;
}
/* 雷达监测特殊样式：右侧的 + 按钮 */
.radar-plus {
    display: none; /* 默认隐藏 */
    width: 22px;
    height: 22px;
    background: #fff;
    color: #71C446;
    border: 1px solid #71C446;
    border-radius: 50%;
    text-align: center;
    line-height: 20px;
    font-size: 18px;
    font-weight: bold;
    transition: 0.3s;
    margin-left: 8px;
}

/* 当雷达被选中时，显示 + 按钮 */
.filter-item.checked .radar-plus {
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 当云图激活（点击了+）时，变为绿色背景白色字 */
.radar-plus.cloud-active {
    background: #71C446 !important;
    color: #fff !important;
    transform: rotate(45deg); /* 变为 X */
}

/* --- 雷达照射扇面样式：超大范围覆盖校准 --- */
.radar-fan-layer {
    position: absolute;
    width: 2800px; /* 增大照射半径至 2800px 以确保覆盖全区最远处 */
    height: 2800px;
    pointer-events: none;
    z-index: 5;
    /* 增强扇形发散感渐变 */
    background: conic-gradient(from -35deg at 50% 100%,
                rgba(113, 196, 70, 0) 0deg,
                rgba(113, 196, 70, 0.45) 35deg,
                rgba(113, 196, 70, 0) 70deg);
    /* 裁剪为标准 70 度照射扇面 */
    clip-path: polygon(50% 100%, 0% 0%, 100% 0%);
    /* 旋转中心锁定在扇形底部的发散点 */
    transform-origin: 50% 100%;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 内部文字标识 */
.radar-fan-label {
    position: absolute;
    top: 15%;
    left: 50%;
    transform: translateX(-50%);
    color: #fff;
    font-size: 14px;
    font-weight: bold;
    text-shadow: 0 0 8px rgba(0,0,0,0.8);
    background: rgba(0,0,0,0.3);
    padding: 2px 8px;
    border-radius: 4px;
}

/* --- 遥感卫星全域超大遮罩层：覆盖范围扩充至 20000px --- */
.sat-green-overlay {
    position: absolute;
    /* 设置极大的负偏移和尺寸，确保缩放/拖拽时全覆盖 */
    top: -10000px;
    left: -10000px;
    width: 20000px;
    height: 20000px;
    background: rgba(113, 196, 70, 0.12); /* 保持高透明度清透感 */
    z-index: 2; /* 位于模型层之上，点位图标之下 */
    pointer-events: none; /* 关键：鼠标穿透，保证地质模型可自由拖拽 */
    transition: opacity 0.4s ease;
}
/*抽屉样式结束*/

/*导出表格背景 */
.modal-content {
    background: #ffffff !important; /* 强制背景为纯白色 */
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    position: relative;
    border: 1px solid #dbe3eb;
    max-width: 90vw;
}
/*GNSS监测点矢量箭头*/
.map-vector-arrow {
    position: absolute;
    bottom: 50%;
    left: 50%;
    width: 4px; /* 增大箭身宽度 (原2px) */
    background: #ffffff;
    transform-origin: bottom center; /* 锚点保持在中心 */
    pointer-events: none;
    z-index: 10;
    box-shadow: 0 0 4px rgba(0,0,0,0.6); /* 增强阴影 */
    transition: all 0.3s ease;
    border-radius: 2px; /* 让箭身稍微圆润一点 */
}

.map-vector-arrow::before {
    content: '';
    position: absolute;
    top: -2px; /* 微调头部位置以适配更粗的箭身 */
    left: 50%;
    transform: translateX(-50%);
    border-left: 7px solid transparent;  /* 增大头部宽度 (原4px) */
    border-right: 7px solid transparent; /* 增大头部宽度 (原4px) */
    border-bottom: 14px solid #ffffff;   /* 增大头部高度 (原8px) */
    filter: drop-shadow(0 -2px 2px rgba(0,0,0,0.3)); /* 为头部单独增加一点投影 */
}

/* 对比分析浮动小窗样式 */
.compare-float-card {
    position: absolute;
    bottom: 20px;
    right: 20px;
    width: 160px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid var(--primary-blue);
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    z-index: 100;
    transition: all 0.3s ease;
    overflow: hidden;
    user-select: none;
}

.compare-float-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(133, 198, 241, 0.4);
}

.compare-float-card .card-header {
    background: var(--primary-blue);
    color: white;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: bold;
    text-align: center;
}

.compare-float-card .card-body {
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.compare-float-card .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #71C446; /* 默认绿色 */
    box-shadow: 0 0 5px rgba(113, 196, 70, 0.5);
}

.compare-float-card #compare-status-text {
    font-size: 13px;
    color: var(--text-primary);
}

.compare-float-card .card-footer {
    border-top: 1px solid #eee;
    padding: 4px;
    font-size: 11px;
    color: #999;
    text-align: center;
    background: #fafafa;
}



/* =========================================================
   全局下拉栏分类独立布局 (140px 窄版 + 双端对齐)
   ========================================================= */

/* =========================================================
   全局下拉栏强制布局 (在您提供的基础上修改与添加)
   ========================================================= */

/* --- 基础包装容器 --- */
.dropdown-wrapper {
    position: relative !important;
    display: inline-flex !important;
    width: 140px !important; /* 统一触发器宽度基准 */
    vertical-align: middle;
}

/* 1. 统一触发器样式（保持原有 140px 逻辑） */
#map-view-btn,
#map-region-btn,
#map-point-input,
#an-region-btn,
#an-point-input,
#metric-select-btn {
    width: 140px !important;
    min-width: 140px !important;
    padding: 0 8px !important;
    font-size: 13px !important;
    box-sizing: border-box !important;
    text-align: center !important; /* 新增：强制文字居中 */
}

/* 2. 统一面板基础样式 */
.custom-dropdown-content,
#metric-items-container {
    /* 默认依然保持与触发框同宽 */
    width: 140px !important;
    min-width: 140px !important;
    padding: 4px 0 !important;
    box-sizing: border-box !important;
    background: #ffffff !important;
    border: 1px solid #1c3d90 !important;
    position: absolute !important;
    top: 100% !important;
    z-index: 10000 !important;
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15) !important;
}

/* --- 核心修改：首页监测点与指标选择器面板自适应文字长度 --- */

/* 首页监测点下拉面板 (#map-point-dropdown) */
#map-point-dropdown {
    width: auto !important;          /* 覆盖固定宽度，改为自适应 */
    max-width: 300px !important;    /* 设定合理上限防止过长 */
    left: 0 !important;              /* 左端对齐 */
    right: auto !important;
}

/* 指标选择器下拉面板 (#metric-items-container) */
#metric-items-container {
    width: auto !important;          /* 覆盖固定宽度，改为自适应 */
    max-width: 350px !important;    /* 设定上限 */
    left: 0 !important;              /* 左端对齐 */
    right: auto !important;          /* 允许向右侧自然延伸 */
}

/* 确保这两个面板内的选项文字不换行，以撑开容器 */
#map-point-dropdown .custom-dropdown-item,
#metric-items-container .multi-item {
    white-space: nowrap !important;  /* 强制文字不换行 */
    padding: 6px 15px !important;    /* 增加左右间距增加美感 */
    width: auto !important;
    display: flex !important;
    align-items: center !important;
}

/* --- 其余逻辑保持不变 (分析弹窗部分) --- */

#analysis-modal .custom-dropdown-content {
    right: 0 !important;
    left: auto !important;
}

#analysis-modal .filter-group {
    position: relative !important;
}

/* 分析弹窗区域触发器样式优化 */
#an-region-btn {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    position: relative !important;
}

#an-region-btn::after {
    content: "▼" !important; /* 恢复箭头显示，或使用您喜欢的字符 */
    font-size: 10px !important;
    color: #666 !important;
    position: absolute !important;
    right: 8px !important;
}

#an-region-label {
    flex: 1 !important;
    text-align: center !important;
    margin-right: 12px !important; /* 为箭头留出空间 */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 移除按钮内多余的下拉箭头 span */
#an-region-btn > span:not(#an-region-label) {
    display: none !important;
}

/* 强制统一指标下拉菜单样式 */
#metric-items-container {
    width: 260px !important;       /* 增加宽度以适应长文字 */
    max-height: 450px !important;  /* 增加高度，减少滚动频率 */
    overflow-y: auto !important;
    padding: 0 !important;
    border: 1px solid #1c3d90 !important;
}

/* 分组标题样式 */
.menu-group-title {
    padding: 6px 12px;
    background: #f0f4f8;
    color: #666;
    font-size: 11px;
    font-weight: bold;
    border-bottom: 1px solid #eef2f6;
}

/* 选项样式优化 */
#metric-items-container .multi-item {
    padding: 8px 15px !important;
    white-space: nowrap;
}

#metric-items-container .sub-item {
    padding-left: 25px !important; /* 缩进感 */
}

/* =========================================================
   强制修正：分析弹窗 - 监测线下拉组件对齐样式
   ========================================================= */

/* 1. 统一触发器容器与按钮的宽度 */
#analysis-modal .filter-group .dropdown-wrapper:has(#an-line-btn),
#an-line-btn {
    width: 160px !important;
    min-width: 160px !important;
    max-width: 160px !important;
    box-sizing: border-box !important;
}

/* 2. 强制下拉面板宽度与按钮边框完全对齐 */
#an-line-dropdown {
    width: 160px !important;
    min-width: 160px !important;
    max-width: 160px !important;
    left: 0 !important; /* 确保左对齐 */
    right: auto !important;
    box-sizing: border-box !important;
    border: 1px solid #1c3d90 !important; /* 强化边框视觉一致性 */
    margin-top: 1px !important; /* 紧贴按钮下边缘 */
}

/* 3. 优化监测线按钮内部文字排版 */
#an-line-btn {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    padding: 0 10px !important;
}

#an-line-label {
    flex: 1;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 4. 确保下拉选项在固定宽度下文字美观 */
#an-line-dropdown .custom-dropdown-item {
    padding: 8px 10px !important;
    width: 100% !important;
    box-sizing: border-box !important;
    justify-content: flex-start !important;
}
/* =========================================================
   新增：地图上方按钮“圆钝感”与“呼吸感”美化
   ========================================================= */

/* 1. 圆钝感基础样式 (视图切换按钮) */
.rounded-btn {
  width: 130px;
  height: 36px; /* 稍微增高一点，比例更协调 */
  background: linear-gradient(135deg, #1c3d90, #2b579a); /* 替换生硬的单色，改为微渐变 */
  color: #ffffff;
  border: none !important; /* 去除原本生硬的 1px 边框 */
  border-radius: 18px !important; /* 胶囊状大圆角，极具圆钝感 */
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(28, 61, 144, 0.2);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* 1. 圆钝感基础样式 (复位按钮) */
.rounded-circle-btn {
  position: absolute;
  top: 55px;
  right: 15px;
  z-index: 100;
  background: rgba(28, 61, 144, 0.85); /* 统一色调，抛弃原本的纯黑透明度 */
  color: #fff;
  border: 2px solid rgba(255, 255, 255, 0.3); /* 柔和的半透明白色边框 */
  width: 36px;
  height: 36px;
  border-radius: 50%; /* 完美的圆形 */
  font-size: 18px;
  cursor: pointer;
  display: none; /* 保持您原本的隐藏逻辑 */
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* 2. 鼠标悬停时的丝滑反馈 */
.rounded-btn:hover {
  transform: translateY(-2px); /* 悬停时微微上浮 */
  box-shadow: 0 6px 15px rgba(28, 61, 144, 0.4);
}
.rounded-circle-btn:hover {
  transform: translateY(-2px) rotate(-45deg); /* 悬停时微微上浮并旋转，增加交互趣味 */
  background: #1c3d90;
  box-shadow: 0 6px 15px rgba(28, 61, 144, 0.4);
}

/* 3. 呼吸感动画核心 (自动发光与微缩放) */
.breathing-btn {
  /* 动画：名称 时长 匀速 无限循环 */
  animation: softBreathe 3s ease-in-out infinite;
}

@keyframes softBreathe {
  0% {
    box-shadow: 0 0 0 0 rgba(28, 61, 144, 0.4);
  }
  50% {
    /* 中间态：光晕扩散，体积微微膨胀 1% */
    box-shadow: 0 0 15px 4px rgba(28, 61, 144, 0.2);
    transform: scale(1.02);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(28, 61, 144, 0.4);
  }
}

.command-overlay-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
}

.warning-zone {
  position: absolute;
  border: 2px dashed #ff8c00;
  background: rgba(255, 140, 0, 0.16);
  box-shadow: 0 0 24px rgba(255, 140, 0, 0.24);
  border-radius: 14px;
  pointer-events: auto;
  cursor: pointer;
}

.warning-zone.is-active {
  border-width: 3px;
  background: rgba(255, 140, 0, 0.24);
  box-shadow: 0 0 36px rgba(255, 140, 0, 0.42);
}

.warning-zone-label {
  position: absolute;
  left: 12px;
  top: 10px;
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #ff8c00, #ff6a00);
  border-radius: 999px;
}

.command-unit {
  position: absolute;
  transform: translate(-50%, -50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  pointer-events: auto;
  cursor: pointer;
  transition: transform 0.18s ease, filter 0.18s ease;
}

.command-unit:hover {
  transform: translate(-50%, -50%) scale(1.05);
}

.command-unit-dot {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.9);
  background: var(--unit-color, #ff9f43);
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.35);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  line-height: 1;
}

.command-unit-label {
  font-size: 14px;
  color: #fff;
  background: rgba(6, 14, 28, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  padding: 3px 9px;
  line-height: 1.3;
}

.command-unit.is-selected {
  z-index: 25;
  filter: drop-shadow(0 0 8px rgba(80, 177, 255, 0.9));
}

.command-unit.is-selected .command-unit-dot {
  transform: scale(1.2);
  border-color: #d6f4ff;
  box-shadow: 0 0 20px rgba(80, 177, 255, 0.95);
}

.command-unit.is-selected .command-unit-label {
  border-color: #50b1ff;
  background: rgba(20, 52, 94, 0.95);
}

.model-tooltip {
    min-width: 200px;
}
</style>

