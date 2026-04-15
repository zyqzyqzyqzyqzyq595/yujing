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
        warningType: 'threshold',      // 默认阈值预警
        autoWarningMode: 'single',
        paramType: '位移量',
        targetLevel: 'global',
        targetValue: '',
        selectedRegion: '北帮',
        selectedLine: '全部监测线',
        selectedPoint: '',
        multiMetrics: { level1: '表面加速度', level2: '表面加速度', level3: '表面速度', level4: '表面速度' },
        waterSubType: '水位计'
    },

    // 根据左侧标签获取对应类型的在线设备列表
    getDevicesByTab: (tabName) => {
        if (!window.mapModule || !window.mapModule.pMeta) return [];
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
        if (!targetType) return [];
        return Object.values(window.mapModule.pMeta)
            .filter(meta => meta.type === targetType && meta.isOnline)
            .map(meta => meta.deviceId);
    },

    paramConfig: {
        '裂缝监测': {
            categories: [
                { name: '宽度变化量', components: [{ label: '宽度累计变化量', defaultVal: 200 }], unit: 'mm' },
                { name: '加速度', components: [
                    { label: 'x方向加速度', defaultVal: 200 },
                    { label: 'y方向加速度', defaultVal: 200 },
                    { label: 'z方向加速度', defaultVal: 200 }
                ], unit: 'mm/h²' },
                { name: '倾角', components: [
                    { label: 'x方向倾角', defaultVal: 200 },
                    { label: 'y方向倾角', defaultVal: 200 },
                    { label: 'z方向倾角', defaultVal: 200 }
                ], unit: '°' }
            ]
        },
        '煤自燃监测': {
            categories: [
                { name: '温度', components: [{ label: '温度', defaultVal: 200 }], unit: '℃' },
                { name: '一氧化碳浓度', components: [{ label: '一氧化碳浓度', defaultVal: 200 }], unit: 'PPm' },
                { name: '氧气浓度', components: [{ label: '氧气浓度', defaultVal: 200 }], unit: '%' }
            ]
        },
        '降雨监测': {
            categories: [
                { name: '累积降雨量', components: [{ label: '累积降雨量', defaultVal: 200 }], unit: 'mm' },
                { name: '实时降雨量', components: [{ label: '实时降雨量', defaultVal: 200 }], unit: 'mm' }
            ]
        },
        '地下水监测': {
            categories: {
                '水位计': [
                    { name: '水面高程', components: [{ label: '水面高程', defaultVal: 200 }], unit: 'm' },
                    { name: '空管长度', components: [{ label: '空管长度', defaultVal: 200 }], unit: 'm' }
                ],
                '流量计': [
                    { name: '流量', components: [{ label: '流量', defaultVal: 200 }], unit: 'm²/h' },
                    { name: '水位', components: [{ label: '水位', defaultVal: 200 }], unit: 'm' },
                    { name: '空隙水压', components: [{ label: '空隙水压', defaultVal: 200 }], unit: 'kPa' },
                    { name: '温度', components: [{ label: '温度', defaultVal: 200 }], unit: '℃' }
                ]
            }
        },
        '振动监测': {
            categories: [
                { name: '速度', components: [
                    { label: 'X速度', defaultVal: 200 },
                    { label: 'Y速度', defaultVal: 200 },
                    { label: 'H速度', defaultVal: 200 },
                    { label: 'XY速度', defaultVal: 200 },
                    { label: 'XYH速度', defaultVal: 200 }
                ], unit: 'mm/h' },
                { name: '位移', components: [
                    { label: 'X位移', defaultVal: 200 },
                    { label: 'Y位移', defaultVal: 200 },
                    { label: 'H位移', defaultVal: 200 },
                    { label: 'XY位移', defaultVal: 200 },
                    { label: 'XYH位移', defaultVal: 200 }
                ], unit: 'mm' },
                { name: '累积位移', components: [
                    { label: 'X累积位移', defaultVal: 200 },
                    { label: 'Y累积位移', defaultVal: 200 },
                    { label: 'H累积位移', defaultVal: 200 },
                    { label: 'XY累积位移', defaultVal: 200 },
                    { label: 'XYH累积位移', defaultVal: 200 }
                ], unit: 'mm' },
                { name: '加速度', components: [
                    { label: 'X加速度', defaultVal: 200 },
                    { label: 'Y加速度', defaultVal: 200 },
                    { label: 'H加速度', defaultVal: 200 }
                ], unit: 'mm/h²' },
                { name: '切线角', components: [{ label: '切线角', defaultVal: 200 }], unit: '°' }
            ]
        }
    },

    getAllRegions: () => {
        if (window.mapFilterModule && window.mapFilterModule.selectedRegions) {
            const regs = window.mapFilterModule.selectedRegions.filter(r => r !== '全部');
            if (regs.length === 0) return ['北帮', '南帮', '东帮', '西帮', '中央区'];
            return regs;
        }
        return ['北帮', '南帮', '东帮', '西帮', '中央区'];
    },

    getAllLines: () => {
        if (window.connectionModule && window.connectionModule.detectionLines) {
            return ['全部监测线', ...window.connectionModule.detectionLines.map(l => l.name)];
        }
        return ['全部监测线', '1号线', '2号线', '3号线', '4号线'];
    },

    getLinesByRegion: (region) => {
        const regionToLine = { '北帮': '1号线', '南帮': '2号线', '东帮': '3号线', '西帮': '4号线', '中央区': null };
        const line = regionToLine[region];
        if (line) return [line];
        return ['全部监测线'];
    },

    getPointsByRegionAndLine: (region, line) => {
        if (!window.mapModule || !window.mapModule.pMeta) return [];
        const points = [];
        Object.values(window.mapModule.pMeta).forEach(meta => {
            if (!meta.isOnline) return;
            if (meta.region !== region) return;
            if (line !== '全部监测线') {
                if (meta.type === 'GNSS' && meta.isOnDetectionLine && meta.deviceId.includes(line.replace('号线', ''))) {
                    points.push({ id: meta.deviceId, label: meta.deviceId });
                }
            } else {
                points.push({ id: meta.deviceId, label: meta.deviceId });
            }
        });
        const unique = [];
        const ids = new Set();
        points.forEach(p => {
            if (!ids.has(p.id)) {
                ids.add(p.id);
                unique.push(p);
            }
        });
        return unique;
    },

    renderLeftTabs: () => {
        const container = document.getElementById('threshold-left-tabs');
        if (!container) return;
        if (window.thresholdModule.state.warningType === 'auto') {
            container.innerHTML = `
                <div class="tab-btn active" data-auto-mode="single" onclick="window.thresholdModule.switchAutoMode('single')"><span>单源预警</span></div>
                <div class="tab-btn" data-auto-mode="multi" onclick="window.thresholdModule.switchAutoMode('multi')"><span>多源预警</span></div>
            `;
        } else {
            // 阈值预警模式：按新顺序和新文字显示
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
        // 每次打开弹窗时，强制重置为阈值预警模式，并重置左侧标签为 GNSS
        window.thresholdModule.state.warningType = 'threshold';
        window.thresholdModule.state.autoWarningMode = 'single';
        window.thresholdModule.state.activeTab = 'GNSS';
        window.thresholdModule.state.paramType = '位移量';
        window.thresholdModule.state.targetLevel = 'global';
        window.thresholdModule.state.targetValue = '';

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
    },

    // 渲染标题栏右侧的模式切换按钮
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

        // 先渲染标题栏的模式切换按钮
        window.thresholdModule.renderModeSwitch();

        const warningType = window.thresholdModule.state.warningType;
        const autoMode = window.thresholdModule.state.autoWarningMode;

        if (warningType === 'auto') {
            // 自动预警模式（不再包含单选按钮组）
            let leftContentHtml = '';
            if (autoMode === 'single') {
                const regions = window.thresholdModule.getAllRegions();
                const lines = window.thresholdModule.getLinesByRegion(window.thresholdModule.state.selectedRegion);
                const points = window.thresholdModule.getPointsByRegionAndLine(window.thresholdModule.state.selectedRegion, window.thresholdModule.state.selectedLine);
                leftContentHtml = `
                    <div class="flex-align-center gap-12" style="flex-wrap: wrap;">
                        <div class="flex-align-center gap-8"><span class="form-label">选择区域:</span><select id="single-region-select" class="breathing-select" style="width:100px;">${regions.map(r => `<option value="${r}" ${window.thresholdModule.state.selectedRegion === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
                        <div class="flex-align-center gap-8"><span class="form-label">监测线:</span><select id="single-line-select" class="breathing-select" style="width:110px;">${lines.map(l => `<option value="${l}" ${window.thresholdModule.state.selectedLine === l ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
                        <div class="flex-align-center gap-8"><span class="form-label">监测点:</span><select id="single-point-select" class="breathing-select" style="width:120px;"><option value="">全部监测点</option>${points.map(p => `<option value="${p.id}" ${window.thresholdModule.state.selectedPoint === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}</select></div>
                    </div>
                `;
                setTimeout(() => {
                    const regionSelect = document.getElementById('single-region-select');
                    const lineSelect = document.getElementById('single-line-select');
                    if (regionSelect) regionSelect.onchange = (e) => { window.thresholdModule.state.selectedRegion = e.target.value; window.thresholdModule.state.selectedLine = '全部监测线'; window.thresholdModule.state.selectedPoint = ''; window.thresholdModule.renderControls(); };
                    if (lineSelect) lineSelect.onchange = (e) => { window.thresholdModule.state.selectedLine = e.target.value; window.thresholdModule.state.selectedPoint = ''; window.thresholdModule.renderControls(); };
                    if (document.getElementById('single-point-select')) document.getElementById('single-point-select').onchange = (e) => { window.thresholdModule.state.selectedPoint = e.target.value; };
                }, 0);
                infoText.innerHTML = '单源预警模式：基于单一监测指标（表面速度/表面加速度）设定阈值，支持区域→监测线→监测点三级筛选。';
            } else {
                const regions = window.thresholdModule.getAllRegions();
                leftContentHtml = `<div class="flex-align-center gap-8"><span class="form-label">设置目标区域:</span><select id="auto-target-region" class="breathing-select" style="width:100px;" onchange="window.thresholdModule.updateAutoTargetRegion(this.value)">${regions.map(r => `<option value="${r}" ${window.thresholdModule.state.targetValue === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>`;
                infoText.innerHTML = '多源预警模式：支持为不同预警等级独立选择预警参数。';
            }
            headerContainer.innerHTML = `
                <div class="flex-between" style="width: 100%;">
                    <div class="flex-align-center gap-20" style="flex-wrap: wrap;">${leftContentHtml}</div>
                    <button class="primary-btn" onclick="window.thresholdModule.save()">保存参数</button>
                </div>
            `;
            document.getElementById('info-tip-box').style.display = 'flex';
            return;
        }

        // ================= 阈值预警模式 =================
        const tab = window.thresholdModule.state.activeTab;
        let selectHtml = '';
        let extraControlsHtml = '';

        // 处理原始四个模块
        if (tab === 'GNSS') {
            selectHtml = `<select class="breathing-select" style="width: 120px;" onchange="window.thresholdModule.state.paramType=this.value; window.thresholdModule.renderCards()">
                            <option value="位移量" ${window.thresholdModule.state.paramType === '位移量' ? 'selected' : ''}>位移量</option>
                            <option value="位移速度" ${window.thresholdModule.state.paramType === '位移速度' ? 'selected' : ''}>位移速度</option>
                            <option value="位移加速度" ${window.thresholdModule.state.paramType === '位移加速度' ? 'selected' : ''}>位移加速度</option>
                          </select>`;
            infoText.innerHTML = `注：预警参数可设置为 <b>位移量</b>、<b>位移速度</b> 或 <b>位移加速度</b> 中的某一个。`;
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
            let categories = window.thresholdModule.paramConfig['地下水监测'].categories[subType] || [];
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

        // 构建左侧区域（移除了单选按钮组和分隔线）
        const leftGroupHtml = `
            <div class="flex-align-center gap-20">
                ${extraControlsHtml ? `<div class="flex-align-center gap-8">${extraControlsHtml}</div>` : ''}
                <div class="flex-align-center gap-10">
                    <span class="form-label">预警参数类型:</span>
                    <div id="param-select-container">${selectHtml}</div>
                </div>
                <div class="flex-align-center gap-8">
                    <span class="form-label" style="font-size: 13px;">设置目标:</span>
                    <select class="breathing-select" style="width: 85px;" onchange="window.thresholdModule.updateTarget(this.value)">
                        <option value="global" ${window.thresholdModule.state.targetLevel === 'global' ? 'selected' : ''}>全局</option>
                        <option value="region" ${window.thresholdModule.state.targetLevel === 'region' ? 'selected' : ''}>区域</option>
                        <option value="line" ${window.thresholdModule.state.targetLevel === 'line' ? 'selected' : ''}>监测线</option>
                        <option value="point" ${window.thresholdModule.state.targetLevel === 'point' ? 'selected' : ''}>监测点</option>
                    </select>
                    <div id="sub-target-container"></div>
                </div>
            </div>
        `;

        const radarAreaHtml = (tab === '雷达监测') ? `
            <div id="radar-area-box" class="flex-align-center gap-8" style="display:flex;">
                <span class="form-label">预警评估范围:</span>
                <div class="input-with-unit"><input type="number" value="50" class="breathing-input-left" id="radar-eval-area"><span class="unit-addon">m²</span></div>
            </div>
        ` : `<div id="radar-area-box" style="display:none;"></div>`;

        headerContainer.innerHTML = `
            <div class="flex-between" style="width: 100%;">
                <div class="flex-align-center gap-20" style="flex-wrap: wrap;">
                    ${leftGroupHtml}
                    ${radarAreaHtml}
                </div>
                <button class="primary-btn" onclick="window.thresholdModule.save()">保存参数</button>
            </div>
        `;
        // 显示注释区域（所有类型都显示）
        document.getElementById('info-tip-box').style.display = 'flex';
        window.thresholdModule.updateTarget(window.thresholdModule.state.targetLevel);
    },

    updateWaterSubType: (subType) => {
        window.thresholdModule.state.waterSubType = subType;
        if (subType === '水位计') window.thresholdModule.state.paramType = '水面高程';
        else window.thresholdModule.state.paramType = '流量';
        window.thresholdModule.renderControls();
        window.thresholdModule.renderCards();
    },

    updateTarget: (level) => {
        window.thresholdModule.state.targetLevel = level;
        const subContainer = document.getElementById('sub-target-container');
        if (!subContainer) return;
        if (level === 'global') {
            subContainer.innerHTML = '';
        } else if (level === 'region') {
            const regions = window.thresholdModule.getAllRegions();
            subContainer.innerHTML = `<select class="breathing-select" style="width: 95px;" onchange="window.thresholdModule.state.targetValue=this.value">${regions.map(v => `<option value="${v}" ${window.thresholdModule.state.targetValue === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`;
        } else if (level === 'line') {
            const lines = ['1号线', '2号线', '3号线', '4号线'];
            subContainer.innerHTML = `<select class="breathing-select" style="width: 95px;" onchange="window.thresholdModule.state.targetValue=this.value">${lines.map(v => `<option value="${v}" ${window.thresholdModule.state.targetValue === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`;
        } else if (level === 'point') {
            const tab = window.thresholdModule.state.activeTab;
            const devices = window.thresholdModule.getDevicesByTab(tab);
            subContainer.innerHTML = `<select class="breathing-select" style="width: 105px;" onchange="window.thresholdModule.state.targetValue=this.value">
                ${devices.map(v => `<option value="${v}" ${window.thresholdModule.state.targetValue === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>`;
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

        const tab = window.thresholdModule.state.activeTab;
        const pType = window.thresholdModule.state.paramType;
        const levels = [
            { id: 'red', name: '一级预警', label: '红色', val: 200 },
            { id: 'orange', name: '二级预警', label: '橙色', val: 150 },
            { id: 'yellow', name: '三级预警', label: '黄色', val: 100 },
            { id: 'blue', name: '四级预警', label: '蓝色', val: 80 }
        ];

        const isOriginalFour = (tab === 'GNSS' || tab === '雷达监测' || tab === '深部位移' || tab === '应力监测');
        if (isOriginalFour) {
            let cardsHtml = '';
            if (tab === 'GNSS') {
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

        let components = [];
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
        const levels = [
            { id: 'blue', name: '四级预警', label: '蓝色', indicator: '表面速度', unit: 'mm/d', sig: '0.05' },
            { id: 'yellow', name: '三级预警', label: '黄色', indicator: '表面速度', unit: 'mm/d', sig: '0.001' },
            { id: 'orange', name: '二级预警', label: '橙色', indicator: '表面加速度', unit: 'mm/d²', sig: '0.05' },
            { id: 'red', name: '一级预警', label: '红色', indicator: '表面加速度', unit: 'mm/d²', sig: '0.001' }
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
        const metricOptions = ['表面速度', '表面加速度', '应力', '深部位移'];
        const unitMap = { '表面速度':'mm/d', '表面加速度':'mm/d²', '应力':'kPa', '深部位移':'mm' };
        const defaultMetrics = ['表面速度', '表面速度', '表面加速度', '应力'];
        const levelIds = ['blue', 'yellow', 'orange', 'red'];
        const levelNames = ['四级预警', '三级预警', '二级预警', '一级预警'];
        const levelLabels = ['蓝色', '黄色', '橙色', '红色'];
        const defaultThres = [10, 20, 5, 10];
        const defaultSig = ['0.05', '0.001', '0.05', '0.001'];
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
                alert(`✅ 单源预警参数已保存！\n目标：区域【${window.thresholdModule.state.selectedRegion}】→ 监测线【${window.thresholdModule.state.selectedLine}】→ 监测点【${window.thresholdModule.state.selectedPoint || '全部'}】`);
            } else {
                alert(`✅ 多源预警参数已保存！\n目标区域：${window.thresholdModule.state.targetValue}`);
            }
            return;
        }
        alert(`✅ 【${window.thresholdModule.state.activeTab}】预警阈值设置保存成功！`);
    }
};