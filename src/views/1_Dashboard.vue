<template>
  <div class="view-page emergency-page">
    <section class="module-section main-visualization">
      <div class="section-header">
        <h3 class="section-title">多元监测预警</h3>
      </div>

      <div class="visualization-layout">
        <div class="sys-card map-container">
          <div ref="threeContainer" class="three-viewport">
            <div class="controls-hint">左键平移 / 按住 Ctrl+左键旋转 / 滚轮缩放</div>
          </div>
        </div>

        <div class="sys-card curve-container">
          <div class="filter-bar">
            <div class="filter-group dropdown-wrapper flex-1 relative">
              <span class="filter-label">预警等级:</span>
              <input type="text" class="ctrl-input breathing-input" @click="toggleFilterMenu('level')" v-model.lazy="levelText" placeholder="输入或选择">
              <div v-show="showMenus.level" class="metric-menu-container">
                <div class="multi-item menu-header-item">
                  <input type="checkbox" id="lvl-all" v-model="isAllLevelsSelected">
                  <label for="lvl-all" class="text-primary bold-label">全选</label>
                </div>
                <div class="multi-item" v-for="lvl in ['1', '2', '3', '4']" :key="lvl">
                  <input type="checkbox" :id="'lvl-'+lvl" :value="lvl" v-model="selectedLevels">
                  <label :for="'lvl-'+lvl">{{ getLevelName(lvl) }}级预警</label>
                </div>
              </div>
            </div>

            <div class="filter-group dropdown-wrapper flex-1 relative">
              <span class="filter-label">监测区域:</span>
              <input type="text" class="ctrl-input breathing-input" @click="toggleFilterMenu('region')" v-model.lazy="regionText" placeholder="输入或选择">
              <div v-show="showMenus.region" class="metric-menu-container">
                <div class="multi-item menu-header-item">
                  <input type="checkbox" id="reg-all" v-model="isAllRegionsSelected">
                  <label for="reg-all" class="text-primary bold-label">全选</label>
                </div>
                <div class="multi-item" v-for="reg in allRegions" :key="reg">
                  <input type="checkbox" :id="'reg-'+reg" :value="reg" v-model="selectedRegions">
                  <label :for="'reg-'+reg">{{ reg }}</label>
                </div>
              </div>
            </div>

            <div class="filter-group dropdown-wrapper flex-1 relative">
              <span class="filter-label">监测线:</span>
              <input type="text" class="ctrl-input breathing-input" @click="toggleFilterMenu('line')" v-model.lazy="lineText" placeholder="输入或选择">
              <div v-show="showMenus.line" class="metric-menu-container">
                <div class="multi-item menu-header-item">
                  <input type="checkbox" id="line-all" v-model="isAllLinesSelected">
                  <label for="line-all" class="text-primary bold-label">全选</label>
                </div>
                <div class="multi-item" v-for="line in allLines" :key="line">
                  <input type="checkbox" :id="'line-'+line" :value="line" v-model="selectedLines">
                  <label :for="'line-'+line">{{ line }}</label>
                </div>
              </div>
            </div>

            <div class="filter-group dropdown-wrapper flex-1-5 relative">
              <span class="filter-label">监测点:</span>
              <input type="text" class="ctrl-input breathing-input highlight-input" @click="toggleFilterMenu('point')" v-model.lazy="pointText" placeholder="输入或选择">
              <div v-show="showMenus.point" class="metric-menu-container">
                <div class="multi-item menu-header-item">
                  <input type="checkbox" id="pt-all" v-model="isAllPointsSelected">
                  <label for="pt-all" class="text-primary bold-label">全选</label>
                </div>
                <div class="multi-item" v-for="pt in filteredPoints" :key="pt.id">
                  <input type="checkbox" :id="'pt-'+pt.id" :value="pt.id" v-model="selectedPointIds">
                  <label :for="'pt-'+pt.id">{{ pt.id }} ({{pt.region}})</label>
                </div>
              </div>
            </div>
          </div>

          <div class="analysis-section flex-col flex-1 p-15">
            <div class="chart-header flex-between mb-15">
              <span class="dash-title">指标时序演变曲线</span>
              <div class="flex-align-center gap-8">
                <div class="dropdown-wrapper metric-dropdown-wrapper relative">
                  <input type="text" class="ctrl-input breathing-input" style="width: 140px;" @click="toggleMetricMenu" v-model.lazy="metricText" placeholder="输入或选择指标">

                  <div v-show="showMetricMenu" class="metric-menu-container right-aligned">
                    <div class="multi-item menu-header-item mb-5">
                      <input type="checkbox" id="met-all" v-model="isAllMetricsSelected">
                      <label for="met-all" class="text-primary bold-label">全选</label>
                    </div>

                    <template v-for="group in dynamicMetricGroups" :key="group.name">
                      <div class="menu-group-title">{{ group.name }}</div>
                      <div class="multi-item sub-item" v-for="metric in group.metrics" :key="metric">
                        <input type="checkbox" :id="'met-' + metric" :value="metric" v-model="selectedMetrics">
                        <label :for="'met-' + metric">{{ metric }}</label>
                      </div>
                    </template>
                  </div>
                </div>
                <button class="primary-btn" @click="handleQuery">查询分析</button>
              </div>
            </div>
            <div ref="curveChartRef" class="chart-wrapper"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="module-section threshold-config">
      <div class="section-header">
        <h3 class="section-title">预警阈值设置</h3>
      </div>
      <div class="sys-card threshold-layout">
        <div class="threshold-tabs tabs-list">
          <div class="tab-btn" :class="{ active: activeTab === 'GNSS' }" @click="activeTab = 'GNSS'"><span>GNSS</span></div>
          <div class="tab-btn" :class="{ active: activeTab === '雷达监测' }" @click="activeTab = '雷达监测'"><span>雷达</span></div>
          <div class="tab-btn" :class="{ active: activeTab === '深部位移' }" @click="activeTab = '深部位移'"><span>深部位移</span></div>
          <div class="tab-btn" :class="{ active: activeTab === '应力监测' }" @click="activeTab = '应力监测'"><span>应力</span></div>
        </div>

        <div class="tab-content-container gnss-threshold-config flex-col h-100">
          <div class="config-header flex-between">
            <div class="threshold-selector flex-align-center gap-20">
              <div class="radio-group flex-align-center gap-12">
                <label class="radio-label">
                  <input type="radio" value="auto" v-model="warningType" class="breathing-radio"> 自动预警
                </label>
                <label class="radio-label">
                  <input type="radio" value="threshold" v-model="warningType" class="breathing-radio"> 阈值预警
                </label>
              </div>

              <div class="thick-divider-y"></div>

              <div class="flex-align-center gap-10">
                <span class="form-label" :class="{ 'text-muted': warningType === 'auto' }">预警参数类型:</span>

                <select v-if="activeTab === 'GNSS'" v-model="activeThresholdType" :disabled="warningType === 'auto'" class="breathing-select" style="width: 120px;" :class="{ 'is-disabled': warningType === 'auto' }">
                  <option value="位移量">位移量</option>
                  <option value="位移速度">位移速度</option>
                  <option value="位移加速度">位移加速度</option>
                </select>

                <select v-else-if="activeTab === '雷达监测'" v-model="radarThresholdType" :disabled="warningType === 'auto'" class="breathing-select" style="width: 120px;" :class="{ 'is-disabled': warningType === 'auto' }">
                  <option value="平均位移">平均位移</option>
                  <option value="平均速度">平均速度</option>
                  <option value="平均加速度">平均加速度</option>
                </select>

                <input v-else-if="activeTab === '深部位移'" type="text" v-model="deepThresholdType" readonly class="breathing-input text-center" style="width: 120px;" :class="{ 'is-disabled': warningType === 'auto' }">

                <select v-else-if="activeTab === '应力监测'" v-model="stressThresholdType" :disabled="warningType === 'auto'" class="breathing-select" style="width: 120px;" :class="{ 'is-disabled': warningType === 'auto' }">
                  <option value="累积应力">累积应力</option>
                  <option value="突变应力">突变应力</option>
                </select>
               </div>

              <div v-show="activeTab === '雷达监测'" class="flex-align-center gap-8">
                <span class="form-label" :class="{ 'text-muted': warningType === 'auto' }">预警评估范围:</span>
                <div class="input-with-unit">
                  <input type="number" v-model="radarEvalArea" :disabled="warningType === 'auto'" class="breathing-input-left" :class="{ 'is-disabled': warningType === 'auto' }">
                  <span class="unit-addon">m²</span>
                </div>
              </div>
            </div>

