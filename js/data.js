// 数据管理模块
// 负责数据的存储、读取和导出

const DataManager = {
    // 获取配置
    getConfig() {
        const configStr = localStorage.getItem('experiment_config');
        return configStr ? JSON.parse(configStr) : Config;
    },
    
    // 保存配置
    saveConfig(config) {
        localStorage.setItem('experiment_config', JSON.stringify(config));
    },
    
    // 生成唯一ID
    generateParticipantId() {
        return 'P' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    // 获取所有数据
    getAllData() {
        const dataStr = localStorage.getItem('experiment_data');
        return dataStr ? JSON.parse(dataStr) : [];
    },
    
    // 保存单个被试数据
    saveParticipantData(data) {
        const allData = this.getAllData();
        allData.push(data);
        localStorage.setItem('experiment_data', JSON.stringify(allData));
    },
    
    // 获取图片素材（直接从resource文件夹加载）
    getImages() {
        // 直接从resource文件夹加载图片，不需要上传
        const samples = {};
        const sampleCount = 12;
        
        for (let i = 1; i <= sampleCount; i++) {
            const sampleId = `S${i}`;
            // resource文件夹中的文件名为s1.png, s2.png等（小写s）
            const imagePath = `resource/s${i}.png`;
            samples[sampleId] = {
                name: `样品${i}`,
                data: imagePath, // 使用图片路径而不是base64数据
                id: sampleId
            };
        }
        
        return {
            samples: samples
        };
    },
    
    // 清空所有数据
    clearAllData() {
        localStorage.removeItem('experiment_data');
        return true;
    },
    
    // 导出数据为CSV（新格式：被试ID→性别→年龄→样品编号1→5个题项得分→答题时长→...→样品编号12→...→总时长→注意力检查→有效性）
    exportToCSV(startDate, endDate) {
        const allData = this.getAllData();
        const config = this.getConfig();
        
        // 过滤日期范围
        let filteredData = allData;
        if (startDate || endDate) {
            filteredData = allData.filter(item => {
                const itemDate = new Date(item.startTime);
                if (startDate && itemDate < new Date(startDate)) return false;
                if (endDate && itemDate > new Date(endDate + ' 23:59:59')) return false;
                return true;
            });
        }
        
        // 获取题项名称
        const traits = config.defaultTraits || [];
        const traitDimensions = config.traitDimensions || {};
        
        // 构建CSV头部
        const headers = [
            '被试ID',
            '性别',
            '年龄'
        ];
        
        // 添加样品数据列（S1-S12，每个样品包含：样品编号、5个题项得分、答题时长）
        const sampleCount = config.sampleCount || 12;
        for (let i = 1; i <= sampleCount; i++) {
            headers.push(`样品编号${i}`);
            traits.forEach((trait, index) => {
                headers.push(`${trait}（题项得分）`);
            });
            headers.push(`样品${i}_答题时长(秒)`);
        }
        
        // 添加总时长、注意力检查、有效性
        headers.push('整体实验完成时长(分钟)');
        headers.push('注意力检查1答案');
        headers.push('注意力检查2答案');
        headers.push('数据有效性标记');
        headers.push('无效原因');
        
        // 构建CSV行
        const rows = filteredData.map(item => {
            const row = [
                item.participantId || '',
                item.gender || '',
                item.age || ''
            ];
            
            // 按样品编号顺序添加试次数据（需要重新排序）
            const trialsBySample = {};
            if (item.trials && item.trials.length > 0) {
                item.trials.forEach(trial => {
                    if (trial && trial.sampleId) {
                        trialsBySample[trial.sampleId] = trial;
                    }
                });
            }
            
            // 按S1-S12顺序添加数据
            for (let i = 1; i <= sampleCount; i++) {
                const sampleId = `S${i}`;
                const trial = trialsBySample[sampleId];
                
                if (trial) {
                    row.push(sampleId);
                    // 添加5个题项得分
                    traits.forEach((_, index) => {
                        row.push(trial.ratings && trial.ratings[index] ? trial.ratings[index] : '');
                    });
                    row.push(trial.duration || 0);
                } else {
                    // 该样品未完成
                    row.push('');
                    traits.forEach(() => row.push(''));
                    row.push('');
                }
            }
            
            // 添加总时长、注意力检查、有效性
            row.push(item.totalDuration || 0);
            row.push(item.attentionCheck1 !== null && item.attentionCheck1 !== undefined ? item.attentionCheck1 : '');
            row.push(item.attentionCheck2 !== null && item.attentionCheck2 !== undefined ? item.attentionCheck2 : '');
            row.push(item.isValid ? '有效' : '无效');
            row.push(item.invalidReason || '');
            
            return row;
        });
        
        // 转换为CSV格式
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => {
                // 处理包含逗号、引号或换行的字段
                if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
                    return '"' + cell.replace(/"/g, '""') + '"';
                }
                return cell;
            }).join(','))
        ].join('\n');
        
        // 添加BOM以支持中文
        const BOM = '\uFEFF';
        return BOM + csvContent;
    },
    
    // 导出数据为Excel（使用CSV格式，扩展名为.xlsx，实际是CSV）
    exportToExcel(startDate, endDate) {
        // 由于浏览器限制，我们使用CSV格式，但文件名使用.xlsx
        // 实际使用时Excel可以打开CSV文件
        return this.exportToCSV(startDate, endDate);
    },
    
    // 验证数据有效性（新版：8分钟阈值、连续同分判定）
    validateData(participantData, config) {
        let isValid = true;
        const reasons = [];
        
        // 检查答题时长（默认8分钟）
        const minDuration = (config.validation?.minDuration || 8) * 60 * 1000; // 转换为毫秒
        const totalDuration = new Date(participantData.endTime) - new Date(participantData.startTime);
        if (totalDuration < minDuration) {
            isValid = false;
            reasons.push('填写时间低于' + (config.validation?.minDuration || 8) + '分钟');
        }
        
        // 检查连续同分试次（默认连续3个及以上试次的所有题项同分）
        const maxConsecutiveSame = config.validation?.maxConsecutiveSameScore || 3;
        if (participantData.trials && participantData.trials.length > 0) {
            let consecutiveSameCount = 0;
            
            participantData.trials.forEach((trial) => {
                if (trial && trial.ratings && trial.ratings.length > 0) {
                    // 检查是否该试次的所有题项都相同（例如都是7分）
                    const firstRating = trial.ratings[0];
                    const allSame = trial.ratings.every(r => r === firstRating && r !== null && r !== undefined);
                    
                    if (allSame) {
                        consecutiveSameCount++;
                    } else {
                        consecutiveSameCount = 0; // 重置计数
                    }
                    
                    if (consecutiveSameCount >= maxConsecutiveSame) {
                        isValid = false;
                        if (!reasons.includes('连续' + maxConsecutiveSame + '个及以上试次的所有题项同分')) {
                            reasons.push('连续' + maxConsecutiveSame + '个及以上试次的所有题项同分');
                        }
                    }
                } else {
                    consecutiveSameCount = 0; // 重置计数
                }
            });
        }
        
        // 检查注意力检查题
        if (config.validation?.requireAttentionCheck) {
            const attentionChecks = config.attentionChecks || [];
            if (attentionChecks.length > 0 && attentionChecks[0].correct !== undefined) {
                const userAnswer = participantData.attentionCheck1;
                const correctAnswer = attentionChecks[0].correct;
                // 转换为数字进行比较（FormData返回的是字符串）
                if (userAnswer !== null && userAnswer !== undefined && parseInt(userAnswer) !== correctAnswer) {
                    isValid = false;
                    reasons.push('未通过注意力检查1');
                }
            }
            if (attentionChecks.length > 1 && attentionChecks[1].correct !== undefined) {
                const userAnswer = participantData.attentionCheck2;
                const correctAnswer = attentionChecks[1].correct;
                // 转换为数字进行比较
                if (userAnswer !== null && userAnswer !== undefined && parseInt(userAnswer) !== correctAnswer) {
                    isValid = false;
                    reasons.push('未通过注意力检查2');
                }
            }
        }
        
        return {
            isValid,
            invalidReason: reasons.join('; ')
        };
    }
};

