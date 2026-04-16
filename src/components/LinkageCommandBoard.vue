<template>
  <section class="panel linkage-command-board">
    <div class="linkage-command-layout">
      <div class="map-panel">
        <div class="map-board">
          <div ref="threeContainer" class="three-viewport"></div>
          <div class="map-overlay warning-chip" :style="warningChipStyle">{{ warningChipText }}</div>
          <div class="map-overlay controls-chip">左键平移 / 按住 Ctrl+左键旋转 / 滚轮缩放</div>
          <div id="map-tooltip" class="map-tooltip"></div>
        </div>
        <div id="deep-modal-root"></div>
        <div id="radar-modal-root"></div>
        <div id="crack-modal-root"></div>
        <div id="fire-modal-root"></div>
        <div id="water-modal-root"></div>
        <div id="ground-modal-root"></div>
        <div id="yingli-modal-root"></div>
        <div id="vib-modal-root"></div>
      </div>

      <aside class="right-panel">
        <div class="right-panel-content">
          <div class="summary-strip">
            <div class="summary-card">
              <div class="summary-main">
                <span>预警区域</span>
                <strong>北帮 3 号台阶至运输道路</strong>
              </div>

              <div class="summary-stats">
                <div class="summary-stat">
                  <span>人员数量</span>
                  <strong>{{ summaryCounts.person }}</strong>
                </div>
                <div class="summary-stat">
                  <span>采掘设备数量</span>
                  <strong>{{ summaryCounts.equipment }}</strong>
                </div>
                <div class="summary-stat">
                  <span>无人驾驶车辆数量</span>
                  <strong>{{ summaryCounts.vehicle }}</strong>
                </div>
              </div>
            </div>

            <button class="placeholder-button" type="button" @click.stop="showWarningSettingsModal = true">
              <span>预警区域</span>
              <strong>参数设置</strong>
            </button>
          </div>

          <div
            class="placeholder-card"
            @pointerdown="handlePanelPointerDown"
            @click.self="handlePanelBlankClick"
          >
            <div class="placeholder-head">
              <div class="category-switch">
                <button
                  v-for="item in categoryOptions"
                  :key="item.value"
                  type="button"
                  class="category-btn"
                  :class="{ active: activeCategory === item.value }"
                  @click.stop="handleCategoryClick(item.value, $event)"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>

            <div class="data-table" @click.self="handlePanelBlankClick">
              <div class="data-row data-head">
                <span>预警等级</span>
                <span>预警区域</span>
                <span>人员、车辆编号</span>
                <span>距离</span>
                <span>响应状态</span>
              </div>

              <div
                v-for="item in filteredResponseList"
                :key="item.code"
                class="data-row data-body"
                :class="{ selected: selectedUnitCode === item.code }"
                @click.stop="handleRowClick(item.code, $event)"
              >
                <strong>{{ item.level }}</strong>
                <strong>{{ item.area }}</strong>
                <strong>{{ item.code }}</strong>
                <strong>{{ item.distance }}</strong>
                <span class="response-pill" :class="item.response === '已响应' ? 'responded' : 'pending'">
                  {{ item.response }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>

  <div v-if="showWarningSettingsModal" class="modal-mask" @click.self="showWarningSettingsModal = false">
    <section class="warning-settings-modal">
      <div class="modal-head">
        <div>
          <p class="modal-kicker">预警区域参数设置</p>
          <h3>预警等级范围配置</h3>
        </div>
        <button type="button" class="modal-close" @click="showWarningSettingsModal = false">关闭</button>
      </div>

      <div class="settings-grid">
        <label v-for="item in warningLevels" :key="item.value" class="settings-card">
          <span>{{ item.name }}预警范围</span>
          <div class="settings-input-wrap">
            <input v-model.number="warningSettings.ranges[item.value]" type="number" min="20" step="10" />
            <em>m</em>
          </div>
        </label>
      </div>

      <div class="settings-tip">
        当前地图按 <strong>四级预警</strong> 显示，最外圈范围为 <strong>{{ currentWarningRange }} m</strong>。
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { getDeepModalMarkup } from '../analysis/deepAnalysisModule.js';
import { getRadarModalMarkup } from '../analysis/radarAnalysisModule.js';
import { getCrackModalMarkup } from '../analysis/crackAnalysisModule.js';
import { getFireModalMarkup } from '../analysis/fireAnalysisModule.js';
import { getWaterModalMarkup } from '../analysis/waterAnalysisModule.js';
import { getGroundModalMarkup } from '../analysis/groundAnalysisModule.js';
import { getYingliModalMarkup } from '../analysis/yingliAnalysisModule.js';
import { getVibModalMarkup } from '../analysis/vibAnalysisModule.js';
import '../out/deep.css';
import '../out/radar.css';
import '../out/crack.css';
import '../out/fire.css';
import '../out/water.css';
import '../out/ground.css';
import '../out/yingli.css';
import '../out/vib.css';

const threeContainer = ref(null);
const selectedUnitCode = ref(null);
const activeCategory = ref('person');
const isWarningZoneSelected = ref(false);
const showWarningSettingsModal = ref(false);

let renderer;
let scene;
let camera;
let controls;
let animationId;
let pointSprites = new Map();
let warningZoneMesh;
let raycaster;
let pointer;
let pointerDownState = null;

const CLICK_MAX_DURATION = 220;
const CLICK_MAX_MOVE = 8;

const warningZoneCenter = {
  centerX: 24,
  centerZ: 24
};

const warningLevels = [
  { value: '1', name: '一级预警', color: '#d9534f' },
  { value: '2', name: '二级预警', color: '#f18f3b' },
  { value: '3', name: '三级预警', color: '#f0c35a' },
  { value: '4', name: '四级预警', color: '#ff8a4c' }
];

const warningSettings = reactive({
  currentLevel: '4',
  ranges: {
    '1': 200,
    '2': 150,
    '3': 110,
    '4': 80
  }
});

const dashboardSensorIcons = {
  GNSS: '📍',
  DEEP: '⚓',
  RADAR: '📡',
  SURFACE: '📐',
  CRACK: '🧱',
  FIRE: '🔥',
  WATER: '💧',
  GROUND: '🌍',
  STRESS: '📊',
  VIB: '💥',
  SAT: '🛰'
};

const dashboardSensorColors = {
  GNSS: '#66B1FF',
  DEEP: '#56C1FF',
  RADAR: '#69D4B2',
  SURFACE: '#F0C35A',
  CRACK: '#FF9B6B',
  FIRE: '#F57676',
  WATER: '#4DBBFF',
  GROUND: '#6ECF8A',
  STRESS: '#C993FF',
  VIB: '#FF8CC1',
  SAT: '#9DD3FF'
};

const pMeta = {};

const createDashboardSensorUnits = () => {
  const deviceTypes = ['GNSS', 'DEEP', 'RADAR', 'SURFACE', 'CRACK', 'FIRE', 'WATER', 'GROUND', 'STRESS', 'VIB', 'SAT'];
  const regionDefinitions = [
    { name: '北帮', xRange: [800, 2200], yRange: [200, 600], lineAxis: { type: 'Y', val: 350 } },
    { name: '南帮', xRange: [800, 2200], yRange: [1900, 2300], lineAxis: { type: 'Y', val: 2150 } },
    { name: '西帮', xRange: [200, 700], yRange: [800, 1700], lineAxis: { type: 'X', val: 400 } },
    { name: '东帮', xRange: [2300, 2800], yRange: [800, 1700], lineAxis: { type: 'X', val: 2600 } },
    { name: '中央区', xRange: [1100, 1900], yRange: [1000, 1500], lineAxis: null }
  ];

  const worldFromDashboard = (x, y) => ({
    x: ((x - 1500) / 1500) * 72,
    z: ((y - 1250) / 1250) * 66
  });

  const placedPoints = [];
  const minDist = 60;
  const gnssCountPerRegion = { '北帮': 0, '南帮': 0, '东帮': 0, '西帮': 0, '中央区': 0 };
  let redGnssCount = 0;

  const units = [];
  const total = 150;
  for (let i = 0; i < total; i++) {
    let deviceType = deviceTypes[i % deviceTypes.length];
    if (i < 7) {
      deviceType = 'RADAR';
    } else if (deviceType === 'RADAR') {
      deviceType = 'GNSS';
    }

    let alarmIdx = (i * 7) % 5;
    const isOnline = (i % 8 !== 0);
    if (deviceType === 'GNSS' && alarmIdx === 0) {
      if (redGnssCount < 2) redGnssCount++;
      else alarmIdx = 4;
    }

    const regDef = regionDefinitions[i % regionDefinitions.length];
    let dashboardX, dashboardY, attempts = 0;
    let isOnDetectionLine = false;
    if (deviceType === 'GNSS' && regDef.lineAxis && gnssCountPerRegion[regDef.name] < 3) {
      isOnDetectionLine = true;
      gnssCountPerRegion[regDef.name]++;
    }

    while (attempts < 150) {
      if (isOnDetectionLine) {
        const idx = gnssCountPerRegion[regDef.name] - 1;
        if (regDef.lineAxis.type === 'Y') {
          dashboardY = regDef.lineAxis.val;
          dashboardX = regDef.xRange[0] + 300 + (idx * 250);
        } else {
          dashboardX = regDef.lineAxis.val;
          dashboardY = regDef.yRange[0] + 300 + (idx * 250);
        }
      } else {
        dashboardX = regDef.xRange[0] + Math.random() * (regDef.xRange[1] - regDef.xRange[0]);
        dashboardY = regDef.yRange[0] + Math.random() * (regDef.yRange[1] - regDef.yRange[0]);
        if (regDef.lineAxis) {
          if (regDef.lineAxis.type === 'Y' && Math.abs(dashboardY - regDef.lineAxis.val) < 60) continue;
          if (regDef.lineAxis.type === 'X' && Math.abs(dashboardX - regDef.lineAxis.val) < 60) continue;
        }
      }
      if (!placedPoints.some(p => Math.hypot(dashboardX - p.x, dashboardY - p.y) < minDist)) break;
      attempts++;
    }
    placedPoints.push({ x: dashboardX, y: dashboardY });

    const world = worldFromDashboard(dashboardX, dashboardY);

    const stressSub = i % 2 === 0 ? '锚索应力' : '土压力计';
    const deviceId = `${deviceType}${i}`;
    const unitId = `pt-${i}`;
    
    pMeta[unitId] = deviceType === 'STRESS'
      ? { id: unitId, type: deviceType, alarmIdx, isOnline, deviceId, region: regDef.name, isOnDetectionLine, subType: stressSub }
      : { id: unitId, type: deviceType, alarmIdx, isOnline, deviceId, region: regDef.name, isOnDetectionLine };

    units.push({
      code: deviceId,
      unitId,
      type: 'sensor',
      deviceType,
      alarmIdx,
      isOnline,
      region: regDef.name,
      isOnDetectionLine,
      detail: `${deviceType}监测`,
      color: dashboardSensorColors[deviceType] || '#66B1FF',
      x: world.x,
      z: world.z
    });
  }

  return units;
};

const getTechData = (type, id) => {
  const meta = pMeta[id];
  if (!meta) return '设备信息获取失败';
  
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
  const totalDisp = (speed * 24).toFixed(2);
  const specs = {
    'GNSS': `累计位移: ${totalDisp} mm<br>当前速度: ${speed.toFixed(2)} mm/h<br>X/Y/H变化: ${(totalDisp * 0.55).toFixed(2)}/${(totalDisp * 0.35).toFixed(2)}/${(totalDisp * 0.10).toFixed(2)} mm`,
    'RADAR': `视在形变: ${totalDisp} mm<br>反射强度: -12.4 dB<br>相干性: 0.98`,
    'DEEP': `深层位移: ${totalDisp} mm<br>测斜深度: 45.0 m`,
    'SURFACE': `裂缝宽度: ${(totalDisp / 10).toFixed(2)} mm<br>张开速率: ${(speed / 10).toFixed(2)} mm/d`,
    'FIRE': `表面温度: ${(25 + parseFloat(totalDisp) / 15).toFixed(1)} ℃<br>CO浓度: 12 ppm`,
    'WATER': `实时水位: ${(120 - totalDisp / 100).toFixed(2)} m<br>水温: 14.2 ℃`,
    'GROUND': `水位深度: ${(80 + parseFloat(totalDisp) / 5).toFixed(2)} m<br>水位变化: +${(speed * 0.5).toFixed(2)} mm/h`,
    'STRESS': `应力/压力: ${(2.5 + speed * 0.15).toFixed(2)} kPa<br>类型: ${meta.subType || '—'}`,
    'VIB': `振动速度峰值: ${speed.toFixed(2)} cm/s<br>主频: ${(10 + (seed % 5)).toFixed(1)} Hz`
  };
  const content = specs[type] || `设备状态: 运行正常<br>当前速度: ${speed.toFixed(2)} mm/h`;
  if (type !== 'SURFACE') {
    const placeholder = `<div style="width:100%; height:80px; background:#e0e0e0; border-radius:4px; margin-bottom:8px; display:flex; align-items:center; justify-content:center; color:#666; font-size:12px;">📷 现场抓拍</div>`;
    return placeholder + content;
  }
  return content;
};

const mapUnits = [
  { code: 'P-31', type: 'person', color: '#67d7ff', x: 30, z: 19, detail: '张伟' },
  { code: 'P-07', type: 'person', color: '#67d7ff', x: 32, z: 31, detail: '李强' },
  { code: 'P-12', type: 'person', color: '#67d7ff', x: 6, z: 8, detail: '王凯' },
  { code: 'P-23', type: 'person', color: '#67d7ff', x: -18, z: 22, detail: '赵磊' },
  { code: 'P-41', type: 'person', color: '#67d7ff', x: 58, z: 28, detail: '刘洋' },
  { code: 'P-44', type: 'person', color: '#67d7ff', x: -32, z: 6, detail: '陈浩' },
  { code: 'P-52', type: 'person', color: '#79e2b0', x: -6, z: 44, detail: '孙颖' },
  { code: 'P-58', type: 'person', color: '#67d7ff', x: 44, z: -6, detail: '周斌' },
  { code: 'P-61', type: 'person', color: '#79e2b0', x: -46, z: 42, detail: '吴杰' },
  { code: 'P-66', type: 'person', color: '#79e2b0', x: 12, z: 58, detail: '郑峰' },
  { code: 'EX-07', type: 'equipment', color: '#ff8c69', x: 16, z: 34, detail: '待命' },
  { code: 'EX-11', type: 'equipment', color: '#ff8c69', x: -42, z: 54, detail: '作业中' },
  { code: 'EX-16', type: 'equipment', color: '#79e2b0', x: 52, z: -18, detail: '巡检中' },
  { code: 'EX-19', type: 'equipment', color: '#ff8c69', x: -8, z: 56, detail: '待命' },
  { code: 'EQ-21', type: 'equipment', color: '#79e2b0', x: -54, z: 12, detail: '已联动' },
  { code: 'T-05', type: 'vehicle', color: '#ffd166', x: 43, z: 16, detail: '已避让' },
  { code: 'T-11', type: 'vehicle', color: '#ffd166', x: 56, z: 2, detail: '待调度' },
  { code: 'T-18', type: 'vehicle', color: '#ffd166', x: -38, z: 48, detail: '返航中' },
  { code: 'T-27', type: 'vehicle', color: '#79e2b0', x: 62, z: -12, detail: '巡航中' },
  { code: 'T-33', type: 'vehicle', color: '#ffd166', x: 4, z: 54, detail: '已改道' },
  { code: 'T-38', type: 'vehicle', color: '#79e2b0', x: -26, z: -14, detail: '待确认' },
  { code: 'EQ-14', type: 'equipment', color: '#79e2b0', x: -34, z: -38, detail: '待命' },
  { code: 'P-19', type: 'person', color: '#79e2b0', x: 9, z: 10, detail: '高敏' },
  { code: 'T-22', type: 'vehicle', color: '#79e2b0', x: -56, z: -8, detail: '巡检中' }
];

mapUnits.push(...createDashboardSensorUnits());

const mapRoutes = [
  {
    label: '人员撤离路线',
    color: '#59d8ff',
    points: [[32, 31], [22, 24], [10, 18], [-2, 12]],
    labelAt: [-1, 14]
  },
  {
    label: '车辆绕行路线',
    color: '#ffd166',
    points: [[43, 16], [56, 14], [66, 8], [76, -2]],
    labelAt: [60, 12]
  },
  {
    label: '设备避让路线',
    color: '#ff8c69',
    points: [[16, 34], [10, 42], [2, 48], [-8, 54]],
    labelAt: [3, 46]
  }
];

const categoryOptions = [
  { label: '人员', value: 'person' },
  { label: '无人车辆', value: 'vehicle' },
  { label: '挖掘设备', value: 'equipment' }
];

const responseList = [
  { type: 'person', code: 'P-31', level: '四级', area: '北帮 3 号台阶至运输道路', distance: '64 m', response: '已响应' },
  { type: 'person', code: 'P-07', level: '四级', area: '北帮 3 号台阶至运输道路', distance: '85 m', response: '已响应' },
  { type: 'person', code: 'P-41', level: '四级', area: '东侧运输坡口', distance: '142 m', response: '待响应' },
  { type: 'person', code: 'P-44', level: '四级', area: '北帮外侧巡检线', distance: '164 m', response: '已响应' },
  { type: 'person', code: 'P-52', level: '四级', area: '作业面边坡', distance: '118 m', response: '待响应' },
  { type: 'person', code: 'P-23', level: '四级', area: '北帮作业面', distance: '108 m', response: '已响应' },
  { type: 'person', code: 'P-12', level: '四级', area: '中部巡查通道', distance: '154 m', response: '待响应' },
  { type: 'person', code: 'P-58', level: '四级', area: '东侧运输坡口', distance: '176 m', response: '已响应' },
  { type: 'person', code: 'P-61', level: '四级', area: '西北角高风险区', distance: '26 m', response: '待响应' },
  { type: 'person', code: 'P-66', level: '四级', area: '南侧临边巡检线', distance: '186 m', response: '待响应' },
  { type: 'vehicle', code: 'T-05', level: '四级', area: '北帮 3 号台阶至运输道路', distance: '72 m', response: '已响应' },
  { type: 'vehicle', code: 'T-18', level: '四级', area: '西北角高风险区', distance: '34 m', response: '待响应' },
  { type: 'vehicle', code: 'T-27', level: '四级', area: '东侧运输坡口', distance: '182 m', response: '已响应' },
  { type: 'vehicle', code: 'T-11', level: '四级', area: '运输道路东侧', distance: '94 m', response: '待响应' },
  { type: 'vehicle', code: 'T-22', level: '四级', area: '作业面边坡', distance: '146 m', response: '待响应' },
  { type: 'vehicle', code: 'T-33', level: '四级', area: '南侧临边巡检线', distance: '168 m', response: '已响应' },
  { type: 'vehicle', code: 'T-38', level: '四级', area: '西侧排土通道', distance: '174 m', response: '待响应' },
  { type: 'equipment', code: 'EX-07', level: '四级', area: '作业面边坡', distance: '96 m', response: '待响应' },
  { type: 'equipment', code: 'EX-11', level: '四级', area: '西北角高风险区', distance: '22 m', response: '待响应' },
  { type: 'equipment', code: 'EX-16', level: '四级', area: '东南作业带', distance: '172 m', response: '已响应' },
  { type: 'equipment', code: 'EX-19', level: '四级', area: '南侧临边巡检线', distance: '188 m', response: '已响应' },
  { type: 'equipment', code: 'EQ-21', level: '四级', area: '西北角高风险区', distance: '31 m', response: '待响应' },
  { type: 'equipment', code: 'EQ-14', level: '四级', area: '北帮 3 号台阶至运输道路', distance: '158 m', response: '已响应' }
];

const filteredResponseList = computed(() =>
  responseList
    .filter((item) => item.type === activeCategory.value)
    .sort((a, b) => Number.parseFloat(a.distance) - Number.parseFloat(b.distance))
);

const isUnitInWarningZone = (unit) => {
  const scale = getWarningZoneScale(currentWarningRange.value);
  const radiusX = 30 * scale.x;
  const radiusZ = 30 * scale.z;
  const nx = (unit.x - warningZoneCenter.centerX) / radiusX;
  const nz = (unit.z - warningZoneCenter.centerZ) / radiusZ;
  return nx * nx + nz * nz <= 1;
};

const summaryCounts = computed(() => ({
  person: mapUnits.filter((item) => item.type === 'person' && (!isWarningZoneSelected.value || isUnitInWarningZone(item))).length,
  vehicle: mapUnits.filter((item) => item.type === 'vehicle' && (!isWarningZoneSelected.value || isUnitInWarningZone(item))).length,
  equipment: mapUnits.filter((item) => item.type === 'equipment' && (!isWarningZoneSelected.value || isUnitInWarningZone(item))).length
}));

const currentWarningMeta = computed(() =>
  warningLevels.find((item) => item.value === warningSettings.currentLevel) || warningLevels[3]
);

const currentWarningRange = computed(() => warningSettings.ranges[warningSettings.currentLevel]);
const warningChipText = computed(() => '四级预警');

const warningChipStyle = computed(() => ({
  background: `${currentWarningMeta.value.color}33`,
  borderColor: `${currentWarningMeta.value.color}66`,
  boxShadow: `0 12px 28px ${currentWarningMeta.value.color}33`
}));

const getWarningZoneScale = (range) => {
  const baseScale = Math.max(0.45, Number(range || 120) / 100);
  return {
    x: baseScale,
    z: Math.max(0.4, baseScale * 0.875)
  };
};

const getTerrainHeight = (x, z) => Math.sin(x / 10) * Math.cos(z / 10) * 8;

const focusUnit = (code) => {
  selectedUnitCode.value = code;
  isWarningZoneSelected.value = false;
  const unit = mapUnits.find((item) => item.code === code);
  if (unit && controls) {
    if (categoryOptions.some((item) => item.value === unit.type)) {
      activeCategory.value = unit.type;
    }
    controls.target.set(unit.x, getTerrainHeight(unit.x, unit.z), unit.z);
    camera.position.set(unit.x + 14, 86, unit.z + 12);
  }
  updateSelectionVisuals();
};

const clearSelections = () => {
  selectedUnitCode.value = null;
  isWarningZoneSelected.value = false;
  updateSelectionVisuals();
};

const handlePanelPointerDown = (event) => {
  pointerDownState = {
    time: Date.now(),
    x: event.clientX,
    y: event.clientY
  };
};

const handlePanelBlankClick = (event) => {
  if (!isShortClick(event)) return;
  clearSelections();
};

const handleCategoryClick = (value, event) => {
  if (!isShortClick(event)) return;
  activeCategory.value = value;
};

const handleRowClick = (code, event) => {
  if (!isShortClick(event)) return;
  focusUnit(code);
};

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }

  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
};

const createSpotTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 120);
  gradient.addColorStop(0, 'rgba(255,255,255,0.4)');
  gradient.addColorStop(0.8, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0.1)');
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
};

const createMapMarkerTexture = (type, color, code, detail, deviceType = '') => {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = 256 * scale;
  canvas.height = 300 * scale;
  const ctx = canvas.getContext('2d');

  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 16 * scale;
  ctx.shadowOffsetY = 4 * scale;

  if (type === 'person') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(128 * scale, 78 * scale, 22 * scale, 0, Math.PI * 2);
    ctx.fill();
    drawRoundedRect(ctx, 92 * scale, 106 * scale, 72 * scale, 92 * scale, 26 * scale);
    ctx.fill();
  } else if (type === 'vehicle') {
    ctx.fillStyle = color;
    drawRoundedRect(ctx, 58 * scale, 104 * scale, 140 * scale, 60 * scale, 18 * scale);
    ctx.fill();
    ctx.fillRect(86 * scale, 80 * scale, 72 * scale, 34 * scale);
    ctx.clearRect(96 * scale, 88 * scale, 20 * scale, 16 * scale);
    ctx.clearRect(124 * scale, 88 * scale, 24 * scale, 16 * scale);
    ctx.fillStyle = '#12304f';
    ctx.beginPath();
    ctx.arc(92 * scale, 170 * scale, 18 * scale, 0, Math.PI * 2);
    ctx.arc(166 * scale, 170 * scale, 18 * scale, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'sensor') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(128 * scale, 120 * scale, 40 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0d2744';
    ctx.beginPath();
    ctx.arc(128 * scale, 120 * scale, 25 * scale, 0, Math.PI * 2);
    ctx.fill();

    const sensorIcon = dashboardSensorIcons[deviceType] || '📡';
    ctx.fillStyle = '#dff1ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${22 * scale}px "Segoe UI Emoji", "Apple Color Emoji", "Microsoft YaHei", sans-serif`;
    ctx.fillText(sensorIcon, 128 * scale, 102 * scale);
    ctx.font = `bold ${11 * scale}px "Microsoft YaHei", sans-serif`;
    ctx.fillText((deviceType || code).slice(0, 6), 128 * scale, 134 * scale);
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(74 * scale, 120 * scale, 108 * scale, 42 * scale);
    ctx.fillRect(100 * scale, 88 * scale, 44 * scale, 34 * scale);
    ctx.beginPath();
    ctx.moveTo(144 * scale, 102 * scale);
    ctx.lineTo(186 * scale, 72 * scale);
    ctx.lineWidth = 16 * scale;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(82 * scale, 172 * scale, 16 * scale, 0, Math.PI * 2);
    ctx.arc(176 * scale, 172 * scale, 16 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${22 * scale}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(code, 128 * scale, 228 * scale);
  ctx.font = `${18 * scale}px "Microsoft YaHei", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(detail, 128 * scale, 266 * scale);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
};

const createTextLabelTexture = (text, color) => {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(11, 29, 49, 0.82)';
  drawRoundedRect(ctx, 16, 26, 352, 54, 24);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#eef7ff';
  ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 192, 54);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
};

const createTerrainZone = (centerX, centerZ, colorHex, spotTexture) => {
  const geometry = new THREE.PlaneGeometry(60, 60, 64, 64);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i) + centerX;
    const vz = pos.getZ(i) + centerZ;
    const vy = Math.sin(vx / 10) * Math.cos(vz / 10) * 8;
    pos.setY(i, vy - 0.5);
  }

  geometry.translate(centerX, 0, centerZ);
  geometry.computeVertexNormals();

  const material = new THREE.MeshBasicMaterial({
    color: colorHex,
    map: spotTexture,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    opacity: 0.8
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;
  return mesh;
};

const updateSelectionVisuals = () => {
  pointSprites.forEach((sprite, code) => {
    sprite.material.opacity = selectedUnitCode.value === code ? 1 : 0.92;
  });

  if (warningZoneMesh) {
    warningZoneMesh.material.opacity = isWarningZoneSelected.value ? 0.96 : 0.8;
  }
};

const isShortClick = (event) => {
  if (!pointerDownState) return false;
  const duration = Date.now() - pointerDownState.time;
  const moveX = event.clientX - pointerDownState.x;
  const moveY = event.clientY - pointerDownState.y;
  const distance = Math.hypot(moveX, moveY);
  pointerDownState = null;
  return duration <= CLICK_MAX_DURATION && distance <= CLICK_MAX_MOVE;
};

const handlePointerDown = (event) => {
  pointerDownState = {
    time: Date.now(),
    x: event.clientX,
    y: event.clientY
  };
};

const showTooltip = (unit, event) => {
  const tt = document.getElementById('map-tooltip');
  if (!tt || !unit.isOnline) return;
  
  const content = `<b style="color:#85C6F1;">[${unit.region}] ${unit.code}</b><hr style='margin:5px 0; opacity:0.2'>${getTechData(unit.deviceType, unit.unitId)}`;
  tt.innerHTML = content;
  tt.style.display = 'block';
  tt.style.left = event.clientX + 15 + 'px';
  tt.style.top = event.clientY + 15 + 'px';
};

const hideTooltip = () => {
  const tt = document.getElementById('map-tooltip');
  if (tt) tt.style.display = 'none';
};

const handleSensorClick = (unit) => {
  if (!unit.isOnline) return;
  
  const noModuleTypes = ['SURFACE', 'SAT'];
  if (noModuleTypes.includes(unit.deviceType)) return;
  
  const analysisModule = window.analysisModule;
  const modules = {
    GNSS: analysisModule,
    DEEP: window.deepAnalysisModule,
    RADAR: window.radarAnalysisModule,
    CRACK: window.crackAnalysisModule,
    FIRE: window.fireAnalysisModule,
    WATER: window.waterAnalysisModule,
    GROUND: window.groundAnalysisModule,
    STRESS: window.yingliAnalysisModule,
    VIB: window.vibAnalysisModule
  };
  
  const module = modules[unit.deviceType];
  if (module && typeof module.open === 'function') {
    const meta = pMeta[unit.unitId];
    if (meta) {
      module.open(meta);
    }
  }
};

const handleSceneClick = (event) => {
  if (!renderer || !camera || !raycaster || !isShortClick(event)) return;

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const targets = [...pointSprites.values()];
  if (warningZoneMesh) targets.push(warningZoneMesh);
  const intersections = raycaster.intersectObjects(targets, false);

  if (!intersections.length) {
    clearSelections();
    return;
  }

  const hit = intersections[0].object;
  if (hit.userData.kind === 'unit') {
    const unit = mapUnits.find((item) => item.code === hit.userData.code);
    if (unit?.type === 'sensor') {
      handleSensorClick(unit);
      return;
    }
    focusUnit(hit.userData.code);
    return;
  }

  if (hit.userData.kind === 'warning-zone') {
    selectedUnitCode.value = null;
    isWarningZoneSelected.value = true;
    updateSelectionVisuals();
    return;
  }

  clearSelections();
};

const handleSceneMouseMove = (event) => {
  if (!renderer || !camera || !raycaster) return;

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const targets = [...pointSprites.values()];
  const intersections = raycaster.intersectObjects(targets, false);

  if (intersections.length > 0) {
    const hit = intersections[0].object;
    if (hit.userData.kind === 'unit') {
      const unit = mapUnits.find((item) => item.code === hit.userData.code);
      if (unit?.type === 'sensor') {
        showTooltip(unit, event);
        return;
      }
    }
  }
  hideTooltip();
};

const updateWarningZoneMesh = () => {
  if (!warningZoneMesh) return;
  const scale = getWarningZoneScale(currentWarningRange.value);
  warningZoneMesh.scale.set(scale.x, 1, scale.z);
  warningZoneMesh.material.color.set(currentWarningMeta.value.color);
};

const initMap = () => {
  if (!threeContainer.value) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1a2a);

  const width = threeContainer.value.clientWidth;
  const height = threeContainer.value.clientHeight;

  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(12, 86, 26);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  renderer.domElement.style.display = 'block';
  threeContainer.value.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
  renderer.domElement.addEventListener('pointerdown', handlePointerDown);
  renderer.domElement.addEventListener('click', handleSceneClick);
  renderer.domElement.addEventListener('mousemove', handleSceneMouseMove);
  renderer.domElement.addEventListener('mouseleave', hideTooltip);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.panSpeed = 1.2;
  controls.screenSpacePanning = false;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: null
  };
  controls.rotateKey = 'Control';
  controls.target.set(18, 0, 16);

  const spotTexture = createSpotTexture();
  const warningZone = createTerrainZone(warningZoneCenter.centerX, warningZoneCenter.centerZ, currentWarningMeta.value.color, spotTexture);
  const warningZoneScale = getWarningZoneScale(currentWarningRange.value);
  warningZone.scale.set(warningZoneScale.x, 1, warningZoneScale.z);
  warningZone.userData.kind = 'warning-zone';
  scene.add(warningZone);
  warningZoneMesh = warningZone;

  const pointGroup = new THREE.Group();
  const routeGroup = new THREE.Group();
  pointSprites = new Map();

  mapUnits.forEach((unit) => {
    const y = getTerrainHeight(unit.x, unit.z);
    const iconTexture = createMapMarkerTexture(unit.type, unit.color, unit.code, unit.detail, unit.deviceType);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: iconTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.renderOrder = 10;
    sprite.position.set(unit.x, y, unit.z);
    const baseScale = unit.type === 'sensor' ? 7.5 : 16;
    sprite.scale.set(baseScale, baseScale, 1);
    sprite.center.set(0.5, 1 - 160 / 256);
    sprite.userData.baseScale = baseScale;
    sprite.userData.kind = 'unit';
    sprite.userData.code = unit.code;
    pointGroup.add(sprite);
    pointSprites.set(unit.code, sprite);
  });

  scene.add(pointGroup);
  updateSelectionVisuals();

  mapRoutes.forEach((route) => {
    const curvePoints = route.points.map(([x, z]) => {
      const y = getTerrainHeight(x, z) + 1.8;
      return new THREE.Vector3(x, y, z);
    });

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const sampled = curve.getPoints(60);
    const geometry = new THREE.BufferGeometry().setFromPoints(sampled);
    const material = new THREE.LineBasicMaterial({
      color: route.color,
      transparent: true,
      opacity: 0.95
    });

    routeGroup.add(new THREE.Line(geometry, material));

    const [labelX, labelZ] = route.labelAt;
    const labelY = getTerrainHeight(labelX, labelZ) + 5;
    const labelTexture = createTextLabelTexture(route.label, route.color);
    const labelMaterial = new THREE.SpriteMaterial({
      map: labelTexture,
      transparent: true,
      depthWrite: false
    });
    const labelSprite = new THREE.Sprite(labelMaterial);
    labelSprite.position.set(labelX, labelY, labelZ);
    labelSprite.scale.set(18, 4.5, 1);
    routeGroup.add(labelSprite);
  });

  scene.add(routeGroup);

  const gridHelper = new THREE.GridHelper(200, 30, 0x1c3d90, 0x1c3d90);
  gridHelper.position.y = -10;
  gridHelper.material.opacity = 0.15;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);

  const animate = () => {
    animationId = requestAnimationFrame(animate);
    const time = Date.now() * 0.006;
    pointSprites.forEach((sprite, code) => {
      const baseScale = sprite.userData.baseScale || 12;
      const unit = mapUnits.find((item) => item.code === code);
      if (unit?.type === 'sensor') {
        sprite.scale.set(baseScale, baseScale, 1);
        return;
      }
      if (selectedUnitCode.value === code) {
        const scale = baseScale + Math.sin(time) * 1.4;
        sprite.scale.set(scale, scale, 1);
      } else {
        sprite.scale.set(baseScale, baseScale, 1);
      }
    });

    controls.update();
    renderer.render(scene, camera);
  };

  animate();
  updateSelectionVisuals();
};

const handleResize = () => {
  if (!threeContainer.value || !renderer || !camera) return;
  const width = threeContainer.value.clientWidth;
  const height = threeContainer.value.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

watch(
  () => [warningSettings.ranges['1'], warningSettings.ranges['2'], warningSettings.ranges['3'], warningSettings.ranges['4']],
  () => {
    updateWarningZoneMesh();
    updateSelectionVisuals();
  }
);

onMounted(() => {
  initMap();
  window.addEventListener('resize', handleResize);
  
  const deepHost = document.getElementById('deep-modal-root');
  if (deepHost) deepHost.innerHTML = getDeepModalMarkup();

  const radarHost = document.getElementById('radar-modal-root');
  if (radarHost) radarHost.innerHTML = getRadarModalMarkup();

  const crackHost = document.getElementById('crack-modal-root');
  if (crackHost) crackHost.innerHTML = getCrackModalMarkup();

  const fireHost = document.getElementById('fire-modal-root');
  if (fireHost) fireHost.innerHTML = getFireModalMarkup();

  const waterHost = document.getElementById('water-modal-root');
  if (waterHost) waterHost.innerHTML = getWaterModalMarkup();

  const groundHost = document.getElementById('ground-modal-root');
  if (groundHost) groundHost.innerHTML = getGroundModalMarkup();

  const yingliHost = document.getElementById('yingli-modal-root');
  if (yingliHost) yingliHost.innerHTML = getYingliModalMarkup();

  const vibHost = document.getElementById('vib-modal-root');
  if (vibHost) vibHost.innerHTML = getVibModalMarkup();

  window.mapModule = { pMeta };
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', handleResize);
  if (controls) controls.dispose();
  if (renderer) {
    renderer.domElement?.removeEventListener('pointerdown', handlePointerDown);
    renderer.domElement?.removeEventListener('click', handleSceneClick);
    renderer.dispose();
    if (renderer.domElement?.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }
});
</script>

<style scoped>
.panel {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(28, 61, 144, 0.08);
  border-radius: 0;
  box-shadow: 0 18px 40px rgba(28, 61, 144, 0.08);
}

.linkage-command-board {
  height: calc(100% - 10px);
  min-height: 0;
  width: calc(100% - 10px);
  padding: 0;
  margin: 5px auto;
  box-sizing: border-box;
}

.linkage-command-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 450px;
  gap: 12px;
  height: 100%;
  box-sizing: border-box;
}

.map-panel,
.right-panel {
  height: 100%;
  min-height: 0;
}

.map-board {
  position: relative;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-radius: 0;
  border: 1px solid #1c3d90;
  background: #0b1a31;
}

.three-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: grab;
  background: #0b1a31;
}

.three-viewport:active {
  cursor: grabbing;
}

.map-overlay {
  position: absolute;
  z-index: 3;
  pointer-events: none;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1;
}

.warning-chip {
  top: 12px;
  left: 12px;
  padding: 12px 20px;
  color: #fff0df;
  background: rgba(255, 138, 76, 0.2);
  border: 1px solid rgba(255, 138, 76, 0.38);
  box-shadow: 0 12px 28px rgba(255, 138, 76, 0.24);
  font-size: 16px;
  font-weight: 700;
}

.controls-chip {
  top: 14px;
  right: 14px;
  padding: 7px 11px;
  color: #d8efff;
  background: rgba(7, 18, 34, 0.72);
  border: 1px solid rgba(133, 198, 241, 0.18);
}

.right-panel {
  display: flex;
}

.right-panel-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
}

.summary-strip {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px;
  gap: 10px;
  align-items: stretch;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff, #f7faff);
  border: 1px solid rgba(28, 61, 144, 0.08);
  box-shadow: 0 14px 32px rgba(28, 61, 144, 0.08);
}

.summary-main span,
.summary-stat span {
  display: block;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #6f84aa;
}

.summary-main strong {
  display: block;
  margin-top: 6px;
  font-size: 22px;
  line-height: 1.35;
  color: #17376f;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.summary-stat {
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8fbff;
  border: 1px solid rgba(28, 61, 144, 0.08);
}

.summary-stat strong {
  display: block;
  margin-top: 6px;
  font-size: 22px;
  line-height: 1;
  color: #17376f;
}

.placeholder-button {
  width: 96px;
  height: 100%;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(28, 61, 144, 0.1);
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff, #f1f6ff);
  box-shadow: 0 14px 32px rgba(28, 61, 144, 0.08);
  color: #4f678b;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.placeholder-button span {
  font-size: 12px;
  color: #6f84aa;
}

.placeholder-button strong {
  font-size: 18px;
  line-height: 1.2;
  color: #17376f;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.placeholder-card {
  width: 100%;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px;
  min-height: 0;
  border-radius: 18px;
  border: 1px solid rgba(28, 61, 144, 0.08);
  background: linear-gradient(180deg, #ffffff, #f7faff);
  box-shadow: 0 14px 32px rgba(28, 61, 144, 0.08);
  color: #17376f;
}

.placeholder-tag {
  align-self: flex-start;
  padding: 5px 10px;
  border-radius: 999px;
  background: #edf4ff;
  color: #4470b8;
  font-size: 11px;
  font-weight: 600;
}

.placeholder-head {
  width: 100%;
}

.category-switch {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: 100%;
  gap: 8px;
}

.category-btn {
  border: 1px solid rgba(28, 61, 144, 0.12);
  border-radius: 14px;
  min-height: 42px;
  padding: 10px 12px;
  background: #f8fbff;
  color: #5f728f;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.category-btn.active {
  color: #c76b1e;
  background: linear-gradient(180deg, #fff4e7, #ffedd8);
  border-color: rgba(217, 120, 31, 0.24);
  box-shadow: 0 10px 20px rgba(217, 120, 31, 0.12);
}

.data-table {
  display: grid;
  gap: 8px;
  min-height: 0;
  max-height: 100%;
  overflow-y: auto;
  padding-right: 4px;
}

.data-table::-webkit-scrollbar {
  width: 8px;
}

.data-table::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(92, 128, 190, 0.35);
}

.data-table::-webkit-scrollbar-track {
  background: rgba(237, 244, 255, 0.7);
}

.data-row {
  display: grid;
  grid-template-columns: 0.78fr 1.28fr 1fr 0.58fr 0.72fr;
  gap: 8px;
  align-items: center;
  border-radius: 14px;
  padding: 11px 12px;
}

.data-head {
  background: #edf4ff;
  color: #5f7eb2;
  font-size: 11px;
  font-weight: 700;
}

.data-body {
  border: 1px solid rgba(28, 61, 144, 0.08);
  background: #f8fbff;
}

.data-body.selected {
  border-color: rgba(217, 120, 31, 0.28);
  background: linear-gradient(180deg, #fff9f1, #fff2e1);
  box-shadow: 0 12px 24px rgba(217, 120, 31, 0.12);
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(10, 26, 42, 0.28);
  backdrop-filter: blur(6px);
}

.warning-settings-modal {
  width: min(760px, 100%);
  border-radius: 24px;
  border: 1px solid rgba(28, 61, 144, 0.08);
  background: linear-gradient(180deg, #ffffff, #f7faff);
  box-shadow: 0 24px 56px rgba(28, 61, 144, 0.16);
  padding: 24px;
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.modal-kicker {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: #6f84aa;
}

.modal-head h3 {
  margin-top: 6px;
  font-size: 24px;
  color: #17376f;
}

.modal-close {
  border: 1px solid rgba(28, 61, 144, 0.12);
  border-radius: 999px;
  background: #f8fbff;
  color: #4f678b;
  padding: 8px 14px;
  cursor: pointer;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.settings-card {
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(28, 61, 144, 0.08);
  background: #fff;
}

.settings-card span {
  display: block;
  font-size: 13px;
  color: #5f728f;
}

.settings-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.settings-input-wrap input {
  width: 100%;
  border: 1px solid rgba(28, 61, 144, 0.12);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 18px;
  font-weight: 700;
  color: #17376f;
  outline: none;
}

.settings-input-wrap em {
  font-style: normal;
  font-size: 14px;
  color: #6f84aa;
}

.settings-tip {
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #fff7ec;
  color: #8a5a20;
}

.data-body strong:first-child {
  color: #d9781f;
}

.data-body strong {
  font-size: 13px;
  line-height: 1.45;
  color: #17376f;
}

.response-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.response-pill.responded {
  color: #1d8e5a;
  background: #e7f8ee;
}

.response-pill.pending {
  color: #d9781f;
  background: #fff0df;
}

@media (max-width: 1200px) {
  .linkage-command-board {
    height: auto;
    min-height: auto;
  }

  .linkage-command-layout {
    grid-template-columns: 1fr;
  }

  .map-board {
    min-height: 520px;
  }

  .right-panel {
    min-height: 240px;
  }

  .summary-strip {
    grid-template-columns: 1fr;
  }

  .placeholder-button {
    width: 100%;
    height: 64px;
  }

  .placeholder-button strong {
    writing-mode: horizontal-tb;
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .map-board {
    min-height: 420px;
  }

  .summary-stats {
    grid-template-columns: 1fr;
  }

  .placeholder-card {
    padding: 16px;
  }

  .placeholder-head {
    width: 100%;
  }

  .data-row {
    grid-template-columns: 1fr;
  }

  .placeholder-card strong {
    font-size: 20px;
  }
}

.map-tooltip {
  display: none;
  position: fixed;
  z-index: 9999;
  max-width: 280px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(10, 26, 42, 0.95);
  border: 1px solid rgba(133, 198, 241, 0.25);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  color: #dce9ff;
  font-size: 12px;
  line-height: 1.6;
  pointer-events: none;
}

.map-tooltip b {
  font-size: 13px;
  font-weight: 600;
}

.map-tooltip hr {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 8px 0;
}
</style>
