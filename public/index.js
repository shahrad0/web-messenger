// things to add or do
// polishing the code (for css too)(this is always going to be the goal)
// add notification and add toggle for it 
// add custom background image 
// add poll or voting system
// in ahh chat add quiz mode or test mode 
// allow selecting multiple messages and deleting them 
// reverse pagination
// add "convert to" as right click option when right clicking on an input and add "binary" etc.. as options
// add /game + name of the game e.g. /game pong and they'd be able to play a game in chat and others could spectate
// show upload speed when uploading 
// organize where user uploads are e.g. profile goes in -> user/profile or user upload goes to user/media
// ftp server
// add safemode for future
// link clicks to users in db also make it a global thing and add a leaderboard maybe ? idk
// add right click item for downloading shit
// add date to chat
// add edit but not with right click, if user clicks on its own message it would just act as a text on a notepad so they'd be able to change it easily 
// limit search
// store things (images etc...)on users device 
// /calc for simple math
// support phones (css bs)
// show file name (save it as a message in db or sth)
// rework html structre its kinda stupid rn (message container form and navigator)
// show who is typing 

if (!localStorage.getItem('authorized')) window.location.href = '/Authorize/'

fetch("/verify", { credentials: "include" })
  .then((res) => {
    if (!res.ok) throw new Error("Failed to verify user")
    return res.json()
  })
  .catch((err) => {
    console.error("Error:", err.message)
    window.location.href = "login/"
  })

document.addEventListener('DOMContentLoaded', ()=> {
  loadSavedColors()
  updateFilters()
  addChats()
  loadMessages(chatId)
  getUserRole()
})

let loadedMessageRange = []
let unseenMessages = 0
let isUploading = false
let isScrolling = false
let trackScroll = []
let userRole
let replyId
let chatId = 1
let userId
let clicks = parseInt(localStorage.getItem('clicks'), 10) || 0
let socket = io()
const body             = document.body
const form             = document.getElementById('form')
const input            = document.getElementById('input')
const sideMenu         = document.getElementById("side-menu")
const navigator        = document.getElementById("navigation-bar")
const fileInput        = document.getElementById('file')
const searchInput      = document.getElementById("search-input")
const mainContainer    = document.getElementById("main-container")
const chatContainer    = document.getElementById("chat")
const inputContainer   = document.getElementById("input-container")
const messageContainer = document.getElementById("message-container")

socket.on('chat message', (message) => {
  if (chatId == message.chatId) {
    const fragment = document.createDocumentFragment()
    fragment.appendChild(messageTemplate(message))
    messageContainer.appendChild(fragment)

    let notify = document.getElementById("notify")
    if (notify) {
      clearTimeout(notifyTimeout) 
      notify.remove()
    }
  
    notify = createCustomElement("div", { id: "notify"})
    messageContainer.appendChild(notify)
  
    notifyTimeout = setTimeout(() => notify.remove() , 1000)
  
    if (messageContainer.scrollHeight - (messageContainer.clientHeight / 2) <= (messageContainer.scrollTop + messageContainer.clientHeight)) {
      // TEMP
      setTimeout(() => scrollToBottom(true), 100)
    }
    else {
      unseenMessages++
      let unseenMessagesElement = document.getElementById("unseen-messages")
      if (!unseenMessagesElement) {
        unseenMessagesElement = createCustomElement("div", { id: "unseen-messages" })
        document.getElementById("scroll-down")?.appendChild(unseenMessagesElement)
      }
      unseenMessagesElement.innerText = unseenMessages
    }
  }
  // show unseen messages on different chats 
  else {
    return
  }
})

function removeUnseenMessagesElement() {
  unseenMessages = 0
  document.getElementById("unseen-messages")?.remove()
}

// START getting user role

async function getUserRole() {
  try {
    const response = await fetch(`/get-user-role`, { credentials : 'include' })

    if (!response.ok)   throw new Error(`Error: ${response.status} ${response.statusText}`)

    userRole = await response.json()
    userRole = userRole.role
  } 
  catch (error) {
    console.error("Failed to fetch user role:", error)
  }
}

// END getting user role

// START menu divider (optimize maybe ?)

const divider = document.getElementById("menu-divider")
let sideMenuIsOpen = true
let debounceTimeout

divider.addEventListener("mousedown", () => {
  body.style.userSelect = "none"

  const onMouseMove = (e) => {
    const containerWidth = mainContainer.clientWidth
    const percentageWidth = (e.clientX / containerWidth) * 100
    if (sideMenuIsOpen) {
      if (percentageWidth >= 5 && percentageWidth <= 50) sideMenu.style.flexBasis = `${percentageWidth}%`
      else if (percentageWidth < 5) hideSideMenu()
    }
  }

  const onMouseUp = () => {
    body.style.userSelect = ""
    document.removeEventListener("mousemove", onMouseMove)
    document.removeEventListener("mouseup", onMouseUp)
  }

  document.addEventListener("mousemove", onMouseMove)
  document.addEventListener("mouseup", onMouseUp)
})

function hideSideMenu() {
  sideMenuIsOpen = false 
  sideMenu.style.display = "none"
  divider.style.display = "none"
  const showSideMenuButton = createCustomElement("button", {
    id: "show-side-menu",
    className: "generic-button",
    HTML: `<svg viewBox="0 0 32 32"><g><path d="M31.71,15.29l-10-10L20.29,6.71,28.59,15H0v2H28.59l-8.29,8.29,1.41,1.41,10-10A1,1,0,0,0,31.71,15.29Z"/></g></svg>`,
    onClick: () => showSideMenu()
  })

  body.appendChild(showSideMenuButton)
  const debouncedHoverHandler = debounce((e) => handleSideMenuHover(e, showSideMenuButton), 1000)
  document.addEventListener("mousemove", debouncedHoverHandler)
}

function handleSideMenuHover(e, showSideMenuButton) {
  clearTimeout(debounceTimeout)
  if (!sideMenuIsOpen && e.x < window.innerWidth / 10) {
    if (!sideMenuIsOpen && e.x < window.innerWidth / 10) {
      showSideMenuButton.style.animation = "showSideMenu var(--long-transition) forwards"
      showSideMenuButton.style.left = "15px"
    }
  } else {
    showSideMenuButton.style.animation = "hideSideMenu var(--long-transition) forwards"
    showSideMenuButton.style.left = "-50px"
  }
}

function debounce(fn, delay) {
  return function (...args) {
    clearTimeout(debounceTimeout)
    debounceTimeout = setTimeout(() => fn(...args), delay)
  }
}

function showSideMenu() {
  sideMenuIsOpen = true
  sideMenu.style.display = "block"
  divider.style.display = "block"
  document.getElementById("show-side-menu").remove()
  document.removeEventListener("mousemove", handleSideMenuHover)
}

// END menu divider

function previewFile() {
  let preview = document.querySelector('img')
  let file    = document.querySelector('input[type=file]').files[0]
  let reader  = new FileReader()
  reader.onloadend = function () {  preview.src = reader.result}
  if (file) reader.readAsDataURL(file);
  else preview.src = "";
}

// START scroll button and handling pagination

messageContainer.addEventListener('scroll', () => {
  // check if element been scrolled more than 10% of message height
  if ((messageContainer.scrollHeight - messageContainer.clientHeight / 4) <= (messageContainer.scrollTop + messageContainer.clientHeight)) {
    const scrollDownButton = document.getElementById("scroll-down")
    if (scrollDownButton) {
      scrollDownButton.style.animation = "hide-scroll-down var(--short-transition) ease-in-out"
      scrollDownButton.addEventListener('animationend', () => scrollDownButton.remove(), { once: true })
    }

    removeUnseenMessagesElement()
  }
  else if (!document.getElementById("scroll-down")) {
    const scrollDownButton = createCustomElement("button", {
      id: "scroll-down",
      text: "v",
      onClick: () => scrollToBottom(true)
    })
    scrollDownButton.type = "button"
    form.appendChild(scrollDownButton)
  }

  if (messageContainer.scrollTop === 0) loadOlderMessages()
})

// END scroll button and handling pagination

function scrollToBottom(transition) {
  messageContainer.scrollTo({
    top: messageContainer.scrollHeight,
    behavior: transition ? "smooth" : "instant"
  })

  removeUnseenMessagesElement()
}

input.addEventListener("focus", () => {
  inputContainer.classList.add("input-container-focus")
  input.addEventListener("blur", () => inputContainer.classList.remove("input-container-focus"), { once: true })
})

function handleSendingMessage(e) {
  e.preventDefault()
  if (!input.innerText.startsWith("/")) sendMessage(input.innerText,replyId,chatId)
  else commandHandler(input.innerText)
}

form.addEventListener('submit', (e) => handleSendingMessage(e))

