
<template>
  <div class="view-page">
    <div class="header-row">
      <div class="section-header">
        <h2 class="page-title">系统配置与效能评估</h2>
      </div>
      <div class="time-filter">
        <label>评估时间范围：</label>
        <input type="month" v-model="selectedDate" @change="fetchDashboardData" class="date-picker" />
      </div>
    </div>

    <div class="charts-container">
      <div class="chart-card">
        <div class="chart-title">一级预警 (次)</div>
        <div ref="chartLevel1" class="echart-box"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">二级预警 (次)</div>
        <div ref="chartLevel2" class="echart-box"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">三级预警 (次)</div>
        <div ref="chartLevel3" class="echart-box"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">四级预警 (次)</div>
        <div ref="chartLevel4" class="echart-box"></div>
      </div>
      <div class="chart-card focus-card">
        <div class="chart-title">关注矿区重点风险区域</div>
        <div ref="chartFocusArea" class="echart-box"></div>
      </div>
    </div>

    <div class="kpi-container">
      <div class="kpi-card">
        <div class="kpi-top">
          <div
              class="kpi-header"
              title="【数据来源】由现场人工巡查或突发上报后，管理员事后手动补录。&#10;【评价标准】安全性底线（高压线），该指标应无限趋近于0%。若偏高需立即排查监测盲区或设备掉线情况。"
          >
            漏报率
          </div>
          <div class="kpi-actions">
            <button class="mini-action-btn" type="button" @click="openMissEventDialog">事件录入</button>
            <button class="mini-action-btn" type="button" @click="downloadMissEvents">事件下载</button>
          </div>
        </div>
        <div class="kpi-value warning-text">{{ kpiData.missRate }}%</div>
        <div class="kpi-desc">实际发生但未触发预警的事件比例</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-top">
          <div
              class="kpi-header"
              title="【评价标准】精准性指标。5.6%属可接受范围。若过高会导致现场人员产生‘狼来了’的麻痹心理。建议持续优化算法或多源数据融合以剔除环境干扰。"
          >
            误报率
          </div>
          <div class="kpi-actions">
            <button class="mini-action-btn" type="button" @click="downloadFalseEvents">事件下载</button>
          </div>
        </div>
        <div class="kpi-value warning-text">{{ kpiData.falseRate }}%</div>
        <div class="kpi-desc">预警触发但未形成有效险情的比例</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">成功率</div>
        <div class="kpi-value success-text">{{ kpiData.successRate }}%</div>
        <div class="kpi-desc">预警触发且现场有对应的宏观现象</div>
      </div>

      <div class="kpi-card" title="【评价标准】管理效能与执行力指标。3.2h在大型矿山中表现良好。若想进一步压缩时长，可结合左侧“闭环处置效率”列表，对标记为“可优化”的环节进行定向提效。">
        <div class="kpi-header">平均闭环处置时间</div>
        <div class="kpi-value info-text">{{ kpiData.avgCloseTime }} <span class="unit">h</span></div>
        <div class="kpi-desc">预警发出到隐患关闭的平均时长</div>
      </div>
    </div>

    <div class="subtitle-bar">漏报以及误报率针对一级、二级预警</div>

    <div class="bottom-container">
      <div class="panel-card half-width">
        <div class="panel-header">
          <div class="panel-title">闭环处置效率</div>
          <div class="panel-action">
            <select v-model="selectedAlertLevel" @change="updateDisposalData" class="level-select">
              <option value="1">一级预警</option>
              <option value="2">二级预警</option>
              <option value="3">三级预警</option>
              <option value="4">四级预警</option>
            </select>
          </div>
        </div>
        <div class="panel-subtitle">关注预警发出、任务下达、现场反馈和隐患关闭全过程。</div>

        <div class="process-list">
          <div class="process-list-header">
            <span class="step-name-hd">环节</span>
            <span class="step-time-hd">平均时长</span>
            <span class="step-status-hd">状态</span>
          </div>

          <div class="process-item" v-for="(item, index) in currentDisposalData" :key="index">
            <span class="step-name">{{ item.step }}</span>
            <span class="step-time">{{ item.time }}</span>
            <span class="step-status" :class="item.statusType">{{ item.status }}</span>
          </div>
        </div>
      </div>

      <div class="panel-card half-width">
        <div class="panel-header">
          <div class="panel-title">多维度评估分析 <span style="font-size: 13px; font-weight: normal; color: #666; margin-left: 5px;">(各区域成功率)</span></div>
          <div class="panel-subtitle" style="margin-left: auto;">支持按照时间、区域等维度查看系统运行表现。</div>
        </div>

        <div class="progress-list">
          <div class="progress-item" v-for="(item, index) in regionSuccessRates" :key="index">
            <span class="region-name">{{ item.region }}</span>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" :style="{ width: item.rate + '%' }"></div>
            </div>
            <span class="region-rate">{{ item.rate }}%</span>
          </div>
        </div>

        <div class="conclusion-box">
          <div class="conclusion-header">
            <span>识别结论</span>
            <span class="tag">南帮偏弱</span>
          </div>
          <div class="conclusion-text">
            南帮区域误报率持续偏高，建议优先复核背景样本范围与扰动数据筛除规则。
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-if="showMissEventDialog" class="dialog-mask" @click.self="closeMissEventDialog">
    <div class="dialog-card">
      <div class="dialog-header">
        <span>漏报事件录入</span>
        <button class="dialog-close" @click="closeMissEventDialog">×</button>
      </div>

      <div class="dialog-body">
        <div class="form-grid">
          <div class="form-item">
            <label>时间</label>
            <input type="datetime-local" v-model="missEventForm.time" class="form-input" />
          </div>

          <div class="form-item">
            <label>区域</label>
            <select v-model="missEventForm.region" class="form-input">
              <option value="">请选择区域</option>
              <option v-for="item in regionOptions" :key="item" :value="item">{{ item }}</option>
            </select>
          </div>

          <div class="form-item full-width">
            <label>位置</label>
            <input
                type="text"
                v-model="missEventForm.position"
                class="form-input"
                placeholder="如：+862水平，靠近岩破附近"
            />
          </div>

          <div class="form-item">
            <label>录入人</label>
            <input type="text" v-model="missEventForm.recorder" class="form-input" placeholder="请输入录入人" />
          </div>

          <div class="form-item full-width">
            <label>事件描述</label>
            <textarea
                v-model="missEventForm.description"
                class="form-textarea"
                rows="4"
                placeholder="请输入事件描述"
            ></textarea>
          </div>

          <div class="form-item full-width">
            <label>现场照片</label>
            <input type="file" accept="image/*" @change="handleMissPhotoChange" class="form-input" />
            <div v-if="missEventForm.photoName" class="file-name">已选择：{{ missEventForm.photoName }}</div>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="footer-btn default-btn" @click="closeMissEventDialog">取消</button>
        <button class="footer-btn primary-btn" @click="submitMissEvent">保存录入</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts';