<div class="config-actions flex-align-center gap-12">
              <div class="flex-align-center gap-8" style="border-right: 1px solid rgba(28, 61, 144, 0.1); padding-right: 12px;">
                <span class="form-label" style="font-size: 13px;" :class="{ 'text-muted': warningType === 'auto' }">设置目标:</span>
                <select v-model="configTargetLevel" :disabled="warningType === 'auto'" class="breathing-select" style="width: 85px; padding: 4px 10px !important;">
                  <option value="global">全局</option>
                  <option value="region">区域</option>
                  <option value="line">监测线</option>
                  <option value="point">监测点</option>
                </select>
                <select v-if="configTargetLevel === 'region'" v-model="configTargetValue" :disabled="warningType === 'auto'" class="breathing-select" style="width: 95px; padding: 4px 10px !important;">
                  <option v-for="r in allRegions" :key="r" :value="r">{{r}}</option>
                </select>
                <select v-if="configTargetLevel === 'line'" v-model="configTargetValue" :disabled="warningType === 'auto'" class="breathing-select" style="width: 95px; padding: 4px 10px !important;">
                  <option v-for="l in allLines" :key="l" :value="l">{{l}}</option>
                </select>
                <select v-if="configTargetLevel === 'point'" v-model="configTargetValue" :disabled="warningType === 'auto'" class="breathing-select" style="width: 105px; padding: 4px 10px !important;">
                  <option v-for="pt in pointsForActiveTab" :key="pt.id" :value="pt.id">{{pt.id}}</option>
                </select>
              </div>
              <button class="primary-btn" @click="handleSave" :disabled="warningType === 'auto'">保存参数</button>
            </div>
          </div>

          <div v-show="activeTab === 'GNSS'" class="config-cards flex-1 mb-10" :class="{ 'is-faded': warningType === 'auto' }">
            <div class="threshold-card border-red">
              <div class="card-title text-red">
                <div><span class="color-dot bg-red"></span> 一级预警 (红色)</div>
                <span class="sub-cond">连续2次</span>
              </div>
              <div class="card-body">
                <template v-if="activeThresholdType === '位移量'">
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label>Z位移 ></label><input type="number" value="200" class="breathing-num"><span class="unit">mm</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>Y位移 ></label><input type="number" value="200" class="breathing-num"><span class="unit">mm</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>X位移 ></label><input type="number" value="200" class="breathing-num"><span class="unit">mm</span></div>
                </template>
                <template v-else-if="activeThresholdType === '位移速度'">
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label>Z速度 ></label><input type="number" value="150" class="breathing-num"><span class="unit">mm/d</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>Y速度 ></label><input type="number" value="150" class="breathing-num"><span class="unit">mm/d</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>X速度 ></label><input type="number" value="150" class="breathing-num"><span class="unit">mm/d</span></div>
                </template>
                <template v-else>
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label>Z加速度 ></label><input type="number" value="50" class="breathing-num"><span class="unit">mm/d²</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>Y加速度 ></label><input type="number" value="50" class="breathing-num"><span class="unit">mm/d²</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>X加速度 ></label><input type="number" value="50" class="breathing-num"><span class="unit">mm/d²</span></div>
                </template>
              </div>
            </div>
            <div class="threshold-card border-orange">
              <div class="card-title text-orange">
                <div><span class="color-dot bg-orange"></span> 二级预警 (橙色)</div>
                <span class="sub-cond">连续2次</span>
              </div>
              <div class="card-body">
                <template v-if="activeThresholdType === '位移量'">
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label>Z位移 ></label><input type="number" value="150" class="breathing-num"><span class="unit">mm</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>Y位移 ></label><input type="number" value="150" class="breathing-num"><span class="unit">mm</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>X位移 ></label><input type="number" value="150" class="breathing-num"><span class="unit">mm</span></div>
                </template>
                <template v-else-if="activeThresholdType === '位移速度'">
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label>Z速度 ></label><input type="number" value="100" class="breathing-num"><span class="unit">mm/d</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>Y速度 ></label><input type="number" value="100" class="breathing-num"><span class="unit">mm/d</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>X速度 ></label><input type="number" value="100" class="breathing-num"><span class="unit">mm/d</span></div>
                </template>
                <template v-else>
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label>Z加速度 ></label><input type="number" value="30" class="breathing-num"><span class="unit">mm/d²</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>Y加速度 ></label><input type="number" value="30" class="breathing-num"><span class="unit">mm/d²</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>X加速度 ></label><input type="number" value="30" class="breathing-num"><span class="unit">mm/d²</span></div>
                </template>
              </div>
            </div>
            <div class="threshold-card border-yellow">
              <div class="card-title text-yellow">
                <div><span class="color-dot bg-yellow"></span> 三级预警 (黄色)</div>
                <span class="sub-cond">连续2次</span>
              </div>
              <div class="card-body">
                <template v-if="activeThresholdType === '位移量'">
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label>Z位移 ></label><input type="number" value="100" class="breathing-num"><span class="unit">mm</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>Y位移 ></label><input type="number" value="100" class="breathing-num"><span class="unit">mm</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>X位移 ></label><input type="number" value="100" class="breathing-num"><span class="unit">mm</span></div>
                </template>
                <template v-else-if="activeThresholdType === '位移速度'">
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label>Z速度 ></label><input type="number" value="60" class="breathing-num"><span class="unit">mm/d</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>Y速度 ></label><input type="number" value="60" class="breathing-num"><span class="unit">mm/d</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>X速度 ></label><input type="number" value="60" class="breathing-num"><span class="unit">mm/d</span></div>
                </template>
                <template v-else>
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label>Z加速度 ></label><input type="number" value="20" class="breathing-num"><span class="unit">mm/d²</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>Y加速度 ></label><input type="number" value="20" class="breathing-num"><span class="unit">mm/d²</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>X加速度 ></label><input type="number" value="20" class="breathing-num"><span class="unit">mm/d²</span></div>
                </template>
              </div>
            </div>
            <div class="threshold-card border-blue">
              <div class="card-title text-blue">
                <div><span class="color-dot bg-blue"></span> 四级预警 (蓝色)</div>
                <span class="sub-cond">连续2次</span>
              </div>
              <div class="card-body">
                <template v-if="activeThresholdType === '位移量'">
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label>Z位移 ></label><input type="number" value="80" class="breathing-num"><span class="unit">mm</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>Y位移 ></label><input type="number" value="80" class="breathing-num"><span class="unit">mm</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>X位移 ></label><input type="number" value="80" class="breathing-num"><span class="unit">mm</span></div>
                </template>
                <template v-else-if="activeThresholdType === '位移速度'">
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label>Z速度 ></label><input type="number" value="30" class="breathing-num"><span class="unit">mm/d</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>Y速度 ></label><input type="number" value="30" class="breathing-num"><span class="unit">mm/d</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>X速度 ></label><input type="number" value="30" class="breathing-num"><span class="unit">mm/d</span></div>
                </template>
                <template v-else>
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label>Z加速度 ></label><input type="number" value="10" class="breathing-num"><span class="unit">mm/d²</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>Y加速度 ></label><input type="number" value="10" class="breathing-num"><span class="unit">mm/d²</span></div>
                  <div class="input-row"><input type="checkbox" class="breathing-check"><label>X加速度 ></label><input type="number" value="10" class="breathing-num"><span class="unit">mm/d²</span></div>
                </template>
              </div>
            </div>
          </div>

          <div v-show="activeTab === '雷达监测'" class="config-cards flex-1 mb-10" :class="{ 'is-faded': warningType === 'auto' }">
            <div class="threshold-card border-red">
              <div class="card-title text-red">
                <div><span class="color-dot bg-red"></span> 一级预警 (红色)</div>
              </div>
              <div class="card-body">
                <template v-if="radarThresholdType === '平均位移'">
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-70">平均位移 ></label><input type="number" value="200" class="breathing-num"><span class="unit">mm</span></div>
                </template>
                <template v-else-if="radarThresholdType === '平均速度'">
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-70">平均速度 ></label><input type="number" value="150" class="breathing-num"><span class="unit">mm/d</span></div>
                </template>
                <template v-else>
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-80">平均加速度 ></label><input type="number" value="50" class="breathing-num"><span class="unit">mm/d²</span></div>
                </template>
              </div>
            </div>
            <div class="threshold-card border-orange">
              <div class="card-title text-orange">
                <div><span class="color-dot bg-orange"></span> 二级预警 (橙色)</div>
              </div>
              <div class="card-body">
                <template v-if="radarThresholdType === '平均位移'">
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-70">平均位移 ></label><input type="number" value="150" class="breathing-num"><span class="unit">mm</span></div>
                </template>
                <template v-else-if="radarThresholdType === '平均速度'">
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-70">平均速度 ></label><input type="number" value="100" class="breathing-num"><span class="unit">mm/d</span></div>
                </template>
                <template v-else>
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-80">平均加速度 ></label><input type="number" value="30" class="breathing-num"><span class="unit">mm/d²</span></div>
                </template>
              </div>
            </div>
            <div class="threshold-card border-yellow">
              <div class="card-title text-yellow">
                <div><span class="color-dot bg-yellow"></span> 三级预警 (黄色)</div>
              </div>
              <div class="card-body">
                <template v-if="radarThresholdType === '平均位移'">
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-70">平均位移 ></label><input type="number" value="100" class="breathing-num"><span class="unit">mm</span></div>
                </template>
                <template v-else-if="radarThresholdType === '平均速度'">
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-70">平均速度 ></label><input type="number" value="60" class="breathing-num"><span class="unit">mm/d</span></div>
                </template>
                <template v-else>
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-80">平均加速度 ></label><input type="number" value="20" class="breathing-num"><span class="unit">mm/d²</span></div>
                </template>
              </div>
            </div>
            <div class="threshold-card border-blue">
              <div class="card-title text-blue">
                <div><span class="color-dot bg-blue"></span> 四级预警 (蓝色)</div>
              </div>
              <div class="card-body">
                <template v-if="radarThresholdType === '平均位移'">
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-70">平均位移 ></label><input type="number" value="80" class="breathing-num"><span class="unit">mm</span></div>
                </template>
                <template v-else-if="radarThresholdType === '平均速度'">
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-70">平均速度 ></label><input type="number" value="30" class="breathing-num"><span class="unit">mm/d</span></div>
                </template>
                <template v-else>
                  <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-80">平均加速度 ></label><input type="number" value="10" class="breathing-num"><span class="unit">mm/d²</span></div>
                </template>
              </div>
            </div>
          </div>

          <div v-show="activeTab === '深部位移'" class="config-cards mb-10" :class="{ 'is-faded': warningType === 'auto' }">
            <div class="threshold-card border-red">
              <div class="card-title text-red"><div><span class="color-dot bg-red"></span> 一级预警 (红色)</div></div>
              <div class="card-body">
                <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-110">单位时间位移量 ></label><input type="number" value="200" class="breathing-num"><span class="unit">mm</span></div>
              </div>
            </div>
            <div class="threshold-card border-orange">
              <div class="card-title text-orange"><div><span class="color-dot bg-orange"></span> 二级预警 (橙色)</div></div>
              <div class="card-body">
                <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-110">单位时间位移量 ></label><input type="number" value="150" class="breathing-num"><span class="unit">mm</span></div>
              </div>
            </div>
            <div class="threshold-card border-yellow">
              <div class="card-title text-yellow"><div><span class="color-dot bg-yellow"></span> 三级预警 (黄色)</div></div>
              <div class="card-body">
                <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-110">单位时间位移量 ></label><input type="number" value="100" class="breathing-num"><span class="unit">mm</span></div>
              </div>
            </div>
            <div class="threshold-card border-blue">
              <div class="card-title text-blue"><div><span class="color-dot bg-blue"></span> 四级预警 (蓝色)</div></div>
              <div class="card-body">
                <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-110">单位时间位移量 ></label><input type="number" value="80" class="breathing-num"><span class="unit">mm</span></div>
              </div>
            </div>
          </div>

          <div v-show="activeTab === '应力监测'" class="config-cards mb-10" :class="{ 'is-faded': warningType === 'auto' }">
            <div class="threshold-card border-red">
              <div class="card-title text-red"><div><span class="color-dot bg-red"></span> 一级预警 (红色)</div></div>
              <div class="card-body">
                <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-80">{{ stressThresholdType }} ></label><input type="number" value="200" class="breathing-num"><span class="unit">kPa</span></div>
              </div>
            </div>
            <div class="threshold-card border-orange">
              <div class="card-title text-orange"><div><span class="color-dot bg-orange"></span> 二级预警 (橙色)</div></div>
              <div class="card-body">
                <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-80">{{ stressThresholdType }} ></label><input type="number" value="150" class="breathing-num"><span class="unit">kPa</span></div>
              </div>
            </div>
            <div class="threshold-card border-yellow">
              <div class="card-title text-yellow"><div><span class="color-dot bg-yellow"></span> 三级预警 (黄色)</div></div>
              <div class="card-body">
                <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-80">{{ stressThresholdType }} ></label><input type="number" value="100" class="breathing-num"><span class="unit">kPa</span></div>
              </div>
            </div>
            <div class="threshold-card border-blue">
              <div class="card-title text-blue"><div><span class="color-dot bg-blue"></span> 四级预警 (蓝色)</div></div>
              <div class="card-body">
                <div class="input-row"><input type="checkbox" checked class="breathing-check"><label class="w-80">{{ stressThresholdType }} ></label><input type="number" value="80" class="breathing-num"><span class="unit">kPa</span></div>
              </div>
            </div>
          </div>

          <div class="info-wrap" v-show="['GNSS', '雷达监测'].includes(activeTab)">
            <span class="info-icon">ℹ</span>
            <span v-if="activeTab === 'GNSS'" class="info-text">注：预警参数可设置为 <b>位移量</b>、<b>位移速度</b> 或 <b>位移加速度</b> 中的某一个，均为达到某一设定阈值时触发预警。</span>
            <span v-else-if="activeTab === '雷达监测'" class="info-text">注：预警参数可设置为 <b>平均位移</b>、<b>平均速度</b> 或 <b>平均加速度</b> 中的某一个，目前设置的预警参数为 <b>{{ radarEvalArea }}m²</b> 的范围平均值。</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as echarts from 'echarts';

