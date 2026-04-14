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
        // 初始状态：全选区域，开启 GNSS
        this.selectedRegions = ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'];
        this.selectedPoints = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'FIRE');
        this.activeTypes.add('FIRE');
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

    // --- 修改位置：mapFilterModule.updateVisibility ---
    updateVisibility() {
        const selRegs = this.selectedRegions || ['全部'];

        // 1. 遍历并更新所有点位的显示状态
        document.querySelectorAll('.point-obj').forEach(p => {
            const meta = mapModule.pMeta[p.id];
            if (!meta) return;

            const isTypeMatch = this.activeTypes.has(meta.type);
            const isRegionMatch = selRegs.includes('全部') || selRegs.includes(meta.region);

            // 清除旧的动画类名
            p.classList.remove('point-glow-active', 'point-alarm-active');

            if (isTypeMatch && isRegionMatch) {
                p.style.display = 'block';

                // 核心修改：根据是否报警添加不同的动画类
                if (meta.isOnline) {
                    // 如果有报警(alarmIdx > 0)则添加报警动画，否则添加正常呼吸动画
                    if (meta.alarmIdx > 0) {
                        p.classList.add('point-alarm-active');
                    } else {
                        p.classList.add('point-glow-active');
                    }
                }
            } else {
                p.style.display = 'none';
            }
        });

        // 2. 核心修改：视图更新后，立即通知仪表盘刷新数据 (同步图表)
        if (typeof dashModule !== 'undefined') {
            dashModule.update();
        }
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
                    if (cfg.panelId === 'map-point-dropdown') this.handlePointInput();
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
        // 获取系统中所有的 FIRE 点位
        const allFire = Object.keys(mapModule.pMeta)
            .filter(id => mapModule.pMeta[id]?.type === 'FIRE')
            .map(id => ({ id, ...mapModule.pMeta[id] }));

        let list = [];
        if (this.selectedRegions.includes('全部')) {
            list = allFire;
        } else {
            list = allFire.filter(p => this.selectedRegions.includes(p.region));
        }

        if (filterVal && filterVal !== '全部' && !filterVal.includes('、')) {
            list = list.filter(p =>
                p.deviceId.toLowerCase().includes(filterVal.toLowerCase()) ||
                p.deviceId.replace('FIRE', '').includes(filterVal)
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
        const allFireIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'FIRE');
        const dropdown = document.getElementById('map-region-dropdown');

        if (val === '全部') {
            if (cb.checked) {
                this.selectedRegions = ['全部', ...allRegions];
                this.selectedPoints = [...allFireIds];
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
                    const regionPoints = allFireIds.filter(id => mapModule.pMeta[id].region === val);
                    regionPoints.forEach(id => { if (!this.selectedPoints.includes(id)) this.selectedPoints.push(id); });
                }
                const subSelected = this.selectedRegions.filter(r => r !== '全部');
                if (subSelected.length === allRegions.length) {
                    if (!this.selectedRegions.includes('全部')) this.selectedRegions.push('全部');
                }
            } else {
                this.selectedRegions = this.selectedRegions.filter(r => r !== val && r !== '全部');
                const regionPoints = allFireIds.filter(id => mapModule.pMeta[id].region === val);
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
        const allGnss = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'FIRE');

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
            // 修改后：同时针对 FIRE 和 GNSS 类型检查勾选状态（或者统一检查 selectedPoints）
            const isPointChecked = (meta.type === 'FIRE' || meta.type === 'GNSS') ? this.selectedPoints.includes(p.id) : true;

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

    // 3. 修改标签更新逻辑
    updateLabels() {
        // ...
        const pointInput = document.getElementById('map-point-input');
        if (pointInput) {
            // 过滤类型改为 'FIRE'
            const allFire = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id].type === 'FIRE');
            if (this.selectedPoints.length > 0 && this.selectedPoints.length === allFire.length) {
                pointInput.value = '全部';
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

        // 生成数据存入临时缓存，初始进入显示最新曲线模式
        this.currentOptions = this.generateChartOptions(startPos, endPos);
        this.isViewingHistory = false;

        document.getElementById('profile-workbench').style.display = 'flex';
        // 如果有历史记录则显示对比小球
        if (this.lastSavedOptions) {
            document.getElementById('profile-mini-trigger').style.display = 'flex';
        }

        this.updateWorkbenchUI();
    },

    // 4. 小球点击逻辑：在“最新曲线”和“历史记录”之间来回切换对比
    restoreWorkbench() {
        const workbench = document.getElementById('profile-workbench');

        // 如果面板已关闭，点击小球重新呼出历史
        if (workbench.style.display === 'none') {
            workbench.style.display = 'flex';
            this.isViewingHistory = true;
        }
        // 如果面板正打开，在两份数据间切换
        else {
            if (this.lastSavedOptions) {
                this.isViewingHistory = !this.isViewingHistory;
            }
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
                if (profileModule.isDrawing) {
                    e.stopPropagation();
                    profileModule.handlePointClick(p.id);
                }
                // 关键修复：允许 FIRE 类型的点位触发分析窗口
                else if (isOnline && (type === 'FIRE' || type === 'GNSS')) {
                    dashModule.focusWithRange(p.id);
                    analysisModule.open(this.pMeta[p.id]);
                }
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

    getSortedGnssData() {
            let data = Object.keys(mapModule.pMeta)
                .filter(id => {
                    const meta = mapModule.pMeta[id];
                    // 核心修改：将 GNSS 改为 FIRE
                    return meta && meta.type === 'FIRE' && meta.isOnline;
                })
                .map((id) => {
                    const meta = mapModule.pMeta[id];
                    const seed = parseInt(id.replace('pt-', '')) || 0;
                    const variance = (seed % 10) * 0.1;
                    let currentTemp = 25.0; // 煤自燃监测改为温度模拟
                    switch (meta.alarmIdx) {
                        case 0: currentTemp = 75.1 + variance * 10.5; break; // 一级：高温
                        case 1: currentTemp = 55.1 + variance * 8.5; break;  // 二级
                        case 2: currentTemp = 45.1 + variance * 5.8; break;  // 三级
                        case 3: currentTemp = 35.1 + variance * 3.8; break;  // 四级
                        default: currentTemp = 25.5 + (seed % 5) * 1.4;      // 正常
                    }
                    return {
                        id: id,
                        deviceId: meta.deviceId,
                        alarmIdx: meta.alarmIdx,
                        region: meta.region,
                        elevation: (1200 + Math.sin(seed) * 50).toFixed(1),
                        value: currentTemp.toFixed(1), // 温度值
                        threshold: [70, 50, 40, 30, "--"][meta.alarmIdx] // 对应阈值
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
                name: '温度（℃）',
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
            const tx = parseFloat(targetEl.style.left), ty = parseFloat(targetEl.style.top);

            mapModule.isDetailMode = true;
            document.getElementById('reset-gnss-btn').style.display = 'flex';
            this.initSpeedChart(targetId); // 更新趋势图

            let maxDiffX = 100, maxDiffY = 100;

            document.querySelectorAll('.point-obj').forEach(p => {
                const meta = mapModule.pMeta[p.id];
                // 核心修改：逻辑仅作用于 FIRE 类型点位
                if (meta && meta.type === 'FIRE') {
                    const px = parseFloat(p.style.left), py = parseFloat(p.style.top),
                        dist = Math.sqrt((px - tx) ** 2 + (py - ty) ** 2);

                    p.classList.remove('point-glow-active', 'point-focus-center');

                    if (p.id === targetId || dist <= 1000) {
                        p.style.display = 'block';
                        maxDiffX = Math.max(maxDiffX, Math.abs(px - tx));
                        maxDiffY = Math.max(maxDiffY, Math.abs(py - ty));

                        if (p.id === targetId) {
                            p.classList.add('point-focus-center'); // 对目标点应用重点强化动效
                        }
                    } else {
                        p.style.display = 'none';
                    }
                } else {
                    p.style.display = 'none';
                }
            });

            // 视口自动缩放
            const vp = document.getElementById('map-viewer'), cv = document.getElementById('map-canvas');
            const padding = 200;
            const scaleX = (vp.clientWidth / 2) / (maxDiffX + padding), scaleY = (vp.clientHeight / 2) / (maxDiffY + padding);
            mapModule.scale = Math.min(scaleX, scaleY, 1.2);
            mapModule.pos.x = (vp.clientWidth / 2) - (tx * mapModule.scale);
            mapModule.pos.y = (vp.clientHeight / 2) - (ty * mapModule.scale);
            cv.style.transform = `translate(${mapModule.pos.x}px, ${mapModule.pos.y}px) scale(${mapModule.scale})`;
        },
    changePage(p) {
        this.currentPage = p;
        this.renderWarningTable();
    },

   initOnlineChart() {
           // 核心修改：改为过滤 FIRE 类型
           const fireNodes = Object.values(mapModule.pMeta).filter(n => n.type === 'FIRE');
           const online = fireNodes.filter(n => n.isOnline).length,
               offline = fireNodes.length - online;
           const chart = echarts.init(document.getElementById('chart-on'));
           chart.setOption({
               title: {
                   text: fireNodes.length,
                   subtext: '监测点总数',
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
               if (params.name === '离线') this.showOfflineModal(fireNodes.filter(n => !n.isOnline));
           });
       },
  initAlarmChart() {
          // 核心修改：统计在线的 FIRE 点位
          const fireNodes = Object.values(mapModule.pMeta).filter(n => n.type === 'FIRE' && n.isOnline);
          const counts = [0, 0, 0, 0, 0];
          fireNodes.forEach(n => { counts[n.alarmIdx]++; });

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
              if (targetIdx === 4) return; // 正常状态不触发联动

              mapModule.isDetailMode = true;
              document.getElementById('reset-gnss-btn').style.display = 'flex';

              document.querySelectorAll('.point-obj').forEach(p => {
                  const meta = mapModule.pMeta[p.id];
                  // 核心修改：匹配 FIRE 类型、在线且报警等级一致的点
                  const isMatch = (meta && meta.type === 'FIRE') && (meta.isOnline) && (meta.alarmIdx === targetIdx);

                  p.classList.remove('point-glow-active', 'point-focus-center');
                  if (isMatch) {
                      p.style.display = 'block';
                      p.classList.add('point-glow-active'); // 添加同步动效
                  } else {
                      p.style.display = 'none';
                  }
              });
              mapModule.focus('FIRE'); // 聚焦到煤自燃报警点
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
            // 核心修改：恢复所有煤自燃监测点的显示
            document.querySelectorAll('.point-obj.type-FIRE').forEach(p => {
                p.style.display = 'block';
                p.classList.remove('point-focus-center', 'point-glow-active');
                const meta = mapModule.pMeta[p.id];
                if (meta && meta.isOnline && meta.alarmIdx === 0) {
                    p.classList.add('point-glow-active'); // 一级报警保持呼吸感
                }
            });
            mapModule.focus('FIRE');
            document.getElementById('reset-gnss-btn').style.display = 'none';
            dashModule.currentPage = 1;
            dashModule.renderWarningTable();
        }
};


const analysisModule = {
    charts: { curve: null, vector: null },
    selectedMetricsMap: {},
    selectedRegions: ['全部'],
    selectedPoints: [],
    selectedGlobalMetrics: ['温度(℃)'],
    tMultiplier: 1,
    tableFreq: 'hour',
    metricPage: 1,
    metricPageSize: 6,
    allMetrics: [
        '温度(℃)', '一氧化碳浓度(ppm)', '氧气浓度(%)'
    ],
    deviceColors: ['#ee6666', '#fac858', '#5470c6', '#91cc75', '#73c0de', '#3ba272'],
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

    // 1. 修改获取显示点位的逻辑
    getDisplayPoints(filterVal = '') {
        // 将此处过滤类型从 'GNSS' 改为 'FIRE'
        const allFire = Object.keys(mapModule.pMeta)
            .filter(id => mapModule.pMeta[id].type === 'FIRE')
            .map(id => ({ id, ...mapModule.pMeta[id] }));

        let list = [];
        if (this.selectedRegions.length === 0 || this.selectedRegions.includes('全部')) {
            list = allFire;
        } else {
            const cleanRegions = this.selectedRegions.filter(r => r !== '全部');
            list = allFire.filter(p => cleanRegions.includes(p.region));
        }

        // 搜索过滤逻辑（兼容 FIRE 编号）
        if (filterVal && filterVal !== '全部' && !filterVal.includes('、')) {
            list = list.filter(p =>
                p.deviceId.toLowerCase().includes(filterVal.toLowerCase()) ||
                p.deviceId.replace('FIRE','').includes(filterVal)
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
        // 关键修复：将筛选类型从 'GNSS' 改为 'FIRE'
        const allFireIds = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'FIRE');

        if (cb.value === '全部') {
            this.selectedRegions = cb.checked ? ['全部', ...allRegions] : [];
            this.selectedPoints = cb.checked ? [...allFireIds] : [];
        } else {
            if (cb.checked) {
                if (!this.selectedRegions.includes(cb.value)) this.selectedRegions.push(cb.value);
                // 关键修复：筛选区域内的 FIRE 点位
                allFireIds.filter(id => mapModule.pMeta[id]?.region === cb.value).forEach(id => {
                    if (!this.selectedPoints.includes(id)) this.selectedPoints.push(id);
                });
                if (this.selectedRegions.filter(r => r !== '全部').length === allRegions.length) this.selectedRegions.push('全部');
            } else {
                this.selectedRegions = this.selectedRegions.filter(r => r !== cb.value && r !== '全部');
                // 关键修复：移除该区域内的 FIRE 点位
                const regionPoints = allFireIds.filter(id => mapModule.pMeta[id]?.region === cb.value);
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
        // 关键修复：获取 FIRE 类型点位集合
        const allFire = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'FIRE');

        if (!val || val === '全部') {
            this.selectedPoints = (val === '全部') ? [...allFire] : [];
            this.selectedRegions = (val === '全部') ? ['全部', '北帮', '南帮', '东帮', '西帮', '中央区'] : [];
        } else {
            const parts = val.split(/[、,，\s]/).map(p => p.trim()).filter(p => p !== '');
            this.selectedPoints = [];
            this.selectedRegions = [];
            parts.forEach(part => {
                // 关键修复：匹配逻辑改为比对 FIRE 编号
                const matchedId = allFire.find(id => {
                    const deviceId = mapModule.pMeta[id]?.deviceId || "";
                    return deviceId.replace('FIRE', '') === part.replace(/FIRE/i, '');
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
            // 关键修复：统计 FIRE 类型总数
            const allFireCount = Object.keys(mapModule.pMeta).filter(id => mapModule.pMeta[id]?.type === 'FIRE').length;
            if (this.selectedPoints.length > 0 && this.selectedPoints.length >= allFireCount) {
                input.value = "全部";
            } else {
                // 关键修复：替换前缀为 FIRE
                const names = this.selectedPoints.map(id => mapModule.pMeta[id]?.deviceId?.replace('FIRE', ''));
                input.value = names.join('、');
            }
        }

        // 重新渲染下拉列表
        this.renderRegions();
        this.renderPoints('');
    },

getLogicData(devId, timestamp, metricIdx = 0) {
    const meta = mapModule.pMeta[devId] || { alarmIdx: 4 };
    const seed = parseInt(devId.replace('pt-', '')) || 0;

    // 基础波动
    const timePhase = timestamp / 3600000 + seed;
    const noise = Math.sin(timePhase) * 0.5;

    // 逻辑分支：0-温度，1-CO浓度，2-氧气浓度
    if (metricIdx === 0) {
        // 温度逻辑：一级报警~85℃，二级~60℃，正常~25℃
        const baseTemp = [85, 60, 45, 35, 25][meta.alarmIdx] || 25;
        return parseFloat((baseTemp + noise * 2 + (seed % 5)).toFixed(2));
    } else if (metricIdx === 1) {
        // CO浓度逻辑(ppm)：报警越高浓度越高
        const baseCO = [50, 20, 10, 5, 1][meta.alarmIdx] || 1;
        return parseFloat((baseCO + Math.abs(noise) * 3).toFixed(2));
    } else if (metricIdx === 2) {
        // 氧气浓度逻辑(%)：环境越危险氧气越低
        const baseO2 = [15, 17, 18.5, 19.5, 20.9][meta.alarmIdx] || 20.9;
        return parseFloat((baseO2 - Math.abs(noise) * 0.2).toFixed(2));
    }
    return 0;
},
// 替换 analysisModule 内部的 open 函数
// 替换 analysisModule 内部的 open 函数，解决按钮闪烁问题
    open(targetMeta) {
        const modal = document.getElementById('analysis-modal');
        if (modal) modal.style.display = 'flex';

        this.initFilter();

        // 1. 更新最大时间约束
        timeUtils.updateMaxConstraints();

        // 2. 先执行手动时间变更校验
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
                if (matchBtn) matchBtn.classList.add('active');
            }
            this.selectedPoints = [targetMeta.id];
            this.selectedRegions = [targetMeta.region];
        } else {
            // --- 场景二：常规开启 ---
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
            // 关键修复：将显示编号的替换逻辑从 GNSS 改为 FIRE
            if (input) input.value = targetMeta.deviceId.replace('FIRE', '');
        }

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

renderCurveChart() {
    const el = document.getElementById('combustion-chart-main'); // 指向煤自燃大图容器
    if (!el) return;

    if (this.charts.curve) {
        this.charts.curve.dispose();
    }
    if (this.selectedPoints.length === 0) return;

    this.charts.curve = echarts.init(el);
    const startVal = document.getElementById('an-start').value;
    const endVal = document.getElementById('an-end').value;
    const start = new Date(startVal), end = new Date(endVal);

    // 计算采样步长
    const totalHours = (end - start) / 3600000;
    let stepMs = totalHours <= 24 ? 1800000 : 3600000;

    const series = [];
    const richLineStyles = ['solid', 'dashed', 'dotted'];

    this.selectedPoints.forEach((devId, pIdx) => {
        const meta = mapModule.pMeta[devId] || { deviceId: devId };
        this.selectedGlobalMetrics.forEach((metric, mIdx) => {
            const metricFullIdx = this.allMetrics.indexOf(metric);
            const dataPoints = [];
            for (let t = start.getTime(); t <= end.getTime(); t += stepMs) {
                dataPoints.push([t, this.getLogicData(devId, t, metricFullIdx)]);
            }

            series.push({
                name: `${meta.deviceId}-${metric}`,
                type: 'line',
                smooth: true,
                showSymbol: false,
                data: dataPoints,
                lineStyle: {
                    width: 2.5,
                    type: richLineStyles[mIdx % richLineStyles.length]
                }
            });
        });
    });

    this.charts.curve.setOption({
        tooltip: {
            trigger: 'axis',
            confine: true,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#1c3d90',
            textStyle: { color: '#333', fontSize: 12 }
        },
        legend: {
            top: '0',
            type: 'scroll',
            padding: [5, 50]
        },
        // 核心：开启矢量缩放组件
        dataZoom: [
            {
                type: 'inside', // 鼠标滚轮缩放
                xAxisIndex: 0,
                filterMode: 'none'
            },
            {
                type: 'slider', // 底部滑动条缩放
                height: 18,
                bottom: 10,
                borderColor: 'transparent',
                backgroundColor: '#f0f0f0',
                fillerColor: 'rgba(28, 61, 144, 0.2)',
                handleStyle: { color: '#1c3d90' },
                xAxisIndex: 0
            }
        ],
        grid: { top: 60, bottom: 65, left: 60, right: 40 },
        xAxis: {
            type: 'time',
            axisLabel: { color: '#666' },
            splitLine: { show: true, lineStyle: { color: '#f0f0f0' } }
        },
        yAxis: {
            type: 'value',
            name: '监测数值',
            scale: true,
            axisLabel: { color: '#666' },
            splitLine: { lineStyle: { color: '#f0f0f0' } }
        },
        color: this.deviceColors,
        series: series
    });

    // 自适应大小
    window.addEventListener('resize', () => this.charts.curve && this.charts.curve.resize());
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

// --- 核心修改：表格渲染 (煤自燃表头 + 模拟数据) ---
    /* 完整替换 script.js 中的 analysisModule.renderTable 函数 */
    renderTable() {
        const headContainer = document.getElementById('full-table-head');
        const bodyContainer = document.getElementById('full-table-body');
        if (!headContainer || !bodyContainer) return;

        if (this.selectedPoints.length === 0) {
            headContainer.innerHTML = "";
            bodyContainer.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#999;">请选择监测点以加载数据</td></tr>';
            return;
        }

        // 1. 定义煤自燃监测 7 项表头 (自动填充到 headContainer)
        const headers = ['序号', '区域', '编号', '时间', '温度（℃）', '一氧化碳浓度(ppm)', '氧气浓度(%)'];
        headContainer.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

        // 2. 获取时间与频率配置 (保持原有显示频率逻辑不变)
        const startVal = document.getElementById('an-start').value;
        const endVal = document.getElementById('an-end').value;
        const start = new Date(startVal);
        const end = new Date(endVal);

        const freqMs = { 'hour': 3600000, 'day': 86400000, 'week': 604800000, 'month': 2592000000 };
        const interval = freqMs[this.tableFreq || 'hour'];

        let html = "", rowNum = 1;

        // 3. 遍历选中的监测点位和时间段生成数据
        this.selectedPoints.forEach(devId => {
            const meta = mapModule.pMeta[devId] || { region: '未知', deviceId: devId };

            for (let currentTs = start.getTime(); currentTs <= end.getTime(); currentTs += interval) {
                /**
                 * 根据煤自燃业务逻辑索引提取对应数据:
                 * index 0: 温度
                 * index 1: 一氧化碳浓度 (CO)
                 * index 2: 氧气浓度 (O2)
                 */
                const vTemp = this.getLogicData(devId, currentTs, 0);
                const vCO   = this.getLogicData(devId, currentTs, 1);
                const vO2   = this.getLogicData(devId, currentTs, 2);

                html += `
                <tr>
                    <td>${rowNum++}</td>
                    <td>${meta.region}</td>
                    <td style="font-weight:bold; color:#1c3d90">${meta.deviceId}</td>
                    <td>${new Date(currentTs).toLocaleString()}</td>
                    <td style="font-weight:bold; color:#71C446">${vTemp}</td>
                    <td>${vCO}</td>
                    <td>${vO2}</td>
                </tr>`;

                if (rowNum > 2000) break; // 保持原有性能保护限制
            }
        });

        bodyContainer.innerHTML = html;
    },
    toggleMetricMenu(e) { if (e) e.stopPropagation(); const menu = document.getElementById('metric-items-container'); if (menu) menu.style.display = (menu.style.display === 'block') ? 'none' : 'block'; },
// 替换 script.js 中的 analysisModule.renderMetricSelector 函数
    renderMetricSelector() {
        const container = document.getElementById('metric-items-container');
        if (!container) return;

        const isAllChecked = this.selectedGlobalMetrics.length === this.allMetrics.length;

        const headHtml = `
        <div class="multi-item" style="border-bottom: 2px solid #eee; margin-bottom: 5px; font-weight: bold; color: #1c3d90;">
            <input type="checkbox" id="met-an-all" value="全部" ${isAllChecked ? 'checked' : ''} onchange="analysisModule.handleMetricToggle(this)">
            <label for="met-an-all" style="flex:1; cursor:pointer;">全部指标</label>
        </div>`;

        const itemsHtml = this.allMetrics.map(metric => `
        <div class="multi-item">
            <input type="checkbox" id="met-an-${metric}" value="${metric}" ${this.selectedGlobalMetrics.includes(metric) ? 'checked' : ''} onchange="analysisModule.handleMetricToggle(this)">
            <label for="met-an-${metric}" style="flex:1; cursor:pointer;">${metric}</label>
        </div>`).join('');

        container.innerHTML = headHtml + itemsHtml;
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
    updateMetricButtonLabel() {
        const label = document.getElementById('metric-btn-label'); if (!label) return;
        label.innerText = (this.selectedGlobalMetrics.length === 0) ? "请选择指标..." : (this.selectedGlobalMetrics.join(', ').length > 12 ? this.selectedGlobalMetrics.join(', ').substring(0, 12) + '...' : this.selectedGlobalMetrics.join(', '));
        label.className = (this.selectedGlobalMetrics.length === 0) ? "placeholder-text" : "";
    },
    exportChart(type) { const chart = (type === 'curve') ? this.charts.curve : this.charts.vector; if (chart) { const link = document.createElement('a'); link.href = chart.getDataURL({ pixelRatio: 2, backgroundColor: '#fff' }); link.download = `GNSS分析_${type}_${Date.now()}.png`; link.click(); } },
    openExportDialog() { this.openExportDialogLogic(); },
// 替换 script.js 中的 analysisModule.openExportDialogLogic 函数
// 替换 script.js 中的 analysisModule.openExportDialogLogic 函数
    openExportDialogLogic() {
        const container = document.getElementById('export-metric-list');
        if (!container) return;

        // 关键修改：将导出列定义更改为煤自燃相关指标
        const exportCols = ['温度（℃）', '一氧化碳浓度(ppm)', '氧气浓度(%)'];

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

        // 关键修改：此数组必须与 renderTable 中生成的表格列顺序完全一致，用于定位索引
        const allTableCols = ['序号', '区域', '编号', '时间', '温度（℃）', '一氧化碳浓度(ppm)', '氧气浓度(%)'];

        // 生成 CSV 表头：前四项固定，后面拼接选中的动态指标
        let csvContent = "\ufeff序号,区域,编号,时间," + selectedCols.join(",") + "\n";

        document.querySelectorAll('#full-table-body tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 4) return;

            // 提取前四列基础信息
            let rowData = [cells[0].innerText, cells[1].innerText, cells[2].innerText, cells[3].innerText];

            // 根据勾选的指标，从对应的表格单元格中提取数值
            selectedCols.forEach(col => {
                const idx = allTableCols.indexOf(col);
                if (idx !== -1) {
                    rowData.push(cells[idx].innerText.replace(/,/g, ""));
                }
            });
            csvContent += rowData.join(",") + "\n";
        });

        // 文件下载逻辑
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `煤自燃数据分析_${Date.now()}.csv`;
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
window.onload = () => {
    if (typeof backgroundModule !== 'undefined') backgroundModule.init();
    if (typeof headerModule !== 'undefined') headerModule.init();
    if (typeof mapModule !== 'undefined') mapModule.init();
    if (typeof dashModule !== 'undefined') dashModule.init();

    // --- 修改开始：将默认初始化的类型从 'GNSS' 改为 'FIRE' (煤自燃) ---
    if (typeof appLogic !== 'undefined') appLogic.switchType('FIRE');
    // --- 修改结束 ---

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
            if (p.innerText.includes('监测点温度曲线')) {
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