
const toLoginForm = () => {
  window.api.invoke('login-form')
}

const toVerifyEmail = () => {
  window.api.invoke('verify-email-form')
}

const signUp = () => {
  let onamae = document.getElementById('name') as HTMLInputElement
  let company_code = document.getElementById('company') as HTMLInputElement
  let email = document.getElementById('email') as HTMLInputElement
  let password = document.getElementById('password') as HTMLInputElement

  let uid = 1

  let data = {
    uid: uid,
    onamae: onamae.value,
    email: email.value,
    company_code: company_code.value,
    password: password.value
  }
  if (isHTML(onamae.value) || isHTML(password.value) || isHTML(email.value) || isHTML(company_code.value)) {
    document.getElementById('error-message').innerText = "全半角文字、絵文字、記号のみを入力してください。"
  } else if (password.value.length < 6) {
    document.getElementById('error-message').innerText = "パスワードは6文字以上で入力してください。"
  } else {
    window.api.invoke("createUser", data)
    .then(function (res: any) {
      if (res == "Done") {
        window.api.store('Set', {email: email.value, password : password.value})
        toVerifyEmail()
      } else {
        if (res.includes("Company")) {
          document.getElementById('error').innerText = "会社コードが無効です。";
        }
        else if (res.includes("firebase")){
          document.getElementById('error').innerText = "メール形式が正しくない或いはメールが存在していますので再度確認ください。";
        }
        else {
          document.getElementById('error').innerText = res;
        }
      }
    })
    .catch(function (err: any) {
      console.error(err);
    });
  }
}

