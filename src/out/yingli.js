// 在 script.js 顶部或 mapModule 外部定义辅助函数
const timeUtils = {
    // 格式化为 YYYY-MM-DDTHH:mm
    formatISO(d) {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d - offset).toISOString().slice(0, 16);
    },
    // 限制所有时间输入框的最大值为当前时刻
    updateMaxConstraints() {
        const nowStr = this.formatISO(new Date());
        ['date-start', 'date-end', 'an-start', 'an-end'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.setAttribute('max', nowStr);
        });
    }
};


const backgroundModule = {
    init() {
        const canvas = document.getElementById('bg-canvas'),
            ctx = canvas.getContext('2d');
        let pts = [];
        const res = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', res);
        res();
        for (let i = 0; i < 90; i++) pts.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5
        });
        const drw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            pts.forEach(p1 => {
                p1.x += p1.vx;
                p1.y += p1.vy;
                if (p1.x < 0 || p1.x > canvas.width) p1.vx *= -1;
                if (p1.y < 0 || p1.y > canvas.height) p1.vy *= -1;
                ctx.beginPath();
                ctx.arc(p1.x, p1.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(133, 198, 241, 0.4)';
                ctx.fill();
                pts.forEach(p2 => {
                    let d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                    if (d < 180) {
                        ctx.strokeStyle = `rgba(133, 198, 241, ${0.12 - d / 1500})`;
                        ctx.lineWidth = 0.6;
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                });
            });
            requestAnimationFrame(drw);
        };
        drw();
    }
};

const headerModule = {
    init() {
        setInterval(() => {
            const now = new Date();
            document.getElementById('header-clock').innerText = now.toLocaleString();
        }, 1000);
    }
};


/* =========================================================
   模块：地图过滤逻辑 (修正版：修复雷达云图对应关系与离线过滤)
   ========================================================= */
const mapFilterModule = {
    isOpen: false,
    activeTypes: new Set(['STRESS']), // 初始默认
    selectedRegions: ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'],
    selectedPoints: [],
    selectedStressSubTypes: ['锚索应力', '土压力计'],
    allTypes: ['GNSS', 'DEEP', 'RADAR', 'SURFACE', 'CRACK', 'FIRE', 'WATER', 'GROUND', 'STRESS', 'VIB', 'SAT'],

init() {
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.filter-group') && !e.target.closest('.custom-dropdown-content')) {
            document.querySelectorAll('.custom-dropdown-content').forEach(d => d.style.display = 'none');
        }
    });

    // 【核心修复】：页面加载时，默认勾选当前所有应力监测点
const allStressIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'STRESS');
    this.selectedPoints = [...allStressIds];

    this.syncUI();
},

    // 核心同步逻辑：管理所有点位的显隐
    syncUI() {
        this.renderRegions();
        this.renderPoints('');
        this.renderStressSubTypes();
        this.updateLabels();
        this.updateDrawerStyles();

        const isFullRegion = this.selectedRegions.includes('全部');
        const hasSpecificPointSelected = this.selectedPoints.length > 0;

        document.querySelectorAll('.point-obj').forEach(p => {
            const meta = mapModule.pMeta[p.id];
            if (!meta) return;

            const isTypeActive = this.activeTypes.has(meta.type); // 抽屉大类开关
// 针对雷达采用对向监测逻辑判定
let isRegionMatch = false;
if (meta.type === 'RADAR') {
    // 雷达：判断其“照射目标”是否在选中区域内
    isRegionMatch = isFullRegion || this.selectedRegions.includes(meta.targetRegion);
} else {
    // 其他设备：判断其“物理位置”是否在选中区域内
    isRegionMatch = isFullRegion || this.selectedRegions.includes(meta.region);
};

            let isFinalShow = false;

            if (meta.type === 'STRESS') {
                const isSubMatch = this.selectedStressSubTypes.includes(meta.subType);
                if (hasSpecificPointSelected) {
                    isFinalShow = isTypeActive && isSubMatch && this.selectedPoints.includes(p.id);
                } else {
                    isFinalShow = isTypeActive && isSubMatch && isRegionMatch;
                }
            } else {
                // 非应力点位（如雷达、GNSS）：受大类和区域共同控制
                isFinalShow = isTypeActive && isRegionMatch;
            }

            if (isFinalShow) {
                p.style.display = 'block';
                if (meta.isOnline && meta.alarmIdx === 0) p.classList.add('point-glow-active');
            } else {
                p.style.display = 'none';
                p.classList.remove('point-glow-active');
            }
        });

        // 雷达云图联动：仅当雷达大类开启且点击了“+”号时渲染
        const radarBtn = document.querySelector('.filter-item[onclick*="RADAR"] .radar-plus');
        if (this.activeTypes.has('RADAR') && radarBtn?.classList.contains('cloud-active')) {
            this.renderRadarClouds();
        } else {
            this.removeRadarClouds();
        }
    },

    // 修正后的雷达云图渲染函数
    renderRadarClouds() {
        this.removeRadarClouds();
        const canvas = document.getElementById('map-canvas');
        if (!canvas) return;

        const radarPoints = document.querySelectorAll('.point-obj.type-RADAR');

        radarPoints.forEach(p => {
            const meta = mapModule.pMeta[p.id];
            if (!meta) return;

            // 修正 1：如果点位因为区域筛选被隐藏，则不渲染云图
            if (p.style.display === 'none') return;

            // 修正 2：离线（灰色）设备不显示云图
            if (!meta.isOnline) return;

            // 创建扇面层
            const fan = document.createElement('div');
            fan.className = 'radar-fan-layer';
            // 居中定位计算
            fan.style.left = (parseFloat(p.style.left) + 16 - 1400) + 'px';
            fan.style.top = (parseFloat(p.style.top) + 16 - 2800) + 'px';

            // 根据雷达所属区域确定照射中心点
            const targetPos = {
                '北帮': {x:1500, y:2100},
                '南帮': {x:1500, y:400},
                '东帮': {x:450, y:1250},
                '西帮': {x:2550, y:1250},
                '中央区': {x:1500, y:1250}
            }[meta.region];

            if (targetPos) {
                const dx = targetPos.x - parseFloat(p.style.left);
                const dy = targetPos.y - parseFloat(p.style.top);
                // 计算旋转角度：将扇面指向目标区域坐标
                let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                fan.style.transform = `rotate(${angle}deg)`;
                canvas.appendChild(fan);
            }
        });
    },

    removeRadarClouds() {
        document.querySelectorAll('.radar-fan-layer').forEach(el => el.remove());
    },

    handleRegionChange(cb) {
        const val = cb.value;
        const all = ['北帮', '南帮', '东帮', '西帮', '中央区'];
        if (val === '全部') {
            this.selectedRegions = cb.checked ? ['全部', ...all] : [];
        } else {
            if (cb.checked) {
                if (!this.selectedRegions.includes(val)) this.selectedRegions.push(val);
                if (this.selectedRegions.filter(r => r !== '全部').length === 5) this.selectedRegions.push('全部');
            } else {
                this.selectedRegions = this.selectedRegions.filter(r => r !== val && r !== '全部');
            }
        }
        this.selectedPoints = [];
        this.syncUI();
    },

    handlePointChange(cb) {
        const val = cb.value;
        const currentList = this.getDisplayPoints('').map(p => p.id);
        if (val === '全部') {
            if (cb.checked) {
                currentList.forEach(id => { if (!this.selectedPoints.includes(id)) this.selectedPoints.push(id); });
            } else {
                this.selectedPoints = this.selectedPoints.filter(id => !currentList.includes(id));
            }
        } else {
            if (cb.checked) {
                if (!this.selectedPoints.includes(val)) this.selectedPoints.push(val);
            } else {
                this.selectedPoints = this.selectedPoints.filter(id => id !== val);
            }
        }
        this.syncUI();
    },

    getDisplayPoints(filterVal = '') {
        return Object.keys(mapModule.pMeta).filter(id => {
            const m = mapModule.pMeta[id];
            const isStressType = m.type === 'STRESS';
            const isSubMatch = this.selectedStressSubTypes.includes(m.subType);
            const isRegionMatch = this.selectedRegions.includes('全部') || this.selectedRegions.includes(m.region);
            const isSearchMatch = m.deviceId.includes(filterVal);
            return isStressType && isSubMatch && isRegionMatch && isSearchMatch;
        }).map(id => ({ id, ...mapModule.pMeta[id] }));
    },

    renderPoints(filterVal = '') {
        const container = document.getElementById('map-point-dropdown');
        if (!container) return;
        const list = this.getDisplayPoints(filterVal);
        const isAll = list.length > 0 && list.every(p => this.selectedPoints.includes(p.id));
        let html = `<div class="custom-dropdown-item" onclick="mapFilterModule.handleItemClick(this, event, 'point')">
            <input type="checkbox" value="全部" ${isAll ? 'checked' : ''}><span class="all-select-text">全部</span></div>`;
        html += list.map(p => `
            <div class="custom-dropdown-item" onclick="mapFilterModule.handleItemClick(this, event, 'point')">
                <input type="checkbox" value="${p.id}" ${this.selectedPoints.includes(p.id) ? 'checked' : ''}>
                <span>${p.deviceId} <small>(${p.region})</small></span>
            </div>`).join('');
        container.innerHTML = list.length ? html : '<div style="padding:10px;color:#999;text-align:center">无匹配点</div>';
    },

    toggleDrawer() { this.isOpen = !this.isOpen; document.getElementById('device-drawer').classList.toggle('active', this.isOpen); document.getElementById('drawer-arrow').innerText = this.isOpen ? '▼' : '▲'; },
    toggleDropdown(id, e) { if (e) e.stopPropagation(); const el = document.getElementById(id); if (!el) return; const isShow = el.style.display === 'block'; document.querySelectorAll('.custom-dropdown-content').forEach(d => d.style.display = 'none'); if (!isShow) el.style.display = 'block'; },
    handleItemClick(el, event, type) { if (event) event.stopPropagation(); const cb = el.querySelector('input[type="checkbox"]'); if (cb) { cb.checked = !cb.checked; if (type === 'region') this.handleRegionChange(cb); else if (type === 'point') this.handlePointChange(cb); } },
    updateLabels() {
        const regLabel = document.getElementById('map-region-label');
        if (regLabel) { const active = this.selectedRegions.filter(r => r !== '全部'); regLabel.innerText = (this.selectedRegions.includes('全部') && active.length >= 5) ? '全部区域' : (this.formatLabel(active) || '选择区域'); }
const input = document.getElementById('map-point-input');
    if (input && document.activeElement !== input) {
        // 判断是否为全选状态
        const allStressCount = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'STRESS').length;

        if (this.selectedPoints.length > 0 && this.selectedPoints.length === allStressCount) {
            input.value = "全部应力点"; // 【核心修复】：全选时显示简洁文字
        } else {
            const names = this.selectedPoints.map(id => mapModule.pMeta[id]?.deviceId || id);
            input.value = names.join('、');
        }
    }
        },
    formatLabel(list) { if (!list || list.length === 0) return null; return list.length <= 2 ? list.join('、') : list.slice(0, 2).join('、') + '...'; },
    renderRegions() { const container = document.getElementById('map-region-dropdown'); if (!container) return; const regions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区']; container.innerHTML = regions.map(reg => `<div class="custom-dropdown-item" onclick="mapFilterModule.handleItemClick(this, event, 'region')"><input type="checkbox" value="${reg}" ${this.selectedRegions.includes(reg) ? 'checked' : ''}><span>${reg}</span></div>`).join(''); },
    toggle(type, el) { if (type === '全部') { if (this.activeTypes.size === this.allTypes.length) this.activeTypes.clear(); else this.allTypes.forEach(t => this.activeTypes.add(t)); } else { this.activeTypes.has(type) ? this.activeTypes.delete(type) : this.activeTypes.add(type); } this.syncUI(); },
    updateDrawerStyles() { document.querySelectorAll('.filter-item').forEach(item => { const onClickAttr = item.getAttribute('onclick') || ''; const match = onClickAttr.match(/'([^']+)'/); if (match) { const typeKey = match[1]; const isActive = (typeKey === '全部') ? (this.activeTypes.size === this.allTypes.length) : this.activeTypes.has(typeKey); item.classList.toggle('checked', isActive); } }); },
    toggleRadarCloud(event, el) { if (event) event.stopPropagation(); if (!this.activeTypes.has('RADAR')) return; el.classList.toggle('cloud-active'); this.syncUI(); },
    renderStressSubTypes() { const container = document.getElementById('map-stress-sub-dropdown'); if (!container) return; const all = ['锚索应力', '土压力计']; const isAll = this.selectedStressSubTypes.length === all.length; let html = `<div class="custom-dropdown-item" onclick="mapFilterModule.handleStressSubClick(this, event, '全部')"><input type="checkbox" ${isAll ? 'checked' : ''}><span class="all-select-text">全部类型</span></div><hr style="margin:4px 8px; border:0; border-top:1px solid #f0f0f0;">`; html += all.map(t => `<div class="custom-dropdown-item" onclick="mapFilterModule.handleStressSubClick(this, event, '${t}')"><input type="checkbox" ${this.selectedStressSubTypes.includes(t) ? 'checked' : ''}><span>${t}</span></div>`).join(''); container.innerHTML = html; const label = document.getElementById('map-stress-sub-label'); if (label) label.innerText = isAll ? '全部类型' : (this.selectedStressSubTypes.join('、') || '选择类型'); },
    handleStressSubClick(el, event, val) { if (event) event.stopPropagation(); const all = ['锚索应力', '土压力计']; if (val === '全部') this.selectedStressSubTypes = (this.selectedStressSubTypes.length === all.length) ? [] : [...all]; else { if (this.selectedStressSubTypes.includes(val)) this.selectedStressSubTypes = this.selectedStressSubTypes.filter(t => t !== val); else this.selectedStressSubTypes.push(val); } this.syncUI(); },
    renderSatLayer() { this.removeSatLayer(); const overlay = document.createElement('div'); overlay.className = 'sat-green-overlay'; overlay.id = 'sat-overlay'; document.getElementById('map-canvas').appendChild(overlay); },
    removeSatLayer() { const el = document.getElementById('sat-overlay'); if (el) el.remove(); }
};

const profileModule = {
    isDrawing: false,
    selectedPoints: [],
    isDragging: false,
    dragLine: { start: null, end: null },
    chartInstance: null,

    lastSavedOptions: null,  // 永久缓存：上一次保存并收起后的历史曲线
    currentOptions: null,    // 临时缓存：本次刚刚生成、尚未执行保存的曲线（最新窗口）
    isViewingHistory: false, // 状态位：标识当前面板是否处于“历史查看”模式

    // 1. 进入作图模式
    enterMode() {
        this.isDrawing = true;
        this.selectedPoints = [];
        this.dragLine = { start: null, end: null };
        document.getElementById('draw-toolbar').style.display = 'flex';
        document.getElementById('btn-enter-profile').style.display = 'none';
        document.getElementById('map-viewer').style.cursor = 'crosshair';
        this.resetDrawingData();
    },

    // 2. 彻底退出绘制模式（修复点：必须将实例设为 null）
    exitMode() {
        this.isDrawing = false;
        if (this.chartInstance) {
            this.chartInstance.dispose();
            this.chartInstance = null; // 关键：设为 null 以便下次重新 init
        }
        document.getElementById('draw-toolbar').style.display = 'none';
        document.getElementById('profile-mini-trigger').style.display = 'none';
        document.getElementById('btn-enter-profile').style.display = 'block';
        document.getElementById('map-viewer').style.cursor = 'grab';
        this.currentOptions = null;
        this.lastSavedOptions = null;
        this.resetDrawingData();
    },

    // 3. 确定生成：生成本次最新曲线
// 请替换 profileModule 中的 confirmDraw 函数
confirmDraw() {
    let startPos, endPos;
    // 1. 获取坐标逻辑
    if (this.selectedPoints.length >= 2) {
        const pStart = document.getElementById(this.selectedPoints[0]);
        const pEnd = document.getElementById(this.selectedPoints[this.selectedPoints.length - 1]);
        startPos = { x: parseFloat(pStart.style.left), y: parseFloat(pStart.style.top) };
        endPos = { x: parseFloat(pEnd.style.left), y: parseFloat(pEnd.style.top) };
    } else if (this.dragLine.start && this.dragLine.end) {
        startPos = this.dragLine.start; endPos = this.dragLine.end;
    } else {
        alert("请选择监测点或按住Ctrl划线以生成剖面");
        return;
    }

    // 2. 生成并更新本次“最新”数据缓存
    this.currentOptions = this.generateChartOptions(startPos, endPos);
    this.isViewingHistory = false; // 初始进入时显示最新曲线

    // 3. 显示图表工作台
    document.getElementById('profile-workbench').style.display = 'flex';

    // 4. 【关键逻辑修复】：只要存在历史记录，在绘制新曲线的同时，必须显示对比小方窗
    const miniTrigger = document.getElementById('profile-mini-trigger');
    if (this.lastSavedOptions) {
        miniTrigger.style.display = 'flex'; // 强制显示，以便用户随时切换回历史
    } else {
        miniTrigger.style.display = 'none';
    }

    this.updateWorkbenchUI();
},

    // 5. 核心拦截逻辑：处理工作台内“保存/隐藏”按钮点击
    hideWorkbench() {
        // 如果当前正在看历史记录，点击隐藏即“返回最新曲线展示窗口”
        if (this.isViewingHistory) {
            this.isViewingHistory = false;
            this.updateWorkbenchUI();
            return; // 拦截动作，不执行后续关闭逻辑
        }

        // 只有在显示“最新曲线”时点击，才执行保存并真正关闭窗口
        if (this.currentOptions) {
            this.lastSavedOptions = JSON.parse(JSON.stringify(this.currentOptions));
            this.currentOptions = null;
        }

        document.getElementById('profile-workbench').style.display = 'none';
        document.getElementById('profile-mini-trigger').style.display = 'flex';
        this.resetDrawingData(); // 清理地图连线
    },
restoreWorkbench() {
    // 逻辑：点击小窗切换到“历史查看模式”
    if (!this.lastSavedOptions) return;

    this.isViewingHistory = true;

    // 确保工作台是开启的
    document.getElementById('profile-workbench').style.display = 'flex';

    // 切换后，小窗依然保持显示（或者您希望切换后小窗变色提示，可在此处理）
    // 这里我们保持它显示，让用户可以再点“返回最新”
    this.updateWorkbenchUI();
},
    // 6. UI 更新中心：负责渲染图表、切换按钮文案和标签颜色
    updateWorkbenchUI() {
        const targetOptions = this.isViewingHistory ? this.lastSavedOptions : this.currentOptions;
        const saveBtn = document.querySelector('#profile-workbench button[onclick*="hideWorkbench"]');
        const tag = document.getElementById('profile-tag');

        if (!targetOptions) return;

        // 如果实例不存在或已被销毁，重新初始化
        if (!this.chartInstance) {
            this.chartInstance = echarts.init(document.getElementById('profile-chart'));
        }
        // 使用 notMerge=true 确保数据完全替换
        this.chartInstance.setOption(targetOptions, true);
        this.chartInstance.resize();

        // 根据模式切换状态引导
        if (this.isViewingHistory) {
            if (saveBtn) saveBtn.innerText = "返回最新曲线";
            if (tag) tag.innerText = "历史记录对比模式";
            tag.style.background = "#ffa500"; // 橙色标识历史
        } else {
            if (saveBtn) saveBtn.innerText = "保存并收起";
            if (tag) tag.innerText = "最新绘制曲线窗口";
            tag.style.background = "#71C446"; // 绿色标识当前
        }
    },

    // 数据生成逻辑（整合了你代码中的地质特征算法）
    generateChartOptions(start, end) {
        const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        const seed = (Math.abs(start.x + start.y - end.x - end.y) % 100) / 100;
        const terrainData = [], slidingData = [];
        const baseH = 1200 + (seed * 80);
        const slope = (end.y - start.y) / 5;

        for (let i = 0; i < 6; i++) {
            const ratio = i / 5;
            const h = baseH - (slope * ratio) + (Math.sin(ratio * Math.PI + seed * 10) * 20);
            terrainData.push(h.toFixed(1));
            const depth = 25 + (seed * 40) * Math.sin(ratio * Math.PI);
            slidingData.push((h - depth).toFixed(1));
        }

        return {
            title: { text: `剖面结构分析 (${Math.round(distance)}m)`, left: 'center', textStyle: { color: '#1c3d90', fontSize: 14 } },
            tooltip: { trigger: 'axis' },
            legend: { data: ['地表线', '预估滑动面'], bottom: 10 },
            grid: { top: 60, bottom: 80, left: 60, right: 40 },
            xAxis: { type: 'category', data: ['起', '20%', '40%', '60%', '80%', '终'], boundaryGap: false },
            yAxis: { type: 'value', name: '高程(m)', min: v => Math.floor(v.min / 10) * 10 - 20 },
            series: [
                { name: '地表线', data: terrainData, type: 'line', smooth: true, areaStyle: { color: 'rgba(133, 198, 241, 0.3)' }, lineStyle: { color: '#1c3d90', width: 3 } },
                { name: '预估滑动面', data: slidingData, type: 'line', smooth: true, lineStyle: { type: 'dashed', color: '#F57676', width: 2 } }
            ]
        };
    },

    // --- 其他交互辅助函数 ---
    closeWorkbench() {
        this.exitMode();
        document.getElementById('profile-workbench').style.display = 'none';
    },

    resetDrawingData() {
        this.selectedPoints = [];
        this.dragLine = { start: null, end: null };
        document.querySelectorAll('.point-obj').forEach(p => p.classList.remove('selected'));
        this.renderLines();
    },

    handlePointClick(id) {
        if (!this.isDrawing || this.dragLine.start) return;
        const idx = this.selectedPoints.indexOf(id);
        if (idx > -1) {
            this.selectedPoints.splice(idx, 1);
            document.getElementById(id).classList.remove('selected');
        } else {
            this.selectedPoints.push(id);
            document.getElementById(id).classList.add('selected');
        }
        this.renderLines();
    },

    handleMouseDown(e) {
        if (!this.isDrawing || !e.ctrlKey) return;
        const r = document.getElementById('map-canvas').getBoundingClientRect();
        this.isDragging = true;
        this.dragLine.start = { x: (e.clientX - r.left) / mapModule.scale, y: (e.clientY - r.top) / mapModule.scale };
        e.preventDefault();
    },

    handleMouseMove(e) {
        if (!this.isDrawing || !this.isDragging) return;
        const r = document.getElementById('map-canvas').getBoundingClientRect();
        this.dragLine.end = { x: (e.clientX - r.left) / mapModule.scale, y: (e.clientY - r.top) / mapModule.scale };
        this.renderLines();
    },

    handleMouseUp() { if (this.isDragging) this.isDragging = false; },

    renderLines() {
        const svg = document.getElementById('draw-svg');
        if(!svg) return;
        svg.innerHTML = '';
        if (this.selectedPoints.length >= 2) {
            let pathStr = "";
            this.selectedPoints.forEach((pid, i) => {
                const el = document.getElementById(pid);
                const px = parseFloat(el.style.left) + 16, py = parseFloat(el.style.top) + 16;
                pathStr += (i === 0 ? 'M' : 'L') + `${px} ${py}`;
            });
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathStr);
            path.setAttribute("stroke", "rgba(113, 196, 70, 0.8)");
            path.setAttribute("stroke-width", "4");
            path.setAttribute("fill", "none");
            path.setAttribute("stroke-dasharray", "8,8");
            svg.appendChild(path);
        }
        if (this.dragLine.start && this.dragLine.end) {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", this.dragLine.start.x); line.setAttribute("y1", this.dragLine.start.y);
            line.setAttribute("x2", this.dragLine.end.x); line.setAttribute("y2", this.dragLine.end.y);
            line.setAttribute("stroke", "#F57676"); line.setAttribute("stroke-width", "6");
            svg.appendChild(line);
        }
    },

    exportImage() {
        if (!this.chartInstance) return;
        const link = document.createElement('a');
        link.href = this.chartInstance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
        link.download = `剖面分析_${Date.now()}.png`;
        link.click();
    }
};

const mapModule = {
    scale: 0.6,
    pos: {
        x: -300,
        y: -200
    },
    tMultiplier: 1,
    isDetailMode: false,
    pMeta: {},
    selectedMapTypes: ['geology'],

    init() {
        const vp = document.getElementById('map-viewer'),
            cv = document.getElementById('map-canvas');
        const upd = () => cv.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px) scale(${this.scale})`;
        vp.onwheel = (e) => {
            e.preventDefault();
            const ns = Math.min(Math.max(0.2, this.scale + (e.deltaY * -0.0012)), 3.5);
            const r = vp.getBoundingClientRect(),
                mx = e.clientX - r.left,
                my = e.clientY - r.top,
                ratio = ns / this.scale;
            this.pos.x = mx - (mx - this.pos.x) * ratio;
            this.pos.y = my - (my - this.pos.y) * ratio;
            this.scale = ns;
            upd();
        };
        let drg = false,
            sx, sy;
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
        window.onmousemove = (e) => {
            if (profileModule.isDrawing && profileModule.isDragging) {
                profileModule.handleMouseMove(e);
                return;
            }
            if (drg) {
                this.pos.x = e.clientX - sx;
                this.pos.y = e.clientY - sy;
                upd();
            }
        };
        window.onmouseup = () => {
            if (profileModule.isDrawing && profileModule.isDragging) {
                profileModule.handleMouseUp();
            }
            drg = false;
            vp.style.cursor = profileModule.isDrawing ? 'crosshair' : 'grab';
        };
        this.spawnPoints();
        this.updateMapFilters();
        upd();
        window.addEventListener('click', (e) => {
            const dropdown = document.getElementById('map-view-dropdown');
            const btn = document.getElementById('map-view-btn');
            if (dropdown && !dropdown.contains(e.target) && e.target !== btn) {
                dropdown.style.display = 'none';
            }
        });
    },

// 修改 script.js 中的 mapModule.setTime 函数
setTime(days, btn) {
    // 1. 切换按钮高亮（蓝色）
    document.querySelectorAll('#time-engine-bar .freq-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const now = new Date();
    let start = new Date();

    // 2. 核心修改：无论是 1、7 还是 30 天，初始时间统一为对应日期的 0 点
    start.setDate(now.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const startInp = document.getElementById('date-start');
    const endInp = document.getElementById('date-end');

    const format = (d) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d - offset).toISOString().slice(0, 16);
    };

    if (startInp) startInp.value = format(start);
    if (endInp) endInp.value = format(now);

    this.tMultiplier = (now - start) / (24 * 3600000);
    this.triggerFlash();
},

// 修改 script.js 中的 mapModule.applyCustomTime
applyCustomTime() {
    const sInp = document.getElementById('date-start');
    const eInp = document.getElementById('date-end');
    if (!sInp.value || !eInp.value) return;

    const start = new Date(sInp.value);
    const end = new Date(eInp.value);
    const now = new Date();

    // 校验 1 & 2：不得晚于现在
    if (start > now || end > now) {
        alert("初始或终止时间不得晚于当前时刻");
        this.setTime(1, document.querySelector('#time-engine-bar .freq-btn')); // 自动回退到一天内
        return;
    }

    // 校验 3：初始不得等于终止
    if (start.getTime() === end.getTime()) {
        alert("初始时间与终止时间不得相同");
        return;
    }

    // 逻辑修正：若初始晚于终止，自动交换（增强容错）
    if (start > end) {
        alert("初始时间不得晚于终止时间");
        return;
    }

    this.tMultiplier = (end - start) / (24 * 3600000);
    document.querySelectorAll('#time-engine-bar .freq-btn').forEach(b => b.classList.remove('active'));
    this.triggerFlash();
},

    toggleViewDropdown(e) {
        e.stopPropagation();
        const el = document.getElementById('map-view-dropdown');
        const isShow = el.style.display === 'block';
        document.querySelectorAll('.custom-dropdown-content').forEach(d => d.style.display = 'none');
        el.style.display = isShow ? 'none' : 'block';
        if (!isShow) this.renderViewDropdown();
    },

renderViewDropdown() {
    const options = [
        { id: 'geology', label: '地质模型' },
        { id: 'dtm', label: 'DTM面' },
        { id: 'uav', label: '无人机地图' }
    ];
    const container = document.getElementById('map-view-dropdown');
    if (!container) return;

    // 判断是否所有项都已选中
    const isAllChecked = options.every(opt => this.selectedMapTypes.includes(opt.id));

    // 1. 先生成“全部选择”项（置于最上方）
    let html = `
        <div class="custom-dropdown-item" onclick="if(event.target.tagName !== 'INPUT') this.querySelector('input').click(); event.stopPropagation();">
            <input type="checkbox" value="all" ${isAllChecked ? 'checked' : ''}
                   onchange="mapModule.handleViewTypeChange(this); event.stopPropagation();">
            <span class="all-select-text">全部选择</span>
        </div>
        <hr style="margin: 4px 8px; border: 0; border-top: 1px solid #f0f0f0;">
    `;

    // 2. 生成具体模型选项
    html += options.map(opt => `
        <div class="custom-dropdown-item" onclick="if(event.target.tagName !== 'INPUT') this.querySelector('input').click(); event.stopPropagation();">
            <input type="checkbox" value="${opt.id}" ${this.selectedMapTypes.includes(opt.id) ? 'checked' : ''}
                   onchange="mapModule.handleViewTypeChange(this); event.stopPropagation();">
            <span>${opt.label}</span>
        </div>
    `).join('');

    container.innerHTML = html;
},

handleViewTypeChange(cb) {
    const allOptions = ['geology', 'dtm', 'uav'];

    if (cb.value === 'all') {
        // 全选逻辑
        if (cb.checked) {
            this.selectedMapTypes = [...allOptions];
        } else {
            this.selectedMapTypes = [];
        }
    } else {
        // 单选逻辑
        if (cb.checked) {
            if (!this.selectedMapTypes.includes(cb.value)) this.selectedMapTypes.push(cb.value);
        } else {
            this.selectedMapTypes = this.selectedMapTypes.filter(t => t !== cb.value);
        }
    }

    this.updateMapFilters();
    this.renderViewDropdown(); // 重新渲染以同步全选框状态
},

    updateMapFilters() {
        this.triggerFlash();
        const canvas = document.getElementById('map-canvas');
        const labelEl = document.getElementById('map-view-label');
        const labels = { geology: '地质模型', dtm: 'DTM面', uav: '无人机地图' };
        if (this.selectedMapTypes.length === 0) {
            labelEl.innerText = "请选择模型";
        } else {
            const firstLabel = labels[this.selectedMapTypes[0]];
            labelEl.innerText = firstLabel + (this.selectedMapTypes.length > 1 ? "..." : "");
        }
        let combinedFilter = "";
        if (this.selectedMapTypes.includes('uav')) combinedFilter += 'saturate(1.5) contrast(1.2) ';
        canvas.style.filter = combinedFilter.trim() || 'none';
    },

    triggerFlash() {
        const section = document.getElementById('main-map-section');
        if (!section) return;
        section.classList.remove('section-flash-active');
        void section.offsetWidth;
        section.classList.add('section-flash-active');
    },


/* --- 替换 script.js 中的 mapModule.spawnPoints --- */
spawnPoints() {
    const cv = document.getElementById('map-canvas');
    const icons = { 'GNSS': '📍', 'DEEP': '⚓', 'RADAR': '📡', 'SURFACE': '📐', 'CRACK': '🧱', 'FIRE': '🔥', 'WATER': '💧', 'GROUND': '🌍', 'STRESS': '📊', 'VIB': '💥', 'SAT': '🛸' };
    const types = Object.keys(icons);
    const regionDefinitions = [{ name: '北帮', xRange: [800, 2200], yRange: [200, 600] }, { name: '南帮', xRange: [800, 2200], yRange: [1900, 2300] }, { name: '西帮', xRange: [200, 700], yRange: [800, 1700] }, { name: '东帮', xRange: [2300, 2800], yRange: [800, 1700] }, { name: '中央区', xRange: [1100, 1900], yRange: [1000, 1500] }];
    const placedPoints = [];
    const minDist = 60;

    // 子类型计数器
    let anchorCount = 1;
    let earthCount = 1;

    for (let i = 0; i < 150; i++) {
        let type = types[i % types.length];
        if (i < 7) type = 'RADAR';
        else if (type === 'RADAR') type = 'GNSS';

        const regDef = regionDefinitions[i % regionDefinitions.length];
        let posX, posY, attempts = 0;
        while (attempts < 100) {
            const testX = regDef.xRange[0] + Math.random() * (regDef.xRange[1] - regDef.xRange[0]);
            const testY = regDef.yRange[0] + Math.random() * (regDef.yRange[1] - regDef.yRange[0]);
            let overlapping = placedPoints.some(p => Math.hypot(testX - p.x, testY - p.y) < minDist);
            if (!overlapping) { posX = testX; posY = testY; break; }
            attempts++;
        }
        placedPoints.push({ x: posX, y: posY });

        // 处理应力监测子类型
        let deviceId = `${type}${i}`;
        let subType = null;
        // 【关键新增】：雷达对向监测逻辑
                // 逻辑：安装在南边的看北边，安装在东边的看西边
                let targetRegion = regDef.name;
                if (type === 'RADAR') {
                    const crossMap = { '北帮': '南帮', '南帮': '北帮', '东帮': '西帮', '西帮': '东帮', '中央区': '中央区' };
                    targetRegion = crossMap[regDef.name];
                }

        if (type === 'STRESS') {
            if (i % 2 === 0) {
                subType = '锚索应力';
                deviceId = `锚索应力${anchorCount++}`;
            } else {
                subType = '土压力计';
                deviceId = `土压力计${earthCount++}`;
            }
        }

        const p = document.createElement('div');
        p.id = `pt-${i}`;
        let alarmIdx = (i * 7) % 5;
        const isOnline = (i % 8 !== 0);

        p.className = `point-obj type-${type} ${(isOnline && alarmIdx === 0) ? 'breathe' : ''}`;
        p.style.left = posX + 'px';
        p.style.top = posY + 'px';
        const colors = ['#F57676', '#FFA500', '#fadb14', '#66B1FF', '#71C446'];
        const targetColor = isOnline ? colors[alarmIdx] : '#999';
        p.style.backgroundColor = targetColor;
        p.style.color = targetColor;

// 将计算出的 targetRegion 存入元数据
this.pMeta[p.id] = {
    id: p.id,
    type,
    subType,
    alarmIdx,
    isOnline,
    deviceId,
    region: regDef.name,
    targetRegion: targetRegion // 关键：保存照射目标区域
};

        p.innerHTML = `<div class="point-bubble"><span>${icons[type]}</span></div><div class="point-id">${deviceId}</div>`;

        p.onclick = (e) => {
            if (profileModule.isDrawing) { e.stopPropagation(); profileModule.handlePointClick(p.id); }
            else if (isOnline && (type === 'GNSS' || type === 'STRESS')) { dashModule.focusWithRange(p.id); analysisModule.open(this.pMeta[p.id]); }
        };

        // 【核心修复】鼠标悬浮交互：弹出数据标签
                p.onmouseover = (e) => {
                    const tooltip = document.getElementById('map-tooltip');
                    if (!tooltip) return;
                    tooltip.style.display = 'block';
                    const statusText = isOnline ? `<span style="color:#71C446">● 在线</span>` : `<span style="color:#999">● 离线</span>`;
                    tooltip.innerHTML = `
                        <div style="border-bottom:1px solid #1c3d90; margin-bottom:5px; padding-bottom:3px; font-weight:bold; display:flex; justify-content:space-between;">
                            <span>${deviceId}</span> ${statusText}
                        </div>
                        <div>${this.getTechData(type, p.id)}</div>
                    `;
                };
                p.onmousemove = (e) => {
                    const tooltip = document.getElementById('map-tooltip');
                    if (tooltip) {
                        tooltip.style.left = (e.clientX + 15) + 'px';
                        tooltip.style.top = (e.clientY + 15) + 'px';
                    }
                };
                p.onmouseout = () => {
                    const tooltip = document.getElementById('map-tooltip');
                    if (tooltip) tooltip.style.display = 'none';
                };

        cv.appendChild(p);
    }
},
    focus(type) {
        const vp = document.getElementById('map-viewer'), cv = document.getElementById('map-canvas');
        const pts = Array.from(document.querySelectorAll(`.type-${type}`)).filter(p => p.style.display !== 'none');
        if (!pts.length) return;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        pts.forEach(p => {
            const x = parseFloat(p.style.left), y = parseFloat(p.style.top);
            minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        });
        const padding = 150;
        const groupW = (maxX - minX) || 100, groupH = (maxY - minY) || 100;
        const scaleX = (vp.clientWidth * 0.8) / (groupW + padding), scaleY = (vp.clientHeight * 0.8) / (groupH + padding);
        this.scale = Math.min(scaleX, scaleY, 1.0); this.scale = Math.max(this.scale, 0.2);
        const centerX = minX + (maxX - minX) / 2; const centerY = minY + (maxY - minY) / 2;
        this.pos.x = (vp.clientWidth / 2) - (centerX * this.scale); this.pos.y = (vp.clientHeight / 2) - (centerY * this.scale);
        cv.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px) scale(${this.scale})`;
    },

    toggleDrawer() { document.getElementById('device-drawer').classList.toggle('active'); },

/* --- 替换整个 mapModule.getTechData --- */
getTechData(type, id) {
    const meta = this.pMeta[id];
    if (!meta) return "无数据";

    const seed = parseInt(id.replace('pt-', '')) || 0;
    const variance = (seed % 10) * 0.1;
    let baseVal = [8.1, 5.1, 4.1, 3.1, 0.5][meta.alarmIdx] + variance;

    // 针对不同类型的浮窗文字模板
    const specs = {
'STRESS': `
    <div style="display:grid; grid-template-columns: 80px 1fr; gap:2px; font-size:11px;">
        <span>Value:</span><b style="color:#fadb14">${baseVal.toFixed(2)} kPa</b>
        <span>Rate:</span><span>${(variance * 2).toFixed(2)} kPa/d</span>
        <span>Region:</span><span>${meta.region}</span>
        <span>Type:</span><span>${meta.subType || 'Stress'}</span>
    </div>`,
            'GNSS': `
            <div style="display:grid; grid-template-columns: 80px 1fr; gap:2px; font-size:11px;">
                <span>累计形变:</span><b style="color:#66B1FF">${(baseVal * 12).toFixed(2)} mm</b>
                <span>当前速变:</span><span>${baseVal.toFixed(2)} mm/h</span>
                <span>解算精度:</span><span style="color:#71C446">±2.4mm</span>
            </div>`,
        'RADAR': `
            <div style="display:grid; grid-template-columns: 80px 1fr; gap:2px; font-size:11px;">
                <span>视在位移:</span><b>${baseVal.toFixed(2)} mm</b>
                <span>照射目标:</span><span>${meta.targetRegion}</span>
                <span>相干系数:</span><span>0.982</span>
            </div>`
    };

    return specs[type] || `
        <div style="font-size:11px;">
            区域位置: ${meta.region}<br>
            设备状态: ${meta.isOnline ? '正常运行' : '通讯异常'}<br>
            实时数据: ${(baseVal * 0.8).toFixed(2)}
        </div>`;
}
};

