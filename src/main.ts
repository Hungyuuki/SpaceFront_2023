import { app, BrowserWindow, dialog, ipcMain, MenuItem, powerSaveBlocker } from "electron";
import * as path from "path";
import Storage from "electron-store";
import axiosIns from "./axiosConfig";
import fs from "fs";
import FormData from "form-data";
import io, { Socket } from 'socket.io-client';
import sound from 'sound-play';

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
}


const pushEventToQueue = (event: string, data: any) => {
  const oldData: any = store.get(event);
  if (!oldData || oldData.length == 0) {
    store.set(event, [data]);
  } else {
    oldData.push(data);
    store.set(event, oldData);
  }
}

const store = new Storage()
const socket: any = io(`https://spaceback.developbase.net/`, {
  auth: {
    uid: `${store.get('uid')}`,
    floorId: store.get('floorId'),
    userId: store.get('userId')
  },
  transports: ['websocket'],
  timeout: 5000
});
if (store.get('is_login')) {
  axiosIns.get('/users/get-socket-id')
    .then((data: any) => {
      const socket_id = data.data.socketId;
      if (socket_id) {
        socket.emit('force-log-out', {
          socketId: socket_id
        })
      } else {
        store.delete('is_login');
      }
    })
}

const getFilePath = (filePath: string) => {
  return path.join(__dirname, "../" + filePath)
}

const firebaseApp = require("./firestore");

let check: string;

