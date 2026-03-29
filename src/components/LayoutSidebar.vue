<template>
  <aside class="sidebar-container">
    <div class="side-nav-header">滑坡风险预警子系统</div>
    <nav class="nav-list">
      <div
        v-for="item in navItems"
        :key="item.id"
        :class="['nav-item', { active: activeId === item.id }]"
        @click="$emit('navigate', item.id)"
      >
        {{ item.name }}
      </div>
    </nav>
  </aside>
</template>

<script setup>
defineProps(['activeId']);
defineEmits(['navigate']);

const navItems = [
  { id: 'dashboard', name: '滑坡预警综合看板' },
  { id: 'workorder', name: '风险闭环管理' },
  { id: 'decision', name: '智能决策与专家库' },
  { id: 'emergency', name: '应急预案与指挥' },
  { id: 'linkage', name: '联动模块与设备控制' },
  { id: 'evaluation', name: '效能评估与报表' }
];
</script>

<style scoped>
.sidebar-container {
  width: 220px;
  background: rgba(255, 255, 255, 0.4);
  border-right: 1px solid rgba(225, 233, 241, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
}

.side-nav-header {
  padding: 16px 20px;
  font-size: 14px;
  font-weight: bold;
  color: #030303;
  margin-bottom: 8px;
}

/* 核心修改：参照 style.css 增加了 border-left 和 background */
.side-nav-header {
  padding: 12px 20px;
  font-size: 14px;
  font-weight: bold;
  color: #030303;
  border-left: 4px solid #1c3d90; /* 深蓝色左边框 */
  background: rgba(248, 251, 255, 0.3); /* 浅色半透明背景 */
  margin-bottom: 12px;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 基础样式：无图标 */
.nav-item {
  padding: 12px 24px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin: 0 12px;
  border-radius: 4px;
}

/* 悬浮样式：浅蓝背景 */
.nav-item:hover {
  background: rgba(133, 198, 241, 0.2);
  color: #1c3d90;
}

/* 选中样式：深蓝渐变高亮 + 左侧条 */
.nav-item.active {
  background: linear-gradient(to right, #C3E4FD, #D6EDFE);
  color: #1c3d90;
  font-weight: bold;
  border-left: 4px solid #1c3d90; /* 截图中的深蓝左指示条 */
  padding-left: 20px; /* 补偿边框宽度 */
}
</style>