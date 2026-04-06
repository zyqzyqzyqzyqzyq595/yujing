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
  flex-direction: column;
  gap: 18px;
  color: #16325c;
}

.panel {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(28, 61, 144, 0.08);
  border-radius: 20px;
  box-shadow: 0 18px 40px rgba(28, 61, 144, 0.08);
}

.panel-kicker {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6b86b4;
}

.ghost-btn {
  border: 1px solid rgba(28, 61, 144, 0.16);
  border-radius: 999px;
  padding: 10px 18px;
  font-size: 13px;
  color: #1c3d90;
  background: #f8fbff;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.ghost-btn:hover {
  transform: translateY(-1px);
}

.top-grid,
.bottom-grid {
  display: grid;
  gap: 18px;
}

.top-grid {
  grid-template-columns: 0.95fr 1.05fr;
}

.bottom-grid {
  grid-template-columns: 1.1fr 0.9fr;
}

.panel {
  padding: 20px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}

.panel-head h3 {
  margin-top: 4px;
  font-size: 20px;
  color: #17376f;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 82px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.badge.warning {
  background: #fff0df;
  color: #d9781f;
}

.badge.success {
  background: #e7f8ee;
  color: #1d8e5a;
}

.badge.neutral {
  background: #edf4ff;
  color: #4470b8;
}

.strategy-list,
.flow-steps,
.log-list {
  display: grid;
  gap: 12px;
}

.strategy-item {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fbff;
  border: 1px solid transparent;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.strategy-item.active {
  border-color: rgba(28, 100, 242, 0.24);
  box-shadow: 0 12px 24px rgba(28, 100, 242, 0.12);
  transform: translateY(-1px);
}

.strategy-icon,
.step-no {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f1ff, #d7e7ff);
  color: #1c3d90;
  font-weight: 700;
}

.strategy-item p,
.event-summary,
.device-card p,
.step-body p,
.log-item p {
  margin-top: 6px;
  line-height: 1.6;
  color: #5f728f;
  font-size: 13px;
}

.event-card {
  padding: 18px;
  border-radius: 18px;
  background:
    radial-gradient(circle at top right, rgba(33, 120, 255, 0.12), transparent 30%),
    #f7faff;
  border: 1px solid rgba(58, 103, 187, 0.08);
}

.event-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.event-tags span {
  padding: 6px 12px;
  border-radius: 999px;
  background: #fff;
  font-size: 12px;
  color: #54709b;
  border: 1px solid rgba(28, 61, 144, 0.08);
}

.event-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.event-metrics div {
  padding: 14px 16px;
  border-radius: 16px;
  background: #fff;
}

.event-metrics span,
.device-type,
.log-item span {
  font-size: 12px;
  color: #7890b1;
}

.event-metrics strong,
.device-top strong {
  display: block;
  margin-top: 8px;
  font-size: 16px;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.device-card {
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(28, 61, 144, 0.08);
  background: #f8fbff;
}

.device-card.online {
  background: linear-gradient(180deg, #f5fffa, #eefaf5);
}

.device-card.warning {
  background: linear-gradient(180deg, #fff8ef, #fff4e6);
}

.device-card.offline {
  background: linear-gradient(180deg, #f4f6f9, #eceff4);
}

.device-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.device-state {
  white-space: nowrap;
  font-size: 12px;
  font-weight: 700;
  color: #476897;
}

.device-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.device-actions button {
  border: 1px solid rgba(28, 61, 144, 0.12);
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
  color: #1c3d90;
  background: #fff;
  cursor: pointer;
}

.device-actions button.danger {
  color: #fff;
  background: #d96d3b;
  border-color: #d96d3b;
}

.flow-step {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 14px;
  align-items: start;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fbff;
}

.step-body strong {
  color: #17376f;
}

.log-item {
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fbff;
  border-left: 3px solid #79a5ea;
}

@media (max-width: 1200px) {
  .top-grid,
  .bottom-grid,
  .device-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .event-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