async function createWindow() {
  // await redisClient.connect();
  // Create the browser window.
  const mainWindow = new BrowserWindow({
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
  } else {
    mainWindow.setIcon(path.join(__dirname, '../public/static/app3.ico'));
  }
  mainWindow.setTitle('')

  let screenSize = mainWindow.getBounds()
  // Router
  // and load the index.html of the app.
  if (store.get('is_login')) {
    mainWindow.loadFile(getFilePath("public/html/homePage.html"));
  } else {
    mainWindow.loadFile(getFilePath("public/html/login.html"));
  }

  ipcMain.handle('login-form', async (event, arg) => {
    return new Promise(function (reject) {
      mainWindow.loadFile(getFilePath("public/html/login.html"));
    });
  });

  // Login if user already in
  // if (store.get('refreshToken') && store.get('uid')) {
  //   mainWindow.loadFile(getFilePath("public/html/homePage.html"))
  //   initApp()
  // }
  let isSent = false;
  socket.on('connect_error', async (error: any) => {
    if (store.get("is_login")) {
      if (!isSent) {
        pushEventToQueue('disconnecting', {
          isJoinRoom: store.get('is_join_room'),
        });
        isSent = true;
      }
    }
  })

  socket.on('connect', () => {
    isSent = false;
    pushEventToQueue(SOCKET_EVENT.CONNECTED, {
      isJoinRoom: store.get('is_join_room'),
    });
    setTimeout(() => {
      socket.emit('cache-socket-id', 'quân');
    }, 2000);
  })

  socket.on(SOCKET_EVENT.CHANGE_STATUS_MIC_AND_SPEAKER, (data: any) => {
    pushEventToQueue(SOCKET_EVENT.CHANGE_STATUS_MIC_AND_SPEAKER, data);
  })

  socket.on(SOCKET_EVENT.LEAVE_ROOM, (data: any) => {
    pushEventToQueue(SOCKET_EVENT.LEAVE_ROOM, data);
  })

  socket.on(SOCKET_EVENT.JOIN_ROOM, (data: any) => {
    pushEventToQueue(SOCKET_EVENT.JOIN_ROOM, data);
  })

  socket.on(SOCKET_EVENT.CHANGE_AVATAR, (data: any) => {
    pushEventToQueue(SOCKET_EVENT.CHANGE_AVATAR, data);
  })

  socket.on(SOCKET_EVENT.DISCONNECT_NETWORK, (data: any) => {
    pushEventToQueue(SOCKET_EVENT.DISCONNECT_NETWORK, data);
  })

  socket.on(SOCKET_EVENT.USER_CONNECTED, (data: any) => {
    pushEventToQueue(SOCKET_EVENT.USER_CONNECTED, data);
  })

  socket.on('force-log-out', async (data: any) => {
    if (store.get('is_join_room')) {
      await leaveRoom();
    }
    socket.disconnect();
    store.clear();
    return new Promise(function () {
      mainWindow.loadFile(getFilePath("public/html/login.html"));
    });
  })

  socket.on(SOCKET_EVENT.CHANGE_STATUS_MIC, (data: any) => {
    pushEventToQueue(SOCKET_EVENT.CHANGE_STATUS_MIC, data);
  })

  socket.on(SOCKET_EVENT.CHANGE_STATUS_SPEAKER, (data: any) => {
    pushEventToQueue(SOCKET_EVENT.CHANGE_STATUS_SPEAKER, data);
  })

  socket.on(SOCKET_EVENT.CHANGE_LOGIN_STATUS, (data: any) => {
    pushEventToQueue(SOCKET_EVENT.CHANGE_LOGIN_STATUS, data);
  })

  socket.on(SOCKET_EVENT.CREATE_NEW_ROOM, (data: any) => {
    pushEventToQueue(SOCKET_EVENT.CREATE_NEW_ROOM, data);
  });

  socket.on(SOCKET_EVENT.CREATE_NEW_FLOOR, (data: any) => {
    pushEventToQueue(SOCKET_EVENT.CREATE_NEW_FLOOR, data);
  });

  socket.on(SOCKET_EVENT.CHANGE_NAME, (data: any) => {
    pushEventToQueue(SOCKET_EVENT.CHANGE_NAME, data);
  })

  socket.on(SOCKET_EVENT.REMOVE_ROOM, (data: any) => {
    if (data.uids?.includes(store.get('uid'))) {
      data.onRoom = true;
      store.delete('is_join_room');
    }
    pushEventToQueue(SOCKET_EVENT.REMOVE_ROOM, data);
  })

  socket.on(SOCKET_EVENT.REMOVE_FLOOR, (data: any) => {
    pushEventToQueue(SOCKET_EVENT.REMOVE_FLOOR, data);
  })

  socket.on(SOCKET_EVENT.JOIN_CHANNEL, (data: any) => {
    pushEventToQueue(SOCKET_EVENT.JOIN_CHANNEL, data);
  })

  socket.on(SOCKET_EVENT.LEAVE_CHANNEL, (data: any) => {
    pushEventToQueue(SOCKET_EVENT.LEAVE_CHANNEL, "quân");
  })

  socket.on(SOCKET_EVENT.READY_TO_CHAT, (data: any) => {
    pushEventToQueue(SOCKET_EVENT.READY_TO_CHAT, data);
  })

  ipcMain.handle("success-verify", async () => {
    await autoLoginWhenVirifySuccess();
    return mainWindow.loadFile(getFilePath("public/html/homePage.html"));
  })

  ipcMain.handle('sign-in-form', async (event, arg) => {
    return new Promise(function (reject) {
      mainWindow.loadFile(getFilePath("public/html/signUp.html"));
    });
  });

  ipcMain.handle('log-out', async () => {
    logOut();
  })

  const logOut = async () => {
    await leaveRoom();
    axiosIns.delete('/users/log-out')
    store.clear();
    socket.disconnect();
    return new Promise(function () {
      mainWindow.loadFile(getFilePath("public/html/login.html"));
    });
  }

  ipcMain.handle('verify-email-form', async (event, arg) => {
    return new Promise(function (reject) {
      mainWindow.loadFile(getFilePath("public/html/verifyEmail.html"));
    });
  });

  ipcMain.handle('home-page', async (event, arg) => {
    return new Promise(function (resolve, reject) {
      mainWindow.loadFile(getFilePath("public/html/homePage.html"));
    });
  });

  ipcMain.handle('set-window-on-top', () => {
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setFullScreenable(false);
  });

  ipcMain.handle('get-screen-size', () => {
    return screenSize.width, screenSize.height
  })

  ipcMain.handle('set-window-off-top', async (event, arg) => {
    return new Promise(function (resolve, reject) {
      mainWindow.setAlwaysOnTop(false, "screen-saver");
    });
  });

  ipcMain.handle('set-audio-off', async (event, arg) => {
    return new Promise(function (resolve, reject) {
      mainWindow.webContents.setAudioMuted(true);
    });
  });

  ipcMain.handle('pull-event', async (event, data) => {
    const eventData: any = store.get(data.event);
    if (eventData && eventData.length > 0) {
      const res = eventData.shift();
      store.set(data.event, eventData);
      return res;
    }
  })

  ipcMain.handle('set-audio-on', async (event, arg) => {
    return new Promise(function (resolve, reject) {
      mainWindow.webContents.setAudioMuted(false);
    });
  });

  ipcMain.handle('leaveRoom', async (event, data) => {
    if (store.get('is_join_room')) {
      await leaveRoom()
    }
  })

  ipcMain.on("close-window", async e => {
    await leaveRoom()
    mainWindow.close();
  })

  ipcMain.on("reloadMainWindow", e => {
    mainWindow.reload()
  })

  ipcMain.handle('minimize-window', () => {
    return mainWindow.minimize();
  });

  // Invisible menu bar
  // mainWindow.setMenuBarVisibility(false)

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  //Modal
  const modalWindow = (filePath: string, width?: number, height?: number) => {
    let modal = new BrowserWindow({
      parent: mainWindow,
      modal: true,
      width: width ?? 330,
      height: height ?? 200,
      frame: false,
      webPreferences: {
        nodeIntegration: true,
        preload: path.join(__dirname, "preload.js")
      }
    });
    modal.setPosition(mainWindow.getPosition()[0], mainWindow.getPosition()[1] + 200)
    modal.loadFile(filePath);
    return modal
  }

  ipcMain.on("open-room-create", e => {
    const modal = modalWindow(getFilePath("public/html/createRoomModal.html"), 330, 280);
    // modal.webContents.openDevTools()
    modal.once("ready-to-show", () => {
      modal.show();
    });

    ipcMain.on("close-modal", e => {
      modal.destroy();
    });
  })

  ipcMain.on("show-error-modal", (e) => {
    const modal = modalWindow(getFilePath("public/html/errorModal.html"), 280, 130);
    modal.once("ready-to-show", () => {
      modal.show();
    });
    ipcMain.on("close-modal", e => {
      store.delete('error_format')
      modal.destroy();
    });
  })

  ipcMain.on("show-disconnecting-modal", e => {
    const modal = modalWindow(getFilePath("public/html/disConnectingModal.html"), 250, 100);
    modal.once("ready-to-show", () => {
      modal.show();
    });
    ipcMain.on("close-modal", e => {
      modal.destroy();
    });
  })

  ipcMain.handle("changeName", async (event, data) => {
    let uid = store.get('uid');
    socket.emit(SOCKET_EVENT.CHANGE_NAME, {
      userId: store.get('userId'),
      username: data,
      floor_id: store.get('current_floor_id'),
      isChangeName: true
    });
    return axiosIns.post(`users/changeName/${uid}`, {
      onamae: toUnicodeText(data)
    }).then(function (res: any) {
      return true
    }).catch((error: any) => {
      return false
    })
  })

  ipcMain.handle("change-floor", async (event, data) => {
    store.set('floorId', data.floor_id);
    socket.auth.floorId = data.floor_id;
    socket.emit(SOCKET_EVENT.JOIN_FLOOR, data)
  })

  ipcMain.handle("getActiveRoomUsersByFloorId", async (event, data) => {
    return axiosIns.get(`/room_users/active/floor/${data}`)
      .then(function (response: any) {
        return convertObjecttoArry(response.data.room_users)
      })
      .catch(function (error: any) {
        check = "error";
        return check
      });
  })

  ipcMain.handle("open-upload-avatar", e => {
    return dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "gif"] }]
    }).then(({ canceled, filePaths }) => {
      if (canceled) {
        return false
      }
      return filePaths[0]
    }).catch(err => {
      return false
    });
  });

  ipcMain.handle("update-user-avatar", async (event, filePath) => {
    if (filePath.split(',')[0] === 'data:image/jpeg;base64') {
      let fileData = filePath.split(',')[1]
      let dirPath = getFilePath("/camera")
      filePath = getFilePath("/camera/" + Date.now() + ".jpg")
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath)
      }
      await fs.writeFile(filePath, fileData, { encoding: 'base64' }, function (err) {
        return true
      })
    }
    return await updateAvatar(filePath)
  })

  ipcMain.on("open-confirm-modal", e => {
    const modal = modalWindow(getFilePath("public/html/confirmModal.html"));
    // modal.webContents.openDevTools()
    modal.once("ready-to-show", () => {
      modal.show();
    })

    ipcMain.on("close-modal", e => {
      modal.destroy();
    })
  })

  ipcMain.handle("show-confirm-modal", (e, data) => {
    if (data.type == 'floor') {
      store.set('has-user', data.hasUser ? 0 : 1)
    } else if (data.type == 'room') {
      store.set('has-user', data.hasUser ? 2 : 3)
    }
    store.set('remove-data', data);
    const modal = modalWindow(getFilePath("public/html/confirmRemove.html"));
    modal.once("ready-to-show", () => {
      modal.show();
    })

    ipcMain.on("close-modal", e => {
      modal.destroy();
    })
  })
  //End Modal

  ipcMain.on("show-change-pass-modal", (e, data) => {
    const modal = modalWindow(getFilePath("public/html/changePassword.html"));
    modal.once("ready-to-show", () => {
      modal.show();
    })

    ipcMain.on("close-modal", e => {
      modal.destroy();
    })
  })

  mainWindow.on('close', function (e) {
    e.preventDefault();
    const modal = modalWindow(getFilePath("public/html/confirmModal.html"));
    modal.once("ready-to-show", () => {
      modal.show();
    })

    ipcMain.on("close-modal", e => {
      modal.destroy();
    })
  });
  ipcMain.handle('quit-app', async (e) => {
    if (store.get('is_join_room')) {
      await leaveRoom();
      app.exit();
    } else {
      app.exit();
    }
  })
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on("window-all-closed", async () => {
    await leaveRoom()
    app.quit();
  });
})


// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
const convertObjecttoArry = (data: any) => {
  return Object.keys(data).map((i) => {
    let dataArray = data[i];
    return dataArray
  })
}

let userId: any;
ipcMain.handle("get-user-id", async (event: any, data: any) => {
  return new Promise(function (resolve, reject) {
    userId = store.get("userId");
    return resolve(userId)
  });
});

ipcMain.handle("createUser", async (event, data) => {
  return axiosIns.post("/users", data)
    .then(function (response: any) {
      store.set('userId', response.data.id)
      check = "Done";
      return check
    })
    .catch(function (error: any) {
      check = error.response.data.message;
      return check
    });
});

ipcMain.handle("changePass", async (event, data) => {
  return axiosIns.post(`/users/changePassWord/${store.get('uid')}`, {
    password: data
  }).then(async function (response: any) {
    const user = await firebaseApp.authenticate(store.get('email'), data);
    const uid = user.user.uid;
    store.set('uid', uid);
    store.set('token', user._tokenResponse.idToken);
    store.set('refreshToken', user._tokenResponse.refreshToken)
    axiosIns.defaults.headers.common['Authorization'] = 'Bearer ' + user._tokenResponse.idToken;
  })
});

ipcMain.handle("verifyRegisterCode", async (event: any, data: any) => {
  return axiosIns.post("/users/verifyRegisterCode", data)
    .then(function (response: any) {
      check = "Done";
      return check
    })
    .catch(function (error: any) {
      check = "error";
      return check
    });
});

