<template>
  <div class="view-page">
    <h2 class="page-title">应急预案与指挥控制</h2>

    <div class="emergency-grid">
      <div class="sys-card sop-section">
        <h3>标准操作程序 (SOP)</h3>
        <ul class="sop-list">
          <li>1. 接报撤离指令：全场广播与声光报警启动（未启动）。</li>
          <li class="active">2. 人员撤离：北边坡作业人员沿B路线撤离（进行中）。</li>
          <li>3. 交通管制：封闭1号矿山公路（待执行）。</li>
        </ul>
      </div>

      <div class="sys-card resource-section">
        <h3>救援物资分布</h3>
        <p>[ 这里集成现场摄像头或物资地图 ]</p>
        <div class="map-placeholder-mini">地图区域</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-title { margin-bottom: 20px; color: #1c3d90; }
.emergency-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.sop-list { list-style: none; margin-top: 15px; }
.sop-list li { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; color: #666; }
.sop-list li.active { background: #FFF0F0; border-left: 4px solid var(--warn-red); color: var(--warn-red); font-weight: bold; }
.map-placeholder-mini { height: 200px; background: #eef3f8; border: 1px solid #eee; margin-top: 15px; display: flex; align-items: center; justify-content: center; color: #999; }
</style>