// ==========================================
// MAIN - INICIALIZAÇÃO E SUGESTÕES (V7)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("GranBook's Iniciado - V7");

    if(typeof initAuthForms === 'function') initAuthForms();

    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.addEventListener('keyup', () => {
            if(typeof filterSearch === 'function') filterSearch();
        });
    }

    setupAutocomplete('book-title', 'suggestions-list', 'announce');
    setupAutocomplete('wish-title', 'wish-suggestions', 'wish');
});

let typingTimer;

function setupAutocomplete(inputId, listId, context) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    
    if(!input || !list) return;

    input.addEventListener('keyup', (e) => {
        const val = e.target.value;
        clearTimeout(typingTimer);
        
        if(val.length < 3) {
            list.style.display = 'none';
            return;
        }
        typingTimer = setTimeout(() => fetchGoogleSuggestions(val, listId, context), 500);
    });
}

async function fetchGoogleSuggestions(query, listId, context) {
    const list = document.getElementById(listId);
    if(!list) return;

    list.style.display = 'block';
    list.innerHTML = '<div style="padding:10px; color:#666;">Buscando...</div>';

    try {
        const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`);
        const d = await r.json();
        
        list.innerHTML = '';

        if(d.items && d.items.length > 0) {
            d.items.forEach(b => {
                const info = b.volumeInfo;
                const title = info.title;
                
                // Tratamento de imagem: HTTPS e Fallback
                let img = "https://books.google.com.br/googlebooks/images/no_cover_thumb.gif";
                if(info.imageLinks) {
                    img = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || img;
                    img = img.replace('http://', 'https://');
                }

                const item = document.createElement('div');
                item.className = 'suggestion-item';
                
                item.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${img}" style="width:30px; height:45px; object-fit:cover; border-radius:4px;">
                        <span style="font-weight:500;">${title}</span>
                    </div>`;
                
                item.onclick = () => {
                    if(context === 'announce') {
                        document.getElementById('book-title').value = title;
                        document.getElementById('book-img').value = img;
                    } else {
                        document.getElementById('wish-title').value = title;
                    }
                    list.style.display = 'none';
                };
                list.appendChild(item);
            });
        } else {
            list.innerHTML = '<div style="padding:10px;">Nenhum livro encontrado.</div>';
        }
    } catch(e) {
        console.error("Erro API:", e);
        list.style.display='none';
    }
}