ipcMain.handle("getFloor", async (event: any, data: any) => {
  let company_id = store.get('company_id');
  store.set('current_floor', data.floor_id);
  socket.emit(SOCKET_EVENT.JOIN_FLOOR, {
    floor_id: data.floor_id
  })
  if (company_id == "" || company_id == null || company_id == undefined) {
    company_id = data.company_id;
  }
  return axiosIns.get(`/floors/active/${company_id}`)
    .then(function (response: any) {
      let data = {
        floors: convertObjecttoArry(response.data)
      }
      return data;
    })
    .catch(function (error: any) {
      check = "error";
      return check
    });
});

ipcMain.handle("getUsersById", async (event: any, data: any) => {
  return axiosIns.get(`/users/${data}`)
    .then(function (response: any) {
      return response.data.user
    })
    .catch(function (error: any) {
      check = "error";
      return check
    });
});

ipcMain.handle("getActiveNumberUserInRoom", async (event: any, data: any) => {
  return axiosIns.get(`/room_users/active/count-user/${data}`)
    .then(function (response: any) {
      return response.data.uids.map((item: any) => item.uid);
    })
    .catch(function (error: any) {
      return error
    });
});

ipcMain.handle("getActiveNumberUserInFloor", async (event: any, data: any) => {
  return axiosIns.get(`/room_users/active/floor/count-user/${data}`)
    .then(function (response: any) {
      return response.data.number_users[0].number_users;
    })
    .catch(function (error: any) {
      return error
    });
});