const showMenus = reactive({ level: false, region: false, line: false, point: false });
const activeThresholdType = ref('位移量');
const warningType = ref('threshold');
const activeTab = ref('GNSS');
const radarThresholdType = ref('平均位移');
const radarEvalArea = ref(50);
const deepThresholdType = ref('单位时间位移量');
const stressThresholdType = ref('累积应力');
const allRegions = ['北帮', '南帮', '东帮', '西帮', '中央区'];
const allLines = ['1号线', '2号线', '3号线', '4号线', '散点'];

const levelNameMap = { '1': '一', '2': '二', '3': '三', '4': '四' };
const nameToLevelMap = { '一': '1', '二': '2', '三': '3', '四': '4' };

const getLevelName = (lvlStr) => {
  return levelNameMap[lvlStr] || lvlStr;
};

const selectedLevels = ref(['1']);
const selectedRegions = ref(['北帮']);
const selectedLines = ref([...allLines]);
const selectedPointIds = ref([]);

const globalPointsMeta = ref([]);

const filteredPoints = computed(() => {
  return globalPointsMeta.value.filter(p =>
    selectedLevels.value.includes(p.alarmLevel) &&
    selectedRegions.value.includes(p.region) &&
    selectedLines.value.includes(p.line)
  );
});

const isAllLevelsSelected = computed({
  get: () => selectedLevels.value.length === 4,
  set: (val) => { selectedLevels.value = val ? ['1', '2', '3', '4'] : []; }
});
const isAllRegionsSelected = computed({
  get: () => selectedRegions.value.length === allRegions.length,
  set: (val) => { selectedRegions.value = val ? [...allRegions] : []; }
});
const isAllLinesSelected = computed({
  get: () => selectedLines.value.length === allLines.length,
  set: (val) => { selectedLines.value = val ? [...allLines] : []; }
});
const isAllPointsSelected = computed({
  get: () => filteredPoints.value.length > 0 && selectedPointIds.value.length === filteredPoints.value.length,
  set: (val) => { selectedPointIds.value = val ? filteredPoints.value.map(p => p.id) : []; }
});

