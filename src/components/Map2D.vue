<template>
  <section class="map-module" id="main-map-section">
<button id="reset-gnss-btn" class="breathing-btn rounded-circle-btn" type="button" @click="mapModule.resetView()">
  ↺
</button>

    <div class="draw-toolbar" id="draw-toolbar">
      <span class="draw-tip">【逻辑互斥】左键点选监测点连线 或 Ctrl+左键拖拽划线（两者不可混用）</span>
      <button type="button" class="map-btn" style="background:var(--warn-green);color:#fff;" @click="profileModule.confirmDraw()">确定生成</button>
      <button type="button" class="map-btn" @click="profileModule.exitMode()">取消</button>
    </div>

    <div class="map-toolbar" id="time-engine-bar">
      <div style="display:flex; align-items:center; gap:8px; flex: 1; flex-wrap: wrap;">
        <div style="position:relative; display: inline-block;">
          <button type="button" class="map-btn" id="map-region-btn" style="min-width:100px;" @click="mapFilterModule.toggleDropdown('map-region-dropdown', $event)">
            <span id="map-region-label">选择区域</span>
          </button>
          <div id="map-region-dropdown" class="custom-dropdown-content"></div>
        </div>

        <div style="position:relative; display: inline-block;">
          <button type="button" class="map-btn" id="map-line-btn" style="min-width:100px;" @click="mapFilterModule.toggleDropdown('map-line-dropdown', $event)">
            <span id="map-line-label">选择监测线</span>
          </button>
          <div id="map-line-dropdown" class="custom-dropdown-content">
            <div class="custom-dropdown-item">
              <input type="checkbox" value="全部" checked @change="mapFilterModule.handleLineChange($event.target)">
              <span>全部</span>
            </div>
            <div class="custom-dropdown-item">
              <input type="checkbox" value="1号线" checked @change="mapFilterModule.handleLineChange($event.target)">
              <span>1号线</span>
            </div>
            <div class="custom-dropdown-item">
              <input type="checkbox" value="2号线" checked @change="mapFilterModule.handleLineChange($event.target)">
              <span>2号线</span>
            </div>
            <div class="custom-dropdown-item">
              <input type="checkbox" value="3号线" checked @change="mapFilterModule.handleLineChange($event.target)">
              <span>3号线</span>
            </div>
            <div class="custom-dropdown-item">
              <input type="checkbox" value="4号线" checked @change="mapFilterModule.handleLineChange($event.target)">
              <span>4号线</span>
            </div>
            <div class="custom-dropdown-item">
              <input type="checkbox" value="5号线" checked @change="mapFilterModule.handleLineChange($event.target)">
              <span>5号线</span>
            </div>
            <div class="custom-dropdown-item">
              <input type="checkbox" value="6号线" checked @change="mapFilterModule.handleLineChange($event.target)">
              <span>6号线</span>
            </div>
          </div>
        </div>

        <div style="position:relative; display: inline-block;">
          <input type="text" id="map-point-input" class="map-btn" style="width:180px; text-align:center; padding-right:20px;" placeholder="请选择监测点..." @click="mapFilterModule.toggleDropdown('map-point-dropdown', $event)" @input="mapFilterModule.filterPointList($event.target.value)" @blur="mapFilterModule.handlePointInput()" @keydown.enter="mapFilterModule.handlePointInput()">
          <span style="position:absolute; right:8px; top:8px; pointer-events:none; font-size:10px; color:#999;">▼</span>
          <div id="map-point-dropdown" class="custom-dropdown-content"></div>
        </div>

        <div style="width: 1px; height: 20px; background: #ddd; margin: 0 5px;"></div>

        <button type="button" class="map-btn freq-btn active" @click="mapModule.setTime(1, $event.target)">一天内</button>
        <button type="button" class="map-btn freq-btn" @click="mapModule.setTime(7, $event.target)">一周内</button>
        <button type="button" class="map-btn freq-btn" @click="mapModule.setTime(30, $event.target)">一个月内</button>
        <input type="datetime-local" id="date-start" class="map-btn" value="2025-10-10T13:22" @change="mapModule.applyCustomTime()">
        <span style="font-size: clamp(10px, 0.7vw, 13px); color: #666;">至</span>
        <input type="datetime-local" id="date-end" class="map-btn" value="2026-01-18T00:00" @change="mapModule.applyCustomTime()">
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <button type="button" class="btn-profile" id="btn-enter-profile" @click="profileModule.enterMode()">剖面图绘制</button>
      </div>
    </div>

    <div class="map-viewer" id="map-viewer">
      <div class="map-canvas" id="map-canvas">
        <svg id="draw-svg"></svg>
        <svg id="connection-svg"></svg>
      </div>
    </div>

    <div class="profile-workbench" id="profile-workbench">
      <div class="profile-header">
        <div style="display:flex; align-items:center; gap:15px;">
          <span style="font-weight:bold; color:#1c3d90">地质剖面结构分析</span>
          <span id="profile-tag" style="font-size:10px; background:#eef6ff; color:#1c3d90; padding:2px 6px; border-radius:10px; border:1px solid #dbeafe;">当前实时</span>
        </div>
        <div style="display:flex; gap:10px" id="profile-btn-group">
          <button type="button" class="map-btn" id="btn-profile-export" @click="profileModule.exportImage()">💾 导出图片</button>
          <button type="button" class="map-btn" id="btn-profile-save" style="background:#85C6F1; color:#fff; border:none;" @click="profileModule.hideWorkbench()">保存</button>
          <button type="button" class="map-btn" id="btn-profile-exit" style="background:var(--warn-red); color:#fff; border:none;" @click="profileModule.closeWorkbench()">退出绘制</button>
        </div>
      </div>
      <div class="profile-body">
        <div id="profile-chart"></div>
      </div>
    </div>

    <div id="profile-mini-trigger" @click="profileModule.restoreWorkbench()" title="点击对比历史剖面数据">
      <div class="tech-corner-tl"></div>
      <div class="tech-corner-br"></div>
      <div class="tech-content">
        <div class="tech-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#00F2FF" stroke-width="2.5">
            <path d="M18 20V10M12 20V4M6 20v-6" stroke-linecap="round" />
            <path d="M3 20h18" stroke-linecap="round" />
          </svg>
        </div>
        <div class="tech-label">对比分析</div>
        <div class="tech-sub-text">COMPARE</div>
      </div>
    </div>

    <div id="offline-modal" class="modal-overlay">
      <div class="offline-panel-content">
        <div class="modal-header">
          <h3 style="color:#1c3d90; font-size: 16px; margin:0;">🚫 离线设备列表 </h3>
          <span class="modal-close" style="color:#999 !important; position:static; font-size:24px;" @click="dashModule.closeOfflineModal()">&times;</span>
        </div>
        <div class="modal-table-wrapper">
          <table class="dash-table">
            <thead>
              <tr>
