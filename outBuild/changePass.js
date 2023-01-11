const newPass = document.getElementById('new-pass');
const confirmPass = document.getElementById('confirm-pass');
const errorMessage = document.getElementById('error-message');
function closeModalChangePass() {
    window.api.send('close-modal');
}
confirmPass.oninput = (e) => {
    if (e.target.value == newPass.value) {
        errorMessage.innerText = '';
    }
};
const confirmChangePass = () => {
    if (isHTML(newPass.value) || isHTML(confirmPass.value)) {
        errorMessage.innerText = '全半角文字、絵文字、記号のみを入力してください。';
        newPass.focus();
    }
    else if (newPass.value == '' || newPass.value.length < 6) {
        errorMessage.innerText = '半角英数6文字以上でパスワードを登録してください。';
        newPass.focus();
    }
    else if (confirmPass.value != newPass.value) {
        errorMessage.innerText = '確認用パスワードと一致しません';
        confirmPass.focus();
    }
    else {
        window.api.invoke('changePass', newPass.value)
            .then((res) => {
            window.api.send('close-modal');
            window.api.invoke('home-page');
        });
    }
};
//# sourceMappingURL=changePass.js.map