import { ref, reactive, computed } from 'vue';



export default {
    name: 'WorkOrder',
    components: {},
    setup() {
        // =========================
        // 通用页签状态
        // =========================
        const currentTab = ref('work-order');
        const showModal = ref(false);
        const showContactModal = ref(false);
        const showExpertModal = ref(false);
        const activeTimelineModal = ref(null);
        const selectedRecord = ref(null);

        // =========================
        // 层级联系人 - 组织树
        // =========================
        const orgTree = ref([
            {
                id: 'gov',
                label: '政府部门',
                children: [
                    { id: 'chairman', label: '董事长', children: [] }
                ]
            },
            {
                id: 'group',
                label: '集团部门',
                children: [
                    { id: 'chief-engineer', label: '总工程师', children: [] }
                ]
            },
            {
                id: 'company',
                label: '公司部门',
                children: []
            },
            {
                id: 'enterprise',
                label: '企业部门',
                children: [
                    { id: 'mine-chief', label: '矿长', children: [] },
                    { id: 'geo-chief', label: '地测部主任', children: [] },
                    { id: 'prod-chief', label: '生技部主任', children: [] },
                    { id: 'dispatch-chief', label: '调度室主任', children: [] },
                    { id: 'safety-chief', label: '安监主任', children: [] },
                    { id: 'slope-tech', label: '边坡技术员', children: [] }
                ]
            }
        ]);

        const expandedNodeIds = ref([]);
        const selectedNodeId = ref('chairman');

        // =========================
        // 层级联系人 - 联系人数据
        // =========================
        const contactData = ref([
            { id: 'c1', name: '张董', account: 'chairman_01', phone: '13800000001', deptId: 'chairman', position: '董事长' },
            { id: 'c2', name: '陈总工', account: 'chief_01', phone: '13800000002', deptId: 'chief-engineer', position: '总工程师' },
            { id: 'c3', name: '王矿长', account: 'mine_01', phone: '13800000003', deptId: 'mine-chief', position: '矿长' },
            { id: 'c4', name: '李主任', account: 'geo_01', phone: '13800000004', deptId: 'geo-chief', position: '地测部主任' },
            { id: 'c5', name: '赵主任', account: 'prod_01', phone: '13800000005', deptId: 'prod-chief', position: '生技部主任' },
            { id: 'c6', name: '周主任', account: 'dispatch_01', phone: '13800000006', deptId: 'dispatch-chief', position: '调度室主任' },
            { id: 'c7', name: '孙主任', account: 'safety_01', phone: '13800000007', deptId: 'safety-chief', position: '安监主任' },
            { id: 'c8', name: '边坡技术员甲', account: 'slope_01', phone: '13800000008', deptId: 'slope-tech', position: '边坡技术员' }
        ]);

        const editingContactIndex = ref(-1);

        const contactForm = reactive({
            id: '',
            name: '',
            account: '',
            phone: '',
            deptId: '',
            position: ''
        });

        // =========================
        // 预警闭环管理 - 原有数据
        // =========================
        const consultationStaffList = ref([
            '张经理 (总调度)',
            '张经理 (总调度), 总工',
            '孙主任 (安监部)',
            '李科长 (技术部)',
            '王大力',
            '周工',
            '赵技术员'
        ]);

        const searchParams = reactive({
            time: '',
            level: '',
            area: ''
        });
        const orderStatusOptions = ref([
            '待主管确认',
            '待会商',
            '待处理',
            '待归档',
            '已完成',
            '误报归档'
        ]);
        const buildStatusDrivenRecordData = (status, baseTime) => {
            const timeValue = baseTime || '';

            const result = {
                currentStep: 'supervisor',
                isClosed: '否',
                supervisorDecision: 'pending',

                timeline: {
                    capture: { done: true, time: timeValue },
                    supervisor: { done: false, time: '' },
                    push: { done: false, time: '' },
                    consult: { done: false, time: '' },
                    process: { done: false, time: '' },
                    archive: { done: false, time: '' }
                },

                pushInfo: {
                    ruleLevel: '',
                    frequency: '',
                    channel: '',
                    selectedRoleIds: [],
                    selectedPersonIds: [],
                    receivers: [],
                    logs: [],
                    executed: false,
                    executeTime: '',
                    executeUser: ''
                },

                consultInfo: {
                    host: '',
                    participants: [],
                    conclusion: '',
                    decision: '进入隐患处理',
                    executed: false,
                    consultTime: '',
                    logs: []
                },

                processInfo: {
                    startTime: '',
                    endTime: '',
                    handler: '',
                    result: '',
                    attachmentName: '',
                    executed: false,
                    logs: []
                },

                archiveInfo: {
                    reviewer: '',
                    reviewResult: '',
                    archiveSummary: '',
                    needExpert: false,
                    executed: false,
                    archiveTime: '',
                    logs: []
                }
            };

            switch (status) {
                case '待主管确认':
                    result.currentStep = 'supervisor';
                    result.isClosed = '否';
                    result.supervisorDecision = 'pending';
                    break;

                case '待会商':
                    result.currentStep = 'consult';
                    result.isClosed = '否';
                    result.supervisorDecision = 'valid';
                    result.timeline.supervisor = { done: true, time: timeValue };
                    result.timeline.push = { done: true, time: timeValue };

                    result.pushInfo.executed = true;
                    result.pushInfo.executeTime = timeValue;
                    result.pushInfo.executeUser = '系统自动推送';
                    break;

                case '待处理':
                    result.currentStep = 'process';
                    result.isClosed = '否';
                    result.supervisorDecision = 'valid';
                    result.timeline.supervisor = { done: true, time: timeValue };
                    result.timeline.push = { done: true, time: timeValue };
                    result.timeline.consult = { done: true, time: timeValue };

                    result.pushInfo.executed = true;
                    result.pushInfo.executeTime = timeValue;
                    result.pushInfo.executeUser = '系统自动推送';

                    result.consultInfo.executed = true;
                    result.consultInfo.consultTime = timeValue;
                    break;

                case '待归档':
                    result.currentStep = 'archive';
                    result.isClosed = '否';
                    result.supervisorDecision = 'valid';
                    result.timeline.supervisor = { done: true, time: timeValue };
                    result.timeline.push = { done: true, time: timeValue };
                    result.timeline.consult = { done: true, time: timeValue };
                    result.timeline.process = { done: true, time: timeValue };

                    result.pushInfo.executed = true;
                    result.pushInfo.executeTime = timeValue;
                    result.pushInfo.executeUser = '系统自动推送';

                    result.consultInfo.executed = true;
                    result.consultInfo.consultTime = timeValue;

                    result.processInfo.executed = true;
                    result.processInfo.startTime = timeValue ? timeValue.replace(' ', 'T') : '';
                    result.processInfo.endTime = timeValue ? timeValue.replace(' ', 'T') : '';
                    break;

                case '已完成':
                    result.currentStep = 'archive';
                    result.isClosed = '是';
                    result.supervisorDecision = 'valid';
                    result.timeline.supervisor = { done: true, time: timeValue };
                    result.timeline.push = { done: true, time: timeValue };
                    result.timeline.consult = { done: true, time: timeValue };
                    result.timeline.process = { done: true, time: timeValue };
                    result.timeline.archive = { done: true, time: timeValue };

                    result.pushInfo.executed = true;
                    result.pushInfo.executeTime = timeValue;
                    result.pushInfo.executeUser = '系统自动推送';

                    result.consultInfo.executed = true;
                    result.consultInfo.consultTime = timeValue;

                    result.processInfo.executed = true;
                    result.processInfo.startTime = timeValue ? timeValue.replace(' ', 'T') : '';
                    result.processInfo.endTime = timeValue ? timeValue.replace(' ', 'T') : '';

                    result.archiveInfo.executed = true;
                    result.archiveInfo.archiveTime = timeValue;
                    break;

                case '误报归档':
                    result.currentStep = 'archive';
                    result.isClosed = '是';
                    result.supervisorDecision = 'false_alarm';
                    result.timeline.supervisor = { done: true, time: timeValue };
                    result.timeline.archive = { done: true, time: timeValue };

                    result.archiveInfo.executed = true;
                    result.archiveInfo.archiveTime = timeValue;
                    result.archiveInfo.reviewResult = '主管确认误报，流程终止归档';
                    break;

                default:
                    result.currentStep = 'supervisor';
                    result.isClosed = '否';
                    result.supervisorDecision = 'pending';
                    break;
            }

            return result;
        };

        const ruleList = ref([
            {
                id: 'blue',
                levelClass: 'blue',
                levelText: '蓝色预警 (四级)',
                selectedRoleIds: [],
                selectedPersonIds: [],
                frequency: '一天一次',
                channel: '系统内消息 + 企业微信推送'
            },
            {
                id: 'yellow',
                levelClass: 'yellow',
                levelText: '黄色预警 (三级)',
                selectedRoleIds: [],
                selectedPersonIds: [],
                frequency: '4小时一次',
                channel: '系统消息 + 企业微信 + 短信 (矿区决策层)'
            },
            {
                id: 'orange',
                levelClass: 'orange',
                levelText: '橙色预警 (二级)',
                selectedRoleIds: [],
                selectedPersonIds: [],
                frequency: '2小时一次',
                channel: '企业微信 + 短信 + 自动语音电话 (关键负责人)'
            },
            {
                id: 'red',
                levelClass: 'red',
                levelText: '红色预警 (一级)',
                selectedRoleIds: [],
                selectedPersonIds: [],
                frequency: '1小时一次',
                channel: '企业微信 + 短信 + 语音电话 (全面启动) + 上级系统自动上报'
            }
        ]);

        const frequencies = ref(['1小时一次', '2小时一次', '4小时一次', '一天一次', '一周一次']);
        const channels = ref([
            '系统内消息 + 企业微信推送',
            '系统消息 + 企业微信 + 短信 (矿区决策层)',
            '企业微信 + 短信 + 自动语音电话 (关键负责人)',
            '企业微信 + 短信 + 语音电话 (全面启动) + 上级系统自动上报'
        ]);

        const expertFormData = reactive({
            caseName: '',
            slideMode: '片帮',
            slideHeight: '',
            strikeLength: '',
            slopeAngle: '',
            geologicalStructure: '',
            mechanism: '',
            inducingFactor: '降雨入渗',
            treatmentMethod: '削坡',
            thresholdFeatures: '',
            geoDetails: '',
            treatmentPlan: '',
            constructionPoints: '',
            finalEvaluation: ''
        });



        const tableData = ref([
            {
                id: 'wo-001',
                time: '2026-03-30 09:15',
                levelText: '红色预警 (一级)',
                levelClass: 'red',
                area: '北边坡 GNSS-03',
                staff: '张经理 (总调度)',
                status: '会商中',
                isClosed: '否',
                opinion: '需总工进一步批示',

                currentStep: 'consult',
                supervisorDecision: 'valid',
                supervisorName: '王主任',
                supervisorTime: '2026-03-30 09:18',
                supervisorOpinion: '确认为有效预警，进入自动推送',

                pushInfo: {
                    ruleLevel: 'red',
                    frequency: '1小时一次',
                    channel: '企业微信 + 短信 + 语音电话 (全面启动) + 上级系统自动上报',
                    selectedRoleIds: [],
                    selectedPersonIds: [],
                    receivers: [],
                    logs: [
                        {
                            type: 'push',
                            operator: '系统自动推送',
                            time: '2026-03-30 09:20',
                            remark: '已完成自动推送'
                        }
                    ],
                    executed: true,
                    executeTime: '2026-03-30 09:20',
                    executeUser: '系统自动推送'
                },
                consultInfo: {
                    host: '张经理 (总调度)',
                    participants: [
                        { id: 'manual-1', name: '张经理 (总调度)', deptName: '总调度', sourceType: 'manual' },
                        { id: 'manual-2', name: '总工', deptName: '技术总工', sourceType: 'manual' }
                    ],
                    conclusion: '立即启动一级应急预案，疏散北边坡下部作业人员，并调派技术人员前往现场勘查裂缝扩展情况。',
                    decision: '进入隐患处理',
                    executed: true,
                    consultTime: '2026-03-30 09:30',
                    logs: [
                        {
                            type: 'consult',
                            operator: '张经理 (总调度)',
                            time: '2026-03-30 09:30',
                            remark: '已完成多方会商，进入隐患处理'
                        }
                    ]
                },
                processInfo: {
                    startTime: '',
                    endTime: '',
                    handler: '',
                    result: '',
                    attachmentName: '',
                    executed: false,
                    logs: []
                },
                archiveInfo: {
                    reviewer: '',
                    reviewResult: '',
                    archiveSummary: '',
                    needExpert: false,
                    executed: false,
                    archiveTime: '',
                    logs: []
                },

                timeline: {
                    capture: { done: true, time: '2026-03-30 09:15' },
                    supervisor: { done: true, time: '2026-03-30 09:18' },
                    push: { done: true, time: '2026-03-30 09:20' },
                    consult: { done: false, time: '' },
                    process: { done: false, time: '' },
                    archive: { done: false, time: '' }
                }
            },
            {
                id: 'wo-002',
                time: '2026-03-30 08:30',
                levelText: '黄色预警 (三级)',
                levelClass: 'yellow',
                area: '东部采区区段',
                staff: '孙主任 (安监部)',
                status: '待主管确认',
                isClosed: '否',
                opinion: '等待主管判定是否误报',

                currentStep: 'supervisor',
                supervisorDecision: 'pending',
                supervisorName: '',
                supervisorTime: '',
                supervisorOpinion: '',

                pushInfo: {
                    ruleLevel: 'yellow',
                    frequency: '',
                    channel: '',
                    selectedRoleIds: [],
                    selectedPersonIds: [],
                    receivers: [],
                    logs: [],
                    executed: false,
                    executeTime: '',
                    executeUser: ''
                },
                consultInfo: {
                    host: '',
                    participants: [],
                    conclusion: '',
                    decision: '进入隐患处理',
                    executed: false,
                    consultTime: '',
                    logs: []
                },
                archiveInfo: {
                    reviewer: '',
                    reviewResult: '',
                    archiveSummary: '',
                    needExpert: false,
                    executed: false,
                    archiveTime: '',
                    logs: []
                },

                timeline: {
                    capture: { done: true, time: '2026-03-30 08:30' },
                    supervisor: { done: false, time: '' },
                    push: { done: false, time: '' },
                    consult: { done: false, time: '' },
                    process: { done: false, time: '' },
                    archive: { done: false, time: '' }
                }
            },
            {
                id: 'wo-003',
                time: '2026-03-30 08:00',
                levelText: '橙色预警 (二级)',
                levelClass: 'orange',
                area: '排水口 Water-01',
                staff: '李科长 (技术部)',
                status: '隐患处理中',
                isClosed: '否',
                opinion: '现场排水设备调试中',

                currentStep: 'process',
                supervisorDecision: 'valid',
                supervisorName: '赵主管',
                supervisorTime: '2026-03-30 08:05',
                supervisorOpinion: '确认有效，立即上报',

                pushInfo: {
                    ruleLevel: 'orange',
                    frequency: '2小时一次',
                    channel: '企业微信 + 短信 + 自动语音电话 (关键负责人)',
                    selectedRoleIds: [],
                    selectedPersonIds: [],
                    receivers: [],
                    logs: [],
                    executed: true,
                    executeTime: '2026-03-30 08:08',
                    executeUser: '系统自动推送'
                },
                archiveInfo: {
                    reviewer: '',
                    reviewResult: '',
                    archiveSummary: '',
                    needExpert: false,
                    executed: false,
                    archiveTime: '',
                    logs: []
                },
                consultInfo: {
                    host: '李科长 (技术部)',
                    participants: [
                        { id: 'manual-3', name: '李科长 (技术部)', deptName: '技术部', sourceType: 'manual' },
                        { id: 'manual-4', name: '孙主任 (安监部)', deptName: '安监部', sourceType: 'manual' }
                    ],
                    conclusion: '现场排水设备调试结束后，立即安排隐患点加固与监测复核。',
                    decision: '进入隐患处理',
                    executed: true,
                    consultTime: '2026-03-30 08:20',
                    logs: [
                        {
                            type: 'consult',
                            operator: '李科长 (技术部)',
                            time: '2026-03-30 08:20',
                            remark: '已完成多方会商，进入隐患处理'
                        }
                    ]
                },
                processInfo: {
                    startTime: '2026-03-30T09:40',
                    endTime: '',
                    handler: '李科长 (技术部) 及应急抢险分队',
                    result: '现场排水设备调试中，正在组织隐患点加固与监测复核。',
                    attachmentName: '',
                    executed: false,
                    logs: []
                },


                timeline: {
                    capture: { done: true, time: '2026-03-30 08:00' },
                    supervisor: { done: true, time: '2026-03-30 08:05' },
                    push: { done: true, time: '2026-03-30 08:08' },
                    consult: { done: true, time: '2026-03-30 08:20' },
                    process: { done: false, time: '' },
                    archive: { done: false, time: '' }
                }
            },
            {
                id: 'wo-004',
                time: '2026-03-29 14:20',
                levelText: '蓝色预警 (四级)',
                levelClass: 'blue',
                area: '西区选煤厂',
                staff: '王大力',
                status: '已完成',
                isClosed: '是',
                opinion: '设备已恢复正常',

                currentStep: 'archive',
                supervisorDecision: 'valid',
                supervisorName: '刘主管',
                supervisorTime: '2026-03-29 14:25',
                supervisorOpinion: '确认为真实预警',

                pushInfo: {
                    ruleLevel: 'blue',
                    frequency: '一天一次',
                    channel: '系统内消息 + 企业微信推送',
                    selectedRoleIds: [],
                    selectedPersonIds: [],
                    receivers: [],
                    logs: [],
                    executed: true,
                    executeTime: '2026-03-29 14:28',
                    executeUser: '系统自动推送'
                },
                consultInfo: {
                    host: '王大力',
                    participants: [
                        { id: 'manual-5', name: '王大力', deptName: '现场负责人', sourceType: 'manual' }
                    ],
                    conclusion: '会商确认风险已可控，按既定方案处置并完成闭环。',
                    decision: '进入隐患处理',
                    executed: true,
                    consultTime: '2026-03-29 14:40',
                    logs: [
                        {
                            type: 'consult',
                            operator: '王大力',
                            time: '2026-03-29 14:40',
                            remark: '已完成多方会商，进入隐患处理'
                        }
                    ]
                },
                processInfo: {
                    startTime: '2026-03-29T14:50',
                    endTime: '2026-03-29T15:30',
                    handler: '王大力及现场处置班组',
                    result: '设备异常已排除，现场风险点完成处置并恢复正常运行。',
                    attachmentName: '处置完成照片_wo004.jpg',
                    executed: true,
                    logs: []
                },
                archiveInfo: {
                    reviewer: '刘主管',
                    reviewResult: '现场复核通过，确认风险已解除，准予归档闭环。',
                    archiveSummary: '本次预警处置流程完整，设备异常已排除，现场恢复正常，相关记录已归档。',
                    needExpert: true,
                    executed: true,
                    archiveTime: '2026-03-29 16:00',
                    logs: [
                        {
                            type: 'archive',
                            operator: '刘主管',
                            time: '2026-03-29 16:00',
                            remark: '已完成跟踪归档，流程闭环'
                        }
                    ]
                },

                timeline: {
                    capture: { done: true, time: '2026-03-29 14:20' },
                    supervisor: { done: true, time: '2026-03-29 14:25' },
                    push: { done: true, time: '2026-03-29 14:28' },
                    consult: { done: true, time: '2026-03-29 14:40' },
                    process: { done: true, time: '2026-03-29 15:30' },
                    archive: { done: true, time: '2026-03-29 16:00' }
                }
            }
        ]);
        selectedRecord.value = tableData.value[0] || null;

        const ensureArchiveInfoReady = (record) => {
            if (!record) return;

            if (!record.archiveInfo) {
                record.archiveInfo = {
                    reviewer: '',
                    reviewResult: '',
                    archiveSummary: '',
                    needExpert: false,
                    executed: false,
                    archiveTime: '',
                    logs: []
                };
            }

            if (!record.archiveInfo.reviewer) record.archiveInfo.reviewer = '';
            if (!record.archiveInfo.reviewResult) record.archiveInfo.reviewResult = '';
            if (!record.archiveInfo.archiveSummary) record.archiveInfo.archiveSummary = '';
            if (typeof record.archiveInfo.needExpert !== 'boolean') record.archiveInfo.needExpert = false;
            if (typeof record.archiveInfo.executed !== 'boolean') record.archiveInfo.executed = false;
            if (!record.archiveInfo.archiveTime) record.archiveInfo.archiveTime = '';
            if (!record.archiveInfo.logs) record.archiveInfo.logs = [];
        };

        const openArchiveModal = () => {
            if (!selectedRecord.value) {
                window.alert('请先选择一条预警记录');
                return;
            }

            const record = selectedRecord.value;

            if (
                !record.timeline?.process?.done &&
                record.currentStep !== 'archive'
            ) {
                window.alert('当前预警尚未完成隐患处理，不能进入跟踪归档');
                return;
            }

            ensureArchiveInfoReady(record);

            archiveForm.reviewer = record.archiveInfo.reviewer || record.supervisorName || '';
            archiveForm.reviewResult = record.archiveInfo.reviewResult || '';
            archiveForm.archiveSummary = record.archiveInfo.archiveSummary || '';
            archiveForm.needExpert = !!record.archiveInfo.needExpert;

            activeTimelineModal.value = 'archive';
        };

        const executeArchive = () => {
            if (!selectedRecord.value) return;

            const record = selectedRecord.value;
            ensureArchiveInfoReady(record);

            if (!archiveForm.reviewer.trim()) {
                window.alert('请输入归档复核人');
                return;
            }

            if (!archiveForm.reviewResult.trim()) {
                window.alert('请输入复核结论');
                return;
            }

            if (!archiveForm.archiveSummary.trim()) {
                window.alert('请输入归档说明');
                return;
            }

            const nowTime = getCurrentTimeString();

            record.archiveInfo.reviewer = archiveForm.reviewer.trim();
            record.archiveInfo.reviewResult = archiveForm.reviewResult.trim();
            record.archiveInfo.archiveSummary = archiveForm.archiveSummary.trim();
            record.archiveInfo.needExpert = archiveForm.needExpert;
            record.archiveInfo.executed = true;
            record.archiveInfo.archiveTime = nowTime;

            record.archiveInfo.logs.push({
                type: 'archive',
                operator: archiveForm.reviewer.trim(),
                time: nowTime,
                remark: '已完成跟踪归档，流程闭环'
            });

            if (!record.timeline) record.timeline = {};
            if (!record.timeline.archive) record.timeline.archive = { done: false, time: '' };

            record.timeline.archive.done = true;
            record.timeline.archive.time = nowTime;

            record.currentStep = 'archive';
            record.status = '已完成';
            record.isClosed = '是';
            record.opinion = `归档完成：${archiveForm.reviewResult.trim()}`;

            activeTimelineModal.value = null;
            window.alert('跟踪归档已完成，当前预警已闭环。');
        };


        const ensureProcessInfoReady = (record) => {
            if (!record) return;

            if (!record.processInfo) {
                record.processInfo = {
                    startTime: '',
                    endTime: '',
                    handler: '',
                    result: '',
                    attachmentName: '',
                    executed: false,
                    logs: []
                };
            }

            if (!record.processInfo.startTime) record.processInfo.startTime = '';
            if (!record.processInfo.endTime) record.processInfo.endTime = '';
            if (!record.processInfo.handler) record.processInfo.handler = '';
            if (!record.processInfo.result) record.processInfo.result = '';
            if (!record.processInfo.attachmentName) record.processInfo.attachmentName = '';
            if (!record.processInfo.logs) record.processInfo.logs = [];
            if (typeof record.processInfo.executed !== 'boolean') record.processInfo.executed = false;
        };

        const openProcessModal = () => {
            if (!selectedRecord.value) {
                window.alert('请先选择一条预警记录');
                return;
            }

            const record = selectedRecord.value;

            if (!record.timeline?.consult?.done && record.currentStep !== 'process' && record.currentStep !== 'archive') {
                window.alert('当前预警尚未完成多方会商，不能进入隐患处理');
                return;
            }

            ensureProcessInfoReady(record);

            processForm.startTime = record.processInfo.startTime || '';
            processForm.endTime = record.processInfo.endTime || '';
            processForm.handler = record.processInfo.handler || '';
            processForm.result = record.processInfo.result || '';
            processForm.attachmentName = record.processInfo.attachmentName || '';

            activeTimelineModal.value = 'process';
        };

        const handleProcessAttachmentChange = (event) => {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            processForm.attachmentName = file.name;
        };
        const executeProcess = () => {
            if (!selectedRecord.value) return;

            const record = selectedRecord.value;
            ensureProcessInfoReady(record);

            if (!processForm.startTime) {
                window.alert('请输入处置开始时间');
                return;
            }

            if (!processForm.endTime) {
                window.alert('请输入处置结束时间');
                return;
            }

            if (!processForm.handler.trim()) {
                window.alert('请输入处置人员');
                return;
            }

            if (!processForm.result.trim()) {
                window.alert('请输入处置结果');
                return;
            }

            const nowTime = getCurrentTimeString();

            record.processInfo.startTime = processForm.startTime;
            record.processInfo.endTime = processForm.endTime;
            record.processInfo.handler = processForm.handler.trim();
            record.processInfo.result = processForm.result.trim();
            record.processInfo.attachmentName = processForm.attachmentName || '';
            record.processInfo.executed = true;

            if (!record.processInfo.logs) {
                record.processInfo.logs = [];
            }

            record.processInfo.logs.push({
                type: 'process',
                operator: processForm.handler.trim(),
                time: nowTime,
                remark: '已完成隐患处理，进入跟踪归档'
            });

            if (!record.timeline) record.timeline = {};
            if (!record.timeline.process) record.timeline.process = { done: false, time: '' };

            record.timeline.process.done = true;
            record.timeline.process.time = nowTime;

            record.currentStep = 'archive';
            record.status = '待归档';
            record.opinion = `隐患处理完成：${processForm.result.trim()}`;

            activeTimelineModal.value = null;
            window.alert('隐患处理已保存，流程已进入跟踪归档。');
        };

        const getAvailableConsultPersonOptions = (record) => {
            if (!record) return [];

            const participants = record.consultInfo?.participants || [];
            const existingIds = new Set(
                participants
                    .filter(item => item.sourceType !== 'manual')
                    .map(item => item.id)
            );

            return contactData.value.filter(person => !existingIds.has(person.id));
        };

        const ensureConsultInfoReady = (record) => {
            if (!record) return;

            if (!record.consultInfo) {
                record.consultInfo = {
                    host: '',
                    participants: [],
                    conclusion: '',
                    decision: '进入隐患处理',
                    executed: false,
                    consultTime: '',
                    logs: []
                };
            }

            if (!record.consultInfo.participants) record.consultInfo.participants = [];
            if (!record.consultInfo.logs) record.consultInfo.logs = [];
            if (!record.consultInfo.decision) record.consultInfo.decision = '进入隐患处理';
            if (!record.consultInfo.conclusion) record.consultInfo.conclusion = '';
            if (!record.consultInfo.host) record.consultInfo.host = '';
            if (!record.consultInfo.consultTime) record.consultInfo.consultTime = '';
            if (typeof record.consultInfo.executed !== 'boolean') record.consultInfo.executed = false;
        };

        const openConsultModal = () => {
            if (!selectedRecord.value) {
                window.alert('请先选择一条预警记录');
                return;
            }

            const record = selectedRecord.value;

            if (!record.timeline?.push?.done && record.currentStep !== 'consult' && record.currentStep !== 'process' && record.currentStep !== 'archive') {
                window.alert('当前预警尚未完成自动推送，不能进入多方会商');
                return;
            }

            ensureConsultInfoReady(record);

            consultForm.host = record.consultInfo.host || record.pushInfo?.executeUser || record.staff || '';
            consultForm.conclusion = record.consultInfo.conclusion || '';
            consultForm.decision = record.consultInfo.decision || '进入隐患处理';
            consultForm.tempParticipantId = '';

            activeTimelineModal.value = 'consult';
        };

        const addConsultParticipant = () => {
            if (!selectedRecord.value) return;
            if (!consultForm.tempParticipantId) {
                window.alert('请先选择要添加的会商参与人');
                return;
            }

            const record = selectedRecord.value;
            ensureConsultInfoReady(record);

            const person = contactData.value.find(item => item.id === consultForm.tempParticipantId);
            if (!person) return;

            const exists = (record.consultInfo.participants || []).some(item => item.id === person.id);
            if (exists) {
                window.alert('该联系人已在会商参与人列表中');
                return;
            }

            record.consultInfo.participants.push({
                id: person.id,
                name: person.name,
                deptName: getNodeLabel(person.deptId),
                sourceType: 'contact'
            });

            consultForm.tempParticipantId = '';
        };

        const removeConsultParticipant = (participant) => {
            if (!selectedRecord.value) return;

            const record = selectedRecord.value;
            ensureConsultInfoReady(record);

            record.consultInfo.participants = (record.consultInfo.participants || []).filter(
                item => item.id !== participant.id
            );
        };

        const executeConsult = () => {
            if (!selectedRecord.value) return;

            const record = selectedRecord.value;
            ensureConsultInfoReady(record);

            if (!consultForm.host.trim()) {
                window.alert('请输入会商主持人');
                return;
            }

            if (!(record.consultInfo.participants || []).length) {
                window.alert('请至少添加一名会商参与人');
                return;
            }

            if (!consultForm.conclusion.trim()) {
                window.alert('请输入会商结论');
                return;
            }

            const nowTime = getCurrentTimeString();

            record.consultInfo.host = consultForm.host.trim();
            record.consultInfo.conclusion = consultForm.conclusion.trim();
            record.consultInfo.decision = consultForm.decision;
            record.consultInfo.executed = true;
            record.consultInfo.consultTime = nowTime;

            record.consultInfo.logs.push({
                type: 'consult',
                operator: consultForm.host.trim(),
                time: nowTime,
                remark: consultForm.decision === '进入隐患处理'
                    ? '已完成多方会商，进入隐患处理'
                    : '已完成多方会商，转入继续跟踪'
            });

            if (!record.timeline) record.timeline = {};
            if (!record.timeline.consult) record.timeline.consult = { done: false, time: '' };

            record.timeline.consult.done = true;
            record.timeline.consult.time = nowTime;

            if (consultForm.decision === '进入隐患处理') {
                // 进入隐患处理
                if (!record.timeline.process) {
                    record.timeline.process = { done: false, time: '' };
                }

                record.currentStep = 'process';
                record.status = '待处理';
                record.opinion = `多方会商完成：${consultForm.conclusion.trim()}`;
            } else {
                // 直接转入跟踪归档
                if (!record.timeline.archive) {
                    record.timeline.archive = { done: false, time: '' };
                }

                // 这里不要把 archive 标记为 done，因为还没真正归档完成
                // 但要把 currentStep 切到 archive，并补一个进入归档节点的时间，界面更直观
                record.currentStep = 'archive';
                record.status = '跟踪归档';
                record.opinion = `多方会商完成：${consultForm.conclusion.trim()}`;

                // 让归档弹窗打开时有基础数据
                if (!record.archiveInfo) {
                    record.archiveInfo = {
                        reviewer: '',
                        reviewResult: '',
                        archiveSummary: '',
                        needExpert: false,
                        executed: false,
                        archiveTime: '',
                        logs: []
                    };
                }

                // 先把会商结论带到归档说明里，方便后续归档
                if (!record.archiveInfo.archiveSummary) {
                    record.archiveInfo.archiveSummary = `由多方会商直接转入跟踪归档：${consultForm.conclusion.trim()}`;
                }

                // 给 archive 节点先写一个“进入该节点”的时间，时间轴上会更直观
                // 注意：这不是归档完成时间，只是进入归档阶段的时间
                if (!record.archiveInfo.archiveTime) {
                    record.archiveInfo.archiveTime = nowTime;
                }
            }
            activeTimelineModal.value = null;
            window.alert(
                consultForm.decision === '进入隐患处理'
                    ? '多方会商已完成，流程已进入隐患处理。'
                    : '多方会商已完成，流程已进入跟踪归档。'
            );
        };

        const formData = reactive({
            time: '',
            level: 'red',
            area: '',
            staff: '',
            status: '待主管确认',
            isClosed: '否',
            opinion: ''
        });
        const supervisorForm = reactive({
            name: '',
            opinion: ''
        });

        const consultForm = reactive({
            host: '',
            conclusion: '',
            decision: '进入隐患处理',
            tempParticipantId: ''
        });

        const pushForm = reactive({
            executeUser: '',
            tempPersonId: ''
        });
        const processForm = reactive({
            startTime: '',
            endTime: '',
            handler: '',
            result: '',
            attachmentName: ''
        });

        const archiveForm = reactive({
            reviewer: '',
            reviewResult: '',
            archiveSummary: '',
            needExpert: false
        });

        const getRuleLevelText = (ruleLevel) => {
            const rule = ruleList.value.find(item => item.id === ruleLevel);
            return rule ? rule.levelText : '未匹配规则';
        };

        const getAvailablePushPersonOptions = (record) => {
            if (!record) return [];

            const receivers = record.pushInfo?.receivers || [];
            const existingIds = new Set(receivers.map(item => item.id));

            return contactData.value.filter(person => !existingIds.has(person.id));
        };

        const ensurePushInfoReady = (record) => {
            if (!record) return;

            if (!record.pushInfo) {
                record.pushInfo = buildPushInfoFromRule(record.levelClass);
            }

            if (!record.pushInfo.selectedRoleIds) record.pushInfo.selectedRoleIds = [];
            if (!record.pushInfo.selectedPersonIds) record.pushInfo.selectedPersonIds = [];
            if (!record.pushInfo.receivers) record.pushInfo.receivers = [];
            if (!record.pushInfo.logs) record.pushInfo.logs = [];
            if (typeof record.pushInfo.executed !== 'boolean') record.pushInfo.executed = false;
            if (!record.pushInfo.executeTime) record.pushInfo.executeTime = '';
            if (!record.pushInfo.executeUser) record.pushInfo.executeUser = '';
            if (!record.pushInfo.frequency) record.pushInfo.frequency = '';
            if (!record.pushInfo.channel) record.pushInfo.channel = '';

            // 如果当前还没有接收人，则按规则重新展开一次
            if (!record.pushInfo.receivers.length) {
                record.pushInfo.receivers = buildPushReceivers(
                    record.pushInfo.selectedRoleIds,
                    record.pushInfo.selectedPersonIds
                );
            }
        };

        const openPushModal = () => {
            if (!selectedRecord.value) {
                window.alert('请先选择一条预警记录');
                return;
            }

            const record = selectedRecord.value;

            if (record.supervisorDecision !== 'valid') {
                window.alert('当前预警尚未确认为有效预警，不能进入自动推送');
                return;
            }

            ensurePushInfoReady(record);

            const latestSignature = getRuleSignatureByLevel(record.levelClass);
            const currentSignature = record.pushInfo?.ruleSignature || '';

            if (latestSignature !== currentSignature && canResyncPushInfo(record)) {
                syncPushInfoWithLatestRule(record);
            }

            pushForm.executeUser = record.pushInfo.executeUser || record.supervisorName || '';
            pushForm.tempPersonId = '';

            activeTimelineModal.value = 'push';
        };

        const rebuildCurrentPushReceivers = () => {
            if (!selectedRecord.value) return;

            const record = selectedRecord.value;
            ensurePushInfoReady(record);

            record.pushInfo.receivers = buildPushReceivers(
                record.pushInfo.selectedRoleIds,
                record.pushInfo.selectedPersonIds
            );
        };

        const addPushReceiver = () => {
            if (!selectedRecord.value) return;
            if (!pushForm.tempPersonId) {
                window.alert('请先选择要补充的联系人');
                return;
            }

            const record = selectedRecord.value;
            ensurePushInfoReady(record);

            const person = contactData.value.find(item => item.id === pushForm.tempPersonId);
            if (!person) return;

            const exists = (record.pushInfo.receivers || []).some(item => item.id === person.id);
            if (exists) {
                window.alert('该联系人已在本次推送对象中');
                return;
            }

            if (!record.pushInfo.selectedPersonIds.includes(person.id)) {
                record.pushInfo.selectedPersonIds.push(person.id);
            }

            record.pushInfo.receivers.push({
                id: person.id,
                name: person.name,
                deptId: person.deptId,
                deptName: getNodeLabel(person.deptId),
                phone: person.phone || 'N/A',
                sourceType: 'person',
                sendStatus: record.pushInfo.executed ? '发送成功' : '待发送',
                readStatus: '未读',
                sendTime: record.pushInfo.executed ? getCurrentTimeString() : '',
                lastUrgeTime: '',
                urgeCount: 0
            });

            pushForm.tempPersonId = '';
        };

        const removePushReceiver = (receiver) => {
            if (!selectedRecord.value) return;

            const record = selectedRecord.value;
            ensurePushInfoReady(record);

            record.pushInfo.receivers = (record.pushInfo.receivers || []).filter(item => item.id !== receiver.id);
            record.pushInfo.selectedPersonIds = (record.pushInfo.selectedPersonIds || []).filter(id => id !== receiver.id);
        };

        const executePush = () => {
            if (!selectedRecord.value) return;

            const record = selectedRecord.value;
            ensurePushInfoReady(record);

            if (!pushForm.executeUser.trim()) {
                window.alert('请输入推送执行人');
                return;
            }

            if (!record.pushInfo.receivers.length) {
                window.alert('当前没有可推送的接收人，请先补充通知对象');
                return;
            }

            const nowTime = getCurrentTimeString();

            record.pushInfo.executeUser = pushForm.executeUser.trim();
            record.pushInfo.executeTime = nowTime;
            record.pushInfo.executed = true;

            record.pushInfo.receivers = record.pushInfo.receivers.map(item => ({
                ...item,
                sendStatus: '发送成功',
                sendTime: item.sendTime || nowTime
            }));

            record.pushInfo.logs.push({
                type: 'push',
                operator: pushForm.executeUser.trim(),
                time: nowTime,
                remark: `已完成自动推送，共推送 ${record.pushInfo.receivers.length} 人`
            });

            if (!record.timeline) record.timeline = {};
            if (!record.timeline.push) record.timeline.push = { done: false, time: '' };

            record.timeline.push.done = true;
            record.timeline.push.time = nowTime;

            record.currentStep = 'consult';
            record.status = '待会商';
            record.opinion = `自动推送已完成，等待组织多方会商`;

            activeTimelineModal.value = null;
            window.alert('自动推送已完成，流程已进入多方会商。');
        };

        const urgePushReceiver = (receiver) => {
            if (!selectedRecord.value) return;

            const record = selectedRecord.value;
            ensurePushInfoReady(record);

            const target = (record.pushInfo.receivers || []).find(item => item.id === receiver.id);
            if (!target) return;

            const nowTime = getCurrentTimeString();
            target.urgeCount = (target.urgeCount || 0) + 1;
            target.lastUrgeTime = nowTime;

            record.pushInfo.logs.push({
                type: 'urge',
                operator: pushForm.executeUser || '系统用户',
                time: nowTime,
                remark: `已对 ${target.name} 发起催办`
            });

            window.alert(`已对 ${target.name} 发起催办`);
        };

        const markPushReceiverRead = (receiver) => {
            if (!selectedRecord.value) return;

            const record = selectedRecord.value;
            ensurePushInfoReady(record);

            const target = (record.pushInfo.receivers || []).find(item => item.id === receiver.id);
            if (!target) return;

            target.readStatus = target.readStatus === '已读' ? '未读' : '已读';
        };

        // =========================
        // 工具方法
        // =========================
        const generateId = () => {
            return Date.now() + '-' + Math.random().toString(36).slice(2, 9);
        };

        const findParentNode = (tree, childId) => {
            for (const node of tree) {
                if (node.children && node.children.some(child => child.id === childId)) {
                    return node;
                }
                if (node.children && node.children.length) {
                    const found = findParentNode(node.children, childId);
                    if (found) return found;
                }
            }
            return null;
        };
        const findNodeById = (tree, id) => {
            for (const node of tree) {
                if (node.id === id) return node;
                if (node.children && node.children.length) {
                    const found = findNodeById(node.children, id);
                    if (found) return found;
                }
            }
            return null;
        };

        const createPositionNodeIfNeeded = (selectedId, positionName) => {
            const selectedNode = findNodeById(orgTree.value, selectedId);
            if (!selectedNode || !positionName.trim()) {
                return selectedId;
            }

            // 1）如果当前选中的是一级部门：在它下面按职务创建二级节点
            const isRootNode = orgTree.value.some(node => node.id === selectedId);
            if (isRootNode) {
                const existedChild = (selectedNode.children || []).find(
                    child => child.label.trim() === positionName.trim()
                );

                if (existedChild) {
                    return existedChild.id;
                }

                const newChildId = 'node-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
                if (!selectedNode.children) {
                    selectedNode.children = [];
                }

                selectedNode.children.push({
                    id: newChildId,
                    label: positionName.trim()
                });

                return newChildId;
            }

            // 2）如果当前选中的是二级节点：直接返回当前节点，不新增
            return selectedId;
        };

        const getNodeLabel = (nodeId) => {
            const node = findNodeById(orgTree.value, nodeId);
            return node ? node.label : '';
        };
        const getAllNodeIds = (node) => {
            if (!node) return [];

            let ids = [node.id];

            if (node.children && node.children.length) {
                node.children.forEach(child => {
                    ids = ids.concat(getAllNodeIds(child));
                });
            }

            return ids;
        };
        const getPersonsByRoleId = (roleId) => {
            return contactData.value.filter(person => person.deptId === roleId);
        };

        const getPersonsByRootId = (rootId) => {
            const rootNode = findNodeById(orgTree.value, rootId);
            if (!rootNode || !rootNode.children || !rootNode.children.length) return [];

            const roleIds = rootNode.children.map(child => child.id);
            return contactData.value.filter(person => roleIds.includes(person.deptId));
        };

        const isRootAllPersonsSelected = (rootId) => {
            const persons = getPersonsByRootId(rootId);
            if (!persons.length) return false;

            return persons.every(person => ruleForm.selectedPersonIds.includes(person.id));
        };
        const expandedRootIds = ref([]);
        const expandedRoleIds = ref([]);
        const isRootExpanded = (rootId) => {
            return expandedRootIds.value.includes(rootId);
        };

        const toggleRootExpand = (rootId) => {
            if (expandedRootIds.value.includes(rootId)) {
                expandedRootIds.value = expandedRootIds.value.filter(id => id !== rootId);
            } else {
                expandedRootIds.value.push(rootId);
            }
        };

        const isRoleExpanded = (roleId) => {
            return expandedRoleIds.value.includes(roleId);
        };

        const toggleRoleExpand = (roleId) => {
            if (expandedRoleIds.value.includes(roleId)) {
                expandedRoleIds.value = expandedRoleIds.value.filter(id => id !== roleId);
            } else {
                expandedRoleIds.value.push(roleId);
            }
        };

        const toggleRootPersons = (rootId) => {
            const rootNode = findNodeById(orgTree.value, rootId);
            if (!rootNode || !rootNode.children || !rootNode.children.length) return;

            const roleIds = rootNode.children.map(child => child.id);
            const persons = getPersonsByRootId(rootId);
            const personIds = persons.map(person => person.id);

            const allSelected = personIds.length > 0 && personIds.every(id => ruleForm.selectedPersonIds.includes(id));

            if (allSelected) {
                ruleForm.selectedPersonIds = ruleForm.selectedPersonIds.filter(id => !personIds.includes(id));
                ruleForm.selectedRoleIds = ruleForm.selectedRoleIds.filter(id => !roleIds.includes(id));
            } else {
                ruleForm.selectedPersonIds = [...new Set([...ruleForm.selectedPersonIds, ...personIds])];
                ruleForm.selectedRoleIds = [...new Set([...ruleForm.selectedRoleIds, ...roleIds])];
            }
        };
        const isRoleAllPersonsSelected = (roleId) => {
            const persons = getPersonsByRoleId(roleId);
            if (!persons.length) return false;

            return persons.every(person => ruleForm.selectedPersonIds.includes(person.id));
        };

        const toggleRolePersons = (roleId) => {
            const persons = getPersonsByRoleId(roleId);
            const personIds = persons.map(person => person.id);

            if (!personIds.length) return;

            const allSelected = personIds.every(id => ruleForm.selectedPersonIds.includes(id));

            if (allSelected) {
                ruleForm.selectedPersonIds = ruleForm.selectedPersonIds.filter(id => !personIds.includes(id));
            } else {
                const merged = [...ruleForm.selectedPersonIds, ...personIds];
                ruleForm.selectedPersonIds = [...new Set(merged)];
            }
        };

        const getRuleRoleNames = (rule) => {
            return (rule.selectedRoleIds || [])
                .map(id => getNodeLabel(id))
                .filter(Boolean);
        };

        const getRulePersonNames = (rule) => {
            return (rule.selectedPersonIds || [])
                .map(id => {
                    const person = contactData.value.find(item => item.id === id);
                    return person ? person.name : '';
                })
                .filter(Boolean);
        };
        const getRuleSummaryText = (rule) => {
            const roleNames = getRuleRoleNames(rule);
            const personNames = getRulePersonNames(rule);

            const roleText = roleNames.length
                ? `岗位：${roleNames.join('、')}`
                : '岗位：未配置';

            const personText = personNames.length
                ? `人员：${personNames.join('、')}`
                : '人员：未配置';

            return `${roleText} / ${personText}`;
        };
        const openRuleConfig = (rule) => {
            currentEditingRuleId.value = rule.id;
            ruleForm.selectedRoleIds = [...(rule.selectedRoleIds || [])];
            ruleForm.selectedPersonIds = [...(rule.selectedPersonIds || [])];
            showRuleModal.value = true;
        };
        const saveRuleConfig = () => {
            const targetRule = ruleList.value.find(item => item.id === currentEditingRuleId.value);
            if (!targetRule) return;

            targetRule.selectedRoleIds = [...ruleForm.selectedRoleIds];
            targetRule.selectedPersonIds = [...ruleForm.selectedPersonIds];

            showRuleModal.value = false;
        };
        const clearRuleRoles = () => {
            ruleForm.selectedRoleIds = [];
        };

        const clearRulePersons = () => {
            ruleForm.selectedPersonIds = [];
        };

        const clearRuleAll = () => {
            if (!window.confirm('确定要清空当前规则下的全部通知对象吗？')) return;
            ruleForm.selectedRoleIds = [];
            ruleForm.selectedPersonIds = [];
        };

        // =========================
        // 联系人页计算属性
        // =========================
        const currentNodeLabel = computed(() => {
            return getNodeLabel(selectedNodeId.value) || '请选择部门';
        });

        const filteredContacts = computed(() => {
            if (!selectedNodeId.value) return [];

            const currentNode = findNodeById(orgTree.value, selectedNodeId.value);
            if (!currentNode) return [];

            const allNodeIds = getAllNodeIds(currentNode);

            return contactData.value.filter(item => allNodeIds.includes(item.deptId));
        });

        // =========================
        // 预警页计算属性
        // =========================
        const filteredTableData = computed(() => {
            return tableData.value.filter(item => {
                const matchTime = !searchParams.time || item.time.includes(searchParams.time);
                const matchLevel = !searchParams.level || item.levelClass === searchParams.level;
                const matchArea = !searchParams.area || item.area.includes(searchParams.area);
                return matchTime && matchLevel && matchArea;
            });
        });

        // =========================
        // 联系人页方法
        // =========================
        const toggleNode = (nodeId) => {
            const idx = expandedNodeIds.value.indexOf(nodeId);
            if (idx > -1) {
                expandedNodeIds.value.splice(idx, 1);
            } else {
                expandedNodeIds.value.push(nodeId);
            }
        };

        const selectNode = (nodeId) => {
            selectedNodeId.value = nodeId;
        };
        const handleAddChildNode = (rootNode) => {
            const label = window.prompt(`请输入要添加到“${rootNode.label}”下的职务名称`);
            if (!label || !label.trim()) return;

            const existed = (rootNode.children || []).some(
                child => child.label.trim() === label.trim()
            );
            if (existed) {
                window.alert('该职务已存在');
                return;
            }

            if (!rootNode.children) {
                rootNode.children = [];
            }

            const newId = 'node-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
            rootNode.children.push({
                id: newId,
                label: label.trim(),
                children: []
            });

            selectedNodeId.value = newId;
        };

        const handleEditNode = (node, parentNode = null) => {
            const newLabel = window.prompt('请输入新的名称', node.label);
            if (!newLabel || !newLabel.trim()) return;

            const targetLabel = newLabel.trim();

            // 同级重名校验
            let siblingList = [];
            if (parentNode) {
                siblingList = parentNode.children || [];
            } else {
                siblingList = orgTree.value;
            }

            const duplicated = siblingList.some(item => item.id !== node.id && item.label.trim() === targetLabel);
            if (duplicated) {
                window.alert('同级下已存在相同名称');
                return;
            }

            const oldLabel = node.label;
            node.label = targetLabel;

            // 如果是二级节点，同时把该节点下联系人的职务名一起更新
            if (parentNode) {
                contactData.value.forEach(person => {
                    if (person.deptId === node.id) {
                        person.position = targetLabel;
                    }
                });
            }

            // 如果是一级节点，不改联系人 position，只改所属树名称显示
            if (selectedNodeId.value === node.id) {
                selectedNodeId.value = node.id;
            }
        };

        const handleDeleteNode = (node, parentNode = null) => {
            const nodeIds = getAllNodeIds(node);
            const relatedContacts = contactData.value.filter(person => nodeIds.includes(person.deptId));

            if (relatedContacts.length > 0) {
                const ok = window.confirm(
                    `节点“${node.label}”下还有 ${relatedContacts.length} 个联系人，删除后这些联系人也会一起删除，确定继续吗？`
                );
                if (!ok) return;
            } else {
                const ok = window.confirm(`确定删除节点“${node.label}”吗？`);
                if (!ok) return;
            }

            // 先删联系人
            contactData.value = contactData.value.filter(person => !nodeIds.includes(person.deptId));

            // 再删树节点
            if (parentNode) {
                parentNode.children = (parentNode.children || []).filter(item => item.id !== node.id);
            } else {
                orgTree.value = orgTree.value.filter(item => item.id !== node.id);
            }

            // 删除后重置选中
            if (selectedNodeId.value === node.id || nodeIds.includes(selectedNodeId.value)) {
                selectedNodeId.value = orgTree.value.length ? orgTree.value[0].id : '';
            }
        };

        const handleCreateContact = () => {
            if (!selectedNodeId.value) {
                window.alert('请先在左侧选择一个组织节点');
                return;
            }

            contactForm.id = '';
            contactForm.name = '';
            contactForm.account = '';
            contactForm.phone = '';
            contactForm.deptId = selectedNodeId.value;
            contactForm.position = '';
            const editingNode = ref(null);

            editingContactIndex.value = -1;
            showContactModal.value = true;
        };

        const editContact = (person) => {
            const globalIndex = contactData.value.findIndex(item => item.id === person.id);
            if (globalIndex === -1) return;

            contactForm.id = person.id;
            contactForm.name = person.name;
            contactForm.account = person.account;
            contactForm.phone = person.phone;
            contactForm.deptId = person.deptId;
            contactForm.position = person.position;

            editingContactIndex.value = globalIndex;
            showContactModal.value = true;
        };

        const deleteContact = (person) => {
            if (!window.confirm(`确定删除联系人“${person.name}”吗？`)) return;
            contactData.value = contactData.value.filter(item => item.id !== person.id);
        };

        const submitContactForm = () => {
            if (!contactForm.name.trim()) {
                window.alert('请输入姓名');
                return;
            }

            if (!contactForm.position.trim()) {
                window.alert('请输入行政职务');
                return;
            }

            let finalDeptId = contactForm.deptId || selectedNodeId.value;

            // 新增联系人时：
            // 如果当前选中的是一级部门，则根据“行政职务”自动创建二级节点
            if (editingContactIndex.value === -1) {
                finalDeptId = createPositionNodeIfNeeded(finalDeptId, contactForm.position);
            }

            const payload = {
                id: editingContactIndex.value > -1
                    ? contactData.value[editingContactIndex.value].id
                    : generateId(),
                name: contactForm.name.trim(),
                account: contactForm.account.trim() || 'N/A',
                phone: contactForm.phone.trim() || 'N/A',
                deptId: finalDeptId,
                position: contactForm.position.trim()
            };

            if (editingContactIndex.value > -1) {
                contactData.value.splice(editingContactIndex.value, 1, payload);
            } else {
                contactData.value.push(payload);
            }

            // 保存后自动切到新岗位节点，这样右侧表格立即能看到刚新增的人
            selectedNodeId.value = finalDeptId;
            showContactModal.value = false;
        };

        // =========================
        // 预警页方法
        // =========================
        const selectRecord = (item) => {
            selectedRecord.value = item;
        };
        const openSupervisorModal = () => {
            if (!selectedRecord.value) {
                window.alert('请先选择一条预警记录');
                return;
            }

            supervisorForm.name = selectedRecord.value.supervisorName || '';
            supervisorForm.opinion = selectedRecord.value.supervisorOpinion || '';
            activeTimelineModal.value = 'supervisor';
        };
        const getCurrentTimeString = () => {
            const now = new Date();
            const yyyy = now.getFullYear();
            const MM = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            return `${yyyy}-${MM}-${dd} ${hh}:${mm}`;
        };
        const getLevelIdByClass = (levelClass) => {
            return ['red', 'orange', 'yellow', 'blue'].includes(levelClass) ? levelClass : 'blue';
        };

        const buildPushReceivers = (selectedRoleIds = [], selectedPersonIds = []) => {
            const result = [];
            const addedIds = new Set();

            // 1. 先把岗位下的人展开出来
            selectedRoleIds.forEach(roleId => {
                const persons = getPersonsByRoleId(roleId) || [];
                persons.forEach(person => {
                    if (!addedIds.has(person.id)) {
                        addedIds.add(person.id);
                        result.push({
                            id: person.id,
                            name: person.name,
                            deptId: person.deptId,
                            deptName: getNodeLabel(person.deptId),
                            phone: person.phone || 'N/A',
                            sourceType: 'role',
                            sendStatus: '待发送',
                            readStatus: '未读',
                            sendTime: '',
                            lastUrgeTime: '',
                            urgeCount: 0
                        });
                    }
                });
            });

            // 2. 再把直接选中的人员补进去
            selectedPersonIds.forEach(personId => {
                const person = contactData.value.find(item => item.id === personId);
                if (person && !addedIds.has(person.id)) {
                    addedIds.add(person.id);
                    result.push({
                        id: person.id,
                        name: person.name,
                        deptId: person.deptId,
                        deptName: getNodeLabel(person.deptId),
                        phone: person.phone || 'N/A',
                        sourceType: 'person',
                        sendStatus: '待发送',
                        readStatus: '未读',
                        sendTime: '',
                        lastUrgeTime: '',
                        urgeCount: 0
                    });
                }
            });

            return result;
        };

        const buildPushInfoFromRule = (levelClass) => {
            const ruleId = getLevelIdByClass(levelClass);
            const matchedRule = ruleList.value.find(item => item.id === ruleId);

            if (!matchedRule) {
                return {
                    ruleLevel: ruleId,
                    frequency: '',
                    channel: '',
                    selectedRoleIds: [],
                    selectedPersonIds: [],
                    receivers: [],
                    logs: [],
                    executed: false,
                    executeTime: '',
                    executeUser: '',
                    ruleSignature: getRuleSignatureByLevel(levelClass),
                    syncedAt: getCurrentTimeString(),
                };
            }

            const selectedRoleIds = [...(matchedRule.selectedRoleIds || [])];
            const selectedPersonIds = [...(matchedRule.selectedPersonIds || [])];
            const receivers = buildPushReceivers(selectedRoleIds, selectedPersonIds);

            return {
                ruleLevel: ruleId,
                frequency: matchedRule.frequency || '',
                channel: matchedRule.channel || '',
                selectedRoleIds,
                selectedPersonIds,
                receivers,
                logs: [],
                executed: false,
                executeTime: '',
                executeUser: '',
                ruleSignature: '',
                syncedAt: getCurrentTimeString()
            };
        };

        const handleSupervisorDecision = (decision) => {
            if (!selectedRecord.value) {
                window.alert('当前没有选中的预警记录');
                return;
            }

            if (!supervisorForm.name.trim()) {
                window.alert('请输入确认人');
                return;
            }

            const record = selectedRecord.value;
            const nowTime = getCurrentTimeString();

            record.supervisorName = supervisorForm.name.trim();
            record.supervisorOpinion = supervisorForm.opinion.trim() || (decision === 'false_alarm' ? '判定为误报' : '确认为有效预警');
            record.supervisorTime = nowTime;
            record.supervisorDecision = decision;

            if (!record.timeline) {
                record.timeline = {};
            }
            if (!record.timeline.supervisor) {
                record.timeline.supervisor = { done: false, time: '' };
            }

            record.timeline.supervisor.done = true;
            record.timeline.supervisor.time = nowTime;

            if (decision === 'false_alarm') {
                record.currentStep = 'archive';
                record.status = '误报归档';
                record.isClosed = '是';
                record.opinion = record.supervisorOpinion;

                if (!record.timeline.archive) {
                    record.timeline.archive = { done: false, time: '' };
                }
                record.timeline.archive.done = true;
                record.timeline.archive.time = nowTime;
            } else {
                const nowTime = getCurrentTimeString();

                // 1）这条预警仍然未闭环
                record.isClosed = '否';

                // 2）先保留主管确认意见
                record.opinion = record.supervisorOpinion;

                // 3）根据当前预警等级，自动去“通知规则配置”里找对应规则
                //    并生成本次推送信息 pushInfo
                record.pushInfo = buildPushInfoFromRule(record.levelClass);

                // 4）系统自动完成推送
                record.pushInfo.executed = true;
                record.pushInfo.executeTime = nowTime;
                record.pushInfo.executeUser = '系统自动推送';

                // 5）把本次推送对象全部标记为“发送成功”
                record.pushInfo.receivers = (record.pushInfo.receivers || []).map(item => ({
                    ...item,
                    sendStatus: '发送成功',
                    sendTime: nowTime
                }));

                // 6）写一条推送日志
                if (!record.pushInfo.logs) {
                    record.pushInfo.logs = [];
                }

                record.pushInfo.logs.push({
                    type: 'push',
                    operator: '系统自动推送',
                    time: nowTime,
                    remark: `已按${record.levelText}规则自动推送，共推送 ${(record.pushInfo.receivers || []).length} 人`
                });

                // 7）把“自动推送”这个时间轴节点直接标记为完成
                if (!record.timeline.push) {
                    record.timeline.push = { done: false, time: '' };
                }
                record.timeline.push.done = true;
                record.timeline.push.time = nowTime;

                // 8）当前步骤不再停留在 push，而是直接进入 consult（多方会商）
                record.currentStep = 'consult';

                // 9）表格里的状态直接改成“待会商”
                record.status = '待会商';

                // 10）表格里的处理意见同步更新
                record.opinion = '主管确认有效，已按通知规则自动完成推送';
            }

            activeTimelineModal.value = null;
            window.alert(decision === 'false_alarm' ? '已判定为误报，流程已归档。' : '已确认有效预警，进入自动推送环节。');
        };
        const showRuleModal = ref(false);
        const currentEditingRuleId = ref('');
        const ruleForm = reactive({
            selectedRoleIds: [],
            selectedPersonIds: []
        });

        const getTimelineStatus = (stepName) => {
            if (!selectedRecord.value) return '';

            const record = selectedRecord.value;
            const stepOrder = ['capture', 'supervisor', 'push', 'consult', 'process', 'archive'];

            if (record.timeline && record.timeline[stepName] && record.timeline[stepName].done) {
                return 'completed';
            }

            if (record.currentStep === stepName && record.isClosed !== '是') {
                return 'active';
            }

            if (record.isClosed === '是' && stepName === 'archive') {
                return 'completed';
            }

            return '';
        };

        const getTimelineTime = (stepName) => {
            if (!selectedRecord.value) return '';

            const step = selectedRecord.value.timeline?.[stepName];
            return step?.time || '';
        };

        const handleCreateOrder = () => {
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            formData.time = new Date(now - offset).toISOString().slice(0, 16);

            formData.level = 'red';
            formData.area = '';
            formData.staff = '';
            formData.status = '待主管确认';
            formData.isClosed = '否';
            formData.opinion = '';

            showModal.value = true;
        };

        const submitForm = () => {
            const levelMap = {
                red: '红色预警 (一级)',
                orange: '橙色预警 (二级)',
                yellow: '黄色预警 (三级)',
                blue: '蓝色预警 (四级)'
            };

            if (!formData.time) {
                window.alert('请选择预警时间');
                return;
            }

            if (!formData.area.trim()) {
                window.alert('请输入预警区域');
                return;
            }

            if (!formData.status) {
                window.alert('请选择处置状态');
                return;
            }

            const newTime = formData.time.replace('T', ' ');
            const flowData = buildStatusDrivenRecordData(formData.status, newTime);

            // 如果状态已经走到自动推送以后，按等级自动生成推送配置
            if (['待会商', '待处理', '待归档', '已完成'].includes(formData.status)) {
                flowData.pushInfo = buildPushInfoFromRule(formData.level);
                flowData.pushInfo.executed = true;
                flowData.pushInfo.executeTime = newTime;
                flowData.pushInfo.executeUser = '系统自动推送';

                flowData.pushInfo.receivers = (flowData.pushInfo.receivers || []).map(item => ({
                    ...item,
                    sendStatus: '发送成功',
                    sendTime: newTime
                }));

                flowData.pushInfo.logs.push({
                    type: 'push',
                    operator: '系统自动推送',
                    time: newTime,
                    remark: `新增处置单时已按${levelMap[formData.level]}规则自动生成推送信息`
                });
            }

            const newRecord = {
                id: generateId(),
                time: newTime,
                levelText: levelMap[formData.level],
                levelClass: formData.level,
                area: formData.area.trim(),
                staff: formData.staff || '待分配',
                status: formData.status,
                isClosed: flowData.isClosed,
                opinion: formData.opinion || '-',

                currentStep: flowData.currentStep,
                supervisorDecision: flowData.supervisorDecision,
                supervisorName: '',
                supervisorTime: flowData.timeline.supervisor.done ? newTime : '',
                supervisorOpinion: '',

                pushInfo: flowData.pushInfo,
                consultInfo: flowData.consultInfo,
                processInfo: flowData.processInfo,
                archiveInfo: flowData.archiveInfo,

                timeline: flowData.timeline
            };

            // 给部分状态补一点更自然的默认说明
            if (formData.status === '误报归档') {
                newRecord.opinion = formData.opinion || '新增时标记为误报归档';
                newRecord.supervisorOpinion = '误报';
            } else if (formData.status === '待会商') {
                newRecord.supervisorDecision = 'valid';
                newRecord.supervisorOpinion = '确认为有效预警，系统已自动推送';
            } else if (formData.status === '待处理') {
                newRecord.supervisorDecision = 'valid';
                newRecord.supervisorOpinion = '确认为有效预警，已完成会商';
                newRecord.consultInfo.executed = true;
                newRecord.consultInfo.consultTime = newTime;
                newRecord.consultInfo.conclusion = formData.opinion || '新增时直接进入隐患处理';
            } else if (formData.status === '待归档') {
                newRecord.supervisorDecision = 'valid';
                newRecord.supervisorOpinion = '确认为有效预警，已完成会商与隐患处理';
                newRecord.consultInfo.executed = true;
                newRecord.consultInfo.consultTime = newTime;
                newRecord.processInfo.executed = true;
                newRecord.processInfo.startTime = formData.time;
                newRecord.processInfo.endTime = formData.time;
                newRecord.processInfo.result = formData.opinion || '新增时直接进入归档前状态';
            } else if (formData.status === '已完成') {
                newRecord.supervisorDecision = 'valid';
                newRecord.supervisorOpinion = '确认为有效预警，流程已完成';
                newRecord.consultInfo.executed = true;
                newRecord.consultInfo.consultTime = newTime;
                newRecord.processInfo.executed = true;
                newRecord.processInfo.startTime = formData.time;
                newRecord.processInfo.endTime = formData.time;
                newRecord.processInfo.result = formData.opinion || '新增时标记为已完成';
                newRecord.archiveInfo.executed = true;
                newRecord.archiveInfo.archiveTime = newTime;
                newRecord.archiveInfo.reviewResult = formData.opinion || '新增时标记为已完成闭环';
            }

            tableData.value.unshift(newRecord);
            selectedRecord.value = newRecord;

            showModal.value = false;

            formData.time = '';
            formData.level = 'red';
            formData.area = '';
            formData.staff = '';
            formData.status = '待主管确认';
            formData.isClosed = '否';
            formData.opinion = '';
        };

        const getStatusClass = (status) => {
            if (status === '已完成' || status === '误报归档') return 'status-done';
            if (status === '待主管确认' || status === '待会商' || status === '待处理' || status === '待归档') return 'status-pending';
            return 'status-process';
        };

        const downloadArchive = () => {
            window.alert('处置单归档文件下载已开始...');
        };

        const openExpertModal = () => {
            expertFormData.caseName = '';
            expertFormData.slideMode = '片帮';
            expertFormData.slideHeight = '';
            expertFormData.strikeLength = '';
            expertFormData.slopeAngle = '';
            expertFormData.geologicalStructure = '';
            expertFormData.mechanism = '';
            expertFormData.inducingFactor = '降雨入渗';
            expertFormData.treatmentMethod = '削坡';
            expertFormData.thresholdFeatures = '';
            expertFormData.geoDetails = '';
            expertFormData.treatmentPlan = '';
            expertFormData.constructionPoints = '';
            expertFormData.finalEvaluation = '';
            showExpertModal.value = true;
        };

        const submitExpertForm = () => {
            window.alert('案例已成功保存并接入推理库！');
            showExpertModal.value = false;
        };

        // 初始化默认选中记录
        if (tableData.value.length > 0) {
            selectedRecord.value = tableData.value[0];
        }

        const handleAddRootNode = () => {
            const label = window.prompt('请输入一级部门名称');
            if (!label || !label.trim()) return;

            const targetLabel = label.trim();
            const existed = orgTree.value.some(item => item.label.trim() === targetLabel);
            if (existed) {
                window.alert('该一级部门已存在');
                return;
            }

            const newId = 'root-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
            orgTree.value.push({
                id: newId,
                label: targetLabel,
                children: []
            });

            selectedNodeId.value = newId;
        };
        const getStepOrder = () => ['capture', 'supervisor', 'push', 'consult', 'process', 'archive'];

        const isStepReadonly = (stepName) => {
            if (!selectedRecord.value) return true;

            const record = selectedRecord.value;
            const stepOrder = getStepOrder();

            const currentIndex = stepOrder.indexOf(record.currentStep);
            const targetIndex = stepOrder.indexOf(stepName);

            if (currentIndex === -1 || targetIndex === -1) return true;

            // 已闭环后，所有节点默认只读
            if (record.isClosed === '是') return true;

            // 当前节点可编辑，其前面的已完成节点只读
            return targetIndex !== currentIndex;
        };
        const deleteWorkOrder = (item) => {
            if (!item) return;

            const ok = window.confirm(`确定要删除这条预警记录吗？\n\n【${item.levelText}｜${item.area}｜${item.time}】`);
            if (!ok) return;

            const targetId = item.id;
            const index = tableData.value.findIndex(record => record.id === targetId);
            if (index === -1) return;

            const wasSelected = selectedRecord.value && selectedRecord.value.id === targetId;

            tableData.value.splice(index, 1);

            // 如果删掉的是当前选中的记录，就重新指定一个选中项
            if (wasSelected) {
                if (tableData.value.length > 0) {
                    selectedRecord.value = tableData.value[Math.max(0, index - 1)] || tableData.value[0];
                } else {
                    selectedRecord.value = null;
                    activeTimelineModal.value = null;
                }
            }

            window.alert('预警记录已删除');
        };
        const getRuleSignatureByLevel = (levelClass) => {
            const ruleId = getLevelIdByClass(levelClass);
            const matchedRule = ruleList.value.find(item => item.id === ruleId);

            if (!matchedRule) return '';

            return JSON.stringify({
                ruleLevel: matchedRule.id,
                frequency: matchedRule.frequency || '',
                channel: matchedRule.channel || '',
                selectedRoleIds: [...(matchedRule.selectedRoleIds || [])].sort(),
                selectedPersonIds: [...(matchedRule.selectedPersonIds || [])].sort()
            });
        };
        const canResyncPushInfo = (record) => {
            if (!record) return false;
            if (record.isClosed === '是') return false;

            // 已完成会商后，默认不再自动改推送对象
            if (record.consultInfo && record.consultInfo.executed) return false;

            return true;
        };
        const syncPushInfoWithLatestRule = (record) => {
            if (!record) return;

            const latestPushInfo = buildPushInfoFromRule(record.levelClass);

            // 保留已经执行过的基本信息
            latestPushInfo.executed = true;
            latestPushInfo.executeTime = record.pushInfo?.executeTime || getCurrentTimeString();
            latestPushInfo.executeUser = record.pushInfo?.executeUser || '系统自动推送';

            latestPushInfo.receivers = (latestPushInfo.receivers || []).map(item => ({
                ...item,
                sendStatus: '发送成功',
                sendTime: latestPushInfo.executeTime
            }));

            latestPushInfo.logs = record.pushInfo?.logs || [];
            latestPushInfo.syncedAt = getCurrentTimeString();

            record.pushInfo = latestPushInfo;
        };

        return {
            deleteWorkOrder,

            getStepOrder,
            isStepReadonly,

            currentTab,
            showModal,
            showContactModal,
            showExpertModal,
            activeTimelineModal,
            selectedRecord,

            orgTree,
            expandedNodeIds,
            selectedNodeId,
            contactData,
            editingContactIndex,
            contactForm,

            consultationStaffList,
            searchParams,
            ruleList,
            frequencies,
            channels,
            expertFormData,

            tableData,
            formData,

            currentNodeLabel,
            filteredContacts,
            filteredTableData,

            toggleNode,
            selectNode,
            getNodeLabel,
            handleCreateContact,
            editContact,
            deleteContact,
            submitContactForm,

            selectRecord,
            getTimelineStatus,
            getTimelineTime,
            handleCreateOrder,
            submitForm,
            getStatusClass,
            downloadArchive,
            openExpertModal,
            submitExpertForm,

            handleAddChildNode,
            handleEditNode,
            handleDeleteNode,
            handleAddRootNode,
            showRuleModal,
            currentEditingRuleId,
            ruleForm,
            getRuleRoleNames,
            getRulePersonNames,
            getRuleSummaryText,
            openRuleConfig,
            saveRuleConfig,
            clearRuleRoles,
            clearRulePersons,
            clearRuleAll,
            getPersonsByRoleId,
            isRoleAllPersonsSelected,
            toggleRolePersons,
            getPersonsByRootId,
            isRootAllPersonsSelected,
            toggleRootPersons,
            expandedRootIds,
            expandedRoleIds,
            isRootExpanded,
            toggleRootExpand,
            isRoleExpanded,
            toggleRoleExpand,
            supervisorForm,
            openSupervisorModal,
            handleSupervisorDecision,

            getLevelIdByClass,
            buildPushReceivers,
            buildPushInfoFromRule,

            pushForm,
            getRuleLevelText,
            getAvailablePushPersonOptions,
            ensurePushInfoReady,
            openPushModal,
            rebuildCurrentPushReceivers,
            addPushReceiver,
            removePushReceiver,
            executePush,
            urgePushReceiver,
            markPushReceiverRead,
            consultForm,
            getAvailableConsultPersonOptions,
            ensureConsultInfoReady,
            openConsultModal,
            addConsultParticipant,
            removeConsultParticipant,
            executeConsult,
            processForm,
            ensureProcessInfoReady,
            openProcessModal,

            handleProcessAttachmentChange,
            executeProcess,
            archiveForm,
            ensureArchiveInfoReady,
            openArchiveModal,
            executeArchive,
            orderStatusOptions,
            buildStatusDrivenRecordData,
        };
    }
};