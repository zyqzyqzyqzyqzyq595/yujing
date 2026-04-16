<template>
  <div class="view-page emergency-page">
    <section class="emergency-command-board">
      <section class="emergency-shell">
      <div class="map-panel">
        <div ref="threeContainer" class="three-viewport"></div>
          <div class="map-overlay warning-chip">四级预警</div>
        <div class="map-overlay controls-chip">左键平移 / 按住 Ctrl + 左键旋转 / 滚轮缩放</div>
        <div id="map-tooltip" class="map-tooltip"></div>
      </div>

      <div class="right-column">
        <section class="panel status-panel">
          <div class="panel-head">
            <div>
              <p class="panel-kicker">应急指挥概览</p>
              <h3>预警数据项</h3>
            </div>
            <div class="status-actions">
              <button type="button" class="status-action-btn primary" @click="openPlanLibraryModal">应急预案库管理</button>
              <button type="button" class="status-action-btn" @click="downloadHistoryPlanTable">历史应急预案</button>
            </div>
          </div>

          <div class="status-table">
            <div class="status-row status-head">
              <span>预警等级</span>
              <span>预警区域</span>
              <span>触发时间</span>
              <span>最近人员和设备编号</span>
              <span>与预警区距离</span>
            </div>
            <div class="status-row status-body">
              <strong class="warning-level-text">{{ warningSummary.level }}</strong>
              <strong>{{ warningSummary.area }}</strong>
              <strong>{{ departureTime }}</strong>
              <strong>{{ nearestPerson.code }}</strong>
              <strong>{{ selectedUnit.distance }}</strong>
            </div>
          </div>
        </section>

        <section class="panel steps-panel">
          <div class="panel-head">
            <div>
              <p class="panel-kicker">应急预案</p>
              <h3>预案执行步骤</h3>
            </div>
            <div class="steps-head-actions">
              <select
                class="plan-level-select"
                :value="activePlanLevel"
                @change="onPlanLevelChange($event.target.value)"
              >
                <option v-for="level in planLevelOptions" :key="level" :value="level">{{ level }}</option>
              </select>
              <button type="button" class="status-action-btn primary" @click="launchPlan">
                {{ launched ? '预案进行中' : '启动预案' }}
              </button>
              <span class="steps-tag">{{ activePlanLevel }}响应</span>
            </div>
          </div>

          <div class="steps-table">
            <div class="steps-row table-head">
              <span>#</span>
              <span>步骤</span>
              <span>责任人</span>
              <span>时限</span>
              <span>状态</span>
            </div>
            <div
              v-for="step in planSteps"
              :key="step.id"
              class="steps-row table-body"
              :class="[step.stateClass, { clickable: canOpenStepModal(step) }]"
              @click="openStepModal(step)"
            >
              <span class="step-index">{{ step.id }}</span>
              <span class="step-title">{{ step.title }}</span>
              <span>{{ step.owner }}</span>
              <span>{{ step.deadline }}</span>
              <span>
                <em class="step-state" :class="step.stateClass">{{ step.state }}</em>
              </span>
            </div>
          </div>
        </section>
      </div>
      </section>
    </section>

    <div v-if="showPlanModal" class="modal-mask" @click.self="closePlanLibraryModal">
      <section class="plan-modal">
        <div class="modal-head">
          <div>
            <p class="panel-kicker">应急预案库管理</p>
            <h3>{{ planLibraryTab === 'setting' ? '自动预案设置' : '执行步骤管理' }}</h3>
          </div>
          <button type="button" class="modal-close" @click="closePlanLibraryModal">关闭</button>
        </div>

        <div class="library-tab-switch">
          <button
            type="button"
            class="library-tab-btn"
            :class="{ active: planLibraryTab === 'steps' }"
            @click="planLibraryTab = 'steps'"
          >
            执行步骤管理
          </button>
          <button
            type="button"
            class="library-tab-btn"
            :class="{ active: planLibraryTab === 'setting' }"
            @click="planLibraryTab = 'setting'"
          >
            自动预案设置
          </button>
        </div>

        <template v-if="planLibraryTab === 'setting'">
          <div class="modal-summary-grid">
            <div class="modal-summary-card">
              <span>预警区域</span>
              <strong>{{ warningSummary.area }}</strong>
            </div>
            <div class="modal-summary-card">
              <span>挖机数量</span>
              <strong>{{ emergencyPlanSetting.excavatorCount }} 台</strong>
            </div>
            <div class="modal-summary-card">
              <span>卡车数量</span>
              <strong>{{ emergencyPlanSetting.truckCount }} 台</strong>
            </div>
            <div class="modal-summary-card highlight">
              <span>自动选择预案级别</span>
              <strong>{{ emergencyPlanSetting.planLevel }}</strong>
            </div>
          </div>

          <div class="modal-form-grid">
            <label class="modal-field">
              <span>触发时间</span>
              <input :value="departureTime" readonly />
            </label>
            <label class="modal-field">
              <span>响应时间</span>
              <input :value="emergencyPlanSetting.responseTime" readonly />
            </label>
            <label class="modal-field">
              <span>响应人员</span>
              <textarea readonly>{{ emergencyPlanSetting.responsePeople }}</textarea>
            </label>
            <label class="modal-field">
              <span>响应范围</span>
              <input :value="emergencyPlanSetting.responseRange" readonly />
            </label>
            <label class="modal-field full-width">
              <span>自动判定说明</span>
              <textarea readonly>{{ emergencyPlanSetting.ruleDescription }}</textarea>
            </label>
          </div>
        </template>

        <template v-else>
          <div class="steps-level-switch">
            <span>预案等级</span>
            <div class="steps-level-options">
              <button
                v-for="level in planLevelOptions"
                :key="level"
                type="button"
                class="steps-level-option"
                :class="{ active: editingPlanLevel === level }"
                @click="onEditingPlanLevelChange(level)"
              >
                {{ level }}
              </button>
            </div>
          </div>

          <div class="steps-manage-list">
            <div class="steps-manage-head">
              <span>选择</span>
              <span>#</span>
              <span>步骤内容</span>
              <span>责任人</span>
              <span>时限</span>
              <span>状态</span>
            </div>
            <div
              v-for="(item, index) in editablePlanSteps"
              :key="item.id"
              class="steps-manage-row"
            >
              <input
                type="checkbox"
                class="steps-manage-check"
                :checked="selectedEditableStepIds.includes(item.id)"
                @change="toggleEditableStepSelection(item.id)"
              />
              <strong>{{ item.id }}</strong>
              <input v-model="item.title" />
              <input v-model="item.owner" />
              <input v-model="item.deadline" />
              <select v-model="item.stateClass">
                <option value="done">已完成</option>
                <option value="running">进行中</option>
                <option value="pending">待启动</option>
              </select>
            </div>
          </div>

          <div class="steps-manage-actions">
            <button type="button" class="status-action-btn" @click="addPlanStep">新增步骤</button>
            <button
              type="button"
              class="status-action-btn"
              @click="toggleSelectAllEditableSteps"
              :disabled="editablePlanSteps.length === 0"
            >
              {{ isAllEditableStepsSelected ? '取消全选' : '全选' }}
            </button>
            <button
              type="button"
              class="status-action-btn"
              @click="removeSelectedPlanSteps"
              :disabled="selectedEditableStepIds.length === 0 || editablePlanSteps.length - selectedEditableStepIds.length < 1"
            >
              删除所选步骤
            </button>
          </div>
        </template>

        <div class="modal-footer">
          <button type="button" class="status-action-btn" @click="closePlanLibraryModal">取消</button>
          <button
            type="button"
            class="status-action-btn primary"
            @click="confirmPlanLibrary"
          >
            确认应用
          </button>
        </div>
      </section>
    </div>

    <div v-if="showStepModal" class="modal-mask" @click.self="closeStepModal">
      <section class="plan-modal step-modal">
        <div class="modal-head">
          <div>
            <p class="panel-kicker">步骤处理</p>
            <h3>{{ activeStep?.id }} {{ activeStep?.title }}</h3>
          </div>
          <button type="button" class="modal-close" @click="closeStepModal">关闭</button>
        </div>

        <div class="modal-summary-grid step-meta-grid">
          <div class="modal-summary-card">
            <span>责任人</span>
            <strong>{{ activeStep?.owner }}</strong>
          </div>
          <div class="modal-summary-card">
            <span>时限</span>
            <strong>{{ activeStep?.deadline }}</strong>
          </div>
          <div class="modal-summary-card highlight">
            <span>当前状态</span>
            <strong>{{ activeStep?.state }}</strong>
          </div>
        </div>

        <div class="media-preview-box">
          <template v-if="displayMedia && displayMedia.type === 'video'">
            <video class="media-preview" :src="displayMedia.url" controls></video>
          </template>
          <template v-else-if="displayMedia">
            <img class="media-preview" :src="displayMedia.url" :alt="displayMedia.name || '步骤图片'" />
          </template>
          <template v-else>
            <img class="media-preview" :src="placeholderImage" alt="占位图" />
          </template>
        </div>

        <div class="upload-tip" v-if="stepModalMode === 'upload'">
          该步骤状态为进行中，请上传图片或视频后完成该步骤。
        </div>
        <div class="upload-tip" v-else>
          该步骤状态为已完成，可查看历史上传素材；若无素材则显示占位图。
        </div>

        <input
          ref="stepFileInput"
          type="file"
          class="hidden-file-input"
          accept="image/*,video/*"
          @change="onStepMediaSelected"
        />

        <div class="modal-footer">
          <button type="button" class="status-action-btn" @click="closeStepModal">关闭</button>
          <button
            v-if="stepModalMode === 'upload'"
            type="button"
            class="status-action-btn"
            @click="triggerStepFilePicker"
          >
            选择图片/视频
          </button>
          <button
            v-if="stepModalMode === 'upload'"
            type="button"
            class="status-action-btn primary"
            :disabled="!pendingStepMedia"
            @click="submitStepUpload"
          >
            上传并标记已完成
          </button>
        </div>
      </section>
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
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
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
const selectedUnitCode = ref('P-31');
const launched = ref(false);
const planLevelOptions = ['I级预警', 'II级预警', 'III级预警', 'IV级预警'];
const activePlanLevel = ref('IV级预警');
const editingPlanLevel = ref('IV级预警');
const showPlanModal = ref(false);
const planLibraryTab = ref('steps');
const editablePlanSteps = ref([]);
const selectedEditableStepIds = ref([]);
const planStepCounter = ref(7);
const showStepModal = ref(false);
const stepModalMode = ref('view');
const activeStep = ref(null);
const stepFileInput = ref(null);
const pendingStepMedia = ref(null);
const stepMediaStore = ref({});
const placeholderImage =
  'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22960%22 height=%22540%22 viewBox=%220 0 960 540%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22%3E%3Cstop offset=%220%25%22 stop-color=%22%230e223a%22/%3E%3Cstop offset=%22100%25%22 stop-color=%22%23173863%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%22960%22 height=%22540%22 fill=%22url(%23g)%22/%3E%3Ccircle cx=%22480%22 cy=%22255%22 r=%2266%22 fill=%22%233e6aa3%22 opacity=%220.45%22/%3E%3Cpath d=%22M220 390 L390 250 L500 340 L620 270 L740 390 Z%22 fill=%22%23527cb2%22 opacity=%220.6%22/%3E%3Ctext x=%2250%25%22 y=%2288%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23cfe6ff%22 font-size=%2236%22 font-family=%22Microsoft YaHei,sans-serif%22%3E暂无上传素材%3C/text%3E%3C/svg%3E';