function messageTemplate(message) {
  const messageDiv = createCustomElement('div', { className: 'message' })

  const messageContainer = createCustomElement('div', { className: 'message-container' })

  const profileDiv = createCustomElement('div', { className: 'message-profile' })
  const profileImage = createCustomElement('img', { 
    className: 'user-profile'
  })
  profileImage.src = `uploads/${message.profileImage}`
  profileImage.alt = 'NPC'
  profileDiv.appendChild(profileImage)

  const contentDiv = createCustomElement('div', { className: 'message-content' })
  const usernameDiv = createCustomElement('div', { 
    className: 'username', 
    text: message.username 
  })
  usernameDiv.dataset.userId = message.userId
  contentDiv.appendChild(usernameDiv)

  if (message.replyId && message.repliedMessage && message.repliedUsername) {
    const replyDiv = createCustomElement('div', { 
      className: 'replied-message-container', 
      onClick: () => scrollToMessage(message.replyId) 
    })
    replyDiv.dataset.replyId = message.replyId

    const replyUsernameDiv = createCustomElement('div', { 
      className: 'replied-username', 
      text: message.repliedUsername 
    })
    replyDiv.appendChild(replyUsernameDiv)

    const replyText = createCustomElement('div', { className: 'replied-text', text: message.repliedMessage })
    replyDiv.appendChild(replyText)

    contentDiv.appendChild(replyDiv)
  }

  if (message.filePaths && Array.isArray(message.filePaths)) {
    message.filePaths.forEach(filePath => {
      const fileExt = filePath.split('.').pop().toLowerCase()
      let fileElement

      if (['jpeg', 'jpg', 'png'].includes(fileExt)) {
        fileElement = createCustomElement('img', { 
          className: 'sent image',
        })
        fileElement.src = `uploads/${filePath}`
      } else if (['mp4', 'avi'].includes(fileExt)) {
        fileElement = createCustomElement('video', { 
          className: 'sent video',
        })
        fileElement.src = `uploads/${filePath}`
      } else if (fileExt === 'pdf') {
        fileElement = createCustomElement('iframe', { className: 'sent pdf' })
        fileElement.src = `uploads/${filePath}`
        fileElement.width = `8000px !important`
        fileElement.height = `700px`
      } else {
        fileElement = createCustomElement('a', { 
          HTML: `<a href="uploads/${filePath}">AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA</a>` 
        })
      }

      contentDiv.appendChild(fileElement)
    })
  }

  const messageTextDiv = createCustomElement('div', { 
    className: 'message-text', 
    text: message.message || '' 
  })
  messageTextDiv.dataset.messageId = message.messageId
  contentDiv.appendChild(messageTextDiv)

  messageContainer.appendChild(profileDiv)
  messageContainer.appendChild(contentDiv)
  messageDiv.appendChild(messageContainer)

  return messageDiv
}

function scrollToMessage(messageId, newChatId = null) {
  const targetMessage = document.querySelector(`.message-text[data-message-id="${messageId}"]`)

  if (targetMessage) {
    targetMessage.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const messageContainer = targetMessage.closest('.message')?.querySelector('.message-container')
    
    if (messageContainer) {
      messageContainer.classList.add('highlighted-message')
      setTimeout(() => messageContainer.classList.remove('highlighted-message'), 1000)
    }
  }
  else loadSpecificMessage(newChatId !== chatId ? newChatId : null, messageId)
}

function sanitizeMessage(inputMessage) {
  // Combine consecutive newlines into one and trim leading/trailing whitespace or newlines
  return inputMessage.replace(/\s*\n\s*/g, '\n').trim()
}

async function sendMessage(userMessage, replyId = null, chatId) {
  if (isUploading) {
    inputContainer.classList.add("upload-warning")
    setTimeout(() => inputContainer.classList.remove("upload-warning"), 5000)
    return
  }

  const message = sanitizeMessage(userMessage)
  const hasFile = fileInput && fileInput.files.length > 0
  
  if (!message && !hasFile) return
  
  try {
    isUploading = true
    const xhr = new XMLHttpRequest()
    const url = '/submit-message'
    xhr.open('POST', url, true)
    xhr.withCredentials = true

    let progressBar
    if (hasFile) {
      progressBar = createCustomElement("progress", {
        id : "progress-bar",
      })
      progressBar.max = 100
      progressBar.value = 0
      form.appendChild(progressBar)
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          progressBar.value = percentComplete
          progressBar.textContent = `${percentComplete}%`
        }
      })
    }

    xhr.onload = () => {
      progressBar?.remove()
      if (xhr.status === 200) {
        isUploading = false
        input.innerText = ''
        if (hasFile) fileInput.value = ''
        if (document.getElementById('reply-container')) removeReply()
        trackScroll = [messageContainer.scrollTop, messageContainer.scrollHeight, true]
        scrollToBottom(true)
      }
      else console.error('Error uploading file:', xhr.responseText)
    }

    xhr.onerror = () => {
      console.error('Error submitting message')
    }

    const formData = new FormData()
    formData.append('message', message)
    formData.append('replyId', replyId)
    formData.append('chatId', chatId)
    if (hasFile) {
      for (const file of fileInput.files) {
        formData.append('file', file)
      }
    }
    xhr.send(formData)
  } catch (error) {
    console.error('Error submitting message:', error)
  }
}

// end message func

const blurOverlay = document.getElementById("blur-overlay")

blurOverlay.onclick = (e) =>  {
  if (!e.target.closest(".menu")) toggleBlurOverlay('', blurOverlay)
}

const moreButton = document.getElementById("more")
const moreMenu = document.getElementById("more-menu")
let moreMenuToggle = false

// START creating menu 

function toggleBlurOverlay(content = '',element = null) {
  element.innerHTML = ''
  if (content) {
    element.style.display = 'block'
    element.appendChild(content)
  }
  else element.style.display = 'none'
}

function addCloseButton(removableElement) {
  const button = createCustomElement("button", { 
    id: "close-blur-overlay",
    onClick: () => toggleBlurOverlay('', removableElement),
    HTML: '<svg fill="#000000" viewBox="0 0 460.775 460.775"><g><path d="M285.08,230.397L456.218,59.27c6.076-6.077,6.076-15.911,0-21.986L423.511,4.565c-2.913-2.911-6.866-4.55-10.992-4.55 c-4.127,0-8.08,1.639-10.993,4.55l-171.138,171.14L59.25,4.565c-2.913-2.911-6.866-4.55-10.993-4.55 c-4.126,0-8.08,1.639-10.992,4.55L4.558,37.284c-6.077,6.075-6.077,15.909,0,21.986l171.138,171.128L4.575,401.505 c-6.074,6.077-6.074,15.911,0,21.986l32.709,32.719c2.911,2.911,6.865,4.55,10.992,4.55c4.127,0,8.08-1.639,10.994-4.55 l171.117-171.12l171.118,171.12c2.913,2.911,6.866,4.55,10.993,4.55c4.128,0,8.081-1.639,10.992-4.55l32.709-32.719 c6.074-6.075,6.074-15.909,0-21.986L285.08,230.397z"/></g></svg>' 
  })

  const parent = document.getElementById("menu-toolbar")
  parent.appendChild(button)
}

function createMenu(menuName, content) {
  const menuNameElement = createCustomElement("div", { text: menuName, id: "menu-toolbar" })
  const menu = createCustomElement("div", { className: "menu" })

  menu.appendChild(menuNameElement)
  menu.innerHTML += content

  toggleBlurOverlay(menu, blurOverlay)
  addCloseButton(blurOverlay)

  document.addEventListener('keydown', (event) => {
    if (event.key === "Escape") toggleBlurOverlay('', blurOverlay)
  }, { once: true })
}

// END creating menu 

// Fetch and display user details
async function getUsersDetail(userId) {
  try {
    const response = await fetch(`/users-details?id=${encodeURIComponent(userId)}`)
    if (!response.ok) throw new Error(`Error: ${response.status} ${response.statusText}`)
    const user = await response.json()
    createMenu(`Profile`, `
      <div class="user-info-container">
        <img id="user-profile-image" class="user-image" src="/uploads/${user.profile_image}" alt="">
        <div id="user-profile-detail">
          <p class="user-detail">Name: ${user.username}</p>
          <p class="user-detail">ID: ${user.id}</p>
          <p class="user-detail">Role: ${user.role}</p>
          <p class="user-detail">Status: ${user.status}</p>
        </div>
      </div>
      `)
  } catch (error) {
    console.error('Error fetching user details:', error)
  }
}

// START left click event DO NOT CREATE ANOTHER EVENT 

document.addEventListener("click", async (event) => {
  // showing user profile upon clicking on username 
  if (event.target.classList.contains('username')) {
    const userId = event.target.getAttribute('data-user-id')
    getUsersDetail(userId)
  }
  
  // changing chats upon user click
  const clickedChatId = event.target.closest(".side-menu-item")?.getAttribute("chat-id")

  if (clickedChatId) {
    if (chatId == clickedChatId) return
    else changeChat(clickedChatId)
  }
})

// END left click event DO NOT CREATE ANOTHER EVENT 

// Toggle Off functionality
let toggleOff = false

function toggleOffSetup() {
  document.getElementById("off").style.display = toggleOff ? "none" : "block"
  body.style.cursor = toggleOff ? "default" : "none"
  toggleOff = !toggleOff
}

document.getElementById("turn-off").addEventListener("click", ()=> toggleOffSetup())

// keys 
const keyState = {
  altPressed      : false,
  enterPressed    : false,
  dotPressed      : false,
  backtickPressed : false,
  shiftPressed    : false
}

