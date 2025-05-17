import { loadProviders, saveProviders, setActiveProvider, getApiConfig, refreshApiConfig, getGlobalTavilyApiKey, saveGlobalTavilyApiKey } from '../config.js';
import { showSuccess, showError, showWarning, showConfirm } from './notification.js';

// DOM 元素引用
let settingsModalOverlay = null;
let serviceProviderList = null;
let providerNameInput = null;
let providerBaseurlInput = null;
let providerKeyInput = null;
let tavilyApiKeyInput = null;
let modelsContainer = null;
let systemPromptTextarea = null;
let saveSettingsBtn = null;
let addProviderBtn = null;
let addModelBtn = null;
let cancelBtn = null;

// 状态管理
let providers = [];
let activeProviderId = '';
let currentEditingProvider = null;
let isNewProvider = false;

/**
 * 初始化密码可见性切换功能
 */
function initializePasswordVisibilityToggle() {
    const toggleIcons = document.querySelectorAll('.toggle-password-visibility');
    let visibilityTimers = {}; // 用于存储每个密码框的计时器ID

    toggleIcons.forEach(icon => {
        if (icon.dataset.listenerAttached === 'true') {
            const targetInputId = icon.dataset.target;
            const targetInput = document.getElementById(targetInputId);
            if (targetInput) {
                if (targetInput.type === "password") {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                    icon.title = "显示密码";
                } else {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                    icon.title = "隐藏密码";
                }
            }
            return;
        }
        icon.dataset.listenerAttached = 'true';

        icon.addEventListener('click', function () {
            const targetInputId = this.dataset.target;
            const targetInput = document.getElementById(targetInputId);

            if (targetInput) {
                // 清除可能存在的旧计时器
                if (visibilityTimers[targetInputId]) {
                    clearTimeout(visibilityTimers[targetInputId]);
                    delete visibilityTimers[targetInputId];
                }

                if (targetInput.type === "password") {
                    targetInput.type = "text";
                    this.classList.remove('fa-eye');
                    this.classList.add('fa-eye-slash');
                    this.title = "隐藏密码";

                    // 启动1秒后自动隐藏的计时器
                    visibilityTimers[targetInputId] = setTimeout(() => {
                        if (targetInput.type === "text") { // 再次检查，以防用户手动改回
                            targetInput.type = "password";
                            this.classList.remove('fa-eye-slash');
                            this.classList.add('fa-eye');
                            this.title = "显示密码";
                        }
                        delete visibilityTimers[targetInputId];
                    }, 1000); // 1000毫秒 = 1秒

                } else {
                    targetInput.type = "password";
                    this.classList.remove('fa-eye-slash');
                    this.classList.add('fa-eye');
                    this.title = "显示密码";
                    // 如果是从text切回password，也清除计时器（虽然上面已经清了，双重保险）
                    if (visibilityTimers[targetInputId]) {
                        clearTimeout(visibilityTimers[targetInputId]);
                        delete visibilityTimers[targetInputId];
                    }
                }
            }
        });
        const initialTargetInput = document.getElementById(icon.dataset.target);
        if (initialTargetInput && initialTargetInput.type === "password") {
             icon.title = "显示密码";
        } else if (initialTargetInput) {
             icon.title = "隐藏密码";
        }
    });
}

/**
 * 初始化设置管理器
 */
export function initializeSettingsManager() {
    // 获取DOM元素
    settingsModalOverlay = document.getElementById('settings-modal-overlay');
    serviceProviderList = document.getElementById('service-provider-list');
    providerNameInput = document.getElementById('provider-name');
    providerBaseurlInput = document.getElementById('provider-baseurl');
    providerKeyInput = document.getElementById('provider-key');
    tavilyApiKeyInput = document.getElementById('tavily-api-key');
    modelsContainer = document.getElementById('models-container');
    systemPromptTextarea = document.getElementById('system-prompt');
    saveSettingsBtn = document.getElementById('save-settings-btn');
    addProviderBtn = document.getElementById('add-provider-btn');
    addModelBtn = document.getElementById('add-model-btn');
    cancelBtn = document.getElementById('settings-modal-cancel-btn');
    
    // 检查元素是否存在
    if (!settingsModalOverlay || !serviceProviderList || !providerNameInput || 
        !providerBaseurlInput || !providerKeyInput || !tavilyApiKeyInput || !modelsContainer || 
        !systemPromptTextarea || !saveSettingsBtn || !addProviderBtn || 
        !addModelBtn || !cancelBtn) {
        console.error('设置管理器初始化失败：部分DOM元素未找到');
        return false;
    }
    
    // 绑定事件
    addEventListeners();
    
    // 加载初始数据
    loadInitialData();
    
    console.log('设置管理器初始化成功');
    return true;
}