let renderer;
let scene;
let camera;
let controls;
let animationId;
let pointSprites = new Map();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let mapClickHandler = null;

const warningSummary = {
  level: '橙色',
  area: '北帮 3 号台阶至运输道路'
};

const departureTime = '16:42:18';

const warningAreaMachines = [
  { code: 'EX-07', type: '挖机', area: warningSummary.area },
  { code: 'TR-21', type: '卡车', area: warningSummary.area }
];

const commandUnits = [
  { code: 'P-31', type: '人员', area: warningSummary.area, position: '北帮台阶观察点', distance: '64 m', status: '现场值守中' },
  { code: 'P-07', type: '人员', area: warningSummary.area, position: '疏散路线 A 段', distance: '85 m', status: '正在撤离' },
  { code: 'EX-07', type: '设备', area: warningSummary.area, position: '作业面边坡设备位', distance: '96 m', status: '等待停机' },
  { code: 'P-23', type: '人员', area: warningSummary.area, position: '北帮作业面', distance: '108 m', status: '执行转移' },
  { code: 'P-12', type: '人员', area: warningSummary.area, position: '运输道路东侧', distance: '132 m', status: '等待确认' },
  { code: 'T-05', type: '车辆', area: warningSummary.area, position: '北帮运输道路', distance: '240 m', status: '绕行中' },
  { code: 'T-11', type: '车辆', area: '应急车库', position: '救援通道', distance: '315 m', status: '前往现场' },
  { code: 'EQ-14', type: '设备', area: '东南排水区', position: '排水设施点位', distance: '560 m', status: '待命中' }
];

