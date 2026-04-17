<template>
  <div class="view-page emergency-page">
    <section class="emergency-command-board">
      <div class="emergency-layout">
        <div class="map-panel">
          <Map2D
            :command-overlay="true"
            :command-units="COMMAND_UNITS"
            :warning-zone="ORANGE_WARNING_ZONE"
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
      </div>
    </section>

    <div v-if="showPlanModal" class="modal-overlay" @click.self="closePlanModal">
      <div class="plan-library-modal">
        <div class="modal-header">
          <h3>应急预案库管理</h3>
          <button class="modal-close" @click="closePlanModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="modal-tabs">
            <button
              v-for="tab in ['steps', 'history']"
              :key="tab"
              class="modal-tab"
              :class="{ active: planLibraryTab === tab }"
              @click="planLibraryTab = tab"
            >
              {{ tab === 'steps' ? '步骤配置' : '智能预警预案' }}
            </button>
          </div>

          <div v-if="planLibraryTab === 'steps'" class="steps-config-panel">
            <div class="config-level-tabs">
              <button
                v-for="level in planLevelOptions"
                :key="level"
                class="level-tab"
                :class="{ active: editingPlanLevel === level }"
                @click="handleLevelTabClick(level)"
              >
                {{ level }}
              </button>
            </div>

            <div class="editable-steps-list">
              <div
                v-for="step in editablePlanSteps"
                :key="step.id"
                class="editable-step"
                :class="{ selected: selectedEditableStepIds.includes(step.id) }"
                @click="toggleStepSelection(step.id)"
              >
                <input type="checkbox" :checked="selectedEditableStepIds.includes(step.id)" />
                <span class="step-id">{{ step.id }}</span>
                <span class="step-title">{{ step.title }}</span>
                <span class="step-owner">{{ step.owner }}</span>
                <span class="step-deadline">{{ step.deadline }}</span>
              </div>
            </div>

            <div class="steps-config-actions">
              <button class="config-action-btn" @click="addNewStep">+ 添加步骤</button>
              <button class="config-action-btn delete" @click="deleteSelectedSteps">删除选中</button>
            </div>
          </div>

          <div v-else class="suggestion-panel">
            <div class="suggestion-header">
              <h4>预案匹配</h4>
            </div>
            <div class="suggestion-section">
              <h5>自动匹配规则</h5>
              <div class="suggestion-grid">
                <div class="suggestion-item">
                  <span class="suggestion-label">预警级别</span>
                  <span class="suggestion-value">{{ emergencyPlanSetting.planLevel }}</span>
                </div>
                <div class="suggestion-item">
                  <span class="suggestion-label">响应时限</span>
                  <span class="suggestion-value">{{ emergencyPlanSetting.responseTime }}</span>
                </div>
                <div class="suggestion-item">
                  <span class="suggestion-label">响应范围</span>
                  <span class="suggestion-value">{{ emergencyPlanSetting.responseRange }}</span>
                </div>
                <div class="suggestion-item">
                  <span class="suggestion-label">预警区内设备</span>
                  <span class="suggestion-value">挖机 {{ emergencyPlanSetting.excavatorCount }} 台、卡车 {{ emergencyPlanSetting.truckCount }} 台</span>
                </div>
              </div>
              <div class="suggestion-description">{{ emergencyPlanSetting.ruleDescription }}</div>
              <div class="suggestion-people">{{ emergencyPlanSetting.responsePeople }}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn" @click="closePlanModal">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="showStepModal" class="modal-overlay" @click.self="closeStepModal">
      <div class="step-detail-modal">
        <div class="modal-header">
          <h3>{{ stepModalMode === 'upload' ? '上传步骤素材' : `步骤 ${activeStep?.id} - ${activeStep?.title}` }}</h3>
          <button class="modal-close" @click="closeStepModal">&times;</button>
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
            class="status-action-btn primary"
            @click="triggerFileInput"
          >
            上传素材
          </button>
          <button
            v-if="stepModalMode === 'upload'"
            type="button"
            class="status-action-btn success"
            @click="completeStep"
          >
            完成步骤
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import Map2D from '../components/mep.vue';
import { getDeepModalMarkup } from '../analysis/deepAnalysisModule.js';
import { getRadarModalMarkup } from '../analysis/radarAnalysisModule.js';
import { getCrackModalMarkup } from '../analysis/crackAnalysisModule.js';
import { getFireModalMarkup } from '../analysis/fireAnalysisModule.js';
import { getWaterModalMarkup } from '../analysis/waterAnalysisModule.js';
import { getGroundModalMarkup } from '../analysis/groundAnalysisModule.js';
import { getYingliModalMarkup } from '../analysis/yingliAnalysisModule.js';
import { getVibModalMarkup } from '../analysis/vibAnalysisModule.js';
import { COMMAND_UNITS, ORANGE_WARNING_ZONE } from '../constants/commandOverlayData.js';
import '../out/deep.css';
import '../out/radar.css';
import '../out/crack.css';
import '../out/fire.css';
import '../out/water.css';
import '../out/ground.css';
import '../out/yingli.css';
import '../out/vib.css';

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

