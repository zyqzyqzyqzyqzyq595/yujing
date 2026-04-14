我已经根据您的需求，为「层级化联系人」模块的左侧组织架构树添加了点击交互功能。

**核心改动说明：**
1. **左侧菜单联动**：现在点击“生产技术部”、“安全监察部”或“调度指挥中心”，左侧树节点会高亮显示选中状态，右侧的联系人表格会**实时过滤**并展示对应部门的人员数据。
2. **新增/编辑/删除逻辑适配**：
- 点击“新增联系人”时，表单中的“所属部门”会自动默认填写为您当前选中的部门。
- 编辑和删除功能已经完美适配了动态过滤逻辑，无论在哪个部门下操作，都能精确修改或删除原始数据，不会出现错乱。
3. **补充演示数据**：为了让您马上看到点击“安全监察部”的切换效果，我在底层的模拟数据中为您预置了一条安全监察部的联系人数据。

其他所有模块代码（预警闭环、通知规则配置）均保持原封不动。以下是完整的代码：

```vue
<template>
  <div class="view-container">
    <aside class="sidebar">
      <div class="sidebar-header">功能菜单</div>
      <ul class="nav-list">
        <li :class="{ active: currentTab === 'work-order' }" @click="currentTab = 'work-order'">
          预警闭环管理
        </li>
        <li :class="{ active: currentTab === 'rules' }" @click="currentTab = 'rules'">
          通知规则配置
        </li>
        <li :class="{ active: currentTab === 'contacts' }" @click="currentTab = 'contacts'">
          层级化联系人
        </li>
      </ul>
    </aside>

    <main class="main-content">
      <div v-if="currentTab === 'work-order'" class="tab-pane-flex">
        <div class="page-header-wrap">
          <h2 class="page-title">预警闭环处理管理</h2>
        </div>

        <div class="sys-card timeline-card">
          <div class="card-header">
            <h3>时间轴（预警推送及处理进程）- 点击节点查看详情</h3>
          </div>
          <div class="timeline-wrapper">
            <div class="timeline-step clickable" :class="getTimelineStatus('push')" @click="activeTimelineModal = 'push'">
              <div class="step-node"></div><div class="step-label">自动推送</div>
            </div>
            <div class="timeline-line"></div>
            <div class="timeline-step clickable" :class="getTimelineStatus('consult')" @click="activeTimelineModal = 'consult'">
              <div class="step-node"></div><div class="step-label">多方会商</div>
            </div>
            <div class="timeline-line"></div>
            <div class="timeline-step clickable" :class="getTimelineStatus('process')" @click="activeTimelineModal = 'process'">
              <div class="step-node"></div><div class="step-label">隐患处理</div>
            </div>
            <div class="timeline-line"></div>
            <div class="timeline-step" :class="getTimelineStatus('archive')">
              <div class="step-node"></div><div class="step-label">跟踪归档</div>
            </div>
          </div>
        </div>

        <div class="sys-card table-card">
          <div class="table-header">
            <h3>预警记录管理</h3>
            <div class="header-tools">
              <button class="add-btn" @click="handleCreateOrder">+ 新增处置单</button>
            </div>
          </div>

          <div class="search-section">
            <span class="search-label">时间检索：</span>
            <input type="date" class="ctrl-input" v-model="searchParams.time">
            <span class="search-label">等级检索：</span>
            <select class="ctrl-input" v-model="searchParams.level">
              <option value="">全部等级</option>
              <option value="red">红色预警 (一级)</option>
              <option value="orange">橙色预警 (二级)</option>
              <option value="yellow">黄色预警 (三级)</option>
              <option value="blue">蓝色预警 (四级)</option>
            </select>
            <span class="search-label">区域检索：</span>
            <input type="text" class="ctrl-input" v-model="searchParams.area" placeholder="输入预警区域">
          </div>

          <div class="table-scroll-wrap">
            <table class="sys-table">
              <thead>
              <tr>
                <th>预警时间</th>
                <th>预警等级</th>
                <th>预警区域</th>
                <th>处理人员</th>
                <th>处置状态</th>
                <th>是否闭环</th>
                <th>处理意见</th>
                <th width="120">操作</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="(item, index) in filteredTableData" :key="index" :class="{'active-row': selectedRecord === item}">
                <td>{{ item.time }}</td>
                <td>
                  <span
                      :class="['level-tag', item.levelClass]"
                      @click="selectRecord(item)"
                      title="点击查看对应时间轴进度"
                      style="cursor: pointer;">
                    {{ item.levelText }}
                  </span>
                </td>
                <td>{{ item.area }}</td>
                <td>{{ item.staff }}</td>
                <td><span :class="getStatusClass(item.status)">{{ item.status }}</span></td>
                <td>{{ item.isClosed }}</td>
                <td>{{ item.opinion }}</td>
                <td>
                  <div class="action-buttons">
                    <button v-if="item.isClosed === '是'" class="btn-download" @click="downloadArchive">下载</button>
                    <span v-else style="color:#999;font-size:12px;">处理中</span>
                    <button class="btn-expert" @click="openExpertModal(item)">是否录入专家库</button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredTableData.length === 0">
                <td colspan="8" style="text-align: center; padding: 30px; color: #999;">未检索到匹配的记录</td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-if="currentTab === 'rules'" class="tab-pane-flex">
        <div class="page-header-wrap">
          <h2 class="page-title">通知规则配置</h2>
        </div>
        <div class="sys-card flex-full-card">
          <div class="table-header"><h3>推荐的核心通知规则</h3></div>
          <div class="table-scroll-wrap" style="padding-bottom: 20px;">
            <table class="sys-table">
              <thead>
              <tr>
                <th width="150">预警等级</th>
                <th>通知范围 (可多选)</th>
                <th width="140">推送频率 (未读催办)</th>
                <th width="350">通知渠道</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="rule in ruleList" :key="rule.id">
                <td><span :class="['level-tag', rule.levelClass]">{{ rule.levelText }}</span></td>
                <td class="td-desc">
                  <div class="checkbox-grid">
                    <label v-for="contact in rule.availableContacts" :key="contact" class="cb-label">
                      <input type="checkbox" :value="contact" v-model="rule.selectedContacts">
                      {{ contact }}
                    </label>
                  </div>
                </td>
                <td>
                  <select class="ctrl-input full-w" v-model="rule.frequency">
                    <option v-for="freq in frequencies" :key="freq" :value="freq">{{ freq }}</option>
                  </select>
                </td>
                <td>
                  <select class="ctrl-input full-w" v-model="rule.channel">
                    <option v-for="ch in channels" :key="ch" :value="ch">{{ ch }}</option>
                  </select>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-if="currentTab === 'contacts'" class="tab-pane-flex">
        <div class="page-header-wrap">
          <h2 class="page-title">层级化联系人管理</h2>
        </div>
        <div class="contact-container">
          <div class="sys-card tree-sidebar">
            <div class="card-header"><h3>矿山组织架构树</h3></div>
            <div class="org-tree-mock">
              <div class="tree-node">▼ 内蒙古能源有限公司</div>
              <div class="tree-node" style="padding-left: 20px;">▼ 露天煤矿</div>
              <div class="tree-node"
                   :class="{ 'active-node': activeDept === '生产技术部' }"
                   @click="activeDept = '生产技术部'"
                   style="padding-left: 40px;">- 生产技术部</div>
              <div class="tree-node"
                   :class="{ 'active-node': activeDept === '安全监察部' }"
                   @click="activeDept = '安全监察部'"
                   style="padding-left: 40px;">- 安全监察部</div>
              <div class="tree-node"
                   :class="{ 'active-node': activeDept === '调度指挥中心' }"
                   @click="activeDept = '调度指挥中心'"
                   style="padding-left: 40px;">- 调度指挥中心</div>
            </div>
          </div>
          <div class="sys-card list-content">
            <div class="table-header">
              <h3>人员联系方式与角色配置 - {{ activeDept }}</h3>
              <div class="header-tools">
                <button class="add-btn" @click="handleCreateContact">+ 新增联系人</button>
              </div>
            </div>
            <div class="table-scroll-wrap">
              <table class="sys-table">
                <thead>
                <tr>
                  <th>姓名</th>
                  <th>系统账号</th>
                  <th>手机号码</th>
                  <th>所属部门</th>
                  <th>行政职务</th>
                  <th>对应预警等级</th>
                  <th width="120">操作</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(person, index) in filteredContacts" :key="index">
                  <td>{{ person.name }}</td>
                  <td>{{ person.account }}</td>
                  <td>{{ person.phone }}</td>
                  <td>{{ person.dept }}</td>
                  <td>{{ person.position }}</td>
                  <td><span :class="['level-tag', person.levelClass]">{{ person.level }}</span></td>
                  <td>
                    <button class="btn-text edit" @click="editContact(person)">编辑</button>
                    <button class="btn-text delete" @click="deleteContact(person)">删除</button>
                  </td>
                </tr>
                <tr v-if="filteredContacts.length === 0">
                  <td colspan="7" style="text-align: center; padding: 30px; color: #999;">当前部门暂无联系人数据</td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showExpertModal" class="modal-overlay">
        <div class="modal-content" style="width: 760px; max-height: 90vh; display: flex; flex-direction: column;">
          <div class="modal-header">
            <h3>录入成功治理案例 (标准化模板)</h3>
            <span class="close-btn" @click="showExpertModal = false">×</span>
          </div>
          <div class="modal-body" style="overflow-y: auto; padding-right: 10px;">

            <div class="section-title">| 基础与多维标签</div>
            <div class="form-grid">
              <div class="form-item full-width">
                <label>案例名称/编号 <span style="color:red">*</span></label>
                <input class="ctrl-input" type="text" v-model="expertFormData.caseName" placeholder="例如：2025-01 南帮局部滑坡治理">
              </div>
              <div class="form-item">
                <label>滑坡模式</label>
                <select class="ctrl-input" v-model="expertFormData.slideMode">
                  <option value="片帮">片帮</option>
                  <option value="圆弧滑动">圆弧滑动</option>
                  <option value="组合滑动">组合滑动</option>
                </select>
              </div>
              <div class="form-item">
                <label>滑坡力学成因机制</label>
                <input class="ctrl-input" type="text" v-model="expertFormData.mechanism" placeholder="如：推移式、牵引式">
              </div>
              <div class="form-item">
                <label>潜在滑体高度</label>
                <input class="ctrl-input" type="text" v-model="expertFormData.slideHeight" placeholder="输入滑体高度">
              </div>
              <div class="form-item">
                <label>走向长度</label>
                <input class="ctrl-input" type="text" v-model="expertFormData.strikeLength" placeholder="输入走向长度">
              </div>
              <div class="form-item">
                <label>边坡角</label>
                <input class="ctrl-input" type="text" v-model="expertFormData.slopeAngle" placeholder="输入边坡角度">
              </div>
              <div class="form-item">
                <label>特殊地质构造</label>
                <input class="ctrl-input" type="text" v-model="expertFormData.geologicalStructure" placeholder="如：断层、节理裂隙">
              </div>
              <div class="form-item">
                <label>主导诱因</label>
                <select class="ctrl-input" v-model="expertFormData.inducingFactor">
                  <option value="降雨入渗">降雨入渗</option>
                  <option value="爆破振动">爆破振动</option>
                  <option value="开挖扰动">开挖扰动</option>
                  <option value="地下水渗流">地下水渗流</option>
                </select>
              </div>
              <div class="form-item">
                <label>处置方法</label>
                <select class="ctrl-input" v-model="expertFormData.treatmentMethod">
                  <option value="削坡">削坡</option>
                  <option value="压脚">压脚</option>
                  <option value="局部支挡">局部支挡</option>
                  <option value="换填">换填</option>
                </select>
              </div>
            </div>

            <div class="section-title" style="margin-top: 20px;">| 预警与地质详情</div>
            <div class="form-grid">
              <div class="form-item full-width">
                <label>触发预警阈值与监测特征</label>
                <input class="ctrl-input" type="text" v-model="expertFormData.thresholdFeatures" placeholder="如：Z位移突变 > 150mm/d，深部位移呈三阶段蠕变">
              </div>
              <div class="form-item full-width">
                <label>详细地质条件说明</label>
                <textarea class="ctrl-input" style="height: 60px; resize: vertical;" v-model="expertFormData.geoDetails" placeholder="描述具体地层倾向、倾角及地下水情况..."></textarea>
              </div>
            </div>

            <div class="section-title" style="margin-top: 20px;">| 方案与效果评估</div>
            <div class="form-grid">
              <div class="form-item full-width">
                <label>采用的治理方案 (主方案与辅助方案) <span style="color:red">*</span></label>
                <textarea class="ctrl-input" style="height: 60px; resize: vertical;" v-model="expertFormData.treatmentPlan" placeholder="详细描述处治工法与设计参数..."></textarea>
              </div>
              <div class="form-item full-width">
                <label>施工技术要点</label>
                <textarea class="ctrl-input" style="height: 60px; resize: vertical;" v-model="expertFormData.constructionPoints" placeholder="简述施工技术要点"></textarea>
              </div>
              <div class="form-item full-width">
                <label>最终效果评估</label>
                <input class="ctrl-input" type="text" v-model="expertFormData.finalEvaluation" placeholder="如：实施后位移收敛，安全系数提升至1.25，边坡稳定。">
              </div>
            </div>

          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showExpertModal = false">取消</button>
            <button class="btn-confirm ctrl-btn" @click="submitExpertForm">保存并接入推理库</button>
          </div>
        </div>
      </div>

      <div v-if="showModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>新增预警处置单</h3>
            <span class="close-btn" @click="showModal = false">×</span>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-item">
                <label>预警时间</label>
                <input class="ctrl-input" type="datetime-local" v-model="formData.time">
              </div>
              <div class="form-item">
                <label>预警等级</label>
                <select class="ctrl-input" v-model="formData.level">
                  <option value="red">红色预警 (一级)</option>
                  <option value="orange">橙色预警 (二级)</option>
                  <option value="yellow">黄色预警 (三级)</option>
                  <option value="blue">蓝色预警 (四级)</option>
                </select>
              </div>
              <div class="form-item">
                <label>预警区域</label>
                <input class="ctrl-input" type="text" v-model="formData.area" placeholder="请输入区域名称">
              </div>
              <div class="form-item">
                <label>处理人员</label>
                <select class="ctrl-input" v-model="formData.staff">
                  <option value="" disabled>请选择会商参与人员</option>
                  <option v-for="staff in consultationStaffList" :key="staff" :value="staff">{{ staff }}</option>
                </select>
              </div>
              <div class="form-item">
                <label>处置状态</label>
                <input class="ctrl-input" type="text" v-model="formData.status" placeholder="例如：会商中、待处理">
              </div>
              <div class="form-item">
                <label>是否闭环</label>
                <select class="ctrl-input" v-model="formData.isClosed">
                  <option value="是">是</option>
                  <option value="否">否</option>
                </select>
              </div>
              <div class="form-item full-width">
                <label>处理意见</label>
                <input class="ctrl-input" type="text" v-model="formData.opinion" placeholder="请输入处理意见">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showModal = false">取消</button>
            <button class="btn-confirm ctrl-btn" @click="submitForm">确定添加</button>
          </div>
        </div>
      </div>

      <div v-if="showContactModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ editingContactIndex > -1 ? '编辑联系人配置' : '新增联系人配置' }}</h3>
            <span class="close-btn" @click="showContactModal = false">×</span>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-item">
                <label>姓名</label>
                <input class="ctrl-input" type="text" v-model="contactForm.name" placeholder="姓名">
              </div>
              <div class="form-item">
                <label>系统账号</label>
                <input class="ctrl-input" type="text" v-model="contactForm.account" placeholder="系统账号">
              </div>
              <div class="form-item">
                <label>手机号码</label>
                <input class="ctrl-input" type="text" v-model="contactForm.phone" placeholder="手机号码">
              </div>
              <div class="form-item">
                <label>所属部门</label>
                <input class="ctrl-input" type="text" v-model="contactForm.dept" placeholder="例如：调度指挥中心">
              </div>

              <div class="form-item full-width">
                <label>行政职务</label>
                <input class="ctrl-input" type="text" v-model="contactForm.position" placeholder="例如：矿长、主任、技术员">
              </div>
              <div class="form-item full-width">
                <label>对应预警等级</label>
                <select class="ctrl-input" v-model="contactForm.level">
                  <option value="一级">一级预警</option>
                  <option value="二级">二级预警</option>
                  <option value="三级">三级预警</option>
                  <option value="四级">四级预警</option>
                </select>
              </div>

            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showContactModal = false">取消</button>
            <button class="btn-confirm ctrl-btn" @click="submitContactForm">确定保存</button>
          </div>
        </div>
      </div>

      <div v-if="activeTimelineModal === 'push'" class="modal-overlay">
        <div class="modal-content" style="width: 600px;">
          <div class="modal-header">
            <h3>自动推送触达详情</h3>
            <span class="close-btn" @click="activeTimelineModal = null">×</span>
          </div>
          <div class="modal-body" style="padding: 0;">
            <table class="sys-table" style="margin: 0;">
              <thead>
              <tr><th>对应预警级别</th><th>通知人员</th><th>是否已读</th></tr>
              </thead>
              <tbody>
              <tr v-for="(log, i) in pushDetails" :key="i">
                <td><span :class="['level-tag', log.levelClass]">{{ log.levelText }}</span></td>
                <td>{{ log.staff }}</td>
                <td>
                    <span :style="{ color: log.isRead === '已读' ? '#52c41a' : '#f5222d', fontWeight: 'bold' }">
                      {{ log.isRead }}
                    </span>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="activeTimelineModal = null">关闭</button>
          </div>
        </div>
      </div>

      <div v-if="activeTimelineModal === 'consult'" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>多方会商记录</h3>
            <span class="close-btn" @click="activeTimelineModal = null">×</span>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-item full-width">
                <label>会商时间</label>
                <div class="info-text">2026-03-30 09:30:00</div>
              </div>
              <div class="form-item full-width">
                <label>处理人员</label>
                <div class="info-text">张经理 (总调度), 总工</div>
              </div>
              <div class="form-item full-width">
                <label>处理意见</label>
                <div class="info-text" style="background:#f4f7fa; padding:10px; border-radius:4px; line-height: 1.5;">
                  总工指示：立即启动一级应急预案，疏散北边坡下部作业人员，并调派技术人员前往现场勘查裂缝扩展情况。
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="activeTimelineModal = null">关闭</button>
          </div>
        </div>
      </div>

      <div v-if="activeTimelineModal === 'process'" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>隐患处理执行记录</h3>
            <span class="close-btn" @click="activeTimelineModal = null">×</span>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-item">
                <label>处置开始时间</label>
                <input type="datetime-local" class="ctrl-input" value="2026-03-30T09:40">
              </div>
              <div class="form-item">
                <label>处置结束时间</label>
                <input type="datetime-local" class="ctrl-input" value="2026-03-30T11:20">
              </div>
              <div class="form-item full-width">
                <label>处置人员</label>
                <input type="text" class="ctrl-input" value="李科长 (技术部) 及应急抢险分队">
              </div>
              <div class="form-item full-width">
                <label>处置结果</label>
                <textarea class="ctrl-input" style="height:60px; resize:none;">现场积水已排除，裂缝处已完成临时加固并部署位移雷达持续监测，状态暂时稳定。</textarea>
              </div>
              <div class="form-item full-width">
                <label>上传照片</label>
                <div class="upload-area">
                  <input type="file" accept="image/*" class="file-input">
                  <span class="upload-tip">点击或拖拽上传现场处置照片</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="activeTimelineModal = null">关闭</button>
            <button class="btn-confirm ctrl-btn" @click="activeTimelineModal = null">保存更新</button>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>

<script>
export default {
  data() {
    return {
      currentTab: 'work-order',
      showModal: false,
      showContactModal: false,
      showExpertModal: false,
      activeTimelineModal: null,

      selectedRecord: null,

      // 新增：跟踪左侧组织架构树中当前选中的部门
      activeDept: '调度指挥中心',

      consultationStaffList: [
        '张经理 (总调度)',
        '张经理 (总调度), 总工',
        '孙主任 (安监部)',
        '李科长 (技术部)',
        '王大力',
        '周工',
        '赵技术员'
      ],

      searchParams: {
        time: '',
        level: '',
        area: ''
      },

      ruleList: [
        {
          id: 'blue', levelClass: 'blue', levelText: '蓝色预警 (四级)',
          availableContacts: ['班组安全员', '调度室值班人员', '边坡业务主管部门', '安监部'],
          selectedContacts: ['班组安全员', '调度室值班人员', '边坡业务主管部门', '安监部'],
          frequency: '一天一次',
          channel: '系统内消息 + 企业微信推送'
        },
        {
          id: 'yellow', levelClass: 'yellow', levelText: '黄色预警 (三级)',
          availableContacts: ['班组安全员', '调度室值班人员', '边坡业务主管部门', '安监部', '部门主任', '煤矿总工程师', '总经理(矿长)'],
          selectedContacts: ['班组安全员', '调度室值班人员', '边坡业务主管部门', '安监部', '部门主任', '煤矿总工程师', '总经理(矿长)'],
          frequency: '4小时一次',
          channel: '系统消息 + 企业微信 + 短信 (矿区决策层)'
        },
        {
          id: 'orange', levelClass: 'orange', levelText: '橙色预警 (二级)',
          availableContacts: ['安监部', '部门主任', '煤矿总工程师', '总经理(矿长)', '煤矿领导层', '上级监管部门', '政府监管部门'],
          selectedContacts: ['安监部', '部门主任', '煤矿总工程师', '总经理(矿长)', '煤矿领导层', '上级监管部门', '政府监管部门'],
          frequency: '2小时一次',
          channel: '企业微信 + 短信 + 自动语音电话 (关键负责人)'
        },
        {
          id: 'red', levelClass: 'red', levelText: '红色预警 (一级)',
          availableContacts: ['总经理(矿长)', '煤矿领导层', '上级监管部门', '政府监管部门', '内蒙古公司董事长', '总调度室', '集团应急指挥层'],
          selectedContacts: ['总经理(矿长)', '煤矿领导层', '上级监管部门', '政府监管部门', '内蒙古公司董事长', '总调度室', '集团应急指挥层'],
          frequency: '1小时一次',
          channel: '企业微信 + 短信 + 语音电话 (全面启动) + 上级系统自动上报'
        }
      ],
      frequencies: ['1小时一次', '2小时一次', '4小时一次', '一天一次', '一周一次'],
      channels: [
        '系统内消息 + 企业微信推送',
        '系统消息 + 企业微信 + 短信 (矿区决策层)',
        '企业微信 + 短信 + 自动语音电话 (关键负责人)',
        '企业微信 + 短信 + 语音电话 (全面启动) + 上级系统自动上报'
      ],

      expertFormData: {
        caseName: '', slideMode: '片帮', slideHeight: '', strikeLength: '', slopeAngle: '',
        geologicalStructure: '', mechanism: '', inducingFactor: '降雨入渗', treatmentMethod: '削坡',
        thresholdFeatures: '', geoDetails: '', treatmentPlan: '', constructionPoints: '', finalEvaluation: ''
      },

      pushDetails: [
        { levelText: '红色预警 (一级)', levelClass: 'red', staff: '内蒙古公司董事长, 总调度室', isRead: '已读' },
        { levelText: '橙色预警 (二级)', levelClass: 'orange', staff: '煤矿领导层, 政府监管部门', isRead: '未读' },
        { levelText: '黄色预警 (三级)', levelClass: 'yellow', staff: '煤矿总工程师, 总经理', isRead: '已读' },
        { levelText: '蓝色预警 (四级)', levelClass: 'blue', staff: '相关班组安全员', isRead: '已读' }
      ],

      tableData: [
        { time: '2026-03-30 09:15', levelText: '红色预警 (一级)', levelClass: 'red', area: '北边坡 GNSS-03', staff: '张经理 (总调度)', status: '会商中', isClosed: '否', opinion: '需总工进一步批示' },
        { time: '2026-03-30 08:30', levelText: '黄色预警 (三级)', levelClass: 'yellow', area: '东部采区区段', staff: '孙主任 (安监部)', status: '待处理', isClosed: '否', opinion: '暂无' },
        { time: '2026-03-30 08:00', levelText: '橙色预警 (二级)', levelClass: 'orange', area: '排水口 Water-01', staff: '李科长 (技术部)', status: '处理中', isClosed: '否', opinion: '现场排水设备调试中' },
        { time: '2026-03-29 14:20', levelText: '蓝色预警 (四级)', levelClass: 'blue', area: '西区选煤厂', staff: '王大力', status: '已完成', isClosed: '是', opinion: '设备已恢复正常' }
      ],

      contactData: [
        { name: '张经理', account: 'admin_01', phone: '138****0001', dept: '调度指挥中心', position: '主任', level: '一级', levelClass: 'red' },
        { name: '王工', account: 'tech_02', phone: '139****0002', dept: '生产技术部', position: '技术员', level: '四级', levelClass: 'blue' },
        // 新增：补充演示数据
        { name: '孙主任', account: 'safe_01', phone: '137****0003', dept: '安全监察部', position: '监察室主任', level: '三级', levelClass: 'yellow' }
      ],

      editingContactIndex: -1,

      formData: {
        time: '', level: 'red', area: '', staff: '', status: '', isClosed: '否', opinion: ''
      },

      contactForm: {
        name: '', account: '', phone: '', dept: '', position: '', level: '四级'
      }
    };
  },
  computed: {
    filteredTableData() {
      return this.tableData.filter(item => {
        const matchTime = !this.searchParams.time || item.time.includes(this.searchParams.time);
        const matchLevel = !this.searchParams.level || item.levelClass === this.searchParams.level;
        const matchArea = !this.searchParams.area || item.area.includes(this.searchParams.area);
        return matchTime && matchLevel && matchArea;
      });
    },
    // 新增：根据当前选中的左侧树节点部门，过滤右侧表格要展示的人员数据
    filteredContacts() {
      if (!this.activeDept) return this.contactData;
      return this.contactData.filter(item => item.dept === this.activeDept);
    }
  },
  mounted() {
    if (this.tableData.length > 0) {
      this.selectedRecord = this.tableData[0];
    }
  },
  methods: {
    selectRecord(item) {
      this.selectedRecord = item;
    },

    getTimelineStatus(stepName) {
      if (!this.selectedRecord) return '';

      const status = this.selectedRecord.status;
      const isClosed = this.selectedRecord.isClosed === '是';

      let currentIdx = 0;
      if (status === '会商中') currentIdx = 1;
      else if (status === '待处理' || status === '处理中') currentIdx = 2;
      else if (status === '已完成') currentIdx = 3;

      if (isClosed) currentIdx = 4;

      const stepIdx = { 'push': 0, 'consult': 1, 'process': 2, 'archive': 3 }[stepName];

      if (stepIdx < currentIdx) return 'completed';
      if (stepIdx === currentIdx && !isClosed) return 'active';
      if (stepIdx === 3 && isClosed) return 'completed';

      return '';
    },

    handleCreateOrder() {
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      this.formData.time = new Date(now - offset).toISOString().slice(0, 16);
      this.showModal = true;
    },

    handleCreateContact() {
      // 修改：点击新增联系人时，部门默认填入当前选中的组织树部门
      this.contactForm = { name: '', account: '', phone: '', dept: this.activeDept, position: '', level: '四级' };
      this.editingContactIndex = -1;
      this.showContactModal = true;
    },

    editContact(person) {
      // 修改：由于 filteredContacts 和原本的 contactData 索引不同，通过传入整个对象查找其在全局数据中的真实索引
      const globalIndex = this.contactData.indexOf(person);
      this.contactForm = { ...person };
      this.editingContactIndex = globalIndex;
      this.showContactModal = true;
    },

    deleteContact(person) {
      if (confirm('确定要删除该联系人记录吗？')) {
        const globalIndex = this.contactData.indexOf(person);
        if (globalIndex > -1) {
          this.contactData.splice(globalIndex, 1);
        }
      }
    },

    openExpertModal(item) {
      this.expertFormData = {
        caseName: '', slideMode: '片帮', slideHeight: '', strikeLength: '', slopeAngle: '',
        geologicalStructure: '', mechanism: '', inducingFactor: '降雨入渗', treatmentMethod: '削坡',
        thresholdFeatures: '', geoDetails: '', treatmentPlan: '', constructionPoints: '', finalEvaluation: ''
      };
      this.showExpertModal = true;
    },
    submitExpertForm() {
      alert("案例已成功保存并接入推理库！");
      this.showExpertModal = false;
    },
    submitForm() {
      const levelMap = { 'red': '红色预警 (一级)', 'orange': '橙色预警 (二级)', 'yellow': '黄色预警 (三级)', 'blue': '蓝色预警 (四级)' };
      const newEntry = {
        time: this.formData.time.replace('T', ' '),
        levelText: levelMap[this.formData.level],
        levelClass: this.formData.level,
        area: this.formData.area || '未指定区域',
        staff: this.formData.staff || '待分配',
        status: this.formData.status || '待处理',
        isClosed: this.formData.isClosed,
        opinion: this.formData.opinion || '-'
      };
      this.tableData.unshift(newEntry);
      this.showModal = false;
      this.formData.area = ''; this.formData.staff = ''; this.formData.status = ''; this.formData.opinion = '';
    },

    submitContactForm() {
      const classMap = { '一级': 'red', '二级': 'orange', '三级': 'yellow', '四级': 'blue' };
      const formattedContact = {
        name: this.contactForm.name || '未命名',
        account: this.contactForm.account || 'N/A',
        phone: this.contactForm.phone || 'N/A',
        dept: this.contactForm.dept || '未定部门',
        position: this.contactForm.position || '暂无职务',
        level: this.contactForm.level,
        levelClass: classMap[this.contactForm.level]
      };

      if (this.editingContactIndex > -1) {
        this.contactData.splice(this.editingContactIndex, 1, formattedContact);
      } else {
        this.contactData.push(formattedContact);
      }
      this.showContactModal = false;
    },

    getStatusClass(status) {
      if (status === '已完成') return 'status-done';
      if (status === '待处理') return 'status-pending';
      return 'status-process';
    },
    downloadArchive() {
      alert("处置单归档文件下载已开始...");
    }
  }
};
</script>

<style scoped>
/* =========== 核心：单页满屏限制与全局排版 =========== */
.view-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: calc(100vh - 60px);
  width: 100%;
  box-sizing: border-box;
  background: #f4f7fa;
  overflow: hidden;
  padding: 15px;
  gap: 15px;
  font-family: "Microsoft YaHei", sans-serif;
}

.sidebar {
  width: 100%;
  background: #f8fbfd;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 10px 15px;
  flex-shrink: 0;
}
.sidebar-header {
  font-size: 15px;
  font-weight: bold;
  color: #1c3d90;
  border-left: 4px solid #1c3d90;
  padding-left: 8px;
  margin-right: 30px;
  line-height: 1;
}
.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: row;
  gap: 15px;
}
.nav-list li {
  padding: 8px 15px;
  background: transparent;
  color: #606266;
  cursor: pointer;
  font-size: 13px;
  border-radius: 4px;
  text-align: center;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-list li:hover { background: #eef5fe; color: #1c3d90; }
.nav-list li.active { background: #1c3d90; color: #fff; font-weight: bold; box-shadow: 0 4px 8px rgba(28, 61, 144, 0.3); }

.main-content {
  flex: 1;
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.tab-pane-flex {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 15px;
  overflow: hidden;
}

.page-header-wrap { flex-shrink: 0; }
.page-title, .card-header h3, .table-header h3 {
  margin: 0;
  font-size: 16px;
  color: #1c3d90;
  border-left: 4px solid #1c3d90;
  padding-left: 8px;
  font-weight: bold;
  line-height: 1;
  display: flex;
  align-items: center;
}

.sys-card {
  background: #fff;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.02);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.flex-full-card { flex: 1; min-height: 0; }
.timeline-card { flex-shrink: 0; }
.table-card { flex: 1; min-height: 0; }

.card-header, .table-header {
  padding: 12px 15px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  flex-shrink: 0;
}

/* ============ 检索区域样式 ============ */
.search-section {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
  background: #fcfcfc;
  border-bottom: 1px solid #ebeef5;
}
.search-label {
  font-size: 13px;
  color: #606266;
  font-weight: bold;
}

.table-scroll-wrap { flex: 1; overflow-y: auto; }
.table-scroll-wrap::-webkit-scrollbar, .org-tree-mock::-webkit-scrollbar { width: 6px; height: 6px; }
.table-scroll-wrap::-webkit-scrollbar-thumb, .org-tree-mock::-webkit-scrollbar-thumb { background: #dcdfe6; border-radius: 3px; }
.table-scroll-wrap::-webkit-scrollbar-track, .org-tree-mock::-webkit-scrollbar-track { background: transparent; }

.sys-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.sys-table th, .sys-table td { padding: 12px 15px; border-bottom: 1px solid #ebeef5; color: #333; }
.sys-table thead { background: #f8fbff; position: sticky; top: 0; z-index: 2; }
.sys-table th { color: #1c3d90; font-weight: bold; }
.sys-table tbody tr { transition: background 0.2s; }
.sys-table tbody tr:hover { background: #f0f7ff; }

/* 选中高亮整行 */
.sys-table tbody tr.active-row { background: #f0f5ff; }

.td-desc { line-height: 1.6; color: #555; }

.checkbox-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px 12px; }
.cb-label { font-size: 12px; color: #555; display: flex; align-items: center; gap: 5px; cursor: pointer; margin: 0; }
.cb-label input[type="checkbox"] { cursor: pointer; margin: 0; }
.full-w { width: 100%; }

.level-tag { padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; display: inline-flex; align-items: center; gap: 6px; transition: transform 0.2s, opacity 0.2s; }
.level-tag:hover { transform: scale(1.05); opacity: 0.9; }
.level-tag::before { content: ''; display: block; width: 6px; height: 6px; border-radius: 50%; }
.level-tag.red { background: #fff1f0; color: #f5222d; border: 1px solid #ffccc7; }
.level-tag.red::before { background: #f5222d; }
.level-tag.orange { background: #fff7e6; color: #fa8c16; border: 1px solid #ffe7ba; }
.level-tag.orange::before { background: #fa8c16; }
.level-tag.yellow { background: #feffe6; color: #faad14; border: 1px solid #fffb8f; }
.level-tag.yellow::before { background: #faad14; }
.level-tag.blue { background: #e6f7ff; color: #1890ff; border: 1px solid #91d5ff; }
.level-tag.blue::before { background: #1890ff; }

.status-process { color: #fa8c16; font-weight: bold; }
.status-pending { color: #909399; }
.status-done { color: #52c41a; font-weight: bold; }

/* 按钮样式 */
.add-btn, .btn-confirm.ctrl-btn { background: #1c3d90; color: #fff; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; transition: all 0.3s ease; }
.add-btn:hover, .btn-confirm.ctrl-btn:hover { background: #2a4da8; box-shadow: 0 4px 8px rgba(28, 61, 144, 0.3); }
.btn-cancel { background: #f5f5f5; border: 1px solid #dcdfe6; padding: 5px 15px; border-radius: 4px; cursor: pointer; margin-right: 10px; color: #606266; font-size: 12px; transition: all 0.3s; }
.btn-cancel:hover { background: #e8e8e8; color: #333; }
.btn-download { background: #fff; border: 1px solid #1c3d90; color: #1c3d90; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.3s; }
.btn-download:hover { background: #1c3d90; color: #fff; box-shadow: 0 2px 6px rgba(28, 61, 144, 0.2); }

.action-buttons { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.btn-expert { background: #fff; border: 1px solid #fa8c16; color: #fa8c16; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.3s; }
.btn-expert:hover { background: #fa8c16; color: #fff; box-shadow: 0 2px 6px rgba(250, 140, 22, 0.2); }

/* 文字按钮样式(编辑/删除) */
.btn-text { background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 12px; transition: color 0.3s; outline: none; }
.btn-text.edit { color: #1890ff; }
.btn-text.edit:hover { color: #40a9ff; text-decoration: underline; }
.btn-text.delete { color: #f5222d; }
.btn-text.delete:hover { color: #ff4d4f; text-decoration: underline; }

@keyframes breathe {
  0% { box-shadow: 0 0 0 0 rgba(28, 61, 144, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(28, 61, 144, 0); }
  100% { box-shadow: 0 0 0 0 rgba(28, 61, 144, 0); }
}

.timeline-wrapper { display: flex; align-items: center; justify-content: center; padding: 25px 20px 20px; }
.timeline-step { display: flex; flex-direction: column; align-items: center; position: relative; }
.timeline-step.clickable { cursor: pointer; }
.timeline-step.clickable:hover .step-node { transform: scale(1.15); }
.step-node { width: 14px; height: 14px; border-radius: 50%; background: #dcdfe6; border: 3px solid #fff; box-shadow: 0 0 0 2px #dcdfe6; z-index: 2; transition: all 0.3s; }
.step-label { margin-top: 8px; font-size: 12px; color: #606266; font-weight: bold; }
.timeline-line { flex: 1; height: 2px; background: #ebeef5; max-width: 120px; margin: 0 -5px 20px; transition: background 0.3s; }
.completed .step-node, .completed + .timeline-line { background: #52c41a; box-shadow: 0 0 0 2px #52c41a; }
.active .step-node { background: #1c3d90; box-shadow: 0 0 0 2px #1c3d90; animation: breathe 2s infinite ease-in-out; }
.active .step-label { color: #1c3d90; }

.contact-container { display: flex; gap: 15px; flex: 1; min-height: 0; }
.tree-sidebar { width: 240px; background: #fcfcfc; flex-shrink: 0; }
.list-content { flex: 1; }
.org-tree-mock { padding: 15px; line-height: 2.2; font-size: 13px; color: #606266; overflow-y: auto; flex: 1; }
.tree-node { cursor: pointer; border-radius: 4px; padding: 2px 6px; transition: all 0.2s; }
.tree-node:hover { background: #f0f7ff; color: #1c3d90; }
.active-node { color: #1c3d90; font-weight: bold; background: #eef5fe; }
.role-tag { background: #eef5fe; color: #1c3d90; padding: 4px 8px; border-radius: 4px; font-size: 12px; border: 1px solid #c3e4fd; }
.role-tag.secondary { background: #f4f4f5; color: #909399; border: 1px solid #e9e9eb; }

/* 弹窗组件 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: #fff; width: 520px; border-radius: 6px; box-shadow: 0 5px 20px rgba(0,0,0,0.2); animation: slideDown 0.3s ease-out; }
@keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.modal-header { padding: 15px 20px; border-bottom: 1px solid #ebeef5; display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; font-size: 15px; color: #1c3d90; font-weight: bold; border-left: 4px solid #1c3d90; padding-left: 8px; }
.close-btn { cursor: pointer; font-size: 20px; color: #909399; transition: color 0.3s; }
.close-btn:hover { color: #f5222d; }
.modal-body { padding: 20px; }
.section-title { font-size: 14px; font-weight: bold; color: #1c3d90; margin-bottom: 12px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.form-item { display: flex; flex-direction: column; }
.form-item.full-width { grid-column: span 2; }
.form-item label { font-size: 12px; color: #606266; margin-bottom: 6px; font-weight: bold; }
.info-text { font-size: 13px; color: #333; }
.ctrl-input { padding: 6px 10px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 12px; outline: none; background: #fff; color: #333; transition: all 0.3s; }
.ctrl-input:focus { border-color: #1c3d90; box-shadow: 0 0 0 2px rgba(28, 61, 144, 0.1); }
.modal-footer { padding: 12px 20px; border-top: 1px solid #ebeef5; text-align: right; background: #fafafa; border-radius: 0 0 6px 6px; }
.upload-area { border: 1px dashed #dcdfe6; padding: 20px; text-align: center; border-radius: 4px; background: #fcfcfc; cursor: pointer; transition: background 0.3s; }
.upload-area:hover { background: #f0f7ff; border-color: #1c3d90; }
.upload-tip { font-size: 12px; color: #909399; }
</style>
```