/**
 * 加载初始配置数据
 */
function loadInitialData() {
    const result = loadProviders();
    providers = result.providers;
    activeProviderId = result.activeProviderId;
    
    // 加载并显示全局Tavily API Key
    tavilyApiKeyInput.value = getGlobalTavilyApiKey(); 
    
    refreshProviderList();
}

/**
 * 添加所有事件监听器
 */
function addEventListeners() {
    // 打开设置按钮
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettingsModal);
    }
    
    // 保存设置
    saveSettingsBtn.addEventListener('click', saveSettings);
    
    // 取消按钮
    cancelBtn.addEventListener('click', hideSettingsModal);
    
    // 添加服务商
    addProviderBtn.addEventListener('click', createNewProvider);
    
    // 添加模型
    addModelBtn.addEventListener('click', () => addModel());
}

/**
 * 显示设置模态框
 */
export function showSettingsModal() {
    loadInitialData(); // 刷新数据，包括加载全局 Tavily Key 到输入框
    settingsModalOverlay.classList.add('visible');
    initializePasswordVisibilityToggle(); 
}

/**
 * 隐藏设置模态框
 */
export function hideSettingsModal() {
    if (isNewProvider && currentEditingProvider) {
        // 如果是新服务商且未保存（比如用户直接点取消），则从列表移除
        // 一个简单的判断：如果名称还是初始的"（新服务商）"，则认为是未完成的
        if (currentEditingProvider.name === '（新服务商）' && !providerNameInput.value.trim()) {
             const index = providers.findIndex(p => p.id === currentEditingProvider.id);
             if (index !== -1) {
                 providers.splice(index, 1);
                 console.log("移除未保存的新服务商:", currentEditingProvider.id);
                 // 如果移除的是当前唯一的activeProviderId，需要重置activeProviderId
                 if (activeProviderId === currentEditingProvider.id) {
                    activeProviderId = providers.length > 0 ? providers[0].id : '';
                 }
                 refreshProviderList(); // 刷新列表
             }
        }
    }
    isNewProvider = false; // 重置标志
    settingsModalOverlay.classList.remove('visible');
    // clearProviderForm(); // 清空表单 - 在下次打开时会由 loadProviderDetails 填充

    refreshApiConfig();
    console.log('关闭设置模态框，已刷新API配置');
}

/**
 * 刷新服务商列表
 */
function refreshProviderList() {
    // 清空列表
    serviceProviderList.innerHTML = '';
    
    // 没有服务商时显示提示
    if (providers.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'service-provider-item empty';
        emptyItem.textContent = '没有服务商，请添加一个';
        serviceProviderList.appendChild(emptyItem);
        
        // 隐藏表单区域
        document.querySelector('.provider-details-container').style.display = 'none';
        return;
    }
    
    // 显示表单区域
    document.querySelector('.provider-details-container').style.display = 'block';
    
    // 添加所有服务商
    providers.forEach(provider => {
        const item = document.createElement('li');
        item.className = 'service-provider-item';
        if (provider.id === activeProviderId) {
            item.classList.add('active');
        }
        item.setAttribute('data-id', provider.id);
        
        // 服务商名称
        const nameSpan = document.createElement('span');
        nameSpan.className = 'provider-name';
        nameSpan.textContent = provider.name;
        
        // 服务商操作按钮
        const actions = document.createElement('div');
        actions.className = 'provider-actions';
        
        // 删除按钮（只有多个服务商时才显示）
        if (providers.length > 1) {
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'model-action-btn delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.setAttribute('title', '删除服务商');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteProvider(provider.id);
            });
            actions.appendChild(deleteBtn);
        }
        
        item.appendChild(nameSpan);
        item.appendChild(actions);
        
        // 点击加载服务商详情
        item.addEventListener('click', () => loadProviderDetails(provider.id));
        
        serviceProviderList.appendChild(item);
    });
    
    // 如果没有选中的服务商或者选中的服务商不在列表中，默认选择第一个
    if (!activeProviderId || !providers.find(p => p.id === activeProviderId)) {
        activeProviderId = providers[0].id;
    }
    
    // 加载选中的服务商详情
    loadProviderDetails(activeProviderId);
}