const warningSummary = {
  level: '四级',
  area: '北帮 3 号台阶至运输道路'
};

const departureTime = '16:42:18';

const warningAreaMachines = [
  { code: 'EX-07', type: '挖机', area: warningSummary.area },
  { code: 'TR-21', type: '卡车', area: warningSummary.area }
];

const commandUnits = [
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

const displayMedia = computed(() => {
  if (!activeStep.value) return null;
  return stepMediaStore.value[activeStep.value.id] || null;
});

const canOpenStepModal = (step) => {
  return step.stateClass === 'running' || step.stateClass === 'done';
};

const onPlanLevelChange = (level) => {
  activePlanLevel.value = level;
};

const launchPlan = () => {
  launched.value = !launched.value;
  if (launched.value) {
    planSteps.value.forEach((step, index) => {
      setTimeout(() => {
        step.stateClass = 'running';
        step.state = '进行中';
      }, index * 500);
    });
  }
};

const openPlanLibraryModal = () => {
  editablePlanSteps.value = [...(planStepsByLevel.value[editingPlanLevel.value] || [])];
  selectedEditableStepIds.value = [];
  showPlanModal.value = true;
};

const handleLevelTabClick = (level) => {
  editingPlanLevel.value = level;
  editablePlanSteps.value = [...(planStepsByLevel.value[level] || [])];
  selectedEditableStepIds.value = [];
};

const closePlanModal = () => {
  showPlanModal.value = false;
};

const toggleStepSelection = (stepId) => {
  const index = selectedEditableStepIds.value.indexOf(stepId);
  if (index > -1) {
    selectedEditableStepIds.value.splice(index, 1);
  } else {
    selectedEditableStepIds.value.push(stepId);
  }
};

const addNewStep = () => {
  planStepCounter.value++;
  const newStep = createPendingStep(
    String(planStepCounter.value).padStart(2, '0'),
    '新步骤',
    '未分配',
    '未设定'
  );
  editablePlanSteps.value.push(newStep);
};

const deleteSelectedSteps = () => {
  editablePlanSteps.value = editablePlanSteps.value.filter(
    (step) => !selectedEditableStepIds.value.includes(step.id)
  );
  selectedEditableStepIds.value = [];
};

const downloadHistoryPlanTable = () => {
  alert('历史应急预案导出功能');
};

const openStepModal = (step) => {
  activeStep.value = step;
  stepModalMode.value = step.stateClass === 'running' ? 'upload' : 'view';
  showStepModal.value = true;
};

const closeStepModal = () => {
  showStepModal.value = false;
  activeStep.value = null;
  pendingStepMedia.value = null;
};

const triggerFileInput = () => {
  stepFileInput.value?.click();
};

const onStepMediaSelected = (event) => {
  const file = event.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      pendingStepMedia.value = {
        url: e.target?.result,
        name: file.name,
        type: file.type.startsWith('video') ? 'video' : 'image'
      };
    };
    reader.readAsDataURL(file);
  }
};

const completeStep = () => {
  if (activeStep.value && pendingStepMedia.value) {
    stepMediaStore.value[activeStep.value.id] = pendingStepMedia.value;
    activeStep.value.stateClass = 'done';
    activeStep.value.state = '已完成';
    closeStepModal();
  } else if (!pendingStepMedia.value) {
    alert('请先上传图片或视频素材才能完成该步骤');
  }
};

onMounted(() => {
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

onUnmounted(() => {});
</script>

<style scoped>
.view-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.emergency-page {
  background: #f5f7fa;
  height: 100%;
}

.emergency-command-board {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  padding: 0;
  margin: 5px auto;
  gap: 12px;
}

.emergency-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 450px;
  gap: 12px;
  height: calc(100% - 12px);
  box-sizing: border-box;
}

.map-panel {
  height: 100%;
  min-height: 600px;
  position: relative;
  overflow: hidden;
}

.right-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  padding-bottom: 0;
}

.map-panel :deep(.map-module) {
  height: 100%;
  min-height: 100%;
}

