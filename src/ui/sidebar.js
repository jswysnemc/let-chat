// src/ui/sidebar.js
import {
    sessionListElement as importedSessionListElement,
    chatTitleElement,
    sidebarToggleBtn,
    appContainer,
    sidebarOverlay
} from './domElements.js'; // 导入侧边栏相关 DOM 元素
import * as state from '../state.js'; // Assuming state.js is one level up
import { showConfirm, showWarning, showSuccess } from './notification.js'; // Assuming notification.js is in the same ui folder
import { renderChatForActiveSession } from '../main.js'; // Assuming main.js exports this, or handle differently

let bulkEditMode = false;
let selectedSessionIds = new Set();

let bulkEditBtn = null;
let bulkActionsContainer = null;
let selectAllCheckbox = null;
let bulkDeleteSelectedBtn = null;
let cancelBulkEditBtn = null;
let sessionListElement = null; // Module-level variable, will be assigned in init
let addSessionBtnElement = null;
let sessionListTitleElement = null; // Reference to "会话列表" h3

/**
 * 在侧边栏中渲染会话列表。
 * @param {Array<object>} sessions - 会话对象数组 (例如 [{id, name}, ...])。
 * @param {string|null} activeSessionId - 当前活动会话的 ID。
 */
export function renderSessionList(sessions, activeSessionId) {
    if (!sessionListElement) {
        // console.error("UI 错误：未找到或未初始化会话列表元素 (#session-list)。");
        // Attempt to get it if not initialized, useful for direct calls before full init in some scenarios
        sessionListElement = document.getElementById('session-list');
        if (!sessionListElement) {
            console.error("UI 错误：会话列表元素 #session-list 确实未找到。");
            return;
        }
    }

    sessionListElement.innerHTML = '';

    if (!sessions || sessions.length === 0) {
        const noSessionsLi = document.createElement('li');
        noSessionsLi.className = 'placeholder-text';
        noSessionsLi.textContent = '没有会话。点击按钮创建。';
        sessionListElement.appendChild(noSessionsLi);
        if (bulkEditMode) updateBulkDeleteButtonState(); // Still update button state
        return;
    }

    sessions.forEach(session => {
        const li = document.createElement('li');
        li.dataset.sessionId = session.id;
        if (session.id === activeSessionId && !bulkEditMode) { // Only apply active-session if not in bulk edit mode
            li.classList.add('active-session');
        }

        if (bulkEditMode) {
            const checkboxWrapper = document.createElement('div');
            checkboxWrapper.className = 'session-item-checkbox-wrapper';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'session-item-checkbox';
            checkbox.dataset.sessionId = session.id;
            checkbox.checked = selectedSessionIds.has(session.id);
            checkbox.addEventListener('change', (e) => {
                const id = e.target.dataset.sessionId;
                if (e.target.checked) {
                    selectedSessionIds.add(id);
                } else {
                    selectedSessionIds.delete(id);
                }
                updateBulkDeleteButtonState();
                if (selectAllCheckbox) {
                    const allCheckboxes = sessionListElement.querySelectorAll('.session-item-checkbox');
                    const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
                    selectAllCheckbox.checked = allChecked;
                }
            });
            checkboxWrapper.appendChild(checkbox);
            li.appendChild(checkboxWrapper);
        }

        const nameSpan = document.createElement('span');
        nameSpan.className = 'session-name'; 
        nameSpan.textContent = session.name || `会话 ${session.id.substring(0, 4)}`;
        li.appendChild(nameSpan);
        li.title = session.name || `会话 ${session.id}`;

        const controls = document.createElement('span');
        controls.className = 'session-controls';

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'session-control-button session-edit-btn';
        editButton.innerHTML = '<i class="fas fa-pencil-alt"></i>';
        editButton.title = '编辑会话';
        editButton.dataset.sessionId = session.id;
        controls.appendChild(editButton);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'session-control-button session-delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.title = '删除会话';
        deleteBtn.dataset.sessionId = session.id;
        controls.appendChild(deleteBtn);
        li.appendChild(controls);
        
        li.addEventListener('click', (e) => {
            if (bulkEditMode) {
                const cb = e.currentTarget.querySelector('.session-item-checkbox');
                if (cb && e.target !== cb && !e.target.closest('.session-item-checkbox-wrapper')) {
                    cb.checked = !cb.checked;
                    const event = new Event('change', { bubbles: true });
                    cb.dispatchEvent(event);
                }
            } else {
                // Normal session switching logic is handled by event delegation in main.js
            }
        });
        sessionListElement.appendChild(li);
    });
    if (bulkEditMode) updateBulkDeleteButtonState();
}

/**
 * 更新聊天区域顶部的标题文本。
 * @param {string} title - 要显示的新标题。
 */
