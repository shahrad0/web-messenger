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
  const formData = new FormData(form);
  fetch('/register', {
      method: 'POST',
      body: formData
  })
  .then(response => {
  if (!response.ok) { 
    console.error('Error Status:', response.status, response.statusText)
    return response.text().then(text => { throw new Error(text); })
  }
  return response.json();
  })
  .then(data => {
  setTimeout(()=>{window.location.href = '../../'},1)
  })
  .catch(error => {
  console.error('Error:', error);
  alert(error.message);
}); 
  
});
document.getElementById("login-redirect").addEventListener("click",()=>{setTimeout(()=>{window.location.href = '../Login/login.html'},1)})