.panel {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.panel-kicker {
  font-size: 12px;
  color: #999;
  margin: 0 0 4px 0;
}

.panel-head h3 {
  margin: 0;
  font-size: 14px;
  color: #1c3d90;
}

.status-actions {
  display: flex;
  gap: 8px;
}

.status-action-btn {
  background: #f0f3f8;
  border: 1px solid #e0e5ec;
  padding: 8px 14px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.status-action-btn:hover {
  background: #e8edf5;
}

.status-action-btn.primary {
  background: #1c3d90;
  color: #fff;
  border-color: #1c3d90;
}

.status-action-btn.success {
  background: #71C446;
  color: #fff;
  border-color: #71C446;
}

.status-table {
  padding: 12px;
}

.status-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  padding: 10px 0;
}

.status-row.status-head {
  color: #999;
  font-size: 12px;
  border-bottom: 1px solid #eee;
}

.status-row.status-body {
  font-size: 13px;
}

.warning-level-text {
  color: #ff8c69;
}

.steps-head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.plan-level-select {
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #e0e5ec;
  font-size: 12px;
}

.steps-tag {
  background: #ff8c69;
  color: #fff;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
}

.steps-table {
  padding: 12px;
}

.steps-row {
  display: grid;
  grid-template-columns: 40px 1fr 100px 60px 80px;
  gap: 12px;
  padding: 10px 0;
}

.steps-row.table-head {
  color: #999;
  font-size: 12px;
  border-bottom: 1px solid #eee;
}

.steps-row.table-body {
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.steps-row.table-body:hover {
  background: #f8f9fa;
}

.steps-row.table-body.clickable {
  cursor: pointer;
}

.step-index {
  color: #999;
}

.step-title {
  font-weight: 600;
  color: #333;
}

.step-state {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}

.step-state.pending {
  background: #fff3cd;
  color: #856404;
}

.step-state.running {
  background: #cce5ff;
  color: #004085;
}

.step-state.done {
  background: #d4edda;
  color: #155724;
}

.command-table {
  padding: 12px;
}

.command-row {
  display: grid;
  grid-template-columns: 70px 60px 1fr 60px 100px;
  gap: 12px;
  padding: 10px 0;
}

.command-row.table-head {
  color: #999;
  font-size: 12px;
  border-bottom: 1px solid #eee;
}

.command-row.table-body {
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.command-row.table-body:hover {
  background: #f8f9fa;
}

.command-row.table-body.selected {
  background: #dbeafe;
}

.unit-code {
  font-weight: 600;
  color: #1c3d90;
}

.unit-type-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
}

.unit-type-badge.人员 {
  background: #e3f2fd;
  color: #1565c0;
}

.unit-type-badge.设备 {
  background: #fff3e0;
  color: #e65100;
}

.unit-type-badge.车辆 {
  background: #e8f5e9;
  color: #2e7d32;
}

.unit-distance {
  color: #85C6F1;
  font-weight: 600;
}

.unit-status {
  font-size: 11px;
}

.summary-content {
  padding: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.summary-card {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
}

.summary-card span {
  display: block;
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}

.summary-card strong {
  font-size: 13px;
  color: #1c3d90;
}

.summary-description {
  background: #eef6ff;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  color: #1c3d90;
  margin-bottom: 12px;
}

.summary-people {
  font-size: 12px;
  color: #666;
  line-height: 1.6;
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

.plan-library-modal {
  background: #fff;
  border-radius: 8px;
  width: 800px;
  max-height: 80vh;
  overflow: hidden;
}

.step-detail-modal {
  background: #fff;
  border-radius: 8px;
  width: 700px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
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
  max-height: 60vh;
  overflow-y: auto;
}

.modal-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.modal-tab {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #e0e5ec;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
}

.modal-tab.active {
  background: #1c3d90;
  color: #fff;
  border-color: #1c3d90;
}

.config-level-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.level-tab {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #e0e5ec;
  background: #fff;
  cursor: pointer;
  font-size: 11px;
}

.level-tab.active {
  background: #1c3d90;
  color: #fff;
  border-color: #1c3d90;
}

.editable-steps-list {
  max-height: 300px;
  overflow-y: auto;
}

.editable-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.editable-step:hover {
  background: #f8f9fa;
}

.editable-step.selected {
  background: #dbeafe;
}

.editable-step input {
  margin: 0;
}

.editable-step .step-id {
  width: 30px;
  color: #999;
  font-size: 12px;
}

.editable-step .step-title {
  flex: 1;
  font-size: 12px;
}

.editable-step .step-owner,
.editable-step .step-deadline {
  width: 80px;
  font-size: 11px;
  color: #666;
}

.steps-config-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.config-action-btn {
  background: #f0f3f8;
  border: 1px solid #e0e5ec;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.config-action-btn.delete {
  background: #fff5f5;
  border-color: #ffe0e0;
  color: #d32f2f;
}

.suggestion-panel {
  padding: 10px;
}

.suggestion-header {
  margin-bottom: 15px;
}

.suggestion-header h4 {
  margin: 0;
  font-size: 14px;
  color: #1c3d90;
  font-weight: 600;
}

.suggestion-section h5 {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #333;
}

.suggestion-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.suggestion-item {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
}

.suggestion-label {
  display: block;
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}

.suggestion-value {
  font-size: 13px;
  color: #1c3d90;
  font-weight: 600;
}

.suggestion-description {
  background: #eef6ff;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  color: #1c3d90;
  margin-bottom: 12px;
  line-height: 1.6;
}

.suggestion-people {
  font-size: 12px;
  color: #666;
  line-height: 1.6;
}

.modal-footer {
  padding: 16px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
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

.modal-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.modal-summary-card {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
}

.modal-summary-card span {
  display: block;
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}

.modal-summary-card strong {
  font-size: 13px;
  color: #333;
}

.modal-summary-card.highlight strong {
  color: #1c3d90;
}

.media-preview-box {
  padding: 16px;
}

.media-preview {
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
  background: #f5f7fa;
}

.upload-tip {
  padding: 0 16px 16px;
  font-size: 12px;
  color: #666;
}

.hidden-file-input {
  display: none;
}
</style>