document.addEventListener("keydown", (event) => {
  const { key, keyCode } = event

  keyState.altPressed      ||= keyCode === 18
  keyState.enterPressed    ||= keyCode === 13
  keyState.dotPressed      ||= key === "."
  keyState.backtickPressed ||= key === "`"
  keyState.shiftPressed    ||= key === "Shift"

  if (keyState.shiftPressed) {
    if (keyState.enterPressed) { return }
  }

  else if (keyState.enterPressed) handleSendingMessage(event)

  if (key === "/" && document.activeElement !== input) {
    event.preventDefault()
    input.focus()
  }
  if (key === "Escape" && document.activeElement === input) input.blur()
  
  if ((keyState.altPressed && (keyCode === 190 || keyCode === 88)) || (keyState.enterPressed && keyState.dotPressed)) toggleOffSetup()

  // hotkey for scrolling between latest message and where user was before scrolling 
  if (keyState.altPressed && event.key === "j") {
    if (isScrolling) return 
  
    isScrolling = true
    const [storedTop, storedHeight, isToggled] = trackScroll
  
    if (isToggled) {
      let difference = messageContainer.scrollHeight - storedHeight
      messageContainer.scrollTo({
        top: storedTop + difference,
        behavior: "smooth"
      })
      trackScroll = [messageContainer.scrollTop, messageContainer.scrollHeight, false]
    } 
    else {
      trackScroll = [messageContainer.scrollTop, messageContainer.scrollHeight, true]
      scrollToBottom(true)
    }

    setTimeout(() => { isScrolling = false }, 1000)
  }

  if (localStorage.getItem("filterMode") === "true") {
    if (localStorage.getItem("filterRestriction") === "true" && !chatId == 2) return
    
    let brightness = parseInt(localStorage.getItem("brightness")) ?? 50

    if (event.key === "=" || event.key === "+")   brightness = Math.min(brightness + 50, 400); // max brightness 400
    else if (event.key === "-") brightness = Math.max(brightness - 50, 0); // min brightness 0
    
    localStorage.setItem("brightness", brightness)
    applyFilters()
  }
})

document.addEventListener("keyup", (event) => {
  const { key, keyCode } = event

  if (keyCode === 18) keyState.altPressed   = false
  if (keyCode === 13) keyState.enterPressed = false
  if (key === ".") keyState.dotPressed      = false
  if (key === "`") keyState.backtickPressed = false
  if (key === "Shift") keyState.shiftPressed = false
})

// More Menu toggle (CHANGE THIS)
moreButton.addEventListener("click", () => {
  moreMenu.style.display = moreMenuToggle ? 'none' : 'block';
  moreMenu.style.opacity = moreMenuToggle ? '0' : '1';
  moreMenuToggle = !moreMenuToggle;
  if (!moreMenuToggle) setTimeout(() => moreMenu.style.display = 'none', 200);
})

