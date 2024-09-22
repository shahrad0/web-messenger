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
        <div class="username" data-username="${username}">${username}</div>
        <div class="message-text"  ><p>${message}</p></div>
        <div class="message-detail"></div>
      </div>
    </div>
  </div>`
}
// end message func
// black screen

const blackScreen = document.getElementById("black-screen")
// closeBlackScreen.addEventListener("click",()=>{
//   blackScreen.style.display = `none`
// })
document.addEventListener("click", function(event) {
  if (event.target.classList.contains('username')) {
    const username = event.target.getAttribute('data-username'); // Get the username from the clicked element
    
    fetch(`/user-details?username=${encodeURIComponent(username)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      return response.json();  // Attempt to parse JSON only if the response is okay
    })
    .then(user => {
      if (user) {
        // Display the user details (e.g., in a modal or a separate section)
        blackScreen.style.display = 'block';
        blackScreen.innerHTML = `
        <div class="user-profile-detail">
          <div class="user-info">
            <p>User Info</p>
            <button id="close-black-screen"><svg fill="#000000" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 460.775 460.775" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"/><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/><g id="SVGRepo_iconCarrier"> <path d="M285.08,230.397L456.218,59.27c6.076-6.077,6.076-15.911,0-21.986L423.511,4.565c-2.913-2.911-6.866-4.55-10.992-4.55 c-4.127,0-8.08,1.639-10.993,4.55l-171.138,171.14L59.25,4.565c-2.913-2.911-6.866-4.55-10.993-4.55 c-4.126,0-8.08,1.639-10.992,4.55L4.558,37.284c-6.077,6.075-6.077,15.909,0,21.986l171.138,171.128L4.575,401.505 c-6.074,6.077-6.074,15.911,0,21.986l32.709,32.719c2.911,2.911,6.865,4.55,10.992,4.55c4.127,0,8.08-1.639,10.994-4.55 l171.117-171.12l171.118,171.12c2.913,2.911,6.866,4.55,10.993,4.55c4.128,0,8.081-1.639,10.992-4.55l32.709-32.719 c6.074-6.075,6.074-15.909,0-21.986L285.08,230.397z"/> </g></svg></button>
          </div>
          <div class="user-info-container">
            <img class="user-image" src="/uploads/${user.profile_image}" alt="">
            <div style="width: 100%;">
              <p class="user-detail">${user.username}</p>
              <p class="user-detail">User ID: ${user.id}</p>
              <p class="user-detail">User Role: -----</p>
            </div>
          </div>
        `;

        const closeBlackScreen = document.getElementById("close-black-screen");
        closeBlackScreen.addEventListener("click", () => {
          blackScreen.style.display = `none`;
        });
      }
    })
    .catch(error => {
      console.error('Error fetching user details:', error);
    });
  }
});