const selectedUnit = computed(() => {
  return commandUnits.find((item) => item.code === selectedUnitCode.value) ?? commandUnits[0];
});

const nearestPerson = computed(() => {
  return commandUnits.find((item) => item.type === '人员') ?? commandUnits[0];
});

const nearestEquipment = computed(() => {
  return commandUnits.find((item) => item.type === '设备') ?? commandUnits[0];
});

const emergencyPlanSetting = computed(() => {
  const excavatorCount = warningAreaMachines.filter((item) => item.type === '挖机').length;
  const truckCount = warningAreaMachines.filter((item) => item.type === '卡车').length;
  const totalCount = excavatorCount + truckCount;

  if (totalCount <= 2) {
    return {
      excavatorCount,
      truckCount,
      planLevel: 'IV级预警',
      responseTime: '30分钟内',
      responsePeople: '值班调度员 2 人、现场安全员 2 人、机动疏导人员 4 人',
      responseRange: '预警区方圆 300 米',
      ruleDescription: '当前预警区内共识别 1 台挖机、1 台卡车，设备数量处于低风险区间，系统自动匹配 IV 级预警。'
    };
  }

  if (totalCount <= 4) {
    return {
      excavatorCount,
      truckCount,
      planLevel: 'III级预警',
      responseTime: '20分钟内',
      responsePeople: '值班调度员 2 人、现场安全员 4 人、设备联动人员 6 人',
      responseRange: '预警区方圆 500 米',
      ruleDescription: '当前设备总数进入中低风险区间，系统自动升级为 III 级预警，并扩大到 500 米范围组织联动响应。'
    };
  }

  if (totalCount <= 6) {
    return {
      excavatorCount,
      truckCount,
      planLevel: 'II级预警',
      responseTime: '10分钟内',
      responsePeople: '调度中心 4 人、现场安全员 6 人、车辆疏导组 8 人、医疗保障组 2 人',
      responseRange: '预警区方圆 800 米',
      ruleDescription: '当前设备总数进入中高风险区间，系统自动切换 II 级预警，并对 800 米范围内人员车辆实施快速响应。'
    };
  }

  return {
    excavatorCount,
    truckCount,
    planLevel: 'I级预警',
    responseTime: '5分钟内',
    responsePeople: '应急指挥部全员、现场安全员 8 人、车辆疏导组 10 人、医疗与抢险保障组 6 人',
    responseRange: '预警区方圆 1200 米',
    ruleDescription: '当前设备总数达到高风险阈值，系统自动升级为 I 级预警，并对 1200 米范围实施最高等级应急响应。'
  };
});

const stateLabelMap = {
  done: '已完成',
  running: '进行中',
  pending: '待启动'
};

const createPendingStep = (id, title, owner, deadline) => ({
  id,
  title,
  owner,
  deadline,
  state: '待启动',
  stateClass: 'pending'
});

const createInitialStepsByLevel = () => ({
  I级预警: [
    createPendingStep('01', '发布紧急预警，全员推送', '系统自动', '即时'),
    createPendingStep('02', '启动声光报警装置', '调度中心', '5min'),
    createPendingStep('03', '组织危险区域人员疏散', '李明华', '15min'),
    createPendingStep('04', '资源调度', '调度中心', '10min'),
    createPendingStep('05', '联动停止无人驾驶车辆', '系统自动', '即时'),
    createPendingStep('06', '现场勘查', '张建国', '30min'),
    createPendingStep('07', '治理措施并实施', '技术部', '2h')
  ],
  II级预警: [
    createPendingStep('01', '发布紧急预警，全员推送', '系统自动', '即时'),
    createPendingStep('02', '启动声光报警装置', '调度中心', '5min'),
    createPendingStep('03', '组织危险区域人员疏散', '李明华', '15min'),
    createPendingStep('04', '资源调度', '调度中心', '10min'),
    createPendingStep('05', '联动停止无人驾驶车辆', '系统自动', '即时'),
    createPendingStep('06', '现场勘查', '张建国', '30min')
  ],
  III级预警: [
    createPendingStep('01', '发布紧急预警，全员推送', '系统自动', '即时'),
    createPendingStep('02', '启动声光报警装置', '调度中心', '5min'),
    createPendingStep('03', '组织危险区域人员疏散', '李明华', '15min'),
    createPendingStep('04', '资源调度', '调度中心', '10min')
  ],
  IV级预警: [
    createPendingStep('01', '发布紧急预警，全员推送', '系统自动', '即时'),
    createPendingStep('02', '启动声光报警装置', '调度中心', '5min'),
    createPendingStep('03', '组织危险区域人员疏散', '李明华', '15min')
  ]
});

