// 管理员后台逻辑
// 处理素材管理、配置管理、数据导出等功能

const Admin = {
    // 初始化
    init() {
        this.checkLogin();
        this.setupEventListeners();
        this.loadConfig();
        this.updateStats();
        this.updateDataPreview();
    },
    
    // 检查登录状态（已移除登录验证，直接进入后台）
    checkLogin() {
        // 直接显示后台，无需登录验证
        this.showDashboard();
    },
    
    // 显示登录界面
    showLogin() {
        document.getElementById('admin-login').classList.add('active');
        document.getElementById('admin-dashboard').classList.remove('active');
    },
    
    // 显示后台主界面
    showDashboard() {
        document.getElementById('admin-login').classList.remove('active');
        document.getElementById('admin-dashboard').classList.add('active');
    },
    
    // 设置事件监听
    setupEventListeners() {
        // 登录表单（已禁用，不再需要登录）
        // document.getElementById('login-form').addEventListener('submit', (e) => {
        //     e.preventDefault();
        //     this.handleLogin();
        // });
        
        // 标签页切换
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });
        
        // 保存配置
        document.getElementById('save-config').addEventListener('click', () => {
            this.saveConfig();
        });
        
        // 数据导出
        document.getElementById('export-data').addEventListener('click', () => {
            this.exportData('csv');
        });
        
        document.getElementById('export-excel').addEventListener('click', () => {
            this.exportData('excel');
        });
        
        // 清空数据
        document.getElementById('clear-data').addEventListener('click', () => {
            if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
                DataManager.clearAllData();
                alert('数据已清空');
                this.updateDataPreview();
                this.updateStats();
            }
        });
    },
    
    // 处理登录
    handleLogin() {
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;
        
        const config = DataManager.getConfig();
        const adminConfig = config.admin || { username: 'admin', password: 'admin123' };
        
        if (username === adminConfig.username && password === adminConfig.password) {
            sessionStorage.setItem('admin_logged_in', 'true');
            this.showDashboard();
        } else {
            alert('用户名或密码错误');
        }
    },
    
    // 切换标签页
    switchTab(tabName) {
        // 更新按钮状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // 更新内容区域
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        // 如果切换到数据管理，更新预览
        if (tabName === 'data') {
            this.updateDataPreview();
        }
    },
    
    // 素材管理功能已移除，图片直接从resource文件夹加载
    
    // 加载配置
    loadConfig() {
        const config = DataManager.getConfig();
        
        // 人格特质
        const traitEditor = document.getElementById('trait-editor');
        traitEditor.innerHTML = '';
        config.defaultTraits.forEach((trait, index) => {
            const item = document.createElement('div');
            item.className = 'trait-input-item';
            item.innerHTML = `
                <label>特质${index + 1}：</label>
                <input type="text" class="trait-input" data-index="${index}" value="${trait}">
            `;
            traitEditor.appendChild(item);
        });
        
        // 注意力检查题
        const attentionChecks = config.attentionChecks || [];
        if (attentionChecks.length > 0) {
            document.getElementById('attention-q1').value = attentionChecks[0].question || '';
            this.renderAttentionOptions('attention-q1-options', attentionChecks[0].options || [], 0);
        } else {
            // 如果没有配置，使用默认值
            document.getElementById('attention-q1').value = '为了确保您认真参与实验，请选择"非常同意"';
            this.renderAttentionOptions('attention-q1-options', [], 0);
        }
        if (attentionChecks.length > 1) {
            document.getElementById('attention-q2').value = attentionChecks[1].question || '';
            this.renderAttentionOptions('attention-q2-options', attentionChecks[1].options || [], 1);
        } else {
            // 如果没有配置，使用默认值
            document.getElementById('attention-q2').value = '在本次实验中，您看到的主要是：';
            this.renderAttentionOptions('attention-q2-options', [], 1);
        }
        
        // 开放性问题
        const openQuestions = config.openQuestions || [];
        document.getElementById('open-question-1-text').value = openQuestions[0] || '';
        document.getElementById('open-question-2-text').value = openQuestions[1] || '';
        
        // 致谢信息
        document.getElementById('thanks-message-text').value = config.thanksMessage || '';
        
        // 最短完成时长
        document.getElementById('min-duration').value = (config.validation && config.validation.minDuration) || 8;
        
        // 连续同分试次阈值
        document.getElementById('max-consecutive-same').value = (config.validation && config.validation.maxConsecutiveSameScore) || 3;
    },
    
    // 渲染注意力检查题选项
    renderAttentionOptions(containerId, options, questionIndex) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        if (!options || options.length === 0) {
            // 默认选项
            const defaultOptions = questionIndex === 0 
                ? ['非常不同意', '不同意', '有点不同意', '中立', '有点同意', '同意', '非常同意']
                : ['风景图片', '文字描述', '虚拟角色图片', '几何图形'];
            options = defaultOptions;
        }
        
        options.forEach((option, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'attention-option-wrapper';
            wrapper.style.display = 'flex';
            wrapper.style.gap = '10px';
            wrapper.style.marginBottom = '10px';
            wrapper.style.alignItems = 'center';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'attention-option-input';
            input.value = option;
            input.placeholder = `选项${index + 1}`;
            input.dataset.questionIndex = questionIndex;
            input.dataset.optionIndex = index;
            input.style.flex = '1';
            input.style.padding = '8px';
            input.style.border = '1px solid #ddd';
            input.style.borderRadius = '4px';
            
            wrapper.appendChild(input);
            container.appendChild(wrapper);
        });
    },
    
    // 保存配置
    saveConfig() {
        const config = DataManager.getConfig();
        
        // 保存人格特质
        const traitInputs = document.querySelectorAll('.trait-input');
        config.defaultTraits = Array.from(traitInputs).map(input => input.value);
        
        // 保存注意力检查题
        const q1 = document.getElementById('attention-q1').value;
        const q1Options = Array.from(document.querySelectorAll('[data-question-index="0"]'))
            .map(input => input.value.trim()).filter(v => v);
        const q2 = document.getElementById('attention-q2').value;
        const q2Options = Array.from(document.querySelectorAll('[data-question-index="1"]'))
            .map(input => input.value.trim()).filter(v => v);
        
        config.attentionChecks = [];
        if (q1 && q1Options.length > 0) {
            // 第一题默认正确答案是最后一个选项（非常同意）
            config.attentionChecks.push({
                question: q1,
                options: q1Options,
                correct: q1Options.length - 1
            });
        }
        if (q2 && q2Options.length > 0) {
            // 第二题默认正确答案是"虚拟角色图片"（索引2，如果存在）
            const correctIndex = q2Options.findIndex(opt => opt.includes('虚拟角色') || opt.includes('角色图片'));
            config.attentionChecks.push({
                question: q2,
                options: q2Options,
                correct: correctIndex >= 0 ? correctIndex : 0
            });
        }
        
        // 保存开放性问题
        const openQ1 = document.getElementById('open-question-1-text').value;
        const openQ2 = document.getElementById('open-question-2-text').value;
        config.openQuestions = [];
        if (openQ1) config.openQuestions.push(openQ1);
        if (openQ2) config.openQuestions.push(openQ2);
        
        // 保存致谢信息
        config.thanksMessage = document.getElementById('thanks-message-text').value;
        
        // 保存有效性判定标准
        if (!config.validation) {
            config.validation = {};
        }
        config.validation.minDuration = parseInt(document.getElementById('min-duration').value) || 8;
        config.validation.maxConsecutiveSameScore = parseInt(document.getElementById('max-consecutive-same').value) || 3;
        
        // 保存到localStorage
        DataManager.saveConfig(config);
        
        alert('配置已保存！');
    },
    
    // 导出数据
    exportData(format) {
        const startDate = document.getElementById('export-start-date').value;
        const endDate = document.getElementById('export-end-date').value;
        
        let csvContent;
        if (format === 'excel') {
            csvContent = DataManager.exportToExcel(startDate, endDate);
        } else {
            csvContent = DataManager.exportToCSV(startDate, endDate);
        }
        
        // 创建下载链接
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `实验数据_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },
    
    // 更新统计信息
    updateStats() {
        const allData = DataManager.getAllData();
        
        const total = allData.length;
        const valid = allData.filter(d => d.isValid).length;
        const invalid = total - valid;
        
        const totalDuration = allData.reduce((sum, d) => sum + (d.totalDuration || 0), 0);
        const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0;
        
        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-valid').textContent = valid;
        document.getElementById('stat-invalid').textContent = invalid;
        document.getElementById('stat-avg-duration').textContent = `${avgDuration} 分钟`;
    },
    
    // 更新数据预览
    updateDataPreview() {
        const allData = DataManager.getAllData();
        const recentData = allData.slice(-10).reverse(); // 最近10条
        
        const container = document.getElementById('data-table-container');
        
        if (recentData.length === 0) {
            container.innerHTML = '<p style="color: #7f8c8d;">暂无数据</p>';
            return;
        }
        
        const table = document.createElement('table');
        table.className = 'data-table';
        
        // 表头
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>被试ID</th>
                <th>时间</th>
                <th>年龄</th>
                <th>性别</th>
                <th>时长(分钟)</th>
                <th>试次数</th>
                <th>有效性</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // 表体
        const tbody = document.createElement('tbody');
        recentData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.participantId || ''}</td>
                <td>${new Date(item.startTime).toLocaleString('zh-CN')}</td>
                <td>${item.age || ''}</td>
                <td>${item.gender || ''}</td>
                <td>${item.totalDuration || 0}</td>
                <td>${item.trials ? item.trials.length : 0}</td>
                <td>${item.isValid ? '<span style="color: green;">有效</span>' : '<span style="color: red;">无效</span>'}</td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        
        container.innerHTML = '';
        container.appendChild(table);
        
        // 同时更新统计信息
        this.updateStats();
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    Admin.init();
});

