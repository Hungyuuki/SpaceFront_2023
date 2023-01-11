const signUpForm = () => {
    window.api.invoke('sign-in-form');
};
const loginRequest = () => {
    let email = document.getElementById('username');
    let password = document.getElementById('password');
    let data = {
        email: email.value,
        password: password.value
    };
    if (isHTML(email.value) || isHTML(password.value)) {
        document.getElementById('error-message').innerText = "全半角文字、絵文字、記号のみを入力してください。";
        return;
    }
    const loadingLogin = document.querySelector("#loading");
    loadingLogin.innerHTML = "<img src=\"../static/loading-gif.gif\" alt=\"\" width=\" 10%\">";
    window.api.invoke('login', data)
        .then(function (res) {
        if (res != "err") {
            localStorage.setItem("companyId", res);
            window.api.invoke('getFristFloorOfCompany', res)
                .then((floorId) => {
                localStorage.setItem("last_action_time", String(Date.now() + (1000 * 60 * 5)));
                window.api.invoke('initDataWhenLoginSuccess', {
                    floorId: floorId
                });
                homePage();
            });
        }
    })
        .catch(function (err) {
        document.getElementById('error-message').innerText = "メール或いはパスワードが存在していません。";
        const loadingLogin = document.querySelector("#loading");
        loadingLogin.innerHTML = "【ログイン】";
    });
};
const homePage = () => {
    window.api.invoke('home-page');
};
//# sourceMappingURL=login.js.map