let allChannels = [];
let defaultPlaylists = [
   // { name: "Pastebin Playlist", type: "url", source: "https://pastebin.com/raw/" },
    { name: "Free TV", type: "local", source: "freetv.m3u" },
    { name: "SPOT", type: "local", source: "spot.m3u" }
];
let currentPlaylistName = "";

const channelListContainer = document.getElementById("channel-list");
const groupTabsContainer = document.getElementById("group-tabs");
const playlistSelector = document.getElementById("playlist-selector");

const customPlaylistMenu = document.getElementById("custom-playlist-menu");
const managePlaylistsBtn = document.getElementById("manage-playlists-btn");
const closeMenuBtn = document.getElementById("close-menu-btn");

const newPlaylistNameInput = document.getElementById("new-playlist-name");
const newPlaylistSourceInput = document.getElementById("new-playlist-source");
const addPlaylistBtn = document.getElementById("add-playlist-btn");

const playlistList = document.getElementById("playlist-list");
const videoPlayerContainer = document.getElementById("video-player-container");

function getCustomPlaylists() {
    try {
        const savedPlaylists = localStorage.getItem("customPlaylists");
        return savedPlaylists ? JSON.parse(savedPlaylists) : [];
    } catch (e) {
        console.error("Error loading playlists from localStorage", e);
        return [];
    }
}

function saveCustomPlaylists(playlists) {
    try {
        localStorage.setItem("customPlaylists", JSON.stringify(playlists));
    } catch (e) {
        console.error("Error saving playlists to localStorage", e);
    }
}

function renderPlaylistSelector() {
    const customPlaylists = getCustomPlaylists();
    const allPlaylists = [...defaultPlaylists, ...customPlaylists];
    
    playlistSelector.innerHTML = "";
    
    const manageOption = document.createElement("option");
    manageOption.value = "manage";
    manageOption.textContent = "Manage Playlists";
    playlistSelector.appendChild(manageOption);

    allPlaylists.forEach(playlist => {
        const option = document.createElement("option");
        option.textContent = playlist.name;
        option.dataset.type = playlist.type;
        option.value = playlist.source;
        
        playlistSelector.appendChild(option);
    });

    if (currentPlaylistName) {
        const selectedOption = Array.from(playlistSelector.options).find(opt => opt.textContent === currentPlaylistName);
        if (selectedOption) {
            selectedOption.selected = true;
        }
    }
}

// แก้ไขโค้ดใน main.js
async function loadAndDisplayPlaylist(source, name, type) {
    groupTabsContainer.innerHTML = "";
    channelListContainer.innerHTML = "<p>กำลังโหลดช่องรายการ...</p>";
    currentPlaylistName = name;

    try {
        let fetchUrl = source;
        if (type === "url") {
            // โค้ดเดิมสำหรับ URL จากภายนอก
            fetchUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(source)}`;
            // fetchUrl = `https://corsproxy.io/?${encodeURIComponent(source)}`;
        } else if (type === "local") {
            // เพิ่มโค้ดส่วนนี้เพื่อจัดการไฟล์ Local
            fetchUrl = `playlist/${source}`;
        }

        const response = await fetch(fetchUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const text = await response.text();
        const channels = parseM3U(text);
        allChannels = channels;

        if (allChannels.length > 0) {
            const groups = [...new Set(allChannels.map(channel => channel.group))];
            groups.forEach(group => {
                const tabButton = createTabButton(group);
                groupTabsContainer.appendChild(tabButton);
            });

            const firstTab = document.querySelector(".tab-button");
            if (firstTab) {
                firstTab.classList.add("active");
                displayChannels(allChannels.filter(c => c.group === firstTab.textContent));
            } else {
                displayChannels(allChannels);
            }
        } else {
            channelListContainer.innerHTML = `<p>ไม่พบช่องรายการใน Playlist นี้</p>`;
        }
    } catch (error) {
        console.error("❌ Error loading playlist:", error);
        channelListContainer.innerHTML = `<p>เกิดข้อผิดพลาดในการโหลด Playlist นี้: ${name}</p>`;
    }
}



function displayChannels(channels) {
    channelListContainer.innerHTML = "";
    if (channels.length > 0) {
        const sortedChannels = channels.sort((a, b) => a.name.localeCompare(b.name));
        sortedChannels.forEach(channel => {
            const item = createChannelItem(channel);
            channelListContainer.appendChild(item);
        });
    } else {
        channelListContainer.innerHTML = `<p>ไม่พบช่องรายการในกลุ่มนี้</p>`;
    }
}

function parseM3U(m3uContent) {
    const lines = m3uContent.split('\n');
    const channels = [];
    let currentChannel = {};

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('#EXTINF')) {
            const match = line.match(/group-title="([^"]+)"/);
            const group = match ? match[1] : 'Uncategorized';
            const logoMatch = line.match(/tvg-logo="([^"]+)"/);
            const logo = logoMatch ? logoMatch[1] : '';
            const nameMatch = line.match(/,(.*)$/);
            const name = nameMatch ? nameMatch[1].trim() : 'Unknown Channel';

            currentChannel = { group, name, logo };
        } else if (line.startsWith('#KODIPROP:inputstream.adaptive.license_key')) {
            const keyMatch = line.match(/license_key=(.*)$/);
            if (keyMatch) {
                const [key_id, key_value] = keyMatch[1].split(':');
                if (key_id && key_value) {
                    currentChannel.key_id = key_id;
                    currentChannel.key_value = key_value;
                }
            }
        } else if (line.startsWith('http')) {
            currentChannel.source = line;
            if (Object.keys(currentChannel).length > 0) {
                channels.push(currentChannel);
                currentChannel = {};
            }
        }
    }
    return channels;
}