// Settings Button Setup
async function settingButtonSetup() {
  const settingButton = document.getElementById("setting-button")
  settingButton.addEventListener("click", async () => {
    try {
      const response = await fetch(`/user-details`, {
        headers: { credentials : 'include' }
      })
      if (!response.ok) throw new Error(`Error: ${response.status} ${response.statusText}`)
      const user = await response.json()
      userId = user.id
      // OPTIMIZA HERE tf is this 
      createMenu(`Profile`, `
        <div class="user-info-container">
          <img id="user-profile-image" class="user-image" src="/uploads/${user.profile_image}" alt="NPC">
          <div id="user-profile-detail">
            <p class="user-detail">Name: ${user.username}</p>
            <p class="user-detail">ID: ${user.id}</p>
            <p class="user-detail">Role: ${user.role}</p>
          </div>
        </div>

        <div class="profile-item-container">
            <div class="profile-item">
              <div class="profile-item-content" onclick="openManual()">
                <svg class="menu-image" viewBox="0 0 32 32"><rect height="1" width="12" x="10" y="2"/><rect height="1" width="12" x="10" y="2"/><rect height="1" transform="translate(-9.5 22.5) rotate(-90)" width="20" x="-3.5" y="15.5"/><rect height="1" transform="translate(11.5 39.5) rotate(-90)" width="16" x="17.5" y="13.5"/><rect height="1" width="6" x="17" y="6"/><rect height="1" width="14" x="9" y="9"/><rect height="1" width="14" x="9" y="12"/><rect height="1" width="14" x="9" y="15"/><rect height="1" width="14" x="9" y="18"/><rect height="1" width="10" x="9" y="21"/><rect height="1" width="7" x="9" y="24"/><path d="M22,2V3h2a1,1,0,0,1,1,1V6h1V4a2,2,0,0,0-2-2Z"/><path d="M10,2V3H8A1,1,0,0,0,7,4V6H6V4A2,2,0,0,1,8,2Z"/><path d="M8,30V29H8a1,1,0,0,1-1-1V26H6v2a2,2,0,0,0,2,2Z"/><path d="M21.91,21.15c-.57-.32-.91-.72-.91-1.15a6.09,6.09,0,0,1-.21,1.59c-1,4.07-6,7.18-12.12,7.4H8v1h.72c8.86-.15,16.07-3.15,17.14-7A3.77,3.77,0,0,0,26,22,8.72,8.72,0,0,1,21.91,21.15Zm-5.78,7a10.5,10.5,0,0,0,5.54-6,8.94,8.94,0,0,0,3.15.79C24.07,25,20.91,27,16.13,28.13Z"/></svg>
                <h3>Manual</h3>
              </div>
            </div>
            
            <div class="profile-item">
              <div class="profile-item-content" onclick="editProfile()">
                <svg class="menu-image" viewBox="0 0 24 24"><path d="M.75,17.5A.751.751,0,0,1,0,16.75V12.569a.755.755,0,0,1,.22-.53L11.461.8a2.72,2.72,0,0,1,3.848,0L16.7,2.191a2.72,2.72,0,0,1,0,3.848L5.462,17.28a.747.747,0,0,1-.531.22ZM1.5,12.879V16h3.12l7.91-7.91L9.41,4.97ZM13.591,7.03l2.051-2.051a1.223,1.223,0,0,0,0-1.727L14.249,1.858a1.222,1.222,0,0,0-1.727,0L10.47,3.91Z"/></svg>
                <h3>Edit Profile</h3>
              </div>
            </div>

            <div class="profile-item">
              <div class="profile-item-content" onclick="filtersConfig()">
                <svg class="menu-image" viewBox="0 0 50 50"><path d="M47.16,21.221l-5.91-0.966c-0.346-1.186-0.819-2.326-1.411-3.405l3.45-4.917c0.279-0.397,0.231-0.938-0.112-1.282 l-3.889-3.887c-0.347-0.346-0.893-0.391-1.291-0.104l-4.843,3.481c-1.089-0.602-2.239-1.08-3.432-1.427l-1.031-5.886 C28.607,2.35,28.192,2,27.706,2h-5.5c-0.49,0-0.908,0.355-0.987,0.839l-0.956,5.854c-1.2,0.345-2.352,0.818-3.437,1.412l-4.83-3.45 c-0.399-0.285-0.942-0.239-1.289,0.106L6.82,10.648c-0.343,0.343-0.391,0.883-0.112,1.28l3.399,4.863 c-0.605,1.095-1.087,2.254-1.438,3.46l-5.831,0.971c-0.482,0.08-0.836,0.498-0.836,0.986v5.5c0,0.485,0.348,0.9,0.825,0.985 l5.831,1.034c0.349,1.203,0.831,2.362,1.438,3.46l-3.441,4.813c-0.284,0.397-0.239,0.942,0.106,1.289l3.888,3.891 c0.343,0.343,0.884,0.391,1.281,0.112l4.87-3.411c1.093,0.601,2.248,1.078,3.445,1.424l0.976,5.861C21.3,47.647,21.717,48,22.206,48 h5.5c0.485,0,0.9-0.348,0.984-0.825l1.045-5.89c1.199-0.353,2.348-0.833,3.43-1.435l4.905,3.441 c0.398,0.281,0.938,0.232,1.282-0.111l3.888-3.891c0.346-0.347,0.391-0.894,0.104-1.292l-3.498-4.857 c0.593-1.08,1.064-2.222,1.407-3.408l5.918-1.039c0.479-0.084,0.827-0.5,0.827-0.985v-5.5C47.999,21.718,47.644,21.3,47.16,21.221z M25,32c-3.866,0-7-3.134-7-7c0-3.866,3.134-7,7-7s7,3.134,7,7C32,28.866,28.866,32,25,32z"/></svg>
                <h3>filter Config</h3>
              </div>
            </div>

            <div class="profile-item">
              <div class="profile-item-content" onclick="openCustomizationMenu()">
                <svg class="menu-image" viewBox="0 0 20 20"><path d="m11.5 7c-.276 0-.5-.224-.5-.5 0-1.378-1.122-2.5-2.5-2.5-.276 0-.5-.224-.5-.5s.224-.5.5-.5c1.378 0 2.5-1.122 2.5-2.5 0-.276.224-.5.5-.5s.5.224.5.5c0 1.378 1.122 2.5 2.5 2.5.276 0 .5.224.5.5s-.224.5-.5.5c-1.378 0-2.5 1.122-2.5 2.5 0 .276-.224.5-.5.5zm-1.199-3.5c.49.296.903.708 1.199 1.199.296-.49.708-.903 1.199-1.199-.49-.296-.903-.708-1.199-1.199-.296.49-.708.903-1.199 1.199z"/><path d="m1.5 10c-.276 0-.5-.224-.5-.5s-.224-.5-.5-.5-.5-.224-.5-.5.224-.5.5-.5.5-.224.5-.5.224-.5.5-.5.5.224.5.5.224.5.5.5.5.224.5.5-.224.5-.5.5-.5.224-.5.5-.224.5-.5.5z"/><path d="m18.147 15.939-10.586-10.586c-.283-.283-.659-.438-1.061-.438s-.778.156-1.061.438l-.586.586c-.283.283-.438.659-.438 1.061s.156.778.438 1.061l10.586 10.586c.283.283.659.438 1.061.438s.778-.156 1.061-.438l.586-.586c.283-.283.438-.659.438-1.061s-.156-.778-.438-1.061zm-12.586-9.293.586-.586c.094-.094.219-.145.354-.145s.26.052.354.145l1.439 1.439-1.293 1.293-1.439-1.439c-.195-.195-.195-.512 0-.707zm11.878 10.708-.586.586c-.094.094-.219.145-.353.145s-.26-.052-.353-.145l-8.439-8.439 1.293-1.293 8.439 8.439c.195.195.195.512 0 .707z"/><path d="m3.5 5c-.276 0-.5-.224-.5-.5 0-.827-.673-1.5-1.5-1.5-.276 0-.5-.224-.5-.5s.224-.5.5-.5c.827 0 1.5-.673 1.5-1.5 0-.276.224-.5.5-.5s.5.224.5.5c0 .827.673 1.5 1.5 1.5.276 0 .5.224.5.5s-.224.5-.5.5c-.827 0-1.5.673-1.5 1.5 0 .276-.224.5-.5.5zm-.502-2.5c.19.143.359.312.502.502.143-.19.312-.359.502-.502-.19-.143-.359-.312-.502-.502-.143.19-.312.359-.502.502z"/><path d="m3.5 15c-.276 0-.5-.224-.5-.5 0-.827-.673-1.5-1.5-1.5-.276 0-.5-.224-.5-.5s.224-.5.5-.5c.827 0 1.5-.673 1.5-1.5 0-.276.224-.5.5-.5s.5.224.5.5c0 .827.673 1.5 1.5 1.5.276 0 .5.224.5.5s-.224.5-.5.5c-.827 0-1.5.673-1.5 1.5 0 .276-.224.5-.5.5zm-.502-2.5c.19.143.359.312.502.502.143-.19.312-.359.502-.502-.19-.143-.359-.312-.502-.502-.143.19-.312.359-.502.502z"/></svg>

                <h3>Customize</h3>
              </div>
            </div>
        </div>`
      )
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  })
}

settingButtonSetup()

// END setting 

// START PWT

const preWrittenMenu  = document.getElementById("pre-written")
let   pwtDeckNumber   = 0
preWrittenMenu.addEventListener("click",()=>{
  sideMenu.innerHTML = `
        <div class="side-menu-toolbar">
          <button id="close-menu" type="button"><svg fill="#000000" viewBox="0 0 460.775 460.775"><g><path d="M285.08,230.397L456.218,59.27c6.076-6.077,6.076-15.911,0-21.986L423.511,4.565c-2.913-2.911-6.866-4.55-10.992-4.55 c-4.127,0-8.08,1.639-10.993,4.55l-171.138,171.14L59.25,4.565c-2.913-2.911-6.866-4.55-10.993-4.55 c-4.126,0-8.08,1.639-10.992,4.55L4.558,37.284c-6.077,6.075-6.077,15.909,0,21.986l171.138,171.128L4.575,401.505 c-6.074,6.077-6.074,15.911,0,21.986l32.709,32.719c2.911,2.911,6.865,4.55,10.992,4.55c4.127,0,8.08-1.639,10.994-4.55 l171.117-171.12l171.118,171.12c2.913,2.911,6.866,4.55,10.993,4.55c4.128,0,8.081-1.639,10.992-4.55l32.709-32.719 c6.074-6.075,6.074-15.909,0-21.986L285.08,230.397z"/> </g></svg></button>
          <button id="config-button"><svg viewBox="0 0 50 50"><path d="M47.16,21.221l-5.91-0.966c-0.346-1.186-0.819-2.326-1.411-3.405l3.45-4.917c0.279-0.397,0.231-0.938-0.112-1.282 l-3.889-3.887c-0.347-0.346-0.893-0.391-1.291-0.104l-4.843,3.481c-1.089-0.602-2.239-1.08-3.432-1.427l-1.031-5.886 C28.607,2.35,28.192,2,27.706,2h-5.5c-0.49,0-0.908,0.355-0.987,0.839l-0.956,5.854c-1.2,0.345-2.352,0.818-3.437,1.412l-4.83-3.45 c-0.399-0.285-0.942-0.239-1.289,0.106L6.82,10.648c-0.343,0.343-0.391,0.883-0.112,1.28l3.399,4.863 c-0.605,1.095-1.087,2.254-1.438,3.46l-5.831,0.971c-0.482,0.08-0.836,0.498-0.836,0.986v5.5c0,0.485,0.348,0.9,0.825,0.985 l5.831,1.034c0.349,1.203,0.831,2.362,1.438,3.46l-3.441,4.813c-0.284,0.397-0.239,0.942,0.106,1.289l3.888,3.891 c0.343,0.343,0.884,0.391,1.281,0.112l4.87-3.411c1.093,0.601,2.248,1.078,3.445,1.424l0.976,5.861C21.3,47.647,21.717,48,22.206,48 h5.5c0.485,0,0.9-0.348,0.984-0.825l1.045-5.89c1.199-0.353,2.348-0.833,3.43-1.435l4.905,3.441 c0.398,0.281,0.938,0.232,1.282-0.111l3.888-3.891c0.346-0.347,0.391-0.894,0.104-1.292l-3.498-4.857 c0.593-1.08,1.064-2.222,1.407-3.408l5.918-1.039c0.479-0.084,0.827-0.5,0.827-0.985v-5.5C47.999,21.718,47.644,21.3,47.16,21.221z M25,32c-3.866,0-7-3.134-7-7c0-3.866,3.134-7,7-7s7,3.134,7,7C32,28.866,28.866,32,25,32z"/></svg></button>
        </div>
        <form action="" id="submit-pre-written-text" >
          <input  id="submit-text" type="text" placeholder="submit-text">
          <button id="submit-pre-written-text-button"> add </button>
        </form>

      <div id="PWT-container">
      </div>`

  // START PWT config

  document.getElementById("config-button").addEventListener( "click" , PWTConfigMenu )
  document.addEventListener('keydown', (e) => { if (e.key === "c" && keyState.altPressed) PWTConfigMenu()})

  function setupCheckboxes(configs) {
    configs.forEach(({ id, storageKey }) => {
      const checkbox = document.getElementById(id);
      checkbox.checked = localStorage.getItem(storageKey) === "true"
      checkbox.addEventListener("change", () => localStorage.setItem(storageKey, checkbox.checked))
    })
  }

  function PWTConfigMenu() {
    createMenu(`Configuration`, `
      <div class="note-container">
        <p class="note">Add more words at once by separating words with ","</p>
        <p class="note">Press 0 to 9 to simulate clicking on the buttons</p>
        <p class="note">Press 0 to 9 while holding . or \` to switch between decks</p>
      </div>
      <div class="config-container">
        <input type="checkbox" id="send-immediately" class="checkbox custom-checkbox">
        <label for="send-immediately">send immediately</label>
        <br>
        <input type="checkbox" id="add-space" class="checkbox custom-checkbox">
        <label for="add-space">add space after each word</label>
        <br>
        <input type="checkbox" id="list-mode" class="checkbox custom-checkbox">
        <label for="list-mode">list mode</label>
      </div>`
    )
    
    setupCheckboxes([
      { id: "send-immediately" , storageKey: "pwtSendImmediately" },
      { id: "add-space" , storageKey: "pwtAddSpace" },
      { id: "list-mode" , storageKey: "pwtListMode"}
    ])
    const listModeCheckbox = document.getElementById("list-mode")
    listModeCheckbox.addEventListener("change",()=>{
      if (listModeCheckbox.checked) PWTContainer.classList.add("block")
      else PWTContainer.classList.remove("block")
    })
  }

  // END PWT config

  const PWTForm  = document.getElementById("submit-pre-written-text")
  const PWTInput = document.getElementById("submit-text")
  const PWTContainer = document.getElementById("PWT-container")

  if (localStorage.getItem("pwtListMode") === "true") PWTContainer.classList.add("block")

  moreMenu.style.opacity = `0`  
  moreMenuToggle = false
  loadPWTEntries(pwtDeckNumber)

  // START PWT hotkeys

  document.addEventListener("keydown", (event) => {
    const key = event.key
    const isNumber = key >= "0" && key <= "9"
    if (isNumber) {
      if ((keyState.dotPressed || keyState.backtickPressed)) {
        pwtDeckNumber = key
        loadPWTEntries(pwtDeckNumber)
      }
      else if (document.activeElement !== input && document.activeElement !== PWTInput)
        if (document.getElementById(`pwt-${key}`))  document.getElementById(`pwt-${key}`).click()
    }
  })

  // END PWT hotkeys

// Handle PWTForm submission
PWTForm.addEventListener('submit', function(e) {
  e.preventDefault()
  const text = PWTInput.value.trim()
  if (text === "") return

  savePWTEntry(text, pwtDeckNumber)
  PWTInput.value = ''
  loadPWTEntries(pwtDeckNumber)
});

// Close menu button handler
const closeMenuButton = document.getElementById("close-menu");
closeMenuButton.addEventListener("click", closeMenu);

// Close menu function
function closeMenu() {
  sideMenu.innerHTML = `
    <div class="side-menu-toolbar">
      <button id="setting-button">
        <svg viewBox="0 0 50 50">
          <path d="M47.16,21.221l-5.91-0.966c-0.346-1.186-0.819-2.326-1.411-3.405l3.45-4.917c0.279-0.397,0.231-0.938-0.112-1.282 l-3.889-3.887c-0.347-0.346-0.893-0.391-1.291-0.104l-4.843,3.481c-1.089-0.602-2.239-1.08-3.432-1.427l-1.031-5.886 C28.607,2.35,28.192,2,27.706,2h-5.5c-0.49,0-0.908,0.355-0.987,0.839l-0.956,5.854c-1.2,0.345-2.352,0.818-3.437,1.412l-4.83-3.45 c-0.399-0.285-0.942-0.239-1.289,0.106L6.82,10.648c-0.343,0.343-0.391,0.883-0.112,1.28l3.399,4.863 c-0.605,1.095-1.087,2.254-1.438,3.46l-5.831,0.971c-0.482,0.08-0.836,0.498-0.836,0.986v5.5c0,0.485,0.348,0.9,0.825,0.985 l5.831,1.034c0.349,1.203,0.831,2.362,1.438,3.46l-3.441,4.813c-0.284,0.397-0.239,0.942,0.106,1.289l3.888,3.891 c0.343,0.343,0.884,0.391,1.281,0.112l4.87-3.411c1.093,0.601,2.248,1.078,3.445,1.424l0.976,5.861C21.3,47.647,21.717,48,22.206,48 h5.5c0.485,0,0.9-0.348,0.984-0.825l1.045-5.89c1.199-0.353,2.348-0.833,3.43-1.435l4.905,3.441 c0.398,0.281,0.938,0.232,1.282-0.111l3.888-3.891c0.346-0.347,0.391-0.894,0.104-1.292l-3.498-4.857 c0.593-1.08,1.064-2.222,1.407-3.408l5.918-1.039c0.479-0.084,0.827-0.5,0.827-0.985v-5.5C47.999,21.718,47.644,21.3,47.16,21.221z M25,32c-3.866,0-7-3.134-7-7c0-3.866,3.134-7,7-7s7,3.134,7,7C32,28.866,28.866,32,25,32z"/>
        </svg>
      </button>
    </div>`
  settingButtonSetup()
}

// Save a PWT entry to local storage
function savePWTEntry(text, pwtDeckId) {
  let decks = JSON.parse(localStorage.getItem('preWrittenText')) || {};
  if (!decks[pwtDeckId]) decks[pwtDeckId] = [];
  
  decks[pwtDeckId].push({ text: text, deckId: pwtDeckId });
  localStorage.setItem('preWrittenText', JSON.stringify(decks));
}

// Load and render PWT entries
function loadPWTEntries(pwtDeckId) {
  const decks = JSON.parse(localStorage.getItem('preWrittenText')) || {}
  const entries = decks[pwtDeckId] || []
  const container = document.getElementById("PWT-container")
  container.innerHTML = ""
  container.appendChild(createCustomElement("h3", { id: "pwt-deck", text: `deck ${pwtDeckId}` }))

  entries.forEach((entry, index) => 
    container.appendChild(createCustomElement("div", { id: `pwt-${index}`, className: "pre-written-text", text: entry.text }))
  )

  // Set up click event for each PWT entry
  document.querySelectorAll(".pre-written-text").forEach(element => {
    element.addEventListener("click", () => {
      let text = element.innerText
      if (localStorage.getItem("pwtAddSpace")        === "true") text += " "
      if (localStorage.getItem("pwtSendImmediately") === "true") sendMessage(text, replyId, chatId)
      else   input.value += text
    })
  })
}})

// END PWT

let targetedElement
let oldTargetedElement

document.addEventListener("contextmenu", function (e) {
  e.preventDefault()
  document.addEventListener("mousedown", (e) => e.preventDefault(), { once: true })

  targetedElement = e.target
  const selectedText = window.getSelection().toString().trim()

  // right click when user selects a text
  if (selectedText && (targetedElement.tagName !== "INPUT" && !targetedElement.closest("#input"))) { 
    contextMenu(e, ['copy'])
  }

  // when user right click on message container
  else if (targetedElement.closest('.message-container')) {
    targetedElement = targetedElement.closest('.message-container')

    let features = [`copyMessage`, 'reply', 'hideMessage']

    if (targetedElement.querySelector(".sent")) features.push("invertColor")
    if (targetedElement.querySelector("iframe")) features.push("addToSide")
    if (userRole === "owner" || userRole === "admin") features.push("delete") 

    contextMenu(e, features)
    targetedElement.classList.add("highlighted-message")
    oldTargetedElement = targetedElement
  }
  
  // right click on input
  else if (targetedElement.tagName === "INPUT" || targetedElement.closest("#input")) {
    const inputElement = e.target

    if (inputElement.selectionStart !== inputElement.selectionEnd) {
      selectedRange = { start: inputElement.selectionStart, end: inputElement.selectionEnd, element: inputElement }
      contextMenu(e, ["copy", "cut", "paste"])
    } 
    else contextMenu(e, ["paste"])
  }

  // right click on navigator 
  else if (targetedElement.closest("#navigation-bar")){
    contextMenu(e, ["hideNavigator"])
  }

  // right click on the side menu for pdf
  else if (targetedElement.closest("#pdf-container")) {
    contextMenu(e, ["invertColor","closeSideMenu"])
  }

  // remove context menu if none of the conditions were true 
  else removeExistingMenu()
})

function removeExistingMenu() {
  const existingMenu = document.getElementById("context-menu")
  if (existingMenu) {
    if (oldTargetedElement) oldTargetedElement.classList.remove("highlighted-message")
    existingMenu.remove()
  }
}

function contextMenu(event,features) {
  removeExistingMenu()
  const contextMenuElement = document.createElement("div")
  contextMenuElement.id    = "context-menu"
  // add element depending on where user right clicks
  features.forEach(element => {
    if (element == "hideNavigator") contextMenuElement.appendChild(createCustomElement("div", { className: "right-click-item", id: "hide-navigator", onClick: hideNavigator, text: "Hide" }))
    if (element == "closeSideMenu") contextMenuElement.appendChild(createCustomElement("div", { className: "right-click-item", id: "close-side-menu", onClick: closeSideMenu, text: "Close" }))
    if (element == "copyMessage")   contextMenuElement.appendChild(createCustomElement("div", { className: "right-click-item", id: "copy-message", onClick: copyMessage, text: "Copy" }))
    if (element == "hideMessage")   contextMenuElement.appendChild(createCustomElement("div", { className: "right-click-item", id: "hide-message", onClick: () => hideMessage(), text: "Hide" }))
    if (element == "invertColor")   contextMenuElement.appendChild(createCustomElement("div", { className: "right-click-item", id: "invert-color", onClick: invertColor, text: "Invert content color" }))
    if (element == "addToSide")     contextMenuElement.appendChild(createCustomElement("div", { className: "right-click-item", id: "add-to-side", onClick: addToSide, text: "Add to side" }))
    if (element == "delete")        contextMenuElement.appendChild(createCustomElement("div", { className: "right-click-item", id: "delete", onClick: deleteMessage, text: "Delete" }))
    if (element == "reply")         contextMenuElement.appendChild(createCustomElement("div", { className: "right-click-item", id: "reply", onClick: reply, text: "Reply" }))
    if (element == "paste")         contextMenuElement.appendChild(createCustomElement("div", { className: "right-click-item", id: "paste", onClick: paste, text: "Paste" }))
    if (element == "copy")          contextMenuElement.appendChild(createCustomElement("div", { className: "right-click-item", id: "copy",  onClick: copySelectedText, text: "Copy" }))
    if (element == "cut")           contextMenuElement.appendChild(createCustomElement("div", { className: "right-click-item", id: "cut" ,  onClick: cut, text: "Cut" }))
  })
  body.appendChild(contextMenuElement)
  
  // Adjust the position of the menu within the viewport
  contextMenuElement.style.left  = `${Math.min(event.pageX, window.innerWidth  - contextMenuElement.offsetWidth )}px`
  contextMenuElement.style.top   = `${Math.min(event.pageY, window.innerHeight - contextMenuElement.offsetHeight)}px`

  // Remove the menu when clicking outside
  document.addEventListener("click", function () {
    if (targetedElement)  targetedElement.classList.remove("highlighted-message")
    contextMenuElement.remove()
  } , { once: true })
}

// START right click functions

async function cut() {
  const activeElement = document.activeElement

  if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
    const { selectionStart: start, selectionEnd: end, value } = activeElement
    if (start === end) return
    const selectedText = value.slice(start, end)
    await copy(selectedText)
    activeElement.setRangeText("")
    activeElement.selectionStart = activeElement.selectionEnd = start
    return
  }

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  const selectedText = range.toString()
  if (!selectedText) return

  await copy(selectedText)
  range.deleteContents()
}

