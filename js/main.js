// 主实验逻辑
// 控制实验流程、数据收集和界面交互

const Experiment = {
    // 当前实验状态
    state: {
        participantId: null,
        currentStage: 'consent',
        currentTrialIndex: 0,
        currentPart: null, // 'practice' 或 'formal'
        trialStartTime: null,
        experimentStartTime: null,
        ratings: [], // 存储所有试次的数据
        config: null,
        trialOrder: null, // 存储正式实验的试次顺序（随机化后的样品编号）
        allTrialsData: [] // 存储所有试次的完整数据（包括已保存的）
    },
    
    // 初始化
    init() {
        this.state.config = DataManager.getConfig();
        this.setupEventListeners();
        this.showStage('consent');
        this.loadInstructionContent();
    },
    
    // 设置事件监听
    setupEventListeners() {
        // 知情同意
        document.getElementById('consent-agree').addEventListener('click', () => {
            this.startExperiment();
        });
        
        document.getElementById('consent-disagree').addEventListener('click', () => {
            if (confirm('确定要退出实验吗？')) {
                window.close();
            }
        });
        
        // 开始练习
        document.getElementById('start-practice').addEventListener('click', () => {
            this.startPractice();
        });
        
        // 上一题按钮
        const prevBtn = document.getElementById('prev-trial');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.prevTrial();
            });
        }
        
        // 下一题按钮
        document.getElementById('next-trial').addEventListener('click', () => {
            this.nextTrial();
        });
        
        // 问卷提交
        document.getElementById('questionnaire-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitQuestionnaire();
        });
    },
    
    // 加载实验说明内容
    loadInstructionContent() {
        const config = this.state.config;
        const traitList = document.getElementById('trait-list');
        traitList.innerHTML = '';
        config.defaultTraits.forEach(trait => {
            const li = document.createElement('li');
            li.textContent = trait;
            traitList.appendChild(li);
        });
    },
    
    // 显示指定阶段
    showStage(stageName) {
        document.querySelectorAll('.stage').forEach(stage => {
            stage.classList.remove('active');
        });
        const targetStage = document.getElementById(`stage-${stageName}`);
        if (targetStage) {
            targetStage.classList.add('active');
            this.state.currentStage = stageName;
        }
    },
    
    // 开始实验
    startExperiment() {
        this.state.experimentStartTime = new Date().toISOString();
        this.state.participantId = DataManager.generateParticipantId();
        this.showStage('instruction');
    },
    
    // 开始练习
    startPractice() {
        this.state.currentPart = 'practice';
        this.state.currentTrialIndex = 0;
        this.state.allTrialsData = [];
        this.startTrial();
    },
    
    // 开始正式实验
    startFormalExperiment() {
        this.state.currentPart = 'formal';
        this.state.currentTrialIndex = 0;
        this.state.allTrialsData = [];
        
        // 生成随机化的样品顺序
        const config = this.state.config;
        const sampleCount = config.sampleCount || 12;
        const sampleIds = Array.from({length: sampleCount}, (_, i) => `S${i + 1}`);
        
        // Fisher-Yates洗牌算法
        for (let i = sampleIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sampleIds[i], sampleIds[j]] = [sampleIds[j], sampleIds[i]];
        }
        
        this.state.trialOrder = sampleIds;
        this.startTrial();
    },
    
    // 开始试次
    startTrial() {
        const images = DataManager.getImages();
        const config = this.state.config;
        
        let currentSampleId, currentImage;
        
        if (this.state.currentPart === 'practice') {
            // 练习试次：使用第一个样品（S1）
            currentSampleId = 'S1';
            const sampleImages = images.samples || {};
            currentImage = sampleImages[currentSampleId];
            if (!currentImage) {
                alert('错误：未找到练习图片（S1）。请确保resource文件夹中有s1.png文件。');
                return;
            }
        } else {
            // 正式实验：使用随机化后的样品顺序
            currentSampleId = this.state.trialOrder[this.state.currentTrialIndex];
            const sampleImages = images.samples || {};
            currentImage = sampleImages[currentSampleId];
            if (!currentImage) {
                alert(`错误：未找到样品 ${currentSampleId} 的图片。请确保resource文件夹中有对应的图片文件。`);
                return;
            }
        }
        
        // 显示试次界面
        this.showStage('trial');
        
        // 更新界面信息
        const trialTypeLabel = document.getElementById('trial-type-label');
        const progressText = document.getElementById('progress-text');
        
        if (this.state.currentPart === 'practice') {
            trialTypeLabel.textContent = '练习试次';
            progressText.textContent = '练习试次';
        } else {
            trialTypeLabel.textContent = '正式实验';
            const totalTrials = config.sampleCount || 12;
            progressText.textContent = `试次 ${this.state.currentTrialIndex + 1} / ${totalTrials}`;
        }
        
        // 隐藏/显示计时器（正式实验不显示计时器）
        const timerInfo = document.querySelector('.timer-info');
        if (timerInfo) {
            timerInfo.style.display = this.state.currentPart === 'practice' ? 'block' : 'none';
        }
        
        // 显示图片（currentImage.data现在是图片路径）
        const imgElement = document.getElementById('trial-image');
        imgElement.src = currentImage.data;
        imgElement.alt = currentImage.name;
        
        // 添加错误处理
        imgElement.onerror = () => {
            console.error(`图片加载失败: ${currentImage.data}`);
            alert(`图片加载失败：${currentImage.data}\n请确保resource文件夹中有对应的图片文件。`);
        };
        
        // 检查是否已有该试次的数据（用于"上一题"功能）
        const existingTrialData = this.state.allTrialsData[this.state.currentTrialIndex];
        
        // 初始化评分
        const savedRatings = existingTrialData ? existingTrialData.ratings : null;
        this.initRatings(config.defaultTraits, savedRatings);
        
        // 记录试次开始时间
        this.state.trialStartTime = Date.now();
        
        // 保存当前试次信息
        this.currentTrialData = {
            sampleId: currentSampleId,
            imageName: currentSampleId, // 使用样品编号作为图片名称
            imageId: currentImage.id,
            ratings: savedRatings || new Array(config.defaultTraits.length).fill(null),
            startTime: Date.now()
        };
        
        // 更新按钮状态
        this.updateButtonStates();
    },
    
    // 初始化评分界面
    initRatings(traits, savedRatings) {
        const container = document.getElementById('trait-ratings');
        container.innerHTML = '';
        
        traits.forEach((trait, index) => {
            const savedValue = savedRatings ? savedRatings[index] : null;
            const ratingItem = document.createElement('div');
            ratingItem.className = 'trait-rating-item';
            
            ratingItem.innerHTML = `
                <div class="trait-label">${trait}</div>
                <div class="likert-scale">
                    <div class="scale-labels">
                        <span>1 = 完全不符合</span>
                        <span>7 = 完全符合</span>
                    </div>
                    <div class="scale-points" data-trait-index="${index}">
                        ${[1, 2, 3, 4, 5, 6, 7].map(value => `
                            <div class="scale-point ${savedValue === value ? 'selected' : ''}" data-value="${value}">
                                <input type="radio" name="trait-${index}" value="${value}" id="trait-${this.state.currentTrialIndex}-${index}-${value}" ${savedValue === value ? 'checked' : ''}>
                                <label for="trait-${this.state.currentTrialIndex}-${index}-${value}">${value}</label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            container.appendChild(ratingItem);
        });
        
        // 为评分点添加点击事件
        container.querySelectorAll('.scale-point').forEach(point => {
            point.addEventListener('click', (e) => {
                const value = parseInt(point.dataset.value);
                const traitIndex = parseInt(point.closest('.scale-points').dataset.traitIndex);
                
                // 更新选中状态
                const points = point.parentElement.querySelectorAll('.scale-point');
                points.forEach(p => p.classList.remove('selected'));
                point.classList.add('selected');
                
                // 更新radio状态
                const radio = point.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
                
                // 更新数据
                if (this.currentTrialData) {
                    this.currentTrialData.ratings[traitIndex] = value;
                    
                    // 检查是否所有项目都已评分
                    this.checkRatingsComplete();
                }
            });
        });
        
        // 初始按钮状态
        this.checkRatingsComplete();
    },
    
    // 检查评分是否完成
    checkRatingsComplete() {
        if (!this.currentTrialData) return;
        
        const allRated = this.currentTrialData.ratings.every(r => r !== null);
        const nextBtn = document.getElementById('next-trial');
        if (nextBtn) {
            nextBtn.disabled = !allRated;
        }
    },
    
    // 更新按钮状态（上一题/下一题）
    updateButtonStates() {
        const prevBtn = document.getElementById('prev-trial');
        const nextBtn = document.getElementById('next-trial');
        
        if (this.state.currentPart === 'practice') {
            // 练习试次不显示上一题按钮
            if (prevBtn) prevBtn.style.display = 'none';
        } else {
            // 正式实验
            if (prevBtn) {
                prevBtn.style.display = this.state.currentTrialIndex > 0 ? 'block' : 'none';
            }
        }
    },
    
    // 保存当前试次数据
    saveCurrentTrial() {
        if (!this.currentTrialData) return;
        
        // 计算答题时长（秒）
        const duration = Math.round((Date.now() - this.currentTrialData.startTime) / 1000);
        this.currentTrialData.duration = duration;
        
        // 保存到allTrialsData
        this.state.allTrialsData[this.state.currentTrialIndex] = {...this.currentTrialData};
    },
    
    // 上一题
    prevTrial() {
        if (this.state.currentTrialIndex <= 0) return;
        
        // 保存当前试次数据
        this.saveCurrentTrial();
        
        // 回到上一题
        this.state.currentTrialIndex--;
        this.startTrial();
    },
    
    // 下一个试次
    nextTrial() {
        // 保存当前试次数据
        this.saveCurrentTrial();
        
        const config = this.state.config;
        
        if (this.state.currentPart === 'practice') {
            // 练习完成，开始正式实验
            if (confirm('练习完成！准备好开始正式实验了吗？')) {
                this.startFormalExperiment();
            }
        } else {
            // 正式实验
            const totalTrials = config.sampleCount || 12;
            this.state.currentTrialIndex++;
            
            if (this.state.currentTrialIndex >= totalTrials) {
                // 所有试次完成，进入问卷
                this.showStage('questionnaire');
                this.initQuestionnaire();
            } else {
                // 继续下一个试次
                this.startTrial();
            }
        }
    },
    
    // 初始化问卷
    initQuestionnaire() {
        const config = this.state.config;
        
        // 设置注意力检查题
        const attentionChecks = config.attentionChecks || [];
        
        if (attentionChecks.length > 0) {
            const check1 = attentionChecks[0];
            document.getElementById('attention-check-1-label').textContent = check1.question;
            const options1 = document.getElementById('attention-check-1-options');
            options1.innerHTML = '';
            check1.options.forEach((option, index) => {
                const radio = document.createElement('div');
                radio.className = 'radio-option';
                radio.innerHTML = `
                    <input type="radio" name="attention-check-1" value="${index}" id="ac1-${index}">
                    <label for="ac1-${index}">${option}</label>
                `;
                options1.appendChild(radio);
            });
        }
        
        if (attentionChecks.length > 1) {
            const check2 = attentionChecks[1];
            document.getElementById('attention-check-2-label').textContent = check2.question;
            const options2 = document.getElementById('attention-check-2-options');
            options2.innerHTML = '';
            check2.options.forEach((option, index) => {
                const radio = document.createElement('div');
                radio.className = 'radio-option';
                radio.innerHTML = `
                    <input type="radio" name="attention-check-2" value="${index}" id="ac2-${index}">
                    <label for="ac2-${index}">${option}</label>
                `;
                options2.appendChild(radio);
            });
        }
        
        // 设置开放性问题
        const openQuestions = config.openQuestions || [];
        if (openQuestions.length > 0) {
            const q1El = document.getElementById('open-question-1');
            if (q1El) {
                q1El.placeholder = openQuestions[0];
            }
        }
        if (openQuestions.length > 1) {
            const q2El = document.getElementById('open-question-2');
            if (q2El) {
                q2El.placeholder = openQuestions[1];
            }
        }
    },
    
    // 提交问卷
    submitQuestionnaire() {
        const form = document.getElementById('questionnaire-form');
        const formData = new FormData(form);
        
        const attentionCheck1Value = formData.get('attention-check-1');
        const attentionCheck2Value = formData.get('attention-check-2');
        
        const participantData = {
            participantId: this.state.participantId,
            startTime: this.state.experimentStartTime,
            endTime: new Date().toISOString(),
            age: formData.get('age'),
            gender: formData.get('gender'),
            attentionCheck1: attentionCheck1Value ? parseInt(attentionCheck1Value) : null,
            attentionCheck2: attentionCheck2Value ? parseInt(attentionCheck2Value) : null,
            openQuestion1: formData.get('open-question-1'),
            openQuestion2: formData.get('open-question-2'),
            trials: this.state.allTrialsData.filter(t => t && t.sampleId) // 排除练习数据
        };
        
        // 计算总时长
        const startTime = new Date(participantData.startTime);
        const endTime = new Date(participantData.endTime);
        participantData.totalDuration = Math.round((endTime - startTime) / 1000 / 60); // 分钟
        
        // 验证数据有效性
        const config = this.state.config;
        const validation = DataManager.validateData(participantData, config);
        participantData.isValid = validation.isValid;
        participantData.invalidReason = validation.invalidReason;
        
        // 保存数据
        DataManager.saveParticipantData(participantData);
        
        // 显示致谢页面
        this.showThanks();
    },
    
    // 显示致谢页面
    showThanks() {
        const config = this.state.config;
        const thanksMessage = config.thanksMessage || '感谢您的参与！您的数据已成功提交。';
        document.getElementById('thanks-message').textContent = thanksMessage;
        this.showStage('thanks');
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    Experiment.init();
});