const levelText = computed({
  get: () => selectedLevels.value.map(l => levelNameMap[l] ? levelNameMap[l] + '级' : l).join('、'),
  set: (val) => {
    selectedLevels.value = val.split('、').map(s => {
      const trimmed = s.trim().replace(/级/g, '');
      return nameToLevelMap[trimmed] || trimmed;
    }).filter(Boolean);
  }
});
const regionText = computed({
  get: () => selectedRegions.value.join('、'),
  set: (val) => { selectedRegions.value = val.split('、').map(s=>s.trim()).filter(Boolean); }
});
const lineText = computed({
  get: () => selectedLines.value.join('、'),
  set: (val) => { selectedLines.value = val.split('、').map(s=>s.trim()).filter(Boolean); }
});
const pointText = computed({
  get: () => selectedPointIds.value.join('、'),
  set: (val) => { selectedPointIds.value = val.split('、').map(s=>s.trim()).filter(Boolean); }
});
const metricText = computed({
  get: () => selectedMetrics.value.join('、'),
  set: (val) => { selectedMetrics.value = val.split('、').map(s=>s.trim()).filter(Boolean); }
});

const updateSceneAndFocus = () => {
  if (!scene || !controls) return;
  const activeLevels = selectedLevels.value;
  const criticalPointsList = [];
  activeLevels.forEach(lvl => {
    const pointsInLevel = globalPointsMeta.value.filter(p => p.alarmLevel === lvl && p.isOnline && p.type === 'GNSS');
    if (pointsInLevel.length > 0) {
      criticalPointsList.push(pointsInLevel[0]);
    }
  });

  let blinkingIds = [];
  if (criticalPointsList.length > 0) {
    criticalPointsList.sort((a, b) => parseInt(a.alarmLevel) - parseInt(b.alarmLevel));
    blinkingIds.push(criticalPointsList[0].id);
  }

  scene.traverse((child) => {
    if (child.userData.isZone) {
      child.visible = activeLevels.includes(child.userData.level);
    }
    if (child.isSprite && child.userData.id) {
      child.visible = true;
      child.userData.isBlinking = blinkingIds.includes(child.userData.id);
    }
  });

  const levelCenters = [
    { level: '1', x: 35, z: 35 },
    { level: '2', x: -35, z: 35 },
    { level: '3', x: -35, z: -35 },
    { level: '4', x: 35, z: -35 }
  ];

  if (activeLevels.length > 0) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

    activeLevels.forEach(lvl => {
      const zc = levelCenters.find(z => z.level === lvl);
      if (zc) {
        minX = Math.min(minX, zc.x - 35); maxX = Math.max(maxX, zc.x + 35);
        minZ = Math.min(minZ, zc.z - 35); maxZ = Math.max(maxZ, zc.z + 35);
      }
    });

    if (minX !== Infinity) {
      const targetX = (minX + maxX) / 2;
      const targetZ = (minZ + maxZ) / 2;
      const spanX = maxX - minX;
      const spanZ = maxZ - minZ;
      const effectiveSize = Math.max(spanX, spanZ);

      controls.target.set(targetX, 0, targetZ);
      camera.position.set(targetX, effectiveSize * 0.3 + 25, targetZ + effectiveSize * 0.1 + 10);
    }
  } else {
    controls.target.set(0, 0, 0);
    camera.position.set(0, 85, 15);
  }

  controls.update();
};

const threeContainer = ref(null);
const curveChartRef = ref(null);
let renderer, scene, camera, controls, animationId;
let curveChart = null;

const showMetricMenu = ref(false);

const METRIC_DICT = {
  'GNSS': { name: 'GNSS监测点指标', metrics: ['X速度(mm/h)', 'Y速度(mm/h)', 'H速度(mm/h)', 'XY速度(mm/h)', 'XYH速度(mm/h)', 'X位移(mm)', 'Y位移(mm)', 'H位移(mm)', 'XY位移(mm)', 'XYH位移(mm)', 'X累积位移(mm)', 'Y累积位移(mm)', 'H累积位移(mm)', 'XY累积位移(mm)', 'XYH累积位移(mm)', 'X加速度(mm/h²)', 'Y加速度(mm/h²)', 'H加速度(mm/h²)', '切线角(°)'] },
  'DEEP': { name: '深部位移监测点指标', metrics: ['节点累计位移(mm)'] },
  'RADAR': { name: '雷达监测点指标', metrics: ['累积形变(mm)', '变形速度(mm/h)', '加速度(mm/h²)'] },
  'CRACK': { name: '裂缝监测点指标', metrics: ['宽度累计变化量(mm)', '宽度日变化量(mm)', 'x方向加速度(mm/h²)', 'y方向加速度(mm/h²)', 'z方向加速度(mm/h²)', 'x方向倾角(°)', 'y方向倾角(°)', 'z方向倾角(°)'] },
  'FIRE': { name: '煤自燃监测点指标', metrics: ['温度(℃)', '一氧化碳浓度(PPm)', '氧气浓度(%)'] },
  'RAIN': { name: '降雨监测指标', metrics: ['累积降雨量(mm)', '实时降雨量(mm)'] },
  'WATER_LVL': { name: '地下水(水位计)指标', metrics: ['水面高程(m)', '空管长度(m)'] },
  'WATER_FLOW': { name: '地下水(流量计)指标', metrics: ['水位(m)', '流量(m²/h)', '空隙水压(kPa)', '温度(℃)'] },
  'STRESS_ANCHOR': { name: '应力(锚索)指标', metrics: ['锚索应力(kPa)'] },
  'STRESS_EARTH': { name: '应力(土压力计)指标', metrics: ['土压力(kPa)'] },
  'VIB': { name: '振动监测指标', metrics: ['X速度(mm/h)', 'Y速度(mm/h)', 'H速度(mm/h)', 'XY速度(mm/h)', 'XYH速度(mm/h)', 'X位移(mm)', 'Y位移(mm)', 'H位移(mm)', 'XY位移(mm)', 'XYH位移(mm)', 'X累积位移(mm)', 'Y累积位移(mm)', 'H累积位移(mm)', 'XY累积位移(mm)', 'XYH累积位移(mm)', 'X加速度(mm/h²)', 'Y加速度(mm/h²)', 'H加速度(mm/h²)', '切线角(°)'] }
};

