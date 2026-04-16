<template>
  <div class="layout-wrapper">
    <AppBackground />
    <LayoutHeader />
    <div class="main-body">
      <LayoutSidebar :activeId="currentPage" @navigate="handlePageChange" />
      <main class="content-viewport">
        <component :is="currentComponent" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import LayoutHeader from './components/LayoutHeader.vue';
import LayoutSidebar from './components/LayoutSidebar.vue';
import AppBackground from './components/AppBackground.vue';

// 导入 6 个滑坡预警核心模块
import Dashboard from './views/1_Dashboard/1_Dashboard.vue';
import WorkOrder from './views/2_WorkOrder/2_WorkOrder.vue';
import DecisionSupport from './views/3_DecisionSupport/3_DecisionSupport.vue';
import EmergencyPlan from './views/4_EmergencyPlan.vue';
import DeviceLinkage from './views/5_DeviceLinkage.vue';
import Evaluation from './views/6_Evaluation.vue';

const components = {
  dashboard: Dashboard,
  workorder: WorkOrder,
  decision: DecisionSupport,
  emergency: EmergencyPlan,
  linkage: DeviceLinkage,
  evaluation: Evaluation
};

const currentPage = ref('dashboard');
const currentComponent = computed(() => components[currentPage.value]);

const handlePageChange = (id) => {
  currentPage.value = id;
};
</script>

<style>
.layout-wrapper {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.main-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}
/* 修改 App.vue 的这个类 */
.content-viewport {
  flex: 1;
  height: 100%;  /* ⬅️ 新增：强制锁定高度，防止被子元素拉扯或压缩 */
  padding: 12px;
  overflow-y: hidden; /* ⬅️ 修改：大屏页面不需要全局滚动条，改为 hidden */
  background: transparent;
  display: flex;
  flex-direction: column;
}
</style>