// ==========================================
// INTERFACE DE USUÁRIO (UI) & NAVEGAÇÃO
// ==========================================

function navTo(viewId) {
    // Esconde todas as views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    
    // Mostra a view desejada
    const target = document.getElementById(viewId);
    if(target) target.classList.add('active');
    
    // Controle da Navbar
    const nav = document.getElementById('main-nav');
    if(nav) {
        if(viewId === 'view-login' || viewId === 'view-register' || viewId === 'view-chat') {
            nav.style.display = 'none';
        } else {
            nav.style.display = 'flex';
        }
        
        // Atualiza ícone ativo
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        if(viewId === 'view-home') document.querySelectorAll('.nav-btn')[0]?.classList.add('active');
        if(viewId === 'view-inbox') document.querySelectorAll('.nav-btn')[1]?.classList.add('active');
        if(viewId === 'view-profile') document.querySelectorAll('.nav-btn')[2]?.classList.add('active');
    }
}

// FUNÇÕES DOS MODAIS (IMPORTANTE)
function toggleModal() {
    const modal = document.getElementById('modal-add');
    if(modal) {
        modal.classList.toggle('open');
    } else {
        console.error("Erro: Modal 'modal-add' não encontrado no HTML");
    }
}

function openWishModal() {
    const modal = document.getElementById('modal-wish');
    if(modal) {
        modal.classList.toggle('open');
    } else {
        console.error("Erro: Modal 'modal-wish' não encontrado no HTML");
    }
}

function switchProfileTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    
    const tabBooks = document.getElementById('tab-books');
    const tabWishes = document.getElementById('tab-wishes');
    
    if(tabBooks && tabWishes) {
        tabBooks.style.display = tab === 'books' ? 'block' : 'none';
        tabWishes.style.display = tab === 'wishes' ? 'block' : 'none';
    }
}