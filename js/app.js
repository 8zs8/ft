let currentPath = '/';
let serverInfo = {};
let drivesCache = [];
let connectionCheckInterval = null;
let connectionLostShown = false;
let consecutiveFailures = 0;
const MAX_FAILURES = 2;
let showHidden = false;
let showSystem = false;
let tasks = [];
let taskIdCounter = 0;

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function showConnectionLost() {
    if (!connectionLostShown) {
        connectionLostShown = true;
        document.getElementById('connectionLost').classList.add('show');
    }
}

function hideConnectionLost() {
    if (connectionLostShown) {
        connectionLostShown = false;
        document.getElementById('connectionLost').classList.remove('show');
        consecutiveFailures = 0;
    }
}

async function checkConnection() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const resp = await fetch('/api/info', { signal: controller.signal, cache: 'no-store' });
        clearTimeout(timeoutId);
        
        if (resp.status === 401) {
            window.location.href = '/login';
            return;
        }
        
        if (resp.ok) {
            if (connectionLostShown) {
                hideConnectionLost();
                showToast('✅ 连接已恢复');
                if (currentPath === '/') {
                    loadDrives();
                } else {
                    loadFileList(currentPath);
                }
            }
            consecutiveFailures = 0;
        } else {
            throw new Error('Server returned ' + resp.status);
        }
    } catch (e) {
        consecutiveFailures++;
        const retryCount = document.getElementById('retryCount');
        if (retryCount) retryCount.textContent = '已尝试 ' + consecutiveFailures + ' 次';
        if (consecutiveFailures >= MAX_FAILURES) {
            showConnectionLost();
        }
    }
}

async function reconnect() {
    hideConnectionLost();
    showToast('🔄 正在重新连接...');
    await checkConnection();
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

function formatDriveSize(bytes) {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

async function loadInfo() {
    try {
        const resp = await fetch('/api/info');
        serverInfo = await resp.json();
    } catch(e) {
        console.error('Failed to load info:', e);
    }
}

async function loadDrives() {
    try {
        const resp = await fetch('/api/drives');
        drivesCache = await resp.json();
        renderDrives();
    } catch(e) {
        showToast('加载驱动器列表失败');
    }
}

function renderDrives() {
    let header = '<div class="header"><div class="header-top"><div><h1>💻 文件传输</h1><p>访问电脑所有文件</p></div><button class="logout-btn" onclick="logout()">🚪 退出</button></div>';
    header += renderConnectionInfo();
    header += '</div>';
    
    let optionsBar = '<div class="options-bar">' +
        '<label class="option-label"><input type="checkbox" id="showHidden" ' + (showHidden ? 'checked' : '') + ' onchange="toggleHidden(this.checked)"> 显示隐藏的文件</label>' +
        '<label class="option-label"><input type="checkbox" id="showSystem" ' + (showSystem ? 'checked' : '') + ' onchange="toggleSystem(this.checked)"> 显示受保护的系统文件</label>' +
        '</div>';
    
    let content = '<div class="card"><h2>💾 选择驱动器</h2>';
    if (drivesCache.length === 0) {
        content += '<div class="empty">没有找到可用的驱动器</div>';
    } else {
        content += '<div class="drive-grid">';
        drivesCache.forEach(drive => {
            const usedPercent = drive.total > 0 ? ((drive.total - drive.free) / drive.total * 100) : 0;
            const icon = drive.type === '固定驱动器' ? '💽' : drive.type === '可移动驱动器' ? '💾' : drive.type === '光盘驱动器' ? '💿' : drive.type === '远程驱动器' ? '🌐' : '📀';
            const label = drive.label ? ` (${drive.label})` : '';
            content += '<div class="drive-item" onclick="navigateTo(\\'' + drive.path.replace(/\\/g, '/') + '\\')">' +
                '<div class="drive-icon">' + icon + '</div>' +
                '<div class="drive-name">' + drive.letter + ':' + label + '</div>' +
                '<div class="drive-info">' + drive.type + '</div>' +
                '<div class="drive-info">总容量: ' + formatDriveSize(drive.total) + '</div>' +
                '<div class="drive-bar"><div class="drive-bar-fill" style="width:' + usedPercent + '%"></div></div>' +
                '</div>';
        });
        content += '</div>';
    }
    content += '</div>';
    
    document.getElementById('app').innerHTML = header + optionsBar + content + '<div id="taskList"></div>';
}

function renderConnectionInfo() {
    let html = '';
    const lanUrl = serverInfo.lanUrl || '';
    const tunnelUrl = serverInfo.tunnelUrl || '';
    
    html += '<div class="conn-info">';
    html += '<div class="conn-info-title">🔗 连接方式</div>';
    
    if (lanUrl) {
        html += '<div class="conn-item">';
        html += '<span class="conn-label">局域网</span>';
        html += '<span class="conn-url" onclick="copyUrl(\\'' + lanUrl + '\\')" style="cursor:pointer">' + lanUrl + '</span>';
        html += '<button class="conn-copy" onclick="copyUrl(\\'' + lanUrl + '\\')">复制</button>';
        html += '</div>';
    }
    
    if (tunnelUrl) {
        html += '<div class="conn-item">';
        html += '<span class="conn-label">🌐 外网</span>';
        html += '<span class="conn-url" onclick="copyUrl(\\'' + tunnelUrl + '\\')" style="cursor:pointer">' + tunnelUrl + '</span>';
        html += '<button class="conn-copy" onclick="copyUrl(\\'' + tunnelUrl + '\\')">复制</button>';
        html += '</div>';
    }
    
    html += '</div>';
    
    if (tunnelUrl) {
        html += '<div class="qr-section">';
        html += '<img class="qr-img" src="/api/qrcode?t=' + Date.now() + '" alt="QR Code">';
        html += '<div class="qr-hint">';
        html += '📱 扫描二维码访问<br>';
        html += '<strong>同一WiFi</strong>：使用局域网地址<br>';
        html += '<strong>不同网络</strong>：使用外网隧道地址';
        html += '</div>';
        html += '</div>';
    }
    
    return html;
}

function logout() {
    fetch('/api/logout', {method: 'POST'}).then(() => {
        window.location.href = '/login';
    }).catch(() => {
        window.location.href = '/login';
    });
}

function checkSession() {
    fetch('/api/info', {cache: 'no-store'}).then(resp => {
        if (resp.status === 401) {
            window.location.href = '/login';
        }
    }).catch(() => {});
}

function copyUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        showToast('✅ 已复制到剪贴板');
    }).catch(() => {
        showToast('❌ 复制失败，请手动复制');
    });
}

