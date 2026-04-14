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
    activeTypes: new Set(),
    isOpen: false,
    selectedRegions: ['全部'],
    selectedPoints: [],
    allTypes: ['GNSS', 'DEEP', 'RADAR', 'SURFACE', 'CRACK', 'FIRE', 'WATER', 'GROUND', 'STRESS', 'VIB', 'SAT'],

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
        '西帮': ['东帮'],      // 位于西边的雷达，照射目标是东帮的监测点
        '东帮': ['西帮'],      // 位于东边的雷达，照射目标是西帮的监测点
        '南帮': ['北帮'],      // 位于南边的雷达，照射目标是北帮的监测点
        '北帮': ['南帮'],      // 位于北边的雷达，照射目标是南帮的监测点
        '中央区': ['中央区', '北帮', '南帮'] // 中央区雷达覆盖范围较广
    },

init() {
        window.addEventListener('click', (e) => {
            if (!e.target.closest('.filter-group') && !e.target.closest('.custom-dropdown-content')) {
                document.querySelectorAll('.custom-dropdown-content').forEach(d => d.style.display = 'none');
            }
        });
        // 初始状态：全选区域，开启 GNSS
        this.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
        this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'GNSS');
        this.activeTypes.add('GNSS');
        this.syncUI();
    },

    toggleDropdown(id, e) {

        if (e) e.stopPropagation();
        const el = document.getElementById(id);
        if (!el) return;

        const isCurrentlyShow = el.style.display === 'block';

        // 1. 关闭所有其他下拉框
        document.querySelectorAll('.custom-dropdown-content').forEach(d => {
            d.style.display = 'none';
        });

        // 2. 切换当前显示状态
        el.style.display = isCurrentlyShow ? 'none' : 'block';

        // 3. 边界自动校准逻辑
        if (el.style.display === 'block') {
            const rect = el.getBoundingClientRect();
            // 如果右侧超出屏幕，则右对齐（向左展开）
            if (rect.right > window.innerWidth) {
                el.style.left = 'auto';
                el.style.right = '0';
            } else {
                el.style.left = '0';
                el.style.right = 'auto';
            }

            // 4. 执行数据渲染
            if (id === 'map-point-dropdown') {
                this.renderPoints(document.getElementById('map-point-input').value);
            } else if (id === 'map-region-dropdown') {
                this.renderRegions();
            }
        }
    },

    // 抽屉显隐控制
toggleDrawer() {
        this.isOpen = !this.isOpen;
        const drawer = document.getElementById('device-drawer');
        const arrow = document.getElementById('drawer-arrow');
        if (drawer) drawer.classList.toggle('active', this.isOpen);
        if (arrow) arrow.innerText = this.isOpen ? '▼' : '▲';
    },

// 核心切换逻辑
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
                this.renderSatLayer(); // 开启全部时同步显示卫星绿色层
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

    // --- 遥感卫星：渲染全域绿色遮罩层 ---
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
        if (!this.activeTypes.has('RADAR')) return; // 没开雷达点，不能开云图
        el.classList.toggle('cloud-active');
        this.syncUI();
    },