/**
 * 加载服务商详情到表单
 * @param {string} providerId 服务商ID
 */
function loadProviderDetails(providerId) {
    // 更新活动状态
    activeProviderId = providerId;
    
    // 更新列表UI
    document.querySelectorAll('.service-provider-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-id') === providerId) {
            item.classList.add('active');
        }
    });
    
    // 获取服务商数据
    currentEditingProvider = providers.find(p => p.id === providerId);
    if (!currentEditingProvider) {
        console.error('未找到服务商:', providerId);
        return;
    }
    
    isNewProvider = false; // 设置为编辑模式
    
    // 填充表单
    providerNameInput.value = currentEditingProvider.name || '';
    providerBaseurlInput.value = currentEditingProvider.baseurl || '';
    providerKeyInput.value = currentEditingProvider.key || '';
    systemPromptTextarea.value = currentEditingProvider.system_prompt || '';
    
    // 刷新模型列表
    refreshModelsList(currentEditingProvider.models || []);
}

/**
 * 刷新模型列表
 * @param {Array} models 模型列表
 */
function refreshModelsList(models) {
    modelsContainer.innerHTML = '';
    
    if (models.length === 0) {
        const emptyText = document.createElement('div');
        emptyText.className = 'empty-models-text';
        emptyText.textContent = '没有模型，请添加一个';
        modelsContainer.appendChild(emptyText);
        return;
    }
    
    models.forEach((model, index) => {
        const modelItem = document.createElement('div');
        modelItem.className = 'model-item';
        modelItem.setAttribute('data-id', model.id);
        
        // 模型选择单选按钮
        const radioLabel = document.createElement('label');
        radioLabel.className = 'model-radio-label';
        
        const radioInput = document.createElement('input');
        radioInput.type = 'radio';
        radioInput.name = 'active-model';
        radioInput.value = model.id;
        radioInput.checked = model.isActive;
        radioInput.addEventListener('change', () => {
            // 更新模型激活状态
            if (radioInput.checked) {
                models.forEach(m => m.isActive = (m.id === model.id));
            }
        });
        
        const modelName = document.createElement('span');
        modelName.textContent = model.name;
        
        radioLabel.appendChild(radioInput);
        radioLabel.appendChild(modelName);
        
        // 模型操作按钮
        const actions = document.createElement('div');
        actions.className = 'model-actions';
        
        // 编辑按钮
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'model-action-btn edit-btn';
        editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
        editBtn.setAttribute('title', '编辑模型');
        editBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            // 创建自定义编辑模型输入框
            const inputOverlay = document.createElement('div');
            inputOverlay.className = 'modal-overlay';
            inputOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 26000; /* 提高层级，确保显示在设置模态框之上 */
                opacity: 0;
                transition: opacity 0.3s;
            `;
            
            const inputDialog = document.createElement('div');
            inputDialog.className = 'input-dialog';
            inputDialog.style.cssText = `
                background-color: #fff;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                width: 100%;
                max-width: 350px;
                padding: 24px;
                transform: scale(0.9);
                transition: transform 0.3s;
            `;
            
            inputDialog.innerHTML = `
                <h3 style="margin-top: 0; margin-bottom: 16px; color: #333; font-size: 18px;">编辑模型名称</h3>
                <input type="text" id="model-name-input" value="${model.name}" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    margin-bottom: 20px;
                    font-size: 14px;
                    box-sizing: border-box;
                ">
                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button class="cancel-btn" style="
                        padding: 8px 16px;
                        border: 1px solid #ddd;
                        background-color: #f5f5f5;
                        color: #666;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background-color 0.2s;
                    ">取消</button>
                    <button class="confirm-btn" style="
                        padding: 8px 16px;
                        border: none;
                        background-color: #0d6efd;
                        color: white;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background-color 0.2s;
                    ">确定</button>
                </div>
            `;
            
            inputOverlay.appendChild(inputDialog);
            document.body.appendChild(inputOverlay);
            
            // 触发重绘并显示
            setTimeout(() => {
                inputOverlay.style.opacity = '1';
                inputDialog.style.transform = 'scale(1)';
                
                // 自动聚焦输入框
                const input = document.getElementById('model-name-input');
                if (input) input.focus();
            }, 10);
            
            // 添加按钮事件
            const confirmBtn = inputDialog.querySelector('.confirm-btn');
            const cancelBtn = inputDialog.querySelector('.cancel-btn');
            const nameInput = inputDialog.querySelector('#model-name-input');
            
            // 关闭对话框函数
            const closeDialog = (save) => {
                inputOverlay.style.opacity = '0';
                inputDialog.style.transform = 'scale(0.9)';
                
                setTimeout(() => {
                    document.body.removeChild(inputOverlay);
                    
                    // 保存修改
                    if (save) {
                        const newName = nameInput.value.trim();
                        if (newName) {
                            model.name = newName;
                            refreshModelsList(models);
                        } else {
                            showWarning('模型名称不能为空');
                        }
                    }
                }, 300);
            };
            
            // 添加事件监听器
            confirmBtn.addEventListener('click', () => closeDialog(true));
            cancelBtn.addEventListener('click', () => closeDialog(false));
            
            // 添加按钮悬停样式
            confirmBtn.addEventListener('mouseover', () => {
                confirmBtn.style.backgroundColor = '#0b5ed7';
            });
            confirmBtn.addEventListener('mouseout', () => {
                confirmBtn.style.backgroundColor = '#0d6efd';
            });
            
            cancelBtn.addEventListener('mouseover', () => {
                cancelBtn.style.backgroundColor = '#e9e9e9';
            });
            cancelBtn.addEventListener('mouseout', () => {
                cancelBtn.style.backgroundColor = '#f5f5f5';
            });
            
            // 处理回车键提交
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    closeDialog(true);
                }
            });
        });
        
        // 删除按钮（至少保留一个模型）
        if (models.length > 1) {
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'model-action-btn delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.setAttribute('title', '删除模型');
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                
                // 使用自定义确认对话框
                const confirmed = await showConfirm({
                    title: '删除模型',
                    message: `确定要删除模型"${model.name}"吗？`,
                    confirmText: '删除',
                    cancelText: '取消'
                });
                
                if (confirmed) {
                    // 如果删除的是激活的模型，自动选择第一个模型
                    if (model.isActive && models.length > 1) {
                        const nextActiveIndex = index === 0 ? 1 : 0;
                        models[nextActiveIndex].isActive = true;
                    }
                    
                    // 从模型列表中移除
                    models.splice(index, 1);
                    refreshModelsList(models);
                }
            });
            actions.appendChild(deleteBtn);
        }
        
        actions.appendChild(editBtn);
        
        modelItem.appendChild(radioLabel);
        modelItem.appendChild(actions);
        
        modelsContainer.appendChild(modelItem);
    });
}

/**
 * 添加新模型
 * @param {string} [initialName] 初始名称
 */
function addModel(initialName = '') {
    if (!currentEditingProvider) {
        showWarning('请先选择或创建一个服务商');
        return;
    }
    
    // 创建自定义输入对话框
    const inputOverlay = document.createElement('div');
    inputOverlay.className = 'modal-overlay';
    inputOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 26000; /* 提高层级，确保显示在设置模态框之上 */
        opacity: 0;
        transition: opacity 0.3s;
    `;
    
    const inputDialog = document.createElement('div');
    inputDialog.className = 'input-dialog';
    inputDialog.style.cssText = `
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        width: 100%;
        max-width: 350px;
        padding: 24px;
        transform: scale(0.9);
        transition: transform 0.3s;
    `;
    
    inputDialog.innerHTML = `
        <h3 style="margin-top: 0; margin-bottom: 16px; color: #333; font-size: 18px;">添加新模型</h3>
        <input type="text" id="new-model-name-input" value="${initialName}" placeholder="请输入模型名称" style="
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 20px;
            font-size: 14px;
            box-sizing: border-box;
        ">
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <button class="cancel-btn" style="
                padding: 8px 16px;
                border: 1px solid #ddd;
                background-color: #f5f5f5;
                color: #666;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s;
            ">取消</button>
            <button class="confirm-btn" style="
                padding: 8px 16px;
                border: none;
                background-color: #0d6efd;
                color: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s;
            ">添加</button>
        </div>
    `;
    
    inputOverlay.appendChild(inputDialog);
    document.body.appendChild(inputOverlay);
    
    // 触发重绘并显示
    setTimeout(() => {
        inputOverlay.style.opacity = '1';
        inputDialog.style.transform = 'scale(1)';
        
        // 自动聚焦输入框
        const input = document.getElementById('new-model-name-input');
        if (input) input.focus();
    }, 10);
    
    // 添加按钮事件
    const confirmBtn = inputDialog.querySelector('.confirm-btn');
    const cancelBtn = inputDialog.querySelector('.cancel-btn');
    const nameInput = inputDialog.querySelector('#new-model-name-input');
    
    // 关闭对话框函数
    const closeDialog = (add) => {
        inputOverlay.style.opacity = '0';
        inputDialog.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            document.body.removeChild(inputOverlay);
            
            // 添加新模型
            if (add) {
                const modelName = nameInput.value.trim();
                if (modelName) {
                    // 确保models数组存在
                    if (!currentEditingProvider.models) {
                        currentEditingProvider.models = [];
                    }
                    
                    // 创建新模型
                    const newModel = {
                        id: 'model_' + Date.now(),
                        name: modelName,
                        isActive: currentEditingProvider.models.length === 0 // 如果是第一个模型，自动设为激活
                    };
                    
                    // 添加到列表
                    currentEditingProvider.models.push(newModel);
                    
                    // 刷新UI
                    refreshModelsList(currentEditingProvider.models);
                } else {
                    showWarning('模型名称不能为空');
                }
            }
        }, 300);
    };
    
    // 添加事件监听器
    confirmBtn.addEventListener('click', () => closeDialog(true));
    cancelBtn.addEventListener('click', () => closeDialog(false));
    
    // 添加按钮悬停样式
    confirmBtn.addEventListener('mouseover', () => {
        confirmBtn.style.backgroundColor = '#0b5ed7';
    });
    confirmBtn.addEventListener('mouseout', () => {
        confirmBtn.style.backgroundColor = '#0d6efd';
    });
    
    cancelBtn.addEventListener('mouseover', () => {
        cancelBtn.style.backgroundColor = '#e9e9e9';
    });
    cancelBtn.addEventListener('mouseout', () => {
        cancelBtn.style.backgroundColor = '#f5f5f5';
    });
    
    // 处理回车键提交
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            closeDialog(true);
        }
    });
}

