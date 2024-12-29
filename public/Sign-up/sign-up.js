// to insure redirecting user
fetch("/verify", { credentials: "include" })
  .then((res) => {
    if (!res.ok) throw new Error("Failed to verify user")
    window.location.href = "../"
    return res.json()
  })

function previewFile() {
    let preview = document.querySelector('img')
    let file    = document.querySelector('input[type=file]').files[0]
    let reader  = new FileReader()
    reader.onloadend = function () {  preview.src = reader.result}
    if (file) reader.readAsDataURL(file);
    else preview.src = "";
}

const form = document.getElementById("form")
form.addEventListener('submit', function(e) {
  e.preventDefault()

  const formData = new FormData(form)

  fetch('/register', {
      method: 'POST',
      body: formData
  })
  .then(response => {
  if (!response.ok) { 
    console.error('Error Status:', response.status, response.statusText)
    return response.text().then(text => { throw new Error(text); })
  }

  return response.json()
  })
  .then(data => {
    window.location.href = '../'
  })
  .catch(error => {
    console.error('Error:', error);
    alert(error.message);
  })
})

document.getElementById("login-redirect").addEventListener("click", () => { window.location.href = '../login/' })