// 基础分类常量
const equipmentTypes = ['GNSS', '深部位移', '雷达', '地质', '裂缝', '煤自燃', '降雨', '地下水', '应力', '震动', '遥感'];
const regionTypes = ['北帮', '东帮', '南帮', '西帮', '中央区域'];

// DOM 引用
const chartLevel1 = ref(null);
const chartLevel2 = ref(null);
const chartLevel3 = ref(null);
const chartLevel4 = ref(null);
const chartFocusArea = ref(null);

// 状态变量
const selectedDate = ref('2026-04'); // 默认选中时间
const selectedAlertLevel = ref('1'); // 默认选中一级预警图表
let chartInstances = [];

// 右下角：区域成功率数据 (初始数据计算均值为 87.3)
const regionSuccessRates = ref([
  { region: '东帮', rate: 88 },
  { region: '南帮', rate: 81 },
  { region: '北排土场', rate: 93 }
]);

// KPI 数据源 (成功率与多维度评估分析数据初始对齐)
const kpiData = ref({
  totalAlerts: 128,
  handledAlerts: 121,
  avgResponseTime: 18,
  falseRate: 5.6,
  missRate: 2.1,
  closedLoopRate: 94.5,
  successRate: 87.3,
  avgCloseTime: 3.2
});
const missEventList = ref([
  {
    time: '2026-04-15 08:30',
    region: '南帮',
    position: '+862水平，靠近岩破附近',
    recorder: '张三',
    description: '现场巡查发现有明显裂隙扩展，但系统未触发预警。',
    photoName: '现场照片1.jpg'
  }
]);
const actualEventTotal = ref(20);
const updateMissRate = () => {
  const total = Number(actualEventTotal.value) || 0;
  const missCount = missEventList.value.length;

  if (total <= 0) {
    kpiData.value.missRate = 0;
    return;
  }

  const rate = (missCount / total) * 100;
  kpiData.value.missRate = Number(rate.toFixed(1));
};
// 左下角：各环节闭环时间模拟数据库
const allDisposalData = {
  '1': [
    { step: '预警推送', time: '1.8 min', status: '正常', statusType: 'success' },
    { step: '调度确认', time: '6.5 min', status: '可优化', statusType: 'warning' },
    { step: '现场响应', time: '12.4 min', status: '波动较大', statusType: 'danger' },
    { step: '隐患关闭', time: '3.2 h', status: '持续跟踪', statusType: 'info' }
  ],
  '2': [
    { step: '预警推送', time: '2.5 min', status: '正常', statusType: 'success' },
    { step: '调度确认', time: '10.0 min', status: '正常', statusType: 'success' },
    { step: '现场响应', time: '20.5 min', status: '可优化', statusType: 'warning' },
    { step: '隐患关闭', time: '5.5 h', status: '正常', statusType: 'success' }
  ],
  '3': [
    { step: '预警推送', time: '5.0 min', status: '正常', statusType: 'success' },
    { step: '调度确认', time: '15.0 min', status: '正常', statusType: 'success' },
    { step: '现场响应', time: '30.0 min', status: '正常', statusType: 'success' },
    { step: '隐患关闭', time: '12.0 h', status: '正常', statusType: 'success' }
  ],
  '4': [
    { step: '预警推送', time: '10.0 min', status: '正常', statusType: 'success' },
    { step: '调度确认', time: '30.0 min', status: '正常', statusType: 'success' },
    { step: '现场响应', time: '2.0 h', status: '正常', statusType: 'success' },
    { step: '隐患关闭', time: '24.0 h', status: '正常', statusType: 'success' }
  ]
};
const currentDisposalData = ref(allDisposalData['1']);
const regionOptions = ['北帮', '东帮', '南帮', '西帮', '中央区域', '北排土场'];