const dynamicMetricGroups = computed(() => {
  const groups = [];
  const typesInUse = new Set();
  selectedPointIds.value.forEach(id => {
    const pt = globalPointsMeta.value.find(p => p.id === id);
    if (pt && pt.type) typesInUse.add(pt.type);
  });
  typesInUse.forEach(type => {
    if (METRIC_DICT[type]) {
      groups.push({ name: METRIC_DICT[type].name, metrics: METRIC_DICT[type].metrics });
    }
  });
  return groups;
});

const allAvailableMetrics = computed(() => {
  let all = [];
  dynamicMetricGroups.value.forEach(g => { all = all.concat(g.metrics); });
  return [...new Set(all)];
});

const selectedMetrics = ref([]);

watch(allAvailableMetrics, (newAvail) => {
  selectedMetrics.value = selectedMetrics.value.filter(m => newAvail.includes(m));
  if (selectedMetrics.value.length === 0 && newAvail.length > 0) {
    selectedMetrics.value = newAvail.slice(0, 3);
  }
});

const isAllMetricsSelected = computed({
  get: () => allAvailableMetrics.value.length > 0 && selectedMetrics.value.length === allAvailableMetrics.value.length,
  set: (val) => {
    selectedMetrics.value = val ? [...allAvailableMetrics.value] : [];
    initECharts();
  }
});

const toggleFilterMenu = (menuName) => {
  showMetricMenu.value = false;
  Object.keys(showMenus).forEach(key => {
    showMenus[key] = (key === menuName) ? !showMenus[key] : false;
  });
};

const toggleMetricMenu = () => {
  showMetricMenu.value = !showMetricMenu.value;
  Object.keys(showMenus).forEach(key => {
    showMenus[key] = false;
  });
};

const closeMenuOnClickOutside = (e) => {
  const metricWrapper = document.querySelector('.metric-dropdown-wrapper');
  if (metricWrapper && !metricWrapper.contains(e.target)) {
    showMetricMenu.value = false;
  }
  const filterBar = document.querySelector('.filter-bar');
  if (filterBar && !filterBar.contains(e.target)) {
    showMenus.level = false;
    showMenus.region = false;
    showMenus.line = false;
    showMenus.point = false;
  }
};

const createGlowTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
};

const createSpotTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 120);
  gradient.addColorStop(0, 'rgba(255,255,255,0.4)');
  gradient.addColorStop(0.8, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0.1)');
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
};