async function paste() {
  const read = await navigator.clipboard.readText()
  targetedElement.innerText += read
}

function copySelectedText() {
  copy(window.getSelection().toString().trim())
}

function copyMessage() {
  copy(targetedElement.querySelector(".message-text").innerText)
}

async function copy(text) {
  if (navigator.clipboard) await navigator.clipboard.writeText(text)
  else {
    // works with older browser + no need for https 
    const textarea = document.createElement("textarea")
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand("copy")
    document.body.removeChild(textarea)
  }
}

// START reply 

function reply() {
  if (document.getElementById("reply-container")) removeReply()

  const reply = createCustomElement("div", { id: "reply-container" })
  const closeReply = createCustomElement("button", {
    id: "close-reply",
    HTML: `<svg fill="#000000" viewBox="0 0 460.775 460.775"><g><path d="M285.08,230.397L456.218,59.27c6.076-6.077,6.076-15.911,0-21.986L423.511,4.565c-2.913-2.911-6.866-4.55-10.992-4.55 c-4.127,0-8.08,1.639-10.993,4.55l-171.138,171.14L59.25,4.565c-2.913-2.911-6.866-4.55-10.993-4.55 c-4.126,0-8.08,1.639-10.992,4.55L4.558,37.284c-6.077,6.075-6.077,15.909,0,21.986l171.138,171.128L4.575,401.505 c-6.074,6.077-6.074,15.911,0,21.986l32.709,32.719c2.911,2.911,6.865,4.55,10.992,4.55c4.127,0,8.08-1.639,10.994-4.55 l171.117-171.12l171.118,171.12c2.913,2.911,6.866,4.55,10.993,4.55c4.128,0,8.081-1.639,10.992-4.55l32.709-32.719 c6.074-6.075,6.074-15.909,0-21.986L285.08,230.397z"/></g></svg>`,
    onClick: () => removeReply()
  })

  input.focus()
  messageContainer.style.maxHeight = `calc(97% - 150px)`
  inputContainer.style.height = `100px`
  form.style.height = `100px`

  replyId = targetedElement.querySelector('.message-text').getAttribute('data-message-id')
  reply.appendChild(closeReply)
  reply.appendChild(createCustomElement("p", { className: "reply-username", text: "Replying to " + targetedElement.querySelector('.username').innerText }))
  reply.appendChild(createCustomElement("p", { className: "reply-text", text: targetedElement.querySelector('.message-text').innerText }))
  inputContainer.insertBefore(reply, inputContainer.firstChild)
}

