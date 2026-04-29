/* =========================================
   GRANBOOK'S - LÓGICA DO SISTEMA (REVISADO)
   ========================================= */

// --- 1. CONFIGURAÇÕES GLOBAIS ---
let allBooksCache = [];
let allWishesCache = [];

// Capa padrão caso não encontre nenhuma imagem
const IMG_PADRAO = 'https://books.google.com.br/googlebooks/images/no_cover_thumb.gif';

// --- 2. FUNÇÃO DE BUSCA DE CAPAS (GOOGLE BOOKS) ---
// Otimizada para garantir resposta e usar HTTPS
async function getBestCoverUrl(title) {
    // Validação básica
    if (!title || title.trim().length < 2) return IMG_PADRAO;
    
    const cleanTitle = title.trim();

    try {
        // Busca até 3 resultados para ser mais rápido
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(cleanTitle)}&maxResults=3`);
        
        if (!response.ok) return IMG_PADRAO;

        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            // Itera sobre os resultados para achar um que tenha imagem
            for (let i = 0; i < data.items.length; i++) {
                const info = data.items[i].volumeInfo;
                if (info.imageLinks) {
                    // Tenta pegar a thumbnail, se não tiver, pega a smallThumbnail
                    let url = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail;
                    
                    if (url) {
                        // IMPORTANTE: Força HTTPS para evitar bloqueio de segurança
                        return url.replace(/^http:\/\//i, 'https://');
                    }
                }
            }
        }
    } catch (error) { 
        console.error("Erro ao buscar capa no Google:", error); 
    }
    
    // Se falhar tudo, retorna a imagem padrão
    return IMG_PADRAO;
}

// --- 3. SALVAR NOVO ANÚNCIO (LIVRO) ---
async function saveBook() {
    const t = document.getElementById('book-title').value;
    const c = document.getElementById('book-category').value;
    const cond = document.getElementById('book-condition').value;
    let img = document.getElementById('book-img').value;

    if(!t || !c) return alert("Por favor, preencha o título e a categoria.");

    // Feedback visual no botão
    const btn = document.querySelector('#modal-add .btn-save-book');
    const originalText = btn ? btn.innerText : 'Anunciar';
    if(btn) { btn.innerText = "Processando..."; btn.disabled = true; }

    try {
        // Se não veio imagem do autocomplete, busca agora
        if (!img || img.includes('via.placeholder') || img.length < 10) {
            img = await getBestCoverUrl(t);
        }

        await db.collection('books').add({
            title: t, 
            category: c, 
            condition: cond, 
            image: img,
            ownerId: currentUserData.uid, 
            ownerName: currentUserData.name, 
            ownerCourse: currentUserData.course,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        toggleModal(); 
        alert("Livro anunciado com sucesso!");
        
        // Limpa formulário
        document.getElementById('book-title').value = '';
        document.getElementById('book-img').value = '';

    } catch (error) {
        console.error(error);
        alert("Erro ao anunciar. Tente novamente.");
    } finally {
        if(btn) { btn.innerText = originalText; btn.disabled = false; }
    }
}

// --- 4. SALVAR DESEJO (CORRIGIDO) ---
async function saveWish() {
    const titleInput = document.getElementById('wish-title');
    const t = titleInput.value;
    let img = document.getElementById('wish-img') ? document.getElementById('wish-img').value : null;

    if(!t) return alert("Digite o nome do livro que você procura.");

    // Feedback visual
    const btn = document.querySelector('#modal-wish .btn-save-book');
    const originalText = btn ? btn.innerText : 'Salvar Desejo';
    
    if(btn) { 
        btn.innerText = "Buscando Capa..."; 
        btn.disabled = true; 
    }

    try {
        // CORREÇÃO CRÍTICA: Se não tem imagem, espera a busca do Google terminar
        if(!img || img.length < 10 || img.includes('via.placeholder')) {
            console.log("Buscando capa para desejo: " + t);
            img = await getBestCoverUrl(t);
        }

        // Salva no Firestore
        await db.collection('wishes').add({ 
            title: t, 
            image: img, 
            userId: currentUserData.uid, 
            createdAt: firebase.firestore.FieldValue.serverTimestamp() 
        });

        openWishModal(); // Fecha o modal
        alert("Desejo adicionado à sua lista!");
        
        // Limpa campos
        titleInput.value = '';
        if(document.getElementById('wish-img')) document.getElementById('wish-img').value = '';

    } catch (error) {
        console.error("Erro ao salvar desejo:", error);
        alert("Houve um erro ao salvar. Verifique sua conexão.");
    } finally {
        // Restaura o botão
        if(btn) { btn.innerText = originalText; btn.disabled = false; }
    }
}

// --- 5. LISTENERS (ATUALIZAÇÃO EM TEMPO REAL) ---
function listenToBooks() {
    db.collection('books').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        allBooksCache = [];
        snapshot.forEach(doc => {
            allBooksCache.push({id: doc.id, ...doc.data()});
        });
        renderBooks(allBooksCache);
    });
}

function listenToAllWishes() {
    // Escuta todos os desejos para poder filtrar depois
    db.collection('wishes').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        allWishesCache = [];
        snapshot.forEach(doc => {
            allWishesCache.push({id: doc.id, ...doc.data()});
        });
        // Atualiza a visualização se estivermos na aba de desejos
        renderMyWishes();
    });
}

// --- 6. RENDERIZAÇÃO DE ANÚNCIOS (LIVROS) ---
function renderBooks(list) {
    const feed = document.getElementById('book-feed');
    const myFeed = document.getElementById('my-books-list');
    
    // Limpa conteúdo atual
    if(feed) feed.innerHTML = '';
    if(myFeed) myFeed.innerHTML = '';

    if(list.length === 0 && feed) {
        feed.innerHTML = '<p style="text-align:center; width:200%; color:#999; margin-top:20px;">Nenhum livro anunciado ainda.</p>';
    }

    list.forEach(book => {
        const isMe = currentUserData && book.ownerId === currentUserData.uid;
        let displayImg = book.image;
        
        // Verificação e Reparo de Imagem
        if (!displayImg || displayImg === "undefined" || displayImg.includes('via.placeholder')) {
            displayImg = IMG_PADRAO;
            // Tenta corrigir no background sem travar a tela
            repairImage('books', book.id, book.title);
        }

        // Montagem do Card
        const cardHTML = `
            <div class="book-card">
                <img id="img-book-${book.id}" src="${displayImg}" onerror="this.src='${IMG_PADRAO}'" alt="${book.title}">
                <h4>${book.title}</h4>
                <p class="price">${book.category} • ${book.condition}</p>
                <p class="owner" style="font-size:0.8rem; color:#666; margin-bottom:10px;">
                    Anunciante: <span>${book.ownerName ? book.ownerName.split(' ')[0] : 'Aluno'}</span>
                </p>
                
                ${isMe ? 
                    `<button onclick="deleteBook('${book.id}')" class="btn-delete-gran">
                        <span class="material-icons">delete_outline</span> Excluir
                     </button>` 
                    : 
                    `<div class="action-buttons-container">
                        <button onclick="if(typeof viewUserProfile === 'function') viewUserProfile('${book.ownerId}', 'Aluno', '')" class="btn-base btn-outline-gran">Perfil</button>
                        <button onclick="if(typeof startChat === 'function') startChat('${book.ownerId}', 'Aluno', '${book.title}')" class="btn-base btn-primary-gran">Tenho Interesse</button>
                    </div>`
                }
            </div>`;

        if(isMe && myFeed) myFeed.innerHTML += cardHTML;
        if(!isMe && feed) feed.innerHTML += cardHTML;
    });
}

// --- 7. RENDERIZAÇÃO DE LISTA DE DESEJOS ---
function renderMyWishes() {
    const listContainer = document.getElementById('my-wishes-list');
    if(!listContainer) return; // Se não estiver na tela de perfil, ignora

    listContainer.innerHTML = '';
    
    // Filtra apenas os desejos do usuário atual
    const myWishes = allWishesCache.filter(w => w.userId === currentUserData.uid);
    
    if(myWishes.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px; width:100%;">Sua lista de desejos está vazia.</p>';
        return;
    }
    
    myWishes.forEach(w => {
        let displayImg = w.image;
        
        // Lógica de Reparo para Desejos
        if (!displayImg || displayImg.length < 15 || displayImg === "undefined") {
            displayImg = IMG_PADRAO;
            repairImage('wishes', w.id, w.title);
        }

        const wishCard = `
            <div class="book-card">
                <img id="img-wish-${w.id}" src="${displayImg}" onerror="this.src='${IMG_PADRAO}'" alt="${w.title}">
                <h4>${w.title}</h4>
                <p class="price" style="background:#FFF3E0; color:#E65100;">Na Lista de Desejos</p>
                <button onclick="deleteWish('${w.id}')" class="btn-delete-gran" style="margin-top:auto;">
                    <span class="material-icons" style="font-size:18px;">delete_outline</span> Remover
                </button>
            </div>`;
            
        listContainer.innerHTML += wishCard;
    });
}

// --- 8. FUNÇÃO DE AUTO-REPARO (SELF-HEALING) ---
async function repairImage(collection, id, title) {
    if(!title || title.length < 3) return;

    // console.log(`Tentando reparar imagem para: ${title}`); // Debug opcional
    const newCover = await getBestCoverUrl(title);
    
    // Atualiza visualmente se o elemento existir na tela
    const imgId = collection === 'books' ? `img-book-${id}` : `img-wish-${id}`;
    const el = document.getElementById(imgId);
    
    // Se achou uma capa válida diferente da padrão
    if(newCover !== IMG_PADRAO) {
        if(el) el.src = newCover;
        
        // Atualiza no banco silenciosamente
        db.collection(collection).doc(id).update({ image: newCover })
          .catch(e => console.error("Erro no reparo automático:", e));
    }
}

// --- 9. FUNÇÕES AUXILIARES E UTILITÁRIOS ---

function deleteBook(id){ 
    if(confirm('Tem certeza que deseja excluir este anúncio?')) {
        db.collection('books').doc(id).delete().then(() => alert("Anúncio removido."));
    } 
}

function deleteWish(id){
    if(confirm('Remover este livro da sua lista de desejos?')) {
        db.collection('wishes').doc(id).delete();
    }
}

function filterBooks(category, btnElement) { 
    // Atualiza visual dos botões (chips)
    if(btnElement){
        document.querySelectorAll('.cat-chip').forEach(x => x.classList.remove('active'));
        btnElement.classList.add('active');
    }
    
    // Filtra lista
    const filtered = category === 'Todos' 
        ? allBooksCache 
        : allBooksCache.filter(x => x.category === category);
        
    renderBooks(filtered); 
}

// Busca local (Barra de pesquisa na Home)
function filterSearch() { 
    const term = document.getElementById('search-input').value.toLowerCase();
    const filtered = allBooksCache.filter(x => x.title.toLowerCase().includes(term));
    renderBooks(filtered);
}

// Função necessária se o HTML chamar handleTyping
function handleTyping(val) {
    // Pode ser usada para debounce da busca no futuro
}