const dashModule = {
    currentPage: 1,
    pageSize: 5,
    thresholds: {
        0: 8.0,
        1: 5.0,
        2: 4.0,
        3: 3.0,
        4: "--"
    },
    colors: ['#F57676', '#FFA500', '#E6A23C', '#66B1FF', '#71C446'],
    currentChartId: null,

    init() {
        this.initOnlineChart();
        this.initAlarmChart();
        this.renderWarningTable();
        const allData = this.getSortedGnssData();
        if (allData.length > 0) {
            this.initSpeedChart(allData[0].id);
        } else {
            this.initSpeedChart();
        }
    },

/* =========================================================
   离线弹窗逻辑：包含自动补全空行与整页翻页
   ========================================================= */


// 1. 分页状态变量 (确保放置在 dashModule 对象内部)
offlineData: [],
offlineCurrentPage: 1,
offlinePageSize: 5,



// 替换 script.js 中的 dashModule.renderOfflineTable 函数
// 替换 script.js 中的 dashModule.renderOfflineTable 函数
renderOfflineTable() {
    const total = this.offlineData.length;
    const totalPages = Math.ceil(total / this.offlinePageSize) || 1;
    const start = (this.offlineCurrentPage - 1) * this.offlinePageSize;
    const pageData = this.offlineData.slice(start, start + this.offlinePageSize);

    const vendors = ['海康威视', '大华股份', '华测导航', '司南导航', '中海达'];

    // 渲染带有数据的行，严格 6 列
    let html = pageData.map((n, i) => {
        const seed = parseInt(n.id.replace('pt-', '')) || 0;
        const elevation = (1200 + Math.sin(seed) * 50).toFixed(1);
        const hour = String(Math.floor((seed % 12) + 8)).padStart(2, '0');
        const minute = String(seed % 60).padStart(2, '0');
        const offlineTime = `2026-01-20 ${hour}:${minute}`;
        const vendor = vendors[seed % vendors.length];

        return `
            <tr>
                <td style="text-align: center; vertical-align: middle;"><span style="color:#999; font-family: monospace;">#${(start + i + 1).toString().padStart(2, '0')}</span></td>
                <td style="text-align: center; vertical-align: middle;"><b style="color:#333">${n.region}</b></td>
                <td style="text-align: center; vertical-align: middle;"><span class="status-tag-offline">${n.deviceId}</span></td>
                <td style="text-align: center; vertical-align: middle; font-weight:bold; color:#1c3d90">${elevation}m</td>
                <td style="text-align: center; vertical-align: middle; color:#666; font-size:13px;">${offlineTime}</td>
                <td style="text-align: center; vertical-align: middle;"><span class="vendor-tag">${vendor}</span></td>
            </tr>
        `;
    }).join('');

    // 关键修正：空行占位符 colspan 必须为 6，确保表格边框完整
    const emptyRowsCount = this.offlinePageSize - pageData.length;
    for (let i = 0; i < emptyRowsCount; i++) {
        html += `<tr><td colspan="6" style="border:none; height: 53px;">&nbsp;</td></tr>`;
    }

    document.getElementById('offline-table-body').innerHTML = html;

    // 更新分页统计
    const info = document.getElementById('offline-pager-info');
    if(info) info.innerHTML = `显示 <b>${start + 1} - ${Math.min(start + this.offlinePageSize, total)}</b> / 总计 ${total} 条`;

    // 更新分页按钮
    const ctrl = document.getElementById('offline-pager-ctrl');
    if (ctrl) {
        ctrl.innerHTML = `
            <button class="pager-btn ${this.offlineCurrentPage === 1 ? 'disabled' : ''}"
                    onclick="if(dashModule.offlineCurrentPage > 1) dashModule.changeOfflinePage(dashModule.offlineCurrentPage - 1)">
                < 上一页
            </button>
            <span style="margin: 0 15px; color:#999; font-weight:bold;">${this.offlineCurrentPage} / ${totalPages}</span>
            <button class="pager-btn ${this.offlineCurrentPage === totalPages ? 'disabled' : ''}"
                    onclick="if(dashModule.offlineCurrentPage < totalPages) dashModule.changeOfflinePage(dashModule.offlineCurrentPage + 1)">
                下一页 >
            </button>
        `;
    }
},

/* --- 替换 dashModule.closeOfflineModal --- */
/* --- 替换整个 dashModule.closeOfflineModal --- */
closeOfflineModal() {
    document.getElementById('offline-modal').style.display = 'none';
    const resetBtn = document.getElementById('reset-gnss-btn');
    if (resetBtn) resetBtn.style.display = 'none';

    // 【核心修复】逻辑回归：确保大类切回 STRESS 且清空所有特定锁定
    mapModule.isDetailMode = false;
    mapFilterModule.activeTypes.clear();
    mapFilterModule.activeTypes.add('STRESS');
    mapFilterModule.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
    mapFilterModule.selectedPoints = [];

    const regBtn = document.getElementById('map-region-btn');
    const pointInp = document.getElementById('map-point-input');
    [regBtn, pointInp].forEach(el => {
        if(el) {
            el.disabled = false;
            el.style.opacity = '1';
            el.style.cursor = 'pointer';
            el.style.backgroundColor = '#ffffff';
        }
    });

    appLogic.resetGnssFilter();
    // 【核心修复】视图重置：返回应力监测全图视野
    mapFilterModule.syncUI();
    mapModule.focus('STRESS');
    this.renderWarningTable(); // 同步刷新右侧表格数据
},

/* --- 替换整个 dashModule.getSortedGnssData --- */
getSortedGnssData() {
    let data = Object.keys(mapModule.pMeta)
        .filter(id => {
            const meta = mapModule.pMeta[id];
            // 仅统计在线的应力监测点
            return meta && meta.type === 'STRESS' && meta.isOnline;
        })
        .map((id) => {
            const meta = mapModule.pMeta[id];
            const seed = parseInt(id.replace('pt-', '')) || 0;
            const variance = (seed % 10) * 0.1; // 基于 ID 的固定随机扰动

            let simulatedStress = 0.5;
            // 根据预警等级，生成合理超越阈值的数值
            switch (meta.alarmIdx) {
                case 0: simulatedStress = 8.2 + variance * 3.5; break; // 一级：> 8.0
                case 1: simulatedStress = 5.3 + variance * 2.2; break; // 二级：> 5.0
                case 2: simulatedStress = 4.1 + variance * 0.7; break; // 三级：> 4.0
                case 3: simulatedStress = 3.1 + variance * 0.7; break; // 四级：> 3.0
                default: simulatedStress = 0.8 + (seed % 5) * 0.4;     // 正常：< 3.0
            }

            return {
                id: id,
                deviceId: meta.deviceId,
                alarmIdx: meta.alarmIdx,
                region: meta.region,
                // 标高模拟：1200m 附近的小幅波动
                elevation: (1200 + Math.sin(seed * 0.5) * 45).toFixed(1),
                value: simulatedStress.toFixed(2), // 对应的“应力值”列数据
                threshold: this.thresholds[meta.alarmIdx]
            };
        });
    // 按照预警等级从高到低排序
    return data.sort((a, b) => a.alarmIdx - b.alarmIdx || b.value - a.value);
},

/* 替换 dashModule.initSpeedChart 函数 */
initSpeedChart(targetId) {
    this.currentChartId = targetId;
    const chartEl = document.getElementById('chart-sp');
    if (!chartEl) return;
    let chart = echarts.getInstanceByDom(chartEl);
    if (chart) chart.dispose();
    chart = echarts.init(chartEl);

    const meta = targetId ? mapModule.pMeta[targetId] : null;
    let color = '#85C6F1';
    let finalData = [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (meta) {
        color = this.colors[meta.alarmIdx];
        // 生成 24 小时的平滑数据点
        for (let h = 0; h <= 24; h++) {
            const ts = startOfToday + h * 3600000;
            const val = analysisModule.getLogicData(targetId, ts, 3);
            finalData.push([h, val]);
        }
    } else {
        // 默认空数据填充
        for (let h = 0; h <= 24; h++) finalData.push([h, 0.5]);
    }

    chart.setOption({
        title: {
            text: meta ? `${meta.deviceId} - kPa` : '应力趋势',
            textStyle: { fontSize: 11, color: color, fontWeight: 'bold' },
            right: 10, top: 0
        },
        grid: { top: 40, bottom: 25, left: 45, right: 25 },
        tooltip: {
            trigger: 'axis',
            formatter: (params) => `${params[0].value[0]}h : <b>${params[0].value[1]}</b> kPa`
        },
        xAxis: {
            type: 'value',
            min: 0, max: 24, interval: 6,
            axisLabel: { fontSize: 10, color: '#888', formatter: '{value}h' },
            axisLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            name: 'kPa',
            nameTextStyle: { color: '#666', fontSize: 10, align: 'left', padding: [0, 0, 8, -20] },
            axisLabel: { fontSize: 10, color: '#888' },
            splitLine: { lineStyle: { type: 'dashed', color: 'rgba(0,0,0,0.05)' } }
        },
        series: [{
            name: 'Stress',
            data: finalData,
            type: 'line',
            smooth: true, // 开启平滑曲线
            showSymbol: false,
            color: color,
            lineStyle: { width: 2 },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: color + '44' },
                    { offset: 1, color: 'rgba(255, 255, 255, 0)' }
                ])
            }
        }]
    });
},
                    renderWarningTable() {
                        const allData = this.getSortedGnssData();
                        const totalPages = Math.ceil(allData.length / this.pageSize) || 1;
                        const startIndex = (this.currentPage - 1) * this.pageSize;
                        const pageData = allData.slice(startIndex, startIndex + this.pageSize);
                        const tbody = document.getElementById('warning-list');
                        const statusColors = ['#f5222d', '#fa8c16', '#fadb14', '#1890ff', '#52c41a'];
                        tbody.innerHTML = pageData.map((item, i) => {
                            const isRed = item.alarmIdx === 0;
                            const rowClass = isRed ? 'row-red-active' : '';
                            const textColor = isRed ? 'inherit' : statusColors[item.alarmIdx];
                            return `<tr class="${rowClass}" style="cursor:pointer;" onclick="dashModule.focusWithRange('${item.id}')"><td>${startIndex + i + 1}</td><td>${item.region}</td><td style="color:${textColor}; font-weight:600;">${item.deviceId}</td><td>${item.elevation}</td><td style="color:${textColor}; font-weight:600;">${item.value}</td><td style="color:#888;">${item.threshold}</td></tr>`;
                        }).join('');
                        document.getElementById('table-pagination').innerHTML = `<button class="pager-btn ${this.currentPage === 1 ? 'disabled' : ''}" onclick="if(${this.currentPage}>1)dashModule.changePage(${this.currentPage - 1})"> < </button><span style="font-weight:bold; min-width:30px; text-align:center; color:#000;">${this.currentPage} / ${totalPages}</span><button class="pager-btn ${this.currentPage === totalPages ? 'disabled' : ''}" onclick="if(${this.currentPage}<${totalPages})dashModule.changePage(${this.currentPage + 1})"> > </button>`;
                    },

