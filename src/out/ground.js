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


/*抽屉逻辑*/
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

    /* 修改 mapFilterModule.init 函数 */
    init() {
        window.addEventListener('click', (e) => {
            if (!e.target.closest('.filter-group') && !e.target.closest('.custom-dropdown-content')) {
                document.querySelectorAll('.custom-dropdown-content').forEach(d => d.style.display = 'none');
            }
        });
        // 初始状态：全选区域，开启 地下水监测 (GROUND)
        this.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
        this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'GROUND');
        this.activeTypes.add('GROUND');
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

    // 1. 修改获取显示点位的逻辑 (约 580 行)
    getDisplayPoints(filterVal = '') {
        // 将过滤类型改为 'GROUND'
        const allGround = Object.keys(mapModule.pMeta)
            .filter(id => mapModule.pMeta[id].type === 'GROUND')
            .map(id => ({ id, ...mapModule.pMeta[id] }));

        let list = [];
        if (this.selectedRegions.length === 0 || this.selectedRegions.includes('全部')) {
            list = allGround;
        } else {
            const cleanRegions = this.selectedRegions.filter(r => r !== '全部');
            list = allGround.filter(p => cleanRegions.includes(p.region));
        }

        if (filterVal && filterVal !== '全部' && !filterVal.includes('、')) {
            list = list.filter(p =>
                p.deviceId.toLowerCase().includes(filterVal.toLowerCase()) ||
                p.deviceId.replace('GROUND','').includes(filterVal) // 匹配编号
            );
        }
        return list;
    },

    renderPoints(filterVal = '') {
        const container = document.getElementById('map-point-dropdown');
        if (!container) return;

        const displayList = this.getDisplayPoints(filterVal);

        // 【核心修改】：按名称排序，实现分类排布
        displayList.sort((a, b) => a.deviceId.localeCompare(b.deviceId, 'zh-Hans-CN', {numeric: true}));

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
// 2. 修改区域联动逻辑 (约 625 行)
    handleRegionChange(cb) {
        const val = cb.value;
        const allRegions = ['北帮', '南帮', '东帮', '西帮', '中央区'];
        // 过滤类型改为 'GROUND'
        const allGroundIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'GROUND');
        const dropdown = document.getElementById('map-region-dropdown');

        if (val === '全部') {
            if (cb.checked) {
                this.selectedRegions = ['全部', ...allRegions];
                this.selectedPoints = [...allGroundIds];
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
                    const regionPoints = allGroundIds.filter(id => mapModule.pMeta[id].region === val);
                    regionPoints.forEach(id => { if (!this.selectedPoints.includes(id)) this.selectedPoints.push(id); });
                }
                const subSelected = this.selectedRegions.filter(r => r !== '全部');
                if (subSelected.length === allRegions.length) {
                    if (!this.selectedRegions.includes('全部')) this.selectedRegions.push('全部');
                }
            } else {
                this.selectedRegions = this.selectedRegions.filter(r => r !== val && r !== '全部');
                const regionPoints = allGroundIds.filter(id => mapModule.pMeta[id].region === val);
                this.selectedPoints = this.selectedPoints.filter(id => !regionPoints.includes(id));
            }
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
    const val = document.getElementById('an-point-input')?.value.trim();
    const allGround = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'GROUND');

    if (!val || val === '全部') {
        this.selectedPoints = (val === '全部') ? [...allGround] : [];
        this.selectedRegions = (val === '全部') ? ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'] : [];
    } else {
        const parts = val.split(/[、,，\s]/).map(p => p.trim()).filter(p => p !== '');
        this.selectedPoints = [];
        this.selectedRegions = [];
        parts.forEach(part => {
            // 【核心修改】：直接匹配 deviceId (即 水位计N 或 流量计N)
            const matchedId = allGround.find(id => {
                const deviceId = mapModule.pMeta[id]?.deviceId || "";
                return deviceId.includes(part);
            });

            if (matchedId) {
                if (!this.selectedPoints.includes(matchedId)) this.selectedPoints.push(matchedId);
                if (!this.selectedRegions.includes(mapModule.pMeta[matchedId].region)) {
                    this.selectedRegions.push(mapModule.pMeta[matchedId].region);
                }
            }
        });
        if (this.selectedRegions.length === 5) this.selectedRegions.push('全部');
    }
    this.syncFilterUI();
    this.query();
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
            const isPointChecked = (meta.type === 'GNSS'||meta.type === 'GROUND') ? this.selectedPoints.includes(p.id) : true;

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