const normalizeStepState = (step) => {
  step.state = stateLabelMap[step.stateClass] ?? step.state ?? '待启动';
  return step;
};

const planStepsByLevel = ref(createInitialStepsByLevel());

const planSteps = computed(() => planStepsByLevel.value[activePlanLevel.value] ?? []);

const cloneStep = (step) => ({
  id: step.id,
  title: step.title,
  owner: step.owner,
  deadline: step.deadline,
  stateClass: step.stateClass,
  state: step.state
});

const loadEditableStepsByLevel = (level) => {
  const steps = planStepsByLevel.value[level] ?? [];
  editablePlanSteps.value = steps.map((step) => cloneStep(step));
  selectedEditableStepIds.value = [];
  planStepCounter.value = Math.max(...editablePlanSteps.value.map((item) => Number(item.id)), 0);
};

const setLevelStepsState = (level, stateClass) => {
  const steps = planStepsByLevel.value[level];
  if (!steps) return;
  const state = stateLabelMap[stateClass] ?? '待启动';
  steps.forEach((step) => {
    step.stateClass = stateClass;
    step.state = state;
  });
};

const launchPlan = () => {
  launched.value = true;
  setLevelStepsState(activePlanLevel.value, 'running');
};

const onPlanLevelChange = (level) => {
  if (!planStepsByLevel.value[level]) return;
  activePlanLevel.value = level;
  if (launched.value) {
    setLevelStepsState(level, 'running');
  }
};

const openPlanLibraryModal = () => {
  planLibraryTab.value = 'steps';
  editingPlanLevel.value = activePlanLevel.value;
  loadEditableStepsByLevel(editingPlanLevel.value);
  showPlanModal.value = true;
};

const closePlanLibraryModal = () => {
  showPlanModal.value = false;
};

const addPlanStep = () => {
  planStepCounter.value += 1;
  const id = String(planStepCounter.value).padStart(2, '0');
  editablePlanSteps.value.push({
    id,
    title: `步骤${id}`,
    owner: '待分配',
    deadline: '30min',
    stateClass: 'pending',
    state: '待启动'
  });
};

const isAllEditableStepsSelected = computed(() => {
  if (editablePlanSteps.value.length === 0) return false;
  return editablePlanSteps.value.every((item) => selectedEditableStepIds.value.includes(item.id));
});

const toggleEditableStepSelection = (id) => {
  if (selectedEditableStepIds.value.includes(id)) {
    selectedEditableStepIds.value = selectedEditableStepIds.value.filter((itemId) => itemId !== id);
    return;
  }
  selectedEditableStepIds.value = [...selectedEditableStepIds.value, id];
};

const toggleSelectAllEditableSteps = () => {
  if (isAllEditableStepsSelected.value) {
    selectedEditableStepIds.value = [];
    return;
  }
  selectedEditableStepIds.value = editablePlanSteps.value.map((item) => item.id);
};

const removeSelectedPlanSteps = () => {
  if (selectedEditableStepIds.value.length === 0) return;
  const remainCount = editablePlanSteps.value.length - selectedEditableStepIds.value.length;
  if (remainCount < 1) return;
  const selectedIds = new Set(selectedEditableStepIds.value);
  editablePlanSteps.value = editablePlanSteps.value.filter((item) => !selectedIds.has(item.id));
  selectedEditableStepIds.value = [];
};

const onEditingPlanLevelChange = (level) => {
  if (!planStepsByLevel.value[level]) return;
  editingPlanLevel.value = level;
  loadEditableStepsByLevel(level);
};

const confirmPlanLibrary = () => {
  if (planLibraryTab.value === 'steps') {
    const nextSteps = editablePlanSteps.value.map((step) =>
      normalizeStepState({
        ...step,
        title: step.title?.trim() || '未命名步骤',
        owner: step.owner?.trim() || '待分配',
        deadline: step.deadline?.trim() || '待定'
      })
    );
    planStepsByLevel.value[editingPlanLevel.value] = nextSteps;
    if (launched.value) {
      setLevelStepsState(editingPlanLevel.value, 'running');
    }
  }
  closePlanLibraryModal();
};