focusWithRange(targetId) {
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;
    const tx = parseFloat(targetEl.style.left),
        ty = parseFloat(targetEl.style.top);

    mapModule.isDetailMode = true;
    mapModule.tMultiplier = 1;

    // 自动切换频率按钮样式
    document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
    const oneDayBtn = document.querySelector('.freq-btn');
    if (oneDayBtn) oneDayBtn.classList.add('active');

    const resetBtn = document.getElementById('reset-gnss-btn');
    if (resetBtn) resetBtn.style.display = 'flex';

    // 更新下方的速度曲线图
    this.initSpeedChart(targetId);

    let maxDiffX = 100,
        maxDiffY = 100;

    document.querySelectorAll('.point-obj').forEach(p => {
        const meta = mapModule.pMeta[p.id];
        if (meta && meta.type === 'STRESS') {
            const px = parseFloat(p.style.left),
                py = parseFloat(p.style.top),
                dist = Math.sqrt((px - tx) ** 2 + (py - ty) ** 2);

            // 移除所有点原有的动画类
            p.classList.remove('breathe', 'point-glow-active', 'point-focus-center');

            // 判定范围：仅显示目标点及周围点
            if (p.id === targetId || dist <= 1200) {
                p.style.display = 'block';
                p.style.color = p.style.backgroundColor;

                maxDiffX = Math.max(maxDiffX, Math.abs(px - tx));
                maxDiffY = Math.max(maxDiffY, Math.abs(py - ty));

                // 【核心修改点】仅对选中的目标点添加发光呼吸效果
                if (p.id === targetId) {
                    p.classList.add('point-focus-center');
                } else {
                    // 周围监测点显示，但不添加任何发光动画类
                }
            } else {
                p.style.display = 'none';
            }
        } else {
            p.style.display = 'none';
        }
    });

    // 自动缩放并移动视口
    const vp = document.getElementById('map-viewer'),
        cv = document.getElementById('map-canvas');
    const padding = 200;
    const scaleX = (vp.clientWidth / 2) / (maxDiffX + padding),
        scaleY = (vp.clientHeight / 2) / (maxDiffY + padding);
    mapModule.scale = Math.min(scaleX, scaleY, 1.0);
    mapModule.pos.x = (vp.clientWidth / 2) - (tx * mapModule.scale);
    mapModule.pos.y = (vp.clientHeight / 2) - (ty * mapModule.scale);
    cv.style.transform = `translate(${mapModule.pos.x}px, ${mapModule.pos.y}px) scale(${mapModule.scale})`;
},

                    changePage(p) {
                        this.currentPage = p;
                        this.renderWarningTable();
                    },

                    initOnlineChart() {
                        const stressNodes = Object.values(mapModule.pMeta).filter(n => n.type === 'STRESS');
                        const online = stressNodes.filter(n => n.isOnline).length,
                            offline = stressNodes.length - online;
                        const chart = echarts.init(document.getElementById('chart-on'));
                        chart.setOption({
                            title: {
                                text: stressNodes.length,
                                subtext: '设备总数',
                                left: 'center',
                                top: '35%',
                                textStyle: {
                                    fontSize: 18,
                                    color: '#1c3d90',
                                    fontWeight: 'bold'
                                },
                                subtextStyle: {
                                    fontSize: 10,
                                    color: '#999',
                                    verticalAlign: 'top'
                                }
                            },
                            tooltip: {
                                show: false
                            },
                            legend: {
                                bottom: '2',
                                icon: 'circle',
                                itemWidth: 8,
                                textStyle: {
                                    fontSize: 9
                                },
                                selectedMode: false,
                                formatter: (name) => {
                                    const val = (name === '在线') ? online : offline;
                                    return `${name}  ${val}`;
                                }
                            },
                            series: [{
                                type: 'pie',
                                radius: ['45%', '65%'],
                                center: ['50%', '45%'],
                                avoidLabelOverlap: false,
                                label: {
                                    show: false
                                },
                                data: [{
                                    value: online,
                                    name: '在线',
                                    itemStyle: {
                                        color: '#71C446'
                                    }
                                }, {
                                    value: offline,
                                    name: '离线',
                                    itemStyle: {
                                        color: '#999'
                                    }
                                }]
                            }]
                        });
                        chart.on('click', params => {
                            if (params.name === '离线') this.showOfflineModal(stressNodes.filter(n => !n.isOnline));
                        });
                    },

