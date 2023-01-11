
var userAvatarElement: HTMLImageElement;
var userNameElement: HTMLInputElement;
var errorElementText: HTMLElement;
var camera: HTMLMediaElement;
var cameraButton: HTMLElement;
var cameraCapture: HTMLElement;
var localstream;

function capture() {
  let video = document.querySelector("video");
  let image = document.getElementById("userAvatar") as HTMLImageElement;
  let canvas = document.createElement("canvas");
  // scale the canvas accordingly
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  // draw the video at that frame
  canvas.getContext('2d')
    .drawImage(video, 0, 0, canvas.width, canvas.height);
  // convert it to a usable data URL
  let dataURL = canvas.toDataURL('image/jpeg');
  image.src = dataURL;
  window.api.store('Set', {
    'is_new_avata': true,
    'new_avatar_path': dataURL
  })
}

async function videoStart() {
  await navigator.mediaDevices.getUserMedia({video: true})
    .then(async function (stream) {
      camera.srcObject = stream;
      cameraButton.setAttribute('onclick', 'videoOff()');
      cameraCapture.hidden = false;
    }).catch(function () {
      alert('could not connect stream');
    });
}

function videoOff() {
  (camera.srcObject as any
  ).getTracks().forEach((track: any) => track.stop());
  cameraCapture.hidden = true;
  cameraButton.setAttribute('onclick', 'videoStart()')
}

function closeCamera() {
  (camera.srcObject as any
    )?.getTracks().map(function (track: any) {
      track.stop();
  })
}

async function init() {
  userAvatarElement = document.getElementById('userAvatar') as HTMLImageElement;
  userNameElement = document.getElementById('userName') as HTMLInputElement;
  errorElementText = document.getElementById('error-message');
  camera = document.getElementById('camera') as HTMLMediaElement;
  cameraButton = document.getElementById('cameraStart');
  cameraCapture = document.getElementById('cameraCapture');
}

function openNewAvatar() {
  window.api.invoke('open-upload-avatar').then((res: any) => {
    if (res) {
      userAvatarElement.src = res
      window.api.store('Set', {
        'is_new_avata': true,
        'new_avatar_path': res
      })
    }
  })
}

async function uploadAvatar() {
  let new_avatar_path = await window.api.store('Get', 'new_avatar_path')
  let result = await window.api.invoke('update-user-avatar', new_avatar_path)
  if (result[0] === "200") {
    document.getElementById('currentAvatar')?.setAttribute('src', new_avatar_path)
  }
  return result
}

async function saveUserProfile() {
  closeCamera();
  let loadingUpData = document.getElementById("loading-up-data") as HTMLElement;
  loadingUpData.style.display = 'block'
  let avatarElement = document.getElementById('userAvatar') as HTMLImageElement;
  let userNameElement = document.getElementById('userName') as HTMLInputElement;

  let is_new_avata = await window.api.store('Get', 'is_new_avata')
  let userName = await window.api.store('Get', 'userName')
  errorElementText.innerText = ""
  if (is_new_avata) {
    console.log('ready to call api')
    let result = await uploadAvatar();
    console.log('call api done with result: ', result)
    console.log(result)
    if (result[0] !== "200") {
      let errorMessage = "ファイルサイズは1MB以下です。"
      settingForm(errorMessage)
      return false
    }
    avatarElement.src = result[1]
    await window.api.store('Set', {userAvatar: result[1]})
  }
  if (userNameElement.value !== userName) {
    if (isHTML(userNameElement.value)) {
      let errorMessage = "全半角文字、絵文字、記号のみを入力してください。"
      settingForm(errorMessage)
      return false
    }
    let result = await uploadName()
    if (result) {
      await window.api.store('Set', {userName: userNameElement.value})
    }
  }
  loadingUpData.style.display = 'none'
  showFloor(localStorage.getItem("floorId"))
  window.api.store('Delete', 'is_new_avata')
}

function uploadName() {
  let name = (document.getElementById("userName") as HTMLInputElement
  ).value
  return window.api.invoke('changeName', name)
    .then((res: any) => {
      if (res) {
        return name
      }
      window.api.send('close-modal');
    })
}

async function settingForm(errorMessage: string) {
  deleteElement("room");
  window.api.store('Delete', 'is_new_avata')
  window.api.store('Delete', 'new_avatar_path')
  localStorage.setItem("is_setting_page", "true");
  let roomForm = document.getElementById('room-list')
  roomForm.innerHTML = await settingHTML()
  init()
  errorElementText.innerText = errorMessage
}

function leaveSettingForm() {
  closeCamera();
  showFloor(localStorage.getItem("floorId"))
}

const showChangePassModal = () => {
  window.api.send('show-change-pass-modal');
}

async function settingHTML() {
  let userName = await window.api.store('Get', 'userName')
  let userAvatar = await window.api.store('Get', 'userAvatar')

  return `
  <div class="userProfile" id="userProfile">
    <div class="draggable headerProfile" > ユーザープロフィール </div>
    <div class="userName" >
      <div>
        <label>名前:</label>
        <input id="userName" value='${userName}'>
      </div>
    </div>
    <div class="userAvatar" >
      <label>アバター:</label>
      <img class="imgUserAvatar" id="userAvatar" src='${userAvatar}'>
      <button class="uploadImage" onclick = "openNewAvatar()" >写真アップロード</button>
      <button class="camera" id = "cameraStart" onclick = "videoStart()" >カメラ</button>
      <button style="z-index: 10000;transform: translateY(30px);" class="camera" id = "cameraStart" onclick="showChangePassModal()" >パスワード変更</button>
      <p class="error-message" id = "error-message" ></p>
      <img src = "../static/take_picture.png" class="imgCapturePicture" id = "cameraCapture" onclick = "capture()" hidden >
      <img src = "../static/loading-gif.gif" class="imgCapturePicture" id = "loading-up-data" style = "display: none" >
      <video class="cameraVideo" id = "camera" autoplay > </video>
    </div>
    <div class="groupButton" >
      <button class="buttonLeft" onclick = "saveUserProfile()" >保存</button>
      <button class="buttonRight" onclick = "leaveSettingForm()" >キャンセル</button>
    </div>
  </div>
  `
}