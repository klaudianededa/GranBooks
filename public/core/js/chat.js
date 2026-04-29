// ==========================================
// CHAT & PERFIL PÚBLICO
// ==========================================
let currentChatId = null;
let unsubscribeMessages = null;

async function startChat(tid, tname, btitle) {
    if (!currentUserData) return;
    const cid = [currentUserData.uid, tid].sort().join("_");
    const cref = db.collection('chats').doc(cid);
    
    const doc = await cref.get();
    if (!doc.exists) {
        await cref.set({
            users:[currentUserData.uid, tid], 
            userNames:{[currentUserData.uid]:currentUserData.name, [tid]:tname}, 
            lastMessage:`Interesse: ${btitle}`, 
            lastMessageTime:firebase.firestore.FieldValue.serverTimestamp(),
            lastSenderId: currentUserData.uid
        });
        await cref.collection('messages').add({
            text:`Olá! Tenho interesse no livro "${btitle}".`, 
            senderId:currentUserData.uid, 
            createdAt:firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    openChatWindow(cid, tname);
}

function openChatWindow(chatId, chatName) {
    currentChatId = chatId;
    document.getElementById('chat-user-name').innerText = chatName;
    document.getElementById('chat-messages').innerHTML = '<p style="text-align:center; padding:20px;">Carregando...</p>';
    navTo('view-chat');
    
    if(unsubscribeMessages) unsubscribeMessages();
    unsubscribeMessages = db.collection('chats').doc(chatId).collection('messages').orderBy('createdAt', 'asc').onSnapshot(s => {
        const div = document.getElementById('chat-messages');
        div.innerHTML = '';
        s.forEach(d => {
            const m = d.data();
            const b = document.createElement('div');
            b.className = `message-bubble ${m.senderId === currentUserData.uid ? 'me' : 'them'}`;
            b.innerText = m.text;
            div.appendChild(b);
        });
        div.scrollTop = div.scrollHeight;
    });
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value;
    if(!text || !currentChatId) return;
    input.value = '';

    const now = firebase.firestore.FieldValue.serverTimestamp();
    db.collection('chats').doc(currentChatId).collection('messages').add({
        text, senderId:currentUserData.uid, createdAt:now
    });
    db.collection('chats').doc(currentChatId).update({
        lastMessage:text, lastMessageTime:now, lastSenderId:currentUserData.uid
    });
}

function listenToInbox() {
    db.collection('chats').where('users', 'array-contains', currentUserData.uid)
        .orderBy('lastMessageTime', 'desc')
        .onSnapshot(s => {
            const list = document.getElementById('inbox-list');
            if(!list) return;
            list.innerHTML = '';
            let unread = 0;

            if(s.empty) {
                list.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">Sem mensagens.</p>';
                return;
            }

            s.forEach(d => {
                const c = d.data();
                const pid = c.users.find(u => u !== currentUserData.uid);
                const pname = c.userNames[pid] || 'Usuário';
                
                const isUnread = c.lastSenderId && c.lastSenderId !== currentUserData.uid;
                if(isUnread) unread++;

                list.innerHTML += `
                    <div class="chat-item" onclick="openChatWindow('${d.id}', '${pname}')">
                        <div class="chat-avatar-small">${pname.charAt(0)}</div>
                        <div class="chat-info">
                            <h4>${pname}</h4>
                            <p style="${isUnread ? 'font-weight:bold; color:#000;' : ''}">${c.lastMessage}</p>
                        </div>
                        ${isUnread ? '<div class="unread-dot"></div>' : ''}
                    </div>`;
            });
            const badge = document.getElementById('nav-badge');
            if(badge) badge.style.display = unread > 0 ? 'block' : 'none';
        });
}

// --- PERFIL PÚBLICO ---
function viewUserProfile(uid, uname, ucourse) {
    const sec = document.getElementById('view-public-profile');
    if(!sec) return;
    
    // Filtra livros do usuário alvo
    const userBooks = allBooksCache.filter(b => b.ownerId === uid);
    
    // Verifica Match (se eu quero algo que ele tem)
    const myWishes = allWishesCache.filter(w => w.userId === currentUserData.uid);
    
    sec.innerHTML = `
        <div class="public-profile-container">
            <div class="public-profile-header">
                <button onclick="navTo('view-home')" class="btn-back-absolute"><span class="material-icons">arrow_back</span> Voltar</button>
                <div class="avatar-large" style="margin-top:20px;">${uname.charAt(0)}</div>
                <h3 style="color:var(--primary-color); margin:10px 0;">${uname}</h3>
                <span class="course-badge">${ucourse || 'Aluno Gran'}</span>
            </div>
            <div class="divider"></div>
            <h4 style="text-align:left; color:#666; margin-bottom:15px;">Estante (${userBooks.length})</h4>
            <div class="book-grid">
                ${userBooks.map(b => {
                    const isMatch = myWishes.some(w => b.title.toLowerCase().includes(w.title.toLowerCase()));
                    const safeTitle = b.title.replace(/'/g, "\\'");
                    return `
                    <div class="book-card" style="${isMatch ? 'border:2px solid #2196F3;' : ''}">
                        ${isMatch ? '<div class="badge-match">★ Na sua Lista</div>' : ''}
                        <img src="${b.image}" onerror="this.src='https://via.placeholder.com/150'">
                        <h4>${b.title}</h4>
                        <button onclick="startChat('${uid}', '${uname}', '${safeTitle}')" class="btn-primary-gran">Interesse</button>
                    </div>`;
                }).join('')}
                ${userBooks.length === 0 ? '<p>Nenhum livro visível.</p>' : ''}
            </div>
        </div>`;
    navTo('view-public-profile');
}