/**
 * 创建新的服务商
 */
function createNewProvider() {
    const newProviderId = 'provider_' + Date.now();
    currentEditingProvider = {
        id: newProviderId,
        name: '（新服务商）',
        baseurl: '',
        key: '',
        system_prompt: getApiConfig().system_prompt || '',
        models: []
    };

    isNewProvider = true;
    providers.push(currentEditingProvider);
    activeProviderId = newProviderId;
    refreshProviderList(); 
    clearProviderForm(true);
    providerNameInput.value = currentEditingProvider.name; 
    providerNameInput.focus();
    providerNameInput.select();
    console.log("创建新服务商，已添加到列表:", currentEditingProvider);
}

/**
 * 删除服务商
 * @param {string} providerId 服务商ID
 */
async function deleteProvider(providerId) {
    if (providers.length <= 1) {
        showWarning('至少需要保留一个服务商');
        return;
    }
    
    // 使用自定义确认对话框
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;
    
    const confirmed = await showConfirm({
        title: '删除服务商',
        message: `确定要删除服务商"${provider.name}"吗？`,
        confirmText: '删除',
        cancelText: '取消'
    });
    
    if (confirmed) {
        // 从列表中移除
        const index = providers.findIndex(p => p.id === providerId);
        if (index !== -1) {
            providers.splice(index, 1);
        }
        
        // 如果删除的是当前选中的服务商，自动选择第一个
        if (providerId === activeProviderId) {
            activeProviderId = providers[0].id;
        }
        
        // 刷新列表
        refreshProviderList();
    }
}

