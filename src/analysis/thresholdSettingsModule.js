// thresholdSettingsModule.js
export function getThresholdModalMarkup() {
    return `
    <div id="threshold-analysis-modal" class="threshold-modal-root" style="visibility: hidden;">
        <div class="threshold-modal-overlay"></div>
        <div class="threshold-modal-container">
            <div class="threshold-modal-header">
                <div class="title-group">
                    <span class="blue-brand-bar"></span>
                    <h3 class="main-title">预警阈值设置系统</h3>
                </div>
                <div class="mode-switch-group"></div>
                <span class="modal-close-new" onclick="window.thresholdModule.close()">×</span>
            </div>

            <div class="threshold-modal-body">
                <div id="threshold-left-tabs" class="threshold-tabs"></div>
                <div class="tab-content-container">
                    <div id="threshold-config-header" class="config-header flex-between"></div>
                    <div id="cards-container" class="config-cards flex-1 mb-10"></div>
                    <div class="info-wrap" id="info-tip-box">
                        <span class="info-icon">ℹ</span>
                        <span class="info-text" id="info-tip-text"></span>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

window.thresholdModule = {
    state: {
        isInitialized: false,
        activeTab: 'GNSS',
        warningType: 'threshold',
        autoWarningMode: 'single',
        paramType: '位移量',
        targetLevel: 'global',
        targetValue: '',
        selectedRegion: '',
        selectedLine: '',
        selectedDeviceType: '',
        selectedPoint: '',
        multiMetrics: { level1: '表面加速度', level2: '表面加速度', level3: '表面速度', level4: '表面速度' },
        waterSubType: '水位计',
        // GNSS 阈值模式新增
        gnssThresholdMode: 'actual',   // 'actual' 或 'standard'
        standardThresholdRatios: {      // 标准阈值各等级超出百分比（相对于平均位移）
            red: 100,   // 一级预警 100%
            orange: 80, // 二级预警 80%
            yellow: 60, // 三级预警 60%
            blue: 20    // 四级预警 20%
        }
    },

    // ================= 原有设备列表获取（阈值预警使用） =================
    getDevicesByTab: (tabName) => {
        if (!window.mapModule || !window.mapModule.pMeta) return[];
        const typeMap = {
            'GNSS': 'GNSS',
            '雷达监测': 'RADAR',
            '深部位移': 'DEEP',
            '应力监测': 'STRESS',
            '裂缝监测': 'CRACK',
            '煤自燃监测': 'FIRE',
            '降雨监测': 'RAIN',
            '地下水监测': 'WATER',
            '振动监测': 'VIB'
        };
        const targetType = typeMap[tabName];
        if (!targetType) return[];
        return Object.values(window.mapModule.pMeta)
            .filter(meta => meta.type === targetType && meta.isOnline)
            .map(meta => meta.deviceId);
    },

    // 获取所有在线 GNSS 监测点的位移平均值（用于标准阈值模式）
    getAverageGnssDisplacement: () => {
        if (!window.mapModule || !window.mapModule.pMeta) return 0;
        const gnssPoints = Object.values(window.mapModule.pMeta).filter(meta => meta.type === 'GNSS' && meta.isOnline);
        if (gnssPoints.length === 0) return 0;
        let totalDisp = 0;
        gnssPoints.forEach(meta => {
            // 模拟获取位移量（实际应从数据中获取，此处用随机数模拟，实际应替换为真实数据）
            const seed = parseInt(meta.id.replace('pt-', '')) || 0;
            const variance = (seed % 10) * 0.1;
            let speed = 0.5;
            switch (meta.alarmIdx) {
                case 0: speed = 8.1 + variance * 3.5; break;
                case 1: speed = 5.1 + variance * 2.5; break;
                case 2: speed = 4.1 + variance * 0.8; break;
                case 3: speed = 3.1 + variance * 0.8; break;
                default: speed = 0.5 + (seed % 5) * 0.4;
            }
            // 假设一天内的位移量（mm）
            const multiplier = window.mapModule.tMultiplier || 1;
            const dailyDisp = speed * 24 * multiplier;
            totalDisp += dailyDisp;
        });
        return totalDisp / gnssPoints.length;
    },

    // ================= 参数配置（完整保留） =================
    paramConfig: {
        '裂缝监测': {
            categories:[
                { name: '宽度变化量', components:[{ label: '宽度累计变化量', defaultVal: 200 }], unit: 'mm' },
                { name: '加速度', components:[
                    { label: 'x方向加速度', defaultVal: 200 },
                    { label: 'y方向加速度', defaultVal: 200 },
                    { label: 'z方向加速度', defaultVal: 200 }
                ], unit: 'mm/h²' },
                { name: '倾角', components:[
                    { label: 'x方向倾角', defaultVal: 200 },
                    { label: 'y方向倾角', defaultVal: 200 },
                    { label: 'z方向倾角', defaultVal: 200 }
                ], unit: '°' }
            ]
        },
        '煤自燃监测': {
            categories:[
                { name: '温度', components: [{ label: '温度', defaultVal: 200 }], unit: '℃' },
                { name: '一氧化碳浓度', components:[{ label: '一氧化碳浓度', defaultVal: 200 }], unit: 'PPm' },
                { name: '氧气浓度', components: [{ label: '氧气浓度', defaultVal: 200 }], unit: '%' }
            ]
        },
        '降雨监测': {
            categories:[
                { name: '累积降雨量', components: [{ label: '累积降雨量', defaultVal: 200 }], unit: 'mm' },
                { name: '实时降雨量', components:[{ label: '实时降雨量', defaultVal: 200 }], unit: 'mm' }
            ]
        },
        '地下水监测': {
            categories: {
                '水位计':[
                    { name: '水面高程', components:[{ label: '水面高程', defaultVal: 200 }], unit: 'm' },
                    { name: '空管长度', components:[{ label: '空管长度', defaultVal: 200 }], unit: 'm' }
                ],
                '流量计': [
                    { name: '流量', components:[{ label: '流量', defaultVal: 200 }], unit: 'm²/h' },
                    { name: '水位', components:[{ label: '水位', defaultVal: 200 }], unit: 'm' },
                    { name: '空隙水压', components: [{ label: '空隙水压', defaultVal: 200 }], unit: 'kPa' },
                    { name: '温度', components:[{ label: '温度', defaultVal: 200 }], unit: '℃' }
                ]
            }
        },
        '振动监测': {
            categories: [
                { name: '速度', components:[
                    { label: 'X速度', defaultVal: 200 },
                    { label: 'Y速度', defaultVal: 200 },
                    { label: 'H速度', defaultVal: 200 },
                    { label: 'XY速度', defaultVal: 200 },
                    { label: 'XYH速度', defaultVal: 200 }
                ], unit: 'mm/h' },
                { name: '位移', components:[
                    { label: 'X位移', defaultVal: 200 },
                    { label: 'Y位移', defaultVal: 200 },
                    { label: 'H位移', defaultVal: 200 },
                    { label: 'XY位移', defaultVal: 200 },
                    { label: 'XYH位移', defaultVal: 200 }
                ], unit: 'mm' },
                { name: '累积位移', components:[
                    { label: 'X累积位移', defaultVal: 200 },
                    { label: 'Y累积位移', defaultVal: 200 },
                    { label: 'H累积位移', defaultVal: 200 },
                    { label: 'XY累积位移', defaultVal: 200 },
                    { label: 'XYH累积位移', defaultVal: 200 }
                ], unit: 'mm' },
                { name: '加速度', components:[
                    { label: 'X加速度', defaultVal: 200 },
                    { label: 'Y加速度', defaultVal: 200 },
                    { label: 'H加速度', defaultVal: 200 }
                ], unit: 'mm/h²' },
                { name: '切线角', components: [{ label: '切线角', defaultVal: 200 }], unit: '°' }
            ]
        }
    },

    // ================= 联动数据源 =================
    getAllRegions: () => {
        return['北帮', '南帮', '东帮', '西帮', '中央区'];
    },

    getAllLines: () => {
        return['1号线', '2号线', '3号线', '4号线', '中央参考线'];
    },

    getLinesByRegion: (region) => {
        const regionToLine = {
            '北帮': '1号线',
            '南帮': '2号线',
            '东帮': '3号线',
            '西帮': '4号线',
            '中央区': '中央参考线'
        };
        const line = regionToLine[region];
        return line ? [line] :[];
    },

    getAllDeviceTypes: () => {
        return[
            'GNSS监测', '深部位移监测', '雷达监测', '裂缝监测', '煤自燃监测',
            '降雨监测', '地下水监测', '地下应力监测', '爆破震动监测'
        ];
    },

    getPointsByRegionAndLineAndDeviceType: (region, line, deviceType) => {
        const basePoints = {
            'GNSS监测':['GNSS01', 'GNSS02', 'GNSS03'],
            '深部位移监测':['DEEP01', 'DEEP02', 'DEEP03'],
            '雷达监测':['RADAR01', 'RADAR02', 'RADAR03'],
            '裂缝监测':['CRACK01', 'CRACK02', 'CRACK03'],
            '煤自燃监测':['FIRE01', 'FIRE02', 'FIRE03'],
            '降雨监测':['RAIN01', 'RAIN02', 'RAIN03'],
            '地下水监测': ['WATER01', 'WATER02', 'WATER03'],
            '地下应力监测': ['STRESS01', 'STRESS02', 'STRESS03'],
            '爆破震动监测': ['VIB01', 'VIB02', 'VIB03']
        };
        let points = basePoints[deviceType] || ['DEMO01'];
        let suffix = '';
        if (region === '北帮' && line === '1号线') suffix = '';
        else if (region === '南帮' && line === '2号线') suffix = '_南';
        else if (region === '东帮' && line === '3号线') suffix = '_东';
        else if (region === '西帮' && line === '4号线') suffix = '_西';
        else if (region === '中央区' && line === '中央参考线') suffix = '_中';
        else suffix = `_${region.substring(0,1)}_${line.substring(0,1)}`;
        let finalPoints = points.map(p => p + suffix);
        if (finalPoints.length === 0) finalPoints = [`默认监测点_${region}_${line}`];
        return finalPoints;
    },

    // ================= 单选组件（单源预警专用：无全部按钮、单选、只读防键盘弹出） =================
    renderSearchableSingleSelect: (options, inputId, dropdownId, placeholder, onSelect, defaultSelected = null) => {
        const container = document.createElement('div');
        container.className = 'searchable-single-select';
        container.style.position = 'relative';
        container.innerHTML = `
            <div class="single-select-input-wrapper" style="position:relative; width:100%;">
                <input type="text" id="${inputId}" class="breathing-select single-select-input" placeholder="${placeholder}" autocomplete="off" style="width:100%; box-sizing:border-box; padding-right:24px; cursor:pointer;" readonly>
                <span class="single-select-arrow" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); pointer-events:none; font-size:12px; color:#999;">▼</span>
            </div>
            <div id="${dropdownId}" class="single-select-dropdown" style="display: none; position: absolute; top: 100%; left: 0; width: 100%; z-index: 100000; background: #fff; border: 1px solid #1c3d90; border-radius: 4px; box-shadow: 0 6px 16px rgba(0,0,0,0.2); margin-top: 4px; overflow: hidden;">
                <div class="single-select-options" style="max-height: 240px; overflow-y: auto;"></div>
            </div>
        `;
        const input = container.querySelector(`#${inputId}`);
        const dropdown = container.querySelector(`#${dropdownId}`);
        const optionsContainer = dropdown.querySelector('.single-select-options');

        let currentSelected = defaultSelected;

        const updateInputDisplay = () => {
            if (!currentSelected) {
                input.value = '';
                input.style.color = '#999';
                input.placeholder = placeholder;
            } else {
                const opt = options.find(o => o.value === currentSelected);
                input.value = opt ? opt.label : currentSelected;
                input.style.color = '#333';
                input.placeholder = '';
            }
        };

        const renderOptions = () => {
            optionsContainer.innerHTML = options.map(opt => `
                <div class="single-select-option" data-value="${opt.value}" style="display:flex; align-items:center; gap:8px; padding:8px 12px; cursor:pointer; ${currentSelected === opt.value ? 'background:#e0e7ff; color:#1e3a8a; font-weight:bold;' : 'color:#444;'}">
                    <span style="font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${opt.label}">${opt.label}</span>
                </div>
            `).join('');

            optionsContainer.querySelectorAll('.single-select-option').forEach(optDiv => {
                optDiv.addEventListener('mouseenter', () => { if(currentSelected !== optDiv.dataset.value) optDiv.style.background = '#f0f7ff' });
                optDiv.addEventListener('mouseleave', () => { if(currentSelected !== optDiv.dataset.value) optDiv.style.background = 'transparent' });

                optDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentSelected = optDiv.dataset.value;
                    updateInputDisplay();
                    toggleDropdown(false);
                    if (onSelect) onSelect(currentSelected);
                });
            });
        };

        const toggleDropdown = (show) => {
            if (show) {
                document.querySelectorAll('.single-select-dropdown, .multi-select-dropdown').forEach(el => {
                    if(el.id !== dropdownId) el.style.display = 'none';
                });
                dropdown.style.display = 'block';
                renderOptions();
            } else {
                dropdown.style.display = 'none';
            }
        };

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                toggleDropdown(false);
            }
        });

        input.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown(dropdown.style.display !== 'block');
        });

        updateInputDisplay();

        const setSelected = (val) => {
            currentSelected = val;
            updateInputDisplay();
            if (dropdown.style.display === 'block') renderOptions();
        };

        return { container, setSelected, getSelected: () => currentSelected };
    },

    // ================= 可搜索多选组件（阈值预警/多源预警共用） =================
    renderSearchableMultiSelect: (options, inputId, dropdownId, placeholder, onSelect, defaultSelected =[]) => {
        const container = document.createElement('div');
        container.className = 'searchable-multi-select';
        container.style.position = 'relative';
        container.innerHTML = `
            <div class="multi-select-input-wrapper" style="position:relative; width:100%;">
                <input type="text" id="${inputId}" class="breathing-select multi-select-input" placeholder="${placeholder}" autocomplete="off" style="width:100%; box-sizing:border-box; padding-right:24px; cursor:pointer;" readonly>
                <span class="multi-select-arrow" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); pointer-events:none; font-size:12px; color:#999;">▼</span>
            </div>
            <div id="${dropdownId}" class="multi-select-dropdown" style="display: none; position: absolute; top: 100%; left: 0; width: 100%; z-index: 100000; background: #fff; border: 1px solid #1c3d90; border-radius: 4px; box-shadow: 0 6px 16px rgba(0,0,0,0.2); margin-top: 4px; overflow: hidden;">
                <div class="multi-select-options-header" style="border-bottom: 1px solid #eee;">
                    <div class="multi-select-all-btn" style="display: flex; align-items: center; justify-content: flex-start; padding: 8px 12px; gap: 8px; background: #e0e7ff; color: #1e3a8a; cursor: pointer; transition: background 0.2s;">
                        <input type="checkbox" style="pointer-events:none; margin:0;">
                        <span style="font-size:13px; font-weight:bold;">全部</span>
                    </div>
                </div>
                <div class="multi-select-options" style="max-height: 240px; overflow-y: auto;"></div>
            </div>
        `;
        const input = container.querySelector(`#${inputId}`);
        const dropdown = container.querySelector(`#${dropdownId}`);
        const optionsContainer = dropdown.querySelector('.multi-select-options');
        const allBtn = dropdown.querySelector('.multi-select-all-btn');

        let currentSelected = [...defaultSelected];

        const updateInputDisplay = () => {
            if (currentSelected.length === 0) {
                input.value = '';
                input.style.color = '#999';
                input.placeholder = placeholder;
            } else {
                input.value = currentSelected.map(v => {
                    const opt = options.find(o => o.value === v);
                    return opt ? opt.label : v;
                }).join('、');
                input.style.color = '#333';
                input.placeholder = '';
            }
        };

        const updateAllBtnState = () => {
            const allSelected = options.length > 0 && options.every(opt => currentSelected.includes(opt.value));
            const cb = allBtn.querySelector('input');
            if(cb) cb.checked = allSelected;
            if (allSelected) {
                allBtn.style.backgroundColor = '#c7d2fe';
            } else {
                allBtn.style.backgroundColor = '#e0e7ff';
            }
        };

        const renderOptions = () => {
            optionsContainer.innerHTML = options.map(opt => `
                <div class="multi-select-option" data-value="${opt.value}" style="display:flex; align-items:center; gap:8px; padding:8px 12px; cursor:pointer;">
                    <input type="checkbox" ${currentSelected.includes(opt.value) ? 'checked' : ''} style="pointer-events:none; margin:0;">
                    <span style="font-size:13px; color:#444;">${opt.label}</span>
                </div>
            `).join('');

            optionsContainer.querySelectorAll('.multi-select-option').forEach(optDiv => {
                optDiv.addEventListener('mouseenter', () => optDiv.style.background = '#f0f7ff');
                optDiv.addEventListener('mouseleave', () => optDiv.style.background = 'transparent');

                optDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const value = optDiv.dataset.value;
                    const cb = optDiv.querySelector('input');
                    if (currentSelected.includes(value)) {
                        currentSelected = currentSelected.filter(v => v !== value);
                        cb.checked = false;
                    } else {
                        currentSelected.push(value);
                        cb.checked = true;
                    }
                    updateInputDisplay();
                    updateAllBtnState();
                    if (onSelect) onSelect(currentSelected);
                });
            });
            updateAllBtnState();
        };

        const toggleAll = () => {
            const allSelected = options.length > 0 && options.every(opt => currentSelected.includes(opt.value));
            if (allSelected) {
                currentSelected =[];
            } else {
                currentSelected = options.map(opt => opt.value);
            }
            updateInputDisplay();
            renderOptions();
            if (onSelect) onSelect(currentSelected);
        };

        allBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleAll();
        });

        const toggleDropdown = (show) => {
            if (show) {
                document.querySelectorAll('.single-select-dropdown, .multi-select-dropdown').forEach(el => {
                    if(el.id !== dropdownId) el.style.display = 'none';
                });
                dropdown.style.display = 'block';
                renderOptions();
            } else {
                dropdown.style.display = 'none';
            }
        };

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                toggleDropdown(false);
            }
        });

        input.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown(dropdown.style.display !== 'block');
        });

        updateInputDisplay();

        const setSelected = (values) => {
            currentSelected = [...values];
            updateInputDisplay();
            if (dropdown.style.display === 'block') renderOptions();
        };

        return { container, setSelected, getSelected: () => [...currentSelected] };
    },

    // ================= 左侧标签渲染 =================
    renderLeftTabs: () => {
        const container = document.getElementById('threshold-left-tabs');
        if (!container) return;
        if (window.thresholdModule.state.warningType === 'auto') {
            container.innerHTML = `
                <div class="tab-btn active" data-auto-mode="single" onclick="window.thresholdModule.switchAutoMode('single')"><span>单源预警</span></div>
                <div class="tab-btn" data-auto-mode="multi" onclick="window.thresholdModule.switchAutoMode('multi')"><span>多源预警</span></div>
            `;
        } else {
            container.innerHTML = `
                <div class="tab-btn ${window.thresholdModule.state.activeTab === 'GNSS' ? 'active' : ''}" id="tab-GNSS" onclick="window.thresholdModule.switchTab('GNSS')"><span>GNSS监测</span></div>
                <div class="tab-btn ${window.thresholdModule.state.activeTab === '深部位移' ? 'active' : ''}" id="tab-深部位移" onclick="window.thresholdModule.switchTab('深部位移')"><span>深部位移监测</span></div>
                <div class="tab-btn ${window.thresholdModule.state.activeTab === '雷达监测' ? 'active' : ''}" id="tab-雷达监测" onclick="window.thresholdModule.switchTab('雷达监测')"><span>雷达监测</span></div>
                <div class="tab-btn ${window.thresholdModule.state.activeTab === '裂缝监测' ? 'active' : ''}" id="tab-裂缝监测" onclick="window.thresholdModule.switchTab('裂缝监测')"><span>裂缝监测</span></div>
                <div class="tab-btn ${window.thresholdModule.state.activeTab === '煤自燃监测' ? 'active' : ''}" id="tab-煤自燃监测" onclick="window.thresholdModule.switchTab('煤自燃监测')"><span>煤自燃监测</span></div>
                <div class="tab-btn ${window.thresholdModule.state.activeTab === '降雨监测' ? 'active' : ''}" id="tab-降雨监测" onclick="window.thresholdModule.switchTab('降雨监测')"><span>降雨监测</span></div>
                <div class="tab-btn ${window.thresholdModule.state.activeTab === '地下水监测' ? 'active' : ''}" id="tab-地下水监测" onclick="window.thresholdModule.switchTab('地下水监测')"><span>地下水监测</span></div>
                <div class="tab-btn ${window.thresholdModule.state.activeTab === '应力监测' ? 'active' : ''}" id="tab-应力监测" onclick="window.thresholdModule.switchTab('应力监测')"><span>地下应力监测</span></div>
                <div class="tab-btn ${window.thresholdModule.state.activeTab === '振动监测' ? 'active' : ''}" id="tab-振动监测" onclick="window.thresholdModule.switchTab('振动监测')"><span>爆破震动监测</span></div>
            `;
        }
    },

    switchAutoMode: (mode) => {
        if (window.thresholdModule.state.warningType !== 'auto') return;
        window.thresholdModule.state.autoWarningMode = mode;
        document.querySelectorAll('#threshold-left-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = Array.from(document.querySelectorAll('#threshold-left-tabs .tab-btn')).find(btn => btn.getAttribute('data-auto-mode') === mode);
        if (activeBtn) activeBtn.classList.add('active');
        window.thresholdModule.renderControls();
        window.thresholdModule.renderCards();
    },

    close: () => {
        const modal = document.getElementById('threshold-analysis-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.style.visibility = 'hidden';
            modal.style.opacity = '0';
        }
    },

    open: () => {
        window.thresholdModule.state.warningType = 'threshold';
        window.thresholdModule.state.autoWarningMode = 'single';
        window.thresholdModule.state.activeTab = 'GNSS';
        window.thresholdModule.state.paramType = '位移量';
        window.thresholdModule.state.targetLevel = 'global';
        window.thresholdModule.state.targetValue = '';
        window.thresholdModule.state.selectedRegion = '';
        window.thresholdModule.state.selectedLine = '';
        window.thresholdModule.state.selectedDeviceType = '';
        window.thresholdModule.state.selectedPoint = '';
        // 重置 GNSS 阈值模式为实际阈值
        window.thresholdModule.state.gnssThresholdMode = 'actual';
        window.thresholdModule.state.standardThresholdRatios = {
            red: 100, orange: 80, yellow: 60, blue: 20
        };

        const modal = document.getElementById('threshold-analysis-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
        }
        window.thresholdModule.renderLeftTabs();
        window.thresholdModule.renderControls();
        window.thresholdModule.renderCards();
    },

    switchTab: (tabName) => {
        if (window.thresholdModule.state.warningType !== 'threshold') return;
        window.thresholdModule.state.activeTab = tabName;
        const defaultParams = {
            'GNSS': '位移量',
            '雷达监测': '平均位移',
            '深部位移': '单位时间位移量',
            '应力监测': '累积应力',
            '裂缝监测': '宽度变化量',
            '煤自燃监测': '温度',
            '降雨监测': '累积降雨量',
            '地下水监测': (window.thresholdModule.state.waterSubType === '水位计') ? '水面高程' : '流量',
            '振动监测': '速度'
        };
        window.thresholdModule.state.paramType = defaultParams[tabName] || '位移量';
        document.querySelectorAll('#threshold-left-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
        const targetBtn = document.getElementById(`tab-${tabName}`);
        if (targetBtn) targetBtn.classList.add('active');
        window.thresholdModule.renderControls();
        window.thresholdModule.renderCards();
    },

    toggleMode: (mode) => {
        window.thresholdModule.state.warningType = mode;
        if (mode === 'auto') window.thresholdModule.state.autoWarningMode = 'single';
        window.thresholdModule.renderLeftTabs();
        window.thresholdModule.renderControls();
        window.thresholdModule.renderCards();

        const tabContent = document.querySelector('#threshold-analysis-modal .tab-content-container');
        if (tabContent) {
            tabContent.classList.add('fade-white');
            setTimeout(() => {
                tabContent.classList.remove('fade-white');
            }, 200);
        }
    },

    renderModeSwitch: () => {
        const container = document.querySelector('.threshold-modal-header .mode-switch-group');
        if (!container) return;
        const warningType = window.thresholdModule.state.warningType;
        container.innerHTML = `
            <div class="radio-group flex-align-center gap-12">
                <label class="radio-label"><input type="radio" name="warnType" value="threshold" class="breathing-radio" ${warningType === 'threshold' ? 'checked' : ''} onchange="window.thresholdModule.toggleMode('threshold')"> 阈值预警</label>
                <label class="radio-label"><input type="radio" name="warnType" value="auto" class="breathing-radio" ${warningType === 'auto' ? 'checked' : ''} onchange="window.thresholdModule.toggleMode('auto')"> 自动预警</label>
            </div>
        `;
    },

    renderControls: () => {
        const headerContainer = document.getElementById('threshold-config-header');
        const infoText = document.getElementById('info-tip-text');
        if (!headerContainer) return;

        window.thresholdModule.renderModeSwitch();

        const warningType = window.thresholdModule.state.warningType;
        const autoMode = window.thresholdModule.state.autoWarningMode;

        if (warningType === 'auto') {
            if (autoMode === 'single') {
                const leftContentHtml = `
                    <div class="flex-align-center gap-12" style="flex-wrap: nowrap; overflow: visible !important;" id="auto-single-controls">
                        <div class="flex-align-center gap-8"><span class="form-label">选择区域:</span><div id="auto-region-selector" style="width:115px;"></div></div>
                        <div class="flex-align-center gap-8"><span class="form-label">监测线:</span><div id="auto-line-selector" style="width:115px;"></div></div>
                        <div class="flex-align-center gap-8"><span class="form-label">设备类型:</span><div id="auto-device-type-selector" style="width:125px;"></div></div>
                        <div class="flex-align-center gap-8"><span class="form-label">监测点:</span><div id="auto-point-selector" style="width:125px;"></div></div>
                    </div>
                `;

                headerContainer.innerHTML = `
                    <div class="flex-between" style="width: 100%;">
                        <div class="flex-align-center gap-20" style="flex-wrap: nowrap;">${leftContentHtml}</div>
                        <button class="primary-btn" onclick="window.thresholdModule.save()">保存参数</button>
                    </div>
                `;

setTimeout(() => {
                    const regionContainer = document.getElementById('auto-region-selector');
                    const lineContainer = document.getElementById('auto-line-selector');
                    const deviceTypeContainer = document.getElementById('auto-device-type-selector');
                    const pointContainer = document.getElementById('auto-point-selector');

                    const regionsList = window.thresholdModule.getAllRegions();
                    const typesList = window.thresholdModule.getAllDeviceTypes();

                    // 1. 构建全局全量组合数据源（用于实现完美的漏斗过滤，保证初始有数据）
                    const allData =[];
                    regionsList.forEach(r => {
                        const linesList = window.thresholdModule.getLinesByRegion(r);
                        linesList.forEach(l => {
                            typesList.forEach(t => {
                                const pts = window.thresholdModule.getPointsByRegionAndLineAndDeviceType(r, l, t);
                                pts.forEach(p => {
                                    allData.push({ region: r, line: l, type: t, point: p });
                                });
                            });
                        });
                    });

                    let rSelect, lSelect, tSelect, pSelect;

                    // 2. 纯净级联下拉逻辑：基于 allData 进行动态过滤
                    const updateLineOptions = () => {
                        const r = window.thresholdModule.state.selectedRegion;

                        let validData = allData;
                        if (r) validData = validData.filter(d => d.region === r);

                        const lines = Array.from(new Set(validData.map(d => d.line)));

                        lineContainer.innerHTML = '';
                        lSelect = window.thresholdModule.renderSearchableSingleSelect(
                            lines.map(v => ({ value: v, label: v })), 'auto-line-input', 'auto-line-dropdown', '请选择监测线',
                            (val) => {
                                window.thresholdModule.state.selectedLine = val;
                                window.thresholdModule.state.selectedDeviceType = '';
                                window.thresholdModule.state.selectedPoint = '';
                                updateTypeOptions();
                            },
                            window.thresholdModule.state.selectedLine
                        );
                        lineContainer.appendChild(lSelect.container);
                        updateTypeOptions();
                    };

                    const updateTypeOptions = () => {
                        const r = window.thresholdModule.state.selectedRegion;
                        const l = window.thresholdModule.state.selectedLine;

                        let validData = allData;
                        if (r) validData = validData.filter(d => d.region === r);
                        if (l) validData = validData.filter(d => d.line === l);

                        const types = Array.from(new Set(validData.map(d => d.type)));

                        deviceTypeContainer.innerHTML = '';
                        tSelect = window.thresholdModule.renderSearchableSingleSelect(
                            types.map(v => ({ value: v, label: v })), 'auto-device-type-input', 'auto-device-type-dropdown', '请选择设备',
                            (val) => {
                                window.thresholdModule.state.selectedDeviceType = val;
                                window.thresholdModule.state.selectedPoint = '';
                                updatePointOptions();
                            },
                            window.thresholdModule.state.selectedDeviceType
                        );
                        deviceTypeContainer.appendChild(tSelect.container);
                        updatePointOptions();
                    };

                    const updatePointOptions = () => {
                        const r = window.thresholdModule.state.selectedRegion;
                        const l = window.thresholdModule.state.selectedLine;
                        const t = window.thresholdModule.state.selectedDeviceType;

                        // 动态过滤：如果某个条件为空，就不依据该条件过滤
                        let validData = allData;
                        if (r) validData = validData.filter(d => d.region === r);
                        if (l) validData = validData.filter(d => d.line === l);
                        if (t) validData = validData.filter(d => d.type === t);

                        // 去重并提取监测点
                        const pts = Array.from(new Set(validData.map(d => d.point)));

                        pointContainer.innerHTML = '';
                        pSelect = window.thresholdModule.renderSearchableSingleSelect(
                            pts.map(v => ({ value: v, label: v })), 'auto-point-input', 'auto-point-dropdown', '请选择监测点',
                            (val) => {
                                window.thresholdModule.state.selectedPoint = val;
                            },
                            window.thresholdModule.state.selectedPoint
                        );
                        pointContainer.appendChild(pSelect.container);
                    };

                    // 初始化触发区域下拉
                    regionContainer.innerHTML = '';
                    rSelect = window.thresholdModule.renderSearchableSingleSelect(
                        regionsList.map(v => ({ value: v, label: v })), 'auto-region-input', 'auto-region-dropdown', '请选择区域',
                        (val) => {
                            window.thresholdModule.state.selectedRegion = val;
                            window.thresholdModule.state.selectedLine = '';
                            window.thresholdModule.state.selectedDeviceType = '';
                            window.thresholdModule.state.selectedPoint = '';
                            updateLineOptions();
                        },
                        window.thresholdModule.state.selectedRegion
                    );
                    regionContainer.appendChild(rSelect.container);

                    // 启动级联链条
                    updateLineOptions();

                }, 0);

                infoText.innerHTML = '单源预警模式：基于单一监测指标（表面速度/表面加速度）设定阈值，支持区域→监测线→设备类型→监测点四级单选筛选。';
            } else {
                const regions = window.thresholdModule.getAllRegions();
                const leftContentHtml = `<div class="flex-align-center gap-8"><span class="form-label">设置目标区域:</span><div id="auto-target-region-selector" style="width:200px;"></div></div>`;
                headerContainer.innerHTML = `
                    <div class="flex-between" style="width: 100%;">
                        <div class="flex-align-center gap-20" style="flex-wrap: wrap;">${leftContentHtml}</div>
                        <button class="primary-btn" onclick="window.thresholdModule.save()">保存参数</button>
                    </div>
                `;
                setTimeout(() => {
                    const targetContainer = document.getElementById('auto-target-region-selector');
                    const regionOptions = regions.map(r => ({ value: r, label: r }));
                    let targetRegions = window.thresholdModule.state.targetValue ? window.thresholdModule.state.targetValue.split('、') :[];
                    const regionSelect = window.thresholdModule.renderSearchableMultiSelect(
                        regionOptions, 'auto-target-region-input', 'auto-target-region-dropdown', '请选择目标区域',
                        (vals) => { window.thresholdModule.state.targetValue = vals.join('、'); },
                        targetRegions
                    );
                    targetContainer.appendChild(regionSelect.container);
                }, 0);
                infoText.innerHTML = '多源预警模式：支持为不同预警等级独立选择预警参数。';
            }
            document.getElementById('info-tip-box').style.display = 'flex';
            return;
        }

// ================= 阈值预警模式 =================
        const tab = window.thresholdModule.state.activeTab;
        let selectHtml = '';
        let extraControlsHtml = '';

        if (tab === 'GNSS') {
            const mode = window.thresholdModule.state.gnssThresholdMode;

            // 修复点1：将“阈值模式”独立分配给 extraControlsHtml，使其融入顶层的水平 flex 布局
            extraControlsHtml = `
                <div class="flex-align-center gap-8">
                    <span class="form-label">阈值模式:</span>
                    <select class="breathing-select" style="width: 110px;" onchange="window.thresholdModule.setGnssThresholdMode(this.value)">
                        <option value="actual" ${mode === 'actual' ? 'selected' : ''}>实际阈值</option>
                        <option value="standard" ${mode === 'standard' ? 'selected' : ''}>标准阈值</option>
                    </select>
                </div>
            `;

            // 修复点2：这里只保留“预警参数类型”下拉框本身，不要外层多余的 div
            selectHtml = `<select class="breathing-select" style="width: 120px;" onchange="window.thresholdModule.state.paramType=this.value; window.thresholdModule.renderCards()">
                            <option value="位移量" ${window.thresholdModule.state.paramType === '位移量' ? 'selected' : ''}>位移量</option>
                            <option value="位移速度" ${window.thresholdModule.state.paramType === '位移速度' ? 'selected' : ''}>位移速度</option>
                            <option value="位移加速度" ${window.thresholdModule.state.paramType === '位移加速度' ? 'selected' : ''}>位移加速度</option>
                          </select>`;

            infoText.innerHTML = mode === 'actual'
                ? `注：实际阈值模式可分别设置 <b>位移量</b>、<b>位移速度</b> 或 <b>位移加速度</b> 的预警阈值。`
                : `注：标准阈值模式基于全部GNSS监测点的平均位移值，按超出百分比自动计算各等级阈值。`;
                        } else if (tab === '雷达监测') {
            selectHtml = `<select class="breathing-select" style="width: 120px;" onchange="window.thresholdModule.state.paramType=this.value; window.thresholdModule.renderCards()">
                            <option value="平均位移" ${window.thresholdModule.state.paramType === '平均位移' ? 'selected' : ''}>平均位移</option>
                            <option value="平均速度" ${window.thresholdModule.state.paramType === '平均速度' ? 'selected' : ''}>平均速度</option>
                            <option value="平均加速度" ${window.thresholdModule.state.paramType === '平均加速度' ? 'selected' : ''}>平均加速度</option>
                          </select>`;
            infoText.innerHTML = `注：预警参数可设置为 <b>平均位移</b>、<b>平均速度</b> 或 <b>平均加速度</b>，范围为 <b>50m²</b> 的平均值。`;
        } else if (tab === '深部位移') {
            selectHtml = `<input type="text" value="单位时间位移量" readonly class="breathing-input text-center" style="width: 120px;">`;
            infoText.innerHTML = `注：预警参数为 <b>单位时间位移量</b>，单位为 <b>mm</b>。`;
        } else if (tab === '应力监测') {
            selectHtml = `<select class="breathing-select" style="width: 120px;" onchange="window.thresholdModule.state.paramType=this.value; window.thresholdModule.renderCards()">
                            <option value="累积应力" ${window.thresholdModule.state.paramType === '累积应力' ? 'selected' : ''}>累积应力</option>
                            <option value="突变应力" ${window.thresholdModule.state.paramType === '突变应力' ? 'selected' : ''}>突变应力</option>
                          </select>`;
            infoText.innerHTML = `注：预警参数可设置为 <b>累积应力</b> 或 <b>突变应力</b>，单位为 <b>kPa</b>。`;
        } else if (tab === '裂缝监测') {
            let categories = window.thresholdModule.paramConfig['裂缝监测'].categories;
            selectHtml = `<select class="breathing-select" style="width: 120px;" onchange="window.thresholdModule.state.paramType=this.value; window.thresholdModule.renderCards()">
                            ${categories.map(cat => `<option value="${cat.name}" ${window.thresholdModule.state.paramType === cat.name ? 'selected' : ''}>${cat.name}</option>`).join('')}
                          </select>`;
            infoText.innerHTML = `注：预警参数可设置为 <b>宽度变化量(mm)</b>、<b>加速度(mm/h²)</b> 或 <b>倾角(°)</b>，右侧将为各等级分别设置对应分量的阈值。`;
        } else if (tab === '煤自燃监测') {
            let categories = window.thresholdModule.paramConfig['煤自燃监测'].categories;
            selectHtml = `<select class="breathing-select" style="width: 120px;" onchange="window.thresholdModule.state.paramType=this.value; window.thresholdModule.renderCards()">
                            ${categories.map(cat => `<option value="${cat.name}" ${window.thresholdModule.state.paramType === cat.name ? 'selected' : ''}>${cat.name}</option>`).join('')}
                          </select>`;
            infoText.innerHTML = `注：预警参数可设置为 <b>温度(℃)</b>、<b>一氧化碳浓度(PPm)</b> 或 <b>氧气浓度(%)</b>，右侧将为各等级分别设置阈值。`;
        } else if (tab === '降雨监测') {
            let categories = window.thresholdModule.paramConfig['降雨监测'].categories;
            selectHtml = `<select class="breathing-select" style="width: 120px;" onchange="window.thresholdModule.state.paramType=this.value; window.thresholdModule.renderCards()">
                            ${categories.map(cat => `<option value="${cat.name}" ${window.thresholdModule.state.paramType === cat.name ? 'selected' : ''}>${cat.name}</option>`).join('')}
                          </select>`;
            infoText.innerHTML = `注：预警参数可设置为 <b>累积降雨量(mm)</b> 或 <b>实时降雨量(mm)</b>，右侧将为各等级分别设置阈值。`;
        } else if (tab === '地下水监测') {
            const subType = window.thresholdModule.state.waterSubType;
            let categories = window.thresholdModule.paramConfig['地下水监测'].categories[subType] ||[];
            selectHtml = `<select class="breathing-select" style="width: 120px;" onchange="window.thresholdModule.state.paramType=this.value; window.thresholdModule.renderCards()">
                            ${categories.map(cat => `<option value="${cat.name}" ${window.thresholdModule.state.paramType === cat.name ? 'selected' : ''}>${cat.name}</option>`).join('')}
                          </select>`;
            extraControlsHtml = `
                <div class="flex-align-center gap-8" style="margin-left: 8px;">
                    <span class="form-label">设备类型:</span>
                    <select id="water-sub-type-select" class="breathing-select" style="width: 100px;" onchange="window.thresholdModule.updateWaterSubType(this.value)">
                        <option value="水位计" ${window.thresholdModule.state.waterSubType === '水位计' ? 'selected' : ''}>水位计</option>
                        <option value="流量计" ${window.thresholdModule.state.waterSubType === '流量计' ? 'selected' : ''}>流量计</option>
                    </select>
                </div>
            `;
            infoText.innerHTML = (subType === '水位计')
                ? `注：水位计预警参数可选<b>水面高程(m)</b>或<b>空管长度(m)</b>。`
                : `注：流量计预警参数可选<b>流量(m²/h)</b>、<b>水位(m)</b>、<b>空隙水压(kPa)</b>或<b>温度(℃)</b>。`;
        } else if (tab === '振动监测') {
            let categories = window.thresholdModule.paramConfig['振动监测'].categories;
            selectHtml = `<select class="breathing-select" style="width: 120px;" onchange="window.thresholdModule.state.paramType=this.value; window.thresholdModule.renderCards()">
                            ${categories.map(cat => `<option value="${cat.name}" ${window.thresholdModule.state.paramType === cat.name ? 'selected' : ''}>${cat.name}</option>`).join('')}
                          </select>`;
            infoText.innerHTML = `注：预警参数可选<b>速度(mm/h)</b>、<b>位移(mm)</b>、<b>累积位移(mm)</b>、<b>加速度(mm/h²)</b>或<b>切线角(°)</b>，右侧将为各等级分别设置对应分量的阈值。`;
        }

const radarAreaHtml = (tab === '雷达监测') ? `
            <div id="radar-area-box" class="flex-align-center gap-8" style="display:flex; margin-left: 8px;">
                <span class="form-label">预警评估范围:</span>
                <div class="input-with-unit"><input type="number" value="50" class="breathing-input-left" id="radar-eval-area" style="width:60px;"><span class="unit-addon">m²</span></div>
            </div>
        ` : `<div id="radar-area-box" style="display:none;"></div>`;

// 🌟 新增：判断是否为 GNSS 标准阈值模式，若是则隐藏对应组件
        const isStandardMode = (tab === 'GNSS' && window.thresholdModule.state.gnssThresholdMode === 'standard');
        const hideParamsStyle = isStandardMode ? 'display: none !important;' : 'display: flex;';

        // 修复点3：增加 flex-wrap: nowrap; white-space: nowrap; 强制所有组件在一行内显示
        const leftGroupHtml = `
            <div class="flex-align-center gap-20" style="flex-wrap: nowrap; white-space: nowrap;">
                ${extraControlsHtml ? `<div class="flex-align-center gap-8">${extraControlsHtml}</div>` : ''}
                <!-- 🌟 附加隐藏样式 hideParamsStyle -->
                <div class="flex-align-center gap-10" id="gnss-param-row" style="${hideParamsStyle}">
                    <span class="form-label">预警参数类型:</span>
                    <div id="param-select-container" style="display: flex;">${selectHtml}</div>
                </div>
                <!-- 🌟 附加隐藏样式 hideParamsStyle -->
                <div class="flex-align-center gap-8" style="${hideParamsStyle}">
                    <span class="form-label" style="font-size: 13px;">设置目标:</span>
                    <select class="breathing-select" style="width: 85px;" onchange="window.thresholdModule.updateTarget(this.value, true)">
                        <option value="global" ${window.thresholdModule.state.targetLevel === 'global' ? 'selected' : ''}>全局</option>
                        <option value="region" ${window.thresholdModule.state.targetLevel === 'region' ? 'selected' : ''}>区域</option>
                        <option value="line" ${window.thresholdModule.state.targetLevel === 'line' ? 'selected' : ''}>监测线</option>
                        <option value="point" ${window.thresholdModule.state.targetLevel === 'point' ? 'selected' : ''}>监测点</option>
                    </select>
                    <div id="sub-target-container"></div>
                    ${radarAreaHtml}
                </div>
            </div>
        `;

        // 修复点4：同样取消换行，并将按钮设置 flex-shrink: 0 避免被挤压缩小
        headerContainer.innerHTML = `
            <div class="flex-between" style="width: 100%;">
                <div class="flex-align-center gap-20" style="flex-wrap: nowrap; overflow-x: visible;">
                    ${leftGroupHtml}
                </div>
                <button class="primary-btn" style="flex-shrink: 0;" onclick="window.thresholdModule.save()">保存参数</button>
            </div>
        `;
        document.getElementById('info-tip-box').style.display = 'flex';
        // 初次加载时不强制清空
        window.thresholdModule.updateTarget(window.thresholdModule.state.targetLevel, false);
        },

// 新增：切换 GNSS 阈值模式
    setGnssThresholdMode: (mode) => {
        window.thresholdModule.state.gnssThresholdMode = mode;
        // 关键：重新渲染控制栏，触发隐藏逻辑
        window.thresholdModule.renderControls();
        window.thresholdModule.renderCards();
    },

    // 更新标准阈值百分比
    updateStandardRatio: (level, value) => {
        const ratio = parseFloat(value);
        if (!isNaN(ratio) && ratio >= 0) {
            window.thresholdModule.state.standardThresholdRatios[level] = ratio;
            window.thresholdModule.renderCards(); // 重新渲染以更新显示的阈值
        }
    },

    updateWaterSubType: (subType) => {
        window.thresholdModule.state.waterSubType = subType;
        if (subType === '水位计') window.thresholdModule.state.paramType = '水面高程';
        else window.thresholdModule.state.paramType = '流量';
        window.thresholdModule.renderControls();
        window.thresholdModule.renderCards();
    },

    updateTarget: (level, isUserAction = false) => {
        window.thresholdModule.state.targetLevel = level;

        // 核心修改：如果是一级条件的更改（用户主动切换），彻底清空二级的输入/选择状态
        if (isUserAction) {
            window.thresholdModule.state.targetValue = '';
        }

        const subContainer = document.getElementById('sub-target-container');
        if (!subContainer) return;
        subContainer.innerHTML = '';

        if (level === 'global') {
            // 无额外控件
        } else if (level === 'region') {
            const regions = window.thresholdModule.getAllRegions();
            const options = regions.map(r => ({ value: r, label: r }));
            let targetRegions = window.thresholdModule.state.targetValue ? window.thresholdModule.state.targetValue.split('、') :[];
            const { container, setSelected } = window.thresholdModule.renderSearchableMultiSelect(
                options, 'region-multi-target', 'region-multi-dropdown', '请选择区域',
                (vals) => { window.thresholdModule.state.targetValue = vals.join('、'); },
                targetRegions
            );
            subContainer.appendChild(container);
        } else if (level === 'line') {
            const lines = window.thresholdModule.getAllLines();
            const options = lines.map(l => ({ value: l, label: l }));
            let targetLines = window.thresholdModule.state.targetValue ? window.thresholdModule.state.targetValue.split('、') :[];
            const { container, setSelected } = window.thresholdModule.renderSearchableMultiSelect(
                options, 'line-multi-target', 'line-multi-dropdown', '请选择监测线',
                (vals) => { window.thresholdModule.state.targetValue = vals.join('、'); },
                targetLines
            );
            subContainer.appendChild(container);
        } else if (level === 'point') {
            const tab = window.thresholdModule.state.activeTab;
            const devices = window.thresholdModule.getDevicesByTab(tab);
            const options = devices.map(d => ({ value: d, label: d }));
            let targetPoints = window.thresholdModule.state.targetValue ? window.thresholdModule.state.targetValue.split('、') :[];
            const { container, setSelected } = window.thresholdModule.renderSearchableMultiSelect(
                options, 'point-multi-target', 'point-multi-dropdown', '请选择监测点',
                (vals) => { window.thresholdModule.state.targetValue = vals.join('、'); },
                targetPoints
            );
            subContainer.appendChild(container);
        }
    },

    updateAutoTargetRegion: (region) => {
        window.thresholdModule.state.targetValue = region;
        window.thresholdModule.renderCards();
    },

    renderCards: () => {
        const container = document.getElementById('cards-container');
        if (!container) return;
        const warningType = window.thresholdModule.state.warningType;
        if (warningType === 'auto') {
            const autoMode = window.thresholdModule.state.autoWarningMode;
            if (autoMode === 'single') {
                container.innerHTML = window.thresholdModule.renderSingleSourceCards();
            } else {
                container.innerHTML = window.thresholdModule.renderMultiSourceCards();
            }
            return;
        }

        // 阈值预警模式卡片渲染
        const tab = window.thresholdModule.state.activeTab;
        const pType = window.thresholdModule.state.paramType;
        const levels =[
            { id: 'red', name: '一级预警', label: '红色', val: 200 },
            { id: 'orange', name: '二级预警', label: '橙色', val: 150 },
            { id: 'yellow', name: '三级预警', label: '黄色', val: 100 },
            { id: 'blue', name: '四级预警', label: '蓝色', val: 80 }
        ];

        const isOriginalFour = (tab === 'GNSS' || tab === '雷达监测' || tab === '深部位移' || tab === '应力监测');
        if (isOriginalFour) {
            let cardsHtml = '';
            if (tab === 'GNSS') {
                const mode = window.thresholdModule.state.gnssThresholdMode;
                if (mode === 'actual') {
                    // 原有实际阈值模式
                    const prefix = pType === '位移量' ? '位移' : (pType === '位移速度' ? '速度' : '加速度');
                    const unit = pType === '位移量' ? 'mm' : (pType === '位移速度' ? 'mm/d' : 'mm/d²');
                    cardsHtml = levels.map(l => `
                        <div class="threshold-card border-${l.id}">
                            <div class="card-title text-${l.id}"><div><span class="color-dot bg-${l.id}"></span> ${l.name} (${l.label})</div><span class="sub-cond">连续2次</span></div>
                            <div class="card-body">
                                <div class="input-row"><input type="checkbox" checked class="breathing-check"><label>Z${prefix} ></label><input type="number" value="${l.val}" class="breathing-num"><span class="unit">${unit}</span></div>
                                <div class="input-row"><input type="checkbox" class="breathing-check"><label>Y${prefix} ></label><input type="number" value="${l.val}" class="breathing-num"><span class="unit">${unit}</span></div>
                                <div class="input-row"><input type="checkbox" class="breathing-check"><label>X${prefix} ></label><input type="number" value="${l.val}" class="breathing-num"><span class="unit">${unit}</span></div>
                            </div>
                        </div>`).join('');
                } else {
                    // 标准阈值模式：显示平均位移和按比例计算的阈值
                    const avgDisp = window.thresholdModule.getAverageGnssDisplacement();
                    const ratios = window.thresholdModule.state.standardThresholdRatios;
                    const calcThreshold = (ratio) => (avgDisp * ratio / 100).toFixed(2);
                    cardsHtml = `
                        <div class="threshold-info" style="grid-column: span 4; background:#f0f7ff; border-radius:12px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap;">
                            <span><strong>当前全部GNSS监测点平均位移：</strong> ${avgDisp.toFixed(2)} mm</span>
                        </div>
                    `;
                    cardsHtml += levels.map(l => {
                        let levelKey = l.id;
                        let ratio = ratios[levelKey];
                        let thresholdVal = calcThreshold(ratio);
                        let unit = 'mm';
                        return `
                            <div class="threshold-card border-${l.id}">
                                <div class="card-title text-${l.id}"><div><span class="color-dot bg-${l.id}"></span> ${l.name} (${l.label})</div></div>
                                <div class="card-body">
                                    <div class="input-row"><span style="width:100px;">超出百分比:</span><input type="number" value="${ratio}" class="breathing-num" style="width:70px;" onchange="window.thresholdModule.updateStandardRatio('${levelKey}', this.value)"><span class="unit">%</span></div>
                                    <div class="input-row"><span style="width:100px;">阈值 ></span><input type="number" value="${thresholdVal}" class="breathing-num" style="width:70px;" readonly><span class="unit">${unit}</span></div>
<div class="input-row" style="justify-content: center; margin-top: 0.5em;"><span>（自动计算）</span></div>                                </div>
                            </div>
                        `;
                    }).join('');
                }
            } else if (tab === '雷达监测') {
                const unit = pType === '平均位移' ? 'mm' : (pType === '平均速度' ? 'mm/d' : 'mm/d²');
                cardsHtml = levels.map(l => `
                    <div class="threshold-card border-${l.id}">
                        <div class="card-title text-${l.id}"><div><span class="color-dot bg-${l.id}"></span> ${l.name} (${l.label})</div></div>
                        <div class="card-body"><div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-70">${pType} ></label><input type="number" value="${l.val}" class="breathing-num"><span class="unit">${unit}</span></div></div>
                    </div>`).join('');
            } else if (tab === '深部位移') {
                cardsHtml = levels.map(l => `
                    <div class="threshold-card border-${l.id}">
                        <div class="card-title text-${l.id}"><div><span class="color-dot bg-${l.id}"></span> ${l.name} (${l.label})</div></div>
                        <div class="card-body"><div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-110">单位时间位移量 ></label><input type="number" value="${l.val}" class="breathing-num"><span class="unit">mm</span></div></div>
                    </div>`).join('');
            } else if (tab === '应力监测') {
                cardsHtml = levels.map(l => `
                    <div class="threshold-card border-${l.id}">
                        <div class="card-title text-${l.id}"><div><span class="color-dot bg-${l.id}"></span> ${l.name} (${l.label})</div></div>
                        <div class="card-body"><div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-80">${pType} ></label><input type="number" value="${l.val}" class="breathing-num"><span class="unit">kPa</span></div></div>
                    </div>`).join('');
            }
            container.innerHTML = cardsHtml;
            return;
        }

        let components =[];
        let unit = '';
        let categoryName = pType;
        if (tab === '裂缝监测') {
            const cat = window.thresholdModule.paramConfig['裂缝监测'].categories.find(c => c.name === categoryName);
            if (cat) { components = cat.components; unit = cat.unit; }
        } else if (tab === '煤自燃监测') {
            const cat = window.thresholdModule.paramConfig['煤自燃监测'].categories.find(c => c.name === categoryName);
            if (cat) { components = cat.components; unit = cat.unit; }
        } else if (tab === '降雨监测') {
            const cat = window.thresholdModule.paramConfig['降雨监测'].categories.find(c => c.name === categoryName);
            if (cat) { components = cat.components; unit = cat.unit; }
        } else if (tab === '地下水监测') {
            const subType = window.thresholdModule.state.waterSubType;
            const cat = window.thresholdModule.paramConfig['地下水监测'].categories[subType].find(c => c.name === categoryName);
            if (cat) { components = cat.components; unit = cat.unit; }
        } else if (tab === '振动监测') {
            const cat = window.thresholdModule.paramConfig['振动监测'].categories.find(c => c.name === categoryName);
            if (cat) { components = cat.components; unit = cat.unit; }
        }

        if (components.length === 0) {
            container.innerHTML = '<div style="padding:20px; text-align:center;">暂无配置</div>';
            return;
        }

        const cardsHtml = levels.map(level => {
            const bodyRows = components.map(comp => `
                <div class="input-row">
                    <input type="checkbox" checked class="breathing-check">
                    <label>${comp.label} ></label>
                    <input type="number" value="${level.val}" class="breathing-num">
                    <span class="unit">${unit}</span>
                </div>
            `).join('');
            return `
                <div class="threshold-card border-${level.id}">
                    <div class="card-title text-${level.id}"><div><span class="color-dot bg-${level.id}"></span> ${level.name} (${level.label})</div></div>
                    <div class="card-body">
                        ${bodyRows}
                    </div>
                </div>
            `;
        }).join('');
        container.innerHTML = cardsHtml;
    },

renderSingleSourceCards: () => {
        // 修改点：将数组顺序从 四、三、二、一 改为 一、二、三、四
        const levels =[
            { id: 'red', name: '一级预警', label: '红色', indicator: '表面加速度', unit: 'mm/d²', sig: '0.001' },
            { id: 'orange', name: '二级预警', label: '橙色', indicator: '表面加速度', unit: 'mm/d²', sig: '0.05' },
            { id: 'yellow', name: '三级预警', label: '黄色', indicator: '表面速度', unit: 'mm/d', sig: '0.001' },
            { id: 'blue', name: '四级预警', label: '蓝色', indicator: '表面速度', unit: 'mm/d', sig: '0.05' }
        ];
        return levels.map(l => `
            <div class="threshold-card border-${l.id}" style="height: auto; min-height: 180px;">
                <div class="card-title text-${l.id}"><div><span class="color-dot bg-${l.id}"></span> ${l.name} (${l.label})</div></div>
                <div class="card-body">
                    <div class="input-row" style="justify-content: space-between;"><span style="font-weight:bold; width:90px;">${l.indicator}</span><span class="unit" style="width:40px;">${l.unit}</span></div>
                    <div class="input-row" style="justify-content: space-between;"><span style="width:90px;">显著性水平</span><span class="unit" style="font-weight:bold; width:40px;">${l.sig}</span></div>
                    <div class="input-row"><span style="width:90px;">样本容量</span><input type="number" value="30" class="breathing-num" style="width:80px;"></div>
                    <div class="input-row"><span style="width:90px;">频率(次/日)</span><input type="number" value="1" class="breathing-num" style="width:80px;"></div>
                </div>
            </div>
        `).join('');
    },

    renderMultiSourceCards: () => {
        const metricOptions =['表面速度', '表面加速度', '应力', '深部位移'];
        const unitMap = { '表面速度':'mm/d', '表面加速度':'mm/d²', '应力':'kPa', '深部位移':'mm' };

        // 修改点：将所有对应的配置数组顺序反转 (一级 -> 四级)
        const defaultMetrics = ['应力', '表面加速度', '表面速度', '表面速度'];
        const levelIds =['red', 'orange', 'yellow', 'blue'];
        const levelNames =['一级预警', '二级预警', '三级预警', '四级预警'];
        const levelLabels =['红色', '橙色', '黄色', '蓝色'];
        const defaultThres =[10, 5, 20, 10];
        const defaultSig =['0.001', '0.05', '0.001', '0.05'];

        let html = '';
        for (let idx = 0; idx < 4; idx++) {
            html += `
                <div class="threshold-card border-${levelIds[idx]}" style="height: auto;">
                    <div class="card-title text-${levelIds[idx]}"><div><span class="color-dot bg-${levelIds[idx]}"></span> ${levelNames[idx]} (${levelLabels[idx]})</div></div>
                    <div class="card-body">
                        <div class="input-row"><span style="width:90px;">预警参数</span><select class="breathing-select" style="width:110px;" data-level="${levelIds[idx]}" onchange="window.thresholdModule.updateMultiMetric(this)">${metricOptions.map(t => `<option value="${t}" ${t === defaultMetrics[idx] ? 'selected' : ''}>${t}</option>`).join('')}</select><span class="unit" id="unit-${levelIds[idx]}" style="width:40px;">${unitMap[defaultMetrics[idx]]}</span></div>
                        <div class="input-row"><span style="width:90px;">阈值 ></span><input type="number" value="${defaultThres[idx]}" class="breathing-num" style="width:80px;"><span class="unit" style="width:40px;">${unitMap[defaultMetrics[idx]]}</span></div>
                        <div class="input-row"><span style="width:90px;">显著性水平</span><input type="text" value="${defaultSig[idx]}" class="breathing-num" style="width:80px;"></div>
                        <div class="input-row"><span style="width:90px;">样本容量</span><input type="number" value="30" class="breathing-num" style="width:80px;"></div>
                        <div class="input-row"><span style="width:90px;">频率(次/日)</span><input type="number" value="1" class="breathing-num" style="width:80px;"></div>
                    </div>
                </div>
            `;
        }
        return html;
    },

    updateMultiMetric: (select) => {
        const level = select.getAttribute('data-level');
        const metric = select.value;
        const unitMap = { '表面速度':'mm/d', '表面加速度':'mm/d²', '应力':'kPa', '深部位移':'mm' };
        const unitSpan = document.getElementById(`unit-${level}`);
        if (unitSpan) unitSpan.innerText = unitMap[metric] || '—';
        const card = select.closest('.threshold-card');
        if (card) {
            const thresUnitSpan = card.querySelector('.input-row:nth-child(2) .unit');
            if (thresUnitSpan) thresUnitSpan.innerText = unitMap[metric] || '—';
        }
    },

    save: () => {
        if (window.thresholdModule.state.warningType === 'auto') {
            const mode = window.thresholdModule.state.autoWarningMode;
            if (mode === 'single') {
                const sr = window.thresholdModule.state.selectedRegion || '未选择';
                const sl = window.thresholdModule.state.selectedLine || '未选择';
                const sd = window.thresholdModule.state.selectedDeviceType || '未选择';
                const sp = window.thresholdModule.state.selectedPoint || '未选择';
                alert(`✅ 单源预警参数已保存！\n目标：区域【${sr}】→ 监测线【${sl}】→ 设备类型【${sd}】→ 监测点【${sp}】`);
            } else {
                alert(`✅ 多源预警参数已保存！\n目标区域：${window.thresholdModule.state.targetValue}`);
            }
            return;
        }
        alert(`✅ 【${window.thresholdModule.state.activeTab}】预警阈值设置保存成功！`);
    }
};