export function updateChatTitle(title) {
    const chatTitleElem = document.getElementById('chat-title') || chatTitleElement; // chatTitleElement might be from domElements.js
    if (chatTitleElem) {
        chatTitleElem.textContent = title;
    } else {
        // console.warn("UI: updateChatTitle 调用时 chatTitleElement 未初始化。");
    }
}


/**
 * 初始化侧边栏切换功能。
 * 添加事件监听器以处理按钮点击和遮罩层点击。
 */
export function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const sToggleBtn = document.getElementById('sidebar-toggle-btn') || sidebarToggleBtn;
    const sOverlay = document.getElementById('sidebar-overlay') || sidebarOverlay;
    
    console.log("侧边栏初始化开始...");
    console.log("sidebar元素:", sidebar);
    console.log("sidebarToggleBtn元素:", sToggleBtn);
    console.log("sidebarOverlay元素:", sOverlay);
    console.log("mainContent元素:", mainContent);
    
    if (sToggleBtn && sidebar && sOverlay && mainContent) {
        console.log("所有必要元素都存在，添加事件监听器");
        
        // 切换按钮点击事件
        sToggleBtn.addEventListener('click', (event) => {
            console.log("侧边栏切换按钮被点击!");
            event.stopPropagation(); // 阻止事件冒泡，防止主内容区域的点击事件触发
            
            // 使用正确的类操作：给sidebar添加open类
            sidebar.classList.add('open');
            console.log("已添加sidebar.open类");
            
            // 显示遮罩层
            sOverlay.classList.add('visible');
            console.log("已添加overlay.visible类");
            
            // 确保按钮保持可见
            sToggleBtn.style.display = 'block';
        });

        // 关闭侧边栏的函数
        const closeSidebar = () => {
            console.log("关闭侧边栏函数被调用");
            sidebar.classList.remove('open'); // 移除open类以关闭侧边栏
            sOverlay.classList.remove('visible'); // 隐藏遮罩层
            console.log("已移除sidebar.open和overlay.visible类");
            
            // 确保按钮保持可见
            sToggleBtn.style.display = 'block';
        };

        // 遮罩层点击事件（用于关闭侧边栏）
        sOverlay.addEventListener('click', (event) => {
            console.log("遮罩层被点击!");
            event.stopPropagation(); // 阻止事件冒泡
            closeSidebar();
        });
        
        // 主内容区域点击事件（用于关闭侧边栏）
        // 只有在侧边栏打开时才关闭
        mainContent.addEventListener('click', (event) => {
            console.log("主内容区域被点击!");
            if (sidebar.classList.contains('open')) {
                console.log("侧边栏处于打开状态，现在关闭它");
                closeSidebar();
                // 防止事件冒泡到遮罩层等其他元素
                event.stopPropagation();
            } else {
                console.log("侧边栏未打开，无需关闭");
            }
        });
        
        // 添加调试按钮点击事件，输出元素状态
        console.log("为侧边栏切换按钮添加额外的调试事件");
        
        // 验证按钮是否真的可以点击（CSS z-index, pointer-events等可能会阻止点击）
        sToggleBtn.addEventListener('mouseenter', () => {
            console.log("鼠标进入侧边栏切换按钮");
        });
        
        sToggleBtn.addEventListener('mouseleave', () => {
            console.log("鼠标离开侧边栏切换按钮");
        });
        
        console.log("侧边栏切换功能已初始化。");
    } else {
        // 这个警告理论上不应再触发，因为 initializeElements 已经检查过这些元素
        console.warn("侧边栏切换元素缺失，功能禁用。缺失的元素:");
        if (!sToggleBtn) console.warn("- 侧边栏切换按钮");
        if (!sidebar) console.warn("- 侧边栏");
        if (!sOverlay) console.warn("- 侧边栏遮罩层");
        if (!mainContent) console.warn("- 主内容区域");
    }
}

function toggleBulkEditMode() {
    bulkEditMode = !bulkEditMode;
    selectedSessionIds.clear(); 

    if (bulkEditMode) {
        if(bulkEditBtn) bulkEditBtn.innerHTML = '<i class="fas fa-tasks"></i> 管理中';
        if(addSessionBtnElement) addSessionBtnElement.style.display = 'none'; 
        if(bulkActionsContainer) bulkActionsContainer.style.display = 'flex';
        if(sessionListElement) sessionListElement.classList.add('bulk-edit-mode');
        if(sessionListTitleElement) sessionListTitleElement.textContent = '选择会话';
    } else {
        if(bulkEditBtn) bulkEditBtn.innerHTML = '<i class="fas fa-check-double"></i> 编辑';
        if(addSessionBtnElement) addSessionBtnElement.style.display = 'flex'; 
        if(bulkActionsContainer) bulkActionsContainer.style.display = 'none';
        if(sessionListElement) sessionListElement.classList.remove('bulk-edit-mode');
        if(sessionListTitleElement) sessionListTitleElement.textContent = '会话列表';
    }
    const activeId = state.getActiveSessionId();
    renderSessionList(state.getAllSessions(), activeId); 
    if (selectAllCheckbox) selectAllCheckbox.checked = false; 
}

