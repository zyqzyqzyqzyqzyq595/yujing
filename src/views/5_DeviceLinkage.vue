<template>
  <div class="view-page linkage-page">
    <LinkageCommandBoard />
  </div>
</template>

<script setup>
import LinkageCommandBoard from '../components/LinkageCommandBoard.vue';
</script>

<style scoped>
.linkage-page {
  display: flex;
  flex: 1;
  height: 100%;
  min-height: 0;
  color: #16325c;
}

.linkage-page :deep(.linkage-command-board) {
  width: 100%;
  flex: 1;
}
</style>