const showMissEventDialog = ref(false);

function createEmptyMissEvent() {
  return {
    time: '',
    region: '',
    position: '',
    recorder: '',
    description: '',
    photoName: '',
    photoFile: null
  };
}

const missEventForm = ref(createEmptyMissEvent());



const falseEventList = ref([
  {
    time: '2026-04-12 10:20',
    region: '东帮',
    position: '+850平台西侧',
    recorder: '李四',
    description: '系统触发预警，现场复核后未发现异常，判定为误报。',
    photoName: '误报复核1.jpg'
  },
  {
    time: '2026-04-14 14:05',
    region: '北排土场',
    position: '排土场北侧边坡',
    recorder: '王五',
    description: '监测波动引发预警，现场核查无险情。',
    photoName: '误报复核2.jpg'
  }
]);
const openMissEventDialog = () => {
  missEventForm.value = createEmptyMissEvent();
  showMissEventDialog.value = true;
};

const closeMissEventDialog = () => {
  showMissEventDialog.value = false;
};
const handleMissPhotoChange = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  missEventForm.value.photoFile = file;
  missEventForm.value.photoName = file.name;
};
const submitMissEvent = () => {
  const { time, region, position, recorder, description, photoName } = missEventForm.value;

  if (!time || !region || !position || !recorder || !description) {
    window.alert('请先把时间、区域、位置、录入人、事件描述填写完整');
    return;
  }

  missEventList.value.unshift({
    time: formatDateTime(time),
    region,
    position,
    recorder,
    description,
    photoName: photoName || '未上传'
  });

  updateMissRate();

  closeMissEventDialog();
  window.alert('漏报事件录入成功，漏报率已自动更新');
};
const formatDateTime = (value) => {
  if (!value) return '';
  return value.replace('T', ' ');
};
const downloadMissEvents = () => {
  exportEventsToExcel('漏报事件台账', missEventList.value);
};

const downloadFalseEvents = () => {
  exportEventsToExcel('误报事件台账', falseEventList.value);
};
const exportEventsToExcel = (sheetName, rows) => {
  const headers = ['时间', '区域', '位置', '录入人', '事件描述', '现场照片'];

  const htmlRows = rows.map(item => `
    <tr>
      <td>${escapeHtml(item.time || '')}</td>
      <td>${escapeHtml(item.region || '')}</td>
      <td>${escapeHtml(item.position || '')}</td>
      <td>${escapeHtml(item.recorder || '')}</td>
      <td>${escapeHtml(item.description || '')}</td>
      <td>${escapeHtml(item.photoName || '')}</td>
    </tr>
  `).join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${sheetName}</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <table border="1">
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          ${htmlRows}
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${sheetName}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
const escapeHtml = (value) => {
  return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
};

// 核心：生成饼图数据 (模拟)
const generatePieData = (names) => {
  return names.map(name => ({
    name,
    value: Math.floor(Math.random() * 50) + 1
  }));
};

// 渲染单个 ECharts 环形图 (适配亮色主题风格)
const initDonutChart = (domRef, color, data, name) => {
  const chart = echarts.init(domRef.value);
  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#dcdfe6',
      textStyle: { color: '#333' }
    },
    color: [color, '#f0f2f5', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#8195c0', '#92a9db', '#a4bdf5', '#b6d2ff', '#c8e6ff'],
    series: [
      {
        name: name,
        type: 'pie',
        radius: ['55%', '80%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderColor: '#ffffff',
          borderWidth: 2
        },
        label: { show: false },
        data: data.sort((a,b) => b.value - a.value)
      }
    ]
  };
  chart.setOption(option);
  chartInstances.push(chart);
};