ipcMain.handle("getFristFloorOfCompany", async (event: any, companyId: any) => {
  return axiosIns.get(`/floors/active/${companyId}`)
    .then(function (response: any) {
      return convertObjecttoArry(response.data.floors)[0].id
    })
    .catch(function (error: any) {
      check = "error";
      return check
    });
});

ipcMain.handle("getRoomsByStatusAndFloorId", async (event: any, data: any) => {
  return axiosIns.get(`/rooms/active/${data}`)
    .then(function (response: any) {
      check = "Done";
      return {
        rooms: convertObjecttoArry(response.data)
      }
    })
    .catch(function (error: any) {
      check = "error";
      return check
    });
});


ipcMain.handle("/room_icons/active", async (event: any, company_id: any) => {
  company_id = store.get('company_id');
  return axiosIns.get(`/room_icons/active/${company_id}`)
    .then(function (response: any) {
      check = "Done";
      let data = {
        room_icons: convertObjecttoArry(response.data)
      }
      return data
    })
    .catch(function (error: any) {
      check = "error";
      return check
    });
});

ipcMain.handle("addFloor", async (event: any, data: any) => {
  let dataNew = {
    company_id: store.get('company_id'),
    name: data.name,
    created_user: store.get('userId')
  }
  return axiosIns.post(`/floors`, dataNew)
    .then(function (response: any) {
      check = "Done";
      socket.emit(SOCKET_EVENT.CREATE_NEW_FLOOR, {
        userId: store.get('userId'),
        username: store.get('userName'),
        name: data.name,
        isCreateFloor: true,
        floor_id: response.data.floor_id,
        old_floor_id: store.get('floorId'),
      })
      return response.data
    })
    .catch(function (error: any) {
      check = "error";
      return check
    });
});

ipcMain.handle("/room_icons", async (event: any, data: any) => {
  return axiosIns.post(`/room_icons`, data)
    .then(function (response: any) {
      check = "Done";
      return response.data
    })
    .catch(function (error: any) {
      check = "error";
      return check
    });
});

ipcMain.handle("storeSet", async (event: any, data: any) => {
  return store.set(data)
})

ipcMain.handle("storeGet", async (event: any, data: any) => {
  return store.get(data)
})

ipcMain.handle("storeDelete", async (event: any, key: any) => {
  return store.delete(key)
})

ipcMain.handle("login", async (event: any, data: any) => {
  const user = await firebaseApp.authenticate(data.email, data.password);
  const uid = user.user.uid;
  store.set('uid', uid);
  store.set('token', user._tokenResponse.idToken);
  store.set('refreshToken', user._tokenResponse.refreshToken);
  store.set('email', data.email);
  axiosIns.defaults.headers.common['Authorization'] = 'Bearer ' + user._tokenResponse.idToken;
  const socketId: any = await axiosIns.get('/users/get-socket-id');
  if (socket && socket.connected) {
    console.log('socket connected');
  } else {
    await axiosIns.post('/users/authenticated')
  }
  const companyId = await getCompanyId(uid);
  socket.auth = {
    uid: uid,
    userId: store.get('userId')
  };
  socket.connect();
  if (socketId.data?.socketId) {
    socket.emit('force-log-out', {
      socketId: socketId.data.socketId,
    })
  }
  return companyId
});

