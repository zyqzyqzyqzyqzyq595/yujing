// 1_Dashboard.js
import { defineComponent, onMounted } from 'vue';
import MapMonitor from '../../components/map.vue';
import { getDeepModalMarkup } from '../../analysis/deepAnalysisModule.js';
import { getRadarModalMarkup } from '../../analysis/radarAnalysisModule.js';
import { getCrackModalMarkup } from '../../analysis/crackAnalysisModule.js';
import { getFireModalMarkup } from '../../analysis/fireAnalysisModule.js';
import { getWaterModalMarkup } from '../../analysis/waterAnalysisModule.js';
import { getGroundModalMarkup } from '../../analysis/groundAnalysisModule.js';
import { getYingliModalMarkup } from '../../analysis/yingliAnalysisModule.js';
import { getVibModalMarkup } from '../../analysis/vibAnalysisModule.js';
import { getThresholdModalMarkup } from '../../analysis/thresholdSettingsModule.js';
import '../../out/deep.css';
import '../../out/radar.css';
import '../../out/crack.css';
import '../../out/fire.css';
import '../../out/water.css';
import '../../out/ground.css';
import '../../out/yingli.css';
import '../../out/vib.css';

export default defineComponent({
  name: 'Dashboard',
  components: { MapMonitor },
  setup() {
    onMounted(() => {
      // 1. 挂载各监测弹窗
      const deepHost = document.getElementById('deep-modal-root');
      if (deepHost) deepHost.innerHTML = getDeepModalMarkup();

      const radarHost = document.getElementById('radar-modal-root');
      if (radarHost) radarHost.innerHTML = getRadarModalMarkup();

      const crackHost = document.getElementById('crack-modal-root');
      if (crackHost) crackHost.innerHTML = getCrackModalMarkup();

      const fireHost = document.getElementById('fire-modal-root');
      if (fireHost) fireHost.innerHTML = getFireModalMarkup();

      const waterHost = document.getElementById('water-modal-root');
      if (waterHost) waterHost.innerHTML = getWaterModalMarkup();

      const groundHost = document.getElementById('ground-modal-root');
      if (groundHost) groundHost.innerHTML = getGroundModalMarkup();

      const yingliHost = document.getElementById('yingli-modal-root');
      if (yingliHost) yingliHost.innerHTML = getYingliModalMarkup();

      const vibHost = document.getElementById('vib-modal-root');
      if (vibHost) vibHost.innerHTML = getVibModalMarkup();

      // 2. 挂载预警阈值设置弹窗 HTML
      const thresholdHost = document.getElementById('threshold-modal-root');
      if (thresholdHost) thresholdHost.innerHTML = getThresholdModalMarkup();

// ✅ 替换为以下代码：无视 Vue 的 DOM 刷新，永久生效
document.addEventListener('click', (e) => {
    // 寻找被点击的元素或其父元素中，有没有这个 ID
    const targetBtn = e.target.closest('#warning-settings-btn');
    if (targetBtn) {
        if (window.thresholdModule && typeof window.thresholdModule.open === 'function') {
            window.thresholdModule.open();
        } else {
            console.warn('预警模块未正确加载');
        }
    }
});
    });

    return {};
  }
});