function removeReply() {
  messageContainer.style.maxHeight = `calc(97% - 100px)`
  form.style.height = `50px`
  inputContainer.style.height = `50px`

  replyId = null
  document.getElementById("reply-container").remove()
}

document.addEventListener("dblclick", (e) => {
  if (e.target.classList.contains("message-text") || e.target.tagName === "BUTTON") return

  targetedElement = e.target.classList.contains("message") 
  ? e.target.querySelector(".message-container")
  : e.target.closest(".message-container")

  if (targetedElement) reply()
})

// END reply 

function createCustomElement(elementType, { id = "", className = "", text = "", HTML = "", onClick = null } = {}) {
  const element = document.createElement(elementType)

  if (typeof onClick === "function") element.onclick = onClick
  if (text) element.innerText = text
  if (id) element.id = id
  if (className) element.className = className
  if (HTML) element.innerHTML = HTML

  return element
}

function hideMessage(count = null) {
  if (!count) targetedElement.closest(".message").remove() 
  else {
    let messages = Array.from(document.querySelectorAll(".message"))
    const toRemove = Math.min(count, messages.length)

    for (let i = 0; i < toRemove; i++) {
      messages[messages.length - 1 - i].remove()
    }
  }
}

function invertColor() {
  const elements = targetedElement ?  targetedElement.querySelectorAll(".sent") : [document.getElementById("pdf-container").querySelector("iframe")]

  elements.forEach(element => {
    element.style.filter ? element.style.filter = "" : element.style.filter = "invert()"
  })
}

async function deleteMessage() {
  const messageId = targetedElement.querySelector(".message-text").getAttribute("data-message-id");
  const response = await fetch("/delete-message", {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId }),
  })

  if (!response.ok) {
    const error = await response.text();
    window.alert(`Failed to delete message: ${error}`);
  }
}

// not complete 
function hideNavigator() {
  navigator.style.display = "none"
  messageContainer.style.maxHeight = "calc(100% - 50px - 3%)"
}

function addToSide() {
  const existingPdfContainer = document.getElementById("pdf-container")
  if (existingPdfContainer) {
    existingPdfContainer.remove()
    return
  }

  const pdf = targetedElement.querySelector("iframe")
  if (!pdf) return
  const clonedPdf = pdf.cloneNode(true)
  const pdfContainer = createCustomElement("div", { id: "pdf-container" })
  const pdfDivider = createCustomElement("div", { id: "pdf-divider", className: "divider" })

  clonedPdf.style.height = "100%"
  pdfContainer.appendChild(pdfDivider)
  pdfContainer.appendChild(clonedPdf)
  mainContainer.appendChild(pdfContainer)

  let visiblePdfs = new Set()

  // IntersectionObserver to track visible PDFs
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visiblePdfs.add(entry.target)
      else visiblePdfs.delete(entry.target)
    })
  }, {
    root: null, // Observe within the viewport
    threshold: 0.1 // Consider PDF visible when at least 10% is in view
  })

  document.querySelectorAll('iframe').forEach(iframe => observer.observe(iframe))

  const disablePdfInteraction = () => {
    visiblePdfs.forEach(pdf => pdf.style.pointerEvents = "none")
  }

  const enablePdfInteraction = () => {
    visiblePdfs.forEach(pdf => pdf.style.pointerEvents = "auto")
  }

  pdfDivider.addEventListener("mousedown", () => {
    body.style.userSelect = "none"
    disablePdfInteraction()

    const onMouseMove = (e) => {
      pdfContainer.style.width = `${window.innerWidth - e.x}px`
    }

    const onMouseUp = () => {
      enablePdfInteraction()
      body.style.userSelect = ""
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  })
}

function closeSideMenu() { document.getElementById("pdf-container").remove() }

// END right click functions

// START pagintion

function loadMessages(chatId) {
  fetch(`/get-messages?chatId=${encodeURIComponent(chatId)}`)
    .then(response => response.json())
    .then(data => {
      loadedMessageRange.push({ start: data[0].messageId, end: data[data.length - 1].messageId })

      messageContainer.appendChild(returnFragment(data.reverse().map(messageTemplate)))
      scrollToBottom(false)
    })
    .catch(error => console.error('Error fetching messages:', error))
}

async function loadOlderMessages() {
  let offset = loadedMessageRange[loadedMessageRange.length - 1].end

  const params = new URLSearchParams({
    chatId: chatId,
    offset: offset
  }).toString()

  try {
    const response = await fetch(`/get-older-messages?${params}`)
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)
    const data = await response.json()
    if (!data.length) return

    const previousScrollHeight = messageContainer.scrollHeight
    messageContainer.insertBefore(returnFragment(data.map(messageTemplate)), messageContainer.firstChild)
    messageContainer.scrollTop = messageContainer.scrollHeight - previousScrollHeight

    // updating range
    loadedMessageRange[loadedMessageRange.length - 1].end = data[0].messageId
  } catch (error) {
    console.error('Error fetching messages:', error)
  }
}

async function loadSpecificMessage(newChatId = null, messageId) {
  let oldestClientMessage

  if (newChatId) {
    chatId = newChatId
    loadedMessageRange = []
  }

  // Find the relevant range for oldestClientMessage
  const range = loadedMessageRange.find(range => range.end > messageId)
  if (range) oldestClientMessage = range.end

  try {
    const response = await fetch(`/get-specific-message?chatId=${chatId}&messageId=${messageId}&oldestClientMessage=${oldestClientMessage}`)
    const { messages, isInRange } = await response.json()

    if (!messages.length) return

    if (!isInRange) {
      loadedMessageRange.push({
        start: messages[messages.length - 1].messageId,
        end: messages[0].messageId
      })

      const loadMoreElement = createCustomElement("div", {
        className: "load-more",
        id: `load-more-${loadedMessageRange.length - 1}`
      })

      const referenceNode = document.querySelector(`[data-message-id="${oldestClientMessage}"]`)?.closest('.message')
      if (referenceNode) messageContainer.insertBefore(loadMoreElement, referenceNode)
    } 
    else {
      if (loadedMessageRange.length === 1) loadedMessageRange[0].end = messages[0].messageId
      else {
        loadedMessageRange.forEach((value, index) => {
          const lastMessageId = messages[messages.length - 1].messageId
          if (value.end < lastMessageId && loadedMessageRange[index]?.start > lastMessageId) loadedMessageRange[index - 1].end = messages[0].messageId
        })
      }
    }

    const loadMoreElement = document.getElementById(`load-more-${loadedMessageRange.length - 1}`)
    if (loadMoreElement) messageContainer.insertBefore(returnFragment(messages.map(messageTemplate)), loadMoreElement)
    scrollToMessage(messageId)
  } catch (error) {
    console.error("Error loading specific message:", error);
  }
}

// END pagintion

// START user status

function updateConnectionStatus(status) {
  if (status === "offline")
    setTimeout(() => body.appendChild(createCustomElement( "h1", { id:"disconnected", text:"disconnected" })), 1000)
  else if (status === "online") {
    const disconnectElement = document.getElementById("disconnected")
    if (disconnectElement) {
      disconnectElement.classList.add("connected")
      disconnectElement.innerText = "connected"
      setTimeout(() => disconnectElement.remove() , 5000)
    }    
  }
}

