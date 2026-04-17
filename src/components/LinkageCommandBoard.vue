<template>
  <section class="panel linkage-command-board">
    <div class="linkage-command-layout">
      <div class="map-panel">
        <Map2D
          :command-overlay="true"
          :command-units="mapUnits"
          :warning-zone="ORANGE_WARNING_ZONE"
          :selected-command-code="selectedUnitCode || ''"
          :warning-zone-active="zoneFocused"
          @command-unit-select="handleMapUnitSelect"
          @command-unit-clear="clearSelectedUnit"
          @warning-zone-click="handleWarningZoneClick"
          @map-background-click="handleMapBackgroundClick"
        />
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

          <div class="category-tabs">
            <button
              v-for="option in categoryOptions"
              :key="option.value"
              class="category-tab"
              :class="{ active: activeCategory === option.value }"
              @click="activeCategory = option.value"
            >
              {{ option.label }}
              <span class="tab-count">{{ getCategoryCount(option.value) }}</span>
            </button>
          </div>

          <div class="response-list-container">
            <div class="response-list-header">
              <span>预警等级</span>
              <span>设备编号</span>
              <span>区域</span>
              <span>距离</span>
              <span>响应状态</span>
            </div>
            <div class="response-list">
              <div
                v-for="item in filteredResponseList"
                :key="item.code"
                class="response-item"
                :class="{ selected: selectedUnitCode === item.code }"
                @click="handleResponseItemClick(item)"
              >
                <span class="warning-level">{{ item.level }}</span>
                <span class="unit-code">{{ item.code }}</span>
                <span class="unit-area">{{ item.area }}</span>
                <span class="unit-distance">{{ item.distance }}</span>
                <span class="response-status" :class="item.response === '已响应' ? 'responded' : 'pending'">
                  {{ item.response }}
                </span>
              </div>
            </div>
          </div>

          <div class="warning-level-summary">
            <div class="warning-level-card">
              <div class="warning-level-header">
                <span class="warning-indicator" :style="{ background: currentWarningMeta.color }"></span>
                <span class="warning-level-text">{{ currentWarningMeta.name }}</span>
              </div>
              <div class="warning-range-info">
                <span>预警范围: {{ currentWarningRange }}m</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <div v-if="showWarningSettingsModal" class="modal-overlay" @click.self="showWarningSettingsModal = false">
      <div class="warning-settings-modal">
        <div class="modal-header">
          <h3>预警区域参数设置</h3>
          <button class="modal-close" @click="showWarningSettingsModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="warning-level-selector">
            <span>当前预警级别:</span>
            <select v-model="warningSettings.currentLevel">
              <option v-for="level in warningLevels" :key="level.value" :value="level.value">
                {{ level.name }}
              </option>
            </select>
          </div>
          <div class="warning-range-settings">
            <div v-for="level in warningLevels" :key="level.value" class="range-input-group">
              <span :style="{ color: level.color }">{{ level.name }}</span>
              <input
                type="number"
                v-model.number="warningSettings.ranges[level.value]"
                class="range-input"
              />
              <span>m</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn" @click="showWarningSettingsModal = false">确定</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import Map2D from './mep.vue';
import { getDeepModalMarkup } from '../analysis/deepAnalysisModule.js';
import { getRadarModalMarkup } from '../analysis/radarAnalysisModule.js';
import { getCrackModalMarkup } from '../analysis/crackAnalysisModule.js';
import { getFireModalMarkup } from '../analysis/fireAnalysisModule.js';
import { getWaterModalMarkup } from '../analysis/waterAnalysisModule.js';
import { getGroundModalMarkup } from '../analysis/groundAnalysisModule.js';
import { getYingliModalMarkup } from '../analysis/yingliAnalysisModule.js';
import { getVibModalMarkup } from '../analysis/vibAnalysisModule.js';
import { ORANGE_WARNING_ZONE } from '../constants/commandOverlayData.js';
import '../out/deep.css';
import '../out/radar.css';
import '../out/crack.css';
import '../out/fire.css';
import '../out/water.css';
import '../out/ground.css';
import '../out/yingli.css';
import '../out/vib.css';

const selectedUnitCode = ref(null);
const activeCategory = ref('person');
const showWarningSettingsModal = ref(false);
const zoneFocused = ref(false);

