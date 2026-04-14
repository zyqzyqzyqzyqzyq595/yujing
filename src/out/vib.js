// ==========================================
// 辅助工具函数
// ==========================================
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

// ==========================================
// 背景粒子动画模块
// ==========================================
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

// ==========================================
// 顶部 Header 模块
// ==========================================
const headerModule = {
    init() {
        setInterval(() => {
            const now = new Date();
            document.getElementById('header-clock').innerText = now.toLocaleString();
        }, 1000);
    }
};

// ==========================================
// 筛选与抽屉逻辑模块 (已改为 VIB 核心)
// ==========================================
const mapFilterModule = {
    activeTypes: new Set(),
    isOpen: false,
    selectedRegions: ['全部'],
    selectedPoints: [],
    // 将 VIB 放在核心位置
    allTypes: ['VIB', 'DEEP', 'RADAR', 'SURFACE', 'CRACK', 'FIRE', 'WATER', 'GROUND', 'STRESS', 'GNSS', 'SAT'],

    // 区域中心点坐标（用于扇面照射方向自动校准）
    regionCoordinates: {
        '北帮': { x: 1500, y: 400 },
        '南帮': { x: 1500, y: 2100 },
        '西帮': { x: 450, y: 1250 },
        '东帮': { x: 2550, y: 1250 },
        '中央区': { x: 1500, y: 1250 }
    },

    // 雷达照射关系表
    radarTargetMapping: {
        '西帮': ['东帮'],
        '东帮': ['西帮'],
        '南帮': ['北帮'],
        '北帮': ['南帮'],
        '中央区': ['中央区', '北帮', '南帮']
    },

    init() {
        window.addEventListener('click', (e) => {
            if (!e.target.closest('.filter-group') && !e.target.closest('.custom-dropdown-content')) {
                document.querySelectorAll('.custom-dropdown-content').forEach(d => d.style.display = 'none');
            }
        });
        // 初始状态：全选区域，开启 VIB
        this.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
        // 获取所有 VIB 点位
        this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'VIB');
        this.activeTypes.add('VIB');
        this.syncUI();
    },

    toggleDropdown(id, e) {
        if (e) e.stopPropagation();
        const el = document.getElementById(id);
        if (!el) return;

        const isCurrentlyShow = el.style.display === 'block';

        document.querySelectorAll('.custom-dropdown-content').forEach(d => {
            d.style.display = 'none';
        });

        el.style.display = isCurrentlyShow ? 'none' : 'block';

        if (el.style.display === 'block') {
            const rect = el.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                el.style.left = 'auto';
                el.style.right = '0';
            } else {
                el.style.left = '0';
                el.style.right = 'auto';
            }

            if (id === 'map-point-dropdown') {
                this.renderPoints(document.getElementById('map-point-input').value);
            } else if (id === 'map-region-dropdown') {
                this.renderRegions();
            }
        }
    },

    toggleDrawer() {
        this.isOpen = !this.isOpen;
        const drawer = document.getElementById('device-drawer');
        const arrow = document.getElementById('drawer-arrow');
        if (drawer) drawer.classList.toggle('active', this.isOpen);
        if (arrow) arrow.innerText = this.isOpen ? '▼' : '▲';
    },

    toggle(type, el) {
        if (type === '全部') {
            const isFull = this.activeTypes.size === this.allTypes.length;
            if (isFull) {
                this.activeTypes.clear();
                this.removeRadarClouds();
                this.removeSatLayer();
                mapModule.selectedMapTypes = mapModule.selectedMapTypes.filter(t => t !== 'uav');
            } else {
                this.allTypes.forEach(t => this.activeTypes.add(t));
                this.renderSatLayer();
            }
        } else {
            if (this.activeTypes.has(type)) {
                this.activeTypes.delete(type);
                if (type === 'SAT') this.removeSatLayer();
                if (type === 'RADAR') {
                    this.removeRadarClouds();
                    const plus = document.querySelector('.radar-plus');
                    if (plus) plus.classList.remove('cloud-active');
                }
            } else {
                this.activeTypes.add(type);
                if (type === 'SAT') this.renderSatLayer();
            }
        }
        this.syncUI();
    },

    renderSatLayer() {
        this.removeSatLayer();
        const canvas = document.getElementById('map-canvas');
        const overlay = document.createElement('div');
        overlay.className = 'sat-green-overlay';
        overlay.id = 'sat-overlay';
        canvas.appendChild(overlay);
    },

    removeSatLayer() {
        const el = document.getElementById('sat-overlay');
        if (el) el.remove();
    },

    toggleRadarCloud(event, el) {
        if (event) event.stopPropagation();
        if (!this.activeTypes.has('RADAR')) return;
        el.classList.toggle('cloud-active');
        this.syncUI();
    },

    renderRadarClouds() {
        this.removeRadarClouds();
        const canvas = document.getElementById('map-canvas');
        const radarPoints = document.querySelectorAll('.point-obj.type-RADAR');
        const isFullMap = this.selectedRegions.includes('全部');

        radarPoints.forEach(p => {
            if (p.style.display === 'none') return;
            const meta = mapModule.pMeta[p.id];
            const fan = document.createElement('div');
            fan.className = 'radar-fan-layer';
            fan.style.left = (parseFloat(p.style.left) + 16 - 1400) + 'px';
            fan.style.top = (parseFloat(p.style.top) + 16 - 2800) + 'px';

            const targetRegion = isFullMap ? '中央区' : (this.selectedRegions.find(r => r !== '全部') || '中央区');
            const targetPos = { '北帮':{x:1500,y:2100}, '南帮':{x:1500,y:400}, '东帮':{x:450,y:1250}, '西帮':{x:2550,y:1250}, '中央区':{x:1500,y:1250} }[meta.region];

            const dx = targetPos.x - parseFloat(p.style.left), dy = targetPos.y - parseFloat(p.style.top);
            let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
            fan.style.transform = `rotate(${angle}deg)`;
            fan.innerHTML = `<div class="radar-fan-label" style="transform:rotate(${-angle}deg)">${meta.deviceId} 监控[${isFullMap?'全域':targetRegion}]</div>`;
            canvas.appendChild(fan);
        });
    },

    removeRadarClouds() {
        document.querySelectorAll('.radar-fan-layer').forEach(el => el.remove());
    },

    updateUI() {
        const allTypesList = ['VIB', 'DEEP', 'RADAR', 'SURFACE', 'CRACK', 'FIRE', 'WATER', 'GROUND', 'STRESS', 'GNSS', 'SAT'];
        document.querySelectorAll('.filter-item').forEach(item => {
            const isAllBtn = item.classList.contains('all-btn');
            let isActive = false;
            if (isAllBtn) {
                isActive = (this.activeTypes.size >= allTypesList.length);
            } else {
                const onClickAttr = item.getAttribute('onclick') || '';
                const match = onClickAttr.match(/'([^']+)'/);
                if (match && match[1]) {
                    const typeKey = match[1];
                    isActive = this.activeTypes.has(typeKey);
                }
            }
            item.classList.toggle('checked', isActive);
        });
    },

    handleGlobalClick(e) {
        const configs = [
            { btnId: 'map-region-btn', panelId: 'map-region-dropdown' },
            { btnId: 'map-point-input', panelId: 'map-point-dropdown' },
            { btnId: 'map-view-btn', panelId: 'map-view-dropdown' }
        ];

        configs.forEach(cfg => {
            const btn = document.getElementById(cfg.btnId);
            const panel = document.getElementById(cfg.panelId);
            if (panel && panel.style.display === 'block') {
                if (!btn.contains(e.target) && !panel.contains(e.target)) {
                    panel.style.display = 'none';
                }
            }
        });
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
        if (!list || list.length === 0) return null;
        return list.length <= 2 ? list.join('、') : list.slice(0, 2).join('、') + '...';
    },

    renderRegions() {
        const regions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
        const container = document.getElementById('map-region-dropdown');
        if (!container) return;
        container.innerHTML = regions.map(reg => `
            <div class="custom-dropdown-item" onclick="mapFilterModule.handleItemClick(this, event, 'region')">
                <input type="checkbox" value="${reg}" ${this.selectedRegions.includes(reg) ? 'checked' : ''} onchange="mapFilterModule.handleRegionChange(this)">
                <span style="${reg === '全部' ? 'font-weight:bold; color:#1c3d90;' : ''}">${reg}</span>
            </div>
        `).join('');
    },

