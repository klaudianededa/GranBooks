// ==========================================
// LIVROS & INTEGRAÇÃO GOOGLE BOOKS (CLEANUP V2)
// ==========================================
let allBooksCache = [];
let allWishesCache = [];

// Imagem padrão do Google (Cinza com logo Google)
const IMG_PADRAO = 'https://books.google.com.br/googlebooks/images/no_cover_thumb.gif';

async function getBestCoverUrl(title) {
    if (!title || title.length < 3) return IMG_PADRAO;

    try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&maxResults=10`);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            for (let i = 0; i < data.items.length; i++) {
                const info = data.items[i].volumeInfo;
                if (info.imageLinks && (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail)) {
                    let url = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail;
                    return url.replace('http://', 'https://');
                }
            }
        }
    } catch (error) {
        console.error("Erro na busca inteligente:", error);
    }
    return IMG_PADRAO;
}

async function saveBook() {
    const t = document.getElementById('book-title').value;
    const c = document.getElementById('book-category').value;
    const cond = document.getElementById('book-condition').value;
    let img = document.getElementById('book-img').value;

    if(!t || !c) return alert("Preencha título e categoria");

    const btn = document.querySelector('.btn-save-book');
    const originalText = btn.innerText;
    btn.innerText = "Buscando capa...";
    btn.disabled = true;

    // Se não tem imagem ou se é o placeholder antigo quebrado, busca nova
    if (!img || img.includes('via.placeholder')) {
        img = await getBestCoverUrl(t);
    }

    db.collection('books').add({
        title: t, category: c, condition: cond, image: img,
        ownerId: currentUserData.uid, ownerName: currentUserData.name, ownerCourse: currentUserData.course,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => { 
        toggleModal(); alert("Livro Anunciado!");
        document.getElementById('book-title').value = '';
        document.getElementById('book-img').value = '';
        btn.innerText = originalText; btn.disabled = false;
    }).catch(err => {
        console.error(err);
        btn.innerText = originalText; btn.disabled = false;
    });
}

function listenToBooks() {
    db.collection('books').orderBy('createdAt', 'desc').onSnapshot(s => {
        allBooksCache = [];
        s.forEach(d => allBooksCache.push({id:d.id, ...d.data()}));
        renderBooks(allBooksCache);
    });
}

function renderBooks(list) {
    const feed = document.getElementById('book-feed');
    const myFeed = document.getElementById('my-books-list');
    
    if(feed) feed.innerHTML = '';
    if(myFeed) myFeed.innerHTML = '';

    if(list.length === 0 && feed) feed.innerHTML = '<p style="text-align:center; width:200%; color:#999;">Nenhum livro aqui.</p>';

    list.forEach(book => {
        const isMe = currentUserData && book.ownerId === currentUserData.uid;
        const safeOwner = book.ownerName ? book.ownerName.replace(/'/g, "\\'") : "Aluno";
        const safeTitle = book.title.replace(/'/g, "\\'");
        
        // --- CORREÇÃO DE IMAGENS ANTIGAS ---
        let displayImg = book.image;
        
        // Se a imagem for o link quebrado ou vazia, força a padrão IMEDIATAMENTE
        // Isso evita o erro vermelho no console
        if (!displayImg || displayImg.includes('via.placeholder.com')) {
            displayImg = IMG_PADRAO;
        }

        const card = `
            <div class="book-card">
                <img src="${displayImg}" onerror="this.src='${IMG_PADRAO}'">
                <h4>${book.title}</h4>
                <p class="price">${book.category} • ${book.condition}</p>
                <p class="owner">Por: <span class="owner-link" onclick="viewUserProfile('${book.ownerId}', '${safeOwner}', '${book.ownerCourse}')">${book.ownerName.split(' ')[0]}</span></p>
                ${isMe ? 
                    `<button onclick="deleteBook('${book.id}')" class="btn-delete-gran"><span class="material-icons">delete</span> Excluir</button>` : 
                    `<div class="action-buttons-container">
                        <button onclick="viewUserProfile('${book.ownerId}', '${safeOwner}', '${book.ownerCourse}')" class="btn-base btn-outline-gran">Perfil</button>
                        <button onclick="startChat('${book.ownerId}', '${safeOwner}', '${safeTitle}')" class="btn-base btn-primary-gran">Interesse</button>
                    </div>`
                }
            </div>`;

        if(isMe && myFeed) myFeed.innerHTML += card;
        if(!isMe && feed) feed.innerHTML += card;
    });
}

function deleteBook(id){ if(confirm('Excluir anúncio?')) db.collection('books').doc(id).delete(); }

function filterBooks(c, btn) {
    if(btn){ document.querySelectorAll('.cat-chip').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); }
    renderBooks(c==='Todos' ? allBooksCache : allBooksCache.filter(x => x.category === c));
}

function filterSearch() {
    const term = document.getElementById('search-input').value.toLowerCase();
    renderBooks(allBooksCache.filter(x => x.title.toLowerCase().includes(term)));
}

function listenToAllWishes() {
    db.collection('wishes').onSnapshot(s => {
        allWishesCache = [];
        s.forEach(d => allWishesCache.push({id:d.id, ...d.data()}));
        renderMyWishes();
    });
}

function saveWish() {
    const t = document.getElementById('wish-title').value;
    if(!t) return;
    db.collection('wishes').add({ title:t, userId:currentUserData.uid, createdAt:firebase.firestore.FieldValue.serverTimestamp() })
    .then(() => { openWishModal(); alert("Desejo adicionado!"); });
}

function renderMyWishes() {
    const list = document.getElementById('my-wishes-list');
    if(!list) return;
    list.innerHTML = '';
    const myWishes = allWishesCache.filter(w => w.userId === currentUserData.uid);
    
    if(myWishes.length === 0) list.innerHTML = '<p style="color:#999; text-align:center; grid-column: span 2;">Sua lista está vazia.</p>';
    
    const iconWish = "https://cdn-icons-png.flaticon.com/512/2232/2232688.png"; 

    myWishes.forEach(w => {
        list.innerHTML += `
            <div class="book-card">
                <div style="height:180px; display:flex; align-items:center; justify-content:center; background:#f5f5f5; border-radius:8px; margin-bottom:10px;">
                    <img src="${iconWish}" style="width:60px; height:60px; object-fit:contain; opacity:0.5; box-shadow:none;">
                </div>
                <h4>${w.title}</h4>
                <p class="price" style="background:#FFF3E0; color:#E65100;">Procurando...</p>
                <button onclick="if(confirm('Remover desejo?')) db.collection('wishes').doc('${w.id}').delete()" class="btn-delete-gran">
                    <span class="material-icons" style="font-size:18px;">delete_outline</span> Remover
                </button>
            </div>`;
    });
}