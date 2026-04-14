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

init() {
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.filter-group') && !e.target.closest('.custom-dropdown-content')) {
            document.querySelectorAll('.custom-dropdown-content').forEach(d => d.style.display = 'none');
        }
    });
    // 初始状态：全选区域，默认开启 WATER (降雨监测)
    this.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
    // 筛选初始点位为 WATER 类型
    this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'WATER');
    this.activeTypes.add('WATER');
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
            .filter(id => mapModule.pMeta[id].type === 'WATER')
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
                p.deviceId.replace('WATER','').includes(filterVal)
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
    const allGnssIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'WATER');
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
    const allGnss = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'WATER');

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
        let targetNum = part.replace(/WATER/i, '');
        const matchedId = allGnss.find(id => mapModule.pMeta[id].deviceId.replace('WATER', '') === targetNum);

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


// 替换 script.js 中的 mapModule.spawnPoints 函数
spawnPoints() {
    const cv = document.getElementById('map-canvas');
    const icons = { 'GNSS': '📍', 'DEEP': '⚓', 'RADAR': '📡', 'SURFACE': '📐', 'CRACK': '🧱', 'FIRE': '🔥', 'WATER': '💧', 'GROUND': '🌍', 'STRESS': '📊', 'VIB': '💥', 'SAT': '🛸' };
    const types = Object.keys(icons);
    const regionDefinitions = [{ name: '北帮', xRange: [800, 2200], yRange: [200, 600] }, { name: '南帮', xRange: [800, 2200], yRange: [1900, 2300] }, { name: '西帮', xRange: [200, 700], yRange: [800, 1700] }, { name: '东帮', xRange: [2300, 2800], yRange: [800, 1700] }, { name: '中央区', xRange: [1100, 1900], yRange: [1000, 1500] }];
    const placedPoints = [];
    const minDist = 60;
    let redGnssCount = 0;

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

        // 【确保编号】：GNSS1, GNSS2...
        const deviceId = `${type}${i}`;
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
            else if (isOnline && type === 'WATER') { dashModule.focusWithRange(p.id); analysisModule.open(this.pMeta[p.id]); }
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


/* 整体替换 dashModule 内部 of closeOfflineModal 函数 */
closeOfflineModal() {
    // 1. 关闭弹窗显示
    document.getElementById('offline-modal').style.display = 'none';

    // 2. 恢复默认的筛选逻辑（回归全局降雨监测视图）
    mapFilterModule.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];

    // 3. 恢复选中所有的 WATER 点位，并确保活跃类型仅为 WATER
    const allWaterIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'WATER');
    mapFilterModule.selectedPoints = [...allWaterIds];
    mapFilterModule.activeTypes.clear();
    mapFilterModule.activeTypes.add('WATER');

    // 4. 恢复工具栏交互状态
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

    // 5. 【核心复位】：取消局部聚焦，移除所有动效，回到降雨监测全局视野
    mapModule.isDetailMode = false;
    document.querySelectorAll('.point-obj').forEach(p => {
        const meta = mapModule.pMeta[p.id];
        if (meta && meta.type === 'WATER') {
            p.style.display = 'block';
            p.classList.remove('point-focus-center', 'breathe', 'point-glow-active');
            // 如果是在线的一级告警点，恢复呼吸动画
            if (meta.isOnline && meta.alarmIdx === 0) {
                p.classList.add('breathe', 'point-glow-active');
            }
        } else {
            p.style.display = 'none';
        }
    });

    // 执行缩放回归
    mapModule.focus('WATER');

    // 6. 同步 UI 下拉框文字等
    mapFilterModule.syncUI();
},
                    getSortedGnssData() {
                        let data = Object.keys(mapModule.pMeta)
                            .filter(id => {
                                const meta = mapModule.pMeta[id];
                                return meta && meta.type === 'WATER' && meta.isOnline;
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
                                return {
                                    id: id,
                                    deviceId: meta.deviceId,
                                    alarmIdx: meta.alarmIdx,
                                    region: meta.region,
                                    elevation: (1200 + Math.sin(seed) * 50).toFixed(1),
                                    value: currentSpeed.toFixed(2),
                                    threshold: this.thresholds[meta.alarmIdx]
                                };
                            });
                        return data.sort((a, b) => a.alarmIdx - b.alarmIdx || b.value - a.value);
                    },

                    // 修改位置：script.js -> dashModule.initSpeedChart
                    initSpeedChart(targetId) {
                        this.currentChartId = targetId;
                        const chartEl = document.getElementById('chart-sp');
                        if (!chartEl) return;
                        let chart = echarts.getInstanceByDom(chartEl);
                        if (chart) chart.dispose();
                        chart = echarts.init(chartEl);

                        // 准备 1-12 月份数据
                        const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

                        // 模拟月度降雨量数据 (柱状图数据)
                        const monthlyRain = [45.2, 52.1, 68.5, 92.0, 115.4, 188.2, 215.5, 192.1, 145.6, 88.4, 55.0, 42.8];

                        // 模拟趋势走向数据 (折线图数据：在月度基础上略微平滑并加一点随机感)
                        const trendData = monthlyRain.map(v => (v * 0.95 + Math.random() * 20).toFixed(1));

                        chart.setOption({
                            tooltip: {
                                trigger: 'axis',
                                axisPointer: { type: 'shadow' }, // 柱状图建议使用 shadow 指示器
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                borderColor: '#1c3d90',
                                textStyle: { color: '#333', fontSize: 11 }
                            },
                            grid: {
                                top: 35,
                                bottom: 25,
                                left: 45,
                                right: 15
                            },
                            xAxis: {
                                type: 'category',
                                data: months,
                                axisLabel: {
                                    fontSize: 9,
                                    color: '#888',
                                    interval: 0 // 强制显示所有月份文字
                                },
                                axisLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } }
                            },
                            yAxis: {
                                type: 'value',
                                name: '毫米(mm)',
                                nameTextStyle: {
                                    color: '#666',
                                    fontSize: 10,
                                    align: 'right',
                                    padding: [0, 5, 0, 0]
                                },
                                axisLabel: { fontSize: 9, color: '#888' },
                                splitLine: {
                                    lineStyle: {
                                        color: 'rgba(0,0,0,0.05)',
                                        type: 'dashed'
                                    }
                                }
                            },
                            series: [
                                {
                                    name: '月度降雨',
                                    type: 'bar',
                                    barWidth: '45%',
                                    itemStyle: {
                                        // 使用系统主色调渐变
                                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                            { offset: 0, color: '#85C6F1' },
                                            { offset: 1, color: '#1c3d90' }
                                        ]),
                                        borderRadius: [2, 2, 0, 0] // 顶部圆角
                                    },
                                    data: monthlyRain
                                },
                                {
                                    name: '趋势走向',
                                    type: 'line',
                                    smooth: true, // 平滑曲线
                                    showSymbol: true,
                                    symbolSize: 4,
                                    lineStyle: {
                                        width: 2,
                                        color: '#F57676' // 警示红色作为趋势线，更醒目
                                    },
                                    itemStyle: { color: '#F57676' },
                                    data: trendData
                                }
                            ]
                        });
                    },

