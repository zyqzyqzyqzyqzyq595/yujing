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

const mapFilterModule = {
    selectedRegions: [], // 已选区域
    selectedPoints: [],  // 已选监测点 ID

    init() {
        // 关键修复：如果监测点数据 pMeta 还没生成完，延迟 100ms 再执行，确保初始加载能拿到数据
        if (!mapModule.pMeta || Object.keys(mapModule.pMeta).length === 0) {
            setTimeout(() => this.init(), 100);
            return;
        }
        this.renderRegions();
        this.renderPoints();
        this.syncUI();
        document.addEventListener('click', this.handleGlobalClick.bind(this));
    },

    // 处理全局点击，实现点击外部关闭下拉框
    handleGlobalClick(e) {
        const dropDownConfigs = [
            { btnId: 'map-region-btn', panelId: 'map-region-dropdown' },
            { btnId: 'map-point-input', panelId: 'map-point-dropdown' },
            { btnId: 'map-view-btn', panelId: 'map-view-dropdown' }
        ];

        dropDownConfigs.forEach(cfg => {
            const btn = document.getElementById(cfg.btnId);
            const panel = document.getElementById(cfg.panelId);
            if (panel && panel.style.display === 'block') {
                if (!btn.contains(e.target) && !panel.contains(e.target)) {
                    panel.style.display = 'none';
                    if (cfg.panelId === 'map-point-dropdown') {
                        this.handlePointInput(); // 失去焦点同步填写内容
                    }
                }
            }
        });
    },

    // 切换下拉框显示，互斥关闭其他
    toggleDropdown(id, e) {
        e.stopPropagation();
        const el = document.getElementById(id);
        const isShow = el.style.display === 'block';

        // 逻辑：点击其中一个下拉栏，关闭所有其它已打开的面板
        document.querySelectorAll('.custom-dropdown-content').forEach(d => {
            if(d.id !== id) d.style.display = 'none';
        });

        el.style.display = isShow ? 'none' : 'block';

        if (el.style.display === 'block') {
            if (id === 'map-point-dropdown') {
                this.renderPoints(document.getElementById('map-point-input').value);
            } else if (id === 'map-region-dropdown') {
                this.renderRegions();
            }
        }
    },

    formatLabel(list) {
        if (!list || list.length === 0) return null;
        return list.length <= 2 ? list.join('、') : list.slice(0, 2).join('、') + '...';
    },

    // 渲染区域下拉列表
    renderRegions() {
        const regions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
        const container = document.getElementById('map-region-dropdown');
        if (!container) return;
        container.innerHTML = regions.map(reg => `
            <div class="custom-dropdown-item">
                <input type="checkbox" value="${reg}" ${this.selectedRegions.includes(reg) ? 'checked' : ''} onchange="mapFilterModule.handleRegionChange(this)">
                <span style="${reg === '全部' ? 'font-weight:bold; color:#1c3d90;' : ''}">${reg}</span>
            </div>
        `).join('');
    },

    // 渲染监测点下拉列表
    renderPoints(filterVal = '') {
        const container = document.getElementById('map-point-dropdown');
        if (!container) return;

        const allGnss = Object.keys(mapModule.pMeta)
            .filter(id => mapModule.pMeta[id].type === 'CRACK')
            .map(id => ({ id, ...mapModule.pMeta[id] }));

        // 逻辑：如果没有任何区域被勾选，初始显示全部监测点供选择；
        // 如果勾选了区域（如东帮、南帮），则显示这些区域内全部的检测点（包含已勾选和未勾选的）
        let displayList = [];
        if (this.selectedRegions.length === 0 || this.selectedRegions.includes('全部')) {
            displayList = allGnss;
        } else {
            const cleanRegions = this.selectedRegions.filter(r => r !== '全部');
            displayList = allGnss.filter(p => cleanRegions.includes(p.region));
        }

        // 搜索过滤
        if (filterVal && !filterVal.includes('、')) {
            displayList = displayList.filter(p =>
                p.deviceId.toLowerCase().includes(filterVal.toLowerCase()) ||
                p.deviceId.replace('GNSS', '').includes(filterVal)
            );
        }

        container.innerHTML = displayList.map(p => `
            <div class="custom-dropdown-item" onclick="event.stopPropagation()">
                <input type="checkbox" class="point-cb" value="${p.id}"
                       ${this.selectedPoints.includes(p.id) ? 'checked' : ''}
                       onchange="mapFilterModule.handlePointChange(this)">
                <span>${p.deviceId} <small style="color:#999">(${p.region})</small></span>
            </div>
        `).join('') || '<div style="padding:10px; color:#999; text-align:center;">暂无匹配点位</div>';
    },

    // 区域勾选变化逻辑
    handleRegionChange(cb) {
        const val = cb.value;
        const allGnssPoints = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'CRACK');

        if (val === '全部') {
            if (cb.checked) {
                this.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
                this.selectedPoints = [...allGnssPoints];
            } else {
                this.selectedRegions = [];
                this.selectedPoints = [];
            }
        } else {
            if (cb.checked) {
                if (!this.selectedRegions.includes(val)) this.selectedRegions.push(val);
                // 逻辑：点击区域后，该区域监测点下拉栏全部勾选
                const regionPoints = allGnssPoints.filter(id => mapModule.pMeta[id].region === val);
                regionPoints.forEach(id => {
                    if (!this.selectedPoints.includes(id)) this.selectedPoints.push(id);
                });
            } else {
                this.selectedRegions = this.selectedRegions.filter(r => r !== val && r !== '全部');
                const regionPoints = allGnssPoints.filter(id => mapModule.pMeta[id].region === val);
                this.selectedPoints = this.selectedPoints.filter(id => !regionPoints.includes(id));
            }
        }
        this.syncUI();
    },

    // 单个点勾选变化逻辑
    handlePointChange(cb) {
        const id = cb.value;
        const meta = mapModule.pMeta[id];
        if (cb.checked) {
            if (!this.selectedPoints.includes(id)) this.selectedPoints.push(id);
            // 逻辑：先选择监测点，区域显示为该监测点的区域
            if (!this.selectedRegions.includes(meta.region)) {
                this.selectedRegions.push(meta.region);
            }
        } else {
            this.selectedPoints = this.selectedPoints.filter(p => p !== id);
        }
        this.syncUI();
    },

    filterPointList(val) {
        this.renderPoints(val);
    },

    // 核心逻辑：填写添加点位联动
    handlePointInput() {
        const input = document.getElementById('map-point-input');
        const val = input.value.trim();
        if (val === '' || val.includes('、')) return;

        const parts = val.split(/[、,，\s]/).map(p => p.trim()).filter(p => p !== '');
        const allGnssIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'CRACK');

        parts.forEach(part => {
            let targetNum = part.replace(/CRACK/i, '');
            const matchedId = allGnssIds.find(id => mapModule.pMeta[id].deviceId.replace('CRACK', '') === targetNum);

            if (matchedId) {
                const meta = mapModule.pMeta[matchedId];
                if (!this.selectedPoints.includes(matchedId)) this.selectedPoints.push(matchedId);
                // 逻辑：填写添加55时，北帮区域勾选上，且下拉栏更新为包含北帮全部监测点
                if (!this.selectedRegions.includes(meta.region)) {
                    this.selectedRegions.push(meta.region);
                }
            }
        });
        this.syncUI();
    },

    // 同步 UI 状态与强制重绘
    syncUI() {
        const regDisplay = this.selectedRegions.filter(r => r !== '全部');
        document.getElementById('map-region-label').innerText = this.formatLabel(regDisplay) || '选择区域';

        const pointNames = this.selectedPoints.map(id => mapModule.pMeta[id].deviceId.replace('CRACK', ''));
        document.getElementById('map-point-input').value = pointNames.join('、');

        // 关键修复：显式重绘下拉内容，解决显示不全或 Checkbox 状态不同步问题
        this.renderRegions();
        this.renderPoints('');

        mapModule.triggerFlash();
        this.applyFilter();
    },

    applyFilter() {
        const hasSelection = this.selectedPoints.length > 0;
        document.querySelectorAll('.point-obj.type-CRACK').forEach(el => {
            el.style.display = (!hasSelection || this.selectedPoints.includes(el.id)) ? 'block' : 'none';
        });

        dashModule.currentPage = 1;
        dashModule.renderWarningTable();
    }
};

