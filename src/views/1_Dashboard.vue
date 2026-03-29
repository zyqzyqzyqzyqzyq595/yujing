<template>
  <div class="view-page">
    <section class="module-section main-visualization">
      <div class="section-header">
        <h3 class="section-title">多元监测预警</h3>
      </div>

      <div class="visualization-layout">
        <div class="sys-card map-container">
          <div ref="threeContainer" class="three-viewport">
            <div class="controls-hint">左键平移 / 按住 Ctrl+左键旋转 / 滚轮缩放</div>
          </div>
        </div>

        <div class="sys-card curve-container">
          <div class="filter-bar">
            <div class="filter-group">
              <span class="filter-label">预警等级:</span>
              <select class="custom-select">
                <option value="1" selected>一级预警</option>
                <option value="2">二级预警</option>
                <option value="3">三级预警</option>
                <option value="4">四级预警</option>
              </select>
            </div>
            <div class="filter-group">
              <span class="filter-label">监测类型:</span>
              <select class="custom-select">
                <option value="GNSS" selected>GNSS</option>
                <option value="RADAR">雷达监测</option>
                <option value="DEEP">深部位移</option>
              </select>
            </div>
            <div class="filter-group">
              <span class="filter-label">监测点:</span>
              <select class="custom-select">
                <option value="GNSS35" selected>GNSS35</option>
                <option value="GNSS36">GNSS36</option>
                <option value="GNSS37">GNSS37</option>
              </select>
            </div>
          </div>

          <div class="analysis-section">
            <div class="chart-header">
              <div class="dash-title">指标时序演变曲线图</div>
              <div class="legend-container">
                <div class="metric-legend">
                  <span class="legend-color bg-red"></span>
                  <span>表面位移 (mm)</span>
                </div>
                <div class="metric-legend">
                  <span class="legend-color bg-blue"></span>
                  <span>变化速率 (mm/d)</span>
                </div>
              </div>
            </div>

            <div ref="curveChartRef" style="flex: 1; width: 100%; background: rgba(0,0,0,0.02); border-radius: 4px;"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="module-section threshold-config">
      <div class="section-header">
        <h3 class="section-title">预警阈值设置</h3>
      </div>
      <div class="sys-card threshold-layout">
        <div class="threshold-tabs tabs-list">
          <button class="tab-btn active">GNSS</button>
          <button class="tab-btn">雷达监测</button>
          <button class="tab-btn">深部位移</button>
          <button class="tab-btn">降雨监测</button>
          <button class="tab-btn">地下水监测</button>
          <button class="tab-btn">应力监测</button>
        </div>

        <div class="tab-content-container gnss-threshold-config">
          <div class="config-header">
            <div class="info-wrap">
              <span class="info-icon">ℹ</span>
              <span class="info-text">注：预警参数可设置为 <b>位移量</b>、<b>位移速度</b> 或 <b>位移加速度</b> 中的某一个，均为达到某一设定阈值时触发预警。</span>
            </div>
            <div class="config-actions">
              <button class="ctrl-btn" style="background:#1c3d90; color:#fff; font-weight:bold;">保存参数</button>
            </div>
          </div>

          <div class="config-cards">
            <div class="threshold-card border-red">
              <div class="card-title text-red">
                <div><span class="color-dot bg-red"></span> 一级预警 (红色)</div>
                <span class="sub-cond">连续2次</span>
              </div>
              <div class="card-body">
                <div class="input-row"><label>Z位移 ></label><input type="number" value="200"><span class="unit">mm</span></div>
                <div class="input-row"><label>Y位移 ></label><input type="number" value="200"><span class="unit">mm</span></div>
                <div class="input-row"><label>X位移 ></label><input type="number" value="200"><span class="unit">mm</span></div>
              </div>
            </div>

            <div class="threshold-card border-orange">
              <div class="card-title text-orange">
                <div><span class="color-dot bg-orange"></span> 二级预警 (橙色)</div>
                <span class="sub-cond">连续2次</span>
              </div>
              <div class="card-body">
                <div class="input-row"><label>Z位移 ></label><input type="number" value="150"><span class="unit">mm</span></div>
                <div class="input-row"><label>Y位移 ></label><input type="number" value="150"><span class="unit">mm</span></div>
                <div class="input-row"><label>X位移 ></label><input type="number" value="150"><span class="unit">mm</span></div>
              </div>
            </div>

            <div class="threshold-card border-yellow">
              <div class="card-title text-yellow">
                <div><span class="color-dot bg-yellow"></span> 三级预警 (黄色)</div>
                <span class="sub-cond">连续2次</span>
              </div>
              <div class="card-body">
                <div class="input-row"><label>Z位移 ></label><input type="number" value="100"><span class="unit">mm</span></div>
                <div class="input-row"><label>Y位移 ></label><input type="number" value="100"><span class="unit">mm</span></div>
                <div class="input-row"><label>X位移 ></label><input type="number" value="100"><span class="unit">mm</span></div>
              </div>
            </div>

            <div class="threshold-card border-blue">
              <div class="card-title text-blue">
                <div><span class="color-dot bg-blue"></span> 四级预警 (蓝色)</div>
                <span class="sub-cond">连续2次</span>
              </div>
              <div class="card-body">
                <div class="input-row"><label>Z位移 ></label><input type="number" value="80"><span class="unit">mm</span></div>
                <div class="input-row"><label>Y位移 ></label><input type="number" value="80"><span class="unit">mm</span></div>
                <div class="input-row"><label>X位移 ></label><input type="number" value="80"><span class="unit">mm</span></div>
              </div>
            </div>
          </div>
        </div>
        </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as echarts from 'echarts';

