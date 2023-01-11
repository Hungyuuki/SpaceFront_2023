"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const electron_store_1 = __importDefault(require("electron-store"));
const axiosConfig_1 = __importDefault(require("./axiosConfig"));
const fs_1 = __importDefault(require("fs"));
const form_data_1 = __importDefault(require("form-data"));
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const sound_play_1 = __importDefault(require("sound-play"));
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
    FORCE_LOG_OUT: 'force-log-out',
    JOIN_CHANNEL: 'join-channel-agora',
    LEAVE_CHANNEL: 'leave-channel-agora',
    CONNECTED: 'connected',
    READY_TO_CHAT: 'ready-to-chat',
    DISCONNECT_NETWORK: 'disconnect-network',
    USER_CONNECTED: 'user-connected',
};
const pushEventToQueue = (event, data) => {
    const oldData = store.get(event);
    if (!oldData || oldData.length == 0) {
        store.set(event, [data]);
    }
    else {
        oldData.push(data);
        store.set(event, oldData);
    }
};
const store = new electron_store_1.default();
const socket = (0, socket_io_client_1.default)(`https://spaceback.developbase.net/`, {
    auth: {
        uid: `${store.get('uid')}`,
        floorId: store.get('floorId'),
        userId: store.get('userId')
    },
    transports: ['websocket'],
    timeout: 5000
});
if (store.get('is_login')) {
    axiosConfig_1.default.get('/users/get-socket-id')
        .then((data) => {
        const socket_id = data.data.socketId;
        if (socket_id) {
            socket.emit('force-log-out', {
                socketId: socket_id
            });
        }
        else {
            store.delete('is_login');
        }
    });
}
const getFilePath = (filePath) => {
    return path.join(__dirname, "../" + filePath);
};
const firebaseApp = require("./firestore");
let check;
function createWindow() {
    return __awaiter(this, void 0, void 0, function* () {
        // await redisClient.connect();
        // Create the browser window.
        const mainWindow = new electron_1.BrowserWindow({
            width: 380,
            height: 800,
            // titleBarStyle: 'hidden',
            autoHideMenuBar: true,
            webPreferences: {
                webviewTag: true,
                nodeIntegration: true,
                preload: path.join(__dirname, "preload.js")
            }
        });
        if (process.platform === 'darwin') {
            mainWindow.setIcon(path.join(__dirname, '../public/static/app3.png'));
        }
        else {
            mainWindow.setIcon(path.join(__dirname, '../public/static/app3.ico'));
        }
        mainWindow.setTitle('');
        let screenSize = mainWindow.getBounds();
        // Router
        // and load the index.html of the app.
        if (store.get('is_login')) {
            mainWindow.loadFile(getFilePath("public/html/homePage.html"));
        }
        else {
            mainWindow.loadFile(getFilePath("public/html/login.html"));
        }
        electron_1.ipcMain.handle('login-form', (event, arg) => __awaiter(this, void 0, void 0, function* () {
            return new Promise(function (reject) {
                mainWindow.loadFile(getFilePath("public/html/login.html"));
            });
        }));
        // Login if user already in
        // if (store.get('refreshToken') && store.get('uid')) {
        //   mainWindow.loadFile(getFilePath("public/html/homePage.html"))
        //   initApp()
        // }
        let isSent = false;
        socket.on('connect_error', (error) => __awaiter(this, void 0, void 0, function* () {
            if (store.get("is_login")) {
                if (!isSent) {
                    pushEventToQueue('disconnecting', {
                        isJoinRoom: store.get('is_join_room'),
                    });
                    isSent = true;
                }
            }
        }));
        socket.on('connect', () => {
            isSent = false;
            pushEventToQueue(SOCKET_EVENT.CONNECTED, {
                isJoinRoom: store.get('is_join_room'),
            });
            setTimeout(() => {
                socket.emit('cache-socket-id', 'quân');
            }, 2000);
        });
        socket.on(SOCKET_EVENT.CHANGE_STATUS_MIC_AND_SPEAKER, (data) => {
            pushEventToQueue(SOCKET_EVENT.CHANGE_STATUS_MIC_AND_SPEAKER, data);
        });
        socket.on(SOCKET_EVENT.LEAVE_ROOM, (data) => {
            pushEventToQueue(SOCKET_EVENT.LEAVE_ROOM, data);
        });
        socket.on(SOCKET_EVENT.JOIN_ROOM, (data) => {
            pushEventToQueue(SOCKET_EVENT.JOIN_ROOM, data);
        });
        socket.on(SOCKET_EVENT.CHANGE_AVATAR, (data) => {
            pushEventToQueue(SOCKET_EVENT.CHANGE_AVATAR, data);
        });
        socket.on(SOCKET_EVENT.DISCONNECT_NETWORK, (data) => {
            pushEventToQueue(SOCKET_EVENT.DISCONNECT_NETWORK, data);
        });
        socket.on(SOCKET_EVENT.USER_CONNECTED, (data) => {
            pushEventToQueue(SOCKET_EVENT.USER_CONNECTED, data);
        });
        socket.on('force-log-out', (data) => __awaiter(this, void 0, void 0, function* () {
            if (store.get('is_join_room')) {
                yield leaveRoom();
            }
            socket.disconnect();
            store.clear();
            return new Promise(function () {
                mainWindow.loadFile(getFilePath("public/html/login.html"));
            });
        }));
        socket.on(SOCKET_EVENT.CHANGE_STATUS_MIC, (data) => {
            pushEventToQueue(SOCKET_EVENT.CHANGE_STATUS_MIC, data);
        });
        socket.on(SOCKET_EVENT.CHANGE_STATUS_SPEAKER, (data) => {
            pushEventToQueue(SOCKET_EVENT.CHANGE_STATUS_SPEAKER, data);
        });
        socket.on(SOCKET_EVENT.CHANGE_LOGIN_STATUS, (data) => {
            pushEventToQueue(SOCKET_EVENT.CHANGE_LOGIN_STATUS, data);
        });
        socket.on(SOCKET_EVENT.CREATE_NEW_ROOM, (data) => {
            pushEventToQueue(SOCKET_EVENT.CREATE_NEW_ROOM, data);
        });
        socket.on(SOCKET_EVENT.CREATE_NEW_FLOOR, (data) => {
            pushEventToQueue(SOCKET_EVENT.CREATE_NEW_FLOOR, data);
        });
        socket.on(SOCKET_EVENT.CHANGE_NAME, (data) => {
            pushEventToQueue(SOCKET_EVENT.CHANGE_NAME, data);
        });
        socket.on(SOCKET_EVENT.REMOVE_ROOM, (data) => {
            var _a;
            if ((_a = data.uids) === null || _a === void 0 ? void 0 : _a.includes(store.get('uid'))) {
                data.onRoom = true;
                store.delete('is_join_room');
            }
            pushEventToQueue(SOCKET_EVENT.REMOVE_ROOM, data);
        });
        socket.on(SOCKET_EVENT.REMOVE_FLOOR, (data) => {
            pushEventToQueue(SOCKET_EVENT.REMOVE_FLOOR, data);
        });
        socket.on(SOCKET_EVENT.JOIN_CHANNEL, (data) => {
            pushEventToQueue(SOCKET_EVENT.JOIN_CHANNEL, data);
        });
        socket.on(SOCKET_EVENT.LEAVE_CHANNEL, (data) => {
            pushEventToQueue(SOCKET_EVENT.LEAVE_CHANNEL, "quân");
        });
        socket.on(SOCKET_EVENT.READY_TO_CHAT, (data) => {
            pushEventToQueue(SOCKET_EVENT.READY_TO_CHAT, data);
        });
        electron_1.ipcMain.handle("success-verify", () => __awaiter(this, void 0, void 0, function* () {
            yield autoLoginWhenVirifySuccess();
            return mainWindow.loadFile(getFilePath("public/html/homePage.html"));
        }));
        electron_1.ipcMain.handle('sign-in-form', (event, arg) => __awaiter(this, void 0, void 0, function* () {
            return new Promise(function (reject) {
                mainWindow.loadFile(getFilePath("public/html/signUp.html"));
            });
        }));
        electron_1.ipcMain.handle('log-out', () => __awaiter(this, void 0, void 0, function* () {
            logOut();
        }));
        const logOut = () => __awaiter(this, void 0, void 0, function* () {
            yield leaveRoom();
            axiosConfig_1.default.delete('/users/log-out');
            store.clear();
            socket.disconnect();
            return new Promise(function () {
                mainWindow.loadFile(getFilePath("public/html/login.html"));
            });
        });
        electron_1.ipcMain.handle('verify-email-form', (event, arg) => __awaiter(this, void 0, void 0, function* () {
            return new Promise(function (reject) {
                mainWindow.loadFile(getFilePath("public/html/verifyEmail.html"));
            });
        }));
        electron_1.ipcMain.handle('home-page', (event, arg) => __awaiter(this, void 0, void 0, function* () {
            return new Promise(function (resolve, reject) {
                mainWindow.loadFile(getFilePath("public/html/homePage.html"));
            });
        }));
        electron_1.ipcMain.handle('set-window-on-top', () => {
            mainWindow.setAlwaysOnTop(true);
            mainWindow.setFullScreenable(false);
        });
        electron_1.ipcMain.handle('get-screen-size', () => {
            return screenSize.width, screenSize.height;
        });
        electron_1.ipcMain.handle('set-window-off-top', (event, arg) => __awaiter(this, void 0, void 0, function* () {
            return new Promise(function (resolve, reject) {
                mainWindow.setAlwaysOnTop(false, "screen-saver");
            });
        }));
        electron_1.ipcMain.handle('set-audio-off', (event, arg) => __awaiter(this, void 0, void 0, function* () {
            return new Promise(function (resolve, reject) {
                mainWindow.webContents.setAudioMuted(true);
            });
        }));
        electron_1.ipcMain.handle('pull-event', (event, data) => __awaiter(this, void 0, void 0, function* () {
            const eventData = store.get(data.event);
            if (eventData && eventData.length > 0) {
                const res = eventData.shift();
                store.set(data.event, eventData);
                return res;
            }
        }));
        electron_1.ipcMain.handle('set-audio-on', (event, arg) => __awaiter(this, void 0, void 0, function* () {
            return new Promise(function (resolve, reject) {
                mainWindow.webContents.setAudioMuted(false);
            });
        }));
        electron_1.ipcMain.handle('leaveRoom', (event, data) => __awaiter(this, void 0, void 0, function* () {
            if (store.get('is_join_room')) {
                yield leaveRoom();
            }
        }));
        electron_1.ipcMain.on("close-window", (e) => __awaiter(this, void 0, void 0, function* () {
            yield leaveRoom();
            mainWindow.close();
        }));
        electron_1.ipcMain.on("reloadMainWindow", e => {
            mainWindow.reload();
        });
        electron_1.ipcMain.handle('minimize-window', () => {
            return mainWindow.minimize();
        });
        // Invisible menu bar
        // mainWindow.setMenuBarVisibility(false)
        // Open the DevTools.
        // mainWindow.webContents.openDevTools();
        //Modal
        const modalWindow = (filePath, width, height) => {
            let modal = new electron_1.BrowserWindow({
                parent: mainWindow,
                modal: true,
                width: width !== null && width !== void 0 ? width : 330,
                height: height !== null && height !== void 0 ? height : 200,
                frame: false,
                webPreferences: {
                    nodeIntegration: true,
                    preload: path.join(__dirname, "preload.js")
                }
            });
            modal.setPosition(mainWindow.getPosition()[0], mainWindow.getPosition()[1] + 200);
            modal.loadFile(filePath);
            return modal;
        };
        electron_1.ipcMain.on("open-room-create", e => {
            const modal = modalWindow(getFilePath("public/html/createRoomModal.html"), 330, 280);
            // modal.webContents.openDevTools()
            modal.once("ready-to-show", () => {
                modal.show();
            });
            electron_1.ipcMain.on("close-modal", e => {
                modal.destroy();
            });
        });
        electron_1.ipcMain.on("show-error-modal", (e) => {
            const modal = modalWindow(getFilePath("public/html/errorModal.html"), 280, 130);
            modal.once("ready-to-show", () => {
                modal.show();
            });
            electron_1.ipcMain.on("close-modal", e => {
                store.delete('error_format');
                modal.destroy();
            });
        });
        electron_1.ipcMain.on("show-disconnecting-modal", e => {
            const modal = modalWindow(getFilePath("public/html/disConnectingModal.html"), 250, 100);
            modal.once("ready-to-show", () => {
                modal.show();
            });
            electron_1.ipcMain.on("close-modal", e => {
                modal.destroy();
            });
        });
        electron_1.ipcMain.handle("changeName", (event, data) => __awaiter(this, void 0, void 0, function* () {
            let uid = store.get('uid');
            socket.emit(SOCKET_EVENT.CHANGE_NAME, {
                userId: store.get('userId'),
                username: data,
                floor_id: store.get('current_floor_id'),
                isChangeName: true
            });
            return axiosConfig_1.default.post(`users/changeName/${uid}`, {
                onamae: toUnicodeText(data)
            }).then(function (res) {
                return true;
            }).catch((error) => {
                return false;
            });
        }));
        electron_1.ipcMain.handle("change-floor", (event, data) => __awaiter(this, void 0, void 0, function* () {
            store.set('floorId', data.floor_id);
            socket.auth.floorId = data.floor_id;
            socket.emit(SOCKET_EVENT.JOIN_FLOOR, data);
        }));
        electron_1.ipcMain.handle("getActiveRoomUsersByFloorId", (event, data) => __awaiter(this, void 0, void 0, function* () {
            return axiosConfig_1.default.get(`/room_users/active/floor/${data}`)
                .then(function (response) {
                return convertObjecttoArry(response.data.room_users);
            })
                .catch(function (error) {
                check = "error";
                return check;
            });
        }));
        electron_1.ipcMain.handle("open-upload-avatar", e => {
            return electron_1.dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "gif"] }]
            }).then(({ canceled, filePaths }) => {
                if (canceled) {
                    return false;
                }
                return filePaths[0];
            }).catch(err => {
                return false;
            });
        });
        electron_1.ipcMain.handle("update-user-avatar", (event, filePath) => __awaiter(this, void 0, void 0, function* () {
            if (filePath.split(',')[0] === 'data:image/jpeg;base64') {
                let fileData = filePath.split(',')[1];
                let dirPath = getFilePath("/camera");
                filePath = getFilePath("/camera/" + Date.now() + ".jpg");
                if (!fs_1.default.existsSync(dirPath)) {
                    fs_1.default.mkdirSync(dirPath);
                }
                yield fs_1.default.writeFile(filePath, fileData, { encoding: 'base64' }, function (err) {
                    return true;
                });
            }
            return yield updateAvatar(filePath);
        }));
        electron_1.ipcMain.on("open-confirm-modal", e => {
            const modal = modalWindow(getFilePath("public/html/confirmModal.html"));
            // modal.webContents.openDevTools()
            modal.once("ready-to-show", () => {
                modal.show();
            });
            electron_1.ipcMain.on("close-modal", e => {
                modal.destroy();
            });
        });
        electron_1.ipcMain.handle("show-confirm-modal", (e, data) => {
            if (data.type == 'floor') {
                store.set('has-user', data.hasUser ? 0 : 1);
            }
            else if (data.type == 'room') {
                store.set('has-user', data.hasUser ? 2 : 3);
            }
            store.set('remove-data', data);
            const modal = modalWindow(getFilePath("public/html/confirmRemove.html"));
            modal.once("ready-to-show", () => {
                modal.show();
            });
            electron_1.ipcMain.on("close-modal", e => {
                modal.destroy();
            });
        });
        //End Modal
        electron_1.ipcMain.on("show-change-pass-modal", (e, data) => {
            const modal = modalWindow(getFilePath("public/html/changePassword.html"));
            modal.once("ready-to-show", () => {
                modal.show();
            });
            electron_1.ipcMain.on("close-modal", e => {
                modal.destroy();
            });
        });
        mainWindow.on('close', function (e) {
            e.preventDefault();
            const modal = modalWindow(getFilePath("public/html/confirmModal.html"));
            modal.once("ready-to-show", () => {
                modal.show();
            });
            electron_1.ipcMain.on("close-modal", e => {
                modal.destroy();
            });
        });
        electron_1.ipcMain.handle('quit-app', (e) => __awaiter(this, void 0, void 0, function* () {
            if (store.get('is_join_room')) {
                yield leaveRoom();
                electron_1.app.exit();
            }
            else {
                electron_1.app.exit();
            }
        }));
    });
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on("activate", function () {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
    electron_1.app.on("window-all-closed", () => __awaiter(void 0, void 0, void 0, function* () {
        yield leaveRoom();
        electron_1.app.quit();
    }));
});
// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
const convertObjecttoArry = (data) => {
    return Object.keys(data).map((i) => {
        let dataArray = data[i];
        return dataArray;
    });
};
let userId;
electron_1.ipcMain.handle("get-user-id", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise(function (resolve, reject) {
        userId = store.get("userId");
        return resolve(userId);
    });
}));
electron_1.ipcMain.handle("createUser", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    return axiosConfig_1.default.post("/users", data)
        .then(function (response) {
        store.set('userId', response.data.id);
        check = "Done";
        return check;
    })
        .catch(function (error) {
        check = error.response.data.message;
        return check;
    });
}));
electron_1.ipcMain.handle("changePass", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    return axiosConfig_1.default.post(`/users/changePassWord/${store.get('uid')}`, {
        password: data
    }).then(function (response) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield firebaseApp.authenticate(store.get('email'), data);
            const uid = user.user.uid;
            store.set('uid', uid);
            store.set('token', user._tokenResponse.idToken);
            store.set('refreshToken', user._tokenResponse.refreshToken);
            axiosConfig_1.default.defaults.headers.common['Authorization'] = 'Bearer ' + user._tokenResponse.idToken;
        });
    });
}));
electron_1.ipcMain.handle("verifyRegisterCode", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    return axiosConfig_1.default.post("/users/verifyRegisterCode", data)
        .then(function (response) {
        check = "Done";
        return check;
    })
        .catch(function (error) {
        check = "error";
        return check;
    });
}));
electron_1.ipcMain.handle("getFloor", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    let company_id = store.get('company_id');
    store.set('current_floor', data.floor_id);
    socket.emit(SOCKET_EVENT.JOIN_FLOOR, {
        floor_id: data.floor_id
    });
    if (company_id == "" || company_id == null || company_id == undefined) {
        company_id = data.company_id;
    }
    return axiosConfig_1.default.get(`/floors/active/${company_id}`)
        .then(function (response) {
        let data = {
            floors: convertObjecttoArry(response.data)
        };
        return data;
    })
        .catch(function (error) {
        check = "error";
        return check;
    });
}));
electron_1.ipcMain.handle("getUsersById", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    return axiosConfig_1.default.get(`/users/${data}`)
        .then(function (response) {
        return response.data.user;
    })
        .catch(function (error) {
        check = "error";
        return check;
    });
}));
electron_1.ipcMain.handle("getActiveNumberUserInRoom", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    return axiosConfig_1.default.get(`/room_users/active/count-user/${data}`)
        .then(function (response) {
        return response.data.uids.map((item) => item.uid);
    })
        .catch(function (error) {
        return error;
    });
}));
electron_1.ipcMain.handle("getActiveNumberUserInFloor", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    return axiosConfig_1.default.get(`/room_users/active/floor/count-user/${data}`)
        .then(function (response) {
        return response.data.number_users[0].number_users;
    })
        .catch(function (error) {
        return error;
    });
}));
electron_1.ipcMain.handle("getFristFloorOfCompany", (event, companyId) => __awaiter(void 0, void 0, void 0, function* () {
    return axiosConfig_1.default.get(`/floors/active/${companyId}`)
        .then(function (response) {
        return convertObjecttoArry(response.data.floors)[0].id;
    })
        .catch(function (error) {
        check = "error";
        return check;
    });
}));
electron_1.ipcMain.handle("getRoomsByStatusAndFloorId", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    return axiosConfig_1.default.get(`/rooms/active/${data}`)
        .then(function (response) {
        check = "Done";
        return {
            rooms: convertObjecttoArry(response.data)
        };
    })
        .catch(function (error) {
        check = "error";
        return check;
    });
}));
electron_1.ipcMain.handle("/room_icons/active", (event, company_id) => __awaiter(void 0, void 0, void 0, function* () {
    company_id = store.get('company_id');
    return axiosConfig_1.default.get(`/room_icons/active/${company_id}`)
        .then(function (response) {
        check = "Done";
        let data = {
            room_icons: convertObjecttoArry(response.data)
        };
        return data;
    })
        .catch(function (error) {
        check = "error";
        return check;
    });
}));
electron_1.ipcMain.handle("addFloor", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    let dataNew = {
        company_id: store.get('company_id'),
        name: data.name,
        created_user: store.get('userId')
    };
    return axiosConfig_1.default.post(`/floors`, dataNew)
        .then(function (response) {
        check = "Done";
        socket.emit(SOCKET_EVENT.CREATE_NEW_FLOOR, {
            userId: store.get('userId'),
            username: store.get('userName'),
            name: data.name,
            isCreateFloor: true,
            floor_id: response.data.floor_id,
            old_floor_id: store.get('floorId'),
        });
        return response.data;
    })
        .catch(function (error) {
        check = "error";
        return check;
    });
}));
electron_1.ipcMain.handle("/room_icons", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    return axiosConfig_1.default.post(`/room_icons`, data)
        .then(function (response) {
        check = "Done";
        return response.data;
    })
        .catch(function (error) {
        check = "error";
        return check;
    });
}));
electron_1.ipcMain.handle("storeSet", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    return store.set(data);
}));
electron_1.ipcMain.handle("storeGet", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    return store.get(data);
}));
electron_1.ipcMain.handle("storeDelete", (event, key) => __awaiter(void 0, void 0, void 0, function* () {
    return store.delete(key);
}));
electron_1.ipcMain.handle("login", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const user = yield firebaseApp.authenticate(data.email, data.password);
    const uid = user.user.uid;
    store.set('uid', uid);
    store.set('token', user._tokenResponse.idToken);
    store.set('refreshToken', user._tokenResponse.refreshToken);
    store.set('email', data.email);
    axiosConfig_1.default.defaults.headers.common['Authorization'] = 'Bearer ' + user._tokenResponse.idToken;
    const socketId = yield axiosConfig_1.default.get('/users/get-socket-id');
    if (socket && socket.connected) {
        console.log('socket connected');
    }
    else {
        yield axiosConfig_1.default.post('/users/authenticated');
    }
    const companyId = yield getCompanyId(uid);
    socket.auth = {
        uid: uid,
        userId: store.get('userId')
    };
    socket.connect();
    if ((_a = socketId.data) === null || _a === void 0 ? void 0 : _a.socketId) {
        socket.emit('force-log-out', {
            socketId: socketId.data.socketId,
        });
    }
    return companyId;
}));
const getCompanyId = (uid) => {
    return axiosConfig_1.default.get(`/users/getCompanyId/${uid}`)
        .then(function (response) {
        store.set('userId', response.data.users[0].id);
        store.set('company_id', response.data.users[0].company_id);
        return response.data.users[0].company_id;
    })
        .catch(function (error) {
        return error;
    });
};
electron_1.ipcMain.handle("get-users-company", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    let company_id = store.get('company_id');
    return axiosConfig_1.default.get(`/users/active/${company_id}`)
        .then(function (response) {
        check = "Done";
        let data = {
            users_company: convertObjecttoArry(response.data)
        };
        return data;
    })
        .catch(function (error) {
        check = "error";
        return check;
    });
}));
electron_1.ipcMain.handle("/rooms", (e, data) => __awaiter(void 0, void 0, void 0, function* () {
    data.floor_id = store.get('floorId');
    data.created_user = store.get('userId');
    data.room_icon_id = store.get('default_icon_id');
    return axiosConfig_1.default.post(`/rooms`, data)
        .then(function (response) {
        var _a, _b;
        check = "Done";
        store.set('room_id', response.data.room_id);
        // emit event create new room for other users at the same floor
        socket.emit(SOCKET_EVENT.CREATE_NEW_ROOM, {
            floor_id: data.floor_id,
            room_id: response.data.room_id,
            room_name: data.name,
            icon_images: (_a = store.get('icon_images')) !== null && _a !== void 0 ? _a : store.get('default_icon_images'),
            room_icon_id: (_b = data.room_icon_id) !== null && _b !== void 0 ? _b : store.get('default_icon_id'),
            username: store.get('userName')
        });
        return response.data;
    })
        .catch(function (error) {
        check = "error";
        return check;
    });
}));
electron_1.ipcMain.handle("change-status-mic", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    let uid = store.get('uid');
    if (store.get("is_join_room")) {
        socket.emit(SOCKET_EVENT.CHANGE_STATUS_MIC, {
            userId: store.get('userId'),
            username: store.get('userName'),
            room_id: store.get('room_id'),
            floor_id: store.get('current_floor_id'),
            on: data.on
        });
    }
    return axiosConfig_1.default.post(`/users/updateMicStatus/${uid}`)
        .then(function (response) {
        store.set('status_mic', response.data.result.is_mic);
        const res = response.data.result;
        res.is_join_room = store.get('is_join_room');
        return res;
    })
        .catch(function (error) {
        return "error";
    });
}));
electron_1.ipcMain.handle("change-status-speaker", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    let uid = store.get('uid');
    if (store.get("is_join_room")) {
        socket.emit(SOCKET_EVENT.CHANGE_STATUS_SPEAKER, {
            userId: store.get('userId'),
            username: store.get('userName'),
            floor_id: store.get('current_floor_id'),
            room_id: store.get('room_id'),
            on: data.on
        });
    }
    return axiosConfig_1.default.post(`/users/updateSpeakerStatus/${uid}`)
        .then(function (response) {
        store.set('status_speaker', response.data.result[0].is_speaker);
        const res = response.data.result[0];
        res.is_join_room = store.get('is_join_room');
        return res;
    })
        .catch(function (error) {
        return error;
    });
}));
electron_1.ipcMain.handle("changeStatusMicAndSpeaker", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    let uid = store.get('uid');
    if (store.get("is_join_room")) {
        socket.emit(SOCKET_EVENT.CHANGE_STATUS_MIC_AND_SPEAKER, {
            userId: store.get('userId'),
            username: store.get('userName'),
            floor_id: store.get('current_floor_id'),
            room_id: store.get('room_id'),
            on: data.on
        });
    }
    if (data.on) {
        store.set('status_mic', 1);
        store.set('status_speaker', 1);
    }
    else {
        store.set('status_mic', 0);
        store.set('status_speaker', 0);
    }
    return Promise.all([
        axiosConfig_1.default.post(`/users/updateMicStatus/${uid}`),
        axiosConfig_1.default.post(`/users/updateSpeakerStatus/${uid}`),
    ]).then(function (response) {
        return {
            is_join_room: store.get('is_join_room')
        };
    }).catch((err) => {
        console.error(err);
    });
}));
electron_1.ipcMain.handle("channel-Agora", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    let dataChannel = store.get('dataChannel');
    return new Promise(function (resolve, reject) {
        return resolve(dataChannel);
    });
}));
electron_1.ipcMain.handle('checkStatusMicAndSpeakerUsersInRoom', (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    return axiosConfig_1.default.get(`/room_users/check-room/${data ? (_b = data.room_id) !== null && _b !== void 0 ? _b : store.get('room_id') : store.get('room_id')}?uid=${store.get('uid')}`)
        .then((res) => {
        if (store.get('status_mic') == 1 || store.get('status_speaker') == 1) {
            if (res.data.onChannel && ((data === null || data === void 0 ? void 0 : data.exitRoom) ? false : true)) {
                socket.emit(SOCKET_EVENT.READY_TO_CHAT, {
                    userId: store.get('userId'),
                    floor_id: store.get('current_floor_id') || store.get('floorId'),
                    roomId: store.get('room_id')
                });
            }
        }
        return res.data;
    });
}));
electron_1.ipcMain.handle('sendEventToSocket', (event, data) => {
    socket.emit(data.event, {
        socketIds: data.socketIds.filter((socketId) => socketId != socket.id)
    });
});
electron_1.ipcMain.handle("change-room", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    const old_room = store.get('old_room');
    if (old_room == data.room_id) {
        return "Not_changed";
    }
    else {
        if (old_room) {
            if (old_room != data.room_id) {
                data.changeNewRoom = true;
                data.old_room = old_room;
            }
        }
        store.set('old_room', data.room_id);
        data.username = store.get('userName');
        data.userAvatar = store.get('userAvatar');
        data.uid = store.get('uid');
        sound_play_1.default.play(getFilePath('public/static/roomIn.wav'));
        store.set('is_join_room', true);
        let uid = store.get('uid');
        store.set('room_id', data.room_id);
        store.set('status_mic', 0);
        store.set('floorId', data.floor_id);
        let dataNew = {
            uid: uid,
            room_id: data.room_id
        };
        if (data.isUpdateMic) {
            axiosConfig_1.default.post(`/users/updateMicStatus/${uid}`).then((res) => {
                store.set('status_mic', 0);
            });
        }
        if (data.isUpdateSpeaker) {
            axiosConfig_1.default.post(`/users/updateSpeakerStatus/${uid}`).then((res) => {
                store.set('status_speaker', 1);
            });
        }
        return axiosConfig_1.default.post(`/room_users/changeRoom`, dataNew)
            .then(function (response) {
            store.set('dataChannel', response.data.result);
            socket.emit(SOCKET_EVENT.JOIN_ROOM, data);
            return Object.assign({}, data);
        })
            .catch(function (error) {
            return "error";
        });
    }
}));
electron_1.ipcMain.handle('initDataWhenLoginSuccess', (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    socket.auth.floorId = data.floorId;
    store.set({ floorId: data.floorId, is_login: true });
}));
electron_1.ipcMain.handle("update-room-voices", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    let dataRoomVoice = {
        room_id: store.get('room_id')
    };
    return axiosConfig_1.default.post(`/room_voices/updateRoomVoice`, dataRoomVoice)
        .then(function (response) {
        return response.data;
    })
        .catch(function (error) {
        return "error";
    });
}));
const leaveRoom = () => {
    let data = {
        uid: store.get('uid')
    };
    store.delete('old_room');
    store.delete('is_join_room');
    socket.emit(SOCKET_EVENT.LEAVE_ROOM, {
        room_id: store.get('room_id'),
        floor_id: store.get('current_floor_id'),
        username: store.get('userName'),
        userId: store.get('userId'),
        leave: true
    });
    return axiosConfig_1.default.post("/room_users/leaveRoom", data).then(() => {
        store.delete('room_id');
        return true;
    }).catch(() => {
        return false;
    });
};
const autoLoginWhenVirifySuccess = () => __awaiter(void 0, void 0, void 0, function* () {
    const email = store.get('email');
    const password = store.get('password');
    const user = yield firebaseApp.authenticate(email, password);
    const uid = user.user.uid;
    store.set('uid', uid);
    store.set('token', user._tokenResponse.idToken);
    store.set('refreshToken', user._tokenResponse.refreshToken);
    axiosConfig_1.default.defaults.headers.common['Authorization'] = 'Bearer ' + user._tokenResponse.idToken;
    yield axiosConfig_1.default.post('/users/authenticated');
    const companyId = yield getCompanyId(uid);
    yield axiosConfig_1.default.get(`/floors/active/${companyId}`)
        .then(function (response) {
        const id = convertObjecttoArry(response.data.floors)[0].id;
        socket.auth.floorId = id;
        socket.auth = {
            uid: uid,
            userId: store.get('userId'),
            floorId: id
        };
        socket.connect();
        store.set({ floorId: id, is_login: true });
    });
});
electron_1.ipcMain.handle('getCurrentAvatar', (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    return axiosConfig_1.default.get(`users/${store.get('userId')}`).then((res) => {
        var _a, _b;
        store.set({
            userAvatar: (_a = res.data.user.avatar) !== null && _a !== void 0 ? _a : '../static/defaultImage.png',
            userName: convertToText(res.data.user.onamae)
        });
        return (_b = res.data.user.avatar) !== null && _b !== void 0 ? _b : '../static/defaultImage.png';
    }).catch((error) => {
        return error.data;
    });
}));
const convertToText = (unicodeText) => {
    if (unicodeText.split(',').length > 1) {
        return unicodeText.split(',')
            .map((unicode) => String.fromCodePoint(unicode))
            .join("");
    }
    return unicodeText;
};
const toUnicodeText = (text) => {
    return Array.from(text).map((item) => item.codePointAt(0)).join(',');
};
electron_1.ipcMain.handle('remove-room', (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    axiosConfig_1.default.delete(`rooms/${data.room_id}`)
        .then((res) => {
        socket.emit(SOCKET_EVENT.REMOVE_ROOM, {
            userId: store.get('userId'),
            username: store.get('userName'),
            room_id: data.room_id,
            floor_id: store.get('floorId'),
            uids: data.uids
        });
    });
    if (data.hasUser) {
        Promise.all(data.uids.map((uid) => axiosConfig_1.default.post("/room_users/leaveRoom", { uid: uid })));
    }
}));
electron_1.ipcMain.handle('remove-floor', (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    Promise.all([
        axiosConfig_1.default.delete(`floors/${data.floor_id}`),
        axiosConfig_1.default.get(`/room_users/active/floor/${data.floor_id}`)
    ]).then((response) => {
        const [isRemoved, result] = response;
        const users = convertObjecttoArry(result.data.room_users);
        const uids = users.map((user) => user.uid);
        socket.emit(SOCKET_EVENT.REMOVE_FLOOR, {
            floor_id: data.floor_id,
            position: data.position,
            uids: uids,
        });
        Promise.all(uids.map((uid) => axiosConfig_1.default.post("/room_users/leaveRoom", { uid: uid })));
    });
}));
const updateAvatar = (filePaths, is_base64) => {
    let img = fs_1.default.createReadStream(filePaths);
    let data = new form_data_1.default();
    data.append("photos", img);
    data.append("uid", store.get('uid'));
    return axiosConfig_1.default.post(`/users/changeAvatar/${store.get('uid')}`, data)
        .then(function (response) {
        if (store.get('is_join_room')) {
            socket.emit(SOCKET_EVENT.CHANGE_AVATAR, {
                userId: store.get('userId'),
                username: store.get('userName'),
                userAvatar: response.data.avatar,
                floor_id: store.get('current_floor_id'),
            });
        }
        return [response.status.toString(), response.data.avatar];
    })
        .catch(function (error) {
        var _a, _b;
        return [(_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.status) !== null && _b !== void 0 ? _b : '1', error.response.data.message];
    });
};
electron_1.ipcMain.handle("change-login-status", (event, data) => __awaiter(void 0, void 0, void 0, function* () {
    socket.emit(SOCKET_EVENT.CHANGE_LOGIN_STATUS, {
        userId: store.get('userId'),
        username: store.get('userName'),
        floor_id: store.get('current_floor_id'),
        status: data.login_status,
        custom_status: data.custom_status
    });
    return axiosConfig_1.default.post(`/users/changeLoginStatus/${store.get('uid')}`, data)
        .then(function (response) {
        check = "Done";
        return check;
    })
        .catch(function (error) {
        check = error.response.data.message;
        return check;
    });
}));
//# sourceMappingURL=main.js.map