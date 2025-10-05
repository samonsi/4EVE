// --- 1. Group Definitions (กำหนดชื่อกลุ่มและไฟล์ JSON ที่ใช้) ---
const GROUP_DEFINITIONS = [
    { 
        name: "ดิจิทัลทีวี", 
        path: "playlists/digital_tv.json" 
    },
    { 
        name: "สารคดี", 
        path: "playlists/documentary.json" 
    },
    { 
        name: "บันเทิง", 
        path: "playlists/entertain.json" 
    },
    { 
        name: "MONO-AIS", 
        path: "playlists/monomax_ais.json" 
    },
    
    { 
        name: "Sports", 
        path: "playlists/sports.json" 
    },
    { 
        name: "Cartoon", 
        path: "playlists/cartoon.json" 
    },

    // สามารถเพิ่มกลุ่มอื่นๆ ได้ที่นี่
];

let CURRENT_CHANNELS = []; // Stores channels of the currently selected group

// --- 2. JW Player Logic ---

/**
 * Sets up and starts the JW Player for the selected channel.
 * @param {Object} channel - The channel data object.
 */
function loadPlayer(channel) {
    const config = {
        file: channel.file,
        autostart: true, // เล่นทันทีเมื่อผู้ใช้คลิกเลือกช่อง
        mute: false,
        width: "100%",
        height: "100%",
    };

    // Configuration for DASH + Clear Key DRM
    if (channel.drm && channel.keyId && channel.key) {
        config.type = "dash";
        config.drm = {
            clearkey: {
                keyId: channel.keyId,
                key: channel.key
            }
        };
    } else if (channel.file.endsWith('.mpd')) {
        config.type = "dash";
    } else {
        // Default to HLS
        config.type = "hls";
    }

    // Initialize or update the player instance
    jwplayer("player").setup(config);
}


// --- 3. UI Rendering Logic ---

/**
 * Renders the channel list based on the CURRENT_CHANNELS array, filtered by search term.
 * @param {string} searchTerm - The text to filter channel names by.
 */
function renderChannelList(searchTerm = '') {
    const channelListDiv = document.getElementById("channel-list");
    channelListDiv.innerHTML = ''; 

    // กรองช่องตามคำค้นหา (Search Term)
    const filteredBySearch = CURRENT_CHANNELS.filter(channel => 
        channel.name && channel.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filteredBySearch.length === 0) {
        channelListDiv.innerHTML = `<p style="color:#aaa; padding:10px;">ไม่พบช่องตามที่ค้นหา</p>`;
        // ไม่ควรล้าง player แต่แสดงข้อความแจ้งเตือนที่ player แทน
        document.getElementById('player').innerHTML = '<div style="color: white; padding: 20px; text-align: center; font-size: 1.2em; background-color: #111; height: 100%; display: flex; align-items: center; justify-content: center;">ไม่พบช่องที่ตรงกับคำค้นหา</div>';
        return;
    }
    
    filteredBySearch.forEach((channel) => {
        const div = document.createElement("div");
        div.className = "channel-item";
        
        const logoHtml = channel.logo ? `<img src="${channel.logo}" alt="${channel.name}">` : "";
        
        // โครงสร้าง 2 บรรทัด: ชื่อช่อง (บรรทัดแรก) และ Info (บรรทัดสอง)
        const infoHtml = channel.info ? `<span class="channel-info">${channel.info}</span>` : '';
        
        div.innerHTML = `
            ${logoHtml}
            <div class="channel-text">
                <span class="channel-name">${channel.name}</span>
                ${infoHtml}
            </div>
        `;
        
        div.onclick = () => {
            document.querySelectorAll('.channel-item').forEach(c => c.classList.remove('active'));
            div.classList.add('active');
            loadPlayer(channel); // เล่นเมื่อคลิกเท่านั้น
        };
        
        channelListDiv.appendChild(div);
    });
}

/**
 * Fetches the channel list from the specified JSON file path.
 * @param {string} groupPath - Path to the playlist JSON file.
 */
async function loadGroupChannels(groupPath) {
    const channelListDiv = document.getElementById("channel-list");
    channelListDiv.innerHTML = `<p style="padding:10px;">กำลังโหลดช่อง...</p>`;
    
    // เคลียร์ค่าค้นหาเมื่อเปลี่ยนกลุ่ม
    const searchBox = document.getElementById('search-box');
    if (searchBox) {
        searchBox.value = '';
    }
    
    try {
        const response = await fetch(groupPath);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${groupPath}: ${response.statusText}`);
        }
        
        CURRENT_CHANNELS = await response.json(); 
        renderChannelList(); // แสดงรายการช่องทั้งหมดของกลุ่มที่โหลดมา

    } catch (error) {
        CURRENT_CHANNELS = [];
        channelListDiv.innerHTML = `<p style="color: red; padding: 10px;">Error loading channels: ${error.message}</p>`;
        
        // แสดงข้อความแจ้งเตือนใน Player Placeholder
        document.getElementById('player').innerHTML = '<div style="color: red; padding: 20px; text-align: center; font-size: 1.2em; background-color: #111; height: 100%; display: flex; align-items: center; justify-content: center;">ไม่สามารถโหลดรายการช่องในกลุ่มนี้ได้</div>';
        
        console.error("Error loading channels:", error);
    }
}

/**
 * Renders the Group Buttons from GROUP_DEFINITIONS.
 */
function renderGroups() {
    const groupContainer = document.getElementById("group-container");
    groupContainer.innerHTML = '';
    
    GROUP_DEFINITIONS.forEach(group => {
        const button = document.createElement('button');
        button.textContent = group.name;
        button.className = 'group-button';

        button.onclick = () => {
            document.querySelectorAll('.group-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            loadGroupChannels(group.path); // โหลดช่องใหม่จากไฟล์
        };
        groupContainer.appendChild(button);
    });
    
    // Auto-select the first group on load
    if (GROUP_DEFINITIONS.length > 0) {
        document.querySelector('.group-button').click();
    }
}


// --- 4. Initialization (รวม Logic ทั้งหมดไว้ที่เดียว) ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. แสดงข้อความ Placeholder ใน Player
    const playerDiv = document.getElementById('player');
    if (playerDiv) {
        playerDiv.innerHTML = '<div style="color: white; padding: 20px; text-align: center; font-size: 1.2em; background-color: #111; height: 100%; display: flex; align-items: center; justify-content: center;">กรุณาเลือกกลุ่มและคลิกที่รายการช่องเพื่อเริ่มเล่น</div>';
    }

    // 2. สร้างปุ่มกลุ่มและ Auto-select กลุ่มแรก
    renderGroups(); 
    
    // 3. ตั้งค่า Event Listener สำหรับช่องค้นหา
    const searchBox = document.getElementById('search-box');
    if (searchBox) {  
        searchBox.addEventListener('keyup', () => {
            renderChannelList(searchBox.value); // เรียก renderChannelList พร้อมส่งคำค้นหา
        });
    }
});