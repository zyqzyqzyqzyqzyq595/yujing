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
                <span class="modal-close-new" onclick="window.thresholdModule.close()">×</span>
            </div>

            <div class="threshold-modal-body">
                <!-- 左侧标签栏容器 -->
                <div id="threshold-left-tabs" class="threshold-tabs"></div>

                <!-- 右侧内容区 -->
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
        activeTab: 'GNSS',
        warningType: 'threshold',
        autoWarningMode: 'single',
        paramType: '位移量',
        targetLevel: 'global',
        targetValue: '',
        selectedRegion: '北帮',
        selectedLine: '全部监测线',
        selectedPoint: '',
        multiMetrics: { level1: '表面加速度', level2: '表面加速度', level3: '表面速度', level4: '表面速度' }
    },

    // 辅助：获取所有可用区域列表
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
            container.innerHTML = `
                <div class="tab-btn ${window.thresholdModule.state.activeTab === 'GNSS' ? 'active' : ''}" id="tab-GNSS" onclick="window.thresholdModule.switchTab('GNSS')"><span>GNSS</span></div>
                <div class="tab-btn ${window.thresholdModule.state.activeTab === '雷达监测' ? 'active' : ''}" id="tab-雷达监测" onclick="window.thresholdModule.switchTab('雷达监测')"><span>雷达</span></div>
                <div class="tab-btn ${window.thresholdModule.state.activeTab === '深部位移' ? 'active' : ''}" id="tab-深部位移" onclick="window.thresholdModule.switchTab('深部位移')"><span>深部位移</span></div>
                <div class="tab-btn ${window.thresholdModule.state.activeTab === '应力监测' ? 'active' : ''}" id="tab-应力监测" onclick="window.thresholdModule.switchTab('应力监测')"><span>应力</span></div>
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
        if (modal) modal.style.visibility = 'hidden';
    },

    open: () => {
        const modal = document.getElementById('threshold-analysis-modal');
        if (modal) modal.style.visibility = 'visible';
        window.thresholdModule.renderLeftTabs();
        window.thresholdModule.renderControls();
        window.thresholdModule.renderCards();
    },

    switchTab: (tabName) => {
        if (window.thresholdModule.state.warningType !== 'threshold') return;
        window.thresholdModule.state.activeTab = tabName;
        // 更新左侧按钮的 active 类
        document.querySelectorAll('#threshold-left-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
        const targetBtn = document.getElementById(`tab-${tabName}`);
        if (targetBtn) targetBtn.classList.add('active');
        // 重新渲染右侧内容和卡片
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

    renderControls: () => {
        const headerContainer = document.getElementById('threshold-config-header');
        const infoText = document.getElementById('info-tip-text');
        if (!headerContainer) return;

        const warningType = window.thresholdModule.state.warningType;
        const autoMode = window.thresholdModule.state.autoWarningMode;

        if (warningType === 'auto') {
            // 自动预警模式（单源/多源）的渲染逻辑保持不变（此处省略，沿用之前代码）
            // 为了节省篇幅，此处保留原有自动预警逻辑，但实际应与之前一致
            // 由于自动预警部分未改动，且用户问题聚焦于阈值预警，此处简写，实际请使用之前完整的自动预警代码
            if (autoMode === 'single') {
                // ... 单源三级联动 ...
                const regions = window.thresholdModule.getAllRegions();
                const lines = window.thresholdModule.getLinesByRegion(window.thresholdModule.state.selectedRegion);
                const points = window.thresholdModule.getPointsByRegionAndLine(
                    window.thresholdModule.state.selectedRegion,
                    window.thresholdModule.state.selectedLine
                );
                headerContainer.innerHTML = `
                    <div class="config-actions flex-align-center gap-12" style="flex-wrap: wrap; width: 100%;">
                        <div class="flex-align-center gap-8"><span class="form-label">选择区域:</span><select id="single-region-select" class="breathing-select" style="width:100px;">${regions.map(r => `<option value="${r}" ${window.thresholdModule.state.selectedRegion === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
                        <div class="flex-align-center gap-8"><span class="form-label">监测线:</span><select id="single-line-select" class="breathing-select" style="width:110px;">${lines.map(l => `<option value="${l}" ${window.thresholdModule.state.selectedLine === l ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
                        <div class="flex-align-center gap-8"><span class="form-label">监测点:</span><select id="single-point-select" class="breathing-select" style="width:120px;"><option value="">全部监测点</option>${points.map(p => `<option value="${p.id}" ${window.thresholdModule.state.selectedPoint === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}</select></div>
                        <button class="primary-btn" onclick="window.thresholdModule.save()">保存参数</button>
                    </div>
                `;
                // 绑定事件...
                const regionSelect = document.getElementById('single-region-select');
                const lineSelect = document.getElementById('single-line-select');
                if (regionSelect) regionSelect.onchange = (e) => { window.thresholdModule.state.selectedRegion = e.target.value; window.thresholdModule.state.selectedLine = '全部监测线'; window.thresholdModule.state.selectedPoint = ''; window.thresholdModule.renderControls(); };
                if (lineSelect) lineSelect.onchange = (e) => { window.thresholdModule.state.selectedLine = e.target.value; window.thresholdModule.state.selectedPoint = ''; window.thresholdModule.renderControls(); };
                if (document.getElementById('single-point-select')) document.getElementById('single-point-select').onchange = (e) => { window.thresholdModule.state.selectedPoint = e.target.value; };
                infoText.innerHTML = '单源预警模式：基于单一监测指标（表面速度/表面加速度）设定阈值，支持区域→监测线→监测点三级筛选。';
            } else {
                const regions = window.thresholdModule.getAllRegions();
                headerContainer.innerHTML = `<div class="config-actions flex-align-center gap-12"><div class="flex-align-center gap-8"><span class="form-label">设置目标区域:</span><select id="auto-target-region" class="breathing-select" style="width:100px;" onchange="window.thresholdModule.updateAutoTargetRegion(this.value)">${regions.map(r => `<option value="${r}" ${window.thresholdModule.state.targetValue === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div><button class="primary-btn" onclick="window.thresholdModule.save()">保存参数</button></div>`;
                infoText.innerHTML = '多源预警模式：支持为不同预警等级独立选择预警参数（表面速度、表面加速度、应力、深部位移）。';
            }
            document.getElementById('info-tip-box').style.display = 'flex';
            return;
        }

        // ================= 阈值预警模式 =================
        const tab = window.thresholdModule.state.activeTab;
        let selectHtml = '';
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
        } else if (tab === '应力监测') {
            selectHtml = `<select class="breathing-select" style="width: 120px;" onchange="window.thresholdModule.state.paramType=this.value; window.thresholdModule.renderCards()">
                            <option value="累积应力" ${window.thresholdModule.state.paramType === '累积应力' ? 'selected' : ''}>累积应力</option>
                            <option value="突变应力" ${window.thresholdModule.state.paramType === '突变应力' ? 'selected' : ''}>突变应力</option>
                          </select>`;
        }
        headerContainer.innerHTML = `
            <div class="threshold-selector flex-align-center gap-20">
                <div class="radio-group flex-align-center gap-12">
                    <label class="radio-label"><input type="radio" name="warnType" value="auto" class="breathing-radio" onchange="window.thresholdModule.toggleMode('auto')"> 自动预警</label>
                    <label class="radio-label"><input type="radio" name="warnType" value="threshold" checked class="breathing-radio" onchange="window.thresholdModule.toggleMode('threshold')"> 阈值预警</label>
                </div>
                <div class="thick-divider-y"></div>
                <div class="flex-align-center gap-10">
                    <span class="form-label">预警参数类型:</span>
                    <div id="param-select-container">${selectHtml}</div>
                </div>
                <div id="radar-area-box" class="flex-align-center gap-8" style="display:${tab === '雷达监测' ? 'flex' : 'none'};">
                    <span class="form-label">预警评估范围:</span>
                    <div class="input-with-unit"><input type="number" value="50" class="breathing-input-left" id="radar-eval-area"><span class="unit-addon">m²</span></div>
                </div>
            </div>
            <div class="config-actions flex-align-center gap-12">
                <div class="flex-align-center gap-8" style="border-right: 1px solid rgba(28, 61, 144, 0.1); padding-right: 12px;">
                    <span class="form-label" style="font-size: 13px;">设置目标:</span>
                    <select class="breathing-select" style="width: 85px;" onchange="window.thresholdModule.updateTarget(this.value)">
                        <option value="global" ${window.thresholdModule.state.targetLevel === 'global' ? 'selected' : ''}>全局</option>
                        <option value="region" ${window.thresholdModule.state.targetLevel === 'region' ? 'selected' : ''}>区域</option>
                        <option value="line" ${window.thresholdModule.state.targetLevel === 'line' ? 'selected' : ''}>监测线</option>
                        <option value="point" ${window.thresholdModule.state.targetLevel === 'point' ? 'selected' : ''}>监测点</option>
                    </select>
                    <div id="sub-target-container"></div>
                </div>
                <button class="primary-btn" onclick="window.thresholdModule.save()">保存参数</button>
            </div>
        `;
        document.getElementById('info-tip-box').style.display = ['GNSS', '雷达监测'].includes(tab) ? 'flex' : 'none';
        window.thresholdModule.updateTarget(window.thresholdModule.state.targetLevel);
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
            let points = [];
            if (window.mapModule && window.mapModule.pMeta) {
                points = Object.values(window.mapModule.pMeta).filter(p => p.type === 'GNSS').map(p => p.deviceId);
            }
            subContainer.innerHTML = `<select class="breathing-select" style="width: 105px;" onchange="window.thresholdModule.state.targetValue=this.value">${points.map(v => `<option value="${v}" ${window.thresholdModule.state.targetValue === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`;
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

        // 阈值预警模式卡片生成
        const tab = window.thresholdModule.state.activeTab;
        const pType = window.thresholdModule.state.paramType;
        const levels = [
            { id: 'red', name: '一级预警', label: '红色', val: 200, unit: tab === '应力监测' ? 'kPa' : 'mm' },
            { id: 'orange', name: '二级预警', label: '橙色', val: 150, unit: tab === '应力监测' ? 'kPa' : 'mm' },
            { id: 'yellow', name: '三级预警', label: '黄色', val: 100, unit: tab === '应力监测' ? 'kPa' : 'mm' },
            { id: 'blue', name: '四级预警', label: '蓝色', val: 80, unit: tab === '应力监测' ? 'kPa' : 'mm' }
        ];
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