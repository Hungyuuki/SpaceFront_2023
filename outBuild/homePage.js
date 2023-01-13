var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const SOCKET_EVENT = {
    CHANGE_STATUS_MIC: 'change-status-mic',
    CHANGE_STATUS_SPEAKER: 'change-status-speaker',
    CHANGE_STATUS_MIC_AND_SPEAKER: 'change-status-mic-and-speaker',
    CHANGE_AVATAR: 'change-avatar',
    CHANGE_NAME: 'change-name',
    JOIN_ROOM: 'join-room',
    LEAVE_ROOM: 'leave-room',
    CREATE_NEW_ROOM: 'create-new-room',
    CREATE_NEW_FLOOR: 'create-new-floor',
    REMOVE_ROOM: 'remove-room',
    REMOVE_FLOOR: 'remove-floor',
    CHANGE_LOGIN_STATUS: 'change-login-status',
    JOIN_FLOOR: 'join-floor',
    JOIN_CHANNEL: 'join-channel-agora',
    LEAVE_CHANNEL: 'leave-channel-agora',
    CONNECTED: 'connected',
    DISCONNECTING: 'disconnecting',
    READY_TO_CHAT: 'ready-to-chat',
    DISCONNECT_NETWORK: 'disconnect-network',
    USER_CONNECTED: 'user-connected',
};
const statusUser = ["離席中", "会議中", "取込中", "電話中", "外出中", "出張中", ""];
const colorStatus = ["gray", "green", "#5d0b0b", "#b5c014", "#911258", "orange", "#F3F3F3", "#555C55FF"];
let floorIds = [];
let role = 0;
const specialStatusIcon = [
    "../static/logout.png",
    "../static/online-meeting.png",
    "../static/rush.png",
    "../static/viber.png",
    "../static/logout.png",
    "../static/briefcase.png"
];
const CUSTOM_STATUS = 7;
const SPECIAL_STATUS = 6;
const ROLE_ADMIN = 2;
const ICON_STATUS = 6;
document.addEventListener("mouseover", function (event) {
    localStorage.setItem("last_action_time", String(Date.now() + (1000 * 60 * 5)));
});
const userAvatar = document.getElementById('currentAvatar');
const micOn = document.querySelector(`.mic #mic-on`);
const micOff = document.querySelector(`.mic #mic-off`);
const speakerOn = document.querySelector(`.headphone #speaker-on`);
const speakerOff = document.querySelector(`.headphone #speaker-off`);
function openRoomCreate() {
    localStorage.setItem('names', getAllNamesOf());
    window.api.send("open-room-create");
}
const getAllNamesOf = (className = '.room-name') => {
    const names = [];
    const elements = document.querySelectorAll(className);
    for (const element of elements) {
        names.push(element.innerHTML.trim());
    }
    return names.join(',');
};
function exitRoom() {
    return __awaiter(this, void 0, void 0, function* () {
        if (window.api.store('Get', 'is_join_room')) {
            localStorage.removeItem('roomId');
            if (readyToConnectAgora()) {
                window.api.invoke('checkStatusMicAndSpeakerUsersInRoom', { exitRoom: true })
                    .then((statusUsersInRoom) => {
                    window.api.invoke('leaveRoom');
                    if (statusUsersInRoom.onChannel) {
                        if (statusUsersInRoom.onChannelByMe) {
                            sendEventToSocket(SOCKET_EVENT.LEAVE_CHANNEL, statusUsersInRoom.socketIds);
                        }
                        joinChannel('off-speaker');
                    }
                });
            }
            else {
                window.api.invoke('leaveRoom');
            }
            resetStatus();
        }
        if (localStorage.getItem("is_setting_page")) {
            localStorage.removeItem("is_setting_page");
            showFloor(localStorage.getItem("floorId"));
        }
    });
}
const load = () => __awaiter(this, void 0, void 0, function* () {
    Promise.all([
        window.api.store("Get", "floorId"),
        window.api.invoke("get-user-id", ""),
        window.api.invoke('getCurrentAvatar')
    ]).then((data) => {
        const [floorId, userId, avatar] = data;
        localStorage.setItem('userId', userId);
        showPageFloor(floorId);
        //load current avartar
        userAvatar.setAttribute('src', avatar !== null && avatar !== void 0 ? avatar : '../static/defaultImage.png');
        userAvatar.style.display = "inline";
        window.api.store('Get', 'userName')
            .then((userName) => {
            document.getElementById("username").innerHTML = userName;
        });
    });
});
load();
function showFloor(id) {
    const oldFloorId = localStorage.getItem("floorId");
    window.api.invoke('change-floor', {
        floor_id: id,
        old_floor_id: oldFloorId
    });
    localStorage.setItem("floorId", id);
    getPageFloor(oldFloorId, id);
}
const goBackToFLoor = () => {
    localStorage.removeItem("is_setting_page");
    getPageFloor(null, localStorage.getItem('floorId'));
};
function getPageFloor(oldFloorId, floor_id) {
    Promise.all([
        window.api.invoke("getRoomsByStatusAndFloorId", floor_id),
        window.api.invoke("getActiveRoomUsersByFloorId", floor_id)
    ])
        .then((data) => {
        const [rooms, users] = data;
        renderHTMLInFloor(floor_id, rooms, users, oldFloorId);
    });
}
const renderHTMLInFloor = (floor_id, rooms, users, oldFloorId) => __awaiter(this, void 0, void 0, function* () {
    var _a;
    const result = [];
    for (const room of rooms.rooms[0]) {
        result.push({
            room_id: room.room_id,
            room: {
                room_id: room.room_id,
                room_name: room.room_name,
                icon_images: room.icon_images
            }
        });
    }
    for (const item of users) {
        const index = result.findIndex((room) => item.room_id == room.room_id);
        if (item.user_id == localStorage.getItem('userId')) {
            localStorage.setItem('current_floor_id', item.floor_id);
            if (localStorage.getItem('on-channel')) {
                if (item.user_is_speaker == 1) {
                    if (item.user_is_mic == 1) {
                        joinChannel('join-room-mic-speaker-on');
                    }
                    else {
                        joinChannel('join-room-speaker-on');
                    }
                }
            }
            yield window.api.store('Set', {
                is_join_room: true,
                current_floor_id: floor_id,
                old_room: item.room_id,
                room_id: item.room_id
            });
        }
        if (index != -1) {
            const user = {
                user_id: item.user_id,
                user_name: convertUnicodeToString(item.user_name),
                user_avatar: (_a = item.user_avatar) !== null && _a !== void 0 ? _a : '../static/defaultImage.png',
                user_is_mic: item.user_is_mic,
                user_is_speaker: item.user_is_speaker,
                uid: item.uid,
                user_login_status: item.user_login_status,
                user_status_icon: item.user_status_icon,
                custom_status: item.user_custom_status //text của custom status
            };
            if (result[index].users) {
                result[index].users.push(user);
            }
            else {
                result[index].users = [user];
            }
        }
    }
    if (oldFloorId != null) {
        changeBackgroundColorForElement(`${oldFloorId}`, 'rgb(238, 238, 238)');
        changeTextColorForElement(`${oldFloorId}`, 'rgb(61, 62, 68)');
    }
    changeBackgroundColorForElement(`${floor_id}`, 'rgb(252, 76, 86)');
    changeTextColorForElement(`${floor_id}`, '#ffffff');
    document.getElementById("room-list").innerHTML = result.map((item) => createRoomElement(item.room, item.users)).join('');
    result.forEach((item) => {
        if (onChannel(item.room.room_id)) {
            changeActiveUsersInRoom(item.room.room_id, item.users);
        }
    });
    const isJoinRoom = yield window.api.store('Get', 'is_join_room');
    if (isJoinRoom && onChannel(localStorage.getItem('roomId')) && readyToConnectAgora()) {
        toggleActiveStatus('unactive', 'active');
    }
});
function changeBackgroundColorForElement(elementId, color) {
    const element = document.getElementById(elementId);
    if (element != null) {
        element.style.backgroundColor = color;
    }
}
function changeTextColorForElement(elementId, color) {
    const element = document.getElementById(elementId);
    if (element != null) {
        element.style.color = color;
    }
}
const readyToChatOnLoad = (user) => {
    if (localStorage.getItem('userId') == user.user_id) {
        return '';
    }
    if (localStorage.getItem(`${user.user_id}`)) {
        return 'unactive';
    }
    return (user.user_is_mic == 1 || user.user_is_speaker == 1) ? 'active' : '';
};
function createUsersHTMLInRoom(user) {
    var _a, _b, _c;
    let displayMicOn = "none";
    let displayMicOff = "inline";
    let displayStatus = '';
    const colorBackroundStatus = (_a = colorStatus[user.user_login_status]) !== null && _a !== void 0 ? _a : '';
    if (user.user_is_mic == '1') {
        displayMicOn = "inline";
        displayMicOff = "none";
    }
    let displaySpeakerOn = "none";
    let displaySpeakerOff = "inline";
    if (user.user_is_speaker == '1') {
        displaySpeakerOn = "inline";
        displaySpeakerOff = "none";
    }
    let user_login_status = (_b = statusUser[user.user_login_status]) !== null && _b !== void 0 ? _b : '';
    let user_status_icon = (_c = specialStatusIcon[user.user_login_status]) !== null && _c !== void 0 ? _c : '';
    //Rẽ nhánh
    if (user.user_login_status === CUSTOM_STATUS) {
        user_login_status = user.custom_status;
        if (user.id === localStorage.getItem("userId")) {
            localStorage.setItem("custom-status", user.custom_status);
        }
    }
    if (!user_login_status) {
        displayStatus = '-none';
        user_login_status = '';
    }
    if (!user_status_icon) {
        displayStatus = '-none';
        user_status_icon = '';
    }
    return `
                              <div class="user" id="user-${user.user_id}">
                              <div class="logo-user button">
                                <img src="${user.user_avatar}">
                              </div>
                              <div id='login-status-${user.user_id}' class="status-users${displayStatus}" style="background-color: ${colorBackroundStatus};">
                              <img src="${user_status_icon}">
                              </div>
                              <h4 class="button">${user.user_name}</h4>
                              <div class="mic button" onclick="changeStatusMic(${user.user_id})">
                                <i class="fa-solid fa-microphone" style="display: ${displayMicOn};" id="mic-on-${user.user_id}"></i>
                                <i class="fa-solid fa-microphone-slash" id="mic-off-${user.user_id}" style="display: ${displayMicOff};"></i>
                              </div>
                              <div class="headphone button" onclick="changeStatusSpeaker(${user.user_id})">
                                <i class="fa-solid fa-headphones" id="speaker-on-${user.user_id}" style="display: ${displaySpeakerOn};"></i>
                                <img src="../static/earphone.png"  class="fa-solid fa-earphones" id="speaker-off-${user.user_id}" style="display: ${displaySpeakerOff}; width: 20px; height: 20px; opacity: 0.3" >
                              </div>
                            </div>
                        
                                          `;
}
const convertUnicodeToString = (unicode) => {
    if (unicode.split(',').length > 1) {
        return unicode.split(',')
            .map((item) => String.fromCodePoint(item))
            .join("");
    }
    return unicode;
};
function createRoomHTML(room) {
    return `
      ${role == ROLE_ADMIN ? `<button onclick ="showConfirmModel(${room.room_id} , 0)" class="remove-room"> x </button>` : ''}
      <div class="header-room button"  onclick="joinRoom(${room.room_id})">
      <div class="circle">
      <svg class="svg-circle">
          <circle cx="50" cy="40" r="30"></circle>
        </svg>
      </div>
        <h4 class="room-name button">${room.room_name}</h4>
      </div>
      <div id="info-user-room-${room.room_id}">
        <div id="your-proflie-${room.room_id}"></div>
      </div>
        `;
}
function createRoomElement(room, users) {
    var _a;
    return `
        <div class="relative" id="room-${room.room_id}">
          ${role == ROLE_ADMIN ? `<button onclick ="showConfirmModel(${room.room_id}, ${users === null || users === void 0 ? void 0 : users.length})" class="remove-room"> x </button>` : ''}
          <div class="header-room button"  onclick="joinRoom(${room.room_id})">
          <div class="circle">
          <svg class="svg-circle">
              <circle cx="50" cy="40" r="30"></circle>
            </svg>
          </div>
            <h4 class="room-name button" style="font-size: 14px">${room.room_name} </h4>
          </div>
          <div id="info-user-room-${room.room_id}">
            <div id="your-proflie-${room.room_id}"></div>
          </div>
          ${(_a = users === null || users === void 0 ? void 0 : users.map((user) => createUsersHTMLInRoom(user)).join('')) !== null && _a !== void 0 ? _a : ''}
        </div>
    `;
}
const showConfirmModelFloor = (event, floor_id, position) => {
    event.stopPropagation();
    window.api.invoke('getActiveNumberUserInFloor', floor_id)
        .then((numberUsersInFloor) => {
        window.api.invoke("show-confirm-modal", {
            floor_id: floor_id,
            // position: position,
            hasUser: numberUsersInFloor > 0,
            isRemoveFloor: true,
            type: 'floor'
        });
    });
};
const showConfirmModel = (room_id, length) => {
    window.api.invoke("getActiveNumberUserInRoom", room_id)
        .then((uids) => {
        const data = {
            room_id: room_id,
            uids: uids,
            hasUser: (uids === null || uids === void 0 ? void 0 : uids.length) > 0,
            type: 'room'
        };
        window.api.invoke("show-confirm-modal", data);
    });
};
const showPageFloor = (floor_id) => {
    localStorage.setItem('floorId', floor_id);
    Promise.all([
        window.api.invoke("getFloor", {
            company_id: localStorage.getItem("companyId"),
            floor_id: floor_id
        }),
        window.api.invoke("getRoomsByStatusAndFloorId", floor_id),
        window.api.invoke("getActiveRoomUsersByFloorId", floor_id),
        window.api.invoke("getUsersById", localStorage.getItem('userId'))
    ]).then((data) => {
        const [floors, rooms, users, user] = data;
        role = user.role;
        if (user && user.login_status == CUSTOM_STATUS) {
            localStorage.setItem("custom_status", user.custom_status);
        }
        if (floors.floors[0] == "") {
            if (role == ROLE_ADMIN) {
                let elButtonAdd = `<svg class="floor add-new" viewBox="0 0 100 100" style="width: 40px; height: 40px; background-color: rgb(255,255,255);" onclick="addFloor()">
        <circle cx="50" cy="37" r="29" fill="none" stroke-width="6"></circle>
        <line class="plus" x1="35.5" y1="38" x2="65.5" y2="38" stroke-width="6"></line>
        <line class="plus" x1="50" y1="23.5" x2="50" y2="53.5" stroke-width="6"></line>
        </svg>`;
                addElement(elButtonAdd, "floors");
            }
        }
        else {
            document.querySelector('.header').innerHTML = renderHeaderHTML();
            floorIds = floors.floors[0].map((floor) => floor.id);
            const floorsHTML = createFLoorsHTML(floors.floors[0], floor_id, user.role); //tạo floor
            renderHTMLInFloor(floor_id, rooms, users, null); //push floor id, rooms, user vào các đối tượng html đó
            document.getElementById('floors').innerHTML = floorsHTML;
            loadStatusUser(user); //gọi hàm xử lý status của từng user
        }
    });
};
const renderHeaderHTML = () => {
    return `
  <div class="logoheader button"><img onclick="goBackToFLoor()" src="../../public/static/app3.png"></div>
          <div class="sub-select ${role == ROLE_ADMIN ? '' : 'active'}">
              <div class="users button" onclick="showMembers()">
                  <i class="fa-solid fa-users"></i>
                  <p class="symbol-text">Users</p>
              </div>
              <div class="setting button" onclick="settingForm('')">
                  <i class="fa-solid fa-gear"></i>
                  <p>Setting</p>
              </div>
              <div class="exit button" onclick="exitRoom()">
                  <i class="fa-solid fa-right-from-bracket"></i>
                  <p>Exit</p>
              </div>
              <div class="exit button" onclick="logoutRequest()">
                  <i class="fa-solid fa-right-from-bracket"></i>
                  <p>Log out</p>
              </div>
          </div>
          ${role == ROLE_ADMIN ? `
          <div id="create-room" class="buttons">
            <button onclick="openRoomCreate()" style="font-size: 12px; margin: 0px; width: 88px; height: 40px;">ルームの追加</button>
          </div>
          ` : ''}`;
};
const createRoomButton = () => {
    const createRoomButton = document.createElement('div');
    createRoomButton.setAttribute('class', 'buttons');
    createRoomButton.innerHTML = `<button onclick="openRoomCreate()" style="font-size: 12px; margin: 0px; width: 88px; height: 40px;">ルームの追加</button>`;
    return createRoomButton;
};
//Nút status dưới
const loadStatusUser = (user) => {
    localStorage.setItem('status_login', user.login_status);
    const status = document.getElementById('status');
    if (user.login_status == CUSTOM_STATUS) {
        status.innerText = user.custom_status;
        localStorage.setItem('custom_status', user.custom_status);
    }
    else if (!user.login_status || user.login_status == SPECIAL_STATUS) {
        status.innerText = 'ステータス変更';
    }
    else {
        status.innerText = statusUser[user.login_status];
    }
    if (user.is_mic == 1) {
        micOn.style.display = "inline";
        micOff.style.display = "none";
    }
    else {
        micOff.style.display = "inline";
        micOn.style.display = "none";
    }
    if (user.is_speaker == 1) {
        speakerOn.style.display = "inline";
        speakerOff.style.display = "none";
    }
    else {
        speakerOff.style.display = "inline";
        speakerOn.style.display = "none";
    }
};
function createFLoorsHTML(floors, floor_id, role) {
    localStorage.setItem('first_floor', floors[0].id);
    let floorsHTML = ``;
    for (let i = 0; i < floors.length; i++) {
        //tạo floor
        floorsHTML += createFLoorElement(floors[i], floors[i].id == floor_id ? 'rgb(252,76,86)' : 'rgb(238, 238, 238)', //Set màu nền, click thì đỏ, ko click thì xám
        floors[i].id == floor_id ? '#ffffff' : 'rgb(61, 62, 68)', //set màu text, click thì trắng, ko click thì đen
        role);
    }
    if (role == ROLE_ADMIN) {
        floorsHTML +=
            `<svg class="floor add-new" viewBox="0 0 100 100" style="width: 40px; height: 40px; background-color: rgb(255,255,255); align-items: center;" onclick="addFloor()">
    <circle cx="50" cy="37" r="29" fill="none" stroke-width="6"></circle>
    <line class="plus" x1="35.5" y1="38" x2="65.5" y2="38" stroke-width="6"></line>
    <line class="plus" x1="50" y1="23.5" x2="50" y2="53.5" stroke-width="6"></line>
    </svg>`;
        ;
    }
    return floorsHTML;
}
function createFLoorElement(floor, backgroundColor, color, role) {
    return `
  <div class="floor" style=
  " background-color: ${backgroundColor}; 
    color: ${color};" 
    id=${floor.id} 
    onclick="showFloor(${floor.id})" >
    ${role == ROLE_ADMIN ? `<button onclick ="showConfirmModelFloor(event, ${floor.id})" class="remove-floor" > x </button>` : ''}
    <p>${floor.name}</p>
  </div>`;
}
function onJoinRoomEvent(user) {
    var _a, _b, _c;
    const oldUserElement = document.getElementById(`user-${user.userId}`);
    if (oldUserElement != null) {
        oldUserElement.parentNode.removeChild(oldUserElement);
    }
    // let loginStatus = statusUser[user.login_status] ?? '';
    let loginStatus = (_a = specialStatusIcon[user.login_status]) !== null && _a !== void 0 ? _a : '';
    if (user.login_status == CUSTOM_STATUS) {
        loginStatus = user.custom_status;
    }
    const colorBackroundStatus = (_b = colorStatus[user.login_status]) !== null && _b !== void 0 ? _b : '';
    let displayStatus = '';
    let displayMicOn = "none";
    let displayMicOff = "inline";
    if (user.user_is_mic == '1') {
        displayMicOn = "inline";
        displayMicOff = "none";
    }
    let displaySpeakerOn = "none";
    let displaySpeakerOff = "inline";
    if (user.user_is_speaker == '1') {
        displaySpeakerOn = "inline";
        displaySpeakerOff = "none";
    }
    if (!user.login_status) {
        if (!user.statusIcon) {
            displayStatus = '-none';
        }
    }
    let text = `
              <div class="logo-user button">
              <img src="${user.userAvatar}">
              </div>
              <div id='login-status-${user.userId}' class="status-users${displayStatus}" style="background-color: ${colorBackroundStatus};">
              <img src="${specialStatusIcon[user.login_status]}"></div>
              <h4 class="button">${user.username}</h4>
              <div class="mic button" id="mic-${user.userId}" onmouseover="changeCursorMicOfMe(${user.userId})"
                onclick="changeStatusMic(${user.userId})">
                <i class="fa-solid fa-microphone" style="display: ${displayMicOn};" id="mic-on-${user.userId}"></i>
                <i class="fa-solid fa-microphone-slash" id="mic-off-${user.userId}" style="display: ${displayMicOff};"></i>
              </div>
              <div class="headphone button" id="speaker-${user.userId}" onmouseover="changeCursorSpeakerOfMe(${user.userId})"
                onclick="changeStatusSpeaker(${user.userId})">
                <i class="fa-solid fa-headphones" id="speaker-on-${user.userId}" style="display: ${displaySpeakerOn};"></i>
                <img src="../static/earphone.png" class="fa-solid fa-earphones" id="speaker-off-${user.userId}"
              style="display: ${displaySpeakerOff}; width: 20px; height: 20px; opacity: 0.3">
              </div>
            </div>
      `;
    const userElement = document.createElement('div');
    userElement.classList.add('user');
    userElement.setAttribute('id', `user-${user.userId}`);
    userElement.innerHTML = text;
    if (!document.querySelector(`#room-${user.room_id} #user-${user.userId}`)) {
        (_c = document.getElementById(`room-${user.room_id}`)) === null || _c === void 0 ? void 0 : _c.appendChild(userElement);
        if (onChannel(user.room_id)) {
            changeActiveUsersInRoom(user.room_id);
            if (displaySpeakerOn == 'inline' || displayMicOn == 'inline') {
                waitingConnectAgora(user.userId);
            }
        }
    }
    if (user.old_room && !onChannel(user.old_room)) {
        if (localStorage.getItem('roomId') == user.old_room) {
            resetStatus();
        }
        resetActiveUsersInRoom(user.old_room);
    }
}
const appendUserElement = (user) => __awaiter(this, void 0, void 0, function* () {
    var _b;
    const oldUserElement = document.getElementById(`user-${user.userId}`);
    if (oldUserElement != null) {
        oldUserElement.parentNode.removeChild(oldUserElement);
    }
    const userElement = document.createElement('div');
    userElement.classList.add('user');
    userElement.setAttribute('id', `user-${user.userId}`);
    userElement.innerHTML = renderUserHTML(user);
    (_b = document.getElementById(`room-${user.room_id}`)) === null || _b === void 0 ? void 0 : _b.appendChild(userElement);
});
const renderUserHTML = (user) => {
    var _a, _b;
    let loginStatus = (_a = statusUser[user.login_status]) !== null && _a !== void 0 ? _a : '';
    if (user.login_status == CUSTOM_STATUS) {
        loginStatus = user.custom_status;
    }
    const colorBackroundStatus = (_b = colorStatus[user.login_status]) !== null && _b !== void 0 ? _b : '';
    return `
  <div class="logo-user button">
  <img src="${user.userAvatar}"></div>
  <div id='login-status-${user.userId}' class="status-users${(user.login_status && user.statusIcon) ? '-none' : ''}" style="background-color: ${colorBackroundStatus};">
  <img src="${specialStatusIcon[user.login_status]}"></div>
  <h4 class="button">${user.username}</h4>
      <div class="mic button" id="mic-${user.userId}" onmouseover="changeCursorMicOfMe(${user.userId})"
        onclick="changeStatusMic(${user.userId})">
        <i class="fa-solid fa-microphone" style="display: ${micOn.style.display};" id="mic-on-${user.userId}"></i>
        <i class="fa-solid fa-microphone-slash" id="mic-off-${user.userId}" style="display: ${micOff.style.display};"></i>
      </div>
      <div class="headphone button" id="speaker-${user.userId}" onmouseover="changeCursorSpeakerOfMe(${user.userId})"
        onclick="changeStatusSpeaker(${user.userId})">
        <i class="fa-solid fa-headphones" id="speaker-on-${user.userId}" style="display: ${speakerOn.style.display};"></i>
        <img src="../static/earphone.png" class="fa-solid fa-earphones" id="speaker-off-${user.userId}"
      style="display: ${speakerOff.style.display}; width: 20px; height: 20px; opacity: 0.3">
      </div>
    </div>
  `;
};
const changeCursorMicOfMe = (userId) => {
    if (localStorage.getItem('userId') == userId) {
        document.getElementById(`mic-${userId}`).classList.add('active');
    }
};
const changeCursorSpeakerOfMe = (userId) => {
    if (localStorage.getItem('userId') == userId) {
        document.getElementById(`speaker-${userId}`).classList.add('active');
    }
};
function onLeaveRoomEvent(user) {
    if (!user.isChangeRoom && user.leave) {
        if (user.userId == localStorage.getItem('userId')) {
            changeStatus("speaker-on", "speaker-off");
            changeStatus("mic-on", "mic-off");
        }
    }
    const userElement = document.getElementById(`user-${user.userId}`);
    if (userElement != null) {
        userElement.parentNode.removeChild(userElement);
    }
    if (!onChannel(user.room_id)) {
        if (user.room_id == localStorage.getItem('roomId')) {
            resetStatus();
        }
        resetActiveUsersInRoom(user.room_id);
    }
}
function onChangeAvatarEvent(user) {
    const avatarElement = document.querySelector(`#user-${user.userId} .logo-user img`);
    if (avatarElement != null) {
        avatarElement.setAttribute('src', user.userAvatar);
    }
}
const onChangeNameEvent = (user) => {
    const userElement = document.querySelector(`#user-${user.userId} h4`);
    if (userElement) {
        userElement.innerHTML = user.username;
    }
};
const onChangeMicEvent = (user) => {
    const micOn = document.querySelector(`#mic-on-${user.userId}`);
    const micOff = document.querySelector(`#mic-off-${user.userId}`);
    if (user.on) {
        micOn.style.display = 'inline';
        micOff.style.display = 'none';
    }
    else {
        micOn.style.display = 'none';
        micOff.style.display = 'inline';
    }
    if (onChannel(user.room_id) && !offStatus(user.userId)) {
        waitingConnectAgora(user.userId);
    }
    else {
        const userElement = document.getElementById(`user-${user.userId}`);
        userElement === null || userElement === void 0 ? void 0 : userElement.classList.remove('active');
        userElement === null || userElement === void 0 ? void 0 : userElement.classList.remove('unactive');
    }
    if (!onChannel(user.room_id)) {
        resetActiveUsersInRoom(user.room_id);
    }
};
const offStatus = (userId) => {
    const micOff = document.querySelector(`#mic-off-${userId}`);
    const speakerOff = document.querySelector(`#speaker-off-${userId}`);
    if (micOff != null && speakerOff != null) {
        return (micOff.style.display == 'inline' && speakerOff.style.display == 'inline');
    }
    return false;
};
const onChangeSpeakerEvent = (user) => {
    const speakerOn = document.querySelector(`#speaker-on-${user.userId}`);
    const speakerOff = document.querySelector(`#speaker-off-${user.userId}`);
    if (user.on) {
        speakerOn.style.display = 'inline';
        speakerOff.style.display = 'none';
    }
    else {
        speakerOn.style.display = 'none';
        speakerOff.style.display = 'inline';
    }
    if (onChannel(user.room_id) && !offStatus(user.userId)) {
        waitingConnectAgora(user.userId);
    }
    else {
        const userElement = document.getElementById(`user-${user.userId}`);
        userElement === null || userElement === void 0 ? void 0 : userElement.classList.remove('active');
        userElement === null || userElement === void 0 ? void 0 : userElement.classList.remove('unactive');
    }
    if (!onChannel(user.room_id)) {
        resetActiveUsersInRoom(user.room_id);
    }
};
const waitingConnectAgora = (userId) => {
    const userElement = document.getElementById(`user-${userId}`);
    userElement === null || userElement === void 0 ? void 0 : userElement.classList.remove('active');
    userElement === null || userElement === void 0 ? void 0 : userElement.classList.add('unactive');
};
const toggleStatus = (roomId, from, to) => {
    const roomElement = document.querySelectorAll(`#room-${roomId} .user`);
    for (let i = 0; i < roomElement.length; i++) {
        const id = roomElement[i].getAttribute('id');
        const userId = id.substring(id.lastIndexOf('-') + 1);
        if (isValid(userId)) {
            if (roomId == localStorage.getItem('roomId')) {
                if (userId != localStorage.getItem('userId')) {
                    roomElement[i].classList.add(to);
                    roomElement[i].classList.remove(from);
                }
            }
            else {
                roomElement[i].classList.add(to);
                roomElement[i].classList.remove(from);
            }
        }
        else {
            roomElement[i].classList.remove(to);
            roomElement[i].classList.remove(from);
        }
    }
};
const changeActiveUsersInRoom = (roomId, users = []) => {
    const roomElement = document.querySelectorAll(`#room-${roomId} .user`);
    for (let i = 0; i < roomElement.length; i++) {
        const id = roomElement[i].getAttribute('id');
        const userId = id.substring(id.lastIndexOf('-') + 1);
        if (isValid(userId)) {
            if (userId != localStorage.getItem('userId')) {
                if (users.length > 0 && users[i].is_offline) {
                    roomElement[i].classList.remove('active');
                    roomElement[i].classList.add('unactive');
                }
                else {
                    roomElement[i].classList.remove('unactive');
                    roomElement[i].classList.add('active');
                }
            }
        }
    }
};
const resetActiveUsersInRoom = (roomId) => {
    const roomElement = document.querySelectorAll(`#room-${roomId} .user`);
    for (let i = 0; i < roomElement.length; i++) {
        const id = roomElement[i].getAttribute('id');
        const userId = id.substring(id.lastIndexOf('-') + 1);
        if (userId != localStorage.getItem('userId')) {
            roomElement[i].classList.remove('active');
            roomElement[i].classList.remove('unactive');
        }
        else {
            resetStatus();
        }
    }
};
const onChangeStatusMicAndSpeakerEvent = (event) => {
    const speakerOn = document.querySelector(`#speaker-on-${event.userId}`);
    const speakerOff = document.querySelector(`#speaker-off-${event.userId}`);
    const micOn = document.querySelector(`#mic-on-${event.userId}`);
    const micOff = document.querySelector(`#mic-off-${event.userId}`);
    if (micOn && speakerOn) {
        if (event.on) {
            speakerOn.style.display = 'inline';
            micOn.style.display = 'inline';
            micOff.style.display = 'none';
            speakerOff.style.display = 'none';
        }
        else {
            micOff.style.display = 'inline';
            speakerOff.style.display = 'inline';
            speakerOn.style.display = 'none';
            micOn.style.display = 'none';
        }
        if (onChannel(event.room_id) && !offStatus(event.userId)) {
            waitingConnectAgora(event.userId);
        }
        else {
            const userElement = document.getElementById(`user-${event.userId}`);
            userElement === null || userElement === void 0 ? void 0 : userElement.classList.remove('active');
            userElement === null || userElement === void 0 ? void 0 : userElement.classList.remove('unactive');
        }
        if (!onChannel(event.room_id)) {
            resetActiveUsersInRoom(event.room_id);
        }
    }
};
const onChangeStatusEvent = (user) => {
    var loginStatus = document.querySelector(`#login-status-${user.userId} img`);
    var statusBackground = document.querySelector(`#login-status-${user.userId}`);
    if (loginStatus != null) {
        if (user.status == CUSTOM_STATUS) {
            loginStatus.src = user.custom_status;
        }
        if (user.status == SPECIAL_STATUS) {
            statusBackground.style.backgroundColor = colorStatus[user.status];
            loginStatus.src = '';
        }
        else {
            loginStatus.src = specialStatusIcon[user.status];
        }
        statusBackground.style.backgroundColor = colorStatus[user.status];
    }
    if (localStorage.getItem('userId') == user.userId) {
        if (user.status === SPECIAL_STATUS) {
            document.getElementById('status').innerHTML = "ステータス変更";
        }
        else if (user.status == CUSTOM_STATUS) {
            document.getElementById('status').innerHTML = user.custom_status;
        }
        else {
            document.getElementById('status').innerHTML = statusUser[user.status];
        }
    }
};
const onReadyToChatEvent = (data) => {
    const roomElement = document.querySelectorAll(`#room-${data.roomId} .user`);
    for (let i = 0; i < roomElement.length; i++) {
        const id = roomElement[i].getAttribute('id');
        const userId = id.substring(id.lastIndexOf('-') + 1);
        if (isValid(userId)) {
            if (data.roomId == localStorage.getItem('roomId')) {
                toggleActiveStatus('unactive', 'active');
                if (userId != localStorage.getItem('userId')) {
                    roomElement[i].classList.remove('unactive');
                    roomElement[i].classList.add('active');
                }
            }
            else {
                roomElement[i].classList.remove('unactive');
                roomElement[i].classList.add('active');
            }
        }
    }
    if (!readyToConnectAgora()) {
        resetStatus();
    }
};
const onDisConnectNetWorkEvent = (userId) => {
    const user = document.getElementById(`user-${userId}`);
    if (user != null) {
        const id = user.parentElement.getAttribute('id');
        if (onChannel(id.substring(id.lastIndexOf('-') + 1))) {
            user.classList.remove('active');
            user.classList.add('unactive');
        }
    }
};
const onUserConnectedEvent = (userId) => {
    const user = document.getElementById(`user-${userId}`);
    if (user != null) {
        const id = user.parentElement.getAttribute('id');
        if (onChannel(id.substring(id.lastIndexOf('-') + 1))) {
            user.classList.remove('unactive');
            user.classList.add('active');
            localStorage.setItem(`${userId}`, 'active');
        }
    }
};
const onRemoveRoomEvent = (room) => __awaiter(this, void 0, void 0, function* () {
    if (room.onRoom) {
        micOn.style.display = 'none';
        micOff.style.display = 'inline';
        speakerOff.style.display = 'inline';
        speakerOn.style.display = 'none';
    }
    const roomRemovedElement = document.getElementById(`room-${room.room_id}`);
    document.getElementById('room-list').removeChild(roomRemovedElement);
});
const onRemoveFloorEvent = (data) => __awaiter(this, void 0, void 0, function* () {
    var _c;
    window.api.store('Get', 'uid')
        .then((uid) => {
        var _a;
        if ((_a = data.uids) === null || _a === void 0 ? void 0 : _a.includes(uid)) {
            window.api.store('Delete', 'is_join_room');
        }
    });
    if (localStorage.getItem('floorId') == data.floor_id) {
        showFloor(localStorage.getItem('first_floor'));
    }
    const removedFloor = document.getElementById(`${data.floor_id}`);
    (_c = document.getElementById('floors')) === null || _c === void 0 ? void 0 : _c.removeChild(removedFloor);
    let index = 0;
    floorIds.filter((id) => id > data.floor_id)
        .forEach((id) => {
        document.getElementById(`${id}`).style.top = `${data.position + (60 * index++)}px`;
    });
    if (role == ROLE_ADMIN) {
        const addNewFloor = document.querySelector('.floor.add-new');
        const position = data.position + (60 * index);
        addNewFloor.style.top = `${position}px`;
    }
});
const onCreateRoomEvent = (room) => {
    var _a;
    let oldRoom = document.getElementById(`room-${room.room_id}`);
    if (oldRoom == null) {
        const newRoomElement = document.createElement('div');
        newRoomElement.setAttribute('id', `room-${room.room_id}`);
        newRoomElement.setAttribute('class', 'relative');
        newRoomElement.innerHTML = createRoomHTML(room);
        (_a = document.getElementById('room-list')) === null || _a === void 0 ? void 0 : _a.appendChild(newRoomElement);
    }
};
function appendNewFloor(floor_id, old_floor_id, name) {
    var _a, _b;
    const newFloorElement = document.createElement('div');
    newFloorElement.setAttribute('id', `${floor_id}`);
    newFloorElement.setAttribute('class', 'floor');
    newFloorElement.setAttribute('onclick', `showFloor(${floor_id})`);
    newFloorElement.style.backgroundColor = '#7f7f7f';
    newFloorElement.style.zIndex = '1000';
    const numberChilds = (_a = document.getElementById('floors')) === null || _a === void 0 ? void 0 : _a.children.length;
    // const addFloor = document.querySelector('.floor.add-new') as HTMLElement;
    // let position = 0;
    // if (numberChilds != null && addFloor != null) {
    //   position = ((numberChilds == 1 ? 0 : numberChilds - 1) * 60);
    //   newFloorElement.style.top = `${position}px`;
    //   addFloor.style.top = `${position + 60}px`;
    // }
    newFloorElement.innerHTML = `
                <button onclick ="showConfirmModelFloor(event, ${floor_id})" class="remove-floor" > x </button>
                <p class = 'floor-name'>${name}</p>
                `;
    if (numberChilds > 2) {
        document.getElementById(`${old_floor_id}`).style.backgroundColor = '#dbdbdb';
        localStorage.setItem("floorId", floor_id);
        window.api.store('Set', { floorId: floor_id });
    }
    (_b = document.getElementById('floors')) === null || _b === void 0 ? void 0 : _b.appendChild(newFloorElement);
    // managed floor id
    floorIds.push(floor_id);
}
const onCreateFloorEvent = (floor) => {
    var _a, _b;
    const newFloorElement = document.createElement('div');
    newFloorElement.setAttribute('id', `${floor.floor_id}`);
    newFloorElement.setAttribute('class', 'floor');
    newFloorElement.setAttribute('onclick', `showFloor(${floor.floor_id})`);
    newFloorElement.style.backgroundColor = '#dbdbdb';
    newFloorElement.innerHTML = `<p>${floor.name}</p>`;
    newFloorElement.style.zIndex = '1000';
    const lastChild = (_a = document.getElementById('floors')) === null || _a === void 0 ? void 0 : _a.lastElementChild;
    const top = lastChild.style.top;
    const position = parseInt(top.substring(0, top.indexOf('p'))) + 60;
    newFloorElement.style.top = `${position}px`;
    (_b = document.getElementById('floors')) === null || _b === void 0 ? void 0 : _b.appendChild(newFloorElement);
    floorIds.push(floor.floor_id);
};
const onJoinChannelEvent = (data) => {
    localStorage.setItem('on-channel', 'true');
    if (speakerOn.style.display == 'inline') {
        if (micOn.style.display == 'inline') {
            joinChannel('join-room-mic-speaker-on');
        }
        else {
            joinChannel('join-room-speaker-on');
        }
    }
    changeActiveUsersInRoom(localStorage.getItem('roomId'));
};
const onLeaveChannelEvent = (data) => {
    localStorage.removeItem('on-channel');
    joinChannel('off-speaker');
};
const onDisconnectEvent = () => {
    window.api.send('show-disconnecting-modal');
};
const logoutRequest = () => {
    localStorage.clear();
    window.api.invoke('log-out', "");
};
function addFloor() {
    let floor = document.getElementsByClassName("floor");
    if (floor.length > 10) {
        console.log("Fails");
    }
    else {
        let text = `
            <div class="add" id="add">
            <p>フロア名</p>
            <div class="input" > <input type="text" id="input"> </div>
            <div class="btn">
                <button class="cancel" onclick="cancelCreate()">キャンセル</button>
                <button class="confirm" onclick="confirmCreate()">追加</button>
            </div>
            </div>
        `;
        addElement(text, "add-floor");
    }
}
function addWarring(text) {
    let boxWarring = document.getElementById("warring");
    if (boxWarring != null || boxWarring != undefined) {
        boxWarring.parentNode.removeChild(boxWarring);
        let elWarring = `
                <p class="warring" id="warring" style= "margin-top: -20px;"> ${text} <p>
            `;
        addElement(elWarring, "add");
    }
    else {
        let elWarring = `
            <p class="warring" id="warring"> ${text} <p>
        `;
        addElement(elWarring, "add");
    }
}
function cancelCreate() {
    deleteElement("add");
}
function confirmCreate() {
    let nameFloor = document.getElementById("input");
    let data = {
        name: nameFloor.value,
    };
    if (nameFloor.value.length == 0) {
        addWarring("* フロアー名を入力して下さい");
    }
    else if (nameFloor.value.length > 10) {
        addWarring("* 文字数は全角10文字以内で入力して下さい");
    }
    else if (isHTML(nameFloor.value)) {
        addWarring("* 全半角文字、絵文字、記号のみ入力できます。");
    }
    else if (getAllNamesOf('.floor-name').split(',').includes(nameFloor.value)) {
        addWarring("* フロア名が既に存在しています。");
    }
    else {
        window.api
            .invoke("addFloor", data)
            .then(function (res) {
            if (res != "Fails") {
                deleteElement("add");
                appendNewFloor(res.floor_id, localStorage.getItem('floorId'), nameFloor.value);
                showFloor(res.floor_id);
            }
            else {
                let text = `
                        <div class="add" id="add">
                        <p>作成に失敗しました</p>
                        </div>
                    `;
                addElement(text, "add-floor");
            }
        })
            .catch(function (err) {
            console.error(err);
        });
    }
}
function addElement(text, elId) {
    let elAdd = document.createElement("div");
    elAdd.innerHTML = text;
    let boxEl = document.getElementById(elId);
    boxEl === null || boxEl === void 0 ? void 0 : boxEl.appendChild(elAdd);
}
function deleteElement(elId) {
    let el = document.getElementById(elId);
    if (el) {
        el.remove();
    }
}
function closeWindown() {
    window.api.send("open-confirm-modal");
}
function minimizeWindown() {
    window.api
        .invoke("minimize-window", "")
        .then(function (res) {
        if (res == "Done") {
            console.log("Done");
        }
    })
        .catch(function (err) {
        console.error(err);
    });
}
let coutClick = 0;
function pinWindown() {
    coutClick++;
    if (coutClick % 2 == 0) {
        window.api
            .invoke("set-window-off-top", "")
            .then(function (res) {
            if (res == "Done") {
                console.log("Done");
            }
        })
            .catch(function (err) {
            console.error(err);
        });
        document.querySelector("#iconPin").innerHTML = "<img src=\"../static/pin.png\" alt=\"\">";
    }
    else {
        window.api
            .invoke("set-window-on-top", "")
            .then(function (res) {
            if (res == "Done") {
                console.log("Done");
            }
        })
            .catch(function (err) {
            console.error(err);
        });
        document.querySelector("#iconPin").innerHTML = "<img src=\"../static/unpin.png\" alt=\"\">";
    }
}
const showMembers = () => {
    document.getElementById('room-list').innerHTML = '';
    window.api
        .invoke("get-users-company", "")
        .then((res) => {
        localStorage.setItem("is_setting_page", "true");
        document.getElementById('room-list').innerHTML = renderMembersHTML(res.users_company[0]);
    });
};
const renderMembersHTML = (members) => {
    return members.map((member) => renderMemberHTML(member)).join('');
};
const renderMemberHTML = (member) => {
    var _a;
    return `
        <div class="user" style="width: 300px;">
          <div class="logo"><img src="${(_a = member.avatar) !== null && _a !== void 0 ? _a : '../static/defaultImage.png'}"></div>
          <div>
            <img src="../static/crown.png" style="margin-left: -9px; display: ${member.role == 'admin' ? 'block' : 'none'};  width="10px" height="10px">
          </div>
          <h4>${convertUnicodeToString(member.onamae)}</h4>
        </div>
    `;
};
// Change Status Mic, Speaker
function changeStatus(idElementOn, idElementOff) {
    let elementOn = document.getElementById(idElementOn);
    if (elementOn != null) {
        elementOn.style.display = "none";
    }
    let elementOff = document.getElementById(idElementOff);
    if (elementOff != null) {
        elementOff.style.display = "inline";
    }
}
const toggleActiveStatus = (from, to) => {
    const footer = document.querySelector(`.footer`);
    footer === null || footer === void 0 ? void 0 : footer.classList.remove(from);
    footer === null || footer === void 0 ? void 0 : footer.classList.add(to);
};
const onChannel = (roomId) => {
    const userIdsMicOn = getUsersMicOnInRoom(roomId);
    const userIdsSpeakerOn = getUsersSpeakerOnInRoom(roomId);
    if (userIdsMicOn.length > 1 && userIdsSpeakerOn.length > 0) {
        return true;
    }
    if (userIdsMicOn.length > 0 && userIdsSpeakerOn.length > 1) {
        return true;
    }
    return false;
};
const isValid = (userId) => {
    const statusMic = document.querySelector(`#user-${userId} .mic .fa-microphone`);
    const statusSpeaker = document.querySelector(`#user-${userId} .headphone i`);
    if (!statusMic || !statusSpeaker) {
        return false;
    }
    return statusMic.style.display == 'inline' || statusSpeaker.style.display == 'inline';
};
const getUsersMicOnInRoom = (roomId) => {
    const usersElement = document.querySelectorAll(`#room-${roomId} .user .mic .fa-microphone`);
    const userIdsMicOn = [];
    for (let i = 0; i < usersElement.length; ++i) {
        if (usersElement[i].style.display == 'inline') {
            const id = usersElement[i].getAttribute('id');
            userIdsMicOn.push(id.substring(id.lastIndexOf('-') + 1));
        }
    }
    return userIdsMicOn;
};
const getUsersSpeakerOnInRoom = (roomId) => {
    const usersElement = document.querySelectorAll(`#room-${roomId} .user .headphone i`);
    const userIdsSpeakerOn = [];
    for (let i = 0; i < usersElement.length; ++i) {
        if (usersElement[i].style.display == 'inline') {
            const id = usersElement[i].getAttribute('id');
            userIdsSpeakerOn.push(id.substring(id.lastIndexOf('-') + 1));
        }
    }
    return userIdsSpeakerOn;
};
const toggleActiveStatusByFriendSide = (userId, from, to) => {
    const user = document.getElementById(`user-${userId}`);
    user === null || user === void 0 ? void 0 : user.classList.remove(from);
    user === null || user === void 0 ? void 0 : user.classList.add(to);
};
const resetStatus = () => {
    const footer = document.querySelector(`.footer`);
    footer === null || footer === void 0 ? void 0 : footer.classList.remove('active');
    footer === null || footer === void 0 ? void 0 : footer.classList.remove('unactive');
};
const resetStatusByFriendSide = (roomId) => {
    const roomElement = document.querySelectorAll(`#room-${roomId} .user`);
    for (let i = 0; i < roomElement.length; i++) {
        const id = roomElement[i].getAttribute('id');
        if (roomId == localStorage.getItem('roomId')) {
            resetStatus();
            if (id.substring(id.lastIndexOf('-') + 1) != localStorage.getItem('userId')) {
                roomElement[i].classList.remove('unactive');
                roomElement[i].classList.remove('active');
            }
        }
        else {
            roomElement[i].classList.remove('unactive');
            roomElement[i].classList.remove('active');
        }
    }
};
const changeStatusMicAndSpeaker = (id, userId, on = true) => {
    if (on) {
        changeStatus("speaker-off", "speaker-on");
        changeStatus(`speaker-off-${userId}`, `speaker-on-${userId}`);
        changeStatus("mic-off", "mic-on");
        changeStatus(`mic-off-${userId}`, `mic-on-${userId}`);
        if (localStorage.getItem('roomId') && onChannel(localStorage.getItem('roomId'))) {
            toggleActiveStatus("active", "unactive");
        }
    }
    else {
        changeStatus("speaker-on", "speaker-off");
        changeStatus(`speaker-on-${userId}`, `speaker-off-${userId}`);
        changeStatus("mic-on", "mic-off");
        changeStatus(`mic-on-${userId}`, `mic-off-${userId}`);
        if (!(localStorage.getItem('roomId') && onChannel(localStorage.getItem('roomId')))) {
            resetActiveUsersInRoom(localStorage.getItem('roomId'));
        }
        resetStatus();
    }
    window.api.invoke('changeStatusMicAndSpeaker', { on: on })
        .then((res) => {
        if (res.is_join_room) {
            if (!on) {
                joinChannel("off-speaker");
                localStorage.removeItem('on-channel');
            }
            window.api.invoke('checkStatusMicAndSpeakerUsersInRoom')
                .then((statusUsersInRoom) => {
                if (on) {
                    if (statusUsersInRoom.onChannel) {
                        toggleActiveStatus('unactive', 'active');
                        changeActiveUsersInRoom(localStorage.getItem('roomId'));
                        sendEventToSocket(SOCKET_EVENT.JOIN_CHANNEL, statusUsersInRoom.socketIds);
                        joinChannel("join-room-mic-speaker-on");
                        localStorage.setItem('on-channel', 'true');
                    }
                }
                else {
                    if (!statusUsersInRoom.onChannel) {
                        sendEventToSocket(SOCKET_EVENT.LEAVE_CHANNEL, statusUsersInRoom.socketIds);
                    }
                }
            });
        }
    });
};
function changeStatusMic(id) {
    let userId = localStorage.getItem("userId");
    if (id == "0") {
        id = userId;
    }
    if (userId == id) {
        if (micOn.style.display == "none") {
            if (speakerOn.style.display === 'none') {
                changeStatusMicAndSpeaker(id, userId);
                return;
            }
        }
        if (micOn.style.display === 'inline') {
            changeStatus("mic-on", "mic-off");
            changeStatus(`mic-on-${userId}`, `mic-off-${userId}`);
        }
        else {
            changeStatus("mic-off", "mic-on");
            changeStatus(`mic-off-${userId}`, `mic-on-${userId}`);
        }
        if (localStorage.getItem('roomId') && onChannel(localStorage.getItem('roomId'))) {
            toggleActiveStatus('active', 'unactive');
        }
        else {
            resetStatus();
            if (!(localStorage.getItem('roomId') && onChannel(localStorage.getItem('roomId')))) {
                resetActiveUsersInRoom(localStorage.getItem('roomId'));
            }
        }
        window.api
            .invoke("change-status-mic", {
            on: micOn.style.display == 'inline'
        })
            .then(function (res) {
            if (res.is_join_room) {
                window.api.invoke('checkStatusMicAndSpeakerUsersInRoom')
                    .then((statusUsersInRoom) => {
                    if (statusUsersInRoom.onChannel) {
                        toggleActiveStatus('unactive', 'active');
                        //TODO active status for another user mic on or speaker on
                        changeActiveUsersInRoom(localStorage.getItem('roomId'));
                        toggleStatus(id, 'unactive', 'active');
                        sendEventToSocket(SOCKET_EVENT.JOIN_CHANNEL, statusUsersInRoom.socketIds);
                        if (res.is_mic == 0) {
                            joinChannel('join-room-speaker-on');
                        }
                        else {
                            joinChannel("mic-on");
                        }
                        localStorage.setItem('on-channel', 'true');
                    }
                    else {
                        sendEventToSocket(SOCKET_EVENT.LEAVE_CHANNEL, statusUsersInRoom.socketIds);
                        joinChannel('off-speaker');
                        localStorage.removeItem('on-channel');
                        resetStatus();
                    }
                });
            }
        })
            .catch(function (err) {
            console.error(err);
        });
    }
}
function changeStatusSpeaker(id) {
    let userId = localStorage.getItem("userId");
    if (id == "0") {
        id = userId;
    }
    if (userId == id) {
        if (speakerOn.style.display == 'inline') {
            if (micOff.style.display === 'none') {
                changeStatusMicAndSpeaker(id, userId, false);
                return;
            }
        }
        if (speakerOn.style.display == 'inline') {
            changeStatus("speaker-on", "speaker-off");
            changeStatus(`speaker-on-${userId}`, `speaker-off-${userId}`);
        }
        else {
            changeStatus("speaker-off", "speaker-on");
            changeStatus(`speaker-off-${userId}`, `speaker-on-${userId}`);
        }
        if (localStorage.getItem('roomId') && onChannel(localStorage.getItem('roomId'))) {
            if (readyToConnectAgora()) {
                toggleActiveStatus('active', 'unactive');
            }
            else {
                resetStatus();
            }
        }
        else {
            resetStatus();
            if (!(localStorage.getItem('roomId') && onChannel(localStorage.getItem('roomId')))) {
                resetActiveUsersInRoom(localStorage.getItem('roomId'));
            }
        }
        window.api
            .invoke("change-status-speaker", {
            on: speakerOn.style.display == 'inline'
        })
            .then(function (res) {
            if (res.is_join_room) {
                window.api.invoke('checkStatusMicAndSpeakerUsersInRoom')
                    .then((statusUsersInRoom) => {
                    if (statusUsersInRoom.onChannel) {
                        if (res.is_speaker == 1) {
                            toggleActiveStatus('unactive', 'active');
                        }
                        changeActiveUsersInRoom(localStorage.getItem('roomId'));
                        sendEventToSocket(SOCKET_EVENT.JOIN_CHANNEL, statusUsersInRoom.socketIds);
                        if (res.is_speaker == 0) {
                            joinChannel('off-speaker');
                            localStorage.removeItem('on-channel');
                        }
                        else {
                            joinChannel('join-room-speaker-on');
                            localStorage.setItem('on-channel', 'true');
                        }
                    }
                    else {
                        sendEventToSocket(SOCKET_EVENT.LEAVE_CHANNEL, statusUsersInRoom.socketIds);
                        joinChannel('off-speaker');
                        localStorage.removeItem('on-channel');
                        resetStatus();
                    }
                });
            }
        })
            .catch(function (err) {
            console.error(err);
        });
    }
}
function listenerChangeStatus(e) {
    if (e.code === "Enter") {
        const customStatus = document.getElementById("custom-status");
        if (isHTML(customStatus.value)) {
            customStatus.value = "";
            customStatus.placeholder = '全半角文字、絵文字、記号のみ入力できます。';
            customStatus.focus();
        }
        else {
            statusUser[CUSTOM_STATUS] = customStatus.value;
            localStorage.setItem("custom_status", statusUser[CUSTOM_STATUS]);
            changeStatusUser(CUSTOM_STATUS, customStatus.value);
            let showStatus = document.getElementById("show-status");
            showStatus.style.display = "none";
            customStatus.value = '';
        }
    }
}
function blankValue() {
    const customStatus = document.getElementById("custom-status");
    customStatus.value = "";
}
const readyToConnectAgora = () => {
    return micOn.style.display == 'inline' || speakerOn.style.display == 'inline';
};
function joinRoom(id) {
    return __awaiter(this, void 0, void 0, function* () {
        window.api.store('Set', {
            room_id: id,
            current_floor_id: localStorage.getItem('floorId'),
        });
        const data = {
            room_id: id,
            floor_id: localStorage.getItem('floorId'),
            userId: localStorage.getItem('userId'),
            login_status: localStorage.getItem('status_login'),
            custom_status: localStorage.getItem('custom_status')
        };
        const isJoinRoom = yield window.api.store('Get', 'is_join_room');
        if (!isJoinRoom) {
            if (micOn.style.display == 'inline') {
                data.isUpdateMic = true;
            }
            if (speakerOff.style.display == 'inline') {
                data.isUpdateSpeaker = true;
            }
            speakerOff.style.display = 'none';
            speakerOn.style.display = 'inline';
            micOn.style.display = 'none';
            micOff.style.display = 'inline';
            data.user_is_mic = micOn.style.display == 'inline' ? 1 : 0;
            data.user_is_speaker = speakerOn.style.display == 'inline' ? 1 : 0;
        }
        else {
            data.user_is_mic = micOn.style.display == 'inline' ? 1 : 0;
            data.user_is_speaker = speakerOn.style.display == 'inline' ? 1 : 0;
            if (localStorage.getItem('floorId') != localStorage.getItem('current_floor_id')) {
                data.old_floor_id = localStorage.getItem('current_floor_id');
            }
        }
        localStorage.setItem('current_floor_id', localStorage.getItem('floorId'));
        window.api.invoke("change-room", data)
            .then(function (res) {
            if (res != "Not_changed") {
                joinChannel('off-speaker');
                appendUserElement(res);
                const oldRoom = localStorage.getItem('roomId');
                if (oldRoom && oldRoom != id) {
                    if (!onChannel(oldRoom)) {
                        resetActiveUsersInRoom(oldRoom);
                    }
                }
                localStorage.setItem('roomId', id);
                if (onChannel(id)) {
                    //TODO emit event to socket;
                    toggleActiveStatus('active', 'unactive');
                }
                if (readyToConnectAgora()) {
                    window.api.invoke('checkStatusMicAndSpeakerUsersInRoom', {
                        room_id: id
                    }).then((statusUsersInRoom) => {
                        if (statusUsersInRoom.onChannel) {
                            toggleActiveStatus('unactive', 'active');
                            changeActiveUsersInRoom(id);
                            if (statusUsersInRoom.onChannelByMe) {
                                sendEventToSocket(SOCKET_EVENT.JOIN_CHANNEL, statusUsersInRoom.socketIds);
                            }
                            if (speakerOn.style.display == 'inline') {
                                if (micOn.style.display == 'inline') {
                                    joinChannel('join-room-mic-speaker-on');
                                }
                                else {
                                    joinChannel('join-room-speaker-on');
                                }
                                localStorage.setItem('on-channel', 'true');
                            }
                        }
                        else {
                            resetStatus();
                            localStorage.removeItem('on-channel');
                        }
                    });
                }
                else {
                    resetStatus();
                }
            }
        })
            .catch(function (err) {
            console.error(err);
        });
    });
}
const sendEventToSocket = (event, socketIds) => {
    window.api.invoke('sendEventToSocket', {
        event, socketIds
    });
};
function joinChannel(statusMic) {
    window.api
        .invoke("channel-Agora", "")
        .then(function (data) {
        if (data) {
            data.statusMic = statusMic;
            window.api
                .agoraVoice(data)
                .then(function (res) {
            })
                .catch(function (err) {
            });
        }
    })
        .catch(function (err) {
        console.error(err);
    });
}
function showSelectStatus() {
    let showStatus = document.getElementById("show-status");
    showStatus.style.display = "block";
    document.getElementById('custom-status').focus();
}
window.onload = function () {
    let showStatus = document.getElementById("show-status");
    document.onclick = function (element) {
        if (element.target.id != "status" && showStatus != null) {
            if (element.target.id === "custom-status") {
                // TODO: need add new columns to show status
            }
            else {
                showStatus.style.display = "none";
            }
        }
    };
};
function changeStatusUser(idStatus, custom_status = undefined) {
    localStorage.setItem('status_login', idStatus);
    let data = {
        login_status: idStatus,
        custom_status: custom_status
    };
    // on speaker when chang special status
    if (idStatus === SPECIAL_STATUS) {
        if (micOn.style.display == 'inline') {
            changeStatusMic(localStorage.getItem('userId'));
        }
        if (speakerOff.style.display == 'inline') {
            changeStatusSpeaker(localStorage.getItem('userId'));
        }
    }
    else {
        if (window.api.store('Get', 'is_join_room')) {
            if (speakerOn.style.display == 'inline' && micOn.style.display == 'inline') {
                changeStatusMicAndSpeaker(idStatus, localStorage.getItem('userId'), false);
            }
            else if (speakerOn.style.display == 'inline') {
                changeStatusSpeaker(localStorage.getItem('userId'));
            }
            else if (micOn.style.display == 'inline') {
                changeStatusMic(localStorage.getItem('userId'));
            }
        }
    }
    window.api
        .invoke("change-login-status", data)
        .then(function (res) {
    })
        .catch(function (err) {
    });
}
const onEventHandler = (event, onHandler) => __awaiter(this, void 0, void 0, function* () {
    if (event === SOCKET_EVENT.CONNECTED) {
        window.api
            .store("Get", event)
            .then((data) => {
            if (data) {
                window.api.store('Delete', event);
                onHandler(true);
            }
        });
    }
    else {
        window.api
            .invoke("pull-event", { event })
            .then((data) => {
            if (data) {
                onHandler(data);
            }
        });
    }
});
setInterval(() => {
    onEventHandler(SOCKET_EVENT.CHANGE_AVATAR, onChangeAvatarEvent);
    onEventHandler(SOCKET_EVENT.CHANGE_NAME, onChangeNameEvent);
    onEventHandler(SOCKET_EVENT.CHANGE_LOGIN_STATUS, onChangeStatusEvent);
    onEventHandler(SOCKET_EVENT.CHANGE_STATUS_MIC, onChangeMicEvent);
    onEventHandler(SOCKET_EVENT.CHANGE_STATUS_SPEAKER, onChangeSpeakerEvent);
    onEventHandler(SOCKET_EVENT.JOIN_ROOM, onJoinRoomEvent);
    onEventHandler(SOCKET_EVENT.LEAVE_ROOM, onLeaveRoomEvent);
    onEventHandler(SOCKET_EVENT.CREATE_NEW_ROOM, onCreateRoomEvent);
    onEventHandler(SOCKET_EVENT.REMOVE_ROOM, onRemoveRoomEvent);
    onEventHandler(SOCKET_EVENT.CREATE_NEW_FLOOR, onCreateFloorEvent);
    onEventHandler(SOCKET_EVENT.REMOVE_FLOOR, onRemoveFloorEvent);
    onEventHandler(SOCKET_EVENT.JOIN_CHANNEL, onJoinChannelEvent);
    onEventHandler(SOCKET_EVENT.LEAVE_CHANNEL, onLeaveChannelEvent);
    onEventHandler(SOCKET_EVENT.CHANGE_STATUS_MIC_AND_SPEAKER, onChangeStatusMicAndSpeakerEvent);
    onEventHandler(SOCKET_EVENT.READY_TO_CHAT, onReadyToChatEvent);
    onEventHandler(SOCKET_EVENT.DISCONNECT_NETWORK, onDisConnectNetWorkEvent);
    onEventHandler(SOCKET_EVENT.USER_CONNECTED, onUserConnectedEvent);
    onEventHandler(SOCKET_EVENT.CONNECTED, (data) => __awaiter(this, void 0, void 0, function* () {
        if (data.isJoinRoom && onChannel(localStorage.getItem('roomId')) && readyToConnectAgora()) {
            toggleActiveStatus('unactive', 'active');
        }
        yield window.api.send('close-modal');
        load();
    }));
    onEventHandler(SOCKET_EVENT.DISCONNECTING, (data) => {
        if (readyToConnectAgora() && data.isJoinRoom && onChannel(localStorage.getItem('roomId'))) {
            toggleActiveStatus('active', 'unactive');
        }
        onDisconnectEvent();
    });
}, 100);
setInterval(() => {
    const lastActionTime = localStorage.getItem('last_action_time');
    if (lastActionTime && parseInt(lastActionTime) - Date.now() <= 0) {
        localStorage.setItem('last_action_time', String(Date.now() + (1000 * 60)));
        showPageFloor(localStorage.getItem('floorId'));
    }
}, 1000);
//# sourceMappingURL=homePage.js.map