initAlarmChart() {
    const stressNodes = Object.values(mapModule.pMeta).filter(n => n.type === 'STRESS' && n.isOnline);
    const counts = [0, 0, 0, 0, 0];
    stressNodes.forEach(n => {
        counts[n.alarmIdx]++;
    });
    const chart = echarts.init(document.getElementById('chart-al'));
    const colors = ['#F57676', '#FFA500', '#fadb14', '#66B1FF', '#71C446'];
    const alarmNames = ['一级告警', '二级告警', '三级告警', '四级告警', '运行正常'];
    let displayCount = 0;
    let displayLabel = "运行正常";
    let displayColor = colors[4];
    for (let i = 0; i < 5; i++) {
        if (counts[i] > 0) {
            displayCount = counts[i];
            displayLabel = alarmNames[i];
            displayColor = colors[i];
            break;
        }
    }
    chart.setOption({
        title: {
            text: displayCount,
            subtext: displayLabel,
            left: 'center',
            top: '35%',
            textStyle: {
                fontSize: 18,
                color: displayColor,
                fontWeight: 'bold'
            },
            subtextStyle: {
                fontSize: 10,
                color: '#999',
                verticalAlign: 'top'
            }
        },
        tooltip: {
            show: false
        },
        legend: {
            bottom: '2',
            icon: 'circle',
            itemWidth: 8,
            textStyle: {
                fontSize: 8
            },
            selectedMode: false,
            formatter: (name) => {
                const idx = alarmNames.indexOf(name);
                return `${name}  ${counts[idx]}`;
            }
        },
        series: [{
            type: 'pie',
            radius: ['45%', '65%'],
            center: ['50%', '45%'],
            label: {
                show: false
            },
            data: alarmNames.map((name, i) => ({
                value: counts[i],
                name: name,
                itemStyle: {
                    color: colors[i]
                }
            }))
        }]
    });

    // 环形图点击事件
    chart.on('click', params => {
        const targetIdx = params.dataIndex;

        // 【核心修改】如果点击的是“运行正常”（索引为4，对应绿色部分），则不执行任何交互逻辑
        if (targetIdx === 4) return;

        mapModule.isDetailMode = true;
        mapModule.tMultiplier = 1;

        // 自动切换 UI 状态
        document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
        const oneDayBtn = document.querySelector('.freq-btn');
        if (oneDayBtn) oneDayBtn.classList.add('active');

        const resetBtn = document.getElementById('reset-gnss-btn');
        if (resetBtn) resetBtn.style.display = 'flex';

        document.querySelectorAll('.point-obj').forEach(p => {
            const meta = mapModule.pMeta[p.id];
            // 过滤条件：GNSS 类型、在线、且告警等级匹配
            const isMatch = (meta && meta.type === 'STRESS') && (meta.isOnline) && (meta.alarmIdx === targetIdx);

            p.classList.remove('breathe', 'point-glow-active', 'point-focus-center');

            if (isMatch) {
                p.style.display = 'block';
                p.style.color = p.style.backgroundColor;
                // 添加呼吸发光效果
                p.classList.add('breathe', 'point-glow-active');
            } else {
                p.style.display = 'none';
            }
        });

        // 执行地图聚焦
        mapModule.focus('STRESS');
    });
},

/* --- 替换 dashModule.showOfflineModal --- */
showOfflineModal(data) {
    const modal = document.getElementById('offline-modal');
    const mapSection = document.getElementById('main-map-section');
    const resetBtn = document.getElementById('reset-gnss-btn'); // 获取重置按钮
    if (!modal || !mapSection) return;

    // 1. 挂载并显示弹窗
    mapSection.appendChild(modal);
    modal.style.display = 'flex';

    // 2. 显示右上角关闭按钮 [核心修复]
    if (resetBtn) resetBtn.style.display = 'none';

    // 3. 渲染离线表格明细
    const body = document.getElementById('offline-table-body');
    body.innerHTML = data.map((n, i) => {
        const seed = parseInt(n.id.replace('pt-', '')) || 0;
        const elevation = 1200 + Math.round(Math.sin(seed * 0.5) * 50);
        const vendors = ['海康威视', '大华股份', '华测导航', '司南导航', '中海达'];
        const vendor = vendors[seed % vendors.length];
        const offlineTime = `2026-01-20 10:15`;

        return `
            <tr>
                <td style="text-align: center; vertical-align: middle;">${i + 1}</td>
                <td style="text-align: center; vertical-align: middle;">${n.region}</td>
                <td style="text-align: center; vertical-align: middle; color:#f5222d; font-weight:bold;">${n.deviceId}</td>
                <td style="text-align: center; vertical-align: middle;">${elevation}m</td>
                <td style="text-align: center; vertical-align: middle;">${offlineTime}</td>
                <td style="text-align: center; vertical-align: middle;">${vendor}</td>
            </tr>
        `;
    }).join('');

    // 4. 联动过滤与聚焦
    const offlineIds = data.map(n => n.id);
    const offlineRegions = [...new Set(data.map(n => n.region))];

    mapFilterModule.selectedPoints = offlineIds;
    mapFilterModule.selectedRegions = offlineRegions;
    mapFilterModule.syncUI();

    mapModule.isDetailMode = true;
    mapModule.focus('STRESS');

    // 5. 动效同步
    offlineIds.forEach(id => {
        const p = document.getElementById(id);
        if (p) p.classList.add('breathe', 'point-glow-active');
    });

    // 6. 禁用顶栏交互
    const regBtn = document.getElementById('map-region-btn');
    const pointInp = document.getElementById('map-point-input');
    [regBtn, pointInp].forEach(el => {
        if(el) {
            el.disabled = true;
            el.style.backgroundColor = '#f5f5f5';
            el.style.opacity = '0.5';
            el.style.cursor = 'not-allowed';
        }
    });
}
};

const appLogic = {
    switchType(type, btn) {
        mapModule.isDetailMode = false;
        document.querySelectorAll('.point-obj').forEach(p => {
            p.style.display = (type === 'ALL' || p.classList.contains(`type-${type}`)) ? 'block' : 'none';
            p.classList.remove('point-focus-center');
        });
        if (btn) {
            document.querySelectorAll('.side-nav-item').forEach(n => n.classList.remove('active'));
            btn.classList.add('active');
        }
        const resetBtn = document.getElementById('reset-gnss-btn');
        if (resetBtn) resetBtn.style.display = 'none';
        if (type !== 'ALL') mapModule.focus(type);
        const gnssPoints = document.querySelectorAll('.point-obj.type-GNSS');
        gnssPoints.forEach(p => {
            p.classList.remove('breathe', 'point-glow-active');
            const meta = mapModule.pMeta[p.id];
            if (meta && meta.isOnline && meta.alarmIdx === 0) {
                p.style.color = p.style.backgroundColor;
                p.classList.add('breathe', 'point-glow-active');
            }
        });
        const allData = dashModule.getSortedGnssData();
        if (allData.length > 0) dashModule.initSpeedChart(allData[0].id);
    },

/* --- 替换整个 appLogic.resetGnssFilter --- */
resetGnssFilter() {
    // 1. 退出详情聚焦模式
    mapModule.isDetailMode = false;

    // 2. 【核心修复】重置筛选器的内存状态，回归“全区域、对应力监测全选”状态
    mapFilterModule.selectedPoints = [];
    mapFilterModule.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];

    // 3. 执行显隐同步：这将根据上述重置的状态，重新显示所有应力点
    mapFilterModule.syncUI();

    // 4. 【核心修复】执行地图聚焦：返回应力监测模块的全图视野
    mapModule.focus('STRESS');

    // 5. 隐藏右上角的关闭/重置按钮
    const resetBtn = document.getElementById('reset-gnss-btn');
    if (resetBtn) resetBtn.style.display = 'none';

    // 6. 刷新右侧表格至第一页
    dashModule.currentPage = 1;
    dashModule.renderWarningTable();
}
};