/* 整体替换 dashModule 内部的 renderWarningTable 函数 */
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
        // 核心修改：确保 onclick 事件调用 focusWithRange
        return `
            <tr class="${rowClass}" style="cursor:pointer;" onclick="dashModule.focusWithRange('${item.id}')">
                <td>${startIndex + i + 1}</td>
                <td>${item.region}</td>
                <td style="color:${textColor}; font-weight:600;">${item.deviceId}</td>
                <td>${item.elevation}</td>
                <td style="color:${textColor}; font-weight:600;">${item.value}</td>
                <td style="color:#888;">${item.threshold}</td>
            </tr>`;
    }).join('');

    const pager = document.getElementById('table-pagination');
    if (pager) {
        pager.innerHTML = `
            <button class="pager-btn ${this.currentPage === 1 ? 'disabled' : ''}" onclick="if(${this.currentPage}>1)dashModule.changePage(${this.currentPage - 1})"> < </button>
            <span style="font-weight:bold; min-width:30px; text-align:center; color:#000;">${this.currentPage} / ${totalPages}</span>
            <button class="pager-btn ${this.currentPage === totalPages ? 'disabled' : ''}" onclick="if(${this.currentPage}<${totalPages})dashModule.changePage(${this.currentPage + 1})"> > </button>
        `;
    }
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
        if (meta && meta.type === 'WATER') {
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

/* 整体替换 dashModule 内部的 initOnlineChart 函数 */
initOnlineChart() {
    // 核心修改：将统计目标锁定为 WATER (降雨监测) 类型
    const waterNodes = Object.values(mapModule.pMeta).filter(n => n.type === 'WATER');
    const online = waterNodes.filter(n => n.isOnline).length,
        offline = waterNodes.length - online;
    const chart = echarts.init(document.getElementById('chart-on'));
    chart.setOption({
        title: {
            text: waterNodes.length,
            subtext: '降雨设备总数',
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
    // 点击离线部分弹出 WATER 类型的离线列表
    chart.on('click', params => {
        if (params.name === '离线') this.showOfflineModal(waterNodes.filter(n => !n.isOnline));
    });
},


/* 整体替换 dashModule 内部的 initAlarmChart 函数 */
initAlarmChart() {
    // 核心修改：仅统计在线的 WATER (降雨监测) 设备
    const waterNodes = Object.values(mapModule.pMeta).filter(n => n.type === 'WATER' && n.isOnline);
    const counts = [0, 0, 0, 0, 0];
    waterNodes.forEach(n => { counts[n.alarmIdx]++; });

    const chart = echarts.init(document.getElementById('chart-al'));
    const colors = ['#F57676', '#FFA500', '#fadb14', '#66B1FF', '#71C446'];
    const alarmNames = ['一级告警', '二级告警', '三级告警', '四级告警', '运行正常'];

    // 计算当前最高等级的预警信息作为标题显示
    let displayCount = 0, displayLabel = "运行正常", displayColor = colors[4];
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
            bottom: '2', icon: 'circle', itemWidth: 8,
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

    // 联动逻辑：点击预警色块，地图自动筛选对应的降雨监测点
    chart.on('click', params => {
        const targetIdx = params.dataIndex;
        if (targetIdx === 4) return; // 点击“运行正常”不执行特殊高亮

        mapModule.isDetailMode = true;
        // 在地图上展示并高亮符合该预警等级的降雨监测点
        document.querySelectorAll('.point-obj').forEach(p => {
            const meta = mapModule.pMeta[p.id];
            const isMatch = (meta && meta.type === 'WATER') && (meta.isOnline) && (meta.alarmIdx === targetIdx);

            p.classList.remove('breathe', 'point-glow-active', 'point-focus-center');
            if (isMatch) {
                p.style.display = 'block';
                p.classList.add('breathe', 'point-glow-active');
            } else {
                p.style.display = 'none';
            }
        });

        // 视图聚焦到降雨监测点群组
        mapModule.focus('WATER');
        const resetBtn = document.getElementById('reset-gnss-btn');
        if (resetBtn) resetBtn.style.display = 'flex';
    });
},

/* 整体替换 dashModule 内部的 showOfflineModal 函数 */
showOfflineModal(data) {
    const modal = document.getElementById('offline-modal');
    const mapSection = document.getElementById('main-map-section');

    // 1. 挂载并显示离线列表弹窗
    mapSection.appendChild(modal);
    modal.style.display = 'flex';

    // 2. 渲染离线表格内容
    const body = document.getElementById('offline-table-body');
    const vendors = ['海康威视', '大华股份', '华测导航', '司南导航', '中海达'];
    body.innerHTML = data.map((n, i) => {
        const seed = parseInt(n.id.replace('pt-', '')) || 0;
        const elevation = (1200 + Math.sin(seed * 0.5) * 50).toFixed(1);
        const offlineHour = String((8 + seed % 12)).padStart(2, '0');
        const offlineMinute = String(seed % 60).padStart(2, '0');
        const offlineTime = `2026-01-${String(15 + (seed % 5)).padStart(2, '0')} ${offlineHour}:${offlineMinute}`;

        return `
            <tr>
                <td style="text-align: center; vertical-align: middle;">${i + 1}</td>
                <td style="text-align: center; vertical-align: middle;">${n.region}</td>
                <td style="text-align: center; vertical-align: middle;"><span class="status-tag-offline">${n.deviceId}</span></td>
                <td style="text-align: center; vertical-align: middle; font-weight:bold; color:#1c3d90">${elevation}m</td>
                <td style="text-align: center; vertical-align: middle;">${offlineTime}</td>
                <td style="text-align: center; vertical-align: middle;"><span class="vendor-tag">${vendors[seed % vendors.length]}</span></td>
            </tr>
        `;
    }).join('');

    // 3. 【核心联动】：在地图上仅显示并聚焦到这些离线监测点
    mapModule.isDetailMode = true;
    const offlineIds = data.map(n => n.id);

    document.querySelectorAll('.point-obj').forEach(p => {
        const meta = mapModule.pMeta[p.id];
        // 判定：如果点位是降雨监测点且在离线列表中，则显示；否则隐藏
        const isTargetOffline = (meta && meta.type === 'WATER' && offlineIds.includes(p.id));

        p.classList.remove('breathe', 'point-glow-active', 'point-focus-center');
        if (isTargetOffline) {
            p.style.display = 'block';
            // 可选：为离线点添加弱发光效果方便识别
            p.classList.add('point-glow-active');
        } else {
            p.style.display = 'none';
        }
    });

    // 4. 执行视口聚焦：自动缩放到可见离线点的包围圈
    mapModule.focus('WATER');

    // 6. 禁用顶部筛选栏防止冲突
    const regBtn = document.getElementById('map-region-btn');
    const pointInp = document.getElementById('map-point-input');
    [regBtn, pointInp].forEach(el => {
        if(el) {
            el.disabled = true;
            el.style.backgroundColor = '#f5f5f5';
            el.style.cursor = 'not-allowed';
            el.style.opacity = '0.6';
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

/* 整体替换 appLogic 内部的 resetGnssFilter 函数 */
resetGnssFilter() {
    // 1. 关闭详情/聚焦模式
    mapModule.isDetailMode = false;

    // 2. 遍历点位，仅保留 WATER 类型显示，并移除所有聚焦动画类
    document.querySelectorAll('.point-obj').forEach(p => {
        const meta = mapModule.pMeta[p.id];
        if (meta && meta.type === 'WATER') {
            p.style.display = 'block';
            // 移除历史记录点击产生的强聚焦效果
            p.classList.remove('point-focus-center', 'breathe', 'point-glow-active');
            // 恢复该点位原始的预警状态动画
            if (meta.isOnline && meta.alarmIdx === 0) {
                p.classList.add('breathe', 'point-glow-active');
            }
        } else {
            // 隐藏非降雨监测类型的点
            p.style.display = 'none';
        }
    });

    // 3. 地图缩放回退到降雨监测点的全局范围
    mapModule.focus('WATER');

    // 4. 隐藏复位按钮
    document.getElementById('reset-gnss-btn').style.display = 'none';

    // 5. 重置右侧表格页码并刷新
    dashModule.currentPage = 1;
    dashModule.renderWarningTable();
}
};


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
/* 找到 analysisModule 并在其定义中修改以下变量 */
allMetrics: [
    '累计降水量(mm)', '实时降水量(mm)' // 新增 4 项指标
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
    const allGnssIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'WATER');
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
        .filter(id => mapModule.pMeta[id]?.type === 'WATER')
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
            p.deviceId.replace('WATER', '').includes(filterVal)
        );
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

    handleRegionChange(cb) {
        const allRegions = ['北帮', '南帮', '东帮', '西帮', '中央区'];
        const allGnssIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'WATER');
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
        const allGnss = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'WATER');
        if (!val || val === '全部') {
            this.selectedPoints = (val === '全部') ? [...allGnss] : [];
            this.selectedRegions = (val === '全部') ? ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'] : [];
        } else {
            const parts = val.split(/[、,，\s]/).map(p => p.trim()).filter(p => p !== '');
            this.selectedPoints = []; this.selectedRegions = [];
            parts.forEach(part => {
                const matchedId = allGnss.find(id => mapModule.pMeta[id]?.deviceId?.replace('WATER', '') === part.replace(/GNSS/i, ''));
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
        const allGnssCount = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'WATER').length;
        if (this.selectedPoints.length > 0 && this.selectedPoints.length >= allGnssCount) {
            input.value = "全部";
        } else {
            const names = this.selectedPoints.map(id => mapModule.pMeta[id]?.deviceId?.replace('WATER', ''));
            input.value = names.join('、');
        }
    }

    // 重新渲染下拉列表中的 DOM 元素
    this.renderRegions();
    this.renderPoints('');
},

/* 整体替换 analysisModule 内部的 getLogicData 函数 */
getLogicData(devId, timestamp, metricIdx = 0) {
    const seed = parseInt(devId.replace('pt-', '')) || 0;

    // 设定一个固定的起始计算基准点（2026年1月1日）
    const startTime = new Date('2026-01-01T00:00:00').getTime();
    // 计算当前时间点距离基准点经过的总小时数（包含小数，确保分钟级平滑）
    const hoursPassed = (timestamp - startTime) / 3600000;

    // 为每个设备分配一个固定的降雨强度速率 (mm/h)
    // 基础速率 0.6mm/h，根据设备 ID 微调，确保增长斜率在 0.6~1.4 之间
    const rainRate = 0.6 + (seed % 5) * 0.2;

    if (metricIdx === 1) {
        // 【实时降水量】：模拟随时间波动的降雨瞬时强度（保留波动感）
        const wave = Math.sin(timestamp / 3600000 + seed) * 0.3 + 0.5;
        return parseFloat((wave * rainRate).toFixed(2));
    } else {
        // 【累计降水量】：起始值 + (经过时间 * 固定速率)
        // 彻底移除 Math.sin，确保 y = ax + b 的线性增长，实现持续上升趋势
        const baseCumulative = 300 + (seed * 10); // 每个设备不同的初始起步水位
        const totalRain = baseCumulative + (hoursPassed * rainRate);
        return parseFloat(totalRain.toFixed(2));
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
renderCurveChart() {
    const el = document.getElementById('curve-chart-main');
    if (!el) return;

    if (this.charts.curve) {
        this.charts.curve.dispose();
        this.charts.curve = null;
    }
    if (this.selectedPoints.length === 0) return;

    this.charts.curve = echarts.init(el);
    const startVal = document.getElementById('an-start').value;
    const endVal = document.getElementById('an-end').value;
    const start = new Date(startVal), end = new Date(endVal);
    const totalHours = (end - start) / 3600000;
    let stepMs = totalHours <= 24 ? 1800000 : (totalHours <= 744 ? 3600000 : 86400000);

    const series = [];
    const richLineStyles = ['solid', 'dashed', 'dotted', 'dashDot', [5, 5]];

    this.selectedPoints.forEach((devId, pIdx) => {
        const meta = mapModule.pMeta[devId] || { deviceId: devId };
        const baseColor = this.deviceColors[pIdx % this.deviceColors.length];
        this.selectedGlobalMetrics.forEach((metric, mIdx) => {
            const metricFullIdx = this.allMetrics.indexOf(metric);
            const dataPoints = [];
            for (let t = start.getTime(); t <= end.getTime(); t += stepMs) {
                dataPoints.push([t, this.getLogicData(devId, t, metricFullIdx)]);
            }
            const opacity = 1 - (mIdx % 3) * 0.25;
            const metricColor = baseColor.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
            series.push({
                name: `${meta.deviceId}-${metric}`,
                type: 'line', smooth: true, showSymbol: false,
                data: dataPoints,
                lineStyle: { width: 2, color: metricColor, type: richLineStyles[mIdx % richLineStyles.length] }
            });
        });
    });

this.charts.curve.setOption({
        tooltip: {
            trigger: 'axis',
            confine: true,
            enterable: true,
            extraCssText: 'max-height: 300px; overflow-y: auto; pointer-events: auto;',
            axisPointer: { type: 'cross' },
            /* --- 1. 修复：动态位置计算，避开鼠标和曲线焦点 --- */
            position: function (point, params, dom, rect, size) {
                const x = point[0]; // 鼠标 x 坐标
                const y = point[1]; // 鼠标 y 坐标
                const viewWidth = size.viewSize[0];
                const viewHeight = size.viewSize[1];
                const boxWidth = size.contentSize[0];
                const boxHeight = size.contentSize[1];

                // 默认偏移量
                const offset = 20;
                let posX = x + offset;
                let posY = y + offset;

                // 如果右侧空间不足，显示在左侧
                if (posX + boxWidth > viewWidth) {
                    posX = x - boxWidth - offset;
                }
                // 如果下方空间不足，显示在上方
                if (posY + boxHeight > viewHeight) {
                    posY = y - boxHeight - offset;
                }

                return [posX, posY];
            }
        },
        /* --- 2. 修复：还原横坐标放缩功能 (DataZoom) --- */
        dataZoom: [
            {
                type: 'inside', // 允许鼠标滚轮直接缩放
                xAxisIndex: 0,
                filterMode: 'none'
            },
            {
                type: 'slider', // 下方显示滑动条
                height: 20,
                bottom: 5,
                borderColor: 'transparent',
                backgroundColor: '#e2e2e2',
                fillerColor: 'rgba(133, 198, 241, 0.3)',
                handleStyle: { color: '#1c3d90' },
                xAxisIndex: 0,
                filterMode: 'none'
            }
        ],
        legend: {
            top: '5%',
            type: 'scroll',
            pageIconSize: 12
        },
        grid: { top: 80, bottom: 60, left: 60, right: 40 }, // 调整底部间距留给 DataZoom
        xAxis: {
            type: 'time',
            axisLabel: { color: '#888', fontSize: 11 },
            splitLine: { show: true, lineStyle: { color: '#f0f0f0' } }
        },
        yAxis: {
            type: 'value',
            scale: true,
            axisLabel: { color: '#888' },
            splitLine: { lineStyle: { color: '#f0f0f0' } }
        },
        series: series
    });
},

// 替换 script.js 中的 analysisModule.renderVectorChart 函数
renderVectorChart() {
    const el = document.getElementById('vector-chart-main');
    if (!el || !this.charts) return;

    if (this.charts.vector) {
        this.charts.vector.dispose();
        this.charts.vector = null;
    }
    if (this.selectedPoints.length === 0) return;

    this.charts.vector = echarts.init(el);
    const start = new Date(document.getElementById('an-start').value);
    const end = new Date(document.getElementById('an-end').value);
    const freqType = document.getElementById('traj-freq').value;

    // 1. 根据频率计算段数 (例如: 24小时 / 1小时 = 24段)
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
        // 初始点不带箭头
        const pathData = [{ value: [0, 0], symbol: 'none' }];

        for (let i = 1; i < pointCount; i++) {
            const prevX = curX, prevY = curY;
            // 计算随机位移
            const dx = Math.cos(baseAngle * Math.PI/180) * speed + (Math.random()-0.5)*0.2;
            const dy = Math.sin(baseAngle * Math.PI/180) * speed + (Math.random()-0.5)*0.2;
            curX += dx;
            curY += dy;

            // [核心逻辑]：为每一段线段的终点计算箭头旋转角度
            const angle = Math.atan2(dy, dx) * 180 / Math.PI - 90;

            pathData.push({
                value: [parseFloat(curX.toFixed(2)), parseFloat(curY.toFixed(2))],
                symbol: 'arrow', // 每一段都显示箭头
                symbolRotate: angle,
                symbolSize: 8
            });
        }

        return {
            name: meta.deviceId,
            type: 'line',
            smooth: false,    // 强制直线
            data: pathData,
            lineStyle: { width: 2, color: baseColor },
            itemStyle: { color: baseColor }
        };
    });

    this.charts.vector.setOption({
        tooltip: {
            trigger: 'item',
            confine: true,
            position: function (point, params, dom, rect, size) {
                const x = point[0], boxW = size.contentSize[0], viewW = size.viewSize[0];
                return [x + (x + boxW > viewW ? -boxW - 20 : 20), point[1] + 20];
            }
        },
        legend: { bottom: 5, type: 'scroll' },
        grid: { top: 40, bottom: 60, left: 60, right: 40 },
        xAxis: { name: 'X位移(mm)', scale: true, splitLine: { show: true, lineStyle: { type: 'dashed', color: '#eee' } } },
        yAxis: { name: 'Y位移(mm)', scale: true, splitLine: { show: true, lineStyle: { type: 'dashed', color: '#eee' } } },
        series
    });
},

// 在 script.js 的 analysisModule 中替换此函数
renderTable() {
    const head = document.getElementById('full-table-head'),
          body = document.getElementById('full-table-body');
    if (!head || !body) return;

    if (this.selectedPoints.length === 0) {
        head.innerHTML = "";
        body.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#999;">请先选择监测点进行查询</td></tr>';
        return;
    }

    // 核心修改：表头改为降雨监测专用字段
    const cols = ['序号', '区域', '编号', '时间', '累计降水量(mm)', '实时降水量(mm)'];
    head.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;

    const start = new Date(document.getElementById('an-start').value);
    const end = new Date(document.getElementById('an-end').value);
    const msMap = { 'hour': 3600000, 'day': 86400000, 'week': 604800000, 'month': 2592000000 };
    const interval = msMap[this.tableFreq || 'hour'];

    let html = "", rowNum = 1;

    this.selectedPoints.forEach(devId => {
        const meta = mapModule.pMeta[devId] || { region: '未知', deviceId: devId };
        for (let currentTs = start.getTime(); currentTs <= end.getTime(); currentTs += interval) {
            const totalRain = this.getLogicData(devId, currentTs, 0);
            const realRain = this.getLogicData(devId, currentTs, 1);

            html += `
                <tr>
                    <td>${rowNum++}</td>
                    <td>${meta.region}</td>
                    <td style="font-weight:bold; color:#1c3d90">${meta.deviceId}</td>
                    <td>${new Date(currentTs).toLocaleString()}</td>
                    <td style="font-weight:bold; color:#1c3d90">${totalRain}</td>
                    <td style="color:#71C446">${realRain}</td>
                </tr>`;
            if (rowNum > 2000) break;
        }
    });
    body.innerHTML = html;
},
    toggleMetricMenu(e) { if (e) e.stopPropagation(); const menu = document.getElementById('metric-items-container'); if (menu) menu.style.display = (menu.style.display === 'block') ? 'none' : 'block'; },
// 替换 script.js 中的 analysisModule.renderMetricSelector 函数
renderMetricSelector() {
    const container = document.getElementById('metric-items-container');
    if (!container) return;

    let html = `
        <div class="multi-item" style="border-bottom: 2px solid #eee; margin-bottom: 5px; background: #f8fbff;">
            <input type="checkbox" id="met-an-all"
                   ${this.selectedGlobalMetrics.length === this.allMetrics.length ? 'checked' : ''}
                   onchange="analysisModule.handleMetricToggle(this)" value="全部">
            <label for="met-an-all" style="font-weight:bold; color:#1c3d90;">全选所有降雨指标</label>
        </div>
    `;

    // 渲染累计降水量和实时降水量两个选项
    this.allMetrics.forEach(metric => {
        html += `
            <div class="multi-item">
                <input type="checkbox" id="met-an-${metric}" value="${metric}"
                       ${this.selectedGlobalMetrics.includes(metric) ? 'checked' : ''}
                       onchange="analysisModule.handleMetricToggle(this)">
                <label for="met-an-${metric}">${metric}</label>
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

    const exportCols = ['累计降水量(mm)', '实时降水量(mm)'];

    container.innerHTML = exportCols.map(col => `
        <div class="multi-item" style="border:none; padding: 5px 10px;">
            <input type="checkbox" class="ex-check" id="ex-col-${col}" value="${col}" checked
                   onchange="analysisModule.syncExportToggleState()">
            <label for="ex-col-${col}" style="cursor:pointer; font-size:13px; color:#444; flex:1;">${col}</label>
        </div>`).join('');

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
        if (selectedCols.length === 0) { alert('请至少选择一个导出字段'); return; }

        const allTableCols = ['序号', '区域', '编号', '时间', '累计降水量(mm)', '实时降水量(mm)'];
        let csvContent = "\ufeff序号,区域,编号,时间," + selectedCols.join(",") + "\n";

        document.querySelectorAll('#full-table-body tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 4) return;
            let rowData = [cells[0].innerText, cells[1].innerText, cells[2].innerText, cells[3].innerText];
            selectedCols.forEach(col => {
                const idx = allTableCols.indexOf(col);
                if (idx !== -1) rowData.push(cells[idx].innerText.replace(/,/g, ""));
            });
            csvContent += rowData.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `降雨监测数据分析_${Date.now()}.csv`;
        link.click();
        document.getElementById('export-panel').style.display = 'none';
    },
    clearAll() {
        // 1. 重置区域：保持全选
        this.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];

        // 2. 关键修改：重置监测点为 WATER (降雨) 类型
        this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'WATER');

        // 3. 关键修改：重置默认指标为 累计降水量
        this.selectedGlobalMetrics = ['累计降水量(mm)'];

        this.tMultiplier = 1;

        // 4. 清空图表实例数据
        if (this.charts.curve) this.charts.curve.clear();
        if (this.charts.vector) this.charts.vector.clear();

        // 5. 清空报表 DOM 内容
        const head = document.getElementById('full-table-head');
        const body = document.getElementById('full-table-body');
        if (head) head.innerHTML = "";
        if (body) body.innerHTML = "";

        // 6. 重新同步 UI 状态（下拉框文字、复选框勾选状态等）
        this.syncFilterUI();
        this.updateMetricButtonLabel();
        this.renderMetricSelector();
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
    if (typeof appLogic !== 'undefined') appLogic.switchType('WATER');

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
            if (p.innerText.includes('年累积降雨量：(mm)')) {
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