function createChannelItem(channel) {
    const item = document.createElement('div');
    item.className = 'channel-item';
    item.innerHTML = `
        <img class="channel-image" src="${channel.logo || 'https://via.placeholder.com/80?text=TV'}" alt="${channel.name}">
        <div class="channel-name">${channel.name}</div>
    `;
    item.addEventListener('click', () => {
        playChannel(channel);
    });
    return item;
}

function createTabButton(group) {
    const button = document.createElement('button');
    button.className = 'tab-button';
    button.textContent = group;
    button.addEventListener('click', () => {
        const allTabs = document.querySelectorAll('.tab-button');
        allTabs.forEach(btn => btn.classList.remove('active'));
        
        button.classList.add('active');
        displayChannels(allChannels.filter(c => c.group === group));
    });
    return button;
}

function playChannel(channel) {
    if (!channel.source) {
        console.error("Channel source is missing.");
        alert("ไม่พบลิงก์สำหรับช่องนี้");
        return;
    }

    const params = new URLSearchParams({
        source: channel.source,
        channelName: channel.name,
        mimeType: channel.source.includes('.m3u8') ? 'application/x-mpegURL' : 
                  (channel.source.includes('.mpd') ? 'application/dash+xml' : ''),
        keyId: channel.key_id || '',
        keyValue: channel.key_value || ''
    });

    const playerUrl = `player.html?${params.toString()}`;
    videoPlayerContainer.innerHTML = `<iframe src="${playerUrl}" allowfullscreen></iframe>`;
}

function renderCustomPlaylistsMenu() {
    const playlists = getCustomPlaylists();
    playlistList.innerHTML = '';
    
    // แสดงผล defaultPlaylists
    defaultPlaylists.forEach(playlist => {
        const li = document.createElement('li');
        const sourceDisplay = (playlist && playlist.source) ? (playlist.source.length > 50 ? playlist.source.substring(0, 50) + '...' : playlist.source) : 'N/A';
        li.innerHTML = `
            <div class="playlist-item-header">
                <strong>${playlist.name}</strong>
            </div>
            <div class="playlist-urls">
                <span>${sourceDisplay}</span>
            </div>
        `;
        playlistList.appendChild(li);
    });

    // แสดงผล playlists ที่เพิ่มเอง
    playlists.forEach(playlist => {
        const li = document.createElement('li');
        const sourceDisplay = (playlist && playlist.source) ? (playlist.source.length > 50 ? playlist.source.substring(0, 50) + '...' : playlist.source) : 'N/A';
        li.innerHTML = `
            <div class="playlist-item-header">
                <strong>${playlist.name}</strong>
                <button class="remove-btn" data-name="${playlist.name}">Remove</button>
            </div>
            <div class="playlist-urls">
                <span>${sourceDisplay}</span>
            </div>
        `;
        playlistList.appendChild(li);
    });
}

function addPlaylist() {
    const name = newPlaylistNameInput.value.trim();
    const source = newPlaylistSourceInput.value.trim();
    if (name && source) {
        const playlists = getCustomPlaylists();
        
        let playlistType = "local";
        if (source.startsWith("http://") || source.startsWith("https://")) {
            playlistType = "url";
        }

        playlists.push({ name: name, type: playlistType, source: source });
        saveCustomPlaylists(playlists);
        renderCustomPlaylistsMenu();
        renderPlaylistSelector();
    }
    newPlaylistNameInput.value = '';
    newPlaylistSourceInput.value = '';
}

function removeCustomPlaylist(nameToRemove) {
    let playlists = getCustomPlaylists();
    playlists = playlists.filter(p => p.name !== nameToRemove);
    saveCustomPlaylists(playlists);
    renderCustomPlaylistsMenu();
    renderPlaylistSelector();
}

managePlaylistsBtn.addEventListener('click', () => {
    customPlaylistMenu.style.display = "flex";
    renderCustomPlaylistsMenu();
});

closeMenuBtn.addEventListener('click', () => {
    customPlaylistMenu.style.display = "none";
    renderPlaylistSelector();
});

addPlaylistBtn.addEventListener('click', addPlaylist);

playlistList.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-btn')) {
        const name = e.target.dataset.name;
        removeCustomPlaylist(name);
    }
});

playlistSelector.addEventListener('change', (e) => {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const selectedValue = selectedOption.value;
    const selectedName = selectedOption.textContent;
    const selectedType = selectedOption.dataset.type;

    if (selectedValue === "manage") {
        managePlaylistsBtn.click();
    } else {
        loadAndDisplayPlaylist(selectedValue, selectedName, selectedType);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    renderPlaylistSelector();
    customPlaylistMenu.style.display = "none";
    if (defaultPlaylists.length > 0) {
        const firstPlaylist = defaultPlaylists[0];
        loadAndDisplayPlaylist(firstPlaylist.source, firstPlaylist.name, firstPlaylist.type);
    }

});
