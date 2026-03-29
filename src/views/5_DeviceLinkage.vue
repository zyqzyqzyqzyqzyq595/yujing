<template>
  <div class="view-page">
    <h2 class="page-title">联动模块与设备控制</h2>

    <div class="sys-card device-list-card">
      <h3>联动设备状态</h3>
      <div class="device-grid">
        <div class="device-item online">
          <span>🔔 1号声光报警器</span><span class="status">在线</span>
          <div class="controls"><button>测试</button><button class="danger">启动</button></div>
        </div>
        <div class="device-item offline">
          <span>🎥 2号球机摄像头</span><span class="status">离线</span>
          <div class="controls"><button disabled>重启</button></div>
        </div>
        <div class="device-item online">
          <span>🚧 1号进矿闸口</span><span class="status">在线(开)</span>
          <div class="controls"><button class="danger">紧急关闭</button></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-title { margin-bottom: 20px; color: #1c3d90; }
.device-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px; }
.device-item { padding: 15px; border: 1px solid #eee; border-radius: 6px; font-size: 13px;}
.device-item .status { font-weight: bold; margin-left: 10px;}
.device-item.online { border-left: 4px solid var(--warn-green); background: #F8FFF8; }
.device-item.online .status { color: var(--warn-green); }
.device-item.offline { border-left: 4px solid #ccc; background: #F5F5F5; color: #999; }
.controls { margin-top: 10px; display: flex; gap: 5px;}
.controls button { font-size: 11px; padding: 3px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 3px; background: #fff;}
.controls button.danger { background: var(--warn-red); color: #fff; border: none;}
</style>