const csvCell = (value) => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadHistoryPlanTable = () => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10);
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '-');

  const baseRows = [
    ['历史应急预案导出', '', '', ''],
    ['导出时间', `${datePart} ${now.toTimeString().slice(0, 8)}`, '', ''],
    ['', '', '', ''],
    ['预警数据项', '值', '', ''],
    ['预警等级', warningSummary.level, '', ''],
    ['预警区域', warningSummary.area, '', ''],
    ['触发时间', departureTime, '', ''],
    ['最近人员编号', nearestPerson.value.code, '', ''],
    ['与预警区距离', selectedUnit.value.distance, '', ''],
    ['', '', '', ''],
    ['自动预案设置', '值', '', ''],
    ['挖机数量', `${emergencyPlanSetting.value.excavatorCount} 台`, '', ''],
    ['卡车数量', `${emergencyPlanSetting.value.truckCount} 台`, '', ''],
    ['自动预案级别', emergencyPlanSetting.value.planLevel, '', ''],
    ['响应时间', emergencyPlanSetting.value.responseTime, '', ''],
    ['响应人员', emergencyPlanSetting.value.responsePeople, '', ''],
    ['响应范围', emergencyPlanSetting.value.responseRange, '', ''],
    ['', '', '', ''],
    ['预警预案执行步骤', '', '', '', '', '', ''],
    ['编号', '步骤', '责任人', '时限', '状态', '上传素材', '素材类型']
  ];

  const stepRows = planSteps.value.map((step) => {
    const media = stepMediaStore.value[`${activePlanLevel.value}-${step.id}`];
    return [
      step.id,
      step.title,
      step.owner,
      step.deadline,
      step.state,
      media ? '已上传' : '未上传',
      media ? (media.type === 'video' ? '视频' : '图片') : '无'
    ];
  });

  const rows = [...baseRows, ...stepRows];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `历史应急预案_${datePart}_${timePart}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const displayMedia = computed(() => {
  if (!activeStep.value) return null;
  if (stepModalMode.value === 'upload' && pendingStepMedia.value) return pendingStepMedia.value;
  return stepMediaStore.value[`${activePlanLevel.value}-${activeStep.value.id}`] ?? null;
});

const canOpenStepModal = (step) => step.stateClass === 'running' || step.stateClass === 'done';

const openStepModal = (step) => {
  if (!canOpenStepModal(step)) return;
  activeStep.value = step;
  stepModalMode.value = step.stateClass === 'running' ? 'upload' : 'view';
  if (pendingStepMedia.value?.url) {
    URL.revokeObjectURL(pendingStepMedia.value.url);
  }
  pendingStepMedia.value = null;
  showStepModal.value = true;
};

const closeStepModal = () => {
  showStepModal.value = false;
  activeStep.value = null;
  if (pendingStepMedia.value?.url) {
    URL.revokeObjectURL(pendingStepMedia.value.url);
  }
  pendingStepMedia.value = null;
  if (stepFileInput.value) {
    stepFileInput.value.value = '';
  }
};

const triggerStepFilePicker = () => {
  if (stepFileInput.value) {
    stepFileInput.value.click();
  }
};

const onStepMediaSelected = (event) => {
  const file = event.target?.files?.[0];
  if (!file) return;

  if (pendingStepMedia.value?.url) {
    URL.revokeObjectURL(pendingStepMedia.value.url);
  }

  pendingStepMedia.value = {
    name: file.name,
    type: file.type.startsWith('video/') ? 'video' : 'image',
    url: URL.createObjectURL(file)
  };
};

const submitStepUpload = () => {
  if (!activeStep.value || !pendingStepMedia.value) return;

  const stepKey = `${activePlanLevel.value}-${activeStep.value.id}`;
  const existing = stepMediaStore.value[stepKey];
  if (existing?.url) {
    URL.revokeObjectURL(existing.url);
  }

  stepMediaStore.value[stepKey] = {
    name: pendingStepMedia.value.name,
    type: pendingStepMedia.value.type,
    url: pendingStepMedia.value.url
  };

  activeStep.value.state = '已完成';
  activeStep.value.stateClass = 'done';
  closeStepModal();
};
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
  SAT: '🛸'
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
      color: dashboardSensorColors[deviceType] || '#66B1FF',
      x: world.x,
      z: world.z,
      blink: isOnline && alarmIdx === 0
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
  { code: 'P-31', type: 'person', color: '#62d0ff', x: 30, z: 19, blink: true },
  { code: 'P-07', type: 'person', color: '#62d0ff', x: 32, z: 31, blink: false },
  { code: 'P-12', type: 'person', color: '#62d0ff', x: 20, z: 20 },
  { code: 'P-23', type: 'person', color: '#62d0ff', x: 26, z: 26 },
  { code: 'EX-07', type: 'equipment', color: '#ff9d5c', x: 16, z: 34 },
  { code: 'T-05', type: 'vehicle', color: '#ffd166', x: 43, z: 16 },
  { code: 'T-11', type: 'vehicle', color: '#ffd166', x: 56, z: 2 },
  { code: 'EQ-14', type: 'equipment', color: '#7ed9a3', x: -34, z: -38 },
  ...createDashboardSensorUnits()
];

const mapRoutes = [
  {
    label: '人员撤离路线',
    color: '#4fd7ff',
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
    label: '设备撤离路线',
    color: '#ff9d5c',
    points: [[16, 34], [10, 42], [2, 48], [-8, 54]],
    labelAt: [3, 46]
  }
];

const getTerrainHeight = (x, z) => Math.sin(x / 10) * Math.cos(z / 10) * 8;

const focusUnit = (code) => {
  selectedUnitCode.value = code;
  const unit = mapUnits.find((item) => item.code === code);
  if (unit && controls) {
    controls.target.set(unit.x, getTerrainHeight(unit.x, unit.z), unit.z);
    camera.position.set(unit.x + 14, 86, unit.z + 12);
  }
  updateSelectionVisuals();
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
  gradient.addColorStop(0, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(0.8, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(255,255,255,0.06)');
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.72)';
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
};

const createMapMarkerTexture = (type, color, code, deviceType = '') => {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = 256 * scale;
  canvas.height = 256 * scale;
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

    ctx.fillStyle = '#dff1ff';
    ctx.font = `bold ${12 * scale}px "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const sensorIcon = dashboardSensorIcons[deviceType] || '📡';
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
  ctx.font = `bold ${16 * scale}px "Microsoft YaHei", sans-serif`;
  const textWidth = ctx.measureText(code).width;
  const labelWidth = textWidth + 24 * scale;
  const labelHeight = 26 * scale;
  const labelX = 128 * scale - labelWidth / 2;
  const labelY = 182 * scale - labelHeight / 2;

  ctx.fillStyle = 'rgba(4, 14, 26, 0.88)';
  drawRoundedRect(ctx, labelX, labelY, labelWidth, labelHeight, 4 * scale);
  ctx.fill();

  ctx.lineWidth = 1 * scale;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(code, 128 * scale, 182 * scale);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
};

const createTextLabelTexture = (text, color) => {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');

  ctx.font = 'bold 26px "Microsoft YaHei", sans-serif';
  const textWidth = ctx.measureText(text).width;
  const width = Math.min(344, textWidth + 36);
  const x = (canvas.width - width) / 2;
  const y = 18;

  ctx.fillStyle = 'rgba(7, 18, 34, 0.82)';
  drawRoundedRect(ctx, x, y, width, 50, 14);
  ctx.fill();

  ctx.strokeStyle = `${color}aa`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, y + 25);

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
    opacity: 0.76
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;
  return mesh;
};

