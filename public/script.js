/*
 * script.js for Braydon's App
 *
 * This client-side script powers the real-time chat experience using
 * Socket.io. It manages the join process, handles form submissions,
 * and renders incoming messages in the chat window. The UI elements
 * are toggled based on whether the user has joined the chat. Messages
 * from the current user are styled differently from those of other
 * participants, and system notifications (user join/leave) are
 * rendered in a neutral style.
 */

// Establish a Socket.io connection immediately. By default, this
// attempts to connect to the same host/port that served the page.
const socket = io();

// Grab DOM elements we'll need to manipulate
const joinScreen = document.getElementById('join-screen');
const chatScreen = document.getElementById('chat-screen');
const joinButton = document.getElementById('join-button');
const usernameInput = document.getElementById('username-input');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const messagesList = document.getElementById('messages');

// Track the current username after joining; undefined until user joins
let currentUsername;

/**
 * Append a new message element to the chat. Messages are styled
 * differently based on type: 'user' messages (sent by this client)
 * align to the right with a blue bubble; 'other' messages align
 * left with a gray bubble; 'system' messages are centered and use
 * a neutral color. After appending, scroll to the bottom of the
 * messages container.
 *
 * @param {string} text - The message text to display
 * @param {string} type - One of 'user', 'other', or 'system'
 */
function addMessage(text, type = 'other', timestamp = null) {
  const li = document.createElement('li');
  li.classList.add('message', type);
  // Create a span for the message text
  const textSpan = document.createElement('span');
  textSpan.textContent = text;
  li.appendChild(textSpan);
  // Optionally append a timestamp
  if (timestamp) {
    const time = new Date(timestamp);
    // Format as HH:MM (24-hour) with leading zeros
    const hh = String(time.getHours()).padStart(2, '0');
    const mm = String(time.getMinutes()).padStart(2, '0');
    const tsSpan = document.createElement('span');
    tsSpan.classList.add('timestamp');
    tsSpan.textContent = `${hh}:${mm}`;
    li.appendChild(tsSpan);
  }
  messagesList.appendChild(li);
  // Scroll to the latest message
  messagesList.scrollTop = messagesList.scrollHeight;
}

/**
 * Handle clicking the "Join Chat" button. Validates the username
 * input and, if non-empty, hides the join screen, reveals the chat
 * screen, and notifies the server of the new participant via the
 * "join" event. Trims whitespace and limits to 25 characters as
 * defined in the HTML markup.
 */
function handleJoin() {
  const rawName = usernameInput.value || '';
  const name = rawName.trim();
  if (!name) {
    // Simple client-side validation: require a name
    usernameInput.focus();
    return;
  }
  currentUsername = name;
  // Emit join event to server so other clients know we joined
  socket.emit('join', currentUsername);
  // Toggle UI: hide join screen and show chat
  joinScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  messageInput.focus();
}

/**
 * Handle submitting the message form. Prevents default form
 * submission, validates the message content (non-empty), emits it
 * via Socket.io, and clears the input. The server will broadcast
 * the message to all clients, including this one, so we rely on
 * the 'message' event to actually render it.
 *
 * @param {Event} e - The form submit event
 */
function handleSendMessage(e) {
  e.preventDefault();
  const rawMsg = messageInput.value || '';
  const msg = rawMsg.trim();
  if (!msg) {
    return;
  }
  // Emit the message to the server; the server will broadcast
  socket.emit('message', msg);
  // Clear the input for new message
  messageInput.value = '';
}

// Attach event listeners
joinButton.addEventListener('click', handleJoin);
// Allow pressing Enter key in username field to trigger join
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleJoin();
  }
});
messageForm.addEventListener('submit', handleSendMessage);

// Listen for incoming messages from the server
socket.on('message', (data) => {
  // 'data' is expected to be an object: { username, text, system, timestamp }
  if (!data || typeof data.text !== 'string') {
    return;
  }
  const text = data.text;
  // Determine message type for styling
  let type;
  if (data.system) {
    type = 'system';
  } else if (data.username === currentUsername) {
    type = 'user';
  } else {
    type = 'other';
  }
  addMessage(text, type, data.timestamp);
});

// Listen for updates to the user list
socket.on('userList', (list) => {
  updateUserList(Array.isArray(list) ? list : []);
});

/**
 * Update the list of online users displayed in the sidebar. The current
 * user is highlighted. The users array contains strings representing
 * usernames currently connected.
 * @param {string[]} usersArray
 */
function updateUserList(usersArray) {
  const ul = document.getElementById('users-list');
  // Clear existing items
  while (ul.firstChild) {
    ul.removeChild(ul.firstChild);
  }
  usersArray.forEach((name) => {
    const li = document.createElement('li');
    li.textContent = name;
    if (name === currentUsername) {
      li.classList.add('current-user');
    }
    ul.appendChild(li);
  });
}

// Optional: handle connection errors or reconnection attempts
socket.on('connect_error', (err) => {
  console.error('Connection error:', err);
});
socket.on('disconnect', () => {
  // Optionally display a system message when disconnected
  addMessage('You have been disconnected.', 'system');
});