/**
 * 清空服务商表单
 * @param {boolean} forNewProvider - 是否为新服务商清空
 */
function clearProviderForm(forNewProvider = false) {
    providerNameInput.value = forNewProvider ? providerNameInput.value : '';
    providerBaseurlInput.value = '';
    providerKeyInput.value = '';
    systemPromptTextarea.value = getApiConfig().system_prompt || '';
    modelsContainer.innerHTML = ''; 
    if (currentEditingProvider && !forNewProvider) { 
        currentEditingProvider.models = [];
    }
}

/**
 * 保存设置
 */
function saveSettings() {
    if (!currentEditingProvider && !isNewProvider) { // currentEditingProvider 可能在新服务商流程中被设置
        // 如果没有当前编辑的服务商，并且也不是正在创建新服务商后首次保存的流程
        // (额外判断isNewProvider是为了确保新服务商的保存流程能继续)
        // 实际上，除非用户在没有选择任何服务商的情况下（例如列表为空时）能触发保存，否则此情况较少。
        // 但作为防御性编程，如果 settings 表单是可见的，至少全局 Tavily key 应该可以保存。
        const globalTavilyToSave = tavilyApiKeyInput.value.trim();
        if (!globalTavilyToSave) {
            showWarning('请输入Tavily API密钥');
            tavilyApiKeyInput.focus();
            return;
        }
        saveGlobalTavilyApiKey(globalTavilyToSave);
        hideSettingsModal();
        showSuccess('全局 Tavily API 密钥已保存');
        return;
    }

    // 如果是服务商相关的保存：
    const currentModelsInForm = currentEditingProvider ? (currentEditingProvider.models || []) : [];
    if (!validateForm(currentModelsInForm)) return; // validateForm 内部也需要调整对 Tavily Key 的处理

    // 保存全局 Tavily Key
    saveGlobalTavilyApiKey(tavilyApiKeyInput.value.trim());

    // 更新服务商（不含Tavily Key）
    updateCurrentProvider(currentModelsInForm);
    
    saveProviders(providers, activeProviderId);
    setActiveProvider(activeProviderId);
    
    isNewProvider = false;
    refreshProviderList();
    hideSettingsModal();
    showSuccess('设置已保存');
}