// 在 mapFilterModule 对象内，替换原有的 getDisplayPoints 函数

    getDisplayPoints(filterVal = '') {
        // 1. 获取所有 VIB 设备
        const allVib = Object.keys(mapModule.pMeta)
            .filter(id => mapModule.pMeta[id].type === 'VIB')
            .map(id => ({ id, ...mapModule.pMeta[id] }));

        let list = [];
        // 2. 区域筛选逻辑
        if (this.selectedRegions.length === 0 || this.selectedRegions.includes('全部')) {
            list = allVib;
        } else {
            const cleanRegions = this.selectedRegions.filter(r => r !== '全部');
            list = allVib.filter(p => cleanRegions.includes(p.region));
        }

        // 3. 关键词搜索逻辑
        // 【核心修改】：在判断条件中增加了 && filterVal !== '全部监测点'
        // 这样当输入框里是这几个字时，就会跳过筛选，直接返回完整列表
        if (filterVal && filterVal !== '全部' && filterVal !== '全部监测点' && !filterVal.includes('、')) {
            list = list.filter(p =>
                p.deviceId.toLowerCase().includes(filterVal.toLowerCase()) ||
                p.deviceId.replace('VIB','').includes(filterVal)
            );
        }
        return list;
    },

    renderPoints(filterVal = '') {
        const container = document.getElementById('map-point-dropdown');
        if (!container) return;

        const displayList = this.getDisplayPoints(filterVal);
        const isAllChecked = displayList.length > 0 && displayList.every(p => this.selectedPoints.includes(p.id));

        const allHtml = `
            <div class="custom-dropdown-item"
                 style="border-bottom: 1px solid #eee; margin-bottom: 5px;"
                 onmousedown="event.preventDefault()"
                 onclick="mapFilterModule.handleItemClick(this, event, 'point')">
                <input type="checkbox" value="全部" ${isAllChecked ? 'checked' : ''} onchange="mapFilterModule.handlePointChange(this)">
                <span style="font-weight:bold; color:#1c3d90;">全部</span>
            </div>
        `;

        const itemsHtml = displayList.map(p => `
            <div class="custom-dropdown-item"
                 onmousedown="event.preventDefault()"
                 onclick="mapFilterModule.handleItemClick(this, event, 'point')">
                <input type="checkbox" value="${p.id}"
                       ${this.selectedPoints.includes(p.id) ? 'checked' : ''}
                       onchange="mapFilterModule.handlePointChange(this)">
                <span>${p.deviceId} <small style="color:#999">(${p.region})</small></span>
            </div>
        `).join('');

        container.innerHTML = displayList.length > 0 ? (allHtml + itemsHtml) : '<div style="padding:10px; color:#999; text-align:center;">该区域暂无监测点</div>';
    },

    handleRegionChange(cb) {
        const val = cb.value;
        const allRegions = ['北帮', '南帮', '东帮', '西帮', '中央区'];
        // 获取 VIB ID
        const allVibIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'VIB');
        const dropdown = document.getElementById('map-region-dropdown');

        if (val === '全部') {
            if (cb.checked) {
                this.selectedRegions = ['全部', ...allRegions];
                this.selectedPoints = [...allVibIds];
            } else {
                this.selectedRegions = [];
                this.selectedPoints = [];
            }
            if (dropdown) dropdown.style.display = 'block';
        } else {
            if (cb.checked) {
                if (this.selectedRegions.includes('全部')) {
                    this.selectedRegions = [];
                    this.selectedPoints = [];
                }
                if (!this.selectedRegions.includes(val)) {
                    this.selectedRegions.push(val);
                    const regionPoints = allVibIds.filter(id => mapModule.pMeta[id].region === val);
                    regionPoints.forEach(id => { if (!this.selectedPoints.includes(id)) this.selectedPoints.push(id); });
                }
                const subSelected = this.selectedRegions.filter(r => r !== '全部');
                if (subSelected.length === allRegions.length) {
                    if (!this.selectedRegions.includes('全部')) this.selectedRegions.push('全部');
                }
            } else {
                this.selectedRegions = this.selectedRegions.filter(r => r !== val && r !== '全部');
                const regionPoints = allVibIds.filter(id => mapModule.pMeta[id].region === val);
                this.selectedPoints = this.selectedPoints.filter(id => !regionPoints.includes(id));
            }
        }
        this.syncUI();
    },

    handlePointChange(cb) {
        const val = cb.value;
        const currentVisibleList = this.getDisplayPoints('');
        const currentVisibleIds = currentVisibleList.map(p => p.id);

        if (val === '全部') {
            if (cb.checked) {
                currentVisibleList.forEach(p => {
                    if (!this.selectedPoints.includes(p.id)) this.selectedPoints.push(p.id);
                });
            } else {
                this.selectedPoints = this.selectedPoints.filter(id => !currentVisibleIds.includes(id));
            }
        } else {
            if (cb.checked) {
                if (!this.selectedPoints.includes(val)) this.selectedPoints.push(val);
            } else {
                this.selectedPoints = this.selectedPoints.filter(p => p !== val);
            }
        }
        this.syncUI();
    },

    filterPointList(val) {
        this.renderPoints(val);
    },

    handlePointInput() {
        const input = document.getElementById('map-point-input');
        if (!input) return;
        const val = input.value.trim();
        const allVib = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'VIB');
        const allRegions = ['北帮', '南帮', '东帮', '西帮', '中央区'];

        if (val === '' || val === '全部' || val === '全部监测点') {
            if (val === '全部' || val === '全部监测点') {
                this.selectedPoints = [...allVib];
                this.selectedRegions = ['全部', ...allRegions];
            } else {
                this.selectedPoints = [];
                this.selectedRegions = [];
            }
            this.syncUI();
            return;
        }

        const parts = val.split(/[、,，\s]/).map(p => p.trim()).filter(p => p !== '');
        const newSelectedPoints = [];
        const newSelectedRegions = [];

        parts.forEach(part => {
            let targetNum = part.replace(/VIB/i, '');
            const matchedId = allVib.find(id => mapModule.pMeta[id].deviceId.replace('VIB', '') === targetNum);

            if (matchedId) {
                newSelectedPoints.push(matchedId);
                const meta = mapModule.pMeta[matchedId];
                if (!newSelectedRegions.includes(meta.region)) {
                    newSelectedRegions.push(meta.region);
                }
            }
        });

        this.selectedPoints = newSelectedPoints;
        this.selectedRegions = newSelectedRegions;
        if (this.selectedRegions.length === 5) this.selectedRegions.push('全部');
        this.syncUI();
    },

    syncUI() {
        this.renderRegions();
        this.renderPoints('');
        this.updateLabels();
        this.updateDrawerStyles();

        const isFullRegionSelected = this.selectedRegions.includes('全部');

        document.querySelectorAll('.point-obj').forEach(p => {
            const meta = mapModule.pMeta[p.id];
            if (!meta) return;

            const isTypeActive = this.activeTypes.has(meta.type);
            let isVisibilityMatch = false;

            if (meta.type === 'RADAR') {
                if (isFullRegionSelected) {
                    isVisibilityMatch = true;
                } else {
                    const targets = this.radarTargetMapping[meta.region] || [];
                    isVisibilityMatch = this.selectedRegions.some(reg => targets.includes(reg));
                }
            } else {
                isVisibilityMatch = isFullRegionSelected || this.selectedRegions.includes(meta.region);
            }

            // VIB 额外需要检查下拉框勾选
            const isPointChecked = (meta.type === 'VIB') ? this.selectedPoints.includes(p.id) : true;

            p.style.display = (isVisibilityMatch && isTypeActive && isPointChecked) ? 'block' : 'none';
        });

        const plusBtn = document.querySelector('.radar-plus');
        if (this.activeTypes.has('RADAR') && plusBtn && plusBtn.classList.contains('cloud-active')) {
            this.renderRadarClouds();
        } else {
            this.removeRadarClouds();
        }
    },

    updateLabels() {
        const regLabel = document.getElementById('map-region-label');
        if (regLabel) {
            const active = this.selectedRegions.filter(r => r !== '全部');
            regLabel.innerText = (this.selectedRegions.includes('全部') && active.length >= 5) ?
                '全部区域' : (this.formatLabel(active) || '选择区域');
        }

        const pointInput = document.getElementById('map-point-input');
        if (pointInput) {
            const allVib = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'VIB');
            if (this.selectedPoints.length > 0 && this.selectedPoints.length === allVib.length) {
                pointInput.value = '全部监测点';
            } else {
                const names = this.selectedPoints.map(id => mapModule.pMeta[id].deviceId);
                pointInput.value = names.join('、');
            }
        }
    },

    updateDrawerStyles() {
        document.querySelectorAll('.filter-item').forEach(item => {
            const onClickAttr = item.getAttribute('onclick') || '';
            const match = onClickAttr.match(/'([^']+)'/);
            if (match) {
                const typeKey = match[1];
                const isActive = (typeKey === '全部') ?
                    (this.activeTypes.size === this.allTypes.length) :
                    this.activeTypes.has(typeKey);
                item.classList.toggle('checked', isActive);
            }
        });
    }
};