<th width="60" style="text-align: center; vertical-align: middle;">序号</th>
<th style="text-align: center; vertical-align: middle;">区域</th>
<th style="text-align: center; vertical-align: middle;">设备编号</th>
<th style="text-align: center; vertical-align: middle;">离线时间</th>
<th style="text-align: center; vertical-align: middle;">所属厂商</th>
              </tr>
            </thead>
            <tbody id="offline-table-body"></tbody>
          </table>
        </div>
        <div class="offline-modal-footer">
          <div class="offline-pager-info" id="offline-pager-info">共 3 条记录</div>
          <div class="offline-pager-ctrl" id="offline-pager-ctrl"></div>
        </div>
      </div>
    </div>

    <div class="drawer-comp" id="device-drawer" style="z-index: 9999;">
      <div class="drawer-bar" @click="mapFilterModule.toggleDrawer()">
        <span id="drawer-arrow">▲</span> 监测设备类型切换
      </div>
      <div class="drawer-icons">
        <div class="filter-item" data-type="GNSS" @click="mapFilterModule.toggle('GNSS', $event.currentTarget)">📍 GNSS监测</div>
        <div class="filter-item" data-type="DEEP" @click="mapFilterModule.toggle('DEEP', $event.currentTarget)">⚓ 深部位移监测</div>
        <div class="filter-item" data-type="RADAR" @click="mapFilterModule.toggle('RADAR', $event.currentTarget)">
          <span>📡 雷达监测</span>
          <span class="radar-plus" @click.stop="mapFilterModule.toggleRadarCloud($event, $event.currentTarget)">+</span>
        </div>
        <div class="filter-item" data-type="SURFACE" @click="mapFilterModule.toggle('SURFACE', $event.currentTarget)">📐 裂缝写实</div>
        <div class="filter-item" data-type="CRACK" @click="mapFilterModule.toggle('CRACK', $event.currentTarget)">🧱 裂缝监测</div>
        <div class="filter-item" data-type="FIRE" @click="mapFilterModule.toggle('FIRE', $event.currentTarget)">🔥 煤自燃监测</div>
        <div class="filter-item" data-type="WATER" @click="mapFilterModule.toggle('WATER', $event.currentTarget)">💧 降雨监测</div>
        <div class="filter-item" data-type="GROUND" @click="mapFilterModule.toggle('GROUND', $event.currentTarget)">🌍 地下水监测</div>
        <div class="filter-item" data-type="STRESS" @click="mapFilterModule.toggle('STRESS', $event.currentTarget)">📊 地下应力监测</div>
        <div class="filter-item" data-type="VIB" @click="mapFilterModule.toggle('VIB', $event.currentTarget)">💥 爆破震动监测</div>
        <div class="filter-item" data-type="SAT" @click="mapFilterModule.toggle('SAT', $event.currentTarget)">🛸 遥感监测</div>
        <div class="filter-item all-btn" @click="mapFilterModule.toggle('全部', $event.currentTarget)">🔳 全部显示</div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';
import { analysisModule } from '../analysis/analysisModule.js';
import { getDeepAnalysisModule } from '../analysis/deepAnalysisModule.js';
import { getRadarAnalysisModule } from '../analysis/radarAnalysisModule.js';
import { getCrackAnalysisModule } from '../analysis/crackAnalysisModule.js';
import { getFireAnalysisModule } from '../analysis/fireAnalysisModule.js';
import { getWaterAnalysisModule } from '../analysis/waterAnalysisModule.js';
import { getGroundAnalysisModule } from '../analysis/groundAnalysisModule.js';
import { getYingliAnalysisModule } from '../analysis/yingliAnalysisModule.js';
import { getVibAnalysisModule } from '../analysis/vibAnalysisModule.js';