/**
 * 验证表单
 * @param {Array} modelsToValidate - 需要验证的模型数组
 * @returns {boolean} 表单是否有效
 */
function validateForm(modelsToValidate) {
    if (!providerNameInput.value.trim()) {
        showWarning('请输入服务商名称');
        providerNameInput.focus();
        return false;
    }
    
    if (!providerBaseurlInput.value.trim()) {
        showWarning('请输入API基础URL');
        providerBaseurlInput.focus();
        return false;
    }
    
    if (!providerKeyInput.value.trim()) {
        showWarning('请输入API密钥');
        providerKeyInput.focus();
        return false;
    }
    
    // 全局 Tavily API Key 验证
    if (!tavilyApiKeyInput.value.trim()) { // 现在总是检查这个输入框，因为它代表全局key
        showWarning('请输入Tavily API密钥');
        tavilyApiKeyInput.focus();
        return false;
    }

    if (!currentEditingProvider) { // 如果没有选中服务商（例如列表为空时，理论上不应能到这一步保存服务商）
        // 但如果能到，且只保存全局Tavily Key，则模型验证跳过
        return true; // 假设这种情况下只保存Tavily Key
    }

    if (!modelsToValidate || modelsToValidate.length === 0) {
        showWarning('请至少添加一个模型');
        return false;
    }
    if (!modelsToValidate.some(m => m.isActive)) {
        showWarning('请选择一个活动模型');
        return false;
    }
    return true;
}

/**
 * 更新当前编辑的服务商 (不再包含 Tavily Key)
 * @param {Array} modelsInForm - 表单中当前的模型配置
 */
function updateCurrentProvider(modelsInForm) {
    if (!currentEditingProvider) return;
    currentEditingProvider.name = providerNameInput.value.trim();
    currentEditingProvider.baseurl = providerBaseurlInput.value.trim();
    currentEditingProvider.key = providerKeyInput.value.trim();
    currentEditingProvider.system_prompt = systemPromptTextarea.value.trim();
    currentEditingProvider.models = modelsInForm;
}

/**
 * 获取当前活动服务商的Tavily API密钥 (现在从全局获取)
 * @returns {string} Tavily API密钥
 */
export function getTavilyApiKey() {
    return getGlobalTavilyApiKey(); // 直接调用 config.js 中的新函数
} 