import { loadProviders, saveProviders, setActiveProvider, getApiConfig, refreshApiConfig } from '../config.js';

// DOM 元素引用
let settingsModalOverlay = null;
let serviceProviderList = null;
let providerNameInput = null;
let providerBaseurlInput = null;
let providerKeyInput = null;
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
 * 初始化设置管理器
 */
export function initializeSettingsManager() {
    // 获取DOM元素
    settingsModalOverlay = document.getElementById('settings-modal-overlay');
    serviceProviderList = document.getElementById('service-provider-list');
    providerNameInput = document.getElementById('provider-name');
    providerBaseurlInput = document.getElementById('provider-baseurl');
    providerKeyInput = document.getElementById('provider-key');
    modelsContainer = document.getElementById('models-container');
    systemPromptTextarea = document.getElementById('system-prompt');
    saveSettingsBtn = document.getElementById('save-settings-btn');
    addProviderBtn = document.getElementById('add-provider-btn');
    addModelBtn = document.getElementById('add-model-btn');
    cancelBtn = document.getElementById('settings-modal-cancel-btn');
    
    // 检查元素是否存在
    if (!settingsModalOverlay || !serviceProviderList || !providerNameInput || 
        !providerBaseurlInput || !providerKeyInput || !modelsContainer || 
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
    loadInitialData(); // 刷新数据
    settingsModalOverlay.classList.add('visible');
}

/**
 * 隐藏设置模态框
 */
export function hideSettingsModal() {
    settingsModalOverlay.classList.remove('visible');
    clearProviderForm(); // 清空表单
    
    // 强制刷新API配置，确保使用最新激活的服务商设置
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
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newName = prompt('请输入模型名称', model.name);
            if (newName && newName.trim()) {
                model.name = newName.trim();
                refreshModelsList(models);
            }
        });
        
        // 删除按钮（至少保留一个模型）
        if (models.length > 1) {
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'model-action-btn delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.setAttribute('title', '删除模型');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // 如果删除的是激活的模型，自动选择第一个模型
                if (model.isActive && models.length > 1) {
                    const nextActiveIndex = index === 0 ? 1 : 0;
                    models[nextActiveIndex].isActive = true;
                }
                
                // 从模型列表中移除
                models.splice(index, 1);
                refreshModelsList(models);
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
        alert('请先选择或创建一个服务商');
        return;
    }
    
    const modelName = prompt('请输入模型名称', initialName);
    if (!modelName || !modelName.trim()) return;
    
    // 确保models数组存在
    if (!currentEditingProvider.models) {
        currentEditingProvider.models = [];
    }
    
    // 创建新模型
    const newModel = {
        id: 'model_' + Date.now(),
        name: modelName.trim(),
        isActive: currentEditingProvider.models.length === 0 // 如果是第一个模型，自动设为激活
    };
    
    // 添加到列表
    currentEditingProvider.models.push(newModel);
    
    // 刷新UI
    refreshModelsList(currentEditingProvider.models);
}

/**
 * 创建新的服务商
 */
function createNewProvider() {
    // 创建新的服务商对象
    currentEditingProvider = {
        id: 'provider_' + Date.now(),
        name: '',
        baseurl: '',
        key: '',
        system_prompt: getApiConfig().system_prompt || '',
        models: []
    };
    
    isNewProvider = true;
    
    // 清空表单
    clearProviderForm();
    
    // 自动添加一个模型
    addModel('默认模型');
    
    // 确保表单区域可见
    document.querySelector('.provider-details-container').style.display = 'block';
}

/**
 * 删除服务商
 * @param {string} providerId 服务商ID
 */
function deleteProvider(providerId) {
    if (providers.length <= 1) {
        alert('至少需要保留一个服务商');
        return;
    }
    
    if (!confirm(`确定要删除此服务商吗？`)) return;
    
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

/**
 * 清空服务商表单
 */
function clearProviderForm() {
    providerNameInput.value = '';
    providerBaseurlInput.value = '';
    providerKeyInput.value = '';
    systemPromptTextarea.value = getApiConfig().system_prompt || '';
    modelsContainer.innerHTML = '';
}

/**
 * 保存设置
 */
function saveSettings() {
    // 验证表单
    if (!validateForm()) return;
    
    // 更新当前编辑的服务商
    updateCurrentProvider();
    
    // 如果是新服务商，添加到列表
    if (isNewProvider) {
        providers.push(currentEditingProvider);
        activeProviderId = currentEditingProvider.id;
    }
    
    // 保存到本地存储
    saveProviders(providers, activeProviderId);
    
    // 设置当前活动的服务商配置
    setActiveProvider(activeProviderId);
    
    // 关闭模态框
    hideSettingsModal();
    
    // 提示保存成功
    alert('设置已保存');
}

/**
 * 验证表单
 * @returns {boolean} 表单是否有效
 */
function validateForm() {
    // 检查必填字段
    if (!providerNameInput.value.trim()) {
        alert('请输入服务商名称');
        providerNameInput.focus();
        return false;
    }
    
    if (!providerBaseurlInput.value.trim()) {
        alert('请输入API基础URL');
        providerBaseurlInput.focus();
        return false;
    }
    
    if (!providerKeyInput.value.trim()) {
        alert('请输入API密钥');
        providerKeyInput.focus();
        return false;
    }
    
    // 检查是否有模型
    if (!currentEditingProvider || !currentEditingProvider.models || currentEditingProvider.models.length === 0) {
        alert('请至少添加一个模型');
        return false;
    }
    
    // 检查是否有激活的模型
    if (!currentEditingProvider.models.some(m => m.isActive)) {
        alert('请选择一个活动模型');
        return false;
    }
    
    return true;
}

/**
 * 更新当前编辑的服务商
 */
function updateCurrentProvider() {
    if (!currentEditingProvider) return;
    
    currentEditingProvider.name = providerNameInput.value.trim();
    currentEditingProvider.baseurl = providerBaseurlInput.value.trim();
    currentEditingProvider.key = providerKeyInput.value.trim();
    currentEditingProvider.system_prompt = systemPromptTextarea.value.trim();
} 