socket.on("disconnect", () => updateConnectionStatus("offline"))
socket.on("connect"   , () => updateConnectionStatus("online"))

// END user status

// START filters functions

function filtersInit() {
  // restrictions
  document.getElementById("filter-mode").checked = localStorage.getItem("filterMode") === "true"
  document.getElementById("filter-restriction").checked = localStorage.getItem("filterRestriction") ==="true"
  
  // filters
  document.getElementById("gray-scale").checked = localStorage.getItem("grayScale") ==="true"
  document.getElementById("contrast").value = parseInt(localStorage.getItem("contrast") || 100)
  document.getElementById("brightness").value = parseInt(localStorage.getItem("brightness") || 100)

  // other
  document.getElementById("remove-background").checked = localStorage.getItem("removeBackground") === "true"
}

function updateFilters() {
  const filterModeElement = document.getElementById("filter-mode")

  if (filterModeElement) {
    // getting element values
    const filterMode = filterModeElement.checked 
    const filterRestriction = document.getElementById("filter-restriction").checked

    const grayScale  = document.getElementById("gray-scale").checked
    const brightness = document.getElementById("brightness").value
    const contrast = document.getElementById("contrast").value
    const removeBackground = document.getElementById("remove-background").checked
    
    // applying filter and saving config
    applyFilters(filterMode, filterRestriction, grayScale, brightness, contrast, removeBackground)
    filterConfig("set", { filterMode, filterRestriction, grayScale, brightness, contrast, removeBackground })
  } 
  else {
    const { filterMode, filterRestriction, grayScale, brightness, contrast, removeBackground } = filterConfig("get")
    if (filterMode) applyFilters(filterMode, filterRestriction, grayScale, brightness, contrast, removeBackground)
  }
}

function applyFilters(filterMode, filterRestriction, grayScale, brightness, contrast, removeBackground) {
  // check for filter mode
  if (filterMode) {
    // if true check for chatId else applies the filters
    if (filterRestriction) {
      if (chatId == 2) {
        const grayScaleFilter  = grayScale  ? "grayscale(1)" :  ""
        const brightnessFilter = brightness ? `brightness(${brightness}%)` : ""
        const contrastFilter = brightness ? `contrast(${contrast}%)` : ""

        body.style.filter = `${grayScaleFilter} ${brightnessFilter} ${contrastFilter}`.trim()

        removeBackground ? chatContainer.style.backgroundImage = "" : chatContainer.style.backgroundImage = "url(Images/Main/weed-leaf-led-neon-sign-120113.jpg)"
      }
      else body.style.filter =""
    }
    else {
      const grayScaleFilter  = grayScale  ? "grayscale(1)" :  ""
      const brightnessFilter = brightness ? `brightness(${brightness}%)` : ""
      const contrastFilter = brightness ? `contrast(${contrast}%)` : ""

      body.style.filter = `${grayScaleFilter} ${brightnessFilter} ${contrastFilter}`.trim()

      removeBackground ? chatContainer.style.backgroundImage = "" : chatContainer.style.backgroundImage = "url(Images/Main/weed-leaf-led-neon-sign-120113.jpg)"
    }
  }
}

function filterConfig(setOrGet, { filterMode = "", filterRestriction = "", grayScale = "", brightness = "",contrast = "", removeBackground = "" } = {}) {
  if (setOrGet === "set") {
  localStorage.setItem("filterMode", filterMode)
  localStorage.setItem("filterRestriction", filterRestriction)

  localStorage.setItem("grayScale", grayScale)
  localStorage.setItem("brightness", brightness)
  localStorage.setItem("contrast", contrast)

  localStorage.setItem("removeBackground", removeBackground)
  }
  else if (setOrGet === "get") {
    return {
      filterMode: JSON.parse(localStorage.getItem("filterMode")   || "false"),
      filterRestriction: JSON.parse(localStorage.getItem("filterRestriction")   || "false"),

      grayScale: JSON.parse(localStorage.getItem("grayScale") || "false"),
      brightness: localStorage.getItem("brightness") || "100",
      contrast: localStorage.getItem("contrast") || "100",

      removeBackground: JSON.parse(localStorage.getItem("removeBackground") || "false")
    }
  }
}

// END filter mode functions

// START delete message 

socket.on("delete message", (messageId) => {
  const targetMessage = document.querySelector(`[data-message-id="${messageId.messageId}"]`);
  const messageParent = targetMessage.closest(".message")
  let deletingAnimation = Math.ceil( Math.random() * 2 )
  messageParent.style.animation = `deleteMessage-${deletingAnimation} .5s`
  messageParent.addEventListener("animationend" , () => messageParent.remove())
})

// END delete message 

// START chats (minimize function to understand better)

async function getChatUsers() {
  try {
    const response = await fetch(`/chat-users?chatId=${encodeURIComponent(chatId)}`);
    if (!response.ok) throw new Error(`Error: ${response.status} ${response.statusText}`);
    const data = await response.json()
    displayUsers(data)
  } catch (error) {
    console.error("Failed to fetch chat details:", error)
  }
}

function displayUsers(data) {
  const userHTML = data.users.map((user) => 
    `<div class="user-container">
      <img class="user-profile" src="uploads/${user.profile_image}" alt="NPC">
      <div class="user-info">
        <span class="username" data-user-id="${user.id}">${user.username}</span>
        <span>${user.status}</span>
        <span style="position: absolute; right: 2%; top: 0%;">${user.role}</span>
      </div>
    </div>`
    )
    .join("")

  createMenu(`${data.chatName}`, `
    <div class="users-container">${userHTML}</div>
  `)

  document.querySelector(".users-container").addEventListener("click", (e) => {
    const userId = e.target.closest(".user-container")?.querySelector(".username")?.getAttribute("data-user-id")
    if (userId) getUsersDetail(userId)
  })
}

function getChatDetail() {
  fetch(`/chat-detail?chatId=${encodeURIComponent(chatId)}`)
  .then((response) => {
    if (!response.ok) throw new Error(`Error: ${response.status} ${response.statusText}`)
    return response.json()
  })
  .then((data) => {
    const chatImage = createCustomElement("img", {
      className: "chat-image"
    })
    chatImage.src = data.chatImage

    const chatUserCount = data.userCount

    if (document.getElementById("chat-users")) {
      document.getElementById("chat-users").remove()
      document.getElementById("chat-name").remove()
    }

    const chatName = createCustomElement("p", {
      text: `${data.chatName}`
    })
    const chatUserStat = createCustomElement("p", {
      text: `${chatUserCount} members, ${data.onlineUsers} online`,
      id: "chat-user-stat"
    })
    chatName.appendChild(chatUserStat)

    navigator.innerHTML = null
    navigator.appendChild(chatImage)
    navigator.appendChild(chatName)
  })
  .catch((error) => {
    console.error("Failed to fetch chat user count:", error)
  })
}

socket.on("update chat detail", () => getChatDetail())

function addChats() {
  const fragment = document.createDocumentFragment()
  const games = createCustomElement("div", {
    id: "games",
    className: "side-menu-item",
    text: "Games"
  })
  
  const archives = createCustomElement("div", {
    id: "archives",
    className: "side-menu-item",
    text: "Archives"
  })
  
  fragment.appendChild(games)
  fragment.appendChild(archives)
  
  fetch("/get-chats")
  .then((response) => {
    if (!response.ok) throw new Error("Failed to fetch chats")
    return response.json()
  })
  .then((data) => {
    data.chats.forEach((element) => {
      const chatElement = createCustomElement("div", {
        className: "side-menu-item"
      })
      
      const chatImage = createCustomElement("img", {
        className: "chat-image"
      })
      chatImage.src = element.profile_image
      chatImage.alt = ""
      chatElement.appendChild(chatImage)

      const chatText = createCustomElement("span", {
        text: element.name
      })
      chatElement.appendChild(chatText)

      chatElement.setAttribute("chat-id", element.id)
      if (element.id == chatId) chatElement.classList.add("selected-chat")
        
      fragment.appendChild(chatElement)
    })
    sideMenu.appendChild(fragment)
  })
  .catch((error) => {
    console.error("Error:", error)
  })

}

function changeChat(newchatId, fromSearch = false) {
  document.querySelector(`[chat-id="${chatId}"]`).classList.remove("selected-chat")
  chatId = newchatId
  getChatDetail(chatId)
  document.querySelector(`[chat-id="${chatId}"]`).classList.add("selected-chat")
  messageContainer.innerHTML = ''

  if (!fromSearch) loadMessages(chatId)

  applyFilters()
}

// END chats

function returnFragment(elements) {
  const fragment = document.createDocumentFragment()
  elements.forEach(element => fragment.appendChild(element))
  return fragment
}

// START menu functions