function updateTaskList() {
    const container = document.getElementById('taskList');
    if (!container) return;
    const activeTasks = tasks.filter(t => t.status === 'uploading' || t.status === 'downloading');
    if (activeTasks.length === 0) {
        container.innerHTML = '';
        return;
    }
    let html = '<div class="card" style="padding:12px; margin-bottom:16px;"><h2 style="font-size:14px; margin-bottom:8px; color:#34495e;">📋 进行中的任务</h2><div class="task-list">';
    for (const task of activeTasks) {
        const percent = Math.round(task.progress);
        const sizeInfo = task.totalSize > 0 ? formatSize(task.loaded) + ' / ' + formatSize(task.totalSize) : formatSize(task.loaded);
        const speedInfo = task.speed > 0 ? ' | ' + formatSize(task.speed) + '/s' : '';
        html += '<div class="task-item">' +
            '<div class="task-info">' +
                '<div class="task-name">' + escapeHtml(task.name) + '</div>' +
                '<div class="task-progress-bar"><div class="task-progress-fill ' + task.type + '" style="width:' + percent + '%"></div></div>' +
                '<div class="task-status">' + percent + '% - ' + sizeInfo + speedInfo + '</div>' +
            '</div>' +
            '<button class="task-cancel" onclick="cancelTask(' + task.id + ')">取消</button>' +
        '</div>';
    }
    html += '</div></div>';
    container.innerHTML = html;
}

function cancelTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.xhr) { task.xhr.abort(); }
    if (task && task.controller) { task.controller.abort(); }
    task.status = 'cancelled';
    updateTaskList();
}

function addTask(task) {
    task.id = ++taskIdCounter;
    task.loaded = 0;
    task.totalSize = task.size || 0;
    task.progress = 0;
    task.speed = 0;
    task.lastLoaded = 0;
    task.lastTime = Date.now();
    tasks.push(task);
    updateTaskList();
    return task;
}

function updateTask(taskId, loaded, total) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const now = Date.now();
    const elapsed = (now - task.lastTime) / 1000;
    if (elapsed >= 0.5) {
        const delta = loaded - task.lastLoaded;
        task.speed = delta / elapsed;
        task.lastLoaded = loaded;
        task.lastTime = now;
    }
    task.loaded = loaded;
    if (total > 0) { task.progress = (loaded / total) * 100; }
    updateTaskList();
}

function completeTask(taskId, success) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    task.status = success ? 'done' : 'error';
    updateTaskList();
    if (success) {
        showToast('✅ ' + (task.type === 'upload' ? '上传' : '下载') + '完成: ' + task.name);
    } else {
        showToast('❌ ' + (task.type === 'upload' ? '上传' : '下载') + '失败: ' + task.name);
    }
    setTimeout(() => { tasks = tasks.filter(t => t.id !== taskId); updateTaskList(); }, 3000);
}