const analysisModule = {
    charts: { curve: null, vector: null },
    selectedMetricsMap: {},
    selectedRegions: ['全部'],
    selectedStressSubTypes: ['锚索应力', '土压力计'], // 新增子类型状态
    selectedPoints: [],
    selectedGlobalMetrics: ['XY速度(mm/h)'],
    tMultiplier: 1,
    tableFreq: 'hour',
    metricPage: 1,
    metricPageSize: 6,
/* 找到 analysisModule 并在其定义中修改以下变量 */
allMetrics: [
    'X速度(mm/h)', 'Y速度(mm/h)', 'H速度(mm/h)', 'XY速度(mm/h)', 'XYH速度(mm/h)',
    'X位移(mm)', 'Y位移(mm)', 'H位移(mm)', 'XY位移(mm)', 'XYH位移(mm)',
    'X累积位移(mm)', 'Y累积位移(mm)', 'H累积位移(mm)', 'XY累积位移(mm)', 'XYH累积位移(mm)',
    'X加速度(mm/h²)', 'Y加速度(mm/h²)', 'H加速度(mm/h²)', '切线角（°）' // 新增 4 项指标
],
    deviceColors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'],
    lineStyles: ['solid', 'dashed', 'dotted', 'dashDot'],

// 确保 script.js 中的 analysisModule.setQuickTime 与此一致
setQuickTime(days, btn) {
    // 1. 切换按钮高亮（变为蓝色）
    document.querySelectorAll('#analysis-modal .freq-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const now = new Date();
    const start = new Date();

    if (days === 1) {
        // 核心修改：设置为当前时间往前推 24 小时，实现“近24小时”
        start.setTime(now.getTime() - 24 * 60 * 60 * 1000);
    } else {
        // 一周内或一个月内，保持 0 点逻辑
        start.setDate(now.getDate() - days);
        start.setHours(0, 0, 0, 0);
    }

    // 格式化为 YYYY-MM-DDTHH:mm (datetime-local 要求的格式)
    const offset = now.getTimezoneOffset() * 60000;
    const formatISO = (d) => new Date(d - offset).toISOString().slice(0, 16);

    document.getElementById('an-start').value = formatISO(start);
    document.getElementById('an-end').value = formatISO(now);

    // 更新数据计算倍率并执行查询
    this.tMultiplier = Math.max(0.1, (now - start) / (24 * 3600000));
    this.query();
},

// 替换 script.js 中的 analysisModule.initFilter 函数
initFilter() {
    if (this.filterInited) return;
    this.filterInited = true;

// 全局点击监听：点击组件外部时收起所有下拉面板
    window.addEventListener('click', (e) => {
        // 1. 处理区域和监测点下拉框
        if (!e.target.closest('.filter-group') && !e.target.closest('.custom-dropdown-content')) {
            document.querySelectorAll('.custom-dropdown-content').forEach(d => d.style.display = 'none');
        }

        // 2. [新增] 处理指标选择下拉栏
        const metricBtn = document.getElementById('metric-select-btn');
        const metricMenu = document.getElementById('metric-items-container');
        if (metricMenu && metricMenu.style.display === 'block') {
            // 如果点击的既不是按钮本身，也不是菜单内部，则收起
            if (!metricBtn.contains(e.target) && !metricMenu.contains(e.target)) {
                metricMenu.style.display = 'none';
            }
        }
    });

    // 初始化区域：默认全选
    const allRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
    this.selectedRegions = [...allRegions];

    // 初始化监测点：默认全选
    const allGnssIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'GNSS');
    this.selectedPoints = [...allGnssIds];
    this.selectedStressSubTypes = ['锚索应力', '土压力计'];

// 初始勾选所有符合条件的应力点
        this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => {
            const m = mapModule.pMeta[id];
            return m.type === 'STRESS' && this.selectedStressSubTypes.includes(m.subType);
        });

    // 关键：立即执行指标选择器的渲染和标签更新
    this.renderMetricSelector();
    this.updateMetricButtonLabel();
    this.syncFilterUI();
},

/* 新增：渲染子类型下拉面板 */
    renderStressSubTypes() {
        const container = document.getElementById('an-stress-sub-dropdown');
        if (!container) return;
        const allSubs = ['锚索应力', '土压力计'];
        const isAllSelected = this.selectedStressSubTypes.length === allSubs.length;

        let html = `
            <div class="custom-dropdown-item" onclick="analysisModule.handleStressSubClick(this, event, '全部')">
                <input type="checkbox" ${isAllSelected ? 'checked' : ''}>
                <span class="all-select-text">全部按钮</span>
            </div>
            <hr style="margin:4px 8px; border:0; border-top:1px solid #f0f0f0;">
        `;
        html += allSubs.map(t => `
            <div class="custom-dropdown-item" onclick="analysisModule.handleStressSubClick(this, event, '${t}')">
                <input type="checkbox" ${this.selectedStressSubTypes.includes(t) ? 'checked' : ''}>
                <span>${t}</span>
            </div>
        `).join('');

        container.innerHTML = html;

        // 更新标签文字
        const label = document.getElementById('an-stress-sub-label');
        if (label) {
            label.innerText = isAllSelected ? '全部类型' : (this.selectedStressSubTypes.join('、') || '请选择');
        }
    },

    /* 新增：处理子类型点击联动 */
    handleStressSubClick(el, event, val) {
        if (event) event.stopPropagation();
        const allSubs = ['锚索应力', '土压力计'];

        if (val === '全部') {
            const isClosing = this.selectedStressSubTypes.length === allSubs.length;
            this.selectedStressSubTypes = isClosing ? [] : [...allSubs];
        } else {
            if (this.selectedStressSubTypes.includes(val)) {
                this.selectedStressSubTypes = this.selectedStressSubTypes.filter(t => t !== val);
            } else {
                this.selectedStressSubTypes.push(val);
            }
        }

        // 联动：点击类型后，自动勾选当前符合类型的所有点位
        this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => {
            const m = mapModule.pMeta[id];
            const isTypeMatch = m.type === 'STRESS' && this.selectedStressSubTypes.includes(m.subType);
            const isRegionMatch = this.selectedRegions.includes('全部') || this.selectedRegions.includes(m.region);
            return isTypeMatch && isRegionMatch;
        });

        this.syncFilterUI();
        this.query(); // 刷新报表
    },

// 替换 script.js 中的 analysisModule.toggleDropdown 函数
toggleDropdown(id, e) {
    if (e) e.stopPropagation();
    const el = document.getElementById(id);
    if (!el) return;
    const isShow = el.style.display === 'block';

    // 关闭所有其他下拉框
    document.querySelectorAll('.custom-dropdown-content').forEach(d => d.style.display = 'none');

    el.style.display = isShow ? 'none' : 'block';

    if (el.style.display === 'block') {
        const rect = el.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            el.style.left = 'auto';
            el.style.right = '0';
        }

        // 核心修复：点击打开点位下拉框时，传入空值 '' 渲染，不带入输入框现有的 ID 过滤
        if (id === 'an-point-dropdown') {
            this.renderPoints('');
        } else if (id === 'an-region-dropdown') {
            this.renderRegions();
        }
    }
},

    handleItemClick(el, event, type) {
        if (event) event.stopPropagation();
        if (event.target.tagName === 'INPUT') return;
        const cb = el.querySelector('input[type="checkbox"]');
        if (cb) {
            cb.checked = !cb.checked;
            type === 'region' ? this.handleRegionChange(cb) : this.handlePointChange(cb);
        }
    },

    formatLabel(list) {
        if (!list || list.length === 0) return '选择区域';
        return list.length <= 2 ? list.join('、') : `${list.slice(0, 2).join('、')}...`;
    },

    renderRegions() {
        const regions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
        const container = document.getElementById('an-region-dropdown');
        if (!container) return;
        container.innerHTML = regions.map(reg => `
            <div class="custom-dropdown-item" onclick="analysisModule.handleItemClick(this, event, 'region')">
                <input type="checkbox" value="${reg}" ${this.selectedRegions.includes(reg) ? 'checked' : ''} onchange="analysisModule.handleRegionChange(this)">
                <span style="${reg === '全部' ? 'font-weight:bold; color:#1c3d90;' : ''}">${reg}</span>
            </div>`).join('');
    },

/* --- 修改 mapFilterModule.getDisplayPoints --- */
/* 修改：获取显示点位逻辑（增加子类型过滤） */
    getDisplayPoints(filterVal = '') {
        const list = Object.keys(mapModule.pMeta)
            .filter(id => {
                const m = mapModule.pMeta[id];
                const isStressMatch = m.type === 'STRESS' && this.selectedStressSubTypes.includes(m.subType);
                const isRegionMatch = this.selectedRegions.includes('全部') || this.selectedRegions.includes(m.region);
                return isStressMatch && isRegionMatch;
            })
            .map(id => ({ id, ...mapModule.pMeta[id] }));

        if (filterVal && filterVal !== '全部') {
            return list.filter(p => p.deviceId.includes(filterVal));
        }
        return list;
    },


    renderPoints(filterVal = '') {
    const container = document.getElementById('an-point-dropdown');
    if (!container) return;

    const displayList = this.getDisplayPoints(filterVal);
    // 判断当前列表中的点是否被全部勾选（用于控制“全部监测点”复选框）
    const isAllChecked = displayList.length > 0 && displayList.every(p => this.selectedPoints.includes(p.id));

    const allHtml = `
        <div class="custom-dropdown-item" style="border-bottom: 1px solid #eee; margin-bottom: 5px;" onclick="analysisModule.handleItemClick(this, event, 'point')">
            <input type="checkbox" value="全部" ${isAllChecked ? 'checked' : ''} onchange="analysisModule.handlePointChange(this)">
            <span style="font-weight:bold; color:#1c3d90;">全部</span>
        </div>`;

    // 核心渲染：只要在 displayList 里的点都会显示，checked 状态取决于 selectedPoints 数组
    const itemsHtml = displayList.map(p => `
        <div class="custom-dropdown-item" onclick="analysisModule.handleItemClick(this, event, 'point')">
            <input type="checkbox" value="${p.id}" ${this.selectedPoints.includes(p.id) ? 'checked' : ''} onchange="analysisModule.handlePointChange(this)">
            <span>${p.deviceId} <small style="color:#999">(${p.region})</small></span>
        </div>`).join('');

    container.innerHTML = displayList.length > 0 ? (allHtml + itemsHtml) : '<div style="padding:10px; color:#999; text-align:center;">当前区域内暂无监测点</div>';
},

