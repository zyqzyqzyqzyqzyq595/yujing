<template>
  <div class="view-page">
    <h2 class="page-title">智能决策与专家库</h2>

    <div class="decision-layout">
      <div class="sys-card plan-section">
        <h3>决策建议路径</h3>
        <div class="plan-item">
          <h4>蓝色预警处置方案 (II级响应)</h4>
          <p>1. 加强对北边坡GNSS-03点的监测频率（改为10分钟/次）。</p>
          <p>2. 通知现场巡检人员前往查看是否存在表面裂缝。</p>
          <button class="exec-btn">一键下发指令</button>
        </div>
      </div>

      <div class="sys-card expert-section">
        <h3>在线边坡专家</h3>
        <div class="expert-card">
          <div class="avatar">赵</div>
          <div class="info"><h4>赵铁柱 教授</h4><p>岩土工程专家 - 中国矿大</p></div>
          <button class="call-btn">视频连线</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-title { margin-bottom: 20px; color: #1c3d90; }
.decision-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
.plan-item { margin-top: 15px; padding: 15px; background: #F8FBFF; border-radius: 4px; }
.plan-item p { font-size: 13px; color: #666; margin: 8px 0; }
.exec-btn { background: #f39c12; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-top: 10px;}
.expert-card { display: flex; align-items: center; gap: 15px; margin-top: 15px; padding: 10px; border: 1px solid #eee; border-radius: 4px;}
.avatar { width: 40px; height: 40px; background: #C3e4FD; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #1c3d90;}
.info h4 { font-size: 14px;} .info p { font-size: 12px; color: #666;}
.call-btn { margin-left: auto; background: var(--warn-green); color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;}
</style>