function removeTask(taskId) {
    tasks = tasks.filter(t => t.id !== taskId);
    updateTaskList();
}

async function loadFileList(path) {
    const loadingHtml = '<div class="card"><div class="loading-spinner"><div class="spinner"></div></div><div style="text-align:center; color:#636e72; font-size:13px;">正在加载文件列表...</div></div>';
    document.getElementById('app').innerHTML = loadingHtml + '<div id="taskList"></div>';
    
    try {
        const url = '/api/list?path=' + encodeURIComponent(path) + '&show_hidden=' + (showHidden ? '1' : '0') + '&show_system=' + (showSystem ? '1' : '0');
        const resp = await fetch(url);
        const data = await resp.json();
        renderFileList(data, path);
    } catch(e) {
        showToast('加载文件列表失败');
    }
}

function renderFileList(data, path) {
    let header = '<div class="header"><div class="header-top"><div><h1>📁 文件传输</h1><p>' + data.path + '</p></div><button class="logout-btn" onclick="logout()">🚪 退出</button></div>';
    header += renderConnectionInfo();
    header += '</div>';
    
    let breadcrumb = '<div class="breadcrumb"><button class="breadcrumb-item" onclick="showDrives()">💻 我的电脑</button>';
    let parts = data.path.split('/').filter(p => p);
    let builtPath = '';
    parts.forEach((part, index) => {
        builtPath += '/' + part;
        breadcrumb += '<span class="breadcrumb-sep">›</span>';
        breadcrumb += '<button class="breadcrumb-item" onclick="navigateTo(\\'' + builtPath + '\\')">' + decodeURIComponent(part) + '</button>';
    });
    breadcrumb += '</div>';
    
    let optionsBar = '<div class="options-bar">' +
        '<label class="option-label"><input type="checkbox" id="showHidden" ' + (showHidden ? 'checked' : '') + ' onchange="toggleHidden(this.checked)"> 显示隐藏的文件</label>' +
        '<label class="option-label"><input type="checkbox" id="showSystem" ' + (showSystem ? 'checked' : '') + ' onchange="toggleSystem(this.checked)"> 显示受保护的系统文件</label>' +
        '</div>';

    const isRoot = path === '/';
    
    let uploadArea = '';
    if (isRoot) {
        uploadArea = '<div class="card"><h2>⬆️ 上传文件到此目录</h2>' +
            '<div style="text-align:center; padding: 24px; color: #95a5a6;">⚠️ 请先选择一个磁盘或文件夹后再上传文件</div></div>';
    } else {
        uploadArea = '<div class="card"><h2>⬆️ 上传文件到此目录</h2>' +
            '<div class="upload-area" id="uploadArea">' +
            '<div class="upload-icon">📤</div>' +
            '<div class="upload-text">点击选择文件 或 拖拽文件到此处</div>' +
            '<input type="file" id="fileInput" multiple style="display:none">' +
            '</div></div>';
    }
    
    let fileListHtml = '<div class="card"><div style="display:flex; align-items:center; margin-bottom: 12px;"><button class="back-btn" onclick="goUp()">⬆️ 上级目录</button><h2 style="margin:0; flex:1;">📂 ' + (data.files.length > 0 ? data.files.length + ' 个项目' : '文件夹') + '</h2></div>';
    
    if (data.permission_denied && data.permission_denied.length > 0) {
        fileListHtml += '<div class="permission-denied">⚠️ ' + data.permission_denied.length + ' 个项目因权限不足无法显示</div>';
    }
    
    if (data.files.length === 0) {
        fileListHtml += '<div class="empty">📭 此目录为空</div>';
    } else {
        fileListHtml += '<ul class="file-list">';
        data.files.forEach(file => {
            const isFolder = file.is_directory;
            const icon = isFolder ? '📁' : getFileIcon(file.name);
            const iconClass = isFolder ? 'icon-folder' : 'icon-file';
            const meta = isFolder ? (file.item_count || 0) + ' 个项目' : formatSize(file.size);
            let actions = '';
            if (isFolder) {
                actions = '<button class="action-btn action-navigate" onclick="navigateTo(\\'' + file.path + '\\')">进入</button>';
            } else {
                actions = '<button class="action-btn action-download" onclick="downloadFile(\\'' + file.path + '\\')">下载</button>';
            }
            fileListHtml += '<li class="file-item">' +
                '<div class="file-info">' +
                    '<div class="file-icon ' + iconClass + '">' + icon + '</div>' +
                    '<div><div class="file-name">' + escapeHtml(file.name) + '</div>' +
                    '<div class="file-meta">' + meta + '</div></div>' +
                '</div>' +
                '<div class="file-actions">' + actions + '</div>' +
            '</li>';
        });
        fileListHtml += '</ul>';
    }
    fileListHtml += '</div>';

    document.getElementById('app').innerHTML = header + uploadArea + breadcrumb + optionsBar + fileListHtml + '<div id="taskList"></div>';
    if (!isRoot) {
        setupUpload();
    }
    updateTaskList();
}

