// idk wtf is this
let socket = io();
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById("messages")

form.addEventListener('submit', function(e) {
  e.preventDefault();
  if (input.value) {
    socket.emit('chat message', input.value);
    // input.value = '';
  }
});

socket.on('chat message', function(msg) {
  messages.innerHTML += message(msg);
  window.scrollTo(0, document.body.scrollHeight);
});
// idk wtf is this end

// divider
function dividerEffect(){

}
function dividerDeffect(){
  
}
const devider = document.getElementById("divider")
devider.addEventListener("mousedown",()=>{

})
devider.addEventListener("mouseup",()=>{

})
//end divider
// send button
const sendButton = document.getElementById("send")
sendButton.addEventListener("click",()=>{
  setTimeout(() => {
    scrollToBottom("messages")
  },10)
})

// end send button
// auto scroll down
function scrollToBottom(element){
  let messageContainer = document.getElementById(`${element}`);
  messageContainer.scrollTo({
    top: messageContainer.scrollHeight,
    behavior: "smooth"
});
}

input.addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    setTimeout(() => {
      scrollToBottom("messages")
    },10)}
}); 

// end auto scroll down
// handle user input to db
form.addEventListener('submit', function(e) {
  e.preventDefault();
  const message = input.value.trim();
  
  if (message === '') {
    console.error('Empty message, nothing to send.');
    return;
  }

  fetch('/submit-message', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: message }),
  })
  .then(response => {
    if (!response.ok) {
        throw new Error('Failed to submit message');
    }
    return response.text();
  })
  .then(data => {
      console.log(data); // Display server response
      input.value = ''; // Clear the input field after success
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
        messages.innerHTML+= messageTemplate(message.message);
      });
    })
    .catch(error => console.error('Error fetching messages:', error));
}

// Call loadMessages when the page loads
document.addEventListener('DOMContentLoaded', loadMessages);


// message func
function messageTemplate(message){
  return`<div class="message">
    <div class="message-container">
      <div class="message-profile">
        <img src="Images/User Profile/a.jpg" alt="" class="user-profile">
      </div>
      <div class="message-content">
        <div class="message-header">mmd</div>
        <div class="message-text"  ><p>${message}</p></div>
        <div class="message-detail"></div>
      </div>
    </div>
  </div>`
}
// end message func
// new
document.addEventListener('DOMContentLoaded', function() {
  // Assuming you're storing the username in localStorage
  const username = localStorage.getItem('username');
  
  if (!username) {
    // Redirect to the login page if no username is found
    window.location.href = '/Login/login.html'; 
  }
});
