<template>
  <div class="view-page">
    <h2 class="page-title">效能评估与报表统计</h2>

    <div class="kpi-grid">
      <div class="sys-card kpi-card">
        <h4>预警准确率</h4>
        <div class="kpi-value">98.5%</div>
        <div class="kpi-trend up">↑ 0.2%</div>
      </div>
      <div class="sys-card kpi-card">
        <h4>平均响应时间</h4>
        <div class="kpi-value">2.5 <span class="unit">分钟</span></div>
        <div class="kpi-trend down">↓ 10秒</div>
      </div>
    </div>

    <div class="sys-card report-section">
      <div class="table-header">
        <h3>月度分析报表</h3>
        <button class="add-btn">下载本月报表 (PDF)</button>
      </div>
      <p style="text-align:center; padding: 40px; color: #999;">[ 报表统计图表区域 ]</p>
    </div>
  </div>
</template>

<style scoped>
.page-title { margin-bottom: 20px; color: #1c3d90; }
.kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px; }
.kpi-card { text-align: center; }
.kpi-card h4 { font-size: 14px; color: #666; margin-bottom: 10px;}
.kpi-value { font-size: 36px; font-weight: bold; color: #1c3d90; }
.kpi-value .unit { font-size: 14px; color: #999;}
.kpi-trend { font-size: 12px;}
.kpi-trend.up { color: var(--warn-green); }
.kpi-trend.down { color: var(--warn-red); }
.report-section { padding: 0;}
.table-header { padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; }
.add-btn { background: #1c3d90; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;}
</style>