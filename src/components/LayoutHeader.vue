<template>
  <header class="header-comp">
    <div class="header-logo">
      <svg width="30" height="30" viewBox="0 0 100 100">
        <rect width="100" height="100" rx="20" fill="#1c3d90" />
        <path d="M30 70 L50 30 L70 70" fill="none" stroke="white" stroke-width="8" />
      </svg>
      国家电投 SPIC | 产运销一体化
    </div>
    <div class="header-right">
      <div class="header-clock">{{ currentTime }}</div>
      <div class="header-user">
        <span>🔔</span>
        <span>陈晓晓测试 ▼</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const currentTime = ref('加载时间中...');
let timer = null;

const updateClock = () => {
  const now = new Date();
  // 格式化时间为 YYYY/MM/DD HH:mm:ss
  currentTime.value = now.getFullYear() + '/' +
                      String(now.getMonth() + 1).padStart(2, '0') + '/' +
                      String(now.getDate()).padStart(2, '0') + ' ' +
                      String(now.getHours()).padStart(2, '0') + ':' +
                      String(now.getMinutes()).padStart(2, '0') + ':' +
                      String(now.getSeconds()).padStart(2, '0');
};

onMounted(() => {
  updateClock();
  timer = setInterval(updateClock, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.header-comp {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid rgba(225, 233, 241, 0.8);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 1000;
  flex-shrink: 0;
  position: relative;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: bold;
  color: #1c3d90;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 25px;
}

.header-clock {
  font-family: "Courier New", monospace;
  font-weight: bold;
  font-size: 16px;
  color: #1c3d90;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
}
</style>