function openManual() {
  createMenu(`Manual`, `
      <h3>Turning off the screen</h3>
      <p>Press "Alt + X" or "Alt + ." or "Enter + ." to Turn off screen</p>
      <br>
      <p>IMPORTANT: if you've clicked on a PDF, this is not going to work, you have to click on the site again to make it work. This applies to all other shortcuts as well.</p>
      <h3>Chat shortcuts</h3>
      <p>Press "/" to focus on the text input and press "Escape" to remove focus from text input</p>
      <p>Press "Alt + J" to jump to the latest message and press it again to scroll back to where you were</p>
  `)

  const menu = document.getElementById("menu-toolbar").parentNode

  // Add classes to <h2> elements
  const headers = menu.querySelectorAll("h3")
  headers.forEach(header => {
    header.classList.add("manual-header")
  })

  // Add classes to <p> elements
  const paragraphs = menu.querySelectorAll("p")
  paragraphs.forEach(paragraph => {
    paragraph.classList.add("manual-paragraph")

    // Highlight text inside quotes
    paragraph.innerHTML = paragraph.innerHTML.replace(
      /"(.*?)"/g, // Match text inside quotes
      '<span class="highlighted-text">$1</span>' // Wrap with span
    )
  })
}

function editProfile() {
  createMenu(`Edit Profile`, `          
    <form id="edit-profile-form" method="POST" enctype="multipart/form-data">
      <input type="hidden" name="userId" value="${userId}" />
      <input type="text" name="username" class="new-profile-input" placeholder="Enter new name"/>
      <input type="password" onchange="previewFile()" name="password" class="new-profile-input" placeholder="Enter new password"/>
      <input type="file" onchange="previewFile()" name="profile_image" accept="image/*" class="new-profile-input" />
      <img src="" class="profile-preview" alt="Image preview...">
      <button type="button" class="generic-button" id="update-profile"> Update Profile </button>
    </form>
    `)
    const form = document.getElementById('edit-profile-form')
    const button = document.getElementById('update-profile')
  
    // Add event listener to the button
    button.addEventListener('click', submitForm)
  
    function submitForm(event) {
      event.preventDefault()
  
      const formData = new FormData(form)
      
      fetch('/update-profile', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      .then(response => {
        if (response.ok) window.location.reload()
      })
      .catch(err => console.error('Error:', err))
    }
}

function filtersConfig() {
  createMenu(`Filters`, `
    <form id="filters-config">
      <input type="checkbox" id="filter-mode" class="checkbox custom-checkbox">
      <label for="filter-mode">filter mode</label>
      <br>
      <br>
      <input type="checkbox" id="filter-restriction" class="checkbox custom-checkbox">
      <label for="filter-restriction">apply effects only on second chat</label>
      <br>
      <br>
      <input type="checkbox" id="gray-scale" class="checkbox custom-checkbox">
      <label for="gray-scale">gray scale</label>
      <br>
      <br>
      <input type="number" min="0" max="400" id="brightness" style = "display:initial;"/>
      <label for="brightness">brightness</label>
      <br>
      <br>
      <input type="number" min="0" max="400" id="contrast" style = "display:initial;"/>
      <label for="contrast">contrast</label>
      <br>
      <br>
      <input type="checkbox" id="remove-background" class="checkbox custom-checkbox">
      <label for="remove-background">remove background</label>
    </form>
  `)

  filtersInit()
  document.getElementById("filters-config").addEventListener("input", () => updateFilters())
}

// START customization (not finished need more work (custom background ,paddings and shit like that, themes etc.. ))

function rgbToHex(rgb) {
  const rgbValues = rgb.match(/\d+/g)
  if (!rgbValues || rgbValues.length !== 3) throw new Error("Invalid RGB format")

  return `#${rgbValues.map(val => (+val).toString(16).padStart(2, '0')).join('')}`
}

function hexToRgb(hex) {
  const [r, g, b] = hex.replace('#', '').match(/.{2}/g).map(val => parseInt(val, 16))
  return `rgb(${r}, ${g}, ${b})`
}

function saveColor(property, value) {
  const savedColors = JSON.parse(localStorage.getItem('customColors')) || {}
  savedColors[property] = value
  localStorage.setItem('customColors', JSON.stringify(savedColors))
}

function loadSavedColors() {
  const savedColors = JSON.parse(localStorage.getItem('customColors')) || {}
  Object.entries(savedColors).forEach(([property, value]) => {
    document.documentElement.style.setProperty(property, value)
  })
}

function openCustomizationMenu() {
  loadSavedColors()
  createMenu(`Customize`, `
    <div class="variable-container">
      <h2>Colors</h2>
      ${addCSSVariables()}
    </div>
  `)

  document.querySelector('.variable-container').addEventListener('input', (event) => {
    const target = event.target
    const id = target.id

    if (target.type === 'text') {
      const colorInput = document.getElementById(`${id}-color`)
      const match = target.value.match(/rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*(\d?\.?\d+))?\)/)

      if (match) {
        const [_, r, g, b] = match
        colorInput.value = rgbToHex(`rgb(${r}, ${g}, ${b})`)
        saveColor(`--${id}`, target.value)
        document.documentElement.style.setProperty(`--${id}`, target.value)
      }
    } else if (target.type === 'color') {
      const textInput = document.getElementById(id.replace('-color', ''))
      const [r, g, b] = target.value.match(/\w\w/g).map(val => parseInt(val, 16))
      const rgbaValue = `rgba(${r}, ${g}, ${b}, 1)` // Default alpha to 1 for simplicity

      textInput.value = rgbaValue
      saveColor(`--${textInput.id}`, rgbaValue)
      document.documentElement.style.setProperty(`--${textInput.id}`, rgbaValue)
    }
  })
}

function addCSSVariables() {
  const rootStyles = getCSSVariables()
  const isRGBA = value => /^rgba?\(\d{1,3},\s*\d{1,3},\s*\d{1,3}(?:,\s*\d*\.?\d+)?\)$/.test(value)
  let html = ""

  Object.entries(rootStyles).forEach(([property, value]) => {
    value = value.trim()
    if (isRGBA(value)) {
      const match = value.match(/rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*(\d?\.?\d+))?\)/)
      const [_, r, g, b] = match
      const savedColors = JSON.parse(localStorage.getItem('customColors')) || {}
      const savedValue = savedColors[property] || value

      html += `
      <div style="display: flex; flex-direction: column; margin: 3% 0;position: relative;">
        <p>${property.replace(/-/g, ' ')}</p>
        <div class="color-input-container">
          <input type="text" id="${property.replace('--', '')}" value="${savedValue}" style="flex: 2;">
          <input type="color" id="${property.replace('--', '')}-color" value="${rgbToHex(`rgb(${r}, ${g}, ${b})`)}" style="flex: 1;">
        </div>
      </div>
      `
    }
  })

  return html
}

function getCSSVariables() {
  const variables = {}
  
  Array.from(document.styleSheets).forEach(sheet => {
    try {
      Array.from(sheet.cssRules).forEach(rule => {
        if (rule.style) {
          Array.from(rule.style).forEach(property => {
            if (property.startsWith('--')) variables[property] = rule.style.getPropertyValue(property).trim()
          })
        }
      })
    } catch (e) {
      console.warn('Could not access stylesheet:', sheet.href)
    }
  })

  return variables
}

// END customization

// END menu functions

// START SEARCH

searchInput.addEventListener("input", () => {
  const searchTerm = searchInput.value.trim()

  if (!searchTerm) return

  fetch(`/search?query=${encodeURIComponent(searchTerm)}`)
    .then(response => response.json())
    .then(data => {
      // make this a more general thing so it can be used for other things (PWT etc..) also work on names its horrible rn also it doesnt work on differnet chats
      const searchResultContainer = createCustomElement("div", { id: "search-result-container" })
      data.forEach(result => {
        const searchResult = createCustomElement('div', {
          className: "search-result",
          onClick: () => scrollToMessage(result.messageId, result.chatId)
        })

        const chatImage = createCustomElement("img", { className: "chat-image" })
        chatImage.src = result.chatProfileImage

        const searchTextContainer = createCustomElement("div", { className: "search-text-container" })
        const chatName = createCustomElement("span", { text: result.chatName, className: "chat-name" })

        const searchContentContainer = createCustomElement("div", { className: "search-content-container" })
        const searchResultAuthor = createCustomElement("span", { text: result.username, className: "search-result-author" })
        const searchResultText = createCustomElement("span", { text: result.message, className: "search-result-text" })

        searchTextContainer.appendChild(chatName)
        searchTextContainer.appendChild(searchContentContainer)

        searchContentContainer.appendChild(searchResultAuthor)
        searchContentContainer.appendChild(searchResultText)

        searchResult.appendChild(chatImage)
        searchResult.appendChild(searchTextContainer)

        searchResultContainer.appendChild(searchResult)
      })

      sideMenu.appendChild(searchResultContainer)      
    })
    .catch(error => {
      console.error('Error fetching search results:', error)
    })
})

// END SEARCH

// START command 

function commandHandler(command) {
  const trimedCommand = command.trim()

  if (trimedCommand == "/clicker") clickerInit()

}

function clickerInit() {
  const clicker = messageTemplate({ username: "Dopamine" })

  const clickerElement = clicker.querySelector(".message-text")

  const button = createCustomElement("button", { text: "CLICKKKK", id: "clicker" })
  clickerElement.appendChild(button)
  
  const counter = createCustomElement("p", { id: "counter", text: clicks })
  clickerElement.appendChild(counter)
  
  messageContainer.appendChild(clicker)
  
  clickerElement.addEventListener("click", () => {
    clicks++
    document.getElementById("counter").innerText = clicks
    localStorage.setItem("clicks", clicks)
  })

  input.innerText = ""
  scrollToBottom(true)
}

// END command
