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

// --- PERFIL PÚBLICO (ATUALIZADO BOOTSTRAP) ---
function viewUserProfile(uid, uname, ucourse) {
    const sec = document.getElementById('view-public-profile');
    if(!sec) return;
    
    // Atualiza o Cabeçalho
    document.getElementById('public-profile-avatar').innerText = uname.charAt(0).toUpperCase();
    document.getElementById('public-profile-name').innerText = uname;
    document.getElementById('public-profile-course').innerText = ucourse || 'Aluno Gran';

    // Lista de livros
    const listContainer = document.getElementById('public-books-list');
    const userBooks = allBooksCache.filter(b => b.ownerId === uid);
    const myWishes = allWishesCache.filter(w => w.userId === currentUserData.uid);
    
    listContainer.innerHTML = '';

    if (userBooks.length === 0) {
        listContainer.innerHTML = '<div class="col-12 text-center text-secondary py-5">Este aluno não tem anúncios no momento.</div>';
    } else {
        userBooks.forEach(b => {
            const isMatch = myWishes.some(w => b.title.toLowerCase().includes(w.title.toLowerCase()));
            const safeTitle = b.title.replace(/'/g, "\\'");
            
            let displayImg = b.image;
            if (!displayImg || displayImg.includes('via.placeholder.com')) displayImg = "https://books.google.com.br/googlebooks/images/no_cover_thumb.gif";

            listContainer.innerHTML += `
                <div class="col">
                    <div class="card h-100 shadow-sm border-0 position-relative" style="border-radius: 12px; overflow: hidden; ${isMatch ? 'border: 2px solid #2196F3 !important;' : ''}">
                        ${isMatch ? '<span class="position-absolute top-0 end-0 badge bg-primary m-2 shadow-sm">★ Na sua Lista</span>' : ''}
                        <img src="${displayImg}" class="card-img-top" style="height: 200px; object-fit: cover;" onerror="this.src='https://books.google.com.br/googlebooks/images/no_cover_thumb.gif'">
                        <div class="card-body d-flex flex-column p-3">
                            <h6 class="card-title fw-bold text-truncate mb-2">${b.title}</h6>
                            <div class="mt-auto">
                                <button onclick="startChat('${uid}', '${uname}', '${safeTitle}')" class="btn btn-primary btn-sm w-100 fw-bold">Interesse</button>
                            </div>
                        </div>
                    </div>
                </div>`;
        });
    }

    navTo('view-public-profile');
}