const warningLevels = [
  { value: '1', name: '一级预警', color: '#d9534f' },
  { value: '2', name: '二级预警', color: '#f18f3b' },
  { value: '3', name: '三级预警', color: '#f0c35a' },
  { value: '4', name: '四级预警', color: '#ff8c69' }
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

const categoryOptions = [
  { label: '人员', value: 'person' },
  { label: '无人车辆', value: 'vehicle' },
  { label: '挖掘设备', value: 'equipment' }
];

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

const isUnitInWarningZone = (item) => {
  const range = ORANGE_WARNING_ZONE.unitRange;
  if (!range) return false;
  return item.x >= range.xMin && item.x <= range.xMax && item.z >= range.zMin && item.z <= range.zMax;
};

const displayedUnits = computed(() => {
  if (!zoneFocused.value) return mapUnits;
  return mapUnits.filter(isUnitInWarningZone);
});

const summaryCounts = computed(() => ({
  person: displayedUnits.value.filter((item) => item.type === 'person').length,
  vehicle: displayedUnits.value.filter((item) => item.type === 'vehicle').length,
  equipment: displayedUnits.value.filter((item) => item.type === 'equipment').length
}));

const currentWarningMeta = computed(() =>
  warningLevels.find((item) => item.value === warningSettings.currentLevel) || warningLevels[3]
);

const currentWarningRange = computed(() => warningSettings.ranges[warningSettings.currentLevel]);

const getCategoryCount = (category) => {
  return responseList.filter((item) => item.type === category).length;
};

const handleResponseItemClick = (item) => {
  zoneFocused.value = false;
  selectedUnitCode.value = item.code;
};

const handleMapUnitSelect = (code) => {
  zoneFocused.value = false;
  selectedUnitCode.value = code;
  const target = responseList.find((item) => item.code === code);
  if (target?.type) activeCategory.value = target.type;
};

const clearSelectedUnit = () => {
  selectedUnitCode.value = null;
};

const handleWarningZoneClick = () => {
  zoneFocused.value = true;
};

const handleMapBackgroundClick = () => {
  zoneFocused.value = false;
};

const handleDocumentClick = (event) => {
  const target = event.target;
  if (target.closest('.response-item') || target.closest('.command-unit') || target.closest('.warning-zone')) return;
  zoneFocused.value = false;
  clearSelectedUnit();
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick, true);

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
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick, true);
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

.map-panel {
  height: 100%;
  min-height: 600px;
  position: relative;
  overflow: hidden;
}

.map-panel :deep(.map-module) {
  height: 100%;
  min-height: 600px;
}

.right-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.right-panel-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.summary-strip {
  display: flex;
  gap: 12px;
}

.summary-card {
  flex: 1;
  background: linear-gradient(135deg, #1c3d90 0%, #0d2744 100%);
  border-radius: 8px;
  padding: 16px;
  color: #fff;
}

.summary-main {
  margin-bottom: 12px;
}

.summary-main span {
  font-size: 12px;
  opacity: 0.7;
}

.summary-main strong {
  display: block;
  font-size: 14px;
  margin-top: 4px;
}

.summary-stats {
  display: flex;
  gap: 16px;
}

.summary-stat {
  text-align: center;
}

.summary-stat span {
  display: block;
  font-size: 10px;
  opacity: 0.7;
}

.summary-stat strong {
  font-size: 18px;
}

.placeholder-button {
  background: linear-gradient(135deg, #85C6F1 0%, #1c3d90 100%);
  border: none;
  border-radius: 8px;
  padding: 16px;
  color: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 120px;
}

.placeholder-button span {
  font-size: 10px;
  opacity: 0.7;
}

.placeholder-button strong {
  font-size: 12px;
}

.category-tabs {
  display: flex;
  gap: 8px;
}

.category-tab {
  flex: 1;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.3s;
}

.category-tab:hover {
  background: #e9ecef;
}

.category-tab.active {
  background: #1c3d90;
  color: #fff;
  border-color: #1c3d90;
}

.tab-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
}

.response-list-container {
  flex: 1;
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.response-list-header {
  display: grid;
  grid-template-columns: 80px 1fr 60px 70px 80px;
  background: #e9ecef;
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #495057;
}

.response-list {
  flex: 1;
  overflow-y: auto;
}

.response-item {
  display: grid;
  grid-template-columns: 80px 1fr 60px 70px 80px;
  padding: 10px 12px;
  border-bottom: 1px solid #e9ecef;
  cursor: pointer;
  transition: background 0.2s;
}

.response-item:hover {
  background: #e9ecef;
}

.response-item.selected {
  background: #dbeafe;
  box-shadow: inset 4px 0 0 #1c3d90;
}

.unit-code {
  font-weight: 600;
  color: #1c3d90;
}

.unit-area {
  font-size: 11px;
  color: #6c757d;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit-distance {
  color: #85C6F1;
  font-weight: 600;
}

.response-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  text-align: center;
}

.response-status.responded {
  background: #d4edda;
  color: #155724;
}

.response-status.pending {
  background: #fff3cd;
  color: #856404;
}

.warning-level {
  font-size: 11px;
  color: #ff8c69;
  font-weight: 600;
}

.warning-level-summary {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
}

.warning-level-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.warning-level-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.warning-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.warning-level-text {
  font-weight: 600;
  color: #1c3d90;
}

.warning-range-info span {
  font-size: 11px;
  color: #6c757d;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.warning-settings-modal {
  background: #fff;
  border-radius: 8px;
  width: 400px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  color: #1c3d90;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 16px;
}

.warning-level-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.warning-level-selector select {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ced4da;
}

.warning-range-settings {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.range-input-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.range-input-group span:first-child {
  width: 80px;
  font-weight: 600;
}

.range-input {
  flex: 1;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #ced4da;
  width: 80px;
}

.range-input-group span:last-child {
  font-size: 12px;
  color: #6c757d;
}

.modal-footer {
  padding: 16px;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: flex-end;
}

.modal-btn {
  background: #1c3d90;
  color: #fff;
  border: none;
  padding: 8px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.modal-btn:hover {
  background: #0d2744;
}
</style>