function toggleHidden(checked) {
    showHidden = checked;
    if (currentPath === '/') {
        renderDrives();
    } else {
        loadFileList(currentPath);
    }
}

function toggleSystem(checked) {
    showSystem = checked;
    if (currentPath === '/') {
        renderDrives();
    } else {
        loadFileList(currentPath);
    }
}

function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const icons = {
        'exe': '⚙️', 'msi': '📦', 'zip': '🗜️', 'rar': '🗜️', '7z': '🗜️',
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'bmp': '🖼️',
        'mp3': '🎵', 'wav': '🎵', 'flac': '🎵', 'm4a': '🎵',
        'mp4': '🎬', 'avi': '🎬', 'mkv': '🎬', 'mov': '🎬',
        'pdf': '📄', 'doc': '📝', 'docx': '📝', 'xls': '📊', 'xlsx': '📊',
        'ppt': '📽️', 'pptx': '📽️', 'txt': '📄', 'md': '📄',
        'py': '🐍', 'js': '📜', 'html': '🌐', 'css': '🎨',
        'cpp': '💻', 'h': '💻', 'c': '💻', 'java': '☕',
        'json': '📋', 'xml': '📋', 'csv': '📊'
    };
    return icons[ext] || '📄';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showDrives() {
    currentPath = '/';
    loadDrives();
}

function navigateTo(path) {
    currentPath = path;
    loadFileList(path);
}

function goUp() {
    if (currentPath === '/' || currentPath.length <= 1) {
        showDrives();
        return;
    }
    let parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    if (!parentPath) parentPath = '/';
    navigateTo(parentPath);
}

function downloadFile(path) {
    const filename = decodeURIComponent(path.split('/').pop());
    const task = addTask({ type: 'download', name: filename, status: 'downloading' });
    
    fetch('/api/download?path=' + encodeURIComponent(path), { signal: (task.controller = new AbortController()).signal })
        .then(resp => {
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const contentLength = parseInt(resp.headers.get('Content-Length') || '0');
            task.totalSize = contentLength;
            const reader = resp.body.getReader();
            const chunks = [];
            let loaded = 0;
            
            function readChunk() {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        const blob = new Blob(chunks);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        completeTask(task.id, true);
                        return;
                    }
                    chunks.push(value);
                    loaded += value.length;
                    updateTask(task.id, loaded, contentLength);
                    readChunk();
                }).catch(err => {
                    if (err.name === 'AbortError') {
                        removeTask(task.id);
                    } else {
                        completeTask(task.id, false);
                    }
                });
            }
            readChunk();
        }).catch(err => {
            if (err.name === 'AbortError') {
                removeTask(task.id);
            } else {
                completeTask(task.id, false);
            }
        });
}

function setupUpload() {
    const area = document.getElementById('uploadArea');
    const input = document.getElementById('fileInput');
    if (!area || !input) return;

    area.addEventListener('click', () => input.click());
    area.addEventListener('dragover', e => {
        e.preventDefault();
        area.classList.add('dragover');
    });
    area.addEventListener('dragleave', () => area.classList.remove('dragover'));
    area.addEventListener('drop', e => {
        e.preventDefault();
        area.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    input.addEventListener('change', e => handleFiles(e.target.files));
}

function handleFiles(files) {
    for (const file of files) {
        uploadFile(file);
    }
}

function uploadFile(file) {
    const task = addTask({ type: 'upload', name: file.name, size: file.size, status: 'uploading' });
    const formData = new FormData();
    formData.append('path', currentPath);
    formData.append('file', file);
    
    const xhr = new XMLHttpRequest();
    task.xhr = xhr;
    
    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) { updateTask(task.id, e.loaded, e.total); }
    };
    
    xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
            completeTask(task.id, true);
        } else {
            completeTask(task.id, false);
        }
        if (currentPath !== '/') { loadFileList(currentPath); }
    };
    
    xhr.onerror = () => { completeTask(task.id, false); };
    xhr.onabort = () => { removeTask(task.id); };
    
    xhr.open('POST', '/api/upload');
    xhr.send(formData);
}

async function init() {
    await loadInfo();
    loadDrives();
    
    connectionCheckInterval = setInterval(checkConnection, 5000);
}

init();