const updateSelectionVisuals = () => {
  pointSprites.forEach((sprite, code) => {
    const isSelected = selectedUnitCode.value === code;
    sprite.material.opacity = isSelected ? 1 : 0.9;
    sprite.userData.isSelected = isSelected;
  });
};

const initMap = () => {
  if (!threeContainer.value) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x081624);

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
  const warningZone = createTerrainZone(24, 24, '#ff8b4d', spotTexture);
  warningZone.scale.set(1.2, 1, 1.05);
  scene.add(warningZone);

  const pointGroup = new THREE.Group();
  const routeGroup = new THREE.Group();
  pointSprites = new Map();

  mapUnits.forEach((unit) => {
    const y = getTerrainHeight(unit.x, unit.z);
    const iconTexture = createMapMarkerTexture(unit.type, unit.color, unit.code, unit.deviceType);
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
    sprite.userData.isBlinking = Boolean(unit.blink);
    sprite.userData.baseScale = baseScale;
    sprite.userData.unit = unit;
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

  mapClickHandler = (event) => {
    if (!renderer || !camera) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const clickableSprites = Array.from(pointSprites.values());
    const intersects = raycaster.intersectObjects(clickableSprites, false);
    const hit = intersects[0]?.object;
    if (!hit) return;

    const unit = hit.userData?.unit;
    if (!unit) return;
    
    if (unit.type === 'sensor') {
      handleSensorClick(unit);
      return;
    }
    focusUnit(unit.code);
  };

  const mapMouseMoveHandler = (event) => {
    if (!renderer || !camera) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const clickableSprites = Array.from(pointSprites.values());
    const intersects = raycaster.intersectObjects(clickableSprites, false);
    const hit = intersects[0]?.object;
    
    if (hit) {
      const unit = hit.userData?.unit;
      if (unit && unit.type === 'sensor') {
        showTooltip(unit, event);
        return;
      }
    }
    hideTooltip();
  };

  renderer.domElement.addEventListener('click', mapClickHandler);
  renderer.domElement.addEventListener('mousemove', mapMouseMoveHandler);
  renderer.domElement.addEventListener('mouseleave', hideTooltip);

  const gridHelper = new THREE.GridHelper(200, 30, 0x2452a4, 0x17396e);
  gridHelper.position.y = -10;
  gridHelper.material.opacity = 0.18;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);

  const animate = () => {
    animationId = requestAnimationFrame(animate);
    const time = Date.now() * 0.005;

    pointSprites.forEach((sprite, code) => {
      const isSelected = selectedUnitCode.value === code;
      const unitType = sprite.userData?.unit?.type;
      if (unitType === 'sensor') {
        const baseScale = sprite.userData.baseScale || 7.5;
        sprite.scale.set(baseScale, baseScale, 1);
        return;
      }
      const isBlinking = sprite.userData.isBlinking;
      const baseScale = sprite.userData.baseScale || 12;
      const pulse = isSelected ? 2.4 : isBlinking ? 1.2 : 0;
      const scale = baseScale + Math.sin(time * (isSelected ? 1.4 : 1)) * pulse;
      sprite.scale.set(scale, scale, 1);
    });

    controls.update();
    renderer.render(scene, camera);
  };

  animate();
  focusUnit(selectedUnitCode.value);
};

const handleResize = () => {
  if (!threeContainer.value || !renderer || !camera) return;
  const width = threeContainer.value.clientWidth;
  const height = threeContainer.value.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

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
  if (pendingStepMedia.value?.url) {
    URL.revokeObjectURL(pendingStepMedia.value.url);
  }
  Object.values(stepMediaStore.value).forEach((media) => {
    if (media?.url) URL.revokeObjectURL(media.url);
  });
  if (controls) controls.dispose();
  if (renderer) {
    if (mapClickHandler) {
      renderer.domElement.removeEventListener('click', mapClickHandler);
      mapClickHandler = null;
    }
    renderer.dispose();
    if (renderer.domElement?.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }
});
</script>

<style scoped>
.emergency-page {
  height: 100%;
  min-height: 0;
  width: 100%;
  color: #dce9ff;
  overflow: hidden;
  box-sizing: border-box;
}

.emergency-command-board {
  height: calc(100% - 10px);
  min-height: 0;
  width: calc(100% - 10px);
  padding: 0;
  margin: 5px auto;
  border-radius: 0;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(28, 61, 144, 0.08);
  box-shadow: 0 18px 40px rgba(28, 61, 144, 0.08);
  box-sizing: border-box;
}

.emergency-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 450px;
  gap: 12px;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
}

.panel,
.map-panel {
  border-radius: 0;
  overflow: hidden;
  border: 1px solid rgba(28, 61, 144, 0.16);
  box-shadow: none;
}

.map-panel {
  position: relative;
  min-height: 0;
  height: 100%;
  background: #0b1a31;
  border-color: #1c3d90;
}

.three-viewport {
  width: 100%;
  height: 100%;
  min-height: 0;
  cursor: grab;
}

.three-viewport:active {
  cursor: grabbing;
}

.map-overlay {
  position: absolute;
  z-index: 3;
  pointer-events: none;
}

.warning-chip,
.area-chip,
.controls-chip,
.status-badge,
.steps-tag {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-weight: 700;
}

.warning-chip {
  top: 14px;
  left: 14px;
  padding: 10px 16px;
  color: #ffe7d5;
  background: rgba(255, 139, 77, 0.18);
  border: 1px solid rgba(255, 156, 107, 0.4);
  box-shadow: 0 14px 32px rgba(255, 139, 77, 0.2);
}