const createIconTexture = (type, color, deviceId) => {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = 256 * scale;
  canvas.height = 256 * scale;
  const ctx = canvas.getContext('2d');

  const icons = { 'GNSS': '📍', 'DEEP': '⚓', 'RADAR': '📡', 'SURFACE': '📐', 'CRACK': '🧱', 'FIRE': '🔥', 'WATER': '💧', 'GROUND': '🌍', 'STRESS': '📊', 'VIB': '💥', 'SAT': '🛸' };
  const emoji = icons[type] || '●';

  ctx.save();
  ctx.translate(128 * scale, 112 * scale);
  ctx.rotate(-45 * Math.PI / 180);
  ctx.beginPath();
  if(ctx.roundRect) {
      ctx.roundRect(-24 * scale, -24 * scale, 48 * scale, 48 * scale,[24 * scale, 24 * scale, 24 * scale, 0]);
  } else {
      ctx.rect(-24 * scale, -24 * scale, 48 * scale, 48 * scale);
  }
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12 * scale;
  ctx.shadowOffsetY = 4 * scale;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3 * scale;
  ctx.strokeStyle = '#85C6F1';
  ctx.stroke();
  ctx.restore();

  ctx.font = `${28 * scale}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 128 * scale, 112 * scale);

  ctx.font = `bold ${16 * scale}px "Microsoft YaHei", sans-serif`;
  const textWidth = ctx.measureText(deviceId).width;
  const labelWidth = textWidth + 24 * scale;
  const labelHeight = 26 * scale;
  const labelX = 128 * scale - labelWidth / 2;
  const labelY = 182 * scale - labelHeight / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.beginPath();
  if(ctx.roundRect) {
      ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 4 * scale);
  } else {
      ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
  }
  ctx.fill();

  ctx.lineWidth = 1 * scale;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.fillText(deviceId, 128 * scale, 182 * scale);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  return texture;
};

const createTerrainZone = (centerX, centerZ, colorHex, spotTexture) => {
  const geometry = new THREE.PlaneGeometry(60, 60, 64, 64);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  for(let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i) + centerX;
      const vz = pos.getZ(i) + centerZ;
      const vy = Math.sin(vx / 10) * Math.cos(vz / 10) * 8;
      pos.setY(i, vy - 0.5);
  }

  geometry.translate(centerX, 0, centerZ);
  geometry.computeVertexNormals();

  const material = new THREE.MeshBasicMaterial({
      color: colorHex,
      map: spotTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      opacity: 0.8
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;
  return mesh;
};

const initECharts = () => {
  if (!curveChartRef.value) return;
  if (curveChart) {
    curveChart.dispose();
    curveChart = null;
  }
  curveChart = echarts.init(curveChartRef.value);

  const timeData = [];
  const seriesData = [];
  const legendData = [];
  const lineStyles = ['solid', 'dashed', 'dotted', 'dashDot'];
  const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'];

  const now = new Date();
  for (let i = 24; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 60 * 60 * 1000);
      timeData.push(`${t.getHours().toString().padStart(2, '0')}:00`);
  }

  selectedPointIds.value.forEach((ptId, pIdx) => {
      const ptMeta = globalPointsMeta.value.find(p => p.id === ptId);
      if(!ptMeta) return;
      const validMetricsForType = METRIC_DICT[ptMeta.type]?.metrics || [];

      selectedMetrics.value.forEach((metric, mIdx) => {
          if(!validMetricsForType.includes(metric)) return;

          const lineName = `${ptId} - ${metric}`;
          legendData.push(lineName);
          const dataArr = [];

          for (let i = 0; i <= 24; i++) {
              let val = 0;
              if (metric.includes('速度')) val = Math.sin(i * 0.4 + pIdx) * 4 + 101 + pIdx * 15;
              else if (metric.includes('位移') || metric.includes('变形')) val = Math.cos(i * 0.3 + pIdx) * 3 + 97 - pIdx * 10;
              else if (metric.includes('浓度') || metric.includes('温度')) val = Math.random() * 5 + 30 + pIdx * 2;
              else val = Math.sin(i * 0.2) * 5 + 20 + pIdx * 8;
              dataArr.push(Math.abs(val).toFixed(2));
          }

          seriesData.push({
              name: lineName,
              type: 'line',
              smooth: true,
              symbol: 'none',
              itemStyle: { color: colors[(pIdx * selectedMetrics.value.length + mIdx) % colors.length] },
              lineStyle: { width: 2.5, type: lineStyles[mIdx % lineStyles.length] },
              data: dataArr
          });
      });
  });

  const option = {
      grid: { top: 40, right: 30, bottom: 40, left: 45 },
      tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderColor: '#dcdfe6',
          textStyle: { color: '#333' },
          formatter: function (params) {
             let html = `<div style="font-weight:bold;margin-bottom:6px;">时间: ${params[0].axisValue}</div>`;
             params.forEach(p => {
                 html += `<div>${p.marker} ${p.seriesName} : <span style="font-weight:bold;color:${p.color}">${p.value}</span></div>`;
             });
             return html;
          }
      },
      legend: { type: 'scroll', top: 0, left: 80, textStyle: { fontSize: 12, color: '#333' }, data: legendData },
      dataZoom: [{ type: 'slider', show: true, xAxisIndex: [0], bottom: 0, height: 15 }, { type: 'inside', xAxisIndex: [0] }],      xAxis: {
          type: 'category', boundaryGap: false, data: timeData,
          axisLine: { lineStyle: { color: '#dcdfe6' } },
          axisLabel: { color: '#666', fontSize: 11 }
      },
      yAxis: {
          name: '值',
          nameTextStyle: { color: '#333', fontWeight: 'bold', padding: [0, 20, 0, 0] },
          type: 'value',
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: '#ebeef5', type: 'solid' } }
      },
      series: seriesData
  };

  curveChart.setOption(option, true);
};

const handleQuery = () => {
  updateSceneAndFocus();
  initECharts();
};

// ================= 新增：预警阈值设置目标选择与层级覆盖逻辑 =================
const configTargetLevel = ref('global'); // 当前选择的层级：全局、区域、线、点
const configTargetValue = ref(''); // 选中的具体名称

// 根据当前选中的模块 (GNSS/雷达/深部/应力) 过滤出对应的测点列表供下拉框使用
const pointsForActiveTab = computed(() => {
  const typeMap = { 'GNSS': 'GNSS', '雷达监测': 'RADAR', '深部位移': 'DEEP', '应力监测': 'STRESS' };
  const t = typeMap[activeTab.value];
  return globalPointsMeta.value.filter(p => p.type.includes(t));
});

// 监听层级或模块 Tab 变化，自动重置选中值
watch([configTargetLevel, activeTab], () => {
  if (configTargetLevel.value === 'region') configTargetValue.value = allRegions[0];
  else if (configTargetLevel.value === 'line') configTargetValue.value = allLines[0];
  else if (configTargetLevel.value === 'point') {
    configTargetValue.value = pointsForActiveTab.value.length > 0 ? pointsForActiveTab.value[0].id : '';
  } else {
    configTargetValue.value = '';
  }
});

// 存储已保存的阈值配置字典，用于检查冲突
const savedThresholds = reactive({
  'GNSS': { region: {}, line: {}, point: {} },
  '雷达监测': { region: {}, line: {}, point: {} },
  '深部位移': { region: {}, line: {}, point: {} },
  '应力监测': { region: {}, line: {}, point: {} }
});

// 全新重写的保存逻辑 (带覆盖提示)
const handleSave = () => {
  if (warningType.value === 'auto') return;

  const tab = activeTab.value;
  const level = configTargetLevel.value;
  const target = configTargetValue.value;
  let conflictMsg = '';

  const relevantPoints = pointsForActiveTab.value; // 当前模块下的所有测点数据

  // 1. 冲突检测逻辑：检查是否覆盖了更具体的底层级设置
  if (level === 'global') {
    const hasRegion = Object.keys(savedThresholds[tab].region).length > 0;
    const hasLine = Object.keys(savedThresholds[tab].line).length > 0;
    const hasPoint = Object.keys(savedThresholds[tab].point).length > 0;
    if (hasRegion || hasLine || hasPoint) {
      conflictMsg = `【${tab}】模块下已存在特定区域、监测线或监测点的独立阈值设置。保存全局参数将覆盖并清空这些单独的设置，是否继续？`;
    }
  } else if (level === 'region') {
    const ptsInRegion = relevantPoints.filter(p => p.region === target).map(p => p.id);
    const pointConflicts = ptsInRegion.filter(pid => savedThresholds[tab].point[pid]);
    if (pointConflicts.length > 0) {
      conflictMsg = `该区域（${target}）内已有 ${pointConflicts.length} 个监测点被单独设置了阈值。保存区域阈值将覆盖这些测点的单独设置，是否继续？`;
    }
  } else if (level === 'line') {
    const ptsInLine = relevantPoints.filter(p => p.line === target).map(p => p.id);
    const pointConflicts = ptsInLine.filter(pid => savedThresholds[tab].point[pid]);
    if (pointConflicts.length > 0) {
      conflictMsg = `该监测线（${target}）内已有 ${pointConflicts.length} 个监测点被单独设置了阈值。保存监测线阈值将覆盖这些测点的单独设置，是否继续？`;
    }
  }

  // 2. 处理覆盖确认与旧数据清理
  if (conflictMsg) {
    if (!window.confirm(conflictMsg)) return; // 用户点击了“取消”

    if (level === 'global') {
      savedThresholds[tab].region = {};
      savedThresholds[tab].line = {};
      savedThresholds[tab].point = {};
    } else if (level === 'region') {
      const ptsInRegion = relevantPoints.filter(p => p.region === target).map(p => p.id);
      ptsInRegion.forEach(pid => delete savedThresholds[tab].point[pid]);
    } else if (level === 'line') {
      const ptsInLine = relevantPoints.filter(p => p.line === target).map(p => p.id);
      ptsInLine.forEach(pid => delete savedThresholds[tab].point[pid]);
    }
  }

  // 3. 写入当前新的配置记录
  if (level !== 'global') {
    savedThresholds[tab][level][target] = true;
  }

  const targetName = level === 'global' ? '全局' : target;
  window.alert(`✅ 【${tab}】针对 [ ${targetName} ] 的预警阈值设置成功！`);
};
// =======================================================================

onMounted(() => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1a2a);

  const width = threeContainer.value.clientWidth;
  const height = threeContainer.value.clientHeight;
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 85, 15);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  threeContainer.value.appendChild(renderer.domElement);

  renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.panSpeed = 1.2;
  controls.screenSpacePanning = false;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;

  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE
  };

  const glowTexture = createGlowTexture();
  const spotTexture = createSpotTexture();
  const allPointsGroup = new THREE.Group();

  const icons = {
    'GNSS': '📍', 'RADAR': '📡', 'DEEP': '⚓', 'RAIN': '🌧️',
    'WATER_LVL': '💧', 'WATER_FLOW': '🌊', 'STRESS_ANCHOR': '🔗',
    'STRESS_EARTH': '🗜️', 'CRACK': '🧱', 'FIRE': '🔥', 'VIB': '💥'
  };
  const types = Object.keys(icons);
  const colors =['#F57676', '#FFA500', '#fadb14', '#66B1FF', '#71C446'];

  const zoneCenters =[
    { x: 35, z: 35 }, { x: -35, z: 35 }, { x: -35, z: -35 }, { x: 35, z: -35 }
  ];

  for(let i = 0; i < 4; i++) {
    const zoneMesh = createTerrainZone(zoneCenters[i].x, zoneCenters[i].z, colors[i], spotTexture);
    zoneMesh.userData.isZone = true;
    zoneMesh.userData.level = (i + 1).toString();
    scene.add(zoneMesh);
  }

  let redGnssCount = 0;
  const positions =[];
  const colorArray =[];
  const baseColorObj = new THREE.Color();

  for (let i = 0; i < 77; i++) {
    let type = types[i % types.length];

    let alarmIdx = (i * 7) % 5;
    const isOnline = (i % 8 !== 0);
    if (type === 'GNSS' && alarmIdx === 0) {
        if (redGnssCount < 2) redGnssCount++; else alarmIdx = 4;
    }

    const targetColor = isOnline ? colors[alarmIdx] : '#999999';

    let deviceId = '';
    if (type === 'WATER_LVL') deviceId = `水位计${i}`;
    else if (type === 'WATER_FLOW') deviceId = `流量计${i}`;
    else if (type === 'STRESS_ANCHOR') deviceId = `锚索应力${i}`;
    else if (type === 'STRESS_EARTH') deviceId = `土压力计${i}`;
    else deviceId = `${type}${i}`;

    const mappedAlarmLevel = (alarmIdx === 4 ? 4 : alarmIdx + 1).toString();
    const mappedRegion = allRegions[i % 5];
    const mappedLine = allLines[i % 5];

    const metaData = {
        id: deviceId,
        type: type,
        alarmLevel: mappedAlarmLevel,
        region: mappedRegion,
        line: mappedLine,
        isOnline: isOnline
    };
    if (globalPointsMeta.value.length < 77) {
        globalPointsMeta.value.push(metaData);
    }

    let x, z;
    if (isOnline && alarmIdx < 4) {
      const center = zoneCenters[alarmIdx];
      const radius = Math.random() * 20;
      const angle = Math.random() * Math.PI * 2;
      x = center.x + Math.cos(angle) * radius;
      z = center.z + Math.sin(angle) * radius;
    } else {
      let isValid = false;
      while (!isValid) {
        x = (Math.random() - 0.5) * 160;
        z = (Math.random() - 0.5) * 160;
        isValid = true;
        for (let j = 0; j < zoneCenters.length; j++) {
          const dist = Math.sqrt(Math.pow(x - zoneCenters[j].x, 2) + Math.pow(z - zoneCenters[j].z, 2));
          if (dist <= 25) {
            isValid = false;
            break;
          }
        }
      }
    }

    const y = Math.sin(x / 10) * Math.cos(z / 10) * 8;

    positions.push(x, y, z);

    baseColorObj.set(targetColor);
    colorArray.push(baseColorObj.r, baseColorObj.g, baseColorObj.b);

    const iconTexture = createIconTexture(type, targetColor, deviceId);

    const spriteMaterial = new THREE.SpriteMaterial({
      map: iconTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.renderOrder = 10;

    sprite.position.set(x, y, z);
    sprite.scale.set(12, 12, 1);
    sprite.center.set(0.5, 1 - 160 / 256);

    sprite.userData = metaData;
    allPointsGroup.add(sprite);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3));

  const pointsMaterial = new THREE.PointsMaterial({
    size: 8,
    map: glowTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    vertexColors: true
  });

  const points = new THREE.Points(geometry, pointsMaterial);
  points.renderOrder = 2;

  allPointsGroup.add(points);
  scene.add(allPointsGroup);

  const gridHelper = new THREE.GridHelper(200, 30, 0x1c3d90, 0x1c3d90);
  gridHelper.position.y = -10;
  gridHelper.material.opacity = 0.15;
  gridHelper.material.transparent = true;
  gridHelper.renderOrder = 0;
  scene.add(gridHelper);

  if (selectedPointIds.value.length === 0) {
      const topPoints = filteredPoints.value.filter(p => p.alarmLevel === '1' && p.isOnline && p.type === 'GNSS');
      const fallbackPoints = filteredPoints.value.filter(p => p.isOnline && p.type === 'GNSS');
      selectedPointIds.value = topPoints.length > 0 ? [topPoints[0].id] : (fallbackPoints.length > 0 ? [fallbackPoints[0].id] : []);

      if (selectedPointIds.value.length > 0) {
          const pt = globalPointsMeta.value.find(p => p.id === selectedPointIds.value[0]);
          if (pt && METRIC_DICT[pt.type]) {
              selectedMetrics.value = METRIC_DICT[pt.type].metrics.slice(0, 4);
          }
      }
  }

  handleQuery();

  const animate = () => {
    animationId = requestAnimationFrame(animate);
    const time = Date.now() * 0.005;

    scene.traverse((child) => {
      if (child.isSprite && child.userData.isBlinking) {
         const scale = 18 + Math.sin(time * 1.2) * 10;
         child.scale.set(scale, scale, 1);
      }
    });

    controls.update();
    renderer.render(scene, camera);
  };
  animate();
  window.addEventListener('resize', onWindowResize);
  document.addEventListener('mousedown', closeMenuOnClickOutside);
});

const onWindowResize = () => {
  const width = threeContainer.value.clientWidth;
  const height = threeContainer.value.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);

  if (curveChart) curveChart.resize();
};

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', onWindowResize);

  if (renderer) renderer.dispose();
  if (curveChart) curveChart.dispose();
  document.removeEventListener('mousedown', closeMenuOnClickOutside);
});
</script>

<style scoped>
/* 全局基础 */
.view-page {
  display: flex;
  flex-direction: column;
  gap: 16px; /* 将 20px 改为 16px，让布局稍微紧凑一点 */
  padding: 16px;
  color: #16325c;
  box-sizing: border-box;
  height: 100%; /* 新增：撑满父级（或写 100vh） */
  overflow: hidden; /* 关键新增：彻底隐藏主容器的右侧滚动条 */
}



/* 共用类 */
.flex-1 { flex: 1; }
.flex-1-5 { flex: 1.5; }
.flex-col { display: flex; flex-direction: column; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.flex-align-center { display: flex; align-items: center; }
.relative { position: relative; }
.gap-8 { gap: 8px; }
.gap-10 { gap: 10px; }
.gap-12 { gap: 12px; }
.gap-20 { gap: 20px; }
.p-15 { padding: 15px; }
.mb-5 { margin-bottom: 5px; }
.mb-10 { margin-bottom: 10px; }
.mb-15 { margin-bottom: 15px; }
.w-70 { width: 70px; }
.w-80 { width: 80px; }
.w-110 { width: 110px; }
.h-100 { height: 100%; }
.text-center { text-align: center; }

/* 标题样式：下移并加大左侧蓝条厚重感 */
.section-header {
  margin-bottom: 12px;
}
.section-title {
  margin-top: 10px; /* 标题再下移一点点 */
  font-size: 18px;
  color: #1c3d90;
  display: flex;
  align-items: center;
  border-left: 4px solid #1c64f2; /* 现代化蓝色 */
  border-radius: 2px;
  padding-left: 12px; /* 拉开距离 */
  margin-bottom: 0;
  font-weight: 700;
}

/* 新增这个类 */
.main-visualization {
  display: flex;
  flex-direction: column;
  flex: 1; /* 让上半部分自动抢占所有的剩余高度 */
  min-height: 0; /* 必须加，防止内部图表撑破容器 */
}

/* 呼吸感卡片面板 */
.sys-card {
  background: rgba(255, 255, 255, 0.94);
  border-radius: 20px; /* 圆钝大圆角 */
  box-shadow: 0 12px 32px rgba(28, 61, 144, 0.05); /* 弥散阴影 */
  border: 1px solid rgba(28, 61, 144, 0.08) !important;
}

/* 顶部可视化区域 */
.visualization-layout {
  display: flex;
  gap: 20px;
  /* height: 520px;  <-- 【删除】这行写死的固定高度 */
  flex: 1; /* 新增：改为动态撑满剩余空间 */
  min-height: 0; /* 新增：防止内容撑破 */
  align-items: stretch;
}

/* 3D地图容器 */
.map-container {
  flex: 1.2;
  padding: 0 !important;
  background: #0a1a2a !important;
  overflow: hidden;
  border: none !important; /* 移除生硬边框 */
  box-shadow: inset 0 0 20px rgba(133,198,241,0.05), 0 12px 32px rgba(0,0,0,0.15);
  cursor: grab;
}
.map-container:active { cursor: grabbing; }
.three-viewport { width: 100%; height: 100%; position: relative; }
.controls-hint {
  position: absolute;
  top: 16px;
  right: 16px;
  color: #d8efff;
  background: rgba(7, 18, 34, 0.72);
  border: 1px solid rgba(133, 198, 241, 0.18);
  border-radius: 999px; /* 胶囊形 */
  padding: 8px 16px;
  font-size: 11px;
  pointer-events: none;
  z-index: 10;
  backdrop-filter: blur(4px);
}

/* 右侧曲线图容器 */
.curve-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.filter-bar {
  display: flex;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 2px solid rgba(28, 61, 144, 0.06); /* 灰色分界线粗一点 */
  background: linear-gradient(180deg, #fcfcfd, #f8fbff);
}
.filter-group { display: flex; align-items: center; gap: 8px; }
.filter-label { font-size: 13px; color: #1c3d90; font-weight: bold; white-space: nowrap;}

/* 呼吸感输入框/下拉框 */
.breathing-input, .breathing-select {
  flex: 1;
  width: 0;
  background: #fff;
  border: 1px solid rgba(28, 61, 144, 0.16) !important;
  padding: 6px 14px !important;
  border-radius: 999px !important; /* 胶囊圆角 */
  font-size: 12px;
  outline: none;
  cursor: text;
  transition: all 0.3s ease !important;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
}
.breathing-input:focus, .breathing-input:hover, .breathing-select:focus, .breathing-select:hover {
  border-color: #1c64f2 !important;
  box-shadow: 0 0 0 3px rgba(28, 100, 242, 0.1), inset 0 2px 4px rgba(0,0,0,0.02);
}
.highlight-input { color: #1c3d90; font-weight: bold; }

/* 渐变按钮 */
.primary-btn {
  border: none;
  color: #fff;
  background: linear-gradient(135deg, #1c64f2, #163c8f);
  box-shadow: 0 6px 16px rgba(28, 100, 242, 0.2);
  border-radius: 999px;
  padding: 6px 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(28, 100, 242, 0.3);
}
.primary-btn:disabled {
  background: #a8b4d0;
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}

/* 曲线表头 */
.chart-wrapper { flex: 1; width: 100%; min-height: 0; }
.dash-title {
  font-size: 15px;
  font-weight: bold;
  color: #1c3d90;
  border-left: 4px solid #1c64f2;
  border-radius: 2px;
  padding-left: 10px;
  margin: 0;
}

/* 预警阈值布局 */
.threshold-layout {
  display: flex;
  gap: 0;
  min-height: 150px;
  overflow: hidden;
}

/* 侧边菜单栏 */
.threshold-tabs {
  width: 150px;
  background: linear-gradient(180deg, #f8fbff, #f4f8ff);
  padding: 20px 14px;
  border-right: 2px solid rgba(28, 61, 144, 0.06); /* 加粗分割线 */
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}
.tab-btn {
  padding: 12px 16px;
  background: transparent;
  color: #606266;
  cursor: pointer;
  font-size: 14px;
  border-radius: 12px;
  text-align: center;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tab-btn:hover {
  background: #eaf2ff;
  color: #1c64f2;
  transform: translateX(2px); /* 悬浮呼吸感 */
}
.tab-btn.active {
  background: #1c64f2;
  color: #fff;
  font-weight: bold;
  box-shadow: 0 8px 16px rgba(28, 100, 242, 0.24);
  transform: translateX(4px);
}

/* 配置内容区 */
.tab-content-container {
  flex: 1;
  background: transparent;
  padding: 16px 20px;
  overflow-y: auto;
}
.config-header {
  border-bottom: 2px dashed rgba(28, 61, 144, 0.1); /* 加粗分界线 */
  padding-bottom: 14px;
  margin-bottom: 16px;
}

/* 加粗的竖向分界线 */
.thick-divider-y {
  height: 18px; width: 2px; background: rgba(28, 61, 144, 0.12);
}

/* 单选框与表单 */
.radio-label { cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px; color: #333; }
.breathing-radio { accent-color: #1c64f2; transform: scale(1.1); }
.form-label { font-size: 14px; font-weight: bold; color: #1c3d90; transition: color 0.3s; }
.text-muted { color: #999 !important; }
.is-disabled { background: #f5f7fa !important; cursor: not-allowed !important; opacity: 0.8; }
.is-faded { opacity: 0.45; pointer-events: none; filter: grayscale(1); }

.input-with-unit { display: flex; align-items: center; }
.breathing-input-left {
  width: 60px; padding: 6px;
  border: 1px solid rgba(28, 61, 144, 0.16);
  border-radius: 8px 0 0 8px;
  text-align: center; outline: none; font-size: 13px;
  background: #fff;
  transition: all 0.3s ease;
}
.breathing-input-left:focus { border-color: #1c64f2; }
.unit-addon {
  background: #f8fbff;
  border: 1px solid rgba(28, 61, 144, 0.16);
  border-left: none;
  padding: 6px 10px;
  border-radius: 0 8px 8px 0;
  font-size: 13px; color: #7890b1;
}

/* 阈值卡片 */
.config-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.threshold-card {
  border: 1px solid rgba(28, 61, 144, 0.06);
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  height: 155px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 16px rgba(0,0,0,0.02);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.threshold-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(28, 61, 144, 0.08);
}
.card-title {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(248, 251, 255, 0.5);
  border-bottom: 2px solid rgba(28, 61, 144, 0.04); /* 加粗分割线 */
}
.card-title div { display: flex; align-items: center; gap: 8px; }
.color-dot { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
.sub-cond { font-size: 11px; color: #999; font-weight: normal; }

.text-red { color: #e53935; }
.text-orange { color: #f57c00; }
.text-yellow { color: #fbc02d; }
.text-blue { color: #1e88e5; }
.bg-red { background: #e53935; }
.bg-orange { background: #f57c00; }
.bg-yellow { background: #fbc02d; }
.bg-blue { background: #1e88e5; }
.border-red { border-color: rgba(229, 57, 53, 0.15); }
.border-orange { border-color: rgba(245, 124, 0, 0.15); }
.border-yellow { border-color: rgba(251, 192, 45, 0.2); }
.border-blue { border-color: rgba(30, 136, 229, 0.15); }

/* 卡片内部输入 */
.card-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  flex: 1;
  justify-content: center;
  gap: 10px;
}
.input-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #555; }
.breathing-check { accent-color: #1c64f2; cursor: pointer; transform: scale(1.1); margin-right: 2px; }
.input-row label { width: 55px; }
.breathing-num {
  flex: 1;
  width: 0;
  padding: 5px;
  border: 1px solid rgba(28, 61, 144, 0.12);
  border-radius: 6px;
  text-align: center;
  color: #333;
  outline: none;
  background: #fcfcfd;
  transition: all 0.3s ease;
}
.breathing-num:focus { border-color: #1c64f2; background: #fff; box-shadow: 0 0 0 2px rgba(28, 100, 242, 0.1); }
.input-row .unit { width: 35px; text-align: right; color: #999; }

/* 提示区 */
.info-wrap { display: flex; align-items: center; gap: 8px; margin-top: 15px; }
.info-icon {
  background: #eef6ff; color: #1c64f2;
  width: 20px; height: 20px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: bold; font-size: 12px; border: 1px solid #c3e4fd;
}
.info-text { font-size: 11.5px; color: #666; white-space: nowrap; letter-spacing: -0.2px; }
.info-text b { color: #1c64f2; }

/* 指标下拉菜单 */
.metric-menu-container {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(28, 61, 144, 0.1);
  border-radius: 16px;
  z-index: 9999;
  padding: 0;
  box-shadow: 0 16px 40px rgba(28, 61, 144, 0.12);
  min-width: 100%;
  max-height: 400px;
  overflow-y: auto;
  backdrop-filter: blur(10px);
}
.right-aligned { left: auto; right: 0; width: 260px; }

.menu-header-item {
  background: linear-gradient(90deg, #f4f8ff, #fff);
  border-bottom: 2px solid rgba(28, 61, 144, 0.06); /* 加粗分割线 */
}
.bold-label { font-weight: bold; color: #1c64f2; cursor: pointer; flex: 1; }

.menu-group-title {
  padding: 8px 14px;
  background: linear-gradient(90deg, #f0f4f8, #f8fbff);
  color: #5d7192;
  font-size: 11px;
  font-weight: bold;
  border-bottom: 2px solid rgba(28, 61, 144, 0.04);
}

.multi-item {
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.2s ease, padding-left 0.2s ease;
  font-size: 12px;
  cursor: pointer;
}
.multi-item:hover {
  background: #f0f7ff;
  padding-left: 18px; /* 悬浮缩进呼吸感 */
}
.multi-item label { cursor: pointer; flex: 1; color: #333; }

.sub-item {
  padding-left: 25px;
  border-bottom: 1px solid rgba(28, 61, 144, 0.02);
}
.sub-item:hover { padding-left: 28px; }

/* 滚动条美化 */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-thumb { border-radius: 999px; background: rgba(92, 128, 190, 0.25); }
::-webkit-scrollbar-track { background: transparent; }
</style>