import { ref, reactive, computed } from 'vue';

export default {
    name: 'DecisionSupport',
    setup() {
        // ================= 状态定义 =================

        // 多选删除相关
        const selectedRecordIds = ref([]);  // 存储选中记录的 id

// 全选状态计算
        const isAllSelected = computed(() => {
            return filteredDecisionWarningRecords.value.length > 0 &&
                filteredDecisionWarningRecords.value.every(item => selectedRecordIds.value.includes(item.id));
        });

// 全选切换
        const toggleSelectAll = (event) => {
            if (event.target.checked) {
                selectedRecordIds.value = filteredDecisionWarningRecords.value.map(item => item.id);
            } else {
                selectedRecordIds.value = [];
            }
        };

// 删除选中记录
        const deleteSelectedRecords = () => {
            if (selectedRecordIds.value.length === 0) {
                window.alert('请至少选择一条记录');
                return;
            }
            if (!window.confirm(`确定删除选中的 ${selectedRecordIds.value.length} 条记录吗？`)) return;

            decisionWarningRecords.value = decisionWarningRecords.value.filter(
                item => !selectedRecordIds.value.includes(item.id)
            );
            selectedRecordIds.value = [];
        };
        const decisionSearchKeyword = ref('');
        const showCreateDisposalModal = ref(false);
        const activeTab = ref('decision');
        const expertSubTab = ref('cases');
        const showModal = ref(false);
        const isViewOnly = ref(false);
        const showDecisionDetailModal = ref(false);
        const decisionDetailTitle = ref('');
        const decisionDetailData = ref({
            summary: '',
            detail: '',
            quantity: '',
            effect: '',
            note: ''
        });
        const selectedDecisionRecord = ref(null);
        const decisionAnalysisResult = ref({
            matchScore: '',
            caseName: '',
            scale: { summary: '', detail: '', quantity: '', effect: '', note: '' },
            triggerReason: { summary: '', detail: '', quantity: '', effect: '', note: '' },
            measures: { summary: '', detail: '', quantity: '', effect: '', note: '' },
            mode: { summary: '', detail: '', quantity: '', effect: '', note: '' },
            governanceOpinion: '',
            mechanism: '',
            mainCause: '',
            recommendation: ''
        });
        const showRuleModal = ref(false);
        const editingRuleIndex = ref(-1);

        // 表单数据
        const decisionForm = reactive({
            time: '',
            levelText: '黄色预警（三级）',
            area: '',
            staff: '',
            landslideType: '',
            cause: '',
            status: '会商中',
            isClosed: '否',
            backupStaff: ''
        });

        const ruleForm = reactive({
            id: '',
            condition: '',
            action: '',
            parameter: '',
            isActive: true
        });

        // 预警记录数据
        const decisionWarningRecords = ref([
            {
                id: 1,
                time: '2026-04-11 09:20',
                levelText: '红色预警（一级）',
                levelClass: 'red',
                area: '南帮 2区 ZK-03',
                staff: '张工',
                landslideType: '牵引式滑坡',
                cause: '连续降雨 + 坡脚扰动',
                status: '会商中',
                isClosed: '否',
                backupStaff: '王工'
            },
            {
                id: 2,
                time: '2026-04-11 14:05',
                levelText: '橙色预警（二级）',
                levelClass: 'orange',
                area: '北帮 1区 NW-07',
                staff: '李工',
                landslideType: '推移式滑坡',
                cause: '边坡开挖 + 地下水浸润',
                status: '处置中',
                isClosed: '否',
                backupStaff: '赵工'
            },
            {
                id: 3,
                time: '2026-04-12 08:40',
                levelText: '黄色预警（三级）',
                levelClass: 'yellow',
                area: '东侧运输道路 K2+180',
                staff: '周工',
                landslideType: '浅层堆积层滑坡',
                cause: '强降雨入渗 + 表层松散堆积',
                status: '待复核',
                isClosed: '否',
                backupStaff: '吴工'
            },
            {
                id: 4,
                time: '2026-04-12 16:10',
                levelText: '蓝色预警（四级）',
                levelClass: 'blue',
                area: '西帮 3区 WB-02',
                staff: '陈工',
                landslideType: '顺层滑坡',
                cause: '软弱夹层软化 + 局部卸荷',
                status: '已研判',
                isClosed: '否',
                backupStaff: '刘工'
            }
        ]);

        // 历史案例数据
        const historicalCases = ref([
            {
                id: 'CASE-2024-081',
                landslideMode: '片帮',
                slidingHeight: '42',
                strikeLength: '88',
                slopeAngle: '35',
                specialStructure: '断层破碎带',
                mechanism: '牵引式',
                trigger: '降雨入渗',
                disposalMethod: '局部支挡',
                warningThreshold: 'Z位移 > 150mm/d',
                geologyDesc: '含泥岩软弱夹层，顺层边坡，地下水丰富',
                governancePlan: '抗滑桩 + 坡脚反压 + 截排水沟',
                constructionPoints: '先应急控险，后分区治理',
                effectEvaluation: '位移收敛，安全系数由1.05提升至1.28。反演参数：c=22.5kPa，φ=16.8°',
                dim: { type: '片帮', rock: '泥岩软弱夹层', trigger: '降雨入渗', method: '抗滑桩+压帮' },
                condition: '连续强降雨，顺层边坡，层间结合力弱，地下水丰富',
                plan: '主方案：抗滑桩；辅方案：坡脚大体积反压、地表截排水',
            },
            {
                id: 'CASE-2024-056',
                landslideMode: '圆弧滑动',
                slidingHeight: '55',
                strikeLength: '120',
                slopeAngle: '30',
                specialStructure: '厚层风化壳',
                mechanism: '推移式',
                trigger: '开挖扰动',
                disposalMethod: '削坡',
                warningThreshold: '水平位移速率 > 5mm/d',
                geologyDesc: '全风化花岗岩，遇水易崩解',
                governancePlan: '顶部削坡减载 + 坡面防护',
                constructionPoints: '分台阶削坡，及时封闭坡面',
                effectEvaluation: '变形速率下降70%，稳定性满足要求。反演参数：c=18.0kPa，φ=22.5°',
                dim: { type: '圆弧滑动', rock: '全风化花岗岩', trigger: '开挖扰动', method: '削坡减载' },
                condition: '坡脚开挖导致临空面加大，风化层强度低',
                plan: '削坡减载 + 骨架植被护坡',
            },
            {
                id: 'CASE-2024-032',
                landslideMode: '组合滑动',
                slidingHeight: '68',
                strikeLength: '150',
                slopeAngle: '28',
                specialStructure: '顺层泥化夹层',
                mechanism: '复合式',
                trigger: '地下水渗流',
                disposalMethod: '换填',
                warningThreshold: '深部位移 > 3mm/d',
                geologyDesc: '砂泥岩互层，层间夹泥，地下水活跃',
                governancePlan: '局部换填软弱层 + 深层排水孔',
                constructionPoints: '分段开挖换填，及时施作排水',
                effectEvaluation: '深部位移稳定，安全系数提升至1.32。反演参数：c=15.2kPa，φ=19.7°',
                dim: { type: '组合滑动', rock: '砂泥岩互层', trigger: '地下水渗流', method: '换填+排水' },
                condition: '地下水长期浸润导致泥化夹层强度衰减',
                plan: '换填软弱面 + 深层排水',
            },
            {
                id: 'CASE-2023-115',
                landslideMode: '片帮',
                slidingHeight: '35',
                strikeLength: '70',
                slopeAngle: '38',
                specialStructure: '节理裂隙发育',
                mechanism: '倾倒式',
                trigger: '爆破振动',
                disposalMethod: '压脚',
                warningThreshold: '裂缝宽度 > 5mm',
                geologyDesc: '陡倾角板岩，爆破扰动大',
                governancePlan: '坡脚堆载反压 + 裂缝封填',
                constructionPoints: '控制爆破药量，加强监测',
                effectEvaluation: '裂缝不再扩展，边坡整体稳定。反演参数：c=28.0kPa，φ=25.3°',
                dim: { type: '片帮', rock: '板岩', trigger: '爆破振动', method: '压脚' },
                condition: '爆破作业频繁，岩体松动',
                plan: '坡脚反压 + 裂缝封闭',
            },
            {
                id: 'CASE-2023-089',
                landslideMode: '圆弧滑动',
                slidingHeight: '48',
                strikeLength: '95',
                slopeAngle: '33',
                specialStructure: '老滑坡堆积体',
                mechanism: '牵引式',
                trigger: '降雨入渗',
                disposalMethod: '局部支挡',
                warningThreshold: '地表位移 > 10mm/d',
                geologyDesc: '松散堆积层，透水性强',
                governancePlan: '抗滑桩 + 地表截排水',
                constructionPoints: '跳桩施工，减少扰动',
                effectEvaluation: '雨季位移可控，安全系数1.22。反演参数：c=12.8kPa，φ=14.5°',
                dim: { type: '圆弧滑动', rock: '松散堆积层', trigger: '降雨入渗', method: '抗滑桩+排水' },
                condition: '老滑坡体在强降雨下复活',
                plan: '抗滑桩支挡 + 截排水系统',
            },
            {
                id: 'CASE-2023-063',
                landslideMode: '组合滑动',
                slidingHeight: '72',
                strikeLength: '180',
                slopeAngle: '26',
                specialStructure: '多层软弱夹层',
                mechanism: '推移式',
                trigger: '开挖扰动',
                disposalMethod: '削坡',
                warningThreshold: '坡脚隆起 > 2cm',
                geologyDesc: '炭质页岩夹煤层，强度极低',
                governancePlan: '减载 + 坡脚反压 + 深部排水',
                constructionPoints: '自上而下削坡，及时反压',
                effectEvaluation: '隆起停止，位移收敛明显。反演参数：c=10.5kPa，φ=12.0°',
                dim: { type: '组合滑动', rock: '炭质页岩', trigger: '开挖扰动', method: '削坡+反压' },
                condition: '坡脚开挖诱发多层软弱面滑动',
                plan: '减载反压 + 深部排水',
            },
            {
                id: 'CASE-2022-044',
                landslideMode: '片帮',
                slidingHeight: '30',
                strikeLength: '60',
                slopeAngle: '40',
                specialStructure: '岩层面与坡面同向',
                mechanism: '顺层滑动',
                trigger: '地下水渗流',
                disposalMethod: '局部支挡',
                warningThreshold: '层面位移 > 8mm/d',
                geologyDesc: '砂页岩互层，层面充泥',
                governancePlan: '锚索框架 + 排水孔',
                constructionPoints: '锚索钻孔注意倾角，避免扰动',
                effectEvaluation: '层面滑动停止，安全系数1.18。反演参数：c=20.0kPa，φ=18.5°',
                dim: { type: '片帮', rock: '砂页岩互层', trigger: '地下水渗流', method: '锚索框架' },
                condition: '地下水沿层面渗流，软化夹层',
                plan: '锚索加固 + 深层排水',
            },
            {
                id: 'CASE-2022-021',
                landslideMode: '圆弧滑动',
                slidingHeight: '60',
                strikeLength: '140',
                slopeAngle: '29',
                specialStructure: '残坡积层与基岩界面',
                mechanism: '牵引式',
                trigger: '降雨入渗',
                disposalMethod: '压脚',
                warningThreshold: '累计位移 > 200mm',
                geologyDesc: '残坡积粘土夹碎石，下伏基岩面陡',
                governancePlan: '坡脚堆载 + 坡面截水',
                constructionPoints: '分层压实，控制加载速率',
                effectEvaluation: '位移速率由3.2mm/d降至0.4mm/d。反演参数：c=14.0kPa，φ=16.0°',
                dim: { type: '圆弧滑动', rock: '残坡积层', trigger: '降雨入渗', method: '压脚' },
                condition: '降雨入渗导致界面软化',
                plan: '坡脚反压 + 截排水',
            }
        ]);

        // 规则库数据
        const ruleBase = ref([
            {
                id: 'RULE-R01-WATER',
                condition: 'IF 诱因为[强降雨/地下水] AND 岩性包含[软弱夹层]',
                action: 'THEN 初步研判为受水弱化控制滑动；必选方案需包含[截排水/阻水]',
                parameter: '抗剪强度 C/φ 折减预估: 15%~30%',
                isActive: true,
            },
            {
                id: 'RULE-R02-TOE',
                condition: 'IF 险情特征为[前缘剪出/坡脚隆起] AND 位移速率突增',
                action: 'THEN 初步研判为推移式破坏先兆；紧急推荐工法[坡脚局部压帮]',
                parameter: '压帮可提供阻滑力，预估提升 Fs 0.05~0.15',
                isActive: true,
            },
            {
                id: 'RULE-R03-DEEP',
                condition: 'IF 监测到[深层滑动面滑动] AND 深度 > 15m',
                action: 'THEN 常规挡墙无效；推荐选用[大截面抗滑桩/预应力锚索]',
                parameter: '单孔锚索设计拉力建议范围: 800~1500 kN',
                isActive: true,
            }
        ]);
        // 筛选条件
        const filterLevel = ref('');           // 预警等级
        const filterStartDate = ref('');       // 开始日期
        const filterEndDate = ref('');         // 结束日期
        const filterArea = ref('');            // 区域（模糊）

        // ================= 辅助函数 =================
        const getDecisionLevelClass = (levelText) => {
            if (levelText.includes('红')) return 'red';
            if (levelText.includes('橙')) return 'orange';
            if (levelText.includes('黄')) return 'yellow';
            return 'blue';
        };

        const getDecisionStatusClass = (status) => {
            if (status === '会商中') return 'status-processing';
            if (status === '处置中') return 'status-doing';
            if (status === '待复核') return 'status-pending';
            if (status === '已研判') return 'status-done';
            return 'status-default';
        };

        // ================= 计算属性 =================
        const filteredDecisionWarningRecords = computed(() => {
            let list = decisionWarningRecords.value;

            // 1. 等级筛选
            if (filterLevel.value) {
                list = list.filter(item => item.levelText.includes(filterLevel.value));
            }

            // 2. 时间范围筛选
            if (filterStartDate.value) {
                list = list.filter(item => item.time >= filterStartDate.value);
            }
            if (filterEndDate.value) {
                list = list.filter(item => item.time <= filterEndDate.value + ' 23:59:59'); // 包含整天
            }

            // 3. 区域模糊筛选
            if (filterArea.value.trim()) {
                const keyword = filterArea.value.trim().toLowerCase();
                list = list.filter(item => item.area.toLowerCase().includes(keyword));
            }

            // 4. 关键词综合搜索（保留原有）
            const keyword = decisionSearchKeyword.value.trim().toLowerCase();
            if (keyword) {
                list = list.filter(item =>
                    item.staff.toLowerCase().includes(keyword) ||
                    item.landslideType.toLowerCase().includes(keyword)
                );
            }

            return list;
        });

        // ================= 表单操作 =================
        const resetDecisionForm = () => {
            decisionForm.time = '';
            decisionForm.levelText = '黄色预警（三级）';
            decisionForm.area = '';
            decisionForm.staff = '';
            decisionForm.landslideType = '';
            decisionForm.cause = '';
            decisionForm.status = '会商中';
            decisionForm.isClosed = '否';
            decisionForm.backupStaff = '';
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            decisionForm.time = new Date(now - offset).toISOString().slice(0, 16);
        };

        const submitDecisionDisposal = () => {
            if (!decisionForm.time || !decisionForm.area || !decisionForm.staff) {
                window.alert('请先填写完整的预警时间、预警区域和处理人员。');
                return;
            }
            decisionWarningRecords.value.unshift({
                id: Date.now(),
                time: decisionForm.time.replace('T', ' '),
                levelText: decisionForm.levelText,
                levelClass: getDecisionLevelClass(decisionForm.levelText),
                area: decisionForm.area,
                staff: decisionForm.staff,
                landslideType: decisionForm.landslideType || '未填写',
                cause: decisionForm.cause || '未填写',
                status: decisionForm.status,
                isClosed: decisionForm.isClosed,
                backupStaff: decisionForm.backupStaff || '未填写'
            });
            showCreateDisposalModal.value = false;
        };

        const openCreateDisposalModal = () => {
            resetDecisionForm();
            showCreateDisposalModal.value = true;
        };



        // ================= 智能分析 =================
        const buildDecisionAnalysis = (record) => {
            const commonMap = {
                '片帮': {
                    caseName: '南帮片帮局部抗滑与排水联合治理案例',
                    matchScore: '92%',
                    scale: {
                        summary: '中型滑坡，滑体长度约170m，宽度约95m，方量约7.8万m³。',
                        detail: '该案例位于露天矿边坡中上部，后缘裂缝发育明显，前缘存在局部鼓胀和剪出口，滑体整体连续性较好，适合分阶段控制与局部重点治理。',
                        quantity: '治理范围约1.62万㎡，滑体影响方量约7.8万m³。',
                        effect: '经分区治理后，位移速率由高位突增转为逐步收敛。',
                        note: '适用于存在后缘张裂、前缘局部剪出且具备临时控险条件的边坡。'
                    },
                    triggerReason: {
                        summary: '连续降雨叠加坡脚扰动，地下水入渗后导致软弱面抗剪强度下降。',
                        detail: '降雨导致浅层与结构面附近含水率迅速升高，坡脚施工扰动削弱了前缘约束，最终形成上部牵引、下部局部失稳的发展过程。',
                        quantity: '连续强降雨过程累计雨量可达80~120mm。',
                        effect: '强降雨后 12~24h 内位移速率响应最明显。',
                        note: '典型水-力耦合作用主导。'
                    },
                    measures: {
                        summary: '截排水 + 坡脚反压 + 局部抗滑桩 + 裂缝封填。',
                        detail: '优先布设坡顶截水沟和平台排水沟，坡脚实施局部压帮反压，必要时在重点段增设抗滑桩，并对后缘张裂缝进行粘土回填与防渗覆盖。',
                        quantity: '抗滑桩 12 根；截排水沟约 460m；压帮方量约 1.4万m³；裂缝封填约 320m。',
                        effect: '快速控制前缘剪出风险，并降低后续降雨再激活概率。',
                        note: '适合先应急控险再逐步工程治理。'
                    },
                    mode: {
                        summary: '以后缘牵引拉裂、前缘局部剪出为特征的片帮模式。',
                        detail: '变形表现为后缘张裂缝持续扩展，上部块体缓慢下滑牵引中下部变形，前缘最终形成局部剪切破坏，属于渐进演化型失稳模式。',
                        quantity: '常对应中型及以上滑体。',
                        effect: '对降雨和外部扰动较敏感。',
                        note: '需重点监测后缘裂缝宽度和前缘位移加速度。'
                    },
                    governanceOpinion: '建议采取“先控险、后治理、分区实施”的策略，优先控制降雨入渗与坡脚失稳，形成对滑体前缘和中部的协同约束。',
                    mechanism: '边坡在降雨入渗条件下，软弱结构面强度折减明显，后缘拉裂逐步贯通，前缘抗滑能力不足，属于典型牵引式渐进变形机制。',
                    mainCause: '连续降雨入渗造成的软弱面强度下降是主导诱因，坡脚扰动为重要放大因素。',
                    recommendation: '推荐处治方向为截排水、坡脚反压、重点段抗滑结构加固与裂缝封闭防渗。'
                },
                '圆弧滑动': {
                    caseName: '北帮圆弧滑动坡脚反压与深部排水治理案例',
                    matchScore: '89%',
                    scale: {
                        summary: '中小型滑坡，滑体长度约135m，宽度约80m，方量约4.9万m³。',
                        detail: '中下部位移较集中，坡脚有明显隆起与剪出口，整体表现为滑体向前推移。',
                        quantity: '影响范围约 0.95 万㎡。',
                        effect: '经坡脚加固和深部排水后推移速率明显下降。',
                        note: '适用于坡脚变形集中区域。'
                    },
                    triggerReason: {
                        summary: '边坡开挖致临空面扩大，地下水浸润使坡体自重效应增强。',
                        detail: '开挖扰动削弱坡脚支承条件，深部浸润线抬升后滑体整体抗滑稳定性下降。',
                        quantity: '浸润线抬升 2~4m 时变形响应明显。',
                        effect: '坡脚位移和鼓胀首先出现异常。',
                        note: '典型开挖-水作用耦合。'
                    },
                    measures: {
                        summary: '坡脚反压 + 深部排水孔 + 平台整形 + 监测加密。',
                        detail: '优先进行坡脚反压和深部排水，恢复前缘约束并降低孔压，同时整形平台减少汇水。',
                        quantity: '反压方量约 9800m³；排水孔 18 个，总长约 540m。',
                        effect: '前缘鼓胀明显减弱，位移速率逐步回落。',
                        note: '应同步实施交通和作业区域管控。'
                    },
                    mode: {
                        summary: '以前缘鼓胀、坡脚剪出和整体前推为主要特征的圆弧滑动模式。',
                        detail: '变形核心集中在中下部和坡脚，整体滑体在重力和外部扰动作用下向前推移，前缘产生挤压变形。',
                        quantity: '常见于坡脚支承削弱区域。',
                        effect: '对坡脚加固响应较好。',
                        note: '宜重点盯防前缘隆起和坡脚裂缝。'
                    },
                    governanceOpinion: '建议以恢复坡脚支承和削减孔压为核心，优先实施坡脚反压与深部排水，再根据监测结果决定是否追加支挡结构。',
                    mechanism: '圆弧滑动主要受坡脚约束减弱和滑体自重向前传递控制，中下部应力集中导致前缘剪切变形增强。',
                    mainCause: '边坡开挖造成的坡脚支承削弱与地下水浸润共同主导变形发展。',
                    recommendation: '推荐处治方向为坡脚反压、深部排水、局部整形减载与重点监测断面加密。'
                }
            };

            return commonMap[record.landslideType] || {
                caseName: '通用滑坡治理对标案例',
                matchScore: '86%',
                scale: {
                    summary: '中小型滑坡，影响范围中等。',
                    detail: '该案例与当前边坡在变形特征和诱发因素上具有较高相似性，可作为类比参考。',
                    quantity: '治理范围约 0.8~1.5 万㎡。',
                    effect: '治理后整体趋稳。',
                    note: '用于常规类比研判。'
                },
                triggerReason: {
                    summary: '降雨、扰动和软弱结构面共同作用。',
                    detail: '多因素共同耦合导致边坡稳定性下降。',
                    quantity: '需结合现场监测进一步定量分析。',
                    effect: '监测指标会出现阶段性加速。',
                    note: '建议结合水文和开挖活动同步核查。'
                },
                measures: {
                    summary: '截排水、减载、局部支挡和监测加密。',
                    detail: '以快速控险为主，结合重点区加固与排水疏导措施。',
                    quantity: '工程量需根据现场复核后细化。',
                    effect: '可在短期内控制继续发展风险。',
                    note: '适合初步研判阶段。'
                },
                mode: {
                    summary: '渐进式发展滑坡模式。',
                    detail: '滑体由局部变形逐步扩展，最终形成整体不稳定风险。',
                    quantity: '需结合裂缝、位移、孔压综合判断。',
                    effect: '发展过程具有阶段性。',
                    note: '建议实施连续观测。'
                },
                governanceOpinion: '建议先开展临时控险，再根据现场复核结果细化工程治理方案。',
                mechanism: '属于多因素耦合作用下的渐进变形机制。',
                mainCause: '降雨入渗及局部扰动是主要风险来源。',
                recommendation: '推荐处治方向为截排水、减载、局部支挡与连续监测。'
            };
        };
        const caseForm = reactive({
            id: '',
            landslideMode: '片帮',
            slidingHeight: '',
            strikeLength: '',
            slopeAngle: '',
            specialStructure: '',
            mechanism: '',
            trigger: '降雨入渗',
            disposalMethod: '削坡',
            warningThreshold: '',
            geologyDesc: '',
            governancePlan: '',
            constructionPoints: '',
            effectEvaluation: ''
        });

        const handleDecisionAnalysis = (record) => {
            if (selectedDecisionRecord.value && selectedDecisionRecord.value.id === record.id) {
                // 如果点击的是当前已选中的记录，则关闭
                selectedDecisionRecord.value = null;
            } else {
                // 否则选中新记录并生成分析结果
                selectedDecisionRecord.value = record;
                decisionAnalysisResult.value = buildDecisionAnalysis(record);
            }
        };

        const openDecisionDetail = (title, data) => {
            decisionDetailTitle.value = title;
            decisionDetailData.value = { ...data };
            showDecisionDetailModal.value = true;
        };

        const closeDecisionDetail = () => {
            showDecisionDetailModal.value = false;
        };

        const exportDecisionReport = () => {
            if (!selectedDecisionRecord.value) {
                window.alert('请先选择一条记录并点击分析。');
                return;
            }
            const record = selectedDecisionRecord.value;
            const result = decisionAnalysisResult.value;
            const reportText = `
智能决策支持分析报告

一、结构化录入内容
预警时间：${record.time}
预警等级：${record.levelText}
预警区域：${record.area}
处理人员：${record.staff}
滑坡类型：${record.landslideType}
成因：${record.cause}
处置状态：${record.status}
是否闭环：${record.isClosed}
后备处理人员：${record.backupStaff}

二、知识库匹配内容
匹配案例：${result.caseName}
匹配度：${result.matchScore}

1. 治理区尺度（滑坡规模）
摘要：${result.scale.summary}
详细内容：${result.scale.detail}
工程量/规模：${result.scale.quantity}
实施效果：${result.scale.effect}
备注：${result.scale.note}

2. 诱发原因
摘要：${result.triggerReason.summary}
详细内容：${result.triggerReason.detail}
工程量/规模：${result.triggerReason.quantity}
实施效果：${result.triggerReason.effect}
备注：${result.triggerReason.note}

3. 治理措施（包含治理工程量）
摘要：${result.measures.summary}
详细内容：${result.measures.detail}
工程量/规模：${result.measures.quantity}
实施效果：${result.measures.effect}
备注：${result.measures.note}

4. 滑坡模式
摘要：${result.mode.summary}
详细内容：${result.mode.detail}
工程量/规模：${result.mode.quantity}
实施效果：${result.mode.effect}
备注：${result.mode.note}

三、治理方案意见
治理方案意见：${result.governanceOpinion}
力学机制研判：${result.mechanism}
主导诱因：${result.mainCause}
推荐处治方案方向：${result.recommendation}
      `.trim();
            const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `智能决策支持报告_${record.area}_${record.time.replace(/[: ]/g, '-')}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        };

        // ================= 案例库操作 =================
        const handleViewCase = (index) => {
            const item = historicalCases.value[index];
            // 回填表单
            caseForm.id = item.id || '';
            caseForm.landslideMode = item.landslideMode || '片帮';
            caseForm.slidingHeight = item.slidingHeight || '';
            caseForm.strikeLength = item.strikeLength || '';
            caseForm.slopeAngle = item.slopeAngle || '';
            caseForm.specialStructure = item.specialStructure || '';
            caseForm.mechanism = item.mechanism || '';
            caseForm.trigger = item.trigger || '降雨入渗';
            caseForm.disposalMethod = item.disposalMethod || '削坡';
            caseForm.warningThreshold = item.warningThreshold || '';
            caseForm.geologyDesc = item.geologyDesc || '';
            caseForm.governancePlan = item.governancePlan || '';
            caseForm.constructionPoints = item.constructionPoints || '';
            caseForm.effectEvaluation = item.effectEvaluation || '';

            isViewOnly.value = true;
            showModal.value = true;
        };

        const handleDeleteCase = (index) => {
            if (window.confirm('确认要从专家库中永久删除该历史案例吗？')) {
                historicalCases.value.splice(index, 1);
            }
        };

        const openAddCaseModal = () => {
            isViewOnly.value = false;
            // 重置表单
            caseForm.id = '';
            caseForm.landslideMode = '片帮';
            caseForm.slidingHeight = '';
            caseForm.strikeLength = '';
            caseForm.slopeAngle = '';
            caseForm.specialStructure = '';
            caseForm.mechanism = '';
            caseForm.trigger = '降雨入渗';
            caseForm.disposalMethod = '削坡';
            caseForm.warningThreshold = '';
            caseForm.geologyDesc = '';
            caseForm.governancePlan = '';
            caseForm.constructionPoints = '';
            caseForm.effectEvaluation = '';
            showModal.value = true;
        };

        const submitCase = () => {
            // 简单校验：案例编号必填
            if (!caseForm.id.trim()) {
                window.alert('请填写案例名称/编号');
                return;
            }

            // 构建新案例对象（兼容旧表格字段）
            const newCase = {
                id: caseForm.id,
                landslideMode: caseForm.landslideMode,
                slidingHeight: caseForm.slidingHeight,
                strikeLength: caseForm.strikeLength,
                slopeAngle: caseForm.slopeAngle,
                specialStructure: caseForm.specialStructure,
                mechanism: caseForm.mechanism,
                trigger: caseForm.trigger,
                disposalMethod: caseForm.disposalMethod,
                warningThreshold: caseForm.warningThreshold,
                geologyDesc: caseForm.geologyDesc,
                governancePlan: caseForm.governancePlan,
                constructionPoints: caseForm.constructionPoints,
                effectEvaluation: caseForm.effectEvaluation,
                // 生成旧字段用于表格展示
                dim: {
                    type: caseForm.landslideMode,
                    rock: caseForm.specialStructure || '未填写',
                    trigger: caseForm.trigger,
                    method: caseForm.disposalMethod
                },
                condition: `${caseForm.geologyDesc || '暂无'}；诱因：${caseForm.trigger}`,
                plan: caseForm.governancePlan || '未填写'
            };

            historicalCases.value.unshift(newCase);
            showModal.value = false;
        };

        // ================= 规则库操作 =================
        const handleAddRule = () => {
            editingRuleIndex.value = -1;
            ruleForm.id = `RULE-NEW-${Math.floor(Math.random() * 10000)}`;
            ruleForm.condition = '';
            ruleForm.action = '';
            ruleForm.parameter = '';
            ruleForm.isActive = true;
            showRuleModal.value = true;
        };

        const toggleRuleStatus = (index) => {
            ruleBase.value[index].isActive = !ruleBase.value[index].isActive;
        };

        const handleEditRule = (index) => {
            editingRuleIndex.value = index;
            const rule = ruleBase.value[index];
            ruleForm.id = rule.id;
            ruleForm.condition = rule.condition;
            ruleForm.action = rule.action;
            ruleForm.parameter = rule.parameter;
            ruleForm.isActive = rule.isActive;
            showRuleModal.value = true;
        };

        const handleDeleteRule = (index) => {
            if (window.confirm('确认删除该规则吗？')) {
                ruleBase.value.splice(index, 1);
            }
        };

        const submitRule = () => {
            if (editingRuleIndex.value === -1) {
                ruleBase.value.unshift({ ...ruleForm });
            } else {
                ruleBase.value[editingRuleIndex.value] = { ...ruleForm };
            }
            showRuleModal.value = false;
        };
        // 清空所有筛选条件

        const resetFilters = () => {
            filterLevel.value = '';
            filterStartDate.value = '';
            filterEndDate.value = '';
            filterArea.value = '';
            decisionSearchKeyword.value = '';
        };

        // 放在其他 ref 声明附近
        const caseSectionExpanded = ref(true);
        const ruleSectionExpanded = ref(true);

        const toggleCaseSection = () => {
            caseSectionExpanded.value = !caseSectionExpanded.value;
        };

        const toggleRuleSection = () => {
            ruleSectionExpanded.value = !ruleSectionExpanded.value;
        };

        const analysisExpanded = ref(true);

        const toggleAnalysis = () => {
            analysisExpanded.value = !analysisExpanded.value;
        };

        // ================= 返回模板所需的一切 =================
        return {
            // 状态
            activeTab,
            expertSubTab,
            decisionSearchKeyword,
            showCreateDisposalModal,
            showModal,
            isViewOnly,
            showDecisionDetailModal,
            decisionDetailTitle,
            decisionDetailData,
            selectedDecisionRecord,
            decisionAnalysisResult,
            showRuleModal,
            editingRuleIndex,
            decisionForm,
            ruleForm,
            // 数据
            decisionWarningRecords,
            historicalCases,
            ruleBase,
            // 计算属性
            filteredDecisionWarningRecords,
            // 方法
            getDecisionLevelClass,
            getDecisionStatusClass,
            resetDecisionForm,
            submitDecisionDisposal,
            openCreateDisposalModal,
            handleDecisionAnalysis,
            openDecisionDetail,
            closeDecisionDetail,
            exportDecisionReport,
            handleViewCase,
            handleDeleteCase,
            openAddCaseModal,
            submitCase,
            handleAddRule,
            toggleRuleStatus,
            handleEditRule,
            handleDeleteRule,
            submitRule,
            selectedRecordIds,
            isAllSelected,
            toggleSelectAll,
            deleteSelectedRecords,
            filterLevel,
            filterStartDate,
            filterEndDate,
            filterArea,
            resetFilters,
            caseSectionExpanded,
            ruleSectionExpanded,
            toggleCaseSection,
            toggleRuleSection,
            caseForm,
            analysisExpanded,
            toggleAnalysis,
        };
    }
};