const getCompanyId = (uid: any) => {
  return axiosIns.get(`/users/getCompanyId/${uid}`)
    .then(function (response: any) {
      store.set('userId', response.data.users[0].id)
      store.set('company_id', response.data.users[0].company_id)
      return response.data.users[0].company_id
    })
    .catch(function (error: any) {
      return error
    });
}

ipcMain.handle("get-users-company", async (event: any, data: any) => {
  let company_id = store.get('company_id');
  return axiosIns.get(`/users/active/${company_id}`)
    .then(function (response: any) {
      check = "Done";
      let data = {
        users_company: convertObjecttoArry(response.data)
      }
      return data
    })
    .catch(function (error: any) {
      check = "error";
      return check
    });
});

ipcMain.handle("/rooms", async (e: any, data: any) => {
  data.floor_id = store.get('floorId');
  data.created_user = store.get('userId')
  data.room_icon_id = store.get('default_icon_id')
  return axiosIns.post(`/rooms`, data)
    .then(function (response: any) {
      check = "Done";
      store.set('room_id', response.data.room_id);
      // emit event create new room for other users at the same floor
      socket.emit(SOCKET_EVENT.CREATE_NEW_ROOM, {
        floor_id: data.floor_id,
        room_id: response.data.room_id,
        room_name: data.name,
        icon_images: store.get('icon_images') ?? store.get('default_icon_images'),
        room_icon_id: data.room_icon_id ?? store.get('default_icon_id'),
        username: store.get('userName')
      })
      return response.data
    })
    .catch(function (error: any) {
      check = "error";
      return check
    });
})

ipcMain.handle("change-status-mic", async (event: any, data: any) => {
  let uid = store.get('uid');
  if (store.get("is_join_room")) {
    socket.emit(SOCKET_EVENT.CHANGE_STATUS_MIC, {
      userId: store.get('userId'),
      username: store.get('userName'),
      room_id: store.get('room_id'),
      floor_id: store.get('current_floor_id'),
      on: data.on
    })
  }
  return axiosIns.post(`/users/updateMicStatus/${uid}`)
    .then(function (response: any) {
      store.set('status_mic', response.data.result.is_mic);
      const res = response.data.result;
      res.is_join_room = store.get('is_join_room');
      return res;
    })
    .catch(function (error: any) {
      return "error"
    });
});

ipcMain.handle("change-status-speaker", async (event: any, data: any) => {
  let uid = store.get('uid');
  if (store.get("is_join_room")) {
    socket.emit(SOCKET_EVENT.CHANGE_STATUS_SPEAKER, {
      userId: store.get('userId'),
      username: store.get('userName'),
      floor_id: store.get('current_floor_id'),
      room_id: store.get('room_id'),
      on: data.on
    })
  }
  return axiosIns.post(`/users/updateSpeakerStatus/${uid}`)
    .then(function (response: any) {
      store.set('status_speaker', response.data.result[0].is_speaker)
      const res = response.data.result[0];
      res.is_join_room = store.get('is_join_room');
      return res
    })
    .catch(function (error: any) {
      return error
    });
});

ipcMain.handle("changeStatusMicAndSpeaker", async (event: any, data: any) => {
  let uid = store.get('uid');
  if (store.get("is_join_room")) {
    socket.emit(SOCKET_EVENT.CHANGE_STATUS_MIC_AND_SPEAKER, {
      userId: store.get('userId'),
      username: store.get('userName'),
      floor_id: store.get('current_floor_id'),
      room_id: store.get('room_id'),
      on: data.on
    })
  }
  if (data.on) {
    store.set('status_mic', 1);
    store.set('status_speaker', 1);
  } else {
    store.set('status_mic', 0);
    store.set('status_speaker', 0);
  }
  return Promise.all([
    axiosIns.post(`/users/updateMicStatus/${uid}`),
    axiosIns.post(`/users/updateSpeakerStatus/${uid}`),
  ]).then(function (response: any) {
    return {
      is_join_room: store.get('is_join_room')
    }
  }).catch((err: any) => {
    console.error(err)
  })
});