function handleSelectAllChange() {
    if(!selectAllCheckbox || !sessionListElement) return;
    const isChecked = selectAllCheckbox.checked;
    const sessionCheckboxes = sessionListElement.querySelectorAll('.session-item-checkbox');
    
    selectedSessionIds.clear();

    sessionCheckboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
        const sessionId = checkbox.dataset.sessionId;
        if (isChecked && sessionId) {
            selectedSessionIds.add(sessionId);
        }
    });
    updateBulkDeleteButtonState();
}

function updateBulkDeleteButtonState() {
    if (!bulkDeleteSelectedBtn) return;
    if (selectedSessionIds.size > 0) {
        bulkDeleteSelectedBtn.disabled = false;
        bulkDeleteSelectedBtn.innerHTML = `<i class="fas fa-trash-alt"></i> 删除 (${selectedSessionIds.size})`; 
        bulkDeleteSelectedBtn.title = `删除选中的 ${selectedSessionIds.size} 个会话`;
    } else {
        bulkDeleteSelectedBtn.disabled = true;
        bulkDeleteSelectedBtn.innerHTML = '<i class="fas fa-trash-alt"></i> 删除选中'; 
        bulkDeleteSelectedBtn.title = '先选择要删除的会话';
    }
}

async function handleDeleteSelectedSessions() {
    if (selectedSessionIds.size === 0) {
        showWarning("没有选中的会话可删除。");
        return;
    }

    const confirmed = await showConfirm({
        title: '批量删除确认',
        message: `您确定要删除选中的 ${selectedSessionIds.size} 个会话吗？此操作无法撤销。`,
        confirmText: '全部删除',
        cancelText: '取消'
    });

    if (confirmed) {
        let activeSessionDeleted = false;
        const currentActiveId = state.getActiveSessionId();

        selectedSessionIds.forEach(sessionId => {
            if (sessionId === currentActiveId) {
                activeSessionDeleted = true;
            }
            state.deleteSession(sessionId);
        });

        const originalSelectedCount = selectedSessionIds.size;
        selectedSessionIds.clear();
        
        const allSessions = state.getAllSessions();
        let newActiveIdToSet = activeSessionDeleted ? (allSessions[0]?.id || '') : currentActiveId;
        
        if (activeSessionDeleted && newActiveIdToSet) {
            state.setActiveSessionId(newActiveIdToSet);
        } else if (activeSessionDeleted && !newActiveIdToSet){
             state.setActiveSessionId(''); 
        }
        
        renderSessionList(allSessions, state.getActiveSessionId());
        
        if (activeSessionDeleted) {
             renderChatForActiveSession(); 
        }
        
        showSuccess(`${originalSelectedCount} 个会话已删除。`);
        updateBulkDeleteButtonState(); 
        if (bulkEditMode) {
            toggleBulkEditMode();
        }
    }
}

export function initializeBulkSessionManagement() {
    bulkEditBtn = document.getElementById('bulk-edit-sessions-btn');
    bulkActionsContainer = document.getElementById('bulk-actions-container');
    selectAllCheckbox = document.getElementById('select-all-sessions-checkbox');
    bulkDeleteSelectedBtn = document.getElementById('bulk-delete-selected-btn');
    cancelBulkEditBtn = document.getElementById('cancel-bulk-edit-btn');
    sessionListElement = document.getElementById('session-list'); // Assign here
    addSessionBtnElement = document.getElementById('add-session-btn');
    const sidebarHeader = document.querySelector('.sidebar-header');
    if(sidebarHeader) sessionListTitleElement = sidebarHeader.querySelector('h3');

    if (!bulkEditBtn || !bulkActionsContainer || !selectAllCheckbox || !bulkDeleteSelectedBtn || !cancelBulkEditBtn || !sessionListElement || !addSessionBtnElement) {
        console.error("Bulk edit UI elements not found for initialization!");
        return;
    }

    bulkEditBtn.addEventListener('click', toggleBulkEditMode);
    cancelBulkEditBtn.addEventListener('click', () => {
        if (bulkEditMode) toggleBulkEditMode();
    });
    selectAllCheckbox.addEventListener('change', handleSelectAllChange);
    bulkDeleteSelectedBtn.addEventListener('click', handleDeleteSelectedSessions);

    console.log("Bulk Session Management Initialized.");
    // Initial render to apply mode if needed (e.g. if mode was persisted)
    // renderSessionList(state.getAllSessions(), state.getActiveSessionId()); 
}