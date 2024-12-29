// to insure redirecting user
fetch("/verify", { credentials: "include" })
  .then((res) => {
    if (!res.ok) throw new Error("Failed to verify user")
    window.location.href = "../"
    return res.json()
  })

const form = document.getElementById("form")
form.addEventListener('submit', function(e) {
  e.preventDefault()
  
  const username = document.getElementById("username").value
  const password = document.getElementById("password").value

  // Prepare the data as JSON
  const data = JSON.stringify({ username, password });

  fetch('/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: data,
    credentials: 'include' // Ensure cookies are sent with the request
  })
  .then(response => {
  console.log(response.headers)
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
    console.error('Error:', error)
    alert(error.message)
  })
})

document.getElementById("login-redirect").addEventListener("click", () => { window.location.href = '../Sign-up/' })