ipcMain.handle("channel-Agora", async (event: any, data: any) => {
  let dataChannel = store.get('dataChannel');
  return new Promise(function (resolve, reject) {
    return resolve(dataChannel);
  });
});

ipcMain.handle('checkStatusMicAndSpeakerUsersInRoom', async (event: any, data: any) => {
  return axiosIns.get(`/room_users/check-room/${data ? data.room_id??store.get('room_id') : store.get('room_id')}?uid=${store.get('uid')}`)
    .then((res: any) => {
      if (store.get('status_mic') == 1 || store.get('status_speaker') == 1) {
        if (res.data.onChannel && (data?.exitRoom ? false : true)) {
          socket.emit(SOCKET_EVENT.READY_TO_CHAT, {
            userId: store.get('userId'),
            floor_id: store.get('current_floor_id') || store.get('floorId'),
            roomId: store.get('room_id')
          })
        }
      }
      return res.data;
    });
})

ipcMain.handle('sendEventToSocket', (event: any, data: any) => {
  socket.emit(data.event, {
    socketIds: data.socketIds.filter((socketId: any) => socketId != socket.id)
  });
})

ipcMain.handle("change-room", async (event: any, data: any) => {
  const old_room = store.get('old_room');
  if (old_room == data.room_id) {
    return "Not_changed";
  } else {
    if (old_room) {
      if (old_room != data.room_id) {
        data.changeNewRoom = true;
        data.old_room = old_room;
      }
    }
    store.set('old_room', data.room_id)
    data.username = store.get('userName');
    data.userAvatar = store.get('userAvatar')
    data.uid = store.get('uid')
    sound.play(getFilePath('public/static/roomIn.wav'))
    store.set('is_join_room', true)
    let uid = store.get('uid');
    store.set('room_id', data.room_id);
    store.set('status_mic', 0);
    store.set('floorId', data.floor_id);
    let dataNew = {
      uid: uid,
      room_id: data.room_id
    }
    if (data.isUpdateMic) {
      axiosIns.post(`/users/updateMicStatus/${uid}`).then((res: any) => {
        store.set('status_mic', 0);
      });
    }
    if (data.isUpdateSpeaker) {
      axiosIns.post(`/users/updateSpeakerStatus/${uid}`).then((res: any) => {
        store.set('status_speaker', 1);
      });
    }
    return axiosIns.post(`/room_users/changeRoom`, dataNew)
      .then(function (response: any) {
        store.set('dataChannel', response.data.result);
        socket.emit(SOCKET_EVENT.JOIN_ROOM, data)
        return { ...data };
      })
      .catch(function (error: any) {
        return "error"
      });
  }
});

ipcMain.handle('initDataWhenLoginSuccess', async (event: any, data: any) => {
  socket.auth.floorId = data.floorId;
  store.set({ floorId: data.floorId, is_login: true })
})

ipcMain.handle("update-room-voices", async (event: any, data: any) => {
  let dataRoomVoice = {
    room_id: store.get('room_id')
  }
  return axiosIns.post(`/room_voices/updateRoomVoice`, dataRoomVoice)
    .then(function (response: any) {
      return response.data
    })
    .catch(function (error: any) {
      return "error"
    });
});

const leaveRoom = () => {
  let data = {
    uid: store.get('uid')
  };
  store.delete('old_room');
  store.delete('is_join_room')
  socket.emit(SOCKET_EVENT.LEAVE_ROOM, {
    room_id: store.get('room_id'),
    floor_id: store.get('current_floor_id'),
    username: store.get('userName'),
    userId: store.get('userId'),
    leave: true
  });
  return axiosIns.post("/room_users/leaveRoom", data).then(() => {
    store.delete('room_id')
    return true
  }).catch(() => {
    return false
  })
}
const autoLoginWhenVirifySuccess = async () => {
  const email = store.get('email');
  const password = store.get('password');
  const user = await firebaseApp.authenticate(email, password);
  const uid = user.user.uid;
  store.set('uid', uid);
  store.set('token', user._tokenResponse.idToken);
  store.set('refreshToken', user._tokenResponse.refreshToken)
  axiosIns.defaults.headers.common['Authorization'] = 'Bearer ' + user._tokenResponse.idToken;
  await axiosIns.post('/users/authenticated')
  const companyId = await getCompanyId(uid);
  await axiosIns.get(`/floors/active/${companyId}`)
    .then(function (response: any) {
      const id = convertObjecttoArry(response.data.floors)[0].id;
      socket.auth.floorId = id;
      socket.auth = {
        uid: uid,
        userId: store.get('userId'),
        floorId: id
      };
      socket.connect();
      store.set({ floorId: id, is_login: true })
    })
};

