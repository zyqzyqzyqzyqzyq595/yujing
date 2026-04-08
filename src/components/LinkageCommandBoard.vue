<template>
  <section class="panel linkage-command-board">
    <div class="linkage-command-layout">
      <div class="map-board">
        <div ref="threeContainer" class="three-viewport"></div>
        <div class="map-overlay warning-chip">橙色预警</div>
        <div class="map-overlay controls-chip">左键平移 / 按住 Ctrl+左键旋转 / 滚轮缩放</div>
      </div>

      <div class="board-sidebar">
        <div class="sidebar-summary">
          <div class="summary-card">
            <span>预警区域</span>
            <strong>北帮 3 号台阶至运输道路</strong>
          </div>
          <div class="summary-card">
            <span>在途对象</span>
            <strong>7 人员 / 3 车辆 / 2 设备</strong>
          </div>
        </div>

        <div class="board-list">
          <div class="board-table table-head board-table-linkage">
            <span>预警等级</span>
            <span>预警区域</span>
            <span>人员、车辆编号</span>
            <span>距离</span>
            <span>响应状态</span>
          </div>
          <div
            v-for="item in sortedCommandUnits"
            :key="item.code"
            class="board-table board-table-linkage table-row"
            :class="{ selected: selectedUnitCode === item.code }"
            @click="focusUnit(item.code)"
          >
            <div class="unit-cell">
              <strong>{{ item.level }}</strong>
            </div>
            <div class="unit-cell">
              <strong>{{ item.area }}</strong>
            </div>
            <div class="unit-cell">
              <strong>{{ item.code }}</strong>
            </div>
            <div class="unit-cell">
              <strong>{{ item.distance }}</strong>
            </div>
            <div class="unit-cell">
              <span class="response-pill" :class="item.response === 'responded' ? 'responded' : 'pending'">
                {{ item.response === 'responded' ? '已响应' : '未响应' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="linkage-control-strip">
      <div class="control-metrics">
        <div v-for="item in controlMetrics" :key="item.label" class="control-metric-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
      <div class="control-note-card">
        <strong>联动模块与设备控制</strong>
        <span>无人驾驶调度、广播门禁、视频轮巡和采掘设备控制已形成联动链路，当前优先限制高风险区域通行并保留应急通道。</span>
      </div>
    </div>

    <div class="control-action-strip">
      <div v-for="item in controlActions" :key="item.title" class="control-action-card">
        <div class="control-action-top">
          <strong>{{ item.title }}</strong>
          <span class="response-pill" :class="item.stateClass">{{ item.state }}</span>
        </div>
        <p>{{ item.detail }}</p>
      </div>
    </div>

    <div class="control-feedback-strip">
      <div v-for="item in controlFeedback" :key="item.label" class="control-feedback-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const threeContainer = ref(null);
const selectedUnitCode = ref('P-31');

let renderer;
let scene;
let camera;
let controls;
let animationId;
let pointSprites = new Map();

const commandUnits = [
  { code: 'P-31', level: '橙色', area: '北帮 3 号台阶', position: '现场管控线', status: '值守中', distance: '64 m', response: 'responded' },
  { code: 'P-07', level: '橙色', area: '北帮 3 号台阶', position: '撤离路线 A', status: '撤离中', distance: '85 m', response: 'responded' },
  { code: 'EX-07', level: '橙色', area: '作业面边坡', position: '设备撤离路线', status: '待停机', distance: '96 m', response: 'pending' },
  { code: 'P-23', level: '橙色', area: '北帮作业面', position: '撤离路线一段', status: '撤离中', distance: '108 m', response: 'responded' },
  { code: 'P-12', level: '橙色', area: '运输道路东侧', position: '撤离路线 B', status: '已确认', distance: '132 m', response: 'pending' }
];

const sortedCommandUnits = computed(() =>
  [...commandUnits].sort((a, b) => Number.parseFloat(a.distance) - Number.parseFloat(b.distance))
);

const controlMetrics = computed(() => {
  const respondedCount = commandUnits.filter((item) => item.response === 'responded').length;
  const pendingCount = commandUnits.filter((item) => item.response === 'pending').length;

  return [
    { label: '已联动模块', value: '4 项' },
    { label: '设备控制对象', value: '3 台' },
    { label: '已响应目标', value: `${respondedCount} 个` },
    { label: '待确认回执', value: `${pendingCount} 个` }
  ];
});

const controlActions = [
  {
    title: '道路通行控制',
    state: '已切换',
    stateClass: 'responded',
    detail: '北帮运输道路已进入限制通行模式，社会车辆与作业车辆分流。'
  },
  {
    title: '采掘设备避让',
    state: '执行中',
    stateClass: 'pending',
    detail: 'EX-07 已收到避让指令，沿设备撤离路线退出高风险边界。'
  },
  {
    title: '广播与门禁',
    state: '已联动',
    stateClass: 'responded',
    detail: '广播模板切换为橙色预警通告，1 号卡口保持只出不进。'
  }
];

const controlFeedback = [
  { label: '接口回执时间', value: '16:42:18' },
  { label: '最近联动车辆', value: 'T-05 / T-11' },
  { label: '最近控制设备', value: 'EX-07' },
  { label: '视频轮巡状态', value: '高风险区域锁定' }
];

const mapUnits = [
  { code: 'P-31', type: 'person', color: '#67d7ff', x: 30, z: 19, blink: true },
  { code: 'P-07', type: 'person', color: '#67d7ff', x: 32, z: 31, blink: true },
  { code: 'P-12', type: 'person', color: '#67d7ff', x: 20, z: 20 },
  { code: 'P-23', type: 'person', color: '#67d7ff', x: 26, z: 26 },
  { code: 'EX-07', type: 'equipment', color: '#ff8c69', x: 16, z: 34 },
  { code: 'T-05', type: 'vehicle', color: '#ffd166', x: 43, z: 16 },
  { code: 'T-11', type: 'vehicle', color: '#ffd166', x: 56, z: 2 },
  { code: 'EQ-14', type: 'equipment', color: '#79e2b0', x: -34, z: -38 },
  { code: 'P-19', type: 'person', color: '#79e2b0', x: 9, z: 10 },
  { code: 'T-22', type: 'vehicle', color: '#79e2b0', x: -56, z: -8 }
];

const mapRoutes = [
  {
    label: '人员撤离路线',
    color: '#59d8ff',
    points: [[32, 31], [22, 24], [10, 18], [-2, 12]],
    labelAt: [-1, 14]
  },
  {
    label: '车辆绕行路线',
    color: '#ffd166',
    points: [[43, 16], [56, 14], [66, 8], [76, -2]],
    labelAt: [60, 12]
  },
  {
    label: '设备撤离路线',
    color: '#ff8c69',
    points: [[16, 34], [10, 42], [2, 48], [-8, 54]],
    labelAt: [3, 46]
  }
];

const getTerrainHeight = (x, z) => Math.sin(x / 10) * Math.cos(z / 10) * 8;

const focusUnit = (code) => {
  selectedUnitCode.value = code;
  const unit = mapUnits.find((item) => item.code === code);
  if (unit && controls) {
    controls.target.set(unit.x, getTerrainHeight(unit.x, unit.z), unit.z);
    camera.position.set(unit.x + 14, 86, unit.z + 12);
  }
  updateSelectionVisuals();
};

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }

  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
};

const createSpotTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 120);
  gradient.addColorStop(0, 'rgba(255,255,255,0.4)');
  gradient.addColorStop(0.8, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0.1)');
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
};

const createMapMarkerTexture = (type, color, code) => {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = 256 * scale;
  canvas.height = 256 * scale;
  const ctx = canvas.getContext('2d');

  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 16 * scale;
  ctx.shadowOffsetY = 4 * scale;

  if (type === 'person') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(128 * scale, 78 * scale, 22 * scale, 0, Math.PI * 2);
    ctx.fill();
    drawRoundedRect(ctx, 92 * scale, 106 * scale, 72 * scale, 92 * scale, 26 * scale);
    ctx.fill();
  } else if (type === 'vehicle') {
    ctx.fillStyle = color;
    drawRoundedRect(ctx, 58 * scale, 104 * scale, 140 * scale, 60 * scale, 18 * scale);
    ctx.fill();
    ctx.fillRect(86 * scale, 80 * scale, 72 * scale, 34 * scale);
    ctx.clearRect(96 * scale, 88 * scale, 20 * scale, 16 * scale);
    ctx.clearRect(124 * scale, 88 * scale, 24 * scale, 16 * scale);
    ctx.fillStyle = '#12304f';
    ctx.beginPath();
    ctx.arc(92 * scale, 170 * scale, 18 * scale, 0, Math.PI * 2);
    ctx.arc(166 * scale, 170 * scale, 18 * scale, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(74 * scale, 120 * scale, 108 * scale, 42 * scale);
    ctx.fillRect(100 * scale, 88 * scale, 44 * scale, 34 * scale);
    ctx.beginPath();
    ctx.moveTo(144 * scale, 102 * scale);
    ctx.lineTo(186 * scale, 72 * scale);
    ctx.lineWidth = 16 * scale;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(82 * scale, 172 * scale, 16 * scale, 0, Math.PI * 2);
    ctx.arc(176 * scale, 172 * scale, 16 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#10233a';
  ctx.font = `bold ${18 * scale}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(code, 128 * scale, 226 * scale);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
};

const createTextLabelTexture = (text, color) => {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(11, 29, 49, 0.82)';
  drawRoundedRect(ctx, 16, 26, 352, 54, 24);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#eef7ff';
  ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 192, 54);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
};

const createTerrainZone = (centerX, centerZ, colorHex, spotTexture) => {
  const geometry = new THREE.PlaneGeometry(60, 60, 64, 64);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i) + centerX;
    const vz = pos.getZ(i) + centerZ;
    const vy = Math.sin(vx / 10) * Math.cos(vz / 10) * 8;
    pos.setY(i, vy - 0.5);
  }

  geometry.translate(centerX, 0, centerZ);
  geometry.computeVertexNormals();

  const material = new THREE.MeshBasicMaterial({
    color: colorHex,
    map: spotTexture,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    opacity: 0.8
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;
  return mesh;
};

const updateSelectionVisuals = () => {
  pointSprites.forEach((sprite, code) => {
    sprite.material.opacity = selectedUnitCode.value === code ? 1 : 0.92;
  });
};

const initMap = () => {
  if (!threeContainer.value) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1a2a);

  const width = threeContainer.value.clientWidth;
  const height = threeContainer.value.clientHeight;

  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(12, 86, 26);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  renderer.domElement.style.display = 'block';
  threeContainer.value.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.panSpeed = 1.2;
  controls.screenSpacePanning = false;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: null
  };
  controls.rotateKey = 'Control';
  controls.target.set(18, 0, 16);

  const spotTexture = createSpotTexture();
  const warningZone = createTerrainZone(24, 24, '#ff8a4c', spotTexture);
  warningZone.scale.set(1.2, 1, 1.05);
  scene.add(warningZone);

  const pointGroup = new THREE.Group();
  const routeGroup = new THREE.Group();
  pointSprites = new Map();

  mapUnits.forEach((unit) => {
    const y = getTerrainHeight(unit.x, unit.z);
    const iconTexture = createMapMarkerTexture(unit.type, unit.color, unit.code);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: iconTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.renderOrder = 10;
    sprite.position.set(unit.x, y, unit.z);
    sprite.scale.set(12, 12, 1);
    sprite.center.set(0.5, 1 - 160 / 256);
    sprite.userData.isBlinking = Boolean(unit.blink);
    sprite.userData.baseScale = 12;
    pointGroup.add(sprite);
    pointSprites.set(unit.code, sprite);
  });

  scene.add(pointGroup);
  updateSelectionVisuals();

  mapRoutes.forEach((route) => {
    const curvePoints = route.points.map(([x, z]) => {
      const y = getTerrainHeight(x, z) + 1.8;
      return new THREE.Vector3(x, y, z);
    });

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const sampled = curve.getPoints(60);
    const geometry = new THREE.BufferGeometry().setFromPoints(sampled);
    const material = new THREE.LineBasicMaterial({
      color: route.color,
      transparent: true,
      opacity: 0.95
    });

    routeGroup.add(new THREE.Line(geometry, material));

    const [labelX, labelZ] = route.labelAt;
    const labelY = getTerrainHeight(labelX, labelZ) + 5;
    const labelTexture = createTextLabelTexture(route.label, route.color);
    const labelMaterial = new THREE.SpriteMaterial({
      map: labelTexture,
      transparent: true,
      depthWrite: false
    });
    const labelSprite = new THREE.Sprite(labelMaterial);
    labelSprite.position.set(labelX, labelY, labelZ);
    labelSprite.scale.set(18, 4.5, 1);
    routeGroup.add(labelSprite);
  });

  scene.add(routeGroup);

  const gridHelper = new THREE.GridHelper(200, 30, 0x1c3d90, 0x1c3d90);
  gridHelper.position.y = -10;
  gridHelper.material.opacity = 0.15;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);

  const animate = () => {
    animationId = requestAnimationFrame(animate);
    const time = Date.now() * 0.005;

    pointSprites.forEach((sprite, code) => {
      const isSelected = selectedUnitCode.value === code;
      const isBlinking = sprite.userData.isBlinking;
      const baseScale = sprite.userData.baseScale || 12;
      const pulse = isSelected ? 2.4 : isBlinking ? 1.2 : 0;
      const scale = baseScale + Math.sin(time * (isSelected ? 1.4 : 1)) * pulse;
      sprite.scale.set(scale, scale, 1);
    });

    controls.update();
    renderer.render(scene, camera);
  };

  animate();
};

const handleResize = () => {
  if (!threeContainer.value || !renderer || !camera) return;
  const width = threeContainer.value.clientWidth;
  const height = threeContainer.value.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

onMounted(() => {
  initMap();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', handleResize);
  if (controls) controls.dispose();
  if (renderer) {
    renderer.dispose();
    if (renderer.domElement?.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }
});
</script>

<style scoped>
.panel {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(28, 61, 144, 0.08);
  border-radius: 20px;
  box-shadow: 0 18px 40px rgba(28, 61, 144, 0.08);
}

.linkage-command-board {
  padding: 14px;
}

.linkage-command-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(420px, 0.92fr);
  gap: 16px;
  align-items: stretch;
}

.map-board {
  position: relative;
  min-height: 500px;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(133, 198, 241, 0.18);
  background: #0a1a2a;
}

.three-viewport {
  position: relative;
  width: 100%;
  height: 500px;
  cursor: grab;
  background: #0a1a2a;
}

.three-viewport:active {
  cursor: grabbing;
}

.map-overlay {
  position: absolute;
  z-index: 3;
  pointer-events: none;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1;
}

.warning-chip {
  top: 12px;
  left: 12px;
  padding: 12px 20px;
  color: #fff0df;
  background: rgba(255, 138, 76, 0.2);
  border: 1px solid rgba(255, 138, 76, 0.38);
  box-shadow: 0 12px 28px rgba(255, 138, 76, 0.24);
  font-size: 16px;
  font-weight: 700;
}

.controls-chip {
  top: 14px;
  right: 14px;
  padding: 7px 11px;
  color: #d8efff;
  background: rgba(7, 18, 34, 0.72);
  border: 1px solid rgba(133, 198, 241, 0.18);
}

.board-sidebar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sidebar-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.summary-card {
  padding: 12px 14px;
  border-radius: 16px;
  background: #f7faff;
  border: 1px solid rgba(58, 103, 187, 0.08);
}

.summary-card span,
.unit-cell p {
  font-size: 12px;
  color: #7890b1;
}

.summary-card strong,
.unit-cell strong {
  display: block;
  margin-top: 6px;
  font-size: 14px;
  color: #17376f;
}

.board-list {
  display: grid;
  gap: 8px;
  max-height: 500px;
  overflow-y: auto;
  padding-right: 4px;
}

.board-list::-webkit-scrollbar {
  width: 8px;
}

.board-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(92, 128, 190, 0.35);
}

.board-list::-webkit-scrollbar-track {
  background: rgba(237, 244, 255, 0.7);
}

.board-table {
  display: grid;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 14px;
}

.board-table-linkage {
  grid-template-columns: 0.8fr 1.1fr 1.05fr 0.72fr 0.78fr;
}

.table-head {
  background: #edf4ff;
  color: #5f7eb2;
  font-size: 11px;
  font-weight: 700;
}

.table-row {
  background: #f8fbff;
  border: 1px solid rgba(28, 61, 144, 0.06);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.table-row:hover,
.table-row.selected {
  border-color: rgba(28, 100, 242, 0.28);
  box-shadow: 0 10px 24px rgba(28, 100, 242, 0.12);
  transform: translateY(-1px);
}

.response-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.response-pill.responded {
  color: #1d8e5a;
  background: #e7f8ee;
}

.response-pill.pending {
  color: #d9781f;
  background: #fff0df;
}

.linkage-control-strip {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.95fr);
  gap: 14px;
  margin-top: 14px;
}

.control-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.control-metric-card,
.control-note-card {
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(28, 61, 144, 0.08);
  background: rgba(255, 255, 255, 0.88);
}

.control-metric-card span,
.control-note-card strong {
  display: block;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #6f84aa;
}

.control-metric-card strong {
  display: block;
  margin-top: 6px;
  font-size: 18px;
  color: #17376f;
}

.control-note-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.control-note-card span {
  margin-top: 6px;
  color: #4f678b;
  font-size: 13px;
  line-height: 1.5;
}

.control-action-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.control-action-card {
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(28, 61, 144, 0.08);
  background: linear-gradient(180deg, #fbfdff, #f5f9ff);
}

.control-action-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.control-action-top strong {
  color: #17376f;
  font-size: 14px;
}

.control-action-card p {
  margin-top: 8px;
  color: #5f728f;
  font-size: 12px;
  line-height: 1.5;
}

.control-feedback-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.control-feedback-card {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(28, 61, 144, 0.08);
  background: rgba(247, 250, 255, 0.96);
}

.control-feedback-card span {
  display: block;
  font-size: 11px;
  color: #7a8fad;
}

.control-feedback-card strong {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  color: #17376f;
}

@media (max-width: 1200px) {
  .linkage-command-layout,
  .sidebar-summary {
    grid-template-columns: 1fr;
  }

  .linkage-control-strip,
  .control-metrics,
  .control-action-strip,
  .control-feedback-strip {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .board-table-linkage {
    grid-template-columns: 1fr;
  }

  .map-board {
    min-height: 420px;
  }

  .three-viewport {
    height: 420px;
  }
}
</style>