/* --- 修改 script.js 中的 analysisModule.handleRegionChange --- */
handleRegionChange(cb) {
    const allRegions = ['北帮', '南帮', '东帮', '西帮', '中央区'];

    // 【关键修改】：统一使用 STRESS 类型
    const allStressIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'STRESS');

    if (cb.value === '全部') {
        this.selectedRegions = cb.checked ? ['全部', ...allRegions] : [];
        this.selectedPoints = cb.checked ? [...allStressIds] : [];
    } else {
        if (cb.checked) {
            if (!this.selectedRegions.includes(cb.value)) this.selectedRegions.push(cb.value);
            // 勾选该区域内的应力监测点
            allStressIds.filter(id => mapModule.pMeta[id]?.region === cb.value).forEach(id => {
                if (!this.selectedPoints.includes(id)) this.selectedPoints.push(id);
            });
            if (this.selectedRegions.filter(r => r !== '全部').length === allRegions.length) this.selectedRegions.push('全部');
        } else {
            this.selectedRegions = this.selectedRegions.filter(r => r !== cb.value && r !== '全部');
            const regionPoints = allStressIds.filter(id => mapModule.pMeta[id]?.region === cb.value);
            this.selectedPoints = this.selectedPoints.filter(id => !regionPoints.includes(id));
        }
    }

    // 联动：根据新的区域和当前的子类型，重置选中点位
            this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => {
                const m = mapModule.pMeta[id];
                const isTypeMatch = m.type === 'STRESS' && this.selectedStressSubTypes.includes(m.subType);
                const isRegionMatch = this.selectedRegions.includes('全部') || this.selectedRegions.includes(m.region);
                return isTypeMatch && isRegionMatch;
            });

    this.syncFilterUI();
    this.query(); // 刷新报表和图表
},
// 1. 修改区域切换逻辑：移除 query() 触发
handleRegionToggle(val, cb) {
    if (val === '全部') {
        this.selectedRegions = cb.checked ? ['全部', '北帮', '南帮', '西帮', '东帮', '中央区'] : [];
    } else {
        if (cb.checked) {
            if (!this.selectedRegions.includes(val)) this.selectedRegions.push(val);
        } else {
            this.selectedRegions = this.selectedRegions.filter(r => r !== val && r !== '全部');
        }
    }
    this.renderRegionSelector();
    this.updateRegionButtonLabel();
    // 关键修改：此处不再调用 query()，选择区域不刷新图表
},

// 2. 修改监测点切换逻辑：实现限定区域全选并触发 query()
handlePointChange(cb) {
    const val = cb.value;
    // 获取当前分析窗口可见的监测点列表
    const currentVisibleList = this.getDisplayPoints('');
    const currentVisibleIds = currentVisibleList.map(p => p.id);

    if (val === '全部') {
        if (cb.checked) {
            // 全选当前区域内的点
            currentVisibleList.forEach(p => {
                if (!this.selectedPoints.includes(p.id)) this.selectedPoints.push(p.id);
            });
        } else {
            // 仅取消当前区域内的点
            this.selectedPoints = this.selectedPoints.filter(id => !currentVisibleIds.includes(id));
        }
    } else {
        if (cb.checked) {
            if (!this.selectedPoints.includes(val)) this.selectedPoints.push(val);
        } else {
            this.selectedPoints = this.selectedPoints.filter(p => p !== val);
        }
    }

    this.syncFilterUI();
    this.query(); // 在此处触发结果：执行查询并渲染图表/表格
},

    filterPointList(val) { this.renderPoints(val); },
    handlePointInput() {
        const val = document.getElementById('an-point-input')?.value.trim();
const allStress = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'STRESS');
        if (!val || val === '全部') {
            this.selectedPoints = (val === '全部') ? [...allStress] : [];
            this.selectedRegions = (val === '全部') ? ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'] : [];
        } else {
            const parts = val.split(/[、,，\s]/).map(p => p.trim()).filter(p => p !== '');
            this.selectedPoints = []; this.selectedRegions = [];
parts.forEach(part => {
        let targetNum = part.replace(/STRESS/i, ''); // 识别 STRESS 编号
        const matchedId = allStress.find(id => mapModule.pMeta[id].deviceId.replace('STRESS', '') === targetNum);
                        if (matchedId) {
                    if (!this.selectedPoints.includes(matchedId)) this.selectedPoints.push(matchedId);
                    if (!this.selectedRegions.includes(mapModule.pMeta[matchedId].region)) this.selectedRegions.push(mapModule.pMeta[matchedId].region);
                }
            });
            if (this.selectedRegions.length === 5) this.selectedRegions.push('全部');
        }
        this.syncFilterUI(); this.query();
    },

// 替换 script.js 中的 analysisModule.syncFilterUI 函数
syncFilterUI() {
// 处理区域标签
        const regionLabel = document.getElementById('an-region-label');
        if (regionLabel) {
            const activeRegs = this.selectedRegions.filter(r => r !== '全部');
            regionLabel.innerText = (this.selectedRegions.includes('全部') && activeRegs.length >= 5) ? '全部区域' : (this.formatLabel(activeRegs) || '选择区域');
        }

        // 处理点位输入框文字
        const input = document.getElementById('an-point-input');
        if (input) {
            const currentAvailable = this.getDisplayPoints('');
            const isAllSelected = currentAvailable.length > 0 && currentAvailable.every(p => this.selectedPoints.includes(p.id));

            if (isAllSelected) {
                input.value = "全部应力点";
            } else {
                const names = this.selectedPoints.map(id => mapModule.pMeta[id]?.deviceId?.replace('STRESS', ''));
                input.value = names.join('、');
            }
        }
    this.renderRegions();
    this.renderPoints('');
    this.renderStressSubTypes(); // 调用新渲染
},

// 替换 script.js 中的 analysisModule.getLogicData 函数
/* 替换 analysisModule.getLogicData 函数 */
getLogicData(devId, timestamp, metricIdx = 0) {
    const meta = mapModule.pMeta[devId] || { alarmIdx: 4 };
    const seed = parseInt(devId.replace('pt-', '')) || 0;

    // 基础压力值逻辑：根据预警等级设定基准（8.5, 5.5, 4.2, 3.2, 0.6）
    let baseValue = [8.5, 5.5, 4.2, 3.2, 0.6][meta.alarmIdx] || 0.6;

    // 引入基于 ID 的固定偏移
    baseValue += (seed % 10) * 0.05;

    // 构造平滑正弦波：周期为 12 小时
    const hours = timestamp / 3600000;
    const wave = Math.sin(hours * (Math.PI / 6) + seed);

    // 引入微小的高频噪声（±2%以内）
    const noise = (Math.sin(timestamp / 600000) * 0.02);

    // 计算最终观测值（应力/压力值）
    // 波动范围控制在基准值的 10% 以内，确保曲线平滑
    const finalValue = baseValue + (baseValue * 0.1 * wave) + (baseValue * noise);

    return parseFloat(Math.max(0.1, finalValue).toFixed(2));
},

// 替换 analysisModule 内部的 open 函数
// 替换 analysisModule 内部的 open 函数，解决按钮闪烁问题
open(targetMeta) {
    const modal = document.getElementById('analysis-modal');
    if (modal) modal.style.display = 'flex';

    this.initFilter();

    // 1. 更新最大时间约束
    timeUtils.updateMaxConstraints();

    // 2. 先执行手动时间变更校验（重置所有按钮状态并计算初始倍率）
    // 将此调用提前，防止它覆盖后续的按钮选中逻辑
    this.handleManualTimeChange();

    const modalBtns = document.querySelectorAll('#analysis-modal .freq-btn');

    if (targetMeta) {
        // --- 场景一：从地图监测点点击进入 ---
        const homeStart = document.getElementById('date-start')?.value;
        const homeEnd = document.getElementById('date-end')?.value;
        if (homeStart && homeEnd) {
            document.getElementById('an-start').value = homeStart;
            document.getElementById('an-end').value = homeEnd;
        }

        const homeActiveBtn = document.querySelector('#time-engine-bar .freq-btn.active');
        if (homeActiveBtn) {
            const btnText = homeActiveBtn.innerText;
            const matchBtn = Array.from(modalBtns).find(b => b.innerText === btnText);
            if (matchBtn) matchBtn.classList.add('active'); // 继承首页按钮状态
        }
        this.selectedPoints = [targetMeta.id];
        this.selectedRegions = [targetMeta.region];
    } else {
        // --- 场景二：点击右下角速度曲线看板进入 ---
        // 核心修复：在 handleManualTimeChange 之后执行 setQuickTime
        // setQuickTime 内部会设置时间、倍率、查询数据，并重新加上 .active 类名
        const modalOneDayBtn = document.querySelector('#analysis-modal .freq-btn');
        if (modalOneDayBtn) {
            this.setQuickTime(1, modalOneDayBtn);
        }

        const sortedData = dashModule.getSortedGnssData();
        if (sortedData.length > 0) {
            const firstMeta = mapModule.pMeta[sortedData[0].id];
            this.selectedPoints = [firstMeta.id];
            this.selectedRegions = [firstMeta.region];
            targetMeta = firstMeta;
        }
    }

/* =========================================================
       核心修复：监测类型自动推理逻辑
       ========================================================= */
    if (targetMeta && targetMeta.subType) {
        // 根据默认选中点的子类型（锚索应力/土压力计），自动更新下拉菜单的选中状态
        this.selectedStressSubTypes = [targetMeta.subType];
    }

    // 3. 执行 UI 同步：这会触发 renderStressSubTypes() 更新顶栏标签文字
    this.syncFilterUI();

    if (targetMeta) {
        const input = document.getElementById('an-point-input');
        if (input) {
            // 显示具体的设备编号（如：锚索应力1）
            input.value = targetMeta.deviceId;
        }
    }

    // 4. 执行数据查询与图表渲染
    this.query();},

// 修改 script.js 中的 analysisModule.handleManualTimeChange
handleManualTimeChange() {
    // 移除快捷按钮高亮
    document.querySelectorAll('#analysis-modal .freq-btn').forEach(btn => btn.classList.remove('active'));

    const sInp = document.getElementById('an-start');
    const eInp = document.getElementById('an-end');
    const now = new Date();

    if (sInp.value && eInp.value) {
        const start = new Date(sInp.value);
        const end = new Date(eInp.value);

        // 执行严格校验
        if (start > now || end > now) {
            alert("所选时间不得晚于当前时刻");
            this.setQuickTime(1, document.querySelector('#analysis-modal .freq-btn'));
            return;
        }
        if (start.getTime() === end.getTime()) {
            alert("起始时间与终止时间不得相同");
            return;
        }
        if (start > end) {
            alert("初始时间不得晚于终止时间");
            return;
        }

        // 更新全局数据倍率
        this.tMultiplier = Math.max(0.1, (end - start) / (24 * 3600000));
    }
},

    close() { document.getElementById('analysis-modal').style.display = 'none'; },
    query() { this.renderCurveChart();  this.renderTable(); },

/* --- 替换 script.js 中的 analysisModule 相关函数 --- */

// 1. 修改 query，不再渲染矢量图
query() {
    this.renderCurveChart();
    // renderVectorChart 已停用
    this.renderTable();
},


/* 替换 analysisModule.renderCurveChart 函数 */
renderCurveChart() {
    const el = document.getElementById('curve-chart-main');
    if (!el) return;
    if (this.charts.curve) this.charts.curve.dispose();
    if (this.selectedPoints.length === 0) return;

    this.charts.curve = echarts.init(el);
    const startVal = document.getElementById('an-start').value;
    const endVal = document.getElementById('an-end').value;
    const startTs = new Date(startVal).getTime();
    const endTs = new Date(endVal).getTime();

    // 动态计算采样点步长（确保曲线平滑且性能均衡，最多生成 100 个点）
    const step = Math.max(3600000, (endTs - startTs) / 100);

    const series = [];
    this.selectedPoints.forEach((devId, pIdx) => {
        const pMeta = mapModule.pMeta[devId] || { deviceId: devId, alarmIdx: 4 };
        const color = this.deviceColors[pIdx % this.deviceColors.length];
        const plotData = [];

        // 生成连续平滑序列
        for (let curr = startTs; curr <= endTs; curr += step) {
            plotData.push([curr, this.getLogicData(devId, curr, 3)]);
        }
        // 补足最后一个终点
        plotData.push([endTs, this.getLogicData(devId, endTs, 3)]);

        series.push({
            name: pMeta.deviceId,
            type: 'line',
            smooth: true, // 开启平滑
            showSymbol: false,
            data: plotData,
            lineStyle: { width: 2, color: color },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: color + '22' },
                    { offset: 1, color: 'rgba(255, 255, 255, 0)' }
                ])
            }
        });
    });

    this.charts.curve.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            borderColor: '#1c3d90',
            formatter: (params) => {
                let html = `<div style="font-weight:bold; margin-bottom:5px;">${new Date(params[0].value[0]).toLocaleString()}</div>`;
                params.forEach(p => {
                    html += `<div style="display:flex;justify-content:space-between;gap:15px;">
                                <span>${p.marker} ${p.seriesName}</span>
                                <b style="color:#1c3d90">${p.value[1]} kPa</b>
                             </div>`;
                });
                return html;
            }
        },
        dataZoom: [
            { type: 'inside', xAxisIndex: 0 },
            { type: 'slider', bottom: 10, height: 20 }
        ],
        legend: { top: '5%', type: 'scroll' },
        grid: { top: 70, bottom: 70, left: 60, right: 30 },
        xAxis: { type: 'time', axisLabel: { color: '#888' }, splitLine: { show: false } },
        yAxis: {
            type: 'value',
            name: 'kPa',
            nameTextStyle: { color: '#1c3d90', fontWeight: 'bold' },
            min: 'dataMin', // 自动聚焦数据范围
            axisLabel: { color: '#888' },
            splitLine: { lineStyle: { type: 'dashed' } }
        },
        series: series
    });
},