ipcMain.handle('getCurrentAvatar', async (event: any, data: any) => {
  return axiosIns.get(`users/${store.get('userId') as string}`).then((res: any) => {
    store.set({
      userAvatar: res.data.user.avatar ?? '../static/defaultImage.png',
      userName: convertToText(res.data.user.onamae)
    })
    return res.data.user.avatar ?? '../static/defaultImage.png'
  }).catch((error: { data: any; }) => {
    return error.data
  })
})

const convertToText = (unicodeText: string): string => {
  if (unicodeText.split(',').length > 1) {
    return unicodeText.split(',')
      .map((unicode: any) => String.fromCodePoint(unicode))
      .join("");
  }
  return unicodeText;
}

const toUnicodeText = (text: string): string => {
  return Array.from(text).map((item: string) => item.codePointAt(0)).join(',');
}

ipcMain.handle('remove-room', async (event: any, data: any) => {
  axiosIns.delete(`rooms/${data.room_id}`)
    .then((res: any) => {
      socket.emit(SOCKET_EVENT.REMOVE_ROOM, {
        userId: store.get('userId'),
        username: store.get('userName'),
        room_id: data.room_id,
        floor_id: store.get('floorId'),
        uids: data.uids
      })
    })
  if (data.hasUser) {
    Promise.all(data.uids.map((uid: any) => axiosIns.post("/room_users/leaveRoom", { uid: uid })))
  }
})

ipcMain.handle('remove-floor', async (event: any, data: any) => {
  Promise.all([
    axiosIns.delete(`floors/${data.floor_id}`),
    axiosIns.get(`/room_users/active/floor/${data.floor_id}`)
  ]).then((response: any) => {
    const [isRemoved, result] = response;
    const users = convertObjecttoArry(result.data.room_users);
    const uids = users.map((user: any) => user.uid)
    socket.emit(SOCKET_EVENT.REMOVE_FLOOR, {
      floor_id: data.floor_id,
      position: data.position,
      uids: uids,
    })
    Promise.all(uids.map((uid: any) => axiosIns.post("/room_users/leaveRoom", { uid: uid })))
  })
})

const updateAvatar = (filePaths: string, is_base64?: boolean) => {
  let img = fs.createReadStream(filePaths)
  let data = new FormData()
  data.append("photos", img)
  data.append("uid", store.get('uid'))
  return axiosIns.post(`/users/changeAvatar/${store.get('uid')}`, data)
    .then(function (response: any) {
      if (store.get('is_join_room')) {
        socket.emit(SOCKET_EVENT.CHANGE_AVATAR, {
          userId: store.get('userId'),
          username: store.get('userName'),
          userAvatar: response.data.avatar,
          floor_id: store.get('current_floor_id'),
        })
      }
      return [response.status.toString(), response.data.avatar]
    })
    .catch(function (error: any) {
      return [error.response?.status??'1', error.response.data.message]
    });
}

ipcMain.handle("change-login-status", async (event, data) => {
  socket.emit(SOCKET_EVENT.CHANGE_LOGIN_STATUS, {
    userId: store.get('userId'),
    username: store.get('userName'),
    floor_id: store.get('current_floor_id'),
    status: data.login_status,
    custom_status: data.custom_status
  })
  return axiosIns.post(`/users/changeLoginStatus/${store.get('uid')}`, data)
    .then(function (response: any) {
      check = "Done";
      return check
    })
    .catch(function (error: any) {
      check = error.response.data.message;
      return check
    });
});