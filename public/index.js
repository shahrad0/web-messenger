// check for username
document.addEventListener('DOMContentLoaded', function() {
  const username = localStorage.getItem('username')
  const userId =  localStorage.getItem('userId');
  const authorized =  localStorage.getItem('authorized');
  if (!username) window.location.href = '/Login/login.html'
  if (!userId) window.location.href = '/Login/login.html'
  if (!authorized) window.location.href = '/Authorize/'
});
let socket = io();
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById("messages")
socket.on('chat message', (msg) => {
  // Append the message to the chat without refreshing the page
  messages.innerHTML += messageTemplate(msg.message, msg.username, msg.profileImage);
  // Scroll to the bottom after appending a new message
  setTimeout(() => {scrollToBottom("messages")},10)
})
// end this is for updating 
// divider
const divider = document.getElementById("divider")
divider.addEventListener("mousedown",()=>{
  divider.addEventListener("mousemove",()=>{
    console.log("a")
  })
})
//end divider
// auto scroll down
function scrollToBottom(element){
  let messageContainer = document.getElementById(`${element}`);
  messageContainer.scrollTo({
    top: messageContainer.scrollHeight,
    behavior: "smooth"
});
}

// end auto scroll down
// handle user input to db
form.addEventListener('submit', function(e) {
  e.preventDefault();
  const message = input.value.trim();
  const userId = localStorage.getItem('userId');
  
  if (!userId) {
    console.error('User ID not found. User might not be logged in.');
    return;
  }
  
  if (message === '') {
    console.error('Empty message, nothing to send.');
    return;
  }
  
  fetch('/submit-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: message, userId: userId }),
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to submit message');
    return response.json();
  })
  .then(data => {
    // Clear the input field after success
    input.value = '';
  })
  .catch(error => console.error('Error:', error));
});

// end handle user input to db 

// handing db data to client

function loadMessages() {
  fetch('/get-messages')
    .then(response => response.json())
    .then(data => {
      messages.innerHTML = '';
      data.forEach(message => {
        messages.innerHTML+= messageTemplate(message.message,message.username, message.profile_image);
      });
    })
    .catch(error => console.error('Error fetching messages:', error));
}

// Call loadMessages when the page loads
document.addEventListener('DOMContentLoaded', loadMessages);


// message func
function messageTemplate(message,username,profileImage){
  return`<div class="message">
    <div class="message-container">
      <div class="message-profile">
        <img src="uploads/${profileImage}" alt="" class="user-profile">
      </div>
      <div class="message-content">
        <div class="username">${username}</div>
        <div class="message-text"  ><p>${message}</p></div>
        <div class="message-detail"></div>
      </div>
    </div>
  </div>`
}
// end message func
// black screen
const closeBlackScreen = document.getElementById("close-black-screen")
const blackScreen = 
closeBlackScreen.addEventListener("click",()=>{

})