// 初始化所有图表
const initAllCharts = () => {
  chartInstances.forEach(chart => chart.dispose());
  chartInstances = [];

  initDonutChart(chartLevel1, '#f5222d', generatePieData(equipmentTypes), '一级预警'); // 红
  initDonutChart(chartLevel2, '#fa8c16', generatePieData(equipmentTypes), '二级预警'); // 橙
  initDonutChart(chartLevel3, '#faad14', generatePieData(equipmentTypes), '三级预警'); // 黄
  initDonutChart(chartLevel4, '#1890ff', generatePieData(equipmentTypes), '四级预警'); // 蓝
  initDonutChart(chartFocusArea, '#333333', generatePieData(regionTypes), '风险区域'); // 黑
};

// 触发数据更新(时间筛选改变时)
const fetchDashboardData = () => {
  const newRegionRates = [
    { region: '东帮', rate: Math.floor(75 + Math.random() * 20) },
    { region: '南帮', rate: Math.floor(75 + Math.random() * 20) },
    { region: '北排土场', rate: Math.floor(75 + Math.random() * 20) }
  ];

  regionSuccessRates.value = newRegionRates;

  const avgSuccess = Number(
      (
          newRegionRates.reduce((sum, item) => sum + item.rate, 0) / newRegionRates.length
      ).toFixed(1)
  );

  kpiData.value.falseRate = Number((Math.random() * 10).toFixed(1));
  kpiData.value.successRate = avgSuccess;
  kpiData.value.avgCloseTime = Number((2 + Math.random() * 5).toFixed(1));

  updateMissRate();

  nextTick(() => {
    initAllCharts();
  });
};

// 触发处置效果下拉切换
const updateDisposalData = () => {
  currentDisposalData.value = allDisposalData[selectedAlertLevel.value];
};

const handleResize = () => {
  chartInstances.forEach(chart => chart.resize());
};

onMounted(() => {
  updateMissRate();
  initAllCharts();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstances.forEach(chart => chart.dispose());
});
</script>