const profileModule = {
    isDrawing: false,
    selectedPoints: [],
    isDragging: false,
    dragLine: {
        start: null,
        end: null
    },
    chartInstance: null,

    enterMode() {
        this.isDrawing = true;
        this.selectedPoints = [];
        this.dragLine = {
            start: null,
            end: null
        };
        document.getElementById('draw-toolbar').style.display = 'flex';
        document.getElementById('btn-enter-profile').style.display = 'none';
        document.getElementById('map-viewer').style.cursor = 'crosshair';
        this.renderLines();
    },

    exitMode() {
        this.isDrawing = false;
        document.getElementById('draw-toolbar').style.display = 'none';
        document.getElementById('btn-enter-profile').style.display = 'block';
        document.getElementById('map-viewer').style.cursor = 'grab';
        this.resetDrawingData();
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
        this.dragLine.start = {
            x: (e.clientX - r.left) / mapModule.scale,
            y: (e.clientY - r.top) / mapModule.scale
        };
        e.preventDefault();
    },

    handleMouseMove(e) {
        if (!this.isDrawing || !this.isDragging) return;
        const r = document.getElementById('map-canvas').getBoundingClientRect();
        this.dragLine.end = {
            x: (e.clientX - r.left) / mapModule.scale,
            y: (e.clientY - r.top) / mapModule.scale
        };
        this.renderLines();
    },

    handleMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
        }
    },

    renderLines() {
        const svg = document.getElementById('draw-svg');
        svg.innerHTML = '';
        if (this.selectedPoints.length >= 2) {
            let pathStr = "";
            this.selectedPoints.forEach((pid, i) => {
                const el = document.getElementById(pid);
                const px = parseFloat(el.style.left) + 16,
                    py = parseFloat(el.style.top) + 16;
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
            line.setAttribute("x1", this.dragLine.start.x);
            line.setAttribute("y1", this.dragLine.start.y);
            line.setAttribute("x2", this.dragLine.end.x);
            line.setAttribute("y2", this.dragLine.end.y);
            line.setAttribute("stroke", "#F57676");
            line.setAttribute("stroke-width", "6");
            svg.appendChild(line);
        }
    },

    confirmDraw() {
        let startPos, endPos;
        if (this.selectedPoints.length >= 2) {
            const pStart = document.getElementById(this.selectedPoints[0]);
            const pEnd = document.getElementById(this.selectedPoints[this.selectedPoints.length - 1]);
            startPos = {
                x: parseFloat(pStart.style.left),
                y: parseFloat(pStart.style.top)
            };
            endPos = {
                x: parseFloat(pEnd.style.left),
                y: parseFloat(pEnd.style.top)
            };
        } else if (this.dragLine.start && this.dragLine.end) {
            startPos = this.dragLine.start;
            endPos = this.dragLine.end;
        } else {
            alert("请至少点击2个点或按住Ctrl划线以确定剖面位置");
            return;
        }
        document.getElementById('profile-workbench').style.display = 'flex';
        this.initChart(startPos, endPos);
    },

    initChart(start, end) {
        if (this.chartInstance) this.chartInstance.dispose();
        this.chartInstance = echarts.init(document.getElementById('profile-chart'));
        const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        const seed = (Math.abs(start.x + start.y - end.x - end.y) % 100) / 100;
        const terrainData = [];
        const slidingData = [];
        const xAxisLabels = ['起', '20%', '40%', '60%', '80%', '终'];
        const baseH = 1200 + (seed * 80);
        const slope = (end.y - start.y) / 5;
        for (let i = 0; i < 6; i++) {
            const ratio = i / 5;
            const h = baseH - (slope * ratio) + (Math.sin(ratio * Math.PI + seed * 10) * 20);
            terrainData.push(h.toFixed(1));
            const depth = 25 + (seed * 40) * Math.sin(ratio * Math.PI);
            slidingData.push((h - depth).toFixed(1));
        }
        this.chartInstance.setOption({
            title: {
                text: `剖面结构分析 (${Math.round(distance)}m)`,
                left: 'center',
                textStyle: {
                    color: '#1c3d90',
                    fontSize: 14
                }
            },
            tooltip: {
                trigger: 'axis',
                formatter: '{b}<br/>{a0}: {c0}m<br/>{a1}: {c1}m'
            },
            legend: {
                data: ['地表线', '预估滑动面'],
                bottom: 0
            },
            grid: {
                top: 60,
                bottom: 60,
                left: 60,
                right: 40
            },
            xAxis: {
                type: 'category',
                data: xAxisLabels,
                boundaryGap: false,
                axisLine: {
                    lineStyle: {
                        color: '#999'
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: '高程 (m)',
                min: function(v) {
                    return Math.floor(v.min / 10) * 10 - 20;
                },
                axisLine: {
                    show: true
                }
            },
            series: [{
                    name: '地表线',
                    data: terrainData,
                    type: 'line',
                    smooth: true,
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                            offset: 0,
                            color: 'rgba(133, 198, 241, 0.5)'
                        }, {
                            offset: 1,
                            color: 'rgba(255,255,255,0)'
                        }])
                    },
                    lineStyle: {
                        color: '#1c3d90',
                        width: 3
                    }
                },
                {
                    name: '预估滑动面',
                    data: slidingData,
                    type: 'line',
                    smooth: true,
                    lineStyle: {
                        type: 'dashed',
                        color: '#F57676',
                        width: 2
                    }
                }
            ]
        });
    },

    closeWorkbench() {
        document.getElementById('profile-workbench').style.display = 'none';
        this.resetDrawingData();
    },

    resetDrawingData() {
        this.selectedPoints = [];
        this.dragLine = {
            start: null,
            end: null
        };
        document.querySelectorAll('.point-obj').forEach(p => p.classList.remove('selected'));
        this.renderLines();
    },

    exportImage() {
        if (!this.chartInstance) return;
        const link = document.createElement('a');
        link.href = this.chartInstance.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: '#fff'
        });
        link.download = `剖面图_${Math.round(Date.now()/1000)}.png`;
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
    
    // 时间范围按钮点击处理方法
    setTime(days, btn) {
        // 移除所有频率按钮的激活状态
        document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
        // 为当前点击的按钮添加激活状态
        if (btn) btn.classList.add('active');
        // 不需要其他效果，仅保持按钮可点击
    },
    
    // 自定义时间范围应用方法
    applyCustomTime() {
        // 移除所有频率按钮的激活状态，因为选择了自定义时间
        document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
        // 不需要其他效果，仅保持功能可用
    },

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

    toggleViewDropdown(e) {
        e.stopPropagation();
        const el = document.getElementById('map-view-dropdown');
        const isShow = el.style.display === 'block';
        document.querySelectorAll('.custom-dropdown-content').forEach(d => d.style.display = 'none');
        el.style.display = isShow ? 'none' : 'block';
        if (!isShow) this.renderViewDropdown();
    },

    renderViewDropdown() {
        const options = [{
                id: 'geology',
                label: '地质模型'
            },
            {
                id: 'dtm',
                label: 'DTM面'
            },
            {
                id: 'uav',
                label: '无人机地图'
            }
        ];
        const container = document.getElementById('map-view-dropdown');
        container.innerHTML = options.map(opt => `
                                        <div class="custom-dropdown-item" onclick="event.stopPropagation()">
                                            <input type="checkbox" value="${opt.id}" ${this.selectedMapTypes.includes(opt.id) ? 'checked' : ''}
                                                   onchange="mapModule.handleViewTypeChange(this)">
                                            <span>${opt.label}</span>
                                        </div>
                                    `).join('');
    },

    handleViewTypeChange(cb) {
        if (cb.checked) {
            if (!this.selectedMapTypes.includes(cb.value)) this.selectedMapTypes.push(cb.value);
        } else {
            this.selectedMapTypes = this.selectedMapTypes.filter(t => t !== cb.value);
        }
        this.updateMapFilters();
    },

    updateMapFilters() {
        this.triggerFlash();
        const canvas = document.getElementById('map-canvas');
        const labelEl = document.getElementById('map-view-label');
        const labels = {
            geology: '地质模型',
            dtm: 'DTM面',
            uav: '无人机地图'
        };
        if (this.selectedMapTypes.length === 0) {
            labelEl.innerText = "请选择模型";
        } else {
            const firstLabel = labels[this.selectedMapTypes[0]];
            labelEl.innerText = firstLabel + (this.selectedMapTypes.length > 1 ? "..." : "");
        }
        let combinedFilter = "";
        if (this.selectedMapTypes.includes('uav')) {
            combinedFilter += 'saturate(1.5) contrast(1.2) ';
        }
        canvas.style.filter = combinedFilter.trim() || 'none';
    },

    triggerFlash() {
        const section = document.getElementById('main-map-section');
        if (!section) return;
        section.classList.remove('section-flash-active');
        void section.offsetWidth;
        section.classList.add('section-flash-active');
    },

    spawnPoints() {
        const cv = document.getElementById('map-canvas');
        const icons = {
            'GNSS': '🛰️',
            'DEEP': '🏗️',
            'RADAR': '📡',
            'SURFACE': '📐',
            'CRACK': '🧱',
            'FIRE': '🔥',
            'WATER': '💧',
            'GROUND': '🌍',
            'STRESS': '📊',
            'VIB': '💥',
            'SAT': '🛸'
        };
        const types = Object.keys(icons);
        const regionDefinitions = [{
            name: '北帮',
            xRange: [800, 2200],
            yRange: [200, 600]
        }, {
            name: '南帮',
            xRange: [800, 2200],
            yRange: [1900, 2300]
        }, {
            name: '西帮',
            xRange: [200, 700],
            yRange: [800, 1700]
        }, {
            name: '东帮',
            xRange: [2300, 2800],
            yRange: [800, 1700]
        }, {
            name: '中央区',
            xRange: [1100, 1900],
            yRange: [1000, 1500]
        }];
        const placedPoints = [];
        const minDist = 60;
        for (let i = 0; i < 150; i++) {
            const type = types[i % types.length];
            const alarmIdx = (i * 7) % 5;
            const isOnline = (i % 8 !== 0);
            const regDef = regionDefinitions[i % regionDefinitions.length];
            let posX, posY;
            let attempts = 0;
            while (attempts < 100) {
                const testX = regDef.xRange[0] + Math.random() * (regDef.xRange[1] - regDef.xRange[0]);
                const testY = regDef.yRange[0] + Math.random() * (regDef.yRange[1] - regDef.yRange[0]);
                let overlapping = false;
                for (let j = 0; j < placedPoints.length; j++) {
                    if (Math.hypot(testX - placedPoints[j].x, testY - placedPoints[j].y) < minDist) {
                        overlapping = true;
                        break;
                    }
                }
                if (!overlapping) {
                    posX = testX;
                    posY = testY;
                    break;
                }
                attempts++;
            }
            placedPoints.push({
                x: posX,
                y: posY
            });
            const p = document.createElement('div');
            p.className = `point-obj type-${type} ${(isOnline && alarmIdx === 0) ? 'breathe' : ''}`;
            p.id = `pt-${i}`;
            p.style.left = posX + 'px';
            p.style.top = posY + 'px';
            const colors = ['#F57676', '#FFA500', '#fadb14', '#66B1FF', '#71C446'];
            const targetColor = isOnline ? colors[alarmIdx] : '#999';
            p.style.backgroundColor = targetColor;
            p.style.color = targetColor;
            this.pMeta[p.id] = {
                type,
                alarmIdx,
                isOnline,
                deviceId: `${type}${i}`,
                region: regDef.name
            };
            p.innerHTML = `<div class="point-bubble"><span>${icons[type]}</span></div><div class="point-id">${type.substring(0, 1)}${i}</div>`;
            p.onclick = (e) => {
                if (profileModule.isDrawing) {
                    e.stopPropagation();
                    profileModule.handlePointClick(p.id);
                } else if (isOnline && type === 'CRACK') {
                    dashModule.focusWithRange(p.id);
                    analysisModule.open(this.pMeta[p.id]);
                }
            };
            p.onmouseenter = (e) => {
                const tt = document.getElementById('map-tooltip');
                tt.style.display = 'block';
                tt.innerHTML = `<b style="color:#85C6F1;">[${regDef.name}] ${type}${i}</b><hr style='margin:5px 0; opacity:0.2'>${this.getTechData(type, p.id)}`;
                tt.style.left = e.clientX + 15 + 'px';
                tt.style.top = e.clientY + 15 + 'px';
            };
            p.onmouseleave = () => document.getElementById('map-tooltip').style.display = 'none';
            cv.appendChild(p);
        }
    },

    focus(type) {
        const vp = document.getElementById('map-viewer'),
            cv = document.getElementById('map-canvas');
        const pts = Array.from(document.querySelectorAll(`.type-${type}`)).filter(p => p.style.display !== 'none');
        if (!pts.length) return;
        let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;
        pts.forEach(p => {
            const x = parseFloat(p.style.left),
                y = parseFloat(p.style.top);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        });
        const padding = 150;
        const groupW = (maxX - minX) || 100,
            groupH = (maxY - minY) || 100;
        const scaleX = (vp.clientWidth * 0.8) / (groupW + padding),
            scaleY = (vp.clientHeight * 0.8) / (groupH + padding);
        this.scale = Math.min(scaleX, scaleY, 1.0);
        this.scale = Math.max(this.scale, 0.2);
        const centerX = minX + (maxX - minX) / 2;
        const centerY = minY + (maxY - minY) / 2;
        this.pos.x = (vp.clientWidth / 2) - (centerX * this.scale);
        this.pos.y = (vp.clientHeight / 2) - (centerY * this.scale);
        cv.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px) scale(${this.scale})`;
    },

    toggleDrawer() {
        document.getElementById('device-drawer').classList.toggle('active');
    },
    getTechData(type, id) {
        const meta = this.pMeta[id];
        const multiplier = this.isDetailMode ? 1 : (this.tMultiplier || 1);
        const seed = parseInt(id.replace('pt-', '')) || 0;
        const variance = (seed % 10) * 0.1;
        let speed = 0.5;
        switch (meta.alarmIdx) {
            case 0:
                speed = 8.1 + variance * 3.5;
                break;
            case 1:
                speed = 5.1 + variance * 2.5;
                break;
            case 2:
                speed = 4.1 + variance * 0.8;
                break;
            case 3:
                speed = 3.1 + variance * 0.8;
                break;
            default:
                speed = 0.5 + (seed % 5) * 0.4;
        }
        const totalDisp = (speed * 24 * multiplier).toFixed(2);
        const specs = {
            'GNSS': `累计位移: ${totalDisp} mm<br>当前速度: ${speed.toFixed(2)} mm/h<br>X/Y/H变化: ${(totalDisp * 0.55).toFixed(2)}/${(totalDisp * 0.35).toFixed(2)}/${(totalDisp * 0.10).toFixed(2)} mm`,
            'RADAR': `视在形变: ${totalDisp} mm<br>反射强度: -12.4 dB<br>相干性: 0.98`,
            'DEEP': `深层位移: ${totalDisp} mm<br>测斜深度: 45.0 m`,
            'SURFACE': `裂缝宽度: ${(totalDisp / 10).toFixed(2)} mm<br>张开速率: ${(speed / 10).toFixed(2)} mm/d`,
            'FIRE': `表面温度: ${(25 + parseFloat(totalDisp) / 15).toFixed(1)} ℃<br>CO浓度: 12 ppm`,
            'WATER': `实时水位: ${(120 - totalDisp / 100).toFixed(2)} m<br>水温: 14.2 ℃`
        };
        return specs[type] || `设备状态: 运行正常<br>当前速度: ${speed.toFixed(2)} mm/h`;
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

/* =========================================================
   离线弹窗逻辑集成版：修复分页不显示、数据统计错误与联动控制
   ========================================================= */

// 1. 分页状态变量 (确保放置在 dashModule 对象内部)
offlineData: [],
offlineCurrentPage: 1,
offlinePageSize: 5,

// 2. 弹出离线窗口入口：负责初始化数据、触发过滤联动及开启渲染
showOfflineModal(data) {
    const modal = document.getElementById('offline-modal');
    const mapSection = document.getElementById('main-map-section');

    // 初始化数据源与当前页码
    this.offlineData = data;
    this.offlineCurrentPage = 1;

    // 1. 确保弹窗挂载在地图容器内并显示
    mapSection.appendChild(modal);
    modal.style.display = 'flex';

    // 2. 联动过滤逻辑：自动在地图上筛选并勾选这些离线点
    const offlineIds = Object.keys(mapModule.pMeta).filter(id =>
        !mapModule.pMeta[id].isOnline && mapModule.pMeta[id].type === 'CRACK'
    );
    const offlineRegions = [...new Set(offlineIds.map(id => mapModule.pMeta[id].region))];

    mapFilterModule.selectedPoints = offlineIds;
    mapFilterModule.selectedRegions = offlineRegions;
    mapFilterModule.syncUI(); // 同步地图与过滤栏状态

    // 3. UI 交互控制：离线模式下锁定过滤控件，防止冲突
    const regBtn = document.getElementById('map-region-btn');
    const pointInp = document.getElementById('map-point-input');
    [regBtn, pointInp].forEach(el => {
        if(el) {
            el.disabled = true;
            el.style.backgroundColor = '#f5f5f5';
            el.style.color = '#999';
            el.style.cursor = 'not-allowed';
            el.style.opacity = '0.8';
        }
    });

    // 4. 清空上方时间/频率按钮的激活状态
    document.querySelectorAll('.freq-btn').forEach(btn => btn.classList.remove('active'));

    // 5. 调用核心渲染函数生成表格与【分页按钮】
    this.renderOfflineTable();
},

// 3. 核心表格渲染函数：负责数据切片、空行补全、统计更新与按钮注入
renderOfflineTable() {
    const total = this.offlineData.length;
    const totalPages = Math.ceil(total / this.offlinePageSize) || 1;
    const start = (this.offlineCurrentPage - 1) * this.offlinePageSize;
    const pageData = this.offlineData.slice(start, start + this.offlinePageSize);

    // A. 渲染当前页的数据行
    let html = pageData.map((n, i) => {
        // 查找对应的pt-xxx格式ID
        const ptId = Object.keys(mapModule.pMeta).find(id => mapModule.pMeta[id].deviceId === n.deviceId);
        return `
        <tr style="cursor:pointer;" onclick="dashModule.focusWithRange('${ptId}')">
            <td>${start + i + 1}</td>
            <td>${n.region}</td>
            <td style="color:#f5222d; font-weight:bold;">${n.deviceId}</td>
            <td>2026-01-15 14:00</td>
            <td>海康威视</td>
        </tr>
    `;
    }).join('');

    // B. 自动补全空白行 (补满 5 行，保持弹窗布局高度稳定)
    const emptyRowsCount = this.offlinePageSize - pageData.length;
    for (let i = 0; i < emptyRowsCount; i++) {
        html += `<tr class="empty-row"><td colspan="5" style="border:none;">&nbsp;</td></tr>`;
    }

    // C. 注入 HTML 到表格主体
    document.getElementById('offline-table-body').innerHTML = html;

    // D. 更新页脚统计信息 (解决显示“共 0 条”的问题)
    document.getElementById('offline-pager-info').innerText = `共 ${total} 条离线记录 | 当前第 ${this.offlineCurrentPage} / ${totalPages} 页`;

    // E. 注入翻页按钮逻辑
    const ctrl = document.getElementById('offline-pager-ctrl');
    ctrl.innerHTML = `
        <button class="pager-btn ${this.offlineCurrentPage === 1 ? 'disabled' : ''}"
                onclick="if(dashModule.offlineCurrentPage > 1) dashModule.changeOfflinePage(dashModule.offlineCurrentPage - 1)">
            上一页
        </button>
        <button class="pager-btn ${this.offlineCurrentPage === totalPages ? 'disabled' : ''}"
                onclick="if(dashModule.offlineCurrentPage < totalPages) dashModule.changeOfflinePage(dashModule.offlineCurrentPage + 1)">
            下一页
        </button>
    `;
},

// 4. 执行翻页操作
changeOfflinePage(p) {
    this.offlineCurrentPage = p;
    this.renderOfflineTable();
},

/* --- dashModule 内 closeOfflineModal 函数替换集成版 --- */
closeOfflineModal() {
    // 1. 关闭弹窗界面
    document.getElementById('offline-modal').style.display = 'none';

    // 2. 重置筛选数据逻辑
    mapFilterModule.selectedPoints = [];
    mapFilterModule.selectedRegions = [];

    // 3. 恢复顶部筛选控件的可操作性与样式
    const regBtn = document.getElementById('map-region-btn');
    const pointInp = document.getElementById('map-point-input');
    [regBtn, pointInp].forEach(el => {
        if(el) {
            el.disabled = false;
            el.style.backgroundColor = '#fff';
            el.style.color = '#333';
            el.style.cursor = 'pointer';
            el.style.opacity = '1';
        }
    });

    // 4. 恢复默认时间范围 (回归初始加载状态)
    const startInput = document.getElementById('date-start');
    const endInput = document.getElementById('date-end');
    if(startInput) startInput.value = "2025-10-10T13:22";
    if(endInput) endInput.value = "2026-01-18T00:00";

    // 5. 恢复默认频率按钮激活状态 (一天内)
    document.querySelectorAll('.freq-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.innerText === "一天内") btn.classList.add('active');
    });

    // 6. 核心：调用重置逻辑，返回默认模型视图，显示全部点
    appLogic.resetGnssFilter();

    // 7. 同步更新下拉列表的勾选状态与输入框显示
    mapFilterModule.syncUI();
},

                    getSortedGnssData() {
                        let data = Object.keys(mapModule.pMeta)
                            .filter(id => {
                                const meta = mapModule.pMeta[id];
                                return meta && meta.type === 'CRACK' && meta.isOnline;
                            })
                            .map((id) => {
                                const meta = mapModule.pMeta[id];
                                const seed = parseInt(id.replace('pt-', '')) || 0;
                                const variance = (seed % 10) * 0.1;
                                let currentSpeed = 0.5;
                                switch (meta.alarmIdx) {
                                    case 0:
                                        currentSpeed = 8.1 + variance * 3.5;
                                        break;
                                    case 1:
                                        currentSpeed = 5.1 + variance * 2.5;
                                        break;
                                    case 2:
                                        currentSpeed = 4.1 + variance * 0.8;
                                        break;
                                    case 3:
                                        currentSpeed = 3.1 + variance * 0.8;
                                        break;
                                    default:
                                        currentSpeed = 0.5 + (seed % 5) * 0.4;
                                }
                                // 将数值缩小到0.0几的量级，确保不为负数
                                const scaledValue = Math.max(0.01, currentSpeed / 100);
                                return {
                                    id: id,
                                    deviceId: meta.deviceId,
                                    alarmIdx: meta.alarmIdx,
                                    region: meta.region,
                                    elevation: (1200 + Math.sin(seed) * 50).toFixed(1),
                                    value: scaledValue.toFixed(2),
                                    threshold: (this.thresholds[meta.alarmIdx] !== '--' ? Math.max(0.01, parseFloat(this.thresholds[meta.alarmIdx]) / 100).toFixed(2) : '--')
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
                            const variance = (seed % 10) * 0.1;
                            let finalSpeed = 0.5;
                            switch (meta.alarmIdx) {
                                case 0:
                                    finalSpeed = 8.2 + variance * 4;
                                    break;
                                case 1:
                                    finalSpeed = 5.2 + variance * 2.5;
                                    break;
                                case 2:
                                    finalSpeed = 4.1 + variance * 0.8;
                                    break;
                                case 3:
                                    finalSpeed = 3.1 + variance * 0.8;
                                    break;
                                default:
                                    finalSpeed = 0.5 + (seed % 5) * 0.4;
                            }
                            const wave = (Math.sin(seed) * 0.15);
                            dynamicData = [
                                Math.max(0.01, (finalSpeed * (0.3 + wave) / 100)).toFixed(2),
                                Math.max(0.01, (finalSpeed * (0.5 - wave) / 100)).toFixed(2),
                                Math.max(0.01, (finalSpeed * (0.8 + wave) / 100)).toFixed(2),
                                Math.max(0.01, (finalSpeed * (0.95 - wave) / 100)).toFixed(2),
                                Math.max(0.01, finalSpeed / 100).toFixed(2)
                            ];
                            const alarmNames = ['一级告警 (危险)', '二级告警 (受控)', '三级告警 (注意)', '四级告警 (警示)', '运行正常'];
                            alarmName = alarmNames[meta.alarmIdx];
                        } else {
                            // 默认数据也调整到0.0几的量级
                            dynamicData = [0.01, 0.05, 0.03, 0.06, 0.04];
                        }
                        chart.setOption({
                            title: {
                                text: meta ? `${meta.deviceId} - ${alarmName}` : '监测趋势',
                                textStyle: {
                                    fontSize: 11,
                                    color: color,
                                    fontWeight: 'bold'
                                },
                                right: 10,
                                top: 0
                            },
                            grid: {
                                top: 40,
                                bottom: 25,
                                left: 45,
                                right: 25
                            },
                            xAxis: {
                                type: 'category',
                                boundaryGap: false,
                                data: ['0h', '6h', '12h', '18h', '24h'],
                                axisLabel: {
                                    fontSize: 10,
                                    color: '#888'
                                },
                                axisLine: {
                                    lineStyle: {
                                        color: 'rgba(0,0,0,0.1)'
                                    }
                                }
                            },
                            yAxis: {
                                type: 'value',
                                name: '速度(mm/h)',
                                nameTextStyle: {
                                    color: '#666',
                                    fontSize: 10,
                                    align: 'left',
                                    padding: [0, 0, 8, -20]
                                },
                                axisLabel: {
                                    fontSize: 10,
                                    color: '#888'
                                },
                                splitLine: {
                                    lineStyle: {
                                        color: 'rgba(0,0,0,0.05)'
                                    }
                                }
                            },
                            series: [{
                                data: dynamicData,
                                type: 'line',
                                smooth: true,
                                color: color,
                                symbol: 'circle',
                                symbolSize: 6,
                                lineStyle: {
                                    width: 3
                                },
                                areaStyle: {
                                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                                        offset: 0,
                                        color: color + 'CC'
                                    }, {
                                        offset: 0.8,
                                        color: color + '22'
                                    }, {
                                        offset: 1,
                                        color: 'rgba(255, 255, 255, 0)'
                                    }])
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
                            return `<tr class="${rowClass}" style="cursor:pointer;" onclick="dashModule.focusWithRange('${item.id}')"><td>${startIndex + i + 1}</td><td>${item.region}</td><td style="color:${textColor}; font-weight:600;">${item.deviceId}</td><td style="color:${textColor}; font-weight:600;">${item.value}</td><td style="color:${textColor}; font-weight:600;">${item.threshold}</td></tr>`;
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
                        document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
                        const oneDayBtn = document.querySelector('.freq-btn');
                        if (oneDayBtn) oneDayBtn.classList.add('active');
                        const resetBtn = document.getElementById('reset-gnss-btn');
                        if (resetBtn) resetBtn.style.display = 'flex';
                        
                        // 只有在线设备才更新裂缝累计宽度曲线
                        const targetMeta = mapModule.pMeta[targetId];
                        if (targetMeta && targetMeta.isOnline) {
                            this.initSpeedChart(targetId);
                        }
                        
                        let maxDiffX = 100,
                            maxDiffY = 100;
                        document.querySelectorAll('.point-obj').forEach(p => {
                            const meta = mapModule.pMeta[p.id];
                            if (meta && meta.type === 'CRACK') {
                                const px = parseFloat(p.style.left),
                                    py = parseFloat(p.style.top),
                                    dist = Math.sqrt((px - tx) ** 2 + (py - ty) ** 2);
                                p.classList.remove('breathe', 'point-glow-active', 'point-focus-center');
                                
                                // 获取目标设备的在线状态
                                const targetMeta = mapModule.pMeta[targetId];
                                const isTargetOffline = targetMeta && !targetMeta.isOnline;
                                
                                // 如果目标设备是离线设备，只显示离线设备
                                if (isTargetOffline) {
                                    if (meta && !meta.isOnline && (p.id === targetId || dist <= 1200)) {
                                        p.style.display = 'block';
                                        p.style.color = p.style.backgroundColor;
                                        maxDiffX = Math.max(maxDiffX, Math.abs(px - tx));
                                        maxDiffY = Math.max(maxDiffY, Math.abs(py - ty));
                                        // 只有目标设备有动态效果，其他设备没有
                                        if (p.id === targetId) {
                                            p.classList.add('point-focus-center');
                                            p.classList.add('breathe', 'point-glow-active');
                                        }
                                    } else {
                                        p.style.display = 'none';
                                    }
                                } else {
                                    // 否则使用原有逻辑，显示目标设备和周围设备
                                    if (p.id === targetId || dist <= 1200) {
                                        p.style.display = 'block';
                                        p.style.color = p.style.backgroundColor;
                                        maxDiffX = Math.max(maxDiffX, Math.abs(px - tx));
                                        maxDiffY = Math.max(maxDiffY, Math.abs(py - ty));
                                        // 只有目标设备有动态效果，其他设备没有
                                        if (p.id === targetId) {
                                            p.classList.add('point-focus-center');
                                            p.classList.add('breathe', 'point-glow-active');
                                        }
                                    } else {
                                        p.style.display = 'none';
                                    }
                                }
                            } else p.style.display = 'none';
                        });
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
                        const gnssNodes = Object.values(mapModule.pMeta).filter(n => n.type === 'CRACK');
                        const online = gnssNodes.filter(n => n.isOnline).length,
                            offline = gnssNodes.length - online;
                        const chart = echarts.init(document.getElementById('chart-on'));
                        chart.setOption({
                            title: {
                                text: gnssNodes.length,
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
                            if (params.name === '离线') {
                                const offlineDevices = gnssNodes.filter(n => !n.isOnline);
                                this.showOfflineModal(offlineDevices);
                                
                                // 聚焦到第一个离线设备的位置
                                if (offlineDevices.length > 0) {
                                    // 查找第一个离线设备对应的pt-xxx格式ID
                                    const firstOfflineDev = offlineDevices[0];
                                    const ptId = Object.keys(mapModule.pMeta).find(id => mapModule.pMeta[id].deviceId === firstOfflineDev.deviceId);
                                    if (ptId) {
                                        this.focusWithRange(ptId);
                                    }
                                }
                            }
                        });
                    },

                    initAlarmChart() {
                        const gnssNodes = Object.values(mapModule.pMeta).filter(n => n.type === 'CRACK' && n.isOnline);
                        const counts = [0, 0, 0, 0, 0];
                        gnssNodes.forEach(n => {
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
                        chart.on('click', params => {
                            const targetIdx = params.dataIndex;
                            mapModule.isDetailMode = true;
                            mapModule.tMultiplier = 1;
                            document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
                            const oneDayBtn = document.querySelector('.freq-btn');
                            if (oneDayBtn) oneDayBtn.classList.add('active');
                            document.getElementById('reset-gnss-btn').style.display = 'flex';
                            document.querySelectorAll('.point-obj').forEach(p => {
                                const meta = mapModule.pMeta[p.id];
                                const isMatch = (meta && meta.type === 'CRACK') && (meta.isOnline) && (meta.alarmIdx === targetIdx);
                                p.classList.remove('breathe', 'point-glow-active', 'point-focus-center');
                                if (isMatch) {
                                    p.style.display = 'block';
                                    p.style.color = p.style.backgroundColor;
                                    p.classList.add('breathe', 'point-glow-active');
                                } else {
                                    p.style.display = 'none';
                                }
                            });
                            mapModule.focus('CRACK');
                        });
                    },

/* --- dashModule 内 showOfflineModal 函数替换 --- */
showOfflineModal(data) {
    const modal = document.getElementById('offline-modal');
    const mapSection = document.getElementById('main-map-section');

    // 1. 挂载并显示
    mapSection.appendChild(modal);
    modal.style.display = 'flex';

    // 2. 填充数据 (确保文字为深色)
    const body = document.getElementById('offline-table-body');
    body.innerHTML = data.map((n, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${n.region}</td>
            <td style="color:#f5222d; font-weight:bold;">${n.deviceId}</td>
            <td>2026-01-15 14:00</td>
            <td>海康威视</td>
        </tr>
    `).join('');

    // 3. 联动过滤逻辑：自动勾选离线点及对应区域
    const offlineIds = Object.keys(mapModule.pMeta).filter(id =>
        !mapModule.pMeta[id].isOnline && mapModule.pMeta[id].type === 'CRACK'
    );
    const offlineRegions = [...new Set(offlineIds.map(id => mapModule.pMeta[id].region))];

    mapFilterModule.selectedPoints = offlineIds;
    mapFilterModule.selectedRegions = offlineRegions;
    mapFilterModule.syncUI(); // 执行模型同步

    // 4. UI 禁用与变灰逻辑 (区域和监测点)
    const regBtn = document.getElementById('map-region-btn');
    const pointInp = document.getElementById('map-point-input');
    [regBtn, pointInp].forEach(el => {
        if(el) {
            el.disabled = true;
            el.style.backgroundColor = '#f5f5f5';
            el.style.color = '#999';
            el.style.cursor = 'not-allowed';
            el.style.opacity = '0.8';
        }
    });

    // 5. 时间范围与频率清空
    const start = document.getElementById('date-start');
    const end = document.getElementById('date-end');
    if(start) start.value = "";
    if(end) end.value = "";
    document.querySelectorAll('.freq-btn').forEach(btn => btn.classList.remove('active'));
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
        const currentPoints = document.querySelectorAll(`.point-obj.type-${type}`);
        currentPoints.forEach(p => {
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

    resetGnssFilter() {
        mapModule.isDetailMode = false;
        document.querySelectorAll('.point-obj.type-CRACK').forEach(p => {
            p.style.display = 'block';
            p.classList.remove('point-focus-center', 'breathe', 'point-glow-active');
            const meta = mapModule.pMeta[p.id];
            if (meta && meta.isOnline && meta.alarmIdx === 0) {
                p.style.color = p.style.backgroundColor;
                p.classList.add('breathe', 'point-glow-active');
            }
        });
        mapModule.focus('CRACK');
        document.getElementById('reset-gnss-btn').style.display = 'none';
        dashModule.currentPage = 1;
        dashModule.renderWarningTable();
        const allData = dashModule.getSortedGnssData();
        if (allData.length > 0) {
            dashModule.initSpeedChart(allData[0].id);
        }
    }
};

const analysisModule = {
    charts: {
        curve: null,
        evolution: null,
        vector: null
    },
    selectedMetricsMap: {},
    selectedDevices: [],
    allMetrics: [
        '宽度累计变化量(mm)', '宽度日变化量(mm)', 'x方向加速度(°)', 'y方向加速度(°)', 'z方向加速度(°)','x方向倾角(°)','y方向倾角(°)','z方向倾角(°)'
    ],
    deviceColors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'],
    lineStyles: ['solid', 'dashed', 'dotted', 'dashDot'],

    getLogicData(devId, timestamp, metricIdx = 0) {
        const meta = Object.values(mapModule.pMeta).find(m => m.deviceId === devId);
        if (!meta) return 0;
        const devSeed = devId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        
        // 特殊处理不同指标的数值范围
        // metricIdx 0: 宽度累计变化量 - 初始值 + 每日宽度变化量的平滑累加
        // metricIdx 1: 宽度日变化量 - 范围在0.01到0.05之间，非常平滑的曲线
        if (metricIdx === 1) {
            // 宽度日变化量 - 固定值，无周期性，范围在0.01到0.05之间
            // 基于设备ID生成固定值，确保不同设备有不同的日变化量
            const devNum = parseInt(devId.replace(/[^0-9]/g, '')) || (devSeed % 200) + 1;
            // 生成0.02到0.04之间的固定值，确保平稳无波动
            const fixedValue = 0.02 + (devNum % 5) * 0.005;
            return parseFloat(fixedValue.toFixed(2));
        } else if (metricIdx === 0) {
            // 宽度累计变化量：从0.1开始，直线增长，慢慢越来越大
            const hours = timestamp / 3600000;
            const days = Math.min(Math.floor(hours / 24), 30); // 限制最大天数为30，避免变化过快
            
            // 所有设备都从0.1开始
            const baseValue = 0.1;
            
            // 计算当前的每日宽度变化量
            const dailyChange = this.getLogicData(devId, timestamp, 1);
            
            // 直线增长：初始值 + 每日变化量 * 天数
            // 移除平滑系数，让增长更稳定，慢慢越来越大
            const finalValue = baseValue + dailyChange * days;
            
            return parseFloat(Math.max(0.1, finalValue).toFixed(2));
        }
        
        // 其他指标保持原有逻辑
        const metricSeed = metricIdx * 13.7;
        let baseValue = 0.5;
        let volatility = 0.3;
        switch (meta.alarmIdx) {
            case 0:
                baseValue = 8.2 + (devSeed % 20) * 0.1;
                volatility = 1.2;
                break;
            case 1:
                baseValue = 5.2 + (devSeed % 15) * 0.1;
                volatility = 0.8;
                break;
            case 2:
                baseValue = 4.2 + (devSeed % 10) * 0.1;
                volatility = 0.5;
                break;
            case 3:
                baseValue = 3.2 + (devSeed % 5) * 0.1;
                volatility = 0.3;
                break;
            default:
                baseValue = 0.6 + (devSeed % 10) * 0.1;
                volatility = 0.15;
        }
        const hours = timestamp / 3600000;
        const wave1 = Math.sin(hours * 0.5 + devSeed + metricSeed);
        const wave2 = Math.cos(hours * 1.2 + devSeed * 0.7);
        const wave3 = Math.sin(hours * 2.5 + metricSeed * 1.5) * 0.5;
        const metricOffset = (metricIdx % 5) * 0.4;
        let finalVal = baseValue + (wave1 + wave2 + wave3) * volatility + metricOffset;
        if (metricIdx >= 5 && metricIdx <= 14) {
            finalVal = baseValue * 5 + (hours % 24) * (baseValue * 0.5) + (wave1 * 2);
        }
        return parseFloat(Math.max(0.01, finalVal).toFixed(2));
    },

    open(targetMeta) {
        document.getElementById('analysis-modal').style.display = 'flex';
        const now = new Date();
        const past = new Date(now.getTime() - 24 * 3600000);
        const formatLocalISO = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('an-start').value = formatLocalISO(past);
        document.getElementById('an-end').value = formatLocalISO(now);
        const trajFreqSelect = document.getElementById('traj-freq');
        if (trajFreqSelect) trajFreqSelect.value = 'day';
        const tableFreqSelect = document.getElementById('an-table-freq');
        this.tableFreq = 'day';
        if (tableFreqSelect) tableFreqSelect.value = 'day';
        if (targetMeta) {
            document.getElementById('an-region').value = targetMeta.region;
            this.selectedDevices = [targetMeta.deviceId];
            this.updateDeviceInputDisplay();
            this.selectedMetricsMap = {
                [targetMeta.deviceId]: (this.selectedGlobalMetrics && this.selectedGlobalMetrics.length > 0 ? [...this.selectedGlobalMetrics] : ['宽度日变化量(mm)'])
            };
        } else {
            this.filterDevicesByRegion("");
            const topWarn = dashModule.getSortedGnssData()[0];
            if (topWarn) {
                this.selectedDevices = [topWarn.deviceId];
                this.selectedMetricsMap = {
                    [topWarn.deviceId]: ['宽度日变化量(mm)']
                };
                this.updateDeviceInputDisplay();
            }
        }
        this.renderMetricSelector();
        this.updateMetricButtonLabel();
        
        // 添加点击外部区域关闭菜单的事件监听器
        const handleOutsideClick = (event) => {
            const deviceMenu = document.getElementById('device-items-container');
            const metricMenu = document.getElementById('metric-items-container');
            const deviceInput = document.getElementById('an-device-input');
            const metricBtn = document.getElementById('metric-select-btn');
            
            // 检查点击是否在设备菜单或其触发元素外部
            if (deviceMenu && deviceMenu.style.display === 'block') {
                if (!deviceMenu.contains(event.target) && !deviceInput.contains(event.target)) {
                    deviceMenu.style.display = 'none';
                }
            }
            
            // 检查点击是否在指标菜单或其触发元素外部
            if (metricMenu && metricMenu.style.display === 'block') {
                if (!metricMenu.contains(event.target) && !metricBtn.contains(event.target)) {
                    metricMenu.style.display = 'none';
                }
            }
        };
        
        // 保存事件监听器以便在close方法中移除
        this.outsideClickHandler = handleOutsideClick;
        document.addEventListener('click', handleOutsideClick);
        
        setTimeout(() => this.query(), 100);
    },

    close() {
        document.getElementById('analysis-modal').style.display = 'none';
        
        // 移除点击外部区域关闭菜单的事件监听器
        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler);
            this.outsideClickHandler = null;
        }
    },

    filterDevicesByRegion(regionValue) {
        const allGnss = Object.values(mapModule.pMeta).filter(m => m.type === 'CRACK');
        const regionGnss = regionValue === "" ? allGnss : allGnss.filter(m => m.region === regionValue);
        this.renderDeviceItems(regionGnss);
    },

    renderDeviceItems(list) {
        const container = document.getElementById('device-items-container');
        if (!container) return;
        
        // 检查是否所有设备都已选中
        const allChecked = list.length > 0 && list.every(m => this.selectedDevices.includes(m.deviceId));
        
        // 渲染包含全选复选框的设备列表
        container.innerHTML = `
            <div class="multi-item">
                <input type="checkbox" id="select-all-devices" ${allChecked ? 'checked' : ''}
                       onchange="analysisModule.handleSelectAll(this)">
                <label for="select-all-devices" style="flex:1; cursor:pointer; font-weight: bold; color: #333">
                    全选
                </label>
            </div>
        ` + list.map(m => {
            const isChecked = this.selectedDevices.includes(m.deviceId);
            return `
            <div class="multi-item">
                <input type="checkbox" id="dev-${m.deviceId}" value="${m.deviceId}"
                       ${isChecked ? 'checked' : ''}
                       onchange="analysisModule.handleDeviceToggle(this)">
                <label for="dev-${m.deviceId}" style="flex:1; cursor:pointer; color: ${m.isOnline ? '#333' : '#999'}">
                    ${m.deviceId} (${m.region})
                </label>
            </div>`;
        }).join('');
    },
    
    handleSelectAll(cb) {
        // 获取当前区域选择器的值
        const regionValue = document.getElementById('an-region').value;
        // 获取当前区域的所有设备
        const allGnss = Object.values(mapModule.pMeta).filter(m => m.type === 'CRACK');
        const deviceIds = regionValue === "" ? allGnss : allGnss.filter(m => m.region === regionValue);
        const deviceIdList = deviceIds.map(m => m.deviceId);
        
        if (cb.checked) {
            // 全选：添加所有设备ID到选中列表
            deviceIdList.forEach(devId => {
                if (!this.selectedDevices.includes(devId)) {
                    this.selectedDevices.push(devId);
                    // 为新选中的设备初始化指标选择
                    this.selectedMetricsMap[devId] = (this.selectedGlobalMetrics && this.selectedGlobalMetrics.length > 0) ?
                        [...this.selectedGlobalMetrics] : ['宽度日变化量(mm)'];
                }
            });
        } else {
            // 取消全选：从选中列表中移除所有设备ID
            deviceIdList.forEach(devId => {
                this.selectedDevices = this.selectedDevices.filter(d => d !== devId);
                delete this.selectedMetricsMap[devId];
            });
        }
        
        // 重新渲染设备列表，更新全选复选框状态
        this.filterDevicesByRegion(regionValue);
        this.updateDeviceInputDisplay();
        this.renderMetricSelector();
        this.updateMetricButtonLabel();
        this.query();
    },

    filterDeviceList(val) {
        const allGnss = Object.values(mapModule.pMeta).filter(m => m.type === 'CRACK');
        const searchParts = val.split('、');
        const lastPart = searchParts[searchParts.length - 1].trim();
        const filtered = allGnss.filter(m =>
            m.deviceId.toLowerCase().includes(lastPart.toLowerCase()) || m.region.includes(lastPart)
        );
        this.renderDeviceItems(filtered);
        const inputParts = val.split('、').map(p => p.trim()).filter(p => p !== '');
        let newSelected = [];
        inputParts.forEach(part => {
            let targetId = part;
            if (/^\d+$/.test(part)) targetId = 'CRACK' + part;
            const exists = allGnss.some(m => m.deviceId === targetId);
            if (exists && !newSelected.includes(targetId)) {
                newSelected.push(targetId);
            }
        });
        if (newSelected.length > 0) {
            this.selectedDevices = newSelected;
            this.selectedDevices.forEach(devId => {
                if (!this.selectedMetricsMap[devId]) {
                    this.selectedMetricsMap[devId] = (this.selectedGlobalMetrics && this.selectedGlobalMetrics.length > 0) ?
                        [...this.selectedGlobalMetrics] : ['宽度日变化量(mm)'];
                }
            });
            this.query();
            this.updateMetricButtonLabel();
        }
    },

    toggleDeviceMenu(show, event) {
        if (event) event.stopPropagation();
        document.getElementById('device-items-container').style.display = show ? 'block' : 'none';
    },

    handleDeviceToggle(cb) {
        const devId = cb.value;
        if (cb.checked) {
            if (!this.selectedDevices.includes(devId)) this.selectedDevices.push(devId);
            this.selectedMetricsMap[devId] = (this.selectedGlobalMetrics && this.selectedGlobalMetrics.length > 0) ?
                [...this.selectedGlobalMetrics] : ['宽度日变化量(mm)'];
        } else {
            this.selectedDevices = this.selectedDevices.filter(d => d !== devId);
            delete this.selectedMetricsMap[devId];
        }
        this.updateDeviceInputDisplay();
        this.renderMetricSelector();
        this.updateMetricButtonLabel();
        this.query();
    },

    updateDeviceInputDisplay() {
        const input = document.getElementById('an-device-input');
        input.value = this.selectedDevices.join('、');
    },

    toggleMetricMenu(event) {
        if (event) event.stopPropagation();
        const menu = document.getElementById('metric-items-container');
        menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
    },

    toggleGroup(devId) {
        const list = document.getElementById(`metric-list-${devId}`);
        const icon = document.getElementById(`arrow-${devId}`);
        const isHidden = list.style.display === 'none';
        list.style.display = isHidden ? 'block' : 'none';
        icon.innerText = isHidden ? '▼' : '▶';
    },

    renderMetricSelector() {
        const container = document.getElementById('metric-items-container');
        if (!this.selectedGlobalMetrics) {
            this.selectedGlobalMetrics = ['宽度日变化量(mm)'];
        }
        // 检查是否所有指标都已选中
        const allChecked = this.selectedGlobalMetrics.length === this.allMetrics.length;
        container.innerHTML = `
            <div class="multi-item">
                <input type="checkbox" id="met-global-all" value="全部"
                       ${allChecked ? 'checked' : ''}
                       onchange="analysisModule.handleAllMetricsToggle(this)">
                <label for="met-global-all" style="flex:1; cursor:pointer; font-weight:bold;">全部</label>
            </div>
        ` + this.allMetrics.map(metric => {
            const isChecked = this.selectedGlobalMetrics.includes(metric);
            return `
            <div class="multi-item">
                <input type="checkbox" id="met-global-${metric}" value="${metric}"
                       ${isChecked ? 'checked' : ''}
                       onchange="analysisModule.handleMetricToggle(this)">
                <label for="met-global-${metric}" style="flex:1; cursor:pointer;">${metric}</label>
            </div>`;
        }).join('');
    },

    handleMetricToggle(cb) {
        const metric = cb.value;
        if (!this.selectedGlobalMetrics) this.selectedGlobalMetrics = [];
        if (cb.checked) {
            if (!this.selectedGlobalMetrics.includes(metric)) {
                this.selectedGlobalMetrics.push(metric);
            }
        } else {
            this.selectedGlobalMetrics = this.selectedGlobalMetrics.filter(m => m !== metric);
        }
        this.selectedDevices.forEach(devId => {
            this.selectedMetricsMap[devId] = [...this.selectedGlobalMetrics];
        });
        this.updateMetricButtonLabel();
        this.renderCurveChart();
        this.renderTable();
    },
    
    handleAllMetricsToggle(cb) {
        if (cb.checked) {
            // 全选：选中所有指标
            this.selectedGlobalMetrics = [...this.allMetrics];
        } else {
            // 全不选：取消选中所有指标
            this.selectedGlobalMetrics = [];
        }
        // 更新每个设备的指标选择
        this.selectedDevices.forEach(devId => {
            this.selectedMetricsMap[devId] = [...this.selectedGlobalMetrics];
        });
        // 更新指标选择按钮的标签
        this.updateMetricButtonLabel();
        // 重新渲染指标选择菜单，更新"全部"选项的状态
        this.renderMetricSelector();
        // 重新渲染图表和表格
        this.renderCurveChart();
        this.renderTable();
    },

    updateMetricButtonLabel() {
        const label = document.getElementById('metric-btn-label');
        const btn = document.getElementById('metric-select-btn');
        const selected = this.selectedGlobalMetrics || [];
        if (selected.length === 0) {
            label.innerText = "请选择指标...";
            label.className = "placeholder-text";
            btn.style.textAlign = 'center';
        } else {
            let labelText = selected.join(', ');
            if (labelText.length > 12) {
                labelText = labelText.substring(0, 12) + '...';
            }
            label.innerText = labelText;
            label.className = "";
            btn.style.textAlign = 'left';
        }
    },
    
    // 快速时间范围设置方法
    setQuickTime(days, btn) {
        const now = new Date();
        const past = new Date(now.getTime() - days * 24 * 3600000);
        const formatLocalISO = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('an-start').value = formatLocalISO(past);
        document.getElementById('an-end').value = formatLocalISO(now);
        // 更新快速时间按钮的激活状态：点哪个哪个亮，其他的灭掉
        document.querySelectorAll('#analysis-modal .freq-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        // 触发查询
        this.query();
    },

    query() {
        const startInput = document.getElementById('an-start');
        const endInput = document.getElementById('an-end');
        const start = new Date(startInput.value);
        const end = new Date(endInput.value);
        const now = new Date();
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
        if (start >= end) {
            alert("时间选择错误：起始时间不得晚于或等于结束时间。");
            return;
        }
        if (end > now) {
            alert("终止时间不得晚于当下时刻，请重新调整时间范围。");
            return;
        }
        if (this.selectedDevices.length === 0) return;
        this.renderCurveChart();

        this.renderTable();
    },

    renderCurveChart() {
        // 渲染指标时序演变曲线
        const el = document.getElementById('curve-chart-main');
        if (this.charts.curve) this.charts.curve.dispose();
        this.charts.curve = echarts.init(el);
        const start = new Date(document.getElementById('an-start').value);
        const end = new Date(document.getElementById('an-end').value);
        const totalHours = Math.floor((end - start) / 3600000);
        const timeLabels = [];
        for (let i = 0; i <= totalHours; i++) {
            const d = new Date(start.getTime() + i * 3600000);
            timeLabels.push(`${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`);
        }
        const series = [];
        this.selectedDevices.forEach((devId, devIdx) => {
            const isOnline = (Object.values(mapModule.pMeta).find(m => m.deviceId === devId) || {}).isOnline;
            const metrics = this.selectedMetricsMap[devId] || [];
            metrics.forEach((metric, mIdx) => {
                const metricRefIdx = this.allMetrics.indexOf(metric);
                // 为每个指标分配不同的基础颜色，使用设备颜色和指标颜色的组合
                // 确保不同指标使用差异较大的颜色
                const colorIndex = (devIdx * 10 + metricRefIdx) % this.deviceColors.length;
                const metricColor = this.deviceColors[colorIndex];
                series.push({
                    name: `${devId}-${metric}`,
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    lineStyle: {
                        color: metricColor,
                        type: (metricRefIdx % 2 === 0) ? 'solid' : 'dashed',
                        width: 2.5
                    },
                    itemStyle: {
                        color: metricColor
                    },
                    data: Array.from({
                        length: timeLabels.length
                    }, (_, i) => {
                        const ts = start.getTime() + i * 3600000;
                        return isOnline ? this.getLogicData(devId, ts, metricRefIdx) : null;
                    })
                });
            });
        });
        this.charts.curve.setOption({
            tooltip: {
                trigger: 'axis'
            },
            legend: {
                type: 'scroll',
                top: 0
            },
            grid: {
                top: 60,
                left: 60,
                right: 40,
                bottom: 60
            },
            xAxis: {
                type: 'category',
                data: timeLabels,
                axisLabel: {
                    interval: 'auto',
                    rotate: 15,
                    fontSize: 10
                }
            },
            yAxis: {
                type: 'value',
                name: '值',
                splitLine: {
                    lineStyle: {
                        type: 'dashed',
                        opacity: 0.5
                    }
                }
            },
            dataZoom: [{
                type: 'inside'
            }, {
                type: 'slider',
                bottom: 10,
                height: 15
            }],
            series: series
        });
        
        // 渲染裂缝演变图
        const evolutionEl = document.getElementById('evolution-chart-main');
        if (this.charts.evolution) this.charts.evolution.dispose();
        this.charts.evolution = echarts.init(evolutionEl);
        
        // 裂缝演变图使用相同的时间标签，但只显示宽度累计变化量
        const evolutionSeries = [];
        this.selectedDevices.forEach((devId, devIdx) => {
            const baseHex = this.deviceColors[devIdx % this.deviceColors.length];
            const isOnline = (Object.values(mapModule.pMeta).find(m => m.deviceId === devId) || {}).isOnline;
            const r = parseInt(baseHex.slice(1, 3), 16);
            const g = parseInt(baseHex.slice(3, 5), 16);
            const b = parseInt(baseHex.slice(5, 7), 16);
            const metricColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
            
            // 只显示宽度累计变化量
            evolutionSeries.push({
                name: `${devId}-宽度累计变化量`,
                type: 'line',
                smooth: true,
                showSymbol: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: {
                    color: metricColor,
                    width: 3
                },
                itemStyle: {
                    color: metricColor
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        {
                            offset: 0,
                            color: `${metricColor.replace('0.8', '0.3')}`
                        },
                        {
                            offset: 1,
                            color: `${metricColor.replace('0.8', '0.05')}`
                        }
                    ])
                },
                data: Array.from({
                    length: timeLabels.length
                }, (_, i) => {
                    const ts = start.getTime() + i * 3600000;
                    return isOnline ? this.getLogicData(devId, ts, 0) : null;
                })
            });
        });
        
        this.charts.evolution.setOption({
            tooltip: {
                trigger: 'axis'
            },
            legend: {
                type: 'scroll',
                top: 0
            },
            grid: {
                top: 60,
                left: 60,
                right: 40,
                bottom: 60
            },
            xAxis: {
                type: 'category',
                data: timeLabels,
                axisLabel: {
                    interval: 'auto',
                    rotate: 15,
                    fontSize: 10
                }
            },
            yAxis: {
                type: 'value',
                name: '宽度累计变化量(mm)',
                splitLine: {
                    lineStyle: {
                        type: 'dashed',
                        opacity: 0.5
                    }
                }
            },
            dataZoom: [{
                type: 'inside'
            }, {
                type: 'slider',
                bottom: 10,
                height: 15
            }],
            series: evolutionSeries
        });
    },



    renderTable() {
        const head = document.getElementById('full-table-head');
        const body = document.getElementById('full-table-body');
        const cols = ['序号', '区域', '编号', '时间', '宽度累计变化量(mm)', '宽度日变化量(mm)', 'x方向加速度(°)', 'y方向加速度(°)', 'z方向加速度(°)', 'x方向倾角(°)', 'y方向倾角(°)', 'z方向倾角(°)'];
        head.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
        const start = new Date(document.getElementById('an-start').value);
        const end = new Date(document.getElementById('an-end').value);
        const freq = this.tableFreq || 'hour';
        const intervals = {
            'hour': 3600000,
            'day': 86400000,
            'week': 604800000,
            'month': 2592000000
        };
        const step = intervals[freq];
        let rows = "";
        let count = 1;
        this.selectedDevices.forEach(devId => {
            const meta = Object.values(mapModule.pMeta).find(m => m.deviceId === devId) || {
                region: '未知',
                isOnline: false,
                alarmIdx: 4
            };
            for (let curTs = start.getTime(); curTs <= end.getTime(); curTs += step) {
                const spXY = this.getLogicData(devId, curTs, 3);
                const dispXY = this.getLogicData(devId, curTs, 8);
                const speedColor = (spXY >= 8) ? '#f5222d' : (spXY >= 5 ? '#fa8c16' : '#333');
                // 生成12列数据，与表头对应
                const widthTotal = this.getLogicData(devId, curTs, 0); // 宽度累计变化量
                const widthDaily = this.getLogicData(devId, curTs, 1); // 宽度日变化量
                const accelX = this.getLogicData(devId, curTs, 2); // x方向加速度
                const accelY = this.getLogicData(devId, curTs, 3); // y方向加速度
                const accelZ = this.getLogicData(devId, curTs, 4); // z方向加速度
                const angleX = this.getLogicData(devId, curTs, 5); // x方向倾角
                const angleY = this.getLogicData(devId, curTs, 6); // y方向倾角
                const angleZ = this.getLogicData(devId, curTs, 7); // z方向倾角
                
                rows += `<tr>
                <td>${count++}</td>
                <td>${meta.region}</td>
                <td style="color:#1c3d90; font-weight:bold;">${devId}</td>
                <td>${new Date(curTs).toLocaleString()}</td>
                <td>${widthTotal.toFixed(2)}</td>
                <td>${widthDaily.toFixed(2)}</td>
                <td>${accelX.toFixed(2)}</td>
                <td>${accelY.toFixed(2)}</td>
                <td>${accelZ.toFixed(2)}</td>
                <td>${angleX.toFixed(2)}</td>
                <td>${angleY.toFixed(2)}</td>
                <td>${angleZ.toFixed(2)}</td>
            </tr>`;
                if (count % 500 === 0) break;
            }
        });
        body.innerHTML = rows || '<tr><td colspan="12">暂无数据，请检查时间范围及监测点选择</td></tr>';
    },

    exportChart(type) {
        let chart;
        if (type === 'curve') {
            chart = this.charts.curve;
        } else if (type === 'evolution') {
            chart = this.charts.evolution;
        }
        if (chart) {
            const link = document.createElement('a');
            link.href = chart.getDataURL({
                pixelRatio: 2,
                backgroundColor: '#fff'
            });
            link.download = `分析_${type === 'curve' ? '指标时序演变曲线' : '裂缝演变图'}.png`;
            link.click();
        }
    },

    openExportDialog() {
        const container = document.getElementById('export-metric-list');
        if (!container) return;
        const exportCols = [
            '基准X', '基准Y', '基准H',
            'X位移(mm)', 'Y位移(mm)', 'H位移(mm)', 'XY位移(mm)', 'XYH位移(mm)',
            'X累积位移(mm)', 'Y累积位移(mm)', 'H累积位移(mm)', 'XY累积位移(mm)', 'XYH累积位移(mm)',
            'X速度(mm/h)', 'Y速度(mm/h)', 'H速度(mm/h)', 'XY速度(mm/h)', 'XYH速度(mm/h)',
            'X加速度(mm/h²)', 'Y加速度(mm/h²)', 'H加速度(mm/h²)', '切线角'
        ];
        container.innerHTML = exportCols.map(col => `
        <div class="multi-item" style="border:none; padding: 5px 10px;">
            <input type="checkbox" class="ex-check" id="ex-col-${col}" value="${col}" checked>
            <label for="ex-col-${col}" style="cursor:pointer; font-size:13px; color:#444; flex:1;">${col}</label>
        </div>
    `).join('');
        document.getElementById('export-panel').style.display = 'flex';
    },

    toggleAllExport(status) {
        const checkboxes = document.querySelectorAll('.ex-check');
        checkboxes.forEach(cb => {
            cb.checked = status;
        });
    },

    doExport() {
        const checkedBoxes = document.querySelectorAll('.ex-check:checked');
        const selectedCols = Array.from(checkedBoxes).map(cb => cb.value);
        const allTableCols = [
            '序号', '区域', '编号', '时间', '基准X', '基准Y', '基准H',
            'X位移(mm)', 'Y位移(mm)', 'H位移(mm)', 'XY位移(mm)', 'XYH位移(mm)',
            'X累积位移(mm)', 'Y累积位移(mm)', 'H累积位移(mm)', 'XY累积位移(mm)', 'XYH累积位移(mm)',
            'X速度(mm/h)', 'Y速度(mm/h)', 'H速度(mm/h)', 'XY速度(mm/h)', 'XYH速度(mm/h)',
            'X加速度(mm/h²)', 'Y加速度(mm/h²)', 'H加速度(mm/h²)', '切线角'
        ];
        const mandatoryCols = ['区域', '编号', '时间'];
        let csvContent = "\ufeff序号," + mandatoryCols.join(",") + (selectedCols.length > 0 ? "," + selectedCols.join(",") : "") + "\n";
        const tableRows = document.querySelectorAll('#full-table-body tr');
        if (tableRows.length === 0) {
            alert("当前报表无数据，请先选择监测点进行查询");
            return;
        }
        tableRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            let rowData = [
                cells[0].innerText,
                cells[1].innerText,
                cells[2].innerText,
                cells[3].innerText
            ];
            selectedCols.forEach(colName => {
                const colIndex = allTableCols.indexOf(colName);
                if (colIndex !== -1 && cells[colIndex]) {
                    let text = cells[colIndex].innerText.replace(/,/g, "").trim();
                    rowData.push(text);
                }
            });
            csvContent += rowData.join(",") + "\n";
        });
        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;'
        });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        const fileName = `CRACK数据分析_${new Date().getTime()}.csv`;
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        document.getElementById('export-panel').style.display = 'none';
    },

    clearAll() {
        this.selectedDevices = [];
        this.selectedMetricsMap = {};
        this.selectedGlobalMetrics = [];
        const regionSelect = document.getElementById('an-region');
        const deviceInput = document.getElementById('an-device-input');
        if (regionSelect) regionSelect.value = "";
        if (deviceInput) deviceInput.value = "";
        const now = new Date();
        const past = new Date(now.getTime() - 24 * 3600000);
        const formatLocalISO = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('an-start').value = formatLocalISO(past);
        document.getElementById('an-end').value = formatLocalISO(now);
        if (this.charts.curve) this.charts.curve.clear();
        if (this.charts.vector) this.charts.vector.clear();
        const head = document.getElementById('full-table-head');
        const body = document.getElementById('full-table-body');
        if (head) head.innerHTML = "";
        if (body) body.innerHTML = "";
        this.updateMetricButtonLabel();
        this.renderMetricSelector();
        this.filterDevicesByRegion("");
    }
};

window.onload = () => {
    backgroundModule.init();
    headerModule.init();
    mapModule.init();
    dashModule.init();
    appLogic.switchType('CRACK');
    const defaultBtn = document.querySelector('.freq-btn');
    if (defaultBtn) mapModule.setTime(1, defaultBtn);
    mapFilterModule.init();
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const panels = document.querySelectorAll('.glass-panel');
        let targetPanel = null;
        panels.forEach(p => {
            if (p.innerText.includes('裂缝累计宽度曲线')) targetPanel = p;
        });
        if (targetPanel) {
            targetPanel.style.cursor = 'pointer';
            targetPanel.title = "点击进入深度数据分析界面";
            targetPanel.onclick = (e) => {
                analysisModule.open();
            };
        }
    }, 1500);
});

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const panels = document.querySelectorAll('.glass-panel');
        let targetPanel = null;
        panels.forEach(p => {
            if (p.innerText.includes('监测点速度曲线')) targetPanel = p;
        });
        if (targetPanel) {
            targetPanel.style.cursor = 'pointer';
            targetPanel.title = "点击进入深度数据分析界面";
            targetPanel.onclick = (e) => {
                analysisModule.open();
            };
        }
    }, 1500);
});