spawnPoints() {
    const cv = document.getElementById('map-canvas');
    const icons = { 'GNSS': '📍', 'DEEP': '⚓', 'RADAR': '📡', 'SURFACE': '📐', 'CRACK': '🧱', 'FIRE': '🔥', 'WATER': '💧', 'GROUND': '🌍', 'STRESS': '📊', 'VIB': '💥', 'SAT': '🛸' };
    const types = Object.keys(icons);
    const regionDefinitions = [{ name: '北帮', xRange: [800, 2200], yRange: [200, 600] }, { name: '南帮', xRange: [800, 2200], yRange: [1900, 2300] }, { name: '西帮', xRange: [200, 700], yRange: [800, 1700] }, { name: '东帮', xRange: [2300, 2800], yRange: [800, 1700] }, { name: '中央区', xRange: [1100, 1900], yRange: [1000, 1500] }];
    const placedPoints = [];
    const minDist = 60;
    let redGnssCount = 0;

    // 地下水分类计数器
    let waterLevelCount = 0;
    let flowCount = 0;

    for (let i = 0; i < 150; i++) {
        let type = types[i % types.length];
        if (i < 7) type = 'RADAR';
        else if (type === 'RADAR') type = 'GNSS';

        let alarmIdx = (i * 7) % 5;
        const isOnline = (i % 8 !== 0);
        if (type === 'GNSS' && alarmIdx === 0) {
            if (redGnssCount < 2) redGnssCount++; else alarmIdx = 4;
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

        // 【核心修改】：地下水名称分类与编号逻辑
        let deviceId = `${type}${i}`;
        if (type === 'GROUND') {
            if (i % 2 === 0) {
                waterLevelCount++;
                deviceId = `水位计${waterLevelCount}`;
            } else {
                flowCount++;
                deviceId = `流量计${flowCount}`;
            }
        }

        this.pMeta[p.id] = { id: p.id, type, alarmIdx, isOnline, deviceId, region: regDef.name };

        p.innerHTML = `<div class="point-bubble"><span>${icons[type]}</span></div><div class="point-id">${deviceId}</div>`;

        if (type === 'GNSS' && isOnline) {
            const arrow = document.createElement('div');
            arrow.className = 'map-vector-arrow';
            const baseAngle = (i * 137.5) % 360;
            arrow.style.height = '60px';
            arrow.style.transform = `translateX(-50%) rotate(${baseAngle}deg)`;
            p.appendChild(arrow);
        }

        p.onclick = (e) => {
            if (profileModule.isDrawing) { e.stopPropagation(); profileModule.handlePointClick(p.id); }
            else if (isOnline && (type === 'GNSS' || type === 'GROUND')) { dashModule.focusWithRange(p.id); analysisModule.open(this.pMeta[p.id]); }
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

    getTechData(type, id) {
        const meta = this.pMeta[id];
        const multiplier = this.isDetailMode ? 1 : (this.tMultiplier || 1);
        const seed = parseInt(id.replace('pt-', '')) || 0;
        const variance = (seed % 10) * 0.1;
        let speed = 0.5;
        switch (meta.alarmIdx) {
            case 0: speed = 8.1 + variance * 3.5; break;
            case 1: speed = 5.1 + variance * 2.5; break;
            case 2: speed = 4.1 + variance * 0.8; break;
            case 3: speed = 3.1 + variance * 0.8; break;
            default: speed = 0.5 + (seed % 5) * 0.4;
        }
        // 关键逻辑：累计位移随时间乘数（multiplier）自动变化
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


// 1. 分页状态变量 (确保放置在 dashModule 对象内部)
offlineData: [],
offlineCurrentPage: 1,
offlinePageSize: 5,

// 2. 弹出离线窗口入口：负责初始化数据、触发过滤联动及开启渲染
// --- 在 dashModule 对象中替换以下函数 ---

showOfflineModal(data) {
    const modal = document.getElementById('offline-modal');
    const mapSection = document.getElementById('main-map-section');

    this.offlineData = data;
    this.offlineCurrentPage = 1;

    mapSection.appendChild(modal);
    modal.style.display = 'flex';

    // 联动过滤：在地图上高亮这些离线点
    const offlineIds = Object.keys(mapModule.pMeta).filter(id =>
        !mapModule.pMeta[id].isOnline && mapModule.pMeta[id].type === 'GNSS'
    );
    const offlineRegions = [...new Set(offlineIds.map(id => mapModule.pMeta[id].region))];

    mapFilterModule.selectedPoints = offlineIds;
    mapFilterModule.selectedRegions = offlineRegions;
    mapFilterModule.syncUI();

    // 禁用主工具栏，突出显示离线面板
    const regBtn = document.getElementById('map-region-btn');
    const pointInp = document.getElementById('map-point-input');
    [regBtn, pointInp].forEach(el => {
        if(el) {
            el.disabled = true;
            el.style.opacity = '0.5';
            el.style.cursor = 'not-allowed';
        }
    });

    document.querySelectorAll('.freq-btn').forEach(btn => btn.classList.remove('active'));

    this.renderOfflineTable();
},

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

closeOfflineModal() {
    // 1. 关闭弹窗显示
    document.getElementById('offline-modal').style.display = 'none';

    // 2. 恢复默认的筛选逻辑（模拟页面刚加载时的状态）
    // 默认：全选所有区域
    mapFilterModule.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];

    // 默认：选中所有的 GNSS 点位
    const allGnssIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'GNSS');
    mapFilterModule.selectedPoints = [...allGnssIds];

    // 默认：只开启 GNSS 类型的显示，关闭其他（如雷达、水位等）
    mapFilterModule.activeTypes.clear();
    mapFilterModule.activeTypes.add('GNSS');

    // 3. 恢复工具栏交互状态
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

    // 4. 恢复默认时间范围（前一天0点到此时）
    const defaultBtn = document.querySelector('.freq-btn');
    if (defaultBtn) {
        mapModule.setTime(1, defaultBtn);
    }

    // 5. 视图重置：取消局部聚焦，回到全局视野
    mapModule.isDetailMode = false;
    mapModule.focus('GNSS');

    // 6. 最终同步 UI 和地图显示
    mapFilterModule.syncUI();
},

                // 请在 dashModule 对象中整块替换该函数
                getSortedGnssData() {
                    let data = Object.keys(mapModule.pMeta)
                        .filter(id => {
                            const meta = mapModule.pMeta[id];
                            // 核心修改：将过滤类型由 GNSS 改为 GROUND
                            return meta && meta.type === 'GROUND' && meta.isOnline;
                        })
                        .map((id) => {
                            const meta = mapModule.pMeta[id];
                            const seed = parseInt(id.replace('pt-', '')) || 0;
                            const variance = (seed % 10) * 0.1;

                            // 模拟地下水水位/水量逻辑 (与 getTechData 保持逻辑一致)
                            let currentLevel = 0.5;
                            switch (meta.alarmIdx) {
                                case 0: currentLevel = 8.1 + variance * 3.5; break;
                                case 1: currentLevel = 5.1 + variance * 2.5; break;
                                case 2: currentLevel = 4.1 + variance * 0.8; break;
                                case 3: currentLevel = 3.1 + variance * 0.8; break;
                                default: currentLevel = 0.5 + (seed % 5) * 0.4;
                            }

                            return {
                                id: id,
                                deviceId: meta.deviceId,
                                alarmIdx: meta.alarmIdx,
                                region: meta.region,
                                elevation: (1200 + Math.sin(seed) * 50).toFixed(1),
                                value: currentLevel.toFixed(2), // 水位/水量值
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
                                name: '水位（m）',
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
        if (meta && meta.type === 'GNSS') {
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

              // 请在 dashModule 对象中整块替换该函数
              initOnlineChart() {
                  // 核心修改：统计 GROUND 类型的节点
                  const groundNodes = Object.values(mapModule.pMeta).filter(n => n.type === 'GROUND');
                  const online = groundNodes.filter(n => n.isOnline).length,
                      offline = groundNodes.length - online;

                  const chart = echarts.init(document.getElementById('chart-on'));
                  chart.setOption({
                      title: {
                          text: groundNodes.length,
                          subtext: '地下水设备',
                          left: 'center',
                          top: '35%',
                          textStyle: { fontSize: 18, color: '#1c3d90', fontWeight: 'bold' },
                          subtextStyle: { fontSize: 10, color: '#999', verticalAlign: 'top' }
                      },
                      tooltip: { show: false },
                      legend: {
                          bottom: '2',
                          icon: 'circle',
                          itemWidth: 8,
                          textStyle: { fontSize: 9 },
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
                          label: { show: false },
                          data: [
                              { value: online, name: '在线', itemStyle: { color: '#71C446' } },
                              { value: offline, name: '离线', itemStyle: { color: '#999' } }
                          ]
                      }]
                  });

                  chart.on('click', params => {
                      if (params.name === '离线') {
                          // 联动离线弹窗显示地下水离线设备
                          this.showOfflineModal(groundNodes.filter(n => !n.isOnline));
                      }
                  });
              },

// 请在 dashModule 对象中整块替换该函数
initAlarmChart() {
    // 核心修改：仅统计在线的 GROUND 类型节点
    const groundNodes = Object.values(mapModule.pMeta).filter(n => n.type === 'GROUND' && n.isOnline);
    const counts = [0, 0, 0, 0, 0];
    groundNodes.forEach(n => {
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
            textStyle: { fontSize: 18, color: displayColor, fontWeight: 'bold' },
            subtextStyle: { fontSize: 10, color: '#999', verticalAlign: 'top' }
        },
        tooltip: { show: false },
        legend: {
            bottom: '2',
            icon: 'circle',
            itemWidth: 8,
            textStyle: { fontSize: 8 },
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
            label: { show: false },
            data: alarmNames.map((name, i) => ({
                value: counts[i],
                name: name,
                itemStyle: { color: colors[i] }
            }))
        }]
    });

    chart.on('click', params => {
        const targetIdx = params.dataIndex;
        if (targetIdx === 4) return; // 运行正常不触发过滤

        mapModule.isDetailMode = true;
        mapModule.tMultiplier = 1;

        // UI 状态联动
        document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
        const oneDayBtn = document.querySelector('.freq-btn');
        if (oneDayBtn) oneDayBtn.classList.add('active');

        const resetBtn = document.getElementById('reset-gnss-btn');
        if (resetBtn) resetBtn.style.display = 'flex';

        document.querySelectorAll('.point-obj').forEach(p => {
            const meta = mapModule.pMeta[p.id];
            // 核心交互逻辑修改：仅匹配 GROUND 类型且符合告警等级的在线点
            const isMatch = (meta && meta.type === 'GROUND') && (meta.isOnline) && (meta.alarmIdx === targetIdx);

            p.classList.remove('breathe', 'point-glow-active', 'point-focus-center');

            if (isMatch) {
                p.style.display = 'block';
                p.style.color = p.style.backgroundColor;
                p.classList.add('breathe', 'point-glow-active');
            } else {
                p.style.display = 'none';
            }
        });

        // 核心聚焦修改：聚焦到 GROUND 类型点
        mapModule.focus('GROUND');
    });
},

/* --- dashModule 内 showOfflineModal 函数替换 --- */
showOfflineModal(data) {
    const modal = document.getElementById('offline-modal');
    const mapSection = document.getElementById('main-map-section');

    // 1. 挂载并显示
    mapSection.appendChild(modal);
    modal.style.display = 'flex';

    const body = document.getElementById('offline-table-body');
    body.innerHTML = data.map((n, i) => {
        // 根据设备ID生成不同的标高值
        const seed = parseInt(n.id.replace('pt-', '')) || 0;
        const elevationBase = 1200; // 基础标高
        // 使用正弦函数创建有规律的变化，避免完全随机
        const elevationVariation = Math.round(Math.sin(seed * 0.5) * 50); // -50到50的变化
        const elevation = elevationBase + elevationVariation;

        // 添加一些随机厂商
        const vendors = ['海康威视', '大华股份', '华测导航', '司南导航', '中海达', '北斗星通', '华为技术', '中兴通讯'];
        const vendorIndex = seed % vendors.length;
        const vendor = vendors[vendorIndex];

        // 生成不同的离线时间
        const offlineHour = String((8 + seed % 12)).padStart(2, '0');
        const offlineMinute = String(seed % 60).padStart(2, '0');
        const offlineTime = `2026-01-${String(15 + (seed % 5)).padStart(2, '0')} ${offlineHour}:${offlineMinute}`;

        return `
            <tr>
                <td>${i + 1}</td>
                <td>${n.region}</td>
                <td style="color:#f5222d; font-weight:bold;">${n.deviceId}</td>
                <td>${elevation}m</td>
                <td>${offlineTime}</td>
                <td>${vendor}</td>
            </tr>
        `;
    }).join('');

    // 3. 联动过滤逻辑：自动勾选离线点及对应区域
    const offlineIds = Object.keys(mapModule.pMeta).filter(id =>
        !mapModule.pMeta[id].isOnline && mapModule.pMeta[id].type === 'GNSS'
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

    resetGnssFilter() {
        mapModule.isDetailMode = false;
        document.querySelectorAll('.point-obj.type-GNSS').forEach(p => {
            p.style.display = 'block';
            p.classList.remove('point-focus-center', 'breathe', 'point-glow-active');
            const meta = mapModule.pMeta[p.id];
            if (meta && meta.isOnline && meta.alarmIdx === 0) {
                p.style.color = p.style.backgroundColor;
                p.classList.add('breathe', 'point-glow-active');
            }
        });
        mapModule.focus('GNSS');
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
    charts: { curve: null, vector: null },
    selectedMetricsMap: {},
    selectedRegions: ['全部'],
    selectedPoints: [],
    selectedGlobalMetrics: ['温度（℃）'],
    tMultiplier: 1,
    tableFreq: 'hour',
    metricPage: 1,
    metricPageSize: 6,
/* 找到 analysisModule 并在其定义中修改以下变量 */
allMetrics: [
   '水面高程（m）', '空管长度（m）', '水位（m）', '流量（m³/h）', '孔隙水压（kPa）', '温度（℃）'
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

    // 默认勾选全部指标（如您所求，初始化为完整数组）
    this.selectedGlobalMetrics = [...this.allMetrics];

    // 关键：立即执行指标选择器的渲染和标签更新
    this.renderMetricSelector();
    this.updateMetricButtonLabel();
    this.syncFilterUI();
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

getDisplayPoints(filterVal = '') {
    // 获取系统中所有的 GNSS 点位
    const allGnss = Object.keys(mapModule.pMeta)
        .filter(id => mapModule.pMeta[id]?.type === 'GROUND')
        .map(id => ({ id, ...mapModule.pMeta[id] }));

    let list = [];
    // 逻辑：如果选了“全部”，显示所有点；否则，显示已选区域列表内的所有点
    if (this.selectedRegions.includes('全部')) {
        list = allGnss;
    } else {
        list = allGnss.filter(p => this.selectedRegions.includes(p.region));
    }

    // 处理搜索过滤（如果用户在输入框输入了文字）
    if (filterVal && filterVal !== '全部' && !filterVal.includes('、')) {
        list = list.filter(p =>
            p.deviceId.toLowerCase().includes(filterVal.toLowerCase()) ||
            p.deviceId.replace('GNSS', '').includes(filterVal)
        );
    }
    return list;
},

renderPoints(filterVal = '') {
    const container = document.getElementById('an-point-dropdown');
    if (!container) return;

    const displayList = this.getDisplayPoints(filterVal);

    // 【核心修改】：按名称排序，实现分类排布
    displayList.sort((a, b) => a.deviceId.localeCompare(b.deviceId, 'zh-Hans-CN', {numeric: true}));

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
        const allGnssIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'GROUND');
        if (cb.value === '全部') {
            this.selectedRegions = cb.checked ? ['全部', ...allRegions] : [];
            this.selectedPoints = cb.checked ? [...allGnssIds] : [];
        } else {
            if (cb.checked) {
                if (!this.selectedRegions.includes(cb.value)) this.selectedRegions.push(cb.value);
                allGnssIds.filter(id => mapModule.pMeta[id]?.region === cb.value).forEach(id => { if (!this.selectedPoints.includes(id)) this.selectedPoints.push(id); });
                if (this.selectedRegions.filter(r => r !== '全部').length === allRegions.length) this.selectedRegions.push('全部');
            } else {
                this.selectedRegions = this.selectedRegions.filter(r => r !== cb.value && r !== '全部');
                const regionPoints = allGnssIds.filter(id => mapModule.pMeta[id]?.region === cb.value);
                this.selectedPoints = this.selectedPoints.filter(id => !regionPoints.includes(id));
            }
        }
        this.syncFilterUI();
        this.query();
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
        // 修改点 1：将获取点位的范围改为 'GROUND' (地下水)
        const allGround = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'GROUND');

        if (!val || val === '全部') {
            // 修改点 2：处理全选逻辑，使用 GROUND 点位集合
            this.selectedPoints = (val === '全部') ? [...allGround] : [];
            this.selectedRegions = (val === '全部') ? ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'] : [];
        } else {
            const parts = val.split(/[、,，\s]/).map(p => p.trim()).filter(p => p !== '');
            this.selectedPoints = [];
            this.selectedRegions = [];
            parts.forEach(part => {
                // 修改点 3：匹配逻辑改为比对 GROUND 编号
                const matchedId = allGround.find(id => {
                    const deviceId = mapModule.pMeta[id]?.deviceId || "";
                    // 移除编号中的 GROUND 前缀进行匹配，支持输入 "01" 或 "GROUND-01"
                    return deviceId.replace('GROUND', '') === part.replace(/GROUND/i, '');
                });

                if (matchedId) {
                    if (!this.selectedPoints.includes(matchedId)) this.selectedPoints.push(matchedId);
                    if (!this.selectedRegions.includes(mapModule.pMeta[matchedId].region)) {
                        this.selectedRegions.push(mapModule.pMeta[matchedId].region);
                    }
                }
            });
            if (this.selectedRegions.length === 5) this.selectedRegions.push('全部');
        }
        this.syncFilterUI();
        this.query();
    },
// 替换 script.js 中的 analysisModule.syncFilterUI 函数
syncFilterUI() {
    // 处理区域标签显示
    const regionLabel = document.getElementById('an-region-label');
    if (regionLabel) {
        const activeRegs = this.selectedRegions.filter(r => r !== '全部');
        if (this.selectedRegions.includes('全部') && activeRegs.length >= 5) {
            regionLabel.innerText = '全部区域';
        } else {
            regionLabel.innerText = this.formatLabel(activeRegs) || '选择区域';
        }
    }

    // 处理监测点输入框文字
    const input = document.getElementById('an-point-input');
    if (input) {
        const allGnssCount = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'GNSS').length;
        if (this.selectedPoints.length > 0 && this.selectedPoints.length >= allGnssCount) {
            input.value = "全部";
        } else {
            const names = this.selectedPoints.map(id => mapModule.pMeta[id]?.deviceId?.replace('GNSS', ''));
            input.value = names.join('、');
        }
    }

    // 重新渲染下拉列表中的 DOM 元素
    this.renderRegions();
    this.renderPoints('');
},

// 替换 script.js 中的 analysisModule.getLogicData 函数
/* 替换 analysisModule.getLogicData */
/* 2. 替换数据模拟逻辑 */
/* --- 2. 替换数据获取函数 --- */
getLogicData(devId, timestamp, metricIdx = 0) {
    const meta = mapModule.pMeta[devId] || { alarmIdx: 4 };
    const seed = parseInt(devId.replace('pt-', '')) || 0;
    const wave = Math.sin(timestamp / 3600000 + seed);
    const noise = (Math.random() - 0.5) * 0.2;

    switch (metricIdx) {
        case 0: // 水面高程
            return parseFloat((1150 + wave * 2 + (seed % 10)).toFixed(2));
        case 1: // 空管长度
            return parseFloat((15 - wave * 1.5 + (seed % 5)).toFixed(2));
        case 2: // 水位 (新增)
            return parseFloat((1140 + wave * 3 + (seed % 8)).toFixed(2));
        case 3: // 流量
            return parseFloat((80 + wave * 10 + (seed % 20)).toFixed(1));
        case 4: // 孔隙水压
            return parseFloat((200 + wave * 15 + (seed % 30)).toFixed(2));
        case 5: // 温度
            return parseFloat((14 + wave * 0.5 + noise).toFixed(1));
        default:
            return 0;
    }
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

    this.syncFilterUI();
    if (targetMeta) {
        const input = document.getElementById('an-point-input');
        if (input) input.value = targetMeta.deviceId.replace('GNSS', '');
    }

    // 因为 setQuickTime 或 handleManualTimeChange 已经处理过 query，此处仅做兜底刷新
    this.query();
},

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
    query() { this.renderCurveChart(); this.renderVectorChart(); this.renderTable(); },

// 替换 script.js 中的 analysisModule.renderCurveChart 函数
/* 4. 替换时序曲线渲染函数 */
/* --- 4. 替换时序曲线渲染函数 --- */
renderCurveChart() {
    const el = document.getElementById('curve-chart-main');
    if (!el || !this.selectedPoints.length) return;

    if (this.charts.curve) this.charts.curve.dispose();
    this.charts.curve = echarts.init(el);

    const start = new Date(document.getElementById('an-start').value);
    const end = new Date(document.getElementById('an-end').value);
    const series = [];

    this.selectedPoints.forEach((devId, pIdx) => {
        const meta = mapModule.pMeta[devId] || { deviceId: devId };

        this.selectedGlobalMetrics.forEach((metric) => {
            const mIdxInAll = this.allMetrics.indexOf(metric);
            if (mIdxInAll === -1) return;

            const dataPoints = [];
            // 每小时采样一个点进行绘制
            for (let t = start.getTime(); t <= end.getTime(); t += 3600000) {
                dataPoints.push([t, this.getLogicData(devId, t, mIdxInAll)]);
            }

            series.push({
                name: `${meta.deviceId}-${metric}`,
                type: 'line', smooth: true, showSymbol: false,
                data: dataPoints,
                lineStyle: { width: 2 }
            });
        });
    });

    this.charts.curve.setOption({
        tooltip: { trigger: 'axis' },
        legend: { top: '5%', type: 'scroll' },
        grid: { top: 80, bottom: 40, left: 60, right: 40 },
        xAxis: { type: 'time', axisLabel: { color: '#888' } },
        yAxis: {
            type: 'value',
            name: '值',
            scale: true,
            axisLabel: { color: '#888' }
        },
        series: series
    });
},

// 完整替换 analysisModule 内的 renderVectorChart 函数
    renderVectorChart() {
        const el = document.getElementById('vector-chart-main');
        if (!el) return;

        // 清理旧实例并重新初始化
        if (this.charts.vector) this.charts.vector.dispose();
        this.charts.vector = echarts.init(el);

        // 1. 获取/模拟选中点的实时数据。
        const ids = this.selectedPoints.length > 0 ? this.selectedPoints : ['pt-mock-5'];

        const pointData = ids.map((id, index) => {
            const meta = mapModule.pMeta[id];
            const seed = parseInt(id.replace('pt-', '')) || 5;

            const deviceName = meta ? meta.deviceId : `水位计${seed}`;
            const regionName = meta ? meta.region : '北帮';
            const elevationValue = meta ? (1200 + Math.sin(seed * 0.5) * 50).toFixed(1) : "1182.5";

            return {
                name: deviceName,
                value: [15 + index * 20, elevationValue],
                region: regionName,
                elevation: elevationValue
            };
        });

        // 2. 配置 ECharts 图表
        const option = {
            title: {
                text: '地下水位及地层剖面结构分析',
                left: 'center',
                top: 10,
                textStyle: { color: '#1c3d90', fontSize: 14 }
            },
            graphic: [
                {
                    type: 'group',
                    left: 'center',
                    top: 40,
                    children: [
                        {
                            type: 'rect',
                            z: 100,
                            left: 0,
                            top: 0,
                            shape: { width: 20, height: 12 },
                            style: { fill: 'none', stroke: '#333', lineWidth: 1 }
                        },
                        {
                            type: 'text',
                            z: 100,
                            left: 25,
                            top: 0,
                            style: { fill: '#333', text: '潜在滑面位置', font: '12px sans-serif' }
                        }
                    ]
                }
            ],
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(0, 21, 41, 0.9)',
                borderColor: '#85C6F1',
                textStyle: { color: '#fff', fontSize: 12 },
                formatter: (params) => {
                    // --- 核心修改区域：针对红色“潜在滑面”线条的悬浮标签内容 ---
                    if (params.seriesName === '潜在滑面') {
                        return `
                        <div style="padding:5px;">
                            <b style="color:#85C6F1;">潜在滑面位置</b><br/>
                            <hr style="margin:5px 0; opacity:0.3;">
                            所属区域：北帮<br/>
                            <b>监测标高：1250 m</b>
                        </div>
                    `;
                    }

                    // 监测点位的悬浮逻辑保持不变
                    const d = params.data || {};
                    const name = d.name || "潜在滑面位置";
                    const region = d.region || "北帮";
                    const elevation = d.elevation || (params.value ? params.value[1] : "1220");

                    return `
                    <div style="padding:5px;">
                        <b style="color:#85C6F1;">${name}</b><br/>
                        <hr style="margin:5px 0; opacity:0.3;">
                        所属区域：${region}<br/>
                        <b>监测标高：${elevation} m</b>
                    </div>
                `;
                }
            },
            grid: { top: 70, bottom: 40, left: 60, right: 60 },
            xAxis: {
                name: '水平距离(m)',
                type: 'value',
                min: 0,
                max: 100,
                splitLine: { show: false },
                axisLine: { lineStyle: { color: '#999' } }
            },
            yAxis: {
                name: '标高(m)',
                type: 'value',
                min: 1100,
                max: 1260,
                splitLine: { show: true, lineStyle: { type: 'dashed', color: '#eee' } },
                axisLine: { lineStyle: { color: '#999' } }
            },
            series: [
                {
                    type: 'line',
                    silent: true,
                    markArea: {
                        label: {
                            show: true,
                            position: 'right',
                            color: '#666',
                            fontSize: 10,
                            fontStyle: 'italic'
                        },
                        data: [
                            [{ name: '表层覆盖土', yAxis: 1200, itemStyle: { color: 'rgba(160, 130, 100, 0.2)' } }, { yAxis: 1260 }],
                            [{ name: '强风化层', yAxis: 1160, itemStyle: { color: 'rgba(210, 180, 140, 0.2)' } }, { yAxis: 1200 }],
                            [{ name: '中风化岩层', yAxis: 1130, itemStyle: { color: 'rgba(180, 190, 200, 0.2)' } }, { yAxis: 1160 }],
                            [{ name: '稳定基岩', yAxis: 1100, itemStyle: { color: 'rgba(130, 140, 150, 0.2)' } }, { yAxis: 1130 }]
                        ]
                    }
                },
                {
                    name: '潜在滑面',
                    type: 'line',
                    data: [[0, 1130], [100, 1220]],
                    symbol: 'none',
                    lineStyle: {
                        color: '#ff0000',
                        width: 6,
                        cap: 'round'
                    },
                    markPoint: {
                        data: [{
                            coord: [85, 1206.5],
                            symbol: 'circle',
                            symbolSize: 15,
                            itemStyle: {
                                color: 'none',
                                borderColor: '#333',
                                borderWidth: 1
                            }
                        }]
                    },
                    zIndex: 5
                },
                {
                    name: '监测点位',
                    type: 'scatter',
                    symbolSize: 18,
                    data: pointData,
                    zIndex: 10,
                    itemStyle: {
                        color: '#f5222d',
                        borderColor: '#fff',
                        borderWidth: 2,
                        shadowBlur: 10,
                        shadowColor: 'rgba(245, 34, 45, 0.5)'
                    }
                }
            ]
        };

        this.charts.vector.setOption(option);
    },
// 请在 script.js 中找到 analysisModule 内部的 renderTable 函数并整块替换
    renderTable() {
        const head = document.getElementById('full-table-head'),
            body = document.getElementById('full-table-body');
        if (!head || !body) return;

        if (this.selectedPoints.length === 0) {
            head.innerHTML = "";
            body.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:30px; color:#999;">请先选择监测点进行查询</td></tr>';
            return;
        }

        // 1. 定义地下水专属 10 项表头
        const cols = ['序号', '区域', '编号', '时间', '水面高程（m）', '空管长度（m）', '流量（m³）', '水位（m）', '孔隙水压（kPa）', '温度（℃）'];
        head.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;

        // 2. 获取时间计算逻辑
        const start = new Date(document.getElementById('an-start').value);
        const end = new Date(document.getElementById('an-end').value);
        const msMap = { 'hour': 3600000, 'day': 86400000, 'week': 604800000, 'month': 2592000000 };
        const interval = msMap[this.tableFreq || 'hour'];

        let html = "", rowNum = 1;

        // 3. 遍历监测点生成数据行
        this.selectedPoints.forEach(devId => {
            const meta = mapModule.pMeta[devId] || { region: '未知', deviceId: devId };

            for (let currentTs = start.getTime(); currentTs <= end.getTime(); currentTs += interval) {
                // 获取原始模拟数据
                let vElevation = this.getLogicData(devId, currentTs, 0); // 水面高程
                let vUllage    = this.getLogicData(devId, currentTs, 1); // 空管长度
                let vFlow      = this.getLogicData(devId, currentTs, 3); // 流量
                let vLevel     = this.getLogicData(devId, currentTs, 2); // 水位
                let vPressure  = this.getLogicData(devId, currentTs, 4); // 孔隙水压
                let vTemp      = this.getLogicData(devId, currentTs, 5); // 温度

                // --- 核心逻辑：根据设备类型进行数据脱敏/置空 ---
                if (meta.deviceId.includes('水位计')) {
                    // 水位计：流量和水位列数值为空
                    vFlow = "-";
                    vLevel = "-";
                } else if (meta.deviceId.includes('流量计')) {
                    // 流量计：水面高程和空管长度列数值为空
                    vElevation = "-";
                    vUllage = "-";
                }

                html += `
                <tr>
                    <td>${rowNum++}</td>
                    <td>${meta.region}</td>
                    <td style="font-weight:bold; color:#1c3d90">${meta.deviceId}</td>
                    <td>${new Date(currentTs).toLocaleString()}</td>
                    <td>${vElevation}</td>
                    <td>${vUllage}</td>
                    <td>${vFlow}</td>
                    <td>${vLevel}</td>
                    <td>${vPressure}</td>
                    <td style="font-weight:bold; color:#71C446">${vTemp}</td>
                </tr>`;

                if (rowNum > 2000) break; // 防止大数据量导致浏览器卡顿
            }
        });
        body.innerHTML = html;
    },
    toggleMetricMenu(e) { if (e) e.stopPropagation(); const menu = document.getElementById('metric-items-container'); if (menu) menu.style.display = (menu.style.display === 'block') ? 'none' : 'block'; },
// 替换 script.js 中的 analysisModule.renderMetricSelector 函数
/* --- 3. 替换指标下拉菜单渲染函数 --- */
renderMetricSelector() {
    const container = document.getElementById('metric-items-container');
    if (!container) return;

    // 判定当前选中的监测点类型
    const selectedPointsData = this.selectedPoints.map(id => mapModule.pMeta[id]);
    const isWaterLevelMeter = selectedPointsData.some(p => p && p.deviceId.includes('水位计'));
    const isFlowMeter = selectedPointsData.some(p => p && p.deviceId.includes('流量计'));

    let html = `
        <div class="multi-item" style="border-bottom: 2px solid #eee; margin-bottom: 5px; background: #f8fbff;">
            <input type="checkbox" id="met-an-all"
                   ${this.selectedGlobalMetrics.length === this.allMetrics.length ? 'checked' : ''}
                   onchange="analysisModule.handleMetricToggle(this)" value="全部">
            <label for="met-an-all" style="font-weight:bold; color:#1c3d90;">全选所有指标</label>
        </div>
    `;

    this.allMetrics.forEach((metric, idx) => {
        let isDisabled = false;
        let reason = "";

        // 互斥逻辑判断
        // 1. 当监测点为水位计监测点时，流量、水位不可选择
        if (isWaterLevelMeter && (metric === '流量（m³/h）' || metric === '水位（m）')) {
            isDisabled = true;
            reason = " (水位计不可选)";
        }
        // 2. 当监测点为流量计监测点时，水面高程、空管长度不可选择
        if (isFlowMeter && (metric === '水面高程（m）' || metric === '空管长度（m）')) {
            isDisabled = true;
            reason = " (流量计不可选)";
        }

        html += `
            <div class="multi-item ${isDisabled ? 'disabled-metric' : ''}"
                 style="${isDisabled ? 'opacity:0.4; cursor:not-allowed; background:#f5f5f5;' : ''}">
                <input type="checkbox" id="met-an-${idx}" value="${metric}"
                       ${this.selectedGlobalMetrics.includes(metric) ? 'checked' : ''}
                       ${isDisabled ? 'disabled' : ''}
                       onchange="analysisModule.handleMetricToggle(this)">
                <label for="met-an-${idx}" style="flex:1; cursor:${isDisabled ? 'not-allowed' : 'pointer'};">
                    ${metric}<small style="color:#999; font-size:10px;">${reason}</small>
                </label>
            </div>`;
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
// 替换 script.js 中的 analysisModule.openExportDialogLogic 函数
    openExportDialogLogic() {
        const container = document.getElementById('export-metric-list');
        if (!container) return;

        // --- 需求修改点：更新导出弹窗中的地下水专属指标 ---
        const exportCols = [
            '水面高程（m）',
            '空管长度（m）',
            '流量（m³）',
            '水位（m）',
            '孔隙水压（kPa）',
            '温度（℃）'
        ];

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
    doExport() {
        const checkedBoxes = document.querySelectorAll('.ex-check:checked');
        const selectedCols = Array.from(checkedBoxes).map(cb => cb.value);

        if (selectedCols.length === 0) {
            alert('请至少选择一个导出字段');
            return;
        }

        // --- 核心同步：此数组顺序必须与 renderTable 中的表头顺序严格一致 ---
        const allTableCols = [
            '序号', '区域', '编号', '时间',
            '水面高程（m）', '空管长度（m）', '流量（m³）', '水位（m）', '孔隙水压（kPa）', '温度（℃）'
        ];

        let csvContent = "\ufeff序号,区域,编号,时间," + selectedCols.join(",") + "\n";

        document.querySelectorAll('#full-table-body tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 4) return;

            // 保留前四列基础信息：序号、区域、编号、时间
            let rowData = [cells[0].innerText, cells[1].innerText, cells[2].innerText, cells[3].innerText];

            // 根据用户勾选的指标，从表格对应的列中提取数值
            selectedCols.forEach(col => {
                const idx = allTableCols.indexOf(col);
                if (idx !== -1 && cells[idx]) {
                    rowData.push(cells[idx].innerText.replace(/,/g, ""));
                }
            });
            csvContent += rowData.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }),
            link = document.createElement("a");

        link.href = URL.createObjectURL(blob);
        link.download = `地下水监测历史明细_${Date.now()}.csv`;
        link.click();

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
/* 修改 window.onload 函数 */
window.onload = () => {
    if (typeof backgroundModule !== 'undefined') backgroundModule.init();
    if (typeof headerModule !== 'undefined') headerModule.init();
    if (typeof mapModule !== 'undefined') mapModule.init();
    if (typeof dashModule !== 'undefined') dashModule.init();

    // 将此处初始化的类型从 'GNSS' 改为 'GROUND'
    if (typeof appLogic !== 'undefined') appLogic.switchType('GROUND');

    // 1. 初始化所有时间输入框的最大约束
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
            if (p.innerText.includes('监测点速度曲线')) {
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