const timeUtils = {
  formatISO(d) {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d - offset).toISOString().slice(0, 16);
  },
  updateMaxConstraints() {
    const nowStr = this.formatISO(new Date());
    ['date-start', 'date-end', 'an-start', 'an-end', 'deep-an-start', 'deep-an-end', 'radar-an-start', 'radar-an-end', 'crack-an-start', 'crack-an-end', 'fire-an-start', 'fire-an-end', 'water-an-start', 'water-an-end', 'ground-an-start', 'ground-an-end', 'yingli-an-start', 'yingli-an-end', 'vib-an-start', 'vib-an-end'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.setAttribute('max', nowStr);
    });
  }
};

const mapModule = {
  scale: 0.6,
  pos: { x: -300, y: -200 },
  tMultiplier: 1,
  isDetailMode: false,
  pMeta: {},
  radarList: [],
  virtualPoints: {},
  selectedMapTypes: ['geology'],

  init() {
    const vp = document.getElementById('map-viewer');
    const cv = document.getElementById('map-canvas');
    const upd = () => cv.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px) scale(${this.scale})`;
    vp.onwheel = (e) => {
      e.preventDefault();
      const ns = Math.min(Math.max(0.2, this.scale + (e.deltaY * -0.0012)), 3.5);
      const r = vp.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const ratio = ns / this.scale;
      this.pos.x = mx - (mx - this.pos.x) * ratio;
      this.pos.y = my - (my - this.pos.y) * ratio;
      this.scale = ns;
      upd();
    };
    let drg = false, sx, sy;
    vp.onmousedown = (e) => {
      if (profileModule.isDrawing && e.ctrlKey && e.button === 0) {
        profileModule.handleMouseDown(e);
        return;
      }
      if (e.button === 0 && (e.target === vp || e.target.id === 'map-canvas')) {
        drg = true;
        sx = e.clientX - this.pos.x;
        sy = e.clientY - this.pos.y;
        vp.style.cursor = 'grabbing';
      }
    };
    window.addEventListener('mousemove', (e) => {
      if (profileModule.isDrawing && profileModule.isDragging) {
        profileModule.handleMouseMove(e);
        return;
      }
      if (drg) {
        this.pos.x = e.clientX - sx;
        this.pos.y = e.clientY - sy;
        upd();
      }
    });
    window.addEventListener('mouseup', () => {
      if (profileModule.isDrawing && profileModule.isDragging) profileModule.handleMouseUp();
      drg = false;
      vp.style.cursor = profileModule.isDrawing ? 'crosshair' : 'grab';
    });
    this.spawnPoints();
    this.updateMapFilters();
    upd();
    window.addEventListener('click', (e) => {
      const dropdown = document.getElementById('map-view-dropdown');
      const btn = document.getElementById('map-view-btn');
      if (dropdown && !dropdown.contains(e.target) && e.target !== btn) dropdown.style.display = 'none';
    });
  },

  spawnPoints() {
    const cv = document.getElementById('map-canvas');
    const icons = { 'GNSS': '📍', 'DEEP': '⚓', 'RADAR': '📡', 'SURFACE': '📐', 'CRACK': '🧱', 'FIRE': '🔥', 'WATER': '💧', 'GROUND': '🌍', 'STRESS': '📊', 'VIB': '💥', 'SAT': '🛸' };
    const types = Object.keys(icons);
    const regionDefinitions = [
      { name: '北帮', xRange: [800, 2200], yRange: [200, 600], lineAxis: { type: 'Y', val: 350 } },
      { name: '南帮', xRange: [800, 2200], yRange: [1900, 2300], lineAxis: { type: 'Y', val: 2150 } },
      { name: '西帮', xRange: [200, 700], yRange: [800, 1700], lineAxis: { type: 'X', val: 400 } },
      { name: '东帮', xRange: [2300, 2800], yRange: [800, 1700], lineAxis: { type: 'X', val: 2600 } },
      { name: '中央区', xRange: [1100, 1900], yRange: [1000, 1500], lineAxis: null }
    ];
    const placedPoints = [];
    const minDist = 60;
    const gnssCountPerRegion = { '北帮': 0, '南帮': 0, '东帮': 0, '西帮': 0, '中央区': 0 };
    let redGnssCount = 0;
    for (let i = 0; i < 150; i++) {
      let type = types[i % types.length];
      if (i < 7) type = 'RADAR';
      else if (type === 'RADAR') type = 'GNSS';
      let alarmIdx = (i * 7) % 5;
      const isOnline = (i % 8 !== 0);
      if (type === 'GNSS' && alarmIdx === 0) {
        if (redGnssCount < 2) redGnssCount++;
        else alarmIdx = 4;
      }
      const regDef = regionDefinitions[i % regionDefinitions.length];
      let posX, posY, attempts = 0;
      let isOnDetectionLine = false;
      if (type === 'GNSS' && regDef.lineAxis && gnssCountPerRegion[regDef.name] < 3) {
        isOnDetectionLine = true;
        gnssCountPerRegion[regDef.name]++;
      }
      while (attempts < 150) {
        if (isOnDetectionLine) {
          const idx = gnssCountPerRegion[regDef.name] - 1;
          if (regDef.lineAxis.type === 'Y') {
            posY = regDef.lineAxis.val;
            posX = regDef.xRange[0] + 300 + (idx * 250);
          } else {
            posX = regDef.lineAxis.val;
            posY = regDef.yRange[0] + 300 + (idx * 250);
          }
        } else {
          posX = regDef.xRange[0] + Math.random() * (regDef.xRange[1] - regDef.xRange[0]);
          posY = regDef.yRange[0] + Math.random() * (regDef.yRange[1] - regDef.yRange[0]);
          if (regDef.lineAxis) {
            if (regDef.lineAxis.type === 'Y' && Math.abs(posY - regDef.lineAxis.val) < 60) continue;
            if (regDef.lineAxis.type === 'X' && Math.abs(posX - regDef.lineAxis.val) < 60) continue;
          }
        }
        if (!placedPoints.some(p => Math.hypot(posX - p.x, posY - p.y) < minDist)) break;
        attempts++;
      }
      placedPoints.push({ x: posX, y: posY });
      const p = document.createElement('div');
      p.id = `pt-${i}`;
      p.className = `point-obj type-${type} ${(isOnline && alarmIdx === 0) ? 'breathe' : ''}`;
      p.style.left = posX + 'px';
      p.style.top = posY + 'px';
      const colors = ['#F57676', '#FFA500', '#fadb14', '#66B1FF', '#71C446'];
      const targetColor = isOnline ? colors[alarmIdx] : '#999';
      p.style.backgroundColor = targetColor;
      p.style.color = targetColor;
      const deviceId = `${type}${i}`;
      const stressSub = i % 2 === 0 ? '锚索应力' : '土压力计';
      this.pMeta[p.id] = type === 'STRESS'
        ? { id: p.id, type, alarmIdx, isOnline, deviceId, region: regDef.name, isOnDetectionLine, subType: stressSub }
        : { id: p.id, type, alarmIdx, isOnline, deviceId, region: regDef.name, isOnDetectionLine };
      p.innerHTML = `<div class="point-bubble"><span>${icons[type]}</span></div><div class="point-id">${deviceId}</div>`;
      if (type === 'GNSS' && isOnline) {
        const arrow = document.createElement('div');
        arrow.className = 'map-vector-arrow';
        arrow.style.height = '60px';
        arrow.style.transform = `translateX(-50%) rotate(${(i * 137.5) % 360}deg)`;
        p.appendChild(arrow);
      }
      p.onclick = (e) => {
        if (profileModule.isDrawing) { e.stopPropagation(); profileModule.handlePointClick(p.id); }
        else if (isOnline && type === 'GNSS') { dashModule.focusWithRange(p.id); analysisModule.open(this.pMeta[p.id]); }
        else if (isOnline && type === 'DEEP') { dashModule.focusWithRange(p.id); getDeepAnalysisModule().open(this.pMeta[p.id]); }
        else if (isOnline && type === 'RADAR') { dashModule.focusWithRange(p.id); getRadarAnalysisModule().open(this.pMeta[p.id]); }
        else if (isOnline && type === 'CRACK') { dashModule.focusWithRange(p.id); getCrackAnalysisModule().open(this.pMeta[p.id]); }
        else if (isOnline && type === 'FIRE') { dashModule.focusWithRange(p.id); getFireAnalysisModule().open(this.pMeta[p.id]); }
        else if (isOnline && type === 'WATER') { dashModule.focusWithRange(p.id); getWaterAnalysisModule().open(this.pMeta[p.id]); }
        else if (isOnline && type === 'GROUND') { dashModule.focusWithRange(p.id); getGroundAnalysisModule().open(this.pMeta[p.id]); }
        else if (isOnline && type === 'STRESS') { dashModule.focusWithRange(p.id); getYingliAnalysisModule().open(this.pMeta[p.id]); }
        else if (isOnline && type === 'VIB') { dashModule.focusWithRange(p.id); getVibAnalysisModule().open(this.pMeta[p.id]); }
      };
      if (isOnline) {
        p.onmouseenter = (e) => {
          const tt = document.getElementById('map-tooltip');
          tt.style.display = 'block';
          tt.innerHTML = `<b style="color:#85C6F1;">[${regDef.name}] ${deviceId}</b><hr style='margin:5px 0; opacity:0.2'>${this.getTechData(type, p.id)}`;
          tt.style.left = e.clientX + 15 + 'px';
          tt.style.top = e.clientY + 15 + 'px';
        };
        p.onmouseleave = () => document.getElementById('map-tooltip').style.display = 'none';
      }
      cv.appendChild(p);
    }
    this.radarList = [];
    this.virtualPoints = {};
    const radarSeen = new Set();
    Object.keys(this.pMeta).forEach(pid => {
      const m = this.pMeta[pid];
      if (m.type !== 'RADAR') return;
      if (!radarSeen.has(m.deviceId)) {
        radarSeen.add(m.deviceId);
        this.radarList.push({ name: m.deviceId, region: m.region, isOnline: m.isOnline });
      }
      this.virtualPoints[pid] = { id: pid, radarName: m.deviceId, region: m.region };
    });
  },

  getTechData(type, id) {
    const meta = this.pMeta[id];
    const multiplier = this.isDetailMode ? 1 : (this.tMultiplier || 1);
    const seed = parseInt(id.replace('pt-', '')) || 0;
    const variance = (seed % 10) * 0.1;
    const getValue = (base, varianceFactor = 1) => {
      const v = base * multiplier * (0.9 + variance * varianceFactor);
      return v.toFixed(2);
    };
    if (type === 'GNSS') {
      const alarmText = meta.alarmIdx === 0 ? `<span style="color:#F57676;">⚠️ 一级报警</span>` :
                        meta.alarmIdx === 1 ? `<span style="color:#FFA500;">⚠️ 二级报警</span>` : '';
      return `${alarmText}<br>速度: ${getValue(2.3)} mm/h<br>位移: ${getValue(15.8)} mm<br>方向: ${(seed * 17) % 360}°<br><img style="width:120px;height:80px;background:#1a1a2e;border-radius:4px;" src="">`;
    }
    if (type === 'DEEP') {
      const levels = ['孔口', '10m', '20m', '30m', '40m', '50m'];
      const depth = levels[seed % levels.length];
      return `深度: ${depth}<br>位移: ${getValue(8.5)} mm<br>速度: ${getValue(0.8)} mm/d<br><img style="width:120px;height:80px;background:#1a1a2e;border-radius:4px;" src="">`;
    }
    if (type === 'RADAR') {
      return `扫描距离: ${getValue(120)} m<br>形变: ${getValue(3.2)} mm<br>监测角度: ${(seed * 13) % 90}°<br><img style="width:120px;height:80px;background:#1a1a2e;border-radius:4px;" src="">`;
    }
    if (type === 'CRACK') {
      return `裂缝宽度: ${getValue(2.5)} mm<br>扩展速率: ${getValue(0.3)} mm/d<br>累计扩展: ${getValue(18.5)} mm<br><img style="width:120px;height:80px;background:#1a1a2e;border-radius:4px;" src="">`;
    }
    if (type === 'FIRE') {
      return `温度: ${getValue(35) + 20} °C<br>升温速率: ${getValue(1.2)} °C/h<br>CO浓度: ${getValue(150)} ppm<br><img style="width:120px;height:80px;background:#1a1a2e;border-radius:4px;" src="">`;
    }
    if (type === 'WATER') {
      return `降雨量: ${getValue(25)} mm<br>降雨强度: ${getValue(8)} mm/h<br>持续时间: ${(seed % 6) + 1} h<br><img style="width:120px;height:80px;background:#1a1a2e;border-radius:4px;" src="">`;
    }
    if (type === 'GROUND') {
      return `水位: ${getValue(5.2)} m<br>水位变化: ${getValue(0.3)} m/d<br>水质等级: ${['Ⅰ类', 'Ⅱ类', 'Ⅲ类', 'Ⅳ类'][seed % 4]}<br><img style="width:120px;height:80px;background:#1a1a2e;border-radius:4px;" src="">`;
    }
    if (type === 'STRESS') {
      return `类型: ${meta.subType || '锚索应力'}<br>应力值: ${getValue(120)} MPa<br>变化率: ${getValue(2.5)} MPa/d<br><img style="width:120px;height:80px;background:#1a1a2e;border-radius:4px;" src="">`;
    }
    if (type === 'VIB') {
      return `震级: ${(getValue(0.8) * 10).toFixed(1)}<br>频率: ${getValue(50)} Hz<br>持续时间: ${getValue(2.5)} s<br><img style="width:120px;height:80px;background:#1a1a2e;border-radius:4px;" src="">`;
    }
    if (type === 'SURFACE') {
      return `裂缝长度: ${getValue(15)} m<br>裂缝宽度: ${getValue(1.8)} mm<br>走向: ${(seed * 19) % 360}°<br><img style="width:120px;height:80px;background:#1a1a2e;border-radius:4px;" src="">`;
    }
    if (type === 'SAT') {
      return `分辨率: ${['0.5m', '1m', '2m', '5m'][seed % 4]}<br>成像时间: 2026-01-${(seed % 15) + 10}<br>云量: ${(seed % 30) + 10}%<br><img style="width:120px;height:80px;background:#1a1a2e;border-radius:4px;" src="">`;
    }
    return '';
  },

  resetView() {
    this.scale = 0.6;
    this.pos = { x: -300, y: -200 };
    document.getElementById('map-canvas').style.transform = `translate(${this.pos.x}px, ${this.pos.y}px) scale(${this.scale})`;
  },

  setTime(days, target) {
    document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
    target.classList.add('active');
    this.tMultiplier = days;
  },

  applyCustomTime() {
    const start = document.getElementById('date-start').value;
    const end = document.getElementById('date-end').value;
    if (start && end) {
      const days = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
      this.tMultiplier = days || 1;
    }
  },

  toggleViewDropdown(e) {
    const dropdown = document.getElementById('map-view-dropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    e.stopPropagation();
  },

  updateMapFilters() {
    const regions = ['北帮', '南帮', '西帮', '东帮', '中央区'];
    const dropdown = document.getElementById('map-region-dropdown');
    if (dropdown) {
      dropdown.innerHTML = regions.map(r => `<div class="custom-dropdown-item"><input type="checkbox" value="${r}" checked><span>${r}</span></div>`).join('');
      dropdown.querySelectorAll('input').forEach(el => el.addEventListener('change', (e) => mapFilterModule.handleRegionChange(e.target)));
    }
  },

  focusPoint(id) {
    const p = document.getElementById(id);
    if (p) {
      const rect = p.getBoundingClientRect();
      const vp = document.getElementById('map-viewer').getBoundingClientRect();
      this.pos.x = vp.width / 2 - rect.left - rect.width / 2;
      this.pos.y = vp.height / 2 - rect.top - rect.height / 2;
      document.getElementById('map-canvas').style.transform = `translate(${this.pos.x}px, ${this.pos.y}px) scale(${this.scale})`;
    }
  }
};

const mapFilterModule = {
  visibleTypes: new Set(['GNSS', 'DEEP', 'RADAR', 'SURFACE', 'CRACK', 'FIRE', 'WATER', 'GROUND', 'STRESS', 'VIB', 'SAT']),
  selectedRegions: new Set(['北帮', '南帮', '西帮', '东帮', '中央区']),
  selectedLines: new Set(['全部', '1号线', '2号线', '3号线', '4号线', '5号线', '6号线']),
  selectedPoints: [],
  drawerOpen: false,

  toggle(type, target) {
    if (type === '全部') {
      if (this.visibleTypes.size === 11) {
        this.visibleTypes.clear();
        target.classList.add('disabled');
      } else {
        this.visibleTypes = new Set(['GNSS', 'DEEP', 'RADAR', 'SURFACE', 'CRACK', 'FIRE', 'WATER', 'GROUND', 'STRESS', 'VIB', 'SAT']);
        target.classList.remove('disabled');
      }
    } else {
      if (this.visibleTypes.has(type)) {
        this.visibleTypes.delete(type);
        target.classList.add('disabled');
      } else {
        this.visibleTypes.add(type);
        target.classList.remove('disabled');
      }
    }
    this.applyFilters();
  },

  toggleRadarCloud(e, target) {
    e.stopPropagation();
    document.querySelectorAll('.radar-cloud').forEach(c => c.style.display = c.style.display === 'block' ? 'none' : 'block');
  },

  toggleDropdown(id, e) {
    const dropdown = document.getElementById(id);
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    e.stopPropagation();
  },

  toggleDrawer() {
    this.drawerOpen = !this.drawerOpen;
    document.getElementById('device-drawer').classList.toggle('drawer-open', this.drawerOpen);
    document.getElementById('drawer-arrow').textContent = this.drawerOpen ? '▼' : '▲';
  },

  handleRegionChange(el) {
    if (el.checked) this.selectedRegions.add(el.value);
    else this.selectedRegions.delete(el.value);
    this.applyFilters();
  },

  handleLineChange(el) {
    if (el.value === '全部') {
      if (el.checked) {
        this.selectedLines = new Set(['全部', '1号线', '2号线', '3号线', '4号线', '5号线', '6号线']);
        document.querySelectorAll('#map-line-dropdown input').forEach(i => i.checked = true);
      } else {
        this.selectedLines.clear();
        document.querySelectorAll('#map-line-dropdown input').forEach(i => i.checked = false);
      }
    } else {
      if (el.checked) {
        this.selectedLines.add(el.value);
        if (this.selectedLines.size === 6) this.selectedLines.add('全部');
      } else {
        this.selectedLines.delete(el.value);
        this.selectedLines.delete('全部');
      }
    }
    this.applyFilters();
  },

  filterPointList(value) {
    const dropdown = document.getElementById('map-point-dropdown');
    const items = dropdown.querySelectorAll('.custom-dropdown-item');
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = value && !text.includes(value.toLowerCase()) ? 'none' : 'flex';
    });
  },

  handlePointInput() {
    const input = document.getElementById('map-point-input');
    const value = input.value.trim();
    if (value) {
      const point = document.querySelector(`.point-obj[data-device-id="${value}"]`);
      if (point) {
        mapModule.focusPoint(point.id);
      }
    }
    document.getElementById('map-point-dropdown').style.display = 'none';
  },

  applyFilters() {
    document.querySelectorAll('.point-obj').forEach(p => {
      const meta = mapModule.pMeta[p.id];
      const typeVisible = this.visibleTypes.has(meta.type);
      const regionVisible = this.selectedRegions.has(meta.region);
      p.style.display = (typeVisible && regionVisible) ? 'block' : 'none';
    });
  }
};

const profileModule = {
  isDrawing: false,
  isDragging: false,
  points: [],
  drawingPath: [],

  enterMode() {
    this.isDrawing = true;
    document.getElementById('draw-toolbar').style.display = 'flex';
    document.getElementById('map-viewer').style.cursor = 'crosshair';
    document.getElementById('btn-enter-profile').style.display = 'none';
  },

  exitMode() {
    this.isDrawing = false;
    this.points = [];
    this.drawingPath = [];
    document.getElementById('draw-toolbar').style.display = 'none';
    document.getElementById('map-viewer').style.cursor = 'grab';
    document.getElementById('btn-enter-profile').style.display = 'block';
    this.clearDrawing();
  },

  handlePointClick(pointId) {
    if (!this.isDrawing) return;
    const p = document.getElementById(pointId);
    if (p) {
      const rect = p.getBoundingClientRect();
      const cvRect = document.getElementById('map-canvas').getBoundingClientRect();
      this.points.push({
        id: pointId,
        x: rect.left - cvRect.left + rect.width / 2,
        y: rect.top - cvRect.top + rect.height / 2
      });
      this.updateDrawing();
    }
  },

  handleMouseDown(e) {
    if (!this.isDrawing) return;
    this.isDragging = true;
    const vp = document.getElementById('map-viewer');
    const cv = document.getElementById('map-canvas');
    const rect = vp.getBoundingClientRect();
    const cvRect = cv.getBoundingClientRect();
    const scale = mapModule.scale;
    const posX = mapModule.pos.x;
    const posY = mapModule.pos.y;
    this.drawingPath.push({
      x: (e.clientX - rect.left - posX) / scale,
      y: (e.clientY - rect.top - posY) / scale
    });
  },

  handleMouseMove(e) {
    if (!this.isDragging) return;
    const vp = document.getElementById('map-viewer');
    const cv = document.getElementById('map-canvas');
    const rect = vp.getBoundingClientRect();
    const scale = mapModule.scale;
    const posX = mapModule.pos.x;
    const posY = mapModule.pos.y;
    this.drawingPath.push({
      x: (e.clientX - rect.left - posX) / scale,
      y: (e.clientY - rect.top - posY) / scale
    });
    this.updateDrawing();
  },

  handleMouseUp() {
    this.isDragging = false;
  },

  updateDrawing() {
    const svg = document.getElementById('draw-svg');
    let pathD = '';
    if (this.points.length > 0) {
      pathD = 'M ' + this.points.map(p => `${p.x} ${p.y}`).join(' L ');
    } else if (this.drawingPath.length > 0) {
      pathD = 'M ' + this.drawingPath.map(p => `${p.x} ${p.y}`).join(' L ');
    }
    const path = svg.querySelector('path');
    if (path) {
      path.setAttribute('d', pathD);
    } else {
      svg.innerHTML = `<path d="${pathD}" stroke="#00F2FF" stroke-width="2" fill="none" stroke-dasharray="5,5"/>`;
    }
  },

  clearDrawing() {
    document.getElementById('draw-svg').innerHTML = '';
    this.drawingPath = [];
  },

  confirmDraw() {
    if (this.points.length < 2) {
      alert('请至少选择两个监测点或绘制一条剖面线');
      return;
    }
    this.showWorkbench();
    this.renderProfileChart();
  },

  showWorkbench() {
    document.getElementById('profile-workbench').style.display = 'flex';
    document.getElementById('profile-mini-trigger').style.display = 'none';
  },

  hideWorkbench() {
    document.getElementById('profile-workbench').style.display = 'none';
    document.getElementById('profile-mini-trigger').style.display = 'flex';
  },

  closeWorkbench() {
    this.hideWorkbench();
    this.exitMode();
  },

  restoreWorkbench() {
    document.getElementById('profile-workbench').style.display = 'flex';
    document.getElementById('profile-mini-trigger').style.display = 'none';
  },

  renderProfileChart() {
    const chartDom = document.getElementById('profile-chart');
    if (!chartDom) return;
    const chart = echarts.init(chartDom);
    const data = [];
    for (let i = 0; i < 20; i++) {
      data.push({
        distance: i * 50,
        elevation: 200 - i * 5 + Math.random() * 10,
        slip: Math.random() * 5
      });
    }
    const option = {
      title: { text: '地质剖面分析', left: 'center', textStyle: { color: '#1c3d90' } },
      tooltip: { trigger: 'axis' },
      legend: { data: ['高程', '滑动面'], top: 30 },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', name: '距离(m)', nameLocation: 'middle', nameGap: 30 },
      yAxis: { type: 'value', name: '高程(m)', nameLocation: 'middle', nameGap: 40 },
      series: [
        { name: '高程', type: 'line', data: data.map(d => [d.distance, d.elevation]), smooth: true, lineStyle: { color: '#1c3d90' } },
        { name: '滑动面', type: 'line', data: data.map(d => [d.distance, d.elevation - d.slip]), smooth: true, lineStyle: { color: '#F57676', type: 'dashed' } }
      ]
    };
    chart.setOption(option);
  },

  exportImage() {
    const chartDom = document.getElementById('profile-chart');
    if (!chartDom) return;
    const chart = echarts.getInstanceByDom(chartDom);
    if (chart) {
      const url = chart.getDataURL();
      const link = document.createElement('a');
      link.download = `profile_${Date.now()}.png`;
      link.href = url;
      link.click();
    }
  }
};

const dashModule = {
  focusWithRange(id) {
    mapModule.focusPoint(id);
  },

  closeOfflineModal() {
    document.getElementById('offline-modal').style.display = 'none';
  }
};

onMounted(() => {
  mapModule.init();
  window.mapModule = mapModule;
  window.mapFilterModule = mapFilterModule;
  window.profileModule = profileModule;
  window.dashModule = dashModule;
  timeUtils.updateMaxConstraints();
  window.addEventListener('resize', () => {
    const chart = echarts.getInstanceByDom(document.getElementById('profile-chart'));
    if (chart) chart.resize();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', () => {});
});
</script>

<style scoped>
.map-module {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, #0a1628 0%, #1a237e 50%, #0d47a1 100%);
}

.map-viewer {
  position: absolute;
  top: 80px;
  left: 0;
  right: 0;
  bottom: 0;
  cursor: grab;
  overflow: hidden;
}

.map-canvas {
  position: absolute;
  width: 3000px;
  height: 2500px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%231e3a5f' width='100' height='100'/%3E%3Cpath d='M0 50h100M50 0v100' stroke='%232d5a87' stroke-width='0.5' opacity='0.3'/%3E%3C/svg%3E");
  background-size: 100px 100px;
}

.map-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 55px;
  background: rgba(10, 22, 40, 0.98);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  z-index: 10;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.map-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
  outline: none;
}

.map-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.map-btn:active {
  background: rgba(255, 255, 255, 0.3);
}

.map-btn:focus {
  outline: 1px solid #85C6F1;
}

.freq-btn {
  min-width: 70px;
  text-align: center;
}

.freq-btn.active {
  background: #85C6F1;
  border-color: #85C6F1;
  color: #0a1628;
  font-weight: 600;
}

.map-btn[type="datetime-local"] {
  min-width: 160px;
  font-family: inherit;
}

.map-btn::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.custom-dropdown-content {
  display: none;
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  background: rgba(10, 22, 40, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 8px;
  z-index: 100;
  min-width: 150px;
  max-height: 300px;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.custom-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  color: #fff;
  font-size: 12px;
}

.custom-dropdown-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.point-obj {
  position: absolute;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  transition: transform 0.2s;
}

.point-obj:hover {
  transform: scale(1.3);
}

.point-bubble {
  font-size: 16px;
}

.point-id {
  font-size: 8px;
  color: #fff;
  text-shadow: 0 0 2px rgba(0,0,0,0.8);
}

.point-obj.breathe {
  animation: breathe 1.5s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

.draw-toolbar {
  display: none;
  position: absolute;
  top: 55px;
  left: 150px;
  gap: 10px;
  z-index: 20;
}

.draw-tip {
  color: #85C6F1;
  font-size: 11px;
  margin-right: 10px;
}

.drawer-comp {
  position: absolute;
  right: -200px;
  top: 100px;
  width: 200px;
  background: rgba(10, 22, 40, 0.95);
  border-radius: 8px 0 0 8px;
  transition: right 0.3s;
  z-index: 100;
}

.drawer-comp.drawer-open {
  right: 0;
}

.drawer-bar {
  position: absolute;
  left: -30px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(10, 22, 40, 0.95);
  padding: 8px 6px;
  border-radius: 8px 0 0 8px;
  color: #85C6F1;
  font-size: 11px;
  cursor: pointer;
  writing-mode: vertical-rl;
}

.drawer-icons {
  padding: 15px;
}

.filter-item {
  padding: 10px 12px;
  margin-bottom: 5px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  cursor: pointer;
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.filter-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.filter-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.filter-item.active {
  background: rgba(133, 198, 241, 0.3);
  border-color: rgba(133, 198, 241, 0.5);
  color: #85C6F1;
}

.filter-item.all-btn {
  background: rgba(133, 198, 241, 0.2);
  color: #85C6F1;
}

.map-vector-arrow {
  position: absolute;
  bottom: -50px;
  left: 50%;
  width: 2px;
  background: linear-gradient(to bottom, currentColor, transparent);
}

.modal-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  align-items: center;
  justify-content: center;
}

.offline-panel-content {
  background: #fff;
  border-radius: 8px;
  width: 800px;
  max-height: 600px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
}

.modal-close {
  cursor: pointer;
  font-size: 24px;
  color: #999;
}

.modal-table-wrapper {
  max-height: 400px;
  overflow-y: auto;
}

.dash-table {
  width: 100%;
  border-collapse: collapse;
}

.dash-table th,
.dash-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.dash-table th {
  background: #f8f9fa;
  font-weight: 600;
}

.offline-modal-footer {
  display: flex;
  justify-content: space-between;
  padding: 15px 20px;
  border-top: 1px solid #eee;
}

.profile-workbench {
  display: none;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 300px;
  background: rgba(10, 22, 40, 0.98);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  flex-direction: column;
  z-index: 50;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.profile-body {
  flex: 1;
  padding: 15px;
}

#profile-chart {
  width: 100%;
  height: 100%;
}

.profile-mini-trigger {
  display: none;
  position: absolute;
  right: 20px;
  bottom: 20px;
  width: 80px;
  height: 100px;
  background: rgba(133, 198, 241, 0.2);
  border-radius: 8px;
  cursor: pointer;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 40;
}

.tech-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tech-label {
  color: #85C6F1;
  font-size: 12px;
  margin-top: 5px;
}

.tech-sub-text {
  color: rgba(255, 255, 255, 0.5);
  font-size: 8px;
}

.tech-corner-tl,
.tech-corner-br {
  position: absolute;
  width: 10px;
  height: 10px;
  border-color: #85C6F1;
  border-style: solid;
}

.tech-corner-tl {
  top: 0;
  left: 0;
  border-width: 2px 0 0 2px;
}

.tech-corner-br {
  bottom: 0;
  right: 0;
  border-width: 0 2px 2px 0;
}

.btn-profile {
  background: linear-gradient(135deg, #85C6F1, #1c3d90);
  border: none;
  color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(133, 198, 241, 0.3);
}

.btn-profile:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(133, 198, 241, 0.4);
}

.breathing-btn {
  animation: breathe 2s ease-in-out infinite;
}

.rounded-btn {
  border-radius: 20px;
}

.rounded-circle-btn {
  border-radius: 50%;
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 60px;
  right: 20px;
  z-index: 100;
}

#map-tooltip {
  display: none;
  position: fixed;
  background: rgba(10, 22, 40, 0.98);
  border: 1px solid rgba(133, 198, 241, 0.3);
  border-radius: 8px;
  padding: 12px;
  max-width: 200px;
  z-index: 9999;
  color: #fff;
  font-size: 12px;
  pointer-events: none;
}

#draw-svg,
#connection-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>