<style scoped>
.view-page {
  background-color: #f0f2f5;
  color: #333;
  padding: 15px 20px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  gap: 15px;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.section-header {
  display: flex;
  align-items: center;
}
.page-title {
  margin: 0;
  font-size: 18px;
  color: #1c3d90;
  font-weight: bold;
  border-left: 4px solid #1c3d90;
  padding-left: 10px;
  line-height: 1;
}
.time-filter {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #333;
  font-weight: bold;
}
.date-picker {
  background: #fff;
  border: 1px solid #dcdfe6;
  color: #333;
  padding: 6px 12px;
  border-radius: 4px;
  outline: none;
  margin-left: 10px;
  font-family: inherit;
  transition: border-color 0.3s;
}
.date-picker:focus {
  border-color: #1c3d90;
}

.charts-container {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  height: 160px;
  flex-shrink: 0;
}
.chart-card {
  flex: 1;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.chart-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px 0 rgba(0,0,0,0.1);
}
.focus-card {
  border: 2px solid #1c3d90;
}
.chart-title {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
  text-align: center;
}
.echart-box {
  width: 100%;
  flex: 1;
  min-height: 0;
}

.kpi-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  height: 100px;
  flex-shrink: 0;
}
.kpi-card {
  background: linear-gradient(145deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 15px 20px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.kpi-header {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
  font-weight: bold;
}
.kpi-value {
  font-size: 26px;
  font-weight: bold;
  margin-bottom: 2px;
  font-family: Arial, sans-serif;
}
.warning-text { color: #f5222d; }
.success-text { color: #52c41a; }
.info-text { color: #1c3d90; }
.kpi-value .unit { font-size: 14px; font-weight: normal; color: #666;}
.kpi-desc {
  font-size: 12px;
  color: #999;
}

.subtitle-bar {
  font-size: 12px;
  color: #666;
  padding-left: 5px;
  flex-shrink: 0;
  margin: 0;
}

.bottom-container {
  display: flex;
  gap: 15px;
  flex: 1;
  min-height: 0;
}
.panel-card {
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 15px 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
  overflow: hidden;
}
.half-width {
  flex: 1;
  width: 50%;
}
.panel-header {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  flex-shrink: 0;
}
.panel-title {
  font-size: 15px;
  font-weight: bold;
  color: #1c3d90;
  border-left: 4px solid #1c3d90;
  padding-left: 8px;
  margin-right: 15px;
  line-height: 1;
}
.panel-subtitle {
  font-size: 12px;
  color: #666;
  margin-bottom: 15px;
  flex-shrink: 0;
}

.level-select {
  background: #fff;
  border: 1px solid #dcdfe6;
  color: #1c3d90;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  outline: none;
  cursor: pointer;
  transition: border 0.3s;
}
.level-select:focus {
  border-color: #1c3d90;
}

.process-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

/* ================== 新增：闭环处置表头样式 ================== */
.process-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 6px;
  border-bottom: 2px solid #ebeef5; /* 表头边框稍微加粗以便区分 */
  margin-bottom: 2px;
}
.step-name-hd { width: 30%; color: #999; font-size: 12px; font-weight: normal; }
.step-time-hd { width: 40%; color: #999; font-size: 12px; font-weight: normal; text-align: center; }
.step-status-hd { width: 30%; color: #999; font-size: 12px; font-weight: normal; text-align: right; }
/* ========================================================= */

.process-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px dashed #ebeef5;
  padding-bottom: 8px;
}
.step-name { width: 30%; color: #666; font-size: 13px; font-weight: bold; }
.step-time { width: 40%; color: #333; font-size: 13px; text-align: center; font-weight: bold; }
.step-status {
  width: 30%;
  text-align: right;
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 12px;
  display: inline-block;
  border: 1px solid transparent;
  font-weight: bold;
}
.success { color: #52c41a; background: #f6ffed; border-color: #b7eb8f; }
.warning { color: #fa8c16; background: #fff7e6; border-color: #ffd591; }
.danger  { color: #f5222d; background: #fff1f0; border-color: #ffa39e; }
.info    { color: #1890ff; background: #e6f7ff; border-color: #91d5ff; }

.progress-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 15px;
  flex: 1;
}
.progress-item {
  display: flex;
  align-items: center;
}
.region-name {
  width: 60px;
  font-size: 13px;
  color: #666;
  font-weight: bold;
}
.progress-bar-bg {
  flex: 1;
  height: 8px;
  background: #ebeef5;
  border-radius: 4px;
  margin: 0 15px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #85C6F1 0%, #1c3d90 100%);
  border-radius: 4px;
  transition: width 0.8s ease-in-out;
}
.region-rate {
  width: 40px;
  text-align: right;
  font-size: 13px;
  color: #333;
  font-weight: bold;
}

.conclusion-box {
  background: #f8fbfd;
  border: 1px dashed #85C6F1;
  border-radius: 6px;
  padding: 12px 15px;
  flex-shrink: 0;
}
.conclusion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: bold;
  color: #1c3d90;
}
.conclusion-header .tag {
  background: #fff7e6;
  color: #fa8c16;
  border: 1px solid #ffd591;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
}
.conclusion-text {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}
.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.kpi-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mini-action-btn {
  border: 1px solid #c7d6f5;
  background: #f5f9ff;
  color: #1c3d90;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  cursor: pointer;
  line-height: 18px;
}

.mini-action-btn:hover {
  background: #e8f1ff;
}
.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.dialog-card {
  width: 720px;
  max-width: calc(100vw - 40px);
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
  font-size: 16px;
  font-weight: bold;
  color: #1c3d90;
}

.dialog-close {
  border: none;
  background: transparent;
  font-size: 24px;
  color: #999;
  cursor: pointer;
}

.dialog-body {
  padding: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item label {
  font-size: 13px;
  color: #555;
  font-weight: bold;
}

.full-width {
  grid-column: 1 / -1;
}

.form-input,
.form-textarea {
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 13px;
  box-sizing: border-box;
  outline: none;
}

.form-input:focus,
.form-textarea:focus {
  border-color: #1c3d90;
}

.file-name {
  font-size: 12px;
  color: #666;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px 18px;
  border-top: 1px solid #ebeef5;
}

.footer-btn {
  min-width: 88px;
  height: 34px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  border: 1px solid transparent;
}

.default-btn {
  background: #fff;
  border-color: #dcdfe6;
  color: #666;
}

.primary-btn {
  background: #1c3d90;
  color: #fff;
}
</style>
```