// 核心渲染函数优化
renderRadarClouds() {
        this.removeRadarClouds();
        const canvas = document.getElementById('map-canvas');
        const radarPoints = document.querySelectorAll('.point-obj.type-RADAR');

        // 判定：如果顶栏勾选了“全部区域”，云图覆盖全图；否则只照射选定区域
        const isFullMap = this.selectedRegions.includes('全部');

        radarPoints.forEach(p => {
            if (p.style.display === 'none') return;
            const meta = mapModule.pMeta[p.id];
            const fan = document.createElement('div');
            fan.className = 'radar-fan-layer';
            fan.style.left = (parseFloat(p.style.left) + 16 - 1400) + 'px';
            fan.style.top = (parseFloat(p.style.top) + 16 - 2800) + 'px';

            // 方向逻辑：全选区域时指向中央区(全覆盖感)，单选时指向特定中心
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

    // 更新抽屉按钮的勾选标识样式
updateUI() {
    const allTypesList = ['GNSS', 'DEEP', 'RADAR', 'SURFACE', 'CRACK', 'FIRE', 'WATER', 'GROUND', 'STRESS', 'VIB', 'SAT'];

    document.querySelectorAll('.filter-item').forEach(item => {
        const isAllBtn = item.classList.contains('all-btn');
        let isActive = false;

        if (isAllBtn) {
            // “全部显示”按钮：当选中类型数量覆盖所有类型时高亮
            isActive = (this.activeTypes.size >= allTypesList.length);
        } else {
            // 普通按钮：通过获取 onclick 属性中的字符串参数（如 'DEEP'）进行精准匹配
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

    updateVisibility() {
        const selRegs = this.selectedRegions || ['全部'];
        document.querySelectorAll('.point-obj').forEach(p => {
            const meta = mapModule.pMeta[p.id];
            if (!meta) return;
            const isTypeMatch = this.activeTypes.has(meta.type);
            const isRegionMatch = selRegs.includes('全部') || selRegs.includes(meta.region);

            if (isTypeMatch && isRegionMatch) {
                p.style.display = 'block';
                if (meta.alarmIdx === 0 && meta.isOnline) p.classList.add('point-glow-active');
            } else {
                p.style.display = 'none';
                p.classList.remove('point-glow-active');
            }
        });
    },




/* --- 修改 mapFilterModule.handleGlobalClick --- */
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
                // 仅隐藏面板，不要在这里调用 handlePointInput()
                panel.style.display = 'none';

                // 关键修复：删除下面这一行逻辑，防止关闭时清空数据
                // if (cfg.panelId === 'map-point-dropdown') this.handlePointInput();
            }
        }
    });
},

toggleDropdown(id, e) {
        if (e) e.stopPropagation();
        const el = document.getElementById(id);
        if (!el) return;

        const isShow = el.style.display === 'block';

        // 关闭所有其他下拉框
        document.querySelectorAll('.custom-dropdown-content').forEach(d => {
            d.style.display = 'none';
        });

        // 切换当前显示状态
        el.style.display = isShow ? 'none' : 'block';

        // 自动校准：如果下拉框超出屏幕右侧，则向左对齐
        if (el.style.display === 'block') {
            const rect = el.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                el.style.left = 'auto';
                el.style.right = '0';
            }

            // 渲染数据
            if (id === 'map-point-dropdown') {
                this.renderPoints('');
            } else if (id === 'map-region-dropdown') {
                this.renderRegions();
            }
        }
    },

handleItemClick(el, event, type) {
    // 阻止冒泡，防止触发全局点击关闭逻辑
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

    getDisplayPoints(filterVal = '') {
        const allGnss = Object.keys(mapModule.pMeta)
            .filter(id => mapModule.pMeta[id].type === 'GNSS')
            .map(id => ({ id, ...mapModule.pMeta[id] }));

        let list = [];
        if (this.selectedRegions.length === 0 || this.selectedRegions.includes('全部')) {
            list = allGnss;
        } else {
            const cleanRegions = this.selectedRegions.filter(r => r !== '全部');
            list = allGnss.filter(p => cleanRegions.includes(p.region));
        }

        if (filterVal && filterVal !== '全部' && !filterVal.includes('、')) {
            list = list.filter(p =>
                p.deviceId.toLowerCase().includes(filterVal.toLowerCase()) ||
                p.deviceId.replace('GNSS','').includes(filterVal)
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

    // 核心更新：当选择区域时，自动勾选区域内全部监测点
handleRegionChange(cb) {
    const val = cb.value;
    const allRegions = ['北帮', '南帮', '东帮', '西帮', '中央区'];
    const allGnssIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'GNSS');
    const dropdown = document.getElementById('map-region-dropdown');

    if (val === '全部') {
        if (cb.checked) {
            this.selectedRegions = ['全部', ...allRegions];
            this.selectedPoints = [...allGnssIds];
        } else {
            this.selectedRegions = [];
            this.selectedPoints = [];
        }
        // 排除项逻辑：点击全部时，强制下拉框不消失
        if (dropdown) dropdown.style.display = 'block';
    } else {
        // 子区域点击逻辑
        if (cb.checked) {
            if (this.selectedRegions.includes('全部')) {
                this.selectedRegions = [];
                this.selectedPoints = [];
            }
            if (!this.selectedRegions.includes(val)) {
                this.selectedRegions.push(val);
                const regionPoints = allGnssIds.filter(id => mapModule.pMeta[id].region === val);
                regionPoints.forEach(id => { if (!this.selectedPoints.includes(id)) this.selectedPoints.push(id); });
            }
            const subSelected = this.selectedRegions.filter(r => r !== '全部');
            if (subSelected.length === allRegions.length) {
                if (!this.selectedRegions.includes('全部')) this.selectedRegions.push('全部');
            }
        } else {
            this.selectedRegions = this.selectedRegions.filter(r => r !== val && r !== '全部');
            const regionPoints = allGnssIds.filter(id => mapModule.pMeta[id].region === val);
            this.selectedPoints = this.selectedPoints.filter(id => !regionPoints.includes(id));
        }
        // 如果您希望点击具体区域后下拉框消失，取消注释下面这行：
        // if (dropdown) dropdown.style.display = 'none';
    }

    this.syncUI();
},

// 1. 修改区域切换逻辑：移除 syncUI() 触发
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
    // 关键修改：此处不再调用 syncUI()，选择区域不改变地图结果
},

// 2. 修改监测点切换逻辑：实现限定区域全选并触发 syncUI()
handlePointChange(cb) {
    const val = cb.value;
    // 获取当前受区域筛选影响的可见点位列表
    const currentVisibleList = this.getDisplayPoints('');
    const currentVisibleIds = currentVisibleList.map(p => p.id);

    if (val === '全部') {
        if (cb.checked) {
            // 全选：仅勾选当前可见区域内的点
            currentVisibleList.forEach(p => {
                if (!this.selectedPoints.includes(p.id)) this.selectedPoints.push(p.id);
            });
        } else {
            // 取消全选：仅取消当前可见区域内的点
            this.selectedPoints = this.selectedPoints.filter(id => !currentVisibleIds.includes(id));
        }
    } else {
        if (cb.checked) {
            if (!this.selectedPoints.includes(val)) this.selectedPoints.push(val);
        } else {
            this.selectedPoints = this.selectedPoints.filter(p => p !== val);
        }
    }

    this.syncUI(); // 在此处触发结果：更新地图点位显示
},

    filterPointList(val) {
        this.renderPoints(val);
    },

handlePointInput() {
    const input = document.getElementById('map-point-input');
    if (!input) return;
    const val = input.value.trim();
    const allGnss = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'GNSS');

    // 1. 如果输入为空或“全部”
    if (val === '' || val === '全部') {
        if (val === '全部') {
            this.selectedPoints = [...allGnss];
            this.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
        } else {
            this.selectedPoints = [];
            this.selectedRegions = [];
        }
        this.syncUI();
        return;
    }
    // 关键修复：增加对 "全部监测点" 的识别逻辑
        if (val === '' || val === '全部' || val === '全部监测点') {
            if (val === '全部' || val === '全部监测点') {
                this.selectedPoints = [...allGnss];
                this.selectedRegions = ['全部', ...allRegions];
            } else {
                this.selectedPoints = [];
                this.selectedRegions = [];
            }
            this.syncUI();
            return;
        }

    // 2. 解析输入内容（支持多种分隔符）
    const parts = val.split(/[、,，\s]/).map(p => p.trim()).filter(p => p !== '');
    const newSelectedPoints = [];
    const newSelectedRegions = [];

    parts.forEach(part => {
        let targetNum = part.replace(/GNSS/i, '');
        const matchedId = allGnss.find(id => mapModule.pMeta[id].deviceId.replace('GNSS', '') === targetNum);

        if (matchedId) {
            newSelectedPoints.push(matchedId);
            const meta = mapModule.pMeta[matchedId];
            // 自动识别并添加所在区域
            if (!newSelectedRegions.includes(meta.region)) {
                newSelectedRegions.push(meta.region);
            }
        }
    });

    // 3. 更新状态：显示添加的点位，并勾选对应的区域
    this.selectedPoints = newSelectedPoints;
    this.selectedRegions = newSelectedRegions;

    // 如果所有区域都被选中，自动补全“全部”标签
    if (this.selectedRegions.length === 5) this.selectedRegions.push('全部');

    this.syncUI();
},

/* 核心同步函数 */
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
                // 【核心逻辑】：雷达的显现取决于它照射的点位区域是否被选中
                if (isFullRegionSelected) {
                    isVisibilityMatch = true;
                } else {
                    // 获取该雷达照射的目标区域列表
                    const targets = this.radarTargetMapping[meta.region] || [];
                    // 只要当前选中的区域中，包含该雷达照射的任何一个目标区域，雷达就显现
                    isVisibilityMatch = this.selectedRegions.some(reg => targets.includes(reg));
                }
            } else {
                // 其他设备（GNSS等）：按物理位置匹配
                isVisibilityMatch = isFullRegionSelected || this.selectedRegions.includes(meta.region);
            }

            // GNSS 额外需要检查顶栏下拉框是否勾选
            const isPointChecked = (meta.type === 'GNSS') ? this.selectedPoints.includes(p.id) : true;

            p.style.display = (isVisibilityMatch && isTypeActive && isPointChecked) ? 'block' : 'none';
        });

        // 云图（扇面）显隐逻辑
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
                const allGnss = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'GNSS');
                if (this.selectedPoints.length > 0 && this.selectedPoints.length === allGnss.length) {
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
        },
    applyFilter() {
        const points = document.querySelectorAll('.point-obj');
        const activeRegions = this.selectedRegions.filter(r => r !== '全部');
        const hasRegionConstraint = activeRegions.length > 0;

        points.forEach(p => {
            const meta = mapModule.pMeta[p.id];
            if (!meta) return;

            // --- 修改核心：如果类型是遥感卫星（SAT），则不显示任何点位 ---
            if (meta.type === 'SAT') {
                p.style.display = 'none';
                return;
            }

            const isTypeMatch = this.activeTypes.has(meta.type);
            let isRegionMatch = true;

            if (meta.type === 'RADAR') {
                if (hasRegionConstraint) {
                    const coverage = this.radarCoverageMap[meta.region] || [];
                    isRegionMatch = activeRegions.some(reg => coverage.includes(reg));
                }
            } else {
                isRegionMatch = !hasRegionConstraint || activeRegions.includes(meta.region);
            }

            const isPointMatch = (meta.type !== 'GNSS' || this.selectedPoints.length === 0 || this.selectedPoints.includes(p.id));

            if (isTypeMatch && isRegionMatch && isPointMatch) {
                p.style.display = 'block';
                if (meta.alarmIdx === 0 && meta.isOnline) p.classList.add('point-glow-active');
            } else {
                p.style.display = 'none';
                p.classList.remove('point-glow-active');
            }
        });

        const plusBtn = document.querySelector('.radar-plus.cloud-active');
        if (plusBtn) this.renderRadarClouds();
        mapModule.triggerFlash();
    },
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
            'SJ': '🏗️',
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
                } else if (isOnline) {
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
    
    setTime(days, btn) {
        // 只处理按钮激活状态切换，不执行其他任何操作
        document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    },

    toggleDrawer() {
        document.getElementById('device-drawer').classList.toggle('active');
    },
    
    filterByDeviceType(type) {
        if (type === 'ALL') {
            document.querySelectorAll('.point-obj').forEach(p => {
                p.style.display = 'block';
                p.classList.remove('point-focus-center', 'point-glow-active');
                const meta = this.pMeta[p.id];
                if (meta && meta.isOnline && meta.alarmIdx === 0) {
                    p.classList.add('breathe', 'point-glow-active');
                }
            });
            const resetBtn = document.getElementById('reset-SJ-btn');
            if (resetBtn) resetBtn.style.display = 'none';
        } else {
            document.querySelectorAll('.point-obj').forEach(p => {
                const shouldShow = p.classList.contains(`type-${type}`);
                p.style.display = shouldShow ? 'block' : 'none';
                p.classList.remove('point-focus-center', 'point-glow-active', 'breathe');
                if (shouldShow) {
                    p.classList.add('point-glow-active');
                }
            });
            this.focus(type);
            const resetBtn = document.getElementById('reset-SJ-btn');
            if (resetBtn) resetBtn.style.display = 'flex';
        }
        document.getElementById('device-drawer').classList.remove('active');
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
            'SJ': `深层位移: ${totalDisp} mm<br>测斜深度: 45.0 m`,
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
        !mapModule.pMeta[id].isOnline && mapModule.pMeta[id].type === 'SJ'
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
    let html = pageData.map((n, i) => `
        <tr>
            <td>${start + i + 1}</td>
            <td>${n.region}</td>
            <td style="color:#f5222d; font-weight:bold;">${n.deviceId}</td>
            <td>2026-01-15 14:00</td>
            <td>海康威视</td>
        </tr>
    `).join('');

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
    appLogic.resetDeepFilter();

    // 7. 同步更新下拉列表的勾选状态与输入框显示
    mapFilterModule.syncUI();
},

                    getSortedGnssData() {
                        let data = Object.keys(mapModule.pMeta)
                            .filter(id => {
                                const meta = mapModule.pMeta[id];
                                return meta && meta.type === 'SJ' && meta.isOnline;
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
                                // 生成XY坐标
                                const x = (50 + Math.cos(seed) * 20).toFixed(1);
                                const y = (50 + Math.sin(seed) * 20).toFixed(1);
                                // 生成角度
                                const angle = (30 + (seed % 180)).toFixed(1);
                                return {
                                    id: id,
                                    deviceId: meta.deviceId,
                                    alarmIdx: meta.alarmIdx,
                                    region: meta.region,
                                    xy: `${x},${y}`,
                                    angle: angle,
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
                        
                        // 生成与数据点累计位移图类似的模拟数据
                        const depthValues = [-78, -75, -72, -69, -66, -63, -60, -57, -54, -51, -48, -45, -42, -39, -36, -33, -30, -27, -24, -21, -18, -15, -12, -9, -6, -3, 0];
                        
                        // 根据设备ID生成不同的位移数据
                        const seed = meta ? parseInt(targetId.replace('pt-', '')) || 0 : 0;
                        const combinedData = depthValues.map((depth, index) => {
                            const baseValue = 10 + (seed % 10);
                            const depthFactor = Math.abs(depth / 10);
                            return (baseValue + depthFactor + Math.sin(index + seed) * 5).toFixed(2);
                        });
                        const xAxisData = depthValues.map((depth, index) => {
                            const baseValue = 5 + (seed % 5);
                            return (baseValue + Math.sin(index * 0.5 + seed) * 3).toFixed(2);
                        });
                        const yAxisData = depthValues.map((depth, index) => {
                            const baseValue = 3 + (seed % 3);
                            return (baseValue + Math.cos(index * 0.3 + seed) * 2).toFixed(2);
                        });
                        const zAxisData = depthValues.map((depth, index) => {
                            const baseValue = 2 + (seed % 4);
                            return (baseValue + Math.sin(index * 0.7 + seed) * 1.5).toFixed(2);
                        });
                        
                        let alarmName = '运行正常';
                        let color = '#5470c6';
                        if (meta) {
                            color = this.colors[meta.alarmIdx];
                            const alarmNames = ['一级告警 (危险)', '二级告警 (受控)', '三级告警 (注意)', '四级告警 (警示)', '运行正常'];
                            alarmName = alarmNames[meta.alarmIdx];
                        }
                        
                        // 计算深度中间点，用于划分上下两部分
                        const middleDepth = -39; // -78到0的中间位置
                        
                        // 创建背景填充系列
                        const backgroundSeries = [
                            // 下半部分：黄色纯色填充（第四系）
                            {
                                name: '第四系',
                                type: 'line',
                                data: [
                                    [-5, -78],
                                    [30, -78],
                                    [30, middleDepth],
                                    [-5, middleDepth],
                                    [-5, -78]
                                ],
                                areaStyle: {
                                    color: 'rgba(255, 240, 0, 0.6)' // 黄色纯色填充
                                },
                                lineStyle: {
                                    color: 'transparent'
                                },
                                itemStyle: {
                                    color: 'rgba(255, 240, 0, 1)' // 为图例设置不透明颜色
                                },
                                symbol: 'rect', // 为图例设置矩形图标
                                symbolSize: [10, 10],
                                z: -1,
                                silent: true,
                                // 确保图例可见
                                showSymbol: true
                            },
                            // 上半部分：橙色斜线填充（排弃物料）
                            {
                                name: '排弃物料',
                                type: 'line',
                                data: [
                                    [-5, middleDepth],
                                    [30, middleDepth],
                                    [30, 0],
                                    [-5, 0],
                                    [-5, middleDepth]
                                ],
                                areaStyle: {
                                    // 使用线性渐变模拟斜线效果
                                    color: {
                                        type: 'linear',
                                        x: 0,
                                        y: 0,
                                        x2: 1,
                                        y2: 0,
                                        colorStops: [
                                            { offset: 0, color: 'rgba(255, 165, 0, 0.8)' },
                                            { offset: 0.5, color: 'rgba(255, 165, 0, 0.4)' },
                                            { offset: 1, color: 'rgba(255, 165, 0, 0.8)' }
                                        ],
                                        global: false
                                    }
                                },
                                lineStyle: {
                                    color: 'transparent'
                                },
                                itemStyle: {
                                    color: 'rgba(255, 165, 0, 1)' // 为图例设置不透明颜色
                                },
                                symbol: 'rect', // 为图例设置矩形图标
                                symbolSize: [10, 10],
                                z: -1,
                                silent: true,
                                // 确保图例可见
                                showSymbol: true
                            }
                        ];
                        
                        chart.setOption({
                            title: {
                                text: meta ? `${meta.deviceId} - ${alarmName}` : '累计位移数据图',
                                textStyle: {
                                    fontSize: 11,
                                    color: color,
                                    fontWeight: 'bold'
                                },
                                right: 10,
                                top: 0
                            },
                            tooltip: {
                                trigger: 'axis',
                                axisPointer: {
                                    type: 'cross'
                                }
                            },
                            legend: {
                                data: ['合位移', 'X轴位移', 'Y轴位移', 'Z轴位移', '第四系', '排弃物料'],
                                textStyle: {
                                    fontSize: 10
                                },
                                top: 'bottom',
                                left: 'center'
                            },
                            grid: {
                                top: 40,
                                bottom: 50,
                                left: 45,
                                right: 45,
                                containLabel: true
                            },
                            xAxis: {
                                type: 'value',
                                name: '位移量(mm)',
                                nameLocation: 'middle',
                                nameGap: 20,
                                nameTextStyle: {
                                    fontSize: 10
                                },
                                axisLabel: {
                                    fontSize: 10
                                },
                                min: -5,
                                max: 30,
                                interval: 5,
                                position: 'bottom'
                            },
                            yAxis: [
                                {
                                    type: 'value',
                                    name: '深度(m)',
                                    nameTextStyle: {
                                        fontSize: 10
                                    },
                                    axisLabel: {
                                        fontSize: 10
                                    },
                                    min: -78,
                                    max: 0,
                                    interval: 3
                                },
                                {
                                    type: 'value',
                                    name: '高程(m)',
                                    nameTextStyle: {
                                        fontSize: 10
                                    },
                                    axisLabel: {
                                        fontSize: 10
                                    },
                                    min: 812.15,
                                    max: 890.15,
                                    interval: 3,
                                    position: 'right'
                                }
                            ],
                            series: [
                                // 添加背景填充系列
                                ...backgroundSeries,
                                {
                                    name: '合位移',
                                    type: 'line',
                                    data: depthValues.map((depth, index) => [combinedData[index], depth]),
                                    symbol: 'circle',
                                    symbolSize: 6,
                                    lineStyle: {
                                        color: '#5470c6',
                                        width: 2
                                    },
                                    itemStyle: {
                                        color: '#5470c6'
                                    }
                                },
                                {
                                    name: 'X轴位移',
                                    type: 'line',
                                    data: depthValues.map((depth, index) => [xAxisData[index], depth]),
                                    symbol: 'circle',
                                    symbolSize: 6,
                                    lineStyle: {
                                        color: '#91cc75',
                                        width: 2
                                    },
                                    itemStyle: {
                                        color: '#91cc75'
                                    }
                                },
                                {
                                    name: 'Y轴位移',
                                    type: 'line',
                                    data: depthValues.map((depth, index) => [yAxisData[index], depth]),
                                    symbol: 'circle',
                                    symbolSize: 6,
                                    lineStyle: {
                                        color: '#fac858',
                                        width: 2
                                    },
                                    itemStyle: {
                                        color: '#fac858'
                                    }
                                },
                                {
                                    name: 'Z轴位移',
                                    type: 'line',
                                    data: depthValues.map((depth, index) => [zAxisData[index], depth]),
                                    symbol: 'circle',
                                    symbolSize: 6,
                                    lineStyle: {
                                        color: '#ee6666',
                                        width: 2
                                    },
                                    itemStyle: {
                                        color: '#ee6666'
                                    }
                                }
                            ]
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
                            return `<tr class="${rowClass}" style="cursor:pointer;" onclick="dashModule.focusWithRange('${item.id}')"><td>${startIndex + i + 1}</td><td>${item.region}</td><td style="color:${textColor}; font-weight:600;">${item.deviceId}</td><td>${item.xy}</td><td style="color:${textColor}; font-weight:600;">${item.angle}°</td><td>${item.threshold}</td></tr>`;
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
                        this.initSpeedChart(targetId);
                        let maxDiffX = 100,
                            maxDiffY = 100;
                        document.querySelectorAll('.point-obj').forEach(p => {
                            const meta = mapModule.pMeta[p.id];
                            if (meta && meta.type === 'SJ') {
                                const px = parseFloat(p.style.left),
                                    py = parseFloat(p.style.top),
                                    dist = Math.sqrt((px - tx) ** 2 + (py - ty) ** 2);
                                p.classList.remove('breathe', 'point-glow-active', 'point-focus-center');
                                if (p.id === targetId || dist <= 1200) {
                                    p.style.display = 'block';
                                    p.style.color = p.style.backgroundColor;
                                    maxDiffX = Math.max(maxDiffX, Math.abs(px - tx));
                                    maxDiffY = Math.max(maxDiffY, Math.abs(py - ty));
                                    p.classList.add(p.id === targetId ? 'point-focus-center' : 'point-glow-active');
                                } else p.style.display = 'none';
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
                        const deepNodes = Object.values(mapModule.pMeta).filter(n => n.type === 'SJ');
                        const online = deepNodes.filter(n => n.isOnline).length,
                            offline = deepNodes.length - online;
                        const chart = echarts.init(document.getElementById('chart-on'));
                        chart.setOption({
                            title: {
                                text: deepNodes.length,
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
                            if (params.name === '离线') this.showOfflineModal(deepNodes.filter(n => !n.isOnline));
                        });
                    },

                    initAlarmChart() {
                        const deepNodes = Object.values(mapModule.pMeta).filter(n => n.type === 'SJ' && n.isOnline);
                        const counts = [0, 0, 0, 0, 0];
                        deepNodes.forEach(n => {
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
                            
                            // 检查reset-deep-btn元素是否存在
                            const resetDeepBtn = document.getElementById('reset-deep-btn');
                            if (resetDeepBtn) {
                                resetDeepBtn.style.display = 'flex';
                            }
                            
                            // 筛选匹配的设备
                            const matchingPoints = [];
                            document.querySelectorAll('.point-obj').forEach(p => {
                                const meta = mapModule.pMeta[p.id];
                                const isMatch = (meta && meta.type === 'SJ') && (meta.isOnline) && (meta.alarmIdx === targetIdx);
                                p.classList.remove('breathe', 'point-glow-active', 'point-focus-center');
                                if (isMatch) {
                                    p.style.display = 'block';
                                    p.style.color = p.style.backgroundColor;
                                    p.classList.add('breathe', 'point-glow-active');
                                    matchingPoints.push(p);
                                } else {
                                    p.style.display = 'none';
                                }
                            });
                            
                            // 聚焦到匹配的设备
                            if (matchingPoints.length > 0) {
                                // 如果只有一个匹配设备，聚焦到该设备
                                if (matchingPoints.length === 1) {
                                    const targetEl = matchingPoints[0];
                                    const tx = parseFloat(targetEl.style.left);
                                    const ty = parseFloat(targetEl.style.top);
                                    
                                    const vp = document.getElementById('map-viewer');
                                    const cv = document.getElementById('map-canvas');
                                    
                                    // 聚焦到单个设备
                                    mapModule.scale = Math.min(1.0, mapModule.scale * 1.5); // 放大一点
                                    mapModule.pos.x = (vp.clientWidth / 2) - (tx * mapModule.scale);
                                    mapModule.pos.y = (vp.clientHeight / 2) - (ty * mapModule.scale);
                                    cv.style.transform = `translate(${mapModule.pos.x}px, ${mapModule.pos.y}px) scale(${mapModule.scale})`;
                                    
                                    // 添加焦点样式
                                    targetEl.classList.add('point-focus-center');
                                } else {
                                    // 如果有多个匹配设备，聚焦到所有设备的中心
                                    mapModule.focus('SJ');
                                }
                            }
                        });
                    },


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
        const resetBtn = document.getElementById('reset-deep-btn');
        if (resetBtn) resetBtn.style.display = 'none';
        if (type !== 'ALL') mapModule.focus(type);
        const deepPoints = document.querySelectorAll('.point-obj.type-SJ');
        deepPoints.forEach(p => {
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

    resetDeepFilter() {
        mapModule.isDetailMode = false;
        document.querySelectorAll('.point-obj.type-SJ').forEach(p => {
            p.style.display = 'block';
            p.classList.remove('point-focus-center', 'breathe', 'point-glow-active');
            const meta = mapModule.pMeta[p.id];
            if (meta && meta.isOnline && meta.alarmIdx === 0) {
                p.style.color = p.style.backgroundColor;
                p.classList.add('breathe', 'point-glow-active');
            }
        });
        mapModule.focus('SJ');
        document.getElementById('reset-deep-btn').style.display = 'none';
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
        vector: null
    },
    selectedMetricsMap: {},
    selectedDevices: ['SJ45'],
    allMetrics: [
        'X速度(mm/h)', 'Y速度(mm/h)', 'H速度(mm/h)', 'XY速度(mm/h)', 'XYH速度(mm/h)',
        'X位移(mm)', 'Y位移(mm)', 'H位移(mm)', 'XY位移(mm)', 'XYH位移(mm)',
        'X累积位移(mm)', 'Y累积位移(mm)', 'H累积位移(mm)', 'XY累积位移(mm)', 'XYH累积位移(mm)',
        'X加速度(mm/h²)', 'Y加速度(mm/h²)', '切线角'
    ],
    deviceColors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'],
    lineStyles: ['solid', 'dashed', 'dotted', 'dashDot'],

    getLogicData(devId, timestamp, metricIdx = 0) {
        const meta = Object.values(mapModule.pMeta).find(m => m.deviceId === devId);
        if (!meta) return 0;
        const devSeed = devId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
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
                [targetMeta.deviceId]: (this.selectedGlobalMetrics && this.selectedGlobalMetrics.length > 0 ? [...this.selectedGlobalMetrics] : ['XY速度(mm/h)'])
            };
        } else {
            this.filterDevicesByRegion("");
            // 默认选中SJ45
            this.selectedDevices = ['SJ45'];
            this.selectedMetricsMap = {
                'SJ45': (this.selectedGlobalMetrics && this.selectedGlobalMetrics.length > 0 ? [...this.selectedGlobalMetrics] : ['XY速度(mm/h)'])
            };
            this.updateDeviceInputDisplay();
        }
        this.renderMetricSelector();
        this.updateMetricButtonLabel();
        this.updateChartTitles(); // 更新图表标题
        
        // 初始化选项卡切换逻辑
        this.initTabs();
        
        // 初始化数据指标按钮点击事件
        this.initIndicatorButtons();
        
        // 延迟执行查询和其他操作
        setTimeout(() => {
            this.query();
            // 根据当前激活的选项卡初始化对应的图表
            const activeTab = document.querySelector('.tab-item.active');
            if (activeTab) {
                const tabId = activeTab.getAttribute('data-tab');
                // 根据选项卡初始化对应的图表
                if (tabId === 'datapoint') {
                    this.initDataPointCharts();
                } else if (tabId === 'posture') {
                    this.init3DPostureChart();
                } else if (tabId === 'trend') {
                    this.initTrendCharts();
                } else if (tabId === 'cluster') {
                    this.initClusterCharts();
                } else if (tabId === 'nodedisp') {
                    this.initNodeDispCharts();
                } else if (tabId === 'trajectory') {
                    // 确保轨迹图容器可见后再初始化
                    setTimeout(() => {
                        this.initTrajectoryCharts();
                    }, 100);
                } else if (tabId === 'nodetemp') {
                    this.initNodetempCharts();
                } else if (tabId === 'tempfield') {
                    this.initTempfieldCharts();
                } else if (tabId === 'angle') {
                    this.initAngleCharts();
                }
            }
        }, 150);
    },
    
    // 初始化选项卡切换逻辑
    initTabs() {
        const tabItems = document.querySelectorAll('.tab-item');
        
        // 处理选项卡点击事件
        const handleTabClick = (tab) => {
            // 移除所有选项卡的激活状态
            tabItems.forEach(item => item.classList.remove('active'));
            // 激活当前选项卡
            tab.classList.add('active');
            
            // 隐藏所有选项卡内容
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // 显示对应的选项卡内容
            const tabId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById('tab-' + tabId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            // 根据选项卡初始化对应的图表
            if (tabId === 'datapoint') {
                this.initDataPointCharts();
            } else if (tabId === 'posture') {
                this.init3DPostureChart();
            } else if (tabId === 'trend') {
                this.initTrendCharts();
            } else if (tabId === 'cluster') {
                this.initClusterCharts();
            } else if (tabId === 'nodedisp') {
                this.initNodeDispCharts();
            } else if (tabId === 'trajectory') {
                this.initTrajectoryCharts();
            } else if (tabId === 'nodetemp') {
                this.initNodetempCharts();
            } else if (tabId === 'tempfield') {
                this.initTempfieldCharts();
            } else if (tabId === 'angle') {
                this.initAngleCharts();
            }
            
            // 更新当前选项卡的图表标题
            this.updateChartTitles();
        };
        
        // 为每个选项卡添加点击事件监听器
        tabItems.forEach(tab => {
            tab.addEventListener('click', () => {
                handleTabClick(tab);
            });
        });
        
        // 处理默认激活的选项卡
        const defaultTab = document.querySelector('.tab-item.active');
        if (defaultTab) {
            // 隐藏所有选项卡内容
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // 显示默认选项卡的内容
            const tabId = defaultTab.getAttribute('data-tab');
            const targetContent = document.getElementById('tab-' + tabId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        }
    },
    
    // 初始化数据指标按钮点击事件
    initIndicatorButtons() {
        // 使用事件委托，确保动态生成的按钮也能响应
        const indicatorsContainer = document.querySelector('.data-indicators');
        if (indicatorsContainer) {
            // 先移除旧的事件监听器，避免重复绑定
            indicatorsContainer.removeEventListener('click', this.handleIndicatorClick.bind(this));
            // 添加新的事件监听器
            indicatorsContainer.addEventListener('click', this.handleIndicatorClick.bind(this));
        }
    },
    
    // 处理数据指标按钮点击
    handleIndicatorClick(e) {
        const button = e.target;
        if (button.classList.contains('indicator-item')) {
            // 移除所有按钮的激活状态
            document.querySelectorAll('.indicator-item').forEach(btn => btn.classList.remove('active'));
            // 激活当前点击的按钮
            button.classList.add('active');
        }
    },
    
    // 初始化趋势图
    initTrendCharts() {
        this.initCumulativeDisplacementTrendChart();
        this.initRelativeDisplacementTrendChart();
    },
    
    // 初始化累计位移趋势图
    initCumulativeDisplacementTrendChart() {
        const chartDom = document.getElementById('cumulative-displacement-chart-trend');
        const chart = echarts.init(chartDom);
        
        // 获取当前选中的设备ID
        const deviceId = this.selectedDevices[0] || 'SJ45';
        
        // 生成深度数据（从-127到0，间隔3）
        const depthValues = [];
        for (let i = -127; i <= 0; i += 3) {
            depthValues.push(i);
        }
        
        // 生成模拟位移数据（0到15，间隔3）
        const generateDisplacementData = () => {
            return depthValues.map(() => {
                return Math.round(Math.random() * 15 / 3) * 3;
            });
        };
        
        const combinedData = generateDisplacementData();
        const xAxisData = generateDisplacementData();
        const yAxisData = generateDisplacementData();
        const zAxisData = generateDisplacementData();
        
        // 计算对应的高程数据（从904.94到1031.94，间隔4）
        const elevationValues = depthValues.map(depth => {
            return (904.94 + (-depth) * (1031.94 - 904.94) / 127).toFixed(2);
        });
        
        const option = {
            title: {
                text: `${deviceId} - 累计趋势图`,
                left: 'center',
                textStyle: {
                    fontSize: 12
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                }
            },
            legend: {
                data: ['2026-1-15', '2026-1-16', '2026-1-17', '2026-1-18'],
                textStyle: {
                    fontSize: 10
                },
                top: 'bottom',
                left: 'center'
            },
            grid: {
                left: '8%',
                right: '15%',
                bottom: '15%',
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: '位移量(mm)',
                nameLocation: 'middle',
                nameGap: 20,
                min: 0,
                max: 15,
                interval: 3,
                nameTextStyle: { fontSize: 10 },
                axisLabel: { fontSize: 10 }
            },
            yAxis: [
                {
                    type: 'value',
                    name: '深度(m)',
                    nameTextStyle: {
                        fontSize: 10
                    },
                    axisLabel: {
                        fontSize: 10
                    },
                    min: -127,
                    max: 0,
                    interval: 3
                },
                {
                    type: 'value',
                    name: '高程(m)',
                    nameTextStyle: {
                        fontSize: 10
                    },
                    axisLabel: {
                        fontSize: 10
                    },
                    min: 904.94,
                    max: 1031.94,
                    interval: 4,
                    position: 'right'
                }
            ],
            series: [
                {
                    name: '合位移',
                    type: 'line',
                    data: depthValues.map((depth, index) => [combinedData[index], depth]),
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: {
                        color: '#5470c6',
                        width: 2
                    },
                    itemStyle: {
                        color: '#5470c6'
                    }
                },
                {
                    name: 'X轴位移',
                    type: 'line',
                    data: depthValues.map((depth, index) => [xAxisData[index], depth]),
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: {
                        color: '#91cc75',
                        width: 2
                    },
                    itemStyle: {
                        color: '#91cc75'
                    }
                },
                {
                    name: 'Y轴位移',
                    type: 'line',
                    data: depthValues.map((depth, index) => [yAxisData[index], depth]),
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: {
                        color: '#fac858',
                        width: 2
                    },
                    itemStyle: {
                        color: '#fac858'
                    }
                },
                {
                    name: 'Z轴位移',
                    type: 'line',
                    data: depthValues.map((depth, index) => [zAxisData[index], depth]),
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: {
                        color: '#ee6666',
                        width: 2
                    },
                    itemStyle: {
                        color: '#ee6666'
                    }
                }
            ]
        };
        
        chart.setOption(option);
    },
    
    // 初始化相对位移趋势图
    // 初始化相对位移趋势图
initRelativeDisplacementTrendChart() {
    const chartDom = document.getElementById('relative-displacement-chart-trend');
    if (!chartDom) return;

    const chart = echarts.init(chartDom);

    // 当前设备
    const deviceId = this.selectedDevices?.[0] || 'SJ45';

    // 深度数据（-127 ~ 0）
    const depthValues = [];
    for (let i = -127; i <= 0; i += 3) {
        depthValues.push(i);
    }

    // 模拟位移数据（0~15，步长3）
    const generateDisplacementData = () =>
        depthValues.map(() => Math.round(Math.random() * 15 / 3) * 3);

    const combinedRelativeData = generateDisplacementData();
    const xAxisRelativeData = generateDisplacementData();
    const yAxisRelativeData = generateDisplacementData();

    const option = {
        title: {
            text: `${deviceId} - 相对趋势图`,
            left: 'center',
            textStyle: { fontSize: 12 }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' }
        },
        legend: {
            data: ['2026-1-15', '2026-1-16', '2026-1-17'],
            textStyle: { fontSize: 10 },
            top: 'bottom'
        },
        grid: {
            left: '8%',
            right: '15%',
            top: '15%',
            bottom: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            name: '位移量(mm)',
            nameLocation: 'middle',
            nameGap: 20,
            min: 0,
            max: 15,
            interval: 3,
            nameTextStyle: { fontSize: 10 },
            axisLabel: { fontSize: 10 }
        },
        yAxis: [
            {
                type: 'value',
                name: '深度(m)',
                min: -127,
                max: 0,
                interval: 3,
                nameTextStyle: { fontSize: 10 },
                axisLabel: { fontSize: 10 }
            },
            {
                type: 'value',
                name: '高程(m)',
                min: 904.94,
                max: 1031.94,
                interval: 4,
                position: 'right',
                nameTextStyle: { fontSize: 10 },
                axisLabel: { fontSize: 10 }
            }
        ],
        series: [
            {
                name: '相对合位移',
                type: 'line',
                data: depthValues.map((d, i) => [combinedRelativeData[i], d]),
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { width: 2 }
            },
            {
                name: 'X轴相对位移',
                type: 'line',
                data: depthValues.map((d, i) => [xAxisRelativeData[i], d]),
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { width: 2 }
            },
            {
                name: 'Y轴相对位移',
                type: 'line',
                data: depthValues.map((d, i) => [yAxisRelativeData[i], d]),
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { width: 2 }
            }
        ]
    };

    chart.setOption(option);
},
    
    // 初始化累计位移聚类图表
    initCumulativeDisplacementClusterChart() {
        const chartDom = document.getElementById('cumulative-trend-chart');
        if (!chartDom) return;
        const chart = echarts.init(chartDom);
        
        // 生成模拟数据，符合用户要求：横坐标位移量(mm)，间隔3，从0到15；纵坐标高程(m)，间隔30，从904.94到1031.94
        const displacementValues = [0, 3, 6, 9, 12, 15];
        const heightValues = [904.94, 934.94, 964.94, 994.94, 1024.94, 1031.94];
        
        // 生成多条轨迹线数据
        const trajectories = [
            { color: '#5470c6', data: [[0, 1031.94], [3, 994.94], [6, 964.94], [9, 934.94], [12, 934.94], [15, 904.94]] },
            { color: '#91cc75', data: [[0, 1031.94], [3, 1024.94], [6, 994.94], [9, 964.94], [12, 934.94], [15, 904.94]] },
            { color: '#fac858', data: [[0, 1031.94], [3, 994.94], [6, 964.94], [9, 934.94], [12, 904.94], [15, 904.94]] },
            { color: '#ee6666', data: [[0, 1031.94], [3, 1024.94], [6, 994.94], [9, 934.94], [12, 904.94], [15, 904.94]] }
        ];
        
        const option = {
            title: {
                show: false
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                }
            },
            grid: {
                left: '10%',
                right: '10%',
                bottom: '10%',
                top: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: '位移量(mm)',
                nameTextStyle: {
                    fontSize: 12
                },
                axisLabel: {
                    fontSize: 12
                },
                min: 0,
                max: 15,
                interval: 3
            },
            yAxis: {
                type: 'value',
                name: '高程(m)',
                nameTextStyle: {
                    fontSize: 12
                },
                axisLabel: {
                    fontSize: 12
                },
                min: 904.94,
                max: 1031.94,
                interval: 30
            },
            series: trajectories.map(traj => ({
                type: 'line',
                data: traj.data,
                symbol: 'circle',
                symbolSize: 8,
                lineStyle: {
                    color: traj.color,
                    width: 2
                },
                itemStyle: {
                    color: traj.color
                }
            }))
        };
        
        chart.setOption(option);
    },
    
    // 初始化滑面聚类识别图表
    initSlidingSurfaceClusterChart() {
        const chartDom = document.getElementById('slide-plane-chart');
        if (!chartDom) return;
        const chart = echarts.init(chartDom);
        
        // 生成模拟数据，符合用户要求：横坐标间隔1，从-1到2；纵坐标高程(m)，和第一张相同
        const displacementValues = [-1, 0, 1, 2];
        const heightValues = [904.94, 934.94, 964.94, 994.94, 1024.94, 1031.94];
        
        // 生成滑面识别数据
        const slidingData = [
            [-1, 1031.94],
            [0, 994.94],
            [1, 964.94],
            [2, 934.94],
            [2, 904.94],
            [-1, 904.94],
            [-1, 1031.94]
        ];
        
        const option = {
            title: {
                show: false
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                }
            },
            grid: {
                left: '10%',
                right: '10%',
                bottom: '10%',
                top: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: '位移量(mm)',
                nameTextStyle: {
                    fontSize: 12
                },
                axisLabel: {
                    fontSize: 12
                },
                min: -1,
                max: 2,
                interval: 1
            },
            yAxis: {
                type: 'value',
                name: '高程(m)',
                nameTextStyle: {
                    fontSize: 12
                },
                axisLabel: {
                    fontSize: 12
                },
                min: 904.94,
                max: 1031.94,
                interval: 30
            },
            series: [{
                type: 'line',
                data: slidingData,
                symbol: 'circle',
                symbolSize: 8,
                lineStyle: {
                    color: '#5470c6',
                    width: 2,
                    type: 'solid'
                },
                itemStyle: {
                    color: '#5470c6'
                }
            }]
        };
        
        chart.setOption(option);
    },
    
    // 初始化聚类滑面关联图表
    initClusterCharts() {
        this.initCumulativeDisplacementClusterChart();
        this.initSlidingSurfaceClusterChart();
    },
    
    // 初始化节点位移图表
    initNodeDispCharts() {
        this.initNodeDispChart();
    },
    
    // 初始化节点位移数据图
    initNodeDispChart() {
        const chartDom = document.getElementById('nodedisp-chart');
        const chart = echarts.init(chartDom);
        
        // 生成模拟数据，与图片样式一致
        const timeValues = ['2026-01-14', '2026-01-15', '2026-01-16', '2026-01-17', '2026-01-18', '2026-01-19', '2026-01-20'];
        const displacementData = [2.85, 3.05, 3.05, 2.90, 3.05, 3.05, 3.00];
        
        const option = {
            title: {
                show: false
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    return params[0].name + '<br/>累计位移: ' + params[0].value + ' mm';
                }
            },
            grid: {
                left: '8%',
                right: '8%',
                bottom: '10%',
                top: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: timeValues,
                axisLabel: {
                    fontSize: 12
                },
                axisLine: {
                    lineStyle: {
                        color: '#666'
                    }
                },
                axisTick: {
                    alignWithLabel: true
                }
            },
            yAxis: {
                type: 'value',
                name: '累计位移(mm)',
                nameTextStyle: {
                    fontSize: 12
                },
                axisLabel: {
                    fontSize: 12
                },
                min: 0.5,
                max: 3.5,
                interval: 0.5,
                axisLine: {
                    lineStyle: {
                        color: '#666'
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: '#f0f0f0'
                    }
                }
            },
            series: [{
                name: '-1米',
                type: 'line',
                data: displacementData,
                symbol: 'circle',
                symbolSize: 8,
                lineStyle: {
                    color: '#5470c6',
                    width: 2
                },
                itemStyle: {
                    color: '#5470c6'
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(84, 112, 198, 0.3)' },
                        { offset: 1, color: 'rgba(84, 112, 198, 0.05)' }
                    ])
                }
            }]
        };
        
        chart.setOption(option);
    },
    

 // 初始化地层运动轨迹图表
initTrajectoryCharts() {
    this.initTrajectoryChart();
},

// 初始化轨迹极坐标散点图
initTrajectoryChart() {
    const chartDom = document.getElementById('trajectory-chart');
    if (!chartDom) return;

    const chart = echarts.init(chartDom);

    // 模拟数据
    const startPoint = { radius: 0.5, angle: 0, time: '2026-01-16 00:00:00' };
    const endPoint = { radius: 4.5, angle: 225, time: '2026-01-22 23:59:59' };

    const trajectoryPoints = [];
    for (let i = 0; i < 100; i++) {
        const angle = 180 + Math.random() * 90;
        const radius = Math.random() * 3 + 1;
        const time = `2026-01-${16 + Math.floor(i / 14)} ${Math.floor(Math.random() * 24)}:${Math.floor(Math.random() * 60)
            }:${Math.floor(Math.random() * 60)}`;
        trajectoryPoints.push({ radius, angle, time });
    }

    const mapData = (point) => [point.radius, point.angle, point.time];

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: (params) => {
                const radius = params.data[0].toFixed(2);
                const angle = params.data[1].toFixed(1);
                const time = params.data[2];
                const rad = (angle * Math.PI) / 180;
                const x = (radius * Math.cos(rad)).toFixed(2);
                const y = (radius * Math.sin(rad)).toFixed(2);
                return `
                    <b>${params.seriesName}</b><br/>
                    半径: ${radius} mm<br/>
                    方位角: ${angle}°<br/>
                    X: ${x} mm, Y: ${y} mm<br/>
                    时间: ${time}
                `;
            }
        },
        legend: {
            top: 48,
            left: 'center',
            data: ['开始点', '轨迹点', '结束点']
        },
        polar: {
            center: ['50%', '62%'],
            radius: ['15%', '85%']
        },
        angleAxis: {
            type: 'value',
            startAngle: 90,
            clockwise: true,
            min: 0,
            max: 360,
            interval: 30,
            axisLabel: {
                formatter: val => ({0:'北',90:'东',180:'南',270:'西'}[val] ?? val)
            },
            splitLine: { lineStyle: { color: '#e6eef7' } }
        },
        radiusAxis: {
            min: 0,
            max: 5,
            interval: 1,
            axisLabel: { formatter: '{value}mm' },
            splitLine: { lineStyle: { type: 'dashed', color: '#d0d7e2' } }
        },
        series: [
            {
                name: '开始点',
                type: 'effectScatter',   // 使用效果散点
                coordinateSystem: 'polar',
                data: [mapData(startPoint)],
                symbolSize: 12,
                showEffectOn: 'render',
                rippleEffect: {
                    brushType: 'stroke',
                    scale: 3,
                    period: 2
                },
                itemStyle: { color: '#52c41a' }
            },
            {
                name: '轨迹点',
                type: 'effectScatter',   // 散点加射线扩散效果
                coordinateSystem: 'polar',
                data: trajectoryPoints.map(mapData),
                symbolSize: 6,
                showEffectOn: 'render',
                rippleEffect: {
                    brushType: 'stroke',
                    scale: 2,
                    period: 3
                },
                itemStyle: { color: '#1890ff' }
            },
            {
                name: '结束点',
                type: 'effectScatter',
                coordinateSystem: 'polar',
                data: [mapData(endPoint)],
                symbolSize: 12,
                showEffectOn: 'render',
                rippleEffect: {
                    brushType: 'stroke',
                    scale: 3,
                    period: 2
                },
                itemStyle: { color: '#ff4d4f' }
            }
        ]
    };

    chart.setOption(option);

        
        // 监听窗口大小变化，确保图表自适应
        window.addEventListener('resize', function() {
            chart.resize();
        });
    },
    
    // 调试函数：手动初始化轨迹图
    debugInitTrajectoryChart() {
        console.log('手动初始化轨迹图...');
        const chartDom = document.getElementById('trajectory-chart');
        console.log('图表容器:', chartDom);
        if (chartDom) {
            console.log('容器尺寸:', chartDom.offsetWidth, 'x', chartDom.offsetHeight);
            console.log('容器样式:', window.getComputedStyle(chartDom));
        }
        this.initTrajectoryChart();
    },
    
    // 初始化节点温度图表
    initNodetempCharts() {
        this.initNodetempChart();
    },
    
    // 初始化节点温度数据图
    initNodetempChart() {
        const chartDom = document.getElementById('nodetemp-chart');
        const chart = echarts.init(chartDom);
        
        // 生成模拟数据，与图片样式一致
        const timeValues = ['2026-01-14', '2026-01-15', '2026-01-16', '2026-01-17', '2026-01-18', '2026-01-19', '2026-01-20'];
        const temperatureData = [25, 24.8, 24.7, 24.9, 25, 25.1, 24.6];
        
        const option = {
            title: {
                show: false
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    return params[0].name + '<br/>温度: ' + params[0].value + ' ℃';
                }
            },
            grid: {
                left: '8%',
                right: '8%',
                bottom: '15%',
                top: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: timeValues,
                axisLabel: {
                    fontSize: 12
                },
                axisLine: {
                    lineStyle: {
                        color: '#666'
                    }
                },
                axisTick: {
                    alignWithLabel: true
                }
            },
            yAxis: {
                type: 'value',
                name: '温度(℃)',
                nameTextStyle: {
                    fontSize: 12
                },
                axisLabel: {
                    fontSize: 12
                },
                min: 0,
                max: 30,
                interval: 5,
                axisLine: {
                    lineStyle: {
                        color: '#666'
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: '#f0f0f0'
                    }
                }
            },
            series: [{
                name: '-1米',
                type: 'line',
                data: temperatureData,
                symbol: 'circle',
                symbolSize: 8,
                lineStyle: {
                    color: '#5470c6',
                    width: 2
                },
                itemStyle: {
                    color: '#5470c6'
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(84, 112, 198, 0.3)' },
                        { offset: 1, color: 'rgba(84, 112, 198, 0.05)' }
                    ])
                }
            }]
        };
        
        chart.setOption(option);
    },
    
    // 初始化温度场图表
    initTempfieldCharts() {
        this.initTempfieldChart();
    },
    
    // 初始化温度场热力图
    initTempfieldChart() {
        const chartDom = document.getElementById('tempfield-chart');
        const chart = echarts.init(chartDom);
        
        // 生成模拟数据，与图片样式一致
        // 生成时间轴数据
        const timeValues = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date('2026-01-14');
            date.setDate(date.getDate() + i);
            timeValues.push(date.toISOString().slice(0, 10));
        }
        
        // 生成深度轴数据
        const depthValues = [];
        for (let i = 0; i <= 127; i++) {
            depthValues.push(-i);
        }
        
        // 生成温度场数据（热力图数据）
        const temperatureData = [];
        for (let i = 0; i < depthValues.length; i++) {
            const row = [];
            for (let j = 0; j < timeValues.length; j++) {
                // 模拟温度数据，根据深度生成不同范围的温度
                let baseTemp = 20;
                if (depthValues[i] >= -50 && depthValues[i] <= -45) {
                    baseTemp = 35; // 中间绿色区域温度较高
                } else if (depthValues[i] >= -10 && depthValues[i] <= -1) {
                    baseTemp = 25; // 顶部区域温度较高
                } else if (depthValues[i] >= -120 && depthValues[i] <= -80) {
                    baseTemp = 15; // 底部区域温度较低
                }
                // 添加随机波动
                const temp = baseTemp + (Math.random() - 0.5) * 5;
                row.push(temp.toFixed(2));
            }
            temperatureData.push(row);
        }
        
        // 生成右侧高程数据
        const elevationData = [];
        for (let i = 0; i < depthValues.length; i++) {
            // 模拟高程数据，随深度变化
            const elevation = 1024.94 - Math.abs(depthValues[i]) * 0.5;
            elevationData.push(elevation.toFixed(2));
        }
        
        const option = {
            title: {
                show: false
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                },
                formatter: function(params) {
                    return '深度: ' + params[0].value[0] + ' m<br/>温度: ' + params[0].value[2] + ' ℃<br/>高程: ' + elevationData[-params[0].value[0]] + ' m';
                }
            },
            grid: {
                left: '8%',
                right: '15%',
                bottom: '15%',
                top: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: timeValues,
                axisLabel: {
                    fontSize: 10,
                    rotate: 45
                },
                axisLine: {
                    lineStyle: {
                        color: '#666'
                    }
                },
                axisTick: {
                    alignWithLabel: true
                }
            },
            yAxis: [
                {
                    type: 'category',
                    data: depthValues,
                    axisLabel: {
                        fontSize: 10,
                        formatter: '{value} m'
                    },
                    axisLine: {
                        lineStyle: {
                            color: '#666'
                        }
                    },
                    splitLine: {
                        show: true,
                        lineStyle: {
                            color: '#f0f0f0'
                        }
                    }
                },
                {
                    type: 'category',
                    data: elevationData,
                    axisLabel: {
                        fontSize: 10,
                        formatter: '{value} m'
                    },
                    axisLine: {
                        show: true,
                        lineStyle: {
                            color: '#666'
                        }
                    },
                    axisTick: {
                        show: false
                    },
                    position: 'right'
                }
            ],
            visualMap: {
                type: 'continuous',
                min: 0,
                max: 40,
                orient: 'vertical',
                right: '5%',
                top: 'center',
                text: ['40℃', '0℃'],
                textStyle: {
                    fontSize: 10
                },
                inRange: {
                    color: ['#0000ff', '#00ffff', '#00ff00', '#ffff00', '#ff0000']
                },
                calculable: true
            },
            series: [{
                name: '温度场',
                type: 'heatmap',
                data: function() {
                    const data = [];
                    for (let i = 0; i < depthValues.length; i++) {
                        for (let j = 0; j < timeValues.length; j++) {
                            data.push([j, i, parseFloat(temperatureData[i][j])]);
                        }
                    }
                    return data;
                }(),
                label: {
                    show: false
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
        
        chart.setOption(option);
    },
    
    // 初始化切线角图表
    initAngleCharts() {
        this.initAngleChart();
    },
    
    // 初始化切线角折线图
    initAngleChart() {
        const chartDom = document.getElementById('angle-chart');
        const chart = echarts.init(chartDom);
        
        // 生成模拟数据，与图片样式一致
        const timeValues = [
            '2026-01-14 00:00:00',
            '2026-01-14 08:00:00',
            '2026-01-14 16:00:00',
            '2026-01-15 00:00:00',
            '2026-01-15 08:00:00',
            '2026-01-15 16:00:00',
            '2026-01-16 00:00:00',
            '2026-01-16 08:00:00',
            '2026-01-16 16:00:00',
            '2026-01-17 00:00:00',
            '2026-01-17 08:00:00',
            '2026-01-17 16:00:00',
            '2026-01-18 00:00:00',
            '2026-01-18 08:00:00',
            '2026-01-18 16:00:00',
            '2026-01-19 00:00:00',
            '2026-01-19 08:00:00',
            '2026-01-19 16:00:00',
            '2026-01-20 00:00:00',
            '2026-01-20 08:00:00',
            '2026-01-20 16:00:00',
            '2026-01-20 23:59:59'
        ];
        
        // 生成切线角数据
        const angleData = [
            45, 30, 60, 90, 85, 90, 88, 85, 90, 85, 45, 30, 0, -30, -45, 60, 90, 85, 90, 75, 60, 30
        ];
        
        const option = {
            title: {
                show: false
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    return params[0].name + '<br/>切线角: ' + params[0].value + ' °';
                }
            },
            grid: {
                left: '8%',
                right: '8%',
                bottom: '15%',
                top: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: timeValues,
                axisLabel: {
                    fontSize: 10,
                    rotate: 45
                },
                axisLine: {
                    lineStyle: {
                        color: '#666'
                    }
                },
                axisTick: {
                    alignWithLabel: true
                }
            },
            yAxis: {
                type: 'value',
                name: '切线角(°)',
                nameTextStyle: {
                    fontSize: 12
                },
                axisLabel: {
                    fontSize: 12
                },
                min: -90,
                max: 90,
                interval: 30,
                axisLine: {
                    lineStyle: {
                        color: '#666'
                    }
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        color: '#f0f0f0'
                    }
                },
                axisPointer: {
                    label: {
                        formatter: '{value} °'
                    }
                }
            },
            series: [{
                name: '-1米',
                type: 'line',
                data: angleData,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: {
                    color: '#5470c6',
                    width: 2
                },
                itemStyle: {
                    color: '#5470c6'
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(84, 112, 198, 0.3)' },
                        { offset: 1, color: 'rgba(84, 112, 198, 0.05)' }
                    ])
                },
                markArea: {
                    silent: true,
                    data: [
                        // 红色区域：破裂级 (α≥85°)
                        [{
                            yAxis: 85
                        }, {
                            yAxis: 90
                        }],
                        // 橙色区域：破裂级 (80°≤α<85°)
                        [{
                            yAxis: 80
                        }, {
                            yAxis: 85
                        }],
                        // 黄色区域：警示级 (45°<α<80°)
                        [{
                            yAxis: 45
                        }, {
                            yAxis: 80
                        }],
                        // 蓝色区域：警示级 (-45°≥α)
                        [{
                            yAxis: -90
                        }, {
                            yAxis: -45
                        }]
                    ],
                    itemStyle: {
                        color: function(params) {
                            if (params.dataIndex === 0) return 'rgba(255, 0, 0, 0.1)'; // 红色
                            if (params.dataIndex === 1) return 'rgba(255, 165, 0, 0.1)'; // 橙色
                            if (params.dataIndex === 2) return 'rgba(255, 255, 0, 0.1)'; // 黄色
                            if (params.dataIndex === 3) return 'rgba(0, 0, 255, 0.1)'; // 蓝色
                            return 'rgba(0, 0, 0, 0.1)';
                        }
                    }
                }
            }]
        };
        
        chart.setOption(option);
    },

    close() {
        document.getElementById('analysis-modal').style.display = 'none';
    },

    filterDevicesByRegion(regionValue) {
        const allDeep = Object.values(mapModule.pMeta).filter(m => m.type === 'SJ');
        const regionDeep = regionValue === "" ? allDeep : allDeep.filter(m => m.region === regionValue);
        this.renderDeviceItems(regionDeep);
    },

    renderDeviceItems(list) {
        const container = document.getElementById('device-items-container');
        if (!container) return;
        
        // 直接生成设备列表，不添加全选复选框
        let html = '';
        
        // 添加设备列表
        html += list.map(m => {
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
        
        container.innerHTML = html;
    },

    filterDeviceList(val) {
        const allDeep = Object.values(mapModule.pMeta).filter(m => m.type === 'SJ');
        const searchParts = val.split('、');
        const lastPart = searchParts[searchParts.length - 1].trim();
        const filtered = allDeep.filter(m =>
            m.deviceId.toLowerCase().includes(lastPart.toLowerCase()) || m.region.includes(lastPart)
        );
        this.renderDeviceItems(filtered);
        const inputParts = val.split('、').map(p => p.trim()).filter(p => p !== '');
        let newSelected = [];
        
        // 单选逻辑：只保留最后一个有效的设备ID
        if (inputParts.length > 0) {
            // 从后往前查找第一个有效的设备ID
            for (let i = inputParts.length - 1; i >= 0; i--) {
                let part = inputParts[i];
                let targetId = part;
                if (/^\d+$/.test(part)) targetId = 'SJ' + part;
                const exists = allDeep.some(m => m.deviceId === targetId);
                if (exists) {
                    newSelected = [targetId];
                    break;
                }
            }
        }
        
        if (newSelected.length > 0) {
            this.selectedDevices = newSelected;
            this.selectedDevices.forEach(devId => {
                if (!this.selectedMetricsMap[devId]) {
                    this.selectedMetricsMap[devId] = (this.selectedGlobalMetrics && this.selectedGlobalMetrics.length > 0) ?
                        [...this.selectedGlobalMetrics] : ['XY速度(mm/h)'];
                }
            });
            this.updateDeviceInputDisplay();
            this.renderMetricSelector();
            this.updateChartTitles(); // 更新图表标题
            this.query();
            this.updateMetricButtonLabel();
        } else if (val.trim() === '') {
            // 如果输入框为空，保持默认选中SJ45
            this.selectedDevices = ['SJ45'];
            if (!this.selectedMetricsMap['SJ45']) {
                this.selectedMetricsMap['SJ45'] = (this.selectedGlobalMetrics && this.selectedGlobalMetrics.length > 0) ?
                    [...this.selectedGlobalMetrics] : ['XY速度(mm/h)'];
            }
            this.updateDeviceInputDisplay();
            this.renderMetricSelector();
            this.updateChartTitles(); // 更新图表标题
            this.query();
            this.updateMetricButtonLabel();
        }
    },

    toggleDeviceMenu(show, event) {
        if (event) event.stopPropagation();
        const menu = document.getElementById('device-items-container');
        if (show === undefined) {
            // 切换显示状态
            menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
        } else {
            menu.style.display = show ? 'block' : 'none';
        }
        
        // 添加点击其他区域关闭菜单的事件监听
        const closeMenu = (e) => {
            const input = document.getElementById('an-device-input');
            const isClickInside = menu.contains(e.target) || input.contains(e.target);
            if (!isClickInside) {
                menu.style.display = 'none';
                document.removeEventListener('click', closeMenu);
            }
        };
        
        if (menu.style.display === 'block') {
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
            }, 0);
        }
    },

    handleDeviceToggle(cb) {
        const devId = cb.value;
        if (cb.checked) {
            // 单选逻辑：只保留当前选中的设备
            this.selectedDevices = [devId];
            this.selectedMetricsMap[devId] = (this.selectedGlobalMetrics && this.selectedGlobalMetrics.length > 0) ?
                [...this.selectedGlobalMetrics] : ['XY速度(mm/h)'];
            // 重新渲染设备列表，确保只有一个设备被选中
            const regionValue = document.getElementById('an-region').value;
            const allDeep = Object.values(mapModule.pMeta).filter(m => m.type === 'SJ');
            const currentDevices = regionValue === "" ? allDeep : allDeep.filter(m => m.region === regionValue);
            this.renderDeviceItems(currentDevices);
        } else {
            // 取消选择时，清空选择列表
            this.selectedDevices = [];
            delete this.selectedMetricsMap[devId];
        }
        this.updateDeviceInputDisplay();
        this.renderMetricSelector();
        this.updateMetricButtonLabel();
        this.updateChartTitles(); // 更新图表标题
        this.query();
    },

    updateDeviceInputDisplay() {
        const input = document.getElementById('an-device-input');
        input.value = this.selectedDevices.join('、');
    },
    
    // 时间按钮点击事件处理
    handleTimeButtonClick(days) {
        // 更新时间按钮激活状态
        document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        // 根据天数设置时间范围
        const now = new Date();
        const startDate = new Date();
        startDate.setDate(now.getDate() - days);
        
        // 设置日期时间输入框的值
        const formatLocalISO = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('an-start').value = formatLocalISO(startDate);
        document.getElementById('an-end').value = formatLocalISO(now);
        
        // 执行查询
        this.query();
    },
    
    // 搜索按钮点击事件处理
    handleSearchClick() {
        this.query();
    },
    
    
    // 初始化数据点图表
    initDataPointCharts() {
        // 直接使用默认数据初始化图表
        this.initCumulativeDisplacementChart();
        this.initRelativeDisplacementChart();
        this.init3DModelChart();
        // 更新图表标题
        this.updateChartTitles();
    },
    
    // 更新图表标题
    updateChartTitles() {
        // 获取当前选中的设备ID
        const deviceId = this.selectedDevices[0] || 'SJ45';
        
        // 更新数据点图表的标题
        const cumulativeTitle = document.querySelector('#tab-datapoint .data-points-charts .data-point-chart:nth-child(1) .chart-subtitle');
        const relativeTitle = document.querySelector('#tab-datapoint .data-points-charts .data-point-chart:nth-child(2) .chart-subtitle');
        const model3DTitle = document.querySelector('#tab-datapoint .data-points-charts .data-point-chart:nth-child(3) .chart-subtitle');
        
        if (cumulativeTitle) {
            cumulativeTitle.textContent = `${deviceId} (2024.12.2清零) - 小时-累计位移数据图`;
        }
        if (relativeTitle) {
            relativeTitle.textContent = `${deviceId} (2024.12.2清零) - 小时-相对位移数据图`;
        }
        if (model3DTitle) {
            model3DTitle.textContent = `${deviceId} (2024.12.2清零) - 小时-三维构型图`;
        }
        
        // 更新趋势图的标题
        const cumulativeTrendSubtitle = document.querySelector('#tab-trend .data-points-charts .data-point-chart:nth-child(1) .chart-subtitle');
        const relativeTrendSubtitle = document.querySelector('#tab-trend .data-points-charts .data-point-chart:nth-child(2) .chart-subtitle');
        
        if (cumulativeTrendSubtitle) {
            cumulativeTrendSubtitle.textContent = `${deviceId} (2024.12.2清零) - 累计趋势图`;
        }
        if (relativeTrendSubtitle) {
            relativeTrendSubtitle.textContent = `${deviceId} (2024.12.2清零) - 相对趋势图`;
        }
        
        // 更新聚类滑面关联图表的标题
        const clusterTrendSubtitle = document.getElementById('cluster-cumulative-subtitle');
        const slidingSurfaceSubtitle = document.getElementById('cluster-sliding-subtitle');
        
        if (clusterTrendSubtitle) {
            clusterTrendSubtitle.textContent = `${deviceId} (2024.12.2清零) - 累计趋势图`;
        }
        if (slidingSurfaceSubtitle) {
            slidingSurfaceSubtitle.textContent = `${deviceId} (2024.12.2清零) - 滑坡滑动面智能判识图`;
        }
        
        // 更新节点位移图表的标题
        const nodeDispSubtitle = document.getElementById('nodedisp-subtitle');
        if (nodeDispSubtitle) {
            nodeDispSubtitle.textContent = `${deviceId} (2024.12.2清零) - 节点位移图`;
        }
        
        // 更新地层运动轨迹图表的标题
        const trajectorySubtitle = document.getElementById('trajectory-subtitle');
        if (trajectorySubtitle) {
            trajectorySubtitle.textContent = `${deviceId} (2024.12.2清零) - 地层运动轨迹图`;
        }
        
        // 更新节点温度图表的标题
        const nodetempSubtitle = document.getElementById('nodetemp-subtitle');
        if (nodetempSubtitle) {
            nodetempSubtitle.textContent = `${deviceId} (2024.12.2清零) - 节点温度图`;
        }
        
        // 更新温度场图表的标题
        const tempfieldSubtitle = document.getElementById('tempfield-subtitle');
        if (tempfieldSubtitle) {
            tempfieldSubtitle.textContent = `${deviceId} (2024.12.2清零) - 温度场热力图`;
        }
        
        // 更新切线角图表的标题
        const angleSubtitle = document.getElementById('angle-subtitle');
        if (angleSubtitle) {
            angleSubtitle.textContent = `${deviceId} (2024.12.2清零) - 切线角数据图`;
        }
    },
    
    // 初始化累计位移数据图
    initCumulativeDisplacementChart() {
        const chartDom = document.getElementById('cumulative-displacement-chart');
        const chart = echarts.init(chartDom);
        
        // 生成模拟数据，与图片样式一致
        const depthValues = [-78, -75, -72, -69, -66, -63, -60, -57, -54, -51, -48, -45, -42, -39, -36, -33, -30, -27, -24, -21, -18, -15, -12, -9, -6, -3, 0];
        const combinedData = [15, 12, 18, 15, 20, 18, 22, 20, 25, 23, 28, 25, 30, 28, 32, 30, 35, 33, 38, 35, 40, 38, 42, 40, 45, 43, 48];
        const xAxisData = [5, 3, 8, 6, 11, 9, 14, 12, 16, 14, 18, 16, 20, 18, 22, 20, 24, 22, 26, 24, 28, 26, 30, 28, 32, 30, 35];
        const yAxisData = [3, 1, 5, 3, 7, 5, 9, 7, 11, 9, 13, 11, 15, 13, 17, 15, 19, 17, 21, 19, 23, 21, 25, 23, 27, 25, 30];
        const zAxisData = [7, 4, 10, 7, 13, 10, 16, 13, 19, 16, 22, 19, 25, 22, 28, 25, 31, 28, 34, 31, 37, 34, 40, 37, 43, 40, 45];
        
        // 计算深度中间点，用于划分上下两部分
        const middleDepth = -39; // -78到0的中间位置
        
        // 创建背景填充系列
        const backgroundSeries = [
            // 下半部分：黄色纯色填充（第四系）
            {
                name: '第四系',
                type: 'line',
                data: [
                    [-5, -78],
                    [30, -78],
                    [30, middleDepth],
                    [-5, middleDepth],
                    [-5, -78]
                ],
                areaStyle: {
                    color: 'rgba(255, 240, 0, 0.6)' // 黄色纯色填充
                },
                lineStyle: {
                    color: 'transparent'
                },
                itemStyle: {
                    color: 'rgba(255, 240, 0, 1)' // 为图例设置不透明颜色
                },
                symbol: 'rect', // 为图例设置矩形图标
                symbolSize: [10, 10],
                z: -1,
                silent: true,
                // 确保图例可见
                showSymbol: true
            },
            // 上半部分：橙色斜线填充（排弃物料）
            {
                name: '排弃物料',
                type: 'line',
                data: [
                    [-5, middleDepth],
                    [30, middleDepth],
                    [30, 0],
                    [-5, 0],
                    [-5, middleDepth]
                ],
                areaStyle: {
                    // 使用线性渐变模拟斜线效果
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 1,
                        y2: 0,
                        colorStops: [
                            { offset: 0, color: 'rgba(255, 165, 0, 0.8)' },
                            { offset: 0.5, color: 'rgba(255, 165, 0, 0.4)' },
                            { offset: 1, color: 'rgba(255, 165, 0, 0.8)' }
                        ],
                        global: false
                    }
                },
                lineStyle: {
                    color: 'transparent'
                },
                itemStyle: {
                    color: 'rgba(255, 165, 0, 1)' // 为图例设置不透明颜色
                },
                symbol: 'rect', // 为图例设置矩形图标
                symbolSize: [10, 10],
                z: -1,
                silent: true,
                // 确保图例可见
                showSymbol: true
            }
        ];
        
        const option = {
            title: {
                show: false
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                }
            },
            legend: {
                data: ['合位移', 'X轴位移', 'Y轴位移', 'Z轴位移', '第四系', '排弃物料'],
                textStyle: {
                    fontSize: 10
                },
                top: 'bottom',
                left: 'center'
            },
            grid: {
                left: '10%',
                right: '10%',
                bottom: '15%',
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: '位移量(mm)',
                nameLocation: 'middle',
                nameGap: 20,
                nameTextStyle: {
                    fontSize: 10
                },
                axisLabel: {
                    fontSize: 10
                },
                min: -5,
                max: 30,
                interval: 5
            },
            yAxis: [
                {
                    type: 'value',
                    name: '深度(m)',
                    nameTextStyle: {
                        fontSize: 10
                    },
                    axisLabel: {
                        fontSize: 10
                    },
                    min: -78,
                    max: 0,
                    interval: 3
                },
                {
                    type: 'value',
                    name: '高程(m)',
                    nameTextStyle: {
                        fontSize: 10
                    },
                    axisLabel: {
                        fontSize: 10
                    },
                    min: 812.15,
                    max: 890.15,
                    interval: 3,
                    position: 'right'
                }
            ],
            series: [
                // 添加背景填充系列
                ...backgroundSeries,
                {
                    name: '合位移',
                    type: 'line',
                    data: depthValues.map((depth, index) => [combinedData[index], depth]),
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: {
                        color: '#5470c6',
                        width: 2
                    },
                    itemStyle: {
                        color: '#5470c6'
                    }
                },
                {
                    name: 'X轴位移',
                    type: 'line',
                    data: depthValues.map((depth, index) => [xAxisData[index], depth]),
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: {
                        color: '#91cc75',
                        width: 2
                    },
                    itemStyle: {
                        color: '#91cc75'
                    }
                },
                {
                    name: 'Y轴位移',
                    type: 'line',
                    data: depthValues.map((depth, index) => [yAxisData[index], depth]),
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: {
                        color: '#fac858',
                        width: 2
                    },
                    itemStyle: {
                        color: '#fac858'
                    }
                },
                {
                    name: 'Z轴位移',
                    type: 'line',
                    data: depthValues.map((depth, index) => [zAxisData[index], depth]),
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: {
                        color: '#ee6666',
                        width: 2
                    },
                    itemStyle: {
                        color: '#ee6666'
                    }
                }
            ]
        };
        
        chart.setOption(option);
    },
    
    // 初始化相对位移数据图
    initRelativeDisplacementChart() {
        const chartDom = document.getElementById('relative-displacement-chart');
        const chart = echarts.init(chartDom);
        
        // 生成模拟数据，与图片样式一致
        const depthValues = [-78, -75, -72, -69, -66, -63, -60, -57, -54, -51, -48, -45, -42, -39, -36, -33, -30, -27, -24, -21, -18, -15, -12, -9, -6, -3, 0];
        const combinedRelativeData = [10, 8, 12, 10, 14, 12, 16, 14, 18, 16, 20, 18, 22, 20, 24, 22, 26, 24, 28, 26, 30, 28, 32, 30, 34, 32, 36];
        const xAxisRelativeData = [3, 1, 5, 3, 7, 5, 9, 7, 11, 9, 13, 11, 15, 13, 17, 15, 19, 17, 21, 19, 23, 21, 25, 23, 27, 25, 29];
        const yAxisRelativeData = [1, -1, 3, 1, 5, 3, 7, 5, 9, 7, 11, 9, 13, 11, 15, 13, 17, 15, 19, 17, 21, 19, 23, 21, 25, 23, 27];
        
        // 计算深度中间点，用于划分上下两部分
        const middleDepth = -39; // -78到0的中间位置
        
        // 创建背景填充系列
        const backgroundSeries = [
            // 下半部分：黄色纯色填充（第四系）
            {
                name: '第四系',
                type: 'line',
                data: [
                    [-5, -78],
                    [30, -78],
                    [30, middleDepth],
                    [-5, middleDepth],
                    [-5, -78]
                ],
                areaStyle: {
                    color: 'rgba(255, 240, 0, 0.6)' // 黄色纯色填充
                },
                lineStyle: {
                    color: 'transparent'
                },
                itemStyle: {
                    color: 'rgba(255, 240, 0, 1)' // 为图例设置不透明颜色
                },
                symbol: 'rect', // 为图例设置矩形图标
                symbolSize: [10, 10],
                z: -1,
                silent: true,
                // 确保图例可见
                showSymbol: true
            },
            // 上半部分：橙色斜线填充（排弃物料）
            {
                name: '排弃物料',
                type: 'line',
                data: [
                    [-5, middleDepth],
                    [30, middleDepth],
                    [30, 0],
                    [-5, 0],
                    [-5, middleDepth]
                ],
                areaStyle: {
                    // 使用线性渐变模拟斜线效果
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 1,
                        y2: 0,
                        colorStops: [
                            { offset: 0, color: 'rgba(255, 165, 0, 0.8)' },
                            { offset: 0.5, color: 'rgba(255, 165, 0, 0.4)' },
                            { offset: 1, color: 'rgba(255, 165, 0, 0.8)' }
                        ],
                        global: false
                    }
                },
                lineStyle: {
                    color: 'transparent'
                },
                itemStyle: {
                    color: 'rgba(255, 165, 0, 1)' // 为图例设置不透明颜色
                },
                symbol: 'rect', // 为图例设置矩形图标
                symbolSize: [10, 10],
                z: -1,
                silent: true,
                // 确保图例可见
                showSymbol: true
            }
        ];
        
        const option = {
            title: {
                show: false
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                }
            },
            legend: {
                data: ['相对合位移', 'X轴相对位移', 'Y轴相对位移', '第四系', '排弃物料'],
                textStyle: {
                    fontSize: 10
                },
                top: 'bottom',
                left: 'center'
            },
            grid: {
                left: '10%',
                right: '10%',
                bottom: '15%',
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: '位移量(mm)',
                nameLocation: 'middle',
                nameGap: 20,
                nameTextStyle: {
                    fontSize: 10
                },
                axisLabel: {
                    fontSize: 10
                },
                min: -5,
                max: 30,
                interval: 5
            },
            yAxis: [
                {
                    type: 'value',
                    name: '深度(m)',
                    nameTextStyle: {
                        fontSize: 10
                    },
                    axisLabel: {
                        fontSize: 10
                    },
                    min: -78,
                    max: 0,
                    interval: 3
                },
                {
                    type: 'value',
                    name: '高程(m)',
                    nameTextStyle: {
                        fontSize: 10
                    },
                    axisLabel: {
                        fontSize: 10
                    },
                    min: 812.15,
                    max: 890.15,
                    interval: 3,
                    position: 'right'
                }
            ],
            series: [
                // 添加背景填充系列
                ...backgroundSeries,
                {
                    name: '相对合位移',
                    type: 'line',
                    data: depthValues.map((depth, index) => [combinedRelativeData[index], depth]),
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: {
                        color: '#5470c6',
                        width: 2
                    },
                    itemStyle: {
                        color: '#5470c6'
                    }
                },
                {
                    name: 'X轴相对位移',
                    type: 'line',
                    data: depthValues.map((depth, index) => [xAxisRelativeData[index], depth]),
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: {
                        color: '#91cc75',
                        width: 2
                    },
                    itemStyle: {
                        color: '#91cc75'
                    }
                },
                {
                    name: 'Y轴相对位移',
                    type: 'line',
                    data: depthValues.map((depth, index) => [yAxisRelativeData[index], depth]),
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: {
                        color: '#fac858',
                        width: 2
                    },
                    itemStyle: {
                        color: '#fac858'
                    }
                }
            ]
        };
        
        chart.setOption(option);
    },
    
    // 初始化三维构型图
    init3DModelChart() {
        const chartDom = document.getElementById('3d-model-chart');
        
        // 确保图表容器有正确的尺寸
        chartDom.style.height = '300px';
        chartDom.style.width = '100%';
        chartDom.style.backgroundColor = '#f9f9f9';
        
        const chart = echarts.init(chartDom);
        
        // 生成固定的、数量适中的数据点，便于测试tooltip
        const dataPoints = [
            [0, 0, 0],
            [5, 5, 10000],
            [10, 0, 20000],
            [5, -5, 30000],
            [0, 0, 40000],
            [-5, 5, 50000],
            [-10, 0, 60000],
            [-5, -5, 70000],
            [0, 0, 80000]
        ];
        
        try {
            const option = {
                tooltip: {
                    trigger: 'item',
                    triggerOn: 'mousemove',
                    showDelay: 0,
                    hideDelay: 500,
                    formatter: function(params) {
                        return '深度: ' + (params.value[2]/1000).toFixed(1) + 'mm<br/>' +
                               'X: ' + params.value[0].toFixed(2) + 'mm<br/>' +
                               'Y: ' + params.value[1].toFixed(2) + 'mm';
                    }
                },
                xAxis3D: {
                    type: 'value',
                    name: 'X',
                    min: -40000,
                    max: 40000,
                    interval: 20000
                },
                yAxis3D: {
                    type: 'value',
                    name: 'Y',
                    min: -40000,
                    max: 40000,
                    interval: 20000
                },
                zAxis3D: {
                    type: 'value',
                    name: '深度(mm)',
                    min: 0,
                    max: 80000,
                    interval: 20000
                },
                grid3D: {
                    viewControl: {
                        enabled: true
                    }
                },
                series: [{
                    type: 'line3D',
                    data: dataPoints,
                    lineStyle: {
                        color: '#5470c6',
                        width: 8
                    },
                    symbol: 'circle',
                    symbolSize: 10
                }]
            };
            
            chart.setOption(option);
            console.log('3D chart initialized successfully');
        } catch (error) {
            console.error('Error initializing 3D chart:', error);
            // 如果3D图表失败，显示一个简单的2D图表作为备选
            const backupOption = {
                tooltip: {
                    trigger: 'axis'
                },
                xAxis: {
                    type: 'category',
                    data: ['0m', '20m', '40m', '60m', '80m']
                },
                yAxis: {
                    type: 'value',
                    name: '位移(mm)'
                },
                series: [{
                    data: [0, 10, 20, 30, 40],
                    type: 'line',
                    smooth: true,
                    lineStyle: {
                        color: '#5470c6',
                        width: 3
                    },
                    symbol: 'circle',
                    symbolSize: 5
                }]
            };
            chart.setOption(backupOption);
        }
    },
    
    // 初始化三维姿态图
    init3DPostureChart() {
        const chartDom = document.getElementById('3d-posture-chart');
        
        // 确保图表容器有正确的尺寸
        chartDom.style.height = '500px';
        chartDom.style.width = '100%';
        chartDom.style.backgroundColor = '#f9f9f9';
        
        // 保存chart对象到实例属性，以便在事件监听器中访问
        this._3dPostureChart = echarts.init(chartDom);
        const chart = this._3dPostureChart;
        
        // 生成三维姿态数据
        const dataPoints = [];
        const maxDepth = 80000;
        const step = 5000;
        
        // 生成螺旋线数据，模拟三维姿态
        for (let depth = 0; depth <= maxDepth; depth += step) {
            const angle = (depth / maxDepth) * Math.PI * 8; // 8圈螺旋
            const radius = 20000 * (1 - depth / maxDepth); // 半径逐渐减小
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            dataPoints.push([x, y, depth]);
        }
        
        try {
            const option = {
                tooltip: {
                    trigger: 'item',
                    formatter: function(params) {
                        return '深度: ' + (params.value[2]/1000).toFixed(1) + 'm<br/>' +
                               'X: ' + params.value[0].toFixed(2) + 'mm<br/>' +
                               'Y: ' + params.value[1].toFixed(2) + 'mm';
                    }
                },
                xAxis3D: {
                    type: 'value',
                    name: 'X',
                    min: -40000,
                    max: 40000,
                    interval: 20000
                },
                yAxis3D: {
                    type: 'value',
                    name: 'Y',
                    min: -40000,
                    max: 40000,
                    interval: 20000
                },
                zAxis3D: {
                    type: 'value',
                    name: '深度(m)',
                    min: 0,
                    max: 80000,
                    interval: 20000
                },
                grid3D: {
                    viewControl: {
                        enabled: true,
                        projection: 'perspective',
                        alpha: 45,
                        beta: 45
                    }
                },
                series: [{
                    type: 'line3D',
                    data: dataPoints,
                    lineStyle: {
                        color: '#5470c6',
                        width: 6
                    },
                    symbol: 'circle',
                    symbolSize: 8
                }]
            };
            
            chart.setOption(option);
            console.log('3D posture chart initialized successfully');
            
            // 添加视图切换事件监听器
            this.add3DViewSwitchListener();
        } catch (error) {
            console.error('Error initializing 3D posture chart:', error);
            // 如果3D图表失败，显示一个简单的2D图表作为备选
            const backupOption = {
                tooltip: {
                    trigger: 'axis'
                },
                xAxis: {
                    type: 'category',
                    data: ['0m', '20m', '40m', '60m', '80m']
                },
                yAxis: {
                    type: 'value',
                    name: '位移(mm)'
                },
                series: [{
                    data: [0, 15, 10, 25, 20],
                    type: 'line',
                    smooth: true,
                    lineStyle: {
                        color: '#5470c6',
                        width: 3
                    },
                    symbol: 'circle',
                    symbolSize: 5
                }]
            };
            chart.setOption(backupOption);
        }
    },
    
    // 添加三维视图切换监听器
    add3DViewSwitchListener() {
        const select = document.getElementById('3d-view-select');
        if (select) {
            select.addEventListener('change', (e) => {
                this.switch3DView(e.target.value);
            });
        }
    },
    
    // 切换三维视图
    switch3DView(viewType) {
        if (!this._3dPostureChart) return;
        
        let alpha, beta;
        switch (viewType) {
            case 'left': // 正视图 -> 原俯视图 (X-Y平面)
                alpha = 0;
                beta = 0;
                break;
            case 'front': // 俯视图 -> 原左视图 (X-Z平面)
                alpha = 0;
                beta = 90;
                break;
            case 'top': // 左视图 -> 原正视图 (Y-Z平面)
                alpha = 90;
                beta = 0;
                break;
            case 'free': // 自由视图
                alpha = 45;
                beta = 45;
                break;
            default:
                alpha = 45;
                beta = 45;
        }
        
        this._3dPostureChart.setOption({
            grid3D: {
                viewControl: {
                    alpha: alpha,
                    beta: beta
                }
            }
        });
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
            this.selectedGlobalMetrics = ['XY速度(mm/h)'];
        }
        container.innerHTML = this.allMetrics.map(metric => {
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
        this.renderVectorChart();
        this.renderTable();
    },

    renderCurveChart() {
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
            const baseHex = this.deviceColors[devIdx % this.deviceColors.length];
            const isOnline = (Object.values(mapModule.pMeta).find(m => m.deviceId === devId) || {}).isOnline;
            const metrics = this.selectedMetricsMap[devId] || [];
            const r = parseInt(baseHex.slice(1, 3), 16);
            const g = parseInt(baseHex.slice(3, 5), 16);
            const b = parseInt(baseHex.slice(5, 7), 16);
            metrics.forEach((metric, mIdx) => {
                const metricRefIdx = this.allMetrics.indexOf(metric);
                const alpha = Math.max(0.3, 1 - (mIdx * 0.2));
                const metricColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                series.push({
                    name: `${devId}-${metric}`,
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    lineStyle: {
                        color: metricColor,
                        type: this.lineStyles[metricRefIdx % this.lineStyles.length],
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
    },

    renderVectorChart() {
        const el = document.getElementById('vector-chart-main');
        if (this.charts.vector) this.charts.vector.dispose();
        this.charts.vector = echarts.init(el);
        const startInput = document.getElementById('an-start').value;
        const endInput = document.getElementById('an-end').value;
        const start = new Date(startInput);
        const end = new Date(endInput);
        const freq = document.getElementById('traj-freq').value;
        const intervals = {
            'hour': 3600000,
            'day': 86400000,
            'week': 604800000
        };
        const interval = intervals[freq] || 86400000;
        const steps = Math.min(Math.max(1, Math.floor((end - start) / interval)), 100);
        const series = this.selectedDevices.map((devId, devIdx) => {
            const devColor = this.deviceColors[devIdx % this.deviceColors.length];
            const meta = Object.values(mapModule.pMeta).find(m => m.deviceId === devId) || {
                alarmIdx: 4,
                isOnline: true
            };
            const devSeed = devId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
            const baseAngleRad = (devSeed % 360) * (Math.PI / 180);
            let cx = 0,
                cy = 0;
            const path = [
                [0, 0]
            ];
            if (meta.isOnline) {
                const baseSpeed = [1.2, 0.8, 0.5, 0.3, 0.1][meta.alarmIdx] || 0.1;
                for (let i = 1; i <= steps; i++) {
                    const ts = start.getTime() + i * interval;
                    let noiseX = 0,
                        noiseY = 0;
                    if (freq === 'hour') {
                        noiseX = Math.sin(ts / 500000) * 0.2;
                        noiseY = Math.cos(ts / 500000) * 0.2;
                    }
                    const stepDistance = baseSpeed * (interval / 3600000);
                    cx += stepDistance * Math.cos(baseAngleRad) + noiseX;
                    cy += stepDistance * Math.sin(baseAngleRad) + noiseY;
                    path.push([parseFloat(cx.toFixed(3)), parseFloat(cy.toFixed(3))]);
                }
            }
            return {
                name: devId,
                type: 'line',
                data: path,
                smooth: freq !== 'hour',
                showSymbol: true,
                clip: false,
                symbol: (val, params) => params.dataIndex === 0 ? 'circle' : 'arrow',
                symbolSize: (val, params) => params.dataIndex === 0 ? 6 : 10,
                symbolRotate: (val, params) => {
                    if (params.dataIndex > 0) {
                        const curr = path[params.dataIndex];
                        const prev = path[params.dataIndex - 1];
                        const angleRad = Math.atan2(curr[1] - prev[1], curr[0] - prev[0]);
                        return (angleRad * 180 / Math.PI) - 90;
                    }
                    return 0;
                },
                lineStyle: {
                    width: meta.alarmIdx === 0 ? 3 : 2,
                    color: devColor,
                    opacity: 0.8
                },
                itemStyle: {
                    color: devColor
                },
                z: 10
            };
        });
        this.charts.vector.setOption({
            tooltip: {
                trigger: 'item',
                formatter: (p) => `${p.seriesName}<br/>累积 ΔX: ${p.data[0]} mm<br/>累积 ΔY: ${p.data[1]} mm`
            },
            legend: {
                bottom: 0,
                type: 'scroll',
                textStyle: {
                    fontSize: 11
                }
            },
            grid: {
                top: 40,
                left: 20,
                right: 60,
                bottom: 50,
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: 'ΔX (mm)',
                scale: true,
                splitLine: {
                    lineStyle: {
                        type: 'dashed',
                        opacity: 0.2
                    }
                },
                axisLabel: {
                    fontSize: 10
                }
            },
            yAxis: {
                type: 'value',
                name: 'ΔY (mm)',
                scale: true,
                splitLine: {
                    lineStyle: {
                        type: 'dashed',
                        opacity: 0.2
                    }
                },
                axisLabel: {
                    fontSize: 10
                }
            },
            series: series
        });
    },

    renderTable() {
        const head = document.getElementById('full-table-head');
        const body = document.getElementById('full-table-body');
        const cols = ['序号', '区域', '编号', '时间', '基准X', '基准Y', '基准H', 'X位移(mm)', 'Y位移(mm)', 'H位移(mm)', 'XY位移(mm)', 'XYH位移(mm)', 'X累积位移(mm)', 'Y累积位移(mm)', 'H累积位移(mm)', 'XY累积位移(mm)', 'XYH累积位移(mm)', 'X速度(mm/h)', 'Y速度(mm/h)', 'H速度(mm/h)', 'XY速度(mm/h)', 'XYH速度(mm/h)', 'X速度(mm/h)', 'Y速度(mm/h)', 'H速度(mm/h)', '切线角'];
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
                rows += `<tr>
                <td>${count++}</td>
                <td>${meta.region}</td>
                <td style="color:#1c3d90; font-weight:bold;">${devId}</td>
                <td>${new Date(curTs).toLocaleString()}</td>
                <td>2450.55</td><td>1300.12</td><td>1150.00</td>
                <td>${(spXY*0.12).toFixed(2)}</td><td>${(spXY*0.09).toFixed(2)}</td><td>0.01</td>
                <td>${(dispXY*0.2).toFixed(2)}</td><td>${(dispXY*0.25).toFixed(2)}</td>
                <td>${(dispXY*5.2).toFixed(2)}</td><td>${(dispXY*3.1).toFixed(2)}</td><td>5.2</td>
                <td>34.7</td><td>35.1</td>
                <td style="color:${speedColor}; font-weight:bold;">${spXY}</td>
                <td>${(spXY*0.6).toFixed(2)}</td><td>${(spXY*0.1).toFixed(2)}</td>
                <td>${spXY}</td><td>${spXY}</td>
                <td>0.05</td><td>0.03</td><td>0.01</td><td>12.5°</td>
            </tr>`;
                if (count % 500 === 0) break;
            }
        });
        body.innerHTML = rows || '<tr><td colspan="26">暂无数据，请检查时间范围及监测点选择</td></tr>';
    },

    exportChart(type) {
        const chart = type === 'curve' ? this.charts.curve : this.charts.vector;
        const link = document.createElement('a');
        link.href = chart.getDataURL({
            pixelRatio: 2,
            backgroundColor: '#fff'
        });
        link.download = `分析_${type}.png`;
        link.click();
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
        const fileName = `SJ设备数据分析_${new Date().getTime()}.csv`;
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
    appLogic.switchType('SJ');
    const defaultBtn = document.querySelector('.freq-btn');
    if (defaultBtn) mapModule.setTime(1, defaultBtn);
    mapFilterModule.init();
    
    // 初始化选项卡切换逻辑
    if (analysisModule && analysisModule.initTabs) {
        analysisModule.initTabs();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const panels = document.querySelectorAll('.glass-panel');
        let targetPanel = null;
        panels.forEach(p => {
            if (p.innerText.includes('监测点累计位移数据图')) targetPanel = p;
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