.area-chip {
  top: 14px;
  left: 146px;
  padding: 10px 16px;
  color: #d9ecff;
  background: rgba(9, 29, 54, 0.7);
  border: 1px solid rgba(122, 185, 255, 0.22);
}

.controls-chip {
  right: 14px;
  top: 14px;
  padding: 8px 12px;
  font-size: 11px;
  color: #a9caeb;
  background: rgba(9, 23, 38, 0.72);
  border: 1px solid rgba(122, 185, 255, 0.18);
}

.right-column {
  display: grid;
  grid-template-rows: minmax(0, 0.52fr) minmax(0, 1.18fr);
  gap: 10px;
  height: 100%;
  min-height: 0;
}

.panel {
  padding: 16px;
  background: linear-gradient(180deg, #fbfdff 0%, #f4f8ff 100%);
  border: 1px solid rgba(28, 61, 144, 0.08);
  box-shadow: 0 16px 36px rgba(28, 61, 144, 0.1);
  backdrop-filter: blur(16px);
}

.status-panel {
  padding: 12px 14px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.panel-kicker {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #7c93b8;
}

.panel-head h3 {
  margin-top: 2px;
  font-size: 18px;
  color: #1f3f78;
}

.status-badge {
  min-width: 76px;
  justify-content: center;
  padding: 7px 12px;
  color: #d6ebff;
  background: rgba(33, 79, 155, 0.34);
  border: 1px solid rgba(108, 164, 255, 0.24);
  font-size: 12px;
}

.status-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-action-btn {
  border: 1px solid rgba(74, 120, 193, 0.2);
  border-radius: 999px;
  padding: 8px 14px;
  background: #eef4ff;
  color: #2f5da4;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.status-action-btn.primary {
  color: #fff;
  background: linear-gradient(135deg, #2f72d8, #2353ab);
}

.status-action-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(67, 124, 211, 0.35);
  background: #e6efff;
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(3, 10, 20, 0.68);
  backdrop-filter: blur(10px);
}

.plan-modal {
  width: min(860px, 100%);
  border-radius: 24px;
  border: 1px solid rgba(28, 61, 144, 0.1);
  background: linear-gradient(180deg, #ffffff 0%, #f5f9ff 100%);
  box-shadow: 0 22px 56px rgba(28, 61, 144, 0.18);
  padding: 22px;
}

.modal-head,
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.modal-close {
  border: 1px solid rgba(74, 120, 193, 0.2);
  border-radius: 999px;
  padding: 8px 14px;
  background: #eef4ff;
  color: #2f5da4;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.library-tab-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 14px;
}

.library-tab-btn {
  border: 1px solid rgba(74, 120, 193, 0.18);
  border-radius: 12px;
  padding: 10px 14px;
  background: #f3f7ff;
  color: #3b629f;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.library-tab-btn.active {
  color: #fff;
  background: linear-gradient(135deg, #2f72d8, #2353ab);
  border-color: rgba(46, 106, 197, 0.42);
}

.modal-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.steps-manage-list {
  margin-top: 16px;
  display: grid;
  gap: 10px;
}

.steps-level-switch {
  margin-top: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.steps-level-switch span {
  font-size: 12px;
  color: #6d87b0;
  font-weight: 700;
}

.steps-level-options {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.steps-level-option {
  border: 1px solid rgba(74, 120, 193, 0.2);
  border-radius: 999px;
  padding: 6px 12px;
  background: #eef4ff;
  color: #2f5da4;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.steps-level-option.active {
  color: #fff;
  background: linear-gradient(135deg, #2f72d8, #2353ab);
  border-color: rgba(46, 106, 197, 0.42);
}

.steps-manage-head,
.steps-manage-row {
  display: grid;
  grid-template-columns: 52px 56px 1.5fr 1fr 0.8fr 0.8fr;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 14px;
}

.steps-manage-head {
  background: #edf4ff;
  color: #5f7eb2;
  font-size: 12px;
  font-weight: 700;
}

.steps-manage-row {
  border: 1px solid rgba(74, 120, 193, 0.12);
  background: #f8fbff;
}

.steps-manage-row strong {
  color: #5f7eb2;
}

.steps-manage-check {
  width: 16px;
  height: 16px;
  justify-self: center;
  accent-color: #2f72d8;
  cursor: pointer;
}

.steps-manage-row input,
.steps-manage-row select {
  width: 100%;
  border: 1px solid rgba(74, 120, 193, 0.18);
  border-radius: 10px;
  background: #ffffff;
  color: #274b86;
  padding: 7px 9px;
  font: inherit;
}

.steps-manage-actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}

.modal-summary-card {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(74, 120, 193, 0.12);
  background: linear-gradient(180deg, #f8fbff, #f1f6ff);
}

.modal-summary-card.highlight {
  box-shadow: inset 0 0 0 1px rgba(255, 154, 77, 0.18);
}

.modal-summary-card span,
.modal-field span {
  display: block;
  font-size: 12px;
  color: #6d87b0;
}

.modal-summary-card strong {
  display: block;
  margin-top: 8px;
  font-size: 18px;
  color: #1f3f78;
  line-height: 1.3;
}

.modal-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.modal-field {
  display: grid;
  gap: 8px;
}

.modal-field.full-width {
  grid-column: 1 / -1;
}

.modal-field input,
.modal-field textarea {
  width: 100%;
  border: 1px solid rgba(74, 120, 193, 0.18);
  border-radius: 16px;
  background: #ffffff;
  color: #274b86;
  padding: 12px 14px;
  font: inherit;
  resize: none;
}

.modal-field input {
  min-height: 46px;
}

.modal-field textarea {
  min-height: 92px;
  line-height: 1.6;
}

.modal-footer {
  justify-content: flex-end;
  margin-top: 18px;
}

.status-table {
  display: grid;
  gap: 6px;
}

.status-row {
  display: grid;
  grid-template-columns: 0.72fr 1.28fr 0.72fr 1.05fr 0.7fr;
  gap: 12px;
  align-items: center;
}

.status-head {
  padding: 7px 14px;
  border-radius: 14px;
  background: #edf4ff;
  color: #5f7eb2;
  font-size: 11px;
  font-weight: 700;
}

.status-body {
  min-height: 58px;
  padding: 10px 14px;
  border-radius: 14px;
  border: 1px solid rgba(74, 120, 193, 0.12);
  background: #f8fbff;
  box-shadow: inset 0 0 0 1px rgba(95, 126, 178, 0.06);
}

.status-head span,
.status-body strong {
  min-width: 0;
}

.status-body strong {
  font-size: 14px;
  color: #1f3f78;
  line-height: 1.2;
  word-break: break-word;
  font-weight: 700;
}

.status-body .warning-level-text {
  color: #ff9a4d;
}

.steps-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 14px 16px;
}

.steps-panel .panel-head {
  align-items: center;
}

.steps-panel .panel-head > div:first-child {
  min-width: 0;
}

.steps-panel .panel-head h3 {
  white-space: nowrap;
}

.steps-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  flex-shrink: 0;
}

.plan-level-select {
  width: 106px;
  min-width: 106px;
  border: 1px solid rgba(74, 120, 193, 0.2);
  border-radius: 999px;
  padding: 8px 10px;
  background: #eef4ff;
  color: #2f5da4;
  font-size: 12px;
  font-weight: 700;
  outline: none;
}

.steps-head-actions .status-action-btn {
  white-space: nowrap;
  padding: 8px 12px;
}

.steps-tag {
  justify-content: center;
  min-width: 90px;
  padding: 7px 10px;
  color: #fff;
  background: linear-gradient(135deg, #2f72d8, #2353ab);
  border: 1px solid rgba(46, 106, 197, 0.3);
  font-size: 12px;
  white-space: nowrap;
}

.steps-table {
  display: grid;
  gap: 10px;
  height: 100%;
  min-height: 0;
}

.steps-row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1.7fr) minmax(90px, 0.9fr) 72px 88px;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 14px;
  font-size: 12px;
  color: #3f5f90;
}

.table-head {
  padding-top: 8px;
  padding-bottom: 8px;
  background: #edf4ff;
  color: #5f7eb2;
  font-size: 11px;
  font-weight: 700;
}

.table-body {
  border: 1px solid rgba(74, 120, 193, 0.12);
  background: #f8fbff;
}

.table-body span {
  color: #4f6f9f;
  font-weight: 600;
}

.table-body.clickable {
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.table-body.clickable:hover {
  transform: translateY(-1px);
  border-color: rgba(92, 170, 255, 0.32);
  box-shadow: 0 12px 28px rgba(7, 25, 52, 0.32);
}

.table-body.done {
  box-shadow: inset 0 0 0 1px rgba(49, 194, 132, 0.08);
}

.table-body.running {
  box-shadow: inset 0 0 0 1px rgba(255, 179, 84, 0.14);
}

.table-body.pending {
  box-shadow: inset 0 0 0 1px rgba(98, 146, 220, 0.08);
}

.step-index,
.step-title {
  font-weight: 700;
}

.step-index {
  color: #5f7eb2;
}

.step-title {
  color: #1f3f78;
}

.step-state {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  padding: 6px 12px;
  border-radius: 999px;
  font-style: normal;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.step-state.done {
  color: #0f7a54;
  background: #cfeee4;
  border: 1px solid #8fd7c0;
}

.step-state.running {
  color: #9a5c00;
  background: #f7e4c8;
  border: 1px solid #e9bf86;
}

.step-state.pending {
  color: #a13a60;
  background: #f3d4e1;
  border: 1px solid #e0a8c0;
}

.step-modal {
  width: min(760px, 100%);
}

.step-meta-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.media-preview-box {
  margin-top: 14px;
  border: 1px solid rgba(74, 120, 193, 0.16);
  border-radius: 16px;
  overflow: hidden;
  background: #edf4ff;
}

.media-preview {
  width: 100%;
  max-height: 360px;
  display: block;
  object-fit: contain;
  background: #f5f9ff;
}

.upload-tip {
  margin-top: 10px;
  color: #6d87b0;
  font-size: 12px;
}

.hidden-file-input {
  display: none;
}

@media (max-width: 1400px) {
  .status-row {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (max-width: 1200px) {
  .emergency-shell {
    grid-template-columns: 1fr;
  }

  .right-column,
  .map-panel,
  .three-viewport {
    min-height: 420px;
    height: auto;
  }

  .emergency-page {
    height: auto;
    overflow: visible;
  }

  .emergency-command-board {
    height: auto;
    min-height: auto;
  }

  .modal-summary-grid,
  .modal-form-grid {
    grid-template-columns: 1fr 1fr;
  }

  .steps-manage-head,
  .steps-manage-row {
    grid-template-columns: 44px 48px 1.2fr 1fr 0.9fr 0.9fr;
  }
}

@media (max-width: 768px) {
  .emergency-page,
  .emergency-shell,
  .map-panel,
  .three-viewport,
  .right-column {
    min-height: auto;
  }

  .status-row,
  .steps-row {
    grid-template-columns: 1fr;
  }

  .status-actions,
  .modal-head,
  .modal-footer,
  .library-tab-switch,
  .modal-summary-grid,
  .modal-form-grid {
    grid-template-columns: 1fr;
  }

  .status-actions,
  .modal-head,
  .modal-footer {
    display: grid;
  }

  .steps-manage-head,
  .steps-manage-row {
    grid-template-columns: 1fr;
  }

  .steps-manage-actions {
    flex-direction: column;
  }

  .step-meta-grid {
    grid-template-columns: 1fr;
  }

  .area-chip {
    left: 20px;
    top: 70px;
  }

  .controls-chip {
    position: static;
    margin: 14px;
    display: inline-flex;
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