/* --- 替换 script.js 中的 analysisModule.renderTable 函数 --- */
renderTable() {
    const head = document.getElementById('full-table-head'),
          body = document.getElementById('full-table-body');
    if (!head || !body) return;

    if (this.selectedPoints.length === 0) {
        head.innerHTML = "";
        body.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:#999;">请先选择监测点进行查询</td></tr>';
        return;
    }

    // 1. 定义新的 8 位表头
    const cols = ['序号', '区域', '编号', '时间', '坐标X', '坐标Y', '坐标H', '应力/压力值'];
    head.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;

    // 2. 获取时间范围与显示频率
    const start = new Date(document.getElementById('an-start').value);
    const end = new Date(document.getElementById('an-end').value);
    const msMap = { 'hour': 3600000, 'day': 86400000, 'week': 604800000, 'month': 2592000000 };
    const interval = msMap[this.tableFreq || 'hour'];

    let html = "", rowNum = 1;

    // 3. 遍历选中点位填充数据
    this.selectedPoints.forEach(devId => {
        const meta = mapModule.pMeta[devId] || { region: '未知', deviceId: devId };

        // 模拟该设备在特定坐标位置 (基于 ID 偏移)
        const seed = parseInt(devId.replace('pt-', '')) || 0;
        const mockX = (2450.55 + (seed % 10) * 2.5).toFixed(2);
        const mockY = (1300.12 + (seed % 10) * 1.8).toFixed(2);
        const mockH = (1150.00 + Math.sin(seed) * 15).toFixed(2);

        for (let currentTs = start.getTime(); currentTs <= end.getTime(); currentTs += interval) {
            // 获取实时的观测数值（基于指标索引 3 的逻辑，模拟波动观测值）
            const obsValue = this.getLogicData(devId, currentTs, 3);

            // 根据预警等级高亮数值文字颜色
            const statusColors = ['#f5222d', '#fa8c16', '#fadb14', '#1890ff', '#52c41a'];
            const valColor = statusColors[meta.alarmIdx] || '#333';

            html += `
                <tr>
                    <td>${rowNum++}</td>
                    <td>${meta.region}</td>
                    <td style="font-weight:bold; color:#1c3d90">${meta.deviceId}</td>
                    <td>${new Date(currentTs).toLocaleString()}</td>
                    <td style="color:#666">${mockX}</td>
                    <td style="color:#666">${mockY}</td>
                    <td style="color:#1c3d90; font-weight:bold;">${mockH}m</td>
                    <td style="font-weight:bold; color:${valColor}">${obsValue} kPa</td>
                </tr>`;

            // 防止大数据量导致浏览器崩溃，设置单次渲染上限
            if (rowNum > 3000) break;
        }
    });

    body.innerHTML = html;
},

    toggleMetricMenu(e) { if (e) e.stopPropagation(); const menu = document.getElementById('metric-items-container'); if (menu) menu.style.display = (menu.style.display === 'block') ? 'none' : 'block'; },
// 替换 script.js 中的 analysisModule.renderMetricSelector 函数
renderMetricSelector() {
const container = document.getElementById('metric-items-container');
    if (!container) return;

    const groups = [
        { name: '速度指标 (mm/h)', start: 0, end: 5 },
        { name: '位移指标 (mm)', start: 5, end: 10 },
        { name: '累积位移 (mm)', start: 10, end: 15 },
        { name: '派生指标 (加速度/角度)', start: 15, end: 19 } // 新增分组
    ];

    let html = `
        <div class="multi-item" style="border-bottom: 2px solid #eee; margin-bottom: 5px; background: #f8fbff;">
            <input type="checkbox" id="met-an-all"
                   ${this.selectedGlobalMetrics.length === this.allMetrics.length ? 'checked' : ''}
                   onchange="analysisModule.handleMetricToggle(this)" value="全部">
            <label for="met-an-all" style="font-weight:bold; color:#1c3d90;">全选所有指标</label>
        </div>
    `;

    groups.forEach(group => {
        html += `<div class="menu-group-title">${group.name}</div>`;
        const subMetrics = this.allMetrics.slice(group.start, group.end);
        subMetrics.forEach(metric => {
            html += `
                <div class="multi-item sub-item">
                    <input type="checkbox" id="met-an-${metric}" value="${metric}"
                           ${this.selectedGlobalMetrics.includes(metric) ? 'checked' : ''}
                           onchange="analysisModule.handleMetricToggle(this)">
                    <label for="met-an-${metric}">${metric}</label>
                </div>`;
        });
    });

    container.innerHTML = html;
},
// 替换 script.js 中的 analysisModule.handleMetricToggle 函数
handleMetricToggle(cb) {
    const val = cb.value;

    if (val === '全部') {
        // 如果勾选“全部”，则填充所有指标；否则清空
        this.selectedGlobalMetrics = cb.checked ? [...this.allMetrics] : [];
    } else {
        // 单个指标逻辑
        if (cb.checked) {
            if (!this.selectedGlobalMetrics.includes(val)) this.selectedGlobalMetrics.push(val);
        } else {
            this.selectedGlobalMetrics = this.selectedGlobalMetrics.filter(m => m !== val);
        }
    }

    // 更新 UI 状态
    this.renderMetricSelector();
    this.updateMetricButtonLabel();

    // 指标变化仅重绘曲线，不影响矢量图
    this.renderCurveChart();
    this.renderTable();
},
// 1. 优化指标按钮标签显示逻辑
updateMetricButtonLabel() {
    const label = document.getElementById('metric-btn-label');
    if (!label) return;

    const count = this.selectedGlobalMetrics.length;
    if (count === 0) {
        label.innerText = "请选择指标...";
        label.className = "placeholder-text";
    } else if (count === this.allMetrics.length) {
        label.innerText = "全部指标已选";
        label.className = "";
    } else {
        // 显示已选数量，而不是截断的字符串
        label.innerText = `已选 ${count} 项指标`;
        label.className = "";
    }
},
    exportChart(type) { const chart = (type === 'curve') ? this.charts.curve : this.charts.vector; if (chart) { const link = document.createElement('a'); link.href = chart.getDataURL({ pixelRatio: 2, backgroundColor: '#fff' }); link.download = `GNSS分析_${type}_${Date.now()}.png`; link.click(); } },
    openExportDialog() { this.openExportDialogLogic(); },

// 替换 script.js 中的 analysisModule.openExportDialogLogic 函数
openExportDialogLogic() {
    const container = document.getElementById('export-metric-list');
    if (!container) return;

    // 核心修改：仅保留 4 个坐标及观测值指标
    const exportCols = ['坐标X', '坐标Y', '坐标H', '应力/压力值'];

    // 渲染指标列表，默认全部勾选
    container.innerHTML = exportCols.map(col => `
        <div class="multi-item" style="border:none; padding: 5px 10px;">
            <input type="checkbox" class="ex-check" id="ex-col-${col}" value="${col}" checked
                   onchange="analysisModule.syncExportToggleState()">
            <label for="ex-col-${col}" style="cursor:pointer; font-size:13px; color:#444; flex:1;">${col}</label>
        </div>`).join('');

    // 默认开启全选状态
    const allToggle = document.getElementById('ex-all-toggle');
    if (allToggle) allToggle.checked = true;

    document.getElementById('export-panel').style.display = 'flex';
},

toggleAllExport(status) {
    // 批量设置所有指标复选框的状态
    document.querySelectorAll('.ex-check').forEach(cb => {
        cb.checked = status;
    });
},
// 在 analysisModule 对象中新增此函数，用于子项影响父项状态
syncExportToggleState() {
    const allChecks = document.querySelectorAll('.ex-check');
    const allToggle = document.getElementById('ex-all-toggle');
    if (!allToggle) return;

    // 如果有一个没选，全选框就不亮；全选了，全选框才亮
    const isAllChecked = Array.from(allChecks).every(cb => cb.checked);
    allToggle.checked = isAllChecked;
},
/* --- 替换 script.js 中的 analysisModule.doExport --- */
doExport() {
    const checkedBoxes = document.querySelectorAll('.ex-check:checked');
    const selectedCols = Array.from(checkedBoxes).map(cb => cb.value);
    if (selectedCols.length === 0) { alert('请至少选择一个导出字段'); return; }

    // 核心修改：这里的数组顺序必须与 renderTable 生成的 8 列完全一致
    const allTableCols = ['序号', '区域', '编号', '时间', '坐标X', '坐标Y', '坐标H', '应力/压力值'];

    // 生成 CSV 标题行：前 4 列固定 (序号, 区域, 编号, 时间) + 选中的动态列
    let csvContent = "\ufeff序号,区域,编号,时间," + selectedCols.join(",") + "\n";

    // 遍历表格行提取数据
    document.querySelectorAll('#full-table-body tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 8) return; // 跳过数据不完整的行

        // 基础数据（前 4 列，索引 0-3）
        let rowData = [
            cells[0].innerText,
            cells[1].innerText,
            cells[2].innerText,
            cells[3].innerText
        ];

        // 动态数据（根据勾选情况从索引 4-7 中提取）
        selectedCols.forEach(col => {
            const idx = allTableCols.indexOf(col);
            if (idx !== -1 && cells[idx]) {
                // 移除数值中的逗号以防干扰 CSV 格式
                rowData.push(cells[idx].innerText.replace(/,/g, ""));
            }
        });
        csvContent += rowData.join(",") + "\n";
    });

    // 创建下载任务
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }),
          link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `应力压力数据报表_${Date.now()}.csv`;
    link.click();

    // 关闭面板
    document.getElementById('export-panel').style.display = 'none';
},

    clearAll() {
        this.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
        this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'GNSS');
        this.selectedGlobalMetrics = ['XY速度(mm/h)']; this.tMultiplier = 1;
        if (this.charts.curve) this.charts.curve.clear(); if (this.charts.vector) this.charts.vector.clear();
        document.getElementById('full-table-head').innerHTML = ""; document.getElementById('full-table-body').innerHTML = "";
        this.syncFilterUI(); this.updateMetricButtonLabel(); this.renderMetricSelector();
    }
};


// ========== 页面初始化 ==========
// 修改 script.js 最后的 window.onload
// 替换 script.js 末尾的 window.onload
window.onload = () => {
    if (typeof backgroundModule !== 'undefined') backgroundModule.init();
    if (typeof headerModule !== 'undefined') headerModule.init();
    if (typeof mapModule !== 'undefined') mapModule.init();
    if (typeof dashModule !== 'undefined') dashModule.init();
    // 修改此行，确保逻辑层在加载时切到应力监测
    if (typeof appLogic !== 'undefined') appLogic.switchType('STRESS');

    timeUtils.updateMaxConstraints();
    // 2. 开启定时器，每分钟更新一次“现在”的上限，确保动态准确
    setInterval(() => timeUtils.updateMaxConstraints(), 60000);

    // 3. 执行默认的“一天内”初始化
    const oneDayBtn = document.querySelector('#time-engine-bar .freq-btn');
    if (oneDayBtn && typeof mapModule !== 'undefined') {
        mapModule.setTime(1, oneDayBtn);
    }

    if (typeof mapFilterModule !== 'undefined') mapFilterModule.init();

};

// 替换 script.js 底部 DOMContentLoaded 中的逻辑
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const panels = document.querySelectorAll('.glass-panel');
        panels.forEach(p => {
            // 通过标题文字精准锁定右下角看板
            if (p.innerText.includes('应力/压力监测曲线')) {
                p.style.cursor = 'pointer';
                p.onclick = (e) => {
                    e.stopPropagation();
                    // 不传参数，触发 analysisModule.open 内部的“预警第一条”逻辑
                    if (typeof analysisModule !== 'undefined') {
                        analysisModule.open();
                    }
                };
            }
        });
    }, 1000);
});