const threeContainer = ref(null);
const curveChartRef = ref(null);
let renderer, scene, camera, controls, animationId;
let handlePointerDown;
let curveChart = null;

const createGlowTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
};

const createSpotTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
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

const createIconTexture = (type, color, deviceId) => {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = 256 * scale;
  canvas.height = 256 * scale;
  const ctx = canvas.getContext('2d');

  const icons = { 'GNSS': '📍', 'DEEP': '⚓', 'RADAR': '📡', 'SURFACE': '📐', 'CRACK': '🧱', 'FIRE': '🔥', 'WATER': '💧', 'GROUND': '🌍', 'STRESS': '📊', 'VIB': '💥', 'SAT': '🛸' };
  const emoji = icons[type] || '●';

  ctx.save();
  ctx.translate(128 * scale, 112 * scale);
  ctx.rotate(-45 * Math.PI / 180);
  ctx.beginPath();
  if(ctx.roundRect) {
      ctx.roundRect(-24 * scale, -24 * scale, 48 * scale, 48 * scale,[24 * scale, 24 * scale, 24 * scale, 0]);
  } else {
      ctx.rect(-24 * scale, -24 * scale, 48 * scale, 48 * scale);
  }
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12 * scale;
  ctx.shadowOffsetY = 4 * scale;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3 * scale;
  ctx.strokeStyle = '#85C6F1';
  ctx.stroke();
  ctx.restore();

  ctx.font = `${28 * scale}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 128 * scale, 112 * scale);

  ctx.font = `bold ${16 * scale}px "Microsoft YaHei", sans-serif`;
  const textWidth = ctx.measureText(deviceId).width;
  const labelWidth = textWidth + 24 * scale;
  const labelHeight = 26 * scale;
  const labelX = 128 * scale - labelWidth / 2;
  const labelY = 182 * scale - labelHeight / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.beginPath();
  if(ctx.roundRect) {
      ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 4 * scale);
  } else {
      ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
  }
  ctx.fill();

  ctx.lineWidth = 1 * scale;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.fillText(deviceId, 128 * scale, 182 * scale);

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
  for(let i = 0; i < pos.count; i++) {
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

const initECharts = () => {
  if (!curveChartRef.value) return;

  curveChart = echarts.init(curveChartRef.value);

  const timeData = [];
  const dispData = [];
  const speedData = [];
  let currentDisp = 0;

  for (let i = 0; i <= 24; i++) {
      timeData.push(`${i.toString().padStart(2, '0')}:00`);
      let speed = Math.random() * 2 + 0.5;
      if (i > 19) speed += (i - 19) * 15;
      currentDisp += speed;

      dispData.push(currentDisp.toFixed(2));
      speedData.push(speed.toFixed(2));
  }

  const option = {
      grid: { top: 40, right: 50, bottom: 25, left: 50 },
      tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderColor: '#1c3d90',
          textStyle: { color: '#333' }
      },
      xAxis: {
          type: 'category',
          boundaryGap: false,
          data: timeData,
          axisLine: { lineStyle: { color: '#ccc' } },
          axisLabel: { color: '#666', fontSize: 10 }
      },
      yAxis: [
          {
              type: 'value',
              name: '表面位移 (mm)',
              position: 'left',
              axisLine: { show: true, lineStyle: { color: '#ccc' } },
              axisLabel: { color: '#666', fontSize: 10 },
              splitLine: { lineStyle: { type: 'dashed', color: '#eee' } }
          },
          {
              type: 'value',
              name: '变化速率 (mm/d)',
              position: 'right',
              axisLine: { show: true, lineStyle: { color: '#ccc' } },
              axisLabel: { color: '#666', fontSize: 10 },
              splitLine: { show: false }
          }
      ],
      series: [
          {
              name: '表面位移 (mm)',
              type: 'line',
              smooth: true,
              symbol: 'none',
              itemStyle: { color: '#f57676' },
              areaStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: 'rgba(245, 118, 118, 0.3)' },
                      { offset: 1, color: 'rgba(245, 118, 118, 0.05)' }
                  ])
              },
              data: dispData
          },
          {
              name: '变化速率 (mm/d)',
              type: 'line',
              yAxisIndex: 1,
              smooth: true,
              symbol: 'none',
              itemStyle: { color: '#85C6F1' },
              data: speedData
          }
      ]
  };

  curveChart.setOption(option);
};

onMounted(() => {
  initECharts();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1a2a);

  const width = threeContainer.value.clientWidth;
  const height = threeContainer.value.clientHeight;
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 85, 15);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  threeContainer.value.appendChild(renderer.domElement);

  renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

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

  controls.rotateKey = "Control";

  const glowTexture = createGlowTexture();
  const spotTexture = createSpotTexture();
  const allPointsGroup = new THREE.Group();

  const icons = { 'GNSS': '📍', 'DEEP': '⚓', 'RADAR': '📡', 'SURFACE': '📐', 'CRACK': '🧱', 'FIRE': '🔥', 'WATER': '💧', 'GROUND': '🌍', 'STRESS': '📊', 'VIB': '💥', 'SAT': '🛸' };
  const types = Object.keys(icons);
  const colors =['#F57676', '#FFA500', '#fadb14', '#66B1FF', '#71C446'];

  const zoneCenters =[
    { x: 35, z: 35 },
    { x: -35, z: 35 },
    { x: -35, z: -35 },
    { x: 35, z: -35 }
  ];

  for(let i = 0; i < 4; i++) {
    const zoneMesh = createTerrainZone(zoneCenters[i].x, zoneCenters[i].z, colors[i], spotTexture);
    scene.add(zoneMesh);
  }

  let redGnssCount = 0;
  const positions =[];
  const colorArray =[];
  const baseColorObj = new THREE.Color();

  for (let i = 0; i < 150; i++) {
    let type = types[i % types.length];
    if (i < 7) type = 'RADAR';
    else if (type === 'RADAR') type = 'GNSS';

    let alarmIdx = (i * 7) % 5;
    const isOnline = (i % 8 !== 0);
    if (type === 'GNSS' && alarmIdx === 0) {
        if (redGnssCount < 2) redGnssCount++; else alarmIdx = 4;
    }

    const targetColor = isOnline ? colors[alarmIdx] : '#999999';
    const deviceId = `${type}${i}`;

    let x, z;
    if (isOnline && alarmIdx < 4) {
      const center = zoneCenters[alarmIdx];
      const radius = Math.random() * 20;
      const angle = Math.random() * Math.PI * 2;
      x = center.x + Math.cos(angle) * radius;
      z = center.z + Math.sin(angle) * radius;
    } else {
      let isValid = false;
      while (!isValid) {
        x = (Math.random() - 0.5) * 160;
        z = (Math.random() - 0.5) * 160;
        isValid = true;
        for (let j = 0; j < zoneCenters.length; j++) {
          const dist = Math.sqrt(Math.pow(x - zoneCenters[j].x, 2) + Math.pow(z - zoneCenters[j].z, 2));
          if (dist <= 25) {
            isValid = false;
            break;
          }
        }
      }
    }

    const y = Math.sin(x / 10) * Math.cos(z / 10) * 8;

    positions.push(x, y, z);

    baseColorObj.set(targetColor);
    colorArray.push(baseColorObj.r, baseColorObj.g, baseColorObj.b);

    const iconTexture = createIconTexture(type, targetColor, deviceId);

    const spriteMaterial = new THREE.SpriteMaterial({
      map: iconTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.renderOrder = 10;

    sprite.position.set(x, y, z);
    sprite.scale.set(12, 12, 1);
    sprite.center.set(0.5, 1 - 160 / 256);

    if (alarmIdx === 0 && isOnline) {
      sprite.userData.isBlinking = true;
    }

    allPointsGroup.add(sprite);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3));

  const pointsMaterial = new THREE.PointsMaterial({
    size: 8,
    map: glowTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    vertexColors: true
  });

  const points = new THREE.Points(geometry, pointsMaterial);
  points.renderOrder = 2;

  allPointsGroup.add(points);
  scene.add(allPointsGroup);

  const gridHelper = new THREE.GridHelper(200, 30, 0x1c3d90, 0x1c3d90);
  gridHelper.position.y = -10;
  gridHelper.material.opacity = 0.15;
  gridHelper.material.transparent = true;
  gridHelper.renderOrder = 0;
  scene.add(gridHelper);

  const animate = () => {
    animationId = requestAnimationFrame(animate);
    const time = Date.now() * 0.005;

    scene.traverse((child) => {
      if (child.isSprite && child.userData.isBlinking) {
         const scale = 12 + Math.sin(time) * 1.5;
         child.scale.set(scale, scale, 1);
      }
    });

    controls.update();
    renderer.render(scene, camera);
  };
  animate();
  window.addEventListener('resize', onWindowResize);
});

const onWindowResize = () => {
  const width = threeContainer.value.clientWidth;
  const height = threeContainer.value.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);

  if (curveChart) curveChart.resize();
};

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', onWindowResize);

  if (handlePointerDown && renderer) {
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown, true);
  }

  if (renderer) renderer.dispose();
  if (curveChart) curveChart.dispose();
});
</script>

<style scoped>
.view-page { display: flex; flex-direction: column; gap: 20px; }
.section-header { margin-bottom: 15px; }
.section-title { font-size: 18px; color: #1c3d90; display: flex; align-items: center; gap: 10px; }
.section-title small { font-size: 12px; color: #666; font-weight: normal; }

.visualization-layout { display: flex; gap: 20px; height: 540px; align-items: stretch; }

.map-container { flex: 3; padding: 0 !important; background: #000 !important; overflow: hidden; border: 1px solid #1c3d90 !important; cursor: grab; }
.map-container:active { cursor: grabbing; }
.three-viewport { width: 100%; height: 100%; position: relative; }
.controls-hint { position: absolute; top: 10px; right: 10px; color: #85C6F1; font-size: 11px; background: rgba(0,0,0,0.5); padding: 4px 8px; border-radius: 4px; pointer-events: none; z-index: 10; }

.curve-container { flex: 2; display: flex; flex-direction: column; border: 1px solid #1c3d90 !important; overflow: hidden; background: #fff; }
.filter-bar { display: flex; gap: 15px; padding: 12px 15px; border-bottom: 1px solid #ebeef5; background: #fcfcfc; }
.filter-group { display: flex; align-items: center; gap: 6px; }
.filter-label { font-size: 13px; color: #1c3d90; font-weight: bold; }
.custom-select { padding: 4px 24px 4px 8px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266; font-size: 12px; appearance: none; background: #fff url("data:image/svg+xml,%3Csvg viewBox='0 0 1024 1024' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M512 704l-320-320h640z' fill='%23c0c4cc'/%3E%3C/svg%3E") no-repeat right 6px center/10px; cursor: pointer; outline: none; }
.analysis-section { flex: 1; display: flex; flex-direction: column; padding: 15px; background: #fff; }
.chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.dash-title { font-size: 14px; font-weight: bold; color: #1c3d90; border-left: 4px solid #1c3d90; padding-left: 8px; margin: 0; }
.legend-container { display: flex; gap: 12px; font-size: 12px; color: #666; }
.metric-legend { display: flex; align-items: center; gap: 4px; }
.legend-color { width: 12px; height: 12px; border-radius: 2px; }
.bg-red { background: #f57676; }
.bg-blue { background: #85C6F1; }

.threshold-layout { display: flex; gap: 20px; min-height: 140px; border: 1px solid #1c3d90 !important; }
.threshold-tabs { display: flex; flex-direction: column; gap: 10px; width: 140px; }
.tab-btn { padding: 10px; border: 1px solid #1c3d90; background: #fff; color: #1c3d90; cursor: pointer; font-size: 13px; }
.tab-btn.active { background: #1c3d90; color: #fff; }

/* ================= 新增：预警阈值设置 GNSS 专属样式 ================= */
.tab-content-container { flex: 1; display: flex; flex-direction: column; background: #fff; padding: 15px 20px; overflow-y: auto; }
.config-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #ebeef5; }
.info-wrap { display: flex; align-items: center; gap: 8px; }
.info-icon { background: #eef6ff; color: #1c3d90; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 1px solid #c3e4fd; }
.info-text { font-size: 13px; color: #666; }
.info-text b { color: #1c3d90; }

.config-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
.threshold-card { border: 1px solid #ebeef5; border-radius: 6px; overflow: hidden; background: #fafafa; }
.card-title { padding: 8px 12px; font-size: 13px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; background: #fff; border-bottom: 1px solid #ebeef5; }
.card-title div { display: flex; align-items: center; gap: 6px; }
.color-dot { width: 10px; height: 10px; border-radius: 50%; }
.sub-cond { font-size: 11px; color: #999; font-weight: normal; }

.text-red { color: #f5222d; }
.text-orange { color: #fa8c16; }
.text-yellow { color: #faad14; }
.text-blue { color: #1890ff; }
.bg-red { background: #f5222d; }
.bg-orange { background: #fa8c16; }
.bg-yellow { background: #faad14; }
.bg-blue { background: #1890ff; }
.border-red { border-color: #ffccc7; }
.border-orange { border-color: #ffe7ba; }
.border-yellow { border-color: #fffb8f; }
.border-blue { border-color: #91d5ff; }

.card-body { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.input-row { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #555; }
.input-row label { width: 65px; }
.input-row input { flex: 1; width: 0; padding: 4px; border: 1px solid #dcdfe6; border-radius: 4px; text-align: center; color: #333; outline: none; }
.input-row input:focus { border-color: #1c3d90; }
.input-row .unit { width: 25px; text-align: right; color: #999; }
/* ============================================================== */
</style>