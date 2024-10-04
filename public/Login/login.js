function previewFile() {
    var preview = document.querySelector('img');
    var file    = document.querySelector('input[type=file]').files[0];
    var reader  = new FileReader();
    reader.onloadend = function () {
      preview.src = reader.result;
    }
  
    if (file) reader.readAsDataURL(file);
    else preview.src = "";
    
  }
//   new 
const form = document.getElementById("form")
form.addEventListener('submit', function(e) {
  e.preventDefault();
  
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

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
  if (!response.ok) { 
    console.error('Error Status:', response.status, response.statusText)
    return response.text().then(text => { throw new Error(text); })
  }
  return response.json();
  })
  .then(data => {

  // localStorage.setItem('userId'  , data.userId)
  // localStorage.setItem('username', username)
  // localStorage.setItem('password', password)

  setTimeout(()=>{window.location.href = '../../'},1)
  })
  .catch(error => {
  console.error('Error:', error);
  alert(error.message);
}); 
  
});
document.getElementById("login-redirect").addEventListener("click",()=>{
  setTimeout(()=>{window.location.href = '../Sign-up/sign-up.html'},1)

})