// debug.js - 为侧边栏切换按钮添加调试功能

// 在页面加载后执行
document.addEventListener('DOMContentLoaded', function() {
    console.log("调试脚本已加载");
    
    // 等待页面完全加载后再执行，确保所有元素都已经初始化
    setTimeout(function() {
        // 尝试获取按钮元素
        const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.querySelector('.sidebar-overlay');
        
        console.log("调试信息:");
        console.log("- 侧边栏切换按钮:", sidebarToggleBtn);
        console.log("- 侧边栏:", sidebar);
        console.log("- 遮罩层:", sidebarOverlay);
        
        if (sidebarToggleBtn && sidebar && sidebarOverlay) {
            console.log("所有必要元素已找到，添加调试事件监听器");
            
            // 添加一个强制的点击事件监听器
            sidebarToggleBtn.addEventListener('click', function(event) {
                console.log("侧边栏切换按钮被点击(debug.js)!");
                
                // 切换侧边栏
                sidebar.classList.add('open');
                sidebarOverlay.classList.add('visible');
                
                console.log("侧边栏状态: ", sidebar.classList.contains('open') ? "已打开" : "已关闭");
                console.log("遮罩层状态: ", sidebarOverlay.classList.contains('visible') ? "已显示" : "已隐藏");
                
                // 阻止事件冒泡
                event.stopPropagation();
            });
            
            // 添加遮罩层点击事件，用于关闭侧边栏
            sidebarOverlay.addEventListener('click', function() {
                console.log("遮罩层被点击(debug.js)!");
                
                // 关闭侧边栏
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('visible');
                
                console.log("侧边栏已关闭，遮罩层已隐藏");
            });
            
            // 初始时强制显示按钮，确保其可见
            sidebarToggleBtn.style.display = 'block';
            sidebarToggleBtn.style.visibility = 'visible';
            sidebarToggleBtn.style.opacity = '1';
            sidebarToggleBtn.style.pointerEvents = 'auto';
            
            console.log("调试事件监听器添加完成，按钮已设置为可见");
        } else {
            console.error("找不到侧边栏相关元素，无法添加调试事件监听器");
        }
    }, 1000); // 等待1秒，确保页面加载完毕
}); 