// ==========================================
// 地质剖面分析模块
// ==========================================
const profileModule = {
    isDrawing: false,
    selectedPoints: [],
    isDragging: false,
    dragLine: { start: null, end: null },
    chartInstance: null,
    lastSavedOptions: null,
    currentOptions: null,
    isViewingHistory: false,

    enterMode() {
        this.isDrawing = true;
        this.selectedPoints = [];
        this.dragLine = { start: null, end: null };
        document.getElementById('draw-toolbar').style.display = 'flex';
        document.getElementById('btn-enter-profile').style.display = 'none';
        document.getElementById('map-viewer').style.cursor = 'crosshair';
        this.resetDrawingData();
    },

    exitMode() {
        this.isDrawing = false;
        if (this.chartInstance) {
            this.chartInstance.dispose();
            this.chartInstance = null;
        }
        document.getElementById('draw-toolbar').style.display = 'none';
        document.getElementById('profile-mini-trigger').style.display = 'none';
        document.getElementById('btn-enter-profile').style.display = 'block';
        document.getElementById('map-viewer').style.cursor = 'grab';
        this.currentOptions = null;
        this.lastSavedOptions = null;
        this.resetDrawingData();
    },

    confirmDraw() {
        let startPos, endPos;
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

        this.currentOptions = this.generateChartOptions(startPos, endPos);
        this.isViewingHistory = false;
        document.getElementById('profile-workbench').style.display = 'flex';
        const miniTrigger = document.getElementById('profile-mini-trigger');
        if (this.lastSavedOptions) {
            miniTrigger.style.display = 'flex';
        } else {
            miniTrigger.style.display = 'none';
        }
        this.updateWorkbenchUI();
    },

    hideWorkbench() {
        if (this.isViewingHistory) {
            this.isViewingHistory = false;
            this.updateWorkbenchUI();
            return;
        }
        if (this.currentOptions) {
            this.lastSavedOptions = JSON.parse(JSON.stringify(this.currentOptions));
            this.currentOptions = null;
        }
        document.getElementById('profile-workbench').style.display = 'none';
        document.getElementById('profile-mini-trigger').style.display = 'flex';
        this.resetDrawingData();
    },

    restoreWorkbench() {
        if (!this.lastSavedOptions) return;
        this.isViewingHistory = true;
        document.getElementById('profile-workbench').style.display = 'flex';
        this.updateWorkbenchUI();
    },

    updateWorkbenchUI() {
        const targetOptions = this.isViewingHistory ? this.lastSavedOptions : this.currentOptions;
        const saveBtn = document.querySelector('#profile-workbench button[onclick*="hideWorkbench"]');
        const tag = document.getElementById('profile-tag');

        if (!targetOptions) return;
        if (!this.chartInstance) {
            this.chartInstance = echarts.init(document.getElementById('profile-chart'));
        }
        this.chartInstance.setOption(targetOptions, true);
        this.chartInstance.resize();

        if (this.isViewingHistory) {
            if (saveBtn) saveBtn.innerText = "返回最新曲线";
            if (tag) tag.innerText = "历史记录对比模式";
            tag.style.background = "#ffa500";
        } else {
            if (saveBtn) saveBtn.innerText = "保存并收起";
            if (tag) tag.innerText = "最新绘制曲线窗口";
            tag.style.background = "#71C446";
        }
    },

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

// ==========================================
// 地图核心模块 (已替换为 VIB 核心)
// ==========================================
const mapModule = {
    scale: 0.6,
    pos: { x: -300, y: -200 },
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
        let drg = false, sx, sy;
        vp.onmousedown = (e) => {
            if (profileModule.isDrawing && e.ctrlKey && e.button === 0) {
                profileModule.handleMouseDown(e); return;
            }
            if (e.button === 0 && (e.target === vp || e.target.id === 'map-canvas')) {
                drg = true; sx = e.clientX - this.pos.x; sy = e.clientY - this.pos.y;
                vp.style.cursor = 'grabbing';
            }
        };
        window.onmousemove = (e) => {
            if (profileModule.isDrawing && profileModule.isDragging) {
                profileModule.handleMouseMove(e); return;
            }
            if (drg) { this.pos.x = e.clientX - sx; this.pos.y = e.clientY - sy; upd(); }
        };
        window.onmouseup = () => {
            if (profileModule.isDrawing && profileModule.isDragging) profileModule.handleMouseUp();
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

    setTime(days, btn) {
        document.querySelectorAll('#time-engine-bar .freq-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        const now = new Date();
        let start = new Date();
        start.setDate(now.getDate() - days);
        start.setHours(0, 0, 0, 0);
        const format = (d) => {
            const offset = d.getTimezoneOffset() * 60000;
            return new Date(d - offset).toISOString().slice(0, 16);
        };
        const sInp = document.getElementById('date-start');
        const eInp = document.getElementById('date-end');
        if (sInp) sInp.value = format(start);
        if (eInp) eInp.value = format(now);
        this.tMultiplier = (now - start) / (24 * 3600000);
        this.triggerFlash();
    },

    applyCustomTime() {
        const sInp = document.getElementById('date-start');
        const eInp = document.getElementById('date-end');
        if (!sInp.value || !eInp.value) return;
        const start = new Date(sInp.value), end = new Date(eInp.value), now = new Date();
        if (start > now || end > now) {
            alert("初始或终止时间不得晚于当前时刻");
            this.setTime(1, document.querySelector('#time-engine-bar .freq-btn'));
            return;
        }
        if (start.getTime() === end.getTime()) { alert("初始时间与终止时间不得相同"); return; }
        if (start > end) { alert("初始时间不得晚于终止时间"); return; }
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
        const options = [{ id: 'geology', label: '地质模型' }, { id: 'dtm', label: 'DTM面' }, { id: 'uav', label: '无人机地图' }];
        const container = document.getElementById('map-view-dropdown');
        if (!container) return;
        const isAllChecked = options.every(opt => this.selectedMapTypes.includes(opt.id));
        let html = `
            <div class="custom-dropdown-item" onclick="if(event.target.tagName !== 'INPUT') this.querySelector('input').click(); event.stopPropagation();">
                <input type="checkbox" value="all" ${isAllChecked ? 'checked' : ''} onchange="mapModule.handleViewTypeChange(this); event.stopPropagation();">
                <span class="all-select-text">全部选择</span>
            </div>
            <hr style="margin: 4px 8px; border: 0; border-top: 1px solid #f0f0f0;">
        `;
        html += options.map(opt => `
            <div class="custom-dropdown-item" onclick="if(event.target.tagName !== 'INPUT') this.querySelector('input').click(); event.stopPropagation();">
                <input type="checkbox" value="${opt.id}" ${this.selectedMapTypes.includes(opt.id) ? 'checked' : ''} onchange="mapModule.handleViewTypeChange(this); event.stopPropagation();">
                <span>${opt.label}</span>
            </div>
        `).join('');
        container.innerHTML = html;
    },

    handleViewTypeChange(cb) {
        const allOptions = ['geology', 'dtm', 'uav'];
        if (cb.value === 'all') {
            this.selectedMapTypes = cb.checked ? [...allOptions] : [];
        } else {
            if (cb.checked) { if (!this.selectedMapTypes.includes(cb.value)) this.selectedMapTypes.push(cb.value); }
            else { this.selectedMapTypes = this.selectedMapTypes.filter(t => t !== cb.value); }
        }
        this.updateMapFilters();
        this.renderViewDropdown();
    },

    updateMapFilters() {
        this.triggerFlash();
        const canvas = document.getElementById('map-canvas');
        const labelEl = document.getElementById('map-view-label');
        const labels = { geology: '地质模型', dtm: 'DTM面', uav: '无人机地图' };
        if (this.selectedMapTypes.length === 0) labelEl.innerText = "请选择模型";
        else {
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

    // 【核心修改】：生成 VIB 设备
    spawnPoints() {
        const cv = document.getElementById('map-canvas');
        const icons = { 'GNSS': '📍', 'DEEP': '⚓', 'RADAR': '📡', 'SURFACE': '📐', 'CRACK': '🧱', 'FIRE': '🔥', 'WATER': '💧', 'GROUND': '🌍', 'STRESS': '📊', 'VIB': '💥', 'SAT': '🛸' };
        const types = Object.keys(icons);
        const regionDefinitions = [{ name: '北帮', xRange: [800, 2200], yRange: [200, 600] }, { name: '南帮', xRange: [800, 2200], yRange: [1900, 2300] }, { name: '西帮', xRange: [200, 700], yRange: [800, 1700] }, { name: '东帮', xRange: [2300, 2800], yRange: [800, 1700] }, { name: '中央区', xRange: [1100, 1900], yRange: [1000, 1500] }];
        const placedPoints = [];
        const minDist = 60;
        let vibCount = 0;

        for (let i = 0; i < 150; i++) {
            let type = types[i % types.length];
            // 优先生成 VIB
            if (i < 7) type = 'RADAR';
            else if (type === 'RADAR') type = 'VIB';

            let alarmIdx = (i * 7) % 5;
            const isOnline = (i % 8 !== 0);
            if (type === 'VIB' && alarmIdx === 0) {
                if (vibCount < 2) vibCount++; else alarmIdx = 4;
            }

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
            this.pMeta[p.id] = { id: p.id, type, alarmIdx, isOnline, deviceId, region: regDef.name };

            p.innerHTML = `<div class="point-bubble"><span>${icons[type]}</span></div><div class="point-id">${deviceId}</div>`;

            // VIB 在线交互
            p.onclick = (e) => {
                if (profileModule.isDrawing) { e.stopPropagation(); profileModule.handlePointClick(p.id); }
                else if (isOnline && type === 'VIB') { dashModule.focusWithRange(p.id); analysisModule.open(this.pMeta[p.id]); }
            };
            p.onmouseenter = (e) => {
                const tt = document.getElementById('map-tooltip');
                tt.style.display = 'block';
                tt.innerHTML = `<b style="color:#85C6F1;">[${regDef.name}] ${deviceId}</b><hr style='margin:5px 0; opacity:0.2'>${this.getTechData(type, p.id)}`;
                tt.style.left = e.clientX + 15 + 'px'; tt.style.top = e.clientY + 15 + 'px';
            };
            p.onmouseleave = () => document.getElementById('map-tooltip').style.display = 'none';
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

    // 【核心修改】：Tooltip 显示振动数据
    getTechData(type, id) {
        const meta = this.pMeta[id];
        const multiplier = this.isDetailMode ? 1 : (this.tMultiplier || 1);
        const seed = parseInt(id.replace('pt-', '')) || 0;
        const speed = 0.5 + (seed % 5) * 0.4;
        const vibAmp = (speed * 0.8 * multiplier).toFixed(2); // 振幅
        const vibFreq = (10 + (seed % 20)).toFixed(1); // 频率

        const specs = {
            'VIB': `振动速度: ${speed.toFixed(2)} mm/s<br>振幅: ${vibAmp} mm<br>主频率: ${vibFreq} Hz`,
            'GNSS': `累计位移: ${(speed * 24).toFixed(2)} mm`,
            'RADAR': `视在形变: 0.5 mm<br>反射强度: -12.4 dB`,
        };
        return specs[type] || `设备状态: 运行正常`;
    }
};

// ==========================================
// 仪表盘与图表模块 (已改为 VIB 核心)
// ==========================================
const dashModule = {
    currentPage: 1,
    pageSize: 5,
    thresholds: { 0: 8.0, 1: 5.0, 2: 4.0, 3: 3.0, 4: "--" },
    colors: ['#F57676', '#FFA500', '#E6A23C', '#66B1FF', '#71C446'],
    currentChartId: null,

    init() {
        this.initOnlineChart();
        this.initAlarmChart();
        this.renderWarningTable();
        const allData = this.getSortedVibData();
        if (allData.length > 0) {
            this.initSpeedChart(allData[0].id);
        } else {
            this.initSpeedChart();
        }
    },

    // 离线数据列表与分页
    offlineData: [],
    offlineCurrentPage: 1,
    offlinePageSize: 5,

    showOfflineModal(data) {
        const modal = document.getElementById('offline-modal');
        const mapSection = document.getElementById('main-map-section');
        this.offlineData = data;
        this.offlineCurrentPage = 1;
        mapSection.appendChild(modal);
        modal.style.display = 'flex';

        // 联动过滤：离线 VIB
        const offlineIds = Object.keys(mapModule.pMeta).filter(id =>
            !mapModule.pMeta[id].isOnline && mapModule.pMeta[id].type === 'VIB'
        );
        const offlineRegions = [...new Set(offlineIds.map(id => mapModule.pMeta[id].region))];

        mapFilterModule.selectedPoints = offlineIds;
        mapFilterModule.selectedRegions = offlineRegions;
        mapFilterModule.syncUI();

        const regBtn = document.getElementById('map-region-btn');
        const pointInp = document.getElementById('map-point-input');
        [regBtn, pointInp].forEach(el => { if(el) { el.disabled = true; el.style.opacity = '0.5'; el.style.cursor = 'not-allowed'; }});
        document.querySelectorAll('.freq-btn').forEach(btn => btn.classList.remove('active'));
        this.renderOfflineTable();
    },

    renderOfflineTable() {
        const total = this.offlineData.length;
        const totalPages = Math.ceil(total / this.offlinePageSize) || 1;
        const start = (this.offlineCurrentPage - 1) * this.offlinePageSize;
        const pageData = this.offlineData.slice(start, start + this.offlinePageSize);
        const vendors = ['海康威视', '大华股份', '华测导航', '司南导航', '中海达'];

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

        const emptyRowsCount = this.offlinePageSize - pageData.length;
        for (let i = 0; i < emptyRowsCount; i++) html += `<tr><td colspan="6" style="border:none; height: 53px;">&nbsp;</td></tr>`;

        document.getElementById('offline-table-body').innerHTML = html;
        const info = document.getElementById('offline-pager-info');
        if(info) info.innerHTML = `显示 <b>${start + 1} - ${Math.min(start + this.offlinePageSize, total)}</b> / 总计 ${total} 条`;
        const ctrl = document.getElementById('offline-pager-ctrl');
        if (ctrl) {
            ctrl.innerHTML = `
                <button class="pager-btn ${this.offlineCurrentPage === 1 ? 'disabled' : ''}" onclick="if(dashModule.offlineCurrentPage > 1) dashModule.changeOfflinePage(dashModule.offlineCurrentPage - 1)"> < 上一页 </button>
                <span style="margin: 0 15px; color:#999; font-weight:bold;">${this.offlineCurrentPage} / ${totalPages}</span>
                <button class="pager-btn ${this.offlineCurrentPage === totalPages ? 'disabled' : ''}" onclick="if(dashModule.offlineCurrentPage < totalPages) dashModule.changeOfflinePage(dashModule.offlineCurrentPage + 1)"> 下一页 > </button>
            `;
        }
    },

    changeOfflinePage(p) {
        this.offlineCurrentPage = p;
        this.renderOfflineTable();
    },

    closeOfflineModal() {
        document.getElementById('offline-modal').style.display = 'none';
        mapFilterModule.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
        const allVibIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'VIB');
        mapFilterModule.selectedPoints = [...allVibIds];
        mapFilterModule.activeTypes.clear();
        mapFilterModule.activeTypes.add('VIB');
        const regBtn = document.getElementById('map-region-btn');
        const pointInp = document.getElementById('map-point-input');
        [regBtn, pointInp].forEach(el => { if(el) { el.disabled = false; el.style.opacity = '1'; el.style.cursor = 'pointer'; el.style.backgroundColor = '#ffffff'; }});
        const defaultBtn = document.querySelector('.freq-btn');
        if (defaultBtn) mapModule.setTime(1, defaultBtn);
        mapModule.isDetailMode = false;
        mapModule.focus('VIB');
        mapFilterModule.syncUI();
    },

    // 获取 VIB 数据
    getSortedVibData() {
        let data = Object.keys(mapModule.pMeta)
            .filter(id => {
                const meta = mapModule.pMeta[id];
                return meta && meta.type === 'VIB' && meta.isOnline;
            })
            .map((id) => {
                const meta = mapModule.pMeta[id];
                const seed = parseInt(id.replace('pt-', '')) || 0;
                const variance = (seed % 10) * 0.1;
                let currentSpeed = 0.5;
                switch (meta.alarmIdx) {
                    case 0: currentSpeed = 8.1 + variance * 3.5; break;
                    case 1: currentSpeed = 5.1 + variance * 2.5; break;
                    case 2: currentSpeed = 4.1 + variance * 0.8; break;
                    case 3: currentSpeed = 3.1 + variance * 0.8; break;
                    default: currentSpeed = 0.5 + (seed % 5) * 0.4;
                }
                return {
                    id: id, deviceId: meta.deviceId, alarmIdx: meta.alarmIdx, region: meta.region,
                    elevation: (1200 + Math.sin(seed) * 50).toFixed(1),
                    value: currentSpeed.toFixed(2),
                    threshold: this.thresholds[meta.alarmIdx]
                };
            });
        return data.sort((a, b) => a.alarmIdx - b.alarmIdx || b.value - a.value);
    },

    initSpeedChart(targetId) {
        this.currentChartId = targetId;
        const chartEl = document.getElementById('chart-sp');
        if (!chartEl) return;
        let chart = echarts.getInstanceByDom(chartEl);
        if (chart) chart.dispose();
        chart = echarts.init(chartEl);
        const meta = targetId ? mapModule.pMeta[targetId] : null;
        let dynamicData = [];
        let color = '#85C6F1';
        let alarmName = '趋势监测';
        if (meta) {
            color = this.colors[meta.alarmIdx];
            const seed = parseInt(targetId.replace('pt-', '')) || 0;
            let finalSpeed = 0.5;
            switch (meta.alarmIdx) {
                case 0: finalSpeed = 8.2; break;
                case 4: finalSpeed = 0.5; break;
                default: finalSpeed = 3.0;
            }
            const wave = (Math.sin(seed) * 0.15);
            dynamicData = [
                (finalSpeed * (0.3 + wave)).toFixed(2),
                (finalSpeed * (0.5 - wave)).toFixed(2),
                (finalSpeed * (0.8 + wave)).toFixed(2),
                (finalSpeed * (0.95 - wave)).toFixed(2),
                finalSpeed.toFixed(2)
            ];
            const alarmNames = ['一级告警 (危险)', '二级告警 (受控)', '三级告警 (注意)', '四级告警 (警示)', '运行正常'];
            alarmName = alarmNames[meta.alarmIdx];
        } else {
            dynamicData = [1.2, 4.5, 3.2, 5.8, 4.2];
        }
        chart.setOption({
            title: { text: meta ? `${meta.deviceId} - ${alarmName}` : '振动趋势', textStyle: { fontSize: 11, color: color, fontWeight: 'bold' }, right: 10, top: 0 },
            grid: { top: 40, bottom: 25, left: 45, right: 25 },
            xAxis: { type: 'category', boundaryGap: false, data: ['0h', '6h', '12h', '18h', '24h'], axisLabel: { fontSize: 10, color: '#888' } },
            yAxis: { type: 'value', name: '速度(mm/s)', nameTextStyle: { color: '#666', fontSize: 10, align: 'left', padding: [0, 0, 8, -20] }, axisLabel: { fontSize: 10, color: '#888' }, splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } } },
            series: [{ data: dynamicData, type: 'line', smooth: true, color: color, symbol: 'circle', symbolSize: 6, lineStyle: { width: 3 }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: color + 'CC' }, { offset: 1, color: 'rgba(255, 255, 255, 0)' }]) } }]
        });
    },

    renderWarningTable() {
        const allData = this.getSortedVibData();
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
        const tx = parseFloat(targetEl.style.left), ty = parseFloat(targetEl.style.top);
        mapModule.isDetailMode = true;
        mapModule.tMultiplier = 1;
        document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
        const oneDayBtn = document.querySelector('.freq-btn');
        if (oneDayBtn) oneDayBtn.classList.add('active');
        const resetBtn = document.getElementById('reset-gnss-btn');
        if (resetBtn) resetBtn.style.display = 'flex';
        this.initSpeedChart(targetId);
        let maxDiffX = 100, maxDiffY = 100;
        document.querySelectorAll('.point-obj').forEach(p => {
            const meta = mapModule.pMeta[p.id];
            if (meta && meta.type === 'VIB') {
                const px = parseFloat(p.style.left), py = parseFloat(p.style.top), dist = Math.sqrt((px - tx) ** 2 + (py - ty) ** 2);
                p.classList.remove('breathe', 'point-glow-active', 'point-focus-center');
                if (p.id === targetId || dist <= 1200) {
                    p.style.display = 'block'; p.style.color = p.style.backgroundColor;
                    maxDiffX = Math.max(maxDiffX, Math.abs(px - tx)); maxDiffY = Math.max(maxDiffY, Math.abs(py - ty));
                    if (p.id === targetId) p.classList.add('point-focus-center');
                } else { p.style.display = 'none'; }
            } else { p.style.display = 'none'; }
        });
        const vp = document.getElementById('map-viewer'), cv = document.getElementById('map-canvas');
        const padding = 200;
        const scaleX = (vp.clientWidth / 2) / (maxDiffX + padding), scaleY = (vp.clientHeight / 2) / (maxDiffY + padding);
        mapModule.scale = Math.min(scaleX, scaleY, 1.0);
        mapModule.pos.x = (vp.clientWidth / 2) - (tx * mapModule.scale);
        mapModule.pos.y = (vp.clientHeight / 2) - (ty * mapModule.scale);
        cv.style.transform = `translate(${mapModule.pos.x}px, ${mapModule.pos.y}px) scale(${mapModule.scale})`;
    },

    changePage(p) { this.currentPage = p; this.renderWarningTable(); },

    initOnlineChart() {
        // 【核心修改】：VIB 统计
        const vibNodes = Object.values(mapModule.pMeta).filter(n => n.type === 'VIB');
        const online = vibNodes.filter(n => n.isOnline).length, offline = vibNodes.length - online;
        const chart = echarts.init(document.getElementById('chart-on'));
        chart.setOption({
            title: { text: vibNodes.length, subtext: '设备总数', left: 'center', top: '35%', textStyle: { fontSize: 18, color: '#1c3d90', fontWeight: 'bold' }, subtextStyle: { fontSize: 10, color: '#999', verticalAlign: 'top' } },
            tooltip: { show: false },
            legend: { bottom: '2', icon: 'circle', itemWidth: 8, textStyle: { fontSize: 9 }, selectedMode: false, formatter: (name) => { const val = (name === '在线') ? online : offline; return `${name}  ${val}`; } },
            series: [{ type: 'pie', radius: ['45%', '65%'], center: ['50%', '45%'], avoidLabelOverlap: false, label: { show: false }, data: [{ value: online, name: '在线', itemStyle: { color: '#71C446' } }, { value: offline, name: '离线', itemStyle: { color: '#999' } }] }]
        });
        chart.on('click', params => {
            if (params.name === '离线') this.showOfflineModal(vibNodes.filter(n => !n.isOnline));
        });
    },

    initAlarmChart() {
        const vibNodes = Object.values(mapModule.pMeta).filter(n => n.type === 'VIB' && n.isOnline);
        const counts = [0, 0, 0, 0, 0];
        vibNodes.forEach(n => { counts[n.alarmIdx]++; });
        const chart = echarts.init(document.getElementById('chart-al'));
        const colors = ['#F57676', '#FFA500', '#fadb14', '#66B1FF', '#71C446'];
        const alarmNames = ['一级告警', '二级告警', '三级告警', '四级告警', '运行正常'];
        let displayCount = 0, displayLabel = "运行正常", displayColor = colors[4];
        for (let i = 0; i < 5; i++) { if (counts[i] > 0) { displayCount = counts[i]; displayLabel = alarmNames[i]; displayColor = colors[i]; break; } }
        chart.setOption({
            title: { text: displayCount, subtext: displayLabel, left: 'center', top: '35%', textStyle: { fontSize: 18, color: displayColor, fontWeight: 'bold' }, subtextStyle: { fontSize: 10, color: '#999', verticalAlign: 'top' } },
            tooltip: { show: false },
            legend: { bottom: '2', icon: 'circle', itemWidth: 8, textStyle: { fontSize: 8 }, selectedMode: false, formatter: (name) => { const idx = alarmNames.indexOf(name); return `${name}  ${counts[idx]}`; } },
            series: [{ type: 'pie', radius: ['45%', '65%'], center: ['50%', '45%'], label: { show: false }, data: alarmNames.map((name, i) => ({ value: counts[i], name: name, itemStyle: { color: colors[i] } })) }]
        });
        chart.on('click', params => {
            const targetIdx = params.dataIndex;
            if (targetIdx === 4) return;
            mapModule.isDetailMode = true; mapModule.tMultiplier = 1;
            document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
            const oneDayBtn = document.querySelector('.freq-btn');
            if (oneDayBtn) oneDayBtn.classList.add('active');
            const resetBtn = document.getElementById('reset-gnss-btn');
            if (resetBtn) resetBtn.style.display = 'flex';
            document.querySelectorAll('.point-obj').forEach(p => {
                const meta = mapModule.pMeta[p.id];
                const isMatch = (meta && meta.type === 'VIB') && (meta.isOnline) && (meta.alarmIdx === targetIdx);
                p.classList.remove('breathe', 'point-glow-active', 'point-focus-center');
                if (isMatch) { p.style.display = 'block'; p.style.color = p.style.backgroundColor; p.classList.add('breathe', 'point-glow-active'); }
                else { p.style.display = 'none'; }
            });
            mapModule.focus('VIB');
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
        const vibPoints = document.querySelectorAll('.point-obj.type-VIB');
        vibPoints.forEach(p => {
            p.classList.remove('breathe', 'point-glow-active');
            const meta = mapModule.pMeta[p.id];
            if (meta && meta.isOnline && meta.alarmIdx === 0) {
                p.style.color = p.style.backgroundColor;
                p.classList.add('breathe', 'point-glow-active');
            }
        });
        const allData = dashModule.getSortedVibData();
        if (allData.length > 0) dashModule.initSpeedChart(allData[0].id);
    },

    resetGnssFilter() {
        mapModule.isDetailMode = false;
        document.querySelectorAll('.point-obj.type-VIB').forEach(p => {
            p.style.display = 'block';
            p.classList.remove('point-focus-center', 'breathe', 'point-glow-active');
            const meta = mapModule.pMeta[p.id];
            if (meta && meta.isOnline && meta.alarmIdx === 0) {
                p.style.color = p.style.backgroundColor;
                p.classList.add('breathe', 'point-glow-active');
            }
        });
        mapModule.focus('VIB');
        document.getElementById('reset-gnss-btn').style.display = 'none';
        dashModule.currentPage = 1;
        dashModule.renderWarningTable();
        const allData = dashModule.getSortedVibData();
        if (allData.length > 0) {
            dashModule.initSpeedChart(allData[0].id);
        }
    }
};

// ==========================================
// 数据分析弹窗模块 (已改为 VIB 核心)
// ==========================================
const analysisModule = {
    charts: { curve: null, vector: null },
    selectedMetricsMap: {},
    selectedRegions: ['全部'],
    selectedPoints: [],
    selectedGlobalMetrics: ['XY速度(mm/h)'],
    tMultiplier: 1,
    tableFreq: 'hour',
    metricPage: 1,
    metricPageSize: 6,
    allMetrics: [
        'X速度(mm/h)', 'Y速度(mm/h)', 'H速度(mm/h)', 'XY速度(mm/h)', 'XYH速度(mm/h)',
        'X位移(mm)', 'Y位移(mm)', 'H位移(mm)', 'XY位移(mm)', 'XYH位移(mm)',
        'X累积位移(mm)', 'Y累积位移(mm)', 'H累积位移(mm)', 'XY累积位移(mm)', 'XYH累积位移(mm)',
        'X加速度(mm/h²)', 'Y加速度(mm/h²)', 'H加速度(mm/h²)', '切线角（°）'
    ],
    deviceColors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'],
    lineStyles: ['solid', 'dashed', 'dotted', 'dashDot'],

    setQuickTime(days, btn) {
        document.querySelectorAll('#analysis-modal .freq-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        const now = new Date();
        const start = new Date();
        if (days === 1) start.setTime(now.getTime() - 24 * 60 * 60 * 1000);
        else { start.setDate(now.getDate() - days); start.setHours(0, 0, 0, 0); }
        const offset = now.getTimezoneOffset() * 60000;
        const formatISO = (d) => new Date(d - offset).toISOString().slice(0, 16);
        document.getElementById('an-start').value = formatISO(start);
        document.getElementById('an-end').value = formatISO(now);
        this.tMultiplier = Math.max(0.1, (now - start) / (24 * 3600000));
        this.query();
    },

    initFilter() {
        if (this.filterInited) return;
        this.filterInited = true;
        window.addEventListener('click', (e) => {
            if (!e.target.closest('.filter-group') && !e.target.closest('.custom-dropdown-content')) {
                document.querySelectorAll('.custom-dropdown-content').forEach(d => d.style.display = 'none');
            }
            const metricBtn = document.getElementById('metric-select-btn');
            const metricMenu = document.getElementById('metric-items-container');
            if (metricMenu && metricMenu.style.display === 'block') {
                if (!metricBtn.contains(e.target) && !metricMenu.contains(e.target)) {
                    metricMenu.style.display = 'none';
                }
            }
        });
        this.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
        // VIB 点位
        const allVibIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'VIB');
        this.selectedPoints = [...allVibIds];
        this.selectedGlobalMetrics = [...this.allMetrics];
        this.renderMetricSelector();
        this.updateMetricButtonLabel();
        this.syncFilterUI();
    },

    toggleDropdown(id, e) {
        if (e) e.stopPropagation();
        const el = document.getElementById(id);
        if (!el) return;
        const isShow = el.style.display === 'block';
        document.querySelectorAll('.custom-dropdown-content').forEach(d => d.style.display = 'none');
        el.style.display = isShow ? 'none' : 'block';
        if (el.style.display === 'block') {
            const rect = el.getBoundingClientRect();
            if (rect.right > window.innerWidth) { el.style.left = 'auto'; el.style.right = '0'; }
            if (id === 'an-point-dropdown') this.renderPoints('');
            else if (id === 'an-region-dropdown') this.renderRegions();
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

    getDisplayPoints(filterVal = '') {
        const allVib = Object.keys(mapModule.pMeta)
            .filter(id => mapModule.pMeta[id]?.type === 'VIB')
            .map(id => ({ id, ...mapModule.pMeta[id] }));
        let list = [];
        if (this.selectedRegions.includes('全部')) { list = allVib; }
        else { list = allVib.filter(p => this.selectedRegions.includes(p.region)); }
        if (filterVal && filterVal !== '全部' && !filterVal.includes('、')) {
            list = list.filter(p => p.deviceId.toLowerCase().includes(filterVal.toLowerCase()) || p.deviceId.replace('VIB', '').includes(filterVal));
        }
        return list;
    },

    renderPoints(filterVal = '') {
        const container = document.getElementById('an-point-dropdown');
        if (!container) return;
        const displayList = this.getDisplayPoints(filterVal);
        const isAllChecked = displayList.length > 0 && displayList.every(p => this.selectedPoints.includes(p.id));
        const allHtml = `
            <div class="custom-dropdown-item" style="border-bottom: 1px solid #eee; margin-bottom: 5px;" onclick="analysisModule.handleItemClick(this, event, 'point')">
                <input type="checkbox" value="全部" ${isAllChecked ? 'checked' : ''} onchange="analysisModule.handlePointChange(this)">
                <span style="font-weight:bold; color:#1c3d90;">全部</span>
            </div>`;
        const itemsHtml = displayList.map(p => `
            <div class="custom-dropdown-item" onclick="analysisModule.handleItemClick(this, event, 'point')">
                <input type="checkbox" value="${p.id}" ${this.selectedPoints.includes(p.id) ? 'checked' : ''} onchange="analysisModule.handlePointChange(this)">
                <span>${p.deviceId} <small style="color:#999">(${p.region})</small></span>
            </div>`).join('');
        container.innerHTML = displayList.length > 0 ? (allHtml + itemsHtml) : '<div style="padding:10px; color:#999; text-align:center;">当前区域内暂无监测点</div>';
    },

    handleRegionChange(cb) {
        const allRegions = ['北帮', '南帮', '东帮', '西帮', '中央区'];
        const allVibIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'VIB');
        if (cb.value === '全部') {
            this.selectedRegions = cb.checked ? ['全部', ...allRegions] : [];
            this.selectedPoints = cb.checked ? [...allVibIds] : [];
        } else {
            if (cb.checked) {
                if (!this.selectedRegions.includes(cb.value)) this.selectedRegions.push(cb.value);
                allVibIds.filter(id => mapModule.pMeta[id]?.region === cb.value).forEach(id => { if (!this.selectedPoints.includes(id)) this.selectedPoints.push(id); });
                if (this.selectedRegions.filter(r => r !== '全部').length === allRegions.length) this.selectedRegions.push('全部');
            } else {
                this.selectedRegions = this.selectedRegions.filter(r => r !== cb.value && r !== '全部');
                const regionPoints = allVibIds.filter(id => mapModule.pMeta[id]?.region === cb.value);
                this.selectedPoints = this.selectedPoints.filter(id => !regionPoints.includes(id));
            }
        }
        this.syncFilterUI();
        this.query();
    },

    handlePointChange(cb) {
        const val = cb.value;
        const currentVisibleList = this.getDisplayPoints('');
        const currentVisibleIds = currentVisibleList.map(p => p.id);
        if (val === '全部') {
            if (cb.checked) { currentVisibleList.forEach(p => { if (!this.selectedPoints.includes(p.id)) this.selectedPoints.push(p.id); }); }
            else { this.selectedPoints = this.selectedPoints.filter(id => !currentVisibleIds.includes(id)); }
        } else {
            if (cb.checked) { if (!this.selectedPoints.includes(val)) this.selectedPoints.push(val); }
            else { this.selectedPoints = this.selectedPoints.filter(p => p !== val); }
        }
        this.syncFilterUI();
        this.query();
    },

    filterPointList(val) { this.renderPoints(val); },
    handlePointInput() {
        const val = document.getElementById('an-point-input')?.value.trim();
        const allVib = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'VIB');
        if (!val || val === '全部') {
            this.selectedPoints = (val === '全部') ? [...allVib] : [];
            this.selectedRegions = (val === '全部') ? ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'] : [];
        } else {
            const parts = val.split(/[、,，\s]/).map(p => p.trim()).filter(p => p !== '');
            this.selectedPoints = []; this.selectedRegions = [];
            parts.forEach(part => {
                const matchedId = allVib.find(id => mapModule.pMeta[id]?.deviceId?.replace('VIB', '') === part.replace(/VIB/i, ''));
                if (matchedId) {
                    if (!this.selectedPoints.includes(matchedId)) this.selectedPoints.push(matchedId);
                    if (!this.selectedRegions.includes(mapModule.pMeta[matchedId].region)) this.selectedRegions.push(mapModule.pMeta[matchedId].region);
                }
            });
            if (this.selectedRegions.length === 5) this.selectedRegions.push('全部');
        }
        this.syncFilterUI(); this.query();
    },

    syncFilterUI() {
        const regionLabel = document.getElementById('an-region-label');
        if (regionLabel) {
            const activeRegs = this.selectedRegions.filter(r => r !== '全部');
            if (this.selectedRegions.includes('全部') && activeRegs.length >= 5) regionLabel.innerText = '全部区域';
            else regionLabel.innerText = this.formatLabel(activeRegs) || '选择区域';
        }
        const input = document.getElementById('an-point-input');
        if (input) {
            const allVibCount = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'VIB').length;
            if (this.selectedPoints.length > 0 && this.selectedPoints.length >= allVibCount) input.value = "全部";
            else {
                const names = this.selectedPoints.map(id => mapModule.pMeta[id]?.deviceId?.replace('VIB', ''));
                input.value = names.join('、');
            }
        }
        this.renderRegions();
        this.renderPoints('');
    },

    getLogicData(devId, timestamp, metricIdx = 0) {
        const meta = mapModule.pMeta[devId] || { alarmIdx: 4 };
        const seed = parseInt(devId.replace('pt-', '')) || 0;
        const multiplier = this.tMultiplier || 1;
        let baseSpeed = [8.5, 5.5, 4.2, 3.2, 0.6][meta.alarmIdx] || 0.6;
        baseSpeed += (seed % 10) * 0.05 + (metricIdx * 0.02);
        const phase = seed * 1.5 + metricIdx;
        const wave = Math.sin(timestamp / 3600000 + phase);
        const noise = Math.sin(timestamp / 600000 * (seed % 5 + 1)) * 0.1;
        if (metricIdx >= 5 && metricIdx < 10) return parseFloat((baseSpeed * 24 * multiplier * (0.8 + noise)).toFixed(2));
        if (metricIdx >= 10 && metricIdx < 15) return parseFloat((baseSpeed * 48 * multiplier * (1 + noise * 0.2)).toFixed(2));
        if (metricIdx >= 15 && metricIdx < 18) return parseFloat((Math.cos(timestamp / 3600000 + phase) * 0.05 + noise * 0.1).toFixed(3));
        if (metricIdx === 18) { const angleBase = 15 + (seed % 30); return parseFloat((angleBase + wave * 5).toFixed(1)); }
        return parseFloat(Math.max(0.01, baseSpeed + wave * 0.5 + noise).toFixed(2));
    },

    open(targetMeta) {
        const modal = document.getElementById('analysis-modal');
        if (modal) modal.style.display = 'flex';
        this.initFilter();
        timeUtils.updateMaxConstraints();
        this.handleManualTimeChange();
        const modalBtns = document.querySelectorAll('#analysis-modal .freq-btn');
        if (targetMeta) {
            const homeStart = document.getElementById('date-start')?.value;
            const homeEnd = document.getElementById('date-end')?.value;
            if (homeStart && homeEnd) { document.getElementById('an-start').value = homeStart; document.getElementById('an-end').value = homeEnd; }
            const homeActiveBtn = document.querySelector('#time-engine-bar .freq-btn.active');
            if (homeActiveBtn) { const btnText = homeActiveBtn.innerText; const matchBtn = Array.from(modalBtns).find(b => b.innerText === btnText); if (matchBtn) matchBtn.classList.add('active'); }
            this.selectedPoints = [targetMeta.id];
            this.selectedRegions = [targetMeta.region];
        } else {
            const modalOneDayBtn = document.querySelector('#analysis-modal .freq-btn');
            if (modalOneDayBtn) this.setQuickTime(1, modalOneDayBtn);
            const sortedData = dashModule.getSortedVibData();
            if (sortedData.length > 0) {
                const firstMeta = mapModule.pMeta[sortedData[0].id];
                this.selectedPoints = [firstMeta.id];
                this.selectedRegions = [firstMeta.region];
                targetMeta = firstMeta;
            }
        }
        this.syncFilterUI();
        if (targetMeta) { const input = document.getElementById('an-point-input'); if (input) input.value = targetMeta.deviceId.replace('VIB', ''); }
        this.query();
    },

    handleManualTimeChange() {
        document.querySelectorAll('#analysis-modal .freq-btn').forEach(btn => btn.classList.remove('active'));
        const sInp = document.getElementById('an-start');
        const eInp = document.getElementById('an-end');
        const now = new Date();
        if (sInp.value && eInp.value) {
            const start = new Date(sInp.value);
            const end = new Date(eInp.value);
            if (start > now || end > now) { alert("所选时间不得晚于当前时刻"); this.setQuickTime(1, document.querySelector('#analysis-modal .freq-btn')); return; }
            if (start.getTime() === end.getTime()) { alert("起始时间与终止时间不得相同"); return; }
            if (start > end) { alert("初始时间不得晚于终止时间"); return; }
            this.tMultiplier = Math.max(0.1, (end - start) / (24 * 3600000));
        }
    },

    close() { document.getElementById('analysis-modal').style.display = 'none'; },
    query() { this.renderCurveChart(); this.renderVectorChart(); this.renderTable(); },

    renderCurveChart() {
        const el = document.getElementById('curve-chart-main');
        if (!el) return;
        if (this.charts.curve) { this.charts.curve.dispose(); this.charts.curve = null; }

        // 关键：如果没有选点或没选指标，直接返回
        if (this.selectedPoints.length === 0 || this.selectedGlobalMetrics.length === 0) return;

        this.charts.curve = echarts.init(el);
        const startVal = document.getElementById('an-start').value;
        const endVal = document.getElementById('an-end').value;
        const start = new Date(startVal), end = new Date(endVal);
        const totalHours = (end - start) / 3600000;
        let stepMs = totalHours <= 24 ? 1800000 : (totalHours <= 744 ? 3600000 : 86400000);

        const series = [];
        // 定义 6 种不同的线性（实线、虚线、点线、点划线等）
        const lineStylesList = ['solid', 'dashed', 'dotted', 'dashDot', [5, 10], [10, 5, 2, 5]];

        // 外层循环：监测点（决定颜色）
        this.selectedPoints.forEach((devId, pIdx) => {
            const meta = mapModule.pMeta[devId] || { deviceId: devId };
            // 每个监测点分配一个固定颜色
            const pointColor = this.deviceColors[pIdx % this.deviceColors.length];

            // 内层循环：选中的指标（决定线性）
            this.selectedGlobalMetrics.forEach((metric, mIdx) => {
                const metricFullIdx = this.allMetrics.indexOf(metric);
                const dataPoints = [];
                for (let t = start.getTime(); t <= end.getTime(); t += stepMs) {
                    dataPoints.push([t, this.getLogicData(devId, t, metricFullIdx)]);
                }

                // 指标决定线性样式
                const currentStyle = lineStylesList[mIdx % lineStylesList.length];

                series.push({
                    name: `${meta.deviceId}-${metric}`,
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    data: dataPoints,
                    lineStyle: {
                        width: 2,
                        color: pointColor, // 同一个点颜色一致
                        type: currentStyle  // 同一个指标线性一致
                    },
                    itemStyle: { color: pointColor }
                });
            });
        });

        this.charts.curve.setOption({
            tooltip: { trigger: 'axis', confine: true },
            dataZoom: [{ type: 'inside' }, { type: 'slider', height: 20, bottom: 5 }],
            legend: { top: '5%', type: 'scroll' },
            grid: { top: 80, bottom: 60, left: 60, right: 40 },
            xAxis: { type: 'time', axisLabel: { color: '#888' } },
            yAxis: { type: 'value', scale: true, axisLabel: { color: '#888' } },
            series: series
        });
    },

    renderVectorChart() {
        const el = document.getElementById('vector-chart-main');
        if (!el || !this.charts) return;
        if (this.charts.vector) { this.charts.vector.dispose(); this.charts.vector = null; }
        if (this.selectedPoints.length === 0) return;
        this.charts.vector = echarts.init(el);
        const start = new Date(document.getElementById('an-start').value);
        const end = new Date(document.getElementById('an-end').value);
        const freqType = document.getElementById('traj-freq').value;
        const freqMs = { 'hour': 3600000, 'day': 86400000, 'week': 604800000 }[freqType];
        const segments = Math.floor((end - start) / freqMs);
        const pointCount = segments + 1;
        const series = this.selectedPoints.map((devId, pIdx) => {
            const meta = mapModule.pMeta[devId] || { alarmIdx: 4 };
            const seed = parseInt(devId.replace('pt-', '')) || 0;
            const baseAngle = (seed * 137.5) % 360;
            const speed = [2.2, 1.8, 1.2, 0.8, 0.3][meta.alarmIdx] || 0.3;
            const baseColor = this.deviceColors[pIdx % this.deviceColors.length];
            let curX = 0, curY = 0;
            const pathData = [{ value: [0, 0], symbol: 'none' }];
            for (let i = 1; i < pointCount; i++) {
                const dx = Math.cos(baseAngle * Math.PI/180) * speed + (Math.random()-0.5)*0.2;
                const dy = Math.sin(baseAngle * Math.PI/180) * speed + (Math.random()-0.5)*0.2;
                curX += dx; curY += dy;
                const angle = Math.atan2(dy, dx) * 180 / Math.PI - 90;
                pathData.push({ value: [parseFloat(curX.toFixed(2)), parseFloat(curY.toFixed(2))], symbol: 'arrow', symbolRotate: angle, symbolSize: 8 });
            }
            return { name: meta.deviceId, type: 'line', smooth: false, data: pathData, lineStyle: { width: 2, color: baseColor }, itemStyle: { color: baseColor } };
        });
        this.charts.vector.setOption({
            tooltip: { trigger: 'item', confine: true }, legend: { bottom: 5, type: 'scroll' }, grid: { top: 40, bottom: 60, left: 60, right: 40 },
            xAxis: { name: 'X位移(mm)', scale: true, splitLine: { show: true, lineStyle: { type: 'dashed', color: '#eee' } } },
            yAxis: { name: 'Y位移(mm)', scale: true, splitLine: { show: true, lineStyle: { type: 'dashed', color: '#eee' } } },
            series
        });
    },

    // 【核心修改】：表头 22 列，数据行与表头完全对应
    renderTable() {
        const head = document.getElementById('full-table-head'),
            body = document.getElementById('full-table-body');
        if (!head || !body) return;

        if (this.selectedPoints.length === 0) {
            head.innerHTML = "";
            body.innerHTML = '<tr><td colspan="22" style="text-align:center; padding:30px; color:#999;">请先选择监测点进行查询</td></tr>';
            return;
        }

        // 定义表头 (22 列)
        const cols = [
            '序号', '区域', '编号', '时间',
            'X速度峰值(cm/s)', 'Y速度峰值(cm/s)', 'H速度峰值(cm/s)',
            'X加速度峰值(mg)', 'Y加速度峰值(mg)', 'H加速度峰值(mg)',
            'X倾角（°）', 'Y倾角（°）', 'H倾角（°）',
            'X振幅(cm)', 'Y振幅(cm)','H振幅(cm)',
            'X主频率(hz)', 'Y主频率(hz)','H主频率(hz)',
            'X重力加速度(mg)', 'Y重力加速度(mg)', 'H重力加速度(mg)'
        ];
        head.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;

        const start = new Date(document.getElementById('an-start').value);
        const end = new Date(document.getElementById('an-end').value);
        const msMap = { 'hour': 3600000, 'day': 86400000, 'week': 604800000, 'month': 2592000000 };
        const interval = msMap[this.tableFreq || 'hour'];

        let html = "", rowNum = 1;

        this.selectedPoints.forEach(devId => {
            const meta = mapModule.pMeta[devId] || { region: '未知', deviceId: devId };

            for (let currentTs = start.getTime(); currentTs <= end.getTime(); currentTs += interval) {
                // 生成各类动态数据
                const spX = this.getLogicData(devId, currentTs, 0);
                const spY = this.getLogicData(devId, currentTs, 1);
                const spH = this.getLogicData(devId, currentTs, 2);

                const accX = this.getLogicData(devId, currentTs, 15);
                const accY = this.getLogicData(devId, currentTs, 16);
                const accH = this.getLogicData(devId, currentTs, 17);

                const tAngleX = this.getLogicData(devId, currentTs, 18);
                const tAngleY = (tAngleX * 0.9).toFixed(1);
                const tAngleH = (tAngleX * 0.1).toFixed(1);

                const ampX = (spX * 0.1).toFixed(2);
                const ampY = (spY * 0.1).toFixed(2);
                const ampH = (spH * 0.05).toFixed(2);

                const freqX = (10 + Math.random() * 5).toFixed(1);
                const freqY = (10 + Math.random() * 5).toFixed(1);
                const freqH = (5 + Math.random() * 2).toFixed(1);

                const gX = (accX * 10).toFixed(2);
                const gY = (accY * 10).toFixed(2);
                const gH = (980 + parseFloat(accH)).toFixed(2);

                // 生成对齐的 22 列数据行
                html += `
                    <tr>
                        <td>${rowNum++}</td>
                        <td>${meta.region}</td>
                        <td style="font-weight:bold; color:#1c3d90">${meta.deviceId}</td>
                        <td>${new Date(currentTs).toLocaleString()}</td>
                        
                        <td>${spX}</td><td>${spY}</td><td>${spH}</td>
                        <td>${accX}</td><td>${accY}</td><td>${accH}</td>
                        <td>${tAngleX}°</td><td>${tAngleY}°</td><td>${tAngleH}°</td>
                        <td>${ampX}</td><td>${ampY}</td><td>${ampH}</td>
                        <td>${freqX}</td><td>${freqY}</td><td>${freqH}</td>
                        <td>${gX}</td><td>${gY}</td><td>${gH}</td>
                    </tr>`;

                if (rowNum > 2000) break;
            }
        });
        body.innerHTML = html;
    },

    toggleMetricMenu(e) { if (e) e.stopPropagation(); const menu = document.getElementById('metric-items-container'); if (menu) menu.style.display = (menu.style.display === 'block') ? 'none' : 'block'; },

    renderMetricSelector() {
    const container = document.getElementById('metric-items-container');
    if (!container) return;

    // 1. 保留全选选项的 HTML 结构
    let html = `
        <div class="multi-item" style="border-bottom: 2px solid #eee; margin-bottom: 5px; background: #f8fbff;">
            <input type="checkbox" id="met-an-all" ${this.selectedGlobalMetrics.length === this.allMetrics.length ? 'checked' : ''} onchange="analysisModule.handleMetricToggle(this)" value="全部">
            <label for="met-an-all" style="font-weight:bold; color:#1c3d90;">全选所有指标</label>
        </div>
    `;

    // 2. 直接遍历所有指标项，不再生成 group.name 分类标题
    this.allMetrics.forEach(metric => {
        html += `
            <div class="multi-item sub-item">
                <input type="checkbox" id="met-an-${metric}" value="${metric}" ${this.selectedGlobalMetrics.includes(metric) ? 'checked' : ''} onchange="analysisModule.handleMetricToggle(this)">
                <label for="met-an-${metric}">${metric}</label>
            </div>`;
    });

    container.innerHTML = html;
},

    handleMetricToggle(cb) {
        const val = cb.value;
        if (val === '全部') {
            this.selectedGlobalMetrics = cb.checked ? [...this.allMetrics] : [];
        } else {
            if (cb.checked) {
                if (!this.selectedGlobalMetrics.includes(val)) this.selectedGlobalMetrics.push(val);
            } else {
                this.selectedGlobalMetrics = this.selectedGlobalMetrics.filter(m => m !== val);
            }
        }
        this.renderMetricSelector();      // 更新下拉列表勾选状态
        this.updateMetricButtonLabel();   // 更新按钮文字
        this.renderCurveChart();          // 【关键】立刻重新画图
        this.renderTable();               // 立刻更新表格
    },

    updateMetricButtonLabel() {
        const label = document.getElementById('metric-btn-label');
        if (!label) return;
        const count = this.selectedGlobalMetrics.length;
        if (count === 0) { label.innerText = "请选择指标..."; label.className = "placeholder-text"; }
        else if (count === this.allMetrics.length) { label.innerText = "全部指标已选"; label.className = ""; }
        else { label.innerText = `已选 ${count} 项指标`; label.className = ""; }
    },

    exportChart(type) { const chart = (type === 'curve') ? this.charts.curve : this.charts.vector; if (chart) { const link = document.createElement('a'); link.href = chart.getDataURL({ pixelRatio: 2, backgroundColor: '#fff' }); link.download = `VIB分析_${type}_${Date.now()}.png`; link.click(); } },

    openExportDialog() { this.openExportDialogLogic(); },

    openExportDialogLogic() {
        const container = document.getElementById('export-metric-list');
        if (!container) return;
        const exportCols = ['X速度峰值', 'Y速度峰值', 'H速度峰值', 'X加速度', 'Y加速度', 'H加速度', 'X倾角', 'Y倾角', 'H倾角', 'X振幅', 'Y振幅', 'H振幅', 'X频率', 'Y频率', 'H频率', 'X重力', 'Y重力', 'H重力'];
        container.innerHTML = exportCols.map(col => `
            <div class="multi-item" style="border:none; padding: 5px 10px;">
                <input type="checkbox" class="ex-check" id="ex-col-${col}" value="${col}" checked onchange="analysisModule.syncExportToggleState()">
                <label for="ex-col-${col}" style="cursor:pointer; font-size:13px; color:#444; flex:1;">${col}</label>
            </div>`).join('');
        const allToggle = document.getElementById('ex-all-toggle');
        if (allToggle) allToggle.checked = true;
        document.getElementById('export-panel').style.display = 'flex';
    },

    syncExportToggleState() {
        const allChecks = document.querySelectorAll('.ex-check');
        const allToggle = document.getElementById('ex-all-toggle');
        if (!allToggle) return;
        const isAllChecked = Array.from(allChecks).every(cb => cb.checked);
        allToggle.checked = isAllChecked;
    },
    toggleAllExport(status) { document.querySelectorAll('.ex-check').forEach(cb => cb.checked = status); },

    doExport() {
        const checkedBoxes = document.querySelectorAll('.ex-check:checked');
        const selectedCols = Array.from(checkedBoxes).map(cb => cb.value); if (selectedCols.length === 0) { alert('请至少选择一个导出字段'); return; }
        let csvContent = "\ufeff序号,区域,编号,时间," + selectedCols.join(",") + "\n";
        document.querySelectorAll('#full-table-body tr').forEach(row => {
            const cells = row.querySelectorAll('td'); if (cells.length < 4) return;
            let rowData = [cells[0].innerText, cells[1].innerText, cells[2].innerText, cells[3].innerText];
            // 简单导出：只导出前几列作为示例
            csvContent += rowData.join(",") + "\n";
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), link = document.createElement("a");
        link.href = URL.createObjectURL(blob); link.download = `VIB数据分析_${Date.now()}.csv`; link.click();
        document.getElementById('export-panel').style.display = 'none';
    },

    clearAll() {
        this.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
        this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'VIB');
        this.selectedGlobalMetrics = ['XY速度(mm/h)']; this.tMultiplier = 1;
        if (this.charts.curve) this.charts.curve.clear(); if (this.charts.vector) this.charts.vector.clear();
        document.getElementById('full-table-head').innerHTML = ""; document.getElementById('full-table-body').innerHTML = "";
        this.syncFilterUI(); this.updateMetricButtonLabel(); this.renderMetricSelector();
    }
};

// ==========================================
// 入口函数
// ==========================================
window.onload = () => {
    if (typeof backgroundModule !== 'undefined') backgroundModule.init();
    if (typeof headerModule !== 'undefined') headerModule.init();
    if (typeof mapModule !== 'undefined') mapModule.init();
    if (typeof dashModule !== 'undefined') dashModule.init();
    if (typeof appLogic !== 'undefined') appLogic.switchType('VIB'); // 默认为 VIB
    timeUtils.updateMaxConstraints();
    setInterval(() => timeUtils.updateMaxConstraints(), 60000);
    const oneDayBtn = document.querySelector('#time-engine-bar .freq-btn');
    if (oneDayBtn && typeof mapModule !== 'undefined') mapModule.setTime(1, oneDayBtn);
    if (typeof mapFilterModule !== 'undefined') mapFilterModule.init();
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const panels = document.querySelectorAll('.glass-panel');
        panels.forEach(p => {
            if (p.innerText.includes('速度曲线')) {
                p.style.cursor = 'pointer';
                p.onclick = (e) => { e.stopPropagation(); if (typeof analysisModule !== 'undefined') analysisModule.open(); };
            }
        });
    }, 1000);
});