/* =========================================================
   1. 背景特效模块 (backgroundModule)
   ========================================================= */
const backgroundModule = {
    init() {
        const canvas = document.getElementById('bg-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
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

/* =========================================================
   2. 头部模块 (headerModule)
   ========================================================= */
const headerModule = {
    init() {
        setInterval(() => {
            const el = document.getElementById('header-clock');
            if (el) el.innerText = new Date().toLocaleString();
        }, 1000);
    }
};

/* =========================================================
   3. 筛选联动模块 (mapFilterModule) - 左侧地图专用
   ========================================================= */
const mapFilterModule = {
    // 状态存储
    selectedRegions: [],       // 北帮/南帮...
    selectedRadars: [],        // 雷达1/雷达2...
    selectedVirtRegions: [],   // 虚拟区域 (面)
    selectedVirtLines: [],     // 监测线 (线)

    init() {
        // 等待雷达数据加载完毕
        if (!mapModule.radarList || mapModule.radarList.length === 0) {
            setTimeout(() => this.init(), 100);
            return;
        }

        // --- 1. 核心修改：初始化时，读取所有“在线”雷达 ---
        const onlineRadars = mapModule.radarList.filter(r => r.isOnline);

        // 自动勾选所有在线雷达
        this.selectedRadars = onlineRadars.map(r => r.name);

        // --- 2. 核心修改：反向级联，根据在线雷达自动勾选对应区域 ---
        // 比如：雷达1在线且属于北帮，那么“北帮”也必须默认被选中
        const activeRegions = new Set();
        onlineRadars.forEach(r => activeRegions.add(r.region));
        this.selectedRegions = Array.from(activeRegions);

        // --- 3. 渲染 UI 并应用 ---
        this.renderRegionOptions();
        this.renderRadarOptions();
        this.renderVirtualLocationOptions();

        // 立即刷新地图，让云图扫描效果显现出来
        this.applyMapFilter();

        // 全局点击监听 (保持不变)
        document.addEventListener('click', this.handleGlobalClick.bind(this));
    },

    handleGlobalClick(e) {
        const safeIds = [
            'map-region-dropdown', 'radar-dropdown', 'virt-dropdown',
            'map-region-btn', 'radar-select-btn', 'virt-select-btn',
            'an-region-dropdown', 'an-radar-dropdown', 'an-virt-dropdown', 'an-point-dropdown',
            'an-region-btn', 'an-radar-btn', 'an-virt-btn', 'an-point-btn',
            'metric-items-container', 'metric-select-btn',
            'traj-freq-dropdown', 'traj-freq-btn',
            'an-table-freq-dropdown', 'an-table-freq-btn',
            'map-view-dropdown', 'map-view-btn'
        ];
        let clickedInside = false;
        safeIds.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.contains(e.target)) clickedInside = true;
        });
        if (!clickedInside) {
            document.querySelectorAll('.custom-dropdown-content').forEach(d => d.style.display = 'none');
            const metricMenu = document.getElementById('metric-items-container');
            if (metricMenu) metricMenu.style.display = 'none';
        }
    },

    toggleDropdown(id, e) {
        e.stopPropagation();
        const el = document.getElementById(id);
        const isShow = el.style.display === 'block';
        document.querySelectorAll('.custom-dropdown-content').forEach(d => d.style.display = 'none');
        el.style.display = isShow ? 'none' : 'block';
    },

    updateLabel(id, list, defaultText) {
        const el = document.getElementById(id);
        if (!el) return;
        const real = list.filter(k => k !== '全部');
        if (!real || real.length === 0) el.innerText = defaultText;
        else if (list.includes('全部')) el.innerText = `已选全部`;
        else el.innerText = real.length <= 1 ? real[0] : `已选(${real.length})`;
    },

    updateSelectionLogic(val, checked, currentList, allList) {
        if (val.includes('全部')) {
            return checked ? ['全部', ...allList] : [];
        } else {
            let newList = currentList.filter(i => !i.includes('全部'));
            if (checked) {
                if (!newList.includes(val)) newList.push(val);
            } else {
                newList = newList.filter(i => i !== val);
            }
            if (allList.length > 0 && allList.every(item => newList.includes(item))) {
                newList = ['全部', ...allList];
            }
            return newList;
        }
    },

    // ================= 1. 区域选择 (Level 1) =================
    renderRegionOptions() {
        const regions = ['全部', '北帮', '南帮', '东帮', '西帮'];
        const container = document.getElementById('map-region-dropdown');
        if (!container) return;

        container.innerHTML = regions.map(opt => `
            <div class="custom-dropdown-item">
                <input type="checkbox" value="${opt}" 
                    ${this.selectedRegions.includes(opt) ? 'checked' : ''} 
                    onchange="mapFilterModule.handleRegionChange(this)">
                <span style="${opt === '全部' ? 'font-weight:bold;color:#1c3d90' : ''}">${opt}</span>
            </div>
        `).join('');
    },

    handleRegionChange(cb) {
        const allRegions = ['北帮', '南帮', '东帮', '西帮'];
        this.selectedRegions = this.updateSelectionLogic(cb.value, cb.checked, this.selectedRegions, allRegions);
        this.updateLabel('map-region-label', this.selectedRegions, '选择区域');

        this.renderRegionOptions();
        // 级联更新：区域变了 -> 刷新雷达 -> 刷新虚拟位置
        this.renderRadarOptions();
        this.renderVirtualLocationOptions();
        this.applyMapFilter();

        // 如果只选中了一个区域，则聚焦到该区域的第一个雷达
        if (this.selectedRegions.length === 1 && !this.selectedRegions.includes('全部')) {
            const selectedRegion = this.selectedRegions[0];
            const radarInRegion = mapModule.radarList.find(r => r.region === selectedRegion);
            if (radarInRegion) {
                // 触发该雷达的点击事件，以高亮显示
                const radarEl = document.getElementById(`radar-${radarInRegion.id}`);
                if (radarEl) {
                    radarEl.click();
                }
            }
        }
    },

    // ================= 2. 雷达设备选择 (Level 2) =================
    renderRadarOptions() {
        const container = document.getElementById('radar-dropdown');
        if (!container) return;

        // 这里保持原逻辑：只显示已选区域的雷达
        // 但因为我们在 handleRadarChange 里做了反向级联
        // 当你勾选雷达时，区域会自动选中，所以这里会自动把该雷达显示出来，逻辑是闭环的。
        let availableRadars = mapModule.radarList;
        if (this.selectedRegions.length > 0 && !this.selectedRegions.includes('全部')) {
            availableRadars = availableRadars.filter(r => this.selectedRegions.includes(r.region));
        }

        if (availableRadars.length === 0) {
            container.innerHTML = '<div style="padding:10px; color:#999;">请先选择区域</div>'; // 提示语改得更友好
            return;
        }

        // 判断全选状态
        // 只有当列表里的雷达都被选中时，全选框才打钩
        const currentNames = availableRadars.map(r => r.name);
        const isAllSelected = currentNames.length > 0 && currentNames.every(name => this.selectedRadars.includes(name));

        let html = `
            <div class="custom-dropdown-item" style="border-bottom:1px solid #eee; font-weight:bold;">
                <input type="checkbox" value="全部" ${isAllSelected ? 'checked' : ''} onchange="mapFilterModule.handleRadarChange(this)">
                <span>全部雷达</span>
            </div>
        `;

        availableRadars.forEach(radar => {
            const isChecked = this.selectedRadars.includes(radar.name);
            // 给在线雷达加个小绿点标记，体验更好
            const statusDot = radar.isOnline ? '<span style="color:#71C446;font-size:12px;">●</span>' : '<span style="color:#999;font-size:12px;">●</span>';

            html += `
                <div class="custom-dropdown-item">
                    <input type="checkbox" value="${radar.name}" 
                        ${isChecked ? 'checked' : ''} onchange="mapFilterModule.handleRadarChange(this)">
                    <span>${radar.name} ${statusDot}</span>
                </div>
            `;
        });

        container.innerHTML = html;
        this.updateLabel('radar-select-label', this.selectedRadars, '选择设备');
    },

    handleRadarChange(cb) {
        // 1. 获取所有可选雷达 (用于处理全选逻辑)
        let availableRadars = mapModule.radarList;
        // 注意：这里不要根据区域过滤 availableRadars，因为我们希望雷达列表能反向控制区域
        // 如果这里过滤了，会导致未选区域的雷达点不到，逻辑就死锁了
        // 所以我们获取全部雷达名称用于判断
        const allNames = mapModule.radarList.map(r => r.name);

        // 2. 更新选中的雷达列表
        this.selectedRadars = this.updateSelectionLogic(cb.value, cb.checked, this.selectedRadars, allNames);
        this.updateLabel('radar-select-label', this.selectedRadars, '选择设备');

        // --- 3. ★★★ 核心修改：反向级联 (子 -> 父) ★★★ ---
        // 如果勾选了某个雷达，必须确保它所属的区域也被勾选
        if (cb.checked && cb.value !== '全部') {
            const targetRadar = mapModule.radarList.find(r => r.name === cb.value);
            if (targetRadar) {
                // 如果该雷达的区域还没被选中，就把它加进去
                if (!this.selectedRegions.includes(targetRadar.region)) {
                    this.selectedRegions.push(targetRadar.region);
                    // 顺便更新区域的 UI 文本
                    this.updateLabel('map-region-label', this.selectedRegions, '选择区域');
                }
            }
        }

        // 4. 重新渲染各级菜单
        // 必须重绘区域菜单，因为 selectedRegions 变了，要把勾打上
        this.renderRegionOptions();
        this.renderRadarOptions();
        this.renderVirtualLocationOptions();

        // 5. 应用到地图 (显示/隐藏扫描云图)
        this.applyMapFilter();
    },

    // ================= 3. 虚拟位置选择 (Level 3) =================
    renderVirtualLocationOptions() {
        // 【关键修复】ID 要对，对应地图工具栏的 ID
        const container = document.getElementById('virt-list-container');
        if (!container) return;

        const allVirtRegions = ['区域1', '区域2', '区域3']; // 面
        const allVirtLines = ['监测线1', '监测线2', '监测线3']; // 线

        const isAllRegSelected = allVirtRegions.every(r => this.selectedVirtRegions.includes(r));
        const isAllLineSelected = allVirtLines.every(l => this.selectedVirtLines.includes(l));

        let html = '';

        // --- 分组1：虚拟区域 ---
        html += `<div class="dropdown-group-title">虚拟区域</div>`;
        html += `
            <div class="custom-dropdown-item" style="background:#fafafa;">
                <input type="checkbox" value="全部区域" data-group="region"
                    ${isAllRegSelected ? 'checked' : ''} onchange="mapFilterModule.handleVirtLocChange(this)">
                <span style="font-weight:bold;">全部</span>
            </div>
        `;
        allVirtRegions.forEach(r => {
            html += `
                <div class="custom-dropdown-item">
                    <input type="checkbox" value="${r}" data-group="region"
                        ${this.selectedVirtRegions.includes(r) ? 'checked' : ''} onchange="mapFilterModule.handleVirtLocChange(this)">
                    <span>${r}</span>
                </div>
            `;
        });

        // --- 分组2：监测线 ---
        html += `<div class="dropdown-group-title" style="margin-top:5px;">监测线</div>`;
        html += `
            <div class="custom-dropdown-item" style="background:#fafafa;">
                <input type="checkbox" value="全部监测线" data-group="line"
                    ${isAllLineSelected ? 'checked' : ''} onchange="mapFilterModule.handleVirtLocChange(this)">
                <span style="font-weight:bold;">全部</span>
            </div>
        `;
        allVirtLines.forEach(l => {
            html += `
                <div class="custom-dropdown-item">
                    <input type="checkbox" value="${l}" data-group="line"
                        ${this.selectedVirtLines.includes(l) ? 'checked' : ''} onchange="mapFilterModule.handleVirtLocChange(this)">
                    <span>${l}</span>
                </div>
            `;
        });

        container.innerHTML = html;

        // 更新按钮文字
        const count = this.selectedVirtRegions.filter(x => x !== '全部').length + this.selectedVirtLines.filter(x => x !== '全部').length;
        const btn = document.getElementById('virt-select-label');
        if (btn) btn.innerText = count === 0 ? '选择/搜索虚拟位置' : `已选(${count})`;
    },

    handleVirtLocChange(cb) {
        const val = cb.value;
        const checked = cb.checked;
        const group = cb.dataset.group; // 'region' or 'line'

        const allVirtRegions = ['区域1', '区域2', '区域3'];
        const allVirtLines = ['监测线1', '监测线2', '监测线3'];

        if (group === 'region') {
            if (val === '全部区域') {
                this.selectedVirtRegions = checked ? ['全部', ...allVirtRegions] : [];
            } else {
                this.selectedVirtRegions = this.updateSelectionLogic(val, checked, this.selectedVirtRegions, allVirtRegions);
            }
        } else if (group === 'line') {
            if (val === '全部监测线') {
                this.selectedVirtLines = checked ? ['全部', ...allVirtLines] : [];
            } else {
                this.selectedVirtLines = this.updateSelectionLogic(val, checked, this.selectedVirtLines, allVirtLines);
            }
        }

        this.renderVirtualLocationOptions();
        this.applyMapFilter();
    },

    // 搜索功能
    filterVirtOptions(keyword) {
        const container = document.getElementById('virt-list-container');
        if (!container) return;
        const items = container.querySelectorAll('.custom-dropdown-item');

        items.forEach(item => {
            const span = item.querySelector('span');
            if (span && span.innerText.includes(keyword) || keyword === '') {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    },

    // ================= 核心过滤应用 =================
    applyMapFilter() {
        const activeRegions = this.selectedRegions.filter(r => r !== '全部');
        const activeRadars = this.selectedRadars.filter(r => r !== '全部');

        // 提取选中的虚拟位置 ID
        const activeRegionIds = this.selectedVirtRegions
            .filter(r => r !== '全部' && r !== '全部区域')
            .map(r => r.replace('区域', ''));
        const activeLineIds = this.selectedVirtLines
            .filter(l => l !== '全部' && l !== '全部监测线')
            .map(l => l.replace('监测线', ''));

        const allowedSurfaceIds = [...new Set([...activeRegionIds, ...activeLineIds])];

        // 1. 过滤雷达显示
        // 1. 过滤雷达显示 (修复版：强制显示云图)
        mapModule.radarList.forEach(radar => {
            let isVisible = true;
            if (activeRegions.length > 0 && !activeRegions.includes(radar.region)) isVisible = false;
            if (activeRadars.length > 0 && !activeRadars.includes(radar.name)) isVisible = false;
            if (activeRegions.length === 0 && this.selectedRegions.length > 0 && !this.selectedRegions.includes('全部')) isVisible = false;

            const elRadar = document.getElementById(`radar-${radar.id}`);
            const elCloud = document.getElementById(`cloud-${radar.id}`);

            if (elRadar) {
                elRadar.style.display = isVisible ? 'flex' : 'none';
            }

            if (elCloud) {
                if (isVisible) {
                    elCloud.style.display = 'block';
                    // ★★★ 核心修复：强制设为不透明，否则初始化时它是0看不见 ★★★
                    setTimeout(() => { elCloud.style.opacity = '1'; }, 10);
                } else {
                    elCloud.style.display = 'none';
                    elCloud.style.opacity = '0';
                }
            }
        });

        // 2. 过滤点显示
        Object.values(mapModule.virtualPoints).forEach(vp => {
            let isVisible = true;
            if (activeRegions.length > 0 && !activeRegions.includes(vp.region)) isVisible = false;
            if (activeRadars.length > 0 && !activeRadars.includes(vp.radarName)) isVisible = false;
            // 如果选了虚拟位置，则只显示对应位置的点；如果没选，暂不显示点（除非全未选，显示全部）
            if (allowedSurfaceIds.length > 0) {
                if (!allowedSurfaceIds.includes(vp.surfaceId)) isVisible = false;
            } else {
                // 如果上级选了雷达，就显示该雷达所有点
                if (activeRadars.length > 0) {
                    // 如果这个点属于选中的雷达，则显示
                    if (!activeRadars.includes(vp.radarName)) isVisible = false;
                } else {
                    // 如果只选了区域，则显示该区域所有点
                    if (activeRegions.length > 0 && !activeRegions.includes(vp.region)) isVisible = false;
                }
            }

            // 初始空状态全显
            if (this.selectedRadars.length === 0 && this.selectedRegions.length === 0 &&
                this.selectedVirtRegions.length === 0 && this.selectedVirtLines.length === 0) isVisible = true;

            if (vp.el) vp.el.style.display = isVisible ? 'block' : 'none';
        });

        // 3. 【新增】更新右侧表格和图表
        dashModule.currentPage = 1;
        dashModule.renderWarningTable();

// 重新渲染在线状态饼图（因为雷达显示状态可能变化）
        dashModule.initOnlineChart();

// 重新渲染风险等级饼图
        if (activeRegions.length === 1 && !activeRegions.includes('全部')) {
            dashModule.initAlarmChart(activeRegions[0]);
        } else {
            dashModule.initAlarmChart();
        }
        // ★★★ 这里是修改点：根据筛选情况，发送假的演示指令 ★★★

        // 1. 如果正在进行“自定义圈定”，优先显示圈定数据，不要被筛选打断
        if (dashModule.currentChartId === 'CUSTOM_AREA_DATA') {
            // Do nothing, keep custom data
        }
        // 2. 如果选了具体的雷达，显示雷达假数据
        else if (activeRadars.length === 1) {
            dashModule.renderBottomChart('DEMO_RADAR_' + activeRadars[0]);
        }
        // 3. 如果选了具体的区域，显示区域假数据
        else if (activeRegions.length === 1) {
            dashModule.renderBottomChart('DEMO_REGION_' + activeRegions[0]);
        }
        // 4. 如果什么都没选具体（比如全是"全部"），显示默认总览
        else {
            dashModule.renderBottomChart('DEFAULT');
        }
        // 5. 高亮显示选中的区域
        this.highlightSelectedRegions(activeRegions);
    },
    // ================= 区域高亮显示 =================
    highlightSelectedRegions(activeRegions) {
        const svg = document.getElementById('draw-svg');
        // 清除之前的高亮
        const oldHighlights = svg.querySelectorAll('.region-highlight');
        oldHighlights.forEach(el => el.remove());

        // 如果没有选中任何区域，或者选中了“全部”，则不显示高亮
        if (activeRegions.length === 0 || activeRegions.includes('全部')) {
            return;
        }

        // 定义每个区域的矩形边界（这里需要根据实际地图调整）
        const regionBounds = {
            '北帮': { x: 600, y: 0, width: 1800, height: 600 },
            '南帮': { x: 600, y: 1900, width: 1800, height: 600 },
            '东帮': { x: 2400, y: 600, width: 600, height: 1300 },
            '西帮': { x: 0, y: 600, width: 600, height: 1300 }
        };

        activeRegions.forEach(region => {
            const bounds = regionBounds[region];
            if (bounds) {
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", bounds.x);
                rect.setAttribute("y", bounds.y);
                rect.setAttribute("width", bounds.width);
                rect.setAttribute("height", bounds.height);
                rect.setAttribute("fill", "rgba(255, 255, 0, 0.2)"); // 半透明黄色
                rect.setAttribute("stroke", "rgba(255, 255, 0, 0.8)");
                rect.setAttribute("stroke-width", "3");
                rect.setAttribute("class", "region-highlight");
                svg.appendChild(rect);
            }
        });
    }
};
/* =========================================================
   4. 剖面图绘制模块 (profileModule)
   ========================================================= */
const profileModule = {
    isDrawing: false, selectedPoints: [], isDragging: false, dragLine: {start: null, end: null}, chartInstance: null,
    enterMode() {
        this.isDrawing = true;
        this.selectedPoints = [];
        this.dragLine = {start: null, end: null};
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
        const el = document.getElementById(id);
        if (idx > -1) {
            this.selectedPoints.splice(idx, 1);
            if (el) el.classList.remove('selected');
        } else {
            this.selectedPoints.push(id);
            if (el) el.classList.add('selected');
        }
        this.renderLines();
    },
    handleMouseDown(e) {
        if (!this.isDrawing || !e.ctrlKey) return;
        const r = document.getElementById('map-canvas').getBoundingClientRect();
        this.isDragging = true;
        this.dragLine.start = {x: (e.clientX - r.left) / mapModule.scale, y: (e.clientY - r.top) / mapModule.scale};
        e.preventDefault();
    },
    handleMouseMove(e) {
        if (!this.isDrawing || !this.isDragging) return;
        const r = document.getElementById('map-canvas').getBoundingClientRect();
        this.dragLine.end = {x: (e.clientX - r.left) / mapModule.scale, y: (e.clientY - r.top) / mapModule.scale};
        this.renderLines();
    },
    handleMouseUp() {
        if (this.isDragging) this.isDragging = false;
    },
    renderLines() {
        const svg = document.getElementById('draw-svg');
        svg.innerHTML = '';
        if (this.selectedPoints.length >= 2) {
            let pathStr = "";
            this.selectedPoints.forEach((pid, i) => {
                const el = document.getElementById(pid);
                if (el) {
                    const offset = el.classList.contains('virtual-point') ? 5 : 16;
                    const px = parseFloat(el.style.left) + offset, py = parseFloat(el.style.top) + offset;
                    pathStr += (i === 0 ? 'M' : 'L') + `${px} ${py}`;
                }
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
            const pStart = document.getElementById(this.selectedPoints[0]),
                pEnd = document.getElementById(this.selectedPoints[this.selectedPoints.length - 1]);
            startPos = {x: parseFloat(pStart.style.left), y: parseFloat(pStart.style.top)};
            endPos = {x: parseFloat(pEnd.style.left), y: parseFloat(pEnd.style.top)};
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
        const terrainData = [], slidingData = [], xAxisLabels = ['起', '20%', '40%', '60%', '80%', '终'];
        const baseH = 1200 + (seed * 80), slope = (end.y - start.y) / 5;
        for (let i = 0; i < 6; i++) {
            const ratio = i / 5;
            const h = baseH - (slope * ratio) + (Math.sin(ratio * Math.PI + seed * 10) * 20);
            terrainData.push(h.toFixed(1));
            slidingData.push((h - (25 + (seed * 40) * Math.sin(ratio * Math.PI))).toFixed(1));
        }
        this.chartInstance.setOption({
            title: {
                text: `剖面结构分析 (${Math.round(distance)}m)`,
                left: 'center',
                textStyle: {color: '#1c3d90', fontSize: 14}
            },
            tooltip: {trigger: 'axis', formatter: '{b}<br/>{a0}: {c0}m<br/>{a1}: {c1}m'},
            legend: {data: ['地表线', '预估滑动面'], bottom: 0},
            grid: {top: 60, bottom: 60, left: 60, right: 40},
            xAxis: {type: 'category', data: xAxisLabels, boundaryGap: false, axisLine: {lineStyle: {color: '#999'}}},
            yAxis: {
                type: 'value',
                name: '高程 (m)',
                min: (v) => Math.floor(v.min / 10) * 10 - 20,
                axisLine: {show: true}
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
                    }, {offset: 1, color: 'rgba(255,255,255,0)'}])
                },
                lineStyle: {color: '#1c3d90', width: 3}
            }, {
                name: '预估滑动面',
                data: slidingData,
                type: 'line',
                smooth: true,
                lineStyle: {type: 'dashed', color: '#F57676', width: 2}
            }]
        });
    },
    closeWorkbench() {
        document.getElementById('profile-workbench').style.display = 'none';
        this.resetDrawingData();
    },
    resetDrawingData() {
        this.selectedPoints = [];
        this.dragLine = {start: null, end: null};
        document.querySelectorAll('.point-obj, .virtual-point').forEach(p => p.classList.remove('selected'));
        this.renderLines();
    },
    exportImage() {
        if (!this.chartInstance) return;
        const link = document.createElement('a');
        link.href = this.chartInstance.getDataURL({type: 'png', pixelRatio: 2, backgroundColor: '#fff'});
        link.download = `剖面图_${Math.round(Date.now() / 1000)}.png`;
        link.click();
    }
};

/* =========================================================
   5. 地图交互模块 (mapModule)
   ========================================================= */
const mapModule = {
    scale: 0.6, pos: {x: -300, y: -200}, tMultiplier: 1, isDetailMode: false, pMeta: {}, selectedMapTypes: ['geology'],
    radarList: [], virtualPoints: {},
    init() {
        const vp = document.getElementById('map-viewer'), cv = document.getElementById('map-canvas');
        if (!vp || !cv) return;


        // 在 mapModule.init() 内部...
        /* --- mapModule.init 内部 --- */

        /* --- mapModule.init 内部 --- */

        // 1. 鼠标按下 (增加 e.button === 0 判断，只允许左键画图)
        vp.onmousedown = (e) => {
            // 必须是左键 (0) 才触发绘制逻辑，右键 (2) 留给结束逻辑
            if (e.button !== 0) return;

            if (customSelectModule && customSelectModule.isDrawing) {
                customSelectModule.handleMouseDown(e);
                return;
            }

            if (profileModule.isDrawing && e.ctrlKey) {
                profileModule.handleMouseDown(e);
                return;
            }

            if (e.target === vp || e.target.id === 'map-canvas' || e.target.classList.contains('radar-cloud')) {
                drg = true;
                sx = e.clientX - this.pos.x;
                sy = e.clientY - this.pos.y;
                vp.style.cursor = 'grabbing';
            }
        };

        // 2. 【核心新增】右键点击 = 结束绘制
        vp.oncontextmenu = (e) => {
            e.preventDefault(); // 阻止浏览器默认的右键菜单

            if (customSelectModule && customSelectModule.isDrawing) {
                customSelectModule.finish(); // 调用结束方法
                return;
            }

            // 如果有其他右键逻辑可以在这里写
        };

        // 3. 鼠标移动 (保持不变)
        window.onmousemove = (e) => {
            if (customSelectModule && customSelectModule.isDrawing) {
                customSelectModule.handleMouseMove(e);
                return;
            }
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

        // 4. 鼠标松开 (保持不变)
        window.onmouseup = (e) => {
            if (customSelectModule && customSelectModule.isDrawing) {
                customSelectModule.handleMouseUp(e);
                return;
            }
            if (profileModule.isDrawing && profileModule.isDragging) {
                profileModule.handleMouseUp();
            }
            drg = false;
            vp.style.cursor = profileModule.isDrawing ? 'crosshair' : 'grab';
        };

        // 5. 点击事件 (保持不变，用于兼容点选)
        vp.onclick = (e) => {
            if (customSelectModule.isDrawing) return; // 绘制模式下忽略普通点击
            // ... 原有的点击逻辑 ...
        };

        // 6. 双击事件 (可以删掉 customSelectModule 的逻辑了，因为我们用右键了)
        vp.ondblclick = (e) => {
            // 这里留空，或者只保留原有的其他业务逻辑
        };

        // 3. 处理移动 (画线预览)
        // // window.onmousemove = (e) => {
        //     // [新增] 圈定预览
        //     if (customSelectModule.isDrawing) {
        //         customSelectModule.handleMouseMove(e);
        //         return; // 阻止地图拖拽
        //     }
        //
        //     // 原有逻辑...
        //     if (profileModule.isDrawing && profileModule.isDragging) { profileModule.handleMouseMove(e); return; }
        //     if (drg) { this.pos.x = e.clientX - sx; this.pos.y = e.clientY - sy; upd(); }
        // };

        const upd = () => cv.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px) scale(${this.scale})`;
        vp.onwheel = (e) => {
            e.preventDefault();
            const ns = Math.min(Math.max(0.2, this.scale + (e.deltaY * -0.0012)), 3.5);
            const r = vp.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top,
                ratio = ns / this.scale;
            this.pos.x = mx - (mx - this.pos.x) * ratio;
            this.pos.y = my - (my - this.pos.y) * ratio;
            this.scale = ns;
            upd();
        };
        let drg = false, sx, sy;
        // vp.onmousedown = (e) => { if (profileModule.isDrawing && e.ctrlKey && e.button === 0) { profileModule.handleMouseDown(e); return; } if (e.button === 0 && (e.target === vp || e.target.id === 'map-canvas' || e.target.classList.contains('radar-cloud'))) { drg = true; sx = e.clientX - this.pos.x; sy = e.clientY - this.pos.y; vp.style.cursor = 'grabbing'; } };
        // window.onmousemove = (e) => { if (profileModule.isDrawing && profileModule.isDragging) { profileModule.handleMouseMove(e); return; } if (drg) { this.pos.x = e.clientX - sx; this.pos.y = e.clientY - sy; upd(); } };
        // window.onmouseup = () => { if (profileModule.isDrawing && profileModule.isDragging) { profileModule.handleMouseUp(); } drg = false; vp.style.cursor = profileModule.isDrawing ? 'crosshair' : 'grab'; };
        this.spawnRadars();
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
        const options = [{id: 'geology', label: '地质模型'}, {id: 'dtm', label: 'DTM面'}, {
            id: 'uav',
            label: '无人机地图'
        }];
        const container = document.getElementById('map-view-dropdown');
        container.innerHTML = options.map(opt => ` <div class="custom-dropdown-item" onclick="event.stopPropagation()"> <input type="checkbox" value="${opt.id}" ${this.selectedMapTypes.includes(opt.id) ? 'checked' : ''} onchange="mapModule.handleViewTypeChange(this)"> <span>${opt.label}</span> </div> `).join('');
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
        const labels = {geology: '地质模型', dtm: 'DTM面', uav: '无人机地图'};
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

    // --- 【补全】绘制矿坑回字形结构的函数 ---
    drawDemoMap() {
        const svg = document.getElementById('draw-svg');
        if(!svg) return;

        // 1. 清空旧内容
        svg.innerHTML = '';

        // 2. 定义参数 (中心点 1500, 1250)
        const centerX = 1500;
        const centerY = 1250;

        // 3. 矩形配置：从外到内
        const rects = [
            { w: 2200, h: 1600, color: '#409EFF', width: 4, opacity: 0.3 }, // 最外圈（坑口）
            { w: 1900, h: 1400, color: '#E6A23C', width: 2, opacity: 0.5 }, // 台阶1 (监测线1)
            { w: 1600, h: 1200, color: '#F56C6C', width: 2, opacity: 0.5 }, // 台阶2 (监测线2)
            { w: 1300, h: 1000, color: '#67C23A', width: 2, opacity: 0.5 }, // 台阶3 (监测线3)
            { w: 1000, h: 800,  color: '#909399', width: 2, opacity: 0.3 }  // 坑底
        ];

        // 4. 循环绘制矩形
        rects.forEach((r, index) => {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", centerX - r.w / 2);
            rect.setAttribute("y", centerY - r.h / 2);
            rect.setAttribute("width", r.w);
            rect.setAttribute("height", r.h);
            rect.setAttribute("fill", "none");
            rect.setAttribute("stroke", r.color);
            rect.setAttribute("stroke-width", r.width);
            rect.setAttribute("opacity", r.opacity);
            // 给每一层加个ID方便后续逻辑可能用到
            rect.setAttribute("id", `bench-layer-${index}`);
            svg.appendChild(rect);
        });

        // 5. 画几条对角线增加立体感 (可选)
        const diagonals = [
            // 左上 -> 左上内
            { x1: centerX - 2200/2, y1: centerY - 1600/2, x2: centerX - 1000/2, y2: centerY - 800/2 },
            // 右上 -> 右上内
            { x1: centerX + 2200/2, y1: centerY - 1600/2, x2: centerX + 1000/2, y2: centerY - 800/2 },
            // 右下 -> 右下内
            { x1: centerX + 2200/2, y1: centerY + 1600/2, x2: centerX + 1000/2, y2: centerY + 800/2 },
            // 左下 -> 左下内
            { x1: centerX - 2200/2, y1: centerY + 1600/2, x2: centerX - 1000/2, y2: centerY + 800/2 }
        ];

        diagonals.forEach(d => {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", d.x1);
            line.setAttribute("y1", d.y1);
            line.setAttribute("x2", d.x2);
            line.setAttribute("y2", d.y2);
            line.setAttribute("stroke", "#409EFF");
            line.setAttribute("stroke-width", "1");
            line.setAttribute("opacity", "0.2");
            svg.appendChild(line);
        });
    },

    // --- 雷达生成与渲染逻辑 ---
    // 在 mapModule 对象内部替换 spawnRadars

    spawnRadars() {
        // 1. 先画底图（暗淡的背景）
        this.drawDemoMap();

        const cv = document.getElementById('map-canvas');
        // 清理除SVG外的元素
        Array.from(cv.children).forEach(child => {
            if (child.id !== 'draw-svg') cv.removeChild(child);
        });

        // 地图参数 (必须与 drawDemoMap 一致)
        const centerX = 1500;
        const centerY = 1250;
        const offset = 950;

        // 关键数据：台阶矩形尺寸 (用于计算点击后要高亮哪条线)
        // 对应 drawDemoMap 里的 rects，但这里我们只取前三个作为监测线
        const benchRects = [
            { w: 1900, h: 1400 }, // 台阶1
            { w: 1600, h: 1200 }, // 台阶2
            { w: 1300, h: 1000 }  // 台阶3
        ];

        // 雷达配置
        const radarConfigs = [
            {
                id: 'R1', name: '雷达1(北)', region: '南帮',
                x: centerX, y: centerY - offset - 100,
                angle: 180, targetSide: 'bottom',
                isOnline: true  // 新增：雷达1在线
            },
            {
                id: 'R2', name: '雷达2(东)', region: '西帮',
                x: centerX + offset + 200, y: centerY,
                angle: 270, targetSide: 'left',
                isOnline: true  // 新增：雷达2在线
            },
            {
                id: 'R3', name: '雷达3(南)', region: '北帮',
                x: centerX, y: centerY + offset + 100,
                angle: 0, targetSide: 'top',
                isOnline: true   // 新增：雷达3在线
            },
            {
                id: 'R4', name: '雷达4(西)', region: '东帮',
                x: centerX - offset - 200, y: centerY,
                angle: 90, targetSide: 'right',
                isOnline: false  // 新增：雷达4离线
            }
        ];

        this.radarList = [];
        this.virtualPoints = {};
        this.pMeta = {};

        radarConfigs.forEach((cfg) => {
            // --- 1. 雷达图标 ---
            const radar = document.createElement('div');
            radar.className = 'radar-station';
            radar.style.left = (cfg.x - 20) + 'px';
            radar.style.top = (cfg.y - 20) + 'px';

// 根据在线状态设置图标和样式
            if (cfg.isOnline === false) {
                radar.innerHTML = '📡';  // 使用灰色图标（原色）
                radar.style.filter = 'grayscale(100%) opacity(0.6)';  // 变成灰色
                radar.style.borderColor = '#999';  // 边框变灰色
                radar.title = `${cfg.name}（离线）`;  // 鼠标悬停提示
            } else {
                radar.innerHTML = '📡';  // 正常图标
                radar.title = `${cfg.name}（在线）`;
            }

            radar.id = `radar-${cfg.id}`;
            // ★ 点击雷达：触发高亮视场逻辑
            radar.onclick = (e) => {
                e.stopPropagation();
                this.highlightRadarView(cfg, benchRects, centerX, centerY);
            };
            cv.appendChild(radar);

            // --- 2. 静态云图 (默认隐藏，点击才显示，或者默认半透明) ---
            /* radar.js - 在 spawnRadars 函数内部找到这部分 */

// --- 2. 静态云图 ---
            const cloud = document.createElement('div');
            cloud.className = 'radar-cloud';
            cloud.id = `cloud-${cfg.id}`;

// 【核心修改】修正位置计算
// CSS里宽度是2400，所以 left 要减去一半 (1200)
// CSS里高度是2000，所以 top 要减去高度 (2000)
            cloud.style.left = (cfg.x - 1200) + 'px';
            cloud.style.top = (cfg.y - 2000) + 'px';

            cloud.style.transform = `rotate(${cfg.angle}deg)`;

// 初始设为隐藏
            cloud.style.opacity = '0';
            cloud.style.transition = 'opacity 0.5s';
            cloud.style.pointerEvents = 'none';

// 这里背景已经在CSS里定义了，JS里就不需要再强制覆盖 background 了
// 或者你想保留JS控制颜色也可以，但建议用CSS控制，这里把下面这行注释掉或删掉：
// cloud.style.background = ... (这行删掉，用CSS的样式)

            cv.appendChild(cloud);

            // --- 3. 生成监测点 ---
            benchRects.forEach((r, idx) => {
                const surfaceId = (idx + 1).toString();
                for(let i=1; i<=3; i++) {
                    const pId = `${cfg.id}-S${surfaceId}-P${i}`;
                    // 计算点坐标...
                    // === 添加：计算点坐标 ===
                    let px, py;
                    const jitter = () => Math.random() * 20 - 10;

                    if (cfg.targetSide === 'bottom') {
                        px = centerX - (r.w/2) + (r.w/4 * i) + jitter();
                        py = centerY + (r.h/2) + jitter();
                    } else if (cfg.targetSide === 'top') {
                        px = centerX - (r.w/2) + (r.w/4 * i) + jitter();
                        py = centerY - (r.h/2) + jitter();
                    } else if (cfg.targetSide === 'left') {
                        px = centerX - (r.w/2) + jitter();
                        py = centerY - (r.h/2) + (r.h/4 * i) + jitter();
                    } else { // right
                        px = centerX + (r.w/2) + jitter();
                        py = centerY - (r.h/2) + (r.h/4 * i) + jitter();
                    }
                    // === 坐标计算结束 ===

                    // 为每个监测点生成合理分布的随机速度值
// 使用更复杂的算法，确保风险等级分布合理
                    const seed = pId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

// 方法：根据点的位置和雷达编号，生成有规律但随机分布的数值
                    const positionFactor = (Math.sin(seed * 0.1) * 0.5 + 0.5); // 0-1之间
                    const radarFactor = cfg.id === 'R1' ? 0.8 : cfg.id === 'R2' ? 1.0 : cfg.id === 'R3' ? 0.6 : 0.9;
                    const indexFactor = (i + idx * 3) % 12 / 12; // 0-1之间

// 组合这些因素生成基础值（0-10之间）
                    const baseValue = (positionFactor * 0.3 + indexFactor * 0.4 + Math.random() * 0.3) * 10 * radarFactor;

// 对速度值进行调整，确保合理分布
// 1. 让大部分点处于低风险
// 2. 只有少数点处于高风险
                    let randomSpeed;

// 按概率分配速度值
                    const rand = Math.random();
                    if (rand < 0.05) { // 5% 一级告警
                        randomSpeed = 8.0 + Math.random() * 4.0; // 8.0-12.0
                    } else if (rand < 0.15) { // 10% 二级告警
                        randomSpeed = 5.0 + Math.random() * 3.0; // 5.0-8.0
                    } else if (rand < 0.35) { // 20% 三级告警
                        randomSpeed = 3.0 + Math.random() * 2.0; // 3.0-5.0
                    } else if (rand < 0.60) { // 25% 四级告警
                        randomSpeed = 2.0 + Math.random() * 1.0; // 2.0-3.0
                    } else { // 40% 正常
                        randomSpeed = 0.1 + Math.random() * 1.9; // 0.1-2.0
                    }

// 风险等级计算
                    const getRiskLevel = (speed) => {
                        if (speed >= 8.0) return 0; // 一级告警（红色）
                        if (speed >= 5.0) return 1; // 二级告警（橙色）
                        if (speed >= 3.0) return 2; // 三级告警（黄色）
                        if (speed >= 2.0) return 3; // 四级告警（蓝色）
                        return 4; // 正常（绿色）
                    };

                    const alarmIdx = getRiskLevel(randomSpeed);
                    // 获取风险等级对应的颜色
                    const colors = ['#F57676', '#FFA500', '#E6A23C', '#66B1FF', '#71C446'];
                    const pointColor = colors[alarmIdx];

                    const point = document.createElement('div');
                    point.className = 'virtual-point';
                    point.id = pId;
                    point.style.left = px + 'px';
                    point.style.top = py + 'px';
                    point.dataset.radar = cfg.id;
                    point.style.backgroundColor = pointColor;

                    // 添加风险等级数据属性
                    point.dataset.riskLevel = alarmIdx;
                    point.dataset.speed = randomSpeed.toFixed(2);

                    // 点击事件保持不变...


                    // 点击点
                    point.onclick = (e) => {
                        e.stopPropagation();
                        dashModule.focusWithRange(pId);
                        // 模拟打开分析
                        analysisModule.open({ deviceId: pId, region: cfg.region });
                    };

                    cv.appendChild(point);

                    // 存元数据
                    // this.pMeta[pId] = { deviceId: `${cfg.name}-点${i}`, region: cfg.region, alarmIdx: 4, isOnline: true };
                    // 注意：这里的 alarmIdx 要和前面计算的保持一致
                    this.pMeta[pId] = {
                        deviceId: `${cfg.name}-点${i}`,
                        region: cfg.region,
                        alarmIdx: alarmIdx,  // 使用真实的风险等级
                        speed: randomSpeed.toFixed(2),  // 存储速度值
                        isOnline: cfg.isOnline  // 继承雷达的在线状态
                    };
                    // ★★★ 核心修复：补全数据，否则筛选器无法识别，会导致默认全隐 ★★★
                    this.virtualPoints[pId] = {
                        id: pId,
                        radarName: cfg.name,
                        el: point,
                        region: cfg.region,      // 新增：存入区域
                        surfaceId: surfaceId     // 新增：存入台阶ID
                    };
                    // this.virtualPoints[pId] = { id: pId, radarName: cfg.name, el: point };
                }
            });

            this.radarList.push(cfg);
        });
    },
    // 在 mapModule 对象内部添加

    /* radar.js - 替换 highlightRadarView 方法 */

    highlightRadarView(targetCfg, benchRects, cx, cy) {
        const svg = document.getElementById('draw-svg');
        const cv = document.getElementById('map-canvas');
        const vp = document.getElementById('map-viewer');

        // 1. 镜头聚焦
        let focusX = targetCfg.x;
        let focusY = targetCfg.y;
        // 偏移量，让视角更舒服
        if (targetCfg.targetSide === 'bottom') focusY += 600;
        if (targetCfg.targetSide === 'top') focusY -= 600;
        if (targetCfg.targetSide === 'left') focusX -= 600;
        if (targetCfg.targetSide === 'right') focusX += 600;

        this.scale = 0.9; // 稍微缩小一点，以便看清整个扇面
        this.pos.x = (vp.clientWidth / 2) - (focusX * this.scale);
        this.pos.y = (vp.clientHeight / 2) - (focusY * this.scale);
        cv.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px) scale(${this.scale})`;

        // 2. 云图控制
        document.querySelectorAll('.radar-cloud').forEach(c => c.style.opacity = '0');
        const activeCloud = document.getElementById(`cloud-${targetCfg.id}`);
        if (activeCloud) activeCloud.style.opacity = '1';

        // 3. 点位控制
        document.querySelectorAll('.virtual-point').forEach(p => {
            if (p.dataset.radar === targetCfg.id) {
                p.style.opacity = '1';
                p.style.transform = 'scale(1.5)';
                p.style.zIndex = '100';
                p.style.boxShadow = '0 0 10px #fff';
                // 点的颜色保持，或者统一高亮
            } else {
                p.style.opacity = '0.05'; // 其他点几乎隐形
                p.style.transform = 'scale(1)';
                p.style.zIndex = '1';
                p.style.boxShadow = 'none';
            }
        });

        // 4. ★★★ 核心修改：绘制“面”（Polygons） ★★★
        // 清除旧的高亮内容（线和面）
        const oldHighlights = svg.querySelectorAll('.highlight-obj');
        oldHighlights.forEach(el => el.remove());

        // 定义所有的矩形边界 (用于计算面的坐标)
        // 注意：这里需要包含 最外圈(Ground) 和 每一级台阶
        const allRects = [
            { w: 2200, h: 1600 }, // 0: 地面边缘 (面1的外边)
            { w: 1900, h: 1400 }, // 1: 台阶1 (面1的内边 / 面2的外边)
            { w: 1600, h: 1200 }, // 2: 台阶2 (面2的内边 / 面3的外边)
            { w: 1300, h: 1000 }  // 3: 台阶3 (面3的内边)
        ];

        // 循环生成 3 个面
        for (let i = 0; i < 3; i++) {
            const outer = allRects[i];
            const inner = allRects[i+1];

            // 计算梯形的四个点坐标
            let pointsStr = "";
            let labelX = 0, labelY = 0; // 标签位置

            if (targetCfg.targetSide === 'bottom') {
                // 南帮面：由 外矩形底边 和 内矩形底边 围成
                // 顺序：外左下 -> 外右下 -> 内右下 -> 内左下
                const p1 = `${cx - outer.w/2},${cy + outer.h/2}`;
                const p2 = `${cx + outer.w/2},${cy + outer.h/2}`;
                const p3 = `${cx + inner.w/2},${cy + inner.h/2}`;
                const p4 = `${cx - inner.w/2},${cy + inner.h/2}`;
                pointsStr = `${p1} ${p2} ${p3} ${p4}`;
                labelX = cx;
                labelY = cy + inner.h/2 + (outer.h/2 - inner.h/2)/2; // 居中
            }
            else if (targetCfg.targetSide === 'top') {
                // 北帮面：顶边
                const p1 = `${cx - outer.w/2},${cy - outer.h/2}`;
                const p2 = `${cx + outer.w/2},${cy - outer.h/2}`;
                const p3 = `${cx + inner.w/2},${cy - inner.h/2}`;
                const p4 = `${cx - inner.w/2},${cy - inner.h/2}`;
                pointsStr = `${p1} ${p2} ${p3} ${p4}`;
                labelX = cx;
                labelY = cy - inner.h/2 - (outer.h/2 - inner.h/2)/2;
            }
            else if (targetCfg.targetSide === 'left') {
                // 西帮面：左边
                const p1 = `${cx - outer.w/2},${cy - outer.h/2}`;
                const p2 = `${cx - outer.w/2},${cy + outer.h/2}`;
                const p3 = `${cx - inner.w/2},${cy + inner.h/2}`;
                const p4 = `${cx - inner.w/2},${cy - inner.h/2}`;
                pointsStr = `${p1} ${p2} ${p3} ${p4}`;
                labelX = cx - inner.w/2 - (outer.w/2 - inner.w/2)/2;
                labelY = cy;
            }
            else { // right
                // 东帮面：右边
                const p1 = `${cx + outer.w/2},${cy - outer.h/2}`;
                const p2 = `${cx + outer.w/2},${cy + outer.h/2}`;
                const p3 = `${cx + inner.w/2},${cy + inner.h/2}`;
                const p4 = `${cx + inner.w/2},${cy - inner.h/2}`;
                pointsStr = `${p1} ${p2} ${p3} ${p4}`;
                labelX = cx + inner.w/2 + (outer.w/2 - inner.w/2)/2;
                labelY = cy;
            }

            // 4.1 创建面 (Polygon)
            const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            poly.setAttribute("points", pointsStr);
            poly.setAttribute("fill", "rgba(64, 158, 255, 0.25)"); // 半透明蓝
            poly.setAttribute("stroke", "rgba(64, 158, 255, 0.8)"); // 亮蓝边框
            poly.setAttribute("stroke-width", "2");
            poly.setAttribute("class", "highlight-obj");

            // 加一点交互感，鼠标放上去变亮
            poly.style.transition = "fill 0.3s";
            poly.onmouseenter = () => poly.setAttribute("fill", "rgba(64, 158, 255, 0.45)");
            poly.onmouseleave = () => poly.setAttribute("fill", "rgba(64, 158, 255, 0.25)");

            // 4.2 创建面的文字标签 (Text)
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", labelX);
            text.setAttribute("y", labelY);
            text.setAttribute("text-anchor", "middle"); // 文字居中
            text.setAttribute("dominant-baseline", "middle");
            text.setAttribute("fill", "#fff");
            text.setAttribute("font-size", "24");
            text.setAttribute("font-weight", "bold");
            text.setAttribute("class", "highlight-obj");
            text.style.pointerEvents = "none"; // 让鼠标穿透文字
            text.style.textShadow = "0 0 5px #000";
            text.textContent = `区域 ${i + 1}`; // 显示 "区域 1", "区域 2"

            // 插入到 SVG
            svg.appendChild(poly);
            svg.appendChild(text);

            // 4.3 额外绘制监测线 (加粗高亮内边缘)
            // 也就是 benchRects 里的线，这里其实就是 inner 的那条边
            // 为了视觉更强，我们可以单独画一条高亮线在 poly 的内侧边上
            // (略，因为 polygon 已经有 stroke 了，足够清晰)
        }

        // 5. 联动左侧UI
        // 5. 联动左侧UI
        if (typeof mapFilterModule !== 'undefined') {
            // 更新地图筛选模块的雷达选择
            mapFilterModule.selectedRadars = [targetCfg.name];
            mapFilterModule.updateLabel('radar-select-label', [targetCfg.name], '选择设备');
            mapFilterModule.renderRadarOptions();
            mapFilterModule.applyMapFilter();
        }
    },





    focus(type) {
        this.scale = 0.6;
        this.pos = {x: -300, y: -200};
        const cv = document.getElementById('map-canvas');
        cv.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px) scale(${this.scale})`;
    },
    toggleDrawer() {
        document.getElementById('device-drawer').classList.toggle('active');
    },
    setTime(days, btn) {
        document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        this.tMultiplier = days;
    },
    applyCustomTime() {
        document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
    },
    getTechData(type, id) {
        const meta = this.pMeta[id];
        const multiplier = this.isDetailMode ? 1 : (this.tMultiplier || 1);
        const seed = id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const variance = (seed % 10) * 0.1;
        let speed = 0.5;
        switch (meta.alarmIdx) {
            case 0:
                speed = 8.5 + variance * 5;
                break;
            case 1:
                speed = 5.1 + (seed % 29) * 0.1;
                break;
            case 2:
                speed = 3.1 + (seed % 19) * 0.1;
                break;
            case 3:
                speed = 2.1 + (seed % 9) * 0.1;
                break;
            default:
                speed = 0.2 + (seed % 15) * 0.1;
        }
        const totalDisp = (speed * 24 * multiplier).toFixed(2);
        return `变形速度: ${speed.toFixed(2)} mm/h<br>累积形变: ${totalDisp} mm<br>信号强度: -${(20 + variance * 5).toFixed(1)} dBm`;
    }
};

/* =========================================================
   6. 仪表盘模块 (dashModule)
   ========================================================= */
const dashModule = {
    // 在现有属性后添加这个函数
    getRiskLevel: function(speed) {
        // 根据Excel表格中的硬岩雷达阈值
        if (speed >= 8.0) return 0; // 一级告警（红色）
        if (speed >= 5.0) return 1; // 二级告警（橙色）
        if (speed >= 3.0) return 2; // 三级告警（黄色）
        if (speed >= 2.0) return 3; // 四级告警（蓝色）
        return 4; // 正常（绿色）
    },
    currentPage: 1,
    pageSize: 5,
    thresholds: {0: ">= 8.0", 1: "5.0 - 8.0", 2: "3.0 - 5.0", 3: "2.0 - 3.0", 4: "< 2.0"},
    colors: ['#F57676', '#FFA500', '#E6A23C', '#66B1FF', '#71C446'],
    currentChartId: null,
    offlineData: [],
    offlineCurrentPage: 1,
    offlinePageSize: 5,
    // [新增] 底部图表的状态管理
    bottomChartMode: 'surface', // 'point' (虚拟点) 或 'surface' (虚拟面)
    isCustomSelecting: false, // 是否处于自定义圈定模式
    currentChartId: null,     // 当前选中的ID (点ID 或 面ID)
    init() {
        setTimeout(() => {
            this.initOnlineChart();
            this.initAlarmChart();
            this.renderWarningTable();
            const allData = this.getSortedGnssData();
            if (allData.length > 0) {
                this.initSpeedChart(allData[0].id);
            } else {
                this.initSpeedChart();
            }
        }, 500);
    },

    // [新增] 切换图表类型 (点 <-> 面)
    switchBottomChart(direction) {
        // 切换模式
        this.bottomChartMode = (this.bottomChartMode === 'point') ? 'surface' : 'point';

        // 更新标题
        const titleEl = document.getElementById('bottom-chart-title');
        titleEl.innerText = (this.bottomChartMode === 'point') ? '圈定点累积形变' : '圈定面累积形变';

        // 重新渲染图表 (使用当前选中的ID)
        this.renderBottomChart(this.currentChartId);
    },

    // [新增] 切换“自定义圈定”模式
    // [修改] 切换“自定义圈定”模式
    toggleCustomSelect() {
        this.isCustomSelecting = !this.isCustomSelecting;
        const btn = document.getElementById('btn-custom-select');

        if (this.isCustomSelecting) {
            btn.classList.add('active-mode');
            btn.innerHTML = 'Esc 退出圈定';
            // 启动绘制模块
            customSelectModule.start(this.bottomChartMode);
        } else {
            btn.classList.remove('active-mode');
            btn.innerHTML = '⌖ 自定义圈定';
            // 停止绘制
            customSelectModule.stop();
            // 如果只画了一半就退出了，清空它
            if (document.getElementById('selection-modal').style.display === 'none') {
                customSelectModule.clearSvg();
            }
        }
    },
    // [新增] 外部调用：更新底部图表数据
    updateBottomChartTarget(targetId) {
        this.currentChartId = targetId;
        // 如果当前是面模式，但点选了具体的点，我们从ID中提取面ID
        // 假设ID格式: R1-S1-P1 (雷达-面-点)
        if (this.bottomChartMode === 'surface') {
            // 简单的逻辑：取中间部分作为面ID展示
            // 实际项目中应根据 ID 结构解析，这里为了演示，只要触发刷新即可
        }
        this.renderBottomChart(targetId);
    },
    // [修改/重写] 以前叫 initSpeedChart，现在改名为 renderBottomChart 更贴切，
    // 但为了兼容你之前的代码调用，我们可以保留 initSpeedChart 作为别名或入口
    initSpeedChart(targetId) {
        this.currentChartId = targetId || this.currentChartId;
        this.renderBottomChart(this.currentChartId);
    },

    // [修复版] 渲染底部图表：解决文字重叠 + 修复点击无效
    // [修改版] 渲染底部图表
    // [修改版] 渲染底部图表：仅响应自定义圈定，屏蔽其他干扰
    // [修改版] 渲染底部图表：包含“自定义圈定”和“演示造假”逻辑
    // [最终修复版] 渲染底部图表：确保点击百分百触发
    renderBottomChart(targetId) {
        const chartEl = document.getElementById('chart-sp');
        if (!chartEl) return;

        // 1. 销毁旧实例，防止内存泄漏或事件重复绑定
        let chart = echarts.getInstanceByDom(chartEl);
        if (chart) chart.dispose();
        chart = echarts.init(chartEl);

        // 2. 定义变量
        let dynamicData = [];
        let color = '#409EFF';
        let titleText = '';
        let subText = '';
        let targetMeta = null; // 初始化为空

        // 辅助函数：生成随机数据
        const generateFakeData = (base, variance) => {
            return Array.from({length: 5}, () => (base + Math.random() * variance - (variance/2)).toFixed(2));
        };

        // 3. 根据 targetId 判断显示逻辑 (全场景覆盖)
        if (targetId === 'CUSTOM_AREA_DATA') {
            // --- 场景1：自定义圈定 (绿色) ---
            titleText = '自定义圈定区域';
            subText = '多点聚合分析结果';
            color = '#71C446';
            dynamicData = generateFakeData(6.5, 3);
            // 赋值 Meta
            targetMeta = {deviceId: 'Custom-Area', region: '自定义', alarmIdx: 4};

        } else if (targetId && targetId.startsWith('DEMO_REGION_')) {
            // --- 场景2：筛选了区域 (蓝色) ---
            const regionName = targetId.replace('DEMO_REGION_', '');
            titleText = `${regionName}综合形变趋势`;
            subText = '区域平均值';
            color = '#409EFF';
            dynamicData = generateFakeData(4.0, 1.5);
            // 赋值 Meta
            targetMeta = {
                deviceId: `${regionName}-综合监测`,
                region: regionName,
                alarmIdx: 4
            };

        } else if (targetId && targetId.startsWith('DEMO_RADAR_')) {
            // --- 场景3：筛选了雷达 (橙色) ---
            const radarName = targetId.replace('DEMO_RADAR_', '');
            titleText = `${radarName}监测趋势`;
            subText = '设备实时监测';
            color = '#E6A23C';
            dynamicData = generateFakeData(7.0, 2.5);
            // 赋值 Meta
            targetMeta = {
                deviceId: `${radarName}-点01`,
                region: '北帮', // 演示默认值
                alarmIdx: 4
            };

        } else {
            // --- 场景4：默认/什么都没选 (深蓝) ---
            titleText = '重点区域监测趋势';
            subText = '全矿区总览';
            color = '#1c3d90';
            dynamicData = [4.2, 4.5, 4.3, 4.8, 4.6];
            // 赋值 Meta (确保默认状态也能点！)
            targetMeta = {
                deviceId: '全矿区-总览',
                region: '北帮',
                alarmIdx: 4
            };
        }

        // 4. 设置图表配置
        const option = {
            title: {
                text: titleText,
                subtext: subText,
                itemGap: 4,
                textStyle: {fontSize: 13, color: color, fontWeight: 'bold'},
                subtextStyle: {fontSize: 11, color: '#666'},
                right: 5, top: 0, textAlign: 'right'
            },
            tooltip: {trigger: 'axis'},
            grid: { top: 50, bottom: 20, left: 40, right: 15 },
            xAxis: {
                type: 'category', boundaryGap: false,
                data: ['0h', '6h', '12h', '18h', '24h'],
                axisLine: {lineStyle: {color: '#ccc'}}, axisLabel: {fontSize: 10}
            },
            yAxis: {
                type: 'value', name: 'mm',
                nameTextStyle: {color: '#666', padding: [0, 0, 0, -20]},
                splitLine: {lineStyle: {type: 'dashed'}}, axisLabel: {fontSize: 10}
            },
            series: [{
                data: dynamicData,
                type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        {offset: 0, color: color}, {offset: 1, color: 'rgba(255,255,255,0)'}
                    ])
                },
                lineStyle: {color: color, width: 2}, itemStyle: {color: color}
            }]
        };

        chart.setOption(option);

        // 5. ★★★ 关键修复：绑定点击事件 ★★★
        // 使用 getZr() 监听整个画布区域，点击空白处也能触发，体验更好
        chart.getZr().off('click'); // 先解绑，保险起见
        chart.getZr().on('click', () => {
            console.log("Chart clicked! Target Meta:", targetMeta); // 调试日志
            if (targetMeta) {
                // 打开分析弹窗
                if (typeof analysisModule !== 'undefined' && analysisModule.open) {
                    analysisModule.open(targetMeta);
                } else {
                    alert("分析模块未加载，请检查 analysisModule");
                }
            }
        });

        // 记录当前ID
        this.currentChartId = targetId;
    },
    getSortedGnssData() {
        const visiblePointIds = [];
        if (mapModule.virtualPoints) {
            Object.values(mapModule.virtualPoints).forEach(vp => {
                // 注意：这里我们检查的是监测点元素是否显示，而不是通过样式，因为可能被其他筛选器隐藏
                // 但是为了简单，我们仍然使用样式检查，因为applyMapFilter会修改样式
                if (vp.el && vp.el.style.display !== 'none') {
                    visiblePointIds.push(vp.id);
                }
            });
        } else {
            return [];
        }
        let data = visiblePointIds.map(id => {
            const meta = mapModule.pMeta[id];
            if (!meta) return null;
            const seed = id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
            const variance = (seed % 10) * 0.1;
            let currentSpeed = 0.5;
            switch (meta.alarmIdx) {
                case 0:
                    currentSpeed = 8.5 + variance * 5;
                    break;
                case 1:
                    currentSpeed = 5.1 + (seed % 29) * 0.1;
                    break;
                case 2:
                    currentSpeed = 3.1 + (seed % 19) * 0.1;
                    break;
                case 3:
                    currentSpeed = 2.1 + (seed % 9) * 0.1;
                    break;
                default:
                    currentSpeed = 0.2 + (seed % 15) * 0.1;
            }
            return {
                id: id,
                deviceId: meta.deviceId,
                alarmIdx: meta.alarmIdx,
                region: meta.region,
                elevation: (1200 + Math.sin(seed) * 50).toFixed(1),
                value: currentSpeed.toFixed(2),
                threshold: this.thresholds[meta.alarmIdx]
            };
        }).filter(item => item !== null);
        return data.sort((a, b) => a.alarmIdx - b.alarmIdx || b.value - a.value);
    },


    // initSpeedChart(targetId) {
    //     this.currentChartId = targetId; const chartEl = document.getElementById('chart-sp'); if (!chartEl) return; let chart = echarts.getInstanceByDom(chartEl); if (chart) chart.dispose(); chart = echarts.init(chartEl);
    //     const meta = targetId ? mapModule.pMeta[targetId] : null; let dynamicData = []; let color = '#85C6F1'; let alarmName = '趋势监测';
    //     if (meta) {
    //         color = this.colors[meta.alarmIdx]; const seed = targetId.split('').reduce((a, b) => a + b.charCodeAt(0), 0); const variance = (seed % 10) * 0.1; let finalSpeed = 0.5;
    //         switch (meta.alarmIdx) { case 0: finalSpeed = 8.5 + variance * 5; break; case 1: finalSpeed = 5.1 + (seed % 29) * 0.1; break; case 2: finalSpeed = 3.1 + (seed % 19) * 0.1; break; case 3: finalSpeed = 2.1 + (seed % 9) * 0.1; break; default: finalSpeed = 0.2 + (seed % 15) * 0.1; }
    //         const wave = (Math.sin(seed) * 0.15);
    //         dynamicData = [ (finalSpeed * (0.3 + wave)).toFixed(2), (finalSpeed * (0.5 - wave)).toFixed(2), (finalSpeed * (0.8 + wave)).toFixed(2), (finalSpeed * (0.95 - wave)).toFixed(2), finalSpeed.toFixed(2) ];
    //         const alarmNames = ['一级告警', '二级告警', '三级告警', '四级告警', '运行正常']; alarmName = alarmNames[meta.alarmIdx];
    //     } else { dynamicData = [1.2, 1.5, 1.8, 1.6, 1.4]; }
    //     chart.setOption({ title: { text: meta ? `${meta.deviceId}` : '监测趋势', subtext: alarmName, textStyle: { fontSize: 11, color: color, fontWeight: 'bold' }, subtextStyle: { fontSize: 10, color: '#666' }, right: 10, top: 0 }, grid: { top: 40, bottom: 25, left: 45, right: 25 }, xAxis: { type: 'category', boundaryGap: false, data: ['0h', '6h', '12h', '18h', '24h'], axisLabel: { fontSize: 10, color: '#888' }, axisLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } } }, yAxis: { type: 'value', name: 'mm/h', nameTextStyle: { color: '#666', fontSize: 10 }, axisLabel: { fontSize: 10, color: '#888' }, splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } } }, series: [{ data: dynamicData, type: 'line', smooth: true, color: color, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: color + 'CC' }, { offset: 1, color: 'rgba(255, 255, 255, 0)' }]) } }] });
    // },
    // [修改版] 渲染预警表格：数据为空时自动填充演示数据
    renderWarningTable() {
        // 1. 先尝试获取真实数据
        let allData = this.getSortedGnssData();

        // ★★★ 核心修改：如果没数据，强制生成 5 条演示数据 ★★★
        if (allData.length === 0) {
            allData = Array.from({length: 5}, (_, i) => {
                // 随机生成一些像模像样的数据
                const demoRegions = ['北帮', '南帮', '东帮', '西帮'];
                const demoRisk = i % 5; // 让每一行风险等级都不一样
                const demoSpeed = (Math.random() * 10 + 0.5).toFixed(2);

                return {
                    id: `DEMO_ROW_${i}`,
                    region: demoRegions[i % 4], // 轮流显示区域
                    deviceId: `演示雷达-${i + 1}`, // 假的设备名
                    alarmIdx: demoRisk,
                    elevation: (1200 + Math.random() * 100).toFixed(1),
                    value: demoSpeed,
                    threshold: demoRisk === 0 ? '>= 8.0' : '5.0 - 8.0'
                };
            });
        }
        // ★★★ 修改结束 ★★★

        const totalPages = Math.ceil(allData.length / this.pageSize) || 1;
        if (this.currentPage > totalPages) this.currentPage = 1;
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const pageData = allData.slice(startIndex, startIndex + this.pageSize);
        const tbody = document.getElementById('warning-list');
        if (!tbody) return;

        // (删除了之前的 "暂无数据" 判断逻辑，因为现在永远有数据)

        const statusColors = ['#f5222d', '#fa8c16', '#fadb14', '#1890ff', '#52c41a'];

        tbody.innerHTML = pageData.map((item, i) => {
            const isRed = item.alarmIdx === 0;
            const rowClass = isRed ? 'row-red-active' : '';
            // 红色告警行文字用红色，其他行用对应颜色
            const textColor = isRed ? 'inherit' : statusColors[item.alarmIdx];

            return `<tr class="${rowClass}" style="cursor:pointer;" onclick="dashModule.focusWithRange('${item.id}')">
            <td style="font-weight:bold;">${startIndex + i + 1}</td>
            <td style="font-weight:bold; color:#1c3d90;">${item.region}</td>
            
            <td style="color:${textColor}; font-weight:bold;">
                ${item.deviceId}
            </td>
      
            <td>${item.elevation} m</td>
            <td style="color:${textColor}; font-weight:bold; font-size:13px;">${item.value} mm/h</td>
            <td style="color:#666; font-size:11px;">${item.threshold}</td>
        </tr>`;
        }).join('');

        // 渲染分页控件
        const pager = document.getElementById('table-pagination');
        if (pager) {
            pager.innerHTML = `
            <button class="pager-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                    onclick="if(${this.currentPage}>1)dashModule.changePage(${this.currentPage - 1})"> < </button>
            <span style="font-weight:bold; min-width:30px; text-align:center; color:#000; font-size:12px;">
                ${this.currentPage} / ${totalPages}
            </span>
            <button class="pager-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
                    onclick="if(${this.currentPage}<${totalPages})dashModule.changePage(${this.currentPage + 1})"> > </button>
        `;
        }
    },
    focusWithRange(targetId) {
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;
        mapModule.isDetailMode = true;
        document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
        const oneDayBtn = document.querySelector('.freq-btn');
        if (oneDayBtn) oneDayBtn.classList.add('active');
        const resetBtn = document.getElementById('reset-gnss-btn');
        if (resetBtn) resetBtn.style.display = 'flex';
        // this.initSpeedChart(targetId);
        document.querySelectorAll('.virtual-point').forEach(p => {
            if (p.id === targetId) {
                p.style.opacity = '1';
                p.classList.add('point-focus-center');
            } else {
                p.style.opacity = '0.3';
                p.classList.remove('point-focus-center');
            }
        });
        const tx = parseFloat(targetEl.style.left);
        const ty = parseFloat(targetEl.style.top);
        const vp = document.getElementById('map-viewer');
        const cv = document.getElementById('map-canvas');
        mapModule.scale = 1.0;
        mapModule.pos.x = (vp.clientWidth / 2) - (tx * mapModule.scale);
        mapModule.pos.y = (vp.clientHeight / 2) - (ty * mapModule.scale);
        cv.style.transform = `translate(${mapModule.pos.x}px, ${mapModule.pos.y}px) scale(${mapModule.scale})`;
    },
    changePage(p) {
        this.currentPage = p;
        this.renderWarningTable();
    },
    // initOnlineChart() { const all = Object.values(mapModule.pMeta); const online = all.filter(n => n.isOnline).length; const offline = all.length - online; const chartEl = document.getElementById('chart-on'); if(!chartEl) return; const chart = echarts.init(chartEl); chart.setOption({ title: { text: all.length, subtext: '设备总数', left: 'center', top: '35%', textStyle: { fontSize: 18, color: '#1c3d90', fontWeight: 'bold' }, subtextStyle: { fontSize: 10, color: '#999', verticalAlign: 'top' } }, tooltip: { show: false }, legend: { bottom: '2', icon: 'circle', itemWidth: 8, textStyle: { fontSize: 9 }, selectedMode: false, formatter: (name) => `${name}  ${(name === '在线') ? online : offline}` }, series: [{ type: 'pie', radius: ['45%', '65%'], center: ['50%', '45%'], avoidLabelOverlap: false, label: { show: false }, data: [ { value: online, name: '在线', itemStyle: { color: '#71C446' } }, { value: offline, name: '离线', itemStyle: { color: '#999' } } ] }] }); chart.on('click', params => { if (params.name === '离线') this.showOfflineModal(all.filter(n => !n.isOnline)); }); },
    // [修改] 统计雷达设备，而非监测点
    initOnlineChart() {
        // 1. 获取雷达列表
        const allRadars = mapModule.radarList || [];
        // 2. 统计在线/离线数量 (依靠 spawnRadars 中写入的 isOnline 属性)
        const onlineCount = allRadars.filter(r => r.isOnline).length;
        const offlineCount = allRadars.length - onlineCount;

        const chartEl = document.getElementById('chart-on');
        if (!chartEl) return;

        const chart = echarts.init(chartEl);
        chart.setOption({
            title: {
                text: allRadars.length, // 显示总数 (例如 7)
                subtext: '雷达总数',     // 文案改为雷达
                left: 'center', top: '35%',
                textStyle: {fontSize: 18, color: '#1c3d90', fontWeight: 'bold'},
                subtextStyle: {fontSize: 10, color: '#999', verticalAlign: 'top'}
            },
            tooltip: {show: false},
            legend: {
                bottom: '2', icon: 'circle', itemWidth: 8, textStyle: {fontSize: 9}, selectedMode: false,
                formatter: (name) => `${name}  ${(name === '在线') ? onlineCount : offlineCount}`
            },
            series: [{
                type: 'pie',
                radius: ['45%', '65%'],
                center: ['50%', '45%'],
                avoidLabelOverlap: false,
                label: {show: false},
                data: [
                    {value: onlineCount, name: '在线', itemStyle: {color: '#71C446'}},
                    {value: offlineCount, name: '离线', itemStyle: {color: '#999'}}
                ]
            }]
        });

        chart.on('click', params => {
            // 3. 点击离线时，传入离线的【雷达对象列表】
            if (params.name === '离线') {
                this.showOfflineModal(allRadars.filter(r => !r.isOnline));
            }
        });
    },
    initAlarmChart() {
        const allOnline = Object.values(mapModule.pMeta).filter(n => n.isOnline);
        const counts = [0, 0, 0, 0, 0];
        allOnline.forEach(n => {
            counts[n.alarmIdx]++;
        });
        const chartEl = document.getElementById('chart-al');
        if (!chartEl) return;
        const chart = echarts.init(chartEl);
        const colors = ['#F57676', '#FFA500', '#fadb14', '#66B1FF', '#71C446'];
        const alarmNames = ['一级告警', '二级告警', '三级告警', '四级告警', '运行正常'];
        let maxCount = 0, centerLabel = "运行正常", centerColor = colors[4];
        for (let i = 0; i < 5; i++) {
            if (counts[i] >= maxCount && counts[i] > 0) {
                maxCount = counts[i];
                centerLabel = alarmNames[i];
                centerColor = colors[i];
            }
        }
        chart.setOption({
            title: {
                text: maxCount,
                subtext: centerLabel,
                left: 'center',
                top: '35%',
                textStyle: {fontSize: 18, color: centerColor, fontWeight: 'bold'},
                subtextStyle: {fontSize: 10, color: '#999', verticalAlign: 'top'}
            },
            tooltip: {show: false},
            legend: {
                bottom: '2',
                icon: 'circle',
                itemWidth: 8,
                textStyle: {fontSize: 8},
                selectedMode: false,
                formatter: (name) => `${name}  ${counts[alarmNames.indexOf(name)]}`
            },
            series: [{
                type: 'pie',
                radius: ['45%', '65%'],
                center: ['50%', '45%'],
                label: {show: false},
                data: alarmNames.map((name, i) => ({value: counts[i], name: name, itemStyle: {color: colors[i]}}))
            }]
        });
        chart.on('click', params => {
            const targetIdx = params.dataIndex;
            mapModule.isDetailMode = true;
            document.getElementById('reset-gnss-btn').style.display = 'flex';
            document.querySelectorAll('.virtual-point').forEach(p => {
                const meta = mapModule.pMeta[p.id];
                if (meta && meta.isOnline && meta.alarmIdx === targetIdx) {
                    p.style.display = 'block';
                    p.style.opacity = '1';
                    p.classList.add('breathe');
                } else {
                    p.style.display = 'none';
                }
            });
        });
    },
    showOfflineModal(data) {
        const modal = document.getElementById('offline-modal');
        const mapSection = document.getElementById('main-map-section');
        if (!modal || !mapSection) return;
        this.offlineData = data;
        this.offlineCurrentPage = 1;
        mapSection.appendChild(modal);
        modal.style.display = 'flex';
        const offlineIds = data.map(d => Object.keys(mapModule.pMeta).find(k => mapModule.pMeta[k] === d)).filter(k => k);
        document.querySelectorAll('.virtual-point').forEach(p => {
            if (offlineIds.includes(p.id)) {
                p.style.display = 'block';
                p.style.opacity = '1';
            } else {
                p.style.opacity = '0.1';
            }
        });
        document.querySelectorAll('.freq-btn').forEach(btn => btn.classList.remove('active'));
        this.renderOfflineTable();
    },
    // renderOfflineTable() { const total = this.offlineData.length; const totalPages = Math.ceil(total / this.offlinePageSize) || 1; const start = (this.offlineCurrentPage - 1) * this.offlinePageSize; const pageData = this.offlineData.slice(start, start + this.offlinePageSize); let html = pageData.map((n, i) => ` <tr> <td>${start + i + 1}</td> <td>${n.region}</td> <td style="color:#f5222d; font-weight:bold;">${n.deviceId}</td> <td>2026-01-15 14:00</td> <td>雷达监测</td> </tr> `).join(''); const emptyRowsCount = this.offlinePageSize - pageData.length; for (let i = 0; i < emptyRowsCount; i++) { html += `<tr class="empty-row"><td colspan="5" style="border:none;">&nbsp;</td></tr>`; } const tbody = document.getElementById('offline-table-body'); if(tbody) tbody.innerHTML = html; const info = document.getElementById('offline-pager-info'); if(info) info.innerText = `共 ${total} 条离线记录 | 当前第 ${this.offlineCurrentPage} / ${totalPages} 页`; const ctrl = document.getElementById('offline-pager-ctrl'); if(ctrl) { ctrl.innerHTML = ` <button class="pager-btn ${this.offlineCurrentPage === 1 ? 'disabled' : ''}" onclick="if(dashModule.offlineCurrentPage > 1) dashModule.changeOfflinePage(dashModule.offlineCurrentPage - 1)"> 上一页 </button> <button class="pager-btn ${this.offlineCurrentPage === totalPages ? 'disabled' : ''}" onclick="if(dashModule.offlineCurrentPage < totalPages) dashModule.changeOfflinePage(dashModule.offlineCurrentPage + 1)"> 下一页 </button> `; } },
    // [修改] 渲染雷达离线表格
    renderOfflineTable() {
        const total = this.offlineData.length;
        const totalPages = Math.ceil(total / this.offlinePageSize) || 1;
        const start = (this.offlineCurrentPage - 1) * this.offlinePageSize;
        const pageData = this.offlineData.slice(start, start + this.offlinePageSize);

        // 生成表格行 (使用 radar.name)
        let html = pageData.map((radar, i) => ` 
            <tr> 
                <td>${start + i + 1}</td> 
                <td>${radar.region}</td> 
                <td style="color:#f5222d; font-weight:bold;">${radar.name}</td> 
                <td>${new Date().toLocaleString()}</td> 
                <td>雷达主机</td> 
            </tr> 
        `).join('');

        // 补空行保持高度一致
        const emptyRowsCount = this.offlinePageSize - pageData.length;
        for (let i = 0; i < emptyRowsCount; i++) {
            html += `<tr class="empty-row"><td colspan="5" style="border:none;">&nbsp;</td></tr>`;
        }

        const tbody = document.getElementById('offline-table-body');
        if (tbody) tbody.innerHTML = html;

        const info = document.getElementById('offline-pager-info');
        if (info) info.innerText = `共 ${total} 台离线雷达 | 当前第 ${this.offlineCurrentPage} / ${totalPages} 页`;

        // 翻页控件 (保持不变)
        const ctrl = document.getElementById('offline-pager-ctrl');
        if (ctrl) {
            ctrl.innerHTML = ` <button class="pager-btn ${this.offlineCurrentPage === 1 ? 'disabled' : ''}" onclick="if(dashModule.offlineCurrentPage > 1) dashModule.changeOfflinePage(dashModule.offlineCurrentPage - 1)"> 上一页 </button> <button class="pager-btn ${this.offlineCurrentPage === totalPages ? 'disabled' : ''}" onclick="if(dashModule.offlineCurrentPage < totalPages) dashModule.changeOfflinePage(dashModule.offlineCurrentPage + 1)"> 下一页 </button> `;
        }
    },
    changeOfflinePage(p) {
        this.offlineCurrentPage = p;
        this.renderOfflineTable();
    },
    closeOfflineModal() {
        document.getElementById('offline-modal').style.display = 'none';
        appLogic.resetGnssFilter();
    }
};


/* =========================================================
   6.5 [右键结束版] 自定义圈定绘制模块 (customSelectModule)
   ========================================================= */
const customSelectModule = {
    isDrawing: false,
    mode: 'surface',
    surfacePoints: [],
    mixedShapes: [],
    dragStart: null,
    cursorPos: null,
    isDragging: false,

    start(chartMode) {
        this.isDrawing = true;
        this.mode = chartMode || 'surface';

        // ★★★ 核心修复：自动检查并创建专用画布 (防止HTML里漏加导致画不出线) ★★★
        let svg = document.getElementById('custom-draw-svg');
        if (!svg) {
            const container = document.getElementById('map-canvas');
            if (container) {
                // 如果找不到，就现场创建一个
                svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.id = "custom-draw-svg";
                // 强制加上样式，确保位置正确且不挡鼠标
                svg.style.position = 'absolute';
                svg.style.top = '0';
                svg.style.left = '0';
                svg.style.width = '100%';
                svg.style.height = '100%';
                svg.style.pointerEvents = 'none'; // 关键：让鼠标穿透，点击事件由父级处理
                svg.style.zIndex = '60';          // 确保在最上层
                container.appendChild(svg);
                console.log("已自动创建 custom-draw-svg 画布");
            }
        }
        // ★★★ 修复结束 ★★★

        this.surfacePoints = [];
        this.mixedShapes = [];
        this.dragStart = null;
        this.cursorPos = null;
        this.isDragging = false;

        document.getElementById('map-viewer').style.cursor = 'crosshair';
        this.clearSvg();

        if (this.mode === 'surface') {
            alert("【面模式】\n● 左键点击：添加节点\n● 鼠标右键：闭合区域并保存");
        } else {
            alert("【点模式-自由混合】\n● 左键点击：选点\n● 左键拖拽：画线\n● 鼠标右键：结束绘制并保存");
        }
    },

    stop() {
        this.isDrawing = false;
        document.getElementById('map-viewer').style.cursor = 'grab';
        this.dragStart = null;
    },

    getPos(e) {
        const r = document.getElementById('map-canvas').getBoundingClientRect();
        return {
            x: (e.clientX - r.left) / mapModule.scale,
            y: (e.clientY - r.top) / mapModule.scale
        };
    },

    handleMouseDown(e) {
        if (!this.isDrawing) return;
        const pos = this.getPos(e);

        if (this.mode === 'surface') {
            this.surfacePoints.push(pos);
            this.render();
        } else {
            this.dragStart = pos;
            this.isDragging = true;
        }
    },

    handleMouseMove(e) {
        if (!this.isDrawing) return;
        this.cursorPos = this.getPos(e);
        this.render();
    },

    handleMouseUp(e) {
        if (!this.isDrawing || this.mode === 'surface') return;
        if (!this.dragStart) return;

        const endPos = this.getPos(e);
        const dx = endPos.x - this.dragStart.x;
        const dy = endPos.y - this.dragStart.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
            this.mixedShapes.push({type: 'point', x: this.dragStart.x, y: this.dragStart.y});
        } else {
            this.mixedShapes.push({
                type: 'line',
                x1: this.dragStart.x, y1: this.dragStart.y,
                x2: endPos.x, y2: endPos.y
            });
        }

        this.isDragging = false;
        this.dragStart = null;
        this.render();
    },

    // 【核心修改】统一的结束方法，由右键触发
    finish() {
        if (!this.isDrawing) return;

        // 1. 校验数据
        const hasSurface = this.mode === 'surface' && this.surfacePoints.length >= 3;
        const hasShapes = this.mode !== 'surface' && this.mixedShapes.length > 0;

        // 2. 如果数据不足，直接取消
        if (!hasSurface && !hasShapes) {
            const typeName = this.mode === 'surface' ? '区域' : '监测点';
            // 可以在这里选择是否提示用户
            // alert(`未绘制有效的${typeName}，操作取消。`);
            this.isDrawing = false;
            document.getElementById('map-viewer').style.cursor = 'grab';
            this.clearSvg();
            dashModule.toggleCustomSelect();
            return;
        }

        // 3. 正常保存逻辑
        this.isDrawing = false;
        document.getElementById('map-viewer').style.cursor = 'grab';
        this.dragStart = null;
        this.cursorPos = null;

        // 最终渲染（面模式闭合，清除辅助线）
        this.render(true);
        this.showModal();
        dashModule.updateBottomChartTarget('CUSTOM_AREA_DATA');
    },

    render(isFinal = false) {
        const svg = document.getElementById('custom-draw-svg');
        svg.innerHTML = '';

        if (this.mode === 'surface') {
            if (this.surfacePoints.length > 0) {
                let d = `M ${this.surfacePoints[0].x} ${this.surfacePoints[0].y}`;
                for (let i = 1; i < this.surfacePoints.length; i++) {
                    d += ` L ${this.surfacePoints[i].x} ${this.surfacePoints[i].y}`;
                }

                // 绘制中：连接鼠标当前位置
                if (!isFinal && this.cursorPos) {
                    d += ` L ${this.cursorPos.x} ${this.cursorPos.y}`;
                }
                // 结束：闭合
                if (isFinal) {
                    d += ' Z';
                }

                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", d);
                path.setAttribute("fill", "rgba(152, 251, 152, 0.4)");
                path.setAttribute("stroke", "#333");
                path.setAttribute("stroke-width", "1.5");
                path.setAttribute("stroke-dasharray", "5,5");
                svg.appendChild(path);

                this.surfacePoints.forEach(p => this.drawDot(svg, p.x, p.y, "#333"));
            }

            if (!isFinal && this.cursorPos) {
                this.drawFullCrosshair(svg, this.cursorPos.x, this.cursorPos.y);
            }
        } else {
            this.mixedShapes.forEach(shape => {
                if (shape.type === 'point') {
                    this.drawTargetIcon(svg, shape.x, shape.y);
                } else if (shape.type === 'line') {
                    this.drawLine(svg, shape.x1, shape.y1, shape.x2, shape.y2, false);
                }
            });

            if (this.isDragging && this.dragStart && this.cursorPos) {
                this.drawLine(svg, this.dragStart.x, this.dragStart.y, this.cursorPos.x, this.cursorPos.y, true);
            }
        }
    },

    // [修改] 增强版十字辅助线：高亮白、加粗
    drawFullCrosshair(svg, x, y) {
        const size = 5000; // 足够长，贯穿屏幕

        // --- 样式配置 ---
        const strokeColor = "#ffffff"; // 改为纯白，对比度最高
        const strokeWidth = "2";       // 加粗到 2px (原来是1)
        const dashArray = "8, 4";      // 虚线变长 (8实4空)，看起来更连贯

        // 1. 垂直线
        const vLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        vLine.setAttribute("x1", x);
        vLine.setAttribute("y1", y - size);
        vLine.setAttribute("x2", x);
        vLine.setAttribute("y2", y + size);
        vLine.setAttribute("stroke", strokeColor);
        vLine.setAttribute("stroke-width", strokeWidth);
        vLine.setAttribute("stroke-dasharray", dashArray);
        // 加一点阴影让它更明显
        vLine.style.filter = "drop-shadow(0 0 2px rgba(0,0,0,0.8))";

        // 2. 水平线
        const hLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        hLine.setAttribute("x1", x - size);
        hLine.setAttribute("y1", y);
        hLine.setAttribute("x2", x + size);
        hLine.setAttribute("y2", y);
        hLine.setAttribute("stroke", strokeColor);
        hLine.setAttribute("stroke-width", strokeWidth);
        hLine.setAttribute("stroke-dasharray", dashArray);
        hLine.style.filter = "drop-shadow(0 0 2px rgba(0,0,0,0.8))";

        svg.appendChild(vLine);
        svg.appendChild(hLine);
    },
    drawDot(svg, x, y, color) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", 4 / mapModule.scale);
        circle.setAttribute("fill", "#fff");
        circle.setAttribute("stroke", color);
        svg.appendChild(circle);
    },

    drawLine(svg, x1, y1, x2, y2, isPreview) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", "#E6A23C");
        line.setAttribute("stroke-width", "3");
        if (isPreview) {
            line.setAttribute("stroke-dasharray", "5,5");
        }
        svg.appendChild(line);
        this.drawDot(svg, x1, y1, "#E6A23C");
        this.drawDot(svg, x2, y2, "#E6A23C");
    },

    drawTargetIcon(svg, x, y) {
        const r = 10 / mapModule.scale;
        const outer = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        outer.setAttribute("cx", x);
        outer.setAttribute("cy", y);
        outer.setAttribute("r", r);
        outer.setAttribute("fill", "rgba(230, 162, 60, 0.3)");
        outer.setAttribute("stroke", "#E6A23C");
        svg.appendChild(outer);
        const inner = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        inner.setAttribute("cx", x);
        inner.setAttribute("cy", y);
        inner.setAttribute("r", 4 / mapModule.scale);
        inner.setAttribute("fill", "#E6A23C");
        svg.appendChild(inner);
    },

    // [修改] 只清空专用层，不伤及背景地图
    clearSvg() {
        const svg = document.getElementById('custom-draw-svg'); // 改这里
        if(svg) svg.innerHTML = '';
    },

    showModal() {
        const title = document.querySelector('#selection-modal h3');
        const desc = document.querySelector('#selection-modal p');
        if (title) {
            if (this.mode === 'surface') {
                title.innerText = "面区域圈定完成";
                desc.innerText = `已锁定 ${this.surfacePoints.length} 个节点的区域。`;
            } else {
                title.innerText = "混合选点/线完成";
                const pCount = this.mixedShapes.filter(s => s.type === 'point').length;
                const lCount = this.mixedShapes.filter(s => s.type === 'line').length;
                desc.innerText = `已选中 ${pCount} 个点，绘制 ${lCount} 条线。`;
            }
        }
        document.getElementById('selection-modal').style.display = 'flex';
    },

    clearAndClose() {
        document.getElementById('selection-modal').style.display = 'none';
        this.clearSvg();
        this.surfacePoints = [];
        this.mixedShapes = [];
        dashModule.toggleCustomSelect();
    },
    exportData() {
        const btn = document.querySelector('.btn-export');
        const oldText = btn.innerText;
        btn.innerText = '⏳ 导出中...';
        setTimeout(() => {
            alert("✅ 数据导出完毕！");
            btn.innerText = oldText;
            this.clearAndClose();
        }, 800);
    }
};
/* =========================================================
   7. 业务逻辑与重置 (appLogic)
   ========================================================= */
const appLogic = {
    switchType(type, btn) {
        if (btn) {
            document.querySelectorAll('.side-nav-item').forEach(n => n.classList.remove('active'));
            btn.classList.add('active');
        }
        if (type !== 'ALL') mapModule.focus(type);
    },
    resetGnssFilter() {
        mapModule.isDetailMode = false;
        mapFilterModule.applyMapFilter();
        document.querySelectorAll('.virtual-point').forEach(p => {
            p.style.opacity = '1';
            p.classList.remove('point-focus-center');
        });
        document.getElementById('reset-gnss-btn').style.display = 'none';
        dashModule.currentPage = 1;
        dashModule.renderWarningTable();
        const allData = dashModule.getSortedGnssData();
        if (allData.length > 0) dashModule.initSpeedChart(allData[0].id);
    }
};
/* =========================================================
   8. 深度分析模块 (analysisModule) - 修复筛选全选与表格区域
   ========================================================= */
/* =========================================================
   8. 深度分析模块 (analysisModule) - 最终修复版
   ========================================================= */
const analysisModule = {
    // --- 1. 基础配置 ---
    charts: { curve: null, vector: null },
    dataCache: {}, // 数据缓存池
    selectedMetricsMap: {},
    selectedDevices: [],
    allMetrics: ['累积形变(mm)', '变形速度(mm/h)', '加速度(mm/h²)'],

    trajFreqOptions: ['按小时', '按天显示', '按周显示'],
    tableFreqOptions: ['按小时', '按天显示', '按周显示', '按月显示'],

    currentTrajFreq: '按天显示',
    currentTableFreq: '按天显示',
    selectedGlobalMetrics: [],

    deviceColors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'],
    lineStyles: ['solid', 'dashed', 'dotted', 'dashDot'],

    // --- 2. 筛选状态 ---
    anSelectedRegions: [],
    anSelectedRadars: [],
    anSelectedVirtRegions: [],
    anSelectedVirtLines: [],
    anSelectedPoints: [],

    // --- 3. 核心算法：生成物理规律数据 ---
    generateDataCache() {
        this.dataCache = {}; // 清空旧数据

        this.selectedDevices.forEach(devId => {
            const seed = devId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

            // 1. 生成速度 (模拟波动)
            let speedData = [];
            let currentSpeed = 2.0 + (seed % 50) / 10;

            for(let i = 0; i < 25; i++) {
                const noise = (Math.sin(i * 0.5 + seed) * 0.5) + (Math.random() - 0.5) * 0.3;
                currentSpeed += noise;
                let val = Math.max(0, currentSpeed);
                speedData.push(parseFloat(val.toFixed(2)));
            }

            // 2. 生成累积形变 (速度积分)
            let accData = [];
            let currentAcc = (seed % 100) + 1200;
            speedData.forEach(s => {
                currentAcc += s;
                accData.push(parseFloat(currentAcc.toFixed(1)));
            });

            // 3. 生成加速度 (速度微分)
            let accelData = [];
            for(let i = 0; i < 25; i++) {
                if(i === 0) accelData.push(0);
                else {
                    const diff = speedData[i] - speedData[i-1];
                    accelData.push(parseFloat(diff.toFixed(3)));
                }
            }

            this.dataCache[devId] = {
                '累积形变(mm)': accData,
                '变形速度(mm/h)': speedData,
                '加速度(mm/h²)': accelData
            };
        });
    },

    getLogicData(devId, timestamp, metricIdx) {
        // 此函数主要用于旧逻辑兼容，新图表主要读取 dataCache
        // 但如果需要按时间点查询，可保留简单逻辑
        return 0;
    },

    // --- 4. 弹窗控制 ---
    open(targetMeta) {
        const modal = document.getElementById('analysis-modal');
        if(!modal) return;
        modal.style.display = 'flex';

        // 时间设置
        const now = new Date();
        const past = new Date(now.getTime() - 24 * 3600000);
        const formatLocalISO = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        const startEl = document.getElementById('an-start');
        const endEl = document.getElementById('an-end');
        if(startEl) startEl.value = formatLocalISO(past);
        if(endEl) endEl.value = formatLocalISO(now);

        this.selectedGlobalMetrics = ['变形速度(mm/h)'];
        this.resetFilters();

        // 智能回填筛选
        if (targetMeta) {
            if (targetMeta.region) this.anSelectedRegions = [targetMeta.region];
            if (targetMeta.deviceId) {
                // 简单回填逻辑：尝试匹配雷达名
                const radarName = mapModule.radarList.find(r => targetMeta.deviceId.includes(r.name))?.name;
                if(radarName) this.anSelectedRadars = [radarName];
            }
        } else {
            this.anSelectedRegions = ['北帮'];
        }

        this.initFilters();
        this.renderFreqOptions('traj-freq-dropdown', this.trajFreqOptions, this.currentTrajFreq, 'traj');
        this.renderFreqOptions('an-table-freq-dropdown', this.tableFreqOptions, this.currentTableFreq, 'table');
        this.renderMetricSelector();
        this.updateMetricButtonLabel();

        setTimeout(() => {
            this.refreshDeviceList();
            this.resizeCharts();
        }, 100);
    },

    close() {
        document.getElementById('analysis-modal').style.display = 'none';
        if(this.charts.curve) { this.charts.curve.dispose(); this.charts.curve = null; }
        if(this.charts.vector) { this.charts.vector.dispose(); this.charts.vector = null; }
    },

    resetFilters() {
        this.anSelectedRegions = [];
        this.anSelectedRadars = [];
        this.anSelectedVirtRegions = [];
        this.anSelectedVirtLines = [];
        this.anSelectedPoints = [];
        this.selectedDevices = [];
    },

    resizeCharts() {
        if (this.charts.curve) this.charts.curve.resize();
        if (this.charts.vector) this.charts.vector.resize();
    },

    // --- 5. 筛选渲染逻辑 ---
    initFilters() {
        this.renderRegionOptions();
        this.renderRadarOptions();
        this.renderVirtualLocationOptions();
        this.renderPointOptions();
        this.updateAllLabels();
    },

    toggleFilterDropdown(id, e) {
        e.stopPropagation();
        const el = document.getElementById(id);
        if(!el) return;
        const isShow = el.style.display === 'block';
        document.querySelectorAll('.custom-dropdown-content').forEach(d => d.style.display = 'none');
        el.style.display = isShow ? 'none' : 'block';
    },

    // 区域选择
    renderRegionOptions() {
        const regions = ['全部', '北帮', '南帮', '东帮', '西帮'];
        const allItems = ['北帮', '南帮', '东帮', '西帮'];
        this.renderCheckboxList('an-region-dropdown', regions, this.anSelectedRegions, (cb) => {
            this.anSelectedRegions = this.updateSelectionLogic(cb.value, cb.checked, this.anSelectedRegions, allItems);
            this.cascadeRefresh();
        });
    },

    // 雷达选择
    renderRadarOptions() {
        let list = mapModule.radarList || [];
        if (this.anSelectedRegions.length > 0 && !this.anSelectedRegions.includes('全部')) {
            list = list.filter(r => this.anSelectedRegions.includes(r.region));
        }
        const names = list.map(r => r.name);

        const container = document.getElementById('an-radar-dropdown');
        if(names.length === 0) {
            if(container) container.innerHTML = '<div style="padding:10px;color:#999">无设备</div>';
            return;
        }

        this.renderCheckboxList('an-radar-dropdown', ['全部', ...names], this.anSelectedRadars, (cb) => {
            this.anSelectedRadars = this.updateSelectionLogic(cb.value, cb.checked, this.anSelectedRadars, names);
            this.cascadeRefresh();
        });
    },

    // 级联刷新
    cascadeRefresh() {
        this.updateAllLabels();
        this.renderRegionOptions();
        this.renderRadarOptions();
        this.renderVirtualLocationOptions();
        this.renderPointOptions();
        this.refreshDeviceList();
    },

    // 虚拟位置
    renderVirtualLocationOptions() {
        const container = document.getElementById('an-virt-list-container');
        if (!container) return;
        const regions = ['区域1', '区域2', '区域3'];
        const lines = ['监测线1', '监测线2', '监测线3'];

        let html = `<div class="dropdown-group-title">虚拟区域</div>`;
        html += `<div class="custom-dropdown-item"><input type="checkbox" value="全部区域" ${this.anSelectedVirtRegions.includes('全部')?'checked':''} onchange="analysisModule.handleVirtLocChange(this, 'region')"><b>全部</b></div>`;
        regions.forEach(r => {
            html += `<div class="custom-dropdown-item"><input type="checkbox" value="${r}" ${this.anSelectedVirtRegions.includes(r)?'checked':''} onchange="analysisModule.handleVirtLocChange(this, 'region')"><span>${r}</span></div>`;
        });

        html += `<div class="dropdown-group-title" style="margin-top:5px;">监测线</div>`;
        html += `<div class="custom-dropdown-item"><input type="checkbox" value="全部监测线" ${this.anSelectedVirtLines.includes('全部')?'checked':''} onchange="analysisModule.handleVirtLocChange(this, 'line')"><b>全部</b></div>`;
        lines.forEach(l => {
            html += `<div class="custom-dropdown-item"><input type="checkbox" value="${l}" ${this.anSelectedVirtLines.includes(l)?'checked':''} onchange="analysisModule.handleVirtLocChange(this, 'line')"><span>${l}</span></div>`;
        });
        container.innerHTML = html;
        this.updateAllLabels();
    },

    handleVirtLocChange(cb, type) {
        const val = cb.value;
        const checked = cb.checked;
        const allItems = type==='region' ? ['区域1','区域2','区域3'] : ['监测线1','监测线2','监测线3'];
        const allToken = type==='region' ? '全部区域' : '全部监测线';

        let list = type==='region' ? this.anSelectedVirtRegions : this.anSelectedVirtLines;

        if(val === allToken) {
            list = checked ? ['全部', ...allItems] : [];
        } else {
            list = list.filter(i => i !== '全部');
            if(checked) { if(!list.includes(val)) list.push(val); }
            else { list = list.filter(i => i !== val); }
            if(allItems.every(i => list.includes(i))) list = ['全部', ...allItems];
        }

        if(type==='region') this.anSelectedVirtRegions = list; else this.anSelectedVirtLines = list;
        this.cascadeRefresh();
    },

    // 测点选择
    renderPointOptions() {
        const container = document.getElementById('an-point-list-container');
        if(!container) return;

        // 简单逻辑：演示固定点 + 真实点
        const points = ['点01', '点02', '点03', '点04', '点05'];
        const isAll = points.every(p => this.anSelectedPoints.includes(p));

        let html = `<div class="custom-dropdown-item" style="border-bottom:1px solid #eee; font-weight:bold;">
            <input type="checkbox" value="全部" ${isAll?'checked':''} onchange="analysisModule.handlePointChange(this)"><span>全部测点</span></div>`;

        points.forEach(p => {
            html += `<div class="custom-dropdown-item"><input type="checkbox" value="${p}" ${this.anSelectedPoints.includes(p)?'checked':''} onchange="analysisModule.handlePointChange(this)"><span>${p}</span></div>`;
        });
        container.innerHTML = html;
    },

    handlePointChange(cb) {
        // 定义点位列表 (需与 renderPointOptions 中的保持一致)
        const points = ['点01', '点02', '点03', '点04', '点05'];

        // 1. 更新选中状态数据 (核心逻辑)
        this.anSelectedPoints = this.updateSelectionLogic(cb.value, cb.checked, this.anSelectedPoints, points, '全部');

        // 2. 【关键修复】重新渲染下拉菜单
        // 只有重新渲染，界面上的"点01"、"点02"等复选框才会根据新的数据打上勾
        this.renderPointOptions();

        // 3. 【关键修复】更新按钮上的文字显示
        // 让按钮显示 "已选(5)" 或 "已选全部"
        this.updateLabel('an-point-label', this.anSelectedPoints, '选择点位');

        // 4. 刷新设备列表和图表数据
        this.refreshDeviceList();
    },

    // --- 6. 数据刷新 (★关键修复★) ---
    refreshDeviceList() {
        const newIds = [];

        // 1. 尝试找真实点
        const activeRegions = this.anSelectedRegions.filter(x => x !== '全部');
        const activeRadars = this.anSelectedRadars.filter(x => x !== '全部');

        Object.values(mapModule.virtualPoints).forEach(vp => {
            if (activeRegions.length > 0 && !activeRegions.includes(vp.region)) return;
            if (activeRadars.length > 0 && !activeRadars.includes(vp.radarName)) return;
            newIds.push(vp.id);
        });

        // 2. 兜底演示数据
        if (newIds.length === 0) {
            const regionPrefix = activeRegions.length > 0 ? activeRegions[0] : '演示区';
            for(let i=1; i<=5; i++) {
                newIds.push(`${regionPrefix}-演示雷达-点${i}`);
            }
        }

        this.selectedDevices = newIds.slice(0, 10);

        // 初始化指标
        this.selectedDevices.forEach(d => {
            if (!this.selectedMetricsMap[d]) {
                this.selectedMetricsMap[d] = ['变形速度(mm/h)'];
            }
        });

        this.query(); // 触发查询
    },

    query() {
        if (this.selectedDevices.length === 0) {
            const el = document.getElementById('curve-chart-main');
            if(el) {
                const chart = echarts.getInstanceByDom(el);
                if(chart) chart.clear();
            }
            return;
        }

        // ★★★ 关键修复：必须调用生成数据，否则图表就是空的 ★★★
        this.generateDataCache();

        this.renderCurveChart();
        this.renderVectorChart();
        this.renderTable();
    },

    // 渲染曲线图
    // 渲染曲线图 (已添加时间轴缩放条)
    renderCurveChart() {
        const el = document.getElementById('curve-chart-main');
        if (!el) return;

        let chart = echarts.getInstanceByDom(el);
        if (!chart) chart = echarts.init(el);

        const timeLabels = Array.from({ length: 25 }, (_, i) => `${i}:00`);
        const series = [];

        this.selectedDevices.forEach((devId, i) => {
            const metrics = this.selectedMetricsMap[devId] || this.selectedGlobalMetrics;
            metrics.forEach(metric => {
                const data = this.dataCache[devId] ? this.dataCache[devId][metric] : [];
                if (!data || data.length === 0) return;

                let lineStyle = { width: 2 };
                let areaStyle = null;
                let smooth = true;

                if (metric.includes('累积')) {
                    areaStyle = { opacity: 0.1, color: this.deviceColors[i % this.deviceColors.length] };
                } else if (metric.includes('加速度')) {
                    lineStyle.type = 'dashed';
                    smooth = false;
                }

                series.push({
                    name: `${devId}-${metric}`,
                    type: 'line',
                    smooth: smooth,
                    showSymbol: false,
                    data: data,
                    lineStyle: lineStyle,
                    areaStyle: areaStyle,
                    itemStyle: { color: this.deviceColors[i % this.deviceColors.length] },
                    animationDuration: 1000,
                    animationEasing: 'cubicOut'
                });
            });
        });

        chart.setOption({
            tooltip: { trigger: 'axis' },
            legend: { type: 'scroll', top: 0 },
            // 1. 修改：grid bottom 调大，给 dataZoom 留位置
            grid: { top: 40, left: 50, right: 40, bottom: 70 },
            xAxis: { type: 'category', data: timeLabels, boundaryGap: false },
            yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { type: 'dashed', color: '#eee' } } },

            // 2. 新增：dataZoom 组件 (时间缩放条)
            dataZoom: [
                {
                    type: 'slider',      // 显示滑动条
                    show: true,
                    xAxisIndex: [0],     // 控制 X 轴
                    start: 0,            // 默认开始位置 (0%)
                    end: 100,            // 默认结束位置 (100%)
                    height: 20,          // 高度
                    bottom: 15,          // 距离底部距离

                    // --- 样式美化 (仿你的截图风格) ---
                    borderColor: 'transparent',
                    backgroundColor: '#f4f7fb',    // 轨道背景色 (浅灰蓝)
                    fillerColor: 'rgba(133, 198, 241, 0.3)', // 选中区域颜色 (半透明蓝)
                    handleIcon: 'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
                    handleSize: '100%',
                    handleStyle: {
                        color: '#1c3d90',  // 手柄颜色 (深蓝)
                        shadowBlur: 3,
                        shadowColor: 'rgba(0, 0, 0, 0.2)',
                        shadowOffsetX: 2,
                        shadowOffsetY: 2
                    },
                    textStyle: { color: '#666' },
                    dataBackground: { // 数据阴影样式
                        lineStyle: { opacity: 0.5, color: '#85C6F1' },
                        areaStyle: { opacity: 0.2, color: '#85C6F1' }
                    }
                },
                {
                    type: 'inside',      // 支持鼠标滚轮缩放
                    xAxisIndex: [0],
                    start: 0,
                    end: 100
                }
            ],

            series: series
        }, { notMerge: true });

        this.charts.curve = chart;
    },

    // 渲染矢量图
    // 渲染矢量图 (已添加底部可点击图例)
    renderVectorChart() {
        const el = document.getElementById('vector-chart-main');
        if(!el) return;
        let chart = echarts.getInstanceByDom(el);
        if (chart) chart.dispose();
        chart = echarts.init(el);
        this.charts.vector = chart;

        // 生成模拟数据
        const series = this.selectedDevices.slice(0,5).map((d, i) => ({
            name: d,
            type: 'line',
            smooth: true,
            symbol: 'circle', // 节点形状
            symbolSize: 6,
            data: [[0,0], [Math.random()*5, Math.random()*5], [Math.random()*8, Math.random()*2]],
            itemStyle: {color: this.deviceColors[i % this.deviceColors.length]}
        }));

        chart.setOption({
            tooltip: { trigger: 'item' }, // 鼠标悬浮提示

            // 1. 关键修改：调整 grid 底部距离，给图例留出空间
            grid: { top: 40, right: 40, bottom: 40, left: 40 },

            // 2. 关键修改：添加底部图例 (Legend)
            legend: {
                show: true,
                bottom: 0,        // 固定在底部
                type: 'scroll',   // 如果点太多，支持左右滚动
                itemWidth: 12,    // 图标宽度
                itemHeight: 12,   // 图标高度
                textStyle: { color: '#333' },
                data: this.selectedDevices.slice(0,5) // 指定显示哪些名字
            },

            xAxis: {
                name: 'X位移',
                nameLocation: 'end',
                nameGap: 10,
                splitLine: { lineStyle: { type: 'dashed', color: '#eee' } }
            },
            yAxis: {
                name: 'Y位移',
                nameLocation: 'end',
                nameGap: 10,
                splitLine: { lineStyle: { type: 'dashed', color: '#eee' } }
            },
            series: series
        });
    },

    // 渲染表格 (区域联动版)
    // 渲染表格 (修复：响应频率切换，让数据动起来)
    renderTable() {
        const head = document.getElementById('full-table-head');
        const body = document.getElementById('full-table-body');
        if (!head || !body) return;

        // 1. 根据当前频率选择，决定时间格式和数据“偏移量”
        // 偏移量(sampleOffset)的作用是：当切换频率时，读取数据数组中不同位置的值，
        // 这样数值就会变，看起来像是切换了不同的统计维度。
        let timeFormat = 'full';
        let sampleOffset = 0;

        switch (this.currentTableFreq) {
            case '按小时':
                timeFormat = 'full'; // 显示：2026/01/25 14:00
                sampleOffset = 0;    // 取最新的数据
                break;
            case '按天显示':
                timeFormat = 'date'; // 显示：2026-01-25
                sampleOffset = 3;    // 取稍微旧一点的数据(模拟日均值)
                break;
            case '按周显示':
                timeFormat = 'week'; // 显示：2026年第4周
                sampleOffset = 8;    // 取更旧的数据(模拟周均值)
                break;
            case '按月显示':
                timeFormat = 'month';// 显示：2026-01
                sampleOffset = 15;   // 模拟月度数据
                break;
            default:
                timeFormat = 'date';
                sampleOffset = 0;
        }

        // 2. 渲染表头
        head.innerHTML = `<tr>
            <th width="60">序号</th>
            <th>区域</th>
            <th>编号</th>
            <th>时间维度</th>
            <th>累积形变(mm)</th>
            <th>变形速度(mm/h)</th>
            <th>加速度(mm/h²)</th>
        </tr>`;

        let rows = "";
        const now = new Date();

        this.selectedDevices.forEach((devId, idx) => {
            // 3. 确定区域名称
            let regionName = '未知区域';
            const vp = Object.values(mapModule.virtualPoints).find(p => p.id === devId);
            if (vp) regionName = vp.region;
            else {
                const activeRegions = this.anSelectedRegions.filter(r => r !== '全部');
                regionName = activeRegions.length > 0 ? activeRegions[0] : ['北帮', '南帮', '东帮', '西帮'][idx % 4];
            }

            // 4. 生成对应的时间字符串
            let timeStr = "";
            if (timeFormat === 'full') {
                timeStr = now.toLocaleString('zh-CN', { hour12: false }).slice(0, 16).replace(/-/g, '/');
            } else if (timeFormat === 'date') {
                timeStr = now.toISOString().split('T')[0];
            } else if (timeFormat === 'week') {
                timeStr = `${now.getFullYear()}年 第4周`;
            } else if (timeFormat === 'month') {
                timeStr = `${now.getFullYear()}-01`;
            }

            // 5. 获取并处理数据 (关键：应用 sampleOffset)
            const cache = this.dataCache[devId];
            let acc = 0, spd = 0, acl = 0;

            if (cache) {
                const len = cache['变形速度(mm/h)'].length;
                // 确保索引不越界 (用 length - 1 - offset)
                let safeIdx = len - 1 - sampleOffset;
                if (safeIdx < 0) safeIdx = 0;

                acc = cache['累积形变(mm)'][safeIdx];
                spd = cache['变形速度(mm/h)'][safeIdx];
                acl = cache['加速度(mm/h²)'][safeIdx];
            } else {
                // 兜底随机数
                acc = (Math.random() * 100).toFixed(1);
                spd = (Math.random() * 5).toFixed(2);
                acl = 0.01;
            }

            // 6. 拼接行HTML
            rows += `<tr>
                <td>${idx + 1}</td>
                <td style="font-weight:bold; color:#555;">${regionName}</td>
                <td style="color:#1c3d90; font-weight:bold;">${devId}</td>
                <td>${timeStr}</td>
                <td style="font-family:consolas;">${acc}</td>
                <td style="font-weight:bold; color:#333;">${spd}</td>
                <td style="color:#666;">${acl}</td>
            </tr>`;
        });

        body.innerHTML = rows;
    },



    // --- 辅助函数 ---
    updateAllLabels() {
        this.updateLabel('an-region-label', this.anSelectedRegions, '选择区域');
        this.updateLabel('an-radar-label', this.anSelectedRadars, '选择设备');
        this.updateVirtLabel();
        this.updateLabel('an-point-label', this.anSelectedPoints, '选择点位');
    },
    updateLabel(id, list, def) {
        const el = document.getElementById(id);
        if(!el) return;
        const real = list.filter(x => x!=='全部');
        el.innerText = real.length === 0 ? def : (list.includes('全部')?'已选全部':`已选(${real.length})`);
    },
    updateVirtLabel() {
        const count = this.anSelectedVirtRegions.filter(x=>x!=='全部').length + this.anSelectedVirtLines.filter(x=>x!=='全部').length;
        const btn = document.getElementById('an-virt-label');
        if(btn) btn.innerText = count===0 ? '选择/搜索虚拟位置' : `已选(${count})`;
    },
    renderCheckboxList(id, list, sel, cb) {
        const c = document.getElementById(id);
        if(!c) return;
        c.innerHTML = list.map(v => `<div class="custom-dropdown-item"><input type="checkbox" value="${v}" ${sel.includes(v)?'checked':''} onchange="/*JS*/"><span>${v}</span></div>`).join('');
        c.querySelectorAll('input').forEach(i => i.onchange = () => cb(i));
    },
    updateSelectionLogic(val, chk, list, all, allToken='全部') {
        if(val === allToken) return chk ? [allToken, ...all] : [];
        let n = list.filter(x => x !== allToken);
        if(chk) { if(!n.includes(val)) n.push(val); } else { n = n.filter(x => x !== val); }
        if(all.every(i => n.includes(i))) n = [allToken, ...all];
        return n;
    },
    filterVirtOptions(key) { this.filterOptionsGeneric('an-virt-list-container', key); },
    filterPointOptions(key) { this.filterOptionsGeneric('an-point-list-container', key); },
    filterOptionsGeneric(id, key) {
        document.querySelectorAll(`#${id} .custom-dropdown-item`).forEach(item => {
            const text = item.innerText;
            item.style.display = (text.includes(key) || !key || item.querySelector('b')) ? 'flex' : 'none';
        });
    },
    renderFreqOptions(id, opts, cur, type) {
        const c = document.getElementById(id);
        if(!c) return;
        c.innerHTML = opts.map(o => `<div class="custom-dropdown-item"><input type="checkbox" value="${o}" ${cur===o?'checked':''} onchange="analysisModule.handleFreqChange('${id}','${type}','${o}',this)"><span>${o}</span></div>`).join('');
        const l = document.getElementById(id.replace('dropdown','label'));
        if(l) l.innerText = cur;
    },
    handleFreqChange(id, type, val, cb) {
        if(!cb.checked) return;
        if(type==='traj') this.currentTrajFreq = val; else this.currentTableFreq = val;
        this.renderFreqOptions(id, type==='traj'?this.trajFreqOptions:this.tableFreqOptions, val, type);
        if(type==='table') this.renderTable(); else this.query();
    },
    renderMetricSelector() {
        const c = document.getElementById('metric-items-container');
        if(!c) return;
        const allSel = this.allMetrics.every(m => this.selectedGlobalMetrics.includes(m));
        let h = `<div class="custom-dropdown-item" style="border-bottom:1px solid #eee;font-weight:bold;"><input type="checkbox" value="全部" ${allSel?'checked':''} onchange="analysisModule.handleMetricToggle(this)"><span>全部</span></div>`;
        h += this.allMetrics.map(m => `<div class="custom-dropdown-item"><input type="checkbox" value="${m}" ${this.selectedGlobalMetrics.includes(m)?'checked':''} onchange="analysisModule.handleMetricToggle(this)"><span>${m}</span></div>`).join('');
        c.innerHTML = h;
    },
    handleMetricToggle(cb) {
        if(cb.value==='全部') this.selectedGlobalMetrics = cb.checked ? [...this.allMetrics] : [];
        else {
            if(cb.checked) { if(!this.selectedGlobalMetrics.includes(cb.value)) this.selectedGlobalMetrics.push(cb.value); }
            else this.selectedGlobalMetrics = this.selectedGlobalMetrics.filter(m=>m!==cb.value);
        }
        this.selectedDevices.forEach(d => this.selectedMetricsMap[d] = [...this.selectedGlobalMetrics]);
        this.renderMetricSelector();
        this.updateMetricButtonLabel();
        this.query();
    },
    updateMetricButtonLabel() {
        const l = document.getElementById('metric-btn-label');
        if (!l) return;

        const s = this.selectedGlobalMetrics;

        // 1. 设置文本内容
        l.innerText = s.length === 0 ? "请选择..." : (s.length > 2 ? `${s[0]}等${s.length}项` : s.join(', '));

        // 2. 【核心修复】如果有选中项，移除灰色样式类，强制设为黑色
        if (s.length > 0) {
            l.classList.remove('placeholder-text');
            l.style.color = '#333'; // 强制设为深黑色
            l.style.fontWeight = 'bold'; // (可选) 加粗一点更清晰
        } else {
            l.classList.add('placeholder-text');
            l.style.color = ''; // 恢复默认灰色
            l.style.fontWeight = 'normal';
        }
    },

    // ... analysisModule 的其他代码 ...

    // 1. 新增：渲染导出选项的函数
    renderExportOptions() {
        const container = document.getElementById('export-metric-list');
        if (!container) return;

        // 定义基础字段 + 动态指标
        const baseFields = ['监测时间', '监测区域', '设备名称/编号'];
        // 合并基础字段和当前系统支持的所有指标
        const allFields = [...baseFields, ...this.allMetrics];

        // 生成 HTML
        container.innerHTML = allFields.map(field => `
            <div style="display:flex; align-items:center; gap:8px; font-size:13px; padding: 5px;">
                <input type="checkbox" class="ex-check" value="${field}" checked style="cursor:pointer;">
                <span style="color:#333;">${field}</span>
            </div>
        `).join('');
    },

    // 2. 修改：打开导出窗口时，先渲染列表
    openExportDialog() {
        this.renderExportOptions(); // <--- 关键：先调用渲染
        document.getElementById('export-panel').style.display = 'flex';
    },

    // 3. 修改：执行导出（简单的模拟反馈）
    doExport() {
        // 获取选中的字段
        const checked = [];
        document.querySelectorAll('.ex-check:checked').forEach(cb => checked.push(cb.value));

        if (checked.length === 0) {
            alert("请至少选择一个导出字段");
            return;
        }

        console.log("导出字段:", checked);
        alert(`正在导出包含 [${checked.length}] 个字段的报表...\n(演示功能)`);
        document.getElementById('export-panel').style.display = 'none';
    },

    // ... 原有的 toggleAllExport, exportChart, clearAll 等保持不变 ...
    toggleAllExport(st) { document.querySelectorAll('.ex-check').forEach(c => c.checked = st); },
    exportChart(type) { alert(type + ' 图表已导出'); },
    clearAll() { this.resetFilters(); this.refreshDeviceList(); }
};

/* =========================================================
   9. 初始化入口
   ========================================================= */
window.onload = () => {
    backgroundModule.init();
    headerModule.init();
    mapModule.init();
    dashModule.init();
    appLogic.switchType('GNSS');
    const defaultBtn = document.querySelector('.freq-btn');
    if (defaultBtn) mapModule.setTime(1, defaultBtn);
    mapFilterModule.init();
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const panels = document.querySelectorAll('.glass-panel');
        panels.forEach(p => {
            if (p.innerText.includes('圈定位置累积形变曲线')) {
                p.style.cursor = 'pointer';
                p.onclick = () => analysisModule.open();
            }
        });
    }, 1500);
});