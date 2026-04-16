没问题！针对您的两个具体需求，我做了以下精准改进：

1. **新增表头**：在左下角“闭环处置效率”列表中，增加了“环节”、“平均时长”、“状态”这三个表头，并且严格对齐了下方的数据列。
2. **成功率数据联动**：将右下角的标题明确标注为“(各区域成功率)”，同时**在底层逻辑中将这几个区域的成功率平均值直接与中部 KPI 卡片的“成功率”绑定**。现在无论是初始加载还是您切换时间范围，系统都会先计算区域成功率，然后算出准确的平均成功率赋予 KPI，确保数据完全对应、符合逻辑。

没有修改任何其他功能和布局结构，依旧保持严格单屏无滚动条。以下是最终的完整代码：

```vue
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
      <div class="kpi-card" title="【数据来源】系统无法自动感知漏报，由现场人工巡查或突发上报后，管理员事后手动补录。&#10;【评价标准】安全性底线（高压线），该指标应无限趋近于0%。若偏高需立即排查监测盲区或设备掉线情况。">
        <div class="kpi-header">漏报率</div>
        <div class="kpi-value warning-text">{{ kpiData.missRate }}%</div>
        <div class="kpi-desc">实际发生但未触发预警的事件比例</div>
      </div>

      <div class="kpi-card" title="【评价标准】精准性指标。5.6%属可接受范围。若过高会导致现场人员产生“狼来了”的麻痹心理。建议持续优化算法或多源数据融合以剔除环境干扰。">
        <div class="kpi-header">误报率</div>
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
  missRate: 2.8,
  falseRate: 5.6,
  successRate: 87.3,
  avgCloseTime: 3.2
});

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
  // 1. 模拟生成新的区域成功率
  const newRegionRates = [
    { region: '东帮', rate: Math.floor(75 + Math.random() * 20) },
    { region: '南帮', rate: Math.floor(75 + Math.random() * 20) },
    { region: '北排土场', rate: Math.floor(75 + Math.random() * 20) }
  ];
  regionSuccessRates.value = newRegionRates;

  // 2. 根据各区域成功率，计算出对应的平均成功率
  const avgSuccess = (newRegionRates.reduce((sum, item) => sum + item.rate, 0) / newRegionRates.length).toFixed(1);

  // 3. 更新 KPI 数据（成功率保持对应）
  kpiData.value = {
    missRate: (Math.random() * 5).toFixed(1),
    falseRate: (Math.random() * 10).toFixed(1),
    successRate: avgSuccess,
    avgCloseTime: (2 + Math.random() * 5).toFixed(1)
  };

  nextTick(() => {
    initAllCharts();
  });
};

// 触发处置效果下拉切换
const updateDisposalData = () => {
  currentDisposalData.value = allDisposalData[selectedAlertLevel.value];
};

// 生命周期钩子
onMounted(() => {
  initAllCharts();
  window.addEventListener('resize', () => {
    chartInstances.forEach(chart => chart.resize());
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', () => {
    chartInstances.forEach(chart => chart.resize());
  });
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
</style>
```